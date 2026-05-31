import { getAllGuildSettings } from "../db/guild-settings.repository.js";
import { sendChannelMessage } from "../discord/response.js";
import { buildLeaderboard, formatLeaderboard } from "./leaderboard.service.js";
import { isScheduledTime } from "../domain/date.js";
import type { GuildSettingsRow } from "../db/types.js";
import { BUTTON_IDS } from "../commands/definitions.js";

type CronAction = "plan_reminder" | "checkin_reminder" | "leaderboard";

/**
 * 현재 UTC 시각 기준으로 각 길드의 설정 시간과 비교해 실행할 액션을 결정한다.
 * 허용 오차: ±5분
 */
function detectAction(settings: GuildSettingsRow, nowUtc: Date): CronAction | null {
  const tz = settings.timezone;

  // 월요일 계획 리마인더
  if (settings.plan_reminder_time) {
    const localNow = new Date(nowUtc.toLocaleString("en-US", { timeZone: tz }));
    if (localNow.getDay() === 1 && isScheduledTime(nowUtc, settings.plan_reminder_time, tz)) {
      return "plan_reminder";
    }
  }

  // 화~일 인증 리마인더
  if (settings.checkin_reminder_time) {
    const localNow = new Date(nowUtc.toLocaleString("en-US", { timeZone: tz }));
    const day = localNow.getDay();
    if (day !== 1 && isScheduledTime(nowUtc, settings.checkin_reminder_time, tz)) {
      return "checkin_reminder";
    }
  }

  // 일요일 리더보드 자동 게시
  if (settings.leaderboard_publish_time) {
    const localNow = new Date(nowUtc.toLocaleString("en-US", { timeZone: tz }));
    if (localNow.getDay() === 0 && isScheduledTime(nowUtc, settings.leaderboard_publish_time, tz)) {
      return "leaderboard";
    }
  }

  return null;
}

export async function runCronForAllGuilds(db: D1Database, botToken: string): Promise<void> {
  const allSettings = await getAllGuildSettings(db);
  const nowUtc = new Date();

  let processed = 0;
  let skipped = 0;

  for (const settings of allSettings) {
    const action = detectAction(settings, nowUtc);
    if (!action) {
      skipped++;
      continue;
    }

    try {
      await dispatchAction(db, botToken, settings, action);
      processed++;
    } catch (err) {
      console.error("Cron dispatch failed for guild " + settings.guild_id + ":", err);
    }
  }

  console.log("Cron done. processed=" + processed + " skipped=" + skipped);
}

async function dispatchAction(
  db: D1Database,
  botToken: string,
  settings: GuildSettingsRow,
  action: CronAction
): Promise<void> {
  if (action === "plan_reminder") {
    const channelId = settings.plan_reminder_channel_id;
    if (!channelId) {
      console.log("plan_reminder_channel_id not set for guild " + settings.guild_id + ", skip");
      return;
    }
    const content = "📅 **이번 주 계획을 작성할 시간입니다!**\n아래 버튼을 눌러 이번 주 목표를 입력해 주세요.";
    const components = [
      {
        type: 1,
        components: [{ type: 2, style: 1, label: "계획 작성", custom_id: BUTTON_IDS.PLAN_WRITE }],
      },
    ];
    await sendChannelMessage(channelId, botToken, content, components);
  }

  if (action === "checkin_reminder") {
    const channelId = settings.checkin_channel_id;
    if (!channelId) {
      console.log("checkin_channel_id not set for guild " + settings.guild_id + ", skip");
      return;
    }
    const content = "✅ **오늘의 학습 인증 시간입니다!**\n아래 버튼을 눌러 오늘 한 일을 기록해 주세요.";
    const components = [
      {
        type: 1,
        components: [{ type: 2, style: 1, label: "오늘 인증", custom_id: BUTTON_IDS.CHECKIN_TODAY }],
      },
    ];
    await sendChannelMessage(channelId, botToken, content, components);
  }

  if (action === "leaderboard") {
    const channelId = settings.leaderboard_channel_id;
    if (!channelId) {
      console.log("leaderboard_channel_id not set for guild " + settings.guild_id + ", skip");
      return;
    }
    const result = await buildLeaderboard(db, settings.guild_id);
    const message = "🏆 **이번 주 최종 리더보드**\n\n" + formatLeaderboard(result);
    await sendChannelMessage(channelId, botToken, message);
  }
}
