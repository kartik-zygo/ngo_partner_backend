import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam, paginationSchema } from '@shared/application/common-schemas';

import { createTeamMemberSchema, updateTeamMemberSchema } from '../application/admin-team.schemas';
import * as ctrl from './admin-team.controller';

export const adminTeamRouter = Router();

adminTeamRouter.use(authenticate, authorize('ADMIN'));

adminTeamRouter.get('/', validate(paginationSchema, 'query'), ctrl.list);
adminTeamRouter.get('/:id', validate(uuidParam, 'params'), ctrl.getById);
adminTeamRouter.post('/', validate(createTeamMemberSchema), ctrl.create);
adminTeamRouter.patch('/:id', validate(uuidParam, 'params'), validate(updateTeamMemberSchema), ctrl.update);
adminTeamRouter.patch('/:id/toggle', validate(uuidParam, 'params'), ctrl.toggle);
adminTeamRouter.delete('/:id', validate(uuidParam, 'params'), ctrl.softDelete);
