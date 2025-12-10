import { Hono } from 'hono';
import * as healthController from '../controllers/health.controller';

export const healthRoute = new Hono();

healthRoute.get('/', healthController.getHealth);
