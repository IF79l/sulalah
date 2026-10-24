import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { backendOn, isLiveTreeId, supabaseKey, supabaseUrl } from '@/lib/backend';

/** Pages that need a signed in person once real accounts are on. The sample trees stay open. */
function needsAccount(path: string) {
  if (
    path === '/trees' ||
    path === '/trees/new' ||
    path === '/account' ||
    path === '/notifications'
  )
    return true;
  const tree = path.match(/^\/trees\/([^/]+)/)?.[1];
  return !!tree && isLiveTreeId(tree);
}

/** Keeps the sign in fresh on every request and sends signed out people to the login page. */
export async function proxy(request: NextRequest) {
  if (!backendOn) return NextResponse.next();
  let response = NextResponse.next({ request });
  const client = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await client.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && needsAccount(path)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)',
  ],
};
