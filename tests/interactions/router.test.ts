import { beforeEach, describe, expect, it, vi } from "vitest";

const handlerMocks = vi.hoisted(() => ({
  handleSettings: vi.fn(),
  handleRefreshCommand: vi.fn(),
  handleGoalCommand: vi.fn(),
  handleHomeCommand: vi.fn(),
  handleCheckinButton: vi.fn(),
  handleCheckinModal: vi.fn(),
  handleCheckinCommand: vi.fn(),
  handleLeaderboardCommand: vi.fn(),
}));

vi.mock("../../src/commands/handlers.js", () => ({
  handleSettings: handlerMocks.handleSettings,
}));

vi.mock("../../src/interactions/refresh.handler.js", () => ({
  handleRefreshCommand: handlerMocks.handleRefreshCommand,
}));

vi.mock("../../src/interactions/plan.handler.js", () => ({
  handleGoalCommand: handlerMocks.handleGoalCommand,
}));

vi.mock("../../src/interactions/home.handler.js", () => ({
  handleHomeCommand: handlerMocks.handleHomeCommand,
}));

vi.mock("../../src/interactions/checkin.handler.js", () => ({
  handleCheckinButton: handlerMocks.handleCheckinButton,
  handleCheckinModal: handlerMocks.handleCheckinModal,
  handleCheckinCommand: handlerMocks.handleCheckinCommand,
}));

vi.mock("../../src/interactions/leaderboard.handler.js", () => ({
  handleLeaderboardCommand: handlerMocks.handleLeaderboardCommand,
}));

import { routeInteraction } from "../../src/interactions/router.js";
import { COMMANDS, MODAL_IDS } from "../../src/commands/definitions.js";
import { InteractionType } from "../../src/types.js";
import type { DiscordInteraction, Env } from "../../src/types.js";

describe("routeInteraction", () => {
  const env = {} as Env;
  const ctx = {} as ExecutionContext;
  const response = new Response("ok");

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(handlerMocks).forEach((mock) => mock.mockReturnValue(response));
  });

  it("routes /홈 command to the home handler", () => {
    const interaction = createCommandInteraction(COMMANDS.HOME);

    const actual = routeInteraction(interaction, env, ctx);

    expect(actual).toBe(response);
    expect(handlerMocks.handleHomeCommand).toHaveBeenCalledWith(interaction, env, ctx);
  });

  it("routes /인증 command to the checkin command handler", () => {
    const interaction = createCommandInteraction(COMMANDS.CHECKIN);

    const actual = routeInteraction(interaction, env, ctx);

    expect(actual).toBe(response);
    expect(handlerMocks.handleCheckinCommand).toHaveBeenCalledWith(interaction, env, ctx);
  });

  it("routes checkin component ids to the checkin button handler", () => {
    const interaction = createComponentInteraction("checkin:submit:self:today:1");

    const actual = routeInteraction(interaction, env, ctx);

    expect(actual).toBe(response);
    expect(handlerMocks.handleCheckinButton).toHaveBeenCalledWith(interaction);
  });

  it("routes goal component ids to the goal handler", () => {
    const interaction = createComponentInteraction("goal:create:self:current:1");

    const actual = routeInteraction(interaction, env, ctx);

    expect(actual).toBe(response);
    expect(handlerMocks.handleGoalCommand).toHaveBeenCalledWith(interaction, env, ctx);
  });

  it("routes checkin modal submissions to the modal handler", () => {
    const interaction = createModalInteraction(MODAL_IDS.CHECKIN);

    const actual = routeInteraction(interaction, env, ctx);

    expect(actual).toBe(response);
    expect(handlerMocks.handleCheckinModal).toHaveBeenCalledWith(interaction, env, ctx);
  });
});

function createCommandInteraction(name: string): DiscordInteraction {
  return {
    id: "1",
    application_id: "app",
    type: InteractionType.APPLICATION_COMMAND,
    data: { name },
    guild_id: "guild",
    token: "token",
  };
}

function createComponentInteraction(customId: string): DiscordInteraction {
  return {
    id: "1",
    application_id: "app",
    type: InteractionType.MESSAGE_COMPONENT,
    data: { custom_id: customId },
    guild_id: "guild",
    token: "token",
  };
}

function createModalInteraction(customId: string): DiscordInteraction {
  return {
    id: "1",
    application_id: "app",
    type: InteractionType.MODAL_SUBMIT,
    data: { custom_id: customId, components: [] },
    guild_id: "guild",
    token: "token",
  };
}
