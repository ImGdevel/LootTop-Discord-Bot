import { channelExists, createMessage } from "../discord/rest.js";
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
    if (existing.channel_message_id != null) {
      const alive = await channelExists(existing.forum_thread_id, botToken);
      if (alive) return existing;
    }
    await db.prepare("DELETE FROM weekly_leaderboard_cycles WHERE id = ?").bind(existing.id).run();
  }

  const channelId = settings?.leaderboard_channel_id;
  if (!channelId) throw new Error("leaderboard_channel_id not configured");

  // 리더보드는 이전 주 결과 요약 → 이전 주 start date 계산
  const prevWeekMs = new Date(weekStartDate + "T00:00:00").getTime() - 7 * 86400000;
  const prevWeekStartDate = new Date(prevWeekMs).toISOString().slice(0, 10);

  const prevCycleRow = await db
    .prepare("SELECT week_number FROM weekly_goal_cycles WHERE guild_id = ? AND week_start_date = ? LIMIT 1")
    .bind(guildId, prevWeekStartDate)
    .first<{ week_number: number | null }>();
  const weekNum = prevCycleRow?.week_number ?? await getLatestWeeklyGoalCycleWeekNumber(db, guildId);
  const label = weekLabel(weekNum, prevWeekStartDate);
  const title = label + " 리더보드";
  const { flags, components } = await buildPublicLeaderboard(db, guildId, prevWeekStartDate);

  const message = await createMessage(channelId, botToken, { flags, components });

  return insertWeeklyLeaderboardCycle(db, {
    guildId,
    weekStartDate,
    weekEndDate,
    forumThreadId: channelId,
    channelMessageId: message.id,
    title,
    publishedAt: now.toISOString(),
  });
}
