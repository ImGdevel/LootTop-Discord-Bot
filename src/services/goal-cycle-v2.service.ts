import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getWeeklyGoalCycle, insertWeeklyGoalCycle } from "../db/weekly-goal-cycles.repository.js";
import { createForumThread } from "../discord/rest.js";
import { getWeekEndDate, getWeekStartDate, toLocalDateString, formatWeekLabel } from "../domain/date.js";
import type { WeeklyGoalCycleRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export async function ensureCurrentWeeklyGoalCycle(
  db: D1Database,
  guildId: string,
  botToken: string,
  now = new Date()
): Promise<WeeklyGoalCycleRow> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDate = toLocalDateString(now, timezone);
  const weekStartDate = getWeekStartDate(localDate);
  const weekEndDate = getWeekEndDate(weekStartDate);

  const existing = await getWeeklyGoalCycle(db, guildId, weekStartDate);
  if (existing) return existing;

  const forumChannelId = settings?.goal_forum_channel_id;
  if (!forumChannelId) throw new Error("goal_forum_channel_id not configured");

  const weekLabel = formatWeekLabel(weekStartDate);
  const title = weekLabel + " 목표";
  const content =
    "**" + weekLabel + "** (" + weekStartDate + " ~ " + weekEndDate + ")\n\n" +
    "이번 주 목표를 이 스레드에 자유롭게 작성해 주세요!\n" +
    "인증은 #인증 채널에서 매일 진행됩니다.";

  const thread = await createForumThread(forumChannelId, botToken, {
    name: title,
    auto_archive_duration: 10080,
    message: { content },
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
