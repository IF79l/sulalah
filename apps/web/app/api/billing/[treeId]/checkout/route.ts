import { openCheckout } from '@sulalah/billing';
import { planIds } from '@sulalah/domain';
import { z } from 'zod';
import { isLiveTreeId } from '@/lib/backend';
import { billingAsServer } from '@/server/billing/clients';
import { payMode } from '@/server/billing/env';
import { fail, json, noBackend } from '@/server/billing/http';
import { supabaseStore } from '@/server/billing/store';
import { ownCheckout, ownerOf } from '@/server/billing/view';

const body = z.object({
  plan: z.enum(planIds as ['family', 'extended', 'tribe']),
  cycle: z.enum(['monthly', 'annual']),
});

const reasons = {
  not_on_sale: 'هذي الباقة ما عليها سعر بعد، يُعلن عند الإطلاق',
  already_on_it: 'شجرتك على هذي الباقة',
  is_downgrade: 'النزول لباقة أصغر يصير عند التجديد، بدون دفع الآن',
  unknown_plan: 'باقة غير معروفة',
} as const;

/** Opens a checkout for the owner, priced here from the plans table and the subscription. */
export async function POST(req: Request, { params }: { params: Promise<{ treeId: string }> }) {
  const off = noBackend();
  if (off) return off;
  const { treeId } = await params;
  if (!isLiveTreeId(treeId)) return fail(404, 'no_tree', 'الشجرة غير موجودة');
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, 'bad_request', 'اختر الباقة والمدة');
  const me = await ownerOf(treeId);
  if (!me) return fail(403, 'not_owner', 'الباقة يديرها مالك الشجرة');

  const result = await openCheckout(supabaseStore(billingAsServer()), {
    treeId,
    userId: me.userId,
    ...parsed.data,
    provider: payMode,
    now: new Date(),
  });
  if (!result.ok) return fail(409, result.reason, reasons[result.reason]);
  const own = await ownCheckout(result.checkout.id);
  return json(own!.view, 201);
}
