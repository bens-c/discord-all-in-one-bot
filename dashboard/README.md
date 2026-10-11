# Kyrox Dashboard mit Docker hosten

Das Dashboard läuft unabhängig vom Bot auf einem externen Server. Es liest Serverinformationen, Kanäle, Rollen und Audit-Logs über die Discord-API. Anmeldung ist auf Mitglieder mit „Server verwalten“ oder Administrator-Rechten im konfigurierten Discord-Server beschränkt.

Der Bot kann auf seinem bisherigen Rechner weiterlaufen. Seine lokalen Einstellungen, Coins, Level, Verwarnungen und Giveaways bleiben dort in `data/bot-data.json`; dieses Dashboard liest oder bearbeitet diese Datei nicht. MongoDB wird nicht benötigt.

## Voraussetzungen

- Linux-Server mit Docker Engine und Docker Compose v2 oder neuer.
- Eine Domain, deren DNS-A/AAAA-Einträge auf diesen Server zeigen. Nur einen AAAA-Eintrag setzen, wenn IPv6 tatsächlich funktioniert.
- Eingehend TCP 80 und 443 freigeben; UDP 443 ist optional für HTTP/3. Diese Ports müssen frei sein.
- Ausgehend Zugriff auf Discord, Docker Hub, npm und die Zertifizierungsstelle.
- Bei kleinen Servern das Image auf einem Rechner mit mehr Arbeitsspeicher für die Zielarchitektur bauen und über eine Registry übertragen.

## Installation

Den vollständigen `dashboard`-Ordner auf den Server kopieren (ohne `node_modules`, `.next` oder lokale Geheimnisse). Alle folgenden Befehle in diesem Ordner ausführen:

```sh
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
```

`.env` mit einem Editor ausfüllen:

| Variable | Wert |
| --- | --- |
| `DASHBOARD_DOMAIN` | z. B. `dashboard.example.com`, ohne Protokoll/Pfad |
| `DISCORD_TOKEN` | Token des bestehenden Bots |
| `GUILD_ID` | ID deines Discord-Servers |
| `CLIENT_ID` | Discord Application ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 Client Secret derselben Discord-Anwendung |
| `SESSION_SECRET` | Ausgabe von `openssl rand -hex 32`; dauerhaft beibehalten |

Im [Discord Developer Portal](https://discord.com/developers/applications) unter deiner Anwendung → OAuth2 → Redirects exakt diese URL eintragen:

```text
https://dashboard.example.com/api/auth/callback/discord
```

`dashboard.example.com` durch deine Domain ersetzen. Compose setzt `DISCORD_REDIRECT_URI` automatisch aus `DASHBOARD_DOMAIN`. Der Bot muss Mitglied des Servers sein; für Audit-Logs benötigt er „Audit-Log anzeigen“.

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 dashboard caddy
```

Anschließend `https://dashboard.example.com` öffnen und mit Discord anmelden. Caddy stellt das HTTPS-Zertifikat automatisch aus und erneuert es. Die Secure-Login-Cookies benötigen HTTPS. Port 3000 ist nur im internen Docker-Netz erreichbar.

## Updates und Betrieb

Nach dem Kopieren neuer Quelldateien:

```sh
docker compose up -d --build
docker compose logs --tail=100 dashboard
```

Neustart und Stopp:

```sh
docker compose restart
docker compose down
```

`restart: unless-stopped` startet die Container nach einem Serverneustart erneut, sofern Docker automatisch startet. Der Healthcheck prüft `/api/health`; er bestätigt die Erreichbarkeit der Anwendung, nicht die Gültigkeit der Discord-Zugangsdaten.

Geheimnisse werden ausschließlich beim Containerstart eingebunden und nicht in das Image kopiert. `.env` sicher aufbewahren und sichern. Sitzungen liegen als signierte Cookies im Browser; ein Wechsel von `SESSION_SECRET` meldet alle Benutzer ab. Caddy-Zertifikate liegen in den Docker-Volumes `caddy_data` und `caddy_config`; `docker compose down -v` würde diese löschen.

## Bereits vorhandener Reverse Proxy

Falls bereits Traefik, nginx oder Caddy die Ports 80/443 belegt, nur den Dashboard-Service starten und im eigenen Proxy HTTPS konfigurieren. Für einen Proxy direkt auf dem Host eine Datei `compose.override.yaml` ergänzen:

```yaml
services:
  dashboard:
    ports:
      - "127.0.0.1:3000:3000"
```

Dann `docker compose up -d --build dashboard` ausführen und an `http://127.0.0.1:3000` weiterleiten. `DASHBOARD_DOMAIN` muss weiterhin die öffentliche HTTPS-Domain enthalten. Den mitgelieferten Caddy-Service in dieser Variante nicht starten. Bei einem Container-Proxy ein gemeinsames Docker-Netz verwenden und an `dashboard:3000` weiterleiten.

## Fehlersuche

- **HTTPS nicht erreichbar:** DNS, Firewall, Portbelegung und `docker compose logs caddy` prüfen.
- **Discord lehnt Redirect ab:** Die Redirect-URL muss exakt mit Domain und `/api/auth/callback/discord` übereinstimmen.
- **Login nicht erlaubt:** Das Discord-Konto benötigt „Server verwalten“ oder Administrator im Server aus `GUILD_ID`.
- **Keine Audit-Logs:** Dem Bot die Berechtigung „Audit-Log anzeigen“ geben.
- **Ungültiger Bot-Token:** `.env` korrigieren und `docker compose up -d --force-recreate dashboard` ausführen.

## Ohne Docker entwickeln

Node.js 24 verwenden, `npm ci` ausführen und `.env.example` nach `.env.local` kopieren. Für direkten Betrieb `DISCORD_REDIRECT_URI` ausdrücklich setzen. `npm run build` erstellt den Next.js-Produktionsbuild; `npm start` startet ihn. Für vollständige OAuth-Tests eine HTTPS-Adresse verwenden.
