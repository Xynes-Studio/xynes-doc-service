import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ZodError } from 'zod';
import { updateDocumentHandler } from './updateDocument';
import { NotFoundError } from '../errors';

// Mock DB
const mockUpdate = mock(() => ({
  set: mock(() => ({
    where: mock(() => ({ returning: mock(() => Promise.resolve([])) })),
  })),
}));

mock.module('../../infra/db', () => ({
  db: {
    update: mockUpdate,
  },
}));

describe('updateDocumentHandler', () => {
  const mockCtx = {
    workspaceId: 'workspace-123',
    userId: 'user-123',
  };

  const docId = '550e8400-e29b-41d4-a716-446655440000';

  const payload = {
    id: docId,
    title: 'New Title',
    content: { foo: 'bar' },
    status: 'published' as const,
  };

  beforeEach(() => {
    mockUpdate.mockClear();
  });

  it('should update document successfully', async () => {
    const mockUpdatedDoc = { id: docId, workspaceId: 'workspace-123', ...payload };
    const returningMock = mock(() => Promise.resolve([mockUpdatedDoc]));
    const updateWhereMock = mock(() => ({ returning: returningMock }));
    const setMock = mock(() => ({ where: updateWhereMock }));
    mockUpdate.mockImplementation(() => ({ set: setMock }));

    const result = await updateDocumentHandler(payload, mockCtx);

    expect(result).toEqual(mockUpdatedDoc);
  });

  it('should throw NotFoundError if document does not exist', async () => {
    const returningMock = mock(() => Promise.resolve([]));
    const updateWhereMock = mock(() => ({ returning: returningMock }));
    const setMock = mock(() => ({ where: updateWhereMock }));
    mockUpdate.mockImplementation(() => ({ set: setMock }));

    try {
      await updateDocumentHandler(payload, mockCtx);
      expect(true).toBe(false); // Fail if no error
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });

  it('should throw ZodError if no fields provided', async () => {
    try {
      await updateDocumentHandler({ id: docId } as any, mockCtx);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
    }
  });

  it('should throw ZodError for invalid status', async () => {
    try {
      await updateDocumentHandler({ id: docId, status: 'archived' } as any, mockCtx);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
    }
  });
});
