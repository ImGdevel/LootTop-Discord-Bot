import type { WeeklyLeaderboardCycleRow } from "./types.js";

export async function getWeeklyLeaderboardCycle(
  db: D1Database,
  guildId: string,
  weekStartDate: string
): Promise<WeeklyLeaderboardCycleRow | null> {
  const result = await db
    .prepare(`
      SELECT * FROM weekly_leaderboard_cycles
      WHERE guild_id = ? AND week_start_date = ?
    `)
    .bind(guildId, weekStartDate)
    .first<WeeklyLeaderboardCycleRow>();
  return result ?? null;
}

export async function insertWeeklyLeaderboardCycle(
  db: D1Database,
  input: {
    guildId: string;
    weekStartDate: string;
    weekEndDate: string;
    forumThreadId: string;
    title: string;
    publishedAt: string;
  }
): Promise<WeeklyLeaderboardCycleRow> {
  const now = new Date().toISOString();
  await db
    .prepare(`
      INSERT INTO weekly_leaderboard_cycles
        (guild_id, week_start_date, week_end_date, forum_thread_id, title, published_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      input.guildId,
      input.weekStartDate,
      input.weekEndDate,
      input.forumThreadId,
      input.title,
      input.publishedAt,
      now
    )
    .run();

  const cycle = await getWeeklyLeaderboardCycle(db, input.guildId, input.weekStartDate);
  if (!cycle) throw new Error("insertWeeklyLeaderboardCycle: 저장 후 조회 실패");
  return cycle;
}
