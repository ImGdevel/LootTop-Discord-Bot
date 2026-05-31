import {
  handleSettings,
} from "../commands/handlers.js";
import {
  handleGoalCommand,
  handleGoalWriteButton,
  handleGoalWriteModal,
} from "./plan.handler.js";
import { handleHomeCommand } from "./home.handler.js";
import {
  handleCheckinCommand,
  handleCheckinButton,
  handleCheckinModal,
} from "./checkin.handler.js";
import { handleLeaderboardCommand } from "./leaderboard.handler.js";
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
    case COMMANDS.HOME:
      return handleHomeCommand(interaction, env, ctx);
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
  return routeV2Button(interaction, env, ctx);
}

function routeV2Button(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response | null {
  const customId = interaction.data?.custom_id ?? "";
  if (customId.startsWith("home:goal")) {
    return handleGoalCommand(interaction, env, ctx);
  }
  if (customId.startsWith("home:checkin")) {
    return handleCheckinCommand(interaction, env, ctx);
  }
  if (customId.startsWith("home:leaderboard") || customId.startsWith("leaderboard:view")) {
    return handleLeaderboardCommand(interaction, env, ctx);
  }
  if (customId.startsWith("goal:create") || customId.startsWith("goal:edit")) {
    return handleGoalWriteButton(interaction);
  }
  if (customId.startsWith("checkin:submit")) {
    return handleCheckinButton(interaction);
  }
  if (customId.startsWith("home:refresh")) {
    return handleHomeCommand(interaction, env, ctx);
  }
  return null;
}

function routeModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response | null {
  switch (interaction.data?.custom_id) {
    case MODAL_IDS.GOAL_WRITE:
      return handleGoalWriteModal(interaction, env, ctx);
    case MODAL_IDS.CHECKIN_TODAY:
      return handleCheckinModal(interaction, env, ctx);
    default:
      return null;
  }
}
