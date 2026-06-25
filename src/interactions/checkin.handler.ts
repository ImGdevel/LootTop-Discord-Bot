import { MODAL_FIELDS, MODAL_IDS } from "../commands/definitions.js";
import { deferredEphemeralResponse, rawModalResponse, sendFollowup } from "../discord/response.js";
import { ensureTodayCheckinCycle } from "../services/checkin-cycle-v2.service.js";
import { ensureV2GuildSetup } from "../services/guild-setup-v2.service.js";
import { insertSimpleCheckin, getDailyCheckinEntryById, updateSimpleCheckin, softDeleteCheckin } from "../db/daily-checkin-entries.repository.js";
import { getDailyCheckinCycleById } from "../db/daily-checkin-cycles.repository.js";
import { upsertUser } from "../db/users.repository.js";
import { awardCheckinPoints, revokeCheckinPoints } from "../services/points.service.js";
import { getWeekStartDate } from "../domain/date.js";
import { createMessage, deleteMessage, editMessage, editWebhookMessage, executeWebhook, getMessage } from "../discord/rest.js";
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
      label: "🖼️ 인증 이미지 (선택, 최대 10장)",
      description: "스크린샷, 사진 등 인증 자료를 첨부하세요.",
      component: {
        type: 19,
        custom_id: MODAL_FIELDS.CHECKIN.PROOF_IMAGE,
        min_values: 0,
        max_values: 10,
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
  ctx.waitUntil((async () => {
    let done = false;
    const timeoutHandle = setTimeout(async () => {
      if (!done) {
        done = true;
        try {
          await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
            "⏱️ 처리 시간이 초과됐습니다. 잠시 후 다시 시도해주세요.", { ephemeral: true });
        } catch {}
      }
    }, 10000);
    try {
      await handleCheckinModalAsync(interaction, env);
      done = true;
      clearTimeout(timeoutHandle);
    } catch (err) {
      done = true;
      clearTimeout(timeoutHandle);
      console.error("[checkin] error:", err);
      try {
        await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
          "⚠️ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", { ephemeral: true });
      } catch {}
    }
  })());
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

  const weekStartDate = getWeekStartDate(cycle.checkin_date);
  const pointsPromise = awardCheckinPoints(env.DB, guildId, user.id, cycle.checkin_date, weekStartDate);

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

  const buildMessageBody = (entryId: number) => ({
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: [{
      type: 17,
      accent_color: 0x57F287,
      components: [
        ...cardComponents,
        { type: 1, components: [
          { type: 2, style: 2, label: "✏️ 수정", custom_id: "checkin:edit:" + entryId },
          { type: 2, style: 4, label: "🗑️ 삭제", custom_id: "checkin:delete:" + entryId },
        ]},
      ],
    }],
  });

  const messageBody: Record<string, unknown> = buildMessageBody(entry.id);

  try {
    let msg: { id: string };
    const [{ settings }] = await Promise.all([
      ensureV2GuildSetup(env.DB, guildId, env.DISCORD_BOT_TOKEN),
      pointsPromise,
    ]);

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

export async function handleCheckinEditButton(
  interaction: DiscordInteraction,
  env: Env
): Promise<Response> {
  const entryId = parseInt((interaction.data?.custom_id ?? "").split(":")[2] ?? "", 10);
  if (isNaN(entryId)) return new Response("Bad Request", { status: 400 });

  const user = interaction.member?.user ?? interaction.user;
  if (!user) return new Response("Bad Request", { status: 400 });

  const entry = await getDailyCheckinEntryById(env.DB, entryId);
  if (!entry || entry.discord_user_id !== user.id) {
    return rawModalResponse("noop", "오류", []);
  }

  const today = await ensureTodayCheckinCycle(env.DB, interaction.guild_id!, env.DISCORD_BOT_TOKEN);
  if (entry.daily_checkin_cycle_id !== today.id) {
    return rawModalResponse("noop", "오류", []);
  }

  return rawModalResponse(MODAL_IDS.CHECKIN_EDIT + ":" + entryId, "✏️ 인증 수정", [
    {
      type: 18,
      label: "📝 오늘 한 일",
      component: {
        type: 4,
        custom_id: MODAL_FIELDS.CHECKIN.CONTENT,
        style: 2,
        min_length: 5,
        required: true,
        value: entry.content ?? "",
      },
    },
    {
      type: 18,
      label: "🖼️ 인증 이미지 (선택, 최대 10장)",
      description: "새로 올리면 기존 이미지가 교체됩니다. 비워두면 기존 이미지가 유지됩니다.",
      component: {
        type: 19,
        custom_id: MODAL_FIELDS.CHECKIN.PROOF_IMAGE,
        min_values: 0,
        max_values: 10,
        required: false,
      },
    },
    {
      type: 18,
      label: "🔗 인증 URL (선택)",
      component: {
        type: 4,
        custom_id: MODAL_FIELDS.CHECKIN.PROOF_URL,
        style: 1,
        placeholder: "https://...",
        required: false,
        value: entry.proof_url ?? "",
      },
    },
    {
      type: 18,
      label: "📊 오늘 목표 달성률 (0~100)",
      component: {
        type: 4,
        custom_id: MODAL_FIELDS.CHECKIN.ACHIEVEMENT_RATE,
        style: 1,
        placeholder: "0~100",
        min_length: 1,
        max_length: 3,
        required: true,
        value: entry.achievement_rate != null ? String(entry.achievement_rate) : "100",
      },
    },
  ]);
}

export function handleCheckinEditModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleCheckinEditModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleCheckinEditModalAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const modalId = interaction.data?.custom_id ?? "";
  const entryId = parseInt(modalId.split(":")[1] ?? "", 10);
  const user = interaction.member?.user ?? interaction.user;
  if (!user || isNaN(entryId)) return;

  const rows = interaction.data?.components ?? [];
  const getText = (id: string): string => {
    for (const row of rows) {
      if (row.type === 18 && row.component?.custom_id === id) return (row.component.value ?? "").trim();
      for (const c of row.components ?? []) if (c.custom_id === id) return c.value.trim();
    }
    return "";
  };

  const content = getText(MODAL_FIELDS.CHECKIN.CONTENT);
  const proofUrl = getText(MODAL_FIELDS.CHECKIN.PROOF_URL) || null;
  const rateRaw = getText(MODAL_FIELDS.CHECKIN.ACHIEVEMENT_RATE);
  const rateParsed = rateRaw ? parseInt(rateRaw, 10) : null;
  if (rateRaw && (isNaN(rateParsed!) || rateParsed! < 0 || rateParsed! > 100)) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
      "❌ 달성률은 0~100 사이 숫자만 입력 가능합니다.", { ephemeral: true });
    return;
  }
  const achievementRate = rateParsed !== null && !isNaN(rateParsed)
    ? Math.min(100, Math.max(0, rateParsed)) : null;

  const entry = await getDailyCheckinEntryById(env.DB, entryId);
  if (!entry || entry.discord_user_id !== user.id) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
      "❌ 수정 권한이 없습니다.", { ephemeral: true });
    return;
  }

  const today = await ensureTodayCheckinCycle(env.DB, interaction.guild_id!, env.DISCORD_BOT_TOKEN);
  if (entry.daily_checkin_cycle_id !== today.id) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
      "❌ 당일 인증만 수정할 수 있습니다.", { ephemeral: true });
    return;
  }

  if (!content) return;
  await updateSimpleCheckin(env.DB, entryId, { content, proofUrl, achievementRate });

  const imageIds = (() => {
    for (const row of rows) {
      if (row.type === 18 && row.component?.custom_id === MODAL_FIELDS.CHECKIN.PROOF_IMAGE)
        return row.component.values ?? [];
    }
    return [];
  })();
  const resolvedAttachments = interaction.data?.resolved?.attachments ?? {};
  let imageUrls = imageIds
    .map((id: string) => resolvedAttachments[id])
    .filter((a: any): a is NonNullable<typeof a> => !!a?.content_type?.startsWith("image/"))
    .map((a: any) => a.url as string);

  // 새 이미지 없으면 기존 메시지에서 이미지 URL 복원
  if (imageUrls.length === 0 && entry.entry_message_id) {
    try {
      const cycle = await getDailyCheckinCycleById(env.DB, entry.daily_checkin_cycle_id);
      if (cycle) {
        const existing = await getMessage(cycle.thread_id, entry.entry_message_id, env.DISCORD_BOT_TOKEN);
        const container = (existing.components as any[])?.find((c: any) => c.type === 17);
        const gallery = container?.components?.find((c: any) => c.type === 12);
        if (gallery?.items) {
          imageUrls = gallery.items.map((item: any) => item.media?.url as string).filter(Boolean);
        }
      }
    } catch {
      // 복원 실패 시 이미지 없이 진행
    }
  }

  if (entry.entry_message_id) {
    const cycle = await getDailyCheckinCycleById(env.DB, entry.daily_checkin_cycle_id);
    if (cycle) {
      const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
      const cardComponents: unknown[] = [
        { type: 10, content: "### " + now + " (수정됨)" },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content },
      ];
      if (achievementRate !== null) cardComponents.push({ type: 10, content: "**달성률:** " + achievementRate + "%" });
      if (proofUrl) cardComponents.push({ type: 10, content: proofUrl });
      if (imageUrls.length > 0) {
        cardComponents.push({ type: 12, items: imageUrls.map((url) => ({ media: { url } })) });
      }
      cardComponents.push({ type: 1, components: [
        { type: 2, style: 2, label: "✏️ 수정", custom_id: "checkin:edit:" + entryId },
      ]});

      const msgBody = {
        flags: MessageFlags.IS_COMPONENTS_V2,
        components: [{ type: 17, accent_color: 0x57F287, components: cardComponents }],
      };

      try {
        const { settings } = await ensureV2GuildSetup(env.DB, interaction.guild_id!, env.DISCORD_BOT_TOKEN);
        if (settings.checkin_webhook_id && settings.checkin_webhook_token) {
          await editWebhookMessage(settings.checkin_webhook_id, settings.checkin_webhook_token, entry.entry_message_id, cycle.thread_id, msgBody);
        } else {
          await editMessage(cycle.thread_id, entry.entry_message_id, env.DISCORD_BOT_TOKEN, msgBody);
        }
      } catch (err) {
        console.error("[checkin-edit] 메시지 수정 실패:", err);
      }
    }
  }

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
    "✅ 인증이 수정되었습니다.", { ephemeral: true });
}

export function handleCheckinDeleteButton(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleCheckinDeleteAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleCheckinDeleteAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const entryId = parseInt((interaction.data?.custom_id ?? "").split(":")[2] ?? "", 10);
  const user = interaction.member?.user ?? interaction.user;
  const guildId = interaction.guild_id;
  if (!user || !guildId || isNaN(entryId)) return;

  const entry = await getDailyCheckinEntryById(env.DB, entryId);
  if (!entry || entry.discord_user_id !== user.id) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
      "❌ 삭제 권한이 없습니다.", { ephemeral: true });
    return;
  }

  if (entry.status === "discarded") {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
      "❌ 이미 삭제된 인증입니다.", { ephemeral: true });
    return;
  }

  const cycle = await getDailyCheckinCycleById(env.DB, entry.daily_checkin_cycle_id);
  if (!cycle) return;

  const weekStartDate = getWeekStartDate(cycle.checkin_date);

  // 포인트 회수 먼저 (삭제 전 카운트 기준)
  await revokeCheckinPoints(env.DB, guildId, user.id, cycle.checkin_date, weekStartDate);

  // 소프트 삭제
  await softDeleteCheckin(env.DB, entryId);

  // 채널 메시지 삭제
  if (entry.entry_message_id) {
    try {
      await deleteMessage(cycle.thread_id, entry.entry_message_id, env.DISCORD_BOT_TOKEN);
    } catch (err) {
      console.error("[checkin] 메시지 삭제 실패:", err);
    }
  }

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
    "🗑️ 인증이 삭제되었습니다.", { ephemeral: true });
}
