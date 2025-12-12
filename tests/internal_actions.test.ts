import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../src/app';
import { registerDocActions } from '../src/actions/register';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../src/infra/db';
import { documents } from '../src/infra/db/schema';
import { eq } from 'drizzle-orm';

describe.skipIf(process.env.RUN_INTEGRATION_TESTS !== 'true')('Internal Doc Actions Endpoint', () => {
  beforeAll(() => {
    registerDocActions();
  });

  const workspaceId = uuidv4();
  const userId = uuidv4();
  const createdDocIds: string[] = [];

  afterAll(async () => {
    if (createdDocIds.length > 0) {
      for (const id of createdDocIds) {
        await db.delete(documents).where(eq(documents.id, id));
      }
    }
  });

  it('should create a document via /internal/doc-actions', async () => {
    const payload = {
      title: 'API Created Document',
      type: 'page',
      content: { foo: 'bar' },
      status: 'draft',
    };

    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.create',
        payload,
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(201);

    const response: any = await res.json();
    // New envelope format
    expect(response.ok).toBe(true);
    expect(response.meta?.requestId).toBeDefined();
    
    const data = response.data;
    expect(data.id).toBeDefined();
    expect(data.title).toBe(payload.title);
    expect(data.workspaceId).toBe(workspaceId);

    createdDocIds.push(data.id);
  });

  it('should read a document via /internal/doc-actions', async () => {
    // Create first
    const createPayload = { title: 'To Be Read', type: 'note', content: {}, status: 'published' };

    const createReq = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.create',
        payload: createPayload,
      }),
    });
    const createRes = await app.fetch(createReq);
    const createResponse: any = await createRes.json();
    const created = createResponse.data;
    createdDocIds.push(created.id);

    // Read
    const readReq = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.read',
        payload: { id: created.id },
      }),
    });

    const readRes = await app.fetch(readReq);
    expect(readRes.status).toBe(200);
    const readResponse: any = await readRes.json();

    // New envelope format
    expect(readResponse.ok).toBe(true);
    expect(readResponse.meta?.requestId).toBeDefined();

    const readData = readResponse.data;
    expect(readData.id).toBe(created.id);
    expect(readData.title).toBe(createPayload.title);
  });

  it('should update a document via /internal/doc-actions', async () => {
    // Create first
    const createPayload = { title: 'To Be Updated', type: 'note', content: { v: 1 }, status: 'draft' };
    const createReq = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.create',
        payload: createPayload,
      }),
    });
    const createRes = await app.fetch(createReq);
    const createResponse: any = await createRes.json();
    const created = createResponse.data;
    createdDocIds.push(created.id);

    // Update
    const updatePayload = { id: created.id, title: 'Updated Title', content: { v: 2 }, status: 'published' };
    const updateReq = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.update',
        payload: updatePayload,
      }),
    });

    const updateRes = await app.fetch(updateReq);
    expect(updateRes.status).toBe(200);
    const updateResponse: any = await updateRes.json();
    expect(updateResponse.ok).toBe(true);

    const updated = updateResponse.data;
    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe(updatePayload.title);
    expect(updated.content).toEqual(updatePayload.content);
    expect(updated.status).toBe(updatePayload.status);
  });

  it('should return 400 for invalid update payload (no fields)', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.update',
        payload: {
          id: uuidv4(),
        },
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    const response: any = await res.json();
    expect(response.ok).toBe(false);
    expect(response.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 when updating document from wrong workspace', async () => {
    // Create in workspace A
    const createPayload = { title: 'Workspace A Doc', type: 'page', content: {} };
    const createReq = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.create',
        payload: createPayload,
      }),
    });
    const createRes = await app.fetch(createReq);
    const createResponse: any = await createRes.json();
    const created = createResponse.data;
    createdDocIds.push(created.id);

    // Update from workspace B
    const otherWorkspaceId = uuidv4();
    const updateReq = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': otherWorkspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.update',
        payload: {
          id: created.id,
          title: 'Should Not Update',
        },
      }),
    });

    const updateRes = await app.fetch(updateReq);
    expect(updateRes.status).toBe(404);
    const response: any = await updateRes.json();
    expect(response.ok).toBe(false);
    expect(response.error.code).toBe('NOT_FOUND');
  });

  it('should list documents by workspace via /internal/doc-actions with pagination', async () => {
    // Create 2 docs with a small gap to ensure createdAt ordering
    const create1Req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.create',
        payload: { title: 'Older Doc', type: 'page', content: {}, status: 'draft' },
      }),
    });
    const create1Res = await app.fetch(create1Req);
    const create1Response: any = await create1Res.json();
    createdDocIds.push(create1Response.data.id);

    await new Promise((r) => setTimeout(r, 25));

    const create2Req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.create',
        payload: { title: 'Newer Doc', type: 'page', content: {}, status: 'published' },
      }),
    });
    const create2Res = await app.fetch(create2Req);
    const create2Response: any = await create2Res.json();
    createdDocIds.push(create2Response.data.id);

    // Create a doc in another workspace to ensure filtering
    const otherWorkspaceId = uuidv4();
    const createOtherReq = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': otherWorkspaceId,
        'X-XS-User-Id': userId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.create',
        payload: { title: 'Other Workspace', type: 'page', content: {} },
      }),
    });
    const createOtherRes = await app.fetch(createOtherReq);
    const createOtherResponse: any = await createOtherRes.json();
    createdDocIds.push(createOtherResponse.data.id);

    // List page 1 (newest)
    const listReq1 = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.listByWorkspace',
        payload: { limit: 1, offset: 0 },
      }),
    });
    const listRes1 = await app.fetch(listReq1);
    expect(listRes1.status).toBe(200);
    const listResponse1: any = await listRes1.json();
    expect(listResponse1.ok).toBe(true);
    const page1 = listResponse1.data;
    expect(Array.isArray(page1)).toBe(true);
    expect(page1.length).toBe(1);
    expect(page1[0].id).toBe(create2Response.data.id);
    expect(page1[0].title).toBe('Newer Doc');
    expect(page1[0].status).toBeDefined();
    expect(page1[0].content).toBeUndefined();

    // List page 2 (older)
    const listReq2 = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.listByWorkspace',
        payload: { limit: 1, offset: 1 },
      }),
    });
    const listRes2 = await app.fetch(listReq2);
    expect(listRes2.status).toBe(200);
    const listResponse2: any = await listRes2.json();
    expect(listResponse2.ok).toBe(true);
    const page2 = listResponse2.data;
    expect(Array.isArray(page2)).toBe(true);
    expect(page2.length).toBe(1);
    expect(page2[0].id).toBe(create1Response.data.id);
    expect(page2[0].content).toBeUndefined();
  });
});
