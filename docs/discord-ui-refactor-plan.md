# Discord UI Refactor Plan

## 목적

현재 코드베이스는 기능 단위 구현은 진행되었지만, UX 중심 구조로는 아직 충분히 정리되지 않았다.

이 문서는 다음 목표를 가진다.

- 카드형 UI 중심 구조로 재편
- command-first 구조를 dashboard-first 구조로 변경
- 기능 로직과 UI 렌더링 로직 분리

## 현재 구조의 문제

- `commands`, `interactions`, `services`는 존재하지만 UI 조립 책임이 분산되어 있다.
- 각 핸들러가 Discord 응답 포맷을 직접 구성한다.
- `홈 화면` 개념이 없다.
- 메시지 갱신, 페이지 전환, 상태 흐름을 공통으로 다루는 계층이 없다.

## 목표 구조

### 추천 디렉토리 구조

```text
src/
  commands/
  interactions/
  services/
  ui/
    dashboards/
    cards/
    modals/
    components/
    formatters/
  flows/
  state/
```

## 역할 정의

### `services/`

책임:

- 비즈니스 로직
- DB 읽기/쓰기
- 검증
- 집계

예:

- `plan.service.ts`
- `checkin.service.ts`
- `leaderboard.service.ts`
- `reminder.service.ts`

### `ui/cards/`

책임:

- Discord 카드형 메시지 payload 생성
- Container/Section/Text Display/Button 조합

예:

- `study-home.card.ts`
- `plan-summary.card.ts`
- `checkin-summary.card.ts`
- `leaderboard.card.ts`
- `settings.card.ts`

### `ui/modals/`

책임:

- 모달 payload 생성
- 단계별 폼 생성

예:

- `plan-write.modal.ts`
- `checkin-submit.modal.ts`
- `settings-time.modal.ts`

### `flows/`

책임:

- 다단계 UX 흐름 관리
- 이전 단계 결과 기반 다음 UI 결정

예:

- `plan.flow.ts`
- `checkin.flow.ts`
- `settings.flow.ts`
- `leaderboard.flow.ts`

### `state/`

책임:

- 메시지 페이지 번호
- 현재 선택한 필터
- 다단계 wizard 임시 상태
- custom_id 인코딩/디코딩

예:

- `custom-id.ts`
- `interaction-state.ts`

## 리팩터링 단계

### Phase A. UI 빌더 분리

목표:

- 핸들러에서 직접 문자열과 컴포넌트를 조립하지 않도록 변경

작업:

- `ui/cards` 추가
- `ui/modals` 추가
- 기존 `sendFollowup` 호출 전에 payload builder를 거치게 변경

완료 기준:

- `plan`, `checkin`, `leaderboard`, `settings` 모두 별도 UI builder 사용

### Phase B. 홈 대시보드 도입

목표:

- 고정 홈 메시지를 프로젝트의 메인 진입점으로 전환

작업:

- `/홈` 커맨드 추가
- 홈 카드 렌더러 추가
- 관리자 전용 초기화 명령 추가

완료 기준:

- 사용자가 홈 메시지에서 대부분의 작업을 시작 가능

### Phase C. 플로우 계층 도입

목표:

- 버튼/모달/페이지 이동을 기능별 흐름으로 정리

작업:

- `flows/plan.flow.ts`
- `flows/checkin.flow.ts`
- `flows/settings.flow.ts`
- `flows/leaderboard.flow.ts`

완료 기준:

- router는 흐름 진입만 담당
- 세부 분기 로직은 flow 계층으로 이동

### Phase D. custom_id 설계 정규화

목표:

- 현재 단순 문자열 기반 `custom_id`를 상태 포함 포맷으로 정규화

제안 포맷:

```text
feature:action:scope:page:entity
```

예:

- `home:open:member:1:root`
- `plan:write:member:1:self`
- `leaderboard:view:member:2:weekly`
- `settings:edit:admin:1:timezone`

완료 기준:

- 버튼/셀렉트/모달 제출 모두 공통 파서 사용

### Phase E. 메시지 업데이트 전략 통일

목표:

- followup 남발 대신 `edit original response` 또는 동일 카드 갱신 전략 수립

작업:

- 응답 유형 정책 문서화
- ephemeral/public 사용 기준 정리

기본 정책:

- 개인 입력 결과: ephemeral
- 홈/리더보드/리마인더: public
- 페이지 이동: 기존 메시지 수정 우선

## 우선 구현 순서

실제 작업 순서는 아래가 적절하다.

1. `ui/cards`, `ui/modals` 도입
2. `스터디 홈 카드` 구현
3. `leaderboard` 카드형 페이지 구현
4. `settings` 단계형 흐름 구현
5. `checkin` 파일 업로드/선택형 모달 확장

## 리스크

- Discord 컴포넌트 제약으로 인해 과도한 레이아웃 자유도는 불가능하다.
- 모달 1회 입력량 제한 때문에 긴 폼은 단계 분할이 필요하다.
- 카드형 구조는 좋아지지만 상태 관리가 복잡해질 수 있다.

## 완료 기준

다음 조건을 만족하면 UI 리팩터링 1차 완료로 본다.

- 사용자가 명령어 없이 홈 메시지에서 계획/인증/리더보드/설정에 진입 가능
- 주요 응답이 카드형 메시지로 통일됨
- 모달 생성이 기능별 builder로 분리됨
- router가 복잡한 UI 조립 책임을 가지지 않음

