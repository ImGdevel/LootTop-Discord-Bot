import { button, container, section, separator, textBlock, type CardBuildResult } from "../builders/components.js";

export function buildStudyHomeCard(input: {
  weekLabel: string;
  goalThreadName?: string | null;
  checkinThreadName?: string | null;
  leaderboardThreadName?: string | null;
  myGoalStatusLabel: string;
  myTodayCheckinStatusLabel: string;
  buttons: {
    goal: string;
    checkin: string;
    leaderboard: string;
    refresh: string;
    settings?: string;
  };
}): CardBuildResult {
  return {
    components: [
      container(
        [
          textBlock("## 스터디 홈\n현재 주차: **" + input.weekLabel + "**"),
          separator(),
          section(
            "**이번 주 목표 글**\n" + (input.goalThreadName ?? "아직 생성되지 않음"),
            button({ label: "이번 주 목표", customId: input.buttons.goal, style: 1 })
          ),
          section(
            "**오늘 인증 쓰레드**\n" + (input.checkinThreadName ?? "아직 생성되지 않음"),
            button({ label: "오늘 인증", customId: input.buttons.checkin, style: 1 })
          ),
          section(
            "**최신 리더보드**\n" + (input.leaderboardThreadName ?? "아직 생성되지 않음"),
            button({ label: "리더보드", customId: input.buttons.leaderboard, style: 2 })
          ),
          separator(),
          section("**내 목표 상태**\n" + input.myGoalStatusLabel),
          section("**오늘 인증 상태**\n" + input.myTodayCheckinStatusLabel),
          section(
            "**빠른 작업**\n홈 상태를 새로고침하거나 서버 설정으로 이동할 수 있습니다.",
            button({
              label: input.buttons.settings ? "서버 설정" : "새로고침",
              customId: input.buttons.settings ?? input.buttons.refresh,
              style: input.buttons.settings ? 2 : 1,
            })
          ),
        ],
        5793266
      ),
    ],
  };
}
