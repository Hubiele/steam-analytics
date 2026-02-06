import { pool } from "../db.js";
/**
 * Insert a webhook target URL if it does not already exist.
 * Returns the existing row when the URL is already registered.
 */
export async function addWebhookTarget(url) {
    const result = await pool.query(`
    INSERT INTO webhook_targets (url)
    VALUES ($1)
    ON CONFLICT (url) DO NOTHING
    RETURNING id, url, created_at
    `, [url]);
    // When the URL already exists, INSERT returns zero rows.
    if (result.rowCount === 0) {
        const existing = await pool.query(`SELECT id, url, created_at FROM webhook_targets WHERE url = $1`, [url]);
        return existing.rows[0];
    }
    return result.rows[0];
}
//# sourceMappingURL=webhooks.js.map