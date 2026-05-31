# LoopTop DiscordBot 진행 기록

## 환경 정보

| 항목 | 값 |
|------|-----|
| Cloudflare Account ID | `34924e429d4c38231d7022a285679e0d` |
| D1 Database ID | `dee30c0b-e42e-4152-81ad-661724ee722e` |
| D1 Region | APAC (SIN) |
| Discord Application ID | `1510463762837147668` |

## 완료된 작업

- Phase 1: 프로젝트 부트스트랩 (package.json, tsconfig, wrangler.jsonc)
- Phase 2: Discord 기초 연동 (verify, response, router, definitions, handlers)
- PR #1 리뷰 반영: Ed25519 버그, botToken 제거, 매직 넘버 상수화
- Phase 3: D1 스키마 (4테이블+5인덱스, D1 실제 적용), Repository 계층 4개
- Phase 4: `/설정` 관리자 커맨드, GuildSettingsService, 길드 설정 조회/수정 플로우
- Worker secret 3개 등록 완료
- Worker 배포 완료 및 Discord Interactions Endpoint URL 등록 완료
- Husky PR #2 리뷰 반영: AI attribution 정규식 오탐 수정
- Phase 5: `/주간계획`, `btn_plan_write` 버튼, `modal_plan_write` 모달, PlanService
- Phase 6: `/인증`, `btn_checkin_today` 버튼, `modal_checkin_today` 모달, CheckinService
- Phase 7: `/리더보드`, `/내계획`, `/내인증현황`, LeaderboardService

## 다음 작업

- Phase 8: Cron 자동화, ReminderService
- Phase 9: 안정화

## 배포 및 Discord 연동

### Worker 배포 완료

- URL: `https://looptop-discord-bot.imdlsrks-mc.workers.dev`
- Cron: `0 0 * * 1` / `0 12 * * 2-7` / `0 14 * * 7` (UTC)
- 주의: Cloudflare Cron은 요일 `0`(일요일)을 지원 안 함 -> `7` 사용

### Discord Interactions Endpoint URL 등록 완료

- General Information -> Interactions Endpoint URL에 Worker URL 등록
- PING/PONG 검증 통과

### 트러블슈팅 기록: Ed25519 서명 검증 실패

- 원인: Gemini PR 리뷰가 `namedCurve` 제거를 제안했지만, Cloudflare Workers Web Crypto API에서 Ed25519 `importKey` 시 `namedCurve: "Ed25519"`가 필요함
- 또 다른 원인: `verify()` 호출 시 문자열 `"Ed25519"` 대신 객체 `{ name: "Ed25519" }` 형식 사용 필요
- 해결: [src/discord/verify.ts](C:/Users/imdls/workspace/LootTop%20Discord%20Bot/src/discord/verify.ts) 수정

```typescript
// importKey
{ name: "Ed25519", namedCurve: "Ed25519" }

// verify
{ name: "Ed25519" }
```

- 추가: `DISCORD_PUBLIC_KEY` secret을 `wrangler secret put`으로 직접 재등록. Windows에서 기존 echo 파이프 방식은 따옴표가 섞일 수 있어 stdin 전달 방식으로 정리함
