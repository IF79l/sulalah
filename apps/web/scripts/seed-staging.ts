/**
 * Plants the sample family (آل السهلي) on the staging project, signed in as staging's test
 * number, through the same path the app uses: a bare tree record and its key, then a sealed
 * file.
 * Refuses to run anywhere but staging. Running it again leaves an existing demo tree alone.
 *
 *   SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... APP_URL=https://<staging site> APP_ENV=staging \
 *   DEMO_PHONE=966500000001 DEMO_OTP=123456 pnpm seed:staging
 */
import { createClient } from '@supabase/supabase-js';
import { sealTree, type TreeFile } from '@sulalah/domain';
import { demoAncestors, demoFamily, demoSpouses, demoUnions } from '@sulalah/tree-engine';
import type { Database } from '../lib/supabase/types';

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is not set`);
  return v;
};

async function main() {
  if (process.env.APP_ENV !== 'staging')
    throw new Error('APP_ENV must be "staging": demo data never goes to production');
  const url = env('SUPABASE_URL');
  if (process.env.PRODUCTION_SUPABASE_URL && url === process.env.PRODUCTION_SUPABASE_URL)
    throw new Error('this is the production project');

  const db = createClient<Database>(url, env('SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const phone = `+${env('DEMO_PHONE').replace(/^\+/, '')}`;
  const { error: sent } = await db.auth.signInWithOtp({ phone });
  if (sent) throw sent;
  const { data, error } = await db.auth.verifyOtp({ phone, token: env('DEMO_OTP'), type: 'sms' });
  if (error || !data.user) throw error ?? new Error('no user');
  const me = data.user.id;

  await db.from('profiles').update({ first_name: 'فيصل', father_name: 'خالد' }).eq('id', me);

  const { data: owned } = await db.from('trees').select('id').eq('owner_id', me);
  if (owned?.length) {
    console.log(`demo account already owns ${owned.length} tree(s); nothing planted`);
    return;
  }

  const { data: treeId, error: e1 } = await db.rpc('create_tree', { requested: 'extended' });
  if (e1 || !treeId) throw e1 ?? new Error('no tree');
  const session = data.session;
  if (!session) throw new Error('no session');
  const app = env('APP_URL').replace(/\/$/, '');
  const auth = { authorization: `Bearer ${session.access_token}` };
  // The app makes the key and keeps it wrapped; the database never sees it plain.
  const made = await fetch(`${app}/api/trees/${treeId}/key`, { method: 'POST', headers: auth });
  if (!made.ok) throw new Error(`making the tree key failed: ${made.status} ${await made.text()}`);
  const { key } = (await made.json()) as { key: string };
  const file: TreeFile = {
    format: 'sulalah-tree',
    version: 1,
    tree: {
      id: treeId,
      title: 'شجرة آل السهلي',
      family: 'السهلي',
      rootId: 'mohammed',
      ancestors: demoAncestors,
    },
    people: [...demoFamily, ...demoSpouses].map((p) => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      fatherId: p.fatherId ?? null,
      status: 'approved' as const,
      ...(p.deceased ? { deceased: true } : {}),
    })),
    unions: demoUnions.map((u) => ({ aId: u.aId, bId: u.bId })),
    submissions: [],
    updatedAt: new Date().toISOString(),
  };
  // Saves go through the app, which checks every change before storing it.
  const res = await fetch(`${app}/api/trees/${treeId}/file`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify({ from: 0, sealed: await sealTree(file, key) }),
  });
  if (!res.ok) throw new Error(`saving the tree failed: ${res.status} ${await res.text()}`);

  console.log(`planted ${file.people.length} people in tree ${treeId}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
