import { describe, it, expect } from 'bun:test';
import { checkPostgresReadiness } from '../src/infra/readiness';

function createFakePostgres({
  schemaQueryResult = [{ ok: 1 }],
  selectQueryResult = [{ ok: 1 }],
}: {
  schemaQueryResult?: unknown[];
  selectQueryResult?: unknown[];
} = {}) {
  const calls: Array<'schema' | 'select'> = [];
  let endCalled = false;

  const fakePostgres: any = (_databaseUrl: string, _options: any) => {
    const sql: any = async (strings: TemplateStringsArray, ..._values: unknown[]) => {
      const text = strings.join('');
      if (text.includes('pg_namespace')) {
        calls.push('schema');
        return schemaQueryResult;
      }
      calls.push('select');
      return selectQueryResult;
    };

    sql.end = async () => {
      endCalled = true;
    };

    return sql;
  };

  return {
    fakePostgres,
    calls,
    get endCalled() {
      return endCalled;
    },
  };
}

describe('Postgres readiness (unit)', () => {
  it('throws when schema does not exist', async () => {
    const fake = createFakePostgres({ schemaQueryResult: [] });

    try {
      await checkPostgresReadiness({
        databaseUrl: 'postgres://unused',
        schemaName: 'docs',
        clientFactory: fake.fakePostgres,
      });
      throw new Error('Expected checkPostgresReadiness to throw');
    } catch (err: any) {
      expect(String(err?.message ?? err)).toContain("Schema 'docs' does not exist");
    }

    expect(fake.calls).toEqual(['schema']);
    expect(fake.endCalled).toBe(true);
  });

  it('does not throw when schema exists', async () => {
    const fake = createFakePostgres({ schemaQueryResult: [{ ok: 1 }] });

    await checkPostgresReadiness({
      databaseUrl: 'postgres://unused',
      schemaName: 'docs',
      clientFactory: fake.fakePostgres,
    });

    expect(fake.calls).toEqual(['schema']);
    expect(fake.endCalled).toBe(true);
  });

  it('runs a simple SELECT 1 when no schemaName is provided', async () => {
    const fake = createFakePostgres({ selectQueryResult: [{ ok: 1 }] });

    await checkPostgresReadiness({
      databaseUrl: 'postgres://unused',
      clientFactory: fake.fakePostgres,
    });

    expect(fake.calls).toEqual(['select']);
    expect(fake.endCalled).toBe(true);
  });
});

