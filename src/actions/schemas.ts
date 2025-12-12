import { z } from 'zod';

export const createDocumentPayloadSchema = z.object({
  title: z.string().optional(),
  type: z.string().default('doc'),
  content: z.any().default({}),
  status: z.string().optional().default('draft'),
});

export const readDocumentPayloadSchema = z.object({
  id: z.string().uuid(),
});

export const updateDocumentPayloadSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().optional().nullable(),
    content: z.unknown().optional(),
    status: z.enum(['draft', 'published']).optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.content !== undefined || data.status !== undefined,
    {
      message: 'At least one of title, content, or status must be provided',
    },
  );

export const listDocumentsPayloadSchema = z.object({
  limit: z.number().int().positive().optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0),
});
