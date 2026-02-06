# Steam Analytics

This project was made for the **Recruitment – Steam Analytics** task.

It monitors a Steam user’s achievements, stores unlock events in Postgres, and sends **webhook notifications** when new achievements are found. It also serves a small dashboard that shows basic statistics.

## What is in this repository

This repo runs as **two containers** with Docker Compose:

1. **API service (Node.js + TypeScript + Fastify)**
   - Polls Steam (manual or background poller)
   - Stores new achievement unlocks in Postgres (deduplicated)
   - Sends webhooks to registered targets
   - Serves the dashboard and dashboard API endpoints

2. **Database (Postgres)**
   - Stores unlock events and webhook targets

A **simple webhook receiver endpoint** is also included for local testing (`POST /debug/receiver`). It logs received webhook payloads.

---

## How it works (simple flow)

1. **Sync from Steam**
   - Fetch owned games for the configured Steam user
   - For each game: fetch achievements and find which ones are unlocked
   - Insert new unlock events into the database (duplicates are ignored)

2. **Send webhooks**
   - When new unlock events are inserted, the service sends one webhook per new event
   - Webhooks are sent to every registered target URL

3. **Dashboard**
   - The dashboard reads statistics from the database and renders them in the browser

---

## Dashboard statistics

The dashboard shows the statistics requested in the task:

- Total games that you have achievements on (games with at least 1 unlocked achievement)
- Total amount of unlocked achievements
- Average unlocked achievements per game (only games with ≥1 unlock)
- Best streak of days with unlocks (computed in `Europe/Oslo` time)
- Achievements by weekday (computed in `Europe/Oslo` time)
- A graph of cumulative achievements over time (monthly buckets)

Open the dashboard at:

- `http://localhost:3001/`

---

## Quick start (Docker Compose)

### 1) Create `.env`

Copy the example file:

```bash
cp .env.example .env
```

Set at least:

- `STEAM_API_KEY`
- `STEAM_STEAMID64`

### 2) Start everything

You can run in the foreground:
```bash
docker compose up --build
```

Or in the background (detached):

```bash
docker compose up --build -d
```

The latter (detached) may be more stable on some Windows setups.

That’s it. The database schema is created automatically on first run (from `./sql/001_init.sql`).

If `ENABLE_POLLER=true` in `.env`, the poller syncs with steam automatically on startup and then continue polling on an interval.

If `ENABLE_POLLER=false`, you must trigger sync/poll manually to update the database.

---

## Environment variables

Required:

- `STEAM_API_KEY` – Steam Web API key
- `STEAM_STEAMID64` – SteamID64 for the user to track

Optional settings:

- `PORT` – server port (default: `3001`)
- `ENABLE_POLLER` – enable background sync + webhook sender (default: `true`)
- `POLL_INTERVAL_SECONDS` – poll interval in seconds (default: `60`)
- `STEAM_MAX_GAMES` – limit how many owned games to process (0 = all)
- `MAX_NEW_EVENTS_RETURNED` – limits how many newly inserted events are returned in the sync summary (default: `50`)
- `ENABLE_DEBUG_ROUTES` – registers `/debug/*` endpoints (default: `true` in docker-compose and `.env.example`)

Database (mostly for local dev without compose):

- `DATABASE_URL` – connection string for Postgres (docker compose sets this automatically inside the API container)

---

## API documentation

Base URL (default): `http://localhost:3001`

### Health

- `GET /health` – server health
- `GET /db/health` – database health

### Webhook registration

- `POST /webhooks` – register a webhook target URL

Request body:

```json
{ "url": "https://example.com/webhook" }
```

Response:

```json
{ "ok": true, "webhook": { "id": 1, "url": "...", "created_at": "..." } }
```

### Webhook payload

When a new achievement is inserted, the service sends:

```json
{
  "type": "achievement_unlocked",
  "steamUserId": "7656119...",
  "appId": 440,
  "achievementKey": "ACH_KEY",
  "achievementName": "Optional name",
  "achievedAt": "2026-02-06T12:34:56.000Z"
}
```

### Steam

- `GET /steam/owned-games` – returns a small owned-games summary used by the dashboard

### Dashboard endpoints

- `GET /dashboard/summary`
- `GET /dashboard/achievements-by-weekday`
- `GET /dashboard/unlocks-by-day?days=30`
- `GET /dashboard/cumulative-achievements-by-month?months=120`
- `GET /dashboard/games-unlocks?limit=20`
- `GET /dashboard/games-progress?limit=20`
- `GET /dashboard/top-games?limit=10`
- `GET /dashboard/recent-achievements?limit=20`

### Debug endpoints (requires `ENABLE_DEBUG_ROUTES=true`)

These are for local testing and inspection:

- `POST /debug/steam/sync` – sync Steam → DB (no webhooks)
- `POST /debug/steam/poll-once` – sync Steam → DB and send webhooks for newly inserted events
- `GET /debug/steam/achievements?appId=440` – fetch achievements directly from Steam for one game
- `GET /debug/steam/owned-games` – alias for `/steam/owned-games`
- `POST /debug/seed` – inserts a small test event and sends webhooks
- `POST /debug/receiver` – a local webhook receiver that logs incoming payloads

---

## Testing guide

### Option A: End-to-end test without Steam

1. Start services:

```bash
docker compose up --build
```

2. Register the local receiver as a webhook target:

```bash
curl -X POST http://localhost:3001/webhooks \
  -H "content-type: application/json" \
  -d '{"url":"http://localhost:3001/debug/receiver"}'
```

3. Create a test event and send webhooks:

```bash
curl -X POST http://localhost:3001/debug/seed
```

4. Check the API logs. You should see `Webhook received`.

### Option B: Real Steam test

1. Set `STEAM_API_KEY` and `STEAM_STEAMID64` in `.env`
2. Start services:

```bash
docker compose up --build
```

3. Trigger one poll manually:

```bash
curl -X POST http://localhost:3001/debug/steam/poll-once
```

4. Open the dashboard:

- `http://localhost:3001/`

Note: Steam may return limited data if the profile/game stats are private.

---

## Postman / Insomnia

A Postman collection is included as `./postman` (JSON).

Import it into Postman and set the collection variable:

- `baseUrl = http://localhost:3001`
