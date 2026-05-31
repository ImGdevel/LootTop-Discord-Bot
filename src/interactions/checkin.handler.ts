import { MODAL_FIELDS, MODAL_IDS } from "../commands/definitions.js";
import { deferredEphemeralResponse, modalResponse, sendFollowup } from "../discord/response.js";
import { buildTodayCheckinFlow } from "../flows/checkin.flow.js";
import { getTodayCheckinContext, submitTodayCheckinV2 } from "../services/checkin-v2.service.js";
import type { DiscordInteraction, Env } from "../types.js";

export function handleCheckinCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleCheckinCommandAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleCheckinCommandAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const payload = await buildTodayCheckinFlow(env.DB, guildId, user.id, env.DISCORD_BOT_TOKEN);
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
    flags: payload.flags,
    components: payload.components,
  });
}

export function handleCheckinButton(_interaction: DiscordInteraction): Response {
  return openCheckinModal(["목표 1", "목표 2", "목표 3"]);
}

export function openCheckinModal(labels: string[]): Response {
  return modalResponse(MODAL_IDS.CHECKIN_TODAY, "오늘 인증", [
    {
      label: labels[0] ?? "항목 1",
      customId: MODAL_FIELDS.CHECKIN.ITEM_1,
      style: 1,
      placeholder: "오늘 수행한 내용을 입력해 주세요.",
      required: false,
    },
    {
      label: labels[1] ?? "항목 2",
      customId: MODAL_FIELDS.CHECKIN.ITEM_2,
      style: 1,
      placeholder: "오늘 수행한 내용을 입력해 주세요.",
      required: false,
    },
    {
      label: labels[2] ?? "항목 3",
      customId: MODAL_FIELDS.CHECKIN.ITEM_3,
      style: 1,
      placeholder: "오늘 수행한 내용을 입력해 주세요.",
      required: false,
    },
  ]);
}

export function handleCheckinModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleCheckinModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleCheckinModalAsync(
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

  const result = await submitTodayCheckinV2(
    env.DB,
    guildId,
    user.id,
    user.global_name ?? user.username,
    env.DISCORD_BOT_TOKEN,
    [
      getValue(MODAL_FIELDS.CHECKIN.ITEM_1),
      getValue(MODAL_FIELDS.CHECKIN.ITEM_2),
      getValue(MODAL_FIELDS.CHECKIN.ITEM_3),
    ]
  );

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, result.message, {
    ephemeral: true,
  });
}
