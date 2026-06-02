import { deferredEphemeralResponse, rawModalResponse, sendFollowup } from "../discord/response.js";
import { submitVacation } from "../services/vacation.service.js";
import { upsertUser } from "../db/users.repository.js";
import type { DiscordInteraction, Env } from "../types.js";

export const VACATION_MODAL_ID = "modal_vacation";
export const VACATION_BUTTON_ID = "vacation:submit";

const VACATION_FIELDS = {
  DATES: "vacation_dates",
  REASON: "vacation_reason",
};

function buildVacationModal(): Response {
  const options = buildDateOptions(14);
  return rawModalResponse(VACATION_MODAL_ID, "휴가 신청", [
    {
      type: 18,
      label: "휴가 날짜 (내일 이후, 최대 7일)",
      component: {
        type: 3,
        custom_id: VACATION_FIELDS.DATES,
        placeholder: "날짜를 선택하세요",
        min_values: 1,
        max_values: 7,
        options,
        required: true,
      },
    },
    {
      type: 18,
      label: "사유 (선택)",
      component: {
        type: 4,
        custom_id: VACATION_FIELDS.REASON,
        style: 1,
        placeholder: "여행, 개인 사정 등",
        required: false,
      },
    },
  ]);
}

function buildDateOptions(days: number): Array<{ label: string; value: string }> {
  const options = [];
  const now = new Date();
  for (let i = 1; i <= days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label = value + " (" + ["일", "월", "화", "수", "목", "금", "토"][d.getDay()] + ")";
    options.push({ label, value });
  }
  return options;
}

// /휴가 슬래시 커맨드
export function handleVacationCommand(_interaction: DiscordInteraction): Response {
  return buildVacationModal();
}

// 스레드 내 "휴가 신청" 버튼
export function handleVacationButton(_interaction: DiscordInteraction): Response {
  return buildVacationModal();
}

// 모달 제출
export function handleVacationModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleVacationModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleVacationModalAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const rows = interaction.data?.components ?? [];

  const getValues = (id: string): string[] => {
    for (const row of rows) {
      if (row.type === 18 && row.component?.custom_id === id)
        return row.component.values ?? [];
    }
    return [];
  };
  const getText = (id: string): string => {
    for (const row of rows) {
      if (row.type === 18 && row.component?.custom_id === id)
        return (row.component.value ?? "").trim();
    }
    return "";
  };

  const vacationDates = getValues(VACATION_FIELDS.DATES);
  const reason = getText(VACATION_FIELDS.REASON) || null;
  if (vacationDates.length === 0) return;

  const displayName = user.global_name ?? user.username;
  const avatarUrl = user.avatar
    ? "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png?size=128"
    : "https://cdn.discordapp.com/embed/avatars/" + (Number(user.discriminator) % 5) + ".png";

  await upsertUser(env.DB, guildId, user.id, displayName);

  const { created, skipped } = await submitVacation(env.DB, guildId, env.DISCORD_BOT_TOKEN, {
    discordUserId: user.id,
    displayName,
    avatarUrl,
    vacationDates,
    reason,
  });

  const lines: string[] = [];
  if (created.length > 0) lines.push("✅ 휴가 등록: " + created.join(", "));
  if (skipped.length > 0) lines.push("ℹ️ 이미 등록됨: " + skipped.join(", "));

  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
    lines.join("\n") || "처리된 항목이 없습니다.",
    { ephemeral: true }
  );
}
