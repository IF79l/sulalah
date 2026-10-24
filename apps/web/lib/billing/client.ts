'use client';

import type { BillingCycle, PlanId } from '@sulalah/domain';
import { useCallback, useEffect, useState } from 'react';
import { backendOn, isLiveTreeId } from '@/lib/backend';
import {
  demoChange,
  demoCheckout,
  demoInvoice,
  demoPay,
  demoStartCheckout,
  demoView,
} from './demo';
import type { BillingView, ChangeAction, CheckoutView, InvoiceView } from './types';

/** A real tree talks to /api/billing; the sample tree plays it all in the browser. */
const isLive = (treeId: string) => backendOn && isLiveTreeId(treeId);

export class BillingError extends Error {}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message: string } };
  if (!res.ok) throw new BillingError(body.error?.message ?? 'صار خطأ، حاول مرة ثانية');
  return body;
}

const orThrow = <T>(v: T | { error: string }): T => {
  if (v && typeof v === 'object' && 'error' in v) throw new BillingError(v.error);
  return v as T;
};

export const billing = {
  view: (treeId: string): Promise<BillingView> =>
    isLive(treeId) ? call(`/api/billing/${treeId}`) : Promise.resolve(demoView()),

  startCheckout: (treeId: string, plan: PlanId, cycle: BillingCycle): Promise<CheckoutView> =>
    isLive(treeId)
      ? call(`/api/billing/${treeId}/checkout`, {
          method: 'POST',
          body: JSON.stringify({ plan, cycle }),
        })
      : Promise.resolve(orThrow(demoStartCheckout(treeId, plan, cycle))),

  change: (treeId: string, a: ChangeAction): Promise<BillingView> =>
    isLive(treeId)
      ? call(`/api/billing/${treeId}/change`, { method: 'POST', body: JSON.stringify(a) })
      : Promise.resolve(orThrow(demoChange(a))),

  checkout: (treeId: string, id: string): Promise<CheckoutView | null> =>
    isLive(treeId) ? call(`/api/checkouts/${id}`) : Promise.resolve(demoCheckout(id)),

  pay: (
    treeId: string,
    id: string,
    p:
      | { method: 'saved' }
      | { method: 'sandbox'; cardNumber: string; saveCard: boolean }
      | { method: 'form'; paymentId: string },
  ): Promise<{
    status: 'waiting' | 'failed' | 'paid' | 'redirect';
    message?: string;
    url?: string;
  }> =>
    isLive(treeId)
      ? call(`/api/checkouts/${id}/pay`, { method: 'POST', body: JSON.stringify(p) })
      : Promise.resolve(p.method === 'form' ? { status: 'waiting' } : demoPay(id, p)),

  invoice: async (treeId: string, id: string): Promise<InvoiceView | null> =>
    isLive(treeId)
      ? ((await call<BillingView>(`/api/billing/${treeId}`)).invoices.find((i) => i.id === id) ??
        null)
      : demoInvoice(id),
};

/** Loads a tree's billing and keeps it fresh after each change. */
export function useBilling(treeId: string) {
  const [view, setView] = useState<BillingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    billing
      .view(treeId)
      .then((v) => {
        setView(v);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [treeId]);
  useEffect(reload, [reload]);
  return { view, error, reload, setView };
}
