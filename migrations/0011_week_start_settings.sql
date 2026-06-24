-- Migration 0011: Configurable week start day and time
-- 주차 시작 요일과 시각을 설정 가능하게 한다.
-- week_start_day: 0=일, 1=월(기본), 2=화, ..., 6=토
-- week_start_time: HH:MM 형식 (기본 '00:00')
-- 예) 일요일 01:00 → 일 01:00 ~ 다음 일 00:59 를 한 주차로 간주

ALTER TABLE guild_settings ADD COLUMN week_start_day  INTEGER NOT NULL DEFAULT 1;
ALTER TABLE guild_settings ADD COLUMN week_start_time TEXT    NOT NULL DEFAULT '00:00';
