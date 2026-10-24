/**
 * Which backend this build talks to. With no Supabase keys the app runs as the in-browser
 * demo it has always been; with them it signs people in and stores real trees.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export const backendOn = !!supabaseUrl && !!supabaseKey;

/** local, staging or production; staging wears a badge so nobody mistakes it for the real site. */
export const appEnv = (process.env.NEXT_PUBLIC_APP_ENV ?? 'local') as
  'local' | 'staging' | 'production';

export const TREE_BUCKET = 'tree-files';

/** Real trees have uuid ids; the sample trees have readable ones like `al-sahli`. */
export const isLiveTreeId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

/** Only same-site paths are followed after sign in. */
export const safeNext = (next: string | undefined, fallback = '/trees') =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : fallback;
