import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getLatestWeeklyGoalCycle } from "../db/weekly-goal-cycles.repository.js";
import { getDailyCheckinCycle } from "../db/daily-checkin-cycles.repository.js";
import { getWeeklyLeaderboardCycle } from "../db/weekly-leaderboard-cycles.repository.js";
import { getWeeklyCheckinCounts } from "../db/daily-checkin-entries.repository.js";
import { MessageFlags } from "../types.js";
import { toLocalDateString, getWeekStartDate, getWeekEndDate } from "../domain/date.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export async function buildStudyHomeFlow(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  _botToken: string
): Promise<{ flags: number; components: unknown[] }> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDateStr);
  const weekEndDate = getWeekEndDate(weekStartDate);

  const [goalCycle, checkinCycle, leaderboardCycle, counts] = await Promise.all([
    getLatestWeeklyGoalCycle(db, guildId),
    getDailyCheckinCycle(db, guildId, localDateStr),
    getWeeklyLeaderboardCycle(db, guildId, weekStartDate),
    getWeeklyCheckinCounts(db, guildId, weekStartDate, weekEndDate),
  ]);

  const myCount = counts.find((r) => r.discord_user_id === discordUserId)?.count ?? 0;
  const checkinOpen = checkinCycle?.status === "open";

  const lines = [
    "## 📚 스터디 홈",
    "이번 주: **" + weekStartDate + " ~ " + weekEndDate + "**",
    "",
    goalCycle ? "📋 [목표 스레드](<https://discord.com/channels/" + guildId + "/" + goalCycle.forum_thread_id + ">)" : "📋 목표 스레드: 준비 중",
    checkinCycle ? "✅ [오늘 인증 스레드](<https://discord.com/channels/" + guildId + "/" + checkinCycle.thread_id + ">)" : "✅ 오늘 인증 스레드: 준비 중",
    leaderboardCycle ? "🏆 [리더보드](<https://discord.com/channels/" + guildId + "/" + leaderboardCycle.forum_thread_id + ">)" : "🏆 리더보드: 준비 중",
    "",
    "내 이번 주 인증: **" + myCount + "회**",
  ].join("\n");

  const buttons: unknown[] = [];
  if (checkinOpen) {
    buttons.push({ type: 2, style: 1, label: "오늘 인증", custom_id: "checkin:submit" });
  }
  buttons.push({ type: 2, style: 2, label: "리더보드 보기", custom_id: "leaderboard:view:self:current:1" });
  buttons.push({ type: 2, style: 2, label: "새로고침", custom_id: "home:refresh:self:root:1" });

  const components: unknown[] = [
    {
      type: 17,
      accent_color: 0x5865F2,
      components: [
        { type: 10, content: lines },
        { type: 14, divider: true, spacing: 1 },
        { type: 1, components: buttons },
      ],
    },
  ];

  return {
    flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
    components,
  };
}
