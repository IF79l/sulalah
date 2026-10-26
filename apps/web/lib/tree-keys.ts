'use client';

/**
 * Tree keys come from the server to any member who signed in with their phone code, so a
 * tree opens on any device. The server unwraps them with a key outside the database and
 * hands them only to members. They are kept in memory for this visit only.
 */
const known = new Map<string, Promise<string | null>>();

export function treeKey(treeId: string): Promise<string | null> {
  let found = known.get(treeId);
  if (!found) {
    found = fetch(`/api/trees/${treeId}/key`, { cache: 'no-store' }).then(async (res) => {
      const body = (await res.json().catch(() => ({}))) as {
        key?: string;
        error?: { code: string; message: string };
      };
      if (res.ok && body.key) return body.key;
      // Planted before the platform kept keys: nothing can open it.
      if (res.status === 404 && body.error?.code === 'no_key') return null;
      throw Object.assign(new Error(body.error?.message ?? `key ${res.status}`), {
        code: body.error?.code ?? String(res.status),
      });
    });
    // A failed lookup is not remembered, so the next try asks again.
    found.catch(() => known.delete(treeId));
    known.set(treeId, found);
  }
  return found;
}

/** Asks the server for the key of a tree this person just planted, and remembers it. */
export async function plantKey(treeId: string): Promise<string> {
  const res = await fetch(`/api/trees/${treeId}/key`, { method: 'POST', cache: 'no-store' });
  const body = (await res.json().catch(() => ({}))) as { key?: string; error?: { code: string } };
  if (!res.ok || !body.key) throw new Error(body.error?.code ?? `key ${res.status}`);
  known.set(treeId, Promise.resolve(body.key));
  return body.key;
}

/** Forgets every key, on sign out. */
export function forgetKeys() {
  known.clear();
}

/** Forgets one tree's key, when the person leaves it or it is deleted. */
export function forgetKey(treeId: string) {
  known.delete(treeId);
}
