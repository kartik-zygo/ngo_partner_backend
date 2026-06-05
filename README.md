# NGO Partners Backend

REST API backend for two Flutter apps:
- **ngo_partner_user** — client-facing (USER role)
- **ngo_partner_sales** — internal CRM (SALES + ADMIN roles)

Built with Node.js + TypeScript + Express + PostgreSQL + Knex.

---

## Prerequisites

- **Node.js 20+** (`node --version`)
- **PostgreSQL 14+** running locally (`psql --version`)
- **npm 9+**

---

## Local Setup

### 1. Create the database and user

```bash
psql -U postgres
```

```sql
CREATE USER ngo_admin WITH PASSWORD 'changeme_local';
CREATE DATABASE ngo_partners_db OWNER ngo_admin;
\q
```

### 2. Clone and install

```bash
git clone <repo>
cd backend_ngo_partners
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and update DB_PASSWORD if needed
```

Key variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `ngo_partners_db` | Database name |
| `DB_USER` | `ngo_admin` | Database user |
| `DB_PASSWORD` | `changeme_local` | Database password |
| `JWT_ACCESS_SECRET` | *(required)* | Access token secret |
| `JWT_REFRESH_SECRET` | *(required)* | Refresh token secret |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

### 4. Run migrations and seed

```bash
npm run db:setup
# Equivalent to: npm run migrate:latest && npm run seed:run
```

### 5. Start the server

```bash
# Development (hot-reload)
npm run dev

# Production build
npm run build
npm start
```

Server starts at: `http://localhost:4000`

API prefix: `/api/v1`

---

## API Documentation

OpenAPI spec: [`openapi.yaml`](./openapi.yaml)

Interactive Swagger UI (dev only): `http://localhost:4000/api-docs`

---

## Test Credentials (after seeding)

All accounts use the password: `Password@123`

| Email | Role | Notes |
|---|---|---|
| `admin@ngopartners.local` | ADMIN | Full access |
| `sales1@ngopartners.local` | SALES | Lead/case/ticket management |
| `sales2@ngopartners.local` | SALES | |
| `alice@example.com` | USER | Individual client |
| `gfound@example.org` | USER | NGO client (Green Foundation India) |

---

## Identity Model

There is a **single `USER` role** for all clients. NGO context is stored as
**profile fields** rather than a separate role:

- `isOrganizationAccount: boolean`
- `organizationName: string`
- `organizationType: string` (e.g. `"NGO"`, `"Trust"`, `"Section8"`)
- `organizationRegNumber: string`
- `organizationWebsite: string`
- `organizationDescription: string`

An NGO is simply a USER with `isOrganizationAccount = true`. The `ngo_partner_user`
app can display org-specific UI based on this flag.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run migrate:latest` | Run pending migrations |
| `npm run migrate:rollback` | Rollback last migration batch |
| `npm run seed:run` | Run seed files |
| `npm run db:setup` | migrate:latest + seed:run |
| `npm test` | Run all tests (Jest) |
| `npm run test:unit` | Run unit tests only |
| `npm run test:api` | Run API integration tests |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Project Structure

```
src/
├── app.ts                    # Express app factory
├── server.ts                 # HTTP server + graceful shutdown
├── database/
│   ├── migrations/           # Knex migration files (001-006)
│   └── seeds/                # Seed data
├── modules/
│   ├── auth/                 # Login, refresh, profile
│   ├── services/             # NGO service catalogue
│   ├── leads/                # Lead CRM lifecycle
│   ├── tasks/                # Follow-up tasks
│   ├── cases/                # Case management + documents
│   ├── tickets/              # Support tickets
│   ├── support-calls/        # Voice/video call tracking
│   ├── collaborations/       # Partnership requests
│   ├── notifications/        # In-app notifications
│   ├── approvals/            # Approval workflow
│   ├── integration-events/   # Cross-app event bus
│   ├── dashboards/           # Metrics dashboards
│   ├── revenue-reports/      # Revenue records + exports
│   └── audit/                # Audit log queries
└── shared/
    ├── config/               # Env validation
    ├── domain/               # Result monad, errors, constants, transitions
    ├── application/          # Response helpers, common schemas
    ├── infrastructure/       # DB, logger, idempotency
    └── interface/            # Middleware (auth, validate, error-handler, correlation-id)
tests/
├── unit/                     # Domain logic tests
└── api/                      # API integration tests (require running DB)
```

---

## Architecture

Clean Architecture (Domain → Application → Infrastructure → Interface):

- **Domain**: Entities, repository interfaces, value objects, domain errors
- **Application**: Use-case services, input schemas (Zod)
- **Infrastructure**: Knex repository implementations, external adapters
- **Interface**: Express controllers, route definitions, middleware

Key patterns:
- **Optimistic locking** via `version` field on leads, cases, tickets
- **Soft deletes** via `deleted_at` on users, services, leads, cases, tickets
- **JWT rotation**: refresh tokens stored as SHA-256 hash, single-use
- **Idempotency**: `Idempotency-Key` header support for all POST endpoints
- **RBAC**: `authenticate` + `authorize(...roles)` middleware chain

---

## Health Endpoints

| Endpoint | Description |
|---|---|
| `GET /health/live` | Liveness — always 200 |
| `GET /health/ready` | Readiness — checks DB connection |
