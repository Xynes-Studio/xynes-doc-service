import { describe, it, expect, mock } from 'bun:test';
import { NotFoundError } from '../errors';

const mockSelect = mock(() => ({
  from: mock(() => ({
    where: mock(() => Promise.resolve([])),
  })),
}));

mock.module('../../infra/db', () => ({
  db: {
    select: mockSelect,
  },
}));

const { readDocumentHandler } = await import('./readDocument');

describe('readDocumentHandler', () => {
  const ctx = { workspaceId: 'workspace-123', userId: 'user-123' };

  it('returns the document when found', async () => {
    const docId = '550e8400-e29b-41d4-a716-446655440000';
    const doc = { id: docId, workspaceId: ctx.workspaceId, title: 'Read Me' };
    const whereMock = mock(() => Promise.resolve([doc]));
    const fromMock = mock(() => ({ where: whereMock }));
    mockSelect.mockImplementation(() => ({ from: fromMock }));

    const result = await readDocumentHandler({ id: docId } as any, ctx);
    expect(result).toEqual(doc);
  });

  it('throws NotFoundError when not found', async () => {
    const docId = '550e8400-e29b-41d4-a716-446655440000';
    const whereMock = mock(() => Promise.resolve([]));
    const fromMock = mock(() => ({ where: whereMock }));
    mockSelect.mockImplementation(() => ({ from: fromMock }));

    try {
      await readDocumentHandler({ id: docId } as any, ctx);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });
});
