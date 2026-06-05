import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';

import { AdminTeamService } from '../application/admin-team.service';

const service = new AdminTeamService();

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await service.list(Number(page), Number(limit));
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const member = await service.getById(req.params.id);
  res.status(StatusCodes.OK).json(buildResponse(member));
}

export async function create(req: Request, res: Response): Promise<void> {
  const member = await service.create(req.body as Parameters<AdminTeamService['create']>[0]);
  res.status(StatusCodes.CREATED).json(buildResponse(member));
}

export async function update(req: Request, res: Response): Promise<void> {
  const member = await service.update(
    req.params.id,
    req.body as Parameters<AdminTeamService['update']>[1],
  );
  res.status(StatusCodes.OK).json(buildResponse(member));
}

export async function toggle(req: Request, res: Response): Promise<void> {
  const member = await service.toggle(req.params.id);
  res.status(StatusCodes.OK).json(buildResponse(member));
}

export async function softDelete(req: Request, res: Response): Promise<void> {
  await service.softDelete(req.params.id);
  res.status(StatusCodes.NO_CONTENT).send();
}
