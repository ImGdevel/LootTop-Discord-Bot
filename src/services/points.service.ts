import { addPoints } from "../db/users.repository.js";

const WEEKDAY_POINTS = 100;
const WEEKEND_POINTS = 150;
const WEEKDAY_COMPLETION_BONUS = 300;
const WEEKDAYS_REQUIRED = 5;

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + "T12:00:00Z").getUTCDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

export async function awardCheckinPoints(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  checkinDate: string,
  weekStartDate: string
): Promise<number> {
  const weekend = isWeekend(checkinDate);
  const base = weekend ? WEEKEND_POINTS : WEEKDAY_POINTS;
  await addPoints(db, guildId, discordUserId, base);

  let bonus = 0;
  if (!weekend) {
    // 이번 주 평일 인증 횟수 확인 (방금 제출 포함)
    const row = await db
      .prepare(`
        SELECT COUNT(*) as cnt
        FROM daily_checkin_entries dce
        JOIN daily_checkin_cycles dcc ON dcc.id = dce.daily_checkin_cycle_id
        WHERE dce.guild_id = ?
          AND dce.discord_user_id = ?
          AND dce.status IN ('valid', 'late')
          AND dcc.checkin_date >= ?
          AND dcc.checkin_date <= date(?, '+6 days')
          AND (CAST(strftime('%w', dcc.checkin_date) AS INTEGER) BETWEEN 1 AND 5)
      `)
      .bind(guildId, discordUserId, weekStartDate, weekStartDate)
      .first<{ cnt: number }>();

    if ((row?.cnt ?? 0) === WEEKDAYS_REQUIRED) {
      bonus = WEEKDAY_COMPLETION_BONUS;
      await addPoints(db, guildId, discordUserId, bonus);
    }
  }

  return base + bonus;
}
