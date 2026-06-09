import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';
import { logger } from '@shared/infrastructure/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '@shared/domain/errors';
import { buildPaginationMeta } from '@shared/application/response';
import { config } from '@shared/config/env';
import * as cashfree from '../infrastructure/cashfree.adapter';
import type { CreateOrderInput, ListOrdersQuery, UpdateFulfillmentInput, FulfillmentStatus } from './orders.schemas';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';

export interface OrderRecord {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  cashfreeOrderId: string | null;
  paymentSessionId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  // Fulfillment fields (admin/sales managed)
  fulfillmentStatus: FulfillmentStatus | null;
  adminNotes: string | null;
  fulfillmentUpdatedBy: string | null;
  fulfillmentUpdatedAt: Date | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  cashfreePaymentId: string | null;
  cashfreeOrderId: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  amount: number;
  currency: string;
  errorCode: string | null;
  errorDescription: string | null;
  webhookReceivedAt: Date | null;
  createdAt: Date;
}

interface RawOrder {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  amount: string;
  currency: string;
  status: OrderStatus;
  cashfree_order_id: string | null;
  payment_session_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  fulfillment_status: FulfillmentStatus | null;
  admin_notes: string | null;
  fulfillment_updated_by: string | null;
  fulfillment_updated_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RawTransaction {
  id: string;
  order_id: string;
  cashfree_payment_id: string | null;
  cashfree_order_id: string | null;
  payment_method: string | null;
  payment_status: string;
  amount: string;
  currency: string;
  error_code: string | null;
  error_description: string | null;
  webhook_received_at: string | null;
  created_at: string;
}

function mapOrder(r: RawOrder): OrderRecord {
  return {
    id: r.id,
    userId: r.user_id,
    serviceId: r.service_id,
    serviceName: r.service_name,
    amount: parseFloat(r.amount),
    currency: r.currency,
    status: r.status,
    cashfreeOrderId: r.cashfree_order_id,
    paymentSessionId: r.payment_session_id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    customerPhone: r.customer_phone,
    notes: r.notes,
    fulfillmentStatus: r.fulfillment_status,
    adminNotes: r.admin_notes,
    fulfillmentUpdatedBy: r.fulfillment_updated_by,
    fulfillmentUpdatedAt: r.fulfillment_updated_at ? new Date(r.fulfillment_updated_at) : null,
    paidAt: r.paid_at ? new Date(r.paid_at) : null,
    expiresAt: r.expires_at ? new Date(r.expires_at) : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

function mapTransaction(r: RawTransaction): PaymentTransactionRecord {
  return {
    id: r.id,
    orderId: r.order_id,
    cashfreePaymentId: r.cashfree_payment_id,
    cashfreeOrderId: r.cashfree_order_id,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    amount: parseFloat(r.amount),
    currency: r.currency,
    errorCode: r.error_code,
    errorDescription: r.error_description,
    webhookReceivedAt: r.webhook_received_at ? new Date(r.webhook_received_at) : null,
    createdAt: new Date(r.created_at),
  };
}

async function getOrderRow(id: string): Promise<RawOrder> {
  const row = await db('service_orders as o')
    .join('services as s', 's.id', 'o.service_id')
    .where('o.id', id)
    .select<RawOrder>('o.*', 's.name as service_name')
    .first();
  if (!row) throw new NotFoundError('Order', id);
  return row;
}

export async function createOrder(
  input: CreateOrderInput,
  userId: string,
): Promise<OrderRecord & { paymentSessionId: string }> {
  const service = await db('services')
    .where({ id: input.serviceId })
    .whereNull('deleted_at')
    .where({ is_active: true })
    .first<{ id: string; name: string; base_price: string | null } | undefined>();

  if (!service) throw new NotFoundError('Service', input.serviceId);
  if (!service.base_price) {
    throw new ValidationError('This service does not have a price configured yet');
  }

  const userRow = await db('users as u')
    .leftJoin('user_profiles as p', 'p.user_id', 'u.id')
    .where('u.id', userId)
    .select<
      | { email: string; first_name: string | null; last_name: string | null; phone: string | null }
      | undefined
    >('u.email', 'p.first_name', 'p.last_name', 'p.phone')
    .first();

  if (!userRow) throw new NotFoundError('User', userId);

  const customerPhone = input.customerPhone ?? userRow.phone ?? null;
  if (!customerPhone) {
    throw new ValidationError(
      'A 10-digit phone number is required to process payment. Provide customerPhone in the request or update your profile.',
    );
  }

  const customerName =
    [userRow.first_name, userRow.last_name].filter(Boolean).join(' ') || userRow.email.split('@')[0]!;

  const orderId = uuidv4();
  const amount = parseFloat(service.base_price);

  await db('service_orders').insert({
    id: orderId,
    user_id: userId,
    service_id: input.serviceId,
    amount,
    currency: 'INR',
    status: 'pending',
    customer_name: customerName,
    customer_email: userRow.email,
    customer_phone: customerPhone,
    notes: input.notes ?? null,
    created_by: userId,
  });

  const notifyUrl = config.CASHFREE_WEBHOOK_NOTIFY_URL ?? `${config.APP_URL}/api/v1/orders/webhook`;
  const returnUrl = `${config.APP_URL}/api/v1/orders/return?order_id={order_id}`;

  let cfResult: Awaited<ReturnType<typeof cashfree.createCashfreeOrder>>;
  try {
    cfResult = await cashfree.createCashfreeOrder({
      orderId,
      amount,
      currency: 'INR',
      customerName,
      customerEmail: userRow.email,
      customerPhone,
      returnUrl,
      notifyUrl,
    });
  } catch (err) {
    await db('service_orders').where({ id: orderId }).delete();
    throw err;
  }

  await db('service_orders').where({ id: orderId }).update({
    cashfree_order_id: cfResult.cfOrderId,
    payment_session_id: cfResult.paymentSessionId,
    expires_at: cfResult.expiresAt ? new Date(cfResult.expiresAt) : null,
    updated_at: new Date(),
  });

  const order = await getOrderRow(orderId);
  return { ...mapOrder(order), paymentSessionId: cfResult.paymentSessionId };
}

export async function listOrders(
  query: ListOrdersQuery,
  callerUserId: string,
  isInternalUser: boolean,
): Promise<{ data: OrderRecord[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const base = db('service_orders as o').join('services as s', 's.id', 'o.service_id');

  // Users only see their own orders; admin/sales see all
  if (!isInternalUser) {
    base.where('o.user_id', callerUserId);
  }

  if (query.status) base.where('o.status', query.status);

  if (query.fulfillmentStatus) {
    if (query.fulfillmentStatus === 'none') {
      base.whereNull('o.fulfillment_status');
    } else {
      base.where('o.fulfillment_status', query.fulfillmentStatus);
    }
  }

  // Admin-only filters — silently ignored for non-internal callers
  if (isInternalUser) {
    if (query.serviceId) base.where('o.service_id', query.serviceId);
    if (query.userId) base.where('o.user_id', query.userId);
    if (query.from) base.where('o.created_at', '>=', new Date(query.from));
    if (query.to) base.where('o.created_at', '<=', new Date(query.to));
    if (query.search) {
      const term = `%${query.search.toLowerCase()}%`;
      base.whereRaw(
        '(LOWER(o.customer_name) LIKE ? OR LOWER(o.customer_email) LIKE ? OR o.customer_phone LIKE ?)',
        [term, term, term],
      );
    }
  }

  const total = await base.clone().count<{ count: string }[]>('o.id as count').first();
  const rows = await base
    .clone()
    .orderBy('o.created_at', 'desc')
    .limit(query.limit)
    .offset((query.page - 1) * query.limit)
    .select<RawOrder[]>('o.*', 's.name as service_name');

  return {
    data: rows.map(mapOrder),
    meta: buildPaginationMeta(parseInt(String(total?.count ?? 0)), query.page, query.limit),
  };
}

export async function getOrderById(
  id: string,
  callerUserId: string,
  isInternalUser = false,
): Promise<OrderRecord & { transactions: PaymentTransactionRecord[] }> {
  const row = await getOrderRow(id);
  if (!isInternalUser && row.user_id !== callerUserId) {
    throw new ForbiddenError('You do not have access to this order');
  }

  const txRows = await db('payment_transactions')
    .where({ order_id: id })
    .orderBy('created_at', 'desc')
    .select<RawTransaction[]>('*');

  return { ...mapOrder(row), transactions: txRows.map(mapTransaction) };
}

// Admin/sales: update fulfillment status and internal notes after payment.
export async function updateFulfillment(
  id: string,
  input: UpdateFulfillmentInput,
  actorId: string,
): Promise<OrderRecord> {
  const row = await getOrderRow(id);

  // Fulfillment only makes sense on paid orders
  if (row.status !== 'paid') {
    throw new ValidationError(
      `Cannot update fulfillment on an order with payment status '${row.status}'. Order must be paid first.`,
    );
  }

  await db('service_orders').where({ id }).update({
    fulfillment_status: input.fulfillmentStatus,
    ...(input.adminNotes !== undefined && { admin_notes: input.adminNotes }),
    fulfillment_updated_by: actorId,
    fulfillment_updated_at: new Date(),
    updated_at: new Date(),
  });

  return mapOrder(await getOrderRow(id));
}

// Webhook handler — called by Cashfree with payment result.
export async function processWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
): Promise<void> {
  const isValid = cashfree.verifyWebhookSignature(signature, rawBody, timestamp);
  if (!isValid) {
    logger.warn('Cashfree webhook signature verification failed');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    logger.warn('Cashfree webhook: invalid JSON body');
    return;
  }

  const eventType: string = payload?.type ?? '';
  const orderData = payload?.data?.order;
  const paymentData = payload?.data?.payment;
  const errorDetails = payload?.data?.error_details;

  if (!orderData?.order_id || !paymentData) {
    logger.warn({ eventType }, 'Cashfree webhook: missing order/payment data');
    return;
  }

  const ourOrderId: string = orderData.order_id;
  const cfPaymentId: string | null = paymentData.cf_payment_id ?? null;
  const paymentStatus: string = paymentData.payment_status ?? 'UNKNOWN';
  const paymentAmount: number = Number(paymentData.payment_amount ?? 0);
  const rawPaymentMethod = paymentData.payment_method ?? null;
  const paymentMethod =
    rawPaymentMethod && typeof rawPaymentMethod === 'object'
      ? Object.keys(rawPaymentMethod)[0] ?? null
      : null;

  if (cfPaymentId) {
    const existing = await db('payment_transactions').where({ cashfree_payment_id: cfPaymentId }).first();
    if (existing) {
      logger.info({ cfPaymentId }, 'Cashfree webhook: duplicate payment transaction, skipping');
      return;
    }
  }

  const order = await db('service_orders')
    .where({ id: ourOrderId })
    .first<{ id: string; status: OrderStatus } | undefined>();
  if (!order) {
    logger.warn({ ourOrderId }, 'Cashfree webhook: order not found');
    return;
  }

  let newOrderStatus: OrderStatus | null = null;
  if (paymentStatus === 'SUCCESS') newOrderStatus = 'paid';
  else if (paymentStatus === 'FAILED') newOrderStatus = 'failed';

  await db.transaction(async (trx) => {
    await trx('payment_transactions').insert({
      id: uuidv4(),
      order_id: ourOrderId,
      cashfree_payment_id: cfPaymentId,
      cashfree_order_id: String(orderData.cf_order_id ?? ''),
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      amount: paymentAmount,
      currency: paymentData.payment_currency ?? 'INR',
      error_code: errorDetails?.error_code ?? null,
      error_description: errorDetails?.error_description ?? null,
      webhook_received_at: new Date(),
      raw_webhook: JSON.stringify(payload),
    });

    if (newOrderStatus && order.status === 'pending') {
      await trx('service_orders').where({ id: ourOrderId }).update({
        status: newOrderStatus,
        // Auto-set fulfillment to 'processing' when payment succeeds
        ...(newOrderStatus === 'paid' && { fulfillment_status: 'processing' }),
        paid_at: paymentStatus === 'SUCCESS' ? new Date() : null,
        updated_at: new Date(),
      });
    }
  });

  logger.info({ ourOrderId, paymentStatus, newOrderStatus }, 'Cashfree webhook processed');
}
