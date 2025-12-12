import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { ActionHandler } from '../types';
import { listDocumentsPayloadSchema } from '../schemas';
import { db } from '../../infra/db';
import { documents } from '../../infra/db/schema';

export const listDocumentsByWorkspaceHandler: ActionHandler<
  z.infer<typeof listDocumentsPayloadSchema>,
  Pick<typeof documents.$inferSelect, 'id' | 'title' | 'status' | 'createdAt' | 'updatedAt'>[]
> = async (payload, ctx) => {
  const parsedPayload = listDocumentsPayloadSchema.parse(payload);
  const { workspaceId } = ctx;
  const { limit, offset } = parsedPayload;

  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      status: documents.status,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.workspaceId, workspaceId))
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset);

  return docs;
};
