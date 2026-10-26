import { isLiveTreeId } from '@/lib/backend';
import { fail, json, noBackend } from '@/server/billing/http';
import { KeyExists, plantKey, treeKeyOf } from '@/server/keys/store';
import { roleIn, signedIn, treesAsServer } from '@/server/trees/db';

type Ctx = { params: Promise<{ treeId: string }> };

const noStore = { 'cache-control': 'no-store, private' };

/**
 * The tree's key, for its members only (any role: contributors seal their additions with it).
 * It is unwrapped here; the database holds only the wrapped key.
 */
export async function GET(req: Request, { params }: Ctx) {
  const off = noBackend();
  if (off) return off;
  const { treeId } = await params;
  if (!isLiveTreeId(treeId)) return fail(404, 'no_tree', 'الشجرة غير موجودة');
  const me = await signedIn(req);
  if (!me) return fail(401, 'signed_out', 'سجّل دخولك من جديد');
  try {
    const db = treesAsServer();
    if (!(await roleIn(db, treeId, me.user.id)))
      return fail(403, 'not_member', 'ما أنت من أهل هذه الشجرة');
    const key = await treeKeyOf(treeId, db);
    if (!key) return fail(404, 'no_key', 'هذه الشجرة ما لها مفتاح');
    return Response.json({ key }, { headers: noStore });
  } catch (e) {
    console.error('tree key failed', treeId, e);
    return fail(500, 'key_failed', 'تعذّر فتح الشجرة الآن، حاول بعد قليل');
  }
}

/** Makes the key of a tree just planted: its owner only, and only once. */
export async function POST(req: Request, { params }: Ctx) {
  const off = noBackend();
  if (off) return off;
  const { treeId } = await params;
  if (!isLiveTreeId(treeId)) return fail(404, 'no_tree', 'الشجرة غير موجودة');
  const me = await signedIn(req);
  if (!me) return fail(401, 'signed_out', 'سجّل دخولك من جديد');
  try {
    const db = treesAsServer();
    if ((await roleIn(db, treeId, me.user.id))?.role !== 'owner')
      return fail(403, 'not_allowed', 'مالك الشجرة فقط');
    return Response.json({ key: await plantKey(treeId, db) }, { headers: noStore });
  } catch (e) {
    if (e instanceof KeyExists) return fail(409, 'key_exists', 'للشجرة مفتاح من قبل');
    console.error('planting a key failed', treeId, e);
    return fail(500, 'key_failed', 'تعذّر زرع الشجرة الآن، حاول بعد قليل');
  }
}
