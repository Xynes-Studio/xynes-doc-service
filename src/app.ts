import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error-handler';
import { requestIdMiddleware } from './middleware/request-id';
import { createGetHealth } from './controllers/health.controller';
import { createHealthRoute } from './routes/health.route';
import { readyRoute } from './routes/ready.route';
import { internalRoute } from './routes/internal.route';

const ACCESS_LOG_SKIP_PATHS = new Set(['/health', '/ready']);

export interface CreateAppOptions {
  pingDb?: () => Promise<void>;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();

  app.use('*', requestIdMiddleware());
  app.use('*', (c, next) => {
    if (ACCESS_LOG_SKIP_PATHS.has(c.req.path)) {
      return next();
    }
    return logger()(c, next);
  });

  const getHealth = options.pingDb ? createGetHealth({ pingDb: options.pingDb }) : undefined;
  app.route('/health', createHealthRoute(getHealth));
  app.route('/ready', readyRoute);
  app.route('/internal', internalRoute);

  app.onError(errorHandler);

  return app;
}

export default createApp();
