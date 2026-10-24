import { fail, json, noBackend } from '@/server/billing/http';
import { ownCheckout } from '@/server/billing/view';

/** Where a checkout stands; the return page asks until the webhook has settled it. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const off = noBackend();
  if (off) return off;
  const own = await ownCheckout((await params).id);
  if (!own) return fail(404, 'no_checkout', 'ما لقينا عملية الدفع');
  return json(own.view);
}
