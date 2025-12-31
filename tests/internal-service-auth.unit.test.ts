/**
 * SEC-INTERNAL-AUTH-2: Tests for Internal Service Authentication Middleware
 *
 * Coverage targets:
 * - JWT-based authentication
 * - Legacy token authentication (hybrid mode)
 * - Missing token handling
 * - Invalid token handling
 * - Configuration validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { createHmac } from 'node:crypto';
import { requireInternalServiceAuth } from '../src/middleware/internal-service-auth';

const LEGACY_TOKEN = 'unit-test-token';
const JWT_SIGNING_KEY = 'test-jwt-signing-key-32-bytes-minimum';

/**
 * Helper to base64url encode without padding
 */
function base64UrlEncode(data: Buffer | string): string {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Helper to create a valid internal JWT for testing
 */
function createTestJwt(
  audience: string = 'doc-service',
  signingKey: string = JWT_SIGNING_KEY,
  options: {
    iat?: number;
    exp?: number;
    internal?: boolean;
    requestId?: string;
  } = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    aud: audience,
    iat: options.iat ?? now,
    exp: options.exp ?? now + 60,
    internal: options.internal ?? true,
    requestId: options.requestId ?? 'req-test-123',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', signingKey).update(signingInput).digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

describe('requireInternalServiceAuth (unit)', () => {
  let originalJwtKey: string | undefined;
  let originalLegacyToken: string | undefined;
  let originalAuthMode: string | undefined;

  beforeEach(() => {
    originalJwtKey = process.env.INTERNAL_JWT_SIGNING_KEY;
    originalLegacyToken = process.env.INTERNAL_SERVICE_TOKEN;
    originalAuthMode = process.env.INTERNAL_AUTH_MODE;
  });

  afterEach(() => {
    // Restore original values
    if (originalJwtKey !== undefined) {
      process.env.INTERNAL_JWT_SIGNING_KEY = originalJwtKey;
    } else {
      delete process.env.INTERNAL_JWT_SIGNING_KEY;
    }
    if (originalLegacyToken !== undefined) {
      process.env.INTERNAL_SERVICE_TOKEN = originalLegacyToken;
    } else {
      delete process.env.INTERNAL_SERVICE_TOKEN;
    }
    if (originalAuthMode !== undefined) {
      process.env.INTERNAL_AUTH_MODE = originalAuthMode;
    } else {
      delete process.env.INTERNAL_AUTH_MODE;
    }
  });

  describe('configuration validation', () => {
    it('returns 500 when neither JWT key nor legacy token is configured', async () => {
      delete process.env.INTERNAL_JWT_SIGNING_KEY;
      delete process.env.INTERNAL_SERVICE_TOKEN;

      const app = new Hono();
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/test', (c) => c.json({ ok: true }));

      const res = await app.request('/internal/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': 'some-token',
        },
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('missing token', () => {
    it('returns 401 when header missing', async () => {
      process.env.INTERNAL_JWT_SIGNING_KEY = JWT_SIGNING_KEY;

      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(401);
      expect(ran).toBe(false);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('JWT-based authentication', () => {
    beforeEach(() => {
      process.env.INTERNAL_JWT_SIGNING_KEY = JWT_SIGNING_KEY;
      process.env.INTERNAL_AUTH_MODE = 'jwt';
    });

    it('accepts valid JWT with correct audience', async () => {
      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      const token = createTestJwt('doc-service');

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': token,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      expect(ran).toBe(true);
    });

    it('rejects JWT with wrong audience', async () => {
      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      // Create JWT for wrong service
      const token = createTestJwt('cms-service');

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': token,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(403);
      expect(ran).toBe(false);
    });

    it('rejects JWT with wrong signing key', async () => {
      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      const token = createTestJwt('doc-service', 'wrong-signing-key');

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': token,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(403);
      expect(ran).toBe(false);
    });

    it('rejects expired JWT', async () => {
      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      const now = Math.floor(Date.now() / 1000);
      const token = createTestJwt('doc-service', JWT_SIGNING_KEY, {
        iat: now - 120,
        exp: now - 60, // Expired
      });

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': token,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(403);
      expect(ran).toBe(false);
    });
  });

  describe('legacy token authentication (hybrid mode)', () => {
    beforeEach(() => {
      process.env.INTERNAL_SERVICE_TOKEN = LEGACY_TOKEN;
      process.env.INTERNAL_AUTH_MODE = 'hybrid';
      delete process.env.INTERNAL_JWT_SIGNING_KEY;
    });

    it('accepts valid legacy token', async () => {
      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': LEGACY_TOKEN,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      expect(ran).toBe(true);
    });

    it('rejects invalid legacy token', async () => {
      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': 'wrong-token',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(403);
      expect(ran).toBe(false);
    });
  });

  describe('hybrid mode with both JWT and legacy token', () => {
    beforeEach(() => {
      process.env.INTERNAL_JWT_SIGNING_KEY = JWT_SIGNING_KEY;
      process.env.INTERNAL_SERVICE_TOKEN = LEGACY_TOKEN;
      process.env.INTERNAL_AUTH_MODE = 'hybrid';
    });

    it('accepts valid JWT when both are configured', async () => {
      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      const token = createTestJwt('doc-service');

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': token,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      expect(ran).toBe(true);
    });

    it('accepts legacy token when JWT fails in hybrid mode', async () => {
      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      // Use legacy token
      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': LEGACY_TOKEN,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      expect(ran).toBe(true);
    });

    it('rejects invalid JWT in jwt-only mode even with legacy token configured', async () => {
      process.env.INTERNAL_AUTH_MODE = 'jwt';

      const app = new Hono();
      let ran = false;
      app.use('*', requireInternalServiceAuth());
      app.post('/internal/doc-actions', (c) => {
        ran = true;
        return c.json({ ok: true });
      });

      // Try to use legacy token in jwt-only mode
      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': LEGACY_TOKEN,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(403);
      expect(ran).toBe(false);
    });
  });
});
