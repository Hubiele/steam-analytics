/**
 * Minimal Steam Web API client for player achievements.
 */
type SteamAchievement = {
    apiname: string;
    achieved: number;
    unlocktime?: number;
};
export declare function getPlayerAchievements(appId: number): Promise<{
    steamID: string | null;
    gameName: string | null;
    achievements: SteamAchievement[];
}>;
export {};
//# sourceMappingURL=client.d.ts.map