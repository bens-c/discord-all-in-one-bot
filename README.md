# Discord All-in-One Bot

An extensible Discord bot foundation for moderation, tickets, economy, leveling, security, giveaways, and a modern web dashboard. The stable bot lives on `main`; dashboard development lives on `web-dashboard`.

## Features

- 27 slash-command groups for information, moderation, tickets, economy, leveling, giveaways, configuration, and security
- Permission-aware moderation with warnings and an optional modlog channel
- Ticket channels with private permission overwrites and a configurable support role
- Persistent economy, XP/levels, giveaways, and per-server settings
- MongoDB storage with an automatic local JSON fallback
- Welcome messages, autoroles, anti-invite protection, and anti-spam timeouts
- Environment-based configuration with no committed credentials and PM2 production configuration
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
2. Add a bot, copy its token into local `DISCORD_TOKEN`, and enable **Server Members Intent** and **Message Content Intent** on the Bot page.
3. Copy the application ID to `CLIENT_ID`.
4. Invite the bot with the `bot` and `applications.commands` scopes.
5. During development, set `GUILD_ID` for immediate guild command updates.

## MongoDB setup

Create a database user with least-privilege access and place its connection string only in local `MONGODB_URI`. Restrict network access in MongoDB Atlas or your firewall. `MONGODB_DB` defaults to `kyrox_bot`. Without `MONGODB_URI`, the bot stores data in the ignored local file `data/bot-data.json`.

## Environment configuration

All supported keys are documented in `.env.example`. Example values are intentionally blank. Dashboard-only OAuth values are used on the `web-dashboard` branch.

## Slash command deployment

```bash
npm run deploy:commands
```

Run this after every command-definition update. With `GUILD_ID` configured, changes appear on that server immediately.

## Commands

- Information: `/help`, `/ping`, `/serverinfo`, `/userinfo`, `/avatar`
- Moderation: `/clear`, `/kick`, `/ban`, `/unban`, `/timeout`, `/untimeout`, `/warn`, `/lock`, `/unlock`, `/slowmode`, `/role`, `/nick`
- Tickets: `/ticket setup`, `/ticket open`, `/ticket close`, `/ticket add`, `/ticket remove`
- Economy and levels: `/balance`, `/daily`, `/work`, `/pay`, `/leaderboard`, `/rank`
- Giveaways: `/giveaway start`, `/giveaway end`, `/giveaway reroll`
- Configuration and security: `/config show`, `/config welcome`, `/config logs`, `/config autorole`, `/security show`, `/security antiinvite`, `/security antispam`

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

Copy `dashboard/.env.example` to `dashboard/.env.local` and add the bot and Discord OAuth settings. The dynamic dashboard fetches current server, channel, role, presence, boost, and audit-log data through its server-only API route. Responses are not cached, and the visible dashboard refreshes automatically every 30 seconds. Bot and OAuth secrets are never returned to the browser. Only Discord members of the configured server with Administrator or Manage Server permission can sign in. Audit-log activity requires the bot to have the **View Audit Log** permission.

### Render deployment

The repository includes a Render Blueprint. Create a new Blueprint from `render.yaml` on the `web-dashboard` branch and supply `DISCORD_TOKEN`, `GUILD_ID`, `CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `SESSION_SECRET` as Render environment variables. Add `https://discord-all-in-one-dashboard.onrender.com/api/auth/callback/discord` as an OAuth2 redirect in the Discord Developer Portal. Render uses `dashboard` as the root directory, builds with `npm ci && npm run build`, starts with `npm start`, and checks `/api/health`.

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
