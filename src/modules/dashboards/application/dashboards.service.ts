import { db } from '@shared/infrastructure/database';

export async function getSalesDashboard(userId: string, roles: string[]) {
  const isAdmin = roles.includes('ADMIN');
  const assigneeFilter = isAdmin ? {} : { assigned_to: userId };

  const [leadsTotal, leadsByStatus, tasksToday, openTickets] = await Promise.all([
    db('leads').whereNull('deleted_at').count<{ count: string }>('id as count').first(),
    db('leads').whereNull('deleted_at').groupBy('status').select('status').count<{ status: string; count: string }[]>('id as count'),
    db('follow_up_tasks').where({ status: 'pending', ...assigneeFilter }).count<{ count: string }>('id as count').first(),
    db('support_tickets').where({ status: 'open' }).count<{ count: string }>('id as count').first(),
  ]);

  return {
    leadsTotal: parseInt(String(leadsTotal?.count ?? 0)),
    leadsByStatus,
    tasksPending: parseInt(String(tasksToday?.count ?? 0)),
    openTickets: parseInt(String(openTickets?.count ?? 0)),
  };
}

export async function getAdminDashboard() {
  const [users, leads, cases, revenue] = await Promise.all([
    db('users').whereNull('deleted_at').count<{ count: string }>('id as count').first(),
    db('leads').whereNull('deleted_at').count<{ count: string }>('id as count').first(),
    db('client_cases').whereNull('deleted_at').count<{ count: string }>('id as count').first(),
    db('revenue_records').sum<{ sum: string }>('amount as sum').first(),
  ]);

  const casesByStatus = await db('client_cases').whereNull('deleted_at').groupBy('status').select('status').count<{ status: string; count: string }[]>('id as count');

  return {
    totalUsers: parseInt(String(users?.count ?? 0)),
    totalLeads: parseInt(String(leads?.count ?? 0)),
    totalCases: parseInt(String(cases?.count ?? 0)),
    totalRevenue: parseFloat(String(revenue?.sum ?? 0)),
    casesByStatus,
  };
}

export async function getIntegrationMetrics() {
  const [inbox, outbox] = await Promise.all([
    db('integration_events_inbox').groupBy('status').select('status').count<{ status: string; count: string }[]>('id as count'),
    db('integration_events_outbox').groupBy('status').select('status').count<{ status: string; count: string }[]>('id as count'),
  ]);
  return { inboxByStatus: inbox, outboxByStatus: outbox };
}
