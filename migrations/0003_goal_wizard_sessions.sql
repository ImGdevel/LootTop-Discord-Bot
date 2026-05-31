-- Migration 0003: Goal Wizard Sessions
-- 목표 작성 wizard 중간 상태 임시 저장
-- expires_at 기준으로 30분 후 만료 (Cron 또는 조회 시 정리)

CREATE TABLE IF NOT EXISTS goal_wizard_sessions (
  id               TEXT    NOT NULL PRIMARY KEY,
  guild_id         TEXT    NOT NULL,
  discord_user_id  TEXT    NOT NULL,
  week_start_date  TEXT    NOT NULL,
  goal_labels_json TEXT    NOT NULL DEFAULT '[]',
  proof_types_json TEXT    NOT NULL DEFAULT '{}',
  rest_days_json   TEXT    NOT NULL DEFAULT '["토","일"]',
  expires_at       TEXT    NOT NULL,
  created_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goal_wizard_sessions_user
  ON goal_wizard_sessions (guild_id, discord_user_id, expires_at);
