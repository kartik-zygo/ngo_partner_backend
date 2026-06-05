import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // â”€â”€ services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('services', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 255).notNullable();
    t.text('description').nullable();
    t.string('category', 100).nullable();
    t.decimal('base_price', 12, 2).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.uuid('created_by').nullable();
    t.uuid('updated_by').nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
  });
  await knex.schema.raw('CREATE INDEX idx_services_category ON services(category)');
  await knex.schema.raw('CREATE INDEX idx_services_is_active ON services(is_active)');

  // â”€â”€ leads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('leads', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.uuid('service_id').nullable().references('id').inTable('services').onDelete('SET NULL');
    t.specificType('source', 'lead_source_enum').notNullable().defaultTo('manual');
    t.specificType('status', 'lead_status_enum').notNullable().defaultTo('newLead');
    t.string('contact_name', 200).nullable();
    t.string('contact_email', 255).nullable();
    t.string('contact_phone', 30).nullable();
    t.text('notes').nullable();
    t.integer('version').notNullable().defaultTo(1); // optimistic lock
    t.timestamps(true, true);
    t.uuid('created_by').nullable();
    t.uuid('updated_by').nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
  });
  await knex.schema.raw('CREATE INDEX idx_leads_user_id ON leads(user_id)');
  await knex.schema.raw('CREATE INDEX idx_leads_status ON leads(status)');
  await knex.schema.raw('CREATE INDEX idx_leads_source ON leads(source)');

  // â”€â”€ lead_notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('lead_notes', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.text('content').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_lead_notes_lead_id ON lead_notes(lead_id)');

  // â”€â”€ lead_activity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('lead_activity', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
    t.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('activity_type', 100).notNullable(); // e.g. STATUS_CHANGED, NOTE_ADDED, ASSIGNED
    t.jsonb('payload').nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_lead_activity_lead_id ON lead_activity(lead_id)');

  // â”€â”€ lead_assignments_history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('lead_assignments_history', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('lead_id').notNullable().references('id').inTable('leads').onDelete('CASCADE');
    t.uuid('assigned_to').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('assigned_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamp('assigned_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('unassigned_at', { useTz: true }).nullable();
    t.boolean('is_current').notNullable().defaultTo(true);
  });
  await knex.schema.raw('CREATE INDEX idx_lah_lead_id ON lead_assignments_history(lead_id)');
  await knex.schema.raw('CREATE INDEX idx_lah_assigned_to ON lead_assignments_history(assigned_to)');
  // Ensure only one active assignment per lead
  await knex.schema.raw(`
    CREATE UNIQUE INDEX idx_lah_one_active_per_lead
    ON lead_assignments_history(lead_id)
    WHERE is_current = true
  `);

  // â”€â”€ follow_up_tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('follow_up_tasks', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('lead_id').nullable().references('id').inTable('leads').onDelete('SET NULL');
    t.uuid('assigned_to').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.text('description').notNullable();
    t.specificType('status', 'task_status_enum').notNullable().defaultTo('pending');
    t.timestamp('due_at', { useTz: true }).nullable();
    t.timestamp('completed_at', { useTz: true }).nullable();
    t.timestamps(true, true);
  });
  await knex.schema.raw('CREATE INDEX idx_tasks_assigned_to ON follow_up_tasks(assigned_to)');
  await knex.schema.raw('CREATE INDEX idx_tasks_status ON follow_up_tasks(status)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('follow_up_tasks');
  await knex.schema.dropTableIfExists('lead_assignments_history');
  await knex.schema.dropTableIfExists('lead_activity');
  await knex.schema.dropTableIfExists('lead_notes');
  await knex.schema.dropTableIfExists('leads');
  await knex.schema.dropTableIfExists('services');
}
