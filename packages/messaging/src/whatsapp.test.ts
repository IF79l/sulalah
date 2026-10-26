import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  additions,
  classifyMetaError,
  daysLabel,
  flushOutbox,
  intentOf,
  messagingConfig,
  metaHandshake,
  metaPayload,
  metaTemplates,
  parseMetaWebhook,
  render,
  RETRY_AFTER_MS,
  templates,
  verifyMetaSignature,
  whatsappConfig,
  whatsappProvider,
  type OutboxRow,
  type OutboxStore,
  type WhatsAppProvider,
} from './index';

const treeId = '00000000-0000-4000-8000-0000000000aa';
const now = new Date('2026-10-26T12:00:00Z');

describe('templates', () => {
  it('follow Meta’s rules for every template', () => {
    for (const t of Object.values(templates)) {
      expect(t.name).toMatch(/^[a-z0-9_]{1,512}$/);
      // A variable may not open or close the body, and the numbers run 1, 2, 3 with no gaps.
      // (Meta writes authentication templates itself.)
      if (t.category === 'UTILITY') expect(t.body.trim()).not.toMatch(/^\{\{|\}\}$/);
      const vars = [...t.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
      expect(vars).toEqual(vars.map((_, i) => i + 1));
      expect(t.examples).toHaveLength(vars.length);
      expect(t.params({ actor: 'فيصل بن خالد', count: 2, treeId, data: {} })).toHaveLength(
        vars.length,
      );
      // House style: "" quotes, never «».
      expect(t.body).not.toMatch(/[«»]/);
      if (t.button) expect(t.link).toBeDefined();
    }
  });

  it('say how many in proper Arabic', () => {
    expect([1, 2, 3, 10, 11, 1200].map(additions)).toEqual([
      'إضافة واحدة',
      'إضافتين',
      '3 إضافات',
      '10 إضافات',
      '11 إضافة',
      '1,200 إضافة',
    ]);
  });

  it('tell the owner how long a plan was extended', () => {
    expect([1, 2, 7, 30].map(daysLabel)).toEqual(['يومًا واحدًا', 'يومين', '7 أيام', '30 يومًا']);
    const out = render(
      'plan_extended',
      {
        actor: '',
        count: 30,
        treeId,
        data: { days: 30, plan: 'family', cycle: 'monthly', period_end: '2026-10-29T12:00:00Z' },
      },
      'https://sulalah.sa',
    );
    expect(out.text).toContain('أضفنا 30 يومًا إلى باقة العائلة الشهرية');
    expect(out.text).toContain('29 أكتوبر');
    expect(out.link).toBe(`https://sulalah.sa/trees/${treeId}/plan`);
  });

  it('send a removed member to their own trees', () => {
    const out = render('member_removed', { actor: 'فيصل بن خالد', count: 1, treeId, data: {} });
    expect(out.text).toContain('أزالك فيصل بن خالد');
    expect(out.link).toBe('/trees');
  });

  it('render the words and the link a person gets', () => {
    const out = render(
      'additions_submitted',
      { actor: 'محمد بن سعد', count: 3, treeId, data: {} },
      'https://sulalah.sa/',
    );
    expect(out.text).toBe(
      'وصلتك 3 إضافات من محمد بن سعد على شجرة العائلة في سُلالة، وتنتظر مراجعتك قبل أن تظهر في الشجرة.',
    );
    expect(out.link).toBe(`https://sulalah.sa/trees/${treeId}/review`);
  });

  it('render a payment with the plan, amount and invoice', () => {
    const out = render('payment_received', {
      actor: '',
      count: 1,
      treeId,
      data: {
        amount_halalas: 4950,
        plan: 'extended',
        cycle: 'monthly',
        number: 'SUL-2026-000007',
        invoice_id: 'inv1',
      },
    });
    expect(out.text).toContain('49.50 ريال مقابل باقة العائلة الممتدة الشهرية');
    expect(out.text).toContain('SUL-2026-000007');
    expect(out.link).toBe(`/trees/${treeId}/plan/invoices/inv1`);
  });

  it('keep parameters on one line, as Meta requires', () => {
    const [, name] = templates.additions_submitted.params({
      actor: 'محمد\nبن    سعد',
      count: 1,
      treeId,
      data: {},
    });
    expect(name).toBe('محمد بن سعد');
  });

  it('come out as Meta’s template definitions, with the domain in the button', () => {
    const list = metaTemplates('https://sulalah.sa');
    expect(list).toHaveLength(Object.keys(templates).length);
    const submitted = list.find((t) => t.name === 'sulalah_additions_submitted')!;
    expect(JSON.stringify(submitted)).toContain('https://sulalah.sa/{{1}}');
    expect(list.find((t) => t.name === 'sulalah_login_code')!.category).toBe('AUTHENTICATION');
  });
});

describe('configuration', () => {
  it('is the mock without keys, and off on production', () => {
    expect(whatsappConfig({}).mode).toBe('mock');
    expect(whatsappConfig({ NEXT_PUBLIC_APP_ENV: 'production' }).mode).toBe('off');
    expect(whatsappConfig({ NEXT_PUBLIC_APP_ENV: 'production', WHATSAPP_MODE: 'mock' }).mode).toBe(
      'off',
    );
  });

  it('is Meta once the keys are in', () => {
    const c = whatsappConfig({ WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '1' });
    expect(c.mode).toBe('meta');
    expect(whatsappProvider(c)?.name).toBe('meta');
  });

  it('lets a template be renamed when Meta made us pick another name', () => {
    const c = whatsappConfig({
      WHATSAPP_TEMPLATE: 'old_code',
      WHATSAPP_TEMPLATE_NAMES: 'plan_ended=sulalah_plan_ended_v2, nonsense=x',
    });
    expect(c.names).toEqual({ login_code: 'old_code', plan_ended: 'sulalah_plan_ended_v2' });
  });

  it('sends login codes from the same number with the registry’s template', () => {
    const c = messagingConfig({ WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '1' });
    expect(c.whatsapp?.template).toBe('sulalah_login_code');
  });

  it('never runs the mock on production', () => {
    expect(() =>
      whatsappProvider({ ...whatsappConfig({}), production: true, mode: 'mock' }),
    ).toThrow();
  });
});

describe('sending through Meta', () => {
  const c = whatsappConfig({ WHATSAPP_TOKEN: 'tok', WHATSAPP_PHONE_NUMBER_ID: '42' });

  it('builds the template call with the button’s path', () => {
    const p = metaPayload(c, {
      to: '966551234567',
      template: 'additions_approved',
      input: { actor: 'فيصل بن خالد', count: 2, treeId, data: {} },
    });
    expect(p.template.name).toBe('sulalah_additions_approved');
    expect(p.template.language.code).toBe('ar');
    expect(JSON.stringify(p.template.components)).toContain(`trees/${treeId}`);
  });

  it('answers the message id', async () => {
    let seen = '';
    const fetcher = (async (url: string, init: RequestInit) => {
      seen = `${url} ${(init.headers as Record<string, string>).authorization}`;
      return Response.json({ messages: [{ id: 'wamid.1' }] });
    }) as unknown as typeof fetch;
    const res = await whatsappProvider(c, fetcher)!.send({
      to: '966551234567',
      template: 'member_joined',
      input: { actor: 'سعد', count: 1, treeId, data: {} },
    });
    expect(res).toEqual({ ok: true, id: 'wamid.1' });
    expect(seen).toBe('https://graph.facebook.com/v21.0/42/messages Bearer tok');
  });

  it('tells errors worth retrying from ones that are not', () => {
    expect(classifyMetaError(500, {}).retry).toBe(true);
    expect(classifyMetaError(429, {}).retry).toBe(true);
    expect(classifyMetaError(400, { error: { code: 130429 } }).retry).toBe(true);
    expect(classifyMetaError(400, { error: { code: 131026 } }).retry).toBe(false);
    expect(classifyMetaError(404, { error: { code: 132001, message: 'no template' } })).toEqual({
      retry: false,
      error: 'meta 404 #132001: no template',
    });
  });

  it('logs only part of the number in the mock', async () => {
    const lines: string[] = [];
    await whatsappProvider(whatsappConfig({}), fetch, (l) => lines.push(l))!.send({
      to: '966551234567',
      template: 'owner_now',
      input: { actor: 'فيصل بن خالد', count: 1, treeId, data: {} },
    });
    expect(lines[0]).toContain('نقل فيصل بن خالد ملكية');
    expect(lines[0]).not.toContain('551234567');
  });
});

describe('the outbox', () => {
  const row = (over: Partial<OutboxRow> = {}): OutboxRow => ({
    id: 'm1',
    template: 'additions_submitted',
    phone: '966551234567',
    actor: 'محمد بن سعد',
    count: 2,
    treeId,
    data: {},
    attempts: 0,
    ...over,
  });

  function store(rows: OutboxRow[]) {
    const log: string[] = [];
    const s: OutboxStore = {
      claim: async (n) => rows.splice(0, n),
      sent: async (r, pid) => void log.push(`sent ${r.id} ${pid}`),
      retry: async (r, at) => void log.push(`retry ${r.id} ${at.toISOString()}`),
      failed: async (r, e) => void log.push(`failed ${r.id} ${e}`),
    };
    return { s, log };
  }
  const answering = (...answers: Awaited<ReturnType<WhatsAppProvider['send']>>[]) =>
    ({ name: 'meta', send: async () => answers.shift()! }) satisfies WhatsAppProvider;

  it('sends and records the message id', async () => {
    const { s, log } = store([row()]);
    const r = await flushOutbox({ store: s, provider: answering({ ok: true, id: 'w1' }), now });
    expect(r).toEqual({ sent: 1, retried: 0, failed: 0 });
    expect(log).toEqual(['sent m1 w1']);
  });

  it('tries again later, further apart each time, then gives up', async () => {
    const { s, log } = store([row(), row({ id: 'm2', attempts: RETRY_AFTER_MS.length })]);
    const busy = { ok: false as const, retry: true, error: 'meta 429' };
    const r = await flushOutbox({ store: s, provider: answering(busy, busy), now });
    expect(r).toEqual({ sent: 0, retried: 1, failed: 1 });
    expect(log[0]).toBe(`retry m1 ${new Date(now.getTime() + 60_000).toISOString()}`);
    expect(log[1]).toBe('failed m2 meta 429');
  });

  it('fails at once on what can never go', async () => {
    const { s, log } = store([
      row(),
      row({ id: 'm2', phone: null }),
      row({ id: 'm3', template: 'no_such' }),
    ]);
    const r = await flushOutbox({
      store: s,
      provider: answering({ ok: false, retry: false, error: 'not on WhatsApp' }),
      now,
    });
    expect(r.failed).toBe(3);
    expect(log).toEqual([
      'failed m1 not on WhatsApp',
      'failed m2 no phone number on the account',
      'failed m3 unknown template no_such',
    ]);
  });
});

describe('Meta’s webhook', () => {
  const body = JSON.stringify({ entry: [] });

  it('checks the signature', () => {
    const sig = `sha256=${createHmac('sha256', 'app-secret').update(body).digest('hex')}`;
    expect(verifyMetaSignature('app-secret', sig, body)).toBe(true);
    expect(verifyMetaSignature('other', sig, body)).toBe(false);
    expect(verifyMetaSignature('app-secret', sig, `${body} `)).toBe(false);
    expect(verifyMetaSignature('', sig, body)).toBe(false);
  });

  it('answers the handshake only with our verify token', () => {
    const q = (t: string) =>
      new URLSearchParams({
        'hub.mode': 'subscribe',
        'hub.verify_token': t,
        'hub.challenge': '99',
      });
    expect(metaHandshake(q('mine'), 'mine')).toBe('99');
    expect(metaHandshake(q('theirs'), 'mine')).toBeNull();
    expect(metaHandshake(q(''), undefined)).toBeNull();
  });

  it('reads statuses and stop requests', () => {
    const out = parseMetaWebhook({
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [
                  { id: 'w1', status: 'read', timestamp: '1793016000' },
                  {
                    id: 'w2',
                    status: 'failed',
                    timestamp: '1793016000',
                    errors: [{ code: 131026, title: 'Undeliverable' }],
                  },
                ],
                messages: [
                  { from: '966551234567', type: 'text', text: { body: 'ايقاف التنبيهات' } },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(out.statuses.map((s) => [s.providerId, s.status, s.error])).toEqual([
      ['w1', 'read', undefined],
      ['w2', 'failed', '#131026 Undeliverable'],
    ]);
    expect(out.replies).toEqual([{ from: '966551234567', wants: 'stop' }]);
  });

  it('tells stop from start from a plain reply', () => {
    expect(intentOf('إيقاف')).toBe('stop');
    expect(intentOf('STOP')).toBe('stop');
    expect(intentOf('تشغيل')).toBe('start');
    expect(intentOf('شكرًا')).toBeNull();
  });
});
