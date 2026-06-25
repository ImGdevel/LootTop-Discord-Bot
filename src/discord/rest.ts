export interface DiscordChannel {
  id: string;
  guild_id?: string;
  name: string;
  type: number;
  parent_id?: string | null;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  components?: unknown[];
}

async function discordBotRequest<T>(
  botToken: string,
  path: string,
  init: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const res = await fetch("https://discord.com/api/v10" + path, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bot " + botToken,
    },
    body: init.body == null ? undefined : JSON.stringify(init.body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Discord API failed: " + res.status + " " + path + " " + text);
  }

  return await res.json() as T;
}

export async function createGuildChannel(
  guildId: string,
  botToken: string,
  input: {
    name: string;
    type: number;
    topic?: string;
    rate_limit_per_user?: number;
  }
): Promise<DiscordChannel> {
  return discordBotRequest<DiscordChannel>(botToken, "/guilds/" + guildId + "/channels", {
    method: "POST",
    body: input,
  });
}

export async function getChannel(
  channelId: string,
  botToken: string
): Promise<DiscordChannel> {
  return discordBotRequest<DiscordChannel>(botToken, "/channels/" + channelId);
}

export async function createMessage(
  channelId: string,
  botToken: string,
  body: Record<string, unknown>
): Promise<DiscordMessage> {
  return discordBotRequest<DiscordMessage>(botToken, "/channels/" + channelId + "/messages", {
    method: "POST",
    body,
  });
}

export async function getMessage(
  channelId: string,
  messageId: string,
  botToken: string
): Promise<DiscordMessage> {
  return discordBotRequest<DiscordMessage>(
    botToken,
    "/channels/" + channelId + "/messages/" + messageId
  );
}

export async function editMessage(
  channelId: string,
  messageId: string,
  botToken: string,
  body: Record<string, unknown>
): Promise<DiscordMessage> {
  return discordBotRequest<DiscordMessage>(
    botToken,
    "/channels/" + channelId + "/messages/" + messageId,
    {
      method: "PATCH",
      body,
    }
  );
}

export async function createForumThread(
  forumChannelId: string,
  botToken: string,
  input: {
    name: string;
    auto_archive_duration?: number;
    rate_limit_per_user?: number;
    message: Record<string, unknown>;
  }
): Promise<DiscordChannel> {
  return discordBotRequest<DiscordChannel>(botToken, "/channels/" + forumChannelId + "/threads", {
    method: "POST",
    body: input,
  });
}

export async function startThreadFromMessage(
  channelId: string,
  messageId: string,
  botToken: string,
  input: {
    name: string;
    auto_archive_duration?: number;
    rate_limit_per_user?: number;
  }
): Promise<DiscordChannel> {
  return discordBotRequest<DiscordChannel>(
    botToken,
    "/channels/" + channelId + "/messages/" + messageId + "/threads",
    {
      method: "POST",
      body: input,
    }
  );
}

export async function editChannel(
  channelId: string,
  botToken: string,
  body: Record<string, unknown>
): Promise<DiscordChannel> {
  return discordBotRequest<DiscordChannel>(botToken, "/channels/" + channelId, {
    method: "PATCH",
    body,
  });
}

export interface DiscordWebhook {
  id: string;
  token: string;
}

export async function createWebhook(
  channelId: string,
  botToken: string,
  name: string
): Promise<DiscordWebhook> {
  return discordBotRequest<DiscordWebhook>(botToken, "/channels/" + channelId + "/webhooks", {
    method: "POST",
    body: { name },
  });
}

export async function executeWebhook(
  webhookId: string,
  webhookToken: string,
  threadId: string,
  body: Record<string, unknown>
): Promise<DiscordMessage> {
  const url =
    "https://discord.com/api/v10/webhooks/" +
    webhookId + "/" + webhookToken +
    "?thread_id=" + threadId + "&wait=true";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("executeWebhook failed: " + res.status + " " + text);
  }
  return res.json() as Promise<DiscordMessage>;
}

export async function editWebhookMessage(
  webhookId: string,
  webhookToken: string,
  messageId: string,
  threadId: string,
  body: Record<string, unknown>
): Promise<DiscordMessage> {
  const url =
    "https://discord.com/api/v10/webhooks/" +
    webhookId + "/" + webhookToken +
    "/messages/" + messageId +
    "?thread_id=" + threadId;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("editWebhookMessage failed: " + res.status + " " + text);
  }
  return res.json() as Promise<DiscordMessage>;
}

export async function deleteWebhookMessage(
  webhookId: string,
  webhookToken: string,
  messageId: string,
  threadId: string
): Promise<void> {
  const res = await fetch(
    "https://discord.com/api/v10/webhooks/" + webhookId + "/" + webhookToken + "/messages/" + messageId + "?thread_id=" + threadId,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error("deleteWebhookMessage failed: " + res.status + " " + text);
  }
}

export async function deleteMessage(
  channelId: string,
  messageId: string,
  botToken: string
): Promise<void> {
  const res = await fetch(
    "https://discord.com/api/v10/channels/" + channelId + "/messages/" + messageId,
    {
      method: "DELETE",
      headers: { Authorization: "Bot " + botToken },
    }
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error("deleteMessage failed: " + res.status + " " + text);
  }
}

export async function channelExists(
  channelId: string,
  botToken: string
): Promise<boolean> {
  try {
    await getChannel(channelId, botToken);
    return true;
  } catch (err) {
    // 404만 "없음"으로 처리; 403/네트워크 오류 등은 존재 가정 (null 업데이트 방지)
    if (err instanceof Error && err.message.includes(": 404 ")) return false;
    console.warn("[discord] channelExists 오류 (존재로 간주):", err);
    return true;
  }
}
