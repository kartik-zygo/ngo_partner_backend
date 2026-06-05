import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam } from '@shared/application/common-schemas';

import {
  createCaseSchema,
  updateCaseStatusSchema,
  createDocumentRequestSchema,
  resubmitDocumentsSchema,
} from '../application/cases.schemas';
import * as ctrl from './cases.controller';

export const casesRouter = Router();

casesRouter.use(authenticate);

casesRouter.get('/', ctrl.list);
casesRouter.get('/:id', validate(uuidParam, 'params'), ctrl.getById);
casesRouter.post('/', authorize('USER', 'SALES', 'ADMIN'), validate(createCaseSchema), ctrl.create);
casesRouter.patch('/:id/status', authorize('SALES', 'ADMIN'), validate(uuidParam, 'params'), validate(updateCaseStatusSchema), ctrl.updateStatus);
casesRouter.post('/:id/document-requests', authorize('SALES', 'ADMIN'), validate(uuidParam, 'params'), validate(createDocumentRequestSchema), ctrl.createDocRequest);
casesRouter.post('/:id/resubmissions', authorize('USER'), validate(uuidParam, 'params'), validate(resubmitDocumentsSchema), ctrl.resubmit);
casesRouter.post('/:id/documents', validate(uuidParam, 'params'), ctrl.uploadDoc);
