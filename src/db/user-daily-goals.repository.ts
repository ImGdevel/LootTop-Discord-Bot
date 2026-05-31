import type { GoalProofType, UserDailyGoalItemRow, UserDailyGoalRow } from "./types.js";

export async function getUserDailyGoal(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  weeklyGoalCycleId: number
): Promise<UserDailyGoalRow | null> {
  const result = await db
    .prepare(`
      SELECT * FROM user_daily_goals
      WHERE guild_id = ? AND discord_user_id = ? AND weekly_goal_cycle_id = ?
    `)
    .bind(guildId, discordUserId, weeklyGoalCycleId)
    .first<UserDailyGoalRow>();
  return result ?? null;
}

export async function insertUserDailyGoal(
  db: D1Database,
  input: {
    guildId: string;
    discordUserId: string;
    weeklyGoalCycleId: number;
    goalMessageId?: string | null;
    restDaysJson: string;
  }
): Promise<UserDailyGoalRow> {
  const now = new Date().toISOString();
  await db
    .prepare(`
      INSERT INTO user_daily_goals
        (guild_id, discord_user_id, weekly_goal_cycle_id, goal_message_id, rest_days_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `)
    .bind(
      input.guildId,
      input.discordUserId,
      input.weeklyGoalCycleId,
      input.goalMessageId ?? null,
      input.restDaysJson,
      now,
      now
    )
    .run();

  const goal = await getUserDailyGoal(db, input.guildId, input.discordUserId, input.weeklyGoalCycleId);
  if (!goal) throw new Error("insertUserDailyGoal: 저장 후 조회 실패");
  return goal;
}

export async function updateUserDailyGoal(
  db: D1Database,
  id: number,
  input: {
    restDaysJson: string;
    status?: "active" | "archived";
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(`
      UPDATE user_daily_goals
      SET rest_days_json = ?, status = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(input.restDaysJson, input.status ?? "active", now, id)
    .run();
}

export async function updateUserDailyGoalMessageId(
  db: D1Database,
  id: number,
  goalMessageId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE user_daily_goals SET goal_message_id = ?, updated_at = ? WHERE id = ?")
    .bind(goalMessageId, now, id)
    .run();
}

export async function archiveUserDailyGoal(
  db: D1Database,
  id: number
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE user_daily_goals SET status = 'archived', updated_at = ? WHERE id = ?")
    .bind(now, id)
    .run();
}

export async function replaceUserDailyGoalItems(
  db: D1Database,
  userDailyGoalId: number,
  items: Array<{
    sortOrder: number;
    label: string;
    proofType: GoalProofType;
    required: boolean;
  }>
): Promise<void> {
  await db
    .prepare("DELETE FROM user_daily_goal_items WHERE user_daily_goal_id = ?")
    .bind(userDailyGoalId)
    .run();

  const now = new Date().toISOString();
  for (const item of items) {
    await db
      .prepare(`
        INSERT INTO user_daily_goal_items
          (user_daily_goal_id, sort_order, label, proof_type, required, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userDailyGoalId,
        item.sortOrder,
        item.label,
        item.proofType,
        item.required ? 1 : 0,
        now
      )
      .run();
  }
}

export async function getUserDailyGoalItems(
  db: D1Database,
  userDailyGoalId: number
): Promise<UserDailyGoalItemRow[]> {
  const result = await db
    .prepare(`
      SELECT * FROM user_daily_goal_items
      WHERE user_daily_goal_id = ?
      ORDER BY sort_order ASC, id ASC
    `)
    .bind(userDailyGoalId)
    .all<UserDailyGoalItemRow>();
  return result.results;
}

export async function getUserDailyGoalsForCycle(
  db: D1Database,
  weeklyGoalCycleId: number
): Promise<UserDailyGoalRow[]> {
  const result = await db
    .prepare(`
      SELECT * FROM user_daily_goals
      WHERE weekly_goal_cycle_id = ? AND status = 'active'
      ORDER BY created_at ASC
    `)
    .bind(weeklyGoalCycleId)
    .all<UserDailyGoalRow>();
  return result.results;
}
