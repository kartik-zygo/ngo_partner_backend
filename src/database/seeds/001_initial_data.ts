import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import argon2 from 'argon2';

export async function seed(knex: Knex): Promise<void> {
  if (process.env['ENABLE_SEED'] !== 'true') {
    console.log('[seed] Skipped — set ENABLE_SEED=true to populate seed data.');
    return;
  }

  // ── Clear in reverse FK order ───────────────────────────────────────────────
  await knex('revenue_records').del();
  await knex('report_exports').del();
  await knex('integration_events_outbox').del();
  await knex('integration_events_inbox').del();
  await knex('user_notifications').del();
  await knex('cross_app_notification_events').del();
  await knex('approval_requests').del();
  await knex('collaborations').del();
  await knex('support_calls').del();
  await knex('support_ticket_updates').del();
  await knex('support_tickets').del();
  await knex('case_documents').del();
  await knex('case_document_requests').del();
  await knex('client_cases').del();
  await knex('follow_up_tasks').del();
  await knex('lead_assignments_history').del();
  await knex('lead_activity').del();
  await knex('lead_notes').del();
  await knex('leads').del();
  await knex('services').del();
  await knex('refresh_tokens').del();
  await knex('idempotency_keys').del();
  await knex('user_profiles').del();
  await knex('user_roles').del();
  await knex('roles').del();
  await knex('users').del();

  // ── Roles ───────────────────────────────────────────────────────────────────
  const roleAdmin = uuidv4(); const roleSales = uuidv4(); const roleUser = uuidv4();
  await knex('roles').insert([
    { id: roleAdmin, name: 'ADMIN', description: 'System administrator' },
    { id: roleSales, name: 'SALES', description: 'Sales agent' },
    { id: roleUser, name: 'USER', description: 'Client user' },
  ]);

  // ── Users ───────────────────────────────────────────────────────────────────
  const hash = await argon2.hash('Password@123', { type: argon2.argon2id });

  const adminId = uuidv4();
  const sales1Id = uuidv4(); const sales2Id = uuidv4();
  const user1Id = uuidv4(); const user2Id = uuidv4();

  await knex('users').insert([
    { id: adminId,  email: 'admin@ngopartners.local',  password_hash: hash, is_active: true, email_verified: true },
    { id: sales1Id, email: 'sales1@ngopartners.local', password_hash: hash, is_active: true, email_verified: true },
    { id: sales2Id, email: 'sales2@ngopartners.local', password_hash: hash, is_active: true, email_verified: true },
    { id: user1Id,  email: 'alice@example.com',        password_hash: hash, is_active: true, email_verified: true },
    { id: user2Id,  email: 'gfound@example.org',       password_hash: hash, is_active: true, email_verified: true },
  ]);

  // Roles mapping
  await knex('user_roles').insert([
    { id: uuidv4(), user_id: adminId,  role_id: roleAdmin },
    { id: uuidv4(), user_id: sales1Id, role_id: roleSales },
    { id: uuidv4(), user_id: sales2Id, role_id: roleSales },
    { id: uuidv4(), user_id: user1Id,  role_id: roleUser },
    { id: uuidv4(), user_id: user2Id,  role_id: roleUser },
  ]);

  // Profiles
  await knex('user_profiles').insert([
    { id: uuidv4(), user_id: adminId,  first_name: 'System', last_name: 'Admin' },
    { id: uuidv4(), user_id: sales1Id, first_name: 'Raj',    last_name: 'Patel' },
    { id: uuidv4(), user_id: sales2Id, first_name: 'Priya',  last_name: 'Singh' },
    {
      id: uuidv4(), user_id: user1Id, first_name: 'Alice', last_name: 'Sharma',
      is_organization_account: false,
    },
    {
      id: uuidv4(), user_id: user2Id, first_name: 'Green Foundation', last_name: null,
      is_organization_account: true,
      organization_name: 'Green Foundation India',
      organization_type: 'NGO',
      organization_reg_number: 'NGO/2021/GF/001',
      organization_website: 'https://greenfoundation.example.org',
      organization_description: 'Environment focused NGO working on reforestation.',
    },
  ]);

  // ── Services ─────────────────────────────────────────────────────────────────
  const serviceIds = Array.from({ length: 10 }, () => uuidv4());
  await knex('services').insert([
    { id: serviceIds[0], name: 'NGO Registration Assistance',      category: 'Legal',     base_price: 15000, is_active: true, created_by: adminId },
    { id: serviceIds[1], name: 'CSR Fund Matching',                category: 'Funding',   base_price: 5000,  is_active: true, created_by: adminId },
    { id: serviceIds[2], name: 'Grant Writing Support',            category: 'Funding',   base_price: 8000,  is_active: true, created_by: adminId },
    { id: serviceIds[3], name: 'Impact Assessment Report',         category: 'Reporting', base_price: 12000, is_active: true, created_by: adminId },
    { id: serviceIds[4], name: 'Compliance Filing (80G/12A)',      category: 'Legal',     base_price: 10000, is_active: true, created_by: adminId },
    { id: serviceIds[5], name: 'Volunteer Management Setup',       category: 'Operations',base_price: 6000,  is_active: true, created_by: adminId },
    { id: serviceIds[6], name: 'Digital Presence Setup',           category: 'Tech',      base_price: 18000, is_active: true, created_by: adminId },
    { id: serviceIds[7], name: 'Fundraising Campaign Consulting',  category: 'Funding',   base_price: 20000, is_active: true, created_by: adminId },
    { id: serviceIds[8], name: 'Board Governance Training',        category: 'Training',  base_price: 7500,  is_active: true, created_by: adminId },
    { id: serviceIds[9], name: 'Annual Report Design',             category: 'Reporting', base_price: 4500,  is_active: false, created_by: adminId },
  ]);

  // ── Leads ─────────────────────────────────────────────────────────────────────
  const lead1 = uuidv4(); const lead2 = uuidv4(); const lead3 = uuidv4();
  const lead4 = uuidv4(); const lead5 = uuidv4();
  await knex('leads').insert([
    { id: lead1, user_id: user1Id, service_id: serviceIds[0], source: 'userApp',     status: 'newLead',      contact_name: 'Alice Sharma',       contact_email: 'alice@example.com',  created_by: user1Id,  updated_by: user1Id },
    { id: lead2, user_id: user2Id, service_id: serviceIds[1], source: 'userApp',     status: 'contacted',    contact_name: 'Green Foundation',    contact_email: 'gfound@example.org', created_by: user2Id,  updated_by: sales1Id },
    { id: lead3, user_id: null,    service_id: serviceIds[2], source: 'manual',      status: 'qualified',    contact_name: 'Hope Trust',          contact_email: 'hope@trust.org',     created_by: sales1Id, updated_by: sales1Id },
    { id: lead4, user_id: null,    service_id: serviceIds[3], source: 'campaign',    status: 'proposalSent', contact_name: 'Earth Warriors',      contact_email: 'info@earthw.org',    created_by: sales2Id, updated_by: sales2Id },
    { id: lead5, user_id: null,    service_id: serviceIds[4], source: 'manual',      status: 'won',          contact_name: 'Sahara NGO',          contact_email: 'sahara@ngo.in',      created_by: sales1Id, updated_by: sales1Id },
  ]);

  // Assignments for active leads
  await knex('lead_assignments_history').insert([
    { id: uuidv4(), lead_id: lead1, assigned_to: sales1Id, assigned_by: adminId, is_current: true },
    { id: uuidv4(), lead_id: lead2, assigned_to: sales1Id, assigned_by: adminId, is_current: true },
    { id: uuidv4(), lead_id: lead3, assigned_to: sales2Id, assigned_by: adminId, is_current: true },
    { id: uuidv4(), lead_id: lead4, assigned_to: sales2Id, assigned_by: adminId, is_current: true },
  ]);

  // ── Tasks ─────────────────────────────────────────────────────────────────────
  await knex('follow_up_tasks').insert([
    { id: uuidv4(), lead_id: lead1, assigned_to: sales1Id, created_by: sales1Id, description: 'Send NGO registration proposal to Alice', status: 'pending',   due_at: new Date(Date.now() + 86400000 * 2) },
    { id: uuidv4(), lead_id: lead2, assigned_to: sales1Id, created_by: sales1Id, description: 'Follow up call with Green Foundation',    status: 'pending',   due_at: new Date(Date.now() + 86400000) },
    { id: uuidv4(), lead_id: lead3, assigned_to: sales2Id, created_by: sales2Id, description: 'Prepare grant writing proposal',         status: 'completed', due_at: new Date(Date.now() - 86400000) },
  ]);

  // ── Cases ─────────────────────────────────────────────────────────────────────
  const case1 = uuidv4(); const case2 = uuidv4(); const case3 = uuidv4();
  await knex('client_cases').insert([
    { id: case1, user_id: user1Id, lead_id: lead1, service_id: serviceIds[0], status: 'filingInProgress', created_by: user1Id },
    { id: case2, user_id: user2Id, lead_id: lead2, service_id: serviceIds[1], status: 'resubmitRequired', created_by: user2Id },
    { id: case3, user_id: user1Id, lead_id: lead5, service_id: serviceIds[4], status: 'approved',         created_by: user1Id },
  ]);

  // Document request for case2
  const docReq = uuidv4();
  await knex('case_document_requests').insert([
    { id: docReq, case_id: case2, round: 1, required_documents: JSON.stringify(['CSR Certificate', 'Board Resolution']), message: 'Please resubmit the following documents', due_date: new Date(Date.now() + 86400000 * 7), created_by: sales1Id },
  ]);

  // ── Support Tickets ───────────────────────────────────────────────────────────
  const ticket1 = uuidv4(); const ticket2 = uuidv4(); const ticket3 = uuidv4();
  await knex('support_tickets').insert([
    { id: ticket1, user_id: user1Id, subject: 'Unable to upload documents',    description: 'I keep getting an error when uploading.', priority: 'high',   status: 'open',          escalated: false, created_by: user1Id },
    { id: ticket2, user_id: user2Id, subject: 'Question about 80G filing',     description: 'What documents do I need for 80G?',       priority: 'medium', status: 'inProgress',    escalated: false, assigned_to: sales1Id, created_by: user2Id },
    { id: ticket3, user_id: user1Id, subject: 'Refund request for duplicate',  description: 'I was charged twice for the same service.', priority: 'urgent', status: 'waitingForUser', escalated: true, assigned_to: sales2Id, created_by: user1Id },
  ]);

  await knex('support_ticket_updates').insert([
    { id: uuidv4(), ticket_id: ticket2, author_id: sales1Id, message: 'Reached out to client via phone. Awaiting documents.', status_before: 'open', status_after: 'inProgress' },
    { id: uuidv4(), ticket_id: ticket3, author_id: sales2Id, message: 'Escalated to billing team.', status_before: 'inProgress', status_after: 'waitingForUser', is_internal: true },
  ]);

  // ── Support Calls ─────────────────────────────────────────────────────────────
  await knex('support_calls').insert([
    { id: uuidv4(), user_id: user1Id, call_type: 'voice', status: 'ended',    target_team: 'support', accepted_by: sales1Id, accepted_at: new Date(Date.now() - 3600000), ended_at: new Date(Date.now() - 3600000 + 300000), duration_seconds: 300 },
    { id: uuidv4(), user_id: user2Id, call_type: 'video', status: 'ringing',  target_team: 'sales' },
    { id: uuidv4(), user_id: user1Id, call_type: 'voice', status: 'accepted', target_team: 'support', accepted_by: sales2Id, accepted_at: new Date() },
  ]);

  // ── Collaborations ────────────────────────────────────────────────────────────
  await knex('collaborations').insert([
    { id: uuidv4(), user_id: user2Id, type: 'csrPartner',      status: 'pending',  proposal: 'We would like to partner on CSR projects.', created_by: user2Id },
    { id: uuidv4(), user_id: user1Id, type: 'fundingPartner',  status: 'approved', proposal: 'Interested in co-funding a reforestation drive.', reviewed_by: adminId, review_notes: 'Approved. Great alignment.', created_by: user1Id },
  ]);

  // ── Notifications ─────────────────────────────────────────────────────────────
  await knex('user_notifications').insert([
    { id: uuidv4(), user_id: user1Id, title: 'Case Update', body: 'Your case is now under review.', notification_type: 'CASE_STATUS', entity_type: 'case', entity_id: case1 },
    { id: uuidv4(), user_id: user2Id, title: 'Document Required', body: 'Please resubmit your documents.', notification_type: 'DOCUMENT_REQUEST', entity_type: 'case', entity_id: case2 },
  ]);

  // ── Revenue Records ───────────────────────────────────────────────────────────
  await knex('revenue_records').insert([
    { id: uuidv4(), lead_id: lead5, case_id: case3, service_id: serviceIds[4], user_id: user1Id, amount: 10000, currency: 'INR', revenue_type: 'service_fee', description: 'Compliance Filing payment', revenue_date: new Date(), created_by: adminId },
    { id: uuidv4(), lead_id: lead4, case_id: null,  service_id: serviceIds[3], user_id: null,    amount: 12000, currency: 'INR', revenue_type: 'consulting',  description: 'Impact assessment consulting fee', revenue_date: new Date(Date.now() - 86400000 * 5), created_by: adminId },
  ]);

  console.log('✅ Seed data inserted successfully');
  console.log('');
  console.log('📋 Test credentials (password: Password@123):');
  console.log('  admin@ngopartners.local  — ADMIN');
  console.log('  sales1@ngopartners.local — SALES');
  console.log('  sales2@ngopartners.local — SALES');
  console.log('  alice@example.com        — USER (individual)');
  console.log('  gfound@example.org       — USER (NGO: Green Foundation India)');
}
