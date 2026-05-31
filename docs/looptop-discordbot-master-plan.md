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
- Cron handlers
- Service layer
- Repository layer

#### Data Layer

- D1 tables
- SQL migrations

## 8. 애플리케이션 모듈 설계

### `src/index.ts`

- Worker 진입점
- `fetch` 핸들러
- `scheduled` 핸들러

### `src/discord`

- Discord 요청 검증
- Interaction 타입 파서
- Discord 응답 생성기
- Discord REST 호출 유틸

### `src/commands`

- 슬래시 커맨드 처리
- `/주간계획`
- `/인증`
- `/리더보드`
- `/내계획`
- `/내인증현황`
- `/설정`

### `src/interactions`

- 버튼 처리
- 모달 제출 처리

### `src/services`

- 계획 생성 서비스
- 인증 생성 서비스
- 리더보드 계산 서비스
- 리마인더 발송 서비스
- 설정 관리 서비스

### `src/db`

- D1 쿼리 래퍼
- 마이그레이션
- 저장소 함수

### `src/domain`

- 날짜 계산
- 주간 범위 계산
- 달성률 계산
- 정렬 규칙

## 9. 데이터베이스 설계

### 설계 원칙

- 문자열 PK보다 숫자/UUID 중심
- Discord 식별자는 컬럼으로 명확히 분리
- 집계 쿼리가 단순해야 함
- 타임존과 날짜 계산은 저장 시점보다 조회 정책에서 통제

### 테이블 1: `guild_settings`

- `guild_id` TEXT PRIMARY KEY
- `timezone` TEXT NOT NULL DEFAULT `Asia/Seoul`
- `plan_reminder_channel_id` TEXT
- `checkin_channel_id` TEXT
- `leaderboard_channel_id` TEXT
- `plan_reminder_time` TEXT
- `checkin_reminder_time` TEXT
- `leaderboard_publish_time` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### 테이블 2: `users`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `discord_user_id` TEXT NOT NULL
- `display_name_snapshot` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

제약:

- UNIQUE (`guild_id`, `discord_user_id`)

### 테이블 3: `weekly_plans`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `discord_user_id` TEXT NOT NULL
- `week_start_date` TEXT NOT NULL
- `week_end_date` TEXT NOT NULL
- `goal_text` TEXT NOT NULL
- `target_count` INTEGER NOT NULL
- `status` TEXT NOT NULL DEFAULT `active`
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

권장 제약:

- UNIQUE (`guild_id`, `discord_user_id`, `week_start_date`)

### 테이블 4: `daily_checkins`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `guild_id` TEXT NOT NULL
- `discord_user_id` TEXT NOT NULL
- `weekly_plan_id` INTEGER NOT NULL
- `checkin_date` TEXT NOT NULL
- `content` TEXT NOT NULL
- `proof_url` TEXT
- `created_at` TEXT NOT NULL

권장 제약:

- UNIQUE (`guild_id`, `discord_user_id`, `checkin_date`)

### 인덱스 초안

- `idx_weekly_plans_guild_week`
- `idx_weekly_plans_user_week`
- `idx_daily_checkins_weekly_plan_id`
- `idx_daily_checkins_guild_date`

## 10. 핵심 비즈니스 규칙

### 시간 정책

- 기본 타임존은 `Asia/Seoul`
- 주 시작일은 월요일
- 주 종료일은 일요일

### 계획 정책

- 한 유저는 주당 하나의 계획만 가진다.
- 목표 횟수는 양의 정수만 허용한다.
- 이미 해당 주 계획이 존재하면 수정 또는 덮어쓰기 정책을 적용한다.

### 인증 정책

- 하루 인증은 기본 1회만 허용한다.
- 인증은 같은 주의 계획에만 연결된다.
- 계획이 없는 상태에서 인증하면 실패시키거나 먼저 계획 작성을 유도한다.

### 리더보드 정책

- 기본 정렬 기준은 달성률 내림차순
- 2차 정렬 기준은 인증 횟수 내림차순
- 3차 정렬 기준은 가장 빠른 달성 시각 또는 생성 시각

## 11. Discord UX 설계

### 명령어 초안

- `/주간계획`
- `/인증`
- `/리더보드`
- `/내계획`
- `/내인증현황`
- `/설정`

### 버튼 초안

- `계획 작성`
- `오늘 인증`
- `이번 주 리더보드 보기`

### 모달 초안

#### 주간 계획 모달

- 목표 내용
- 목표 횟수

#### 일일 인증 모달

- 오늘 한 일
- 참고 링크 또는 메모

### 응답 원칙

- 사용자 입력 결과는 가능하면 ephemeral 응답 사용
- 리더보드/리마인더는 채널 공개 메시지 사용

## 12. 스케줄 계획

### 기본 스케줄

- 월요일 09:00 KST: 계획 작성 리마인더
- 화요일~일요일 21:00 KST: 인증 리마인더
- 일요일 23:00 KST: 주간 리더보드 게시

### 운영 메모

- Cron Trigger는 UTC 기준
- KST 기준 시간은 UTC 표현으로 변환 필요
- 추후 서버별 시간 설정 시 `guild_settings`를 읽어 다중 길드 처리

## 13. 구현 로드맵

### Phase 1. 프로젝트 부트스트랩

목표:

- Worker 프로젝트 생성
- TypeScript 설정
- Wrangler 설정
- 로컬 실행 확인

산출물:

- `wrangler.jsonc` 또는 `wrangler.toml`
- `tsconfig.json`
- 기본 Worker 엔트리포인트

### Phase 2. Discord 기초 연동

목표:

- Discord 서명 검증
- Ping/기본 명령 처리
- 명령 등록 스크립트 설계

산출물:

- Interaction 검증 로직
- `/ping` 또는 `/리더보드` 기본 응답

### Phase 3. D1 스키마 구축

목표:

- 마이그레이션 파일 작성
- Repository 계층 작성
- 기본 CRUD 검증

산출물:

- D1 migration SQL
- 설정/계획/인증 테이블

### Phase 4. 계획 기능 구현

목표:

- `/주간계획`
- 계획 작성 버튼
- 계획 모달 제출 처리

산출물:

- 계획 생성/조회/수정 로직

### Phase 5. 인증 기능 구현

목표:

- `/인증`
- 인증 버튼
- 인증 모달 제출 처리

산출물:

- 일일 인증 저장 로직
- 중복 인증 방지

### Phase 6. 리더보드 구현

목표:

- 달성률 집계 SQL
- `/리더보드`
- `/내인증현황`

산출물:

- 집계 서비스
- 포맷된 응답 메시지

### Phase 7. 스케줄 자동화

목표:

- Cron Trigger 구성
- 계획 리마인더
- 인증 리마인더
- 자동 주간 리더보드

산출물:

- `scheduled` 핸들러
- 스케줄 분기 로직

### Phase 8. 관리자 설정

목표:

- `/설정`
- 채널/시간/타임존 설정

산출물:

- 길드 설정 저장/조회 로직

### Phase 9. 안정화

목표:

- 에러 메시지 정리
- 로그 정리
- 문서 정리

## 14. 테스트 계획

### 최소 테스트 범위

- Discord 서명 검증 단위 테스트
- 주간 날짜 계산 테스트
- 하루 중복 인증 방지 테스트
- 리더보드 계산 테스트
- 스케줄 분기 테스트

### 수동 검증 항목

- 계획 버튼 클릭 시 모달 오픈
- 계획 제출 후 D1 저장
- 인증 제출 후 중복 제한 동작
- `/리더보드` 응답 포맷
- Cron 실행 시 지정 채널 게시

## 15. 운영 및 보안

### 환경변수 초안

- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`

### 보안 원칙

- Discord 요청은 반드시 서명 검증
- 토큰은 Worker secret으로 관리
- 관리자 명령은 권한 검증 필요

### 로깅 원칙

- Interaction 타입
- 명령어명
- guild_id
- user_id
- 에러 메시지

민감정보는 로그에 남기지 않는다.

## 16. 예상 리스크

### 리스크 1. 초기 Discord 등록 절차 복잡성

대응:

- 앱 생성, 공개키, 토큰, 엔드포인트 설정 절차를 별도 문서화

### 리스크 2. Cron과 KST 시간 변환 실수

대응:

- UTC 기준 표를 문서에 명시
- 날짜 계산 유틸을 분리

### 리스크 3. Worker 호환성 낮은 패키지 사용

대응:

- Worker 친화적 패키지 우선 사용
- Node 전용 의존성 최소화

### 리스크 4. 장기 운영 중 요구사항 증가

대응:

- 서비스 계층과 DB 계층을 분리해서 확장성 확보

## 17. 현재 즉시 실행할 결정

이번 계획서 기준으로 다음 항목은 확정한다.

- 프로젝트 이름은 `LoopTop DiscordBot`
- 기술 식별자는 `looptop-discord-bot`
- 구현 언어는 `TypeScript`
- 런타임은 `Cloudflare Workers`
- 저장소는 `Cloudflare D1`
- 스케줄은 `Cloudflare Cron Triggers`
- MVP에 자동 리마인더와 자동 주간 리더보드를 포함한다

## 18. 바로 다음 작업

1. Worker 프로젝트 초기화
2. Wrangler 설정
3. D1 데이터베이스 생성 전제 구조 작성
4. Discord Interaction 기본 엔드포인트 구현
5. 기본 명령어 등록 구조 추가
6. 초기 SQL 마이그레이션 작성
