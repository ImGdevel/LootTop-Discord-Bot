import { buildGoalSummaryCard } from "../ui/cards/goal-summary.card.js";
import { buildWeeklyGoalThreadIntroCard } from "../ui/cards/weekly-goal-thread.card.js";
import { V2_BUTTON_IDS } from "../ui/builders/ids.js";
import { MessageFlags } from "../types.js";
import { getCurrentGoalSummaryState } from "../services/goal-v2.service.js";

export async function buildCurrentWeeklyGoalFlow(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<{ content?: string; flags: number; components: unknown[] }> {
  const state = await getCurrentGoalSummaryState(db, guildId, discordUserId);

  if (!state) {
    const card = buildWeeklyGoalThreadIntroCard({
      weekLabel: "이번 주 목표",
      periodLabel: "현재 주차",
      defaultRestDaysLabel: "토요일, 일요일",
      createGoalButtonId: V2_BUTTON_IDS.GOAL_CREATE,
    });
    return {
      flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
      components: card.components,
    };
  }

  const card = buildGoalSummaryCard({
    memberDisplay: state.displayName,
    weekLabel: "이번 주 목표",
    periodLabel: state.weekStartDate + " ~ " + state.weekEndDate,
    goals: state.goals,
    restDaysLabel: state.restDays.join(", "),
    editButtonId: V2_BUTTON_IDS.GOAL_EDIT,
  });

  return {
    flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
    components: card.components,
  };
}
