import type { Context, Next } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { createErrorResponse } from '@xynes/envelope';
import { logger } from '../infra/logger';

function generateRequestId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function tokensMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function requireInternalServiceAuth() {
  return async (c: Context, next: Next) => {
    const requestId = c.get('requestId') || generateRequestId();
    const expected = process.env.INTERNAL_SERVICE_TOKEN;

    if (!expected) {
      logger.error('[InternalAuth] Misconfigured: INTERNAL_SERVICE_TOKEN is not set', {
        requestId,
        path: c.req.path,
        method: c.req.method,
      });
      return c.json(
        createErrorResponse('INTERNAL_ERROR', 'Internal auth misconfigured', requestId),
        500,
      );
    }

    const provided = c.req.header('X-Internal-Service-Token');
    if (!provided) {
      logger.warn('[InternalAuth] Rejected: missing X-Internal-Service-Token', {
        requestId,
        path: c.req.path,
        method: c.req.method,
      });
      return c.json(
        createErrorResponse('UNAUTHORIZED', 'Missing internal auth token', requestId),
        401,
      );
    }

    if (!tokensMatch(provided, expected)) {
      logger.warn('[InternalAuth] Rejected: invalid X-Internal-Service-Token', {
        requestId,
        path: c.req.path,
        method: c.req.method,
      });
      return c.json(
        createErrorResponse('FORBIDDEN', 'Invalid internal auth token', requestId),
        403,
      );
    }

    return next();
  };
}
