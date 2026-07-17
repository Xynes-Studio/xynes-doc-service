import { afterAll, beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import type { Hono } from 'hono';

describe('app — /health + /ready access-log skip (HEALTHCHECK-CONTRACT.md §2.6)', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let app: Hono;

  beforeAll(async () => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    ({ default: app } = await import('../src/app'));
  });

  beforeEach(() => {
    consoleLogSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  function honoLogLinesFor(path: string): unknown[][] {
    return consoleLogSpy.mock.calls.filter((args: unknown[]) => {
      const first = args[0];
      return typeof first === 'string' && first.includes(path);
    });
  }

  test('GET /health does not produce a honoLogger access-log line', async () => {
    await app.request('/health');
    expect(honoLogLinesFor('/health')).toHaveLength(0);
  });

  test('an unmatched request to /ready does not produce a honoLogger access-log line', async () => {
    const res = await app.request('/ready', { method: 'POST' });

    expect(res.status).toBe(404);
    expect(honoLogLinesFor('/ready')).toHaveLength(0);
  });

  test('GET /healthcheck-imposter is not excluded by a prefix match', async () => {
    const res = await app.request('/healthcheck-imposter');
    expect(res.status).toBe(404);
    expect(honoLogLinesFor('/healthcheck-imposter').length).toBeGreaterThan(0);
  });
});
