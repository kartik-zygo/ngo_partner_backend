import pino from 'pino';

import { config } from '../config/env';

const transport =
  config.NODE_ENV !== 'production'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      'passwordHash',
      'refreshToken',
      'accessToken',
      'token',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  transport,
});
