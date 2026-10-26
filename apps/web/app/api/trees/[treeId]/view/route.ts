import { z } from 'zod';
import { isLiveTreeId } from '@/lib/backend';
import { fail, json, noBackend } from '@/server/billing/http';
import { roleIn, signedIn, treesAsServer } from '@/server/trees/db';
import { clearViewCopies, publishViewCopy } from '@/server/trees/view';

const body = z.object({ action: z.enum(['open', 'close', 'renew', 'publish']) });

/**
 * The visitors' copy. open, close and renew (after a view link is stopped: a new folder and a
 * new key) are the owner's; set_view_open checks that as the signed in person. publish builds
 * the copy again from the last save, for the owner or a reviewer.
 */
export async function POST(req: Request, { params }: { params: Promise<{ treeId: string }> }) {
  const off = noBackend();
  if (off) return off;
  const { treeId } = await params;
  if (!isLiveTreeId(treeId)) return fail(404, 'no_tree', 'الشجرة غير موجودة');
  const me = await signedIn(req);
  if (!me) return fail(401, 'signed_out', 'سجّل دخولك من جديد');
  const input = body.safeParse(await req.json().catch(() => null));
  if (!input.success) return fail(400, 'bad_request', 'طلب غير صالح');
  const { action } = input.data;
  const db = treesAsServer();
  try {
    let slug: string | null = null;
    if (action === 'publish') {
      const role = (await roleIn(db, treeId, me.user.id))?.role;
      if (role !== 'owner' && role !== 'reviewer') return fail(403, 'not_allowed', 'غير مسموح');
    } else {
      const { data, error } = await me.db.rpc('set_view_open', {
        tree: treeId,
        open: action !== 'close',
        fresh: action === 'renew',
      });
      if (error) {
        if (error.code === '42501') return fail(403, 'not_allowed', 'مالك الشجرة فقط');
        throw error;
      }
      slug = data;
    }
    if (action === 'close') {
      await clearViewCopies(treeId, db);
      return json({ open: false });
    }
    const path = await publishViewCopy(treeId, db);
    return json({ open: true, slug: slug ?? path?.split('/')[1] ?? null, ready: !!path });
  } catch (e) {
    console.error('visitors copy failed', treeId, action, e);
    return fail(500, 'view_failed', 'تعذّر تجهيز نسخة الزوار، حاول مرة ثانية');
  }
}
