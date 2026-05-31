import type { WeeklyPlanRow } from "./types.js";

/**
 * 현재 주 계획 조회.
 * week_start_date 기준으로 조회한다 (서버 타임존 기준 YYYY-MM-DD).
 */
export async function getWeeklyPlan(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  weekStartDate: string
): Promise<WeeklyPlanRow | null> {
  const result = await db
    .prepare(`
      SELECT * FROM weekly_plans
      WHERE guild_id = ? AND discord_user_id = ? AND week_start_date = ?
    `)
    .bind(guildId, discordUserId, weekStartDate)
    .first<WeeklyPlanRow>();
  return result ?? null;
}

/**
 * 계획 생성 또는 수정 (upsert).
 * 기존 계획이 있으면 goal_text, target_count, updated_at만 갱신한다.
 * 기존 daily_checkins는 유지된다.
 */
export async function upsertWeeklyPlan(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  weekStartDate: string,
  weekEndDate: string,
  goalText: string,
  targetCount: number
): Promise<WeeklyPlanRow> {
  const now = new Date().toISOString();
  await db
    .prepare(`
      INSERT INTO weekly_plans
        (guild_id, discord_user_id, week_start_date, week_end_date,
         goal_text, target_count, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
      ON CONFLICT (guild_id, discord_user_id, week_start_date)
      DO UPDATE SET
        goal_text = excluded.goal_text,
        target_count = excluded.target_count,
        updated_at = excluded.updated_at
    `)
    .bind(guildId, discordUserId, weekStartDate, weekEndDate, goalText, targetCount, now, now)
    .run();

  const plan = await getWeeklyPlan(db, guildId, discordUserId, weekStartDate);
  if (!plan) throw new Error("upsertWeeklyPlan: 저장 후 조회 실패");
  return plan;
}

/**
 * 이번 주 전체 계획 목록 (리더보드용).
 * 계획을 세운 모든 유저를 반환한다 (인증 0건 포함).
 */
export async function getWeeklyPlansForLeaderboard(
  db: D1Database,
  guildId: string,
  weekStartDate: string
): Promise<WeeklyPlanRow[]> {
  const result = await db
    .prepare(`
      SELECT * FROM weekly_plans
      WHERE guild_id = ? AND week_start_date = ? AND status = 'active'
      ORDER BY created_at ASC
    `)
    .bind(guildId, weekStartDate)
    .all<WeeklyPlanRow>();
  return result.results;
}
