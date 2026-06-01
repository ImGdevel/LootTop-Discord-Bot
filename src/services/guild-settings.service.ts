import {
  getGuildSettings,
  upsertGuildSettings,
} from "../db/guild-settings.repository.js";
import type { GuildSettingsRow } from "../db/types.js";

export type SettingsField =
  | "plan_reminder_channel_id"
  | "checkin_channel_id"
  | "leaderboard_channel_id"
  | "plan_reminder_time"
  | "checkin_reminder_time"
  | "leaderboard_publish_time"
  | "timezone"
  | "study_home_channel_id"
  | "goal_forum_channel_id"
  | "leaderboard_forum_channel_id"
  | "notification_channel_id"
  | "vacation_channel_id"
  | "goal_publish_time"
  | "checkin_thread_open_time"
  | "checkin_thread_close_time";

export interface SettingsUpdateResult {
  success: boolean;
  message: string;
}

export async function fetchGuildSettings(
  db: D1Database,
  guildId: string
): Promise<GuildSettingsRow | null> {
  return getGuildSettings(db, guildId);
}

export async function updateGuildSetting(
  db: D1Database,
  guildId: string,
  field: SettingsField,
  value: string
): Promise<SettingsUpdateResult> {
  const timeFields: SettingsField[] = [
    "plan_reminder_time",
    "checkin_reminder_time",
    "leaderboard_publish_time",
    "goal_publish_time",
    "checkin_thread_open_time",
    "checkin_thread_close_time",
  ];
  if (timeFields.includes(field)) {
    if (!/^\d{2}:\d{2}$/.test(value)) {
      return { success: false, message: "시간 형식은 HH:MM이어야 합니다. (예: 09:00)" };
    }
    const [h, m] = value.split(":").map(Number);
    if ((h ?? 0) > 23 || (m ?? 0) > 59) {
      return { success: false, message: "올바른 시간 범위를 입력해 주세요." };
    }
  }

  await upsertGuildSettings(db, guildId, { [field]: value });

  const fieldLabel: Record<SettingsField, string> = {
    plan_reminder_channel_id: "계획 리마인더 채널",
    checkin_channel_id: "인증 채널",
    leaderboard_channel_id: "리더보드 채널",
    plan_reminder_time: "계획 리마인더 시간",
    checkin_reminder_time: "인증 리마인더 시간",
    leaderboard_publish_time: "리더보드 게시 시간",
    timezone: "타임존",
    study_home_channel_id: "스터디 홈 채널",
    goal_forum_channel_id: "목표 포럼 채널",
    leaderboard_forum_channel_id: "리더보드 포럼 채널",
    notification_channel_id: "알림 채널",
    vacation_channel_id: "휴가 채널",
    goal_publish_time: "목표 생성 시간",
    checkin_thread_open_time: "인증 시작 시간",
    checkin_thread_close_time: "인증 마감 시간",
  };

  const formattedValue =
    field.endsWith("_channel_id") && value ? "<#" + value + ">" : "`" + value + "`";

  return {
    success: true,
    message: "✅ " + fieldLabel[field] + "이(가) " + formattedValue + "(으)로 설정되었습니다.",
  };
}

export function formatSettings(settings: GuildSettingsRow | null): string {
  if (!settings) {
    return "아직 설정된 값이 없습니다. `/설정` 명령어로 설정해 주세요.";
  }
  const ch = (id: string | null) => (id ? "<#" + id + ">" : "미설정");
  const t = (v: string | null) => v ?? "미설정";

  return [
    "**현재 서버 설정**",
    "타임존: `" + settings.timezone + "`",
    "",
    "**채널**",
    "스터디 홈: " + ch(settings.study_home_channel_id),
    "목표 포럼: " + ch(settings.goal_forum_channel_id),
    "인증: " + ch(settings.checkin_channel_id),
    "리더보드 포럼: " + ch(settings.leaderboard_forum_channel_id),
    "",
    "**스케줄 시간 (서버 타임존 기준)**",
    "목표 생성: " + t(settings.goal_publish_time),
    "인증 시작: " + t(settings.checkin_thread_open_time),
    "인증 마감: " + t(settings.checkin_thread_close_time),
    "리더보드 게시: " + t(settings.leaderboard_publish_time),
  ].join("\n");
}
