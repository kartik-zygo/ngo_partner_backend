import { createServer } from 'http';
import { createApp } from './app';
import { config } from '@shared/config/env';
import { checkDbConnection, db } from '@shared/infrastructure/database';
import { logger } from '@shared/infrastructure/logger';
import { initSocket } from '@shared/infrastructure/socket';

async function bootstrap(): Promise<void> {
  await checkDbConnection();

  const app = createApp();
  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(config.PORT, () => {
    logger.info(`🚀 Server running at http://localhost:${config.PORT}`);
    logger.info(`📚 API prefix: ${config.API_PREFIX}`);
    logger.info(`🔌 WebSocket available at ws://localhost:${config.PORT}/socket.io`);
    if (config.NODE_ENV !== 'production') {
      logger.info(`📖 API docs: http://localhost:${config.PORT}/api-docs`);
    }
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    httpServer.close(async () => {
      try {
        await db.destroy();
        logger.info('Database connections closed');
      } catch (err) {
        logger.error({ err }, 'Error closing database connections');
      }
      process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

void bootstrap();
