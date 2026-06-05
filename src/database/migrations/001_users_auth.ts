import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // â”€â”€ Enums â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.raw(`
    CREATE TYPE role_enum AS ENUM ('USER', 'SALES', 'ADMIN');
    CREATE TYPE lead_status_enum AS ENUM ('newLead','contacted','qualified','proposalSent','won','lost');
    CREATE TYPE lead_source_enum AS ENUM ('userApp','manual','campaign','collaboration');
    CREATE TYPE case_status_enum AS ENUM ('submitted','filingInProgress','underReview','resubmitRequired','approved','rejected');
    CREATE TYPE ticket_status_enum AS ENUM ('open','inProgress','waitingForUser','resolved','closed');
    CREATE TYPE call_type_enum AS ENUM ('voice','video');
    CREATE TYPE call_status_enum AS ENUM ('ringing','accepted','rejected','ended');
    CREATE TYPE call_target_enum AS ENUM ('support','sales');
    CREATE TYPE collab_status_enum AS ENUM ('pending','approved','rejected');
    CREATE TYPE collab_type_enum AS ENUM ('fundingPartner','resourceSharing','csrPartner','technical');
    CREATE TYPE approval_status_enum AS ENUM ('pending','approved','rejected');
    CREATE TYPE task_status_enum AS ENUM ('pending','completed','rescheduled');
    CREATE TYPE event_status_enum AS ENUM ('pending','processing','processed','failed');
  `);

  // â”€â”€ users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('users', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('email_verified').notNullable().defaultTo(false);
    t.integer('failed_login_attempts').notNullable().defaultTo(0);
    t.timestamp('locked_until', { useTz: true }).nullable();
    t.timestamp('last_login_at', { useTz: true }).nullable();
    t.timestamps(true, true);   // created_at, updated_at
    t.uuid('created_by').nullable();
    t.uuid('updated_by').nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
  });

  // â”€â”€ roles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('roles', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.specificType('name', 'role_enum').notNullable().unique();
    t.text('description').nullable();
    t.timestamps(true, true);
  });

  // â”€â”€ user_roles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('user_roles', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['user_id', 'role_id']);
  });

  // â”€â”€ user_profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('user_profiles', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.string('first_name', 100).nullable();
    t.string('last_name', 100).nullable();
    t.string('phone', 30).nullable();
    t.string('avatar_url', 500).nullable();
    // NGO / organization context (USER role only)
    t.boolean('is_organization_account').notNullable().defaultTo(false);
    t.string('organization_name', 255).nullable();
    t.string('organization_type', 100).nullable();
    t.string('organization_reg_number', 100).nullable();
    t.string('organization_website', 500).nullable();
    t.text('organization_description').nullable();
    t.timestamps(true, true);
    t.uuid('created_by').nullable();
    t.uuid('updated_by').nullable();
  });

  // â”€â”€ refresh_tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('refresh_tokens', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('token_hash').notNullable();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.boolean('revoked').notNullable().defaultTo(false);
    t.string('ip_address', 45).nullable();
    t.string('user_agent', 500).nullable();
    t.timestamps(true, true);
  });
  await knex.schema.raw('CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)');

  // â”€â”€ idempotency_keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('idempotency_keys', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('actor_id').notNullable();
    t.string('action_key', 255).notNullable();
    t.jsonb('response_payload').nullable();
    t.string('status', 50).notNullable().defaultTo('completed');
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['actor_id', 'action_key']);
  });

  // â”€â”€ audit_logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('audit_logs', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('actor_id').nullable();
    t.string('actor_email', 255).nullable();
    t.string('action', 100).notNullable();
    t.string('entity_type', 100).notNullable();
    t.uuid('entity_id').nullable();
    t.jsonb('before').nullable();
    t.jsonb('after').nullable();
    t.string('ip_address', 45).nullable();
    t.string('correlation_id', 100).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id)');
  await knex.schema.raw('CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id)');
  await knex.schema.raw('CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('idempotency_keys');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('user_profiles');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('users');
  await knex.raw(`
    DROP TYPE IF EXISTS event_status_enum;
    DROP TYPE IF EXISTS task_status_enum;
    DROP TYPE IF EXISTS approval_status_enum;
    DROP TYPE IF EXISTS collab_type_enum;
    DROP TYPE IF EXISTS collab_status_enum;
    DROP TYPE IF EXISTS call_target_enum;
    DROP TYPE IF EXISTS call_status_enum;
    DROP TYPE IF EXISTS call_type_enum;
    DROP TYPE IF EXISTS ticket_status_enum;
    DROP TYPE IF EXISTS case_status_enum;
    DROP TYPE IF EXISTS lead_source_enum;
    DROP TYPE IF EXISTS lead_status_enum;
    DROP TYPE IF EXISTS role_enum;
  `);
}
