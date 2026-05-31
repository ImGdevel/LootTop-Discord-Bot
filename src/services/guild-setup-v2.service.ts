import { getGuildSettings, upsertGuildSettings } from "../db/guild-settings.repository.js";
import { createGuildChannel } from "../discord/rest.js";
import type { GuildSettingsRow } from "../db/types.js";

const CHANNEL_TYPES = {
  GUILD_TEXT: 0,
  GUILD_FORUM: 15,
} as const;

export interface V2GuildSetupResult {
  settings: GuildSettingsRow;
  createdChannels: string[];
}

export async function ensureV2GuildSetup(
  db: D1Database,
  guildId: string,
  botToken: string
): Promise<V2GuildSetupResult> {
  let settings = await getGuildSettings(db, guildId);
  if (!settings) {
    await upsertGuildSettings(db, guildId, {
      timezone: "Asia/Seoul",
      goal_publish_time: "18:00",
      checkin_thread_open_time: "04:00",
      checkin_thread_close_time: "04:00",
      leaderboard_publish_time: "00:00",
    });
    settings = await getGuildSettings(db, guildId);
  }
  if (!settings) throw new Error("ensureV2GuildSetup: guild_settings 생성 실패");

  const createdChannels: string[] = [];
  const updates: Partial<Omit<GuildSettingsRow, "guild_id" | "created_at" | "updated_at">> = {};

  if (!settings.study_home_channel_id) {
    const ch = await createGuildChannel(guildId, botToken, {
      name: "스터디-홈",
      type: CHANNEL_TYPES.GUILD_TEXT,
      topic: "LoopTop 스터디 메인 홈",
    });
    updates.study_home_channel_id = ch.id;
    createdChannels.push("#" + ch.name);
  }

  if (!settings.goal_forum_channel_id) {
    const ch = await createGuildChannel(guildId, botToken, {
      name: "목표",
      type: CHANNEL_TYPES.GUILD_FORUM,
    });
    updates.goal_forum_channel_id = ch.id;
    updates.plan_reminder_channel_id = ch.id;
    createdChannels.push("#" + ch.name);
  }

  if (!settings.checkin_channel_id) {
    const ch = await createGuildChannel(guildId, botToken, {
      name: "인증",
      type: CHANNEL_TYPES.GUILD_TEXT,
      topic: "매일 생성되는 인증 쓰레드",
    });
    updates.checkin_channel_id = ch.id;
    createdChannels.push("#" + ch.name);
  }

  if (!settings.leaderboard_forum_channel_id) {
    const ch = await createGuildChannel(guildId, botToken, {
      name: "리더보드",
      type: CHANNEL_TYPES.GUILD_FORUM,
    });
    updates.leaderboard_forum_channel_id = ch.id;
    updates.leaderboard_channel_id = ch.id;
    createdChannels.push("#" + ch.name);
  }

  if (Object.keys(updates).length > 0) {
    await upsertGuildSettings(db, guildId, updates);
    const refreshed = await getGuildSettings(db, guildId);
    if (!refreshed) throw new Error("ensureV2GuildSetup: guild_settings 갱신 실패");
    settings = refreshed;
  }

  return { settings, createdChannels };
}
