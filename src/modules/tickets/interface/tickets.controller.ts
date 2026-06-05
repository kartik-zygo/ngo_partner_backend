import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';
import { paginationSchema } from '@shared/application/common-schemas';

import * as svc from '../application/tickets.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = paginationSchema.parse(req.query);
  const { status, assignedTo, userId } = req.query as Record<string, string | undefined>;
  const result = await svc.listTickets({ page, limit }, { status, assignedTo, userId });
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
}

export async function getById(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(buildResponse(await svc.getTicket(req.params['id']!)));
}

export async function create(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.CREATED).json(buildResponse(await svc.createTicket(req.body as Parameters<typeof svc.createTicket>[0], req.user!.sub)));
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(buildResponse(await svc.updateTicketStatus(req.params['id']!, req.body as Parameters<typeof svc.updateTicketStatus>[1], req.user!.sub)));
}

export async function assign(req: Request, res: Response): Promise<void> {
  const { assignedTo } = req.body as { assignedTo: string };
  res.status(StatusCodes.OK).json(buildResponse(await svc.assignTicket(req.params['id']!, assignedTo, req.user!.sub)));
}

export async function escalate(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as { reason: string };
  res.status(StatusCodes.OK).json(buildResponse(await svc.escalateTicket(req.params['id']!, reason, req.user!.sub)));
}

export async function addUpdate(req: Request, res: Response): Promise<void> {
  const { message, isInternal } = req.body as { message: string; isInternal?: boolean };
  await svc.addUpdate(req.params['id']!, message, isInternal ?? false, req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse({ message: 'Update added' }));
}
