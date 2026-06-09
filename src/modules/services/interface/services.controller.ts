import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';

import { createServiceSchema, updateServiceSchema, listServicesQuerySchema } from '../application/services.schemas';
import * as svc from '../application/services.service';
import type { ServiceRecord } from '../application/services.service';

function isInternalUser(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes('ADMIN') || roles.includes('SALES');
}

function toUserView(service: ServiceRecord) {
  // Users see the real price (needed for purchase flow).
  // pricingLabel gives the app a pre-formatted string as a convenience.
  return {
    ...service,
    pricingLabel: service.basePrice != null
      ? `₹${service.basePrice.toLocaleString('en-IN')}`
      : 'Contact for pricing',
    purchasable: service.basePrice != null,
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = listServicesQuerySchema.parse(req.query);
  const admin = req.user?.roles.includes('ADMIN') ?? false;
  const result = await svc.listServices(query, admin);
  const data = isInternalUser(req) ? result.data : result.data.map(toUserView);
  res.status(StatusCodes.OK).json(buildResponse(data, result.meta));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const service = await svc.getServiceById(req.params['id']!);
  const data = isInternalUser(req) ? service : toUserView(service);
  res.status(StatusCodes.OK).json(buildResponse(data));
}

export async function create(req: Request, res: Response): Promise<void> {
  const dto = createServiceSchema.parse(req.body);
  const service = await svc.createService(dto, req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse(service));
}

export async function update(req: Request, res: Response): Promise<void> {
  const dto = updateServiceSchema.parse(req.body);
  const service = await svc.updateService(req.params['id']!, dto, req.user!.sub);
  res.status(StatusCodes.OK).json(buildResponse(service));
}

export async function toggle(req: Request, res: Response): Promise<void> {
  const service = await svc.toggleService(req.params['id']!, req.user!.sub);
  res.status(StatusCodes.OK).json(buildResponse(service));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await svc.deleteService(req.params['id']!, req.user!.sub);
  res.status(StatusCodes.NO_CONTENT).send();
}

export async function categories(_req: Request, res: Response): Promise<void> {
  const list = await svc.listCategories();
  res.status(StatusCodes.OK).json(buildResponse(list));
}
