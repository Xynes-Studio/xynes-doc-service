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
    const doc = { id: 'doc-1', workspaceId: ctx.workspaceId, title: 'Read Me' };
    const whereMock = mock(() => Promise.resolve([doc]));
    const fromMock = mock(() => ({ where: whereMock }));
    mockSelect.mockImplementation(() => ({ from: fromMock }));

    const result = await readDocumentHandler({ id: 'doc-1' } as any, ctx);
    expect(result).toEqual(doc);
  });

  it('throws NotFoundError when not found', async () => {
    const whereMock = mock(() => Promise.resolve([]));
    const fromMock = mock(() => ({ where: whereMock }));
    mockSelect.mockImplementation(() => ({ from: fromMock }));

    try {
      await readDocumentHandler({ id: 'doc-404' } as any, ctx);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundError);
    }
  });
});
