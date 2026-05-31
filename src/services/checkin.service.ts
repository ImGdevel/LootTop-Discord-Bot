import { getGuildSettings } from "../db/guild-settings.repository.js";
import { upsertUser } from "../db/users.repository.js";
import { getWeeklyPlan } from "../db/weekly-plans.repository.js";
import { getTodayCheckin, insertCheckin, getCheckinsForPlan } from "../db/daily-checkins.repository.js";
import { toLocalDateString, getWeekStartDate } from "../domain/date.js";
import type { DailyCheckinRow, WeeklyPlanRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export interface CheckinInput {
  guildId: string;
  discordUserId: string;
  displayName: string;
  content: string;
  proofUrl: string | null;
}

export type CheckinResult =
  | { status: "ok"; message: string }
  | { status: "no_plan"; message: string }
  | { status: "duplicate"; message: string; existing: DailyCheckinRow };

export interface MyCheckinStatusResult {
  plan: WeeklyPlanRow;
  checkins: DailyCheckinRow[];
  checkinCount: number;
}

export async function submitCheckin(
  db: D1Database,
  input: CheckinInput
): Promise<CheckinResult> {
  const { guildId, discordUserId, displayName, content, proofUrl } = input;

  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDateStr);
  const checkinDate = localDateStr;

  const plan = await getWeeklyPlan(db, guildId, discordUserId, weekStartDate);
  if (!plan || plan.status !== "active") {
    return {
      status: "no_plan",
      message: "이번 주 계획이 없습니다. 먼저 계획을 작성해 주세요.",
    };
  }

  const existing = await getTodayCheckin(db, guildId, discordUserId, checkinDate);
  if (existing) {
    return {
      status: "duplicate",
      message:
        "오늘은 이미 인증하셨습니다.\n\n" +
        "**기존 인증 내용**: " + existing.content +
        (existing.proof_url ? "\n**링크**: " + existing.proof_url : ""),
      existing,
    };
  }

  await upsertUser(db, guildId, discordUserId, displayName);
  await insertCheckin(db, guildId, discordUserId, plan.id, checkinDate, content, proofUrl || null);

  return {
    status: "ok",
    message:
      "✅ 인증이 완료되었습니다!\n\n" +
      "**오늘 한 일**: " + content +
      (proofUrl ? "\n**링크**: " + proofUrl : "") +
      "\n**날짜**: " + checkinDate,
  };
}

export async function fetchMyCheckinStatus(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<MyCheckinStatusResult | null> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDateStr);

  const plan = await getWeeklyPlan(db, guildId, discordUserId, weekStartDate);
  if (!plan) return null;

  const checkins = await getCheckinsForPlan(db, plan.id);
  return { plan, checkins, checkinCount: checkins.length };
}
