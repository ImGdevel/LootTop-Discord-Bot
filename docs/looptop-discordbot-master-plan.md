# LoopTop DiscordBot Master Plan

## 1. 프로젝트 개요

### 프로젝트명

- 표시 이름: `LoopTop DiscordBot`
- 기술 식별자: `looptop-discord-bot`

### 프로젝트 목적

LoopTop DiscordBot은 디스코드 스터디 서버에서 다음 운영 흐름을 자동화하기 위한 서버리스 관리 시스템이다.

- 매주 목표 계획 작성
- 매일 인증 제출
- 정해진 시간 리마인더 발송
- 주간 달성률 집계 및 리더보드 발표

이 프로젝트는 `24시간 상주 Gateway 봇`이 아니라, `Discord 상호작용을 입력 UI로 사용하는 Cloudflare 기반 서버리스 앱`으로 구축한다.

## 2. 핵심 원칙

### 제품 원칙

- 사용자는 복잡한 명령어보다 버튼과 모달 중심으로 동작해야 한다.
- 운영자는 별도 웹 대시보드 없이 디스코드 안에서 최소 설정만으로 운영 가능해야 한다.
- 자동화는 적지만 확실해야 한다.
- 기록은 작더라도 영속 저장되어야 한다.

### 기술 원칙

- 무료 또는 거의 무료에 가까운 운영 비용
- 서버리스 우선
- Worker 런타임 친화적 구조
- 명시적 상호작용 우선
- 단순 SQL 중심 데이터 구조

## 3. 최종 기술 선택

### 확정 스택

- Language: `TypeScript`
- Runtime: `Cloudflare Workers`
- Database: `Cloudflare D1`
- Scheduler: `Cloudflare Cron Triggers`
- Discord Integration: `Discord Application Interactions`
- Deployment Tooling: `Wrangler`

### 선택 이유

- 24시간 서버가 필요 없다.
- Discord Interaction Webhook 구조와 잘 맞는다.
- D1은 현재 데이터 규모에 충분하다.
- Cron Trigger로 리마인더와 리더보드를 자동화할 수 있다.
- TypeScript는 Workers 생태계와 가장 잘 맞는다.

## 4. 제품 범위

### MVP 포함 범위

- 스터디 서버 단위 설정
- 주간 계획 생성
- 개인 계획 조회
- 일일 인증 제출
- 개인 인증 현황 조회
- 수동 리더보드 조회
- 자동 리마인더
- 자동 주간 리더보드 게시

### MVP 제외 범위

- 자연어 메시지 자동 판독
- 이미지 기반 인증 검증
- 포인트, 레벨, 업적 시스템
- 외부 웹 관리자 페이지
- 다중 서버 통합 통계
- 역할 기반 세부 권한 설계

## 5. 사용자 역할

### 스터디 참여자

- 주간 계획 작성
- 일일 인증 제출
- 자신의 진행 상황 확인
- 리더보드 확인

### 서버 관리자

- 리마인더 채널 설정
- 리더보드 채널 설정
- 타임존 설정
- 리마인더 시간 설정

## 6. 사용자 시나리오

### 시나리오 A: 주간 계획 작성

1. 월요일 오전 9시에 봇이 계획 작성 안내 메시지를 보낸다.
2. 사용자는 `계획 작성` 버튼을 누른다.
3. 모달이 열린다.
4. 사용자는 이번 주 목표 내용과 목표 횟수를 입력한다.
5. 저장이 완료되면 봇이 확인 메시지를 보낸다.

### 시나리오 B: 일일 인증 제출

1. 매일 오후 9시에 봇이 인증 안내 메시지를 보낸다.
2. 사용자는 `오늘 인증` 버튼을 누른다.
3. 모달이 열린다.
4. 사용자는 오늘 한 내용을 입력하고 필요하면 링크를 남긴다.
5. 봇이 해당 주간 계획에 연결해 기록을 저장한다.

### 시나리오 C: 수동 리더보드 확인

1. 사용자가 `/리더보드`를 실행한다.
2. Worker가 현재 주간 데이터를 집계한다.
3. 달성률 기준 정렬 후 결과를 응답한다.

### 시나리오 D: 자동 주간 리더보드

1. 일요일 오후 11시에 Cron Trigger가 실행된다.
2. Worker가 이번 주 데이터를 집계한다.
3. 리더보드 메시지를 지정 채널에 게시한다.

## 7. 시스템 아키텍처

### 전체 흐름

1. Discord가 Interaction 요청을 Worker로 전달한다.
2. Worker가 서명 검증 후 명령 타입을 파싱한다.
3. Worker가 필요한 비즈니스 로직을 실행한다.
4. Worker가 D1에 읽기/쓰기한다.
5. Worker가 Discord 응답 또는 후속 메시지를 전송한다.
6. Cron Trigger는 정해진 시각에 동일 Worker 내부의 스케줄 핸들러를 실행한다.

### Discord Interaction 응답 제한과 Deferred Response 패턴

Discord Interaction은 **수신 후 3초 이내에 최초 응답**을 반환해야 한다. 이 제한을 초과하면 Discord가 Interaction을 실패 처리한다. Cloudflare Worker에서 D1 쿼리나 Discord REST 호출이 포함된 로직은 3초를 초과할 수 있으므로, 다음 패턴을 기본으로 사용한다.

#### Deferred Response 처리 흐름

```
1. Worker가 Interaction 수신
2. 즉시 DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE (type 5) 응답 반환 → Discord에 "처리 중" 상태 표시
3. Worker가 비즈니스 로직 실행 (D1 쿼리, 계산 등)
4. Discord Followup Webhook으로 실제 결과 메시지 전송
```

#### 적용 대상

- 계획 작성 모달 제출 → D1 upsert 후 확인 응답
- 인증 모달 제출 → 중복 확인 + D1 insert 후 확인 응답
- `/리더보드` 명령 → 집계 쿼리 후 결과 응답
- `/내계획`, `/내인증현황` 명령 → D1 조회 후 결과 응답

#### Ephemeral 여부

- 개인 확인 메시지 (계획 저장 완료, 인증 저장 완료, 내 현황): `ephemeral: true`
- 공개 메시지 (리더보드, 리마인더): `ephemeral: false`

### 구성 요소

#### Discord Layer

- Slash Commands
- Buttons
- Modals
- Channel Messages

#### Application Layer

- Interaction router
- Command handlers
- Modal handlers
- Button handlers
- Cron handlers
- Service layer
- Repository layer

#### Data Layer

- D1 tables
- SQL migrations

## 8. 애플리케이션 모듈 설계

### `src/index.ts`

- Worker 진입점
- `fetch` 핸들러: Discord Interaction Webhook 수신
- `scheduled` 핸들러: Cron Trigger 처리

### `src/discord`

- Discord 요청 서명 검증 (`verifyDiscordRequest`)
- Interaction 타입 파서
- Discord 응답 생성기 (즉시 응답 / deferred 응답 / followup)
- Discord REST 호출 유틸 (채널 메시지 전송, followup 전송)

### `src/commands`

슬래시 커맨드 처리. 각 핸들러는 즉시 deferred 응답 반환 후 followup으로 실제 결과를 전송한다.

- `/주간계획`: 이번 주 계획 조회 또는 계획 작성 모달 트리거
- `/인증`: 인증 작성 모달 트리거
- `/리더보드`: 이번 주 달성률 집계 후 공개 응답
- `/내계획`: 본인의 현재 주 계획 조회 (ephemeral)
- `/내인증현황`: 본인의 이번 주 인증 목록 조회 (ephemeral)
- `/설정`: 관리자 전용 서버 설정 (ephemeral)

### `src/interactions`

- 버튼 처리 (`계획 작성`, `오늘 인증`, `이번 주 리더보드 보기`)
- 모달 제출 처리 (계획 모달, 인증 모달)

### `src/services`

- `PlanService`: 계획 생성/수정/조회
- `CheckinService`: 인증 생성, 중복 방지, 조회
- `LeaderboardService`: 달성률 집계, 정렬
- `ReminderService`: 리마인더 메시지 채널 전송
- `GuildSettingsService`: 길드 설정 저장/조회

### `src/db`

- D1 클라이언트 래퍼
- 마이그레이션 SQL
- Repository 함수 (guild_settings, users, weekly_plans, daily_checkins)

### `src/domain`

- 날짜 계산 (현재 주 시작일/종료일 계산)
- 주간 범위 계산 (타임존 보정 포함)
- 달성률 계산 (`checkin_count / target_count`, 최대 100% 캡 여부는 정책 결정)
- 리더보드 정렬 규칙

### `src/scripts`

- `register-commands.ts`: Discord Application Commands 등록 스크립트 (하단 9절 참고)

## 9. 명령어 등록 방식

Discord 슬래시 커맨드는 Discord API에 별도 등록이 필요하다. 런타임 자동 등록은 Interaction 처리 경로와 혼재되어 예기치 않은 동작을 유발할 수 있으므로, **명시적 수동 스크립트 방식**으로 관리한다.

### 등록 방식

- `src/scripts/register-commands.ts`를 별도 실행 스크립트로 작성한다.
- `package.json`에 `"register": "tsx src/scripts/register-commands.ts"` 스크립트를 추가한다.
- 배포 시 자동 실행하지 않고, 명령어 추가/수정 시에만 수동으로 실행한다.
- Global Commands (`/applications/{app_id}/commands`)로 등록한다. (Guild Commands는 개발 환경 테스트 시에만 사용)

### 관리 규칙

- 명령어 정의는 `src/commands/definitions.ts`에 중앙 집중 관리한다.
- 등록 스크립트는 이 파일을 import해서 Discord API에 PUT 요청한다.
- 명령어 변경 시 반드시 스크립트를 재실행해야 Discord에 반영된다.

## 10. 데이터베이스 설계

### 설계 원칙

- 숫자 PK 중심 (AUTOINCREMENT)
- Discord 식별자는 컬럼으로 명확히 분리
- 집계 쿼리가 단순해야 함
- 타임존과 날짜 계산은 저장 시점보다 조회 정책에서 통제
- 모든 날짜/시간은 UTC ISO 8601 문자열로 저장

### 테이블 1: `guild_settings`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `guild_id` | TEXT PRIMARY KEY | Discord 서버 ID |
| `timezone` | TEXT NOT NULL DEFAULT `Asia/Seoul` | 서버 기준 타임존 |
| `plan_reminder_channel_id` | TEXT | 계획 리마인더 채널 ID |
| `checkin_channel_id` | TEXT | 인증 리마인더 채널 ID |
| `leaderboard_channel_id` | TEXT | 리더보드 게시 채널 ID |
| `plan_reminder_time` | TEXT | 계획 리마인더 시간 (HH:MM, 서버 타임존 기준) |
| `checkin_reminder_time` | TEXT | 인증 리마인더 시간 (HH:MM, 서버 타임존 기준) |
| `leaderboard_publish_time` | TEXT | 리더보드 게시 시간 (HH:MM, 서버 타임존 기준) |
| `created_at` | TEXT NOT NULL | UTC ISO 8601 |
| `updated_at` | TEXT NOT NULL | UTC ISO 8601 |

### 테이블 2: `users`

사용자 표시 이름 스냅샷 저장 목적. Discord User ID는 서버마다 닉네임이 다르므로 `guild_id + discord_user_id` 복합 식별.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `guild_id` | TEXT NOT NULL | Discord 서버 ID |
| `discord_user_id` | TEXT NOT NULL | Discord 유저 ID |
| `display_name_snapshot` | TEXT | 마지막으로 확인된 표시 이름 |
| `created_at` | TEXT NOT NULL | UTC ISO 8601 |
| `updated_at` | TEXT NOT NULL | UTC ISO 8601 |

제약:

- UNIQUE (`guild_id`, `discord_user_id`)

> **설계 노트**: `users` 테이블은 `display_name_snapshot` 저장이 주목적이다. `weekly_plans`와 `daily_checkins`는 `guild_id + discord_user_id`를 직접 보유하므로 JOIN 없이도 동작하도록 설계한다. `users` 레코드는 첫 계획 작성 시점에 upsert로 생성하고, 이후 인증 제출 시마다 `display_name_snapshot`을 갱신한다.

### 테이블 3: `weekly_plans`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `guild_id` | TEXT NOT NULL | Discord 서버 ID |
| `discord_user_id` | TEXT NOT NULL | Discord 유저 ID |
| `week_start_date` | TEXT NOT NULL | 해당 주 월요일 날짜 (YYYY-MM-DD, 서버 타임존 기준) |
| `week_end_date` | TEXT NOT NULL | 해당 주 일요일 날짜 (YYYY-MM-DD, 서버 타임존 기준) |
| `goal_text` | TEXT NOT NULL | 목표 내용 |
| `target_count` | INTEGER NOT NULL | 목표 인증 횟수 (양의 정수) |
| `status` | TEXT NOT NULL DEFAULT `active` | `active` \| `archived` |
| `created_at` | TEXT NOT NULL | UTC ISO 8601 |
| `updated_at` | TEXT NOT NULL | UTC ISO 8601 |

제약:

- UNIQUE (`guild_id`, `discord_user_id`, `week_start_date`)

### 테이블 4: `daily_checkins`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `guild_id` | TEXT NOT NULL | Discord 서버 ID |
| `discord_user_id` | TEXT NOT NULL | Discord 유저 ID |
| `weekly_plan_id` | INTEGER NOT NULL | 연결된 `weekly_plans.id` |
| `checkin_date` | TEXT NOT NULL | 인증 날짜 (YYYY-MM-DD, 서버 타임존 기준) |
| `content` | TEXT NOT NULL | 오늘 수행 내용 |
| `proof_url` | TEXT | 참고 링크 또는 메모 (선택) |
| `created_at` | TEXT NOT NULL | UTC ISO 8601 |

제약:

- UNIQUE (`guild_id`, `discord_user_id`, `checkin_date`)
- FOREIGN KEY (`weekly_plan_id`) REFERENCES `weekly_plans`(`id`)

### 인덱스

```sql
CREATE INDEX idx_weekly_plans_guild_week ON weekly_plans (guild_id, week_start_date);
CREATE INDEX idx_weekly_plans_user_week  ON weekly_plans (guild_id, discord_user_id, week_start_date);
CREATE INDEX idx_daily_checkins_plan     ON daily_checkins (weekly_plan_id);
CREATE INDEX idx_daily_checkins_guild_date ON daily_checkins (guild_id, checkin_date);
CREATE INDEX idx_users_guild_user        ON users (guild_id, discord_user_id);
```

## 11. 핵심 비즈니스 규칙

### 시간 정책

- 기본 타임존은 `Asia/Seoul` (UTC+9)
- 주 시작일은 월요일, 주 종료일은 일요일
- 날짜 계산은 `guild_settings.timezone`을 기준으로 한다.
- D1에 저장하는 모든 `_at` 컬럼은 UTC ISO 8601 문자열로 저장한다.
- `week_start_date`, `week_end_date`, `checkin_date`는 서버 타임존 기준 날짜 문자열(YYYY-MM-DD)로 저장한다.

### 계획 정책

- 한 유저는 주당 하나의 계획만 가진다. (`guild_id + discord_user_id + week_start_date` UNIQUE 제약으로 강제)
- 목표 횟수는 1 이상의 양의 정수만 허용한다.
- **계획 수정 정책**: 이미 해당 주 계획이 존재하면 `goal_text`와 `target_count`를 덮어쓴다(upsert). 기존에 제출된 `daily_checkins` 기록은 유지한다. 단, `target_count`를 낮춰 이미 달성률이 100%를 초과하는 상황이 발생할 수 있으므로, 리더보드 달성률은 최대 100%로 캡처한다.

### 인증 정책

- 하루 인증은 **1회만** 허용한다. (`guild_id + discord_user_id + checkin_date` UNIQUE 제약으로 강제)
- 인증은 같은 주의 활성 계획(`status = active`)에만 연결된다.
- **계획 없이 인증 시도한 경우**: 인증을 거부하고, 먼저 계획을 작성하도록 안내하는 ephemeral 메시지를 반환한다. 계획 작성 버튼을 함께 노출한다.
- **당일 중복 인증 시도한 경우**: 이미 인증이 완료됐음을 알리는 ephemeral 메시지를 반환한다. 기존 인증 내용을 함께 표시한다.

### 리더보드 정책

- 이번 주에 계획을 작성한 **모든 유저**를 리더보드에 포함한다. 인증이 0건인 유저도 0%로 표시한다.
- 기본 정렬 기준: 달성률 내림차순 (`checkin_count / target_count`)
- 2차 정렬: 인증 횟수 내림차순
- 3차 정렬: 가장 이른 `weekly_plans.created_at` 순 (먼저 계획 세운 순)
- 달성률은 100%를 초과하더라도 리더보드 표시는 100% 캡으로 제한한다.

## 12. Discord UX 설계

### 명령어

| 명령어 | 대상 | 설명 |
|--------|------|------|
| `/주간계획` | 참여자 | 이번 주 계획 조회 + 계획 작성/수정 모달 트리거 |
| `/인증` | 참여자 | 오늘 인증 모달 트리거 |
| `/리더보드` | 참여자 | 이번 주 달성률 순위표 (공개 응답) |
| `/내계획` | 참여자 | 본인의 이번 주 계획 조회 (ephemeral) |
| `/내인증현황` | 참여자 | 본인의 이번 주 인증 목록 조회 (ephemeral) |
| `/설정` | 관리자 | 채널/시간/타임존 설정 (ephemeral, 권한 검증 필요) |

### 버튼

| 버튼 ID | 설명 |
|---------|------|
| `btn_plan_write` | 계획 작성 (리마인더 메시지에 포함) |
| `btn_checkin_today` | 오늘 인증 (리마인더 메시지에 포함) |
| `btn_leaderboard_view` | 이번 주 리더보드 보기 |

### 모달

#### 주간 계획 모달 (`modal_plan_write`)

| 필드 | 필드 ID | 유형 | 필수 | 설명 |
|------|---------|------|------|------|
| 이번 주 목표 | `goal_text` | Paragraph | ✅ | 자유 형식 목표 텍스트 |
| 목표 인증 횟수 | `target_count` | Short | ✅ | 양의 정수만 허용, 서버 측 검증 |

#### 일일 인증 모달 (`modal_checkin_today`)

| 필드 | 필드 ID | 유형 | 필수 | 설명 |
|------|---------|------|------|------|
| 오늘 한 일 | `content` | Paragraph | ✅ | 수행 내용 |
| 참고 링크 또는 메모 | `proof_url` | Short | ❌ | URL 또는 자유 텍스트 |

### 에러 응답 정의

모든 에러 응답은 `ephemeral: true`로 반환한다.

| 상황 | 메시지 예시 | 추가 UI |
|------|------------|---------|
| 계획 없이 인증 시도 | "이번 주 계획이 없습니다. 먼저 계획을 작성해 주세요." | `계획 작성` 버튼 |
| 당일 중복 인증 | "오늘은 이미 인증하셨습니다. (기존 내용: …)" | 없음 |
| `target_count`에 숫자 아닌 값 입력 | "목표 횟수는 1 이상의 숫자로 입력해 주세요." | 없음 |
| 설정되지 않은 채널로 리마인더 발송 시 | Cron 로그에만 기록, 사용자 노출 없음 | 없음 |
| 권한 없는 유저가 `/설정` 실행 | "이 명령어는 서버 관리자만 사용할 수 있습니다." | 없음 |

### 응답 원칙

- 사용자 개인 입력 결과 및 에러는 `ephemeral: true`
- 리더보드, 리마인더는 채널 공개 메시지
- 모든 Interaction은 Deferred Response → Followup 패턴 적용 (7절 참고)

## 13. 스케줄 계획

### 기본 스케줄

| 시각 (KST) | 요일 | Cron (UTC) | 역할 |
|-----------|------|------------|------|
| 월요일 09:00 | 월 | `0 0 * * 1` | 계획 작성 리마인더 |
| 화~일 21:00 | 화~일 | `0 12 * * 2-7` | 인증 리마인더 |
| 일요일 23:00 | 일 | `0 14 * * 0` | 주간 리더보드 자동 게시 |

> KST = UTC+9이므로 KST 09:00 → UTC 00:00, KST 21:00 → UTC 12:00, KST 23:00 → UTC 14:00

### Cron 다중 길드 처리 로직

Cron Trigger는 단일 UTC 시각에 실행된다. 길드마다 타임존과 리마인더 시간이 다를 경우, Worker는 다음 흐름으로 처리한다.

```
1. Cron 핸들러 실행 (UTC 기준 현재 시각 획득)
2. guild_settings 전체 조회
3. 각 길드에 대해:
   a. guild_settings.timezone으로 현재 UTC 시각을 현지 시각으로 변환
   b. 현지 시각의 요일/시간이 해당 길드의 리마인더 설정과 일치하는지 비교
      (허용 오차: ±5분 이내)
   c. 일치하면 해당 길드 채널에 메시지 전송
   d. 일치하지 않으면 스킵
4. 모든 길드 처리 완료 후 종료
```

MVP에서는 길드 수가 소규모이므로 순차 처리로 충분하다. 길드 수가 증가하면 병렬 처리(`Promise.all`)로 전환한다.

**초기 설정 미완료 길드 처리**: `plan_reminder_channel_id` 또는 해당 채널 ID가 설정되지 않은 경우 해당 액션을 스킵하고 로그만 남긴다.

## 14. 구현 로드맵

### Phase 1. 프로젝트 부트스트랩

목표:

- Worker 프로젝트 생성
- TypeScript 설정
- Wrangler 설정
- 로컬 실행 확인

산출물:

- `wrangler.jsonc`
- `tsconfig.json`
- 기본 Worker 엔트리포인트 (`src/index.ts`)

### Phase 2. Discord 기초 연동

목표:

- Discord 서명 검증
- Ping/기본 명령 처리
- 명령어 등록 스크립트 작성 (`src/scripts/register-commands.ts`)

산출물:

- Interaction 서명 검증 로직
- `/ping` 기본 응답 (deferred → followup 패턴 검증 포함)
- `npm run register` 스크립트

### Phase 3. D1 스키마 구축

목표:

- 마이그레이션 파일 작성
- Repository 계층 작성
- 기본 CRUD 검증

산출물:

- D1 migration SQL (guild_settings, users, weekly_plans, daily_checkins)
- 인덱스 포함
- Repository 함수

### Phase 4. 관리자 설정 기능

목표:

- `/설정` 구현
- 채널/시간/타임존 저장 및 조회
- 관리자 권한 검증

산출물:

- GuildSettingsService
- guild_settings 저장/조회 로직
- Discord 관리자 권한 체크 (`MANAGE_GUILD` 권한 확인)

> **Phase 4를 Cron 전에 구현하는 이유**: Cron 자동화는 `guild_settings`의 채널 ID와 시간 설정을 읽어야 동작한다. 설정 기능 없이 Cron을 먼저 구현하면 하드코딩된 값으로 테스트해야 하며, 이후 리팩터링 비용이 발생한다.

### Phase 5. 계획 기능 구현

목표:

- `/주간계획`, `btn_plan_write` 버튼, 계획 모달 제출 처리

산출물:

- PlanService (계획 조회, upsert)
- users upsert 연동
- 에러 응답 처리 (잘못된 target_count 등)

### Phase 6. 인증 기능 구현

목표:

- `/인증`, `btn_checkin_today` 버튼, 인증 모달 제출 처리

산출물:

- CheckinService (인증 저장, 중복 방지)
- 계획 없을 때 에러 응답 + 버튼
- 중복 인증 시 기존 내용 포함 에러 응답

### Phase 7. 리더보드 구현

목표:

- 달성률 집계 SQL
- `/리더보드`
- `/내계획`, `/내인증현황`

산출물:

- LeaderboardService (집계, 정렬)
- 포맷된 응답 메시지 (달성률 % + 인증 횟수 함께 표시)
- 인증 0건 유저 포함 처리

### Phase 8. 스케줄 자동화

목표:

- Cron Trigger 구성
- 계획 리마인더 채널 메시지
- 인증 리마인더 채널 메시지
- 자동 주간 리더보드 게시

산출물:

- `scheduled` 핸들러
- 다중 길드 순회 로직 (13절 참고)
- ReminderService

### Phase 9. 안정화

목표:

- 에러 메시지 정리
- 로그 정리
- 문서 정리
- 엣지 케이스 처리 (설정 미완료 길드, 계획 없는 인증 등)

## 15. 테스트 계획

### 최소 단위 테스트 범위

- Discord 서명 검증
- 주간 날짜 계산 (타임존별, 요일 경계)
- 달성률 계산 (100% 캡 포함)
- 리더보드 정렬 (동률 처리 포함)
- 스케줄 분기 로직 (UTC → 길드 타임존 변환 + 허용 오차 비교)

### 최소 통합 테스트 범위

- 하루 중복 인증 방지 (D1 UNIQUE 제약 동작 확인)
- 계획 upsert (기존 인증 유지 확인)
- 계획 없는 인증 거부

### 수동 검증 항목

- 계획 버튼 클릭 시 모달 오픈
- 계획 제출 후 D1 저장 확인
- 인증 제출 후 중복 제한 동작
- `/리더보드` 응답 포맷
- Cron 실행 시 지정 채널 게시
- 설정 미완료 길드 Cron 스킵 동작

## 16. 운영 및 보안

### 환경변수

| 변수명 | 설명 |
|--------|------|
| `DISCORD_PUBLIC_KEY` | Interaction 서명 검증용 공개키 |
| `DISCORD_APPLICATION_ID` | Discord 앱 ID |
| `DISCORD_BOT_TOKEN` | REST API 호출용 봇 토큰 |

모두 Wrangler secret으로 관리한다. 코드에 하드코딩 금지.

### 보안 원칙

- 모든 Discord Interaction은 서명 검증 통과 후에만 처리한다.
- `/설정` 명령어는 `MANAGE_GUILD` 권한 보유 여부를 Interaction 페이로드의 `member.permissions`로 검증한다.
- 토큰은 Worker secret으로 관리하고 로그에 노출하지 않는다.

### 로깅 원칙

로그에 포함할 항목:

- Interaction 타입 및 명령어명
- `guild_id`, `user_id`
- 에러 타입 및 메시지
- Cron 실행 결과 (처리된 길드 수, 스킵된 길드 수)

로그에 포함하지 않을 항목:

- 봇 토큰, 공개키
- 사용자가 입력한 계획 내용, 인증 내용

## 17. 예상 리스크

### 리스크 1. 초기 Discord 등록 절차 복잡성

대응:

- 앱 생성, 공개키, 토큰, 엔드포인트 설정 절차를 별도 문서화
- `register-commands.ts` 스크립트로 명령어 등록 자동화

### 리스크 2. Cron과 KST 시간 변환 실수

대응:

- UTC 기준 표를 문서에 명시 (13절 스케줄 표 참고)
- 날짜/시간 계산 유틸을 `src/domain`에 분리
- 단위 테스트로 타임존 경계 케이스 검증

### 리스크 3. Interaction 3초 응답 제한 초과

대응:

- 모든 Interaction에 Deferred Response 패턴 적용 (7절 참고)
- D1 쿼리 최적화 (인덱스 활용)

### 리스크 4. Worker 호환성 낮은 패키지 사용

대응:

- Worker 친화적 패키지 우선 사용
- Node 전용 API(`fs`, `path`, `crypto` 등) 사용 금지, Worker 내장 API 활용

### 리스크 5. 장기 운영 중 요구사항 증가

대응:

- 서비스 계층과 DB 계층을 분리해서 확장성 확보
- MVP 제외 범위를 명확히 유지하고, 요구사항 추가 시 별도 Phase로 관리

## 18. 확정 사항 요약

| 항목 | 결정 |
|------|------|
| 프로젝트 이름 | `LoopTop DiscordBot` |
| 기술 식별자 | `looptop-discord-bot` |
| 구현 언어 | TypeScript |
| 런타임 | Cloudflare Workers |
| 저장소 | Cloudflare D1 |
| 스케줄러 | Cloudflare Cron Triggers |
| 명령어 등록 방식 | 수동 스크립트 (`npm run register`) |
| Interaction 응답 패턴 | Deferred Response → Followup |
| 계획 수정 정책 | upsert (기존 인증 유지, 달성률 100% 캡) |
| 하루 인증 횟수 | 1회 (UNIQUE 제약) |
| 리더보드 대상 | 계획 작성자 전원 (인증 0건 포함) |
| MVP 자동화 포함 여부 | 리마인더 + 주간 리더보드 모두 포함 |
| 타임존 기본값 | `Asia/Seoul` |

## 19. 바로 다음 작업

1. Worker 프로젝트 초기화 (`npm create cloudflare@latest`)
2. Wrangler 설정 (`wrangler.jsonc`)
3. TypeScript 설정 (`tsconfig.json`)
4. Discord Interaction 기본 엔드포인트 구현 + 서명 검증
5. 명령어 등록 스크립트 작성 (`src/scripts/register-commands.ts`)
6. D1 데이터베이스 생성 및 초기 SQL 마이그레이션 작성
