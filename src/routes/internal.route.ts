import { Hono } from 'hono';
import { z } from 'zod';
import { executeDocAction } from '../actions/execute';
import {
  createDocumentPayloadSchema,
  readDocumentPayloadSchema,
  updateDocumentPayloadSchema,
  listDocumentsPayloadSchema,
} from '../actions/schemas';
import { DocActionKey } from '../actions/types';
import { UnknownActionError } from '../actions/errors';
import { logger } from '../infra/logger';
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
} from '@xynes/envelope';

const internalRoute = new Hono();

const actionRequestSchema = z.object({
  actionKey: z.string(),
  payload: z.unknown(),
});

/**
 * Generates a unique request ID for error correlation.
 */
function generateRequestId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

internalRoute.post('/doc-actions', async (c) => {
  const requestId = generateRequestId();
  const workspaceId = c.req.header('X-Workspace-Id');
  const userId = c.req.header('X-XS-User-Id');

  if (!workspaceId) {
    return c.json(
      createErrorResponse('MISSING_HEADER', 'X-Workspace-Id header is required', requestId),
      400,
    );
  }

  const body = await c.req.json();
  const result = actionRequestSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      createValidationErrorResponse(result.error, requestId, 'Invalid request body'),
      400,
    );
  }

  const { actionKey, payload: rawPayload } = result.data;
  const ctx = { workspaceId, userId, requestId };

  logger.info(`Received internal action: ${actionKey}`, {
    workspaceId,
    userId,
    requestId,
  });

  try {
    let validatedPayload;

    // Select schema based on actionKey for payload validation.
    // All registered actions have corresponding schemas here.
    const key = actionKey as DocActionKey;

    switch (key) {
      case 'docs.document.create':
        validatedPayload = createDocumentPayloadSchema.parse(rawPayload);
        break;
      case 'docs.document.read':
        validatedPayload = readDocumentPayloadSchema.parse(rawPayload);
        break;
      case 'docs.document.update':
        validatedPayload = updateDocumentPayloadSchema.parse(rawPayload);
        break;
      case 'docs.document.listByWorkspace':
        validatedPayload = listDocumentsPayloadSchema.parse(rawPayload);
        break;
      default:
        throw new UnknownActionError(actionKey);
    }

    const actionResult = await executeDocAction(key, validatedPayload, ctx);

    // Determine status code and wrap in success envelope
    const status = key === 'docs.document.create' ? 201 : 200;

    return c.json(createSuccessResponse(actionResult, requestId), status);
  } catch (err: unknown) {
    // If Zod validation failed
    if (err instanceof z.ZodError) {
      return c.json(
        createValidationErrorResponse(err, requestId, 'Payload validation failed'),
        400,
      );
    }

    // Domain errors are handled by app.onError, let them bubble up
    throw err;
  }
});

export { internalRoute };
