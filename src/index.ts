import { verifyDiscordRequest } from "./discord/verify.js";
import { pongResponse } from "./discord/response.js";
import { routeInteraction } from "./interactions/router.js";
import { runCronForAllGuilds } from "./services/reminder.service.js";
import { InteractionType, InteractionResponseType, MessageFlags } from "./types.js";
import type { Env, DiscordInteraction } from "./types.js";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { valid, body } = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);
    if (!valid) {
      return new Response("Unauthorized", { status: 401 });
    }

    let interaction: DiscordInteraction;
    try {
      interaction = JSON.parse(body) as DiscordInteraction;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (interaction.type === InteractionType.PING) {
      return pongResponse();
    }

    if (!interaction.guild_id) {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "이 봇은 서버 내에서만 사용할 수 있습니다.", flags: MessageFlags.EPHEMERAL },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const response = routeInteraction(interaction, env, ctx);
    if (!response) {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "알 수 없는 명령어입니다.", flags: MessageFlags.EPHEMERAL },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return response;
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log("Cron triggered:", event.cron);
    ctx.waitUntil(runCronForAllGuilds(env.DB, env.DISCORD_BOT_TOKEN));
  },
};
