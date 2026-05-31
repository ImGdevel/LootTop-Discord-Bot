import {
  handleCheckin,
  handleLeaderboard,
  handleMyCheckinStatus,
  handleMyPlan,
  handleSettings,
} from "../commands/handlers.js";
import {
  handleWeeklyPlanCommand,
  handlePlanWriteButton,
  handlePlanWriteModal,
} from "./plan.handler.js";
import { BUTTON_IDS, COMMANDS, MODAL_IDS } from "../commands/definitions.js";
import { InteractionType } from "../types.js";
import type { DiscordInteraction, Env } from "../types.js";

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
      return handleWeeklyPlanCommand(interaction, env, ctx);
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
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response | null {
  switch (interaction.data?.custom_id) {
    case BUTTON_IDS.PLAN_WRITE:
      return handlePlanWriteButton(interaction);
    case BUTTON_IDS.CHECKIN_TODAY:
      // TODO Phase 6
      return null;
    case BUTTON_IDS.LEADERBOARD_VIEW:
      // TODO Phase 7
      return null;
    default:
      return null;
  }
}

function routeModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response | null {
  switch (interaction.data?.custom_id) {
    case MODAL_IDS.PLAN_WRITE:
      return handlePlanWriteModal(interaction, env, ctx);
    case MODAL_IDS.CHECKIN_TODAY:
      // TODO Phase 6
      return null;
    default:
      return null;
  }
}
