import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import { config } from '@shared/config/env';
import { logger } from '@shared/infrastructure/logger';

interface SocketJwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  const allowedOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());

  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        if (config.NODE_ENV !== 'production' && /\.ngrok(-free)?\.app$/.test(origin)) {
          return cb(null, true);
        }
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    path: '/socket.io',
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) {
      return next(new Error('AUTH_REQUIRED'));
    }
    try {
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as SocketJwtPayload;
      socket.data['userId'] = payload.sub;
      socket.data['roles'] = payload.roles;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data['userId'] as string;
    const roles = (socket.data['roles'] as string[]) ?? [];

    void socket.join(`user:${userId}`);

    // Sales and Admin agents join the team room to receive incoming call alerts
    if (roles.includes('SALES') || roles.includes('ADMIN')) {
      void socket.join('sales-team');
    }

    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // Client joins a specific call room after call is created/accepted
    socket.on('call:join', (callId: string) => {
      void socket.join(`call:${callId}`);
      logger.debug({ userId, callId }, 'Joined call room');
    });

    socket.on('call:leave', (callId: string) => {
      void socket.leave(`call:${callId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId, reason }, 'Socket disconnected');
    });
  });

  logger.info('Socket.io gateway initialised');
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToSalesTeam(event: string, data: unknown): void {
  if (!io) return;
  io.to('sales-team').emit(event, data);
}

export function emitToCall(callId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`call:${callId}`).emit(event, data);
}
