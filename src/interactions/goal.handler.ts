import { deferredEphemeralResponse, rawModalResponse, sendFollowup } from "../discord/response.js";
import { ensureCurrentWeeklyGoalCycle } from "../services/goal-cycle-v2.service.js";
import { ensureV2GuildSetup } from "../services/guild-setup-v2.service.js";
import { upsertUser } from "../db/users.repository.js";
import { executeWebhook, createMessage } from "../discord/rest.js";
import { MessageFlags } from "../types.js";
import type { DiscordInteraction, Env } from "../types.js";

export const GOAL_MODAL_ID = "modal_goal_simple";
export const GOAL_SUBMIT_BUTTON_ID = "goal:submit";
const GOAL_CONTENT_FIELD = "goal_content";

function buildGoalModal(): Response {
  return rawModalResponse(GOAL_MODAL_ID, "이번 주 목표", [
    {
      type: 18,
      label: "목표",
      description: "이번 주 달성하고 싶은 것을 자유롭게 작성해 주세요.",
      component: {
        type: 4,
        custom_id: GOAL_CONTENT_FIELD,
        style: 2,
        placeholder: "예: 알고리즘 문제 5개 풀기, 책 2챕터 읽기...",
        required: true,
      },
    },
  ]);
}

export function handleGoalCommand(_interaction: DiscordInteraction): Response {
  return buildGoalModal();
}

export function handleGoalButton(_interaction: DiscordInteraction): Response {
  return buildGoalModal();
}

export function handleGoalModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleGoalModalAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const rows = interaction.data?.components ?? [];
  const getText = (id: string): string => {
    for (const row of rows) {
      if (row.type === 18 && row.component?.custom_id === id)
        return (row.component.value ?? "").trim();
    }
    return "";
  };

  const goalContent = getText(GOAL_CONTENT_FIELD);
  if (!goalContent) return;

  const displayName = user.global_name ?? user.username;
  const avatarUrl = user.avatar
    ? "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png?size=128"
    : "https://cdn.discordapp.com/embed/avatars/" + (Number(user.discriminator) % 5) + ".png";

  await upsertUser(env.DB, guildId, user.id, displayName);

  const cycle = await ensureCurrentWeeklyGoalCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
  const { settings } = await ensureV2GuildSetup(env.DB, guildId, env.DISCORD_BOT_TOKEN);
  const now = new Date().toISOString();

  // user_daily_goals upsert (이번 주 목표 등록/수정)
  const existing = await env.DB
    .prepare("SELECT * FROM user_daily_goals WHERE guild_id = ? AND discord_user_id = ? AND weekly_goal_cycle_id = ? AND status = 'active'")
    .bind(guildId, user.id, cycle.id)
    .first<{ id: number; goal_message_id: string | null }>();

  if (existing) {
    await env.DB
      .prepare("UPDATE user_daily_goals SET goal_content = ?, updated_at = ? WHERE id = ?")
      .bind(goalContent, now, existing.id)
      .run();
  } else {
    await env.DB
      .prepare("INSERT INTO user_daily_goals (guild_id, discord_user_id, weekly_goal_cycle_id, goal_content, rest_days_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, '[]', 'active', ?, ?)")
      .bind(guildId, user.id, cycle.id, goalContent, now, now)
      .run();
  }

  // 목표 스레드에 카드 게시 (webhook으로 프로필 표시)
  try {
    const cardComponents = [
      { type: 10, content: "### 🎯 이번 주 목표" },
      { type: 14, divider: true, spacing: 1 },
      { type: 10, content: goalContent },
    ];
    const messageBody: Record<string, unknown> = {
      flags: MessageFlags.IS_COMPONENTS_V2,
      components: [{ type: 17, accent_color: 0x9B59B6, components: cardComponents }],
    };

    if (settings.goal_webhook_id && settings.goal_webhook_token) {
      await executeWebhook(
        settings.goal_webhook_id,
        settings.goal_webhook_token,
        cycle.forum_thread_id,
        { ...messageBody, username: displayName, avatar_url: avatarUrl }
      );
    } else {
      await createMessage(cycle.forum_thread_id, env.DISCORD_BOT_TOKEN, messageBody);
    }
  } catch (err) {
    console.error("[goal] 카드 게시 실패:", err);
  }

  const isUpdate = !!existing;
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
    isUpdate ? "✅ 목표가 수정되었습니다!" : "✅ 이번 주 목표가 등록되었습니다!",
    { ephemeral: true }
  );
}
