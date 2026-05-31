import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getWeeklyGoalCycle, insertWeeklyGoalCycle } from "../db/weekly-goal-cycles.repository.js";
import { createForumThread } from "../discord/rest.js";
import { buildWeeklyGoalThreadIntroCard } from "../ui/cards/weekly-goal-thread.card.js";
import { V2_BUTTON_IDS } from "../ui/builders/ids.js";
import { MessageFlags } from "../types.js";
import { getWeekEndDate, getWeekStartDate, toLocalDateString } from "../domain/date.js";
import { ensureV2GuildSetup } from "./guild-setup-v2.service.js";
import type { WeeklyGoalCycleRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

function formatWeekTitle(weekStartDate: string, weekEndDate: string): string {
  return weekStartDate + " ~ " + weekEndDate;
}

export async function ensureCurrentWeeklyGoalCycle(
  db: D1Database,
  guildId: string,
  botToken: string,
  now = new Date()
): Promise<WeeklyGoalCycleRow> {
  const { settings } = await ensureV2GuildSetup(db, guildId, botToken);
  const timezone = settings.timezone ?? DEFAULT_TIMEZONE;
  const localDate = toLocalDateString(now, timezone);
  const weekStartDate = getWeekStartDate(localDate);
  const weekEndDate = getWeekEndDate(weekStartDate);

  const existing = await getWeeklyGoalCycle(db, guildId, weekStartDate);
  if (existing) return existing;

  const forumChannelId = settings.goal_forum_channel_id;
  if (!forumChannelId) {
    throw new Error("goal forum channel is not configured");
  }

  const title = formatWeekTitle(weekStartDate, weekEndDate);
  const introCard = buildWeeklyGoalThreadIntroCard({
    weekLabel: "이번 주 목표",
    periodLabel: weekStartDate + " ~ " + weekEndDate,
    defaultRestDaysLabel: "토요일, 일요일",
    createGoalButtonId: V2_BUTTON_IDS.GOAL_CREATE,
  });

  const thread = await createForumThread(forumChannelId, botToken, {
    name: title.slice(0, 100),
    auto_archive_duration: 10080,
    message: {
      flags: MessageFlags.IS_COMPONENTS_V2,
      components: introCard.components,
    },
  });

  return insertWeeklyGoalCycle(db, {
    guildId,
    weekStartDate,
    weekEndDate,
    forumThreadId: thread.id,
    title,
    publishedAt: now.toISOString(),
  });
}
