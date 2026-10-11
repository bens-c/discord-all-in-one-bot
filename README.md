# Discord All-in-One Bot

An extensible Discord bot foundation for moderation, tickets, economy, leveling, security, giveaways, and a modern web dashboard. The bot and Docker-ready dashboard are available together in this checkout.

## Features

- 27 slash-command groups for information, moderation, tickets, economy, leveling, giveaways, configuration, and security
- Permission-aware moderation with warnings and an optional modlog channel
- Ticket channels with private permission overwrites and a configurable support role
- Persistent economy, XP/levels, giveaways, and per-server settings
- Local JSON storage for all persistent bot data
- Welcome messages, autoroles, anti-invite protection, and anti-spam timeouts
- Environment-based configuration with no committed credentials and PM2 production configuration
- Next.js dashboard in `dashboard/`, with Docker Compose and automatic HTTPS

## Repository layout

- `src/`: Discord bot with local JSON storage
- `dashboard/`: Next.js dashboard and Docker/HTTPS deployment

## Prerequisites

- Node.js 20 or newer
- A Discord application and bot user
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

## Local storage

All persistent bot data (server settings, warnings, economy, levels and giveaways) is always saved locally in `data/bot-data.json`, relative to the working directory. PM2 fixes the working directory to this repository. No database service is required; legacy `MONGODB_URI` and `MONGODB_DB` values are ignored.

Existing local data is loaded on startup. Writes use a temporary file and atomic rename; corrupt local files cause startup to fail rather than being overwritten. Back up the `data` directory regularly and run only one bot process against it. Previous MongoDB-only data is not automatically imported.

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

## Dashboard hosting with Docker

The `dashboard/` directory contains the website and its Docker deployment. See [dashboard/README.md](dashboard/README.md) for domain setup, Discord OAuth configuration, HTTPS, updates and troubleshooting.

```bash
cd dashboard
cp .env.example .env
# Fill in the domain and Discord credentials as documented.
docker compose up -d --build
```

The dashboard can run on a separate server; the bot continues to store its data locally on the bot host.

## PM2 setup

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

## Development

Run `npm run check` and `npm test` before committing. The dashboard source was brought over from `origin/web-dashboard`; keep bot and dashboard changes independently reviewable.

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
