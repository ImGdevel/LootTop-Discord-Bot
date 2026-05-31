import { MODAL_FIELDS, MODAL_IDS } from "../commands/definitions.js";
import { deferredEphemeralResponse, modalResponse, sendFollowup } from "../discord/response.js";
import { buildCurrentWeeklyGoalFlow } from "../flows/goal.flow.js";
import { saveCurrentUserGoalsV2 } from "../services/goal-v2.service.js";
import type { DiscordInteraction, Env } from "../types.js";

export function handleGoalCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalCommandAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleGoalCommandAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const payload = await buildCurrentWeeklyGoalFlow(env.DB, guildId, user.id);
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, payload.content, {
    flags: payload.flags,
    components: payload.components,
  });
}

export function handleGoalWriteButton(_interaction: DiscordInteraction): Response {
  return modalResponse(MODAL_IDS.GOAL_WRITE, "이번 주 데일리 목표 작성", [
    {
      label: "목표 1",
      customId: MODAL_FIELDS.GOAL.GOAL_1,
      style: 1,
      placeholder: "예: 6시간 공부",
      required: true,
    },
    {
      label: "목표 2",
      customId: MODAL_FIELDS.GOAL.GOAL_2,
      style: 1,
      placeholder: "예: 독서 30분",
      required: false,
    },
    {
      label: "목표 3",
      customId: MODAL_FIELDS.GOAL.GOAL_3,
      style: 1,
      placeholder: "예: 9시 기상",
      required: false,
    },
    {
      label: "휴식일",
      customId: MODAL_FIELDS.GOAL.REST_DAYS,
      style: 1,
      placeholder: "예: 토,일",
      required: false,
    },
  ]);
}

export function handleGoalWriteModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalWriteModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleGoalWriteModalAsync(
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

  const result = await saveCurrentUserGoalsV2(
    env.DB,
    guildId,
    user.id,
    user.global_name ?? user.username,
    env.DISCORD_BOT_TOKEN,
    {
      goals: [
        getValue(MODAL_FIELDS.GOAL.GOAL_1),
        getValue(MODAL_FIELDS.GOAL.GOAL_2),
        getValue(MODAL_FIELDS.GOAL.GOAL_3),
      ],
      restDaysRaw: getValue(MODAL_FIELDS.GOAL.REST_DAYS),
    }
  );

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, result.message, {
    ephemeral: true,
  });
}
