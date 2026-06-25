import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GuildSettingsRow } from "../../src/db/types.js";

// ── 모킹 ──────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getAllGuildSettings: vi.fn(),
  ensureWeeklyLeaderboardCycle: vi.fn(),
  ensureCurrentWeeklyGoalCycle: vi.fn(),
  ensureCurrentVacationCycle: vi.fn(),
  ensureTodayCheckinCycle: vi.fn(),
  closeExpiredCheckinCycles: vi.fn(),
  sendDailyReminder: vi.fn(),
}));

vi.mock("../../src/db/guild-settings.repository.js", () => ({
  getAllGuildSettings: mocks.getAllGuildSettings,
}));
vi.mock("../../src/services/leaderboard-cycle-v2.service.js", () => ({
  ensureWeeklyLeaderboardCycle: mocks.ensureWeeklyLeaderboardCycle,
}));
vi.mock("../../src/services/goal-cycle-v2.service.js", () => ({
  ensureCurrentWeeklyGoalCycle: mocks.ensureCurrentWeeklyGoalCycle,
}));
vi.mock("../../src/services/vacation-cycle.service.js", () => ({
  ensureCurrentVacationCycle: mocks.ensureCurrentVacationCycle,
}));
vi.mock("../../src/services/checkin-cycle-v2.service.js", () => ({
  ensureTodayCheckinCycle: mocks.ensureTodayCheckinCycle,
  closeExpiredCheckinCycles: mocks.closeExpiredCheckinCycles,
}));
vi.mock("../../src/services/reminder-notification.service.js", () => ({
  sendDailyReminder: mocks.sendDailyReminder,
}));

import { runCronForAllGuilds } from "../../src/services/reminder.service.js";

// ── 헬퍼 ──────────────────────────────────────────────────────────────
// 2026-06-08T00:00:00Z = 월요일 09:00 KST
const MONDAY_09_00_UTC = new Date("2026-06-08T00:00:00Z");

function makeSettings(overrides: Partial<GuildSettingsRow> = {}): GuildSettingsRow {
  return {
    guild_id: "guild-1",
    timezone: "Asia/Seoul",
    week_start_day: 1,
    week_start_time: "00:00",
    goal_publish_day: 1,
    goal_publish_time: "09:00",       // KST 09:00 = UTC 00:00
    leaderboard_publish_day: 1,
    leaderboard_publish_time: "09:00",
    checkin_thread_open_time: "04:00",
    checkin_thread_open_day: null,
    checkin_thread_close_time: "18:00",
    checkin_thread_close_day: null,
    checkin_reminder_time: "23:00",
    plan_reminder_time: null,
    study_home_channel_id: null,
    goal_forum_channel_id: "ch-goal",
    checkin_channel_id: "ch-checkin",
    leaderboard_forum_channel_id: "ch-lb",
    leaderboard_channel_id: null,
    notification_channel_id: null,
    vacation_channel_id: "ch-vacation",
    plan_reminder_channel_id: null,
    week_number_start: 1,
    goal_publish_day: 1,
    checkin_thread_open_day: null,
    checkin_thread_close_day: null,
    ...overrides,
  } as GuildSettingsRow;
}

// ── 테스트 ────────────────────────────────────────────────────────────
describe("reminder.service — runCronForAllGuilds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureWeeklyLeaderboardCycle.mockResolvedValue(undefined);
    mocks.ensureCurrentWeeklyGoalCycle.mockResolvedValue(undefined);
    mocks.ensureCurrentVacationCycle.mockResolvedValue(undefined);
    mocks.ensureTodayCheckinCycle.mockResolvedValue(undefined);
    mocks.closeExpiredCheckinCycles.mockResolvedValue(undefined);
    mocks.sendDailyReminder.mockResolvedValue(undefined);
  });

  describe("goal_cycle 실행 순서", () => {
    it("leaderboard → goal → vacation 순서로 호출한다", async () => {
      mocks.getAllGuildSettings.mockResolvedValue([makeSettings()]);
      const callOrder: string[] = [];
      mocks.ensureWeeklyLeaderboardCycle.mockImplementation(() => { callOrder.push("leaderboard"); return Promise.resolve(); });
      mocks.ensureCurrentWeeklyGoalCycle.mockImplementation(() => { callOrder.push("goal"); return Promise.resolve(); });
      mocks.ensureCurrentVacationCycle.mockImplementation(() => { callOrder.push("vacation"); return Promise.resolve(); });

      await runCronForAllGuilds({} as D1Database, "token", MONDAY_09_00_UTC);

      expect(callOrder).toEqual(["leaderboard", "goal", "vacation"]);
    });

    it("leaderboard는 goal_cycle 내부에서만 호출되고 독립적으로 발동하지 않는다", async () => {
      mocks.getAllGuildSettings.mockResolvedValue([makeSettings()]);

      await runCronForAllGuilds({} as D1Database, "token", MONDAY_09_00_UTC);

      // leaderboard는 goal_cycle 내부에서 1번만 호출
      expect(mocks.ensureWeeklyLeaderboardCycle).toHaveBeenCalledTimes(1);
      expect(mocks.ensureCurrentWeeklyGoalCycle).toHaveBeenCalledTimes(1);
      expect(mocks.ensureCurrentVacationCycle).toHaveBeenCalledTimes(1);
    });
  });

  describe("checkin_open", () => {
    it("인증 오픈 시간에 ensureTodayCheckinCycle 호출한다", async () => {
      // 2026-06-08T19:00:00Z = 월요일 04:00 KST (다음날 새벽)
      const MON_04_00_KST = new Date("2026-06-08T19:00:00Z");
      mocks.getAllGuildSettings.mockResolvedValue([makeSettings()]);

      await runCronForAllGuilds({} as D1Database, "token", MON_04_00_KST);

      expect(mocks.ensureTodayCheckinCycle).toHaveBeenCalledTimes(1);
      expect(mocks.ensureCurrentWeeklyGoalCycle).not.toHaveBeenCalled();
    });
  });

  describe("reminder", () => {
    it("알림 시간에 sendDailyReminder 호출한다", async () => {
      // 2026-06-08T14:00:00Z = 월요일 23:00 KST
      const MON_23_00_KST = new Date("2026-06-08T14:00:00Z");
      mocks.getAllGuildSettings.mockResolvedValue([makeSettings()]);

      await runCronForAllGuilds({} as D1Database, "token", MON_23_00_KST);

      expect(mocks.sendDailyReminder).toHaveBeenCalledTimes(1);
    });
  });

  describe("시간 불일치", () => {
    it("설정 시간과 다르면 아무것도 호출하지 않는다", async () => {
      // 2026-06-08T06:00:00Z = 월요일 15:00 KST — 어떤 설정 시간과도 불일치
      const NO_MATCH = new Date("2026-06-08T06:00:00Z");
      mocks.getAllGuildSettings.mockResolvedValue([makeSettings()]);

      await runCronForAllGuilds({} as D1Database, "token", NO_MATCH);

      expect(mocks.ensureWeeklyLeaderboardCycle).not.toHaveBeenCalled();
      expect(mocks.ensureCurrentWeeklyGoalCycle).not.toHaveBeenCalled();
      expect(mocks.ensureTodayCheckinCycle).not.toHaveBeenCalled();
      expect(mocks.sendDailyReminder).not.toHaveBeenCalled();
    });
  });

  describe("복수 길드", () => {
    it("길드별로 독립적으로 처리한다", async () => {
      const guild2 = makeSettings({ guild_id: "guild-2" });
      mocks.getAllGuildSettings.mockResolvedValue([makeSettings(), guild2]);

      await runCronForAllGuilds({} as D1Database, "token", MONDAY_09_00_UTC);

      expect(mocks.ensureCurrentWeeklyGoalCycle).toHaveBeenCalledTimes(2);
      expect(mocks.ensureCurrentWeeklyGoalCycle).toHaveBeenCalledWith(expect.anything(), "guild-1", "token");
      expect(mocks.ensureCurrentWeeklyGoalCycle).toHaveBeenCalledWith(expect.anything(), "guild-2", "token");
    });
  });
});
