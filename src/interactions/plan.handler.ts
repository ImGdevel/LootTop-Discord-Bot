import { MODAL_FIELDS, MODAL_IDS } from "../commands/definitions.js";
import {
  deferredEphemeralResponse,
  deferredUpdateResponse,
  modalResponse,
  sendFollowup,
  updateFollowup,
} from "../discord/response.js";
import { buildCurrentWeeklyGoalFlow } from "../flows/goal.flow.js";
import {
  appendGoalWizardSessionLabel,
  createGoalWizardSession,
  deleteGoalWizardSession,
  getGoalWizardSession,
  updateGoalWizardSessionProofType,
  updateGoalWizardSessionRestDays,
} from "../db/goal-wizard-sessions.repository.js";
import { saveCurrentUserGoalsV2 } from "../services/goal-v2.service.js";
import { getWeekStartDate, toLocalDateString } from "../domain/date.js";
import { getGuildSettings } from "../db/guild-settings.repository.js";
import { MessageFlags } from "../types.js";
import type { DiscordInteraction, Env } from "../types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

// ─── /홈 → 목표 버튼 클릭 (goal:create / goal:edit) ─────────────────────────

export function handleGoalCommand(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalCommandAsync(interaction, env));
  return deferredEphemeralResponse();
}

export function handleGoalAddItemButton(interaction: DiscordInteraction): Response {
  const customId = interaction.data?.custom_id ?? "";
  const sessionId = customId.split(":")[2] ?? "";

  return modalResponse(MODAL_IDS.GOAL_ADD_ITEM + ":" + sessionId, "목표 항목 추가", [
    {
      label: "추가할 목표",
      customId: MODAL_FIELDS.GOAL.GOAL_ADD,
      style: 1,
      placeholder: "예: 매일 영어 단어 30개",
      required: true,
    },
  ]);
}

async function handleGoalCommandAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const payload = await buildCurrentWeeklyGoalFlow(env.DB, guildId, user.id);
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
    flags: payload.flags,
    components: payload.components,
  });
}

// ─── "내 목표 작성" 버튼 (goal:create / goal:edit) → Step1 Modal ─────────────

export function handleGoalWriteButton(_interaction: DiscordInteraction): Response {
  // Step 1: 목표 라벨 입력 (최대 3개, 1개 필수)
  // 고정 N개가 아닌 이유: Discord 모달 5개 제한으로 동적 추가는 wizard 방식으로 처리
  return modalResponse(MODAL_IDS.GOAL_WRITE, "이번 주 데일리 목표 작성", [
    {
      label: "목표 1",
      customId: MODAL_FIELDS.GOAL.GOAL_1,
      style: 1,
      placeholder: "예: 매일 6시간 공부",
      required: true,
    },
    {
      label: "목표 2 (선택)",
      customId: MODAL_FIELDS.GOAL.GOAL_2,
      style: 1,
      placeholder: "예: 독서 30분",
      required: false,
    },
    {
      label: "목표 3 (선택)",
      customId: MODAL_FIELDS.GOAL.GOAL_3,
      style: 1,
      placeholder: "예: 9시 기상",
      required: false,
    },
  ]);
}

// ─── Step1 모달 제출 → D1 세션 생성 → Step2 메시지 ─────────────────────────

export function handleGoalWriteModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalWriteModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

export function handleGoalAddItemModal(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalAddItemModalAsync(interaction, env));
  return deferredEphemeralResponse();
}

async function handleGoalWriteModalAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const guildId = interaction.guild_id;
  const user = interaction.member?.user ?? interaction.user;
  if (!guildId || !user) return;

  const components = interaction.data?.components ?? [];
  const getValue = (fieldId: string): string => {
    for (const row of components) {
      for (const comp of row.components ?? []) {
        if (comp.custom_id === fieldId) return comp.value;
      }
    }
    return "";
  };

  const goalLabels = [
    getValue(MODAL_FIELDS.GOAL.GOAL_1).trim(),
    getValue(MODAL_FIELDS.GOAL.GOAL_2).trim(),
    getValue(MODAL_FIELDS.GOAL.GOAL_3).trim(),
  ].filter(Boolean);

  if (goalLabels.length === 0) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token,
      "최소 1개의 목표를 입력해 주세요.", { ephemeral: true });
    return;
  }

  const settings = await getGuildSettings(env.DB, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const localDate = toLocalDateString(new Date(), timezone);
  const weekStartDate = getWeekStartDate(localDate);

  const session = await createGoalWizardSession(env.DB, {
    guildId,
    discordUserId: user.id,
    weekStartDate,
    goalLabels,
  });

  // Step 2: 인증 방식 + 휴식일 선택 메시지
  await sendFollowup(
    env.DISCORD_APPLICATION_ID,
    interaction.token,
    undefined,
    {
      ephemeral: true,
      flags: MessageFlags.IS_COMPONENTS_V2,
      components: buildStep2Components(session.id, goalLabels),
    }
  );
}

async function handleGoalAddItemModalAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const customId = interaction.data?.custom_id ?? "";
  const sessionId = customId.split(":")[1] ?? "";
  const session = await getGoalWizardSession(env.DB, sessionId);
  const user = interaction.member?.user ?? interaction.user;
  const guildId = interaction.guild_id;
  if (!session || !user || !guildId) return;
  if (session.guild_id !== guildId || session.discord_user_id !== user.id) return;

  const components = interaction.data?.components ?? [];
  let added = "";
  for (const row of components) {
    for (const comp of row.components ?? []) {
      if (comp.custom_id === MODAL_FIELDS.GOAL.GOAL_ADD) {
        added = comp.value.trim();
      }
    }
  }

  if (!added) {
    await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, "추가할 목표를 입력해 주세요.", {
      ephemeral: true,
    });
    return;
  }

  await appendGoalWizardSessionLabel(env.DB, sessionId, added);
  const refreshed = await getGoalWizardSession(env.DB, sessionId);
  if (!refreshed) return;
  const goalLabels = JSON.parse(refreshed.goal_labels_json) as string[];
  await sendFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
    ephemeral: true,
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: buildStep2Components(
      sessionId,
      goalLabels,
      refreshed.proof_types_json,
      refreshed.rest_days_json
    ),
  });
}

// ─── 인증 방식 Select 상호작용 (goal:proof:{sessionId}:{idx}) ─────────────────

export function handleGoalProofTypeSelect(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalProofTypeSelectAsync(interaction, env));
  return deferredUpdateResponse();
}

async function handleGoalProofTypeSelectAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const customId = interaction.data?.custom_id ?? "";
  const parts = customId.split(":");
  const sessionId = parts[2] ?? "";
  const goalIndex = parseInt(parts[3] ?? "0", 10);
  const proofType = interaction.data?.values?.[0] ?? "text";

  await updateGoalWizardSessionProofType(env.DB, sessionId, goalIndex, proofType);

  const session = await getGoalWizardSession(env.DB, sessionId);
  if (!session || session.guild_id !== interaction.guild_id) return;
  const user = interaction.member?.user ?? interaction.user;
  if (!user || session.discord_user_id !== user.id) return;

  const goalLabels = JSON.parse(session.goal_labels_json) as string[];
  await updateFollowup(
    env.DISCORD_APPLICATION_ID,
    interaction.token,
    undefined,
    { components: buildStep2Components(sessionId, goalLabels, session.proof_types_json, session.rest_days_json) }
  );
}

// ─── 휴식일 Multi-Select (goal:rest:{sessionId}) ─────────────────────────────

export function handleGoalRestDaysSelect(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalRestDaysSelectAsync(interaction, env));
  return deferredUpdateResponse();
}

async function handleGoalRestDaysSelectAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const customId = interaction.data?.custom_id ?? "";
  const sessionId = customId.split(":")[2] ?? "";
  const restDays = interaction.data?.values ?? [];

  await updateGoalWizardSessionRestDays(env.DB, sessionId, restDays);

  const session = await getGoalWizardSession(env.DB, sessionId);
  if (!session || session.guild_id !== interaction.guild_id) return;
  const user = interaction.member?.user ?? interaction.user;
  if (!user || session.discord_user_id !== user.id) return;

  const goalLabels = JSON.parse(session.goal_labels_json) as string[];
  await updateFollowup(
    env.DISCORD_APPLICATION_ID,
    interaction.token,
    undefined,
    { components: buildStep2Components(sessionId, goalLabels, session.proof_types_json, JSON.stringify(restDays)) }
  );
}

// ─── 저장 버튼 (goal:save:{sessionId}) ──────────────────────────────────────

export function handleGoalSaveButton(
  interaction: DiscordInteraction,
  env: Env,
  ctx: ExecutionContext
): Response {
  ctx.waitUntil(handleGoalSaveAsync(interaction, env));
  return deferredUpdateResponse();
}

async function handleGoalSaveAsync(
  interaction: DiscordInteraction,
  env: Env
): Promise<void> {
  const customId = interaction.data?.custom_id ?? "";
  const sessionId = customId.split(":")[2] ?? "";
  const user = interaction.member?.user ?? interaction.user;
  const guildId = interaction.guild_id;
  if (!guildId || !user) return;

  const session = await getGoalWizardSession(env.DB, sessionId);
  if (!session) {
    await updateFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
      components: buildWizardStatusComponents("세션이 만료되었습니다. 처음부터 다시 시도해 주세요."),
    });
    return;
  }
  if (session.guild_id !== guildId || session.discord_user_id !== user.id) {
    await updateFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
      components: buildWizardStatusComponents("이 목표 작성 세션에 접근할 수 없습니다."),
    });
    return;
  }

  const goalLabels = JSON.parse(session.goal_labels_json) as string[];
  const proofTypes = JSON.parse(session.proof_types_json) as Record<string, string>;
  const restDays = JSON.parse(session.rest_days_json) as string[];
  const displayName = user.global_name ?? user.username;

  const result = await saveCurrentUserGoalsV2(
    env.DB,
    guildId,
    user.id,
    displayName,
    env.DISCORD_BOT_TOKEN,
    { goalLabels, proofTypes, restDays }
  );

  await deleteGoalWizardSession(env.DB, sessionId);
  await updateFollowup(env.DISCORD_APPLICATION_ID, interaction.token, undefined, {
    components: buildWizardStatusComponents(result.message),
  });
}

// ─── Step2 UI 빌더 ────────────────────────────────────────────────────────────

const PROOF_TYPE_OPTIONS = [
  { label: "텍스트 입력", value: "text", description: "짧은 설명 또는 메모" },
  { label: "URL 입력", value: "url", description: "링크로 인증" },
  { label: "사진 (URL)", value: "image", description: "이미지 링크 또는 업로드 후 링크" },
  { label: "체크 완료", value: "checkbox", description: "완료 여부만 체크" },
];

const DAY_OPTIONS = [
  { label: "월요일", value: "월" },
  { label: "화요일", value: "화" },
  { label: "수요일", value: "수" },
  { label: "목요일", value: "목" },
  { label: "금요일", value: "금" },
  { label: "토요일", value: "토" },
  { label: "일요일", value: "일" },
];

function buildWizardStatusComponents(markdown: string): unknown[] {
  return [
    {
      type: 10,
      content: markdown,
    },
  ];
}

function buildStep2Components(
  sessionId: string,
  goalLabels: string[],
  proofTypesJson = "{}",
  restDaysJson = '["토","일"]'
): unknown[] {
  const proofTypes = JSON.parse(proofTypesJson) as Record<string, string>;
  const restDays = JSON.parse(restDaysJson) as string[];

  const rows: unknown[] = [];

  // 목표별 인증 방식 Select (최대 3개 → 최대 3 rows)
  for (let i = 0; i < goalLabels.length && i < 3; i++) {
    const selected = proofTypes[String(i)] ?? "text";
    rows.push({
      type: 1,
      components: [{
        type: 3, // String Select
        custom_id: "goal:proof:" + sessionId + ":" + String(i),
        placeholder: goalLabels[i] + " 인증 방식 선택",
        options: PROOF_TYPE_OPTIONS.map((o) => ({
          ...o,
          default: o.value === selected,
        })),
      }],
    });
  }

  // 휴식일 Multi-Select (row 4)
  rows.push({
    type: 1,
    components: [{
      type: 3,
      custom_id: "goal:rest:" + sessionId,
      placeholder: "휴식일 선택 (기본: 토, 일)",
      min_values: 0,
      max_values: 7,
      options: DAY_OPTIONS.map((o) => ({
        ...o,
        default: restDays.includes(o.value),
      })),
    }],
  });

  // 저장 버튼 (row 5)
  rows.push({
    type: 1,
    components: [{
      type: 2,
      style: 1,
      label: "저장하기",
      custom_id: "goal:save:" + sessionId,
    }],
  });

  rows.push({
    type: 1,
    components: [{
      type: 2,
      style: 2,
      label: "목표 항목 추가",
      custom_id: "goal:add:" + sessionId,
    }],
  });

  return rows;
}
