import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { authenticate, authorize } from '@shared/interface/middleware/auth';
import { buildResponse } from '@shared/application/response';

import { getSalesDashboard, getAdminDashboard, getIntegrationMetrics } from '../application/dashboards.service';
import type { Request, Response } from 'express';

export const dashboardsRouter = Router();

dashboardsRouter.use(authenticate);

dashboardsRouter.get('/sales', authorize('SALES', 'ADMIN'), async (req: Request, res: Response) => {
  const data = await getSalesDashboard(req.user!.sub, req.user!.roles);
  res.status(StatusCodes.OK).json(buildResponse(data));
});

dashboardsRouter.get('/admin', authorize('ADMIN'), async (_req: Request, res: Response) => {
  const data = await getAdminDashboard();
  res.status(StatusCodes.OK).json(buildResponse(data));
});

dashboardsRouter.get('/integration-metrics', authorize('ADMIN'), async (_req: Request, res: Response) => {
  const data = await getIntegrationMetrics();
  res.status(StatusCodes.OK).json(buildResponse(data));
});
