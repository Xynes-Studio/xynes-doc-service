import { createEnv } from '@xynes/config';

import { name } from '../../package.json';

export const config = createEnv({
  server: {
    PORT: process.env.PORT || '3000',
    DATABASE_URL: process.env.DATABASE_URL || 'postgres://localhost:5432/xynes_docs',
    NODE_ENV: process.env.NODE_ENV || 'development',
  },
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  serviceName: name,
});
