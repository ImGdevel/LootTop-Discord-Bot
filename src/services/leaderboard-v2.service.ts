import { channelExists, createForumThread } from "../discord/rest.js";
import { getGuildSettings } from "../db/guild-settings.repository.js";
import {
  getWeeklyLeaderboardCycle,
  insertWeeklyLeaderboardCycle,
} from "../db/weekly-leaderboard-cycles.repository.js";
import { buildPublicLeaderboard } from "../flows/leaderboard.flow.js";
import { getOperationalWeekStartDate, getWeekEndDate, weekLabel } from "../domain/date.js";
import { getLatestWeeklyGoalCycleWeekNumber } from "../db/weekly-goal-cycles.repository.js";
import type { WeeklyLeaderboardCycleRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export async function ensureWeeklyLeaderboardCycle(
  db: D1Database,
  guildId: string,
  botToken: string,
  now = new Date()
): Promise<WeeklyLeaderboardCycleRow> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const weekStartDate = getOperationalWeekStartDate(
    now,
    timezone,
    settings?.week_start_day ?? 1,
    settings?.week_start_time ?? "00:00"
  );
  const weekEndDate = getWeekEndDate(weekStartDate);

  const existing = await getWeeklyLeaderboardCycle(db, guildId, weekStartDate);
  if (existing) {
    const alive = await channelExists(existing.forum_thread_id, botToken);
    if (alive) return existing;
    await db.prepare("DELETE FROM weekly_leaderboard_cycles WHERE id = ?").bind(existing.id).run();
  }

  const forumChannelId = settings?.leaderboard_forum_channel_id;
  if (!forumChannelId) throw new Error("leaderboard_forum_channel_id not configured");

  const weekNum = await getLatestWeeklyGoalCycleWeekNumber(db, guildId);
  const label = weekLabel(weekNum, weekStartDate);
  const title = label + " 리더보드";
  const { flags, components } = await buildPublicLeaderboard(db, guildId);

  const thread = await createForumThread(forumChannelId, botToken, {
    name: title,
    auto_archive_duration: 10080,
    message: { flags, components },
  });

  return insertWeeklyLeaderboardCycle(db, {
    guildId,
    weekStartDate,
    weekEndDate,
    forumThreadId: thread.id,
    title,
    publishedAt: now.toISOString(),
  });
}
