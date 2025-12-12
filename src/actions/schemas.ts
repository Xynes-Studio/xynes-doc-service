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

export const updateDocumentPayloadSchema = z.object({
  id: z.string().uuid(),
  content: z.any().optional(),
  title: z.string().optional().nullable(),
});

export const listDocumentsPayloadSchema = z.object({
  limit: z.number().int().positive().default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});
