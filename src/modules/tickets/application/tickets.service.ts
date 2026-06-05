import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';
import { NotFoundError, ConflictError } from '@shared/domain/errors';
import { assertTicketTransition } from '@shared/domain/transitions';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';
import type { TicketStatus } from '@shared/domain/constants';

import type { CreateTicketDto, UpdateTicketStatusDto } from './tickets.schemas';

export interface Ticket {
  id: string; userId: string; assignedTo: string | null; caseId: string | null;
  subject: string; description: string; status: string; priority: string;
  escalated: boolean; version: number; createdAt: Date; updatedAt: Date;
}

interface RawTicket {
  id: string; user_id: string; assigned_to: string | null; case_id: string | null;
  subject: string; description: string; status: string; priority: string;
  escalated: boolean; version: number; created_at: string; updated_at: string;
}

function mapTicket(r: RawTicket): Ticket {
  return { id: r.id, userId: r.user_id, assignedTo: r.assigned_to, caseId: r.case_id,
    subject: r.subject, description: r.description, status: r.status, priority: r.priority,
    escalated: r.escalated, version: r.version,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at) };
}

export async function getTicket(id: string): Promise<Ticket> {
  const row = await db('support_tickets').where({ id }).whereNull('deleted_at').first<RawTicket | undefined>();
  if (!row) throw new NotFoundError('Ticket', id);
  return mapTicket(row);
}

export async function listTickets(
  pagination: PaginationQuery, filters: { status?: string; assignedTo?: string; userId?: string },
): Promise<{ data: Ticket[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const q = db('support_tickets').whereNull('deleted_at');
  if (filters.status) q.where({ status: filters.status });
  if (filters.assignedTo) q.where({ assigned_to: filters.assignedTo });
  if (filters.userId) q.where({ user_id: filters.userId });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc')
    .limit(pagination.limit).offset((pagination.page - 1) * pagination.limit)
    .select<RawTicket[]>('*');
  return { data: rows.map(mapTicket), meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}

export async function createTicket(data: CreateTicketDto, actorId: string): Promise<Ticket> {
  const id = uuidv4();
  await db('support_tickets').insert({
    id, user_id: actorId, case_id: data.caseId ?? null,
    subject: data.subject, description: data.description,
    priority: data.priority, status: 'open', escalated: false, created_by: actorId,
  });
  return getTicket(id);
}

export async function updateTicketStatus(
  id: string, data: UpdateTicketStatusDto, actorId: string,
): Promise<Ticket> {
  const t = await getTicket(id);
  assertTicketTransition(t.status as TicketStatus, data.status as TicketStatus);
  const affected = await db('support_tickets').where({ id, version: t.version }).whereNull('deleted_at').update({
    status: data.status, version: t.version + 1, updated_by: actorId, updated_at: new Date(),
  });
  if (!affected) throw new ConflictError('Ticket was modified concurrently.');
  await db('support_ticket_updates').insert({
    id: uuidv4(), ticket_id: id, author_id: actorId,
    message: data.message ?? `Status changed to ${data.status}`,
    status_before: t.status, status_after: data.status,
    is_internal: data.isInternal,
  });
  return getTicket(id);
}

export async function assignTicket(id: string, assignedTo: string, actorId: string): Promise<Ticket> {
  await getTicket(id);
  await db('support_tickets').where({ id }).update({ assigned_to: assignedTo, updated_by: actorId, updated_at: new Date() });
  return getTicket(id);
}

export async function escalateTicket(id: string, reason: string, actorId: string): Promise<Ticket> {
  await getTicket(id);
  await db('support_tickets').where({ id }).update({ escalated: true, updated_by: actorId, updated_at: new Date() });
  await db('support_ticket_updates').insert({
    id: uuidv4(), ticket_id: id, author_id: actorId,
    message: `Escalated: ${reason}`, is_internal: true,
  });
  return getTicket(id);
}

export async function addUpdate(id: string, message: string, isInternal: boolean, actorId: string): Promise<void> {
  await getTicket(id);
  await db('support_ticket_updates').insert({
    id: uuidv4(), ticket_id: id, author_id: actorId, message, is_internal: isInternal,
  });
}

export async function getTicketUpdates(ticketId: string): Promise<unknown[]> {
  return db('support_ticket_updates').where({ ticket_id: ticketId }).orderBy('created_at', 'asc').select('*');
}
