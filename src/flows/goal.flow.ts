import { getGuildSettings } from "../db/guild-settings.repository.js";
import { buildGoalSummaryCard } from "../ui/cards/goal-summary.card.js";
import { buildWeeklyGoalThreadIntroCard } from "../ui/cards/weekly-goal-thread.card.js";
import { V2_BUTTON_IDS } from "../ui/builders/ids.js";
import { MessageFlags } from "../types.js";
import { fetchCurrentWeekPlan } from "../services/plan.service.js";
import { toLocalDateString, getWeekStartDate, getWeekEndDate } from "../domain/date.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export async function buildCurrentWeeklyGoalFlow(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<{ content?: string; flags: number; components: unknown[] }> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDateStr);
  const weekEndDate = getWeekEndDate(weekStartDate);
  const weekLabel = "이번 주";
  const periodLabel = weekStartDate + " ~ " + weekEndDate;
  const plan = await fetchCurrentWeekPlan(db, guildId, discordUserId);

  if (!plan) {
    const card = buildWeeklyGoalThreadIntroCard({
      weekLabel,
      periodLabel,
      defaultRestDaysLabel: "토요일, 일요일",
      createGoalButtonId: V2_BUTTON_IDS.GOAL_CREATE,
    });
    return {
      flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
      components: card.components,
    };
  }

  const card = buildGoalSummaryCard({
    memberDisplay: "내 목표",
    weekLabel,
    periodLabel,
    goals: [
      {
        label: plan.goal_text,
        proofTypeLabel: plan.target_count + "회 인증",
      },
    ],
    restDaysLabel: "미설정",
    editButtonId: V2_BUTTON_IDS.GOAL_EDIT,
  });

  return {
    flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
    components: card.components,
  };
}
