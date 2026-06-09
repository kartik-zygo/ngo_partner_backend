import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';
import { logger } from '@shared/infrastructure/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '@shared/domain/errors';
import { buildPaginationMeta } from '@shared/application/response';
import { config } from '@shared/config/env';
import * as cashfree from '../infrastructure/cashfree.adapter';
import type { CreateOrderInput, ListOrdersQuery } from './orders.schemas';

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
  // Fetch service
  const service = await db('services')
    .where({ id: input.serviceId })
    .whereNull('deleted_at')
    .where({ is_active: true })
    .first<{ id: string; name: string; base_price: string | null } | undefined>();

  if (!service) throw new NotFoundError('Service', input.serviceId);
  if (!service.base_price) {
    throw new ValidationError('This service does not have a price configured yet');
  }

  // Fetch user profile for customer details
  const userRow = await db('users as u')
    .leftJoin('user_profiles as p', 'p.user_id', 'u.id')
    .where('u.id', userId)
    .select<
      | {
          email: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
        }
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

  // Persist order as pending first
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

  // Create order on Cashfree
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
    // Roll back the DB record so the user can retry
    await db('service_orders').where({ id: orderId }).delete();
    throw err;
  }

  // Update order with Cashfree IDs
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
  userId: string,
  query: ListOrdersQuery,
): Promise<{ data: OrderRecord[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const base = db('service_orders as o')
    .join('services as s', 's.id', 'o.service_id')
    .where('o.user_id', userId);

  if (query.status) base.where('o.status', query.status);

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

export async function getOrderById(id: string, userId: string, isAdmin = false): Promise<OrderRecord & { transactions: PaymentTransactionRecord[] }> {
  const row = await getOrderRow(id);
  if (!isAdmin && row.user_id !== userId) throw new ForbiddenError('You do not have access to this order');

  const txRows = await db('payment_transactions')
    .where({ order_id: id })
    .orderBy('created_at', 'desc')
    .select<RawTransaction[]>('*');

  return { ...mapOrder(row), transactions: txRows.map(mapTransaction) };
}

// Called by the Cashfree webhook handler.
// rawBody must be the exact bytes received (before JSON parse).
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

  // Idempotency: skip if this payment transaction was already recorded
  if (cfPaymentId) {
    const existing = await db('payment_transactions').where({ cashfree_payment_id: cfPaymentId }).first();
    if (existing) {
      logger.info({ cfPaymentId }, 'Cashfree webhook: duplicate payment transaction, skipping');
      return;
    }
  }

  // Find our order
  const order = await db('service_orders').where({ id: ourOrderId }).first<{ id: string; status: OrderStatus } | undefined>();
  if (!order) {
    logger.warn({ ourOrderId }, 'Cashfree webhook: order not found');
    return;
  }

  // Map Cashfree payment status to our order status
  let newOrderStatus: OrderStatus | null = null;
  if (paymentStatus === 'SUCCESS') {
    newOrderStatus = 'paid';
  } else if (paymentStatus === 'FAILED') {
    newOrderStatus = 'failed';
  }
  // USER_DROPPED or PENDING: leave order as pending (user can retry)

  await db.transaction(async (trx) => {
    // Insert payment transaction record
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

    // Update order status if it should transition
    if (newOrderStatus && order.status === 'pending') {
      await trx('service_orders').where({ id: ourOrderId }).update({
        status: newOrderStatus,
        paid_at: paymentStatus === 'SUCCESS' ? new Date() : null,
        updated_at: new Date(),
      });
    }
  });

  logger.info({ ourOrderId, paymentStatus, newOrderStatus }, 'Cashfree webhook processed');
}
