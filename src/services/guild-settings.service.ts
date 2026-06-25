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
  | "checkin_thread_close_time"
  | "leaderboard_publish_day"
  | "goal_publish_day"
  | "checkin_thread_open_day"
  | "checkin_thread_close_day"
  | "week_number_start";

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
    leaderboard_publish_day: "리더보드 게시 요일",
    goal_publish_day: "목표 생성 요일",
    checkin_thread_open_day: "인증 시작 요일",
    checkin_thread_close_day: "인증 마감 요일",
    week_number_start: "주차 시작 번호",
  };

  const formattedValue =
    field.endsWith("_channel_id") && value ? "<#" + value + ">" : "`" + value + "`";

  return {
    success: true,
    message: "✅ " + fieldLabel[field] + "이(가) " + formattedValue + "(으)로 설정되었습니다.",
  };
}

const DAY_KO = ["일","월","화","수","목","금","토"];
const dayStr = (d: number | null) => d != null ? " · " + DAY_KO[d] + "요일" : "";

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
    "리더보드 채널: " + ch(settings.leaderboard_channel_id),
    "",
    "**스케줄 (서버 타임존 기준)**",
    "일간갱신 (인증): " + t(settings.checkin_thread_open_time),
    "주간갱신 (목표·리더보드): " + DAY_KO[settings.goal_publish_day ?? settings.week_start_day ?? 1] + "요일 " + t(settings.goal_publish_time),
    "알림: " + t(settings.checkin_reminder_time ?? "23:59"),
  ].join("\n");
}
