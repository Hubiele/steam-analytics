# Steam Analytics

A small Node.js/TypeScript service that pulls Steam achievement unlocks, stores them in Postgres, and exposes a simple dashboard + API.

## Features

- Sync achievements from Steam for a configured user
- Store unlock events in Postgres (deduplicated per user/game/achievement)
- Dashboard (static HTML) that renders basic statistics from stored events
- Optional background poller that periodically syncs and sends webhooks for newly discovered unlocks
- Optional debug routes for local testing

## Tech stack

- Node.js + TypeScript
- Fastify
- Postgres
- Docker Compose (recommended for local dev)

## Getting started (Docker Compose)

1. Create a `.env` file from `.env.example` and set:

   - `STEAM_API_KEY`
   - `STEAM_STEAMID64`

2. Start services:

```bash
docker compose up --build
```

3. Open the dashboard:

- http://localhost:3001/

## Environment variables

Required:

- `STEAM_API_KEY` – Steam Web API key
- `STEAM_STEAMID64` – SteamID64 for the user to track

Optional:

- `PORT` – server port (default: `3001`)
- `ENABLE_POLLER` – enable background sync/webhook poller (default: `true`)
- `POLL_INTERVAL_SECONDS` – poll interval in seconds (default: `60`)
- `STEAM_MAX_GAMES` – max owned games to process (0 = all; default: `50`)
- `MAX_NEW_EVENTS_RETURNED` – limits the amount of newly inserted events returned in the sync summary (default: `50`)
- `ENABLE_DEBUG_ROUTES` – registers `/debug/*` endpoints (default: `false`)

## API

### Core

- `GET /health`
- `GET /db/health`
- `GET /steam/owned-games`
- `POST /webhooks` – register a webhook target

### Dashboard data

- `GET /dashboard/summary`
- `GET /dashboard/achievements-by-weekday`
- `GET /dashboard/unlocks-by-day?days=30`
- `GET /dashboard/cumulative-achievements-by-month?months=120`
- `GET /dashboard/games-unlocks?limit=20`
- `GET /dashboard/games-progress?limit=20`
- `GET /dashboard/top-games?limit=10`
- `GET /dashboard/recent-achievements?limit=20`

### Debug (requires `ENABLE_DEBUG_ROUTES=true`)

- `POST /debug/steam/sync`
- `POST /debug/steam/poll-once`
- `GET /debug/steam/achievements?appId=440`
- `GET /debug/steam/owned-games`
- `POST /debug/seed`
- `POST /debug/receiver`

## Postman

A Postman collection is included as `./postman` (JSON). Import it into Postman and set `baseUrl` if needed.
