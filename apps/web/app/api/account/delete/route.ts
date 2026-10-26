import { signedInWithin } from '@sulalah/domain';
import { z } from 'zod';
import { CONFIRM_DELETE } from '@/lib/account-confirm';
import { TREE_BUCKET, VIEW_BUCKET } from '@/lib/backend';
import { billingAsServer, billingAsUser, type ServerDb } from '@/server/billing/clients';
import { fail, json, noBackend } from '@/server/billing/http';
import { flushWhatsApp } from '@/server/whatsapp/send';

const body = z.object({ confirm: z.literal(CONFIRM_DELETE) });

async function listAll(db: ServerDb, bucket: string, prefix: string): Promise<string[]> {
  const store = db.storage.from(bucket);
  const out: string[] = [];
  const walk = async (dir: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await store.list(dir, { limit: 1000, offset });
      if (error) throw error;
      for (const e of data) {
        // Folders come back without an id.
        if (e.id) out.push(`${dir}/${e.name}`);
        else await walk(`${dir}/${e.name}`);
      }
      if (data.length < 1000) break;
    }
  };
  await walk(prefix);
  return out;
}

async function removeAll(db: ServerDb, bucket: string, prefix: string) {
  const paths = await listAll(db, bucket, prefix);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

/**
 * Deletes the signed in person's account for good. They must have entered a fresh code from
 * their phone in the last few minutes, and must not own a tree that others are in (they hand it
 * over or delete it first). Trees only they were in go with the account, and so do additions
 * they sent that nobody reviewed. Invoices stay, as the law requires.
 */
export async function POST(req: Request) {
  const off = noBackend();
  if (off) return off;
  if (!body.safeParse(await req.json().catch(() => null)).success)
    return fail(400, 'bad_request', `اكتب "${CONFIRM_DELETE}" للتأكيد`);

  const { data, error } = await (await billingAsUser()).auth.getClaims();
  const me = data?.claims.sub;
  if (error || !me) return fail(401, 'signed_out', 'سجّل دخولك أولًا');
  if (!signedInWithin(data.claims.amr, Date.now() / 1000))
    return fail(403, 'not_fresh', 'أكّد برمز جديد من جوالك قبل الحذف');

  const db = billingAsServer();
  const gone = await db.rpc('delete_account', { member: me });
  if (gone.error) {
    return /owns shared trees/.test(gone.error.message)
      ? fail(409, 'owns_trees', 'انقل ملكية الأشجار اللي فيها أحد غيرك أو احذفها أولًا')
      : fail(500, 'failed', 'ما قدرنا نحذف الحساب، حاول بعد شوي');
  }

  // The account is gone. Its files follow; anything left over is sealed with a key that went
  // with the tree, so it can no longer be opened.
  for (const t of gone.data ?? []) {
    try {
      if (t.deleted) {
        await removeAll(db, TREE_BUCKET, t.tree_id);
        await removeAll(db, VIEW_BUCKET, t.tree_id);
      } else {
        await removeAll(db, TREE_BUCKET, `${t.tree_id}/submissions/${me}`);
      }
    } catch (e) {
      console.error('[account] files left after delete', t.tree_id, e);
    }
  }
  // Owners of trees they were in hear that a member left.
  await flushWhatsApp().catch(() => {});
  return json({ ok: true });
}
