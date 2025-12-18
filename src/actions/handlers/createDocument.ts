import { z } from 'zod';
import { ActionHandler } from '../types';
import { createDocumentPayloadSchema } from '../schemas';
import { db } from '../../infra/db';
import { documents } from '../../infra/db/schema';

export const createDocumentHandler: ActionHandler<
  z.infer<typeof createDocumentPayloadSchema>,
  typeof documents.$inferSelect
> = async (payload, ctx) => {
  const parsedPayload = createDocumentPayloadSchema.parse(payload);
  const { workspaceId, userId } = ctx;

  const [doc] = await db
    .insert(documents)
    .values({
      workspaceId,
      type: parsedPayload.type,
      title: parsedPayload.title,
      content: parsedPayload.content,
      status: parsedPayload.status,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  return doc;
};
