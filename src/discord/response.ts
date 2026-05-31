import { InteractionResponseType, MessageFlags, type InteractionResponse } from "../types.js";

/**
 * Discord Interaction 응답 생성 유틸
 *
 * 모든 Interaction은 Deferred Response -> Followup 패턴을 기본으로 사용한다.
 * (Discord 3초 응답 제한 대응)
 */

// 즉시 Deferred 응답 (공개 메시지)
export function deferredResponse(): Response {
  return jsonResponse({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  });
}

// 즉시 Deferred 응답 (ephemeral - 본인에게만 보임)
export function deferredEphemeralResponse(): Response {
  return jsonResponse({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: MessageFlags.EPHEMERAL },
  });
}

// PING에 대한 PONG 응답
export function pongResponse(): Response {
  return jsonResponse({ type: InteractionResponseType.PONG });
}

// Interaction Webhook followup은 인증 헤더 불필요
// (Discord Interaction Webhook은 interactionToken 자체가 인증 수단)
export async function sendFollowup(
  applicationId: string,
  interactionToken: string,
  content: string,
  options: { ephemeral?: boolean; embeds?: unknown[] } = {}
): Promise<void> {
  const body: Record<string, unknown> = { content };

  if (options.ephemeral) {
    body.flags = MessageFlags.EPHEMERAL;
  }
  if (options.embeds) {
    body.embeds = options.embeds;
  }

  const res = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord followup failed: ${res.status} ${text}`);
  }
}

// 채널에 직접 메시지 전송 (Cron 리마인더 등에 사용)
export async function sendChannelMessage(
  channelId: string,
  botToken: string,
  content: string,
  components?: unknown[]
): Promise<void> {
  const body: Record<string, unknown> = { content };
  if (components) body.components = components;

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord channel message failed: ${res.status} ${text}`);
  }
}

function jsonResponse(data: InteractionResponse): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
