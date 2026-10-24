'use client';

/**
 * Face ID or a fingerprint in place of codes. A passkey's PRF extension gives a secret that only
 * that passkey can produce; it seals the person's account key, which seals their tree keys.
 * Passkeys sync through iCloud Keychain or Google Password Manager, so a new phone opens the
 * same trees after signing in. Sign in itself stays the phone code; the passkey only unlocks.
 */
import { generateAccountKey, keyFromSecret, unwrapKey, wrapKey } from '@sulalah/domain';
import { supabase } from '@/lib/supabase/client';
import { keepKey } from '@/lib/tree-keys';

const SALT = new TextEncoder().encode('sulalah/account-key/v1'.padEnd(32, '.'));
const b64 = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const unb64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const random = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

export class PasskeyUnavailable extends Error {
  constructor(readonly reason: 'unsupported' | 'cancelled' | 'no-prf' | 'none') {
    super(reason);
  }
}

/** Whether this browser can make passkeys at all; PRF support shows only when one is made. */
export const passkeysPossible = () =>
  typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;

let accountKey: string | undefined;

interface Keyring {
  userId: string;
  phone?: string;
  passkeys: { credential_id: string; wrapped_account_key: string }[];
}
let ring: Keyring | undefined;

/**
 * Loads who the person is and their sealed account keys ahead of time. Safari only shows the
 * Face ID prompt when it follows a tap directly, so the tap must not wait on the network first.
 */
export async function loadKeyring(): Promise<Keyring> {
  if (ring) return ring;
  const db = supabase();
  const [{ data: auth }, { data }] = await Promise.all([
    db.auth.getUser(),
    db.from('user_keys').select('credential_id, wrapped_account_key'),
  ]);
  if (!auth.user) throw new PasskeyUnavailable('none');
  ring = { userId: auth.user.id, phone: auth.user.phone, passkeys: data ?? [] };
  return ring;
}

/** Whether the account key is already open in this visit. */
export const hasOpenAccount = () => !!accountKey;

/** Forgets the open account key, as on signing out. */
export function closeKeyring() {
  accountKey = undefined;
  ring = undefined;
}

function prfOf(cred: Credential | null) {
  const ext = (cred as PublicKeyCredential | null)?.getClientExtensionResults().prf;
  const first = ext?.results?.first;
  return first ? keyFromSecret(first as ArrayBuffer) : undefined;
}

async function assert(ids: string[]) {
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        rpId: location.hostname,
        allowCredentials: ids.map((id) => ({ type: 'public-key' as const, id: unb64(id) })),
        userVerification: 'required',
        extensions: { prf: { eval: { first: SALT } } },
      },
    });
    if (!cred) throw new PasskeyUnavailable('cancelled');
    const secret = prfOf(cred);
    if (!secret) throw new PasskeyUnavailable('no-prf');
    return { id: b64((cred as PublicKeyCredential).rawId), secret };
  } catch (e) {
    throw e instanceof PasskeyUnavailable ? e : new PasskeyUnavailable('cancelled');
  }
}

/** Opens the account key with an existing passkey: one Face ID or fingerprint. */
export async function unlockAccount(): Promise<string> {
  if (accountKey) return accountKey;
  if (!passkeysPossible()) throw new PasskeyUnavailable('unsupported');
  const r = ring ?? (await loadKeyring());
  if (!r.passkeys.length) throw new PasskeyUnavailable('none');
  const { id, secret } = await assert(r.passkeys.map((p) => p.credential_id));
  const row = r.passkeys.find((p) => p.credential_id === id) ?? r.passkeys[0]!;
  accountKey = await unwrapKey(row.wrapped_account_key, secret, r.userId);
  return accountKey;
}

/** Makes this person's first passkey and account key. Must run straight from a tap. */
export async function createAccountPasskey(name: string): Promise<string> {
  if (!passkeysPossible()) throw new PasskeyUnavailable('unsupported');
  const r = ring ?? (await loadKeyring());
  const user = { id: r.userId, phone: r.phone };
  let cred: Credential | null;
  try {
    cred = await navigator.credentials.create({
      publicKey: {
        rp: { name: 'سُلالة', id: location.hostname },
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.phone ? `+${user.phone.replace(/^\+/, '')}` : user.id,
          displayName: name || 'سُلالة',
        },
        challenge: random(32),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        extensions: { prf: { eval: { first: SALT } } },
      },
    });
  } catch {
    throw new PasskeyUnavailable('cancelled');
  }
  if (!cred) throw new PasskeyUnavailable('cancelled');
  const ext = (cred as PublicKeyCredential).getClientExtensionResults().prf;
  if (!ext?.enabled) throw new PasskeyUnavailable('no-prf');
  const id = b64((cred as PublicKeyCredential).rawId);
  // Some platforms give the secret only when the passkey is used, not when it is made.
  const secret = prfOf(cred) ?? (await assert([id])).secret;
  const key = generateAccountKey();
  const wrapped = await wrapKey(key, secret, user.id);
  const { error } = await supabase()
    .from('user_keys')
    .insert({ user_id: user.id, credential_id: id, wrapped_account_key: wrapped });
  if (error) throw error;
  r.passkeys.push({ credential_id: id, wrapped_account_key: wrapped });
  accountKey = key;
  return key;
}

/** Keeps a sealed copy of a tree key with the account, so the person's passkey opens it anywhere. */
export async function sealTreeKeyForMe(treeId: string, treeKey: string) {
  if (!accountKey || !ring) return;
  await supabase()
    .from('member_keys')
    .upsert({
      tree_id: treeId,
      user_id: ring.userId,
      wrapped_key: await wrapKey(treeKey, accountKey, treeId),
      updated_at: new Date().toISOString(),
    });
}

/** This person's sealed copy of a tree's key, if they have one. Fetch it before the tap. */
export async function sealedTreeKey(treeId: string): Promise<string | undefined> {
  const { data } = await supabase()
    .from('member_keys')
    .select('wrapped_key')
    .eq('tree_id', treeId)
    .maybeSingle();
  return data?.wrapped_key;
}

/** Opens a sealed tree key with the passkey and keeps it on this device. */
export async function openTreeKey(treeId: string, sealed: string): Promise<string> {
  const key = await unwrapKey(sealed, await unlockAccount(), treeId);
  keepKey(treeId, key);
  return key;
}
