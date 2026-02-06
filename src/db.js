import { Pool } from "pg";
/**
 * Postgres connection pool shared across the app.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("Missing DATABASE_URL in environment.");
}
export const pool = new Pool({ connectionString });
/**
 * Simple query to verify DB connectivity.
 */
export async function dbHealthcheck() {
    const result = await pool.query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1;
}
//# sourceMappingURL=db.js.map