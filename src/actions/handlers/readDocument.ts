import { z } from 'zod';
import { ActionHandler } from '../types';
import { readDocumentPayloadSchema } from '../schemas';
import { db } from '../../infra/db';
import { documents } from '../../infra/db/schema';
import { eq, and } from 'drizzle-orm';
import { NotFoundError } from '../errors';

export const readDocumentHandler: ActionHandler<
  z.infer<typeof readDocumentPayloadSchema>,
  typeof documents.$inferSelect
> = async (payload, ctx) => {
  const { workspaceId } = ctx;
  const { id } = payload;

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.workspaceId, workspaceId)));

  if (!doc) {
    throw new NotFoundError('Document', id);
  }

  return doc;
};
