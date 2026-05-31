export const COMMAND_DEFINITIONS = [
  {
    name: "홈",
    description: "스터디 홈 카드와 V2 채널 구조를 확인합니다.",
  },
  {
    name: "설정",
    description: "(관리자) V2 서버 설정을 확인하거나 변경합니다.",
    default_member_permissions: "32",
    options: [
      {
        type: 1,
        name: "보기",
        description: "현재 V2 서버 설정을 확인합니다.",
      },
      {
        type: 1,
        name: "채널",
        description: "기존 채널을 V2 운영 채널로 매핑합니다.",
        options: [
          {
            type: 3,
            name: "종류",
            description: "매핑할 채널 종류",
            required: true,
            choices: [
              { name: "스터디 홈", value: "스터디홈" },
              { name: "목표 포럼", value: "목표포럼" },
              { name: "인증 채널", value: "인증채널" },
              { name: "리더보드 포럼", value: "리더보드포럼" },
            ],
          },
          {
            type: 7,
            name: "채널",
            description: "매핑할 기존 채널",
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: "시간",
        description: "V2 스케줄 시간을 설정합니다.",
        options: [
          {
            type: 3,
            name: "종류",
            description: "설정할 시간 종류",
            required: true,
            choices: [
              { name: "목표 생성", value: "목표생성" },
              { name: "인증 시작", value: "인증시작" },
              { name: "인증 마감", value: "인증마감" },
              { name: "리더보드 생성", value: "리더보드생성" },
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
  HOME: "홈",
  SETTINGS: "설정",
} as const;

export const BUTTON_IDS = {
  GOAL_WRITE: "btn_goal_write_v2",
  CHECKIN_TODAY: "btn_checkin_today_v2",
  LEADERBOARD_VIEW: "btn_leaderboard_view_v2",
} as const;

export const MODAL_IDS = {
  GOAL_WRITE: "modal_goal_write_v2",
  CHECKIN_TODAY: "modal_checkin_today_v2",
} as const;

export const MODAL_FIELDS = {
  GOAL: {
    GOAL_1: "goal_1",
    GOAL_2: "goal_2",
    GOAL_3: "goal_3",
    REST_DAYS: "rest_days",
  },
  CHECKIN: {
    ITEM_1: "item_1",
    ITEM_2: "item_2",
    ITEM_3: "item_3",
  },
} as const;
