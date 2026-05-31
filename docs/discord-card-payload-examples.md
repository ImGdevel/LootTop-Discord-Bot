# Discord Card Payload Examples

## 목적

이 문서는 LoopTop Discord Bot V2에서 사용할 카드형 Discord 메시지 payload 시안을 정의한다.

전제:

- 최신 Discord 컴포넌트 기반 메시지 사용
- payload는 설계 시안이며 실제 구현 시 필드 제약에 맞춰 조정 가능
- `custom_id`, 링크, 아이콘은 예시다

## 1. 목표 카드 시안

용도:

- `#목표` 포럼 글 안의 사용자 목표 카드

```json
{
  "flags": 32768,
  "components": [
    {
      "type": 17,
      "accent_color": 3447003,
      "components": [
        {
          "type": 10,
          "content": "## 이번 주 목표\\n### @imdls\\n5월 4주차 (5/20 ~ 5/26)"
        },
        {
          "type": 14,
          "divider": true,
          "spacing": 1
        },
        {
          "type": 9,
          "components": [
            {
              "type": 10,
              "content": "**데일리 목표**\\n- 9시 기상\\n- 6시간 공부\\n- 독서 30분"
            },
            {
              "type": 11,
              "media": {
                "url": "https://cdn.discordapp.com/embed/avatars/0.png"
              }
            }
          ]
        },
        {
          "type": 9,
          "components": [
            {
              "type": 10,
              "content": "**인증 방식**\\n- 9시 기상: 체크\\n- 6시간 공부: 사진\\n- 독서 30분: 텍스트"
            },
            {
              "type": 2,
              "style": 2,
              "label": "목표 수정",
              "custom_id": "goal:edit:self"
            }
          ]
        },
        {
          "type": 10,
          "content": "**휴식일**\\n토요일, 일요일"
        }
      ]
    }
  ]
}
```

## 2. 인증 카드 시안

용도:

- `#인증` 일일 쓰레드 안의 사용자 인증 카드

```json
{
  "flags": 32768,
  "components": [
    {
      "type": 17,
      "accent_color": 5763719,
      "components": [
        {
          "type": 10,
          "content": "## 오늘의 인증\\n### @imdls\\n5월 29일 22:14 제출"
        },
        {
          "type": 14,
          "divider": true,
          "spacing": 1
        },
        {
          "type": 9,
          "components": [
            {
              "type": 10,
              "content": "**완료한 항목**\\n- 9시 기상: 완료\\n- 6시간 공부: 완료\\n- 독서 30분: 미제출"
            },
            {
              "type": 2,
              "style": 1,
              "label": "추가 인증",
              "custom_id": "checkin:submit:self"
            }
          ]
        },
        {
          "type": 10,
          "content": "**세부 내용**\\n- 6시간 공부: 오늘 총 6시간 40분 공부\\n- 독서 30분은 아직 진행 전"
        },
        {
          "type": 12,
          "items": [
            {
              "media": {
                "url": "https://example.com/checkin-photo-1.jpg"
              }
            }
          ]
        },
        {
          "type": 10,
          "content": "**참고 링크**\\nhttps://example.com/study-log"
        }
      ]
    }
  ]
}
```

## 3. 리더보드 카드 시안

용도:

- `#리더보드` 주간 포럼 글의 첫 메시지

```json
{
  "flags": 32768,
  "components": [
    {
      "type": 17,
      "accent_color": 15844367,
      "components": [
        {
          "type": 10,
          "content": "## 5월 4주차 리더보드\\n5/20 ~ 5/26\\n참여자 14명 · 평균 달성률 74%"
        },
        {
          "type": 14,
          "divider": true,
          "spacing": 1
        },
        {
          "type": 9,
          "components": [
            {
              "type": 10,
              "content": "**Top 3**\\n1. imdls - 100%\\n2. alice - 92%\\n3. bob - 88%"
            },
            {
              "type": 11,
              "media": {
                "url": "https://cdn.discordapp.com/emojis/123456789012345678.png"
              }
            }
          ]
        },
        {
          "type": 9,
          "components": [
            {
              "type": 10,
              "content": "**Bottom 3**\\n12. dave - 31%\\n13. erin - 18%\\n14. frank - 0%"
            },
            {
              "type": 2,
              "style": 2,
              "label": "내 순위 보기",
              "custom_id": "leaderboard:view:self"
            }
          ]
        },
        {
          "type": 14,
          "divider": true,
          "spacing": 1
        },
        {
          "type": 10,
          "content": "**전체 순위**\\n1. imdls 100% (12/12)\\n2. alice 92% (11/12)\\n3. bob 88% (14/16)\\n4. carol 83% (10/12)\\n..."
        }
      ]
    }
  ]
}
```

## 4. 목표 포럼 글 첫 메시지 시안

용도:

- 매주 생성되는 `#목표` 포럼 글의 시작 카드

```json
{
  "flags": 32768,
  "components": [
    {
      "type": 17,
      "accent_color": 10181046,
      "components": [
        {
          "type": 10,
          "content": "## 이번 주 목표 작성\\n5월 4주차 (5/20 ~ 5/26)\\n이번 주 데일리 목표를 작성해 주세요."
        },
        {
          "type": 10,
          "content": "기본 휴식일은 토요일, 일요일입니다. 필요하면 작성 중 변경할 수 있습니다."
        },
        {
          "type": 9,
          "components": [
            {
              "type": 10,
              "content": "**무엇을 작성하나요?**\\n- 데일리 목표 항목\\n- 항목별 인증 방식\\n- 휴식일"
            },
            {
              "type": 2,
              "style": 1,
              "label": "내 목표 작성",
              "custom_id": "goal:create:self"
            }
          ]
        }
      ]
    }
  ]
}
```

## 5. 일일 인증 쓰레드 첫 메시지 시안

용도:

- 매일 생성되는 `#인증` 쓰레드의 시작 카드

```json
{
  "flags": 32768,
  "components": [
    {
      "type": 17,
      "accent_color": 3066993,
      "components": [
        {
          "type": 10,
          "content": "## 5월 29일 인증\\n오늘 완료한 목표 항목만 선택해서 인증해 주세요."
        },
        {
          "type": 10,
          "content": "마감 시각: 5월 30일 04:00"
        },
        {
          "type": 9,
          "components": [
            {
              "type": 10,
              "content": "**인증 안내**\\n- 오늘 수행한 항목만 제출 가능\\n- 같은 날 여러 번 추가 인증 가능"
            },
            {
              "type": 2,
              "style": 1,
              "label": "오늘 인증",
              "custom_id": "checkin:submit:self"
            }
          ]
        }
      ]
    }
  ]
}
```

## 6. 구현 메모

- 실제 Discord API 적용 시 `IS_COMPONENTS_V2` 플래그 사용 여부를 구현 코드에서 통일해야 한다.
- 이미지/첨부는 Discord 업로드 후 attachment URL 또는 CDN URL 참조 방식으로 맞춘다.
- `custom_id`는 flow/state를 포함하는 규칙으로 통일하는 것이 좋다.

