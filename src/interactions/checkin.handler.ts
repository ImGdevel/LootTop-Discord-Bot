import { MODAL_FIELDS, MODAL_IDS } from "../commands/definitions.js";
import { deferredEphemeralResponse, rawModalResponse, sendFollowup } from "../discord/response.js";
import { ensureTodayCheckinCycle } from "../services/checkin-cycle-v2.service.js";
import { ensureV2GuildSetup } from "../services/guild-setup-v2.service.js";
import { insertSimpleCheckin } from "../db/daily-checkin-entries.repository.js";
import { upsertUser } from "../db/users.repository.js";
import { createMessage, executeWebhook } from "../discord/rest.js";
import { MessageFlags } from "../types.js";
import type { DiscordInteraction, Env } from "../types.js";

export function handleCheckinButton(_interaction: DiscordInteraction): Response {
  return rawModalResponse(MODAL_IDS.CHECKIN, "오늘 인증", [
    {
      type: 18,
      label: "오늘 한 일",
      component: {
        type: 4,
        custom_id: MODAL_FIELDS.CHECKIN.CONTENT,
        style: 2,
        placeholder: "오늘 공부하거나 수행한 내용을 자유롭게 적어주세요.",
        required: true,
      },
    },
    {
      type: 18,
      label: "링크 또는 메모 (선택)",
      component: {
        type: 4,
        custom_id: MODAL_FIELDS.CHECKIN.PROOF_URL,
        style: 1,
        placeholder: "https://... 또는 참고 메모",
        required: false,
      },
    },
    {
      type: 18,
      label: "인증 이미지 (선택, 최대 3장)",
      component: {
        type: 19,
        custom_id: MODAL_FIELDS.CHECKIN.PROOF_IMAGE,
        min_values: 0,
        max_values: 3,
        required: false,
      },
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

  const rows = interaction.data?.components ?? [];

  const getText = (id: string): string => {
    for (const row of rows) {
      if (row.type === 18 && row.component?.custom_id === id)
        return (row.component.value ?? "").trim();
      for (const c of row.components ?? [])
        if (c.custom_id === id) return c.value.trim();
    }
    return "";
  };

  const getFileIds = (id: string): string[] => {
    for (const row of rows) {
      if (row.type === 18 && row.component?.custom_id === id)
        return row.component.values ?? [];
    }
    return [];
  };

  const content = getText(MODAL_FIELDS.CHECKIN.CONTENT);
  const proofUrl = getText(MODAL_FIELDS.CHECKIN.PROOF_URL) || null;
  const imageIds = getFileIds(MODAL_FIELDS.CHECKIN.PROOF_IMAGE);

  const resolvedAttachments = interaction.data?.resolved?.attachments ?? {};
  const imageUrls = imageIds
    .map((id) => resolvedAttachments[id])
    .filter((a): a is NonNullable<typeof a> => !!a?.content_type?.startsWith("image/"))
    .map((a) => a.url);

  if (!content) return;

  const displayName = user.global_name ?? user.username;
  const avatarUrl = user.avatar
    ? "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png?size=128"
    : "https://cdn.discordapp.com/embed/avatars/" + (Number(user.discriminator) % 5) + ".png";

  await upsertUser(env.DB, guildId, user.id, displayName);

  const cycle = await ensureTodayCheckinCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);

  if (cycle.status !== "open") {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
      "오늘 인증 마감 시간이 지났습니다.", { ephemeral: true });
    return;
  }

  const entry = await insertSimpleCheckin(env.DB, {
    guildId,
    discordUserId: user.id,
    dailyCheckinCycleId: cycle.id,
    content,
    proofUrl,
  });

  const now = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  });

  const cardComponents: unknown[] = [
    { type: 10, content: "### " + now },
    { type: 14, divider: true, spacing: 1 },
    { type: 10, content: content },
  ];
  if (proofUrl) cardComponents.push({ type: 10, content: proofUrl });
  if (imageUrls.length > 0) {
    cardComponents.push({
      type: 12,
      items: imageUrls.map((url) => ({ media: { url } })),
    });
  }

  const messageBody: Record<string, unknown> = {
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: [{ type: 17, accent_color: 0x57F287, components: cardComponents }],
  };

  try {
    let msg: { id: string };
    const { settings } = await ensureV2GuildSetup(env.DB, guildId, env.DISCORD_BOT_TOKEN);

    if (settings.checkin_webhook_id && settings.checkin_webhook_token) {
      msg = await executeWebhook(
        settings.checkin_webhook_id,
        settings.checkin_webhook_token,
        cycle.thread_id,
        { ...messageBody, username: displayName, avatar_url: avatarUrl }
      );
    } else {
      msg = await createMessage(cycle.thread_id, env.DISCORD_BOT_TOKEN, messageBody);
    }

    await env.DB.prepare("UPDATE daily_checkin_entries SET entry_message_id = ? WHERE id = ?")
      .bind(msg.id, entry.id).run();
  } catch (err) {
    console.error("[checkin] 카드 게시 실패:", err);
  }

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
    "인증이 완료되었습니다!", { ephemeral: true });
}

export function handleCheckinCommand(
  interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  return handleCheckinButton(interaction);
}
