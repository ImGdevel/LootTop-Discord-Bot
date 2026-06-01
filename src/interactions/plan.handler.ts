// 목표 기능 제거됨 — 목표 채널은 Cron이 자동 생성하고
// 사용자는 해당 스레드에 직접 메시지를 작성합니다.

import type { DiscordInteraction, Env } from "../types.js";

export function handleGoalCommand(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // 목표 기능 없음 — 홈 버튼에서 이 경로로 오지 않도록 라우터에서 제거
  return new Response(JSON.stringify({ type: 4, data: { content: "목표는 #목표 채널 스레드에 직접 작성해 주세요.", flags: 64 } }), {
    headers: { "Content-Type": "application/json" },
  });
}
