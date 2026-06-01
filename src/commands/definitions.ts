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
    name: "관리자",
    description: "관리자 전용 기능입니다.",
    default_member_permissions: "32",
    options: [
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
      {
        type: 2,
        name: "설정",
        description: "서버 설정을 변경합니다.",
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
                ],
              },
              { type: 7, name: "채널", description: "매핑할 채널", required: true },
            ],
          },
          {
            type: 1,
            name: "시간",
            description: "스케줄 시간을 설정합니다.",
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
              { type: 3, name: "시간", description: "HH:MM 형식", required: true },
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
        ],
      },
    ],
  },
] as const;

export const COMMANDS = {
  HOME: "홈",
  CHECKIN: "인증",
  ADMIN: "관리자",
} as const;

export const MODAL_IDS = {
  CHECKIN: "modal_checkin_simple",
} as const;

export const MODAL_FIELDS = {
  CHECKIN: {
    CONTENT: "checkin_content",
    PROOF_URL: "checkin_proof_url",
    PROOF_IMAGE: "checkin_proof_image",
  },
} as const;

export const BUTTON_IDS = {
  CHECKIN: "checkin:submit",
} as const;
