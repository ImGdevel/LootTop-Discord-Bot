import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getDailyCheckinCycle, insertDailyCheckinCycle, updateDailyCheckinCycleStatus } from "../db/daily-checkin-cycles.repository.js";
import { createMessage, createWebhook, editChannel, startThreadFromMessage } from "../discord/rest.js";
import { sendChannelMessage } from "../discord/response.js";
import { buildDailyCheckinThreadIntroCard } from "../ui/cards/daily-checkin-thread.card.js";
import { V2_BUTTON_IDS } from "../ui/builders/ids.js";
import { MessageFlags } from "../types.js";
import { toLocalDateString } from "../domain/date.js";
import { ensureV2GuildSetup } from "./guild-setup-v2.service.js";
import type { DailyCheckinCycleRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function ensureTodayCheckinCycle(
  db: D1Database,
  guildId: string,
  botToken: string,
  now = new Date()
): Promise<DailyCheckinCycleRow> {
  const { settings } = await ensureV2GuildSetup(db, guildId, botToken);
  const timezone = settings.timezone ?? DEFAULT_TIMEZONE;
  const localDate = toLocalDateString(now, timezone);

  const existing = await getDailyCheckinCycle(db, guildId, localDate);
  if (existing) return existing;

  const parentChannelId = settings.checkin_channel_id;
  if (!parentChannelId) {
    throw new Error("checkin channel is not configured");
  }

  const title = localDate + " 인증";
  const opener = await createMessage(parentChannelId, botToken, {
    content: "새 인증 쓰레드를 생성했습니다: **" + title + "**",
  });
  const thread = await startThreadFromMessage(parentChannelId, opener.id, botToken, {
    name: title,
    auto_archive_duration: 1440,
    rate_limit_per_user: 0,
  });

  const closeDate = addDays(localDate, 1);
  const closesAt = closeDate + "T" + (settings.checkin_thread_close_time ?? "04:00") + ":00";
  const introCard = buildDailyCheckinThreadIntroCard({
    dateLabel: localDate,
    closeAtLabel: closesAt,
    submitButtonId: V2_BUTTON_IDS.CHECKIN_SUBMIT,
  });

  await sendChannelMessage(thread.id, botToken, undefined, introCard.components, MessageFlags.IS_COMPONENTS_V2);

  // 인증 카드를 유저 프로필로 표시하기 위한 웹훅 생성
  let webhookId: string | undefined;
  let webhookToken: string | undefined;
  try {
    const webhook = await createWebhook(thread.id, botToken, "인증 카드");
    webhookId = webhook.id;
    webhookToken = webhook.token;
  } catch (err) {
    console.error("[checkin-cycle] 웹훅 생성 실패 (봇 메시지로 fallback):", err);
  }

  return insertDailyCheckinCycle(db, {
    guildId,
    checkinDate: localDate,
    threadId: thread.id,
    title,
    opensAt: now.toISOString(),
    closesAt,
    webhookId,
    webhookToken,
  });
}

export async function closeExpiredCheckinCycles(
  db: D1Database,
  botToken: string,
  nowIso: string
): Promise<number> {
  const { getOpenCheckinCyclesToClose } = await import("../db/daily-checkin-cycles.repository.js");
  const cycles = await getOpenCheckinCyclesToClose(db, nowIso);
  for (const cycle of cycles) {
    await updateDailyCheckinCycleStatus(db, cycle.id, "closed");
    try {
      await editChannel(cycle.thread_id, botToken, {
        archived: true,
        locked: true,
      });
    } catch (err) {
      console.error("Failed to archive thread " + cycle.thread_id + ":", err);
    }
  }
  return cycles.length;
}
