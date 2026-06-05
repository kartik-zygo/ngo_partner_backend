import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { validate } from '@shared/interface/middleware/validate';
import { paginationSchema } from '@shared/application/common-schemas';
import { buildResponse } from '@shared/application/response';

import {
  revenueQuerySchema,
  exportRequestSchema,
  listRevenue,
  requestExport,
  getExportHistory,
} from '../application/revenue-reports.service';
import type { Request, Response } from 'express';

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.use(authorize('SALES', 'ADMIN'));

reportsRouter.get('/revenue', validate(revenueQuerySchema, 'query'), async (req: Request, res: Response) => {
  const query = revenueQuerySchema.parse(req.query);
  const result = await listRevenue(query);
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
});

reportsRouter.post('/export', validate(exportRequestSchema), async (req: Request, res: Response) => {
  const result = await requestExport(req.body as Parameters<typeof requestExport>[0], req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse(result));
});

reportsRouter.get('/export-history', async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const isAdmin = req.user!.roles.includes('ADMIN');
  const result = await getExportHistory(req.user!.sub, { page, limit }, isAdmin);
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
});
