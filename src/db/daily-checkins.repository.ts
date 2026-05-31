import type { DailyCheckinRow } from "./types.js";

export async function getTodayCheckin(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  checkinDate: string
): Promise<DailyCheckinRow | null> {
  const result = await db
    .prepare("SELECT * FROM daily_checkins WHERE guild_id = ? AND discord_user_id = ? AND checkin_date = ?")
    .bind(guildId, discordUserId, checkinDate)
    .first<DailyCheckinRow>();
  return result ?? null;
}

export async function insertCheckin(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  weeklyPlanId: number,
  checkinDate: string,
  content: string,
  proofUrl: string | null
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("INSERT INTO daily_checkins (guild_id, discord_user_id, weekly_plan_id, checkin_date, content, proof_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(guildId, discordUserId, weeklyPlanId, checkinDate, content, proofUrl, now)
    .run();
}

export async function getCheckinsForPlan(
  db: D1Database,
  weeklyPlanId: number
): Promise<DailyCheckinRow[]> {
  const result = await db
    .prepare("SELECT * FROM daily_checkins WHERE weekly_plan_id = ? ORDER BY checkin_date ASC")
    .bind(weeklyPlanId)
    .all<DailyCheckinRow>();
  return result.results;
}

export async function getCheckinCountsByWeek(
  db: D1Database,
  guildId: string,
  weekStartDate: string
): Promise<Map<number, number>> {
  const result = await db
    .prepare("SELECT dc.weekly_plan_id, COUNT(*) as count FROM daily_checkins dc JOIN weekly_plans wp ON dc.weekly_plan_id = wp.id WHERE dc.guild_id = ? AND wp.week_start_date = ? GROUP BY dc.weekly_plan_id")
    .bind(guildId, weekStartDate)
    .all<{ weekly_plan_id: number; count: number }>();
  const map = new Map<number, number>();
  for (const row of result.results) map.set(row.weekly_plan_id, row.count);
  return map;
}
