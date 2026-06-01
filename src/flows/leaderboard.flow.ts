import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getUser } from "../db/users.repository.js";
import { getWeeklyCheckinCounts } from "../db/daily-checkin-entries.repository.js";
import { getWeekStartDate, getWeekEndDate, toLocalDateString, formatWeekLabel } from "../domain/date.js";
import { MessageFlags } from "../types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export async function buildLeaderboardFlow(
  db: D1Database,
  guildId: string
): Promise<{ flags: number; content: string }> {
  const text = await buildPublicLeaderboard(db, guildId);
  return {
    flags: MessageFlags.EPHEMERAL,
    content: text,
  };
}

export async function buildPublicLeaderboard(
  db: D1Database,
  guildId: string
): Promise<string> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDate = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDate);
  const weekEndDate = getWeekEndDate(weekStartDate);
  const weekLabel = formatWeekLabel(weekStartDate);

  const counts = await getWeeklyCheckinCounts(db, guildId, weekStartDate, weekEndDate);

  const lines = await Promise.all(
    counts.map(async (row, i) => {
      const user = await getUser(db, guildId, row.discord_user_id);
      const name = user?.display_name_snapshot ?? row.discord_user_id;
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1) + ".";
      return medal + " **" + name + "** — " + row.count + "회";
    })
  );

  return (
    "**" + weekLabel + " 인증 리더보드**\n" +
    "(" + weekStartDate + " ~ " + weekEndDate + ") · 참여자 " + counts.length + "명\n\n" +
    (lines.length > 0 ? lines.join("\n") : "이번 주 인증 기록이 없습니다.")
  );
}
