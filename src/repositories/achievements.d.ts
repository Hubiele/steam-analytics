/**
 * Inserted achievement unlock event (deduplicated by DB constraint).
 */
export type AchievementEventInsert = {
    steamUserId: string;
    appId: number;
    achievementKey: string;
    achievementName?: string;
    achievedAt: string;
};
export declare function insertAchievementEvent(e: AchievementEventInsert): Promise<boolean>;
//# sourceMappingURL=achievements.d.ts.map