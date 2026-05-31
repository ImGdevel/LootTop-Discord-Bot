import { button, container, section, separator, textBlock, type CardBuildResult } from "../builders/components.js";

export function buildCheckinEntryCard(input: {
  memberDisplay: string;
  submittedAtLabel: string;
  items: Array<{
    label: string;
    statusLabel: string;
    detail?: string | null;
  }>;
  referenceUrl?: string | null;
  appendButtonId?: string;
}): CardBuildResult {
  const itemSummary = input.items
    .map((item) => "- " + item.label + ": " + item.statusLabel)
    .join("\n");
  const detailLines = input.items
    .filter((item) => item.detail)
    .map((item) => "- " + item.label + ": " + item.detail)
    .join("\n");

  return {
    components: [
      container(
        [
          textBlock(
            "## 오늘의 인증\n### " +
              input.memberDisplay +
              "\n" +
              input.submittedAtLabel +
              " 제출"
          ),
          separator(),
          section(
            "**완료한 항목**\n" + (itemSummary || "- 제출된 항목 없음"),
            input.appendButtonId
              ? button({
                  label: "추가 인증",
                  customId: input.appendButtonId,
                  style: 1,
                })
              : undefined
          ),
          ...(detailLines ? [section("**세부 내용**\n" + detailLines)] : []),
          ...(input.referenceUrl ? [section("**참고 링크**\n" + input.referenceUrl)] : []),
        ],
        5763719
      ),
    ],
  };
}
