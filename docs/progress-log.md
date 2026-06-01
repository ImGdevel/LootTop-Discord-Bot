# LoopTop DiscordBot 진행 기록

## 환경 정보

| 항목 | 값 |
|------|-----|
| Cloudflare Account ID | `34924e429d4c38231d7022a285679e0d` |
| D1 Database ID | `dee30c0b-e42e-4152-81ad-661724ee722e` |
| D1 Region | APAC (SIN) |
| Discord Application ID | `1510463762837147668` |
| Worker URL | `https://looptop-discord-bot.imdlsrks-mc.workers.dev` |

## 현재 아키텍처 (단순화 버전)

**기본 원칙**: Cron 자동화 중심. 사용자 인터페이스는 최소화.

### 채널 구조
- `#스터디-홈`: `/홈` 명령어로 현황 카드 + 인증 버튼
- `#목표` (포럼): 매주 일요일 18:00 자동 생성 (안내 텍스트만, 자유 작성)
- `#인증` (텍스트): 매일 04:00 쓰레드 자동 생성 + "오늘 인증" 버튼
- `#리더보드` (포럼): 매주 월요일 00:00 자동 집계 게시

### 인증 흐름
- "오늘 인증" 버튼 → 모달 (오늘 한 일 Paragraph + 링크 선택)
- 제출 → 쓰레드에 공개 카드 게시 + D1 저장

### 리더보드 기준
- 이번 주 인증 제출 횟수 (단순 count)

## 완료된 작업

- Phase 1-4 (V1): 기본 봇 부트스트랩, Discord 연동, D1 스키마, 설정
- Phase 5-8 (V1): 계획/인증/리더보드/Cron 기본 구현
- V2 전환: 채널 기반 구조, 포럼/쓰레드 자동 생성
- 단순화: 목표 wizard 제거, 인증만 유지, Paragraph 모달

## 다음 작업

- `npx wrangler deploy` 배포
- D1에 migration 0003, 0004 적용: `npx wrangler d1 execute looptop-d1 --file=migrations/0003_goal_wizard_sessions.sql --remote` (필요시)
- `/홈` 명령어로 채널 자동 생성 및 동작 확인

## 트러블슈팅 기록

### Ed25519 서명 검증
- `importKey` 시 `{ name: "Ed25519", namedCurve: "Ed25519" }` 필요
- `verify()` 시 `{ name: "Ed25519" }` 형식

### 파일 truncation (null bytes)
- bash heredoc으로 파일 직접 작성하면 안전함
- Write 툴은 한국어 포함 파일에서 간헐적으로 잘림 발생
