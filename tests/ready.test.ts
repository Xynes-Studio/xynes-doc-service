import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { createGetReady } from '../src/controllers/ready.controller';

describe('Ready Endpoint', () => {
  const checkMock = mock();

  beforeEach(() => {
    checkMock.mockReset();
  });

  test('returns 200 when check succeeds', async () => {
    checkMock.mockResolvedValueOnce(undefined);

    const app = new Hono();
    app.get('/ready', createGetReady({ getDatabaseUrl: () => 'postgres://unused', check: checkMock }));

    const res = await app.request('/ready');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ready' });
    expect(checkMock).toHaveBeenCalledTimes(1);
  });

  test('returns 503 when check fails', async () => {
    checkMock.mockRejectedValueOnce(new Error('db down'));

    const app = new Hono();
    app.get('/ready', createGetReady({ getDatabaseUrl: () => 'postgres://unused', check: checkMock }));

    const res = await app.request('/ready');
    expect(res.status).toBe(503);
    const body = await res.json() as any;
    expect(body.status).toBe('not_ready');
    expect(body.error).toContain('db down');
  });
});
