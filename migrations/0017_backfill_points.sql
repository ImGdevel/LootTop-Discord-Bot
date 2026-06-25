-- 포인트 기능(0016) 이전 체크인 이력을 역산하여 total_points 반영
-- 주 경계: 월요일 기준 (getWeekStartDate 로직과 동일)
-- 규칙: 평일 인증 +100p, 주말 인증 +150p, 한 주 평일 5회 달성 시 +300p 보너스
-- 기존 값을 덮어쓰므로 중복 적용 없음

UPDATE users
SET total_points = COALESCE((
  SELECT SUM(
    week_base_points + CASE WHEN weekday_count >= 5 THEN 300 ELSE 0 END
  )
  FROM (
    SELECT
      dce.guild_id,
      dce.discord_user_id,
      date(dcc.checkin_date,
        '-' || CASE CAST(strftime('%w', dcc.checkin_date) AS INTEGER)
          WHEN 0 THEN 6 ELSE CAST(strftime('%w', dcc.checkin_date) AS INTEGER) - 1
        END || ' days'
      ) AS week_monday,
      SUM(CASE
        WHEN CAST(strftime('%w', dcc.checkin_date) AS INTEGER) IN (0, 6) THEN 150
        ELSE 100
      END) AS week_base_points,
      SUM(CASE
        WHEN CAST(strftime('%w', dcc.checkin_date) AS INTEGER) BETWEEN 1 AND 5 THEN 1
        ELSE 0
      END) AS weekday_count
    FROM daily_checkin_entries dce
    JOIN daily_checkin_cycles dcc ON dcc.id = dce.daily_checkin_cycle_id
    WHERE dce.status IN ('valid', 'late')
      AND dce.guild_id = users.guild_id
      AND dce.discord_user_id = users.discord_user_id
    GROUP BY dce.guild_id, dce.discord_user_id, week_monday
  )
), 0);
