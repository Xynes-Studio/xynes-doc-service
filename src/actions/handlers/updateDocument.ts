import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { ActionHandler } from '../types';
import { updateDocumentPayloadSchema } from '../schemas';
import { db } from '../../infra/db';
import { documents } from '../../infra/db/schema';
import { NotFoundError } from '../errors';

export const updateDocumentHandler: ActionHandler<
  z.infer<typeof updateDocumentPayloadSchema>,
  typeof documents.$inferSelect
> = async (payload, ctx) => {
  const { workspaceId, userId } = ctx;

  const [existingDoc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, payload.id), eq(documents.workspaceId, workspaceId)))
    .limit(1);

  if (!existingDoc) {
    throw new NotFoundError('Document', payload.id);
  }

  const updateValues: Partial<typeof documents.$inferInsert> = {
    updatedBy: userId,
    updatedAt: new Date(),
  };

  if (payload.title !== undefined) {
    updateValues.title = payload.title;
  }

  if (payload.content !== undefined) {
    updateValues.content = payload.content;
  }

  const [updatedDoc] = await db
    .update(documents)
    .set(updateValues)
    .where(eq(documents.id, payload.id))
    .returning();

  return updatedDoc;
};
