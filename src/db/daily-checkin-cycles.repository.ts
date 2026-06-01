import type { DailyCheckinCycleRow } from "./types.js";

export async function getDailyCheckinCycle(
  db: D1Database,
  guildId: string,
  checkinDate: string
): Promise<DailyCheckinCycleRow | null> {
  const result = await db
    .prepare(`
      SELECT * FROM daily_checkin_cycles
      WHERE guild_id = ? AND checkin_date = ?
    `)
    .bind(guildId, checkinDate)
    .first<DailyCheckinCycleRow>();
  return result ?? null;
}

export async function insertDailyCheckinCycle(
  db: D1Database,
  input: {
    guildId: string;
    checkinDate: string;
    threadId: string;
    title: string;
    opensAt: string;
    closesAt: string;
    webhookId?: string;
    webhookToken?: string;
  }
): Promise<DailyCheckinCycleRow> {
  const now = new Date().toISOString();
  await db
    .prepare(`
      INSERT INTO daily_checkin_cycles
        (guild_id, checkin_date, thread_id, title, opens_at, closes_at, status, webhook_id, webhook_token, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `)
    .bind(
      input.guildId,
      input.checkinDate,
      input.threadId,
      input.title,
      input.opensAt,
      input.closesAt,
      input.webhookId ?? null,
      input.webhookToken ?? null,
      now
    )
    .run();

  const cycle = await getDailyCheckinCycle(db, input.guildId, input.checkinDate);
  if (!cycle) throw new Error("insertDailyCheckinCycle: 저장 후 조회 실패");
  return cycle;
}

export async function updateDailyCheckinCycleStatus(
  db: D1Database,
  id: number,
  status: "open" | "closed" | "archived"
): Promise<void> {
  await db
    .prepare("UPDATE daily_checkin_cycles SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();
}

export async function getOpenCheckinCyclesToClose(
  db: D1Database,
  nowIso: string
): Promise<DailyCheckinCycleRow[]> {
  const result = await db
    .prepare(`
      SELECT * FROM daily_checkin_cycles
      WHERE status = 'open' AND closes_at <= ?
      ORDER BY closes_at ASC
    `)
    .bind(nowIso)
    .all<DailyCheckinCycleRow>();
  return result.results;
}
