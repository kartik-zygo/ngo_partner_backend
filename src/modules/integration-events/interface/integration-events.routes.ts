import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { authenticate } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { paginationSchema } from '@shared/application/common-schemas';
import { buildResponse } from '@shared/application/response';

import {
  userActionSchema,
  leadRequestSchema,
  callRequestSchema,
  processUserAction,
  processLeadRequest,
  processCallRequest,
  getUserEvents,
} from '../application/integration-events.service';
import type { Request, Response } from 'express';

export const integrationRouter = Router();

// These endpoints are called by the user app — require USER auth
integrationRouter.use(authenticate);

integrationRouter.post('/user-actions', validate(userActionSchema), async (req: Request, res: Response) => {
  const result = await processUserAction(req.body as Parameters<typeof processUserAction>[0]);
  res.status(StatusCodes.ACCEPTED).json(buildResponse(result));
});

integrationRouter.post('/lead-requests', validate(leadRequestSchema), async (req: Request, res: Response) => {
  const result = await processLeadRequest(req.body as Parameters<typeof processLeadRequest>[0]);
  res.status(StatusCodes.CREATED).json(buildResponse(result));
});

integrationRouter.post('/call-requests', validate(callRequestSchema), async (req: Request, res: Response) => {
  const result = await processCallRequest(req.body as Parameters<typeof processCallRequest>[0]);
  res.status(StatusCodes.CREATED).json(buildResponse(result));
});

integrationRouter.get('/user-events', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const userId = req.query['userId'] as string ?? req.user!.sub;
  const result = await getUserEvents(userId, { page, limit });
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
});
