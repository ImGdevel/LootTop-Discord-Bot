/**
 * D1 테이블 Row 타입 정의
 * DB에서 꺼낸 raw row를 TypeScript로 표현한다.
 */

export interface GuildSettingsRow {
  guild_id: string;
  timezone: string;
  plan_reminder_channel_id: string | null;
  checkin_channel_id: string | null;
  leaderboard_channel_id: string | null;
  plan_reminder_time: string | null;
  checkin_reminder_time: string | null;
  leaderboard_publish_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  display_name_snapshot: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPlanRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  week_start_date: string;
  week_end_date: string;
  goal_text: string;
  target_count: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface DailyCheckinRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  weekly_plan_id: number;
  checkin_date: string;
  content: string;
  proof_url: string | null;
  created_at: string;
}
