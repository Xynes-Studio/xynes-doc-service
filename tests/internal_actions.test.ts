import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../src/app';
import { registerDocActions } from '../src/actions/register';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../src/infra/db';
import { documents } from '../src/infra/db/schema';
import { eq } from 'drizzle-orm';

describe('Internal Doc Actions Endpoint', () => {
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

  it('should return 400 for missing X-Workspace-Id', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actionKey: 'docs.document.create',
        payload: {},
      }),
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    const response: any = await res.json();
    
    // New envelope format
    expect(response.ok).toBe(false);
    expect(response.error.code).toBe('MISSING_HEADER');
    expect(response.meta?.requestId).toBeDefined();
  });

  it('should return 400 for unknown actionKey', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
      },
      body: JSON.stringify({
        actionKey: 'docs.unknown.action',
        payload: {},
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    const response: any = await res.json();
    
    // New envelope format
    expect(response.ok).toBe(false);
    expect(response.error.code).toBe('UNKNOWN_ACTION');
    expect(response.meta?.requestId).toBeDefined();
  });

  it('should return 400 for payload validation error', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': workspaceId,
      },
      body: JSON.stringify({
        actionKey: 'docs.document.read',
        payload: {
          id: 'not-a-uuid',
        },
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);
    const response: any = await res.json();
    
    // New envelope format with field-level details
    expect(response.ok).toBe(false);
    expect(response.error.code).toBe('VALIDATION_ERROR');
    expect(response.error.message).toBe('Payload validation failed');
    expect(response.error.details?.issues).toBeDefined();
    expect(response.error.details.issues.length).toBeGreaterThan(0);
    expect(response.meta?.requestId).toBeDefined();
  });
});
