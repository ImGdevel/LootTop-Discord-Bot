import type { UserRow } from "./types.js";

/**
 * 첫 계획 작성 시 upsert, 이후 인증 제출 시 display_name_snapshot 갱신.
 */
export async function upsertUser(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  displayName: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(`
      INSERT INTO users (guild_id, discord_user_id, display_name_snapshot, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (guild_id, discord_user_id)
      DO UPDATE SET display_name_snapshot = excluded.display_name_snapshot, updated_at = excluded.updated_at
    `)
    .bind(guildId, discordUserId, displayName, now, now)
    .run();
}

export async function addPoints(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  amount: number
): Promise<void> {
  await db
    .prepare("UPDATE users SET total_points = total_points + ? WHERE guild_id = ? AND discord_user_id = ?")
    .bind(amount, guildId, discordUserId)
    .run();
}

export async function getUser(
  db: D1Database,
  guildId: string,
  discordUserId: string
): Promise<UserRow | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE guild_id = ? AND discord_user_id = ?")
    .bind(guildId, discordUserId)
    .first<UserRow>();
  return result ?? null;
}
