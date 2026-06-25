import { deferredEphemeralResponse, sendFollowup } from "../discord/response.js";
import { getUser } from "../db/users.repository.js";
import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getLatestWeeklyGoalCycle, getLatestWeeklyGoalCycleWeekNumber } from "../db/weekly-goal-cycles.repository.js";
import { getOperationalWeekStartDate, getWeekEndDate, weekLabel } from "../domain/date.js";
import { MessageFlags } from "../types.js";
import type { DiscordInteraction, Env } from "../types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

export function handleProfileCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleProfileAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleProfileAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const discordUser = interaction.member?.user ?? interaction.user;
  if (!guildId || !discordUser) return;

  const db = env.DB;
  const userId = discordUser.id;

  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const now = new Date();
  const weekStartDate = getOperationalWeekStartDate(
    now, timezone,
    settings?.week_start_day ?? 1,
    settings?.week_start_time ?? "00:00"
  );
  const weekEndDate = getWeekEndDate(weekStartDate);

  const user = await getUser(db, guildId, userId);
  const totalPoints = user?.total_points ?? 0;
  const displayName = user?.display_name_snapshot ?? discordUser.global_name ?? discordUser.username;

  // 이번 주 인증 수
  const weekRow = await db
    .prepare(`
      SELECT COUNT(*) as cnt
      FROM daily_checkin_entries dce
      JOIN daily_checkin_cycles dcc ON dcc.id = dce.daily_checkin_cycle_id
      WHERE dce.guild_id = ? AND dce.discord_user_id = ?
        AND dce.status IN ('valid', 'late')
        AND dcc.checkin_date >= ? AND dcc.checkin_date <= ?
    `)
    .bind(guildId, userId, weekStartDate, weekEndDate)
    .first<{ cnt: number }>();
  const weekCheckins = weekRow?.cnt ?? 0;

  // 전체 누적 인증 수
  const totalRow = await db
    .prepare(`
      SELECT COUNT(*) as cnt
      FROM daily_checkin_entries
      WHERE guild_id = ? AND discord_user_id = ? AND status IN ('valid', 'late')
    `)
    .bind(guildId, userId)
    .first<{ cnt: number }>();
  const totalCheckins = totalRow?.cnt ?? 0;

  // 현재 Loop 정보
  const weekNum = await getLatestWeeklyGoalCycleWeekNumber(db, guildId);
  const label = weekLabel(weekNum, weekStartDate);

  // 이번 주 경과 일수 (달성률 기준)
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const start = new Date(weekStartDate + "T00:00:00");
  const elapsed = Math.min(Math.max(Math.floor((localNow.getTime() - start.getTime()) / 86400000) + 1, 1), 7);
  const rate = elapsed > 0 ? Math.min(Math.round((weekCheckins / elapsed) * 100), 100) : 0;

  // 이번 주 평일 인증 수 (보너스 진행도)
  const weekdayRow = await db
    .prepare(`
      SELECT COUNT(*) as cnt
      FROM daily_checkin_entries dce
      JOIN daily_checkin_cycles dcc ON dcc.id = dce.daily_checkin_cycle_id
      WHERE dce.guild_id = ? AND dce.discord_user_id = ?
        AND dce.status IN ('valid', 'late')
        AND dcc.checkin_date >= ? AND dcc.checkin_date <= ?
        AND (CAST(strftime('%w', dcc.checkin_date) AS INTEGER) BETWEEN 1 AND 5)
    `)
    .bind(guildId, userId, weekStartDate, weekEndDate)
    .first<{ cnt: number }>();
  const weekdayCheckins = Math.min(weekdayRow?.cnt ?? 0, 5);

  const progressBar = (filled: number, total: number) =>
    "█".repeat(filled) + "░".repeat(total - filled);

  const components = [
    {
      type: 17,
      accent_color: 0x5865F2,
      components: [
        {
          type: 9,
          components: [{ type: 10, content: "## 👤 " + displayName + " 프로필" }],
          accessory: {
            type: 11,
            media: { url: "https://cdn.discordapp.com/emojis/1519584799541563516.png" },
          },
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 10,
          content: [
            "### 🪙 누적 포인트",
            "**" + totalPoints.toLocaleString() + " p**",
          ].join("\n"),
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 10,
          content: [
            "### 📊 " + label + " 현황",
            "달성률: **" + rate + "%**  ·  인증: **" + weekCheckins + "/" + elapsed + "일**",
            "",
            "평일 보너스 진행: " + progressBar(weekdayCheckins, 5) + " " + weekdayCheckins + "/5",
            weekdayCheckins >= 5 ? "✅ 이번 주 +300p 보너스 달성!" : "(" + (5 - weekdayCheckins) + "일 더 인증하면 +300p)",
          ].join("\n"),
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 10,
          content: "📅 전체 누적 인증: **" + totalCheckins + "회**",
        },
      ],
    },
  ];

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
    flags: MessageFlags.IS_COMPONENTS_V2,
    components,
  });
}
