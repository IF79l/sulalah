/**
 * Plants the sample family (آل السهلي) on the staging project, signed in as staging's test
 * number, through the same path the app uses: a bare tree record, then a sealed file.
 * Refuses to run anywhere but staging. Running it again leaves an existing demo tree alone.
 *
 *   SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... APP_ENV=staging \
 *   DEMO_PHONE=966500000001 DEMO_OTP=123456 [DEMO_TREE_KEY=...] pnpm seed:staging
 */
import { createClient } from '@supabase/supabase-js';
import { generateTreeKey, recoveryCode, sealTree, type TreeFile } from '@sulalah/domain';
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

  const key = process.env.DEMO_TREE_KEY ?? generateTreeKey();
  const { data: treeId, error: e1 } = await db.rpc('create_tree', { requested: 'extended' });
  if (e1 || !treeId) throw e1 ?? new Error('no tree');
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
  const path = `${treeId}/tree/v1.json`;
  const { error: e2 } = await db.storage
    .from('tree-files')
    .upload(path, JSON.stringify(await sealTree(file, key)), { contentType: 'application/json' });
  if (e2) throw e2;
  const { error: e3 } = await db.rpc('save_tree_file', { tree: treeId, from_version: 0, path });
  if (e3) throw e3;

  console.log(`planted ${file.people.length} people in tree ${treeId}`);
  console.log(`recovery code (type it on the tree page to open it): ${recoveryCode(key)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
