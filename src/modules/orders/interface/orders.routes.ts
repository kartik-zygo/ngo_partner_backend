import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam } from '@shared/application/common-schemas';

import * as ctrl from './orders.controller';

export const ordersRouter = Router();

// Webhook must be before authenticate so it never requires a Bearer token.
// Raw body capture is handled by express.json verify callback in app.ts.
ordersRouter.post('/webhook', ctrl.cashfreeWebhook);

// Return URL — Cashfree redirects here after payment; no auth needed.
ordersRouter.get('/return', ctrl.paymentReturn);

// Authenticated user routes
ordersRouter.post('/', authenticate, authorize('USER'), ctrl.createOrder);
ordersRouter.get('/', authenticate, ctrl.listOrders);
ordersRouter.get('/:id', authenticate, validate(uuidParam, 'params'), ctrl.getOrder);
