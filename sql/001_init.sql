-- 001_init.sql
-- Executed automatically by the Postgres container on first startup (empty volume)

CREATE TABLE IF NOT EXISTS achievement_events (
  id               BIGSERIAL PRIMARY KEY,
  steam_user_id    TEXT NOT NULL,
  app_id           INT  NOT NULL,
  achievement_key  TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achieved_at      TIMESTAMPTZ NOT NULL
);

-- One unique unlock per user + game + achievement (prevents duplicates during sync/poll)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uniq_user_app_ach'
  ) THEN
    ALTER TABLE achievement_events
      ADD CONSTRAINT uniq_user_app_ach
      UNIQUE (steam_user_id, app_id, achievement_key);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_achievement_events_user_time
  ON achievement_events (steam_user_id, achieved_at DESC);

CREATE INDEX IF NOT EXISTS idx_achievement_events_user_app
  ON achievement_events (steam_user_id, app_id);

CREATE TABLE IF NOT EXISTS webhook_targets (
  id         BIGSERIAL PRIMARY KEY,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game metadata (name/playtime derived from OwnedGames)
CREATE TABLE IF NOT EXISTS games (
  app_id           INT PRIMARY KEY,
  name             TEXT,
  playtime_forever INT NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_name
  ON games (name);

-- Total number of achievements per game (derived from Steam achievements list)
CREATE TABLE IF NOT EXISTS game_achievement_totals (
  app_id             INT PRIMARY KEY,
  total_achievements INT NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
