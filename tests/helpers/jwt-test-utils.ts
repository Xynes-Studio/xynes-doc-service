/**
 * SEC-INTERNAL-AUTH-2: Shared JWT Test Utilities
 *
 * Common helpers for testing internal JWT authentication across test files.
 */

import { createHmac } from 'node:crypto';
import type { InternalJwtPayload, ServiceKey } from '../../src/infra/security/internal-jwt';

export const TEST_SIGNING_KEY = 'test-jwt-signing-key-32-bytes-minimum';
export const LEGACY_TOKEN = 'unit-test-token';

/**
 * Base64url encode without padding (JWT standard)
 */
export function base64UrlEncode(data: Buffer | string): string {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Base64url decode
 */
export function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

/**
 * Options for creating a test JWT (simple form)
 */
export interface CreateTestJwtSimpleOptions {
  /** Override issued-at timestamp (epoch seconds) */
  iat?: number;
  /** Override expiration timestamp (epoch seconds) */
  exp?: number;
  /** Override internal marker */
  internal?: boolean;
  /** Override request ID */
  requestId?: string;
  /** Issuer service (optional) */
  iss?: ServiceKey;
}

/**
 * Create a valid internal JWT for testing (simple form).
 *
 * @param audience - Target service audience (or payload object)
 * @param signingKey - HMAC signing key (defaults to TEST_SIGNING_KEY)
 * @param options - Optional overrides for JWT payload
 * @returns Signed JWT string
 */
export function createTestJwt(
  audience: ServiceKey | (Partial<InternalJwtPayload> & { aud: ServiceKey }),
  signingKey: string = TEST_SIGNING_KEY,
  options: CreateTestJwtSimpleOptions | Record<string, unknown> = {},
): string {
  const now = Math.floor(Date.now() / 1000);

  // Determine if first arg is a string (audience) or object (payload)
  const isPayloadObject = typeof audience === 'object';

  // Build payload based on call style
  let payload: Record<string, unknown>;

  if (isPayloadObject) {
    // Called as createTestJwt({ aud: 'doc-service', ... }, signingKey, header)
    const payloadArg = audience;
    const headerArg = signingKey !== TEST_SIGNING_KEY ? signingKey : undefined;
    const header =
      typeof options === 'object' && 'alg' in options ? options : { alg: 'HS256', typ: 'JWT' };

    payload = {
      aud: payloadArg.aud,
      iat: payloadArg.iat ?? now,
      exp: payloadArg.exp ?? now + 60,
      internal: payloadArg.internal ?? true,
      requestId: payloadArg.requestId ?? 'req-test-123',
    };

    // Add iss if present
    if (payloadArg.iss) {
      payload.iss = payloadArg.iss;
    }

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Use the provided signing key, or the default if header was passed in 2nd position
    const actualSigningKey = headerArg ?? TEST_SIGNING_KEY;
    const signature = createHmac('sha256', actualSigningKey).update(signingInput).digest();
    const encodedSignature = base64UrlEncode(signature);

    return `${signingInput}.${encodedSignature}`;
  } else {
    // Called as createTestJwt('doc-service', signingKey, options)
    const simpleOptions = options as CreateTestJwtSimpleOptions;
    payload = {
      aud: audience,
      iat: simpleOptions.iat ?? now,
      exp: simpleOptions.exp ?? now + 60,
      internal: simpleOptions.internal ?? true,
      requestId: simpleOptions.requestId ?? 'req-test-123',
    };

    // Add iss if present
    if (simpleOptions.iss) {
      payload.iss = simpleOptions.iss;
    }

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', signingKey).update(signingInput).digest();
    const encodedSignature = base64UrlEncode(signature);

    return `${signingInput}.${encodedSignature}`;
  }
}

/**
 * Create a JWT with custom payload and header (for negative testing)
 */
export function createCustomJwt(
  payload: Partial<InternalJwtPayload> & { aud: ServiceKey },
  signingKey: string = TEST_SIGNING_KEY,
  header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' },
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    aud: payload.aud,
    iat: payload.iat ?? now,
    exp: payload.exp ?? now + 60,
    internal: payload.internal ?? true,
    requestId: payload.requestId ?? 'req-test-123',
    ...(payload.iss ? { iss: payload.iss } : {}),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', signingKey).update(signingInput).digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Parse a JWT without verification (for testing inspection)
 */
export function parseJwtUnsafe(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
} | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart || !signaturePart) return null;

  try {
    return {
      header: JSON.parse(base64UrlDecode(headerPart).toString('utf8')),
      payload: JSON.parse(base64UrlDecode(payloadPart).toString('utf8')),
      signature: signaturePart,
    };
  } catch {
    return null;
  }
}
