import { KeyServiceError } from './bytes';

/**
 * A wrapping key held outside the database: a key service (Google Cloud KMS, AWS KMS, Vault)
 * or, for staging, a key in the server's settings. It wraps each tree's own key, so the
 * database only ever holds wrapped keys (envelope encryption).
 *
 * `context` binds a wrapped key to the tree and purpose it was made for: a wrapped key copied
 * onto another tree's row does not unwrap there.
 */
export interface KeyProtector {
  /** Stored next to every key it wraps, e.g. 'local:k2' or 'gcp:projects/…/cryptoKeys/trees'. */
  readonly id: string;
  wrap(plain: Uint8Array, context: string): Promise<string>;
  unwrap(wrapped: string, context: string): Promise<Uint8Array>;
}

/**
 * The wrapping key in use plus the ones before it. New keys are wrapped with the first; a key
 * wrapped by an older one still opens, and `stale` says it should be wrapped again (rotation).
 */
export class KeyRing {
  readonly active: KeyProtector;
  private readonly all = new Map<string, KeyProtector>();

  constructor(active: KeyProtector, older: KeyProtector[] = []) {
    this.active = active;
    for (const p of [active, ...older]) if (!this.all.has(p.id)) this.all.set(p.id, p);
  }

  get ids() {
    return [...this.all.keys()];
  }

  async wrap(plain: Uint8Array, context: string) {
    return { kekId: this.active.id, wrapped: await this.active.wrap(plain, context) };
  }

  async unwrap(kekId: string, wrapped: string, context: string) {
    const p = this.all.get(kekId);
    if (!p) throw new KeyServiceError(`no wrapping key "${kekId}" is configured`);
    return p.unwrap(wrapped, context);
  }

  /** Whether a key wrapped by `kekId` should be wrapped again with the active key. */
  stale(kekId: string | null) {
    return kekId !== this.active.id;
  }

  /** Unwraps with whatever wrapped it and wraps again with the active key. */
  async rewrap(kekId: string, wrapped: string, context: string) {
    return this.wrap(await this.unwrap(kekId, wrapped, context), context);
  }
}

/** What a wrapped key is bound to: the tree, and which of its keys it is. */
export const keyContext = (purpose: 'tree' | 'view', treeId: string, slug?: string) =>
  ['sulalah', purpose, treeId, ...(slug ? [slug] : [])].join(':');
