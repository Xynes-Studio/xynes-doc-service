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
  test('GET /health returns the DB-backed health contract', async () => {
    const res = await app.request('/health');
    expect([200, 503]).toContain(res.status);
    const body = (await res.json()) as {
      ok: boolean;
      service: string;
      version: string;
      uptime_seconds: number;
      checks: { db: 'ok' | 'fail' | 'skipped' };
    };
    expect(body.service).toBe('xynes-doc-service');
    expect(typeof body.ok).toBe('boolean');
    expect(body.ok).toBe(res.status === 200);
    expect(typeof body.version).toBe('string');
    expect(Number.isInteger(body.uptime_seconds)).toBe(true);
    expect(Object.keys(body.checks)).toEqual(['db']);
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
