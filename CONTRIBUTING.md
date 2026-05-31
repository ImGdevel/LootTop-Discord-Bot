# Contributing

## 개요

이 저장소는 Discord Interactions 기반의 Cloudflare Worker 프로젝트다.

기여 시 다음 원칙을 따른다.

- 기본 브랜치는 `main`
- 작업은 별도 feature 브랜치에서 진행
- 커밋 메시지는 저장소 규칙 준수
- 커밋 전 타입 오류가 없어야 함

## 브랜치 전략

작업 브랜치 형식:

- `feat/scope-description`
- `refactor/scope-description`
- `hotfix/scope-description`

예시:

- `feat/discord-command-routing`
- `refactor/d1-query-structure`
- `hotfix/interaction-signature-check`

직접 `main`에 커밋하지 않는다.

## 커밋 규칙

커밋 제목 형식:

- `<gitmoji> <type>(optional-scope): <한국어 요약>`

예시:

- `✨ feat(worker): Discord Interaction 라우팅 추가`
- `📝 docs(contributing): Husky 기여 가이드 추가`
- `♻️ refactor(commands): 명령어 정의 구조 정리`

주의:

- 타입에 맞는 gitmoji를 함께 사용
- 커밋 제목은 한국어로 작성
- 문장을 `~한다` 형태로 끝내지 않음
- 하나의 커밋에는 하나의 의도만 담음
- 본문은 권장하지만 hook에서 강제하지 않음

## 로컬 개발

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run dev
```

타입 검사:

```bash
npm run type-check
```

명령어 등록:

```bash
npm run register
```

## Husky

이 저장소는 `husky`를 사용해 Git hook을 관리한다.

현재 설정:

- `pre-commit`에서 `npm run validate:repo` 실행
- `pre-commit`에서 `npm run type-check` 실행
- `commit-msg`에서 커밋 메시지 형식 검증 실행

즉, 금지 파일이 staged 되었거나 타입 오류가 있거나 커밋 메시지 형식이 어긋나면 커밋이 차단된다.

### Husky 설치/복구

의존성 설치 후 hook이 잡히지 않으면 다음을 실행한다.

```bash
npm run prepare
```

현재 `package.json`에는 다음 스크립트가 포함되어 있다.

```json
{
  "scripts": {
    "prepare": "husky",
    "validate:repo": "node scripts/validate-repo.mjs",
    "validate:commit-message": "node scripts/validate-commit-message.mjs"
  }
}
```

### 저장소 검증 정책

현재 `validate:repo`는 staged 변경만 검사하며, 다음 파일을 금지한다.

- `.env`
- `.env.*`
- `.env.discord`

예외:

- `.env.example`

### 커밋 메시지 검증 정책

`commit-msg` hook은 다음 규칙을 검사한다.

- 제목은 `gitmoji + type(scope): 한국어 요약`
- 허용 타입: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `hotfix`
- 제목은 한국어 포함
- 제목은 `~한다` 같은 서술형 금지
- `Co-authored-by`, `Codex`, `Claude` 같은 attribution 금지

## 환경 변수

민감 정보는 커밋하지 않는다.

로컬에서는 다음 파일을 사용한다.

- `.env.discord`

이 파일은 git에서 제외되어 있다.

예시 항목:

- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_INTERACTIONS_ENDPOINT_URL`

## Pull Request

PR 작성 규칙:

- 제목은 한국어 기준 작성
- 변경 목적이 드러나야 함
- 본문에는 최소한 `요약`과 `참고`를 포함

예시:

```md
## 요약
- Discord 명령어 처리 구조를 추가합니다.
- Worker 엔트리포인트를 정리합니다.

## 참고
- Interaction 응답은 deferred response 패턴을 사용합니다.
```

## 체크리스트

PR 전 확인:

- `npm run validate:repo` 통과
- `npm run type-check` 통과
- 민감 정보 커밋 여부 확인
- 변경 범위가 하나의 의도로 정리되었는지 확인
- 문서 변경이 필요하면 함께 반영
