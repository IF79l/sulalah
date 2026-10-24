import { planIds } from '@sulalah/domain';
import { z } from 'zod';
import { isLiveTreeId } from '@/lib/backend';
import { fail, json, noBackend } from '@/server/billing/http';
import { billingView, ownerOf } from '@/server/billing/view';

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('unschedule') }),
  z.object({
    action: z.literal('schedule'),
    plan: z.enum(planIds as ['family', 'extended', 'tribe']),
    cycle: z.enum(['monthly', 'annual']),
  }),
]);

const messages: Record<string, string> = {
  'not a downgrade': 'الترقية تُدفع الآن، ما تُجدول',
  'plan not on sale': 'هذي الباقة ما عليها سعر بعد',
  'nothing to cancel': 'ما فيه اشتراك مدفوع يتجدد',
  'nothing to resume': 'الاشتراك مستمر أصلًا',
  'no paid plan': 'ما فيه اشتراك مدفوع',
};

/** Cancel, resume, or a downgrade at renewal. Each is one database function, as the owner. */
export async function POST(req: Request, { params }: { params: Promise<{ treeId: string }> }) {
  const off = noBackend();
  if (off) return off;
  const { treeId } = await params;
  if (!isLiveTreeId(treeId)) return fail(404, 'no_tree', 'الشجرة غير موجودة');
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, 'bad_request', 'طلب غير مفهوم');
  const me = await ownerOf(treeId);
  if (!me) return fail(403, 'not_owner', 'الباقة يديرها مالك الشجرة');

  const a = parsed.data;
  const { error } =
    a.action === 'cancel'
      ? await me.db.rpc('billing_cancel', { tree: treeId })
      : a.action === 'resume'
        ? await me.db.rpc('billing_resume', { tree: treeId })
        : await me.db.rpc('billing_schedule_change', {
            tree: treeId,
            plan: a.action === 'schedule' ? a.plan : null,
            cycle: a.action === 'schedule' ? a.cycle : null,
          });
  if (error) return fail(409, 'refused', messages[error.message] ?? 'ما قدرنا نغيّر الاشتراك');
  return json(await billingView(me.db, treeId));
}
