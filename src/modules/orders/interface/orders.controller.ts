import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';

import { createOrderSchema, listOrdersQuerySchema, updateFulfillmentSchema } from '../application/orders.schemas';
import * as svc from '../application/orders.service';

function isInternal(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes('ADMIN') || roles.includes('SALES');
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const input = createOrderSchema.parse(req.body);
  const order = await svc.createOrder(input, req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse(order));
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const query = listOrdersQuerySchema.parse(req.query);
  const result = await svc.listOrders(query, req.user!.sub, isInternal(req));

  // Strip adminNotes from response for non-internal callers
  const data = isInternal(req)
    ? result.data
    : result.data.map(({ adminNotes: _a, fulfillmentUpdatedBy: _b, fulfillmentUpdatedAt: _c, ...rest }) => rest);

  res.status(StatusCodes.OK).json(buildResponse(data, result.meta));
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const order = await svc.getOrderById(req.params['id']!, req.user!.sub, isInternal(req));

  // Strip internal-only fields for regular users
  if (!isInternal(req)) {
    const { adminNotes: _a, fulfillmentUpdatedBy: _b, fulfillmentUpdatedAt: _c, ...safeOrder } = order;
    res.status(StatusCodes.OK).json(buildResponse(safeOrder));
    return;
  }

  res.status(StatusCodes.OK).json(buildResponse(order));
}

export async function updateFulfillment(req: Request, res: Response): Promise<void> {
  const input = updateFulfillmentSchema.parse(req.body);
  const order = await svc.updateFulfillment(req.params['id']!, input, req.user!.sub);
  res.status(StatusCodes.OK).json(buildResponse(order));
}

export async function cashfreeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  const timestamp = req.headers['x-webhook-timestamp'] as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody: string | undefined = (req as any).rawBody;

  if (!signature || !timestamp || !rawBody) {
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: 'Missing webhook headers or body' });
    return;
  }

  res.status(StatusCodes.OK).json({ received: true });
  await svc.processWebhook(rawBody, signature, timestamp);
}

export async function paymentReturn(_req: Request, res: Response): Promise<void> {
  const orderId = _req.query['order_id'] as string | undefined;
  res.status(StatusCodes.OK).json({
    success: true,
    data: { message: 'Payment flow complete. Check your order status.', orderId: orderId ?? null },
  });
}
