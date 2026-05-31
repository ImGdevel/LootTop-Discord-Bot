import { deferredEphemeralResponse, deferredResponse, sendFollowup } from "../discord/response.js";
import { buildLeaderboard, formatLeaderboard } from "../services/leaderboard.service.js";
import { fetchCurrentWeekPlan } from "../services/plan.service.js";
import { fetchMyCheckinStatus } from "../services/checkin.service.js";
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

  const result = await buildLeaderboard(env.DB, guildId);
  const message = formatLeaderboard(result);
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, message);
}

export function handleMyPlanCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleMyPlanAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleMyPlanAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const plan = await fetchCurrentWeekPlan(env.DB, guildId, user.id);
  if (!plan) {
    await sendFollowup(
      env.DISCORD_APPLICATION_ID,
      interaction.token,
      "이번 주 계획이 없습니다. `/주간계획`으로 계획을 작성해 주세요.",
      { ephemeral: true }
    );
    return;
  }

  const message =
    "**내 이번 주 계획** (" + plan.week_start_date + " ~ " + plan.week_end_date + ")\n\n" +
    "**목표**: " + plan.goal_text + "\n" +
    "**목표 인증 횟수**: " + plan.target_count + "회";

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, message, { ephemeral: true });
}

export function handleMyCheckinStatusCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleMyCheckinStatusAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleMyCheckinStatusAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const result = await fetchMyCheckinStatus(env.DB, guildId, user.id);
  if (!result) {
    await sendFollowup(
      env.DISCORD_APPLICATION_ID,
      interaction.token,
      "이번 주 계획이 없습니다. `/주간계획`으로 계획을 작성해 주세요.",
      { ephemeral: true }
    );
    return;
  }

  const { plan, checkins, checkinCount } = result;
  const pct = Math.min(Math.round((checkinCount / plan.target_count) * 100), 100);

  const lines = [
    "**내 이번 주 인증 현황** (" + plan.week_start_date + " ~ " + plan.week_end_date + ")",
    "**목표**: " + plan.goal_text,
    "**달성률**: " + pct + "% (" + checkinCount + "/" + plan.target_count + "회)",
    "",
  ];

  if (checkins.length === 0) {
    lines.push("아직 인증 기록이 없습니다.");
  } else {
    for (const c of checkins) {
      lines.push("• " + c.checkin_date + ": " + c.content + (c.proof_url ? " (" + c.proof_url + ")" : ""));
    }
  }

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, lines.join("\n"), { ephemeral: true });
}
