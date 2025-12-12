import { Context } from 'hono';

import { config } from '../infra/config';

export const getHealth = (c: Context) => {
  return c.json({ status: 'ok', service: config.serviceName });
};
