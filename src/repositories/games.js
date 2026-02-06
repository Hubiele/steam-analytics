import { pool } from "../db.js";
/**
 * Upsert basic game metadata derived from the OwnedGames Steam endpoint.
 */
export async function upsertGame(input) {
    await pool.query(`
    INSERT INTO games (app_id, name, playtime_forever, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (app_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      playtime_forever = EXCLUDED.playtime_forever,
      updated_at = NOW()
    `, [input.appId, input.name, input.playtimeForever]);
}
//# sourceMappingURL=games.js.map