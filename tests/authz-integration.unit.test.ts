/**
 * DOC-RBAC-1: Tests for authorization enforcement in internal routes.
 *
 * This tests the integration between the internal route and the authz middleware,
 * verifying that:
 * - Actions call the authz service to check permissions
 * - Denied requests return 403 Forbidden
 * - Missing userId for write actions returns 401 Unauthorized
 * - Allowed requests proceed to execution
 */
import { describe, it, expect, beforeEach, mock, afterEach, beforeAll } from 'bun:test';
import { INTERNAL_SERVICE_TOKEN } from './support/internal-auth';
import app from '../src/app';
import { setAuthzClient, type IAuthzClient } from '../src/infra/authz';
import { registerDocActions } from '../src/actions/register';

// Mock DB to avoid database dependency
const mockInsert = mock(() => ({
  values: mock(() => ({
    returning: mock(() =>
      Promise.resolve([
        {
          id: 'doc-123',
          workspaceId: 'ws-test',
          title: 'Test Doc',
          type: 'page',
          content: { blocks: [] },
          status: 'draft',
          createdBy: 'user-123',
          updatedBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
    ),
  })),
}));

const mockSelect = mock(() => ({
  from: mock(() => ({
    where: mock(() =>
      Promise.resolve([
        {
          id: 'doc-123',
          workspaceId: 'ws-test',
          title: 'Test Doc',
          type: 'page',
          content: { blocks: [] },
          status: 'draft',
          createdBy: 'user-123',
          updatedBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
    ),
  })),
}));

mock.module('../src/infra/db', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
  },
}));

describe('Authz Integration (Unit)', () => {
  const workspaceId = 'ws-test';
  const userId = 'user-123';

  let mockAuthzClient: IAuthzClient;

  beforeAll(() => {
    // Register document actions (normally done in index.ts)
    registerDocActions();
  });

  beforeEach(() => {
    // Reset authz client before each test
    mockAuthzClient = {
      check: mock(() => Promise.resolve({ allowed: true })),
    };
    setAuthzClient(mockAuthzClient);
  });

  afterEach(() => {
    // Reset to null after each test
    setAuthzClient(null as any);
  });

  describe('Authorization enforcement', () => {
    it('should allow action when authz returns allowed=true', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: true }));

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
          'X-Workspace-Id': workspaceId,
          'X-XS-User-Id': userId,
        },
        body: JSON.stringify({
          actionKey: 'docs.document.create',
          payload: {
            title: 'Test Document',
            type: 'page',
            content: { blocks: [] },
            status: 'draft',
          },
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(mockAuthzClient.check).toHaveBeenCalledTimes(1);
    });

    it('should return 403 Forbidden when authz returns allowed=false', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: false }));

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
          'X-Workspace-Id': workspaceId,
          'X-XS-User-Id': userId,
        },
        body: JSON.stringify({
          actionKey: 'docs.document.create',
          payload: {
            title: 'Test Document',
            type: 'page',
            content: { blocks: [] },
            status: 'draft',
          },
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 Unauthorized for write actions without userId', async () => {
      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
          'X-Workspace-Id': workspaceId,
          // No X-XS-User-Id header
        },
        body: JSON.stringify({
          actionKey: 'docs.document.create',
          payload: {
            title: 'Test Document',
            type: 'page',
            content: { blocks: [] },
            status: 'draft',
          },
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      // Authz should NOT be called - fail fast for missing userId
      expect(mockAuthzClient.check).not.toHaveBeenCalled();
    });

    it('should return 401 for update action without userId', async () => {
      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
          'X-Workspace-Id': workspaceId,
          // No X-XS-User-Id header
        },
        body: JSON.stringify({
          actionKey: 'docs.document.update',
          payload: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Updated Title',
          },
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow read action to proceed even without userId when authz allows', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: true }));

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
          'X-Workspace-Id': workspaceId,
          // No X-XS-User-Id header - read doesn't require it
        },
        body: JSON.stringify({
          actionKey: 'docs.document.read',
          payload: {
            id: '550e8400-e29b-41d4-a716-446655440000',
          },
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(mockAuthzClient.check).toHaveBeenCalledTimes(1);
    });

    it('should pass correct parameters to authz check', async () => {
      // Create a fresh mock to capture the call parameters
      let capturedParams: any = null;
      const checkMock = mock(async (params: any) => {
        capturedParams = params;
        return { allowed: true };
      });
      setAuthzClient({ check: checkMock });

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
          'X-Workspace-Id': workspaceId,
          'X-XS-User-Id': userId,
        },
        body: JSON.stringify({
          actionKey: 'docs.document.create',
          payload: {
            title: 'Test',
            type: 'page',
            content: {},
            status: 'draft',
          },
        }),
      });

      // Verify the call was made
      expect(checkMock).toHaveBeenCalledTimes(1);
      
      // Verify captured parameters
      expect(capturedParams).toEqual({
        actionKey: 'docs.document.create',
        workspaceId: workspaceId,
        userId: userId,
      });
    });
  });

  describe('Authz error handling', () => {
    it('should return 500 when authz service fails', async () => {
      // Create a failing mock inside the test to avoid state leakage
      setAuthzClient({
        check: async () => {
          throw new Error('Authz service unavailable');
        },
      });

      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
          'X-Workspace-Id': workspaceId,
          'X-XS-User-Id': userId,
        },
        body: JSON.stringify({
          actionKey: 'docs.document.create',
          payload: {
            title: 'Test',
            type: 'page',
            content: {},
            status: 'draft',
          },
        }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
    });
  });

  describe('Existing header validation still works', () => {
    it('should return 400 when X-Workspace-Id is missing', async () => {
      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
          // No X-Workspace-Id header
        },
        body: JSON.stringify({
          actionKey: 'docs.document.create',
          payload: {
            title: 'Test',
            type: 'page',
            content: {},
            status: 'draft',
          },
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.message).toContain('X-Workspace-Id');
    });

    it('should return 403 when internal service token is invalid', async () => {
      const res = await app.request('/internal/doc-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': 'wrong-token',
          'X-Workspace-Id': workspaceId,
          'X-XS-User-Id': userId,
        },
        body: JSON.stringify({
          actionKey: 'docs.document.create',
          payload: {},
        }),
      });

      expect(res.status).toBe(403);
    });
  });
});
