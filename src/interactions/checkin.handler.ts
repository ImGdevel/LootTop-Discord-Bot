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

export function handleCheckinButton(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(openCheckinModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function openCheckinModalAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const context = await getTodayCheckinContext(env.DB, guildId, user.id, env.DISCORD_BOT_TOKEN);
  const labels = context?.goalItemLabels ?? ["항목 1", "항목 2", "항목 3"];
  // 모달을 직접 열 수 없으므로 followup으로 버튼 표시 후 사용자가 다시 클릭
  // (Deferred 상태에서 모달은 불가 — 즉시 모달 반환 방식으로 대체)
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
    "아래 버튼을 눌러 인증을 제출하세요.", {
      ephemeral: true,
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 1,
          label: "인증 폼 열기",
          custom_id: "checkin:modal:open:" + labels.slice(0, 3).join("|"),
        }],
      }],
    });
}

export function handleCheckinModalOpen(
  interaction: DiscordInteraction
): Response {
  const customId = interaction.data?.custom_id ?? "";
  const labelsRaw = customId.replace("checkin:modal:open:", "");
  const labels = labelsRaw.split("|").filter(Boolean);
  return modalResponse(MODAL_IDS.CHECKIN_TODAY, "오늘 인증", [
    {
      label: labels[0] ?? "항목 1",
      customId: MODAL_FIELDS.CHECKIN.ITEM_1,
      style: 2,
      placeholder: "오늘 수행한 내용을 입력해 주세요.",
      required: false,
    },
    {
      label: labels[1] ?? "항목 2",
      customId: MODAL_FIELDS.CHECKIN.ITEM_2,
      style: 2,
      placeholder: "오늘 수행한 내용을 입력해 주세요.",
      required: false,
    },
    {
      label: labels[2] ?? "항목 3",
      customId: MODAL_FIELDS.CHECKIN.ITEM_3,
      style: 2,
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

  const modalComponents = interaction.data?.components ?? [];
  const getValue = (fieldId: string): string => {
    for (const row of modalComponents) {
      for (const comp of row.components ?? []) {
        if (comp.custom_id === fieldId) return comp.value;
      }
    }
    return "";
  };

  const values = [
    getValue(MODAL_FIELDS.CHECKIN.ITEM_1).trim(),
    getValue(MODAL_FIELDS.CHECKIN.ITEM_2).trim(),
    getValue(MODAL_FIELDS.CHECKIN.ITEM_3).trim(),
  ];

  const displayName = user.global_name ?? user.username;
  const result = await submitTodayCheckinV2(env.DB, guildId, user.id, displayName, env.DISCORD_BOT_TOKEN, values);
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, result.message, { ephemeral: true });
}
