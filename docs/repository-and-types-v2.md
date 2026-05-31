# Repository And Types V2

## 1. 문서 목적

이 문서는 `0002_channel_based_study_schema.sql` 기준으로 실제 저장소 코드 구조에 맞는 `row type`과 `repository` 설계를 정의한다.

기준:

- 현재 저장소는 `src/db/types.ts`에 row type을 모은다.
- repository는 `src/db/*.repository.ts` 파일 단위로 나눈다.
- 각 repository는 `D1Database`를 직접 받아 SQL을 수행하는 순수 함수 스타일을 유지한다.

## 2. 현재 코드 구조와 유지 원칙

현재 저장소 패턴:

- `src/db/types.ts`
- `src/db/guild-settings.repository.ts`
- `src/db/users.repository.ts`
- `src/db/weekly-plans.repository.ts`
- `src/db/daily-checkins.repository.ts`

V2에서도 같은 원칙을 유지한다.

- row type은 DB raw row 그대로 표현
- service layer에서 비즈니스 규칙 처리
- repository는 저장/조회 책임만 가짐
- Discord payload 조립 책임은 repository에 두지 않음

## 3. 파일 구조 제안

```text
src/db/
  types.ts
  guild-settings.repository.ts
  users.repository.ts
  weekly-goal-cycles.repository.ts
  user-daily-goals.repository.ts
  daily-checkin-cycles.repository.ts
  daily-checkin-entries.repository.ts
  weekly-leaderboard-cycles.repository.ts
```

비고:

- 기존 `weekly-plans.repository.ts`, `daily-checkins.repository.ts`는 이행 기간 동안 유지 가능
- 새 구조가 안정화되면 legacy repository는 deprecated 처리

## 4. `src/db/types.ts` 확장안

## 4.1 GuildSettingsRow V2

기존 타입을 확장한다.

```ts
export interface GuildSettingsRow {
  guild_id: string;
  timezone: string;
  plan_reminder_channel_id: string | null;
  checkin_channel_id: string | null;
  leaderboard_channel_id: string | null;
  plan_reminder_time: string | null;
  checkin_reminder_time: string | null;
  leaderboard_publish_time: string | null;
  study_home_channel_id: string | null;
  goal_forum_channel_id: string | null;
  leaderboard_forum_channel_id: string | null;
  goal_publish_time: string;
  checkin_thread_open_time: string;
  checkin_thread_close_time: string;
  created_at: string;
  updated_at: string;
}
```

주의:

- `leaderboard_channel_id`와 `leaderboard_forum_channel_id`는 이행 기간 동안 동시에 존재할 수 있다.

## 4.2 WeeklyGoalCycleRow

```ts
export interface WeeklyGoalCycleRow {
  id: number;
  guild_id: string;
  week_start_date: string;
  week_end_date: string;
  forum_thread_id: string;
  title: string;
  status: "open" | "closed" | "archived";
  published_at: string;
  created_at: string;
}
```

## 4.3 UserDailyGoalRow

```ts
export interface UserDailyGoalRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  weekly_goal_cycle_id: number;
  goal_message_id: string | null;
  rest_days_json: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}
```

## 4.4 UserDailyGoalItemRow

```ts
export type GoalProofType = "text" | "url" | "image" | "checkbox";

export interface UserDailyGoalItemRow {
  id: number;
  user_daily_goal_id: number;
  sort_order: number;
  label: string;
  proof_type: GoalProofType;
  required: number;
  created_at: string;
}
```

비고:

- `required`는 D1에서 `0 | 1` 정수
- service/domain layer에서 boolean 변환 가능

## 4.5 DailyCheckinCycleRow

```ts
export interface DailyCheckinCycleRow {
  id: number;
  guild_id: string;
  checkin_date: string;
  thread_id: string;
  title: string;
  opens_at: string;
  closes_at: string;
  status: "open" | "closed" | "archived";
  created_at: string;
}
```

## 4.6 DailyCheckinEntryRow

```ts
export interface DailyCheckinEntryRow {
  id: number;
  guild_id: string;
  discord_user_id: string;
  daily_checkin_cycle_id: number;
  entry_message_id: string | null;
  submitted_at: string;
  status: "valid" | "late" | "discarded";
}
```

## 4.7 DailyCheckinEntryItemRow

```ts
export interface DailyCheckinEntryItemRow {
  id: number;
  daily_checkin_entry_id: number;
  goal_item_id: number;
  checked: number | null;
  text_value: string | null;
  url_value: string | null;
  attachment_url: string | null;
}
```

## 4.8 WeeklyLeaderboardCycleRow

```ts
export interface WeeklyLeaderboardCycleRow {
  id: number;
  guild_id: string;
  week_start_date: string;
  week_end_date: string;
  forum_thread_id: string;
  title: string;
  published_at: string;
  created_at: string;
}
```

## 5. Repository 설계

## 5.1 `guild-settings.repository.ts`

기존 파일을 확장한다.

필요 함수:

```ts
getGuildSettings(db, guildId): Promise<GuildSettingsRow | null>
getAllGuildSettings(db): Promise<GuildSettingsRow[]>
upsertGuildSettings(db, guildId, fields): Promise<void>
```

추가 권장 함수:

```ts
ensureGuildSettings(db, guildId): Promise<GuildSettingsRow>
```

용도:

- 초기 길드 설정이 없을 때 기본값 생성

## 5.2 `users.repository.ts`

기존 구조 유지.

필요 함수:

```ts
upsertUser(db, guildId, discordUserId, displayName): Promise<void>
getUser(db, guildId, discordUserId): Promise<UserRow | null>
```

## 5.3 `weekly-goal-cycles.repository.ts`

목표 포럼 글 메타데이터용 repository.

필요 함수:

```ts
getWeeklyGoalCycle(
  db,
  guildId,
  weekStartDate
): Promise<WeeklyGoalCycleRow | null>

insertWeeklyGoalCycle(
  db,
  input: {
    guildId: string;
    weekStartDate: string;
    weekEndDate: string;
    forumThreadId: string;
    title: string;
    publishedAt: string;
  }
): Promise<WeeklyGoalCycleRow>

updateWeeklyGoalCycleStatus(
  db,
  id: number,
  status: "open" | "closed" | "archived"
): Promise<void>
```

선택 함수:

```ts
getLatestWeeklyGoalCycle(db, guildId): Promise<WeeklyGoalCycleRow | null>
```

## 5.4 `user-daily-goals.repository.ts`

사용자별 주간 목표와 목표 항목 저장.

필요 함수:

```ts
getUserDailyGoal(
  db,
  guildId,
  discordUserId,
  weeklyGoalCycleId
): Promise<UserDailyGoalRow | null>

insertUserDailyGoal(
  db,
  input: {
    guildId: string;
    discordUserId: string;
    weeklyGoalCycleId: number;
    goalMessageId?: string | null;
    restDaysJson: string;
  }
): Promise<UserDailyGoalRow>

updateUserDailyGoalMessageId(
  db,
  id: number,
  goalMessageId: string
): Promise<void>

replaceUserDailyGoalItems(
  db,
  userDailyGoalId: number,
  items: Array<{
    sortOrder: number;
    label: string;
    proofType: GoalProofType;
    required: boolean;
  }>
): Promise<void>

getUserDailyGoalItems(
  db,
  userDailyGoalId: number
): Promise<UserDailyGoalItemRow[]>
```

핵심 설계:

- 목표 수정 시 항목은 `replace` 전략 사용
- 즉, 기존 item delete 후 신규 insert

## 5.5 `daily-checkin-cycles.repository.ts`

일일 인증 쓰레드 메타데이터용.

필요 함수:

```ts
getDailyCheckinCycle(
  db,
  guildId,
  checkinDate
): Promise<DailyCheckinCycleRow | null>

insertDailyCheckinCycle(
  db,
  input: {
    guildId: string;
    checkinDate: string;
    threadId: string;
    title: string;
    opensAt: string;
    closesAt: string;
  }
): Promise<DailyCheckinCycleRow>

updateDailyCheckinCycleStatus(
  db,
  id: number,
  status: "open" | "closed" | "archived"
): Promise<void>
```

선택 함수:

```ts
getOpenCheckinCyclesToClose(db, nowIso: string): Promise<DailyCheckinCycleRow[]>
```

## 5.6 `daily-checkin-entries.repository.ts`

사용자 인증 엔트리와 상세 항목 저장.

필요 함수:

```ts
insertDailyCheckinEntry(
  db,
  input: {
    guildId: string;
    discordUserId: string;
    dailyCheckinCycleId: number;
    entryMessageId?: string | null;
    submittedAt: string;
    status?: "valid" | "late" | "discarded";
  }
): Promise<DailyCheckinEntryRow>

updateDailyCheckinEntryMessageId(
  db,
  id: number,
  entryMessageId: string
): Promise<void>

insertDailyCheckinEntryItems(
  db,
  dailyCheckinEntryId: number,
  items: Array<{
    goalItemId: number;
    checked?: boolean | null;
    textValue?: string | null;
    urlValue?: string | null;
    attachmentUrl?: string | null;
  }>
): Promise<void>

getDailyCheckinEntriesForUserAndCycle(
  db,
  guildId: string,
  discordUserId: string,
  dailyCheckinCycleId: number
): Promise<DailyCheckinEntryRow[]>

getDailyCheckinEntryItems(
  db,
  dailyCheckinEntryId: number
): Promise<DailyCheckinEntryItemRow[]>
```

집계용 추가 함수:

```ts
getDailyCheckinEntriesForCycle(
  db,
  dailyCheckinCycleId: number
): Promise<DailyCheckinEntryRow[]>

getValidEntryItemCountsByGoalIds(
  db,
  dailyCheckinCycleId: number
): Promise<Array<{ goal_item_id: number; count: number }>>
```

## 5.7 `weekly-leaderboard-cycles.repository.ts`

리더보드 포럼 글 메타데이터용.

필요 함수:

```ts
getWeeklyLeaderboardCycle(
  db,
  guildId,
  weekStartDate
): Promise<WeeklyLeaderboardCycleRow | null>

insertWeeklyLeaderboardCycle(
  db,
  input: {
    guildId: string;
    weekStartDate: string;
    weekEndDate: string;
    forumThreadId: string;
    title: string;
    publishedAt: string;
  }
): Promise<WeeklyLeaderboardCycleRow>
```

## 6. Service 계층이 repository를 조합하는 방식

## 6.1 GoalCycleService

조합 대상:

- `guild-settings.repository.ts`
- `weekly-goal-cycles.repository.ts`

역할:

- 이번 주 목표 포럼 글 생성 여부 확인
- 없으면 생성
- 있으면 반환

## 6.2 GoalSubmissionService

조합 대상:

- `users.repository.ts`
- `weekly-goal-cycles.repository.ts`
- `user-daily-goals.repository.ts`

역할:

- 사용자 목표 저장
- 목표 카드 메시지 ID 연결

## 6.3 CheckinSubmissionService

조합 대상:

- `daily-checkin-cycles.repository.ts`
- `user-daily-goals.repository.ts`
- `daily-checkin-entries.repository.ts`

역할:

- 인증 가능 여부 판정
- 목표 기반 폼 렌더 입력값 준비
- 인증 저장

## 6.4 LeaderboardService

조합 대상:

- `weekly-goal-cycles.repository.ts`
- `user-daily-goals.repository.ts`
- `daily-checkin-entries.repository.ts`
- `weekly-leaderboard-cycles.repository.ts`

역할:

- 휴식일 제외 기준 주간 달성률 집계
- Top 3 / Bottom 3 / 전체 순위 생성

## 7. 구현 순서 제안

1. `src/db/types.ts` 확장
2. `guild-settings.repository.ts` 확장
3. 신규 repository 파일 추가
4. service layer V2 추가
5. legacy service와 병행 운영

## 8. 주의사항

- repository는 Discord API 호출을 절대 하지 않는다.
- row type은 DB 구조를 그대로 반영하고, 가공 타입은 service 또는 domain layer에 둔다.
- `rest_days_json`은 row type에서 문자열로 유지하고, service에서 배열로 파싱한다.
- attachment/file 메타데이터 확장이 필요하면 `daily_checkin_entry_items` 확장 마이그레이션으로 분리한다.

