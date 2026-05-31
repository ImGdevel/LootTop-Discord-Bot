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
    default_member_permissions: "32",
    options: [
      {
        type: 1,
        name: "보기",
        description: "현재 서버 설정을 확인합니다.",
      },
      {
        type: 1,
        name: "채널",
        description: "리마인더 또는 리더보드 채널을 설정합니다.",
        options: [
          {
            type: 3,
            name: "종류",
            description: "설정할 채널 종류",
            required: true,
            choices: [
              { name: "계획 리마인더", value: "계획리마인더" },
              { name: "인증 리마인더", value: "인증리마인더" },
              { name: "리더보드", value: "리더보드" },
            ],
          },
          {
            type: 7,
            name: "채널",
            description: "설정할 채널",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "시간",
        description: "리마인더 또는 리더보드 게시 시간을 설정합니다.",
        options: [
          {
            type: 3,
            name: "종류",
            description: "설정할 시간 종류",
            required: true,
            choices: [
              { name: "계획 리마인더", value: "계획리마인더" },
              { name: "인증 리마인더", value: "인증리마인더" },
              { name: "리더보드 게시", value: "리더보드" },
            ],
          },
          {
            type: 3,
            name: "시간",
            description: "설정할 시간 (HH:MM 형식, 예: 09:00)",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "타임존",
        description: "서버 기준 타임존을 설정합니다.",
        options: [
          {
            type: 3,
            name: "값",
            description: "타임존 (예: Asia/Seoul, UTC)",
            required: true,
          },
        ],
      },
    ],
  },
] as const;

export const COMMANDS = {
  WEEKLY_PLAN: "주간계획",
  CHECKIN: "인증",
  LEADERBOARD: "리더보드",
  MY_PLAN: "내계획",
  MY_CHECKIN_STATUS: "내인증현황",
  SETTINGS: "설정",
} as const;

export const BUTTON_IDS = {
  PLAN_WRITE: "btn_plan_write",
  CHECKIN_TODAY: "btn_checkin_today",
  LEADERBOARD_VIEW: "btn_leaderboard_view",
} as const;

export const MODAL_IDS = {
  PLAN_WRITE: "modal_plan_write",
  CHECKIN_TODAY: "modal_checkin_today",
} as const;

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
