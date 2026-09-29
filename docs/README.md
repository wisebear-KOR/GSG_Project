# 문서

**말씀이 있으라 — Let There Be** (코드명 GSG)의 모든 문서. Godot 4로 옮길 사람은 [읽는 순서](#godot으로-옮길-때-읽는-순서)부터.

## 명세 — 웹판을 엔진과 무관하게 옮긴 것 (`spec/`)

| 문서 | 내용 |
|---|---|
| [01 개요](spec/01-overview.md) | 게임 한 줄, 설계 기둥, 한 장의 루프, 판 크기, **한↔영↔코드 용어집** |
| [02 규칙](spec/02-rules.md) | 맵 생성, 장 진행 순서, 행동과 주사위, 율법파(오토마), 교리, 기적, 사건·갈림길, 율법 석판, 대성당, 소명, 승패 |
| [03 데이터](spec/03-data.md) | 데이터 표 스키마. 실제 값은 [`export/data.json`](export/data.json) |
| [04 구조](spec/04-architecture.md) | JS 모듈 구조, 상태 객체 필드, 결정론(RNG·해시), 저장 형식, 화면 컨트롤러의 단계 기계 |
| [05 해석기](spec/05-interpreter.md) | 계시 → 명령: LLM 프롬프트·JSON 스키마, 석판(키워드) 파서, 말투·이름·예언·청원·인용·계명·침묵 등 말의 장치 |
| [06 UI/UX](spec/06-ui-ux.md) | 화면 목록, 단계별 제단 UI, 보드 그리기, 디자인 토큰, 연출·소리, 반응형, 접근성, 튜토리얼 |
| [07 진행](spec/07-progression.md) | 판 밖의 진행: 저장 키, 서고, 경외·은사, 성서(업적), 정경, 오늘의 계시, 시련, 승천, 도전 링크 |

## Godot 이식

| 문서 | 내용 |
|---|---|
| [이식 가이드](godot/PORTING.md) | 프로젝트 구조, 모듈 대응표, **비트 단위 결정론 코드(GDScript)**, 골든 테스트, 언어팩·LLM·화면·소리 이식 방법, 단계별 순서 |
| [알려진 문제](godot/KNOWN-ISSUES.md) | 명세를 쓰며 찾은 현재 웹판의 버그·이상 동작과 이식 때 정할 것 (먼저 재현, 그다음 함께 고친다) |
| [export/](export/README.md) | 이식용으로 뽑은 자료: `data.json`, `i18n-ko.json`, `golden/`(결정론 판 기록), `svg/`(그림 47개) |

## 설계 기록

| 문서 | 내용 |
|---|---|
| [DESIGN.md](DESIGN.md) | 첫 기획 문서 (초기 설계 — 지금 규칙은 `spec/02-rules.md`가 기준) |
| [tickets/](tickets/README.md) | 재미를 위한 101 티켓 (완료 96 · 폐기 5): 기능마다 설계 이유와 관점별 검토 기록, 웨이브별 검토 요약 |
| [EXPERIMENTS.md](EXPERIMENTS.md) | 대사제(LLM) 프롬프트 실험 기록 |
| [PLAYTEST-2026-09-27.md](PLAYTEST-2026-09-27.md) | LLM 모드 4판 플레이테스트 보고서 |
| [EVALUATION-2026-09-30.md](EVALUATION-2026-09-30.md) | 보드게임 장르 평가: 독립 평가자 셋의 채점(평균 54.7/100), 지배 전략·오토마·해석 이해력 데이터, 개선 순위 |
| [i18n.md](i18n.md) | 언어팩 구조, 새 언어 더하는 법, 언어별로 새로 써야 하는 키 |
| [naming.md](naming.md) | 제목 후보 12개와 결정 이유 |

## Godot으로 옮길 때 읽는 순서

1. [01 개요](spec/01-overview.md) — 무엇을 만드는지, 용어
2. [이식 가이드](godot/PORTING.md) — 어떻게 옮기고 어떻게 검증하는지, [알려진 문제](godot/KNOWN-ISSUES.md)
3. [04 구조](spec/04-architecture.md) → [02 규칙](spec/02-rules.md) → [03 데이터](spec/03-data.md) — 엔진 이식 (골든 테스트로 확인)
4. [05 해석기](spec/05-interpreter.md) — 석판 파서, LLM 선택
5. [06 UI/UX](spec/06-ui-ux.md) → [07 진행](spec/07-progression.md) — 화면과 메타
6. 궁금한 기능은 [tickets/](tickets/README.md)에서 그 기능이 왜 그렇게 생겼는지 찾는다

## 도구 (`tools/`)

| 명령 | 하는 일 |
|---|---|
| `node tools/i18n-check.mjs [--keys]` | 코드에 남은 한글, 언어팩끼리 빠진 키 |
| `node tools/export-data.mjs` | `export/data.json`, `export/i18n-ko.json` 다시 만들기 |
| `node tools/golden.mjs` | `export/golden/` 결정론 판 기록 다시 만들기 |
| `node tools/export-svg.mjs` | `export/svg/` 그림 심볼 다시 뽑기 (미리보기 페이지에서 PNG로 받기) |
| `node tools/tests/det.mjs` · `fuzz.mjs` | 결정론 검사, 봇 퍼징 ([tools/tests](../tools/tests/README.md)) |

> 문서는 2026-09-27 커밋 기준이다. 규칙이나 화면을 바꾸면 해당 명세와 `export/`를 함께 갱신한다. 코드와 문서가 다르면 코드가 기준이다.
