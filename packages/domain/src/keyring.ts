/**
 * Keys that open keys, so nobody handles a code. Each person has one account key; it is sealed
 * with a secret only their passkey (Face ID, fingerprint) can produce, and each of their tree
 * keys is sealed with it. The server keeps the sealed copies and can open none of them.
 */
import { fromB64url, toB64url } from './treefile';

const enc = new TextEncoder();

async function aes(key: string) {
  const raw = fromB64url(key);
  if (raw.length !== 32) throw new Error('bad-key');
  return globalThis.crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** A fresh 256-bit account key. */
export function generateAccountKey(): string {
  return toB64url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * Seals one key with another. `context` (a user or tree id) is bound in, so a sealed key moved
 * to another row does not open.
 */
export async function wrapKey(secret: string, wrapping: string, context: string): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(context) },
    await aes(wrapping),
    fromB64url(secret),
  );
  return `${toB64url(iv)}.${toB64url(new Uint8Array(data))}`;
}

export async function unwrapKey(
  sealed: string,
  wrapping: string,
  context: string,
): Promise<string> {
  const [iv, data] = sealed.split('.');
  if (!iv || !data) throw new Error('bad-wrapped-key');
  const plain = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64url(iv), additionalData: enc.encode(context) },
    await aes(wrapping),
    fromB64url(data),
  );
  return toB64url(new Uint8Array(plain));
}

/** The passkey's PRF output, as a key. */
export const keyFromSecret = (secret: ArrayBuffer | Uint8Array) =>
  toB64url(secret instanceof Uint8Array ? secret : new Uint8Array(secret));
