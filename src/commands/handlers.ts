import { deferredEphemeralResponse, deferredResponse } from "../discord/response.js";
import type { DiscordInteraction, Env } from "../types.js";

/**
 * 슬래시 커맨드 핸들러
 *
 * 각 핸들러는 즉시 Deferred Response를 반환하고,
 * 실제 처리는 waitUntil을 통해 비동기로 진행한다.
 */

export function handleWeeklyPlan(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 5: 계획 조회 또는 작성 모달 응답
  return deferredEphemeralResponse();
}

export function handleCheckin(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 6: 인증 모달 응답
  return deferredEphemeralResponse();
}

export function handleLeaderboard(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 7: 리더보드 집계 후 공개 응답
  return deferredResponse();
}

export function handleMyPlan(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 7: 내 계획 조회
  return deferredEphemeralResponse();
}

export function handleMyCheckinStatus(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 7: 내 인증 현황 조회
  return deferredEphemeralResponse();
}

export function handleSettings(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 4: 관리자 설정
  return deferredEphemeralResponse();
}
