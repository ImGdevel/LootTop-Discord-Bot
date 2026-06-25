import { sendFollowup } from "../discord/response.js";
import {
  fetchGuildSettings,
  formatSettings,
  updateGuildSetting,
  type SettingsField,
} from "../services/guild-settings.service.js";
import { InteractionResponseType, MessageFlags } from "../types.js";
import type { DiscordInteraction } from "../types.js";

const DAY_NAMES: Record<string, string> = {
  "0": "일요일", "1": "월요일", "2": "화요일", "3": "수요일",
  "4": "목요일", "5": "금요일", "6": "토요일",
};

function generateTimeChoices(input: string): Array<{ name: string; value: string }> {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      times.push(`${hh}:${mm}`);
    }
  }
  const filtered = input ? times.filter((t) => t.startsWith(input)) : times;
  return filtered.slice(0, 25).map((t) => ({ name: t, value: t }));
}

export function handleTimeAutocomplete(interaction: DiscordInteraction): Response {
  function findFocusedValue(opts: any[]): string {
    for (const o of opts) {
      if (o.focused && o.name === "시간") return o.value ?? "";
      if (o.options) {
        const found = findFocusedValue(o.options);
        if (found !== null) return found;
      }
    }
    return "";
  }
  const input = findFocusedValue((interaction.data?.options as any[]) ?? []);
  const choices = generateTimeChoices(input);
  return new Response(
    JSON.stringify({ type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT, data: { choices } }),
    { headers: { "Content-Type": "application/json" } }
  );
}

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
 * /설정 커맨드 옵션 배열을 받아 처리한다.
 * options: 설정 루트 커맨드의 options (보기 / 채널 / 시간 / 타임존)
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
      "리더보드채널": "leaderboard_channel_id",
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
    const timeSubOptions = options?.[0]?.options as any[] | undefined;
    const timeSub = timeSubOptions?.[0]?.name as string | undefined;
    const timeParams = timeSubOptions?.[0]?.options as any[] | undefined;

    const h = timeParams?.find((o: any) => o.name === "시")?.value as number | undefined;
    const m = timeParams?.find((o: any) => o.name === "분")?.value as number | undefined;
    const time = h != null && m != null
      ? String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0")
      : undefined;

    if (timeSub === "일간갱신") {
      if (!time) { await sendFollowup(appId, token, "시와 분을 입력해 주세요.", { ephemeral: true }); return; }
      await updateGuildSetting(db, guildId, "checkin_thread_open_time", time);
      await updateGuildSetting(db, guildId, "checkin_thread_close_time", time);
      await sendFollowup(appId, token, "✅ 일간갱신 시간이 `" + time + "`으로 설정되었습니다. (인증 시작·마감 동일 적용)", { ephemeral: true });
      return;
    }

    if (timeSub === "주간갱신") {
      const dayValue = timeParams?.find((o: any) => o.name === "요일")?.value as string;
      if (!dayValue || !time) { await sendFollowup(appId, token, "요일, 시, 분을 모두 입력해 주세요.", { ephemeral: true }); return; }
      const dayName = DAY_NAMES[dayValue] ?? dayValue;
      await updateGuildSetting(db, guildId, "goal_publish_time", time);
      await updateGuildSetting(db, guildId, "leaderboard_publish_time", time);
      await updateGuildSetting(db, guildId, "goal_publish_day", dayValue);
      await updateGuildSetting(db, guildId, "leaderboard_publish_day", dayValue);
      await sendFollowup(appId, token, "✅ 주간갱신이 **매주 " + dayName + " " + time + "**으로 설정되었습니다. (목표·리더보드 동일 적용)", { ephemeral: true });
      return;
    }

    if (timeSub === "알림갱신") {
      if (!time) { await sendFollowup(appId, token, "시와 분을 입력해 주세요.", { ephemeral: true }); return; }
      await updateGuildSetting(db, guildId, "checkin_reminder_time", time);
      await sendFollowup(appId, token, "✅ 알림 시간이 `" + time + "`으로 설정되었습니다.", { ephemeral: true });
      return;
    }

    await sendFollowup(appId, token, "알 수 없는 시간 설정 명령어입니다.", { ephemeral: true });
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
