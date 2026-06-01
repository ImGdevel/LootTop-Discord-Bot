import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getDailyCheckinCycle } from "../db/daily-checkin-cycles.repository.js";
import { getVacationUserIds } from "../db/vacation-entries.repository.js";
import { toLocalDateString, getWeekStartDate } from "../domain/date.js";
import { createMessage } from "../discord/rest.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

/**
 * 오늘 목표 작성 O + 인증 X + 휴가 X 인 유저에게 알림 채널에 멘션 전송
 */
export async function sendDailyReminder(
  db: D1Database,
  guildId: string,
  botToken: string
): Promise<void> {
  const settings = await getGuildSettings(db, guildId);
  if (!settings?.notification_channel_id) return;

  const tz = settings.timezone ?? DEFAULT_TIMEZONE;
  const today = toLocalDateString(new Date(), tz);
  const weekStart = getWeekStartDate(today);

  // 이번 주 목표 작성한 유저 목록
  const goalUsers = await db
    .prepare(`
      SELECT DISTINCT discord_user_id FROM user_daily_goals
      WHERE guild_id = ?
        AND weekly_goal_cycle_id IN (
          SELECT id FROM weekly_goal_cycles WHERE guild_id = ? AND week_start_date = ?
        )
        AND status = 'active'
    `)
    .bind(guildId, guildId, weekStart)
    .all<{ discord_user_id: string }>();

  if (goalUsers.results.length === 0) return;

  // 오늘 인증한 유저 목록
  const todayCycle = await getDailyCheckinCycle(db, guildId, today);
  const checkedInIds = new Set<string>();
  if (todayCycle) {
    const entries = await db
      .prepare("SELECT DISTINCT discord_user_id FROM daily_checkin_entries WHERE daily_checkin_cycle_id = ? AND status = 'valid'")
      .bind(todayCycle.id)
      .all<{ discord_user_id: string }>();
    entries.results.forEach((r) => checkedInIds.add(r.discord_user_id));
  }

  // 오늘 휴가인 유저 목록
  const vacationIds = new Set(await getVacationUserIds(db, guildId, today));

  // 리마인드 대상 = 목표 O + 인증 X + 휴가 X
  const targets = goalUsers.results
    .map((r) => r.discord_user_id)
    .filter((id) => !checkedInIds.has(id) && !vacationIds.has(id));

  if (targets.length === 0) return;

  const mentions = targets.map((id) => "<@" + id + ">").join(" ");
  const message =
    "📢 **오늘 인증을 아직 올리지 않은 분들이에요!**\n" +
    mentions + "\n\n" +
    "인증 마감 전에 잊지 말고 인증을 올려주세요 💪";

  await createMessage(settings.notification_channel_id, botToken, { content: message });
}
