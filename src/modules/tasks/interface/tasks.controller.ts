import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';
import { paginationSchema } from '@shared/application/common-schemas';

import * as svc from '../application/tasks.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = paginationSchema.parse(req.query);
  const result = await svc.listTasks({ page, limit }, req.user!.sub, req.user!.roles);
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
}

export async function create(req: Request, res: Response): Promise<void> {
  const task = await svc.createTask(req.body as Parameters<typeof svc.createTask>[0], req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse(task));
}

export async function complete(req: Request, res: Response): Promise<void> {
  const task = await svc.completeTask(req.params['id']!, req.user!.sub);
  res.status(StatusCodes.OK).json(buildResponse(task));
}

export async function reschedule(req: Request, res: Response): Promise<void> {
  const task = await svc.rescheduleTask(req.params['id']!, req.body as Parameters<typeof svc.rescheduleTask>[1]);
  res.status(StatusCodes.OK).json(buildResponse(task));
}
