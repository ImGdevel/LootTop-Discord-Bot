import { verifyDiscordRequest } from "./discord/verify.js";
import { pongResponse } from "./discord/response.js";
import { routeInteraction } from "./interactions/router.js";
import { InteractionType } from "./types.js";
import type { Env, DiscordInteraction } from "./types.js";

export default {
  /**
   * HTTP 핸들러 - Discord Interaction Webhook 수신
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Discord 서명 검증
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

    // PING → PONG (Discord 엔드포인트 검증용)
    if (interaction.type === InteractionType.PING) {
      return pongResponse();
    }

    // guild_id 없는 DM Interaction 차단
    if (!interaction.guild_id) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: { content: "이 봇은 서버 내에서만 사용할 수 있습니다.", flags: 64 },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Interaction 라우팅
    const response = routeInteraction(interaction, env, ctx);
    if (!response) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: { content: "알 수 없는 명령어입니다.", flags: 64 },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return response;
  },

  /**
   * Cron 핸들러 - 스케줄 자동화
   * Phase 8에서 구현 예정
   */
  async scheduled(
    _event: ScheduledEvent,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    // TODO Phase 8: 다중 길드 Cron 처리
    console.log("Cron triggered:", _event.cron);
  },
};
