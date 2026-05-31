import { deferredEphemeralResponse, sendChannelMessage, sendFollowup } from "../discord/response.js";
import { buildStudyHomeFlow } from "../flows/study-home.flow.js";
import { ensureTodayCheckinCycle } from "../services/checkin-cycle-v2.service.js";
import { ensureV2GuildSetup } from "../services/guild-setup-v2.service.js";
import { ensureCurrentWeeklyGoalCycle } from "../services/goal-cycle-v2.service.js";
import { ensureWeeklyLeaderboardCycle } from "../services/leaderboard-cycle-v2.service.js";
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

  const canManageGuild = hasManageGuild(interaction);
  if (!canManageGuild) {
    const payload = await buildStudyHomeFlow(env.DB, guildId, user.id, env.DISCORD_BOT_TOKEN);
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
      flags: payload.flags,
      components: payload.components,
    });
    return;
  }

  const setup = await ensureV2GuildSetup(env.DB, guildId, env.DISCORD_BOT_TOKEN);
  await ensureCurrentWeeklyGoalCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
  await ensureTodayCheckinCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
  await ensureWeeklyLeaderboardCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
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

  await sendFollowup(
    env.DISCORD_APPLICATION_ID,
    interaction.token,
    setup.createdChannels.length > 0
      ? "V2 채널 초기화를 완료했습니다: " + setup.createdChannels.join(", ")
      : "V2 채널 구조가 이미 준비되어 있습니다.",
    { ephemeral: true }
  );

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
    flags: payload.flags,
    components: payload.components,
  });
}
