import app from './app';
import { config } from './infra/config';
import { logger } from './infra/logger';

import { registerDocActions } from './actions/register';

const port = parseInt(config.server.PORT, 10);

// Register actions
registerDocActions();

logger.info(`Server is starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
