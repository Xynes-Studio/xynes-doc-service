import { Hono } from 'hono';
import * as healthController from '../controllers/health.controller';

export function createHealthRoute(
  getHealth: ReturnType<typeof healthController.createGetHealth> = healthController.getHealth,
) {
  const healthRoute = new Hono();
  healthRoute.get('/', getHealth);
  return healthRoute;
}

export const healthRoute = createHealthRoute();
