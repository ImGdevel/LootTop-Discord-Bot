const DAY_CHOICES = [
  { name: "월요일", value: "1" },
  { name: "화요일", value: "2" },
  { name: "수요일", value: "3" },
  { name: "목요일", value: "4" },
  { name: "금요일", value: "5" },
  { name: "토요일", value: "6" },
  { name: "일요일", value: "0" },
] as const;

export const COMMAND_DEFINITIONS = [
  {
    name: "홈",
    description: "스터디 홈 카드를 확인합니다.",
  },
  {
    name: "인증",
    description: "오늘 인증을 제출합니다.",
  },
  {
    name: "휴가",
    description: "휴가를 신청합니다.",
  },
  {
    name: "목표",
    description: "이번 주 목표를 작성합니다.",
  },
  {
    name: "리더보드",
    description: "이번 주 달성률 리더보드를 확인합니다.",
  },
  {
    name: "서버정보",
    description: "현재 배포 버전과 상태를 확인합니다.",
  },
  {
    name: "설정",
    description: "서버 설정을 변경합니다.",
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
        description: "채널을 매핑합니다.",
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
              { name: "알림 채널", value: "알림채널" },
              { name: "휴가 채널", value: "휴가채널" },
            ],
          },
          { type: 7, name: "채널", description: "매핑할 채널", required: true },
        ],
      },
      {
        type: 2,
        name: "시간",
        description: "스케줄 시간을 설정합니다.",
        options: [
          {
            type: 1,
            name: "일간갱신",
            description: "매일 인증 시작·마감 시간을 설정합니다.",
            options: [
              { type: 4, name: "시", description: "시 (0~23)", required: true, min_value: 0, max_value: 23 },
              { type: 4, name: "분", description: "분 (0~59)", required: true, min_value: 0, max_value: 59 },
            ],
          },
          {
            type: 1,
            name: "주간갱신",
            description: "매주 목표·리더보드 게시 요일과 시간을 설정합니다.",
            options: [
              { type: 3, name: "요일", description: "게시 요일", required: true, choices: DAY_CHOICES },
              { type: 4, name: "시", description: "시 (0~23)", required: true, min_value: 0, max_value: 23 },
              { type: 4, name: "분", description: "분 (0~59)", required: true, min_value: 0, max_value: 59 },
            ],
          },
          {
            type: 1,
            name: "알림갱신",
            description: "일일 알림 시간을 설정합니다.",
            options: [
              { type: 4, name: "시", description: "시 (0~23)", required: true, min_value: 0, max_value: 23 },
              { type: 4, name: "분", description: "분 (0~59)", required: true, min_value: 0, max_value: 59 },
            ],
          },
        ],
      },
      {
        type: 1,
        name: "타임존",
        description: "타임존을 설정합니다.",
        options: [
          { type: 3, name: "값", description: "예: Asia/Seoul", required: true },
        ],
      },
      {
        type: 1,
        name: "주차",
        description: "이번 주를 몇 주차로 표시할지 설정합니다.",
        options: [
          { type: 4, name: "번호", description: "현재 주차 번호 (예: 5)", required: true, min_value: 1 },
        ],
      },
      {
        type: 1,
        name: "갱신",
        description: "오늘 인증 스레드 등 미생성 항목을 즉시 생성합니다.",
      },
      {
        type: 1,
        name: "초기화",
        description: "채널이 없으면 생성하고 시스템 전체를 초기 세팅합니다.",
      },
      {
        type: 1,
        name: "검증",
        description: "현재 서버 설정 및 채널 상태를 확인합니다.",
      },
    ],
  },
] as const;

export const COMMANDS = {
  HOME: "홈",
  CHECKIN: "인증",
  LEADERBOARD: "리더보드",
  VERSION: "서버정보",
  VACATION: "휴가",
  GOAL: "목표",
  SETTINGS: "설정",
} as const;

export const MODAL_IDS = {
  CHECKIN: "modal_checkin_simple",
  CHECKIN_EDIT: "modal_checkin_edit",
  VACATION: "modal_vacation",
  GOAL: "modal_goal_simple",
} as const;

export const MODAL_FIELDS = {
  CHECKIN: {
    CONTENT: "checkin_content",
    PROOF_URL: "checkin_proof_url",
    PROOF_IMAGE: "checkin_proof_image",
    ACHIEVEMENT_RATE: "checkin_achievement_rate",
  },
} as const;

export const BUTTON_IDS = {
  CHECKIN: "checkin:submit",
} as const;
