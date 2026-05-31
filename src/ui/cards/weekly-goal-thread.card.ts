import { container, section, separator, type CardBuildResult } from "../builders/components.js";

export function buildWeeklyGoalThreadIntroCard(input: {
  weekLabel: string;
  periodLabel: string;
  defaultRestDaysLabel: string;
  createGoalButtonId: string;
}): CardBuildResult {
  return {
    components: [
      container(
        [
          section(
            "## 이번 주 목표 작성\n" +
              input.weekLabel +
              " (" +
              input.periodLabel +
              ")\n" +
              "이번 주 데일리 목표를 작성해 주세요."
          ),
          separator(),
          section("기본 휴식일: **" + input.defaultRestDaysLabel + "**"),
          section(
            "**무엇을 작성하나요?**\n- 데일리 목표 항목\n- 항목별 인증 방식\n- 휴식일",
            {
              type: 2,
              style: 1,
              label: "내 목표 작성",
              custom_id: input.createGoalButtonId,
            }
          ),
        ],
        10181046
      ),
    ],
  };
}
