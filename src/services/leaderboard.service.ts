import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getWeeklyPlansForLeaderboard } from "../db/weekly-plans.repository.js";
import { getCheckinCountsByWeek } from "../db/daily-checkins.repository.js";
import { toLocalDateString, getWeekStartDate } from "../domain/date.js";
import { getUser } from "../db/users.repository.js";
import type { WeeklyPlanRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  goalText: string;
  targetCount: number;
  checkinCount: number;
  achievementRate: number; // 0~100 (캡 적용)
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  weekStartDate: string;
  weekEndDate: string;
}

export async function buildLeaderboard(
  db: D1Database,
  guildId: string
): Promise<LeaderboardResult> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDateStr);

  const plans = await getWeeklyPlansForLeaderboard(db, guildId, weekStartDate);
  const countMap = await getCheckinCountsByWeek(db, guildId, weekStartDate);

  // 달성률 계산 + 정렬
  interface SortItem {
    plan: WeeklyPlanRow;
    checkinCount: number;
    achievementRate: number;
  }

  const items: SortItem[] = plans.map((plan) => {
    const checkinCount = countMap.get(plan.id) ?? 0;
    const raw = checkinCount / plan.target_count;
    const achievementRate = Math.min(Math.round(raw * 100), 100);
    return { plan, checkinCount, achievementRate };
  });

  items.sort((a, b) => {
    if (b.achievementRate !== a.achievementRate) return b.achievementRate - a.achievementRate;
    if (b.checkinCount !== a.checkinCount) return b.checkinCount - a.checkinCount;
    return a.plan.created_at.localeCompare(b.plan.created_at);
  });

  const entries: LeaderboardEntry[] = await Promise.all(
    items.map(async (item, i) => {
      const userRow = await getUser(db, guildId, item.plan.discord_user_id);
      const displayName = userRow?.display_name_snapshot ?? item.plan.discord_user_id;
      return {
        rank: i + 1,
        displayName,
        goalText: item.plan.goal_text,
        targetCount: item.plan.target_count,
        checkinCount: item.checkinCount,
        achievementRate: item.achievementRate,
      };
    })
  );

  const weekEndDate = plans[0]?.week_end_date ?? "";
  return { entries, weekStartDate, weekEndDate };
}

export function formatLeaderboard(result: LeaderboardResult): string {
  if (result.entries.length === 0) {
    return "이번 주 계획을 작성한 멤버가 없습니다.";
  }

  const lines = [
    "**이번 주 리더보드** (" + result.weekStartDate + " ~ " + result.weekEndDate + ")",
    "",
  ];

  for (const e of result.entries) {
    const bar = progressBar(e.achievementRate);
    lines.push(
      e.rank + ". **" + e.displayName + "**  " + e.achievementRate + "% " + bar +
      "  (" + e.checkinCount + "/" + e.targetCount + "회)"
    );
  }

  return lines.join("\n");
}

function progressBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}
