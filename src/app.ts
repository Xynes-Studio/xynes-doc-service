import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error-handler';
import { healthRoute } from './routes/health.route';
import { internalRoute } from './routes/internal.route';

const app = new Hono();

app.use('*', logger());

app.route('/health', healthRoute);
app.route('/internal', internalRoute);

app.onError(errorHandler);

export default app;
