import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── service_orders ────────────────────────────────────────────────────────────
  await knex.schema.createTable('service_orders', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('service_id').notNullable().references('id').inTable('services').onDelete('RESTRICT');
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 10).notNullable().defaultTo('INR');
    // pending | paid | failed | cancelled | expired
    t.string('status', 50).notNullable().defaultTo('pending');
    // Cashfree fields
    t.string('cashfree_order_id', 100).nullable();
    t.string('payment_session_id', 500).nullable();
    // Customer snapshot captured at order creation time
    t.string('customer_name', 255).nullable();
    t.string('customer_email', 255).nullable();
    t.string('customer_phone', 30).nullable();
    t.text('notes').nullable();
    t.timestamp('paid_at', { useTz: true }).nullable();
    t.timestamp('expires_at', { useTz: true }).nullable();
    t.timestamps(true, true);
    t.uuid('created_by').nullable();
  });

  await knex.schema.raw('CREATE INDEX idx_so_user_id ON service_orders(user_id)');
  await knex.schema.raw('CREATE INDEX idx_so_service_id ON service_orders(service_id)');
  await knex.schema.raw('CREATE INDEX idx_so_cashfree_order_id ON service_orders(cashfree_order_id)');
  await knex.schema.raw('CREATE INDEX idx_so_status ON service_orders(status)');

  // ── payment_transactions ─────────────────────────────────────────────────────
  await knex.schema.createTable('payment_transactions', (t: Knex.TableBuilder) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('order_id').notNullable().references('id').inTable('service_orders').onDelete('CASCADE');
    t.string('cashfree_payment_id', 100).nullable();
    t.string('cashfree_order_id', 100).nullable();
    t.string('payment_method', 100).nullable();   // upi/card/netbanking/wallet
    t.string('payment_status', 50).notNullable();  // SUCCESS/FAILED/PENDING/USER_DROPPED
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 10).notNullable().defaultTo('INR');
    t.string('error_code', 100).nullable();
    t.text('error_description').nullable();
    t.timestamp('webhook_received_at', { useTz: true }).nullable();
    t.jsonb('raw_webhook').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.raw('CREATE INDEX idx_pt_order_id ON payment_transactions(order_id)');
  await knex.schema.raw('CREATE INDEX idx_pt_cashfree_payment_id ON payment_transactions(cashfree_payment_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('payment_transactions');
  await knex.schema.dropTableIfExists('service_orders');
}
