import { KeyServiceError, callJson, hmac, sha256, toB64, toHex, fromB64 } from './bytes';
import type { KeyProtector } from './protector';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface AwsOptions {
  /** The key's ARN or alias (alias/sulalah-trees). */
  key: string;
  region: string;
  credentials: AwsCredentials;
  endpoint?: string;
  fetch?: typeof fetch;
}

/**
 * AWS KMS. The key never leaves AWS; yearly rotation there needs nothing from us. The tree and
 * purpose go in the encryption context, which KMS checks on every unwrap and writes to its log.
 */
export function awsProtector(o: AwsOptions): KeyProtector {
  if (!/^[a-z]{2}(-[a-z]+)+-\d$/.test(o.region))
    throw new KeyServiceError(`bad AWS region "${o.region}"`);
  const fetcher = o.fetch ?? fetch;
  const endpoint = o.endpoint ?? `https://kms.${o.region}.amazonaws.com/`;
  const call = async <T>(action: 'Encrypt' | 'Decrypt', body: Record<string, unknown>) => {
    const payload = JSON.stringify(body);
    const headers = await signV4({
      method: 'POST',
      url: endpoint,
      region: o.region,
      service: 'kms',
      headers: {
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-target': `TrentService.${action}`,
      },
      body: payload,
      credentials: o.credentials,
    });
    // Signed, but fetch sets the host itself.
    const { host: _host, ...send } = headers;
    return callJson<T>(
      fetcher,
      endpoint,
      { method: 'POST', headers: send, body: payload },
      `aws kms ${action}`,
    );
  };
  return {
    id: `aws:${o.key}`,
    async wrap(plain, context) {
      const r = await call<{ CiphertextBlob: string }>('Encrypt', {
        KeyId: o.key,
        Plaintext: toB64(plain),
        EncryptionContext: { sulalah: context },
      });
      return r.CiphertextBlob;
    },
    async unwrap(wrapped, context) {
      const r = await call<{ Plaintext: string }>('Decrypt', {
        KeyId: o.key,
        CiphertextBlob: wrapped,
        EncryptionContext: { sulalah: context },
      });
      return fromB64(r.Plaintext);
    },
  };
}

export interface SignInput {
  method: string;
  url: string;
  region: string;
  service: string;
  headers: Record<string, string>;
  body: string;
  credentials: AwsCredentials;
  /** For tests; otherwise now. */
  date?: Date;
}

const rfc3986 = (s: string) =>
  encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

/** AWS Signature Version 4: answers the headers to send, signature included. */
export async function signV4(i: SignInput): Promise<Record<string, string>> {
  const url = new URL(i.url);
  const stamp = (i.date ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = stamp.slice(0, 8);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(i.headers)) headers[k.toLowerCase()] = v.trim();
  headers.host = url.host;
  headers['x-amz-date'] = stamp;
  if (i.credentials.sessionToken) headers['x-amz-security-token'] = i.credentials.sessionToken;
  const names = Object.keys(headers).sort();
  const query = [...url.searchParams.entries()]
    .map(([k, v]) => [rfc3986(k), rfc3986(v)] as const)
    .sort(([a, x], [b, y]) => (a === b ? (x < y ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const canonical = [
    i.method,
    url.pathname
      .split('/')
      .map((s) => rfc3986(decodeURIComponent(s)))
      .join('/') || '/',
    query,
    names.map((n) => `${n}:${headers[n]}\n`).join(''),
    names.join(';'),
    toHex(await sha256(i.body)),
  ].join('\n');
  const scope = `${day}/${i.region}/${i.service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', stamp, scope, toHex(await sha256(canonical))].join('\n');
  let key = await hmac(new TextEncoder().encode(`AWS4${i.credentials.secretAccessKey}`), day);
  for (const part of [i.region, i.service, 'aws4_request']) key = await hmac(key, part);
  const signature = toHex(await hmac(key, toSign));
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${i.credentials.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`,
  };
}
