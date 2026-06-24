export function toLocalDateString(utcDate: Date, timezone: string): string {
  return utcDate.toLocaleDateString("en-CA", { timeZone: timezone });
}

export function getCheckinOperationalDateString(
  utcDate: Date,
  timezone: string,
  cutoffTime: string
): string {
  const local = getLocalDateTimeParts(utcDate, timezone);
  const cutoffMinutes = parseTimeToMinutes(cutoffTime);
  const currentMinutes = local.hour * 60 + local.minute;
  const anchor = new Date(Date.UTC(local.year, local.month - 1, local.day));

  if (currentMinutes < cutoffMinutes) {
    anchor.setUTCDate(anchor.getUTCDate() - 1);
  }

  return formatUtcDateParts(anchor);
}

/**
 * UTC 시각 기준으로 "운영상 현재 주차"의 시작일(YYYY-MM-DD)을 반환한다.
 *
 * 체크인의 cutoff 개념과 동일: weekStartDay 요일이지만 weekStartTime 이전이라면
 * 아직 새 주가 시작되지 않은 것으로 간주하고 이전 주의 시작일을 반환한다.
 *
 * @param weekStartDay  0=일, 1=월(기본), 2=화, ..., 6=토
 * @param weekStartTime HH:MM 형식 (기본 '00:00')
 */
export function getOperationalWeekStartDate(
  utcDate: Date,
  timezone: string,
  weekStartDay: number = 1,
  weekStartTime: string = "00:00"
): string {
  const local = getLocalDateTimeParts(utcDate, timezone);
  const currentMinutes = local.hour * 60 + local.minute;
  const cutoffMinutes = parseTimeToMinutes(weekStartTime);

  // 로컬 날짜의 자정(UTC)을 기준으로 요일 계산
  const localMidnight = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const currentDayOfWeek = localMidnight.getUTCDay(); // 0=일, 1=월, ...

  // 현재 요일에서 weekStartDay까지 며칠 이전인지
  let daysBack = (currentDayOfWeek - weekStartDay + 7) % 7;

  // 정확히 weekStartDay이지만 cutoff 시각 이전이면 아직 이전 주
  if (daysBack === 0 && currentMinutes < cutoffMinutes) {
    daysBack = 7;
  }

  const weekStart = new Date(localMidnight);
  weekStart.setUTCDate(localMidnight.getUTCDate() - daysBack);
  return formatUtcDateParts(weekStart);
}

export function getWeekStartDate(localDateStr: string): string {
  const date = new Date(localDateStr + "T00:00:00");
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return formatDateParts(monday);
}

export function getWeekEndDate(weekStartDate: string): string {
  const monday = new Date(weekStartDate + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return formatDateParts(sunday);
}

// "2026-06-01" -> "6월 1주차"
export function formatWeekLabel(weekStartDate: string): string {
  const date = new Date(weekStartDate + "T00:00:00");
  const month = date.getMonth() + 1;
  const weekNum = Math.ceil(date.getDate() / 7);
  return month + "월 " + weekNum + "주차";
}

export function isScheduledTime(
  nowUtc: Date,
  localTime: string,
  timezone: string
): boolean {
  const localNow = new Date(nowUtc.toLocaleString("en-US", { timeZone: timezone }));
  const [targetHour, targetMinute] = localTime.split(":").map(Number);
  const diffMinutes =
    (localNow.getHours() - (targetHour ?? 0)) * 60 +
    (localNow.getMinutes() - (targetMinute ?? 0));
  return Math.abs(diffMinutes) <= 5;
}

function formatDateParts(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function getLocalDateTimeParts(utcDate: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);

  const values: Partial<Record<"year" | "month" | "day" | "hour" | "minute", number>> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    if (part.type === "year" || part.type === "month" || part.type === "day" || part.type === "hour" || part.type === "minute") {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year ?? utcDate.getUTCFullYear(),
    month: values.month ?? utcDate.getUTCMonth() + 1,
    day: values.day ?? utcDate.getUTCDate(),
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
  };
}

function parseTimeToMinutes(localTime: string): number {
  const [hourRaw = "0", minuteRaw = "0"] = localTime.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function formatUtcDateParts(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}
