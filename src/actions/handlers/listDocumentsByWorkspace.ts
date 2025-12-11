import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { ActionHandler } from '../types';
import { listDocumentsPayloadSchema } from '../schemas';
import { db } from '../../infra/db';
import { documents } from '../../infra/db/schema';

export const listDocumentsByWorkspaceHandler: ActionHandler<
  z.infer<typeof listDocumentsPayloadSchema>,
  Pick<typeof documents.$inferSelect, 'id' | 'title' | 'createdAt' | 'updatedAt'>[]
> = async (payload, ctx) => {
  const { workspaceId } = ctx;
  const { limit = 20, offset = 0 } = payload;

  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
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
