import { button, container, section, separator, textBlock, type CardBuildResult } from "../builders/components.js";

export function buildLeaderboardCard(input: {
  weekLabel: string;
  periodLabel: string;
  participantCount: number;
  averageRateLabel: string;
  top3: Array<{ rank: number; display: string; rateLabel: string }>;
  bottom3: Array<{ rank: number; display: string; rateLabel: string }>;
  rankingPreview: Array<{
    rank: number;
    display: string;
    rateLabel: string;
    progressLabel: string;
  }>;
  myRankButtonId?: string;
}): CardBuildResult {
  const top3Text = input.top3
    .map((entry) => entry.rank + ". " + entry.display + " - " + entry.rateLabel)
    .join("\n");
  const bottom3Text = input.bottom3
    .map((entry) => entry.rank + ". " + entry.display + " - " + entry.rateLabel)
    .join("\n");
  const rankingText = input.rankingPreview
    .map(
      (entry) =>
        entry.rank +
        ". " +
        entry.display +
        " " +
        entry.rateLabel +
        " (" +
        entry.progressLabel +
        ")"
    )
    .join("\n");

  return {
    components: [
      container(
        [
          textBlock(
            "## " +
              input.weekLabel +
              " 리더보드\n" +
              input.periodLabel +
              "\n참여자 " +
              input.participantCount +
              "명 · 평균 달성률 " +
              input.averageRateLabel
          ),
          separator(),
          section("**Top 3**\n" + (top3Text || "- 데이터 없음")),
          section(
            "**Bottom 3**\n" + (bottom3Text || "- 데이터 없음"),
            input.myRankButtonId
              ? button({
                  label: "내 순위 보기",
                  customId: input.myRankButtonId,
                  style: 2,
                })
              : undefined
          ),
          separator(),
          section("**전체 순위**\n" + (rankingText || "- 데이터 없음")),
        ],
        15844367
      ),
    ],
  };
}
