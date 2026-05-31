-- ============================================================
-- Migration 0001: Initial Schema
-- LoopTop DiscordBot
-- ============================================================
-- 모든 날짜/시간(_at 컬럼)은 UTC ISO 8601 문자열로 저장한다.
-- week_start_date, week_end_date, checkin_date는
-- 서버 타임존 기준 YYYY-MM-DD 문자열로 저장한다.
-- ============================================================

-- ------------------------------------------------------------
-- 1. guild_settings
-- 서버별 운영 설정. 타임존, 채널, 리마인더 시간 등을 관리한다.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id                  TEXT    NOT NULL PRIMARY KEY,
  timezone                  TEXT    NOT NULL DEFAULT 'Asia/Seoul',
  plan_reminder_channel_id  TEXT,
  checkin_channel_id        TEXT,
  leaderboard_channel_id    TEXT,
  plan_reminder_time        TEXT,   -- HH:MM, 서버 타임존 기준
  checkin_reminder_time     TEXT,   -- HH:MM, 서버 타임존 기준
  leaderboard_publish_time  TEXT,   -- HH:MM, 서버 타임존 기준
  created_at                TEXT    NOT NULL,
  updated_at                TEXT    NOT NULL
);

-- ------------------------------------------------------------
-- 2. users
-- 표시 이름 스냅샷 저장 목적.
-- 첫 계획 작성 시 upsert, 인증 제출 시 display_name_snapshot 갱신.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  guild_id              TEXT    NOT NULL,
  discord_user_id       TEXT    NOT NULL,
  display_name_snapshot TEXT,
  created_at            TEXT    NOT NULL,
  updated_at            TEXT    NOT NULL,
  UNIQUE (guild_id, discord_user_id)
);

-- ------------------------------------------------------------
-- 3. weekly_plans
-- 유저의 주간 학습 목표. 주당 1개만 허용 (UNIQUE 제약).
-- 수정 시 upsert (기존 인증 기록 유지).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weekly_plans (
  id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  guild_id         TEXT    NOT NULL,
  discord_user_id  TEXT    NOT NULL,
  week_start_date  TEXT    NOT NULL,  -- YYYY-MM-DD (월요일)
  week_end_date    TEXT    NOT NULL,  -- YYYY-MM-DD (일요일)
  goal_text        TEXT    NOT NULL,
  target_count     INTEGER NOT NULL CHECK (target_count >= 1),
  status           TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,
  UNIQUE (guild_id, discord_user_id, week_start_date)
);

-- ------------------------------------------------------------
-- 4. daily_checkins
-- 유저의 일일 인증. 하루 1회만 허용 (UNIQUE 제약).
-- weekly_plan_id로 해당 주 계획에 연결.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_checkins (
  id               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  guild_id         TEXT    NOT NULL,
  discord_user_id  TEXT    NOT NULL,
  weekly_plan_id   INTEGER NOT NULL REFERENCES weekly_plans(id),
  checkin_date     TEXT    NOT NULL,  -- YYYY-MM-DD (서버 타임존 기준)
  content          TEXT    NOT NULL,
  proof_url        TEXT,
  created_at       TEXT    NOT NULL,
  UNIQUE (guild_id, discord_user_id, checkin_date)
);

-- ------------------------------------------------------------
-- 인덱스
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_weekly_plans_guild_week
  ON weekly_plans (guild_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week
  ON weekly_plans (guild_id, discord_user_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_plan
  ON daily_checkins (weekly_plan_id);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_guild_date
  ON daily_checkins (guild_id, checkin_date);

CREATE INDEX IF NOT EXISTS idx_users_guild_user
  ON users (guild_id, discord_user_id);
