import { z } from 'zod';
import { isLiveTreeId } from '@/lib/backend';
import { fail, json, noBackend } from '@/server/billing/http';
import { createSupabaseServerClient } from '@/server/supabase/server';
import { saveChecked } from '@/server/trees/save';

const body = z.object({ from: z.number().int().min(0), sealed: z.unknown() });

/**
 * Saves the next version of a tree. The only way in: the browser can no longer write the tree
 * file itself, so every change is checked here first (server/trees/save.ts).
 */
export async function POST(req: Request, { params }: { params: Promise<{ treeId: string }> }) {
  const off = noBackend();
  if (off) return off;
  const { treeId } = await params;
  if (!isLiveTreeId(treeId)) return fail(404, 'no_tree', 'الشجرة غير موجودة');
  // The app signs in with cookies; scripts (the staging seed) send their token instead.
  const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const {
    data: { user },
  } = await (await createSupabaseServerClient()).auth.getUser(bearer);
  if (!user) return fail(401, 'signed_out', 'سجّل دخولك من جديد');
  const input = body.safeParse(await req.json().catch(() => null));
  if (!input.success) return fail(400, 'bad_file', 'ملف الشجرة غير صالح');

  try {
    const r = await saveChecked(treeId, user.id, input.data.from, input.data.sealed);
    return r.ok ? json({ version: r.version }) : fail(r.status, r.code, r.message);
  } catch (e) {
    console.error('tree save failed', treeId, e);
    return fail(500, 'save_failed', 'تعذّر الحفظ، حاول مرة ثانية');
  }
}
