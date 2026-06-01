import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  getGuildSettings: vi.fn(),
  upsertGuildSettings: vi.fn(),
}));

vi.mock("../../src/db/guild-settings.repository.js", () => ({
  getGuildSettings: repoMocks.getGuildSettings,
  upsertGuildSettings: repoMocks.upsertGuildSettings,
}));

import {
  formatSettings,
  updateGuildSetting,
} from "../../src/services/guild-settings.service.js";
import type { GuildSettingsRow } from "../../src/db/types.js";

describe("guild-settings.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid HH:MM values for time fields", async () => {
    const result = await updateGuildSetting(
      {} as D1Database,
      "guild-1",
      "goal_publish_time",
      "99:77"
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("올바른 시간 범위");
    expect(repoMocks.upsertGuildSettings).not.toHaveBeenCalled();
  });

  it("formats channel updates with a channel mention", async () => {
    const result = await updateGuildSetting(
      {} as D1Database,
      "guild-1",
      "goal_forum_channel_id",
      "123456789"
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("<#123456789>");
    expect(repoMocks.upsertGuildSettings).toHaveBeenCalledWith(
      expect.anything(),
      "guild-1",
      { goal_forum_channel_id: "123456789" }
    );
  });

  it("renders V2 settings summary with mapped channels and schedule times", () => {
    const settings: GuildSettingsRow = {
      guild_id: "guild-1",
      timezone: "Asia/Seoul",
      plan_reminder_channel_id: null,
      checkin_channel_id: "2",
      leaderboard_channel_id: null,
      plan_reminder_time: null,
      checkin_reminder_time: null,
      leaderboard_publish_time: "00:00",
      study_home_channel_id: "1",
      goal_forum_channel_id: "3",
      leaderboard_forum_channel_id: "4",
      goal_publish_time: "18:00",
      checkin_thread_open_time: "04:00",
      checkin_thread_close_time: "04:00",
      created_at: "",
      updated_at: "",
    };

    const actual = formatSettings(settings);

    expect(actual).toContain("스터디 홈: <#1>");
    expect(actual).toContain("목표 포럼: <#3>");
    expect(actual).toContain("인증: <#2>");
    expect(actual).toContain("리더보드 포럼: <#4>");
    expect(actual).toContain("목표 생성: 18:00");
  });
});
