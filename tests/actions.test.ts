import { describe, it, expect, beforeEach } from 'bun:test';
import { registerAction } from '../src/actions/registry';
import { executeDocAction } from '../src/actions/execute';
import { DocActionKey, ActionContext } from '../src/actions/types';
import { UnknownActionError } from '../src/actions/errors';

describe('Action Registry', () => {
  // Note: Registry is a singleton module, so state persists.
  // Ideally we would have a clearRegistry() or similar for testing,
  // but for now we can just overwrite or use unique keys if needed.

  const mockContext: ActionContext = {
    workspaceId: 'ws-123',
    userId: 'user-456',
  };

  it('should register and execute an action successfully', async () => {
    const actionKey: DocActionKey = 'docs.document.create';
    const expectedPayload = { title: 'Test Doc' };
    const expectedResult = { id: 'doc-1', title: 'Test Doc' };

    // Register mock handler
    registerAction(actionKey, async (payload: any, ctx) => {
      expect(payload).toEqual(expectedPayload);
      expect(ctx).toEqual(mockContext);
      return expectedResult;
    });

    const result = await executeDocAction(actionKey, expectedPayload, mockContext);
    expect(result).toEqual(expectedResult);
  });

  it('should throw UnknownActionError for unregistered action', async () => {
    // cast to DocActionKey to bypass typescript check for invalid key
    const invalidKey = 'invalid.action' as DocActionKey;

    try {
      await executeDocAction(invalidKey, {}, mockContext);
      throw new Error('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnknownActionError);
      expect(err.code).toBe('UNKNOWN_ACTION');
      expect(err.statusCode).toBe(400);
    }
  });
});
