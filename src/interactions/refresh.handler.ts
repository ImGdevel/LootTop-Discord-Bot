import { deferredEphemeralResponse, sendFollowup } from "../discord/response.js";
import { ensureTodayCheckinCycle } from "../services/checkin-cycle-v2.service.js";
import { ensureCurrentWeeklyGoalCycle } from "../services/goal-cycle-v2.service.js";
import { ensureWeeklyLeaderboardCycle } from "../services/leaderboard-cycle-v2.service.js";
import type { DiscordInteraction, Env } from "../types.js";

export function handleRefreshCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleRefreshAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleRefreshAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id!;
  const results: string[] = [];

  // 인증 스레드
  try {
    const cycle = await ensureTodayCheckinCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    results.push("✅ 인증 스레드: <#" + cycle.thread_id + ">");
  } catch (err) {
    results.push("⚠️ 인증 스레드: " + String(err));
  }

  // 목표 포럼
  try {
    const goal = await ensureCurrentWeeklyGoalCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    results.push("✅ 목표 포럼: <#" + goal.forum_thread_id + ">");
  } catch (err) {
    results.push("⚠️ 목표 포럼: " + String(err));
  }

  // 리더보드
  try {
    const lb = await ensureWeeklyLeaderboardCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    results.push("✅ 리더보드: <#" + lb.forum_thread_id + ">");
  } catch (err) {
    results.push("⚠️ 리더보드: " + String(err));
  }

  await sendFollowup(
    env.DISCORD_APPLICATION_ID,
    interaction.token,
    "**갱신 결과**\n" + results.join("\n"),
    { ephemeral: true }
  );
}
