import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { buildResponse } from '@shared/application/response';

import { createOrderSchema, listOrdersQuerySchema } from '../application/orders.schemas';
import * as svc from '../application/orders.service';

export async function createOrder(req: Request, res: Response): Promise<void> {
  const input = createOrderSchema.parse(req.body);
  const order = await svc.createOrder(input, req.user!.sub);
  res.status(StatusCodes.CREATED).json(buildResponse(order));
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const query = listOrdersQuerySchema.parse(req.query);
  const result = await svc.listOrders(req.user!.sub, query);
  res.status(StatusCodes.OK).json(buildResponse(result.data, result.meta));
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const isAdmin = req.user!.roles.includes('ADMIN');
  const order = await svc.getOrderById(req.params['id']!, req.user!.sub, isAdmin);
  res.status(StatusCodes.OK).json(buildResponse(order));
}

// Cashfree webhook — no authentication, uses signature verification internally.
// express.json() must have the verify callback set so req.rawBody is available.
export async function cashfreeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  const timestamp = req.headers['x-webhook-timestamp'] as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody: string | undefined = (req as any).rawBody;

  if (!signature || !timestamp || !rawBody) {
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: 'Missing webhook headers or body' });
    return;
  }

  // Respond 200 immediately to prevent Cashfree retries, then process
  res.status(StatusCodes.OK).json({ received: true });
  await svc.processWebhook(rawBody, signature, timestamp);
}

// Cashfree return URL — user's browser lands here after payment completes in WebView.
// Returns JSON so the Flutter WebView JS bridge can detect the redirect.
export async function paymentReturn(req: Request, res: Response): Promise<void> {
  const orderId = req.query['order_id'] as string | undefined;
  res.status(StatusCodes.OK).json({
    success: true,
    data: { message: 'Payment flow complete. Check your order status.', orderId: orderId ?? null },
  });
}
