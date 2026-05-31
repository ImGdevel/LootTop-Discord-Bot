import { getGuildSettings } from "../db/guild-settings.repository.js";
import { upsertUser } from "../db/users.repository.js";
import { getWeeklyPlan, upsertWeeklyPlan } from "../db/weekly-plans.repository.js";
import { toLocalDateString, getWeekStartDate, getWeekEndDate } from "../domain/date.js";
import type { WeeklyPlanRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export interface PlanUpsertInput {
  guildId: string;
  discordUserId: string;
  displayName: string;
  goalText: string;
  targetCount: number;
}

export interface PlanUpsertResult {
  success: boolean;
  message: string;
  plan?: WeeklyPlanRow;
}

/**
 * 이번 주 계획 조회
 */
export async function fetchCurrentWeekPlan(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<WeeklyPlanRow | null> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDateStr);
  return getWeeklyPlan(db, guildId, discordUserId, weekStartDate);
}

/**
 * 계획 저장 (생성 또는 수정)
 * - users upsert 연동
 * - target_count 유효성 검증
 */
export async function savePlan(
  db: D1Database,
  input: PlanUpsertInput
): Promise<PlanUpsertResult> {
  const { guildId, discordUserId, displayName, goalText, targetCount } = input;

  if (!Number.isInteger(targetCount) || targetCount < 1) {
    return {
      success: false,
      message: "목표 횟수는 1 이상의 숫자로 입력해 주세요.",
    };
  }

  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDateStr);
  const weekEndDate = getWeekEndDate(weekStartDate);

  await upsertUser(db, guildId, discordUserId, displayName);

  const plan = await upsertWeeklyPlan(
    db,
    guildId,
    discordUserId,
    weekStartDate,
    weekEndDate,
    goalText,
    targetCount
  );

  return {
    success: true,
    message:
      `✅ 계획이 저장되었습니다!\n\n` +
      `**목표**: ${goalText}\n` +
      `**목표 인증 횟수**: ${targetCount}회\n` +
      `**기간**: ${weekStartDate} ~ ${weekEndDate}`,
    plan,
  };
}
