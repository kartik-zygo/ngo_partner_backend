import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';

import * as svc from '../application/leads.service';
import { listLeadsQuerySchema } from '../application/leads.schemas';

export async function list(req: Request, res: Response): Promise<void> {
  const query = listLeadsQuerySchema.parse(req.query);
  const roles = req.user!.roles as string[];
  const isRegularUser = roles.includes('USER') && !roles.includes('SALES') && !roles.includes('ADMIN');
  if (isRegularUser) {
    query.userId = req.user!.sub;
  }
  const result = await svc.listLeads(query);
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));  
}

export async function getById(req: Request, res: Response): Promise<void> {
  const lead = await svc.getLead(req.params['id']!);
  res.status(StatusCodes.OK).json(buildResponse(lead));
}

export async function create(req: Request, res: Response): Promise<void> {
  const lead = await svc.createLead(req.body as Parameters<typeof svc.createLead>[0], req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse(lead));
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const lead = await svc.updateLeadStatus(req.params['id']!, req.body as Parameters<typeof svc.updateLeadStatus>[1], req.user!.sub);
  res.status(StatusCodes.OK).json(buildResponse(lead));
}

export async function addNote(req: Request, res: Response): Promise<void> {
  const { content } = req.body as { content: string };
  await svc.addNote(req.params['id']!, content, req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse({ message: 'Note added' }));
}

export async function assign(req: Request, res: Response): Promise<void> {
  const lead = await svc.assignLead(req.params['id']!, req.body as Parameters<typeof svc.assignLead>[1], req.user!.sub);
  res.status(StatusCodes.OK).json(buildResponse(lead));
}

export async function softDelete(req: Request, res: Response): Promise<void> {
  await svc.softDeleteLead(req.params['id']!, req.user!.sub);
  res.status(StatusCodes.NO_CONTENT).send();
}
