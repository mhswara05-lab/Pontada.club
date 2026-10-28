import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const tournaments = sqliteTable('tournaments', {
  ownerId: text('owner_id').primaryKey(),
  revision: integer('revision').notNull().default(0),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const operations = sqliteTable('operations', {
  ownerId: text('owner_id').notNull(),
  operationId: text('operation_id').notNull(),
  fingerprint: text('fingerprint').notNull(),
  revision: integer('revision').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => [primaryKey({columns: [t.ownerId, t.operationId]})]);

export const managerSessions=sqliteTable('manager_sessions',{
  idHash:text('id_hash').primaryKey(),
  ownerId:text('owner_id').notNull(),
  createdAt:integer('created_at').notNull(),
  expiresAt:integer('expires_at').notNull(),
},t=>[index('manager_sessions_expires_at_idx').on(t.expiresAt)]);
export const managerLoginAttempts=sqliteTable('manager_login_attempts',{
  bucket:text('bucket').primaryKey(),
  attempts:integer('attempts').notNull().default(0),
  resetAt:integer('reset_at').notNull(),
},t=>[index('manager_login_attempts_reset_at_idx').on(t.resetAt)]);
