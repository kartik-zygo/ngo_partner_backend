import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // â”€â”€ client_cases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('client_cases', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('lead_id').nullable().references('id').inTable('leads').onDelete('SET NULL');
    t.uuid('service_id').nullable().references('id').inTable('services').onDelete('SET NULL');
    t.specificType('status', 'case_status_enum').notNullable().defaultTo('submitted');
    t.text('notes').nullable();
    t.text('rejection_reason').nullable();
    t.integer('version').notNullable().defaultTo(1);
    t.timestamps(true, true);
    t.uuid('created_by').nullable();
    t.uuid('updated_by').nullable();
    t.timestamp('deleted_at', { useTz: true }).nullable();
  });
  await knex.schema.raw('CREATE INDEX idx_cases_user_id ON client_cases(user_id)');
  await knex.schema.raw('CREATE INDEX idx_cases_status ON client_cases(status)');

  // â”€â”€ case_document_requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('case_document_requests', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('case_id').notNullable().references('id').inTable('client_cases').onDelete('CASCADE');
    t.integer('round').notNullable().defaultTo(1);
    t.jsonb('required_documents').notNullable().defaultTo('[]'); // array of doc names
    t.text('message').nullable();
    t.timestamp('due_date', { useTz: true }).nullable();
    t.boolean('is_fulfilled').notNullable().defaultTo(false);
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_cdr_case_id ON case_document_requests(case_id)');

  // â”€â”€ case_documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex.schema.createTable('case_documents', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('case_id').notNullable().references('id').inTable('client_cases').onDelete('CASCADE');
    t.uuid('request_id').nullable().references('id').inTable('case_document_requests').onDelete('SET NULL');
    t.string('document_name', 255).notNullable();
    t.string('file_url', 1000).notNullable();
    t.string('mime_type', 100).nullable();
    t.integer('file_size_bytes').nullable();
    t.uuid('uploaded_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_cdocs_case_id ON case_documents(case_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('case_documents');
  await knex.schema.dropTableIfExists('case_document_requests');
  await knex.schema.dropTableIfExists('client_cases');
}
