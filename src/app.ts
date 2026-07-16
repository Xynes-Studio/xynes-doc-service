import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error-handler';
import { requestIdMiddleware } from './middleware/request-id';
import { healthRoute } from './routes/health.route';
import { readyRoute } from './routes/ready.route';
import { internalRoute } from './routes/internal.route';

const app = new Hono();
const ACCESS_LOG_SKIP_PATHS = new Set(['/health', '/ready']);

app.use('*', requestIdMiddleware());
app.use('*', (c, next) => {
  if (ACCESS_LOG_SKIP_PATHS.has(c.req.path)) {
    return next();
  }
  return logger()(c, next);
});

app.route('/health', healthRoute);
app.route('/ready', readyRoute);
app.route('/internal', internalRoute);

app.onError(errorHandler);

export default app;
