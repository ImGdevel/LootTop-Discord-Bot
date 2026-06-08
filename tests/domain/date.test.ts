import { describe, expect, it } from "vitest";

import {
  getCheckinOperationalDateString,
  formatWeekLabel,
  getWeekEndDate,
  getWeekStartDate,
  isScheduledTime,
  toLocalDateString,
} from "../../src/domain/date.js";

describe("date domain helpers", () => {
  it("returns local date string in the configured timezone", () => {
    const actual = toLocalDateString(new Date("2026-06-01T00:30:00.000Z"), "Asia/Seoul");

    expect(actual).toBe("2026-06-01");
  });

  it("calculates monday as the week start", () => {
    expect(getWeekStartDate("2026-06-03")).toBe("2026-06-01");
    expect(getWeekStartDate("2026-06-07")).toBe("2026-06-01");
  });

  it("calculates sunday as the week end", () => {
    expect(getWeekEndDate("2026-06-01")).toBe("2026-06-07");
  });

  it("formats week label using month and week number", () => {
    expect(formatWeekLabel("2026-06-01")).toBe("6월 1주차");
    expect(formatWeekLabel("2026-06-22")).toBe("6월 4주차");
  });

  it("accepts times within five minutes of the scheduled local time", () => {
    const nowUtc = new Date("2026-06-01T08:03:00.000Z");

    expect(isScheduledTime(nowUtc, "17:00", "Asia/Seoul")).toBe(true);
    expect(isScheduledTime(nowUtc, "16:54", "Asia/Seoul")).toBe(false);
  });

  it("maps checkin submissions before the cutoff to the previous operational day", () => {
    const beforeCutoff = new Date("2026-06-08T15:01:00.000Z"); // 2026-06-09 00:01 KST
    const afterCutoff = new Date("2026-06-09T00:30:00.000Z"); // 2026-06-09 09:30 KST

    expect(getCheckinOperationalDateString(beforeCutoff, "Asia/Seoul", "04:00")).toBe("2026-06-08");
    expect(getCheckinOperationalDateString(afterCutoff, "Asia/Seoul", "04:00")).toBe("2026-06-09");
  });
});
