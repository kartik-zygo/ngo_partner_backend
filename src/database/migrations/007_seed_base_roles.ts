import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('roles')
    .insert([
      { name: 'ADMIN', description: 'System administrator' },
      { name: 'SALES', description: 'Sales agent' },
      { name: 'USER',  description: 'Client user' },
    ])
    .onConflict('name')
    .ignore();
}

export async function down(_knex: Knex): Promise<void> {
  // Base roles are referenced by user_roles — do not delete them on rollback.
}
