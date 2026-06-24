import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getWeeklyVacationCycle, insertWeeklyVacationCycle } from "../db/vacation-cycle.repository.js";
import { createMessage, getChannel, startThreadFromMessage } from "../discord/rest.js";
import { toLocalDateString, getWeekStartDate, weekLabel } from "../domain/date.js";
import { getLatestWeeklyGoalCycleWeekNumber } from "../db/weekly-goal-cycles.repository.js";
import { MessageFlags } from "../types.js";
import type { WeeklyVacationCycleRow } from "../db/types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";
export const VACATION_SUBMIT_BUTTON_ID = "vacation:submit";

export async function ensureCurrentVacationCycle(
  db: D1Database,
  guildId: string,
  botToken: string,
  now = new Date()
): Promise<WeeklyVacationCycleRow> {
  const settings = await getGuildSettings(db, guildId);
  const tz = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDate = toLocalDateString(now, tz);
  const weekStart = getWeekStartDate(localDate);
  const weekNum = await getLatestWeeklyGoalCycleWeekNumber(db, guildId);
  const label = weekLabel(weekNum, weekStart);

  const existing = await getWeeklyVacationCycle(db, guildId, weekStart);
  if (existing) {
    try {
      const thread = await getChannel(existing.thread_id, botToken);
      if (thread.parent_id === settings?.vacation_channel_id) {
        return existing;
      }
    } catch {
      // 아래에서 재생성
    }
    await db.prepare("DELETE FROM weekly_vacation_cycles WHERE id = ?").bind(existing.id).run();
  }

  const channelId = settings?.vacation_channel_id;
  if (!channelId) throw new Error("vacation_channel_id not configured");

  const title = label + " 휴가";
  const opener = await createMessage(channelId, botToken, {
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        accent_color: 0xFF69B4,
        components: [
          { type: 10, content: "## 🏖️ " + title },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: "이번 주 휴가 신청은 이 카드 또는 연결된 쓰레드에서 진행하세요." },
          {
            type: 1,
            components: [
              { type: 2, style: 1, label: "휴가 신청", custom_id: VACATION_SUBMIT_BUTTON_ID },
            ],
          },
        ],
      },
    ],
  });
  const thread = await startThreadFromMessage(channelId, opener.id, botToken, {
    name: title,
    auto_archive_duration: 10080,
    rate_limit_per_user: 0,
  });

  // 스레드 인트로 카드 + 버튼
  await createMessage(thread.id, botToken, {
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        accent_color: 0xFF69B4,
        components: [
          { type: 10, content: "## 🏖️ " + title },
          { type: 14, divider: true, spacing: 1 },
          { type: 10, content: "이번 주 휴가를 아래 버튼으로 신청하세요.\n휴가일은 오늘 인증 알림에서 제외됩니다." },
          {
            type: 1,
            components: [
              { type: 2, style: 1, label: "휴가 신청", custom_id: VACATION_SUBMIT_BUTTON_ID },
            ],
          },
        ],
      },
    ],
  });

  return insertWeeklyVacationCycle(db, {
    guildId,
    weekStartDate: weekStart,
    threadId: thread.id,
    title,
  });
}
