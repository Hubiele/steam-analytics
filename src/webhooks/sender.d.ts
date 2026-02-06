/**
 * Payload delivered to registered webhook targets.
 */
export type AchievementWebhookPayload = {
    type: "achievement_unlocked";
    steamUserId: string;
    appId: number;
    achievementKey: string;
    achievementName?: string;
    achievedAt: string;
};
/**
 * Send the payload to all registered webhook targets.
 */
export declare function sendAchievementWebhooks(payload: AchievementWebhookPayload): Promise<({
    targetId: number;
    url: string;
    status: number;
    ok: boolean;
    error?: never;
} | {
    ok: boolean;
    error: string;
})[]>;
//# sourceMappingURL=sender.d.ts.map