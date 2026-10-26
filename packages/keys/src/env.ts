import { awsProtector } from './aws';
import { KeyServiceError, fromB64 } from './bytes';
import { gcpProtector } from './gcp';
import { derivedLocalKey, localProtector } from './local';
import { KeyRing, type KeyProtector } from './protector';
import { vaultProtector } from './vault';

export type Provider = 'local' | 'gcp' | 'aws' | 'vault';

type Env = Record<string, string | undefined>;

export interface RingOptions {
  /** 'production' refuses to run without a wrapping key; staging and local may fall back. */
  appEnv: 'local' | 'staging' | 'production';
  /** Used only for the staging fallback, when no wrapping key is set at all. */
  fallbackSecret?: string;
  fetch?: typeof fetch;
}

/**
 * Builds the key ring from the server's settings:
 *
 * - TREE_KEYS_PROVIDER: local | gcp | aws | vault, the service that wraps new keys.
 * - local: TREE_KEYS_LOCAL = "k2:<32 bytes base64url>,k1:<…>", newest first.
 * - gcp:   TREE_KEYS_GCP_KEY (+ TREE_KEYS_GCP_CREDENTIALS, TREE_KEYS_GCP_ENDPOINT)
 * - aws:   TREE_KEYS_AWS_KEY, TREE_KEYS_AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *          (+ AWS_SESSION_TOKEN, TREE_KEYS_AWS_ENDPOINT)
 * - vault: TREE_KEYS_VAULT_ADDR, TREE_KEYS_VAULT_TOKEN, TREE_KEYS_VAULT_KEY
 *          (+ TREE_KEYS_VAULT_MOUNT, TREE_KEYS_VAULT_NAMESPACE)
 *
 * Every other service whose settings are present stays in the ring to open keys it wrapped,
 * so moving from one service to another is: add the new one, switch the provider, wrap again.
 */
export async function keyRingFromEnv(env: Env, o: RingOptions): Promise<KeyRing> {
  const all: { provider: Provider; protectors: KeyProtector[] }[] = [];
  const local = parseLocal(env.TREE_KEYS_LOCAL);
  if (local.length) all.push({ provider: 'local', protectors: local });
  if (env.TREE_KEYS_GCP_KEY)
    all.push({
      provider: 'gcp',
      protectors: [
        gcpProtector({
          key: env.TREE_KEYS_GCP_KEY,
          credentials: env.TREE_KEYS_GCP_CREDENTIALS
            ? JSON.parse(env.TREE_KEYS_GCP_CREDENTIALS)
            : undefined,
          endpoint: env.TREE_KEYS_GCP_ENDPOINT,
          fetch: o.fetch,
        }),
      ],
    });
  if (env.TREE_KEYS_AWS_KEY)
    all.push({
      provider: 'aws',
      protectors: [
        awsProtector({
          key: env.TREE_KEYS_AWS_KEY,
          region: need(env, 'TREE_KEYS_AWS_REGION'),
          credentials: {
            accessKeyId: need(env, 'AWS_ACCESS_KEY_ID'),
            secretAccessKey: need(env, 'AWS_SECRET_ACCESS_KEY'),
            sessionToken: env.AWS_SESSION_TOKEN,
          },
          endpoint: env.TREE_KEYS_AWS_ENDPOINT,
          fetch: o.fetch,
        }),
      ],
    });
  if (env.TREE_KEYS_VAULT_KEY)
    all.push({
      provider: 'vault',
      protectors: [
        vaultProtector({
          address: need(env, 'TREE_KEYS_VAULT_ADDR'),
          token: need(env, 'TREE_KEYS_VAULT_TOKEN'),
          key: env.TREE_KEYS_VAULT_KEY,
          mount: env.TREE_KEYS_VAULT_MOUNT,
          namespace: env.TREE_KEYS_VAULT_NAMESPACE,
          fetch: o.fetch,
        }),
      ],
    });

  // Staging may run before anyone sets a wrapping key: it derives one from a secret the
  // server already holds. Kept in the ring later too, so those keys can be wrapped again.
  const fallback =
    o.appEnv !== 'production' && o.fallbackSecret
      ? localProtector('derived', await derivedLocalKey(o.fallbackSecret))
      : null;

  const named = env.TREE_KEYS_PROVIDER as Provider | undefined;
  if (named && !['local', 'gcp', 'aws', 'vault'].includes(named))
    throw new KeyServiceError(`unknown TREE_KEYS_PROVIDER "${named}"`);
  const pick = named ?? all[0]?.provider;
  const chosen = all.find((a) => a.provider === pick);
  if (named && !chosen)
    throw new KeyServiceError(`TREE_KEYS_PROVIDER is ${named} but its settings are missing`);

  const rest = all.filter((a) => a !== chosen).flatMap((a) => a.protectors);
  if (chosen) {
    const [active, ...older] = chosen.protectors;
    return new KeyRing(active!, [...older, ...rest, ...(fallback ? [fallback] : [])]);
  }
  if (fallback) return new KeyRing(fallback);
  throw new KeyServiceError('no wrapping key is set (TREE_KEYS_PROVIDER and its settings)');
}

function need(env: Env, name: string) {
  const v = env[name];
  if (!v) throw new KeyServiceError(`${name} is not set`);
  return v;
}

function parseLocal(text: string | undefined): KeyProtector[] {
  if (!text?.trim()) return [];
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const at = entry.indexOf(':');
      if (at < 1) throw new KeyServiceError('TREE_KEYS_LOCAL entries look like name:key');
      return localProtector(entry.slice(0, at), fromB64(entry.slice(at + 1)));
    });
}
