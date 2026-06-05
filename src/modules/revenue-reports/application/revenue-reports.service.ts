import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { db } from '@shared/infrastructure/database';
import { buildPaginationMeta } from '@shared/application/response';
import type { PaginationQuery } from '@shared/application/common-schemas';

export const revenueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  revenueType: z.string().optional(),
});

export const exportRequestSchema = z.object({
  reportType: z.enum(['revenue', 'leads', 'cases', 'tickets']),
  filters: z.record(z.unknown()).optional(),
});

export async function listRevenue(query: z.infer<typeof revenueQuerySchema>) {
  const q = db('revenue_records');
  if (query.from) q.where('revenue_date', '>=', query.from);
  if (query.to) q.where('revenue_date', '<=', query.to);
  if (query.revenueType) q.where({ revenue_type: query.revenueType });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('revenue_date', 'desc').limit(query.limit).offset((query.page - 1) * query.limit).select('*');
  return { data: rows, meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), query.page, query.limit) };
}

export async function requestExport(data: z.infer<typeof exportRequestSchema>, actorId: string) {
  const id = uuidv4();
  await db('report_exports').insert({ id, requested_by: actorId, report_type: data.reportType, filters: JSON.stringify(data.filters ?? {}), status: 'queued' });
  // In production, a worker would process this; locally we mark as ready immediately
  await db('report_exports').where({ id }).update({ status: 'ready', completed_at: new Date(), file_url: `#mock-export-${id}.csv` });
  return db('report_exports').where({ id }).first();
}

export async function getExportHistory(actorId: string, pagination: PaginationQuery, isAdmin: boolean) {
  const q = db('report_exports');
  if (!isAdmin) q.where({ requested_by: actorId });
  const totalRow = await q.clone().count<{ count: string }>('id as count').first();
  const rows = await q.clone().orderBy('created_at', 'desc').limit(pagination.limit).offset((pagination.page - 1) * pagination.limit).select('*');
  return { data: rows, meta: buildPaginationMeta(parseInt(String(totalRow?.count ?? 0)), pagination.page, pagination.limit) };
}
