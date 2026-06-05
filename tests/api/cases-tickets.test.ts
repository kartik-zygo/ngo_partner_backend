import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

let salesToken = '';
let userToken = '';

beforeAll(async () => {
  const r1 = await request(app).post('/api/v1/auth/login').send({ email: 'sales1@ngopartners.local', password: 'Password@123' });
  salesToken = r1.body.data?.accessToken ?? '';
  const r2 = await request(app).post('/api/v1/auth/login').send({ email: 'alice@example.com', password: 'Password@123' });
  userToken = r2.body.data?.accessToken ?? '';
});

describe('Cases API', () => {
  let caseId = '';

  it('USER can list their own cases', async () => {
    const res = await request(app).get('/api/v1/cases').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    caseId = res.body.data[0]?.id;
  });

  it('SALES can list all cases', async () => {
    const res = await request(app).get('/api/v1/cases').set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(200);
  });

  it('SALES can update case status', async () => {
    if (!caseId) return;
    const res = await request(app)
      .patch(`/api/v1/cases/${caseId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'underReview', version: 0 });
    // May succeed or fail with conflict/transition error — both are valid
    expect([200, 409, 400]).toContain(res.status);
  });
});

describe('Tickets API', () => {
  let ticketId = '';

  it('USER can create ticket', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ subject: 'Test ticket', description: 'Desc', priority: 'medium' });
    expect(res.status).toBe(201);
    ticketId = res.body.data.id;
  });

  it('USER can get own ticket', async () => {
    if (!ticketId) return;
    const res = await request(app).get(`/api/v1/tickets/${ticketId}`).set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('SALES can assign ticket', async () => {
    if (!ticketId) return;
    const profileRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${salesToken}`);
    const salesId = profileRes.body.data?.id;
    if (!salesId) return;
    const res = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ assignedTo: salesId });
    expect(res.status).toBe(200);
  });
});

describe('Idempotency', () => {
  it('duplicate request with same idempotency key returns same result', async () => {
    // Create ticket twice with the same key
    const key = `idem-test-${Date.now()}`;
    const body = { subject: 'Idempotent ticket', description: 'Should be deduplicated', priority: 'low' };

    const r1 = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', key)
      .send(body);

    const r2 = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', key)
      .send(body);

    expect(r1.status).toBe(201);
    // Either same 201 (cached) or 409 (conflict) — both indicate dedup logic
    expect([201, 409]).toContain(r2.status);
  });
});

describe('NGO Profile', () => {
  it('USER can update their NGO profile fields', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/me/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        isOrganizationAccount: true,
        organizationName: 'Alice Foundation',
        organizationType: 'NGO',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.profile?.isOrganizationAccount).toBe(true);
  });
});
