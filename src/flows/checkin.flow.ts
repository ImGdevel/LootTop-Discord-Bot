import { buildDailyCheckinThreadIntroCard } from "../ui/cards/daily-checkin-thread.card.js";
import { buildCheckinEntryCard } from "../ui/cards/checkin-entry.card.js";
import { V2_BUTTON_IDS } from "../ui/builders/ids.js";
import { MessageFlags } from "../types.js";
import { getTodayCheckinContext, getTodayCheckinCount } from "../services/checkin-v2.service.js";

export async function buildTodayCheckinFlow(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  botToken: string
): Promise<{ flags: number; components: unknown[] }> {
  const context = await getTodayCheckinContext(db, guildId, discordUserId, botToken);

  if (!context) {
    const card = buildDailyCheckinThreadIntroCard({
      dateLabel: "오늘",
      closeAtLabel: "생성 후 안내",
      submitButtonId: V2_BUTTON_IDS.CHECKIN_SUBMIT,
    });
    return {
      flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
      components: card.components,
    };
  }

  const count = await getTodayCheckinCount(db, guildId, discordUserId, botToken);
  const card = buildCheckinEntryCard({
    memberDisplay: "내 인증 현황",
    submittedAtLabel: "오늘",
    items: context.goalItems.map((item) => ({
      label: item.label,
      statusLabel: count > 0 ? "인증 기록 있음" : "아직 없음",
    })),
    appendButtonId: V2_BUTTON_IDS.CHECKIN_SUBMIT,
  });

  return {
    flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
    components: card.components,
  };
}
