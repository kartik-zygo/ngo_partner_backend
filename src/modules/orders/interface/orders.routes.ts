import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam } from '@shared/application/common-schemas';

import { updateFulfillmentSchema } from '../application/orders.schemas';
import * as ctrl from './orders.controller';

export const ordersRouter = Router();

// Webhook — no auth, signature-verified internally
ordersRouter.post('/webhook', ctrl.cashfreeWebhook);

// Return URL — Cashfree redirects here after payment
ordersRouter.get('/return', ctrl.paymentReturn);

// USER: create order
ordersRouter.post('/', authenticate, authorize('USER'), ctrl.createOrder);

// ALL authenticated: list & detail (response filtered by role inside controller)
ordersRouter.get('/', authenticate, ctrl.listOrders);
ordersRouter.get('/:id', authenticate, validate(uuidParam, 'params'), ctrl.getOrder);

// ADMIN / SALES: update fulfillment status after payment
ordersRouter.patch(
  '/:id/fulfillment',
  authenticate,
  authorize('ADMIN', 'SALES'),
  validate(uuidParam, 'params'),
  validate(updateFulfillmentSchema),
  ctrl.updateFulfillment,
);
