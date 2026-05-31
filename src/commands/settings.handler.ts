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

function hasManageGuild(interaction: DiscordInteraction): boolean {
  const perms = interaction.member?.permissions;
  if (!perms) return false;
  try {
    return (BigInt(perms) & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

export function handleSettings(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  if (!hasManageGuild(interaction)) {
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

  ctx.waitUntil(processSettings(interaction, env));
  return deferredEphemeralResponse();
}

async function processSettings(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id!;
  const appId = env.DISCORD_APPLICATION_ID;
  const token = interaction.token;
  const options = (interaction.data as any)?.options as any[] | undefined;
  const subcommand = options?.[0]?.name as string | undefined;

  try {
    if (!subcommand || subcommand === "보기") {
      const settings = await fetchGuildSettings(env.DB, guildId);
      await sendFollowup(appId, token, formatSettings(settings), { ephemeral: true });
      return;
    }

    if (subcommand === "채널") {
      const subOptions = options?.[0]?.options as any[] | undefined;
      const type = subOptions?.find((o: any) => o.name === "종류")?.value as string;
      const channelId = subOptions?.find((o: any) => o.name === "채널")?.value as string;
      const fieldMap: Record<string, SettingsField> = {
        "계획리마인더": "plan_reminder_channel_id",
        "인증리마인더": "checkin_channel_id",
        "리더보드": "leaderboard_channel_id",
      };
      const field = fieldMap[type];
      if (!field) {
        await sendFollowup(appId, token, "올바른 채널 종류를 선택해 주세요.", { ephemeral: true });
        return;
      }
      const result = await updateGuildSetting(env.DB, guildId, field, channelId);
      await sendFollowup(appId, token, result.message, { ephemeral: true });
      return;
    }

    if (subcommand === "시간") {
      const subOptions = options?.[0]?.options as any[] | undefined;
      const type = subOptions?.find((o: any) => o.name === "종류")?.value as string;
      const time = subOptions?.find((o: any) => o.name === "시간")?.value as string;
      const fieldMap: Record<string, SettingsField> = {
        "계획리마인더": "plan_reminder_time",
        "인증리마인더": "checkin_reminder_time",
        "리더보드": "leaderboard_publish_time",
      };
      const field = fieldMap[type];
      if (!field) {
        await sendFollowup(appId, token, "올바른 종류를 선택해 주세요.", { ephemeral: true });
        return;
      }
      const result = await updateGuildSetting(env.DB, guildId, field, time);
      await sendFollowup(appId, token, result.message, { ephemeral: true });
      return;
    }

    if (subcommand === "타임존") {
      const subOptions = options?.[0]?.options as any[] | undefined;
      const tz = subOptions?.find((o: any) => o.name === "값")?.value as string;
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
      } catch {
        await sendFollowup(appId, token, "`" + tz + "`은 올바른 타임존이 아닙니다.\n예: `Asia/Seoul`, `UTC`", { ephemeral: true });
        return;
      }
      const result = await updateGuildSetting(env.DB, guildId, "timezone", tz);
      await sendFollowup(appId, token, result.message, { ephemeral: true });
      return;
    }

    await sendFollowup(appId, token, "알 수 없는 설정 명령입니다.", { ephemeral: true });
  } catch (err) {
    console.error("[settings] error:", err);
    await sendFollowup(appId, token, "설정 처리 중 오류가 발생했습니다.", { ephemeral: true });
  }
}
