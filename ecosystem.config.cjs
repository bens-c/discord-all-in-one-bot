module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: 'src/index.js',
      autorestart: true,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
