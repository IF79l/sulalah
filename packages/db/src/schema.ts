import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** Postgres `ltree`: the person's ancestor path, used for fast sub-branch and scope queries. */
const ltree = customType<{ data: string }>({ dataType: () => 'ltree' });

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const genderEnum = pgEnum('gender', ['male', 'female']);
export const treeRoleEnum = pgEnum('tree_role', ['reviewer', 'contributor']);
export const privacyEnum = pgEnum('privacy', ['tree', 'family', 'private']);
export const contributionStatusEnum = pgEnum('contribution_status', [
  'draft',
  'pending',
  'approved',
  'rejected',
  'changes_requested',
]);
export const relationEnum = pgEnum('relation', ['son', 'daughter', 'spouse']);
export const inviteKindEnum = pgEnum('invite_kind', ['contributor', 'reviewer']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'pending',
  'active',
  'expired',
  'canceled',
]);

/** Mirrors Supabase `auth.users`; id is the auth user id. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  createdAt: createdAt(),
});

export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  maxPersons: integer('max_persons').notNull(),
  maxReviewers: integer('max_reviewers').notNull(),
  priceMonthlyHalalas: integer('price_monthly_halalas').notNull(),
  priceAnnualHalalas: integer('price_annual_halalas').notNull(),
  features: jsonb('features').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
});

export const trees = pgTable('trees', {
  id: id(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  rootPersonId: uuid('root_person_id'),
  planId: text('plan_id').references(() => plans.id),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: createdAt(),
});

export const persons = pgTable(
  'persons',
  {
    id: id(),
    treeId: uuid('tree_id')
      .notNull()
      .references(() => trees.id, { onDelete: 'cascade' }),
    givenName: text('given_name').notNull(),
    fullName: text('full_name').notNull(),
    nameNormalized: text('name_normalized').notNull(),
    gender: genderEnum('gender').notNull(),
    fatherId: uuid('father_id'),
    motherId: uuid('mother_id'),
    path: ltree('path').notNull(),
    birthYear: smallint('birth_year'),
    deathYear: smallint('death_year'),
    isDeceased: boolean('is_deceased').notNull().default(false),
    bio: text('bio'),
    photoPath: text('photo_path'),
    privacy: privacyEnum('privacy').notNull().default('tree'),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('persons_tree_idx').on(t.treeId),
    index('persons_father_idx').on(t.fatherId),
    index('persons_path_gist').using('gist', t.path),
    index('persons_name_trgm').using('gin', sql`${t.nameNormalized} gin_trgm_ops`),
  ],
);

/** Marriages are their own relation and are never drawn as a child branch. */
export const unions = pgTable('unions', {
  id: id(),
  treeId: uuid('tree_id')
    .notNull()
    .references(() => trees.id, { onDelete: 'cascade' }),
  personAId: uuid('person_a_id')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  personBId: uuid('person_b_id')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

/** The owner is not stored here: `trees.owner_id` is the main reviewer. */
export const treeMembers = pgTable(
  'tree_members',
  {
    id: id(),
    treeId: uuid('tree_id')
      .notNull()
      .references(() => trees.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: treeRoleEnum('role').notNull(),
    /** Person ids whose sub-branch a reviewer covers; empty = whole tree. */
    scopePersonIds: uuid('scope_person_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('tree_members_unique').on(t.treeId, t.userId)],
);

export const invites = pgTable('invites', {
  id: id(),
  treeId: uuid('tree_id')
    .notNull()
    .references(() => trees.id, { onDelete: 'cascade' }),
  kind: inviteKindEnum('kind').notNull(),
  /** SHA-256 of the token; the token itself is only ever in the link. */
  tokenHash: text('token_hash').notNull().unique(),
  scopePersonId: uuid('scope_person_id').references(() => persons.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  maxUses: integer('max_uses'),
  useCount: integer('use_count').notNull().default(0),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export const contributions = pgTable(
  'contributions',
  {
    id: id(),
    treeId: uuid('tree_id')
      .notNull()
      .references(() => trees.id, { onDelete: 'cascade' }),
    contributorId: uuid('contributor_id')
      .notNull()
      .references(() => users.id),
    anchorPersonId: uuid('anchor_person_id')
      .notNull()
      .references(() => persons.id),
    status: contributionStatusEnum('status').notNull().default('draft'),
    /** Optimistic lock: a review only succeeds against the version it was opened on. */
    version: integer('version').notNull().default(1),
    note: text('note'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewReason: text('review_reason'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('contributions_tree_status_idx').on(t.treeId, t.status)],
);

export const contributionItems = pgTable('contribution_items', {
  id: id(),
  contributionId: uuid('contribution_id')
    .notNull()
    .references(() => contributions.id, { onDelete: 'cascade' }),
  tempKey: text('temp_key').notNull(),
  relation: relationEnum('relation').notNull(),
  /** Either an approved person id or another item's temp key. */
  relativePersonId: uuid('relative_person_id').references(() => persons.id),
  relativeTempKey: text('relative_temp_key'),
  data: jsonb('data').notNull(),
  approvedPersonId: uuid('approved_person_id').references(() => persons.id),
});

export const subscriptions = pgTable('subscriptions', {
  id: id(),
  treeId: uuid('tree_id')
    .notNull()
    .references(() => trees.id, { onDelete: 'cascade' }),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id),
  status: subscriptionStatusEnum('status').notNull().default('pending'),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'annual'] }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  provider: text('provider').notNull(),
  createdAt: createdAt(),
});

export const payments = pgTable('payments', {
  id: id(),
  subscriptionId: uuid('subscription_id')
    .notNull()
    .references(() => subscriptions.id),
  amountHalalas: integer('amount_halalas').notNull(),
  /** Unique so a replayed webhook can never activate twice. */
  providerPaymentId: text('provider_payment_id').notNull().unique(),
  status: text('status').notNull(),
  raw: jsonb('raw').notNull(),
  createdAt: createdAt(),
});

/** Append-only: no updates or deletes are granted on this table. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    treeId: uuid('tree_id')
      .notNull()
      .references(() => trees.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(),
    targetId: uuid('target_id'),
    diff: jsonb('diff'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_tree_idx').on(t.treeId, t.createdAt)],
);

export const notifications = pgTable('notifications', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: createdAt(),
});
