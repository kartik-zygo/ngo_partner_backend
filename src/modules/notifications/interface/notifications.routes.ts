import { Router } from 'express';

import { authenticate } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { uuidParam, paginationSchema } from '@shared/application/common-schemas';
import { buildResponse } from '@shared/application/response';
import { StatusCodes } from 'http-status-codes';

import { listNotifications, markRead, markAllRead } from '../application/notifications.service';
import type { Request, Response } from 'express';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const result = await listNotifications(req.user!.sub, { page, limit });
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
});

notificationsRouter.patch('/:id/read', validate(uuidParam, 'params'), async (req: Request, res: Response) => {
  await markRead(req.params['id']!, req.user!.sub);
  res.status(StatusCodes.NO_CONTENT).send();
});

notificationsRouter.patch('/read-all', async (req: Request, res: Response) => {
  await markAllRead(req.user!.sub);
  res.status(StatusCodes.NO_CONTENT).send();
});
