import { getGuildSettings } from "../db/guild-settings.repository.js";
import {
  getWeeklyGoalCycle,
  insertWeeklyGoalCycle,
  getLatestWeeklyGoalCycle,
  getLatestWeeklyGoalCycleWeekNumber,
} from "../db/weekly-goal-cycles.repository.js";
import { channelExists, createForumThread } from "../discord/rest.js";
import { getWeekEndDate, getWeekStartDate, toLocalDateString, weekLabel } from "../domain/date.js";
import { MessageFlags } from "../types.js";
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
  if (existing) {
    const alive = await channelExists(existing.forum_thread_id, botToken);
    if (alive) return existing;
    await db.prepare("DELETE FROM weekly_goal_cycles WHERE id = ?").bind(existing.id).run();
  }

  const forumChannelId = settings?.goal_forum_channel_id;
  if (!forumChannelId) throw new Error("goal_forum_channel_id not configured");

  const latestWeekNum = await getLatestWeeklyGoalCycleWeekNumber(db, guildId);
  const latestCycle = await getLatestWeeklyGoalCycle(db, guildId);
  const weekNumber =
    latestWeekNum != null && latestCycle?.week_start_date !== weekStartDate
      ? latestWeekNum + 1
      : latestWeekNum ?? (settings?.week_number_start ?? 1);

  const label = weekLabel(weekNumber, weekStartDate);
  const title = label + " 목표";
  const content =
    "**" + label + "** (" + weekStartDate + " ~ " + weekEndDate + ")\n\n" +
    "이번 주 목표를 이 스레드에 자유롭게 작성해 주세요!\n" +
    "인증은 #인증 채널에서 매일 진행됩니다.";

  const thread = await createForumThread(forumChannelId, botToken, {
    name: title,
    auto_archive_duration: 10080,
    message: {
      flags: MessageFlags.IS_COMPONENTS_V2,
      components: [
        {
          type: 17,
          accent_color: 0x9B59B6,
          components: [
            { type: 10, content: "## 🎯 " + label + " 목표" },
            { type: 14, divider: true, spacing: 1 },
            { type: 10, content: content },
            { type: 1, components: [
              { type: 2, style: 1, label: "목표 작성", custom_id: "goal:submit" },
            ]},
          ],
        },
      ],
    },
  });

  return insertWeeklyGoalCycle(db, {
    guildId,
    weekStartDate,
    weekEndDate,
    forumThreadId: thread.id,
    title,
    publishedAt: now.toISOString(),
    weekNumber,
  });
}
