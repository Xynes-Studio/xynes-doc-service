import app from './app';
import { config } from './infra/config';
import { logger } from './infra/logger';

const port = parseInt(config.server.PORT, 10);

logger.info(`Server is starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
