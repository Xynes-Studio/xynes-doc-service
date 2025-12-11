import { Hono } from 'hono';
import { z } from 'zod';
import { executeDocAction } from '../actions/execute';
import { createDocumentPayloadSchema, readDocumentPayloadSchema } from '../actions/schemas';
import { DocActionKey } from '../actions/types';
import { UnknownActionError } from '../actions/errors';
import { logger } from '../infra/logger';

const internalRoute = new Hono();

const actionRequestSchema = z.object({
  actionKey: z.string(),
  payload: z.unknown(),
});

internalRoute.post('/doc-actions', async (c) => {
  const workspaceId = c.req.header('X-Workspace-Id');
  const userId = c.req.header('X-XS-User-Id');

  if (!workspaceId) {
    return c.json(
      {
        error: {
          code: 'MISSING_HEADER',
          message: 'X-Workspace-Id header is required',
        },
      },
      400,
    );
  }

  const body = await c.req.json();
  const result = actionRequestSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request body',
          details: result.error.errors,
        },
      },
      400,
    );
  }

  const { actionKey, payload: rawPayload } = result.data;
  const ctx = { workspaceId, userId };

  logger.info(`Received internal action: ${actionKey}`, {
    workspaceId,
    userId,
  });

  try {
    let validatedPayload;

    // Select schema based on actionKey
    // We could move this mapping to the registry if it grows too large,
    // but for now a switch/case is fine for 2 actions.
    const key = actionKey as DocActionKey;

    switch (key) {
      case 'docs.document.create':
        validatedPayload = createDocumentPayloadSchema.parse(rawPayload);
        break;
      case 'docs.document.read':
        validatedPayload = readDocumentPayloadSchema.parse(rawPayload);
        break;
      default:
        // If it's not a known key in our switch, check if it's in registry directly?
        // Actually, if we want to valid payload structure, we need to know the schema.
        // If we don't have a schema mapping here, we can't validate safely.
        // For now, fail if not explicitly handled.
        throw new UnknownActionError(actionKey);
    }

    const actionResult = await executeDocAction(key, validatedPayload, ctx);

    // Determine status code
    const status = key === 'docs.document.create' ? 201 : 200;

    return c.json(actionResult, status);
  } catch (err: any) {
    // If Zod validation failed
    if (err instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Payload validation failed',
            details: err.errors,
          },
        },
        400,
      );
    }

    // Domain errors are handled by app.onError normally, but since we are inside a try/catch block
    // we might want to let them bubble up OR handle specific ones.
    // However, executeDocAction throws DomainErrors.
    // If we rethrow, Hono's onError should catch it?
    // YES. Hono catches async errors thrown in handlers.
    throw err;
  }
});

export { internalRoute };
