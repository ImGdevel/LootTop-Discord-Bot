import { InteractionResponseType, MessageFlags, type InteractionResponse } from "../types.js";

export interface ModalField {
  label: string;
  customId: string;
  style?: 1 | 2;
  placeholder?: string;
  required?: boolean;
}

export function deferredResponse(): Response {
  return jsonResponse({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  });
}

export function deferredEphemeralResponse(): Response {
  return jsonResponse({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: MessageFlags.EPHEMERAL },
  });
}

export function modalResponse(customId: string, title: string, fields: ModalField[]): Response {
  return jsonResponse({
    type: InteractionResponseType.MODAL,
    data: {
      custom_id: customId,
      title,
      components: fields.map((f) => ({
        type: 1,
        components: [
          {
            type: 4,
            custom_id: f.customId,
            label: f.label,
            style: f.style ?? 2,
            placeholder: f.placeholder,
            required: f.required ?? true,
          },
        ],
      })),
    },
  } as unknown as InteractionResponse);
}

export function pongResponse(): Response {
  return jsonResponse({ type: InteractionResponseType.PONG });
}

export async function sendFollowup(
  applicationId: string,
  interactionToken: string,
  content?: string,
  options: { ephemeral?: boolean; embeds?: unknown[]; components?: unknown[]; flags?: number } = {}
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (content != null) body.content = content;
  let flags = options.flags ?? 0;
  if (options.ephemeral) flags |= MessageFlags.EPHEMERAL;
  if (flags !== 0) body.flags = flags;
  if (options.embeds) body.embeds = options.embeds;
  if (options.components) body.components = options.components;

  const res = await fetch(
    "https://discord.com/api/v10/webhooks/" + applicationId + "/" + interactionToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Discord followup failed: " + res.status + " " + text);
  }
}

export async function sendChannelMessage(
  channelId: string,
  botToken: string,
  content?: string,
  components?: unknown[],
  flags?: number
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (content != null) body.content = content;
  if (components) body.components = components;
  if (flags != null) body.flags = flags;

  const res = await fetch("https://discord.com/api/v10/channels/" + channelId + "/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bot " + botToken,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Discord channel message failed: " + res.status + " " + text);
  }
}

function jsonResponse(data: InteractionResponse): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
