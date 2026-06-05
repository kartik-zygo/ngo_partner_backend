import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { paginationSchema } from '@shared/application/common-schemas';
import { buildResponse } from '@shared/application/response';

import { listAuditLogs } from '../application/audit.service';
import type { Request, Response } from 'express';

export const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.use(authorize('ADMIN'));

auditRouter.get('/logs', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const { entityType, entityId, actorId } = req.query as Record<string, string | undefined>;
  const result = await listAuditLogs({ page, limit }, { entityType, entityId, actorId });
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
});
