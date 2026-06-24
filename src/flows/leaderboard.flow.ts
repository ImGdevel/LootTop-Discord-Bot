import { getGuildSettings } from "../db/guild-settings.repository.js";
import { getUser } from "../db/users.repository.js";
import { getWeeklyCheckinCounts } from "../db/daily-checkin-entries.repository.js";
import { getOperationalWeekStartDate, getWeekEndDate, weekLabel } from "../domain/date.js";
import { getLatestWeeklyGoalCycleWeekNumber } from "../db/weekly-goal-cycles.repository.js";
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

function progressBar(rate: number): string {
  const filled = Math.round(rate / 100 * 8);
  return "█".repeat(filled) + "░".repeat(8 - filled);
}

function rankTitle(rate: number): string {
  if (rate >= 90) return "⚔️ Grand Master";
  if (rate >= 70) return "💎 Diamond";
  if (rate >= 50) return "🌟 Platinum";
  if (rate >= 30) return "🔱 Gold";
  return "⚡ Challenger";
}

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `**${rank}.**`;
}

function top3Entry(s: ParticipantStat, rank: number): string {
  return `${medal(rank)} **${s.displayName}**  ${rankTitle(s.rate)}\n**${s.rate}%** · ${s.checkins}/${s.targetDays}일`;
}

function allEntry(s: ParticipantStat, rank: number): string {
  return `${rank}. **${s.displayName}**  ${progressBar(s.rate)}  **${s.rate}%** (${s.checkins}/${s.targetDays}일)`;
}

const DIV = { type: 14, divider: true, spacing: 1 };

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
  const weekNum = await getLatestWeeklyGoalCycleWeekNumber(db, guildId);
  const label = weekLabel(weekNum, weekStart);
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

  // 인증 횟수 집계
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

  // TOP 3 (빈 슬롯 포함)
  const top3Lines: string[] = [];
  for (let i = 0; i < 3; i++) {
    const s = stats[i];
    if (s) {
      top3Lines.push(top3Entry(s, i + 1));
    } else {
      top3Lines.push(`${medal(i + 1)}  —`);
    }
    if (i < 2) top3Lines.push("");
  }

  // 전체 순위
  const allText = stats.length > 0
    ? stats.map((s, i) => allEntry(s, i + 1)).join("\n")
    : "아직 참여자가 없습니다.";

  // 통계 푸터
  const avgRate = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + s.rate, 0) / stats.length)
    : 0;
  const topRate = stats[0]?.rate ?? 0;
  const statsLine = `👥 참여자 **${stats.length}명**  ·  📈 평균 **${avgRate}%**  ·  🏅 최고 **${topRate}%**`;

  const components = [
    {
      type: 17,
      accent_color: 0xF1C40F,
      components: [
        {
          type: 10,
          content: `## 🏆 ${label} 리더보드\n${weekStart} ~ ${weekEnd}  ·  **${elapsed}**일 / 7일 경과`,
        },
        DIV,
        {
          type: 10,
          content: `### 🎖 TOP 3\n${top3Lines.join("\n")}`,
        },
        DIV,
        {
          type: 10,
          content: `### 📋 전체 순위\n${allText}`,
        },
        DIV,
        {
          type: 10,
          content: statsLine,
        },
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
