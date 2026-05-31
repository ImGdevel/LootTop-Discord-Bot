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
- Worker secret 3개 등록 완료
- Husky PR #2 리뷰 반영: AI attribution 정규식 오탐 수정

## 다음 작업

- Phase 4: `/설정` 관리자 커맨드, GuildSettingsService
- Phase 5: `/주간계획`, PlanService
- Phase 6: `/인증`, CheckinService
- Phase 7: 리더보드, LeaderboardService
- Phase 8: Cron 자동화, ReminderService
- Phase 9: 안정화
