/**
 * The database as the app sees it, in the shape `supabase gen types typescript` writes.
 * Regenerate with `pnpm db:types` after changing a migration.
 */
export type TreeRole = 'owner' | 'reviewer' | 'contributor';
export type PlanCode = 'family' | 'extended' | 'tribe';
export type InviteKind = 'contribute' | 'review' | 'view';
/** Why a link no longer works. */
export type InviteProblem = 'stopped' | 'expired' | 'used-up' | 'full';

export type NoticeKind =
  | 'submitted'
  | 'approved'
  | 'partly_approved'
  | 'changes'
  | 'rejected'
  | 'withdrawn'
  | 'joined'
  | 'made_reviewer'
  | 'made_contributor'
  | 'owner_now';

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
  view_slug: string | null;
  view_path: string | null;
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
  token_sealed: string | null;
  created_at: string;
};

export type NoticeRow = {
  id: string;
  user_id: string;
  tree_id: string;
  kind: NoticeKind;
  actor_id: string | null;
  count: number;
  ref: string | null;
  read_at: string | null;
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
            foreignKeyName: 'tree_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
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
          Partial<Pick<InviteRow, 'branch_person_id' | 'max_uses' | 'token_sealed'>>,
        Pick<InviteRow, 'revoked_at'>
      >;
      notifications: {
        Row: NoticeRow;
        Insert: never;
        Update: Pick<NoticeRow, 'read_at'>;
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
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
        Returns: {
          kind: InviteKind;
          inviter: string;
          valid: boolean;
          problem: InviteProblem | null;
          branch: string | null;
        }[];
      };
      open_view: {
        Args: { token: string };
        Returns: { problem: InviteProblem | 'closed' | 'not-ready' | null; path: string | null }[];
      };
      set_view_open: {
        Args: { tree: string; open: boolean; fresh?: boolean };
        Returns: string | null;
      };
      publish_view: { Args: { tree: string; path: string }; Returns: undefined };
      set_member_role: {
        Args: { tree: string; member: string; new_role: TreeRole; scope?: string[] };
        Returns: undefined;
      };
      transfer_ownership: { Args: { tree: string; member: string }; Returns: undefined };
      notify_submission: {
        Args: { tree: string; anchor_path: string[]; n: number };
        Returns: undefined;
      };
      notify_member: {
        Args: { tree: string; member: string; what: NoticeKind; n: number; at?: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      tree_role: TreeRole;
      plan_id: PlanCode;
      invite_kind: InviteKind;
      notice_kind: NoticeKind;
    };
    CompositeTypes: Record<never, never>;
  };
};
