import { BUTTON_IDS, MODAL_IDS, MODAL_FIELDS } from "../commands/definitions.js";
import {
  deferredEphemeralResponse,
  modalResponse,
  sendFollowup,
} from "../discord/response.js";
import { fetchCurrentWeekPlan, savePlan } from "../services/plan.service.js";
import type { DiscordInteraction, Env } from "../types.js";

/**
 * /주간계획 커맨드
 * - 계획이 있으면 현재 계획 표시 + 수정 버튼
 * - 계획이 없으면 계획 작성 버튼
 */
export function handleWeeklyPlanCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleWeeklyPlanAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleWeeklyPlanAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;

  if (!guildId || !user) return;

  const plan = await fetchCurrentWeekPlan(env.DB, guildId, user.id);

  const planWriteButton = {
    type: 1,
    components: [
      {
        type: 2,
        style: 1,
        label: plan ? "계획 수정" : "계획 작성",
        custom_id: BUTTON_IDS.PLAN_WRITE,
      },
    ],
  };

  if (plan) {
    const content =
      `**이번 주 계획** (${plan.week_start_date} ~ ${plan.week_end_date})\n\n` +
      `**목표**: ${plan.goal_text}\n` +
      `**목표 인증 횟수**: ${plan.target_count}회`;
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, content, {
      ephemeral: true,
      components: [planWriteButton],
    });
  } else {
    await sendFollowup(
      env.DISCORD_APPLICATION_ID,
      interaction.token,
      "이번 주 계획이 없습니다. 아래 버튼을 눌러 계획을 작성해 주세요.",
      { ephemeral: true, components: [planWriteButton] }
    );
  }
}

/**
 * btn_plan_write 버튼 클릭 → 계획 작성 모달 응답
 */
export function handlePlanWriteButton(_interaction: DiscordInteraction): Response {
  return modalResponse(MODAL_IDS.PLAN_WRITE, "이번 주 계획 작성", [
    {
      label: "이번 주 목표",
      customId: MODAL_FIELDS.PLAN.GOAL_TEXT,
      style: 2,
      placeholder: "이번 주 목표를 입력해 주세요.",
      required: true,
    },
    {
      label: "목표 인증 횟수",
      customId: MODAL_FIELDS.PLAN.TARGET_COUNT,
      style: 1,
      placeholder: "예: 5",
      required: true,
    },
  ]);
}

/**
 * modal_plan_write 제출 → 계획 저장
 */
export function handlePlanWriteModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handlePlanWriteModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handlePlanWriteModalAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;

  if (!guildId || !user) return;

  const components = interaction.data?.components ?? [];
  const getValue = (fieldId: string): string => {
    for (const row of components) {
      for (const comp of row.components ?? []) {
        if (comp.custom_id === fieldId) return comp.value;
      }
    }
    return "";
  };

  const goalText = getValue(MODAL_FIELDS.PLAN.GOAL_TEXT).trim();
  const targetCountRaw = getValue(MODAL_FIELDS.PLAN.TARGET_COUNT).trim();
  const targetCount = parseInt(targetCountRaw, 10);

  const displayName = user.global_name ?? user.username;

  const result = await savePlan(env.DB, {
    guildId,
    discordUserId: user.id,
    displayName,
    goalText,
    targetCount,
  });

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, result.message, {
    ephemeral: true,
  });
}
