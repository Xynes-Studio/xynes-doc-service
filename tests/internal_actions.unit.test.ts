import { describe, it, expect } from 'bun:test';
import app from '../src/app';

import { INTERNAL_SERVICE_TOKEN } from './support/internal-auth';

describe('Internal Doc Actions Endpoint (Unit)', () => {
  it('returns 401 for missing X-Internal-Service-Token', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Workspace-Id': '550e8400-e29b-41d4-a716-446655440000' },
      body: JSON.stringify({ actionKey: 'docs.document.create', payload: {} }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(401);

    const body: any = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for mismatched X-Internal-Service-Token', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Token': 'wrong-token',
        'X-Workspace-Id': '550e8400-e29b-41d4-a716-446655440000',
      },
      body: JSON.stringify({ actionKey: 'docs.document.create', payload: {} }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(403);

    const body: any = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for missing X-Workspace-Id', async () => {
    const req = new Request('http://localhost/internal/doc-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN },
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
        'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
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
        'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
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
        'X-Internal-Service-Token': INTERNAL_SERVICE_TOKEN,
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
