import { pgSchema, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const docsSchema = pgSchema('docs');

export const documents = docsSchema.table('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  type: text('type').notNull(),
  status: text('status').default('draft').notNull(),
  title: text('title'),
  content: jsonb('content').notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
