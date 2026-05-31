/**
 * Discord 슬래시 커맨드 정의
 *
 * 이 파일이 단일 진실 소스(source of truth)다.
 * register-commands.ts 스크립트가 이 파일을 import해서 Discord API에 등록한다.
 */

export const COMMAND_DEFINITIONS = [
  {
    name: "주간계획",
    description: "이번 주 계획을 조회하거나 작성합니다.",
  },
  {
    name: "인증",
    description: "오늘의 학습 인증을 제출합니다.",
  },
  {
    name: "리더보드",
    description: "이번 주 달성률 순위표를 확인합니다.",
  },
  {
    name: "내계획",
    description: "나의 이번 주 계획을 확인합니다.",
  },
  {
    name: "내인증현황",
    description: "나의 이번 주 인증 현황을 확인합니다.",
  },
  {
    name: "설정",
    description: "(관리자) 서버 설정을 변경합니다.",
    default_member_permissions: "32", // MANAGE_GUILD 권한
  },
] as const;

// 커맨드 이름 상수 (핸들러 라우팅에 사용)
export const COMMANDS = {
  WEEKLY_PLAN: "주간계획",
  CHECKIN: "인증",
  LEADERBOARD: "리더보드",
  MY_PLAN: "내계획",
  MY_CHECKIN_STATUS: "내인증현황",
  SETTINGS: "설정",
} as const;

// 버튼 custom_id 상수
export const BUTTON_IDS = {
  PLAN_WRITE: "btn_plan_write",
  CHECKIN_TODAY: "btn_checkin_today",
  LEADERBOARD_VIEW: "btn_leaderboard_view",
} as const;

// 모달 custom_id 상수
export const MODAL_IDS = {
  PLAN_WRITE: "modal_plan_write",
  CHECKIN_TODAY: "modal_checkin_today",
} as const;

// 모달 필드 custom_id 상수
export const MODAL_FIELDS = {
  PLAN: {
    GOAL_TEXT: "goal_text",
    TARGET_COUNT: "target_count",
  },
  CHECKIN: {
    CONTENT: "content",
    PROOF_URL: "proof_url",
  },
} as const;
