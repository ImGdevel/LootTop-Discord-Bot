export function toLocalDateString(utcDate: Date, timezone: string): string {
  return utcDate.toLocaleDateString("en-CA", { timeZone: timezone });
}

export function getWeekStartDate(localDateStr: string): string {
  const date = new Date(localDateStr + "T00:00:00");
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export function getWeekEndDate(weekStartDate: string): string {
  const monday = new Date(weekStartDate + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday.toISOString().slice(0, 10);
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
