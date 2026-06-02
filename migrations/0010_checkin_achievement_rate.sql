-- Migration 0010: 인증 항목에 자기 평가 달성률 추가
ALTER TABLE daily_checkin_entries ADD COLUMN achievement_rate INTEGER;
