/**
 * Which backend this build talks to. Real accounts and trees are on only when the build names
 * its environment in NEXT_PUBLIC_APP_ENV and has Supabase keys. Without the name it stays the
 * in-browser demo even if keys are present, so keys that an integration adds to every
 * environment cannot switch production on by accident.
 */
const named = process.env.NEXT_PUBLIC_APP_ENV;

/** local, staging or production; staging wears a badge so nobody mistakes it for the real site. */
export const appEnv: 'local' | 'staging' | 'production' =
  named === 'staging' || named === 'production' ? named : 'local';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export const backendOn =
  (named === 'local' || named === 'staging' || named === 'production') &&
  !!supabaseUrl &&
  !!supabaseKey;

export const TREE_BUCKET = 'tree-files';

/** Real trees have uuid ids; the sample trees have readable ones like `al-sahli`. */
export const isLiveTreeId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

/** Only same-site paths are followed after sign in. */
export const safeNext = (next: string | undefined, fallback = '/trees') =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : fallback;
