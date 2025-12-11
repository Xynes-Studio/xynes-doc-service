import { z } from 'zod';

export const createDocumentPayloadSchema = z.object({
  title: z.string().optional(),
  type: z.string(),
  content: z.record(z.any()).or(z.array(z.any())).default({}),
  status: z.string().default('draft').optional(),
});

export const readDocumentPayloadSchema = z.object({
  id: z.string().uuid(),
});

export const updateDocumentPayloadSchema = z.object({
  id: z.string().uuid(),
  content: z.record(z.any()).or(z.array(z.any())).optional(),
  title: z.string().optional().nullable(),
});

export const listDocumentsPayloadSchema = z.object({
  limit: z.number().int().positive().default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});
