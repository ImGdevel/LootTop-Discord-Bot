import { MODAL_IDS } from "../commands/definitions.js";
import {
  deferredEphemeralResponse,
  modalResponse,
  rawModalResponse,
  selectMenuResponse,
  sendFollowup,
} from "../discord/response.js";
import { buildTodayCheckinFlow } from "../flows/checkin.flow.js";
import { getTodayCheckinContext, submitTodayCheckinV2 } from "../services/checkin-v2.service.js";
import type { DiscordAttachment, DiscordInteraction, Env } from "../types.js";

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

export async function handleCheckinButton(
  interaction: DiscordInteraction,
  env: Env
): Promise<Response> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) {
    return deferredEphemeralResponse();
  }

  const context = await getTodayCheckinContext(env.DB, guildId, user.id, env.DISCORD_BOT_TOKEN);
  if (!context || context.goalItems.length === 0) {
    return deferredEphemeralResponse();
  }

  const options = context.goalItems.slice(0, 25).map((item) => ({
    label: item.label.slice(0, 100),
    value: String(item.id),
    description: proofTypeDescription(item.proofType),
  }));

  return selectMenuResponse(
    "checkin:item:select",
    "오늘 인증할 목표 항목 선택",
    options,
    1,
    1
  );
}

export async function handleCheckinItemSelect(
  interaction: DiscordInteraction,
  env: Env
): Promise<Response> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  const selectedId = interaction.data?.values?.[0];
  if (!guildId || !user || !selectedId) {
    return deferredEphemeralResponse();
  }

  const context = await getTodayCheckinContext(env.DB, guildId, user.id, env.DISCORD_BOT_TOKEN);
  const goalItem = context?.goalItems.find((item) => String(item.id) === selectedId);
  if (!goalItem) {
    return deferredEphemeralResponse();
  }

  return buildCheckinItemModal(goalItem.id, goalItem.label, goalItem.proofType);
}

function buildCheckinItemModal(goalItemId: number, label: string, proofType: string): Response {
  const title = "오늘 인증";
  const customId = MODAL_IDS.CHECKIN_TODAY + ":" + goalItemId + ":" + proofType;

  if (proofType === "checkbox") {
    return rawModalResponse(customId, title, [
      {
        type: 18,
        label,
        description: "완료했다면 체크 후 제출하세요.",
        component: {
          type: 22,
          custom_id: "checked",
          options: [{ label: "완료함", value: "done" }],
        },
      },
    ]);
  }

  if (proofType === "image") {
    return rawModalResponse(customId, title, [
      {
        type: 18,
        label,
        description: "인증 이미지를 첨부하세요.",
        component: {
          type: 19,
          custom_id: "image_upload",
          min_values: 1,
          max_values: 1,
          required: true,
        },
      },
    ]);
  }

  return modalResponse(customId, title, [
    {
      label,
      customId: proofType === "url" ? "url_value" : "text_value",
      style: 2,
      placeholder:
        proofType === "url"
          ? "https://example.com"
          : "오늘 수행한 내용을 입력해 주세요.",
      required: true,
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

  const customId = interaction.data?.custom_id ?? "";
  const modalPrefix = MODAL_IDS.CHECKIN_TODAY + ":";
  const suffix = customId.startsWith(modalPrefix) ? customId.slice(modalPrefix.length) : "";
  const [goalItemIdRaw, proofType = "text"] = suffix.split(":");
  const goalItemId = Number(goalItemIdRaw);
  if (!goalItemId) return;

  const context = await getTodayCheckinContext(env.DB, guildId, user.id, env.DISCORD_BOT_TOKEN);
  const goalItem = context?.goalItems.find((item) => item.id === goalItemId);
  if (!goalItem) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, "현재 주간 목표에 없는 항목입니다.", {
      ephemeral: true,
    });
    return;
  }

  const itemPayload = parseCheckinModalPayload(interaction, proofType, goalItemId);
  if (!itemPayload) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, "제출할 인증 내용이 없습니다.", {
      ephemeral: true,
    });
    return;
  }

  const displayName = user.global_name ?? user.username;
  const result = await submitTodayCheckinV2(
    env.DB,
    guildId,
    user.id,
    displayName,
    env.DISCORD_BOT_TOKEN,
    [itemPayload]
  );
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, result.message, { ephemeral: true });
}

function parseCheckinModalPayload(
  interaction: DiscordInteraction,
  proofType: string,
  goalItemId: number
): {
  goalItemId: number;
  checked?: boolean | null;
  textValue?: string | null;
  urlValue?: string | null;
  attachmentUrl?: string | null;
} | null {
  if (proofType === "checkbox") {
    const values = getModalComponentValues(interaction, "checked");
    return values.includes("done") ? { goalItemId, checked: true } : null;
  }

  if (proofType === "image") {
    const uploadIds = getModalComponentValues(interaction, "image_upload");
    const attachments = interaction.data?.resolved?.attachments ?? {};
    const attachment = uploadIds.map((id) => attachments[id]).find(Boolean);
    return attachment?.url ? { goalItemId, attachmentUrl: attachment.url } : null;
  }

  const value = getModalComponentTextValue(
    interaction,
    proofType === "url" ? "url_value" : "text_value"
  )?.trim();
  if (!value) return null;
  return proofType === "url"
    ? { goalItemId, urlValue: value }
    : { goalItemId, textValue: value };
}

function getModalComponentValues(interaction: DiscordInteraction, customId: string): string[] {
  const components = interaction.data?.components ?? [];
  const values: string[] = [];

  for (const row of components) {
    const labeled = row.component;
    if (labeled?.custom_id === customId && Array.isArray(labeled.values)) {
      values.push(...labeled.values);
    }

    for (const comp of row.components ?? []) {
      if (comp.custom_id === customId && Array.isArray((comp as { values?: string[] }).values)) {
        values.push(...((comp as { values?: string[] }).values ?? []));
      }
    }
  }

  return values;
}

function getModalComponentTextValue(interaction: DiscordInteraction, customId: string): string | null {
  const components = interaction.data?.components ?? [];
  for (const row of components) {
    const labeled = row.component;
    if (labeled?.custom_id === customId && typeof labeled.value === "string") {
      return labeled.value;
    }

    for (const comp of row.components ?? []) {
      if (comp.custom_id === customId && typeof comp.value === "string") {
        return comp.value;
      }
    }
  }

  return null;
}

function proofTypeDescription(proofType: string): string {
  switch (proofType) {
    case "url":
      return "URL 인증";
    case "image":
      return "이미지 업로드";
    case "checkbox":
      return "체크 완료";
    default:
      return "텍스트 인증";
  }
}
