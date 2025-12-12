import { Hono } from 'hono';
import * as readyController from '../controllers/ready.controller';

export const readyRoute = new Hono();

readyRoute.get('/', readyController.getReady);
