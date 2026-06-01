-- Migration 0004: Add content/proof_url directly to daily_checkin_entries
-- goal_item 구조 없이 단순 텍스트 인증 저장
ALTER TABLE daily_checkin_entries ADD COLUMN content TEXT;
ALTER TABLE daily_checkin_entries ADD COLUMN proof_url TEXT;
