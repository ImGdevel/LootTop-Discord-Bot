import type { GoalWizardSessionRow } from "./types.js";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function expiresAt(): string {
  return new Date(Date.now() + 30 * 60 * 1000).toISOString();
}

export async function createGoalWizardSession(
  db: D1Database,
  input: {
    guildId: string;
    discordUserId: string;
    weekStartDate: string;
    goalLabels: string[];
  }
): Promise<GoalWizardSessionRow> {
  const id = generateId();
  const now = new Date().toISOString();
  await db
    .prepare(`
      INSERT INTO goal_wizard_sessions
        (id, guild_id, discord_user_id, week_start_date,
         goal_labels_json, proof_types_json, rest_days_json, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      input.guildId,
      input.discordUserId,
      input.weekStartDate,
      JSON.stringify(input.goalLabels),
      JSON.stringify({}),
      JSON.stringify(["토", "일"]),
      expiresAt(),
      now
    )
    .run();
  const row = await getGoalWizardSession(db, id);
  if (!row) throw new Error("createGoalWizardSession: 저장 후 조회 실패");
  return row;
}

export async function getGoalWizardSession(
  db: D1Database,
  id: string
): Promise<GoalWizardSessionRow | null> {
  const result = await db
    .prepare("SELECT * FROM goal_wizard_sessions WHERE id = ?")
    .bind(id)
    .first<GoalWizardSessionRow>();

  if (!result) return null;
  if (result.expires_at <= new Date().toISOString()) {
    await deleteGoalWizardSession(db, id);
    return null;
  }

  return result;
}

export async function updateGoalWizardSessionProofType(
  db: D1Database,
  id: string,
  goalIndex: number,
  proofType: string
): Promise<void> {
  const row = await getGoalWizardSession(db, id);
  if (!row) return;
  const proofTypes = JSON.parse(row.proof_types_json) as Record<string, string>;
  proofTypes[String(goalIndex)] = proofType;
  await db
    .prepare("UPDATE goal_wizard_sessions SET proof_types_json = ?, expires_at = ? WHERE id = ?")
    .bind(JSON.stringify(proofTypes), expiresAt(), id)
    .run();
}

export async function updateGoalWizardSessionRestDays(
  db: D1Database,
  id: string,
  restDays: string[]
): Promise<void> {
  await db
    .prepare("UPDATE goal_wizard_sessions SET rest_days_json = ?, expires_at = ? WHERE id = ?")
    .bind(JSON.stringify(restDays), expiresAt(), id)
    .run();
}

export async function appendGoalWizardSessionLabel(
  db: D1Database,
  id: string,
  label: string
): Promise<void> {
  const row = await getGoalWizardSession(db, id);
  if (!row) return;
  const goalLabels = JSON.parse(row.goal_labels_json) as string[];
  goalLabels.push(label);
  await db
    .prepare("UPDATE goal_wizard_sessions SET goal_labels_json = ?, expires_at = ? WHERE id = ?")
    .bind(JSON.stringify(goalLabels), expiresAt(), id)
    .run();
}

export async function deleteGoalWizardSession(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare("DELETE FROM goal_wizard_sessions WHERE id = ?")
    .bind(id)
    .run();
}

export async function deleteExpiredGoalWizardSessions(
  db: D1Database
): Promise<void> {
  await db
    .prepare("DELETE FROM goal_wizard_sessions WHERE expires_at < ?")
    .bind(new Date().toISOString())
    .run();
}
