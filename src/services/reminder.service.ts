import { getAllGuildSettings } from "../db/guild-settings.repository.js";
import { isScheduledTime } from "../domain/date.js";
import type { GuildSettingsRow } from "../db/types.js";
import { ensureCurrentWeeklyGoalCycle } from "./goal-cycle-v2.service.js";
import { ensureCurrentVacationCycle } from "./vacation-cycle.service.js";
import { sendDailyReminder } from "./reminder-notification.service.js";
import { closeExpiredCheckinCycles, ensureTodayCheckinCycle } from "./checkin-cycle-v2.service.js";
import { ensureWeeklyLeaderboardCycle } from "./leaderboard-cycle-v2.service.js";

type CronAction = "goal_cycle" | "checkin_open" | "checkin_close" | "reminder";

function detectActions(settings: GuildSettingsRow, nowUtc: Date): CronAction[] {
  const tz = settings.timezone;
  const localNow = new Date(nowUtc.toLocaleString("en-US", { timeZone: tz }));
  const day = localNow.getDay();
  const actions: CronAction[] = [];

  const goalDay = settings.goal_publish_day ?? settings.week_start_day ?? 1;
  if (day === goalDay && isScheduledTime(nowUtc, settings.goal_publish_time ?? "18:00", tz)) {
    actions.push("goal_cycle");
  }

  const openDay = settings.checkin_thread_open_day;
  if ((openDay === null || day === openDay) && isScheduledTime(nowUtc, settings.checkin_thread_open_time ?? "04:00", tz)) {
    actions.push("checkin_open");
  }

  const closeDay = settings.checkin_thread_close_day;
  if ((closeDay === null || day === closeDay) && isScheduledTime(nowUtc, settings.checkin_thread_close_time ?? "04:00", tz)) {
    actions.push("checkin_close");
  }

  if (isScheduledTime(nowUtc, settings.checkin_reminder_time ?? "23:59", tz)) {
    actions.push("reminder");
  }

  return actions;
}

export async function runCronForAllGuilds(db: D1Database, botToken: string, nowUtc = new Date()): Promise<void> {
  const allSettings = await getAllGuildSettings(db);

  let processed = 0;
  let skipped = 0;

  for (const settings of allSettings) {
    const actions = detectActions(settings, nowUtc);
    if (actions.length === 0) {
      skipped++;
      continue;
    }

    for (const action of actions) {
      try {
        await dispatchAction(db, botToken, settings, action);
        processed++;
      } catch (err) {
        console.error("Cron dispatch failed for guild " + settings.guild_id + " action=" + action + ":", err);
      }
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
    // 1. 이전 주 리더보드 확정 (새 goal cycle 삽입 전 — Loop N 데이터 캡처)
    await ensureWeeklyLeaderboardCycle(db, settings.guild_id, botToken);
    // 2. 새 주 목표 포럼 생성 (Loop N+1 삽입)
    await ensureCurrentWeeklyGoalCycle(db, settings.guild_id, botToken);
    // 3. 휴가 스레드 생성 (Loop N+1 참조)
    await ensureCurrentVacationCycle(db, settings.guild_id, botToken);
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

  if (action === "reminder") {
    await sendDailyReminder(db, settings.guild_id, botToken);
  }
}
