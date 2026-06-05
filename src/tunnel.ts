import ngrok from '@ngrok/ngrok';

import { config } from '@shared/config/env';
import { logger } from '@shared/infrastructure/logger';
import { createApp } from './app';

async function startWithTunnel(): Promise<void> {
  const app = createApp();

  await new Promise<void>((resolve) => {
    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, 'Server started');
      resolve();
    });
  });

  const authtoken = process.env['NGROK_AUTHTOKEN'];
  if (!authtoken) {
    logger.error(
      'NGROK_AUTHTOKEN is not set — add it to your .env file.\n' +
        '  Get yours at: https://dashboard.ngrok.com/get-started/your-authtoken',
    );
    process.exit(1);
  }

  const listener = await ngrok.forward({
    addr: config.PORT,
    authtoken,
  });

  const publicUrl = listener.url()!;

  // Print clearly so Flutter devs can copy it
  const line = '─'.repeat(62);
  logger.info(line);
  logger.info('ngrok tunnel active');
  logger.info(`  Public URL : ${publicUrl}`);
  logger.info(`  Local      : http://localhost:${config.PORT}`);
  logger.info(`  API base   : ${publicUrl}${config.API_PREFIX}`);
  logger.info(line);
  logger.info('Set this as baseUrl in your Flutter app and hit Ctrl+C to stop');
}

startWithTunnel().catch((err: unknown) => {
  console.error('Failed to start tunnel:', err);
  process.exit(1);
});
