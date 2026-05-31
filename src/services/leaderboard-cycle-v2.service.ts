import { getWeeklyLeaderboardCycle, insertWeeklyLeaderboardCycle } from "../db/weekly-leaderboard-cycles.repository.js";
import { createForumThread } from "../discord/rest.js";
import { buildLeaderboardFlow } from "../flows/leaderboard.flow.js";
import { getWeekEndDate, getWeekStartDate, toLocalDateString } from "../domain/date.js";
import { ensureV2GuildSetup } from "./guild-setup-v2.service.js";
import type { WeeklyLeaderboardCycleRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

function previousWeekStart(currentWeekStart: string): string {
  const date = new Date(currentWeekStart + "T00:00:00");
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

export async function ensureWeeklyLeaderboardCycle(
  db: D1Database,
  guildId: string,
  botToken: string,
  now = new Date()
): Promise<WeeklyLeaderboardCycleRow> {
  const { settings } = await ensureV2GuildSetup(db, guildId, botToken);
  const timezone = settings.timezone ?? DEFAULT_TIMEZONE;
  const localDate = toLocalDateString(now, timezone);
  const currentWeekStart = getWeekStartDate(localDate);
  const weekStartDate = previousWeekStart(currentWeekStart);
  const weekEndDate = getWeekEndDate(weekStartDate);

  const existing = await getWeeklyLeaderboardCycle(db, guildId, weekStartDate);
  if (existing) return existing;

  const forumChannelId = settings.leaderboard_forum_channel_id ?? settings.leaderboard_channel_id;
  if (!forumChannelId) {
    throw new Error("leaderboard forum channel is not configured");
  }

  const payload = await buildLeaderboardFlow(db, guildId, weekStartDate);
  const title = weekStartDate + " 리더보드";

  const thread = await createForumThread(forumChannelId, botToken, {
    name: title.slice(0, 100),
    auto_archive_duration: 10080,
    message: {
      flags: payload.flags,
      components: payload.components,
    },
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
