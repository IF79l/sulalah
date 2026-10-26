import { describe, expect, it } from 'vitest';
import { awsProtector, signV4 } from './aws';
import { fromB64, toB64, toB64url } from './bytes';
import { keyRingFromEnv } from './env';
import { gcpProtector } from './gcp';
import { derivedLocalKey, localProtector } from './local';
import { KeyRing, keyContext } from './protector';
import { vaultProtector } from './vault';

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill);
const treeKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
const ctx = keyContext('tree', '11111111-1111-4111-8111-111111111111');

/** A stand-in key service: "encrypts" by tagging, and refuses a context that does not match. */
function fakeService(check: (url: string, init: RequestInit) => void) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    check(String(url), init);
    const body = String(url).includes('oauth2') || !init.body ? {} : JSON.parse(String(init.body));
    calls.push({ url: String(url), body });
    const reply = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
    const u = String(url);
    if (u.includes('oauth2')) return reply({ access_token: 'tok', expires_in: 3600 });
    const seal = (plain: string, aad: string) => `sealed.${aad}.${plain}`;
    const open = (sealed: string, aad: string) => {
      const [tag, a, p] = sealed.split('.');
      return tag === 'sealed' && a === aad ? p : null;
    };
    // Vault
    if (u.includes('/encrypt/'))
      return reply({ data: { ciphertext: seal(body.plaintext, body.associated_data) } });
    if (u.includes('/decrypt/')) {
      const p = open(body.ciphertext, body.associated_data);
      return p ? reply({ data: { plaintext: p } }) : reply({ errors: ['bad'] }, 400);
    }
    // Google
    if (u.endsWith(':encrypt'))
      return reply({ ciphertext: seal(body.plaintext, body.additionalAuthenticatedData) });
    if (u.endsWith(':decrypt')) {
      const p = open(body.ciphertext, body.additionalAuthenticatedData);
      return p ? reply({ plaintext: p }) : reply({ error: 'bad' }, 400);
    }
    // AWS
    const target = new Headers(init.headers).get('x-amz-target');
    const aad = btoa(JSON.stringify(body.EncryptionContext ?? {}));
    if (target === 'TrentService.Encrypt')
      return reply({ CiphertextBlob: seal(body.Plaintext, aad) });
    if (target === 'TrentService.Decrypt') {
      const p = open(body.CiphertextBlob, aad);
      return p ? reply({ Plaintext: p }) : reply({ __type: 'InvalidCiphertextException' }, 400);
    }
    return reply({}, 404);
  }) as typeof fetch;
  return { fetcher, calls };
}

describe('local wrapping key', () => {
  const p = localProtector('k1', bytes(32));
  it('wraps and unwraps a tree key', async () => {
    const wrapped = await p.wrap(treeKey, ctx);
    expect(wrapped).not.toContain(toB64url(treeKey));
    expect(await p.unwrap(wrapped, ctx)).toEqual(treeKey);
  });
  it('wraps the same key differently each time', async () => {
    expect(await p.wrap(treeKey, ctx)).not.toBe(await p.wrap(treeKey, ctx));
  });
  it('refuses a wrapped key moved to another tree', async () => {
    const wrapped = await p.wrap(treeKey, ctx);
    await expect(p.unwrap(wrapped, keyContext('tree', 'other'))).rejects.toThrow(
      'could not unwrap',
    );
    await expect(
      p.unwrap(wrapped, keyContext('view', '11111111-1111-4111-8111-111111111111')),
    ).rejects.toThrow();
  });
  it('refuses another wrapping key', async () => {
    const wrapped = await p.wrap(treeKey, ctx);
    await expect(localProtector('k1', bytes(32, 9)).unwrap(wrapped, ctx)).rejects.toThrow();
  });
  it('refuses a short key and a bad name', () => {
    expect(() => localProtector('k1', bytes(16))).toThrow('32 bytes');
    expect(() => localProtector('a b', bytes(32))).toThrow('name');
  });
  it('derives the same staging key from the same secret, a different one otherwise', async () => {
    expect(await derivedLocalKey('s')).toEqual(await derivedLocalKey('s'));
    expect(await derivedLocalKey('s')).not.toEqual(await derivedLocalKey('t'));
  });
});

describe('key ring and rotation', () => {
  const old = localProtector('k1', bytes(32, 1));
  const next = localProtector('k2', bytes(32, 2));
  it('wraps new keys with the active key and opens old ones', async () => {
    const before = new KeyRing(old);
    const w1 = await before.wrap(treeKey, ctx);
    expect(w1.kekId).toBe('local:k1');
    const ring = new KeyRing(next, [old]);
    expect(ring.stale(w1.kekId)).toBe(true);
    expect(await ring.unwrap(w1.kekId, w1.wrapped, ctx)).toEqual(treeKey);
    const w2 = await ring.rewrap(w1.kekId, w1.wrapped, ctx);
    expect(w2.kekId).toBe('local:k2');
    expect(ring.stale(w2.kekId)).toBe(false);
    expect(await new KeyRing(next).unwrap(w2.kekId, w2.wrapped, ctx)).toEqual(treeKey);
  });
  it('says which wrapping key is missing', async () => {
    await expect(new KeyRing(next).unwrap('local:k1', 'x', ctx)).rejects.toThrow('"local:k1"');
  });
});

describe('settings', () => {
  const k = (fill: number) => toB64url(bytes(32, fill));
  it('takes the first local key as active and keeps the rest for opening', async () => {
    const ring = await keyRingFromEnv(
      { TREE_KEYS_LOCAL: `k2:${k(2)}, k1:${k(1)}` },
      { appEnv: 'production' },
    );
    expect(ring.active.id).toBe('local:k2');
    expect(ring.ids).toEqual(['local:k2', 'local:k1']);
  });
  it('refuses production without a wrapping key', async () => {
    await expect(keyRingFromEnv({}, { appEnv: 'production', fallbackSecret: 's' })).rejects.toThrow(
      'no wrapping key',
    );
  });
  it('lets staging fall back to a derived key, and keeps it once a real key is set', async () => {
    const fallback = await keyRingFromEnv({}, { appEnv: 'staging', fallbackSecret: 's' });
    expect(fallback.active.id).toBe('local:derived');
    const w = await fallback.wrap(treeKey, ctx);
    const later = await keyRingFromEnv(
      { TREE_KEYS_LOCAL: `k1:${k(1)}` },
      { appEnv: 'staging', fallbackSecret: 's' },
    );
    expect(later.active.id).toBe('local:k1');
    expect(await later.unwrap(w.kekId, w.wrapped, ctx)).toEqual(treeKey);
  });
  it('switches services with the old one kept for opening', async () => {
    const ring = await keyRingFromEnv(
      {
        TREE_KEYS_PROVIDER: 'vault',
        TREE_KEYS_LOCAL: `k1:${k(1)}`,
        TREE_KEYS_VAULT_ADDR: 'https://vault.local',
        TREE_KEYS_VAULT_TOKEN: 't',
        TREE_KEYS_VAULT_KEY: 'trees',
      },
      { appEnv: 'production' },
    );
    expect(ring.active.id).toBe('vault:trees');
    expect(ring.ids).toContain('local:k1');
  });
  it('names what is missing', async () => {
    await expect(
      keyRingFromEnv({ TREE_KEYS_PROVIDER: 'gcp' }, { appEnv: 'production' }),
    ).rejects.toThrow('settings are missing');
    await expect(
      keyRingFromEnv({ TREE_KEYS_PROVIDER: 'kms' }, { appEnv: 'production' }),
    ).rejects.toThrow('unknown');
    await expect(
      keyRingFromEnv(
        { TREE_KEYS_AWS_KEY: 'alias/x', TREE_KEYS_AWS_REGION: 'me-central-1' },
        { appEnv: 'production' },
      ),
    ).rejects.toThrow('AWS_ACCESS_KEY_ID');
  });
});

describe('key services', () => {
  it('Vault transit: sends the token and binds the context', async () => {
    const { fetcher, calls } = fakeService((_u, init) =>
      expect(new Headers(init.headers).get('x-vault-token')).toBe('t'),
    );
    const p = vaultProtector({
      address: 'https://vault.local/',
      token: 't',
      key: 'trees',
      fetch: fetcher,
    });
    const w = await p.wrap(treeKey, ctx);
    expect(calls[0]!.url).toBe('https://vault.local/v1/transit/encrypt/trees');
    expect(await p.unwrap(w, ctx)).toEqual(treeKey);
    await expect(p.unwrap(w, 'sulalah:tree:other')).rejects.toThrow('vault decrypt failed (400)');
  });
  it('Google Cloud KMS: signs in with the service account and binds the context', async () => {
    const pair = (await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${toB64(pkcs8)}\n-----END PRIVATE KEY-----\n`;
    const key = 'projects/p/locations/me-central2/keyRings/r/cryptoKeys/trees';
    let assertion = '';
    const { fetcher, calls } = fakeService((u, init) => {
      if (u.includes('oauth2'))
        assertion = new URLSearchParams(String(init.body)).get('assertion') ?? '';
      else expect(new Headers(init.headers).get('authorization')).toBe('Bearer tok');
    });
    const p = gcpProtector({
      key,
      credentials: { client_email: 'svc@p.iam.gserviceaccount.com', private_key: pem },
      fetch: fetcher,
    });
    const w = await p.wrap(treeKey, ctx);
    expect(await p.unwrap(w, ctx)).toEqual(treeKey);
    expect(calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);
    expect(calls.some((c) => c.url === `https://cloudkms.googleapis.com/v1/${key}:encrypt`)).toBe(
      true,
    );
    // The token request is a JWT signed by the service account's key.
    const [h, b, s] = assertion.split('.');
    expect(JSON.parse(atob(b!.replace(/-/g, '+').replace(/_/g, '/')))).toMatchObject({
      iss: 'svc@p.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/cloudkms',
    });
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      pair.publicKey,
      fromB64(s!) as BufferSource,
      new TextEncoder().encode(`${h}.${b}`),
    );
    expect(ok).toBe(true);
    await expect(p.unwrap(w, 'sulalah:tree:other')).rejects.toThrow('google kms decrypt failed');
  });
  it('Google Cloud KMS: refuses a key name that is not one', () => {
    expect(() => gcpProtector({ key: 'trees' })).toThrow('projects/');
  });
  it('AWS KMS: signs each call and binds the context', async () => {
    const { fetcher } = fakeService((_u, init) => {
      const h = new Headers(init.headers);
      expect(h.get('authorization')).toMatch(
        /^AWS4-HMAC-SHA256 Credential=AKID\/\d{8}\/me-central-1\/kms\/aws4_request/,
      );
      expect(h.get('host')).toBeNull();
    });
    const p = awsProtector({
      key: 'alias/sulalah-trees',
      region: 'me-central-1',
      credentials: { accessKeyId: 'AKID', secretAccessKey: 'secret' },
      fetch: fetcher,
    });
    const w = await p.wrap(treeKey, ctx);
    expect(await p.unwrap(w, ctx)).toEqual(treeKey);
    await expect(p.unwrap(w, 'sulalah:tree:other')).rejects.toThrow('aws kms Decrypt failed (400)');
  });
  it('AWS Signature V4 matches the example in the AWS documentation', async () => {
    const h = await signV4({
      method: 'GET',
      url: 'https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08',
      region: 'us-east-1',
      service: 'iam',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
      body: '',
      credentials: {
        accessKeyId: 'AKIDEXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      },
      date: new Date('2015-08-30T12:36:00Z'),
    });
    expect(h.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7',
    );
  });
});
