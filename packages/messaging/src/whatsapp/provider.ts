import { render, templates, type MessageInput, type TemplateKey } from './templates';

/**
 * Who actually sends: Meta's WhatsApp Cloud API once the Sulalah number is approved, a mock
 * that writes to the server log until then. The mock refuses production, so a missing key on
 * production fails loudly instead of losing messages quietly.
 */

export interface WhatsAppMessage {
  /** Digits only, with the country code: 966551234567. */
  to: string;
  template: TemplateKey;
  input: MessageInput;
}

export type SendResult =
  | { ok: true; id: string }
  /** `retry`: worth trying again later; otherwise the message can never go as it is. */
  | { ok: false; retry: boolean; error: string };

export interface WhatsAppProvider {
  name: 'meta' | 'mock';
  send(m: WhatsAppMessage): Promise<SendResult>;
}

export interface WhatsAppConfig {
  mode: 'meta' | 'mock' | 'off';
  /** Meta: a permanent System User token with whatsapp_business_messaging. */
  token?: string;
  phoneNumberId?: string;
  /** The WhatsApp Business Account, for submitting templates. */
  businessAccountId?: string;
  /** Signs the status webhook (App > Settings > Basic > App secret). */
  appSecret?: string;
  /** Typed on Meta's webhook page when subscribing; Meta echoes it back once. */
  verifyToken?: string;
  apiVersion: string;
  language: string;
  /** Template names on Meta that differ from ours, e.g. after a rejected first draft. */
  names: Partial<Record<TemplateKey, string>>;
  appUrl: string;
  production: boolean;
}

/**
 * Reads the channel from the environment. Without Meta's keys it is the mock outside
 * production and off on production; WHATSAPP_MODE forces either.
 */
export function whatsappConfig(env: Record<string, string | undefined>): WhatsAppConfig {
  const production = env.NEXT_PUBLIC_APP_ENV === 'production';
  const hasKeys = !!(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
  const asked = env.WHATSAPP_MODE;
  const mode: WhatsAppConfig['mode'] =
    asked === 'off'
      ? 'off'
      : asked === 'mock'
        ? production
          ? 'off'
          : 'mock'
        : hasKeys
          ? 'meta'
          : production
            ? 'off'
            : 'mock';
  const names: WhatsAppConfig['names'] = {};
  // WHATSAPP_TEMPLATE predates the registry and names the login template.
  if (env.WHATSAPP_TEMPLATE) names.login_code = env.WHATSAPP_TEMPLATE;
  for (const pair of (env.WHATSAPP_TEMPLATE_NAMES ?? '').split(',')) {
    const [k, v] = pair.split('=').map((s) => s.trim());
    if (k && v && k in templates) names[k as TemplateKey] = v;
  }
  return {
    mode,
    ...(env.WHATSAPP_TOKEN ? { token: env.WHATSAPP_TOKEN } : {}),
    ...(env.WHATSAPP_PHONE_NUMBER_ID ? { phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID } : {}),
    ...(env.WHATSAPP_BUSINESS_ACCOUNT_ID
      ? { businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID }
      : {}),
    ...(env.WHATSAPP_APP_SECRET ? { appSecret: env.WHATSAPP_APP_SECRET } : {}),
    ...(env.WHATSAPP_VERIFY_TOKEN ? { verifyToken: env.WHATSAPP_VERIFY_TOKEN } : {}),
    apiVersion: env.WHATSAPP_API_VERSION || 'v21.0',
    language: env.WHATSAPP_TEMPLATE_LANG || 'ar',
    names,
    appUrl: (env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
    production,
  };
}

export const templateName = (c: WhatsAppConfig, key: TemplateKey) =>
  c.names[key] ?? templates[key].name;

/** The provider for this deployment, or null when WhatsApp is off. */
export function whatsappProvider(
  c: WhatsAppConfig,
  fetcher: typeof fetch = fetch,
  log: (line: string) => void = console.info,
): WhatsAppProvider | null {
  if (c.mode === 'meta') return metaCloud(c, fetcher);
  if (c.mode === 'mock') return mock(c, log);
  return null;
}

// ---------- Meta's errors ----------

/**
 * Errors that will fail again however long we wait: not a WhatsApp number, the person
 * blocked or stopped us, or a template that does not exist or does not match. Everything else
 * (rate limits, Meta being down, an expired token about to be replaced) is retried.
 */
const PERMANENT = new Set([
  100, 131008, 131009, 131021, 131026, 131050, 131051, 132000, 132001, 132005, 132007, 132012,
  132015, 132016, 133010,
]);

export function classifyMetaError(
  status: number,
  body: unknown,
): { retry: boolean; error: string } {
  const e = (
    body as { error?: { code?: number; message?: string; error_data?: { details?: string } } }
  )?.error;
  const code = e?.code;
  const error = `meta ${status}${code ? ` #${code}` : ''}: ${e?.error_data?.details ?? e?.message ?? 'no answer'}`;
  if (status >= 500 || status === 429) return { retry: true, error };
  return { retry: code === undefined ? status >= 500 : !PERMANENT.has(code), error };
}

// ---------- Meta Cloud API ----------

export function metaPayload(c: WhatsAppConfig, m: WhatsAppMessage) {
  const t = templates[m.template];
  const params = t.params(m.input);
  const components: unknown[] = [
    { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
  ];
  if (t.category === 'AUTHENTICATION')
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: params[0] }],
    });
  else if (t.button && t.link)
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: t.link(m.input) }],
    });
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: m.to,
    type: 'template',
    template: {
      name: templateName(c, m.template),
      language: { code: c.language },
      components,
    },
  };
}

function metaCloud(c: WhatsAppConfig, fetcher: typeof fetch): WhatsAppProvider {
  if (!c.token || !c.phoneNumberId) throw new Error('WhatsApp keys are missing');
  return {
    name: 'meta',
    async send(m) {
      let res: Response;
      try {
        res = await fetcher(
          `https://graph.facebook.com/${c.apiVersion}/${c.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
            body: JSON.stringify(metaPayload(c, m)),
            signal: AbortSignal.timeout(15_000),
          },
        );
      } catch (e) {
        return { ok: false, retry: true, error: `network: ${e instanceof Error ? e.message : e}` };
      }
      const body = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
      const id = body.messages?.[0]?.id;
      if (res.ok && id) return { ok: true, id };
      return { ok: false, ...classifyMetaError(res.status, body) };
    },
  };
}

// ---------- Mock ----------

const masked = (to: string) => `+${to.slice(0, 5)}••••${to.slice(-2)}`;

function mock(c: WhatsAppConfig, log: (line: string) => void): WhatsAppProvider {
  if (c.production) throw new Error('the WhatsApp mock is not allowed on production');
  let n = 0;
  return {
    name: 'mock',
    async send(m) {
      const { text, link } = render(m.template, m.input, c.appUrl);
      log(
        `[whatsapp mock] ${masked(m.to)} ${templateName(c, m.template)}: ${text}${link ? ` ${link}` : ''}`,
      );
      return { ok: true, id: `mock.${Date.now().toString(36)}.${(n++).toString(36)}` };
    },
  };
}

/**
 * Submits every template to Meta (WhatsApp Manager does the same by hand). Templates that
 * already exist answer an error and are reported, not changed.
 */
export async function submitTemplates(
  c: WhatsAppConfig,
  list: { name: string }[],
  fetcher: typeof fetch = fetch,
) {
  if (!c.token || !c.businessAccountId)
    throw new Error('WHATSAPP_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID are needed');
  const out: { name: string; ok: boolean; answer: string }[] = [];
  for (const t of list) {
    const res = await fetcher(
      `https://graph.facebook.com/${c.apiVersion}/${c.businessAccountId}/message_templates`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
        body: JSON.stringify(t),
      },
    );
    const body = (await res.json().catch(() => ({}))) as {
      status?: string;
      error?: { message?: string };
    };
    out.push({
      name: t.name,
      ok: res.ok,
      answer: res.ok ? (body.status ?? 'PENDING') : (body.error?.message ?? String(res.status)),
    });
  }
  return out;
}
