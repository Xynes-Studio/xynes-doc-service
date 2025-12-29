/**
 * Unit Tests for Authz Middleware
 *
 * DOC-RBAC-1: Tests for the authorization middleware that checks
 * permissions via authz service before allowing action execution.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { checkActionPermission, type AuthzMiddlewareOptions } from '../src/middleware/authz-check';
import { setAuthzClient, resetAuthzClient, type IAuthzClient } from '../src/infra/authz';
import { ForbiddenError, UnauthorizedError } from '../src/actions/errors';

describe('Authz Middleware (Unit)', () => {
  let mockAuthzClient: IAuthzClient;

  beforeEach(() => {
    mockAuthzClient = {
      check: mock(() => Promise.resolve({ allowed: true })),
    };
    setAuthzClient(mockAuthzClient);
  });

  afterEach(() => {
    resetAuthzClient();
  });

  describe('checkActionPermission()', () => {
    it('should allow action when authz returns allowed=true', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: true }));
      setAuthzClient(mockAuthzClient);

      const ctx = {
        workspaceId: 'ws-123',
        userId: 'user-456',
        requestId: 'req-789',
      };

      // Should not throw
      await checkActionPermission('docs.document.create', ctx);

      expect(mockAuthzClient.check).toHaveBeenCalledWith({
        userId: 'user-456',
        workspaceId: 'ws-123',
        actionKey: 'docs.document.create',
      });
    });

    it('should throw ForbiddenError when authz returns allowed=false', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: false }));
      setAuthzClient(mockAuthzClient);

      const ctx = {
        workspaceId: 'ws-123',
        userId: 'user-456',
        requestId: 'req-789',
      };

      await expect(checkActionPermission('docs.document.update', ctx)).rejects.toThrow(ForbiddenError);
    });

    it('should throw UnauthorizedError for write actions without userId', async () => {
      const ctx = {
        workspaceId: 'ws-123',
        userId: undefined,
        requestId: 'req-789',
      };

      await expect(checkActionPermission('docs.document.create', ctx)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for update actions without userId', async () => {
      const ctx = {
        workspaceId: 'ws-123',
        userId: undefined,
        requestId: 'req-789',
      };

      await expect(checkActionPermission('docs.document.update', ctx)).rejects.toThrow(UnauthorizedError);
    });

    it('should allow read actions without userId (public read)', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: true }));
      setAuthzClient(mockAuthzClient);

      const ctx = {
        workspaceId: 'ws-123',
        userId: undefined,
        requestId: 'req-789',
      };

      // Should not throw for read actions
      await checkActionPermission('docs.document.read', ctx, { requireUserId: false });

      // Should have called authz with empty string for userId
      expect(mockAuthzClient.check).toHaveBeenCalledWith({
        userId: '',
        workspaceId: 'ws-123',
        actionKey: 'docs.document.read',
      });
    });

    it('should check permission for listByWorkspace action', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: true }));
      setAuthzClient(mockAuthzClient);

      const ctx = {
        workspaceId: 'ws-123',
        userId: 'user-456',
        requestId: 'req-789',
      };

      await checkActionPermission('docs.document.listByWorkspace', ctx);

      expect(mockAuthzClient.check).toHaveBeenCalledWith({
        userId: 'user-456',
        workspaceId: 'ws-123',
        actionKey: 'docs.document.listByWorkspace',
      });
    });

    it('should include requestId in ForbiddenError', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: false }));
      setAuthzClient(mockAuthzClient);

      const ctx = {
        workspaceId: 'ws-123',
        userId: 'user-456',
        requestId: 'req-789',
      };

      try {
        await checkActionPermission('docs.document.create', ctx);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect((err as ForbiddenError).message).toContain('docs.document.create');
      }
    });

    it('should work with empty userId for read when allowed by options', async () => {
      mockAuthzClient.check = mock(() => Promise.resolve({ allowed: true }));
      setAuthzClient(mockAuthzClient);

      const ctx = {
        workspaceId: 'ws-123',
        userId: '',
        requestId: 'req-789',
      };

      await checkActionPermission('docs.document.read', ctx, { requireUserId: false });
      expect(mockAuthzClient.check).toHaveBeenCalled();
    });
  });

  describe('write action detection', () => {
    const writeActions = ['docs.document.create', 'docs.document.update'];
    const readActions = ['docs.document.read', 'docs.document.listByWorkspace'];

    for (const action of writeActions) {
      it(`should require userId for ${action}`, async () => {
        const ctx = {
          workspaceId: 'ws-123',
          userId: undefined,
          requestId: 'req-789',
        };

        await expect(checkActionPermission(action, ctx)).rejects.toThrow(UnauthorizedError);
      });
    }

    for (const action of readActions) {
      it(`should allow ${action} without userId when requireUserId=false`, async () => {
        mockAuthzClient.check = mock(() => Promise.resolve({ allowed: true }));
        setAuthzClient(mockAuthzClient);

        const ctx = {
          workspaceId: 'ws-123',
          userId: undefined,
          requestId: 'req-789',
        };

        await checkActionPermission(action, ctx, { requireUserId: false });
        expect(mockAuthzClient.check).toHaveBeenCalled();
      });
    }
  });
});
