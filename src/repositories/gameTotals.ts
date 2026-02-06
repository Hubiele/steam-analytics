import { pool } from "../db.js";

/**
 * Upsert the total number of achievements for an appId.
 */
export async function upsertGameAchievementTotal(input: {
  appId: number;
  totalAchievements: number;
}) {
  await pool.query(
    `
    INSERT INTO game_achievement_totals (app_id, total_achievements, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (app_id)
    DO UPDATE SET
      total_achievements = EXCLUDED.total_achievements,
      updated_at = NOW()
    `,
    [input.appId, input.totalAchievements],
  );
}
