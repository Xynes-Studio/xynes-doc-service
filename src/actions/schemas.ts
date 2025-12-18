import { z } from 'zod';

export const documentStatusSchema = z.enum(['draft', 'published']);

// Accept common rich-text editor JSON shapes without allowing arbitrary primitives.
export const documentContentSchema = z.union([z.object({}).passthrough(), z.array(z.unknown())]);

export const createDocumentPayloadSchema = z.object({
  title: z.string().optional(),
  type: z.string().default('doc'),
  content: documentContentSchema.default({}),
  status: documentStatusSchema.default('draft'),
});

export const readDocumentPayloadSchema = z.object({
  id: z.string().uuid(),
});

export const updateDocumentPayloadSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().optional().nullable(),
    content: documentContentSchema.optional(),
    status: documentStatusSchema.optional(),
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
