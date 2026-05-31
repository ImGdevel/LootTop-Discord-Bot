import {
  handleCheckin,
  handleLeaderboard,
  handleMyCheckinStatus,
  handleMyPlan,
  handleSettings,
  handleWeeklyPlan,
} from "../commands/handlers.js";
import { BUTTON_IDS, COMMANDS, MODAL_IDS } from "../commands/definitions.js";
import { InteractionType } from "../types.js";
import type { DiscordInteraction, Env } from "../types.js";

/**
 * Interaction 라우터
 *
 * Interaction 타입과 커맨드명/custom_id를 기반으로 적절한 핸들러로 분기한다.
 */
export function routeInteraction(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response | null {
  switch (interaction.type) {
    case InteractionType.APPLICATION_COMMAND:
      return routeCommand(interaction, env, ctx);

    case InteractionType.MESSAGE_COMPONENT:
      return routeButton(interaction, env, ctx);

    case InteractionType.MODAL_SUBMIT:
      return routeModal(interaction, env, ctx);

    default:
      return null;
  }
}

function routeCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response | null {
  switch (interaction.data?.name) {
    case COMMANDS.WEEKLY_PLAN:
      return handleWeeklyPlan(interaction, env, ctx);
    case COMMANDS.CHECKIN:
      return handleCheckin(interaction, env, ctx);
    case COMMANDS.LEADERBOARD:
      return handleLeaderboard(interaction, env, ctx);
    case COMMANDS.MY_PLAN:
      return handleMyPlan(interaction, env, ctx);
    case COMMANDS.MY_CHECKIN_STATUS:
      return handleMyCheckinStatus(interaction, env, ctx);
    case COMMANDS.SETTINGS:
      return handleSettings(interaction, env, ctx);
    default:
      return null;
  }
}

function routeButton(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response | null {
  switch (_interaction.data?.custom_id) {
    case BUTTON_IDS.PLAN_WRITE:
      // TODO Phase 5: 계획 작성 모달 응답
      return null;
    case BUTTON_IDS.CHECKIN_TODAY:
      // TODO Phase 6: 인증 모달 응답
      return null;
    case BUTTON_IDS.LEADERBOARD_VIEW:
      // TODO Phase 7: 리더보드 보기
      return null;
    default:
      return null;
  }
}

function routeModal(
  _interaction: DiscordInteraction,
  _env: Env,
  _ctx: ExecutionContext
): Response | null {
  switch (_interaction.data?.custom_id) {
    case MODAL_IDS.PLAN_WRITE:
      // TODO Phase 5: 계획 저장
      return null;
    case MODAL_IDS.CHECKIN_TODAY:
      // TODO Phase 6: 인증 저장
      return null;
    default:
      return null;
  }
}
