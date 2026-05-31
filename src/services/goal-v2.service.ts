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
import type { UserDailyGoalItemRow, UserDailyGoalRow, WeeklyGoalCycleRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export interface CurrentGoalBundle {
  cycle: WeeklyGoalCycleRow;
  goal: UserDailyGoalRow | null;
  items: UserDailyGoalItemRow[];
}

function parseRestDays(raw: string): string[] {
  const tokens = raw
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.length > 0 ? tokens : ["토", "일"];
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
  const cycle: WeeklyGoalCycleRow = {
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

  const actualCycle = await import("../db/weekly-goal-cycles.repository.js")
    .then((m) => m.getWeeklyGoalCycle(db, guildId, weekStartDate));
  const resolvedCycle = actualCycle ?? cycle;
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
    goals: string[];
    restDaysRaw: string;
  }
): Promise<{ success: boolean; message: string }> {
  const cycle = await ensureCurrentWeeklyGoalCycle(db, guildId, botToken);
  await upsertUser(db, guildId, discordUserId, displayName);

  const goals = input.goals.map((goal) => goal.trim()).filter(Boolean);
  if (goals.length === 0) {
    return { success: false, message: "최소 1개의 데일리 목표를 입력해 주세요." };
  }

  const restDays = parseRestDays(input.restDaysRaw);
  let userGoal = await getUserDailyGoal(db, guildId, discordUserId, cycle.id);
  if (!userGoal) {
    userGoal = await insertUserDailyGoal(db, {
      guildId,
      discordUserId,
      weeklyGoalCycleId: cycle.id,
      restDaysJson: JSON.stringify(restDays),
    });
  } else {
    await updateUserDailyGoal(db, userGoal.id, {
      restDaysJson: JSON.stringify(restDays),
      status: "active",
    });
  }

  await replaceUserDailyGoalItems(
    db,
    userGoal.id,
    goals.map((goal, index) => ({
      sortOrder: index + 1,
      label: goal,
      proofType: "text",
      required: true,
    }))
  );

  const card = buildGoalSummaryCard({
    memberDisplay: displayName,
    weekLabel: "이번 주 목표",
    periodLabel: cycle.week_start_date + " ~ " + cycle.week_end_date,
    goals: goals.map((goal) => ({ label: goal, proofTypeLabel: "텍스트 인증" })),
    restDaysLabel: restDays.join(", "),
  });

  const message = await createMessage(cycle.forum_thread_id, botToken, {
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: card.components,
  });
  await updateUserDailyGoalMessageId(db, userGoal.id, message.id);

  return {
    success: true,
    message: "V2 목표를 저장했습니다. 공개 목표 카드도 생성되었습니다.",
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
      proofTypeLabel: item.proof_type === "text" ? "텍스트 인증" : item.proof_type,
    })),
  };
}
