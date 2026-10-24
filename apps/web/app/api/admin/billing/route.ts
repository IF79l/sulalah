import { planIds, validVatNumber } from '@sulalah/domain';
import { z } from 'zod';
import type { AdminBilling } from '@/lib/billing/types';
import { billingAsServer, billingAsUser } from '@/server/billing/clients';
import { fail, json, noBackend } from '@/server/billing/http';
import { loadOffers } from '@/server/billing/store';
import { invoiceView } from '@/server/billing/view';

/** Only accounts marked is_platform_admin, which nobody can set on themselves. */
async function admin() {
  const {
    data: { user },
  } = await (await billingAsUser()).auth.getUser();
  if (!user) return null;
  const db = billingAsServer();
  const { data } = await db
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .maybeSingle();
  return data?.is_platform_admin ? { db, userId: user.id } : null;
}

const name = (p?: { first_name: string; father_name: string } | null) =>
  p ? [p.first_name, p.father_name].filter(Boolean).join(' بن ') : '';

export async function GET() {
  const off = noBackend();
  if (off) return off;
  const me = await admin();
  if (!me) return fail(404, 'not_found', 'غير موجود');
  const { db } = me;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [offers, settings, subs, invoices, checkouts, requests, codes, profiles] =
    await Promise.all([
      loadOffers(db),
      db.from('billing_settings').select('*').single(),
      db.from('subscriptions').select('*').order('updated_at', { ascending: false }).limit(200),
      db.from('invoices').select('*').order('issued_at', { ascending: false }).limit(200),
      db.from('checkouts').select('*').order('created_at', { ascending: false }).limit(200),
      db
        .from('trees')
        .select('id, owner_id, plan, requested_plan')
        .not('requested_plan', 'is', null),
      db.from('otp_sends').select('channel, ok').gte('created_at', since).limit(10_000),
      db.from('profiles').select('id, first_name, father_name'),
    ]);
  const trees = await db.from('trees').select('id, owner_id');
  const ownerOf = (treeId: string) => {
    const t = trees.data?.find((x) => x.id === treeId);
    return name(profiles.data?.find((p) => p.id === t?.owner_id));
  };
  const s = settings.data!;
  const body: AdminBilling = {
    offers,
    seller: {
      name: s.seller_name,
      vatNumber: s.vat_number,
      crNumber: s.cr_number,
      address: s.address,
      vatRateBp: s.vat_rate_bp,
    },
    subscriptions: (subs.data ?? []).map((x) => ({
      treeId: x.tree_id,
      owner: ownerOf(x.tree_id),
      plan: x.plan,
      cycle: x.cycle,
      status: x.status,
      provider: x.provider,
      periodEnd: x.period_end,
      cancelAtPeriodEnd: x.cancel_at_period_end,
      scheduledPlan: x.scheduled_plan,
    })),
    invoices: (invoices.data ?? []).map((i) => ({ ...invoiceView(i), treeId: i.tree_id })),
    payments: (checkouts.data ?? []).map((c) => ({
      id: c.id,
      treeId: c.tree_id,
      kind: c.kind,
      plan: c.plan,
      amount: c.amount_halalas,
      status: c.status,
      failureReason: c.failure_reason,
      provider: c.provider,
      createdAt: c.created_at,
    })),
    requests: (requests.data ?? []).map((t) => ({
      treeId: t.id,
      owner: name(profiles.data?.find((p) => p.id === t.owner_id)),
      from: t.plan,
      to: t.requested_plan!,
    })),
    codes: (['whatsapp', 'sms', 'mock'] as const).map((channel) => ({
      channel,
      sent: (codes.data ?? []).filter((r) => r.channel === channel && r.ok).length,
      failed: (codes.data ?? []).filter((r) => r.channel === channel && !r.ok).length,
    })),
  };
  return json(body);
}

const plan = z.enum(planIds as ['family', 'extended', 'tribe']);
const halalas = z.number().int().min(100).max(10_000_000).nullable();
const action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('prices'), plan, monthly: halalas, annual: halalas }),
  z.object({
    action: z.literal('seller'),
    name: z.string().trim().min(2).max(120),
    vatNumber: z
      .string()
      .trim()
      .refine((v) => v === '' || validVatNumber(v)),
    crNumber: z.string().trim().max(20),
    address: z.string().trim().max(200),
  }),
  z.object({
    action: z.literal('grant'),
    treeId: z.uuid(),
    plan,
    until: z.iso.datetime().nullable(),
  }),
]);

export async function POST(req: Request) {
  const off = noBackend();
  if (off) return off;
  const me = await admin();
  if (!me) return fail(404, 'not_found', 'غير موجود');
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, 'bad_request', 'تحقق من القيم');
  const a = parsed.data;
  const { error } =
    a.action === 'prices'
      ? await me.db
          .from('plans')
          .update({
            price_monthly_halalas: a.monthly,
            price_annual_halalas: a.annual,
            updated_at: new Date().toISOString(),
            updated_by: me.userId,
          })
          .eq('id', a.plan)
      : a.action === 'seller'
        ? await me.db
            .from('billing_settings')
            .update({
              seller_name: a.name,
              vat_number: a.vatNumber,
              cr_number: a.crNumber,
              address: a.address,
              updated_at: new Date().toISOString(),
            })
            .eq('id', true)
        : await me.db.rpc('billing_grant_manual', { tree: a.treeId, plan: a.plan, until: a.until });
  if (error) return fail(409, 'refused', error.message);
  return json({ ok: true });
}
