import { buildLeaderboardV2 } from "../services/leaderboard-v2.service.js";
import { buildLeaderboardCard } from "../ui/cards/leaderboard.card.js";
import { V2_BUTTON_IDS } from "../ui/builders/ids.js";
import { MessageFlags } from "../types.js";

export async function buildLeaderboardFlow(
  db: D1Database,
  guildId: string,
  weekStartDate?: string
): Promise<{ flags: number; components: unknown[] }> {
  const result = await buildLeaderboardV2(db, guildId, weekStartDate);
  const entries = result.entries;
  const average = entries.length === 0
    ? 0
    : Math.round(entries.reduce((sum, entry) => sum + entry.achievementRate, 0) / entries.length);
  const top3 = entries.slice(0, 3).map((entry) => ({
    rank: entry.rank,
    display: entry.displayName,
    rateLabel: entry.achievementRate + "%",
  }));
  const bottom3 = [...entries]
    .sort((a, b) => a.achievementRate - b.achievementRate)
    .slice(0, 3)
    .map((entry) => ({
      rank: entry.rank,
      display: entry.displayName,
      rateLabel: entry.achievementRate + "%",
    }));
  const rankingPreview = entries.slice(0, 10).map((entry) => ({
    rank: entry.rank,
    display: entry.displayName,
    rateLabel: entry.achievementRate + "%",
    progressLabel: entry.completionCount + "/" + entry.targetCount,
  }));

  const card = buildLeaderboardCard({
    weekLabel: "이번 주",
    periodLabel: result.weekStartDate + " ~ " + result.weekEndDate,
    participantCount: entries.length,
    averageRateLabel: average + "%",
    top3,
    bottom3,
    rankingPreview,
    myRankButtonId: V2_BUTTON_IDS.LEADERBOARD_VIEW_SELF,
  });

  return {
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: card.components,
  };
}
