import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam } from '@shared/application/common-schemas';

import {
  createLeadSchema,
  updateLeadStatusSchema,
  addLeadNoteSchema,
  assignLeadSchema,
  listLeadsQuerySchema,
} from '../application/leads.schemas';
import * as ctrl from './leads.controller';

export const leadsRouter = Router();

leadsRouter.use(authenticate);

leadsRouter.get('/', validate(listLeadsQuerySchema, 'query'), ctrl.list);
leadsRouter.get('/:id', validate(uuidParam, 'params'), ctrl.getById);
leadsRouter.post('/', authorize('SALES', 'ADMIN'), validate(createLeadSchema), ctrl.create);
leadsRouter.patch('/:id/status', authorize('SALES', 'ADMIN'), validate(uuidParam, 'params'), validate(updateLeadStatusSchema), ctrl.updateStatus);
leadsRouter.post('/:id/notes', authorize('SALES', 'ADMIN'), validate(uuidParam, 'params'), validate(addLeadNoteSchema), ctrl.addNote);
leadsRouter.post('/:id/assign', authorize('ADMIN'), validate(uuidParam, 'params'), validate(assignLeadSchema), ctrl.assign);
leadsRouter.post('/:id/reassign', authorize('ADMIN'), validate(uuidParam, 'params'), validate(assignLeadSchema), ctrl.assign);
leadsRouter.delete('/:id', authorize('ADMIN'), validate(uuidParam, 'params'), ctrl.softDelete);
