# 결정론·퍼징 검사

웹판 규칙 엔진을 봇으로 수백 판 돌려 불변식을 확인하는 Node 스크립트. 무엇을 확인하는지는 [04 구조 §5.2](../../docs/spec/04-architecture.md)에 있다.

| 명령 | 하는 일 |
|---|---|
| `node tools/tests/det.mjs` | 같은 시드면 덱 순서가 플레이와 무관한지, 저장·복원 뒤에도 결과가 같은지 |
| `node tools/tests/fuzz.mjs [판 수=600] [random\|smart] [시드]` | 무작위/영리한 봇으로 판을 돌리며 불변식 위반(음수 자원, `undefined`/`NaN` 문구, 저장·복원 차이 등)을 모은다. 결과는 `result-<정책>.json` (커밋하지 않는다) |
| `node tools/tests/stats.mjs tools/tests/result-smart.json` | 퍼징 결과의 난이도·맵별 승률 표 |
| `node tools/tests/edge.mjs` | 경계 사례 모음 |
| `node tools/tests/heresy.mjs` | 신앙 바닥(이단) 흐름 |

`lib.mjs`는 `main.js`에 있는 한 장 진행 규칙(말한 기적, 침묵, 청원 은총 등)을 복제해 두었다. `main.js`의 해당 부분을 고치면 여기도 맞춰야 한다.

`fuzz.mjs`의 `winner-before-resolve` 보고는 오류가 아니라 정보다: 계시 전에 쓴 기적(번개)으로 신앙 승리가 먼저 나는 경우.
