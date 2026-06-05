import type { Knex } from 'knex';

function loadEnvFile(): void {
  const envPath = '.env';

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const resolvedEnvPath = path.resolve(process.cwd(), envPath);

    if (!fs.existsSync(resolvedEnvPath)) {
      return;
    }

    const lines = fs.readFileSync(resolvedEnvPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // Let knex fall back to process.env/defaults if .env cannot be read.
  }
}

loadEnvFile();

// Load config manually here (before app bootstrap) so knex CLI can use it
const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 5432),
    user: process.env['DB_USER'] ?? 'ngo_admin',
    password: process.env['DB_PASSWORD'] ?? 'changeme_local',
    database: process.env['DB_NAME'] ?? 'ngo_partners_db',
  },
  migrations: {
    directory: './src/database/migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/database/seeds',
    extension: 'ts',
  },
};

export default config;
