-- Migration 0007: 휴가 및 알림 기능

-- 휴가 신청 테이블
CREATE TABLE IF NOT EXISTS vacation_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  vacation_date TEXT NOT NULL,   -- YYYY-MM-DD
  reason TEXT,
  message_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vacation_entries_guild_date
  ON vacation_entries(guild_id, vacation_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vacation_entries_user_date
  ON vacation_entries(guild_id, discord_user_id, vacation_date);

-- guild_settings 신규 컬럼
ALTER TABLE guild_settings ADD COLUMN notification_channel_id TEXT;
ALTER TABLE guild_settings ADD COLUMN vacation_channel_id TEXT;
ALTER TABLE guild_settings ADD COLUMN vacation_webhook_id TEXT;
ALTER TABLE guild_settings ADD COLUMN vacation_webhook_token TEXT;
