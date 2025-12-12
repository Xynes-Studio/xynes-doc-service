import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { registerDocActions } from '../src/actions/register';
import { executeDocAction } from '../src/actions/execute';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../src/infra/db';
import { documents } from '../src/infra/db/schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../src/actions/errors';

describe.skipIf(process.env.RUN_INTEGRATION_TESTS !== 'true')('Doc Actions Integration', () => {
  beforeAll(() => {
    registerDocActions();
  });

  const workspaceId = uuidv4();
  const userId = uuidv4();
  const createdDocIds: string[] = [];

  afterAll(async () => {
    // Cleanup
    if (createdDocIds.length > 0) {
      for (const id of createdDocIds) {
        await db.delete(documents).where(eq(documents.id, id));
      }
    }
  });

  it('should create a document', async () => {
    const payload = {
      title: 'Test Document',
      type: 'page',
      content: { foo: 'bar' },
      status: 'draft',
    };
    const ctx = { workspaceId, userId };

    const doc: any = await executeDocAction('docs.document.create', payload, ctx);

    expect(doc).toBeDefined();
    expect(doc.id).toBeDefined();
    expect(doc.title).toBe(payload.title);
    expect(doc.workspaceId).toBe(workspaceId);
    expect(doc.status).toBe('draft');

    createdDocIds.push(doc.id);
  });

  it('should read a document', async () => {
    // Create first
    const payload = { title: 'Read Me', type: 'note', content: {}, status: 'published' };
    const ctx = { workspaceId, userId };
    const created: any = await executeDocAction('docs.document.create', payload, ctx);
    createdDocIds.push(created.id);

    // Read
    const read: any = await executeDocAction('docs.document.read', { id: created.id }, ctx);
    expect(read.id).toBe(created.id);
    expect(read.title).toBe(payload.title);
    expect(read.status).toBe(payload.status);
  });

  it('should update a document', async () => {
    // Create first
    const payload = { title: 'Old Title', type: 'page', content: { v: 1 } };
    const ctx = { workspaceId, userId };
    const created: any = await executeDocAction('docs.document.create', payload, ctx);
    createdDocIds.push(created.id);

    // Update
    const updatePayload = {
      id: created.id,
      title: 'New Title',
      content: { v: 2 },
    };
    const updated: any = await executeDocAction(
      'docs.document.update',
      updatePayload,
      ctx,
    );

    expect(updated.title).toBe(updatePayload.title);
    expect(updated.content).toEqual(updatePayload.content);

    // Verify Read matches
    const read: any = await executeDocAction('docs.document.read', { id: created.id }, ctx);
    expect(read.title).toBe(updatePayload.title);
    expect(read.content).toEqual(updatePayload.content);
  });

  it('should list documents by workspace', async () => {
    // We have created some documents in `workspaceId` from previous tests
    // Let's create one more to be sure
    const payload = { title: 'List Me', type: 'list-item', content: {} };
    const ctx = { workspaceId, userId };
    const created: any = await executeDocAction('docs.document.create', payload, ctx);
    createdDocIds.push(created.id);

    // List
    const listCtx = { workspaceId };
    const list: any = await executeDocAction(
      'docs.document.listByWorkspace',
      { limit: 10 },
      listCtx,
    );

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    
    // Check fields
    const doc = list.find((d: any) => d.id === created.id);
    expect(doc).toBeDefined();
    expect(doc.title).toBe(payload.title);
    expect(doc.content).toBeUndefined(); // list should not return content
  });

  it('should throw NotFoundError for wrong workspace', async () => {
    // Create in workspace 1
    const p1 = { title: 'Secret', type: 'page', content: {} };
    const ctx1 = { workspaceId, userId };
    const created: any = await executeDocAction('docs.document.create', p1, ctx1);
    createdDocIds.push(created.id);

    // Try read in workspace 2
    const ctx2 = { workspaceId: uuidv4(), userId }; // New workspace

    try {
      await executeDocAction('docs.document.read', { id: created.id }, ctx2);
      throw new Error('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  it('should throw NotFoundError for non-existent id', async () => {
    const ctx = { workspaceId, userId };
    try {
      await executeDocAction('docs.document.read', { id: uuidv4() }, ctx);
      throw new Error('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});
