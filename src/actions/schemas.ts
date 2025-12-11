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
