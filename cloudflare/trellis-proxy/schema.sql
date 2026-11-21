CREATE TABLE IF NOT EXISTS match_logs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  home_team TEXT,
  away_team TEXT,
  score TEXT,
  duration_seconds REAL NOT NULL DEFAULT 0,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_match_logs_created_at
ON match_logs(created_at DESC);
