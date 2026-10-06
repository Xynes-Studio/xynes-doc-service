/** SEC-003-FU-1: only bound identities may enter internal action dispatch. */
import type { Context, Next } from 'hono';
import { randomUUID } from 'node:crypto';
import { authenticateInternalRequest } from '../infra/security/internal-request';
import { config } from '../infra/config';

export function requireInternalServiceAuth() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header('X-Request-Id') || randomUUID();
    const authentication = await authenticateInternalRequest(
      c.req.raw,
      'doc-service',
      Number.parseInt(config.server.MAX_JSON_BODY_BYTES, 10) || 1024 * 1024,
    );
    if (!authentication.ok) {
      return c.json(
        {
          ok: false,
          error: { code: authentication.code, message: authentication.message },
          meta: { requestId },
        },
        authentication.status,
      );
    }
    c.set('requestId', authentication.requestId);
    c.req.raw = new Request(c.req.raw, { body: Buffer.from(authentication.body), duplex: 'half' });
    return next();
  };
}
