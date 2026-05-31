import { container, section, separator, type CardBuildResult } from "../builders/components.js";

export function buildDailyCheckinThreadIntroCard(input: {
  dateLabel: string;
  closeAtLabel: string;
  submitButtonId: string;
}): CardBuildResult {
  return {
    components: [
      container(
        [
          section(
            "## " +
              input.dateLabel +
              " 인증\n오늘 완료한 목표 항목만 선택해서 인증해 주세요."
          ),
          separator(),
          section("마감 시각: **" + input.closeAtLabel + "**"),
          section(
            "**인증 안내**\n- 오늘 수행한 항목만 제출 가능\n- 같은 날 여러 번 추가 인증 가능",
            {
              type: 2,
              style: 1,
              label: "오늘 인증",
              custom_id: input.submitButtonId,
            }
          ),
        ],
        3066993
      ),
    ],
  };
}
