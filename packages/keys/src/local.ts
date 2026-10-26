import { KeyServiceError, fromB64, subtle, toB64url, utf8 } from './bytes';
import type { KeyProtector } from './protector';

/**
 * A wrapping key kept in the server's settings (AES-256-GCM). For staging and local work, or
 * until a key service is set up: the key is outside the database, but anyone who can read the
 * server's settings can read it, so production should use a key service.
 */
export function localProtector(name: string, secret: Uint8Array): KeyProtector {
  if (secret.length !== 32) throw new KeyServiceError(`local key "${name}" must be 32 bytes`);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(name))
    throw new KeyServiceError(`bad local key name "${name}"`);
  const key = subtle().importKey('raw', secret as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
  return {
    id: `local:${name}`,
    async wrap(plain, context) {
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const sealed = await subtle().encrypt(
        { name: 'AES-GCM', iv, additionalData: utf8(context) },
        await key,
        plain as BufferSource,
      );
      const out = new Uint8Array(12 + sealed.byteLength);
      out.set(iv);
      out.set(new Uint8Array(sealed), 12);
      return toB64url(out);
    },
    async unwrap(wrapped, context) {
      const bytes = fromB64(wrapped);
      try {
        const plain = await subtle().decrypt(
          { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: utf8(context) },
          await key,
          bytes.slice(12),
        );
        return new Uint8Array(plain);
      } catch {
        throw new KeyServiceError(`local key "${name}" could not unwrap this key`);
      }
    },
  };
}

/**
 * Derives a stable wrapping key from a secret the server already has. Only for staging and
 * local work when no wrapping key is set, so testing does not wait on settings; changing that
 * secret makes every key wrapped this way unreadable.
 */
export async function derivedLocalKey(secret: string): Promise<Uint8Array> {
  const base = await subtle().importKey('raw', utf8(secret) as BufferSource, 'HKDF', false, [
    'deriveBits',
  ]);
  const bits = await subtle().deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8('sulalah-kek'), info: utf8('staging-fallback-v1') },
    base,
    256,
  );
  return new Uint8Array(bits);
}
