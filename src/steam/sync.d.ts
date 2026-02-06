/**
 * One "unlock event" that was newly inserted during this sync.
 */
type NewAchievementEvent = {
    steamUserId: string;
    appId: number;
    achievementKey: string;
    achievementName: string;
    achievedAt: string;
};
/**
 * Sync Steam achievements for the configured user and store new unlock events.
 * Returns a summary that is used by the poller and debug endpoints.
 */
export declare function syncSteamAchievementsForConfiguredUser(): Promise<{
    maxGames: number;
    effectiveMaxGames: number;
    gamesConsidered: number;
    gamesProcessed: number;
    apiFailures: number;
    failedAppIdsSample: number[];
    newUnlocksInserted: number;
    newUnlocksInsertedPerAppSample: {
        appid: number;
        inserted: number;
    }[];
    newEventsSample: NewAchievementEvent[];
}>;
export {};
//# sourceMappingURL=sync.d.ts.map