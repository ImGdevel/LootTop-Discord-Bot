import { deferredEphemeralResponse, deferredResponse } from "../discord/response.js";
import { handleSettings } from "./settings.handler.js";
import type { DiscordInteraction, Env } from "../types.js";

export function handleLeaderboard(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 7
  return deferredResponse();
}

export function handleMyPlan(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 7
  return deferredEphemeralResponse();
}

export function handleMyCheckinStatus(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response {
  // TODO Phase 7
  return deferredEphemeralResponse();
}

export { handleSettings };
