# Cloudflare D1 설정 및 운영 가이드

## 1. D1이란?
Cloudflare Workers에서 사용하는 서버리스 SQLite DB. `env.DB`로 바인딩해 사용.

## 2. 현재 DB 정보 (이미 생성됨)

| 항목 | 값 |
|------|-----|
| Database Name | `looptop-discord-bot` |
| Database ID | `dee30c0b-e42e-4152-81ad-661724ee722e` |
| Region | APAC (싱가포르) |

새로 만들 경우:
```bash
npx wrangler d1 create looptop-discord-bot
# 출력된 database_id를 wrangler.jsonc에 복사
```

## 3. 마이그레이션 적용

```bash
# 로컬 (개발용, 실제 D1에 반영 안 됨)
npx wrangler d1 execute looptop-discord-bot --local --file=migrations/0001_initial_schema.sql

# 실제 D1 (프로덕션)
npx wrangler d1 execute looptop-discord-bot --file=migrations/0001_initial_schema.sql
```

적용 확인:
```bash
npx wrangler d1 execute looptop-discord-bot --command="SELECT name FROM sqlite_master WHERE type='table';"
```

## 4. 직접 SQL 실행

```bash
npx wrangler d1 execute looptop-discord-bot --command="SELECT * FROM guild_settings;"
```

## 5. 스키마 변경

기존 파일 수정 금지. 새 파일을 추가한다:
```
migrations/0002_변경내용.sql
```
```bash
npx wrangler d1 execute looptop-discord-bot --file=migrations/0002_변경내용.sql
```

## 6. Worker Secret 등록

```bash
npx wrangler login                       # 최초 1회
node scripts/register-secrets.mjs        # .env.discord 읽어서 자동 등록
```

수동: `npx wrangler secret put DISCORD_BOT_TOKEN`
확인: `npx wrangler secret list`

> `.env.discord`는 절대 git 커밋 금지 (`.gitignore`에 포함됨)

## 7. 마이그레이션 이력

| 번호 | 파일 | 적용일 | 내용 |
|------|------|--------|------|
| 0001 | `0001_initial_schema.sql` | 2026-05-31 | 초기 스키마 (4테이블+5인덱스) |
