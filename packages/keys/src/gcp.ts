import { KeyServiceError, callJson, fromB64, subtle, toB64, toB64url, utf8 } from './bytes';
import type { KeyProtector } from './protector';

export interface GcpOptions {
  /** projects/<p>/locations/me-central2/keyRings/<ring>/cryptoKeys/<key> (Dammam is me-central2). */
  key: string;
  /**
   * A service account's JSON key. Without it the server asks the metadata server for a token,
   * which is how it runs on Google Cloud itself (Cloud Run, GKE, a VM).
   */
  credentials?: { client_email: string; private_key: string; token_uri?: string };
  /** A regional endpoint, when the data must not leave the region's API either. */
  endpoint?: string;
  fetch?: typeof fetch;
}

/** Google Cloud KMS. The key never leaves Google; a new key version there takes over by itself. */
export function gcpProtector(o: GcpOptions): KeyProtector {
  if (!/^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+$/.test(o.key))
    throw new KeyServiceError('the Google Cloud key must look like projects/…/cryptoKeys/<name>');
  const fetcher = o.fetch ?? fetch;
  const endpoint = (o.endpoint ?? 'https://cloudkms.googleapis.com').replace(/\/+$/, '');
  const token = tokenSource(o, fetcher);
  const call = async <T>(verb: 'encrypt' | 'decrypt', body: unknown) =>
    callJson<T>(
      fetcher,
      `${endpoint}/v1/${o.key}:${verb}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${await token()}` },
        body: JSON.stringify(body),
      },
      `google kms ${verb}`,
    );
  return {
    id: `gcp:${o.key}`,
    async wrap(plain, context) {
      const r = await call<{ ciphertext: string }>('encrypt', {
        plaintext: toB64(plain),
        additionalAuthenticatedData: toB64(utf8(context)),
      });
      return r.ciphertext;
    },
    async unwrap(wrapped, context) {
      const r = await call<{ plaintext: string }>('decrypt', {
        ciphertext: wrapped,
        additionalAuthenticatedData: toB64(utf8(context)),
      });
      return fromB64(r.plaintext);
    },
  };
}

const SCOPE = 'https://www.googleapis.com/auth/cloudkms';

/** Access tokens, fetched once and reused until a minute before they run out. */
function tokenSource(o: GcpOptions, fetcher: typeof fetch) {
  let cached: { token: string; until: number } | null = null;
  return async () => {
    if (cached && cached.until > Date.now()) return cached.token;
    const r = o.credentials
      ? await serviceAccountToken(o.credentials, fetcher)
      : await callJson<{ access_token: string; expires_in: number }>(
          fetcher,
          'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
          { headers: { 'metadata-flavor': 'Google' } },
          'google metadata token',
        );
    cached = { token: r.access_token, until: Date.now() + (r.expires_in - 60) * 1000 };
    return cached.token;
  };
}

async function serviceAccountToken(
  c: NonNullable<GcpOptions['credentials']>,
  fetcher: typeof fetch,
) {
  const uri = c.token_uri ?? 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const part = (v: unknown) => toB64url(utf8(JSON.stringify(v)));
  const unsigned = `${part({ alg: 'RS256', typ: 'JWT' })}.${part({
    iss: c.client_email,
    scope: SCOPE,
    aud: uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const pem = c.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await subtle().importKey(
    'pkcs8',
    fromB64(pem) as BufferSource,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await subtle().sign('RSASSA-PKCS1-v1_5', key, utf8(unsigned)));
  return callJson<{ access_token: string; expires_in: number }>(
    fetcher,
    uri,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${toB64url(sig)}`,
      }).toString(),
    },
    'google token',
  );
}
