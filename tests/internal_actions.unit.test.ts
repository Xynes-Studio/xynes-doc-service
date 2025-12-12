import { describe, it, expect } from 'bun:test';
import app from '../src/app';

describe('Internal Doc Actions Endpoint (Unit)', () => {
  it('returns 400 for missing X-Workspace-Id', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionKey: 'docs.document.create', payload: {} }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const body: any = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('MISSING_HEADER');
    expect(body.meta?.requestId).toBeDefined();
  });

  it('returns 400 for invalid request body', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': '550e8400-e29b-41d4-a716-446655440000',
      },
      body: JSON.stringify({ notActionKey: true }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const body: any = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Invalid request body');
    expect(body.meta?.requestId).toBeDefined();
  });

  it('returns 400 for unknown actionKey', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': '550e8400-e29b-41d4-a716-446655440000',
      },
      body: JSON.stringify({ actionKey: 'docs.unknown.action', payload: {} }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const body: any = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('UNKNOWN_ACTION');
    expect(body.meta?.requestId).toBeDefined();
  });

  it('returns 400 for payload validation error', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': '550e8400-e29b-41d4-a716-446655440000',
      },
      body: JSON.stringify({
        actionKey: 'docs.document.read',
        payload: { id: 'not-a-uuid' },
      }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const body: any = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Payload validation failed');
    expect(body.error.details?.issues).toBeDefined();
    expect(body.meta?.requestId).toBeDefined();
  });
});

