-- Migration 0005: daily_checkin_cycles에 webhook 정보 저장
-- 인증 카드를 유저 프로필(이름+아바타)로 표시하기 위해 스레드별 웹훅 보관
ALTER TABLE daily_checkin_cycles ADD COLUMN webhook_id TEXT;
ALTER TABLE daily_checkin_cycles ADD COLUMN webhook_token TEXT;
