import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { db } from '@shared/infrastructure/database';
import { NotFoundError } from '@shared/domain/errors';
import { assertCallTransition } from '@shared/domain/transitions';
import { buildPaginationMeta } from '@shared/application/response';
import { emitToSalesTeam, emitToCall, emitToUser } from '@shared/infrastructure/socket';
import { config } from '@shared/config/env';
import type { PaginationQuery } from '@shared/application/common-schemas';
import type { CallStatus } from '@shared/domain/constants';

export const createCallSchema = z.object({
  callType: z.enum(['voice', 'video']),
  targetTeam: z.enum(['support', 'sales']).default('support'),
  ticketId: z.string().uuid().optional(),
});

export const updateCallStatusSchema = z.object({
  status: z.enum(['ringing', 'accepted', 'rejected', 'ended']),
});

interface RawCall {
  id: string; user_id: string; ticket_id: string | null; call_type: string;
  status: string; target_team: string; accepted_by: string | null;
  accepted_at: string | null; ended_at: string | null; duration_seconds: number | null;
  created_at: string; updated_at: string;
}

function mapCall(r: RawCall) {
  return {
    id: r.id, userId: r.user_id, ticketId: r.ticket_id, callType: r.call_type,
    status: r.status, targetTeam: r.target_team, acceptedBy: r.accepted_by,
    acceptedAt: r.accepted_at ? new Date(r.accepted_at) : null,
    endedAt: r.ended_at ? new Date(r.ended_at) : null,
    durationSeconds: r.duration_seconds,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export async function getCall(id: string) {
  const row = await db('support_calls').where({ id }).first<RawCall | undefined>();
  if (!row) throw new NotFoundError('SupportCall', id);
  return mapCall(row);
}

export async function listCalls(pagination: PaginationQuery, userId?: string) {
  const q = db('support_calls');
  if (userId) q.where({ user_id: userId });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc')
    .limit(pagination.limit).offset((pagination.page - 1) * pagination.limit)
    .select<RawCall[]>('*');
  return { data: rows.map(mapCall), meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}

export async function createCall(data: z.infer<typeof createCallSchema>, actorId: string) {
  const id = uuidv4();
  await db('support_calls').insert({
    id, user_id: actorId, ticket_id: data.ticketId ?? null,
    call_type: data.callType, status: 'ringing', target_team: data.targetTeam,
  });
  const call = await getCall(id);
  // Notify the sales/support team of the incoming call in real time
  emitToSalesTeam('call:incoming', call);

  // Auto-end unanswered calls so the caller isn't stuck on "ringing" forever
  setTimeout(() => void autoEndIfRinging(id, actorId), config.CALL_RINGING_TIMEOUT_SECONDS * 1000);

  return call;
}

async function autoEndIfRinging(callId: string, userId: string): Promise<void> {
  const row = await db('support_calls').where({ id: callId }).first<RawCall | undefined>();
  if (!row || row.status !== 'ringing') return;
  const now = new Date();
  await db('support_calls').where({ id: callId }).update({ status: 'ended', ended_at: now, updated_at: now });
  const updated = await getCall(callId);
  emitToCall(callId, 'call:status-changed', updated);
  emitToUser(userId, 'call:status-changed', updated);
  emitToSalesTeam('call:cancelled', updated);
}

export async function updateCallStatus(
  id: string, data: z.infer<typeof updateCallStatusSchema>, actorId: string,
) {
  const call = await getCall(id);
  assertCallTransition(call.status as CallStatus, data.status as CallStatus);
  const now = new Date();
  const updates: Record<string, unknown> = { status: data.status, updated_at: now };
  if (data.status === 'accepted') { updates['accepted_by'] = actorId; updates['accepted_at'] = now; }
  if (data.status === 'ended') {
    updates['ended_at'] = now;
    if (call.acceptedAt) {
      updates['duration_seconds'] = Math.floor((now.getTime() - call.acceptedAt.getTime()) / 1000);
    }
  }
  await db('support_calls').where({ id }).update(updates);
  const updated = await getCall(id);
  // Notify everyone in the call room and the original caller
  emitToCall(id, 'call:status-changed', updated);
  emitToUser(call.userId, 'call:status-changed', updated);
  // When a ringing call is cancelled/ended, also notify the sales team so they can dismiss the incoming call UI
  if (call.status === 'ringing' && data.status === 'ended') {
    emitToSalesTeam('call:cancelled', updated);
  }
  return updated;
}
