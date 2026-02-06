/**
 * Dashboard read-model queries.
 * All functions in this file are read-only and return JSON-friendly values.
 */
export type DashboardSummary = {
    steamUserId: string;
    uniqueGamesWithUnlocks: number;
    totalUnlocks: number;
    unlocksLast7Days: number;
    lastUnlockedAt: string | null;
    averageAchievementsPerGame: number;
};
export declare function getDashboardSummary(steamUserId: string): Promise<DashboardSummary>;
export type UnlocksByDayRow = {
    day: string;
    unlocks: number;
};
export declare function getUnlocksByDay(steamUserId: string, days: number): Promise<UnlocksByDayRow[]>;
export type TopGameRow = {
    appId: number;
    name: string | null;
    unlocks: number;
    lastUnlockedAt: string | null;
};
export declare function getTopGames(steamUserId: string, limit: number): Promise<TopGameRow[]>;
export type RecentAchievementRow = {
    achievedAt: string;
    appId: number;
    gameName: string | null;
    achievementKey: string;
    achievementName: string;
};
export declare function getRecentAchievements(steamUserId: string, limit: number): Promise<RecentAchievementRow[]>;
export type GameUnlockStatsRow = {
    appId: number;
    gameName: string | null;
    unlockedCount: number;
    lastUnlockedAt: string | null;
};
export declare function getGameUnlockStats(steamUserId: string, limit: number): Promise<GameUnlockStatsRow[]>;
export type GameProgressRow = {
    appId: number;
    gameName: string | null;
    unlockedCount: number;
    totalAchievements: number | null;
    completionPercent: number | null;
    lastUnlockedAt: string | null;
};
export declare function getGameProgress(steamUserId: string, limit: number): Promise<GameProgressRow[]>;
export type AchievementsByWeekdayRow = {
    weekday: string;
    achievements: number;
};
export declare function getAchievementsByWeekdayOslo(steamUserId: string): Promise<AchievementsByWeekdayRow[]>;
export type BestStreak = {
    days: number;
    startDate: string | null;
    endDate: string | null;
    dates: string[];
};
export declare function getBestStreakOslo(steamUserId: string): Promise<BestStreak>;
export type CumulativeByMonthRow = {
    month: string;
    achievements: number;
    cumulativeAchievements: number;
};
export declare function getCumulativeAchievementsByMonthOslo(steamUserId: string, months: number): Promise<CumulativeByMonthRow[]>;
//# sourceMappingURL=dashboard.d.ts.map