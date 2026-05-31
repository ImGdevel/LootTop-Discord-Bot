import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getUser } from "../db/users.repository.js";
import {
  getUserDailyGoal,
  getUserDailyGoalItems,
  insertUserDailyGoal,
  replaceUserDailyGoalItems,
  updateUserDailyGoal,
  updateUserDailyGoalMessageId,
} from "../db/user-daily-goals.repository.js";
import { upsertUser } from "../db/users.repository.js";
import { createMessage } from "../discord/rest.js";
import { getWeekEndDate, getWeekStartDate, toLocalDateString } from "../domain/date.js";
import { buildGoalSummaryCard } from "../ui/cards/goal-summary.card.js";
import { MessageFlags } from "../types.js";
import { ensureCurrentWeeklyGoalCycle } from "./goal-cycle-v2.service.js";
import type { GoalProofType, UserDailyGoalItemRow, UserDailyGoalRow, WeeklyGoalCycleRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

const PROOF_TYPE_LABELS: Record<GoalProofType, string> = {
  text: "텍스트 인증",
  url: "URL 인증",
  image: "사진 인증 (링크)",
  checkbox: "체크 완료",
};

export interface CurrentGoalBundle {
  cycle: WeeklyGoalCycleRow;
  goal: UserDailyGoalRow | null;
  items: UserDailyGoalItemRow[];
}

export async function getCurrentGoalBundle(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<CurrentGoalBundle> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDate = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDate);
  const weekEndDate = getWeekEndDate(weekStartDate);

  const fallbackCycle: WeeklyGoalCycleRow = {
    id: 0,
    guild_id: guildId,
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
    forum_thread_id: "",
    title: weekStartDate + " ~ " + weekEndDate,
    status: "open",
    published_at: "",
    created_at: "",
  };

  const { getWeeklyGoalCycle } = await import("../db/weekly-goal-cycles.repository.js");
  const actualCycle = await getWeeklyGoalCycle(db, guildId, weekStartDate);
  const resolvedCycle = actualCycle ?? fallbackCycle;
  const goal = actualCycle
    ? await getUserDailyGoal(db, guildId, discordUserId, actualCycle.id)
    : null;
  const items = goal ? await getUserDailyGoalItems(db, goal.id) : [];
  return { cycle: resolvedCycle, goal, items };
}

export async function saveCurrentUserGoalsV2(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  displayName: string,
  botToken: string,
  input: {
    goalLabels: string[];
    proofTypes: Record<string, string>;
    restDays: string[];
  }
): Promise<{ success: boolean; message: string }> {
  const goalLabels = input.goalLabels.filter(Boolean);
  if (goalLabels.length === 0) {
    return { success: false, message: "최소 1개의 데일리 목표를 입력해 주세요." };
  }

  let cycle: WeeklyGoalCycleRow;
  try {
    cycle = await ensureCurrentWeeklyGoalCycle(db, guildId, botToken);
  } catch (err) {
    // 포럼 채널 미설정 시 D1에만 저장하고 카드 게시 생략
    console.warn("[goal-v2] ensureCurrentWeeklyGoalCycle failed:", err);
    const settings = await getGuildSettings(db, guildId);
    const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
    const localDate = toLocalDateString(new Date(), timezone);
    const weekStartDate = getWeekStartDate(localDate);
    cycle = {
      id: -1,
      guild_id: guildId,
      week_start_date: weekStartDate,
      week_end_date: getWeekEndDate(weekStartDate),
      forum_thread_id: "",
      title: "",
      status: "open",
      published_at: "",
      created_at: "",
    };
  }

  await upsertUser(db, guildId, discordUserId, displayName);

  // cycle.id === -1 이면 DB에 cycle이 없으므로 저장 불가
  if (cycle.id === -1) {
    return {
      success: false,
      message: "목표 포럼 채널이 설정되지 않았습니다. `/설정 채널 목표포럼`으로 채널을 먼저 설정해 주세요.",
    };
  }

  let userGoal = await getUserDailyGoal(db, guildId, discordUserId, cycle.id);
  const restDaysJson = JSON.stringify(input.restDays.length > 0 ? input.restDays : ["토", "일"]);

  if (!userGoal) {
    userGoal = await insertUserDailyGoal(db, {
      guildId,
      discordUserId,
      weeklyGoalCycleId: cycle.id,
      restDaysJson,
    });
  } else {
    await updateUserDailyGoal(db, userGoal.id, { restDaysJson, status: "active" });
  }

  const goalItems = goalLabels.map((label, index) => ({
    sortOrder: index + 1,
    label,
    proofType: (input.proofTypes[String(index)] ?? "text") as GoalProofType,
    required: true,
  }));

  await replaceUserDailyGoalItems(db, userGoal.id, goalItems);

  // 공개 목표 카드 게시
  if (cycle.forum_thread_id) {
    try {
      const proofTypeLabels = goalItems.map((item) => ({
        label: item.label,
        proofTypeLabel: PROOF_TYPE_LABELS[item.proofType] ?? item.proofType,
      }));

      const card = buildGoalSummaryCard({
        memberDisplay: displayName,
        weekLabel: "이번 주 목표",
        periodLabel: cycle.week_start_date + " ~ " + cycle.week_end_date,
        goals: proofTypeLabels,
        restDaysLabel: input.restDays.length > 0 ? input.restDays.join(", ") : "토, 일",
        editButtonId: "goal:edit:self:current:1",
      });

      const message = await createMessage(cycle.forum_thread_id, botToken, {
        flags: MessageFlags.IS_COMPONENTS_V2,
        components: card.components,
      });
      await updateUserDailyGoalMessageId(db, userGoal.id, message.id);
    } catch (err) {
      console.error("[goal-v2] 카드 게시 실패:", err);
    }
  }

  const restLabel = input.restDays.length > 0 ? input.restDays.join(", ") : "토, 일";
  return {
    success: true,
    message:
      "✅ **이번 주 목표가 저장되었습니다!**\n\n" +
      goalLabels.map((g, i) => "**목표 " + (i + 1) + "**: " + g + " (" + (PROOF_TYPE_LABELS[(input.proofTypes[String(i)] ?? "text") as GoalProofType] ?? "텍스트 인증") + ")").join("\n") +
      "\n**휴식일**: " + restLabel,
  };
}

export async function getCurrentGoalSummaryState(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<{
  weekStartDate: string;
  weekEndDate: string;
  displayName: string;
  restDays: string[];
  goals: Array<{ label: string; proofTypeLabel: string }>;
} | null> {
  const bundle = await getCurrentGoalBundle(db, guildId, discordUserId);
  if (!bundle.goal) return null;
  const user = await getUser(db, guildId, discordUserId);
  return {
    weekStartDate: bundle.cycle.week_start_date,
    weekEndDate: bundle.cycle.week_end_date,
    displayName: user?.display_name_snapshot ?? discordUserId,
    restDays: JSON.parse(bundle.goal.rest_days_json) as string[],
    goals: bundle.items.map((item) => ({
      label: item.label,
      proofTypeLabel: PROOF_TYPE_LABELS[item.proof_type] ?? item.proof_type,
    })),
  };
}
