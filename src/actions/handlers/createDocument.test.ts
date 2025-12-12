import { describe, it, expect, mock } from 'bun:test';

const mockInsert = mock(() => ({
  values: mock(() => ({
    returning: mock(() => Promise.resolve([])),
  })),
}));

mock.module('../../infra/db', () => ({
  db: {
    insert: mockInsert,
  },
}));

const { createDocumentHandler } = await import('./createDocument');
describe('createDocumentHandler', () => {
  it('creates a document and returns it', async () => {
    const createdAt = new Date();
    const updatedAt = new Date();

    const payload = {
      title: 'Test Document',
      type: 'page',
      content: { blocks: [] },
      status: 'draft',
    };

    const ctx = {
      workspaceId: 'workspace-123',
      userId: 'user-123',
    };

    const expected = {
      id: 'doc-123',
      workspaceId: ctx.workspaceId,
      ...payload,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      createdAt,
      updatedAt,
    };

    const returningMock = mock(() => Promise.resolve([expected]));
    const valuesMock = mock((values: any) => {
      expect(values.workspaceId).toBe(ctx.workspaceId);
      expect(values.type).toBe(payload.type);
      expect(values.title).toBe(payload.title);
      expect(values.content).toEqual(payload.content);
      expect(values.status).toBe(payload.status);
      expect(values.createdBy).toBe(ctx.userId);
      expect(values.updatedBy).toBe(ctx.userId);
      return { returning: returningMock };
    });
    mockInsert.mockImplementation(() => ({ values: valuesMock }));

    const result = await createDocumentHandler(payload as any, ctx);
    expect(result).toEqual(expected);
  });
});
