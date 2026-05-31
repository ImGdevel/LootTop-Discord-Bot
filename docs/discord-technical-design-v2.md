# Discord Technical Design V2

## 1. 문서 목적

이 문서는 채널 기반 운영 구조를 기준으로 LoopTop Discord Bot의 기술 설계를 정의한다.

초점:

- Discord 채널/쓰레드/포럼 구조
- 데이터 모델
- 스케줄 구조
- 상호작용 라우팅 구조

## 2. 시스템 개요

### 2.1 기술 스택

- Language: `TypeScript`
- Runtime: `Cloudflare Workers`
- Database: `Cloudflare D1`
- Scheduler: `Cloudflare Cron Triggers`
- Discord Integration: `Discord Application Interactions` + `Discord REST API`
- Deployment: `Wrangler`

### 2.2 운영 구조

이 시스템은 24시간 Gateway 봇이 아니라 다음 두 흐름을 결합한 구조다.

- Discord Interaction Webhook 처리
- Cloudflare Cron 기반 예약 작업 처리

## 3. Discord 채널 모델

### 3.1 길드 단위 고정 채널

길드마다 다음 채널을 가진다.

- `study_home_channel_id`
- `goal_forum_channel_id`
- `checkin_channel_id`
- `leaderboard_forum_channel_id`

권장:

- 봇 설치 또는 초기 설정 시 자동 생성 가능

### 3.2 주간/일간 생성 객체

시스템은 고정 채널 안에 주기적으로 하위 객체를 생성한다.

#### 목표 영역

- 부모: `goal_forum_channel_id`
- 생성 객체: 주간 포럼 글(포럼 스레드)

#### 인증 영역

- 부모: `checkin_channel_id`
- 생성 객체: 일일 공개 쓰레드

#### 리더보드 영역

- 부모: `leaderboard_forum_channel_id`
- 생성 객체: 주간 리더보드 포럼 글

## 4. Discord 객체와 내부 도메인 매핑

### 4.1 주간 목표 포럼 글

내부 도메인:

- `weekly_goal_cycle`

Discord 객체:

- `forum thread id`

### 4.2 사용자 목표 카드

내부 도메인:

- `user_weekly_goal`

Discord 객체:

- 주간 포럼 글 안의 메시지

### 4.3 일일 인증 쓰레드

내부 도메인:

- `daily_checkin_cycle`

Discord 객체:

- 텍스트 채널 하위 공개 쓰레드

### 4.4 사용자 인증 카드

내부 도메인:

- `daily_checkin_entry`

Discord 객체:

- 일일 인증 쓰레드 안의 메시지

### 4.5 리더보드 포럼 글

내부 도메인:

- `weekly_leaderboard_cycle`

Discord 객체:

- 리더보드 포럼 채널의 포럼 글

## 5. 데이터베이스 설계

## 5.1 `guild_settings`

길드별 운영 설정을 저장한다.

권장 컬럼:

- `guild_id` TEXT PRIMARY KEY
- `timezone` TEXT NOT NULL DEFAULT `Asia/Seoul`
- `study_home_channel_id` TEXT
- `goal_forum_channel_id` TEXT
- `checkin_channel_id` TEXT
- `leaderboard_forum_channel_id` TEXT
- `goal_publish_time` TEXT NOT NULL DEFAULT `18:00`
- `checkin_thread_open_time` TEXT NOT NULL DEFAULT `04:00`
- `checkin_thread_close_time` TEXT NOT NULL DEFAULT `04:00`
- `leaderboard_publish_time` TEXT NOT NULL DEFAULT `00:00`
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

## 5.2 `users`

길드별 참여자 스냅샷을 저장한다.

권장 컬럼:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `discord_user_id` TEXT NOT NULL
- `display_name_snapshot` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

제약:

- UNIQUE (`guild_id`, `discord_user_id`)

## 5.3 `weekly_goal_cycles`

한 주 단위 목표 글 생성 정보를 저장한다.

권장 컬럼:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `week_start_date` TEXT NOT NULL
- `week_end_date` TEXT NOT NULL
- `forum_thread_id` TEXT NOT NULL
- `title` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT `open`
- `published_at` TEXT NOT NULL
- `created_at` TEXT NOT NULL

제약:

- UNIQUE (`guild_id`, `week_start_date`)

## 5.4 `user_daily_goals`

사용자별 이번 주 데일리 목표 메타데이터를 저장한다.

권장 컬럼:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `discord_user_id` TEXT NOT NULL
- `weekly_goal_cycle_id` INTEGER NOT NULL
- `goal_message_id` TEXT
- `rest_days_json` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT `active`
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

제약:

- UNIQUE (`guild_id`, `discord_user_id`, `weekly_goal_cycle_id`)

## 5.5 `user_daily_goal_items`

사용자 목표 항목을 저장한다.

권장 컬럼:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_daily_goal_id` INTEGER NOT NULL
- `sort_order` INTEGER NOT NULL
- `label` TEXT NOT NULL
- `proof_type` TEXT NOT NULL
- `required` INTEGER NOT NULL DEFAULT 1
- `created_at` TEXT NOT NULL

`proof_type` 예시:

- `text`
- `url`
- `image`
- `checkbox`

## 5.6 `daily_checkin_cycles`

일일 인증 쓰레드 메타데이터를 저장한다.

권장 컬럼:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `checkin_date` TEXT NOT NULL
- `thread_id` TEXT NOT NULL
- `title` TEXT NOT NULL
- `opens_at` TEXT NOT NULL
- `closes_at` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT `open`
- `created_at` TEXT NOT NULL

제약:

- UNIQUE (`guild_id`, `checkin_date`)

## 5.7 `daily_checkin_entries`

사용자가 한 번 제출한 인증 단위를 저장한다.

권장 컬럼:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `discord_user_id` TEXT NOT NULL
- `daily_checkin_cycle_id` INTEGER NOT NULL
- `entry_message_id` TEXT
- `submitted_at` TEXT NOT NULL
- `status` TEXT NOT NULL DEFAULT `valid`

비고:

- 같은 날짜에 여러 번 제출 가능

## 5.8 `daily_checkin_entry_items`

인증 제출 내부 항목을 저장한다.

권장 컬럼:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `daily_checkin_entry_id` INTEGER NOT NULL
- `goal_item_id` INTEGER NOT NULL
- `checked` INTEGER
- `text_value` TEXT
- `url_value` TEXT
- `attachment_url` TEXT

## 5.9 `weekly_leaderboard_cycles`

주간 리더보드 포럼 글 메타데이터를 저장한다.

권장 컬럼:

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `week_start_date` TEXT NOT NULL
- `week_end_date` TEXT NOT NULL
- `forum_thread_id` TEXT NOT NULL
- `title` TEXT NOT NULL
- `published_at` TEXT NOT NULL
- `created_at` TEXT NOT NULL

제약:

- UNIQUE (`guild_id`, `week_start_date`)

## 6. 달성률 계산 정책

### 6.1 일일 판정

해당 날짜가 휴식일이면 실패로 보지 않는다.

해당 날짜가 휴식일이 아니면:

- 그날 필요한 목표 항목 중 제출된 항목 수를 계산
- 목표 항목별 충족 여부를 판정

MVP 단순화:

- 제출된 목표 항목 수 / 전체 목표 항목 수

### 6.2 주간 달성률

주간 달성률은 다음 기준으로 계산한다.

- 분모: 휴식일을 제외한 총 목표 항목 수
- 분자: 유효 마감 시한 내에 제출된 총 달성 항목 수

### 6.3 랭킹 정렬

정렬 우선순위:

1. 주간 달성률 내림차순
2. 달성 항목 수 내림차순
3. 마지막 유효 인증 시각 오름차순 또는 생성 시각 오름차순

## 7. 스케줄 구조

모든 기본 시각은 `guild_settings.timezone` 기준으로 해석한다.

## 7.1 주간 목표 생성 스케줄

기본값:

- 매주 일요일 18:00

동작:

1. 해당 주의 주간 범위 계산
2. `#목표` 포럼 글 생성
3. `weekly_goal_cycles` 저장
4. 첫 안내 메시지 게시

## 7.2 일일 인증 쓰레드 생성 스케줄

기본값:

- 매일 04:00

동작:

1. 해당 날짜의 인증 쓰레드 생성
2. `daily_checkin_cycles` 저장
3. 첫 안내 메시지 게시

## 7.3 일일 인증 마감 스케줄

기본값:

- 다음 날 04:00

동작:

1. 전날 쓰레드 상태를 `closed`로 변경
2. 이후 제출을 차단
3. 필요 시 Discord 쓰레드 잠금 또는 아카이브

## 7.4 주간 리더보드 생성 스케줄

기본값:

- 매주 월요일 00:00

동작:

1. 직전 주 데이터 집계
2. `#리더보드` 포럼 글 생성
3. Top 3 / Bottom 3 / 전체 순위 메시지 게시
4. `weekly_leaderboard_cycles` 저장

## 8. Discord 상호작용 설계

## 8.1 명령어

명령어는 백업 진입점으로 유지한다.

권장:

- `/홈`
- `/주간목표`
- `/인증`
- `/리더보드`
- `/설정`

## 8.2 주요 버튼 ID 예시

- `home:goal`
- `home:checkin`
- `home:leaderboard`
- `goal:create`
- `goal:edit`
- `checkin:submit`
- `settings:open`

## 8.3 모달/폼 전략

목표와 인증은 모두 동적 생성 폼이 필요하므로 다음 구조를 권장한다.

- 목표 작성: 다단계 wizard
- 인증 제출: 목표 항목 기반 동적 폼
- 관리자 설정: 항목별 짧은 모달

## 9. 애플리케이션 계층 설계

### 9.1 권장 모듈

- `src/discord`
- `src/interactions`
- `src/commands`
- `src/services`
- `src/db`
- `src/domain`
- `src/ui`
- `src/flows`

### 9.2 핵심 서비스

- `GuildSetupService`
- `GoalCycleService`
- `GoalSubmissionService`
- `CheckinCycleService`
- `CheckinSubmissionService`
- `LeaderboardService`
- `ReminderService`

### 9.3 UI 계층

권장 파일:

- `study-home.card.ts`
- `weekly-goal.card.ts`
- `goal-summary.card.ts`
- `daily-checkin.card.ts`
- `leaderboard.card.ts`

## 10. 예외 및 운영 정책

### 목표 없이 인증 시도

- 목표 작성으로 유도

### 이미 존재하는 주간 글/일일 쓰레드/리더보드 글

- 중복 생성 금지
- DB unique 제약과 idempotent 로직 사용

### Discord API 실패

- 생성 실패 시 재시도 로그 남김
- 중복 게시 방지용 DB 상태 확인

## 11. 구현 우선순위

### Phase 1

- 길드 채널 매핑 구조 확장
- 주간 목표 포럼 글 생성
- 데일리 목표 작성 저장 구조

### Phase 2

- 일일 인증 쓰레드 생성
- 목표 기반 동적 인증 제출
- 누적 인증 저장

### Phase 3

- 주간 리더보드 집계
- 포럼 글 생성 및 카드형 출력

### Phase 4

- 홈 채널 카드
- 관리자 설정 UX 개선

