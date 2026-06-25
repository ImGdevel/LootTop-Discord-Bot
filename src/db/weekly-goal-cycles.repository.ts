import type { WeeklyGoalCycleRow } from "./types.js";

export async function getWeeklyGoalCycle(
  db: D1Database,
  guildId: string,
  weekStartDate: string
): Promise<WeeklyGoalCycleRow | null> {
  const result = await db
    .prepare(`
      SELECT * FROM weekly_goal_cycles
      WHERE guild_id = ? AND week_start_date = ?
    `)
    .bind(guildId, weekStartDate)
    .first<WeeklyGoalCycleRow>();
  return result ?? null;
}

export async function getLatestWeeklyGoalCycle(
  db: D1Database,
  guildId: string
): Promise<WeeklyGoalCycleRow | null> {
  const result = await db
    .prepare(`
      SELECT * FROM weekly_goal_cycles
      WHERE guild_id = ?
      ORDER BY week_start_date DESC
      LIMIT 1
    `)
    .bind(guildId)
    .first<WeeklyGoalCycleRow>();
  return result ?? null;
}

export async function insertWeeklyGoalCycle(
  db: D1Database,
  input: {
    guildId: string;
    weekStartDate: string;
    weekEndDate: string;
    forumThreadId: string;
    title: string;
    publishedAt: string;
    weekNumber?: number;
  }
): Promise<WeeklyGoalCycleRow> {
  const now = new Date().toISOString();
  await db
    .prepare(`
      INSERT INTO weekly_goal_cycles
        (guild_id, week_start_date, week_end_date, forum_thread_id, title, status, published_at, created_at, week_number)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `)
    .bind(
      input.guildId,
      input.weekStartDate,
      input.weekEndDate,
      input.forumThreadId,
      input.title,
      input.publishedAt,
      now,
      input.weekNumber ?? null
    )
    .run();

  const cycle = await getWeeklyGoalCycle(db, input.guildId, input.weekStartDate);
  if (!cycle) throw new Error("insertWeeklyGoalCycle: 저장 후 조회 실패");
  return cycle;
}

export async function updateWeeklyGoalCycleStatus(
  db: D1Database,
  id: number,
  status: "open" | "closed" | "archived"
): Promise<void> {
  await db
    .prepare("UPDATE weekly_goal_cycles SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();
}

export async function updateWeeklyGoalCycleWeekNumber(
  db: D1Database,
  id: number,
  weekNumber: number
): Promise<void> {
  await db
    .prepare("UPDATE weekly_goal_cycles SET week_number = ? WHERE id = ?")
    .bind(weekNumber, id)
    .run();
}

export async function updateWeeklyGoalCycleTitle(
  db: D1Database,
  id: number,
  title: string
): Promise<void> {
  await db
    .prepare("UPDATE weekly_goal_cycles SET title = ? WHERE id = ?")
    .bind(title, id)
    .run();
}

export async function getLatestWeeklyGoalCycleWeekNumber(
  db: D1Database,
  guildId: string
): Promise<number | null> {
  const result = await db
    .prepare("SELECT week_number FROM weekly_goal_cycles WHERE guild_id = ? AND week_number IS NOT NULL ORDER BY week_start_date DESC LIMIT 1")
    .bind(guildId)
    .first<{ week_number: number }>();
  return result?.week_number ?? null;
}
