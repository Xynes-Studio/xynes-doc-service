import { describe, expect, test } from 'bun:test';
import app from '../src/app';

describe('Ready Endpoint (Integration)', () => {
  test('GET /ready returns 200 when DB is reachable', async () => {
    const res = await app.request('/ready');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ready' });
  });
});
