export interface GuildSettingsRow {
  guild_id: string;
  timezone: string;
  plan_reminder_channel_id: string | null;
  checkin_channel_id: string | null;
  leaderboard_channel_id: string | null;
  plan_reminder_time: string | null;
  checkin_reminder_time: string | null;
  leaderboard_publish_time: string | null;
  study_home_channel_id: string | null;
  goal_forum_channel_id: string | null;
  leaderboard_forum_channel_id: string | null;
  goal_publish_time: string;
  checkin_thread_open_time: string;
  checkin_thread_close_time: string;
  checkin_webhook_id: string | null;
  checkin_webhook_token: string | null;
  notification_channel_id: string | null;
  vacation_channel_id: string | null;
  vacation_webhook_id: string | null;
  vacation_webhook_token: string | null;
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

export type GoalProofType = "text" | "url" | "image" | "checkbox";

export interface WeeklyGoalCycleRow {
  id: number;
  guild_id: string;
  week_start_date: string;
  week_end_date: string;
  forum_thread_id: string;
  title: string;
  status: "open" | "closed" | "archived";
  published_at: string;
  created_at: string;
}

export interface DailyCheckinCycleRow {
  id: number;
  guild_id: string;
  checkin_date: string;
  thread_id: string;
  title: string;
  opens_at: string;
  closes_at: string;
  status: "open" | "closed" | "archived";
  webhook_id: string | null;
  webhook_token: string | null;
  created_at: string;
}

export interface DailyCheckinEntryRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  daily_checkin_cycle_id: number;
  entry_message_id: string | null;
  content: string | null;
  proof_url: string | null;
  submitted_at: string;
  status: "valid" | "late" | "discarded";
}

export interface WeeklyLeaderboardCycleRow {
  id: number;
  guild_id: string;
  week_start_date: string;
  week_end_date: string;
  forum_thread_id: string;
  title: string;
  published_at: string;
  created_at: string;
}

// Legacy (V1) — 이행 기간 유지
export interface WeeklyPlanRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  week_start_date: string;
  week_end_date: string;
  goal_text: string;
  target_count: number;
  status: "active" | "archived";
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

// V2 goal types (이행 기간 유지)
export interface UserDailyGoalRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  weekly_goal_cycle_id: number;
  goal_message_id: string | null;
  rest_days_json: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface UserDailyGoalItemRow {
  id: number;
  user_daily_goal_id: number;
  sort_order: number;
  label: string;
  proof_type: GoalProofType;
  required: number;
  created_at: string;
}

export interface DailyCheckinEntryItemRow {
  id: number;
  daily_checkin_entry_id: number;
  goal_item_id: number;
  checked: number | null;
  text_value: string | null;
  url_value: string | null;
  attachment_url: string | null;
}

export interface GoalWizardSessionRow {
  id: string;
  guild_id: string;
  discord_user_id: string;
  week_start_date: string;
  goal_labels_json: string;
  proof_types_json: string;
  rest_days_json: string;
  expires_at: string;
  created_at: string;
}

export interface VacationEntryRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  vacation_date: string;  // YYYY-MM-DD
  reason: string | null;
  message_id: string | null;
  created_at: string;
}
