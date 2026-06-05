import knex from 'knex';
import type { Knex } from 'knex';

import { config } from '../config/env';
import { logger } from './logger';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    ssl: config.DB_SSL ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: config.DB_POOL_MIN,
    max: config.DB_POOL_MAX,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 600000,
  },
  acquireConnectionTimeout: 30000,
};

export const db: Knex = knex(knexConfig);

export async function checkDbConnection(): Promise<void> {
  try {
    await db.raw('SELECT 1');
    logger.info('PostgreSQL connection established');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to PostgreSQL');
    throw error;
  }
}
