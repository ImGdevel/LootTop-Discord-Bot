import { button, container, section, separator, textBlock, type CardBuildResult } from "../builders/components.js";

export function buildGoalSummaryCard(input: {
  memberDisplay: string;
  weekLabel: string;
  periodLabel: string;
  goals: Array<{
    label: string;
    proofTypeLabel: string;
  }>;
  restDaysLabel: string;
  editButtonId?: string;
}): CardBuildResult {
  const visibleGoals = input.goals.slice(0, 5);
  const extraCount = Math.max(0, input.goals.length - visibleGoals.length);

  const goalLines = visibleGoals.map((goal) => "- " + goal.label).join("\n");
  const proofLines = visibleGoals
    .map((goal) => "- " + goal.label + ": " + goal.proofTypeLabel)
    .join("\n");

  const proofSectionButton = input.editButtonId
    ? button({
        label: "목표 수정",
        customId: input.editButtonId,
        style: 2,
      })
    : undefined;

  return {
    components: [
      container(
        [
          textBlock(
            "## 이번 주 목표\n### " +
              input.memberDisplay +
              "\n" +
              input.weekLabel +
              " (" +
              input.periodLabel +
              ")"
          ),
          separator(),
          section(
            "**데일리 목표**\n" +
              goalLines +
              (extraCount > 0 ? "\n- 외 " + extraCount + "개" : "")
          ),
          section("**인증 방식**\n" + proofLines, proofSectionButton),
          section("**휴식일**\n" + input.restDaysLabel),
        ],
        3447003
      ),
    ],
  };
}
