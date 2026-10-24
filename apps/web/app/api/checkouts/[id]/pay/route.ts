import { handleWebhook, sandboxEvent } from '@sulalah/billing';
import { z } from 'zod';
import { billingAsServer } from '@/server/billing/clients';
import { appUrl, liveMode, payMode, paymentProvider, webhookSecret } from '@/server/billing/env';
import { fail, json, noBackend } from '@/server/billing/http';
import { supabaseStore } from '@/server/billing/store';
import { ownCheckout } from '@/server/billing/view';

const body = z.discriminatedUnion('method', [
  /** Moyasar's form made a payment in the browser; remember its id. The webhook decides. */
  z.object({ method: z.literal('form'), paymentId: z.string().min(1).max(64) }),
  /** One tap with the card saved on the subscription. */
  z.object({ method: z.literal('saved') }),
  /** The sandbox's card form, until Moyasar is connected. */
  z.object({
    method: z.literal('sandbox'),
    cardNumber: z.string().min(12).max(23),
    saveCard: z.boolean(),
  }),
]);

/**
 * Starts paying a checkout. Nothing here activates a plan: activation happens only when the
 * provider reports the payment (the webhook), checked against the provider and the checkout.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const off = noBackend();
  if (off) return off;
  const own = await ownCheckout((await params).id);
  if (!own) return fail(404, 'no_checkout', 'ما لقينا عملية الدفع');
  if (own.checkout.status === 'paid') return json({ status: 'paid' });
  if (own.checkout.status === 'expired')
    return fail(409, 'expired', 'انتهت صلاحية العملية، ابدأ من جديد');
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, 'bad_request', 'طلب غير مفهوم');

  const store = supabaseStore(billingAsServer());
  const provider = paymentProvider();
  const c = own.checkout;
  const metadata = { checkout_id: c.id, tree_id: c.tree_id };
  const p = parsed.data;

  if (p.method === 'form') {
    if (payMode !== 'moyasar') return fail(400, 'wrong_mode', 'طريقة دفع غير متاحة');
    await store.attachPayment(c.id, p.paymentId);
    return json({ status: 'waiting' });
  }

  if (p.method === 'saved') {
    const server = billingAsServer();
    const { data: sub } = await server
      .from('subscriptions')
      .select('payment_method_id')
      .eq('tree_id', c.tree_id)
      .maybeSingle();
    const { data: card } = sub?.payment_method_id
      ? await server
          .from('payment_methods')
          .select('token')
          .eq('id', sub.payment_method_id)
          .maybeSingle()
      : { data: null };
    if (!card) return fail(409, 'no_card', 'ما فيه بطاقة محفوظة');
    const payment = await provider.chargeToken({
      amount: c.amount_halalas,
      token: card.token,
      description: 'باقة سُلالة',
      metadata,
      callbackUrl: own.view.callbackUrl,
    });
    await store.attachPayment(c.id, payment.id);
    if (payment.transactionUrl && payment.status === 'initiated')
      return json({ status: 'redirect', url: payment.transactionUrl });
    if (payMode === 'sandbox') await deliver(payment);
    return json({
      status: payment.status === 'failed' ? 'failed' : 'waiting',
      message: payment.message,
    });
  }

  if (payMode !== 'sandbox' || !provider.pay) return fail(400, 'wrong_mode', 'طريقة دفع غير متاحة');
  const payment = provider.pay({
    amount: c.amount_halalas,
    metadata,
    cardNumber: p.cardNumber,
    saveCard: p.saveCard,
  });
  await store.attachPayment(c.id, payment.id);
  await deliver(payment);
  return json({
    status: payment.status === 'failed' ? 'failed' : 'waiting',
    message: payment.message,
  });

  /** The sandbox delivers its webhook the way Moyasar would: to the same handler, same checks. */
  async function deliver(payment: Parameters<typeof sandboxEvent>[0]) {
    const res = await fetch(`${appUrl}/api/webhooks/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sandboxEvent(payment, webhookSecret)),
    }).catch(() => null);
    // When the app cannot reach itself (some local setups), handle it in place, same code.
    if (!res?.ok)
      await handleWebhook(sandboxEvent(payment, webhookSecret), {
        secret: webhookSecret,
        provider,
        store,
        live: liveMode,
      });
  }
}
