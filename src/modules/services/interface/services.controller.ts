import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';
import { paginationSchema } from '@shared/application/common-schemas';

import * as svc from '../application/services.service';
import type { ServiceRecord } from '../application/services.service';

const PRICING_LABEL = 'Starting from Rs 500 onwards';

function isInternalUser(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes('ADMIN') || roles.includes('SALES');
}

function toUserView(service: ServiceRecord): Omit<ServiceRecord, 'basePrice'> & { pricingLabel: string } {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { basePrice, ...rest } = service;
  return { ...rest, pricingLabel: PRICING_LABEL };
}

export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = paginationSchema.parse(req.query);
  const activeOnly = req.user?.roles.includes('ADMIN') ? false : true;
  const result = await svc.listServices({ page, limit }, activeOnly);
  const data = isInternalUser(req) ? result.data : result.data.map(toUserView);
  res.status(StatusCodes.OK).json(buildResponse(data, result.meta));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const service = await svc.getServiceById(req.params['id']!);
  const data = isInternalUser(req) ? service : toUserView(service);
  res.status(StatusCodes.OK).json(buildResponse(data));
}

export async function create(req: Request, res: Response): Promise<void> {
  const service = await svc.createService(req.body as Parameters<typeof svc.createService>[0], req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse(service));
}

export async function update(req: Request, res: Response): Promise<void> {
  const service = await svc.updateService(req.params['id']!, req.body as Parameters<typeof svc.updateService>[1], req.user!.sub);
  res.status(StatusCodes.OK).json(buildResponse(service));
}

export async function toggle(req: Request, res: Response): Promise<void> {
  const service = await svc.toggleService(req.params['id']!, req.user!.sub);
  res.status(StatusCodes.OK).json(buildResponse(service));
}
