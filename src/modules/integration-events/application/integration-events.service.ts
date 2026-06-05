import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { db } from '@shared/infrastructure/database';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';

export const userActionSchema = z.object({
  userId: z.string().uuid(),
  actionType: z.string().min(1).max(100),
  serviceId: z.string().uuid().optional(),
  payload: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().max(255).optional(),
});

export const leadRequestSchema = z.object({
  userId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
  idempotencyKey: z.string().max(255).optional(),
});

export const callRequestSchema = z.object({
  userId: z.string().uuid(),
  callType: z.enum(['voice', 'video']),
  targetTeam: z.enum(['support', 'sales']).default('support'),
  ticketId: z.string().uuid().optional(),
});

async function queueEvent(eventName: string, sourceUserId: string | null, payload: unknown): Promise<void> {
  await db('integration_events_inbox').insert({
    id: uuidv4(), event_name: eventName, source_user_id: sourceUserId,
    payload: JSON.stringify(payload), status: 'pending',
  });
}

export async function processUserAction(data: z.infer<typeof userActionSchema>) {
  await queueEvent('userActionReceived', data.userId, data);
  // If actionType signals service inquiry -> upsert lead
  if (['serviceInquiry', 'purchaseIntent'].includes(data.actionType) && data.serviceId) {
    const leadId = uuidv4();
    await db('leads').insert({
      id: leadId, user_id: data.userId, service_id: data.serviceId,
      source: 'userApp', status: 'newLead',
      notes: JSON.stringify(data.payload), created_by: data.userId, updated_by: data.userId,
    });
    await queueEvent('leadCreatedFromUserAction', data.userId, { leadId, ...data });
    return { event: 'leadCreated', leadId };
  }
  return { event: 'userActionQueued' };
}

export async function processLeadRequest(data: z.infer<typeof leadRequestSchema>) {
  const leadId = uuidv4();
  await db('leads').insert({
    id: leadId, user_id: data.userId, service_id: data.serviceId ?? null,
    source: 'userApp', status: 'newLead',
    contact_name: data.contactName ?? null, contact_email: data.contactEmail ?? null,
    contact_phone: data.contactPhone ?? null, notes: data.notes ?? null,
    created_by: data.userId, updated_by: data.userId,
  });
  await queueEvent('leadCreatedFromUserAction', data.userId, { leadId });
  return { leadId };
}

export async function processCallRequest(data: z.infer<typeof callRequestSchema>) {
  const callId = uuidv4();
  await db('support_calls').insert({
    id: callId, user_id: data.userId, ticket_id: data.ticketId ?? null,
    call_type: data.callType, status: 'ringing', target_team: data.targetTeam,
  });
  return { callId };
}

export async function getUserEvents(userId: string, pagination: PaginationQuery) {
  const q = db('integration_events_inbox').where({ source_user_id: userId });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc')
    .limit(pagination.limit).offset((pagination.page - 1) * pagination.limit).select('*');
  return { data: rows, meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}
