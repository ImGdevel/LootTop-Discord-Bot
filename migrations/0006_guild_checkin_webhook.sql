-- Migration 0006: guild_settings에 인증채널 webhook 저장
-- 사이클마다 webhook을 만들지 않고 채널당 하나의 webhook을 재사용
ALTER TABLE guild_settings ADD COLUMN checkin_webhook_id TEXT;
ALTER TABLE guild_settings ADD COLUMN checkin_webhook_token TEXT;
