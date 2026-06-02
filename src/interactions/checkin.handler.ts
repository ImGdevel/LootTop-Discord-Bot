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
  return rawModalResponse(MODAL_IDS.CHECKIN, "✅ 오늘 인증", [
    {
      type: 18,
      label: "📝 오늘 한 일",
      description: "오늘 공부하거나 수행한 내용을 자유롭게 적어주세요.",
      component: {
        type: 4,
        custom_id: MODAL_FIELDS.CHECKIN.CONTENT,
        style: 2,
        placeholder: "예: 알고리즘 2문제 풀었고, 리액트 훅 개념 정리했습니다.",
        min_length: 5,
        required: true,
      },
    },
    {
      type: 18,
      label: "🖼️ 인증 이미지 (선택, 최대 3장)",
      description: "스크린샷, 사진 등 인증 자료를 첨부하세요.",
      component: {
        type: 19,
        custom_id: MODAL_FIELDS.CHECKIN.PROOF_IMAGE,
        min_values: 0,
        max_values: 3,
        required: false,
      },
    },
    {
      type: 18,
      label: "🔗 인증 URL (선택)",
      description: "깃헙 커밋, 블로그 포스트 등 링크를 첨부하세요.",
      component: {
        type: 4,
        custom_id: MODAL_FIELDS.CHECKIN.PROOF_URL,
        style: 1,
        placeholder: "https://...",
        required: false,
      },
    },
    {
      type: 18,
      label: "📊 오늘 목표 달성률 (0~100)",
      description: "오늘 하루 목표를 얼마나 달성했나요?",
      component: {
        type: 4,
        custom_id: MODAL_FIELDS.CHECKIN.ACHIEVEMENT_RATE,
        style: 1,
        placeholder: "0~100 사이 숫자를 입력하세요",
        value: "100",
        min_length: 1,
        max_length: 3,
        required: true,
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
  const rateRaw = getText(MODAL_FIELDS.CHECKIN.ACHIEVEMENT_RATE);
  const rateParsed = rateRaw ? parseInt(rateRaw.trim(), 10) : null;
  const achievementRate = (rateParsed !== null && !isNaN(rateParsed))
    ? Math.min(100, Math.max(0, rateParsed))
    : null;
  if (rateRaw && (isNaN(rateParsed!) || rateParsed! < 0 || rateParsed! > 100)) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
      "❌ 달성률은 0~100 사이 숫자만 입력 가능합니다.", { ephemeral: true });
    return;
  }
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
    achievementRate,
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
  if (achievementRate !== null) cardComponents.push({ type: 10, content: "**달성률:** " + achievementRate + "%" });
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
