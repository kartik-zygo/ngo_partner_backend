/**
 * PM2 process manager configuration for the staging server.
 * Usage:
 *   pm2 start ecosystem.config.js          # start
 *   pm2 reload ecosystem.config.js         # zero-downtime reload
 *   pm2 stop ngo-backend-staging           # stop
 *   pm2 logs ngo-backend-staging           # view logs
 *   pm2 save && pm2 startup                # persist across reboots
 */
module.exports = {
  apps: [
    {
      name: 'ngo-backend-staging',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',

      // PM2 will load these on top of what's already in the process environment.
      // The .env file is loaded by the app itself (env.ts) since NODE_ENV=staging.
      env: {
        NODE_ENV: 'staging',
        PORT: 4000,
      },

      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
