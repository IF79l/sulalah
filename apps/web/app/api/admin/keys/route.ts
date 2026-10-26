import { z } from 'zod';
import { fail, json, noBackend } from '@/server/billing/http';
import { keyStatus, rewrapAll } from '@/server/keys/store';
import { signedIn, treesAsServer } from '@/server/trees/db';
import { publishViewCopy } from '@/server/trees/view';

/** Only accounts marked is_platform_admin, which nobody can set on themselves. */
async function admin(req: Request) {
  const me = await signedIn(req);
  if (!me) return null;
  const db = treesAsServer();
  const { data } = await db
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', me.user.id)
    .maybeSingle();
  return data?.is_platform_admin ? db : null;
}

/** How tree keys stand: the wrapping key in use, and how many keys still wait for it. */
export async function GET(req: Request) {
  const off = noBackend();
  if (off) return off;
  const db = await admin(req);
  if (!db) return fail(404, 'not_found', 'غير موجود');
  try {
    return json(await keyStatus(db));
  } catch (e) {
    console.error('key status failed', e);
    return fail(500, 'keys_failed', e instanceof Error ? e.message : 'تعذّر قراءة المفاتيح');
  }
}

const body = z.object({ action: z.enum(['rewrap', 'rebuild-views']) });

/**
 * rewrap: wraps every key that is still plain or under an older wrapping key with the one in
 * use (the first move, and every rotation). rebuild-views: builds every open tree's visitors'
 * copy again on the server.
 */
export async function POST(req: Request) {
  const off = noBackend();
  if (off) return off;
  const db = await admin(req);
  if (!db) return fail(404, 'not_found', 'غير موجود');
  const input = body.safeParse(await req.json().catch(() => null));
  if (!input.success) return fail(400, 'bad_request', 'طلب غير صالح');
  try {
    if (input.data.action === 'rewrap') {
      const done = await rewrapAll(db);
      return json({ ...done, status: await keyStatus(db) });
    }
    const { data: open, error } = await db.from('trees').select('id').not('view_slug', 'is', null);
    if (error) throw error;
    let built = 0;
    const failed: string[] = [];
    for (const t of open ?? []) {
      try {
        if (await publishViewCopy(t.id, db)) built++;
      } catch (e) {
        console.error('rebuilding a visitors copy failed', t.id, e);
        failed.push(t.id);
      }
    }
    return json({ open: open?.length ?? 0, built, failed });
  } catch (e) {
    console.error('key maintenance failed', e);
    return fail(500, 'keys_failed', e instanceof Error ? e.message : 'تعذّر');
  }
}
