module.exports = {
  apps: [
    {
      name: 'clawlaunch-api',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/clawlaunch-api-error.log',
      out_file: '/var/log/pm2/clawlaunch-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
