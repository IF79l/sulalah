/**
 * The database as the app sees it, in the shape `supabase gen types typescript` writes.
 * Regenerate with `pnpm db:types` after changing a migration.
 */
export type TreeRole = 'owner' | 'reviewer' | 'contributor';
export type PlanCode = 'family' | 'extended' | 'tribe';
export type InviteKind = 'contribute' | 'review';

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: {
    foreignKeyName: string;
    columns: string[];
    isOneToOne: boolean;
    referencedRelation: string;
    referencedColumns: string[];
  }[];
};

export type ProfileRow = {
  id: string;
  first_name: string;
  father_name: string;
  notify: 'app' | 'sms';
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type TreeRow = {
  id: string;
  owner_id: string;
  plan: PlanCode;
  requested_plan: PlanCode | null;
  file_version: number;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
};

export type MemberRow = {
  tree_id: string;
  user_id: string;
  role: TreeRole;
  branch_person_id: string | null;
  scope_person_ids: string[];
  invited_by: string | null;
  created_at: string;
};

export type InviteRow = {
  id: string;
  tree_id: string;
  kind: InviteKind;
  token_hash: string;
  branch_person_id: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string;
  revoked_at: string | null;
  created_by: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        { id: string },
        Partial<Pick<ProfileRow, 'first_name' | 'father_name' | 'notify' | 'updated_at'>>
      >;
      trees: Table<TreeRow, never, never>;
      tree_members: {
        Row: MemberRow;
        Insert: never;
        Update: Partial<Pick<MemberRow, 'branch_person_id' | 'scope_person_ids'>>;
        Relationships: [
          {
            foreignKeyName: 'tree_members_tree_id_fkey';
            columns: ['tree_id'];
            isOneToOne: false;
            referencedRelation: 'trees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tree_members_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      invites: Table<
        InviteRow,
        Pick<InviteRow, 'tree_id' | 'kind' | 'token_hash' | 'expires_at' | 'created_by'> &
          Partial<Pick<InviteRow, 'branch_person_id' | 'max_uses'>>,
        Pick<InviteRow, 'revoked_at'>
      >;
    };
    Views: Record<never, never>;
    Functions: {
      create_tree: { Args: { requested?: PlanCode | null }; Returns: string };
      save_tree_file: {
        Args: { tree: string; from_version: number; path: string };
        Returns: number;
      };
      accept_invite: { Args: { token: string }; Returns: string };
      invite_preview: {
        Args: { token: string };
        Returns: { kind: InviteKind; inviter: string; valid: boolean }[];
      };
    };
    Enums: { tree_role: TreeRole; plan_id: PlanCode; invite_kind: InviteKind };
    CompositeTypes: Record<never, never>;
  };
};
