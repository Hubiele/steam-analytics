import { pool } from "../db.js";
export async function insertAchievementEvent(e) {
    const result = await pool.query(`
    INSERT INTO achievement_events
      (steam_user_id, app_id, achievement_key, achievement_name, achieved_at)
    VALUES
      ($1, $2, $3, $4, $5)
    ON CONFLICT (steam_user_id, app_id, achievement_key) DO NOTHING
    RETURNING id
    `, [
        e.steamUserId,
        e.appId,
        e.achievementKey,
        e.achievementName ?? null,
        e.achievedAt,
    ]);
    // True only when a new row was inserted.
    return result.rowCount === 1;
}
//# sourceMappingURL=achievements.js.map