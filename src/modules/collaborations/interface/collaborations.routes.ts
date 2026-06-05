import { Router } from 'express';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam, paginationSchema } from '@shared/application/common-schemas';
import { buildResponse } from '@shared/application/response';
import { StatusCodes } from 'http-status-codes';

import {
  createCollabSchema,
  updateCollabStatusSchema,
  convertToLeadSchema,
  listCollabs,
  createCollab,
  updateCollabStatus,
  convertToLead,
} from '../application/collaborations.service';
import type { Request, Response } from 'express';

export const collaborationsRouter = Router();

collaborationsRouter.use(authenticate);

collaborationsRouter.get('/', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const userId = req.user!.roles.includes('ADMIN') || req.user!.roles.includes('SALES') ? (req.query['userId'] as string | undefined) : req.user!.sub;
  const result = await listCollabs({ page, limit }, userId);
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
});

collaborationsRouter.post('/', validate(createCollabSchema), async (req: Request, res: Response) => {
  res.status(StatusCodes.CREATED).json(buildResponse(await createCollab(req.body as Parameters<typeof createCollab>[0], req.user!.sub)));
});

collaborationsRouter.patch('/:id/status', authorize('SALES', 'ADMIN'), validate(uuidParam, 'params'), validate(updateCollabStatusSchema), async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json(buildResponse(await updateCollabStatus(req.params['id']!, req.body as Parameters<typeof updateCollabStatus>[1], req.user!.sub)));
});

collaborationsRouter.post('/:id/convert-to-lead', authorize('SALES', 'ADMIN'), validate(uuidParam, 'params'), validate(convertToLeadSchema), async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json(buildResponse(await convertToLead(req.params['id']!, req.body as Parameters<typeof convertToLead>[1], req.user!.sub)));
});
