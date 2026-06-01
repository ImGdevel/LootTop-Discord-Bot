import { deferredEphemeralResponse, sendChannelMessage, sendFollowup } from "../discord/response.js";
import { buildStudyHomeFlow } from "../flows/study-home.flow.js";
import { ensureTodayCheckinCycle } from "../services/checkin-cycle-v2.service.js";
import { ensureV2GuildSetup } from "../services/guild-setup-v2.service.js";
import { ensureCurrentWeeklyGoalCycle } from "../services/goal-cycle-v2.service.js";
import { ensureCurrentVacationCycle } from "../services/vacation-cycle.service.js";
import { MessageFlags, type DiscordInteraction, type Env } from "../types.js";

const MANAGE_GUILD = 0x20n;

function hasManageGuild(interaction: DiscordInteraction): boolean {
  const perms = interaction.member?.permissions;
  if (!perms) return false;
  try {
    return (BigInt(perms) & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

export function handleHomeCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleHomeCommandAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleHomeCommandAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  // 모든 사용자: 오늘 쓰레드/목표 글 없으면 자동 생성 (있으면 스킵)
  try { await ensureCurrentWeeklyGoalCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN); } catch { /* 채널 미설정 시 무시 */ }
  try { await ensureTodayCheckinCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN); } catch { /* 채널 미설정 시 무시 */ }
  try { await ensureCurrentVacationCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN); } catch { /* 채널 미설정 시 무시 */ }

  const canManageGuild = hasManageGuild(interaction);

  if (!canManageGuild) {
    const payload = await buildStudyHomeFlow(env.DB, guildId, user.id, env.DISCORD_BOT_TOKEN);
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
      flags: payload.flags,
      components: payload.components,
    });
    return;
  }

  // 관리자: 채널 초기화도 수행
  const setup = await ensureV2GuildSetup(env.DB, guildId, env.DISCORD_BOT_TOKEN);
  try { await ensureCurrentWeeklyGoalCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN); } catch { /* noop */ }
  try { await ensureTodayCheckinCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN); } catch { /* noop */ }
  try { await ensureCurrentVacationCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN); } catch { /* noop */ }
  const payload = await buildStudyHomeFlow(env.DB, guildId, user.id, env.DISCORD_BOT_TOKEN);

  if (setup.createdChannels.length > 0 && setup.settings.study_home_channel_id) {
    await sendChannelMessage(
      setup.settings.study_home_channel_id,
      env.DISCORD_BOT_TOKEN,
      undefined,
      payload.components,
      MessageFlags.IS_COMPONENTS_V2
    );
  }

  const statusMsg = setup.createdChannels.length > 0
    ? "채널 초기화 완료: " + setup.createdChannels.join(", ")
    : "채널 구조가 이미 준비되어 있습니다.";

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, statusMsg, { ephemeral: true });
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
    flags: payload.flags,
    components: payload.components,
  });
}
