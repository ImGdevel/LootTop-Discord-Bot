import { deferredResponse, sendFollowup } from "../discord/response.js";
import { buildLeaderboardFlow } from "../flows/leaderboard.flow.js";
import type { DiscordInteraction, Env } from "../types.js";

export function handleLeaderboardCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleLeaderboardAsync(interaction, env));
  return deferredResponse();
}

async function handleLeaderboardAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  if (!guildId) return;
  const payload = await buildLeaderboardFlow(env.DB, guildId);
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
    flags: payload.flags,
    components: payload.components,
  });
}
