import { pool } from "../db.js";

/**
 * Minimal model for outbound webhook delivery targets.
 */
export type WebhookTarget = {
  id: number;
  url: string;
};

export async function listWebhookTargets(): Promise<WebhookTarget[]> {
  const result = await pool.query(
    `SELECT id, url FROM webhook_targets ORDER BY id`,
  );
  return result.rows;
}
