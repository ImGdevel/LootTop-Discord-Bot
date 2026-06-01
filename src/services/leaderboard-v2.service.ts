import { channelExists, createForumThread } from "../discord/rest.js";
import { getGuildSettings } from "../db/guild-settings.repository.js";
import {
  getWeeklyLeaderboardCycle,
  insertWeeklyLeaderboardCycle,
} from "../db/weekly-leaderboard-cycles.repository.js";
import { buildPublicLeaderboard } from "../flows/leaderboard.flow.js";
import { getWeekStartDate, getWeekEndDate, toLocalDateString, formatWeekLabel } from "../domain/date.js";
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
  const localDate = toLocalDateString(now, timezone);
  const weekStartDate = getWeekStartDate(localDate);
  const weekEndDate = getWeekEndDate(weekStartDate);

  const existing = await getWeeklyLeaderboardCycle(db, guildId, weekStartDate);
  if (existing) {
    const alive = await channelExists(existing.forum_thread_id, botToken);
    if (alive) return existing;
    await db.prepare("DELETE FROM weekly_leaderboard_cycles WHERE id = ?").bind(existing.id).run();
  }

  const forumChannelId = settings?.leaderboard_forum_channel_id;
  if (!forumChannelId) throw new Error("leaderboard_forum_channel_id not configured");

  const weekLabel = formatWeekLabel(weekStartDate);
  const title = weekLabel + " 리더보드";
  const content = await buildPublicLeaderboard(db, guildId);

  const thread = await createForumThread(forumChannelId, botToken, {
    name: title,
    auto_archive_duration: 10080,
    message: { content },
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
