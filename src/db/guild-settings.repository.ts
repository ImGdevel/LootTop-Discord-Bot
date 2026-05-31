import type { GuildSettingsRow } from "./types.js";

export async function getGuildSettings(
  db: D1Database,
  guildId: string
): Promise<GuildSettingsRow | null> {
  const result = await db
    .prepare("SELECT * FROM guild_settings WHERE guild_id = ?")
    .bind(guildId)
    .first<GuildSettingsRow>();
  return result ?? null;
}

export async function upsertGuildSettings(
  db: D1Database,
  guildId: string,
  fields: Partial<Omit<GuildSettingsRow, "guild_id" | "created_at" | "updated_at">>
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getGuildSettings(db, guildId);

  if (!existing) {
    await db
      .prepare(`
        INSERT INTO guild_settings
          (guild_id, timezone, plan_reminder_channel_id, checkin_channel_id,
           leaderboard_channel_id, plan_reminder_time, checkin_reminder_time,
           leaderboard_publish_time, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        guildId,
        fields.timezone ?? "Asia/Seoul",
        fields.plan_reminder_channel_id ?? null,
        fields.checkin_channel_id ?? null,
        fields.leaderboard_channel_id ?? null,
        fields.plan_reminder_time ?? null,
        fields.checkin_reminder_time ?? null,
        fields.leaderboard_publish_time ?? null,
        now,
        now
      )
      .run();
  } else {
    const merged = { ...existing, ...fields };
    await db
      .prepare(`
        UPDATE guild_settings SET
          timezone = ?, plan_reminder_channel_id = ?, checkin_channel_id = ?,
          leaderboard_channel_id = ?, plan_reminder_time = ?, checkin_reminder_time = ?,
          leaderboard_publish_time = ?, updated_at = ?
        WHERE guild_id = ?
      `)
      .bind(
        merged.timezone,
        merged.plan_reminder_channel_id,
        merged.checkin_channel_id,
        merged.leaderboard_channel_id,
        merged.plan_reminder_time,
        merged.checkin_reminder_time,
        merged.leaderboard_publish_time,
        now,
        guildId
      )
      .run();
  }
}

export async function getAllGuildSettings(
  db: D1Database
): Promise<GuildSettingsRow[]> {
  const result = await db
    .prepare("SELECT * FROM guild_settings")
    .all<GuildSettingsRow>();
  return result.results;
}
