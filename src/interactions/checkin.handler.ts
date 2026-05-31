import { BUTTON_IDS, MODAL_IDS, MODAL_FIELDS } from "../commands/definitions.js";
import {
  deferredEphemeralResponse,
  modalResponse,
  sendFollowup,
} from "../discord/response.js";
import { submitCheckin } from "../services/checkin.service.js";
import type { DiscordInteraction, Env } from "../types.js";

export function handleCheckinCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  return handleCheckinButton(interaction);
}

export function handleCheckinButton(interaction: DiscordInteraction): Response {
  return modalResponse(MODAL_IDS.CHECKIN_TODAY, "오늘 인증", [
    {
      label: "오늘 한 일",
      customId: MODAL_FIELDS.CHECKIN.CONTENT,
      style: 2,
      placeholder: "오늘 수행한 내용을 입력해 주세요.",
      required: true,
    },
    {
      label: "참고 링크 또는 메모",
      customId: MODAL_FIELDS.CHECKIN.PROOF_URL,
      style: 1,
      placeholder: "URL 또는 자유 텍스트 (선택)",
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

  const content = getValue(MODAL_FIELDS.CHECKIN.CONTENT).trim();
  const proofUrl = getValue(MODAL_FIELDS.CHECKIN.PROOF_URL).trim() || null;
  const displayName = user.global_name ?? user.username;

  const result = await submitCheckin(env.DB, {
    guildId,
    discordUserId: user.id,
    displayName,
    content,
    proofUrl,
  });

  const planWriteButton: unknown[] = result.status === "no_plan"
    ? [{ type: 1, components: [{ type: 2, style: 1, label: "계획 작성", custom_id: BUTTON_IDS.PLAN_WRITE }] }]
    : [];

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, result.message, {
    ephemeral: true,
    components: planWriteButton.length > 0 ? planWriteButton : undefined,
  });
}
