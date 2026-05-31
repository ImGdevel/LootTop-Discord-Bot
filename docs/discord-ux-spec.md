# Discord UX Spec

## 목적

이 문서는 Discord가 현재 제공하는 공식 컴포넌트 범위 안에서 LoopTop Discord Bot의 목표 UX를 구체화한다.

기준은 Discord 공식 컴포넌트/모달 문서다.

- Components Overview: [https://docs.discord.com/developers/components/overview](https://docs.discord.com/developers/components/overview)
- Component Reference: [https://docs.discord.com/developers/components/reference](https://docs.discord.com/developers/components/reference)
- Using Message Components: [https://docs.discord.com/developers/components/using-message-components](https://docs.discord.com/developers/components/using-message-components)
- Using Modal Components: [https://docs.discord.com/developers/components/using-modal-components](https://docs.discord.com/developers/components/using-modal-components)

## 현재 Discord에서 활용할 수 있는 주요 요소

### 메시지용 구성 요소

- `Container`
- `Section`
- `Text Display`
- `Thumbnail`
- `Media Gallery`
- `Separator`
- `Button`
- `String Select`
- `User Select`
- `Role Select`
- `Mentionable Select`
- `Channel Select`

참고:

- 새 컴포넌트 기반 메시지는 `IS_COMPONENTS_V2` 플래그를 사용한다.
- 이 모드에서는 기존 `content`와 `embeds` 대신 컴포넌트 중심으로 메시지를 구성한다.
- 메시지당 최대 40개 컴포넌트를 사용할 수 있다.

## 모달에서 활용할 수 있는 주요 요소

- `Label`
- `Text Input`
- `String Select`
- `User Select`
- `Role Select`
- `Mentionable Select`
- `Channel Select`
- `File Upload`
- `Radio Group`
- `Checkbox Group`
- `Checkbox`
- `Text Display`

참고:

- 모달은 상호작용 응답으로 동적으로 생성 가능하다.
- 모달은 top-level 기준 `1~5`개 컴포넌트 제한이 있다.
- 네이티브 `다중 페이지 모달`은 없으므로 단계형 흐름으로 구성해야 한다.

## 가능/불가능 정리

### 가능한 것

- 카드처럼 보이는 블록형 레이아웃
- 메시지 안의 요약 정보 + 액션 버튼 결합
- 사용자/채널/역할 선택 UI
- 라디오/체크박스 기반 폼
- 파일 업로드가 포함된 인증 모달
- 조건에 따라 다른 모달을 여는 동적 흐름
- 메시지를 갱신하며 페이지를 넘기는 wizard 스타일 UX

### 불가능하거나 제한적인 것

- HTML/CSS처럼 완전 자유로운 커스텀 레이아웃
- 무한 길이의 단일 모달
- 네이티브 탭 UI
- 네이티브 멀티페이지 모달
- 브라우저 SPA 수준의 자유 상태 관리

## LoopTop 전용 UX 설계

### 1. 스터디 홈 카드

구조:

- Container
- Text Display: 제목, 주간 기간, 설명
- Separator
- Section: 이번 주 요약
- Section: 내 상태 요약
- Section: 오늘 액션
- Action row/button 영역

표시 정보:

- 이번 주 기간
- 참여자 수
- 계획 작성 완료 인원
- 오늘 인증 완료 인원
- 내 계획 작성 여부
- 내 오늘 인증 여부

액션:

- `계획 작성`
- `오늘 인증`
- `내 현황`
- `리더보드`
- `새로고침`
- `서버 설정`

### 2. 계획 작성 UX

권장 흐름:

1. 홈 카드에서 `계획 작성`
2. 1차 모달에서 목표 텍스트, 목표 횟수 입력
3. 제출 후 확인 카드 표시
4. 필요하면 `수정` 버튼 제공

확장 가능 요소:

- Radio Group으로 목표 타입 선택
- Checkbox Group으로 주중 목표 요일 선택
- String Select로 템플릿 목표 선택

### 3. 일일 인증 UX

권장 흐름:

1. 홈 카드에서 `오늘 인증`
2. 모달에서 인증 내용 입력
3. 필요 시 파일 업로드 또는 링크 첨부
4. 제출 후 내 현황 카드 갱신

모달 제안:

- Text Input: 오늘 한 일
- Text Input 또는 String Select: 인증 카테고리
- File Upload: 첨부 자료
- Checkbox: 공개 리더보드에 세부 내용 표시 허용 여부

### 4. 리더보드 UX

권장 흐름:

1. 홈 카드에서 `리더보드`
2. 카드형 랭킹 메시지 표시
3. 버튼으로 페이지 전환

버튼:

- `Top 10`
- `내 주변`
- `팀 통계`
- `이번 주`
- `지난 주`

표시 방식:

- 순위
- 이름
- 달성률
- 누적 인증 수
- 진행 바 스타일 텍스트

### 5. 관리자 설정 UX

권장 흐름:

1. 홈 카드에서 `서버 설정`
2. 설정 카드 오픈
3. 항목별 버튼 또는 셀렉트 메뉴 진입
4. 변경이 필요한 부분만 모달로 입력

권장 구성:

- Channel Select: 계획/인증/리더보드 채널 지정
- String Select: 변경할 설정 항목 선택
- Text Input: 시간 직접 입력
- Radio Group: 기본 정책 선택

## 다단계 Wizard 설계

Discord는 네이티브 멀티페이지 모달을 제공하지 않으므로 다음 방식으로 구현한다.

### 방식 A. 메시지 페이지 전환

1. 카드 메시지 표시
2. `다음` 버튼 클릭
3. 같은 메시지를 다음 단계 내용으로 edit
4. 마지막 단계에서 저장

장점:

- 현재 단계가 명확함
- 사용자가 이전 단계로 돌아가기 쉬움

### 방식 B. 메시지 + 모달 혼합

1. 카드에서 설정 항목 선택
2. 필요한 항목만 모달 오픈
3. 제출 후 다시 요약 카드 갱신
4. 다음 액션 버튼 표시

장점:

- 긴 폼을 여러 개의 짧은 상호작용으로 분할 가능
- Discord 사용감에 가장 잘 맞음

### 권장 결론

LoopTop은 `메시지 카드 + 짧은 모달` 조합이 가장 적합하다.

이유:

- 계획/인증/설정은 모두 입력량이 중간 수준이다.
- 길고 복잡한 폼보다 단계형 진행이 오류를 줄인다.
- 모바일 Discord에서도 사용성이 좋다.

## 시각 참고 링크

공식 문서에서 실제 렌더링 예시를 확인할 수 있는 페이지:

- Components Overview: 컴포넌트 UI 예시 이미지 포함
- Component Reference: `Section`, `Container`, `Thumbnail` 예시 포함
- Using Modal Components: 실제 모달 JSON 예시 포함

직접 보기:

- [Components Overview](https://docs.discord.com/developers/components/overview)
- [Component Reference](https://docs.discord.com/developers/components/reference)
- [Using Modal Components](https://docs.discord.com/developers/components/using-modal-components)

## 최종 권장안

MVP 이후 첫 UX 개편은 다음 순서로 진행한다.

1. `/홈` 또는 자동 생성되는 고정 대시보드 메시지 도입
2. 홈/리더보드/설정 응답을 카드형 컴포넌트 메시지로 전환
3. 입력형 기능을 짧은 단계형 모달로 분해

