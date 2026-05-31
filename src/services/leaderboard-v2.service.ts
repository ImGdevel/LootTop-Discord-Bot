import { getWeeklyGoalCycle } from "../db/weekly-goal-cycles.repository.js";
import { getUserDailyGoalItems, getUserDailyGoalsForCycle } from "../db/user-daily-goals.repository.js";
import { getWeeklyGoalCompletionCounts } from "../db/daily-checkin-entries.repository.js";
import { getUser } from "../db/users.repository.js";
import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getWeekEndDate, getWeekStartDate, toLocalDateString } from "../domain/date.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export interface LeaderboardV2Entry {
  rank: number;
  displayName: string;
  completionCount: number;
  targetCount: number;
  achievementRate: number;
}

export interface LeaderboardV2Result {
  entries: LeaderboardV2Entry[];
  weekStartDate: string;
  weekEndDate: string;
}

function getRestDayCount(restDaysJson: string): number {
  try {
    const days = JSON.parse(restDaysJson) as string[];
    return Array.isArray(days) ? days.length : 2;
  } catch {
    return 2;
  }
}

export async function buildLeaderboardV2(
  db: D1Database,
  guildId: string,
  weekStartDate?: string
): Promise<LeaderboardV2Result> {
  let targetWeekStart = weekStartDate;
  if (!targetWeekStart) {
    const settings = await getGuildSettings(db, guildId);
    const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
    const localDate = toLocalDateString(new Date(), timezone);
    targetWeekStart = getWeekStartDate(localDate);
  }
  const weekEndDate = getWeekEndDate(targetWeekStart);
  const cycle = await getWeeklyGoalCycle(db, guildId, targetWeekStart);
  if (!cycle) {
    return { entries: [], weekStartDate: targetWeekStart, weekEndDate };
  }

  const goals = await getUserDailyGoalsForCycle(db, cycle.id);
  const completionRows = await getWeeklyGoalCompletionCounts(db, guildId, targetWeekStart, weekEndDate);
  const completionMap = new Map<string, number>();
  for (const row of completionRows) {
    completionMap.set(
      row.discord_user_id + ":" + row.goal_item_id,
      row.count
    );
  }

  const entries = await Promise.all(goals.map(async (goal) => {
    const items = await getUserDailyGoalItems(db, goal.id);
    const activeDays = Math.max(0, 7 - getRestDayCount(goal.rest_days_json));
    const targetCount = Math.max(1, activeDays * items.length);
    let completionCount = 0;
    for (const item of items) {
      const count = completionMap.get(goal.discord_user_id + ":" + item.id) ?? 0;
      completionCount += Math.min(count, activeDays);
    }
    const achievementRate = Math.min(Math.round((completionCount / targetCount) * 100), 100);
    const user = await getUser(db, guildId, goal.discord_user_id);
    return {
      rank: 0,
      displayName: user?.display_name_snapshot ?? goal.discord_user_id,
      completionCount,
      targetCount,
      achievementRate,
    };
  }));

  entries.sort((a, b) => {
    if (b.achievementRate !== a.achievementRate) return b.achievementRate - a.achievementRate;
    if (b.completionCount !== a.completionCount) return b.completionCount - a.completionCount;
    return a.displayName.localeCompare(b.displayName);
  });

  return {
    entries: entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    weekStartDate: targetWeekStart,
    weekEndDate,
  };
}
