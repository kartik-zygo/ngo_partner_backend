import request from 'supertest';
import { createApp } from '../../src/app';

/**
 * Integration API tests — requires local PostgreSQL seeded.
 * Run `npm run db:setup` before these tests.
 *
 * These tests share state with the seed; run against a test DB
 * by setting DB_NAME=ngo_partners_test in .env.test.
 */

const app = createApp();

let adminToken = '';
let salesToken = '';
let userToken = '';
let refreshToken = '';

const ADMIN_CREDS = { email: 'admin@ngopartners.local', password: 'Password@123' };
const SALES_CREDS = { email: 'sales1@ngopartners.local', password: 'Password@123' };
const USER_CREDS  = { email: 'alice@example.com', password: 'Password@123' };

describe('POST /api/v1/auth/register', () => {
  it('registers a new USER account and returns tokens', async () => {
    const email = `register.${Date.now()}@example.com`;
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'Password@123',
      firstName: 'Registered',
      lastName: 'User',
      isOrganizationAccount: true,
      organizationName: 'Hope Collective',
      organizationType: 'NGO',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.roles).toContain('USER');
    expect(res.body.data.profile.organizationName).toBe('Hope Collective');
  });

  it('rejects duplicate email registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'alice@example.com',
      password: 'Password@123',
    });

    expect(res.status).toBe(409);
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('logs in as admin and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(ADMIN_CREDS);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    adminToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('logs in as sales user', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(SALES_CREDS);
    expect(res.status).toBe(200);
    salesToken = res.body.data.accessToken;
  });

  it('logs in as USER role user', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(USER_CREDS);
    expect(res.status).toBe(200);
    userToken = res.body.data.accessToken;
  });

  it('rejects invalid password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@ngopartners.local', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@x.com', password: 'pass' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotates refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    // Update for subsequent tests
    adminToken = res.body.data.accessToken;
  });

  it('rejects invalid refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'bad-token' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns current user', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@ngopartners.local');
  });

  it('rejects unauthenticated', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

// ── RBAC ──────────────────────────────────────────────────────────────────────

describe('RBAC enforcement', () => {
  it('USER cannot create a service (ADMIN only)', async () => {
    const res = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Test', category: 'Legal', basePrice: 1000 });
    expect(res.status).toBe(403);
  });

  it('SALES cannot access audit logs (ADMIN only)', async () => {
    const res = await request(app).get('/api/v1/audit/logs').set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(403);
  });

  it('ADMIN can access audit logs', async () => {
    const res = await request(app).get('/api/v1/audit/logs').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ── Services ──────────────────────────────────────────────────────────────────

describe('Services', () => {
  let serviceId = '';

  it('lists active services (public)', async () => {
    const res = await request(app).get('/api/v1/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    serviceId = res.body.data[0]?.id;
  });

  it('ADMIN can create service', async () => {
    const res = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Service', category: 'Legal', basePrice: 5000, description: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });
});

// ── Leads ─────────────────────────────────────────────────────────────────────

describe('Leads', () => {
  let leadId = '';

  it('SALES can list leads', async () => {
    const res = await request(app).get('/api/v1/leads').set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    leadId = res.body.data[0]?.id;
  });

  it('SALES can create lead', async () => {
    const servicesRes = await request(app).get('/api/v1/services');
    const serviceId = servicesRes.body.data[0].id;
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ serviceId, contactName: 'Test Lead', contactEmail: 'lead@test.com', source: 'manual' });
    expect(res.status).toBe(201);
    leadId = res.body.data.id;
  });

  it('USER cannot create lead', async () => {
    const servicesRes = await request(app).get('/api/v1/services');
    const serviceId = servicesRes.body.data[0].id;
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ serviceId, contactName: 'Test', contactEmail: 'u@u.com', source: 'manual' });
    expect(res.status).toBe(403);
  });
});

// ── Health ────────────────────────────────────────────────────────────────────

describe('Health', () => {
  it('GET /health/live returns 200', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
  });

  it('GET /health/ready returns 200 when DB is connected', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
  });
});
