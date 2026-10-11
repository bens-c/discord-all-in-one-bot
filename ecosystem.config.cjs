module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: 'src/index.js',
      cwd: __dirname,
      exp_backoff_restart_delay: 1000,
      autorestart: true,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
