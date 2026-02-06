import { pool } from "../db.js";
export async function getDashboardSummary(steamUserId) {
    // Aggregate totals and last unlock timestamp.
    const a = await pool.query(`
    SELECT
      COUNT(DISTINCT app_id)::int AS unique_games,
      COUNT(*)::int AS total_unlocks,
      MAX(achieved_at) AS last_unlocked_at
    FROM achievement_events
    WHERE steam_user_id = $1
    `, [steamUserId]);
    // Rolling 7-day window.
    const b = await pool.query(`
    SELECT COUNT(*)::int AS unlocks_last_7_days
    FROM achievement_events
    WHERE steam_user_id = $1
      AND achieved_at >= NOW() - INTERVAL '7 days'
    `, [steamUserId]);
    const rowA = a.rows[0];
    const rowB = b.rows[0];
    const games = rowA?.unique_games ?? 0;
    const total = rowA?.total_unlocks ?? 0;
    const average = games > 0 ? Math.round((total / games) * 10) / 10 : 0; // one decimal
    const lastUnlockedAt = rowA?.last_unlocked_at
        ? new Date(rowA.last_unlocked_at).toISOString()
        : null;
    return {
        steamUserId,
        uniqueGamesWithUnlocks: games,
        totalUnlocks: total,
        unlocksLast7Days: rowB?.unlocks_last_7_days ?? 0,
        lastUnlockedAt,
        averageAchievementsPerGame: average,
    };
}
export async function getUnlocksByDay(steamUserId, days) {
    const safeDays = Math.max(1, Math.min(days, 365));
    const res = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('day', achieved_at), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS unlocks
    FROM achievement_events
    WHERE steam_user_id = $1
      AND achieved_at >= NOW() - make_interval(days => $2)
    GROUP BY 1
    ORDER BY 1 ASC
    `, [steamUserId, safeDays]);
    return res.rows.map((r) => ({
        day: r.day,
        unlocks: r.unlocks,
    }));
}
export async function getTopGames(steamUserId, limit) {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const res = await pool.query(`
    SELECT
      e.app_id::int AS app_id,
      g.name AS name,
      COUNT(*)::int AS unlocks,
      MAX(e.achieved_at) AS last_unlocked_at
    FROM achievement_events e
    LEFT JOIN games g ON g.app_id = e.app_id
    WHERE e.steam_user_id = $1
    GROUP BY e.app_id, g.name
    ORDER BY unlocks DESC, last_unlocked_at DESC
    LIMIT $2
    `, [steamUserId, safeLimit]);
    return res.rows.map((r) => ({
        appId: r.app_id,
        name: r.name ?? null,
        unlocks: r.unlocks,
        lastUnlockedAt: r.last_unlocked_at
            ? new Date(r.last_unlocked_at).toISOString()
            : null,
    }));
}
export async function getRecentAchievements(steamUserId, limit) {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const res = await pool.query(`
    SELECT
      e.achieved_at,
      e.app_id::int AS app_id,
      g.name AS game_name,
      e.achievement_key,
      e.achievement_name
    FROM achievement_events e
    LEFT JOIN games g ON g.app_id = e.app_id
    WHERE e.steam_user_id = $1
    ORDER BY e.achieved_at DESC
    LIMIT $2
    `, [steamUserId, safeLimit]);
    return res.rows.map((r) => ({
        achievedAt: new Date(r.achieved_at).toISOString(),
        appId: r.app_id,
        gameName: r.game_name ?? null,
        achievementKey: r.achievement_key,
        achievementName: r.achievement_name,
    }));
}
export async function getGameUnlockStats(steamUserId, limit) {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const res = await pool.query(`
    SELECT
      e.app_id::int AS app_id,
      g.name AS game_name,
      COUNT(*)::int AS unlocked_count,
      MAX(e.achieved_at) AS last_unlocked_at
    FROM achievement_events e
    LEFT JOIN games g ON g.app_id = e.app_id
    WHERE e.steam_user_id = $1
    GROUP BY e.app_id, g.name
    ORDER BY unlocked_count DESC, last_unlocked_at DESC
    LIMIT $2
    `, [steamUserId, safeLimit]);
    return res.rows.map((r) => ({
        appId: r.app_id,
        gameName: r.game_name ?? null,
        unlockedCount: r.unlocked_count,
        lastUnlockedAt: r.last_unlocked_at
            ? new Date(r.last_unlocked_at).toISOString()
            : null,
    }));
}
export async function getGameProgress(steamUserId, limit) {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const res = await pool.query(`
    SELECT
      e.app_id::int AS app_id,
      g.name AS game_name,
      COUNT(*)::int AS unlocked_count,
      t.total_achievements::int AS total_achievements,
      MAX(e.achieved_at) AS last_unlocked_at
    FROM achievement_events e
    LEFT JOIN games g ON g.app_id = e.app_id
    LEFT JOIN game_achievement_totals t ON t.app_id = e.app_id
    WHERE e.steam_user_id = $1
    GROUP BY e.app_id, g.name, t.total_achievements
    ORDER BY unlocked_count DESC, last_unlocked_at DESC
    LIMIT $2
    `, [steamUserId, safeLimit]);
    return res.rows.map((r) => {
        const total = r.total_achievements ?? null;
        const unlocked = r.unlocked_count;
        const completionPercent = total && total > 0 ? Math.round((unlocked / total) * 1000) / 10 : null; // one decimal
        return {
            appId: r.app_id,
            gameName: r.game_name ?? null,
            unlockedCount: unlocked,
            totalAchievements: total,
            completionPercent,
            lastUnlockedAt: r.last_unlocked_at
                ? new Date(r.last_unlocked_at).toISOString()
                : null,
        };
    });
}
export async function getAchievementsByWeekdayOslo(steamUserId) {
    const res = await pool.query(`
    SELECT
      TO_CHAR((achieved_at AT TIME ZONE 'Europe/Oslo'), 'Dy') AS weekday,
      EXTRACT(DOW FROM (achieved_at AT TIME ZONE 'Europe/Oslo'))::int AS dow,
      COUNT(*)::int AS achievements
    FROM achievement_events
    WHERE steam_user_id = $1
    GROUP BY weekday, dow
    ORDER BY dow ASC
    `, [steamUserId]);
    // Postgres DOW: 0=Sunday ... 6=Saturday. The dashboard wants Monday-first.
    const rows = res.rows.map((r) => ({
        weekday: String(r.weekday).trim(),
        dow: r.dow,
        achievements: r.achievements,
    }));
    const order = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
    const map = new Map(rows.map((r) => [r.dow, r]));
    return order.map((dow) => {
        const r = map.get(dow);
        return {
            weekday: r?.weekday ??
                (dow === 0
                    ? "Sun"
                    : dow === 1
                        ? "Mon"
                        : dow === 2
                            ? "Tue"
                            : dow === 3
                                ? "Wed"
                                : dow === 4
                                    ? "Thu"
                                    : dow === 5
                                        ? "Fri"
                                        : "Sat"),
            achievements: r?.achievements ?? 0,
        };
    });
}
export async function getBestStreakOslo(steamUserId) {
    // Find the longest streak of unique local dates with at least one unlock.
    const a = await pool.query(`
    WITH days AS (
      SELECT DISTINCT
        (DATE_TRUNC('day', achieved_at AT TIME ZONE 'Europe/Oslo'))::date AS d
      FROM achievement_events
      WHERE steam_user_id = $1
    ),
    islands AS (
      SELECT
        d,
        (d - (ROW_NUMBER() OVER (ORDER BY d))::int) AS grp
      FROM days
    ),
    streaks AS (
      SELECT
        MIN(d) AS start_date,
        MAX(d) AS end_date,
        COUNT(*)::int AS len
      FROM islands
      GROUP BY grp
      ORDER BY len DESC, MAX(d) DESC
      LIMIT 1
    )
    SELECT
      start_date,
      end_date,
      len
    FROM streaks
    `, [steamUserId]);
    const row = a.rows[0];
    if (!row) {
        return { days: 0, startDate: null, endDate: null, dates: [] };
    }
    const start = row.start_date.toISOString().slice(0, 10);
    const end = row.end_date.toISOString().slice(0, 10);
    // Expand the streak into a list of dates so the UI can render it.
    const b = await pool.query(`
    SELECT TO_CHAR(d, 'YYYY-MM-DD') AS day
    FROM generate_series($1::date, $2::date, interval '1 day') AS d
    `, [start, end]);
    return {
        days: row.len,
        startDate: start,
        endDate: end,
        dates: b.rows.map((r) => r.day),
    };
}
export async function getCumulativeAchievementsByMonthOslo(steamUserId, months) {
    const safeMonths = Math.max(1, Math.min(months, 240));
    const res = await pool.query(`
    WITH m AS (
      SELECT
        DATE_TRUNC('month', (achieved_at AT TIME ZONE 'Europe/Oslo'))::date AS month_start,
        COUNT(*)::int AS achievements
      FROM achievement_events
      WHERE steam_user_id = $1
        AND achieved_at >= NOW() - ($2 || ' months')::interval
      GROUP BY 1
      ORDER BY 1 ASC
    )
    SELECT
      TO_CHAR(month_start, 'YYYY-MM') AS month,
      achievements,
      SUM(achievements) OVER (ORDER BY month_start ASC)::int AS cumulative
    FROM m
    ORDER BY month_start ASC
    `, [steamUserId, safeMonths]);
    return res.rows.map((r) => ({
        month: r.month,
        achievements: r.achievements,
        cumulativeAchievements: r.cumulative,
    }));
}
//# sourceMappingURL=dashboard.js.map