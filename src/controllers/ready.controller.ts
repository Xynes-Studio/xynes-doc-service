import { Context } from 'hono';
import { config } from '../infra/config';
import { checkPostgresReadiness } from '../infra/readiness';

export type ReadyDependencies = {
  getDatabaseUrl?: () => string;
  check?: typeof checkPostgresReadiness;
  schemaName?: string;
};

export function createGetReady({
  getDatabaseUrl = () => config.server.DATABASE_URL,
  check = checkPostgresReadiness,
  schemaName = 'docs',
}: ReadyDependencies = {}) {
  return async (c: Context) => {
    try {
      const databaseUrl = getDatabaseUrl();
      await check({ databaseUrl, schemaName });
      return c.json({ status: 'ready' }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return c.json({ status: 'not_ready', error: message }, 503);
    }
  };
}

export const getReady = createGetReady();
