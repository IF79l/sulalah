import 'server-only';
import { backendOn } from '@/lib/backend';

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

/** Arabic message for the screens, plus a code for logs. */
export const fail = (status: number, code: string, message: string) =>
  json({ error: { code, message } }, status);

export const noBackend = () =>
  backendOn ? null : fail(404, 'no_backend', 'الدفع يعمل بعد ربط قاعدة البيانات');
