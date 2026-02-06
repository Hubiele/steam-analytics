import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import "dotenv/config";
import Fastify, { type FastifyInstance } from "fastify";

import { dbHealthcheck } from "./db.js";
import { insertAchievementEvent } from "./repositories/achievements.js";
import { addWebhookTarget } from "./repositories/webhooks.js";
import {
  getAchievementsByWeekdayOslo,
  getBestStreakOslo,
  getCumulativeAchievementsByMonthOslo,
  getDashboardSummary,
  getGameProgress,
  getGameUnlockStats,
  getRecentAchievements,
  getTopGames,
  getUnlocksByDay,
} from "./repositories/dashboard.js";
import { getPlayerAchievements } from "./steam/client.js";
import { getOwnedGames } from "./steam/ownedGames.js";
import { syncSteamAchievementsForConfiguredUser } from "./steam/sync.js";
import { sendAchievementWebhooks } from "./webhooks/sender.js";

console.log("Steam Analytics starting...");

const app = Fastify({ logger: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Small helpers for environment variables.
 */
function envNumber(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : fallback;
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function requireSteamUserId(): string {
  const steamUserId = process.env.STEAM_STEAMID64;
  if (!steamUserId) {
    throw new Error("Missing STEAM_STEAMID64 in environment.");
  }
  return steamUserId;
}

/**
 * Static dashboard assets.
 */
app.register(fastifyStatic, {
  root: path.join(__dirname, "../public"),
  prefix: "/",
});

app.get("/", async (_req, reply) => {
  return reply.sendFile("index.html");
});

/**
 * Basic healthcheck (server is running).
 */
app.get("/health", async () => {
  return { ok: true };
});

/**
 * Database healthcheck.
 */
app.get("/db/health", async (req, reply) => {
  try {
    const ok = await dbHealthcheck();
    return { ok };
  } catch (err) {
    req.log.error(err);
    reply.code(500);
    return { ok: false };
  }
});

/**
 * Register a webhook target.
 */
app.post("/webhooks", async (req, reply) => {
  const body = req.body as { url?: string };

  if (!body?.url) {
    reply.code(400);
    return { ok: false, error: "Missing 'url' in request body." };
  }

  try {
    new URL(body.url);
  } catch {
    reply.code(400);
    return { ok: false, error: "Invalid URL." };
  }

  const saved = await addWebhookTarget(body.url);
  return { ok: true, webhook: saved };
});

/**
 * Steam: owned games summary (used by the dashboard).
 */
async function buildOwnedGamesSummary() {
  const games = await getOwnedGames();
  games.sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0));

  const max = Number(process.env.STEAM_MAX_GAMES ?? 50);
  const slice = max <= 0 ? games : games.slice(0, max);

  return {
    ok: true,
    totalOwned: games.length,
    returned: slice.length,
    sample: slice.slice(0, 10).map((g) => ({
      appid: g.appid,
      name: g.name ?? null,
      playtime_forever: g.playtime_forever ?? 0,
    })),
  };
}

app.get("/steam/owned-games", async () => {
  return buildOwnedGamesSummary();
});

/**
 * Dashboard: summary.
 */
app.get("/dashboard/summary", async (_req, reply) => {
  try {
    const steamUserId = requireSteamUserId();
    const summary = await getDashboardSummary(steamUserId);
    const bestStreak = await getBestStreakOslo(steamUserId);
    return { ok: true, summary: { ...summary, bestStreak } };
  } catch (err: any) {
    reply.code(500);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

/**
 * Dashboard: achievements by weekday (Europe/Oslo).
 */
app.get("/dashboard/achievements-by-weekday", async (_req, reply) => {
  try {
    const steamUserId = requireSteamUserId();
    const rows = await getAchievementsByWeekdayOslo(steamUserId);
    return { ok: true, timezone: "Europe/Oslo", rows };
  } catch (err: any) {
    reply.code(500);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

/**
 * Dashboard: unlocks by day (UTC day buckets).
 */
app.get("/dashboard/unlocks-by-day", async (req, reply) => {
  try {
    const steamUserId = requireSteamUserId();
    const q = req.query as { days?: string };
    const days = q.days ? Number(q.days) : 30;

    if (!Number.isFinite(days) || days <= 0) {
      reply.code(400);
      return { ok: false, error: "Use ?days=NUMBER (e.g. 30)." };
    }

    const rows = await getUnlocksByDay(steamUserId, days);
    return { ok: true, days, rows };
  } catch (err: any) {
    reply.code(500);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

/**
 * Dashboard: cumulative achievements by month (Europe/Oslo month buckets).
 */
app.get("/dashboard/cumulative-achievements-by-month", async (req, reply) => {
  try {
    const steamUserId = requireSteamUserId();
    const q = req.query as { months?: string };
    const months = q.months ? Number(q.months) : 120;

    if (!Number.isFinite(months) || months <= 0) {
      reply.code(400);
      return { ok: false, error: "Use ?months=NUMBER (e.g. 120)." };
    }

    const rows = await getCumulativeAchievementsByMonthOslo(steamUserId, months);
    return { ok: true, timezone: "Europe/Oslo", months, rows };
  } catch (err: any) {
    reply.code(500);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

/**
 * Dashboard: per-game unlock counts (sorted by unlock count).
 */
app.get("/dashboard/games-unlocks", async (req, reply) => {
  try {
    const steamUserId = requireSteamUserId();
    const q = req.query as { limit?: string };
    const limit = q.limit ? Number(q.limit) : 20;

    if (!Number.isFinite(limit) || limit <= 0) {
      reply.code(400);
      return { ok: false, error: "Use ?limit=NUMBER (e.g. 20)." };
    }

    const rows = await getGameUnlockStats(steamUserId, limit);
    return { ok: true, limit, rows };
  } catch (err: any) {
    reply.code(500);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

/**
 * Dashboard: per-game completion progress (requires game_achievement_totals).
 */
app.get("/dashboard/games-progress", async (req, reply) => {
  try {
    const steamUserId = requireSteamUserId();
    const q = req.query as { limit?: string };
    const limit = q.limit ? Number(q.limit) : 20;

    if (!Number.isFinite(limit) || limit <= 0) {
      reply.code(400);
      return { ok: false, error: "Use ?limit=NUMBER (e.g. 20)." };
    }

    const rows = await getGameProgress(steamUserId, limit);
    return { ok: true, limit, rows };
  } catch (err: any) {
    reply.code(500);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

/**
 * Dashboard: top games by unlock count.
 */
app.get("/dashboard/top-games", async (req, reply) => {
  try {
    const steamUserId = requireSteamUserId();
    const q = req.query as { limit?: string };
    const limit = q.limit ? Number(q.limit) : 10;

    if (!Number.isFinite(limit) || limit <= 0) {
      reply.code(400);
      return { ok: false, error: "Use ?limit=NUMBER (e.g. 10)." };
    }

    const rows = await getTopGames(steamUserId, limit);
    return { ok: true, limit, rows };
  } catch (err: any) {
    reply.code(500);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

/**
 * Dashboard: most recent achievements.
 */
app.get("/dashboard/recent-achievements", async (req, reply) => {
  try {
    const steamUserId = requireSteamUserId();
    const q = req.query as { limit?: string };
    const limit = q.limit ? Number(q.limit) : 20;

    if (!Number.isFinite(limit) || limit <= 0) {
      reply.code(400);
      return { ok: false, error: "Use ?limit=NUMBER (e.g. 20)." };
    }

    const rows = await getRecentAchievements(steamUserId, limit);
    return { ok: true, limit, rows };
  } catch (err: any) {
    reply.code(500);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

/**
 * Debug routes are registered only when ENABLE_DEBUG_ROUTES=true.
 */
function registerDebugRoutes(fastify: FastifyInstance) {
  /**
   * Local webhook receiver for testing webhook deliveries.
   */
  fastify.post("/debug/receiver", async (req) => {
    req.log.info({ body: req.body }, "Webhook received");
    return { ok: true };
  });

  /**
   * Manual sync only (DB insert of new achievements).
   */
  fastify.post("/debug/steam/sync", async () => {
    const summary = await syncSteamAchievementsForConfiguredUser();
    return { ok: true, summary };
  });

  /**
   * Poll once: sync + send webhooks only for newly inserted achievements.
   */
  fastify.post("/debug/steam/poll-once", async () => {
    const summary = await syncSteamAchievementsForConfiguredUser();

    const newEvents = (summary as any).newEventsSample as
      | Array<{
          steamUserId: string;
          appId: number;
          achievementKey: string;
          achievementName: string;
          achievedAt: string;
        }>
      | undefined;

    const eventsToSend = newEvents ?? [];
    const deliveries: any[] = [];

    for (const ev of eventsToSend) {
      const d = await sendAchievementWebhooks({
        type: "achievement_unlocked",
        ...ev,
      });

      deliveries.push({
        appId: ev.appId,
        achievementKey: ev.achievementKey,
        deliveries: d,
      });
    }

    return {
      ok: true,
      summary,
      webhooksSentForEvents: eventsToSend.length,
      deliveriesSample: deliveries.slice(0, 10),
    };
  });

  /**
   * Steam API passthrough: fetch and summarize achievements for an appId.
   */
  fastify.get("/debug/steam/achievements", async (req, reply) => {
    const q = req.query as { appId?: string };
    const appId = Number(q.appId);

    if (!Number.isFinite(appId)) {
      reply.code(400);
      return { ok: false, error: "Use ?appId=NUMBER." };
    }

    const result = await getPlayerAchievements(appId);
    const unlocked = result.achievements.filter((a) => a.achieved === 1);

    return {
      ok: true,
      steamID: result.steamID,
      gameName: result.gameName,
      totalAchievements: result.achievements.length,
      unlockedCount: unlocked.length,
      sampleUnlocked: unlocked.slice(0, 5),
    };
  });

  /**
   * Convenience alias to the non-debug owned games endpoint.
   */
  fastify.get("/debug/steam/owned-games", async () => {
    return buildOwnedGamesSummary();
  });

  /**
   * Seed a deterministic event for end-to-end webhook testing.
   */
  fastify.post("/debug/seed", async () => {
    const event = {
      steamUserId: "demo-user",
      appId: 440,
      achievementKey: "FIRST_WIN",
      achievementName: "First Win",
      achievedAt: new Date().toISOString(),
    };

    const inserted = await insertAchievementEvent(event);

    if (!inserted) {
      return { ok: true, inserted: false, deliveries: [] };
    }

    const deliveries = await sendAchievementWebhooks({
      type: "achievement_unlocked",
      ...event,
    });

    return { ok: true, inserted: true, deliveries };
  });
}

const enableDebugRoutes = envBool("ENABLE_DEBUG_ROUTES", false);
if (enableDebugRoutes) {
  app.log.info("Debug routes enabled (ENABLE_DEBUG_ROUTES=true).");
  registerDebugRoutes(app);
} else {
  app.log.info("Debug routes disabled (ENABLE_DEBUG_ROUTES=false).");
}

const port = Number(process.env.PORT ?? 3001);
const host = "0.0.0.0";

async function start() {
  await app.listen({ port, host });
  app.log.info(`Server running on ${host}:${port}`);

  // Optional background poller.
  const enablePoller = envBool("ENABLE_POLLER", true);
  const intervalSec = envNumber("POLL_INTERVAL_SECONDS", 60);

  if (!enablePoller) {
    app.log.info("Poller disabled (ENABLE_POLLER=false).");
    return;
  }

  app.log.info(
    { intervalSec },
    "Poller enabled: will sync + send webhooks for new achievements.",
  );

  const runPollOnce = async () => {
    try {
      const summary = await syncSteamAchievementsForConfiguredUser();

      const newEvents = (summary as any).newEventsSample as
        | Array<{
            steamUserId: string;
            appId: number;
            achievementKey: string;
            achievementName: string;
            achievedAt: string;
          }>
        | undefined;

      const eventsToSend = newEvents ?? [];

      for (const ev of eventsToSend) {
        await sendAchievementWebhooks({
          type: "achievement_unlocked",
          ...ev,
        });
      }

      app.log.info(
        {
          gamesProcessed: (summary as any).gamesProcessed,
          newUnlocksInserted: (summary as any).newUnlocksInserted,
          webhooksSent: eventsToSend.length,
        },
        "Poll cycle complete.",
      );
    } catch (err) {
      app.log.error(err, "Poll cycle failed.");
    }
  };

  // Run once at startup.
  runPollOnce();

  // Run periodically.
  setInterval(runPollOnce, intervalSec * 1000);
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
