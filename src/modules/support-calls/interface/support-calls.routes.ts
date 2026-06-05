import { Router } from 'express';

import { authenticate } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam, paginationSchema } from '@shared/application/common-schemas';
import { buildResponse } from '@shared/application/response';
import { StatusCodes } from 'http-status-codes';

import {
  createCallSchema,
  updateCallStatusSchema,
  getCall,
  listCalls,
  createCall,
  updateCallStatus,
} from '../application/support-calls.service';
import { getAgoraToken } from '../application/agora.service';
import type { Request, Response } from 'express';

export const supportCallsRouter = Router();

supportCallsRouter.use(authenticate);

supportCallsRouter.get('/', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const { userId } = req.query as { userId?: string };
  const result = await listCalls({ page, limit }, userId);
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
});

supportCallsRouter.get('/:id', validate(uuidParam, 'params'), async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json(buildResponse(await getCall(req.params['id']!)));
});

supportCallsRouter.post('/', validate(createCallSchema), async (req: Request, res: Response) => {
  res.status(StatusCodes.CREATED).json(buildResponse(await createCall(req.body as Parameters<typeof createCall>[0], req.user!.sub)));
});

supportCallsRouter.patch('/:id/status', validate(uuidParam, 'params'), validate(updateCallStatusSchema), async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json(buildResponse(await updateCallStatus(req.params['id']!, req.body as Parameters<typeof updateCallStatus>[1], req.user!.sub)));
});

supportCallsRouter.get('/:id/agora-token', validate(uuidParam, 'params'), async (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json(buildResponse(await getAgoraToken(req.params['id']!, req.user!.sub)));
});
