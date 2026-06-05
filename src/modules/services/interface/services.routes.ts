import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam } from '@shared/application/common-schemas';

import { createServiceSchema, updateServiceSchema } from '../application/services.schemas';
import * as ctrl from './services.controller';

export const servicesRouter = Router();

servicesRouter.get('/', ctrl.list);
servicesRouter.get('/:id', validate(uuidParam, 'params'), ctrl.getById);
servicesRouter.post('/', authenticate, authorize('ADMIN'), validate(createServiceSchema), ctrl.create);
servicesRouter.patch('/:id', authenticate, authorize('ADMIN'), validate(uuidParam, 'params'), validate(updateServiceSchema), ctrl.update);
servicesRouter.patch('/:id/toggle', authenticate, authorize('ADMIN'), validate(uuidParam, 'params'), ctrl.toggle);
