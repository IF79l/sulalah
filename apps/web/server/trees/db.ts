import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseUrl } from '@/lib/backend';
import type { Database, PlanCode, TreeRole } from '@/lib/supabase/types';
import { createSupabaseServerClient } from '@/server/supabase/server';

type Rel = never[];
type ReadOnly<Row> = { Row: Row; Insert: never; Update: never; Relationships: Rel };

export type KeyRow = {
  tree_id: string;
  key: string | null;
  wrapped_key: string | null;
  kek_id: string | null;
  wrapped_at: string | null;
  view_key_wrapped: string | null;
  view_kek_id: string | null;
  view_key_slug: string | null;
};

/** The tables and functions tree saves, keys and visitors' copies touch, as the server sees them. */
type TreesDatabase = {
  public: {
    Tables: {
      trees: ReadOnly<{
        id: string;
        plan: PlanCode;
        file_version: number;
        file_path: string | null;
        view_slug: string | null;
        view_path: string | null;
      }>;
      tree_members: ReadOnly<{
        tree_id: string;
        user_id: string;
        role: TreeRole;
        scope_person_ids: string[];
      }>;
      tree_keys: {
        Row: KeyRow;
        Insert: Pick<KeyRow, 'tree_id' | 'wrapped_key' | 'kek_id' | 'wrapped_at'>;
        Update: Partial<KeyRow>;
        Relationships: Rel;
      };
      plans: ReadOnly<{ id: PlanCode; max_persons: number }>;
      subscriptions: ReadOnly<{ tree_id: string; status: string }>;
      profiles: ReadOnly<{ id: string; is_platform_admin: boolean }>;
    };
    Views: Record<never, never>;
    Functions: {
      commit_tree_file: {
        Args: { tree: string; from_version: number; path: string };
        Returns: number;
      };
      open_view: {
        Args: { token: string };
        Returns: { problem: string | null; tree_id: string | null; path: string | null }[];
      };
      claim_view_key: {
        Args: { tree: string; slug: string; wrapped: string; kek: string };
        Returns: { view_key_wrapped: string; view_kek_id: string }[];
      };
      publish_view: { Args: { tree: string; path: string }; Returns: string };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

/** With the secret key, past row level security: each caller checks who is asking first. */
export function treesAsServer() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
  return createClient<TreesDatabase>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type TreesDb = ReturnType<typeof treesAsServer>;

/**
 * Who is asking: the app signs in with cookies; scripts (the staging seed, tests) send their
 * token instead. Answers the person and a client that acts as them, or null when signed out.
 */
export async function signedIn(req: Request) {
  const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const db = bearer
    ? createClient<Database>(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { authorization: `Bearer ${bearer}` } },
      })
    : await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser(bearer);
  return user ? { user, db } : null;
}

/** The person's role in the tree, or null when they are not in it. */
export async function roleIn(db: TreesDb, treeId: string, userId: string) {
  const { data, error } = await db
    .from('tree_members')
    .select('role, scope_person_ids')
    .eq('tree_id', treeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
