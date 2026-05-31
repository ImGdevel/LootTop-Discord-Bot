import { handleSettings } from "../commands/handlers.js";
import {
  handleGoalCommand,
  handleGoalWriteButton,
  handleGoalWriteModal,
  handleGoalProofTypeSelect,
  handleGoalRestDaysSelect,
  handleGoalSaveButton,
} from "./plan.handler.js";
import { handleHomeCommand } from "./home.handler.js";
import {
  handleCheckinCommand,
  handleCheckinButton,
  handleCheckinModal,
} from "./checkin.handler.js";
import { handleLeaderboardCommand } from "./leaderboard.handler.js";
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
      return await routeCommand(interaction, env, ctx);
    case InteractionType.MESSAGE_COMPONENT:
      return await routeComponent(interaction, env, ctx);
    case InteractionType.MODAL_SUBMIT:
      return await routeModal(interaction, env, ctx);
    default:
      return null;
  }
}

async function routeCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  switch (interaction.data?.name) {
    case COMMANDS.HOME:
      return handleHomeCommand(interaction, env, ctx);
    case COMMANDS.SETTINGS:
      return handleSettings(interaction, env, ctx);
    default:
      return null;
  }
}

async function routeComponent(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  const customId = interaction.data?.custom_id ?? "";

  // 목표 wizard
  if (customId.startsWith("goal:create") || customId.startsWith("goal:edit")) {
    return handleGoalWriteButton(interaction);
  }
  if (customId.startsWith("goal:proof:")) {
    return handleGoalProofTypeSelect(interaction, env, ctx);
  }
  if (customId.startsWith("goal:rest:")) {
    return handleGoalRestDaysSelect(interaction, env, ctx);
  }
  if (customId.startsWith("goal:save:")) {
    return handleGoalSaveButton(interaction, env, ctx);
  }

  // 홈 버튼 → 목표/인증/리더보드 이동
  if (customId.startsWith("home:goal")) {
    return handleGoalCommand(interaction, env, ctx);
  }
  if (customId.startsWith("home:checkin") || customId.startsWith("checkin:submit")) {
    return await handleCheckinButton(interaction, env);
  }
  if (customId.startsWith("home:leaderboard") || customId.startsWith("leaderboard:view")) {
    return handleLeaderboardCommand(interaction, env, ctx);
  }
  if (customId.startsWith("home:refresh")) {
    return handleHomeCommand(interaction, env, ctx);
  }

  return null;
}

async function routeModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  switch (interaction.data?.custom_id) {
    case MODAL_IDS.GOAL_WRITE:
      return handleGoalWriteModal(interaction, env, ctx);
    case MODAL_IDS.CHECKIN_TODAY:
      return handleCheckinModal(interaction, env, ctx);
    default:
      return null;
  }
}
