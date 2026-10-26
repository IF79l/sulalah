import 'server-only';
import { KeyRing, fromB64, keyContext, keyRingFromEnv, toB64url } from '@sulalah/keys';
import { appEnv } from '@/lib/backend';
import { treesAsServer, type KeyRow, type TreesDb } from '@/server/trees/db';

/**
 * Tree keys, wrapped by a key outside the database (packages/keys). This file is the only
 * place that unwraps them. Callers check who is asking before they ask for a key.
 */

let ring: Promise<KeyRing> | null = null;

/** The wrapping keys from the server's settings, read once per server. */
export function keyRing(): Promise<KeyRing> {
  ring ??= keyRingFromEnv(process.env, {
    appEnv,
    fallbackSecret: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  }).catch((e) => {
    ring = null;
    throw e;
  });
  return ring;
}

/**
 * Unwrapped keys stay in this server's memory for a few minutes, so a key service is not
 * called on every save. A deleted tree's key ages out on its own.
 */
const TTL = 5 * 60_000;
const cache = new Map<string, { key: string; until: number }>();

function remember(id: string, key: string) {
  if (cache.size > 2000) cache.clear();
  cache.set(id, { key, until: Date.now() + TTL });
}

function recalled(id: string) {
  const hit = cache.get(id);
  if (hit && hit.until > Date.now()) return hit.key;
  cache.delete(id);
  return null;
}

const KEY_COLUMNS =
  'tree_id, key, wrapped_key, kek_id, wrapped_at, view_key_wrapped, view_kek_id, view_key_slug';

/** The tree's key, or null when it has none (planted before the platform kept keys). */
export async function treeKeyOf(treeId: string, db: TreesDb = treesAsServer()) {
  const hit = recalled(`t:${treeId}`);
  if (hit) return hit;
  const { data: row, error } = await db
    .from('tree_keys')
    .select(KEY_COLUMNS)
    .eq('tree_id', treeId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const key = await openRow(db, row);
  remember(`t:${treeId}`, key);
  return key;
}

/** Unwraps a row's key; a key from before wrapping is wrapped on the way. */
async function openRow(db: TreesDb, row: KeyRow) {
  const r = await keyRing();
  if (row.wrapped_key && row.kek_id)
    return toB64url(await r.unwrap(row.kek_id, row.wrapped_key, keyContext('tree', row.tree_id)));
  if (!row.key) throw new Error(`tree ${row.tree_id} has no key`);
  await wrapPlain(db, r, row.tree_id, row.key);
  return row.key;
}

async function wrapPlain(db: TreesDb, r: KeyRing, treeId: string, plain: string) {
  const { kekId, wrapped } = await r.wrap(fromB64(plain), keyContext('tree', treeId));
  // Only if nobody wrapped it in the meantime.
  const { error } = await db
    .from('tree_keys')
    .update({
      key: null,
      wrapped_key: wrapped,
      kek_id: kekId,
      wrapped_at: new Date().toISOString(),
    })
    .eq('tree_id', treeId)
    .eq('key', plain);
  if (error) throw error;
}

export class KeyExists extends Error {}

/** Makes and keeps the key of a tree just planted. Only once per tree. */
export async function plantKey(treeId: string, db: TreesDb = treesAsServer()) {
  const plain = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const { kekId, wrapped } = await (await keyRing()).wrap(plain, keyContext('tree', treeId));
  const { error } = await db
    .from('tree_keys')
    .insert({
      tree_id: treeId,
      wrapped_key: wrapped,
      kek_id: kekId,
      wrapped_at: new Date().toISOString(),
    });
  if (error) {
    if (error.code === '23505') throw new KeyExists();
    throw error;
  }
  const key = toB64url(plain);
  remember(`t:${treeId}`, key);
  return key;
}

/**
 * The key of the visitors' copy in view folder `slug`: one already kept for that folder, or a
 * new one. Two copies built at once agree on one key (claim_view_key).
 */
export async function viewKeyOf(treeId: string, slug: string, db: TreesDb = treesAsServer()) {
  const id = `v:${treeId}:${slug}`;
  const hit = recalled(id);
  if (hit) return hit;
  const r = await keyRing();
  const context = keyContext('view', treeId, slug);
  const fresh = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const mine = await r.wrap(fresh, context);
  const { data, error } = await db.rpc('claim_view_key', {
    tree: treeId,
    slug,
    wrapped: mine.wrapped,
    kek: mine.kekId,
  });
  if (error) throw error;
  const kept = data?.[0];
  if (!kept) throw new Error('no view key');
  const key =
    kept.view_key_wrapped === mine.wrapped
      ? toB64url(fresh)
      : toB64url(await r.unwrap(kept.view_kek_id, kept.view_key_wrapped, context));
  remember(id, key);
  return key;
}

/** The kept key of the copy in `slug` only; null when that folder has none. */
export async function keptViewKey(treeId: string, slug: string, db: TreesDb = treesAsServer()) {
  const id = `v:${treeId}:${slug}`;
  const hit = recalled(id);
  if (hit) return hit;
  const { data: row, error } = await db
    .from('tree_keys')
    .select('view_key_wrapped, view_kek_id, view_key_slug')
    .eq('tree_id', treeId)
    .maybeSingle();
  if (error) throw error;
  if (!row?.view_key_wrapped || !row.view_kek_id || row.view_key_slug !== slug) return null;
  const r = await keyRing();
  const key = toB64url(
    await r.unwrap(row.view_kek_id, row.view_key_wrapped, keyContext('view', treeId, slug)),
  );
  remember(id, key);
  return key;
}

export interface KeyStatus {
  provider: string;
  active: string;
  known: string[];
  trees: number;
  plain: number;
  stale: number;
  byKek: Record<string, number>;
}

async function allRows(db: TreesDb) {
  const rows: KeyRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('tree_keys')
      .select(KEY_COLUMNS)
      .order('tree_id')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

/** How the keys stand: how many trees, how many still plain, and under which wrapping key. */
export async function keyStatus(db: TreesDb = treesAsServer()): Promise<KeyStatus> {
  const r = await keyRing();
  const rows = await allRows(db);
  const byKek: Record<string, number> = {};
  let plain = 0;
  let stale = 0;
  for (const row of rows) {
    if (!row.kek_id) plain++;
    else byKek[row.kek_id] = (byKek[row.kek_id] ?? 0) + 1;
    if (r.stale(row.kek_id) || (row.view_kek_id && r.stale(row.view_kek_id))) stale++;
  }
  return {
    provider: r.active.id.split(':')[0]!,
    active: r.active.id,
    known: r.ids,
    trees: rows.length,
    plain,
    stale,
    byKek,
  };
}

/**
 * Wraps every key that is still plain or wrapped by an older wrapping key, with the one in
 * use now: the first move to wrapped keys, and every rotation after. Safe to run again; a
 * row changed in the meantime is left for the next run.
 */
export async function rewrapAll(db: TreesDb = treesAsServer()) {
  const r = await keyRing();
  const out = { wrapped: 0, rewrapped: 0, views: 0, failed: [] as string[] };
  for (const row of await allRows(db)) {
    try {
      if (!row.kek_id && row.key) {
        await wrapPlain(db, r, row.tree_id, row.key);
        out.wrapped++;
      } else if (row.kek_id && row.wrapped_key && r.stale(row.kek_id)) {
        const next = await r.rewrap(row.kek_id, row.wrapped_key, keyContext('tree', row.tree_id));
        const { error } = await db
          .from('tree_keys')
          .update({
            wrapped_key: next.wrapped,
            kek_id: next.kekId,
            wrapped_at: new Date().toISOString(),
          })
          .eq('tree_id', row.tree_id)
          .eq('wrapped_key', row.wrapped_key);
        if (error) throw error;
        out.rewrapped++;
      }
      if (
        row.view_key_wrapped &&
        row.view_kek_id &&
        row.view_key_slug &&
        r.stale(row.view_kek_id)
      ) {
        const next = await r.rewrap(
          row.view_kek_id,
          row.view_key_wrapped,
          keyContext('view', row.tree_id, row.view_key_slug),
        );
        const { error } = await db
          .from('tree_keys')
          .update({ view_key_wrapped: next.wrapped, view_kek_id: next.kekId })
          .eq('tree_id', row.tree_id)
          .eq('view_key_wrapped', row.view_key_wrapped);
        if (error) throw error;
        out.views++;
      }
    } catch (e) {
      console.error('rewrapping a tree key failed', row.tree_id, e);
      out.failed.push(row.tree_id);
    }
  }
  return out;
}
