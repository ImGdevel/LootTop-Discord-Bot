import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getDailyCheckinCycle } from "../db/daily-checkin-cycles.repository.js";
import { buildDailyCheckinThreadIntroCard } from "../ui/cards/daily-checkin-thread.card.js";
import { buildCheckinEntryCard } from "../ui/cards/checkin-entry.card.js";
import { V2_BUTTON_IDS } from "../ui/builders/ids.js";
import { MessageFlags } from "../types.js";
import { fetchMyCheckinStatus } from "../services/checkin.service.js";
import { toLocalDateString } from "../domain/date.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export async function buildTodayCheckinFlow(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<{ flags: number; components: unknown[] }> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDateStr = toLocalDateString(new Date(), timezone);
  const cycle = await getDailyCheckinCycle(db, guildId, localDateStr);
  const status = await fetchMyCheckinStatus(db, guildId, discordUserId);

  if (!status) {
    const card = buildDailyCheckinThreadIntroCard({
      dateLabel: localDateStr,
      closeAtLabel: cycle?.closes_at ?? "미정",
      submitButtonId: V2_BUTTON_IDS.CHECKIN_SUBMIT,
    });
    return {
      flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
      components: card.components,
    };
  }

  const card = buildCheckinEntryCard({
    memberDisplay: "내 인증 현황",
    submittedAtLabel: localDateStr,
    items: status.checkins.map((checkin) => ({
      label: checkin.checkin_date,
      statusLabel: "완료",
      detail: checkin.content,
    })),
    appendButtonId: V2_BUTTON_IDS.CHECKIN_SUBMIT,
  });

  return {
    flags: MessageFlags.EPHEMERAL | MessageFlags.IS_COMPONENTS_V2,
    components: card.components,
  };
}
