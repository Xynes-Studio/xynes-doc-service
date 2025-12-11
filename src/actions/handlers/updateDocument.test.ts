import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { updateDocumentHandler } from './updateDocument';
import { NotFoundError } from '../errors';

// Mock DB
const mockSelect = mock(() => ({
  from: mock(() => ({
    where: mock(() => ({ limit: mock(() => Promise.resolve([])) })),
  })),
}));
const mockUpdate = mock(() => ({
  set: mock(() => ({
    where: mock(() => ({ returning: mock(() => Promise.resolve([])) })),
  })),
}));

mock.module('../../infra/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

describe('updateDocumentHandler', () => {
  const mockCtx = {
    workspaceId: 'workspace-123',
    userId: 'user-123',
  };

  const payload = {
    id: 'doc-123',
    title: 'New Title',
    content: { foo: 'bar' },
  };

  beforeEach(() => {
    mockSelect.mockClear();
    mockUpdate.mockClear();
  });

  it('should update document successfully', async () => {
    // Setup mock for finding document
    const mockExistingDoc = { id: 'doc-123', workspaceId: 'workspace-123' };
    const limitMock = mock(() => Promise.resolve([mockExistingDoc]));
    const whereMock = mock(() => ({ limit: limitMock }));
    const fromMock = mock(() => ({ where: whereMock }));
    mockSelect.mockImplementation(() => ({ from: fromMock }));

    // Setup mock for update
    const mockUpdatedDoc = { ...mockExistingDoc, ...payload };
    const returningMock = mock(() => Promise.resolve([mockUpdatedDoc]));
    const updateWhereMock = mock(() => ({ returning: returningMock }));
    const setMock = mock(() => ({ where: updateWhereMock }));
    mockUpdate.mockImplementation(() => ({ set: setMock }));

    const result = await updateDocumentHandler(payload, mockCtx);

    expect(result).toEqual(mockUpdatedDoc);
  });

  it('should throw NotFoundError if document does not exist', async () => {
    // Setup mock for not finding document
    const limitMock = mock(() => Promise.resolve([]));
    const whereMock = mock(() => ({ limit: limitMock }));
    const fromMock = mock(() => ({ where: whereMock }));
    mockSelect.mockImplementation(() => ({ from: fromMock }));

    try {
      await updateDocumentHandler(payload, mockCtx);
      expect(true).toBe(false); // Fail if no error
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });
});
