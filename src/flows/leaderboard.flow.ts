import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getUser } from "../db/users.repository.js";
import { getWeeklyCheckinCounts } from "../db/daily-checkin-entries.repository.js";
import { getOperationalWeekStartDate, getWeekEndDate, formatWeekLabel } from "../domain/date.js";
import { MessageFlags } from "../types.js";

const DEFAULT_TIMEZONE = "Asia/Seoul";

interface ParticipantStat {
  discordUserId: string;
  displayName: string;
  checkins: number;
  targetDays: number;
  rate: number; // 0~100
}

/** 이번 주 경과 일수 (weekStart 기준, 최대 7) */
function elapsedDays(weekStartDate: string, timezone: string): number {
  const now = new Date();
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const start = new Date(weekStartDate + "T00:00:00");
  const diff = Math.floor((localNow.getTime() - start.getTime()) / 86400000);
  return Math.min(Math.max(diff + 1, 1), 7);
}

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank + ".";
}

function rateLabel(s: ParticipantStat): string {
  return s.checkins + "/" + s.targetDays + "일 (" + s.rate + "%)";
}

export async function buildLeaderboardComponents(
  db: D1Database,
  guildId: string
): Promise<{ flags: number; components: unknown[] }> {
  const settings = await getGuildSettings(db, guildId);
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const weekStart = getOperationalWeekStartDate(
    new Date(),
    timezone,
    settings?.week_start_day ?? 1,
    settings?.week_start_time ?? "00:00"
  );
  const weekEnd = getWeekEndDate(weekStart);
  const weekLabel = formatWeekLabel(weekStart);
  const elapsed = elapsedDays(weekStart, timezone);

  // 이번 주 목표 제출자 목록 (참여자)
  const goalRows = await db
    .prepare(`
      SELECT DISTINCT udg.discord_user_id
      FROM user_daily_goals udg
      JOIN weekly_goal_cycles wgc ON wgc.id = udg.weekly_goal_cycle_id
      WHERE udg.guild_id = ? AND wgc.week_start_date = ? AND udg.status = 'active'
    `)
    .bind(guildId, weekStart)
    .all<{ discord_user_id: string }>();

  const participantIds = new Set(goalRows.results.map((r) => r.discord_user_id));

  // 인증 횟수 집계 (전체 — 참여자만 필터링)
  const allCounts = await getWeeklyCheckinCounts(db, guildId, weekStart, weekEnd);
  const countMap = new Map(allCounts.map((r) => [r.discord_user_id, r.count]));

  // 참여자별 통계
  const stats: ParticipantStat[] = await Promise.all(
    [...participantIds].map(async (uid) => {
      const user = await getUser(db, guildId, uid);
      const name = user?.display_name_snapshot ?? uid;
      const checkins = countMap.get(uid) ?? 0;
      const rate = Math.round((checkins / elapsed) * 100);
      return {
        discordUserId: uid,
        displayName: name,
        checkins,
        targetDays: elapsed,
        rate: Math.min(rate, 100),
      };
    })
  );

  // 달성률 내림차순 정렬
  stats.sort((a, b) => b.rate - a.rate || b.checkins - a.checkins);

  const top3 = stats.slice(0, 3);
  const top3Text = top3.length > 0
    ? top3.map((s, i) => medal(i + 1) + " **" + s.displayName + "** — " + rateLabel(s)).join("\n")
    : "아직 참여자가 없습니다.";

  const allText = stats.length > 0
    ? stats.map((s, i) => (i + 1) + ". **" + s.displayName + "** — " + rateLabel(s)).join("\n")
    : "아직 참여자가 없습니다.";

  const components = [
    {
      type: 17,
      accent_color: 0xF1C40F,
      components: [
        { type: 10, content: "## 🏆 " + weekLabel + " 리더보드\n" + weekStart + " ~ " + weekEnd + " · 참여자 **" + stats.length + "명**" },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: "**TOP 3 달성률**\n" + top3Text },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: "**전체 달성률**\n" + allText },
      ],
    },
  ];

  return { flags: MessageFlags.IS_COMPONENTS_V2, components };
}

// 레거시 호환 (leaderboard-v2.service.ts에서 사용)
export async function buildPublicLeaderboard(
  db: D1Database,
  guildId: string
): Promise<{ flags: number; components: unknown[] }> {
  return buildLeaderboardComponents(db, guildId);
}
