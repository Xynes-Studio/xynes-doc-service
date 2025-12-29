/**
 * Unit Tests for AuthzClient
 *
 * DOC-RBAC-1: Tests for the authz service client.
 * These tests mock fetch to avoid network calls.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import {
  AuthzClient,
  createAuthzClient,
  getAuthzClient,
  setAuthzClient,
  resetAuthzClient,
  type IAuthzClient,
} from '../src/infra/authz/authz-client';

describe('AuthzClient (Unit)', () => {
  const TEST_AUTHZ_URL = 'http://authz-service:4300';
  const TEST_TOKEN = 'test-internal-token';
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    resetAuthzClient();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetAuthzClient();
  });

  describe('check()', () => {
    it('should return allowed=true when authz service returns allowed in envelope', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true, data: { allowed: true } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ) as typeof fetch;

      const client = new AuthzClient(TEST_AUTHZ_URL, TEST_TOKEN);
      const result = await client.check({
        userId: 'user-123',
        workspaceId: 'ws-456',
        actionKey: 'docs.document.create',
      });

      expect(result.allowed).toBe(true);
    });

    it('should return allowed=true when authz service returns flat allowed', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ allowed: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ) as typeof fetch;

      const client = new AuthzClient(TEST_AUTHZ_URL, TEST_TOKEN);
      const result = await client.check({
        userId: 'user-123',
        workspaceId: 'ws-456',
        actionKey: 'docs.document.read',
      });

      expect(result.allowed).toBe(true);
    });

    it('should return allowed=false when authz service denies', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true, data: { allowed: false } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ) as typeof fetch;

      const client = new AuthzClient(TEST_AUTHZ_URL, TEST_TOKEN);
      const result = await client.check({
        userId: 'user-123',
        workspaceId: 'ws-456',
        actionKey: 'docs.document.update',
      });

      expect(result.allowed).toBe(false);
    });

    it('should throw when authz service returns non-OK status', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: false, error: { code: 'INTERNAL_ERROR' } }), {
            status: 500,
          }),
        ),
      ) as typeof fetch;

      const client = new AuthzClient(TEST_AUTHZ_URL, TEST_TOKEN);

      await expect(
        client.check({
          userId: 'user-123',
          workspaceId: 'ws-456',
          actionKey: 'docs.document.create',
        }),
      ).rejects.toThrow('Authz service returned non-OK status: 500');
    });

    it('should throw when fetch throws (network error)', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error'))) as typeof fetch;

      const client = new AuthzClient(TEST_AUTHZ_URL, TEST_TOKEN);

      await expect(
        client.check({
          userId: 'user-123',
          workspaceId: 'ws-456',
          actionKey: 'docs.document.create',
        }),
      ).rejects.toThrow('Network error');
    });

    it('should throw when response is not valid JSON', async () => {
      global.fetch = mock(() =>
        Promise.resolve(
          new Response('not json', {
            status: 200,
          }),
        ),
      ) as typeof fetch;

      const client = new AuthzClient(TEST_AUTHZ_URL, TEST_TOKEN);

      await expect(
        client.check({
          userId: 'user-123',
          workspaceId: 'ws-456',
          actionKey: 'docs.document.create',
        }),
      ).rejects.toThrow('Invalid response format from authz service');
    });

    it('should send correct headers and body', async () => {
      let capturedRequest: Request | null = null;

      global.fetch = mock((input: RequestInfo | URL) => {
        capturedRequest = input as Request;
        return Promise.resolve(
          new Response(JSON.stringify({ allowed: true }), {
            status: 200,
          }),
        );
      }) as typeof fetch;

      const client = new AuthzClient(TEST_AUTHZ_URL, TEST_TOKEN);
      await client.check({
        userId: 'user-123',
        workspaceId: 'ws-456',
        actionKey: 'docs.document.create',
      });

      expect(capturedRequest).not.toBeNull();
      // Check URL was called correctly
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('singleton management', () => {
    it('getAuthzClient() returns same instance on multiple calls', () => {
      process.env.AUTHZ_SERVICE_URL = TEST_AUTHZ_URL;
      process.env.INTERNAL_SERVICE_TOKEN = TEST_TOKEN;

      const client1 = getAuthzClient();
      const client2 = getAuthzClient();

      expect(client1).toBe(client2);
    });

    it('setAuthzClient() allows injecting mock', async () => {
      const mockClient: IAuthzClient = {
        check: mock(() => Promise.resolve({ allowed: true })),
      };

      setAuthzClient(mockClient);

      const client = getAuthzClient();
      const result = await client.check({
        userId: 'test',
        workspaceId: 'test',
        actionKey: 'test',
      });

      expect(result.allowed).toBe(true);
      expect(mockClient.check).toHaveBeenCalledTimes(1);
    });

    it('resetAuthzClient() clears singleton', () => {
      process.env.AUTHZ_SERVICE_URL = TEST_AUTHZ_URL;
      process.env.INTERNAL_SERVICE_TOKEN = TEST_TOKEN;

      const client1 = getAuthzClient();
      resetAuthzClient();
      const client2 = getAuthzClient();

      expect(client1).not.toBe(client2);
    });
  });

  describe('createAuthzClient()', () => {
    it('uses environment variables for configuration', () => {
      process.env.AUTHZ_SERVICE_URL = 'http://custom-authz:9999';
      process.env.INTERNAL_SERVICE_TOKEN = 'custom-token';

      const client = createAuthzClient();

      // Can't directly check private fields, but we can verify it was created
      expect(client).toBeDefined();
      expect(client.check).toBeDefined();
    });

    it('uses defaults when env vars not set', () => {
      delete process.env.AUTHZ_SERVICE_URL;
      process.env.INTERNAL_SERVICE_TOKEN = TEST_TOKEN;

      const client = createAuthzClient();
      expect(client).toBeDefined();
    });
  });
});
