import { pool } from "../db.js";
export async function listWebhookTargets() {
    const result = await pool.query(`SELECT id, url FROM webhook_targets ORDER BY id`);
    return result.rows;
}
//# sourceMappingURL=webhookTargets.js.map