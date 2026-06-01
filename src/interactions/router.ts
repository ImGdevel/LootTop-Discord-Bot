import { handleAdmin } from "../commands/handlers.js";
import { handleVacationCommand, handleVacationModal, VACATION_MODAL_CUSTOM_ID } from "./vacation.handler.js";
import { handleGoalCommand } from "./plan.handler.js";
import { handleHomeCommand } from "./home.handler.js";
import { VACATION_SUBMIT_BUTTON_ID } from "../services/vacation-cycle.service.js";
import {
  handleCheckinButton,
  handleCheckinModal,
  handleCheckinCommand,
} from "./checkin.handler.js";
import { handleLeaderboardCommand } from "./leaderboard.handler.js";
import { COMMANDS, MODAL_IDS } from "../commands/definitions.js";
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
      return routeComponent(interaction, env, ctx);
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
    case COMMANDS.HOME:
      return handleHomeCommand(interaction, env, ctx);
    case COMMANDS.ADMIN:
      return handleAdmin(interaction, env, ctx);
    case COMMANDS.CHECKIN:
      return handleCheckinCommand(interaction, env, ctx);
    case COMMANDS.VACATION:
      return handleVacationCommand(interaction);
    default:
      return null;
  }
}

function routeComponent(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response | null {
  const id = interaction.data?.custom_id ?? "";

  if (id.startsWith("checkin:submit") || id.startsWith("home:checkin")) {
    return handleCheckinButton(interaction);
  }
  if (id.startsWith("home:leaderboard") || id.startsWith("leaderboard:view")) {
    return handleLeaderboardCommand(interaction, env, ctx);
  }
  if (id.startsWith("home:refresh")) {
    return handleHomeCommand(interaction, env, ctx);
  }
  if (id.startsWith("home:goal") || id.startsWith("goal:")) {
    return handleGoalCommand(interaction, env, ctx);
  }
  if (id === VACATION_SUBMIT_BUTTON_ID) {
    return handleVacationCommand(interaction);
  }

  return null;
}

function routeModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response | null {
  if (interaction.data?.custom_id === MODAL_IDS.CHECKIN) {
    return handleCheckinModal(interaction, env, ctx);
  }
  if (interaction.data?.custom_id === VACATION_MODAL_CUSTOM_ID) {
    return handleVacationModal(interaction, env, ctx);
  }
  return null;
}
