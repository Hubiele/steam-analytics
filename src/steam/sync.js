import { getOwnedGames } from "./ownedGames.js";
import { getPlayerAchievements } from "./client.js";
import { insertAchievementEvent } from "../repositories/achievements.js";
import { upsertGame } from "../repositories/games.js";
import { upsertGameAchievementTotal } from "../repositories/gameTotals.js";
function envNumber(name, fallback) {
    const v = process.env[name];
    const n = v ? Number(v) : fallback;
    return Number.isFinite(n) ? n : fallback;
}
/**
 * Sync Steam achievements for the configured user and store new unlock events.
 * Returns a summary that is used by the poller and debug endpoints.
 */
export async function syncSteamAchievementsForConfiguredUser() {
    const steamUserId = process.env.STEAM_STEAMID64;
    if (!steamUserId)
        throw new Error("Missing STEAM_STEAMID64 in environment.");
    const maxGames = envNumber("STEAM_MAX_GAMES", 50);
    const maxNewEventsToReturn = envNumber("MAX_NEW_EVENTS_RETURNED", 50);
    const games = await getOwnedGames();
    games.sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0));
    const selected = maxGames <= 0 ? games : games.slice(0, maxGames);
    const effectiveMaxGames = selected.length;
    let gamesProcessed = 0;
    let apiFailures = 0;
    let newUnlocksInserted = 0;
    const failedAppIds = [];
    const perAppInsertedSample = [];
    // Collected per sync run (not global) so the poller can notify only for new rows.
    const newEvents = [];
    for (const g of selected) {
        gamesProcessed++;
        await upsertGame({
            appId: g.appid,
            name: g.name ?? null,
            playtimeForever: g.playtime_forever ?? 0,
        });
        try {
            const r = await getPlayerAchievements(g.appid);
            await upsertGameAchievementTotal({
                appId: g.appid,
                totalAchievements: r.achievements.length,
            });
            const unlocked = r.achievements.filter((a) => a.achieved === 1);
            let insertedForThisApp = 0;
            for (const a of unlocked) {
                const achievedAt = a.unlocktime
                    ? new Date(a.unlocktime * 1000).toISOString()
                    : new Date().toISOString();
                const event = {
                    steamUserId,
                    appId: g.appid,
                    achievementKey: a.apiname,
                    // MVP: use the API name; can be enriched later using schema endpoints.
                    achievementName: a.apiname,
                    achievedAt,
                };
                const inserted = await insertAchievementEvent(event);
                if (inserted) {
                    newUnlocksInserted++;
                    insertedForThisApp++;
                    if (newEvents.length < maxNewEventsToReturn) {
                        newEvents.push(event);
                    }
                }
            }
            if (perAppInsertedSample.length < 10 && insertedForThisApp > 0) {
                perAppInsertedSample.push({
                    appid: g.appid,
                    inserted: insertedForThisApp,
                });
            }
        }
        catch {
            apiFailures++;
            if (failedAppIds.length < 20) {
                failedAppIds.push(g.appid);
            }
        }
    }
    return {
        maxGames,
        effectiveMaxGames,
        gamesConsidered: games.length,
        gamesProcessed,
        apiFailures,
        failedAppIdsSample: failedAppIds,
        newUnlocksInserted,
        newUnlocksInsertedPerAppSample: perAppInsertedSample,
        newEventsSample: newEvents,
    };
}
//# sourceMappingURL=sync.js.map