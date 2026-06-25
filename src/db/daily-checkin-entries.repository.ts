import type { DailyCheckinEntryItemRow, DailyCheckinEntryRow } from "./types.js";

export async function insertDailyCheckinEntry(
  db: D1Database,
  input: {
    guildId: string;
    discordUserId: string;
    dailyCheckinCycleId: number;
    entryMessageId?: string | null;
    submittedAt: string;
    status?: "valid" | "late" | "discarded";
  }
): Promise<DailyCheckinEntryRow> {
  await db
    .prepare(`
      INSERT INTO daily_checkin_entries
        (guild_id, discord_user_id, daily_checkin_cycle_id, entry_message_id, submitted_at, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(input.guildId, input.discordUserId, input.dailyCheckinCycleId, input.entryMessageId ?? null, input.submittedAt, input.status ?? "valid")
    .run();
  const result = await db
    .prepare("SELECT * FROM daily_checkin_entries WHERE rowid = last_insert_rowid()")
    .first<DailyCheckinEntryRow>();
  if (!result) throw new Error("insertDailyCheckinEntry: 저장 후 조회 실패");
  return result;
}

export async function updateDailyCheckinEntryMessageId(db: D1Database, id: number, entryMessageId: string): Promise<void> {
  await db.prepare("UPDATE daily_checkin_entries SET entry_message_id = ? WHERE id = ?").bind(entryMessageId, id).run();
}

export async function insertDailyCheckinEntryItems(
  db: D1Database,
  dailyCheckinEntryId: number,
  items: Array<{ goalItemId: number; checked?: boolean | null; textValue?: string | null; urlValue?: string | null; attachmentUrl?: string | null }>
): Promise<void> {
  for (const item of items) {
    await db
      .prepare("INSERT INTO daily_checkin_entry_items (daily_checkin_entry_id, goal_item_id, checked, text_value, url_value, attachment_url) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(dailyCheckinEntryId, item.goalItemId, item.checked == null ? null : item.checked ? 1 : 0, item.textValue ?? null, item.urlValue ?? null, item.attachmentUrl ?? null)
      .run();
  }
}

export async function getDailyCheckinEntriesForUserAndCycle(db: D1Database, guildId: string, discordUserId: string, dailyCheckinCycleId: number): Promise<DailyCheckinEntryRow[]> {
  const result = await db
    .prepare("SELECT * FROM daily_checkin_entries WHERE guild_id = ? AND discord_user_id = ? AND daily_checkin_cycle_id = ? ORDER BY submitted_at ASC")
    .bind(guildId, discordUserId, dailyCheckinCycleId)
    .all<DailyCheckinEntryRow>();
  return result.results;
}

export async function getDailyCheckinEntriesForCycle(db: D1Database, dailyCheckinCycleId: number): Promise<DailyCheckinEntryRow[]> {
  const result = await db
    .prepare("SELECT * FROM daily_checkin_entries WHERE daily_checkin_cycle_id = ? ORDER BY submitted_at ASC")
    .bind(dailyCheckinCycleId)
    .all<DailyCheckinEntryRow>();
  return result.results;
}

export async function getDailyCheckinEntryItems(db: D1Database, dailyCheckinEntryId: number): Promise<DailyCheckinEntryItemRow[]> {
  const result = await db
    .prepare("SELECT * FROM daily_checkin_entry_items WHERE daily_checkin_entry_id = ? ORDER BY id ASC")
    .bind(dailyCheckinEntryId)
    .all<DailyCheckinEntryItemRow>();
  return result.results;
}

export async function getValidEntryItemCountsByGoalIds(db: D1Database, dailyCheckinCycleId: number): Promise<Array<{ goal_item_id: number; count: number }>> {
  const result = await db
    .prepare("SELECT i.goal_item_id, COUNT(*) as count FROM daily_checkin_entry_items i JOIN daily_checkin_entries e ON e.id = i.daily_checkin_entry_id WHERE e.daily_checkin_cycle_id = ? AND e.status = 'valid' GROUP BY i.goal_item_id")
    .bind(dailyCheckinCycleId)
    .all<{ goal_item_id: number; count: number }>();
  return result.results;
}

export async function getDailyCheckinEntryById(db: D1Database, id: number): Promise<DailyCheckinEntryRow | null> {
  const result = await db
    .prepare("SELECT * FROM daily_checkin_entries WHERE id = ?")
    .bind(id)
    .first<DailyCheckinEntryRow>();
  return result ?? null;
}

export async function updateSimpleCheckin(
  db: D1Database,
  id: number,
  input: { content: string; proofUrl: string | null; achievementRate: number | null }
): Promise<void> {
  await db
    .prepare("UPDATE daily_checkin_entries SET content = ?, proof_url = ?, achievement_rate = ? WHERE id = ?")
    .bind(input.content, input.proofUrl, input.achievementRate, id)
    .run();
}

// 단순 인증 저장 (content/proof_url 직접)
export async function insertSimpleCheckin(
  db: D1Database,
  input: { guildId: string; discordUserId: string; dailyCheckinCycleId: number; content: string; proofUrl: string | null; achievementRate?: number | null }
): Promise<DailyCheckinEntryRow> {
  const now = new Date().toISOString();
  await db
    .prepare("INSERT INTO daily_checkin_entries (guild_id, discord_user_id, daily_checkin_cycle_id, content, proof_url, achievement_rate, submitted_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'valid')")
    .bind(input.guildId, input.discordUserId, input.dailyCheckinCycleId, input.content, input.proofUrl, input.achievementRate ?? null, now)
    .run();
  const row = await db
    .prepare("SELECT * FROM daily_checkin_entries WHERE guild_id = ? AND discord_user_id = ? AND daily_checkin_cycle_id = ? ORDER BY id DESC LIMIT 1")
    .bind(input.guildId, input.discordUserId, input.dailyCheckinCycleId)
    .first<DailyCheckinEntryRow>();
  if (!row) throw new Error("insertSimpleCheckin: 저장 후 조회 실패");
  return row;
}

// 주간 인증 횟수 집계 — 하루 여러 번 제출해도 날짜(cycle) 기준 1회만 카운트
export async function getWeeklyCheckinCounts(
  db: D1Database,
  guildId: string,
  weekStartDate: string,
  weekEndDate: string
): Promise<Array<{ discord_user_id: string; count: number }>> {
  const result = await db
    .prepare(`
      SELECT e.discord_user_id, COUNT(DISTINCT e.daily_checkin_cycle_id) as count
      FROM daily_checkin_entries e
      JOIN daily_checkin_cycles c ON c.id = e.daily_checkin_cycle_id
      WHERE e.guild_id = ?
        AND e.status = 'valid'
        AND c.checkin_date >= ?
        AND c.checkin_date <= ?
      GROUP BY e.discord_user_id
      ORDER BY count DESC
    `)
    .bind(guildId, weekStartDate, weekEndDate)
    .all<{ discord_user_id: string; count: number }>();
  return result.results;
}
