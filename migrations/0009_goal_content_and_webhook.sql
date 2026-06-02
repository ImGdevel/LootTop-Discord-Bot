-- Migration 0009: 간단 목표 제출 지원
ALTER TABLE user_daily_goals ADD COLUMN goal_content TEXT;
ALTER TABLE guild_settings ADD COLUMN goal_webhook_id TEXT;
ALTER TABLE guild_settings ADD COLUMN goal_webhook_token TEXT;
