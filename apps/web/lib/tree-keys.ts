'use client';

/**
 * Tree keys kept on this device. The server never has them: a family member brings the key
 * in an invite link (after the `#`) or types the owner's recovery code.
 */
const slot = (treeId: string) => `sulalah-key:${treeId}`;

export function deviceKey(treeId: string): string | undefined {
  try {
    return localStorage.getItem(slot(treeId)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function keepKey(treeId: string, key: string) {
  try {
    localStorage.setItem(slot(treeId), key);
  } catch {
    // A private window may refuse; the key then lasts for this visit only.
  }
}

export function forgetKey(treeId: string) {
  try {
    localStorage.removeItem(slot(treeId));
  } catch {
    // Nothing kept, nothing to forget.
  }
}
