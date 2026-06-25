import type { WeeklyVacationCycleRow } from "./types.js";

export async function getWeeklyVacationCycle(
  db: D1Database,
  guildId: string,
  weekStartDate: string
): Promise<WeeklyVacationCycleRow | null> {
  const result = await db
    .prepare("SELECT * FROM weekly_vacation_cycles WHERE guild_id = ? AND week_start_date = ?")
    .bind(guildId, weekStartDate)
    .first<WeeklyVacationCycleRow>();
  return result ?? null;
}

export async function getLatestWeeklyVacationCycle(
  db: D1Database,
  guildId: string
): Promise<WeeklyVacationCycleRow | null> {
  const result = await db
    .prepare("SELECT * FROM weekly_vacation_cycles WHERE guild_id = ? ORDER BY week_start_date DESC LIMIT 1")
    .bind(guildId)
    .first<WeeklyVacationCycleRow>();
  return result ?? null;
}

export async function updateWeeklyVacationCycleTitle(
  db: D1Database,
  id: number,
  title: string
): Promise<void> {
  await db
    .prepare("UPDATE weekly_vacation_cycles SET title = ? WHERE id = ?")
    .bind(title, id)
    .run();
}

export async function insertWeeklyVacationCycle(
  db: D1Database,
  input: { guildId: string; weekStartDate: string; threadId: string; title: string }
): Promise<WeeklyVacationCycleRow> {
  const now = new Date().toISOString();
  await db
    .prepare("INSERT OR IGNORE INTO weekly_vacation_cycles (guild_id, week_start_date, thread_id, title, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(input.guildId, input.weekStartDate, input.threadId, input.title, now)
    .run();
  const row = await getWeeklyVacationCycle(db, input.guildId, input.weekStartDate);
  if (!row) throw new Error("insertWeeklyVacationCycle: 저장 후 조회 실패");
  return row;
}
