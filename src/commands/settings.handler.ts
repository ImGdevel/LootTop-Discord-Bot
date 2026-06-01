import { deferredEphemeralResponse, sendFollowup } from "../discord/response.js";
import {
  fetchGuildSettings,
  formatSettings,
  updateGuildSetting,
  type SettingsField,
} from "../services/guild-settings.service.js";
import { InteractionResponseType, MessageFlags } from "../types.js";
import type { DiscordInteraction, Env } from "../types.js";

const MANAGE_GUILD = 0x20n;

export function hasManageGuild(interaction: DiscordInteraction): boolean {
  const perms = interaction.member?.permissions;
  if (!perms) return false;
  try {
    return (BigInt(perms) & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

export function forbiddenResponse(): Response {
  return new Response(
    JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "이 명령어는 서버 관리자만 사용할 수 있습니다.",
        flags: MessageFlags.EPHEMERAL,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

/**
 * /관리자 설정 서브커맨드 옵션 배열을 직접 받아 처리한다.
 * options: 설정 하위 subcommand 배열 (보기 / 채널 / 시간 / 타임존)
 */
export async function processSettingsOptions(
  db: D1Database,
  guildId: string,
  appId: string,
  token: string,
  options: any[] | undefined
): Promise<void> {
  const subcommand = options?.[0]?.name as string | undefined;

  if (!subcommand || subcommand === "보기") {
    const settings = await fetchGuildSettings(db, guildId);
    await sendFollowup(appId, token, formatSettings(settings), { ephemeral: true });
    return;
  }

  if (subcommand === "채널") {
    const subOptions = options?.[0]?.options as any[] | undefined;
    const type = subOptions?.find((o: any) => o.name === "종류")?.value as string;
    const channelId = subOptions?.find((o: any) => o.name === "채널")?.value as string;

    const fieldMap: Record<string, SettingsField> = {
      "스터디홈": "study_home_channel_id",
      "목표포럼": "goal_forum_channel_id",
      "인증채널": "checkin_channel_id",
      "리더보드포럼": "leaderboard_forum_channel_id",
      "알림채널": "notification_channel_id",
      "휴가채널": "vacation_channel_id",
    };
    const field = fieldMap[type];
    if (!field || !channelId) {
      await sendFollowup(appId, token, "올바른 채널 종류와 채널을 선택해 주세요.", { ephemeral: true });
      return;
    }
    const result = await updateGuildSetting(db, guildId, field, channelId);
    await sendFollowup(appId, token, result.message, { ephemeral: true });
    return;
  }

  if (subcommand === "시간") {
    const subOptions = options?.[0]?.options as any[] | undefined;
    const type = subOptions?.find((o: any) => o.name === "종류")?.value as string;
    const time = subOptions?.find((o: any) => o.name === "시간")?.value as string;

    const fieldMap: Record<string, SettingsField> = {
      "목표생성": "goal_publish_time",
      "인증시작": "checkin_thread_open_time",
      "인증마감": "checkin_thread_close_time",
      "리더보드생성": "leaderboard_publish_time",
    };
    const field = fieldMap[type];
    if (!field || !time) {
      await sendFollowup(appId, token, "올바른 종류와 시간을 입력해 주세요.", { ephemeral: true });
      return;
    }
    const result = await updateGuildSetting(db, guildId, field, time);
    await sendFollowup(appId, token, result.message, { ephemeral: true });
    return;
  }

  if (subcommand === "타임존") {
    const subOptions = options?.[0]?.options as any[] | undefined;
    const tz = subOptions?.find((o: any) => o.name === "값")?.value as string;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch {
      await sendFollowup(appId, token, "`" + tz + "`는 올바른 타임존이 아닙니다.\n예: `Asia/Seoul`, `UTC`", { ephemeral: true });
      return;
    }
    const result = await updateGuildSetting(db, guildId, "timezone", tz);
    await sendFollowup(appId, token, result.message, { ephemeral: true });
    return;
  }

  await sendFollowup(appId, token, "알 수 없는 설정 명령어입니다.", { ephemeral: true });
}
