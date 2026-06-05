import { v4 as uuidv4 } from 'uuid';

import { db } from '@shared/infrastructure/database';
import { NotFoundError } from '@shared/domain/errors';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';

import type { CreateTaskDto, RescheduleTaskDto } from './tasks.schemas';

export interface Task {
  id: string;
  leadId: string | null;
  assignedTo: string;
  createdBy: string;
  description: string;
  status: string;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RawTask {
  id: string; lead_id: string | null; assigned_to: string; created_by: string;
  description: string; status: string; due_at: string | null; completed_at: string | null;
  created_at: string; updated_at: string;
}

function mapTask(r: RawTask): Task {
  return {
    id: r.id, leadId: r.lead_id, assignedTo: r.assigned_to, createdBy: r.created_by,
    description: r.description, status: r.status,
    dueAt: r.due_at ? new Date(r.due_at) : null,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export async function listTasks(
  pagination: PaginationQuery,
  actorId: string,
  actorRoles: string[],
): Promise<{ data: Task[]; meta: ReturnType<typeof buildPaginationMeta> }> {
  const q = db('follow_up_tasks');
  if (!actorRoles.includes('ADMIN')) {
    q.where({ assigned_to: actorId });
  }
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const total = parseInt(String(totalRow?.count ?? 0));
  const rows = await q.clone()
    .orderBy('created_at', 'desc')
    .limit(pagination.limit)
    .offset((pagination.page - 1) * pagination.limit)
    .select<RawTask[]>('*');
  return { data: rows.map(mapTask), meta: buildPaginationMeta(total, pagination.page, pagination.limit) };
}

export async function createTask(data: CreateTaskDto, actorId: string): Promise<Task> {
  const id = uuidv4();
  await db('follow_up_tasks').insert({
    id, lead_id: data.leadId ?? null, assigned_to: data.assignedTo,
    created_by: actorId, description: data.description, status: 'pending',
    due_at: data.dueAt ? new Date(data.dueAt) : null,
  });
  return getTask(id);
}

export async function getTask(id: string): Promise<Task> {
  const row = await db('follow_up_tasks').where({ id }).first<RawTask | undefined>();
  if (!row) throw new NotFoundError('Task', id);
  return mapTask(row);
}

export async function completeTask(id: string, actorId: string): Promise<Task> {
  const task = await getTask(id);
  if (task.status === 'completed') return task;
  await db('follow_up_tasks').where({ id }).update({
    status: 'completed', completed_at: new Date(), updated_at: new Date(),
  });
  void actorId; // for audit if needed
  return getTask(id);
}

export async function rescheduleTask(id: string, data: RescheduleTaskDto): Promise<Task> {
  await getTask(id);
  await db('follow_up_tasks').where({ id }).update({
    status: 'rescheduled', due_at: new Date(data.dueAt), updated_at: new Date(),
  });
  return getTask(id);
}
