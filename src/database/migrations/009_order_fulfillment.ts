import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('service_orders', (t: Knex.TableBuilder) => {
    // Tracks service delivery progress — managed by admin/sales after payment.
    // Null = no action taken yet; only meaningful once status = 'paid'.
    // processing → completed
    // processing → refund_initiated → refunded
    t.string('fulfillment_status', 50).nullable().defaultTo(null);

    // Internal notes added by admin or sales team (not visible to users)
    t.text('admin_notes').nullable();

    // Who last updated fulfillment
    t.uuid('fulfillment_updated_by').nullable();
    t.timestamp('fulfillment_updated_at', { useTz: true }).nullable();
  });

  await knex.schema.raw('CREATE INDEX idx_so_fulfillment_status ON service_orders(fulfillment_status)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_so_fulfillment_status');
  await knex.schema.alterTable('service_orders', (t: Knex.TableBuilder) => {
    t.dropColumn('fulfillment_status');
    t.dropColumn('admin_notes');
    t.dropColumn('fulfillment_updated_by');
    t.dropColumn('fulfillment_updated_at');
  });
}
