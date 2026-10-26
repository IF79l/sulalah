import { after } from 'next/server';
import { z } from 'zod';
import { isLiveTreeId } from '@/lib/backend';
import { fail, json, noBackend } from '@/server/billing/http';
import { signedIn } from '@/server/trees/db';
import { saveChecked } from '@/server/trees/save';
import { publishViewCopy } from '@/server/trees/view';

const body = z.object({ from: z.number().int().min(0), sealed: z.unknown() });

/**
 * Saves the next version of a tree. The only way in: the browser can no longer write the tree
 * file itself, so every change is checked here first (server/trees/save.ts). The visitors'
 * copy follows each save, built here after the answer has gone back.
 */
export async function POST(req: Request, { params }: { params: Promise<{ treeId: string }> }) {
  const off = noBackend();
  if (off) return off;
  const { treeId } = await params;
  if (!isLiveTreeId(treeId)) return fail(404, 'no_tree', 'الشجرة غير موجودة');
  const me = await signedIn(req);
  if (!me) return fail(401, 'signed_out', 'سجّل دخولك من جديد');
  const input = body.safeParse(await req.json().catch(() => null));
  if (!input.success) return fail(400, 'bad_file', 'ملف الشجرة غير صالح');

  try {
    const r = await saveChecked(treeId, me.user.id, input.data.from, input.data.sealed);
    if (!r.ok) return fail(r.status, r.code, r.message);
    after(() =>
      publishViewCopy(treeId).catch((e) => console.error('visitors copy failed', treeId, e)),
    );
    return json({ version: r.version });
  } catch (e) {
    console.error('tree save failed', treeId, e);
    return fail(500, 'save_failed', 'تعذّر الحفظ، حاول مرة ثانية');
  }
}
