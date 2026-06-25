import { handleVacationCommand, handleVacationButton, handleVacationModal, VACATION_MODAL_ID, VACATION_BUTTON_ID } from "./vacation.handler.js";
import { handleGoalCommand, handleGoalButton, handleGoalModal, GOAL_MODAL_ID, GOAL_SUBMIT_BUTTON_ID } from "./goal.handler.js";
import { handleHomeCommand } from "./home.handler.js";
import {
  handleCheckinButton,
  handleCheckinModal,
  handleCheckinCommand,
  handleCheckinEditButton,
  handleCheckinEditModal,
} from "./checkin.handler.js";
import { handleLeaderboardCommand } from "./leaderboard.handler.js";
import { handleProfileCommand } from "./profile.handler.js";
import { handleVersionCommand } from "./version.handler.js";
import { handleTimeAutocomplete } from "../commands/settings.handler.js";
import { handleSettings } from "../commands/admin.handler.js";
import { COMMANDS, MODAL_IDS } from "../commands/definitions.js";
import { InteractionType } from "../types.js";
import type { DiscordInteraction, Env } from "../types.js";

export async function routeInteraction(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  switch (interaction.type) {
    case InteractionType.APPLICATION_COMMAND:
      return routeCommand(interaction, env, ctx);
    case InteractionType.MESSAGE_COMPONENT:
      return routeComponent(interaction, env, ctx);
    case InteractionType.MODAL_SUBMIT:
      return routeModal(interaction, env, ctx);
    case InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE:
      return handleTimeAutocomplete(interaction);
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
    case COMMANDS.CHECKIN:
      return handleCheckinCommand(interaction, env, ctx);
    case COMMANDS.VACATION:
      return handleVacationCommand(interaction);
    case COMMANDS.GOAL:
      return handleGoalCommand(interaction);
    case COMMANDS.LEADERBOARD:
      return handleLeaderboardCommand(interaction, env, ctx);
    case COMMANDS.VERSION:
      return handleVersionCommand(interaction, env);
    case COMMANDS.SETTINGS:
      return handleSettings(interaction, env, ctx);
    case COMMANDS.PROFILE:
      return handleProfileCommand(interaction, env, ctx);
    default:
      return null;
  }
}

async function routeComponent(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  const id = interaction.data?.custom_id ?? "";

  if (id.startsWith("checkin:edit:")) {
    return handleCheckinEditButton(interaction, env);
  }
  if (id.startsWith("checkin:submit") || id.startsWith("home:checkin")) {
    return handleCheckinButton(interaction);
  }
  if (id.startsWith("home:leaderboard") || id.startsWith("leaderboard:view")) {
    return handleLeaderboardCommand(interaction, env, ctx);
  }
  if (id.startsWith("home:refresh")) {
    return handleHomeCommand(interaction, env, ctx);
  }
  if (id.startsWith(VACATION_BUTTON_ID)) {
    return handleVacationButton(interaction);
  }
  if (id.startsWith(GOAL_SUBMIT_BUTTON_ID)) {
    return handleGoalButton(interaction);
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
  if ((interaction.data?.custom_id ?? "").startsWith(MODAL_IDS.CHECKIN_EDIT)) {
    return handleCheckinEditModal(interaction, env, ctx);
  }
  if (interaction.data?.custom_id === VACATION_MODAL_ID) {
    return handleVacationModal(interaction, env, ctx);
  }
  if (interaction.data?.custom_id === GOAL_MODAL_ID) {
    return handleGoalModal(interaction, env, ctx);
  }
  return null;
}
