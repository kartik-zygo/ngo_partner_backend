import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { StatusCodes } from 'http-status-codes';

import { config } from '@shared/config/env';
import { AppError } from '@shared/domain/errors';

let client: InstanceType<typeof Cashfree> | null = null;

function getClient(): InstanceType<typeof Cashfree> {
  if (client) return client;
  if (!config.CASHFREE_APP_ID || !config.CASHFREE_SECRET_KEY) {
    throw new AppError(
      'Payment gateway not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in environment.',
      StatusCodes.SERVICE_UNAVAILABLE,
      'PAYMENT_NOT_CONFIGURED',
    );
  }
  const env = config.CASHFREE_ENVIRONMENT === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  client = new Cashfree(env, config.CASHFREE_APP_ID, config.CASHFREE_SECRET_KEY);
  return client;
}

export interface CashfreeOrderParams {
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
}

export interface CashfreeOrderResult {
  cfOrderId: string;
  paymentSessionId: string;
  orderStatus: string;
  expiresAt: string | null;
}

export async function createCashfreeOrder(params: CashfreeOrderParams): Promise<CashfreeOrderResult> {
  const cf = getClient();
  const response = await cf.PGCreateOrder({
    order_id: params.orderId,
    order_amount: params.amount,
    order_currency: params.currency,
    customer_details: {
      customer_id: params.orderId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = response.data as any;
  return {
    cfOrderId: String(data.cf_order_id),
    paymentSessionId: String(data.payment_session_id),
    orderStatus: String(data.order_status ?? 'ACTIVE'),
    expiresAt: data.order_expiry_time ?? null,
  };
}

export async function fetchCashfreeOrder(cfOrderId: string): Promise<{ orderStatus: string; orderAmount: number }> {
  const cf = getClient();
  const response = await cf.PGFetchOrder(cfOrderId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = response.data as any;
  return {
    orderStatus: String(data.order_status),
    orderAmount: Number(data.order_amount),
  };
}

// Returns true if signature is valid, false if invalid or Cashfree is unconfigured.
export function verifyWebhookSignature(signature: string, rawBody: string, timestamp: string): boolean {
  try {
    const cf = getClient();
    cf.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    return true;
  } catch {
    return false;
  }
}
