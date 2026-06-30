module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'dist/apps/forex-bot-backend/main.js',
      instances: 2,
      exec_mode: 'cluster',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
    {
      name: 'auth-service',
      script: 'dist/apps/auth-service/main.js',
      instances: 2,
      exec_mode: 'cluster',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'market-data-service',
      script: 'dist/apps/market-data-service/main.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
    {
      name: 'strategy-service',
      script: 'dist/apps/strategy-service/main.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
    {
      name: 'order-service',
      script: 'dist/apps/order-service/main.js',
      instances: 2,
      exec_mode: 'cluster',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
    },
    {
      name: 'backoffice-service',
      script: 'dist/apps/backoffice-service/main.js',
      instances: 2,
      exec_mode: 'cluster',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
    },
  ],
};
