import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ZodError } from 'zod';
import { listDocumentsByWorkspaceHandler } from './listDocumentsByWorkspace';

// Mock DB
const mockSelect = mock(() => ({
  from: mock(() => ({
    where: mock(() => ({
      orderBy: mock(() => ({
        limit: mock(() => ({
          offset: mock(() => Promise.resolve([])),
        })),
      })),
    })),
  })),
}));

mock.module('../../infra/db', () => ({
  db: {
    select: mockSelect,
  },
}));

describe('listDocumentsByWorkspaceHandler', () => {
  const mockCtx = {
    workspaceId: 'workspace-123',
    userId: 'user-123',
  };

  const payload = {
    limit: 10,
    offset: 0,
  };

  beforeEach(() => {
    mockSelect.mockClear();
  });

  it('should list documents successfully', async () => {
    const mockDocs = [
      {
        id: 'doc-1',
        title: 'Doc 1',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'doc-2',
        title: 'Doc 2',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Mock chain
    const offsetMock = mock(() => Promise.resolve(mockDocs));
    const limitMock = mock(() => ({ offset: offsetMock }));
    const orderByMock = mock(() => ({ limit: limitMock }));
    const whereMock = mock(() => ({ orderBy: orderByMock }));
    const fromMock = mock(() => ({ where: whereMock }));

    // We need to match the select call arguments or just return the mock chain
    mockSelect.mockImplementation(() => ({ from: fromMock }));

    const result = await listDocumentsByWorkspaceHandler(payload, mockCtx);

    expect(result).toEqual(mockDocs);
    expect(mockSelect).toHaveBeenCalled();
  });

  it('should apply defaults for empty payload', async () => {
    const mockDocs = [
      {
        id: 'doc-1',
        title: 'Doc 1',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const offsetMock = mock(() => Promise.resolve(mockDocs));
    const limitMock = mock(() => ({ offset: offsetMock }));
    const orderByMock = mock(() => ({ limit: limitMock }));
    const whereMock = mock(() => ({ orderBy: orderByMock }));
    const fromMock = mock(() => ({ where: whereMock }));
    mockSelect.mockImplementation(() => ({ from: fromMock }));

    const result = await listDocumentsByWorkspaceHandler({} as any, mockCtx);
    expect(result).toEqual(mockDocs);
  });

  it('should throw ZodError for invalid pagination', async () => {
    try {
      await listDocumentsByWorkspaceHandler({ limit: -1 } as any, mockCtx);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
    }
  });
});
