import type { VacationEntryRow } from "./types.js";

export async function insertVacationEntry(
  db: D1Database,
  input: {
    guildId: string;
    discordUserId: string;
    vacationDate: string;
    reason: string | null;
  }
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(`
      INSERT OR IGNORE INTO vacation_entries
        (guild_id, discord_user_id, vacation_date, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(input.guildId, input.discordUserId, input.vacationDate, input.reason ?? null, now)
    .run();
  return result.meta.last_row_id as number;
}

export async function updateVacationMessageId(
  db: D1Database,
  id: number,
  messageId: string
): Promise<void> {
  await db
    .prepare("UPDATE vacation_entries SET message_id = ? WHERE id = ?")
    .bind(messageId, id)
    .run();
}

export async function getVacationEntry(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  vacationDate: string
): Promise<VacationEntryRow | null> {
  const result = await db
    .prepare("SELECT * FROM vacation_entries WHERE guild_id = ? AND discord_user_id = ? AND vacation_date = ?")
    .bind(guildId, discordUserId, vacationDate)
    .first<VacationEntryRow>();
  return result ?? null;
}

export async function getVacationUserIds(
  db: D1Database,
  guildId: string,
  vacationDate: string
): Promise<string[]> {
  const result = await db
    .prepare("SELECT discord_user_id FROM vacation_entries WHERE guild_id = ? AND vacation_date = ?")
    .bind(guildId, vacationDate)
    .all<{ discord_user_id: string }>();
  return result.results.map((r) => r.discord_user_id);
}
