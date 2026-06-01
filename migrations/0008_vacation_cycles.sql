-- Migration 0008: 주간 휴가 스레드 사이클
CREATE TABLE IF NOT EXISTS weekly_vacation_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(guild_id, week_start_date)
);
