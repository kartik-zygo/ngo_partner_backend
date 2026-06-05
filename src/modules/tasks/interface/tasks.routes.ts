import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam } from '@shared/application/common-schemas';

import { createTaskSchema, rescheduleTaskSchema } from '../application/tasks.schemas';
import * as ctrl from './tasks.controller';

export const tasksRouter = Router();

tasksRouter.use(authenticate);
tasksRouter.use(authorize('SALES', 'ADMIN'));

tasksRouter.get('/', ctrl.list);
tasksRouter.post('/', validate(createTaskSchema), ctrl.create);
tasksRouter.patch('/:id/complete', validate(uuidParam, 'params'), ctrl.complete);
tasksRouter.patch('/:id/reschedule', validate(uuidParam, 'params'), validate(rescheduleTaskSchema), ctrl.reschedule);
