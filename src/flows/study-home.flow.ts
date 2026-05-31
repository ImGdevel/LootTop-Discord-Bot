import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getLatestWeeklyGoalCycle } from "../db/weekly-goal-cycles.repository.js";
import { getDailyCheckinCycle } from "../db/daily-checkin-cycles.repository.js";
import { getWeeklyLeaderboardCycle } from "../db/weekly-leaderboard-cycles.repository.js";
import { buildStudyHomeCard } from "../ui/cards/study-home.card.js";
import { V2_BUTTON_IDS } from "../ui/builders/ids.js";
import { MessageFlags } from "../types.js";
import { fetchCurrentWeekPlan } from "../services/plan.service.js";
import { fetchMyCheckinStatus } from "../services/checkin.service.js";
import { toLocalDateString, getWeekStartDate } from "../domain/date.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export async function buildStudyHomeFlow(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<{ flags: number; components: unknown[] }> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDateStr);

  const [goalCycle, checkinCycle, leaderboardCycle, plan, checkinStatus] = await Promise.all([
    getLatestWeeklyGoalCycle(db, guildId),
    getDailyCheckinCycle(db, guildId, localDateStr),
    getWeeklyLeaderboardCycle(db, guildId, weekStartDate),
    fetchCurrentWeekPlan(db, guildId, discordUserId),
    fetchMyCheckinStatus(db, guildId, discordUserId),
  ]);

  const card = buildStudyHomeCard({
    weekLabel: weekStartDate,
    goalThreadName: goalCycle?.title ?? null,
    checkinThreadName: checkinCycle?.title ?? null,
    leaderboardThreadName: leaderboardCycle?.title ?? null,
    myGoalStatusLabel: plan ? "작성 완료" : "미작성",
    myTodayCheckinStatusLabel: checkinStatus?.checkinCount ? "인증 있음" : "아직 없음",
    buttons: {
      goal: V2_BUTTON_IDS.HOME_GOAL,
      checkin: V2_BUTTON_IDS.HOME_CHECKIN,
      leaderboard: V2_BUTTON_IDS.HOME_LEADERBOARD,
      refresh: V2_BUTTON_IDS.HOME_REFRESH,
    },
  });

  return {
    flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
    components: card.components,
  };
}
