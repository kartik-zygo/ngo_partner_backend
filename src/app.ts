import 'express-async-errors';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { StatusCodes } from 'http-status-codes';
import { config } from '@shared/config/env';
import { logger } from '@shared/infrastructure/logger';
import { correlationIdMiddleware } from '@shared/interface/middleware/correlation-id';
import { errorHandler } from '@shared/interface/middleware/error-handler';
import { authRouter } from '@modules/auth/interface/auth.routes';
import { servicesRouter } from '@modules/services/interface/services.routes';
import { leadsRouter } from '@modules/leads/interface/leads.routes';
import { tasksRouter } from '@modules/tasks/interface/tasks.routes';
import { casesRouter } from '@modules/cases/interface/cases.routes';
import { ticketsRouter } from '@modules/tickets/interface/tickets.routes';
import { supportCallsRouter } from '@modules/support-calls/interface/support-calls.routes';
import { collaborationsRouter } from '@modules/collaborations/interface/collaborations.routes';
import { notificationsRouter } from '@modules/notifications/interface/notifications.routes';
import { approvalsRouter } from '@modules/approvals/interface/approvals.routes';
import { integrationRouter } from '@modules/integration-events/interface/integration-events.routes';
import { dashboardsRouter } from '@modules/dashboards/interface/dashboards.routes';
import { reportsRouter } from '@modules/revenue-reports/interface/reports.routes';
import { auditRouter } from '@modules/audit/interface/audit.routes';
import { adminTeamRouter } from '@modules/admin-team/interface/admin-team.routes';

export function createApp(): express.Application {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        // Allow any ngrok tunnel URL in non-production environments
        if (config.NODE_ENV !== 'production' && /\.ngrok(-free)?\.app$/.test(origin)) {
          return cb(null, true);
        }
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  // ── Global rate limiter ─────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ── Auth-specific tighter rate limiter ──────────────────────────────────────
  const authLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts' } },
  });

  // ── Body parsing ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: config.REQUEST_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: config.REQUEST_SIZE_LIMIT }));
  app.use(compression());

  // ── Request logging ─────────────────────────────────────────────────────────
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ correlationId: (req as express.Request).correlationId }),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    }),
  );

  // ── Correlation ID ──────────────────────────────────────────────────────────
  app.use(correlationIdMiddleware);

  // ── Health checks (no auth) ─────────────────────────────────────────────────
  app.get('/health/live', (_req, res) => res.status(StatusCodes.OK).json({ status: 'ok' }));
  app.get('/health/ready', async (_req, res) => {
    try {
      const { db } = await import('@shared/infrastructure/database');
      await db.raw('SELECT 1');
      res.status(StatusCodes.OK).json({ status: 'ok', db: 'connected' });
    } catch {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ status: 'error', db: 'disconnected' });
    }
  });

  // ── OpenAPI docs ────────────────────────────────────────────────────────────
  if (config.NODE_ENV !== 'production') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swaggerUi = require('swagger-ui-express') as typeof import('swagger-ui-express');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yaml = require('js-yaml') as typeof import('js-yaml');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const specPath = path.resolve(process.cwd(), 'openapi.yaml');
    if (fs.existsSync(specPath)) {
      const spec = yaml.load(fs.readFileSync(specPath, 'utf-8'));
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec as object));
      logger.info(`OpenAPI docs available at ${config.APP_URL}/api-docs`);
    }
  }

  // ── API routes ──────────────────────────────────────────────────────────────
  const prefix = config.API_PREFIX;

  app.use(`${prefix}/auth`, authLimiter, authRouter);
  app.use(`${prefix}/services`, servicesRouter);
  app.use(`${prefix}/leads`, leadsRouter);
  app.use(`${prefix}/tasks`, tasksRouter);
  app.use(`${prefix}/cases`, casesRouter);
  app.use(`${prefix}/tickets`, ticketsRouter);
  app.use(`${prefix}/support-calls`, supportCallsRouter);
  app.use(`${prefix}/collaborations`, collaborationsRouter);
  app.use(`${prefix}/notifications`, notificationsRouter);
  app.use(`${prefix}/approvals`, approvalsRouter);
  app.use(`${prefix}/integration`, integrationRouter);
  app.use(`${prefix}/dashboard`, dashboardsRouter);
  app.use(`${prefix}/reports`, reportsRouter);
  app.use(`${prefix}/audit`, auditRouter);
  app.use(`${prefix}/admin/team`, adminTeamRouter);

  // ── 404 handler ─────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(StatusCodes.NOT_FOUND).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // ── Centralized error handler ───────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
