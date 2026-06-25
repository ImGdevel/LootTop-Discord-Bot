# LootTop Discord Bot 운영 메모

이 문서는 `C:\Users\imdls\workspace\Project\Discode\LootTop Discord Bot` 전용 운영 메모다. 워크스페이스 전역 규칙은 상위 `C:\Users\imdls\workspace\CLAUDE.md`를 따른다.

## 현재 운영 방식

이 리포는 Cloudflare Workers + D1 기반이며, 별도 상시 서버 없이 로컬 확인 후 바로 배포하는 흐름이다.

설치와 실행은 다음 순서를 따른다.

1. 의존성 설치: `npm ci`
2. 로컬 실행: `npm run dev`
3. 환경 변수 등록: `.env.discord`를 사용하고, 배포용 비밀값은 `scripts/register-secrets.mjs` 또는 `npx wrangler secret put ...`로 Cloudflare에 반영한다.
4. D1 마이그레이션:
   - 로컬: `npx wrangler d1 execute looptop-discord-bot --local --file=migrations/0001_initial_schema.sql`
   - 원격: `npx wrangler d1 execute looptop-discord-bot --file=migrations/0001_initial_schema.sql`
5. 디스코드 명령어 등록: `npm run register`
6. 배포:
   - 단순 배포: `npm run deploy`
   - 운영 전체 반영: `npm run ship`

## 명령어 등록 규칙

- 전역 슬래시 명령어는 `npm run register`로 등록한다.
- 테스트 서버에 즉시 반영해야 하면 `.env.discord`에 `DISCORD_GUILD_ID`를 넣고 `npm run register`를 다시 실행한다.
- `DISCORD_GUILD_ID`가 있으면 `PUT /applications/{app_id}/guilds/{guild_id}/commands`로 길드 전용 명령어를 주입하고, 없으면 `PUT /applications/{app_id}/commands`로 글로벌 명령어를 등록한다.
- 현재 별도 staging 환경은 두지 않았고, 로컬 검증 후 prod 반영하는 구조다.

## 배포 확인 포인트

- 자동 작업은 Worker 내부 Cron Trigger로 처리한다.
- `/버전` 명령어로 현재 Worker Version ID, 태그, 업로드 시각을 확인한다.
