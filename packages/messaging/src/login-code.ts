/**
 * Sends a sign-in code: WhatsApp first, and SMS when WhatsApp fails or when the person asks
 * for the code again (a resend within ten minutes means WhatsApp did not reach them).
 * Until the accounts exist, a mock channel writes the code to the server log, and refuses to
 * on production.
 */

export type Channel = 'whatsapp' | 'sms' | 'mock';

export interface Attempt {
  channel: Channel;
  ok: boolean;
  error?: string;
}

export interface MessagingConfig {
  /** Meta WhatsApp Cloud API: an approved "authentication" template with one code parameter. */
  whatsapp?: { token: string; phoneNumberId: string; template: string; language?: string };
  /** Unifonic: the app id and a sender name registered with CST. */
  sms?: { appSid: string; senderId: string };
  /** Production never falls back to the log. */
  production: boolean;
}

export const RESEND_WINDOW_MS = 10 * 60_000;

/** The channels to try, in order, given the codes this phone was sent lately. */
export function channelsFor(
  config: MessagingConfig,
  recent: { channel: Channel; ok: boolean; at: Date }[],
  now: Date,
): Channel[] {
  const resend = recent.some(
    (r) => r.channel === 'whatsapp' && r.ok && now.getTime() - r.at.getTime() < RESEND_WINDOW_MS,
  );
  const out: Channel[] = [];
  if (config.whatsapp && !resend) out.push('whatsapp');
  if (config.sms) out.push('sms');
  if (!out.length && config.whatsapp) out.push('whatsapp');
  if (!out.length && !config.production) out.push('mock');
  return out;
}

export const smsText = (code: string) => `رمز الدخول إلى سُلالة: ${code}\nلا تعطه لأحد.`;

export async function sendLoginCode(
  p: { phone: string; code: string; channels: Channel[] },
  config: MessagingConfig,
  fetcher: typeof fetch = fetch,
  log: (line: string) => void = console.info,
): Promise<Attempt[]> {
  const to = p.phone.replace(/^\+/, '');
  const attempts: Attempt[] = [];
  for (const channel of p.channels) {
    try {
      if (channel === 'whatsapp') await whatsapp(config.whatsapp!, to, p.code, fetcher);
      else if (channel === 'sms') await unifonic(config.sms!, to, p.code, fetcher);
      else log(`[login code] +${to.slice(0, 5)}••••${to.slice(-2)}: ${p.code}`);
      attempts.push({ channel, ok: true });
      return attempts;
    } catch (e) {
      attempts.push({ channel, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return attempts;
}

async function whatsapp(
  c: NonNullable<MessagingConfig['whatsapp']>,
  to: string,
  code: string,
  fetcher: typeof fetch,
) {
  const res = await fetcher(`https://graph.facebook.com/v21.0/${c.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: c.template,
        language: { code: c.language ?? 'ar' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          // Authentication templates carry a "copy code" button that takes the code too.
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: code }],
          },
        ],
      },
    }),
  });
  if (!res.ok) throw new Error(`whatsapp answered ${res.status}`);
}

async function unifonic(
  c: NonNullable<MessagingConfig['sms']>,
  to: string,
  code: string,
  fetcher: typeof fetch,
) {
  const res = await fetcher('https://el.cloud.unifonic.com/rest/SMS/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      AppSid: c.appSid,
      SenderID: c.senderId,
      Recipient: to,
      Body: smsText(code),
      responseType: 'JSON',
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: string | boolean;
    message?: string;
  };
  if (!res.ok || String(body.success) !== 'true')
    throw new Error(`unifonic: ${body.message ?? res.status}`);
}

/** Reads the channels from the environment; a channel without all its keys stays off. */
export function messagingConfig(env: Record<string, string | undefined>): MessagingConfig {
  return {
    ...(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_TEMPLATE
      ? {
          whatsapp: {
            token: env.WHATSAPP_TOKEN,
            phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
            template: env.WHATSAPP_TEMPLATE,
            ...(env.WHATSAPP_TEMPLATE_LANG ? { language: env.WHATSAPP_TEMPLATE_LANG } : {}),
          },
        }
      : {}),
    ...(env.UNIFONIC_APP_SID && env.UNIFONIC_SENDER_ID
      ? { sms: { appSid: env.UNIFONIC_APP_SID, senderId: env.UNIFONIC_SENDER_ID } }
      : {}),
    production: env.NEXT_PUBLIC_APP_ENV === 'production',
  };
}
