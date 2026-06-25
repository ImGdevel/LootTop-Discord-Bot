import { deferredEphemeralResponse, sendFollowup } from "../discord/response.js";
import { ensureTodayCheckinCycle } from "../services/checkin-cycle-v2.service.js";
import { ensureCurrentWeeklyGoalCycle } from "../services/goal-cycle-v2.service.js";
import { ensureWeeklyLeaderboardCycle } from "../services/leaderboard-cycle-v2.service.js";
import { ensureCurrentVacationCycle } from "../services/vacation-cycle.service.js";
import type { DiscordInteraction, Env } from "../types.js";

// /설정 갱신에서 직접 호출 가능한 핵심 로직
export async function handleRefreshAsync(
  guildId: string,
  env: Env,
  appId: string,
  token: string
): Promise<void> {
  const results: string[] = [];

  try {
    const cycle = await ensureTodayCheckinCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    results.push("✅ 인증 스레드: <#" + cycle.thread_id + ">");
  } catch (err) {
    results.push("⚠️ 인증 스레드: " + String(err));
  }

  try {
    const goal = await ensureCurrentWeeklyGoalCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    results.push("✅ 목표 포럼: <#" + goal.forum_thread_id + ">");
  } catch (err) {
    results.push("⚠️ 목표 포럼: " + String(err));
  }

  try {
    const lb = await ensureWeeklyLeaderboardCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    results.push("✅ 리더보드: <#" + lb.forum_thread_id + ">");
  } catch (err) {
    results.push("⚠️ 리더보드: " + String(err));
  }

  try {
    const vc = await ensureCurrentVacationCycle(env.DB, guildId, env.DISCORD_BOT_TOKEN);
    results.push("✅ 휴가 스레드: <#" + vc.thread_id + ">");
  } catch (err) {
    results.push("⚠️ 휴가 스레드: " + String(err));
  }

  await sendFollowup(appId, token,
    "**갱신 결과**\n" + results.join("\n"),
    { ephemeral: true }
  );
}
