import { callJson, fromB64, toB64, utf8 } from './bytes';
import type { KeyProtector } from './protector';

export interface VaultOptions {
  /** e.g. https://vault.example.sa:8200 */
  address: string;
  token: string;
  /** The transit key's name. */
  key: string;
  /** Where the transit engine is mounted; 'transit' unless set up otherwise. */
  mount?: string;
  namespace?: string;
  fetch?: typeof fetch;
}

/**
 * HashiCorp Vault (or OpenBao) transit engine, which can run on any server in the Kingdom.
 * The key itself never leaves Vault; rotating it there is picked up by "wrap again".
 */
export function vaultProtector(o: VaultOptions): KeyProtector {
  const base = `${o.address.replace(/\/+$/, '')}/v1/${o.mount ?? 'transit'}`;
  const fetcher = o.fetch ?? fetch;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-vault-token': o.token,
  };
  if (o.namespace) headers['x-vault-namespace'] = o.namespace;
  const post = <T>(path: string, body: unknown, what: string) =>
    callJson<T>(
      fetcher,
      `${base}/${path}/${encodeURIComponent(o.key)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
      what,
    );
  return {
    id: `vault:${o.key}`,
    async wrap(plain, context) {
      const r = await post<{ data: { ciphertext: string } }>(
        'encrypt',
        { plaintext: toB64(plain), associated_data: toB64(utf8(context)) },
        'vault encrypt',
      );
      return r.data.ciphertext;
    },
    async unwrap(wrapped, context) {
      const r = await post<{ data: { plaintext: string } }>(
        'decrypt',
        { ciphertext: wrapped, associated_data: toB64(utf8(context)) },
        'vault decrypt',
      );
      return fromB64(r.data.plaintext);
    },
  };
}
