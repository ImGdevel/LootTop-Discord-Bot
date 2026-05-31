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
           leaderboard_publish_time, study_home_channel_id, goal_forum_channel_id,
           leaderboard_forum_channel_id, goal_publish_time, checkin_thread_open_time,
           checkin_thread_close_time, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        guildId,
        fields.timezone ?? "Asia/Seoul",
        fields.plan_reminder_channel_id ?? null,
        fields.checkin_channel_id ?? null,
        fields.leaderboard_channel_id ?? null,
        fields.plan_reminder_time ?? null,
        fields.checkin_reminder_time ?? null,
        fields.leaderboard_publish_time ?? "00:00",
        fields.study_home_channel_id ?? null,
        fields.goal_forum_channel_id ?? null,
        fields.leaderboard_forum_channel_id ?? null,
        fields.goal_publish_time ?? "18:00",
        fields.checkin_thread_open_time ?? "04:00",
        fields.checkin_thread_close_time ?? "04:00",
        now,
        now
      )
      .run();
  } else {
    const merged = { ...existing, ...fields };
    await db
      .prepare(`
        UPDATE guild_settings SET
          timezone = ?,
          plan_reminder_channel_id = ?, checkin_channel_id = ?,
          leaderboard_channel_id = ?, plan_reminder_time = ?, checkin_reminder_time = ?,
          leaderboard_publish_time = ?,
          study_home_channel_id = ?, goal_forum_channel_id = ?,
          leaderboard_forum_channel_id = ?,
          goal_publish_time = ?, checkin_thread_open_time = ?, checkin_thread_close_time = ?,
          updated_at = ?
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
        merged.study_home_channel_id,
        merged.goal_forum_channel_id,
        merged.leaderboard_forum_channel_id,
        merged.goal_publish_time,
        merged.checkin_thread_open_time,
        merged.checkin_thread_close_time,
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

export async function ensureGuildSettings(
  db: D1Database,
  guildId: string
): Promise<GuildSettingsRow> {
  const existing = await getGuildSettings(db, guildId);
  if (existing) return existing;
  await upsertGuildSettings(db, guildId, {});
  const created = await getGuildSettings(db, guildId);
  if (!created) throw new Error("ensureGuildSettings: 생성 후 조회 실패");
  return created;
}
