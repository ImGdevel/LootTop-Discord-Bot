# Discord Builder Spec

## 1. 문서 목적

이 문서는 [discord-card-payload-examples.md](C:/Users/imdls/workspace/LootTop%20Discord%20Bot/docs/discord-card-payload-examples.md)의 시안을 실제 구현 가능한 Discord builder 스펙으로 세분화한다.

목표:

- 코드에서 재사용 가능한 builder 입력 정의
- Discord API 제약을 만족하는 출력 구조 정의
- 카드/버튼/모달 payload 책임 분리

## 2. 구현 원칙

- builder는 순수 함수로 작성한다.
- builder는 Discord API 요청 body 일부를 반환한다.
- builder는 DB 조회를 하지 않는다.
- builder 입력값은 service layer가 준비한다.

## 3. 현재 저장소 기준 권장 구조

```text
src/ui/
  cards/
    study-home.card.ts
    weekly-goal-thread.card.ts
    goal-summary.card.ts
    daily-checkin-thread.card.ts
    checkin-entry.card.ts
    leaderboard.card.ts
  modals/
    goal-write.modal.ts
    checkin-submit.modal.ts
    settings.modal.ts
  builders/
    components.ts
    ids.ts
```

## 4. Discord API 제약 반영 원칙

### 4.1 메시지 컴포넌트

- 최신 컴포넌트 기반 메시지 사용
- 한 메시지에 과도한 블록 수를 넣지 않는다
- 긴 목록은 메시지를 분할하거나 페이지 처리

### 4.2 모달

- top-level 컴포넌트 `1~5`개 제한
- 긴 목표 작성은 1회 모달이 아니라 wizard로 분리
- 목표 항목이 많을 경우 여러 단계로 나눈다

### 4.3 파일 업로드

- 인증 사진은 `File Upload` 컴포넌트 기반 모달 또는 별도 첨부 흐름으로 구현
- MVP에서는 우선 URL/텍스트/체크 중심으로 두고 이미지 업로드는 2차 확장 가능

## 5. 공통 타입 제안

```ts
export interface CardBuildResult {
  flags?: number;
  components: unknown[];
}

export interface ButtonSpec {
  label: string;
  customId: string;
  style?: 1 | 2 | 3 | 4 | 5;
  disabled?: boolean;
}
```

## 6. Builder 입력 스펙

## 6.1 Weekly Goal Thread Intro Card

파일:

- `src/ui/cards/weekly-goal-thread.card.ts`

함수:

```ts
buildWeeklyGoalThreadIntroCard(input: {
  weekLabel: string;
  periodLabel: string;
  defaultRestDaysLabel: string;
  createGoalButtonId: string;
}): CardBuildResult
```

출력 목적:

- 주간 포럼 글 첫 메시지

포함 내용:

- 주차
- 작성 안내
- 기본 휴식일 안내
- `내 목표 작성` 버튼

주의:

- 한 메시지에 안내 텍스트를 과도하게 넣지 않는다
- 버튼은 1~2개 수준 유지

## 6.2 Goal Summary Card

파일:

- `src/ui/cards/goal-summary.card.ts`

함수:

```ts
buildGoalSummaryCard(input: {
  memberDisplay: string;
  weekLabel: string;
  periodLabel: string;
  goals: Array<{
    label: string;
    proofTypeLabel: string;
  }>;
  restDaysLabel: string;
  editButtonId?: string;
}): CardBuildResult
```

출력 목적:

- 사용자 목표 카드

표현 정책:

- 목표 목록은 최대 5개까지 카드 본문 표시
- 그 이상이면 `외 N개` 형태로 축약 또는 후속 상세 메시지 분리

## 6.3 Daily Checkin Thread Intro Card

파일:

- `src/ui/cards/daily-checkin-thread.card.ts`

함수:

```ts
buildDailyCheckinThreadIntroCard(input: {
  dateLabel: string;
  closeAtLabel: string;
  submitButtonId: string;
}): CardBuildResult
```

출력 목적:

- 일일 인증 쓰레드 첫 메시지

포함 내용:

- 날짜
- 마감 시각
- 오늘 인증 버튼

## 6.4 Checkin Entry Card

파일:

- `src/ui/cards/checkin-entry.card.ts`

함수:

```ts
buildCheckinEntryCard(input: {
  memberDisplay: string;
  submittedAtLabel: string;
  items: Array<{
    label: string;
    statusLabel: string;
    detail?: string | null;
  }>;
  referenceUrl?: string | null;
  appendButtonId?: string;
}): CardBuildResult
```

출력 목적:

- 사용자 인증 카드

표현 정책:

- 세부 내용은 너무 길면 줄임
- 사진은 MVP에서는 URL 링크 또는 후속 attachment 확장으로 처리

## 6.5 Leaderboard Card

파일:

- `src/ui/cards/leaderboard.card.ts`

함수:

```ts
buildLeaderboardCard(input: {
  weekLabel: string;
  periodLabel: string;
  participantCount: number;
  averageRateLabel: string;
  top3: Array<{ rank: number; display: string; rateLabel: string }>;
  bottom3: Array<{ rank: number; display: string; rateLabel: string }>;
  rankingPreview: Array<{
    rank: number;
    display: string;
    rateLabel: string;
    progressLabel: string;
  }>;
  myRankButtonId?: string;
}): CardBuildResult
```

표현 정책:

- 전체 순위는 첫 10명까지만 기본 표시
- 나머지는 `더 보기` 버튼 또는 상세 메시지로 분리

## 6.6 Study Home Card

파일:

- `src/ui/cards/study-home.card.ts`

함수:

```ts
buildStudyHomeCard(input: {
  weekLabel: string;
  goalThreadName?: string | null;
  checkinThreadName?: string | null;
  leaderboardThreadName?: string | null;
  myGoalStatusLabel: string;
  myTodayCheckinStatusLabel: string;
  buttons: {
    goal: string;
    checkin: string;
    leaderboard: string;
    refresh: string;
    settings?: string;
  };
}): CardBuildResult
```

## 7. Modal Builder 스펙

## 7.1 Goal Write Modal

중요:

- 목표 항목 수가 많으므로 단일 모달로 끝내지 않는다.
- Step별 modal builder를 분리한다.

파일:

- `src/ui/modals/goal-write.modal.ts`

함수 제안:

```ts
buildGoalWriteStep1Modal(input: {
  customId: string;
  title: string;
}): Response

buildGoalWriteStep2Modal(input: {
  customId: string;
  title: string;
  goalLabels: string[];
}): Response
```

권장 단계:

- Step 1: 목표 항목 입력
- Step 2: 인증 방식 입력
- Step 3: 휴식일 선택은 modal보다 message select/radio 흐름 권장

이유:

- 모달 top-level 5개 제한 때문

## 7.2 Checkin Submit Modal

파일:

- `src/ui/modals/checkin-submit.modal.ts`

함수:

```ts
buildCheckinSubmitModal(input: {
  customId: string;
  title: string;
  goals: Array<{
    id: number;
    label: string;
    proofType: "text" | "url" | "image" | "checkbox";
  }>;
}): Response
```

구현 제약:

- 모달 한 번에 모든 목표를 다 담기 어렵다
- 따라서 MVP는 아래 둘 중 하나를 택해야 한다

권장안 A:

- 1차 선택 카드에서 오늘 인증할 목표 항목 선택
- 2차 모달에서 선택한 항목만 입력

권장안 B:

- 목표 항목 수를 3개 이하로 제한

실무적으로는 `권장안 A`가 더 안전하다.

## 8. 공통 컴포넌트 빌더

파일:

- `src/ui/builders/components.ts`

필요 함수:

```ts
textBlock(markdown: string): unknown
separator(): unknown
container(children: unknown[], accentColor?: number): unknown
section(markdown: string, accessory?: unknown): unknown
button(spec: ButtonSpec): unknown
```

목적:

- card builder에서 raw JSON 하드코딩 중복 제거

## 9. Custom ID 규칙

파일:

- `src/ui/builders/ids.ts`

권장 포맷:

```text
feature:action:scope:entity:page
```

예:

- `goal:create:self:current:1`
- `goal:edit:self:current:1`
- `checkin:submit:self:today:1`
- `leaderboard:view:self:current:1`
- `home:refresh:self:root:1`

규칙:

- 100자 이내 유지
- 파싱 가능한 고정 구분자 사용

## 10. 구현 우선순위

1. `components.ts` 공통 builder 추가
2. `weekly-goal-thread.card.ts`
3. `goal-summary.card.ts`
4. `daily-checkin-thread.card.ts`
5. `checkin-entry.card.ts`
6. `leaderboard.card.ts`
7. `study-home.card.ts`

## 11. 주의사항

- 예시 문서의 payload를 그대로 복붙하지 말고 builder 함수로 분리한다.
- Discord 제약 때문에 “모든 데이터를 한 장의 카드에 다 넣는 것”은 피한다.
- 목록이 길면 요약 카드 + 상세 후속 메시지 구조로 분리한다.
- 모달은 입력 밀도를 낮추고, 상태 이동은 메시지 기반 wizard로 보조한다.

