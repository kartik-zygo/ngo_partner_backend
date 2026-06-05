import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // â”€â”€ collaborations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('collaborations', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.specificType('type', 'collab_type_enum').notNullable();
    t.specificType('status', 'collab_status_enum').notNullable().defaultTo('pending');
    t.text('proposal').nullable();
    t.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('review_notes').nullable();
    t.uuid('converted_lead_id').nullable().references('id').inTable('leads').onDelete('SET NULL');
    t.timestamps(true, true);
    t.uuid('created_by').nullable();
    t.uuid('updated_by').nullable();
  });
  await knex.schema.raw('CREATE INDEX idx_collabs_user_id ON collaborations(user_id)');
  await knex.schema.raw('CREATE INDEX idx_collabs_status ON collaborations(status)');

  // â”€â”€ approval_requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('approval_requests', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('entity_type', 100).notNullable(); // e.g. 'lead', 'case', 'collaboration'
    t.uuid('entity_id').notNullable();
    t.text('reason').notNullable();
    t.specificType('status', 'approval_status_enum').notNullable().defaultTo('pending');
    t.uuid('decided_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('decision_notes').nullable();
    t.timestamp('decided_at', { useTz: true }).nullable();
    t.timestamps(true, true);
  });
  await knex.schema.raw('CREATE INDEX idx_approvals_entity ON approval_requests(entity_type, entity_id)');
  await knex.schema.raw('CREATE INDEX idx_approvals_status ON approval_requests(status)');

  // â”€â”€ cross_app_notification_events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('cross_app_notification_events', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('event_name', 100).notNullable();
    t.uuid('source_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.specificType('status', 'event_status_enum').notNullable().defaultTo('pending');
    t.integer('retry_count').notNullable().defaultTo(0);
    t.text('last_error').nullable();
    t.timestamp('processed_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_cane_status ON cross_app_notification_events(status)');
  await knex.schema.raw('CREATE INDEX idx_cane_event_name ON cross_app_notification_events(event_name)');

  // â”€â”€ user_notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('user_notifications', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.text('body').notNullable();
    t.string('notification_type', 100).notNullable();
    t.string('entity_type', 100).nullable();
    t.uuid('entity_id').nullable();
    t.boolean('is_read').notNullable().defaultTo(false);
    t.timestamp('read_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_un_user_id ON user_notifications(user_id)');
  await knex.schema.raw('CREATE INDEX idx_un_is_read ON user_notifications(user_id, is_read)');

  // â”€â”€ integration_events_inbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('integration_events_inbox', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('event_name', 100).notNullable();
    t.uuid('source_user_id').nullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.specificType('status', 'event_status_enum').notNullable().defaultTo('pending');
    t.text('last_error').nullable();
    t.integer('retry_count').notNullable().defaultTo(0);
    t.timestamp('processed_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // â”€â”€ integration_events_outbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('integration_events_outbox', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('event_name', 100).notNullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.specificType('status', 'event_status_enum').notNullable().defaultTo('pending');
    t.text('last_error').nullable();
    t.integer('retry_count').notNullable().defaultTo(0);
    t.timestamp('processed_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_outbox_status ON integration_events_outbox(status)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('integration_events_outbox');
  await knex.schema.dropTableIfExists('integration_events_inbox');
  await knex.schema.dropTableIfExists('user_notifications');
  await knex.schema.dropTableIfExists('cross_app_notification_events');
  await knex.schema.dropTableIfExists('approval_requests');
  await knex.schema.dropTableIfExists('collaborations');
}
