import { getDailyCheckinEntriesForUserAndCycle, insertDailyCheckinEntry, insertDailyCheckinEntryItems } from "../db/daily-checkin-entries.repository.js";
import { getUserDailyGoalItems } from "../db/user-daily-goals.repository.js";
import { upsertUser } from "../db/users.repository.js";
import { createMessage } from "../discord/rest.js";
import { buildCheckinEntryCard } from "../ui/cards/checkin-entry.card.js";
import { MessageFlags } from "../types.js";
import { ensureTodayCheckinCycle } from "./checkin-cycle-v2.service.js";
import { getCurrentGoalBundle } from "./goal-v2.service.js";

export async function getTodayCheckinContext(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  botToken: string
): Promise<{
  cycleId: number;
  threadId: string;
  goalItems: Array<{
    id: number;
    label: string;
    proofType: string;
  }>;
} | null> {
  const bundle = await getCurrentGoalBundle(db, guildId, discordUserId);
  if (!bundle.goal) return null;
  const cycle = await ensureTodayCheckinCycle(db, guildId, botToken);
  const items = await getUserDailyGoalItems(db, bundle.goal.id);
  return {
    cycleId: cycle.id,
    threadId: cycle.thread_id,
    goalItems: items.map((item) => ({
      id: item.id,
      label: item.label,
      proofType: item.proof_type,
    })),
  };
}

export async function submitTodayCheckinV2(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  displayName: string,
  botToken: string,
  itemsInput: Array<{
    goalItemId: number;
    checked?: boolean | null;
    textValue?: string | null;
    urlValue?: string | null;
    attachmentUrl?: string | null;
  }>
): Promise<{ success: boolean; message: string }> {
  const bundle = await getCurrentGoalBundle(db, guildId, discordUserId);
  if (!bundle.goal) {
    return { success: false, message: "이번 주 목표가 없습니다. 먼저 목표를 작성해 주세요." };
  }

  const cycle = await ensureTodayCheckinCycle(db, guildId, botToken);
  const goalItems = await getUserDailyGoalItems(db, bundle.goal.id);
  const goalItemMap = new Map(goalItems.map((item) => [item.id, item]));
  const payloadItems = itemsInput
    .map((item) => ({
      goalItem: goalItemMap.get(item.goalItemId),
      checked: item.checked ?? null,
      textValue: item.textValue?.trim() ?? null,
      urlValue: item.urlValue?.trim() ?? null,
      attachmentUrl: item.attachmentUrl?.trim() ?? null,
    }))
    .filter((item) => item.goalItem)
    .filter((item) => item.checked === true || item.textValue || item.urlValue || item.attachmentUrl) as Array<{
      goalItem: NonNullable<ReturnType<Map<number, typeof goalItems[number]>["get"]>>;
      checked: boolean | null;
      textValue: string | null;
      urlValue: string | null;
      attachmentUrl: string | null;
    }>;

  if (payloadItems.length === 0) {
    return { success: false, message: "오늘 수행한 항목을 최소 1개 이상 제출해 주세요." };
  }

  await upsertUser(db, guildId, discordUserId, displayName);
  const entry = await insertDailyCheckinEntry(db, {
    guildId,
    discordUserId,
    dailyCheckinCycleId: cycle.id,
    submittedAt: new Date().toISOString(),
    status: "valid",
  });

  await insertDailyCheckinEntryItems(
    db,
    entry.id,
    payloadItems.map((item) => ({
      goalItemId: item.goalItem.id,
      checked: item.checked,
      textValue: item.textValue,
      urlValue: item.urlValue,
      attachmentUrl: item.attachmentUrl,
    }))
  );

  const card = buildCheckinEntryCard({
    memberDisplay: displayName,
    submittedAtLabel: new Date().toLocaleString("ko-KR"),
    items: payloadItems.map((item) => ({
      label: item.goalItem.label,
      statusLabel: "완료",
      detail: item.attachmentUrl ?? item.urlValue ?? item.textValue ?? (item.checked ? "체크 완료" : null),
    })),
  });
  const message = await createMessage(cycle.thread_id, botToken, {
    flags: MessageFlags.IS_COMPONENTS_V2,
    components: card.components,
  });

  await import("../db/daily-checkin-entries.repository.js")
    .then((m) => m.updateDailyCheckinEntryMessageId(db, entry.id, message.id));

  return { success: true, message: "오늘 인증을 저장했고 공개 인증 카드도 생성했습니다." };
}

export async function getTodayCheckinCount(
  db: D1Database,
  guildId: string,
  discordUserId: string,
  botToken: string
): Promise<number> {
  const context = await getTodayCheckinContext(db, guildId, discordUserId, botToken);
  if (!context) return 0;
  const entries = await getDailyCheckinEntriesForUserAndCycle(db, guildId, discordUserId, context.cycleId);
  return entries.length;
}
