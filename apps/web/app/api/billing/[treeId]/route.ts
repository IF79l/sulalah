import { isLiveTreeId } from '@/lib/backend';
import { fail, json, noBackend } from '@/server/billing/http';
import { billingView, ownerOf } from '@/server/billing/view';

/** The tree's plan, subscription, saved card and invoices, for its owner. */
export async function GET(_: Request, { params }: { params: Promise<{ treeId: string }> }) {
  const off = noBackend();
  if (off) return off;
  const { treeId } = await params;
  if (!isLiveTreeId(treeId)) return fail(404, 'no_tree', 'الشجرة غير موجودة');
  const me = await ownerOf(treeId);
  if (!me) return fail(403, 'not_owner', 'الباقة يديرها مالك الشجرة');
  return json(await billingView(me.db, treeId));
}
