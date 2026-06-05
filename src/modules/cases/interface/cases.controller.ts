import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';
import { paginationSchema } from '@shared/application/common-schemas';

import * as svc from '../application/cases.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = paginationSchema.parse(req.query);
  const { status } = req.query as Record<string, string | undefined>;
  let { userId } = req.query as Record<string, string | undefined>;
  const roles = req.user!.roles as string[];
  const isRegularUser = roles.includes('USER') && !roles.includes('SALES') && !roles.includes('ADMIN');
  if (isRegularUser) {
    userId = req.user!.sub;
  }
  const result = await svc.listCases({ page, limit }, { status, userId });
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
}

export async function getById(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(buildResponse(await svc.getCase(req.params['id']!)));
}

export async function create(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.CREATED).json(buildResponse(await svc.createCase(req.body as Parameters<typeof svc.createCase>[0], req.user!.sub)));
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.OK).json(buildResponse(await svc.updateCaseStatus(req.params['id']!, req.body as Parameters<typeof svc.updateCaseStatus>[1], req.user!.sub)));
}

export async function createDocRequest(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.CREATED).json(buildResponse(await svc.createDocumentRequest(req.params['id']!, req.body as Parameters<typeof svc.createDocumentRequest>[1], req.user!.sub)));
}

export async function resubmit(req: Request, res: Response): Promise<void> {
  await svc.resubmitDocuments(req.params['id']!, req.body as Parameters<typeof svc.resubmitDocuments>[1], req.user!.sub);
  res.status(StatusCodes.NO_CONTENT).send();
}

export async function uploadDoc(req: Request, res: Response): Promise<void> {
  res.status(StatusCodes.CREATED).json(buildResponse(await svc.uploadDocument(req.params['id']!, req.body as Parameters<typeof svc.uploadDocument>[1], req.user!.sub)));
}
