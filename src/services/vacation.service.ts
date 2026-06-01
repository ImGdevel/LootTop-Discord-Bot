import { insertVacationEntry, updateVacationMessageId, getVacationEntry } from "../db/vacation-entries.repository.js";
import { getGuildSettings } from "../db/guild-settings.repository.js";
import { ensureCurrentVacationCycle } from "./vacation-cycle.service.js";
import { executeWebhook, createMessage } from "../discord/rest.js";
import { MessageFlags } from "../types.js";

function isUnknownChannelError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Unknown Channel");
}

export async function submitVacation(
  db: D1Database,
  guildId: string,
  botToken: string,
  input: {
    discordUserId: string;
    displayName: string;
    avatarUrl: string;
    vacationDates: string[];
    reason: string | null;
  }
): Promise<{ created: string[]; skipped: string[] }> {
  const settings = await getGuildSettings(db, guildId);
  const cycle = await ensureCurrentVacationCycle(db, guildId, botToken);

  const created: string[] = [];
  const skipped: string[] = [];

  for (const date of input.vacationDates) {
    const existing = await getVacationEntry(db, guildId, input.discordUserId, date);
    if (existing) { skipped.push(date); continue; }

    const id = await insertVacationEntry(db, {
      guildId,
      discordUserId: input.discordUserId,
      vacationDate: date,
      reason: input.reason,
    });
    created.push(date);

    // 주간 스레드에 카드 게시
    try {
      const cardComponents = [
        { type: 10, content: "### 🏖️ 휴가 · " + date },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: input.reason ?? "사유 없음" },
      ];
      const messageBody: Record<string, unknown> = {
        flags: MessageFlags.IS_COMPONENTS_V2,
        components: [{ type: 17, accent_color: 0xFF69B4, components: cardComponents }],
      };

      let msg: { id: string };
        if (settings?.vacation_webhook_id && settings.vacation_webhook_token) {
          try {
            msg = await executeWebhook(
              settings.vacation_webhook_id,
              settings.vacation_webhook_token,
              cycle.thread_id,
              { ...messageBody, username: input.displayName, avatar_url: input.avatarUrl }
            );
          } catch (err) {
            if (!isUnknownChannelError(err)) throw err;
            msg = await createMessage(cycle.thread_id, botToken, messageBody);
          }
        } else {
          msg = await createMessage(cycle.thread_id, botToken, messageBody);
        }

      await updateVacationMessageId(db, id, msg.id);
    } catch (err) {
      console.error("[vacation] 카드 게시 실패:", err);
    }
  }

  return { created, skipped };
}
