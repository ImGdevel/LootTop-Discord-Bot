import { getGuildSettings, upsertGuildSettings } from "../db/guild-settings.repository.js";
import { channelExists, createGuildChannel, createWebhook } from "../discord/rest.js";
import type { GuildSettingsRow } from "../db/types.js";

const CHANNEL_TYPES = {
  GUILD_TEXT: 0,
  GUILD_FORUM: 15,
} as const;

export interface V2GuildSetupResult {
  settings: GuildSettingsRow;
  createdChannels: string[];
}

async function resolveChannelId(
  id: string | null | undefined,
  botToken: string
): Promise<string | null> {
  if (!id) return null;
  return (await channelExists(id, botToken)) ? id : null;
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

  // 삭제된 채널 감지 → DB null 처리
  const [homeId, goalId, checkinId, leaderboardId, notificationId, vacationId] = await Promise.all([
    resolveChannelId(settings.study_home_channel_id, botToken),
    resolveChannelId(settings.goal_forum_channel_id, botToken),
    resolveChannelId(settings.checkin_channel_id, botToken),
    resolveChannelId(settings.leaderboard_forum_channel_id, botToken),
    resolveChannelId(settings.notification_channel_id, botToken),
    resolveChannelId(settings.vacation_channel_id, botToken),
  ]);

  const nullUpdates: Partial<Omit<GuildSettingsRow, "guild_id" | "created_at" | "updated_at">> = {};
  if (homeId !== settings.study_home_channel_id) nullUpdates.study_home_channel_id = null as any;
  if (goalId !== settings.goal_forum_channel_id) nullUpdates.goal_forum_channel_id = null as any;
  if (checkinId !== settings.checkin_channel_id) {
    nullUpdates.checkin_channel_id = null as any;
    // 채널이 사라지면 webhook도 무효
    nullUpdates.checkin_webhook_id = null as any;
    nullUpdates.checkin_webhook_token = null as any;
  }
  if (leaderboardId !== settings.leaderboard_forum_channel_id) nullUpdates.leaderboard_forum_channel_id = null as any;
  if (notificationId !== settings.notification_channel_id) nullUpdates.notification_channel_id = null as any;
  if (vacationId !== settings.vacation_channel_id) {
    nullUpdates.vacation_channel_id = null as any;
    nullUpdates.vacation_webhook_id = null as any;
    nullUpdates.vacation_webhook_token = null as any;
  }

  if (Object.keys(nullUpdates).length > 0) {
    await upsertGuildSettings(db, guildId, nullUpdates);
    settings = (await getGuildSettings(db, guildId))!;
  }

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

    // 인증 채널에 webhook 생성 (text channel이므로 webhook 지원)
    try {
      const wh = await createWebhook(ch.id, botToken, "인증 카드");
      updates.checkin_webhook_id = wh.id;
      updates.checkin_webhook_token = wh.token;
    } catch (err) {
      console.error("[guild-setup] 인증 webhook 생성 실패:", err);
    }
  } else if (!settings.checkin_webhook_id || !settings.checkin_webhook_token) {
    // 채널은 있지만 webhook이 없는 경우 backfill
    try {
      const wh = await createWebhook(settings.checkin_channel_id, botToken, "인증 카드");
      updates.checkin_webhook_id = wh.id;
      updates.checkin_webhook_token = wh.token;
    } catch (err) {
      console.error("[guild-setup] 인증 webhook backfill 실패:", err);
    }
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

  if (!settings.notification_channel_id) {
    const ch = await createGuildChannel(guildId, botToken, {
      name: "알림",
      type: CHANNEL_TYPES.GUILD_TEXT,
      topic: "인증 리마인드 알림",
    });
    updates.notification_channel_id = ch.id;
    createdChannels.push("#" + ch.name);
  }

  if (!settings.vacation_channel_id) {
    const ch = await createGuildChannel(guildId, botToken, {
      name: "휴가",
      type: CHANNEL_TYPES.GUILD_TEXT,
      topic: "휴가 신청",
    });
    updates.vacation_channel_id = ch.id;
    createdChannels.push("#" + ch.name);

    try {
      const wh = await createWebhook(ch.id, botToken, "휴가 카드");
      updates.vacation_webhook_id = wh.id;
      updates.vacation_webhook_token = wh.token;
    } catch (err) {
      console.error("[guild-setup] 휴가 webhook 생성 실패:", err);
    }
  } else if (!settings.vacation_webhook_id || !settings.vacation_webhook_token) {
    try {
      const wh = await createWebhook(settings.vacation_channel_id, botToken, "휴가 카드");
      updates.vacation_webhook_id = wh.id;
      updates.vacation_webhook_token = wh.token;
    } catch (err) {
      console.error("[guild-setup] 휴가 webhook backfill 실패:", err);
    }
  }

  if (Object.keys(updates).length > 0) {
    await upsertGuildSettings(db, guildId, updates);
    const refreshed = await getGuildSettings(db, guildId);
    if (!refreshed) throw new Error("ensureV2GuildSetup: guild_settings 갱신 실패");
    settings = refreshed;
  }

  return { settings, createdChannels };
}
