import { z } from 'zod';
import { ActionHandler } from '../types';
import { createDocumentPayloadSchema } from '../schemas';
import { db } from '../../infra/db';
import { documents } from '../../infra/db/schema';

export const createDocumentHandler: ActionHandler<
  z.infer<typeof createDocumentPayloadSchema>,
  typeof documents.$inferSelect
> = async (payload, ctx) => {
  const { workspaceId, userId } = ctx;

  const [doc] = await db
    .insert(documents)
    .values({
      workspaceId,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      status: payload.status as 'draft' | 'published' | 'archived', // Type casting if needed or handle schema better
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  return doc;
};
