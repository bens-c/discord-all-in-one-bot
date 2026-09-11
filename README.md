# Discord All-in-One Bot

An extensible Discord bot foundation for moderation, tickets, economy, leveling, security, giveaways, and a modern web dashboard. The stable bot lives on `main`; dashboard development lives on `web-dashboard`.

## Features

- Discord.js slash commands and permission-aware moderation
- Environment-based configuration with no committed credentials
- PM2 production configuration
- Architecture ready for MongoDB-backed guild settings, tickets, economy, leveling, and security
- Next.js dashboard workspace on the `web-dashboard` branch

## Branches

```text
main
└── Stable Discord Bot

web-dashboard
└── Discord Bot + Web Dashboard development
```

## Prerequisites

- Node.js 20 or newer
- A Discord application and bot user
- MongoDB for persistent modules when enabled
- PM2 for production process management

## Installation

```bash
git clone <repository-url>
cd discord-all-in-one-bot
npm ci
cp .env.example .env
```

Fill `.env` locally. Never commit it.

## Discord Developer Portal setup

1. Create an application in the Discord Developer Portal.
2. Add a bot, copy its token into local `DISCORD_TOKEN`, and enable only the intents required by your modules.
3. Copy the application ID to `CLIENT_ID`.
4. Invite the bot with the `bot` and `applications.commands` scopes.
5. During development, set `GUILD_ID` for immediate guild command updates.

## MongoDB setup

Create a database user with least-privilege access and place its connection string only in local `MONGODB_URI`. Restrict network access in MongoDB Atlas or your firewall.

## Environment configuration

All supported keys are documented in `.env.example`. Example values are intentionally blank. Dashboard-only OAuth values are used on the `web-dashboard` branch.

## Slash command deployment

```bash
npm run deploy:commands
```

## Start the bot

```bash
npm start
```

## Dashboard start

```bash
git switch web-dashboard
cd dashboard
npm ci
npm run dev
```

## PM2 setup

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

## Development

Run `npm run check` before committing. Keep bot-only stable changes on `main`; build dashboard and integration work on `web-dashboard`.

## Production

Use a supported Node.js release, inject secrets through the host environment, deploy slash commands once, and run the bot with PM2. Terminate TLS at a trusted reverse proxy for the dashboard.

## WebUI screenshots

> Dashboard overview screenshot placeholder

> Guild configuration screenshot placeholder

## Troubleshooting

- **Bot does not log in:** verify `DISCORD_TOKEN` exists locally and was regenerated if ever exposed.
- **Commands are missing:** run `npm run deploy:commands`; use `GUILD_ID` during development.
- **Missing permissions:** verify the bot role and channel overrides.
- **Dashboard OAuth fails:** verify callback URL, client ID, client secret, and `NEXTAUTH_URL` on `web-dashboard`.

## Security

Secrets and `.env` variants are ignored. Commit only `.env.example` with blank values. If a credential is ever committed, revoke it immediately and remove it from Git history before pushing.
