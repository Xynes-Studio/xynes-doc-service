import { Context } from 'hono';
import { DomainError } from '@xynes/errors';
import { logger } from '../infra/logger';

export const errorHandler = async (err: Error, c: Context) => {
  if (err instanceof DomainError) {
    logger.warn(`DomainError: ${err.message}`, { code: err.code });
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
        },
      },
      (err.statusCode || 400) as any,
    );
  }

  logger.error(`Unhandled Error: ${err.message}`, err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
      },
    },
    500,
  );
};
