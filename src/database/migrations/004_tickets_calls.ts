import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // â”€â”€ support_tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('support_tickets', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('assigned_to').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.uuid('case_id').nullable().references('id').inTable('client_cases').onDelete('SET NULL');
    t.string('subject', 500).notNullable();
    t.text('description').notNullable();
    t.specificType('status', 'ticket_status_enum').notNullable().defaultTo('open');
    t.string('priority', 20).notNullable().defaultTo('medium'); // low|medium|high|urgent
    t.boolean('escalated').notNullable().defaultTo(false);
    t.integer('version').notNullable().defaultTo(1);
    t.timestamps(true, true);
    t.uuid('created_by').nullable();
    t.uuid('updated_by').nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
  });
  await knex.schema.raw('CREATE INDEX idx_tickets_user_id ON support_tickets(user_id)');
  await knex.schema.raw('CREATE INDEX idx_tickets_status ON support_tickets(status)');
  await knex.schema.raw('CREATE INDEX idx_tickets_assigned_to ON support_tickets(assigned_to)');

  // â”€â”€ support_ticket_updates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('support_ticket_updates', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('ticket_id').notNullable().references('id').inTable('support_tickets').onDelete('CASCADE');
    t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.text('message').notNullable();
    t.specificType('status_before', 'ticket_status_enum').nullable();
    t.specificType('status_after', 'ticket_status_enum').nullable();
    t.boolean('is_internal').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_stu_ticket_id ON support_ticket_updates(ticket_id)');

  // â”€â”€ support_calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('support_calls', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('ticket_id').nullable().references('id').inTable('support_tickets').onDelete('SET NULL');
    t.specificType('call_type', 'call_type_enum').notNullable();
    t.specificType('status', 'call_status_enum').notNullable().defaultTo('ringing');
    t.specificType('target_team', 'call_target_enum').notNullable().defaultTo('support');
    t.uuid('accepted_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('accepted_at', { useTz: true }).nullable();
    t.timestamp('ended_at', { useTz: true }).nullable();
    t.integer('duration_seconds').nullable();
    t.timestamps(true, true);
  });
  await knex.schema.raw('CREATE INDEX idx_calls_user_id ON support_calls(user_id)');
  await knex.schema.raw('CREATE INDEX idx_calls_status ON support_calls(status)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('support_calls');
  await knex.schema.dropTableIfExists('support_ticket_updates');
  await knex.schema.dropTableIfExists('support_tickets');
}
