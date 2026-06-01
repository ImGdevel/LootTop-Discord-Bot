import { getAllGuildSettings } from "../db/guild-settings.repository.js";
import { isScheduledTime } from "../domain/date.js";
import type { GuildSettingsRow } from "../db/types.js";
import { ensureCurrentWeeklyGoalCycle } from "./goal-cycle-v2.service.js";
import { sendDailyReminder } from "./reminder-notification.service.js";
import { closeExpiredCheckinCycles, ensureTodayCheckinCycle } from "./checkin-cycle-v2.service.js";
import { ensureWeeklyLeaderboardCycle } from "./leaderboard-cycle-v2.service.js";

type CronAction = "goal_cycle" | "checkin_open" | "checkin_close" | "leaderboard_cycle" | "reminder";

/**
 * 현재 UTC 시각 기준으로 각 길드의 설정 시간과 비교해 실행할 액션을 결정한다.
 * 허용 오차: ±5분
 */
function detectAction(settings: GuildSettingsRow, nowUtc: Date): CronAction | null {
  const tz = settings.timezone;
  const localNow = new Date(nowUtc.toLocaleString("en-US", { timeZone: tz }));

  if (localNow.getDay() === 0 && isScheduledTime(nowUtc, settings.goal_publish_time ?? "18:00", tz)) {
    return "goal_cycle";
  }

  if (isScheduledTime(nowUtc, settings.checkin_thread_open_time ?? "04:00", tz)) {
    return "checkin_open";
  }

  if (isScheduledTime(nowUtc, settings.checkin_thread_close_time ?? "04:00", tz)) {
    return "checkin_close";
  }

  if (isScheduledTime(nowUtc, "23:59", tz)) {
    return "reminder";
  }

  if (localNow.getDay() === 1 && isScheduledTime(nowUtc, settings.leaderboard_publish_time ?? "00:00", tz)) {
    return "leaderboard_cycle";
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
  if (action === "goal_cycle") {
    await ensureCurrentWeeklyGoalCycle(db, settings.guild_id, botToken);
    return;
  }

  if (action === "checkin_open") {
    await ensureTodayCheckinCycle(db, settings.guild_id, botToken);
    return;
  }

  if (action === "checkin_close") {
    await closeExpiredCheckinCycles(db, botToken, new Date().toISOString());
    return;
  }

  if (action === "leaderboard_cycle") {
    await ensureWeeklyLeaderboardCycle(db, settings.guild_id, botToken);
    return;
  }

  if (action === "reminder") {
    await sendDailyReminder(db, settings.guild_id, botToken);
  }
}
