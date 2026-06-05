import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // â”€â”€ revenue_records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('revenue_records', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('lead_id').nullable().references('id').inTable('leads').onDelete('SET NULL');
    t.uuid('case_id').nullable().references('id').inTable('client_cases').onDelete('SET NULL');
    t.uuid('service_id').nullable().references('id').inTable('services').onDelete('SET NULL');
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 10).notNullable().defaultTo('INR');
    t.string('revenue_type', 50).notNullable(); // e.g. 'service_fee', 'consulting'
    t.string('description', 500).nullable();
    t.timestamp('revenue_date', { useTz: true }).notNullable();
    t.timestamps(true, true);
    t.uuid('created_by').nullable();
  });
  await knex.schema.raw('CREATE INDEX idx_rr_revenue_date ON revenue_records(revenue_date DESC)');
  await knex.schema.raw('CREATE INDEX idx_rr_service_id ON revenue_records(service_id)');

  // â”€â”€ report_exports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('report_exports', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('report_type', 100).notNullable(); // e.g. 'revenue', 'leads', 'cases'
    t.jsonb('filters').nullable();
    t.string('status', 50).notNullable().defaultTo('queued'); // queued|processing|ready|failed
    t.string('file_url', 1000).nullable();
    t.text('error_message').nullable();
    t.timestamp('completed_at', { useTz: true }).nullable();
    t.timestamps(true, true);
  });
  await knex.schema.raw('CREATE INDEX idx_re_requested_by ON report_exports(requested_by)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('report_exports');
  await knex.schema.dropTableIfExists('revenue_records');
}
