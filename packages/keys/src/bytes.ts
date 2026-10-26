/** Small byte helpers shared by the key services. WebCrypto only, so it runs anywhere. */

export const subtle = () => globalThis.crypto.subtle;

export const utf8 = (text: string) => new TextEncoder().encode(text);

export function toB64(bytes: Uint8Array) {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

export function fromB64(text: string) {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export const toB64url = (bytes: Uint8Array) =>
  toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256(data: Uint8Array | string) {
  const bytes = typeof data === 'string' ? utf8(data) : data;
  return new Uint8Array(await subtle().digest('SHA-256', bytes as BufferSource));
}

export async function hmac(key: Uint8Array, data: string) {
  const k = await subtle().importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await subtle().sign('HMAC', k, utf8(data)));
}

/** Calls a key service and answers its JSON, or throws with its status and a short reason. */
export async function callJson<T>(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  what: string,
): Promise<T> {
  const res = await fetcher(url, init);
  const text = await res.text();
  if (!res.ok) throw new KeyServiceError(`${what} failed (${res.status}): ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export class KeyServiceError extends Error {}
