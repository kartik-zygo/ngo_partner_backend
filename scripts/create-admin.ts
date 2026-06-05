import { Client } from 'pg';
import argon2 from 'argon2';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf('=');
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    const val = trimmed.slice(sep + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main(): Promise<void> {
  loadEnv();

  const client = new Client({
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 5432),
    user: process.env['DB_USER'] ?? 'ngo_admin',
    password: process.env['DB_PASSWORD'],
    database: process.env['DB_NAME'] ?? 'ngo_partners_db',
  });

  await client.connect();
  console.log('Connected to database.');

  try {
    const email = 'admin@ngopartner.local';
    const password = 'Admin@12345';

    // Check if user already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`User ${email} already exists (id: ${existing.rows[0].id}). Aborting.`);
      return;
    }

    // Hash the password
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    // Get ADMIN role id
    const roleRes = await client.query("SELECT id FROM roles WHERE name = 'ADMIN'");
    if (roleRes.rows.length === 0) {
      throw new Error("ADMIN role not found — run migrations and seed first.");
    }
    const roleAdminId: string = roleRes.rows[0].id;

    const userId = randomUUID();
    const profileId = randomUUID();
    const userRoleId = randomUUID();

    // Insert user
    await client.query(
      `INSERT INTO users (id, email, password_hash, is_active, email_verified)
       VALUES ($1, $2, $3, true, true)`,
      [userId, email, passwordHash],
    );

    // Assign ADMIN role
    await client.query(
      `INSERT INTO user_roles (id, user_id, role_id) VALUES ($1, $2, $3)`,
      [userRoleId, userId, roleAdminId],
    );

    // Create profile
    await client.query(
      `INSERT INTO user_profiles (id, user_id, first_name, last_name)
       VALUES ($1, $2, $3, $4)`,
      [profileId, userId, 'System', 'Admin'],
    );

    console.log('');
    console.log('Admin account created successfully!');
    console.log(`  Email    : ${email}`);
    console.log(`  Password : ${password}`);
    console.log(`  User ID  : ${userId}`);
    console.log(`  Role     : ADMIN`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
