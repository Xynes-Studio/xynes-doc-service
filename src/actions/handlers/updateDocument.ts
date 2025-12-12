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
  const parsedPayload = updateDocumentPayloadSchema.parse(payload);
  const { workspaceId, userId } = ctx;

  const updateValues: Partial<typeof documents.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (userId) {
    updateValues.updatedBy = userId;
  }

  if (parsedPayload.title !== undefined) {
    updateValues.title = parsedPayload.title;
  }

  if (parsedPayload.content !== undefined) {
    updateValues.content = parsedPayload.content as any;
  }

  if (parsedPayload.status !== undefined) {
    updateValues.status = parsedPayload.status;
  }

  const [updatedDoc] = await db
    .update(documents)
    .set(updateValues)
    .where(and(eq(documents.id, parsedPayload.id), eq(documents.workspaceId, workspaceId)))
    .returning();

  if (!updatedDoc) {
    throw new NotFoundError('Document', parsedPayload.id);
  }

  return updatedDoc;
};
