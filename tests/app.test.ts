import { describe, expect, test } from 'bun:test';
import app from '../src/app';
import { config } from '../src/infra/config';
import { DomainError } from '@xynes/errors';
import { Hono } from 'hono';

describe('Infrastructure Config', () => {
  test('Config loads with defaults', () => {
    expect(config.server.PORT).toBeDefined();
    expect(config.server.DATABASE_URL).toBeDefined();
  });
});

describe('Hono App Integration', () => {
  test('GET /health returns 200 OK', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });

  test('Error Handler catches DomainError', async () => {
    const errorApp = new Hono();
    const { errorHandler } = await import('../src/middleware/error-handler');
    errorApp.onError(errorHandler);
    errorApp.get('/fail', () => {
      throw new DomainError('Test Message', 'TEST_CODE', 400);
    });

    const res = await errorApp.request('/fail');
    expect(res.status).toBe(400);
    const body: any = await res.json();
    // New envelope format
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('TEST_CODE');
    expect(body.error.message).toBe('Test Message');
    expect(body.meta.requestId).toBeDefined();
  });

  test('Error Handler catches generic unhandled Error', async () => {
    const errorApp = new Hono();
    const { errorHandler } = await import('../src/middleware/error-handler');
    errorApp.onError(errorHandler);
    errorApp.get('/crash', () => {
      throw new Error('Unexpected crash');
    });

    const res = await errorApp.request('/crash');
    expect(res.status).toBe(500);
    const body: any = await res.json();
    // New envelope format
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Internal server error');
    expect(body.meta.requestId).toBeDefined();
  });
});
