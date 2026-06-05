import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam } from '@shared/application/common-schemas';

import {
  createTicketSchema,
  updateTicketStatusSchema,
  assignTicketSchema,
  escalateTicketSchema,
  addTicketUpdateSchema,
} from '../application/tickets.schemas';
import * as ctrl from './tickets.controller';

export const ticketsRouter = Router();

ticketsRouter.use(authenticate);

ticketsRouter.get('/', ctrl.list);
ticketsRouter.get('/:id', validate(uuidParam, 'params'), ctrl.getById);
ticketsRouter.post('/', validate(createTicketSchema), ctrl.create);
ticketsRouter.patch('/:id/status', authorize('SALES', 'ADMIN'), validate(uuidParam, 'params'), validate(updateTicketStatusSchema), ctrl.updateStatus);
ticketsRouter.post('/:id/assign', authorize('ADMIN'), validate(uuidParam, 'params'), validate(assignTicketSchema), ctrl.assign);
ticketsRouter.post('/:id/escalate', authorize('SALES', 'ADMIN'), validate(uuidParam, 'params'), validate(escalateTicketSchema), ctrl.escalate);
ticketsRouter.post('/:id/updates', validate(uuidParam, 'params'), validate(addTicketUpdateSchema), ctrl.addUpdate);
