-- ============================================================
-- Migration 0002: Channel-based Study Schema
-- LoopTop DiscordBot V2
-- ============================================================
-- 목적:
-- - 기존 단순 weekly_plans / daily_checkins 구조를
--   채널 기반 스터디 운영 구조로 확장한다.
-- - 주간 포럼 글, 사용자 목표 항목, 일일 인증 쓰레드,
--   누적 인증 항목, 주간 리더보드 사이클을 저장한다.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- 1. guild_settings 확장
-- ------------------------------------------------------------
ALTER TABLE guild_settings ADD COLUMN study_home_channel_id TEXT;
ALTER TABLE guild_settings ADD COLUMN goal_forum_channel_id TEXT;
ALTER TABLE guild_settings ADD COLUMN leaderboard_forum_channel_id TEXT;
ALTER TABLE guild_settings ADD COLUMN goal_publish_time TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE guild_settings ADD COLUMN checkin_thread_open_time TEXT NOT NULL DEFAULT '04:00';
ALTER TABLE guild_settings ADD COLUMN checkin_thread_close_time TEXT NOT NULL DEFAULT '04:00';

-- 기존 naming과 신규 naming 공존 기간을 고려한다.
-- checkin_channel_id는 그대로 재사용한다.
-- leaderboard_channel_id는 이후 leaderboard_forum_channel_id로 이전한다.

-- ------------------------------------------------------------
-- 2. weekly_goal_cycles
-- 주간 목표 포럼 글 메타데이터
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_goal_cycles (
  id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  guild_id         TEXT    NOT NULL,
  week_start_date  TEXT    NOT NULL,
  week_end_date    TEXT    NOT NULL,
  forum_thread_id  TEXT    NOT NULL,
  title            TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  published_at     TEXT    NOT NULL,
  created_at       TEXT    NOT NULL,
  UNIQUE (guild_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_goal_cycles_guild_week
  ON weekly_goal_cycles (guild_id, week_start_date);

-- ------------------------------------------------------------
-- 3. user_daily_goals
-- 사용자별 한 주 목표 세트
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_daily_goals (
  id                    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  guild_id              TEXT    NOT NULL,
  discord_user_id       TEXT    NOT NULL,
  weekly_goal_cycle_id  INTEGER NOT NULL REFERENCES weekly_goal_cycles(id) ON DELETE CASCADE,
  goal_message_id       TEXT,
  rest_days_json        TEXT    NOT NULL,
  status                TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at            TEXT    NOT NULL,
  updated_at            TEXT    NOT NULL,
  UNIQUE (guild_id, discord_user_id, weekly_goal_cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_goals_guild_user_cycle
  ON user_daily_goals (guild_id, discord_user_id, weekly_goal_cycle_id);

-- ------------------------------------------------------------
-- 4. user_daily_goal_items
-- 목표 항목과 인증 방식
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_daily_goal_items (
  id                  INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  user_daily_goal_id  INTEGER NOT NULL REFERENCES user_daily_goals(id) ON DELETE CASCADE,
  sort_order          INTEGER NOT NULL,
  label               TEXT    NOT NULL,
  proof_type          TEXT    NOT NULL CHECK (proof_type IN ('text', 'url', 'image', 'checkbox')),
  required            INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
  created_at          TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_daily_goal_items_goal
  ON user_daily_goal_items (user_daily_goal_id, sort_order);

-- ------------------------------------------------------------
-- 5. daily_checkin_cycles
-- 날짜별 인증 쓰레드
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_checkin_cycles (
  id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  guild_id    TEXT    NOT NULL,
  checkin_date TEXT   NOT NULL,
  thread_id   TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  opens_at    TEXT    NOT NULL,
  closes_at   TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  created_at  TEXT    NOT NULL,
  UNIQUE (guild_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkin_cycles_guild_date
  ON daily_checkin_cycles (guild_id, checkin_date);

-- ------------------------------------------------------------
-- 6. daily_checkin_entries
-- 같은 날 여러 번 제출 가능한 인증 엔트리
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_checkin_entries (
  id                     INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  guild_id               TEXT    NOT NULL,
  discord_user_id        TEXT    NOT NULL,
  daily_checkin_cycle_id INTEGER NOT NULL REFERENCES daily_checkin_cycles(id) ON DELETE CASCADE,
  entry_message_id       TEXT,
  submitted_at           TEXT    NOT NULL,
  status                 TEXT    NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'late', 'discarded'))
);

CREATE INDEX IF NOT EXISTS idx_daily_checkin_entries_cycle_user
  ON daily_checkin_entries (daily_checkin_cycle_id, discord_user_id, submitted_at);

-- ------------------------------------------------------------
-- 7. daily_checkin_entry_items
-- 인증 엔트리 내부 항목
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_checkin_entry_items (
  id                      INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  daily_checkin_entry_id  INTEGER NOT NULL REFERENCES daily_checkin_entries(id) ON DELETE CASCADE,
  goal_item_id            INTEGER NOT NULL REFERENCES user_daily_goal_items(id) ON DELETE CASCADE,
  checked                 INTEGER CHECK (checked IN (0, 1)),
  text_value              TEXT,
  url_value               TEXT,
  attachment_url          TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_checkin_entry_items_entry
  ON daily_checkin_entry_items (daily_checkin_entry_id);

CREATE INDEX IF NOT EXISTS idx_daily_checkin_entry_items_goal
  ON daily_checkin_entry_items (goal_item_id);

-- ------------------------------------------------------------
-- 8. weekly_leaderboard_cycles
-- 주간 리더보드 포럼 글 메타데이터
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_leaderboard_cycles (
  id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  guild_id         TEXT    NOT NULL,
  week_start_date  TEXT    NOT NULL,
  week_end_date    TEXT    NOT NULL,
  forum_thread_id  TEXT    NOT NULL,
  title            TEXT    NOT NULL,
  published_at     TEXT    NOT NULL,
  created_at       TEXT    NOT NULL,
  UNIQUE (guild_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_cycles_guild_week
  ON weekly_leaderboard_cycles (guild_id, week_start_date);

-- ------------------------------------------------------------
-- 9. legacy tables note
-- ------------------------------------------------------------
-- 기존 weekly_plans, daily_checkins는 이행 기간 동안 유지한다.
-- 실제 전환 시점에 다음 중 하나를 선택한다.
-- 1) 백필 후 deprecated 처리
-- 2) 새 서비스만 신규 테이블 사용
-- 3) 이후 0003 마이그레이션에서 정리

