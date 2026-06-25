import { deferredEphemeralResponse, sendFollowup } from "../discord/response.js";
import { ensureV2GuildSetup } from "../services/guild-setup-v2.service.js";
import { ensureTodayCheckinCycle } from "../services/checkin-cycle-v2.service.js";
import { ensureCurrentWeeklyGoalCycle } from "../services/goal-cycle-v2.service.js";
import { ensureWeeklyLeaderboardCycle } from "../services/leaderboard-cycle-v2.service.js";
import { getGuildSettings } from "../db/guild-settings.repository.js";
import { handleRefreshAsync } from "../interactions/refresh.handler.js";
import { ensureCurrentVacationCycle } from "../services/vacation-cycle.service.js";
import { forbiddenResponse, hasManageGuild, processSettingsOptions } from "./settings.handler.js";
import { getLatestWeeklyGoalCycle, updateWeeklyGoalCycleWeekNumber } from "../db/weekly-goal-cycles.repository.js";
import { upsertGuildSettings } from "../db/guild-settings.repository.js";
import type { DiscordInteraction, Env } from "../types.js";

export function handleSettings(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  if (!hasManageGuild(interaction)) return forbiddenResponse();
  ctx.waitUntil(runSettings(interaction, env));
  return deferredEphemeralResponse();
}

export function handleRefresh(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  if (!hasManageGuild(interaction)) return forbiddenResponse();
  ctx.waitUntil(
    handleRefreshAsync(interaction.guild_id!, env, env.DISCORD_APPLICATION_ID, interaction.token)
      .catch((err) => console.error("[handleRefresh] error:", err))
  );
  return deferredEphemeralResponse();
}

export function handleInit(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  if (!hasManageGuild(interaction)) return forbiddenResponse();
  ctx.waitUntil(
    runInitialize(env, interaction.guild_id!, env.DISCORD_APPLICATION_ID, interaction.token)
      .catch((err) => console.error("[handleInit] error:", err))
  );
  return deferredEphemeralResponse();
}

export function handleVerify(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  if (!hasManageGuild(interaction)) return forbiddenResponse();
  ctx.waitUntil(
    runVerify(env.DB, interaction.guild_id!, env.DISCORD_APPLICATION_ID, interaction.token)
      .catch((err) => console.error("[handleVerify] error:", err))
  );
  return deferredEphemeralResponse();
}

async function runSettings(interaction: DiscordInteraction, env: Env): Promise<void> {
  const guildId = interaction.guild_id!;
  const appId = env.DISCORD_APPLICATION_ID;
  const token = interaction.token;
  const options = (interaction.data as any)?.options as any[] | undefined;
  const subcommand = options?.[0]?.name as string | undefined;

  try {
    if (subcommand === "주차") {
      const n = options?.[0]?.options?.find((o: any) => o.name === "번호")?.value as number | undefined;
      if (!n || n < 1) { await sendFollowup(appId, token, "올바른 주차 번호를 입력해 주세요.", { ephemeral: true }); return; }
      await upsertGuildSettings(env.DB, guildId, { week_number_start: n });
      const latest = await getLatestWeeklyGoalCycle(env.DB, guildId);
      if (latest) await updateWeeklyGoalCycleWeekNumber(env.DB, latest.id, n);
      await sendFollowup(appId, token, "✅ 이번 주부터 **Loop " + n + "**로 표시됩니다.", { ephemeral: true });
      return;
    }

    if (subcommand === "갱신") {
      await handleRefreshAsync(guildId, env, appId, token);
      return;
    }
    if (subcommand === "초기화") {
      await runInitialize(env, guildId, appId, token);
      return;
    }
    if (subcommand === "검증") {
      await runVerify(env.DB, guildId, appId, token);
      return;
    }
    await processSettingsOptions(env.DB, guildId, appId, token, options);
  } catch (err) {
    console.error("[settings] error:", err);
    await sendFollowup(appId, token, "처리 중 오류가 발생했습니다: " + String(err), { ephemeral: true });
  }
}

async function runInitialize(
  env: Env,
  guildId: string,
  appId: string,
  token: string
): Promise<void> {
  // 1단계: 채널 생성 (없는 경우에만)
  const { settings, createdChannels } = await ensureV2GuildSetup(env.DB, guildId, env.DISCORD_BOT_TOKEN);
  const channelMsg = createdChannels.length > 0
    ? "**생성된 채널:** " + createdChannels.join(", ")
    : "채널은 이미 모두 구성되어 있습니다.";

  // 2단계: 스레드/포럼 게시글 생성 (없는 경우에만)
  const cycleResults: string[] = [];

  try {
    const cycle = await ensureTodayCheckinCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    cycleResults.push("✅ 인증 스레드: <#" + cycle.thread_id + ">");
  } catch (err) {
    cycleResults.push("⚠️ 인증 스레드: " + String(err));
  }

  try {
    const goal = await ensureCurrentWeeklyGoalCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    cycleResults.push("✅ 목표 포럼: <#" + goal.forum_thread_id + ">");
  } catch (err) {
    cycleResults.push("⚠️ 목표 포럼: " + String(err));
  }

  try {
    const lb = await ensureWeeklyLeaderboardCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    cycleResults.push("✅ 리더보드: <#" + lb.forum_thread_id + ">");
  } catch (err) {
    cycleResults.push("⚠️ 리더보드: " + String(err));
  }

  try {
    const vc = await ensureCurrentVacationCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    cycleResults.push("✅ 휴가 스레드: <#" + vc.thread_id + ">");
  } catch (err) {
    cycleResults.push("⚠️ 휴가 스레드: " + String(err));
  }

  await sendFollowup(appId, token,
    "**초기화 완료**\n" + channelMsg + "\n\n**게시물/스레드**\n" + cycleResults.join("\n"),
    { ephemeral: true }
  );
}

async function runVerify(
  db: D1Database,
  guildId: string,
  appId: string,
  token: string
): Promise<void> {
  const settings = await getGuildSettings(db, guildId);

  if (!settings) {
    await sendFollowup(appId, token,
      "⚠️ 서버 설정이 없습니다. `/설정 초기화`를 먼저 실행해 주세요.",
      { ephemeral: true }
    );
    return;
  }

  const check = (label: string, value: string | null | undefined) =>
    (value ? "✅" : "❌") + " " + label + ": " + (value ? "<#" + value + ">" : "미설정");

  const lines = [
    "**채널 설정**",
    check("스터디 홈", settings.study_home_channel_id),
    check("목표 포럼", settings.goal_forum_channel_id),
    check("인증 채널", settings.checkin_channel_id),
    check("리더보드 포럼", settings.leaderboard_forum_channel_id),
    "",
    "**스케줄 설정**",
    "🕐 일간갱신 (인증): `" + (settings.checkin_thread_open_time ?? "미설정") + "`",
    "🕐 주간갱신 (목표·리더보드): `" + (settings.goal_publish_time ?? "미설정") + "`",
    "🌏 타임존: `" + (settings.timezone ?? "미설정") + "`",
  ];

  await sendFollowup(appId, token, lines.join("\n"), { ephemeral: true });
}
