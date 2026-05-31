// Cloudflare Worker 환경변수 타입 정의
export interface Env {
  DB: D1Database;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_BOT_TOKEN: string;
}

// Discord Interaction 타입 상수
export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  MODAL: 9,
} as const;

export const MessageFlags = {
  EPHEMERAL: 64,
  IS_COMPONENTS_V2: 32768,
} as const;

// Discord Interaction 페이로드 타입
export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: {
    id?: string;
    name?: string;
    custom_id?: string;
    components?: DiscordModalComponent[];
    values?: string[];
  };
  guild_id?: string;
  channel_id?: string;
  member?: {
    user: DiscordUser;
    permissions: string;
  };
  user?: DiscordUser;
  token: string;
  message?: {
    id: string;
    channel_id: string;
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  discriminator: string;
}

export interface DiscordModalComponent {
  type: number;
  components?: DiscordModalActionRowChild[];
}

export interface DiscordModalActionRowChild {
  type: number;
  custom_id: string;
  value: string;
}

// 내부 헬퍼 타입
export interface InteractionResponse {
  type: number;
  data?: {
    content?: string;
    flags?: number;
    components?: unknown[];
    embeds?: unknown[];
    custom_id?: string;
    title?: string;
  };
}
