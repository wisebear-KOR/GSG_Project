# 02. 규칙 — 엔진 명세

> **기준**: 커밋 `448f553` (2026-09-30), 명세 검토 수정 `e68a240`까지 반영. 코드와 이 문서가 다르면 코드가 기준이다. `e68a240`에서 `engine.js` 460행 뒤는 4~5줄 밀렸다 — 그 뒤를 가리키는 줄 번호 중 이번에 고치지 않은 것은 `448f553` 기준이다.
> 처음 쓴 때(`8b91681`) 뒤로 바뀐 규칙 — 율법파의 원정·칼·대체 마을·결집·퇴각과 되풀이에 굳는 율법(§4.9), 메아리(§14.8), 대성당의 마을 조건과 원정(§10), 포위(§3.8), 남은 자(§15.2), 승천 4(§16.4), 명령 검증 예산(§3.4), 뜻을 헤아린 기본 노동과 그 성벽 예산(§3.5), 갈림길 비용 하한(§7.2), 집 안 행동은 칸을 막지도 막히지도 않음(§3.7), 성언·기이한 해석 삭제(죽은 필드까지 `e68a240`) — 은 본문에 녹였고, 해결된 확인 사항은 §19에 표시했다.
> 규칙의 원천은 `js/game/engine.js`(판정·해결), 표는 `js/game/data.js`, 맵은 `js/game/mapgen.js`다. 한 장 안에서 **엔진 함수를 부르는 순서**(계시 비용, 말한 기적, 말투, 갈림길 비용, 계명, 해결 뒤 은총 등)는 화면 컨트롤러 `js/game/main.js`가 정하므로 그것도 규칙으로 적는다.
> 위치 표기: `engine.js:867` = `js/game/engine.js` 867행. `main.js`, `data.js`, `mapgen.js`, `lore.js`, `meta.js`도 같은 폴더.
> 화면에 나오는 글은 모두 언어팩 키(`t('log.gather')` 등)로 찾는다. 이 문서의 한국어 이름은 `js/game/i18n/ko/*.js`의 값이다.
>
> 함께 읽을 문서: 계시에서 명령·말투·이름·예언을 뽑는 방법은 [05 해석기](05-interpreter.md), 상태 객체 전체·저장 형식·결정론 코드는 [04 구조](04-architecture.md), 표 스키마는 [03 데이터](03-data.md), 판 밖의 진행(경외·시련 별 기록·승천 해금)은 [07 진행](07-progression.md), 용어 대응은 [01 개요](01-overview.md#용어집-한국어--영어--코드).

## 목차

0. [공통 약속](#0-공통-약속) — 행동 객체, 난수 스트림, 해시 선택, 정렬·반올림
1. [구성 요소와 상태](#1-구성-요소와-상태)
2. [판 만들기 (`createState`)](#2-판-만들기-createstate) — 맵 생성, 발견지·영구 지형, 성지, 덱
3. [한 장의 진행](#3-한-장의-진행) — 장 시작, 계시, 검증, 확정, 해결, 행동별 규칙, 유지
4. [율법파 (오토마)](#4-율법파-오토마)
5. [교리](#5-교리)
6. [기적과 신의 분노](#6-기적과-신의-분노)
7. [계절·갈림길·미라](#7-계절사건갈림길미라)
8. [세 막·절기·달](#8-세-막절기달)
9. [율법 석판과 성지](#9-율법-석판과-성지)
10. [대성당](#10-대성당)
11. [소명](#11-소명)
12. [심판의 기준과 승점](#12-심판의-기준과-승점)
13. [이름 있는 신도·성인·발견지·전설](#13-이름-있는-신도성인발견지전설)
14. [말의 장치 요약 (→ 05)](#14-말의-장치-요약--05)
15. [승패 판정](#15-승패-판정)
16. [모드 보정](#16-모드-보정)
17. [표시용 계산](#17-표시용-계산-확인-화면)
18. [검증 예시](#18-검증-예시)
19. [확인 필요](#19-확인-필요)
20. [Godot 이식 메모](#20-godot-이식-메모)

---

## 0. 공통 약속

### 0.1 진영과 행동 객체

- 진영(side): `'player'`(우리 부족), `'enemy'`(율법파). `other(side)`는 반대쪽. `SIDES = ['player', 'enemy']` — **순회 순서도 이 순서**다(유지 단계 등).
- 장 `state.round`: `createState` 직후 0, `startRound`가 1씩 올린다. 마지막 장은 `state.maxRounds`.
- 행동 객체(`legalActions`가 만든다, `engine.js:379`):

  | 필드 | 값 |
  |---|---|
  | `type` | `gather` · `build` · `pray` · `explore` · `preach` · `attack` |
  | `tile` | 칸 id (`'D2'`) — 기도·신전·대성당은 **자기 수도 칸** |
  | `gather` | 채집 자원 (`food`·`wood`·`stone`·`faith`) — `gather`만 |
  | `build` | `village` · `wall` · `temple` · `cathedral` — `build`만 |
  | `side` | 행동하는 진영 |
  | `key` | `` `${type}:${tile}:${gather ?? build ?? ''}` `` 예: `gather:D2:food`, `pray:E2:`, `build:C1:village`, `attack:A4:` |
  | `text` | 설명문 (`eng.act.*`) — 해석기가 읽는다 |
  | `auto` | 기본 노동으로 채운 행동이면 `true` |
  | `heeded` | 기본 노동 중 계시의 교리를 헤아려 고른 한 자리면 `true` (`auto`도 `true`, §3.5) |
  | `crusade` | 율법파가 대성당 공사 중인 우리 수도를 거리와 무관하게 치는 원정 공격이면 `true` (§10). `key`는 보통 공격과 같다 |

  `key`는 금지 목록 대조, 이름 있는 신도의 해시(§13.1), 로그와 행동 연결에 쓰이므로 **문자열 그대로** 옮긴다.

### 0.2 난수 스트림

모든 판정 난수는 상태에 저장된 두 스트림에서 나온다(`engine.js:23`). 맵 배치는 따로 만든 난수기를 쓰고 상태에 남기지 않는다.

```text
rand(state, stream = 'dice'):            # mulberry32 한 걸음
  state.rng[stream] = int32(state.rng[stream] + 0x6D2B79F5)
  t = state.rng[stream]
  t = imul(t ^ (t >>> 15), t | 1)
  t = t ^ (t + imul(t ^ (t >>> 7), t | 61))
  return uint32(t ^ (t >>> 14)) / 4294967296     # [0, 1)
d6(state)      = 1 + floor(rand(state, 'dice') * 6)
shuffle(list)  : a = 복사본; for i = len-1 .. 1: j = floor(rand(state,'deck') * (i+1)); swap(a[i], a[j])
```

| 스트림 | 초기값 (`engine.js:73`) | 쓰는 곳 (호출 순서는 §20) |
|---|---|---|
| `rng.deck` | `seed ^ 0x5BD1E995` (int32, 부호 있음) | 덱 섞기(`dealDeck`), 기적 드래프트 |
| `rng.dice` | `seed` | 탐험, 선교·공격 주사위, 평화 궁극 주사위 |
| 맵 생성 | `mulberry32(seed \| 0)` | `generateMap` |
| 발견지 배치 | `mulberry32(seed ^ 0x2F6B1A3D)` | `placeSites` |
| 영구 지형 배치 | `mulberry32(seed ^ 0x51A7C0DE)` | `placeFeatures` |
| 전생의 유적 배치 | `mulberry32(seed ^ 0x001E6AC7)` | `placeLegacy` |

- 튜토리얼은 `config.seed`와 무관하게 `seed = 7`(`TUTORIAL.seed`)로 두 스트림을 만든다. 맵은 고정이라 맵용 난수는 쓰지 않는다.
- `mulberry32(seed)`(`mapgen.js:11`)는 위 `rand`와 같은 식이며 내부 상태를 `seed | 0`에서 시작한다.

### 0.3 해시 선택 `hashPick`

글·이름·판마다 고정되는 선택은 주사위 대신 문자열 해시로 고른다(`lore.js:10`). 같은 시드면 같은 결과가 나오고, 난수 스트림을 소비하지 않는다.

```text
hashPick(list, ...salts):
  if list 비었음: return null
  s = salts를 문자열로 바꿔 '|'로 이음     # JS join: 숫자는 10진수, undefined/null은 ''
  h = 0x811C9DC5
  for ch in s (코드 포인트 단위):  h = h ^ (ch의 첫 UTF-16 단위);  h = imul(h, 0x01000193)
  return list[uint32(h) % len(list)]
```

규칙에 영향을 주는 사용처 (**인자 순서가 제각각이니 그대로**):

| 무엇 | 호출 | 위치 |
|---|---|---|
| 율법파 지도자 | `hashPick(후보 지도자, 'leader', seed, difficulty)` | `engine.js:137` |
| 대사제 성향 | `hashPick(loyal 뺀 4명, 'priest', seed)` | `engine.js:139` |
| 심판의 기준 | `hashPick(JUDGEMENTS 키 5개, 'judgement', seed)` | `engine.js:141` |
| 기적 손패 | `'hand0'`·`'hand1'`·`'hand2'` + seed (§6.1) | `engine.js:146` |
| 소명 순서 | 소명 id마다 `hashPick([0..9], seed, 'dest', id)` | `engine.js:120` |
| 갈림길 셋 | 갈림길 id마다 `hashPick([0..96], seed, 'dil', id)` | `engine.js:153` |
| 청원자 | `hashPick(PETITIONERS, seed, round, 'petitioner')` | `engine.js:626` |
| 이름 있는 신도 | `hashPick(PETITIONERS, seed, action.key)` | `engine.js:239` |
| 검열 대체어 | `hashPick(eng.banWords, seed, round)` | `engine.js:1310` |
| 숨은 말 (오늘의 계시) | `hashPick(SACRED_WORDS, 'sacred', daily)` | `engine.js:84` |

### 0.4 정렬·반올림·자료 순서

- JS `Array.prototype.sort`는 **안정 정렬**이다. 이 문서에서 "정렬"은 모두 안정 정렬이고, 동점은 원래 순서를 유지한다.
- 칸 목록 `state.tiles`는 **행 우선**(A1, A2, …, B1, …) 순서다. `find`/`filter`는 이 순서를 따른다.
- `reach`, 탐험 후보, 맵 다듬기의 지형 집계는 **삽입 순서를 지키는 맵**이다(§1.7, §2.2).
- 자원·인구는 모두 정수다. 나눗셈은 명시된 `floor`/`ceil`만 쓴다: 행동 수 `floor(pop/4)`, 신앙 수입 `floor(pop/3)`, 성장 비축 `ceil(pop/2)`, 막 경계 `floor(m/4)`·`ceil(2m/3)`, 빠른 판 대성당 `ceil(v × 0.7)`, 경건한 자 승점 `floor(faith/3)`.

---

## 1. 구성 요소와 상태

### 1.1 판 크기

| `config.size` | 칸 | `maxRounds` | 빠른 판 `quick` | 발견지 쌍 | 사막 상한 `floor(n²×0.1)` | 비고 |
|---|---|---|---|---|---|---|
| (튜토리얼) | 3×3 | 5 | 아니오 | 0 | — | 고정 맵 (§16.1) |
| 4 | 4×4 | 8 | **예** | 1 (후보 칸이 없어 **실제 0**) | 1 (쌍으로만 생겨 **실제 0**) | "빠르게" |
| 5 | 5×5 | 12 | | 1 | 2 | "작게" (기본값) |
| 6 | 6×6 | 12 | | 2 | 3 (쌍으로만 생겨 실제 최대 2) | "보통" |
| 7 | 7×7 | 14 | | 2 | 4 | "크게" |

(맵 생성 뒤 성지 칸이 `hill`로 덮이므로 완성된 판의 사막·영구 지형 수는 홀수가 될 수 있다. 시드 1~300 실측: 4×4 발견지 0·사막 0, 5×5 사막 대개 2, 6×6 사막 2, 7×7 사막 1~4.)

- `maxRounds = 튜토리얼 5 → TRIALS[trial].rounds → MAP_SIZES[size].rounds → 12` 순으로 먼저 있는 값(`engine.js:74`). 시련 「마지막 예언자」만 8장.
- `quick(state) = rows <= 4 && !tutorial`(`engine.js:199`). 빠른 판은 박자를 당긴다: 궁극 6장, 드래프트 3장, 신의 분노 3장부터, 대성당 비용 ×0.7(올림), 신앙 승리 문턱 낮춤.

### 1.2 좌표·이웃·거리

- 칸 id: `'ABCDEFGHI'[r] + (c + 1)` — 행 `r`(0 = 맨 위 A), 열 `c`(0 = 왼쪽). 예: `(4,1) → 'E2'`.
- 배치: **홀수 행이 반 칸 오른쪽으로 밀린** 육각(odd-r offset).
- 이웃 방향 (`engine.js:40`, `mapgen.js:22` — **이 순서 그대로**):

  | 행 | 방향 `(dr, dc)` 6개 |
  |---|---|
  | 짝수 행 (`r % 2 == 0`) | `(0,-1) (0,+1) (-1,-1) (-1,0) (+1,-1) (+1,0)` |
  | 홀수 행 | `(0,-1) (0,+1) (-1,0) (-1,+1) (+1,0) (+1,+1)` |

  판 밖 좌표는 버린다.
- 거리: 큐브 좌표 `x = c - (r - (r & 1)) / 2`, `y = r`, `z = -x - r`; `distance = max(|dx|, |dy|, |dz|)`.
- 수도 자리 (`capitalsFor`, `mapgen.js:26`): 우리 `(rows-1, 1)`, 율법파 `(0, cols-2)`. 5×5면 우리 E2, 율법파 A4. 점대칭 `(r,c) ↔ (rows-1-r, cols-1-c)`에서 두 수도는 서로의 대칭이다.

### 1.3 지형과 채집

| 지형 `terrain` | 이름 | 채집 자원 | 양 |
|---|---|---|---|
| `plain` | 평원 | food | 2 |
| `forest` | 숲 | wood | 2 |
| `mountain` | 산 | stone | 2 |
| `river` | 강 | food | 1 |
| `hill` | 성스러운 언덕 | faith | 1 |
| `desert` | 사막 | 없음 | 0 |

영구 지형 `feature`는 지형의 채집을 **대신한다** (`yieldOf`, `engine.js:335`):

| `feature` | 이름 | 놓이는 지형 | 채집 |
|---|---|---|---|
| `oasis` | 오아시스 | desert | food 3 |
| `quarry` | 채석장 | mountain | stone 3 |

수도 칸의 지형은 `plain`이고, 수도 칸에서는 채집할 수 없다. 마을은 지형을 바꾸지 않으므로 **자기 마을 칸에서도 채집한다**.

### 1.4 칸 상태 (`tile`)

| 필드 | 기본값 | 뜻 |
|---|---|---|
| `id`, `r`, `c` | | 좌표 |
| `terrain` | 맵 값 (`P`/`E`/`V` 칸은 `plain`) | 지형 |
| `owner` | `null` · `'player'` · `'enemy'` | 주인 (수도·마을 칸만 주인이 있다) |
| `building` | `null` · `'capital'` · `'village'` | 건물 |
| `wall` | `false` | 성벽 (수도·마을에만) |
| `revealed` | `false` | 플레이어에게 보이는가 (율법파에게는 안개가 없다) |
| `site` | 없음 또는 `{ id, found }` | 발견지 (§13.3) |
| `feature` | 없음 또는 `'oasis'`·`'quarry'`·`null` | 영구 지형 |
| `faithMarks` | 없음 또는 `{ side, n, round }` | 믿음의 표식 (§3.8 선교) |

### 1.5 진영 상태와 시작값

`state.sides[side]` (`engine.js:126`):

| 필드 | 시작값 | 뜻 |
|---|---|---|
| `food` `wood` `stone` `faith` | 아래 표 | 자원 |
| `pop` | 아래 표 | 신도(인구) |
| `templeLevel` | 1 | 신전 단계 (최대 `MAX_TEMPLE = 3`) |
| `capitalHp` | 3 (`CAPITAL_HP`) | 수도 내구도 |
| `faithless` | 0 | 신앙 0으로 버틴 연속 장 수 |
| `cathedral` | 0 | 대성당 공사 단계 (0~3) |
| `edict` | 0 | 율법 석판 (율법파만 의미 있음) |
| `doctrine` | `{peace:0, war:0, abundance:0, wisdom:0}` | 교리 (율법파는 늘 0) |

시작 자원:

| 누구 | food | wood | stone | faith | pop |
|---|---|---|---|---|---|
| 플레이어 (`PLAYER_START`) | 4 | 2 | 0 | 4 | 3 |
| 율법파 · 쉬움 | 3 | 1 | 0 | 2 | 3 |
| 율법파 · 보통 | 5 | 3 | 1 | 3 | 4 |
| 율법파 · 어려움 | 6 | 4 | 2 | 4 | 4 |
| 튜토리얼 플레이어 | 5 | 3 | 1 | 6 | 3 |
| 튜토리얼 율법파 | 3 | 1 | 0 | 2 | 3 |

맵 크기는 시작 자원을 바꾸지 않는다. 시작 보정은 이 순서로 더한다 (`engine.js:157-163`):

1. 시련 `earth`: 플레이어 `doctrine.abundance = 1`
2. 시련 `last`: 율법파 `pop += 2`, `food += 8`
3. 승천 ≥ 1: 율법파 `pop += 1`, `food += 4`
4. 은사 `granary`: 플레이어 `food += 2`
5. 정경 `config.canon`: `!daily && difficulty != 'hard' && !tutorial`이면 플레이어 `doctrine[canon.doctrine] += 1`

### 1.6 판 상태 (규칙에 쓰이는 필드)

`createState`의 기본값 (`engine.js:71-87`). 전체 목록은 [04 구조](04-architecture.md).

| 필드 | 기본값 | 쓰임 |
|---|---|---|
| `config` | `{ mode:'standard', size:5, difficulty:'normal', seed:2026, … }`와 합친 것 | 모드 (§16) |
| `tutorial` | `mode === 'tutorial'` | |
| `rows`, `cols` | 맵 크기 | |
| `rng` | `{ deck, dice }` | §0.2 |
| `round`, `maxRounds` | 0, §1.1 | |
| `enemyBonus` | 난이도 (튜토리얼 0) | 율법파 행동 수 보너스 |
| `eventDeck`, `lawDeck` | 카드 배열 (**배열 끝이 덱 위**) | §2.6 |
| `event`, `lawCard` | `null` | 이번 장 계절·율법 카드 |
| `first` | (장 시작에 정함) | 선 진영 |
| `leader` | `null` | 율법파 지도자 id |
| `priest` | `'loyal'` | 대사제 (수치 효과 없음) |
| `judgement` | `'classic'` | 심판의 기준 |
| `miracleHand` | `['lightning','rain','bounty']` | 기적 손패 |
| `miracleOffer` | `null` | 드래프트 후보 |
| `miracleUsed` | `false` | 이번 장 기적 사용 |
| `reinterpretUsed` | `false` | 이번 장 다시 해석/말 거두기 사용 |
| `rainActive` | `false` | 이번 장 단비 (가뭄 무효) |
| `roundMods` | `{}` | 이번 장 보정: `gatherBonus`·`attackBonus`·`ark`·`tongues`·`pillar` |
| `wrath` | 0 | 신의 분노 0~3 |
| `lawGuard` | `{ preach:0, attack:0 }` | 되풀이에 굳는 율법 — 지난 장까지 계시로 연달아 명령한 선교·공격 장 수 (§4.9) |
| `rally` | `false` | 율법파의 결집 (§4.9) |
| `edictOn` | `!!veteran && !tutorial` | 율법 석판 사용 |
| `holyId` | `null` | 성지 칸 id |
| `destiny`, `destinyOffer` | `null` | 소명 |
| `pendingDilemma`, `dilemmaPick` | `null` | 갈림길 |
| `pendingSite` | `null` | 선택을 기다리는 발견지 칸 |
| `miraDone`, `miraQuote` | `false`, `null` | 미라 |
| `eventChoice` | `null` | 지혜 궁극의 계절 두 장 |
| `bannedWords`, `bannedNext` | `[]`, `null` | 검열 |
| `reacted`, `vowNext` | `null` | 율법파가 들은 말 |
| `streak` | `null` | `{ doctrine, n }` 연속 교리 |
| `grace` | `{ round:0, used:0 }` | 장당 은총 사용량 |
| `names` | `{}` | 칸 id → 붙인 이름 |
| `petition`, `petitionIgnored` | `null`, 0 | 청원 |
| `prophecy` | `null` | 봉인된 예언 |
| `commandments` | `[]` | 영원한 계명 id |
| `saints`, `deeds`, `fallen` | `[]`, `{}`, `[]` | 성인 |
| `legends` | `{}` | 전설이 된 땅 (수치 효과 없음) |
| `silentRun` | 0 | 연속 침묵 |
| `bloodKills` | 0 | 플레이어 공격 승리 수 (석판) |
| `sacred` | `daily`면 숨은 말, 아니면 `null` | |
| `stats` | `{ converted:0, captured:0, miracles:0, prophecies:0, petitions:0 }` (+ 나중에 `starved`·`turned`·`vows`·`sacred`) | 소명·업적 |
| `revelations` | `[]` | `{ round, text, doctrine }` (메아리면 `echo: true`가 붙는다, §14.8) |
| `history` | `[]` | 장마다 `{ round, ps, es, res, text }` |
| `log` | `[]` | 진행 기록 |
| `winner`, `winReason`, `winKind` | `null`, `''`, `null` | §15 |

(성언·기이한 해석이 남긴 죽은 필드 `liturgy`·`oddUsed`는 `e68a240`에서 `createState`·`hydrateState` 모두에서 지웠다. 옛 저장본에 있으면 읽는 곳 없이 남을 뿐이다.)

### 1.7 파생 수치

| 이름 | 식 | 위치 |
|---|---|---|
| `reach(side)` | 자기 수도에서 거리 ≤ `2 + marchRange(side)`, 자기 마을에서 거리 ≤ 1인 칸의 합집합. **순서**: `ownedTiles`(행 우선) 하나씩, 그 칸의 반경 안 칸을 `state.tiles` 순서로 훑어 처음 나온 순서대로 | `engine.js:210` |
| `marchRange(side)` | 율법파의 원정: `side == 'enemy' && !tutorial ? actOf − 1 : 0` → 수도의 손이 1막 2칸, 2막 3칸, 3막 4칸. 첫 판에도, 모든 난이도에서 (§4.9) | `engine.js:209` |
| `actionLimit(side)` | `limit = min(6, 2 + templeLevel + floor(pop/4) + bonus)`; 플레이어는 안식일이면 `limit = max(1, limit - 2)`; 결과 `max(0, min(limit, pop))` | `engine.js:221` |
| 　`bonus` (율법파) | `enemyBonus + (rally ? 1 : 0)` (결집, §4.9). 승천 4는 더 이상 행동 수를 늘리지 않는다 (§16.4) | `engine.js:223` |
| 　`bonus` (플레이어) | `doctrine.wisdom >= 4 ? 1 : 0` | |
| `popCap(side)` | `3 + 2 × 마을 수 + (hasUlt(side,'abundance') ? 2 : 0)` | `engine.js:206` |
| `faithIncome(side)` | `1 + floor(pop/3) + (templeLevel - 1)` | `engine.js:233` |
| `prayValue(side)` | `(2 + (wisdom >= 2 ? 1 : 0)) × (플레이어 && 안식일 ? 2 : 1)` | `engine.js:229` |
| `isSabbath` | 계명 `sabbath`가 있고 `round % 4 == 0` | `engine.js:230` |
| `gatherAmount(side, tile)` | §3.8 채집 | `engine.js:341` |
| `buildCost(side, build)` | §3.8 건설 | `engine.js:318` |
| `superiority(s, f)` | `s.pop >= f.pop + 3 ? 1 : 0` — **공격 판정에만** 쓰인다 | `engine.js:296` |
| `preachBonus(side)` | §3.8 선교 | `engine.js:268` |
| `siegeOf(side, tile)` | 포위: 플레이어가 율법파 **수도**를 칠 때만, 그 수도의 이웃 중 우리 소유 칸이 2개면 1, 3개 이상이면 2, 아니면 0 | `engine.js:259` |
| `enemyZeal(side)` | 승천 4: `side == 'enemy' && ascension >= 4 && actOf == 3 ? 1 : 0` — 율법파 공격·선교 주사위에 더한다 | `engine.js:265` |
| `lawGuardOf(side, type)` | 굳은 율법: `side == 'player' ? min(2, lawGuard[type]) : 0` — 우리 선교·공격에 맞서는 율법파 방어 보너스 (§4.9) | `engine.js:267` |
| `cathedralVillages` | 대성당 다음 단계에 필요한 우리 마을 수 `= cathedral + 1` (§10) | `engine.js:205` |
| `isEcho(text)` | 메아리 (§14.8) | `engine.js:730` |
| `hasUlt(side, k)` | `side == 'player' && doctrine[k] >= 6 && round >= ultRound` | `engine.js:203` |
| `ultRound` | 빠른 판 6, 아니면 8 (`ULT_ROUND`) | `engine.js:200` |
| `draftRound` | 빠른 판 3, 아니면 5 | `engine.js:201` |
| `wrathRound` | 시련 `last` 1, 빠른 판 3, 아니면 4 | `engine.js:202` |
| `actOf` | §8 | `engine.js:974` |
| `edictMax` | `12 - (승천 ≥ 2 ? 2 : 0)` | `engine.js:938` |
| `holyOwner` | 성지 칸에 **마을**이 있으면 그 주인, 아니면 `null` | `engine.js:937` |
| `villageCount(side)` | `building == 'village' && owner == side`인 칸 수 | |

`RULES` 상수 (`data.js:61`): `followersPerAction 4`, `followersPerFaith 3`, `baseFaithIncome 1`, `heresyGrace 1`, `superiority 3`, `lowFaith 2`, `gracePerRound 1`, `graceDoctrineBelow 3`, `maxNames 3`. 그 밖: `MAX_ACTIONS 6`, `MAX_TEMPLE 3`, `CAPITAL_HP 3`, `DOCTRINE_MAX 6`, `EDICT_MAX 12`, `DESTINY_POINTS 5`, `MAX_COMMANDMENTS 2`, `REVELATION_MAX 100`.

### 1.8 시야 `updateVision`

`engine.js:186`. 플레이어의 `reach` 안 칸을 모두 `revealed = true`. 또한 우리 수도에서 거리 ≤ `r`인 칸을 드러낸다: `r = 3`(은사 `seer`이고 `round <= 1`) 아니면 2. 부르는 때: `createState` 끝, 매 장 유지 단계. 안개는 한 번 걷히면 다시 덮이지 않는다. 그 밖에 드러나는 경우: 플레이어가 마을을 지은 칸, 선교로 넘어온 마을, 탐험(대상과 이웃), 불기둥(3칸), 지혜 연속 기적(2칸).

---

## 2. 판 만들기 (`createState`)

### 2.1 순서

`engine.js:66-166`. **이 순서가 곧 난수·해시 호출 순서다.**

1. `cfg = { ...DEFAULT_CONFIG, ...config }`. `diff = DIFFICULTY[cfg.difficulty] ?? normal`.
2. 맵: 튜토리얼이면 `TUTORIAL.map`, 아니면 `generateMap({ rows: size, cols: size, seed })` (§2.2).
3. 상태 필드 기본값(§1.6), `rng = { deck: s ^ 0x5BD1E995, dice: s }` (`s` = 튜토리얼 7, 아니면 `cfg.seed`).
4. 칸 만들기: `P` → 우리 수도, `E` → 율법파 수도, `V` → 율법파 마을(튜토리얼만). 이 셋의 지형은 `plain`.
5. (튜토리얼 제외) 발견지 `placeSites` → 영구 지형 `placeFeatures(taken = 발견지)` → `cfg.legacy`가 있으면 전생의 유적 `placeLegacy(taken = 발견지)` (§2.3).
6. (튜토리얼 제외) 성지 고르기 (§2.4).
7. 소명: `veteran && !tutorial && !challenge`이면 (§11).
8. 진영 상태와 시작값 (§1.5 표; 보정은 10단계).
9. 덱: 튜토리얼은 고정 순서(§16.1). 아니면 지도자 → 사제(veteran) → 심판(veteran) → 기적 손패(storm/veteran) → 갈림길 셋(veteran) → 계절 덱 `dealDeck` → 율법 덱 `dealDeck` (§2.5, §2.6).
10. 시작 보정 (§1.5 목록).
11. `updateVision`. 발견지는 이때 드러나도 **첫 유지 단계**에서야 발견된다.

### 2.2 맵 생성 `generateMap`

`mapgen.js:30`. 목표: 점대칭(공평), 수도 주변 필수 자원, 사막 제한, 한 지형 쏠림 방지. `rnd`는 `mulberry32(seed)`. `set(r, c, t)`는 칸과 그 **대칭 칸을 함께** 바꾼다. `cells`는 행 우선 목록.

1. **채우기**: 행 우선으로 비어 있는 칸마다 `set(칸, pick())`. `pick`: `x = rnd() × 97`, 가중치 `plain 30, forest 24, mountain 16, river 13, desert 10, hill 4`를 이 순서로 빼며 `x < 0`이 되는 지형(끝까지 안 되면 `plain`). 대칭 칸이 함께 채워지므로 `pick`은 `ceil(rows×cols / 2)`번.
2. **다듬기**: 모든 칸을 행 우선으로 돌며 **칸마다 `rnd()` 한 번**. `> 0.45`면 건너뛴다. 아니면 이웃(방향 순서)의 지형을 센다(사막·언덕 제외, 처음 나온 순서로 키가 생김) → 개수 내림차순 안정 정렬의 첫째가 3개 이상이고 이 칸이 사막이 아니면 `set(칸, 그 지형)`. (언덕 칸은 바뀔 수 있다.)
3. **지형 상한** `capTerrain(모든 칸)`: 상한 `LIMIT = {plain 0.4, forest 0.34, mountain 0.26, river 0.22}`. 최대 `rows×cols`번 반복: `LIMIT` 키 순서로 개수 > `ceil(rows×cols×LIMIT)`인 첫 지형 `over`를 찾고(없으면 끝), `over` 칸들 중 `pool[floor(rnd() × len)]`를 `rarest(over)`로 바꾼다. `rarest(except)` = `LIMIT` 키(= plain, forest, mountain, river) 중 `except`를 뺀 것을 `count / LIMIT` 오름차순 안정 정렬한 첫째.

   | 크기 | plain | forest | mountain | river |
   |---|---|---|---|---|
   | 4×4 | 7 | 6 | 5 | 4 |
   | 5×5 | 10 | 9 | 7 | 6 |
   | 6×6 | 15 | 13 | 10 | 8 |
   | 7×7 | 20 | 17 | 13 | 11 |
4. 우리 수도 칸을 `plain`으로 (`set`이므로 율법파 수도 칸도).
5. **가운데 언덕**: `mid = (floor(rows/2), floor(cols/2))`를 `hill`로. 짝수 크기는 대칭 칸도 언덕이 된다(4×4: B2·C3, 6×6: C3·D4).
6. **사막 정리**:
   - 칸 또는 그 대칭 칸이 어느 수도와 거리 ≤ 1인 사막 → `set(칸, fix[floor(rnd()×4)])`, `fix = [plain, forest, mountain, river]`. (행 우선, 사막 칸마다 `rnd` 1번. 대칭 칸은 이미 바뀌어 다시 걸리지 않는다.)
   - 칸 또는 그 대칭 칸이 사막 이웃을 2개 이상 가진 사막 → `set(칸, rarest('desert'))` (난수 없음; `'desert'`는 `LIMIT`에 없으므로 네 지형 전부 후보).
   - 사막 수 > `floor(rows×cols×0.1)`인 동안: `deserts()[floor(rnd()×len)]`를 `rarest('desert')`로. (사막은 대칭 쌍으로만 생기므로 4×4는 상한 1 → 사막 0개.)
7. **수도 주변 자원 보장** (최대 4바퀴, 한 바퀴에 바뀐 게 없으면 끝): 우리 수도, 율법파 수도 순으로 `near` = 그 수도와 거리 ≤ 2이고 수도 자신·`mid`가 아닌 칸. 필요 목록 `[[plain, river], [forest], [mountain]]` 순으로 `near`에 그 종류가 하나도 없으면 바꿀 칸 = `near`의 첫 사막, 없으면 `near`를 "그 칸 지형이 `near`에 몇 개 있나" 내림차순 안정 정렬한 첫째 → `set(칸, 목록의 첫 지형)`. 난수 없음.
8. `rows×cols >= 25`이고 사막이 0개면: `nearCap(p, 2)`가 아니고 언덕이 아닌 칸 중 `rnd`로 하나를 사막으로 (`set`).
9. **다시 상한** `capTerrain(movable)`: `movable` = 칸·대칭 칸 모두 수도와 거리 > 2, `mid` 아님, 사막 아님.
10. 결과 복사본에 수도 표시 `P`(우리) `E`(율법파).

> 참고 `nearCap(p, d)`: `p` 또는 그 대칭 칸이 어느 수도와 거리 ≤ `d`. odd-r 밀림 때문에 점대칭이 육각 거리를 정확히 보존하지 않아 양쪽을 다 본다.

### 2.3 발견지·영구 지형·전생의 유적

모두 생성된 맵(수도가 `P`/`E`로 표시된 격자)을 보고 정한다.

**발견지 `placeSites`** (`mapgen.js:127`): 후보 = 행 우선으로 "앞쪽 절반" 칸(`r < rows-1-r`, 또는 가운데 행에서 `c < cols-1-c`) 중, 칸과 대칭 칸 모두 `distance(우리 수도) > 2`, `distance(율법파 수도) > 1`, `mid` 아님, 수도 아님. 쌍 수 = `rows×cols >= 36 ? 2 : 1` (4×4는 조건을 만족하는 칸이 없어 발견지가 없다). 한 쌍마다 `p = 후보.splice(floor(rnd()×len))`, 그다음 `kind = kinds.splice(floor(rnd()×len))` (`kinds = [nomads, altar, spring, bones]`, 뽑은 건 빠진다). 칸과 대칭 칸에 같은 발견지.

**영구 지형 `placeFeatures`** (`mapgen.js:147`): `oasis`(사막), `quarry`(산) 순으로. 후보 = 앞쪽 절반 칸 중 칸·대칭 칸 모두 그 지형, 발견지 칸 아님, 두 칸 모두 두 수도와 거리 > 1. 후보가 있으면 `cands[floor(rnd()×len)]` 한 번(없으면 난수도 안 씀). 칸과 대칭 칸에 둔다. 사막이 없는 4×4에는 오아시스가 없다.

**전생의 유적 `placeLegacy`** (`mapgen.js:168`): `config.legacy`가 있을 때만(§16.8). 후보 = 행 우선 모든 칸 중 수도 아님, 발견지 칸 아님, 두 수도와 거리 ≥ 2, `mid` 아님 → `cands[floor(rnd()×len)]`. 그 칸의 `site = { id:'legacy', found:false }`. (영구 지형 칸과 겹칠 수 있다.)

### 2.4 성지 고르기

`engine.js:108-117`. 튜토리얼 제외. 건물 없는 칸 중

```text
cost(t) = |distance(t, 우리 수도) - distance(t, 율법파 수도)| × 100 + (t.terrain == 'hill' ? 0 : 10) + distance(t, mid)
```

가 가장 작은 칸(동점은 id 문자열 오름차순). 그 칸의 `terrain = 'hill'`, `feature = null`로 바꾸고 `holyId`에 둔다.

- 결과적으로 5×5는 C3, 6×6은 D4(= `mid`)지만, **4×4는 C4, 7×7은 대개 E5**(가끔 B1·F6)로 `mid`와 다르다. 이때 `mapgen`이 `mid`에 둔 언덕은 평범한 언덕으로 남는다.
- 성지가 발견지·유적 칸과 겹칠 수 있고(7×7), 성지 칸의 영구 지형만 지워져 대칭 칸의 영구 지형은 짝 없이 남을 수 있다 (§19).

### 2.5 판마다 정해지는 것

튜토리얼이 아니면 (`engine.js:136-150`):

| 무엇 | 규칙 |
|---|---|
| 지도자 `leader` | 시련 `sword`면 `iron`. 아니면 `notOn`에 난이도가 없는 지도자(`elder, iron, preacher, builder` 순서에서 쉬움은 `iron` 제외) 중 `hashPick(…, 'leader', seed, difficulty)`. **첫 판에도** 정해진다. |
| 대사제 `priest` | veteran이면 `hashPick([literal, dreamer, zealot, cautious], 'priest', seed)`. 수치 효과 없음 (해석 말투만, [05](05-interpreter.md)). |
| 심판 `judgement` | veteran이면 `hashPick([classic, wide, fertile, pious, steadfast], 'judgement', seed)`. 아니면 `classic`. |
| 기적 손패 | §6.1 |
| 갈림길 셋 | veteran이면 `DILEMMAS`를 `hashPick([0..96], seed, 'dil', id)` 오름차순 안정 정렬해 앞의 셋. 아니면 없음. |
| 소명 | §11 |

### 2.6 덱 나누기

```text
dealDeck(pool, n):   deck = []
                     while len(deck) < n: deck = shuffle(pool) + deck     # 앞에 붙인다 (unshift)
                     return deck
뽑기 = deck.pop()   # 배열 끝이 덱 위
```

첫 번째 섞음이 배열 끝에 있으므로 먼저 뽑힌다(그 섞음을 뒤에서부터).

| 덱 | 풀 | `n` |
|---|---|---|
| 계절 `eventDeck` | `EVENTS` 6장 + (veteran) 갈림길 3장 | `maxRounds + 2` |
| 율법 `lawDeck` | `lawPool(state)` (§4.2) | `maxRounds × 2 + 2` (어려움은 장마다 두 장을 보므로) |

계절 덱 뒤로 율법 덱을 섞으므로 `rng.deck` 소비 순서는 계절 → 율법이다. 장 시작의 보충은 §3.1.

---

## 3. 한 장의 진행

### 3.0 전체 순서

```text
[장 시작]  startRound                                              engine.js:543   (§3.1)
[말하기]   플레이어 선택 — 순서 자유, 난수 없음                         (§3.2)
           소명(1장) · 기적 드래프트 · 지혜 궁극 계절 고르기 · 갈림길 버튼 · 기적 카드(번개는 목표 칸)
[계시]     speak: 길이 검사 → 침묵 판정 → 비용 지불 → 이름 붙이기 → 해석   main.js:510    (§3.3)
[확인]     validateOrders → autoFill(교리) → 청원·갈림길·말한 기적·계명·예언 판별 (상태 불변)  main.js:584
           (선택) 칩 빼기 · 다시 해석(LLM 모드만, 신앙 -1) · 말 거두기 · 예언 봉인 · 계명 새김 표시
[확정]     accept                                                  main.js:698    (§3.6)
            1 planEnemy   2 말한 기적   3 applyTone   4 (침묵) streak=null   5 payDilemma
            6 계명 새기기   7 findSacred   8 sealProphecy
            9 resolveRound: 막기(집 안 행동 제외) → 6단계 해결 → 갈림길 결과 → upkeep
                            → updateLawGuard → recordHistory(분노·결집)
           10 applySilence  11 markLegends  12 keepVows  13 wordsAfter
           14 recordRevelation(메아리면 교리 없음)   15 첫 이름 → 지혜 +1   16 신학 노트
[재생 뒤]  유목민 선택(pendingSite) → 승자 있으면 끝, 없으면 다음 startRound
```

### 3.1 장 시작 `startRound`

`engine.js:543-609`. 정확한 순서:

1. `round += 1`; `miracleUsed = false`; `reinterpretUsed = false`; `rainActive = false`.
2. 계절 덱이 비었으면 `eventDeck = dealDeck(EVENTS, 6)` (**갈림길 없이**) — `rng.deck`.
3. 율법 덱이 2장 미만이면 `lawDeck = dealDeck(lawPool, 9) + lawDeck` (**밑에** 붙인다) — `rng.deck`.
4. `veteran && !tutorial && actStart`(막이 바뀐 첫 장)이면:
   - 2막: `lawPool`에 `L5`가 있으면 `L5` 한 장을 `lawDeck`의 인덱스 `max(0, len-3)`에 끼운다 → 끼운 뒤 **위에서 네 번째**. (보통 난이도면 3장 뒤에 나온다.)
   - 3막: 계절 덱에서 `calm`을 모두 뺀다.
5. 계절 덱이 (4에서 비어) 비었으면 `dealDeck(veteran && 3막 ? calm 뺀 EVENTS : EVENTS, 6)`.
6. `event = eventDeck.pop()`.
7. **미라** (§7.3): 조건이 맞으면 방금 뽑은 계절을 덱 위로 되돌리고 `event = MIRA`.
8. **지혜 궁극**: `!event.special && hasUlt('wisdom') && 덱이 있고 && 덱 위 카드 id != event.id`이면 `eventChoice = [event.id, 덱 위 id]`, 아니면 `null`.
9. `bannedWords = bannedNext ? [bannedNext] : []`; `bannedNext = null`.
10. `lawCard = lawDeck.pop()`.
11. **들은 말**(§4.3): `heard = vowNext ? 'vow' : (지난 장 계시의 doctrine ?? null)`. `react = heard && !tutorial && difficulty != 'easy' ? REACT[heard] : null`. `reacted = null`, `vowNext = null`.
12. 어려움(튜토리얼 제외)이면 두 번째 카드 비교, 아니면 반응 교체 (§4.3).
13. `first = round 홀수 ? 'player' : 'enemy'`.
14. `roundMods = {}`; `dilemmaPick = null`.
15. `round > 1`이면 `destinyOffer = null` (1장에 고르지 않으면 기본 소명 그대로).
16. `petition = makePetition(state)` (§14.3) — 안에서 `enemyIntent`→`planEnemy`를 부르지만 난수는 없다.
17. `round == draftRound && veteran && !tutorial`이면 기적 드래프트 후보 3장 (§6.1) — `rng.deck`.

### 3.2 말하기 단계에서 할 수 있는 일

화면이 `phase === 'speak'`일 때만(`main.js:1984`). 모두 난수가 없다.

| 무엇 | 함수 | 규칙 |
|---|---|---|
| 소명 고르기 (1장) | `chooseDestiny(id)` | `destinyOffer`에 있어야 함 |
| 기적 드래프트 | `takeMiracle(id)` | `miracleOffer`에 있어야 함; 손패에 더하고 `miracleOffer = null` |
| 계절 고르기 (지혜 궁극) | `chooseEvent(id)` | `eventChoice`에 있고 지금과 다르면: 덱 위를 뽑아 `event`로, 지금 계절은 덱 위로, `eventChoice = null`, 청원 다시 만듦. 율법 카드는 그대로 |
| 갈림길 버튼 | `state.dilemmaPick = 선택 id` | 계시 속 말이 있으면 말이 우선 (§7.2) |
| 기적 카드 | `castMiracle(id, target)` | 장당 하나 (§6.2) — 효과가 **즉시** 적용되고 `checkVictory(final=false)` |

### 3.3 계시와 해석

`speak()` (`main.js:510`):

1. 글을 `trim`. 비었으면 아무 일 없음. 길이 > `REVELATION_MAX`(100; 시련 `cloister`는 20)면 거절.
2. 글에 `[가-힣A-Za-z0-9]`(`kw.ui.speech`)가 하나도 없으면 **침묵**(§3.5 끝, §14.9)으로 처리한다(비용 없음).
3. 비용 `revelationCostFor(text)` (§14.1 — 메아리면 +1). 신앙이 모자라면 거절(계시할 수 없음 — 침묵은 가능). 지불: `faith -= cost`.
4. 이름 붙이기 `nameTile(parseNaming(text))` (§14.5) — 해석 **전에** 새긴다.
5. 해석: LLM 또는 석판 → `{ interpretation, orders, forbidden, doctrine, source }`. `orders`·`forbidden`은 `legalActions('player')`의 원소, `doctrine`은 교리 키 또는 `null`. LLM이 30초 안에 답하지 않거나 실패하면 같은 계시를 석판으로 해석한다(`main.js:553-559`). 방법은 [05 해석기](05-interpreter.md).

확인 화면 파생값 `derivePending` (`main.js:584`) — 상태를 바꾸지 않는다:

- `validateOrders(player, orders − 빠진 칩, forbidden keys, doctrine)` → `accepted`, `rejected`
- `auto = autoFill(player, accepted, forbidden keys + 빠진 칩, doctrine)` — 교리가 있으면 한 자리를 그 뜻대로 (§3.5)
- 청원 응답 여부, 글로 고른 갈림길, 말한 기적, 새길 수 있는 계명, 예언(없을 때만) 판별 — §14

선택 행동: **다시 해석**(`faith >= 1`, 장당 한 번, `faith -= 1`, `reinterpretUsed = true`; 화면은 **LLM 모드(`aiMode === 'llm'`)일 때만** 이 단추를 보인다 — 석판 모드는 결정론이라 다시 해도 같다. LLM 모드면 LLM 실패로 석판이 대신한 장에도 보인다, `main.js:2092`, `e68a240`), **말 거두기**(계시 직전 상태로 되돌림, `reinterpretUsed = true`, veteran이면 `faith = max(0, faith-1)`; 튜토리얼에선 없음). 다시 해석과 말 거두기는 `reinterpretUsed`를 함께 쓴다.

### 3.4 명령 검증 `validateOrders`

`engine.js:419-456`. 입력 순서대로 하나씩:

```text
limit = actionLimit(side);  budget = {food, wood, stone, faith} 현재값;  pref = DOCTRINE_PREF[doctrine] ?? []
for a in chosen:
  if a.key in forbidden:                         reject('계시가 금지'); continue
  cost = a.type == 'build' ? buildCost(side, a.build) : null
  if cost and not canPay(budget, cost):          reject('자원 부족'); continue      # 교체 전 예산으로 본다
  i = accepted에서 a.tile과 같은 칸의 첫 행동
  if i 있음:
    keep = accepted[i]
    if a.type in pref and keep.type not in pref:
      budget += cost(keep)                       # 밀려날 행동의 건설 비용을 돌려받고
      if cost and not canPay(budget, cost):      # 새 행동을 치를 수 없으면
        budget -= cost(keep); reject(a, '자원 부족'); continue     # 되돌리고 새 행동을 거절
      if cost: budget -= cost
      accepted[i] = a; reject(keep, '같은 장소 (교리에 맞는 행동 우선)')
    else:                                        reject(a, '같은 장소')
    continue                                     # 교체는 행동 수를 늘리지 않으므로 limit 검사가 없다
  if len(accepted) >= limit:                      reject('행동 수 초과'); continue
  if cost: budget -= cost
  accepted.push(a)
```

(예전에는 교체 때 예산을 다시 계산하지 않아 마을 둘이 함께 받아들여지고 해결 때 하나가 실패할 수 있었다 — `afab303`에서 고쳤다, §19-2.)

`DOCTRINE_PREF`: `war → [attack, build]`, `peace → [preach, pray]`, `abundance → [gather, build]`, `wisdom → [pray, explore, build]`.

한 진영은 **한 칸에 한 행동**만 한다(검증·기본 노동·율법파 계획 모두 칸 중복을 막는다).

### 3.5 기본 노동 `autoFill`

`autoFill(side, accepted, forbidden, doctrine = null)` (`engine.js:461-497`). 명령 뒤 남은 행동 수를 신도들이 채운다. 반환값에 `auto: true`.

```text
limit = actionLimit(side);  used = accepted의 칸들;  filled = []
# 1) 뜻을 헤아린 한 자리 (플레이어, 계시에 교리가 있고 DOCTRINE_LABOR에 그 교리가 있을 때만)
DOCTRINE_LABOR = { peace: [preach, pray], war: [attack, wall], wisdom: [explore, pray] }   # 풍요는 없다
if side == player and doctrine in DOCTRINE_LABOR and len(accepted) < limit:
    legal = legalActions(side) 중 금지 아니고 칸 미사용인 것 (legalActions 순서)
    left  = 진영 자원의 사본; accepted의 건설마다 pay(left, buildCost(그 건설))   # 받아들인 건설을 치르고 남은 것
    for kind in DOCTRINE_LABOR[doctrine]:
        cand = legal 중 (kind == wall ? build == wall and canPay(left, COST.wall) : type == kind)
               이고 (선교·공격이면 actionOdds(a) >= 0.5)
        if cand: filled += cand[0] (heeded: true); used += 그 칸; break
# 2) 예전과 같은 기본 노동
order = ['food','wood','stone']을 현재 보유량 오름차순 안정 정렬
pool  = legalActions(side) 중 gather이고 금지 아닌 것 (legalActions 순서)
prayFirst = legalActions(side)의 pray (금지 아니면)
if side == player and faith <= 2 and prayFirst and 그 칸 미사용 and len(accepted) + len(filled) < limit:
    filled += prayFirst
for res in order + order:                           # 6번
    if len(accepted) + len(filled) >= limit: break
    pick = pool에서 gather == res이고 칸 미사용인 첫 행동
    if pick: filled += pick
if len(accepted)+len(filled) < limit and pray 있음 and 수도 칸 미사용: filled += pray
```

- 헤아린 자리의 승률 문턱은 확인 화면 기준(`actionOdds`, 저주 보정은 아직 없음)이다. 성벽은 `legalActions`(현재 보유 자원으로 거름)에 더해, **받아들인 건설의 비용을 치르고 남은 자원**(`left`)으로 성벽 비용(돌 2)을 낼 수 있을 때만 고른다(`e68a240`, §19-19). 그래서 받아들인 성벽·신전이 돌을 먼저 쓰면 헤아린 성벽은 나오지 않고 다음 종류(없으면 기본 노동)로 넘어간다.
- 풍요는 `DOCTRINE_LABOR`에 항목이 없다 — 모자란 자원부터 거두는 아래 기본 노동이 곧 풍요의 뜻이라, 풍요 계시의 기본 노동은 교리 없음과 같다(`e68a240` 전에는 `abundance: [gather]`를 두고 늘 건너뛰었다).
- 헤아린 행동도 `auto`라서 되풀이에 굳는 율법(§4.9)의 셈에는 들지 않는다.
- 율법파의 기본 노동(`planEnemy` 끝)과 **침묵**은 교리 없이 부르므로 헤아린 자리가 없다. 침묵일 때 플레이어 계획 = `[pray(auto)] + autoFill(player, [pray])` (기도할 수 없으면 `autoFill(player, [])`) (`main.js:644`).
- 예: 5×5 보통 시드 2026, 1장 "기도하라"(지혜) → 명령 `pray:E2:`, 기본 노동 `explore:B1:`(헤아림) · `gather:C2:stone`.

### 3.6 확정 `accept`

`main.js:698-743`. 엔진 호출 순서:

1. `enemyPlan = planEnemy(state)` — **말한 기적·말투·갈림길 비용보다 먼저** 정한다.
2. 말한 기적(빼지 않았으면) `castMiracle(id, target)` (§6.2). 실패해도 계속.
3. `applyTone(state, text ? tone : null)` (§14.4). 침묵이면 말투 보정을 모두 지운다.
4. 침묵이면 `streak = null`.
5. 갈림길 계절이면 `pick = 글로 고른 선택 ?? dilemmaPick ?? 첫 선택` → `payDilemma(pick)` (§7.2).
6. `plan = accepted + auto`. 계명을 새기기로 했고 `carveCommandment` 성공이면 계획에서 그 계명이 금한 행동을 빼고 `autoFill(player, kept, forbidden + 뺀 칩, doctrine)`로 다시 채운다 (§14.6). 확인 화면에서 뺀 칩(`pending.dropped`)도 금지 키로 넘기므로 다시 채울 때 되살아나지 않는다(`main.js:724`, `e68a240`).
7. 계시가 있으면 `findSacred(text)` (§14.10).
8. 예언을 봉인했으면 `sealProphecy` (§14.7).
9. `resolveRound(state, plan, enemyPlan)` (§3.7).
10. 승자 없으면 `applySilence(state, !!text)` (§14.9).
11. 승자 없고 계시 있으면 `markLegends` (§13.4).
12. 승자 없고 계시 있으면 `keepVows(result.forbidden, plan)` (§14.3).
13. 승자 없으면 `wordsAfter`: 청원 응답/외면 → 이름 은총 (§14.3).
14. 계시 있으면 `recordRevelation(text, doctrine, tone == 'metaphor' ? 1 : 0)` (§5.1). 메아리면 교리가 오르지 않는다 (§14.8).
15. 이번 장에 **첫 이름**을 붙였고 `wisdom < 3`이면 `wisdom += 1`.
16. LLM 해석이면 신학 노트 추출 ([05](05-interpreter.md)) — 엔진 수치 없음.

> 10~16은 `resolveRound` 안의 **유지 단계와 승패 판정 뒤**에 일어난다. 그래서 마지막 장의 승점에는 이번 장 은총·교리·침묵 벌이 들어가지 않고, 이번 장 계시로 오른 교리 특전은 **다음 장부터** 적용된다.

### 3.7 해결 `resolveRound`

`engine.js:871-901`.

1. **동시 공개와 막기**: 선 진영(`state.first`) 계획에서 **집 안 행동을 뺀** 행동의 칸 집합을 만든다. 후 진영 행동 중 **집 안 행동이 아니면서** 그 집합에 든 칸을 노리는 것은 모두 **막힘**(`blocked`) — 해결하지 않고 `log.blocked`만 남긴다(난수 없음).
   - 집 안 행동 `home(a)` = `a.type == 'pray'` 또는 `a.type == 'build' && a.build in [temple, cathedral, wall]`. 제 수도·건물 안에서 하는 일이라 칸을 **차지하지도(`5b7a94f`) 막히지도(`e68a240`) 않는다** — 선후와 무관하게 양쪽이 같다. 그래서 선 진영이 수도에서 기도·신전·대성당을 하거나 수도·마을에 성벽을 올려도 같은 장 상대의 그 칸 공격·선교는 막히지 않고, 거꾸로 선 진영이 상대 수도를 공격·선교해도(대성당 원정 포함) 상대의 그 수도 기도·신전·대성당·성벽은 그대로 해결된다. 공격이 마지막 단계라 집 안 행동이 먼저 해결된 뒤 판정된다.
   - 칸을 차지하고 막힐 수도 있는 행동: 채집, 마을 건설, 탐험, 선교, 공격. 예: 짝수 장(율법파 선)에 율법파가 우리 마을을 공격하면 같은 장 우리가 그 마을에서 하는 채집은 막힌다.
2. **6단계**: `PHASE_ORDER = [gather, build, pray, explore, preach, attack]`. 단계마다 선 진영의 그 종류 행동을 계획 순서대로, 그다음 후 진영. 막힌 행동과 `state.winner`가 정해진 뒤의 행동은 건너뛴다. 각 행동은 `resolveAction` (§3.8).
3. `pendingDilemma`가 있고 승자가 없으면 `resolveDilemma(pendingDilemma, prepaid=true)` → `pendingDilemma = null` (§7.2).
4. 승자가 없으면 `upkeep` (§3.10).
5. `updateLawGuard(playerPlan)` — **승자가 있어도** 값은 바꾼다(기록은 승자가 없을 때만). 튜토리얼 제외 (§4.9).
6. `recordHistory` — **승자가 있어도** 부른다 (§3.11).

### 3.8 행동별 규칙

#### 합법 행동 `legalActions(side)` (`engine.js:373`)

만드는 순서(= 목록 순서; 율법파 선택과 기본 노동이 이 순서를 쓴다):

1. `reach(side)`의 칸마다(§1.7 순서 — 율법파는 원정 `marchRange`만큼 수도의 손이 길다; 플레이어는 `revealed` 아닌 칸 건너뜀):
   - **채집**: `yieldOf(칸).gather`가 있고, 상대 소유가 아니고, 수도가 아니면 `gather`.
   - **마을**: 주인·건물 없고, `canPay(현재 자원, {wood 2, food 1})`, (플레이어) 계명 `noExpand` 없음.
   - 상대 소유 칸이면 **선교**, 그리고 (플레이어) 계명 `noSword` 없고 시련 `earth`가 아니면 **공격**.
2. 자기 소유 칸(행 우선) 중 건물이 있고 성벽이 없고 돌 2가 있으면 **성벽**.
3. (율법파만) **대성당 원정**: 우리 `cathedral >= 1`이고 우리 수도가 있고 1에서 우리 수도 공격이 아직 목록에 없으면(= reach 밖이면) `{ type:'attack', tile: 우리 수도, crusade: true }` (`engine.js:396-397`, §10).
4. 자기 수도가 있으면 **기도**; `templeLevel < 3`이고 비용이 되면 **신전**; (플레이어만) `templeLevel == 3 && cathedral < 3 && 우리 마을 수 >= cathedralVillages`이고 비용이 되면 **대성당**.
5. (플레이어만) **탐험**: `reach`의 칸마다 이웃(방향 순서) 중 `revealed`가 아니고 `reach`에 없는 칸 (처음 나온 순서, 중복 없음).

#### 행동 요약

| 종류 | 누가 | 대상 | 비용 | 효과 | 난수 (`rng.dice`) |
|---|---|---|---|---|---|
| 채집 `gather` | 양쪽 | reach 안의 채집 가능 칸 | — | 자원 `+gatherAmount` | 없음 |
| 마을 `build village` | 양쪽 | reach 안의 빈 칸 | 목재 2, 식량 1 | 칸 소유 + 마을 | 없음 |
| 성벽 `build wall` | 양쪽 | 자기 수도·마을 | 돌 2 | `wall = true` | 없음 |
| 신전 `build temple` | 양쪽 | 자기 수도 | 돌 `2L`, 목재 `L+1` (`L` = 현재 단계) | 단계 +1; 율법파면 석판 +2 | 없음 |
| 대성당 `build cathedral` | 플레이어 | 자기 수도 (마을 조건 §10) | §10 | 공사 +1; 3이면 승리 | 없음 |
| 기도 `pray` | 양쪽 | 자기 수도 | — | 신앙 `+prayValue` | 없음 |
| 탐험 `explore` | 플레이어 | reach 바로 바깥 안개 | — | 드러냄 + 보물 | 0~2회 |
| 선교 `preach` | 양쪽 | reach 안 상대 칸 | — | 개종 판정 | 2회 |
| 공격 `attack` | 양쪽 | reach 안 상대 칸 (율법파는 대성당 공사 중이면 우리 수도도) | — | 전투 판정 | 2회 |

#### 채집 (`engine.js:1144`)

- 칸이 해결 시점에 상대 소유면 실패(`log.gatherFoe`). (채집이 첫 단계라 실제로는 일어나지 않는다.)
- 양 `gatherAmount(side, tile)`:

  ```text
  n = yieldOf(tile).amount
  if 채집 자원 == food:
      if event == drought and not rainActive:  n -= 1      # 평원·강·오아시스 모두 (§19)
      if event == harvest and tile.terrain == plain: n += 1
      if side.doctrine.abundance >= 2:        n += 1
  if side == player and roundMods.gatherBonus: n += 1    # 축복 말투
  n = max(0, n)
  ```
- 플레이어 채집이 해결되면 `roundMods.gatherBonus = 0` → 축복 +1은 **이번 장 플레이어의 첫 채집 한 번**(선후와 계획 순서상 첫째).

#### 건설 (`engine.js:1156`)

- 해결 시점에 `canPay(현재 자원, buildCost)`가 아니면 실패(`log.buildNoRes`). 채집이 먼저 해결되므로 이번 장 채집한 자원으로 지을 수 있다.
- `buildCost`:

  | 건물 | 비용 | 보정 |
  |---|---|---|
  | village | 목재 2, 식량 1 | — |
  | wall | 돌 2 | — |
  | temple | `{ stone: 2L, wood: L+1 }` (1→2: 돌 2·목재 2, 2→3: 돌 4·목재 3) | 플레이어: 계명 `noExpand`면 돌 −1, 은사 `mason`이고 `L == 1`이면 돌 −1 (각각 최소 0) |
  | cathedral | `CATHEDRAL[min(2, cathedral)].cost` | 빠른 판이면 각 값 `ceil(v × 0.7)` |
- 마을: 칸에 이미 주인이 있으면 실패(`log.villageTaken`). 성공하면 `owner = side`, `building = 'village'`, 플레이어면 `revealed = true`.
- 성벽: 지불하고 `wall = true`.
- 신전: `templeLevel >= 3`이면 **아무 기록 없이** 끝. 아니면 지불, `templeLevel += 1`, 율법파면 `raiseEdict(+2)`.
- 대성당: 지불, `cathedral += 1`. `cathedral >= 3`이면 즉시 `winner = side`, `winKind = 'cathedral'` — 이후 행동은 해결되지 않는다.

#### 기도 (`engine.js:1151`)

`faith += prayValue(side)`.

#### 탐험 (`engine.js:1179`)

```text
tile.revealed = true; 이웃 모두 revealed = true
if event == prophet:  faith += 3                 # 난수를 쓰지 않는다
elif rand(dice) < 0.5:
    res = ['wood','stone','faith'][floor(rand(dice) * 3)];  side[res] += 2
else: 드러내기만
```

드러난 발견지는 유지 단계의 `discoverSites`에서 발견된다.

#### 선교 (`engine.js:1190`)

```text
if tile.owner != foe or foe.pop <= 0:  실패 기록, 난수 없음
bonus = preachBonus(side)
def   = (tile이 수도 ? 1 : 0) + (tile.wall ? 1 : 0) + lawGuardOf(side, 'preach')   # 굳은 율법 (우리 선교에만, §4.9)
ra = d6(); rd = d6()                              # 공격측 먼저
win = ra + bonus > rd + def                       # 동점은 실패
if win:
    foe.pop -= 1; side.pop += 1                   # 인구 한도를 보지 않는다
    if player: stats.converted += 1; deed(key, 'preach')
    if tile이 마을:
        faithMarks = (같은 진영의 표식이면 n+1, 아니면 {side, n:1}), round = 지금 장
        if faithMarks.n >= 2: tile.owner = side; faithMarks = null   # 성벽은 남는다
                              (player면 stats.turned += 1, revealed = true)
```

- `preachBonus`: 율법파 = `(peace>=2) + (peace>=4) + enemyZeal`(교리는 늘 0이라 승천 4의 3막에만 +1). 플레이어 = `min(2, (peace>=2) + (peace>=4) + (계명 noSword) + (설교자 성인) + (은사 preacher이고 converted == 0)) + roundMods.tongues`. 방언은 상한 밖이다.
- **선교에는 신도 수 우위(superiority)가 없다** (§19).
- 믿음의 표식은 유지 단계에서 `round - faithMarks.round >= 2`면 하나 줄어든다 → 성공 뒤 **다음 두 장 안**에 다시 성공해야 넘어온다.
- 수도 선교는 인구만 옮긴다.

#### 공격 (`engine.js:1216`)

```text
if tile.owner != foe:  실패 기록, 난수 없음
atk = (war>=2) + (war>=4) + superiority(side, foe)
    + (side == enemy and event == threat ? 1 : 0)
    + enemyZeal(side)                                     # 승천 4, 3막 율법파 +1
    + siegeOf(side, tile)                                 # 포위: 우리가 율법파 수도를 칠 때 +1/+2
    + (side == player ? roundMods.attackBonus(저주) + roundMods.pillar : 0)
guardian = (foe == player and tile이 수도 and 수호자 성인 있음) ? 1 : 0
def = (tile.wall ? 2 : 0) + (tile이 수도 ? 1 : 0) + superiority(foe, side) + guardian
    + lawGuardOf(side, 'attack')                          # 굳은 율법 (우리 공격에만, §4.9)
ra = d6(); rd = d6()
win = ra + atk > rd + def                                 # 동점은 방어 승
```

- **포위** `siegeOf` (`engine.js:259`): 율법파 수도의 이웃(최대 6칸) 중 우리 소유 칸(마을)이 2개면 +1, 3개 이상이면 +2. 율법파 공격·마을 공격에는 없다.

패배(`!win`):
1. 방어측이 우리 수도면 `deed('guard:' + round, 'guard')` (수호자 성인 후보, §13.2).
2. 공격측이 전쟁 궁극(`hasUlt(side,'war')`, 플레이어만)이고 `faith >= 2`면 `faith -= 2`, 인구 손실 없음.
3. 아니면 공격측이 플레이어이고 `roundMods.ark`면 손실 없음.
4. 아니면 공격측이 플레이어면 `fallen(key)` (그 이름의 성인은 순교).
5. 공격측이 율법파이고 튜토리얼이 아니면 **퇴각**: `enemy.food = max(0, food − 1)`, 인구 손실 없음 (`log.attackRetreat`, §4.9).
6. 그 밖(플레이어, 튜토리얼의 율법파)은 `side.pop = max(0, pop - 1)`.

승리:
1. 방어측이 플레이어이고 `roundMods.ark`가 아니면 `foe.pop = max(0, pop - 1)`. (방주면 인구는 지키지만 칸은 빼앗긴다.)
2. 공격측이 플레이어면 `bloodKills += 1`; 3의 배수마다 `raiseEdict(+1)`.
3. 수도면: `foe.capitalHp -= 1`. 방어측이 플레이어이고 `cathedral >= 1`이면 `cathedral -= 1` (**어느 단계든** 한 단계 무너진다, 방주도 막지 못한다). `capitalHp <= 0`이면 `winner = 공격측`, `winKind = 'capital'`, `winReason = t('eng.win.capital', { who: 공격측 })`("적 수도 점령" / 율법파가 이기면 "우리 수도 함락"). **수도는 빼앗기지 않는다.**
5. 1에서 방어측 인구가 0이 되어도 여기서는 끝나지 않는다 — 그 장 유지 단계 끝 `checkVictory`의 **남은 자**(§15.2)가 수도를 흔들고 한 명을 돌려보낸다.
4. 마을이면: `owner = 공격측`, `wall = false`, `faithMarks = null`; 플레이어면 `stats.captured += 1`.

### 3.9 갈림길 결과

§7.2. 비용(음수)은 확정 5단계에서 이미 냈고, 6단계 해결 뒤·유지 전에 나머지를 적용한다.

### 3.10 유지 `upkeep`

`engine.js:1261-1332`. 정확한 순서:

```text
brokeFaith = player.faith <= 0                    # 수입이 들어오기 전에 본다
for side in [player, enemy]:
    s = sides[side]
    if s.pop <= 0: continue                       # 사라진 부족은 생산·수입·성장 없음
    s.food += 2 + villageCount(side)              # 수도 2 + 마을마다 1
    s.food -= s.pop                               # 신도 1명당 1
    if player and 계명 noFamine: s.food -= 1
    if s.food < 0 and player and (roundMods.ark or 계명 noFamine):
        s.food = 0                                # 굶주림 없음, 성장도 없음
    elif s.food < 0:
        s.food = 0; s.pop = max(0, s.pop - 1); if player: stats.starved += 1
    else:
        growCost = (s.doctrine.abundance >= 4 or (player and 시련 earth)) ? 1 : 2
        if s.pop < popCap(side) and s.food >= growCost + ceil(s.pop / 2):
            s.food -= growCost; s.pop += 1
    s.faith += faithIncome(side)                  # 바뀐 pop 기준
    if event == plague and s.pop > 1 and not (player and roundMods.ark): s.pop -= 1
# 믿음의 표식 감소
for tile in tiles: if faithMarks and round - faithMarks.round >= 2:
    faithMarks.n -= 1; faithMarks.round = round; if n <= 0: faithMarks = null
# 평화 궁극 (§5.3)
# 검열: lawCard.ban이면 bannedNext = frequentNoun(revelations) ?? hashPick(eng.banWords, seed, round)
# 신앙 바닥
if brokeFaith:
    player.faithless += 1
    if player.faithless > 1 and player.pop > 1: player.pop -= 1; enemy.pop += 1    # 율법파로 이탈
    else: 경고만
else: player.faithless = 0
checkProphecy → holyAndEdict → checkDestiny → updateVision → discoverSites → checkVictory(final=true)   # 남은 자가 먼저 돈다 (§15.2)
```

- 검열 대상 `frequentNoun`은 지금까지의 계시(이번 장 계시는 아직 기록 전이라 빠짐)에서 명사별 "나온 계시 수"가 가장 많은 것, 동점은 먼저 나온 것. 명사 추출은 [05](05-interpreter.md).
- 이탈·검열·예언·석판 뒤에 승패를 본다(§15).

### 3.11 장 기록 `recordHistory`

`engine.js:911-933`. `resolveRound` 끝에(`updateLawGuard` 다음) 항상:

1. `history.push({ round, ps: score(player), es: score(enemy), res: 플레이어 자원·인구, text: null })` (확정 뒤 `text`를 채운다).
2. `checkDestiny`.
3. 튜토리얼이거나 승자가 있으면 끝. 아니면 **신의 분노** 갱신 (§6.4).
4. 이어서 **율법파의 결집** 갱신 (§4.9): `round >= wrathRound && ps − es >= 8`이면 `rally = true`, 아니면 `ps − es <= 4`일 때 `rally = false`, 그 사이면 그대로. 새로 켜지면 `log.rally` (율법파 수도 칸, `fx.kind: 'rally'` — `e68a240` 전에는 `'wrath'`를 빌려 썼다).

### 3.12 해결 뒤 말의 장치

§3.6의 10~16. 수치는 §14.

### 3.13 다음 장

재생이 끝나면 `pendingSite`가 있고 판이 끝나지 않았으면 유목민 선택(`resolveSite`, §13.3). 그다음 승자가 있으면 종료, 없으면 `startRound`. 해결 뒤 상태(`'resolved'`)로 저장한 판을 불러와도 `pendingSite`가 있으면 다음 장 전에 유목민 선택을 먼저 묻는다(`resumeLoaded`, `main.js:287-298`). 승자가 **말하기 단계의 기적**으로 정해지면(심판의 날, 번개로 전원 소멸 등) 그 장은 확정·해결 없이 바로 끝난다.

---

## 4. 율법파 (오토마)

### 4.1 율법 카드

`LAW_CARDS` (`data.js:271`). 카드마다 규칙 세 줄. 율법파는 카드의 세 줄을 **두 번** 차례로 시도한다. 그 앞과 사이에 대성당 원정·결집·막마다 칼의 공격 규칙이 끼어든다(§4.4, §4.9).

| id | 이름 | 규칙 1 | 규칙 2 | 규칙 3 | 비고 |
|---|---|---|---|---|---|
| L1 | 확장 | 마을 | 채집 wood | 채집 food | |
| L2 | 수확 | 채집 food | 채집 food | 기도 | |
| L3 | 채석 | 채집 stone | 성벽 | 채집 wood | |
| L4 | 요새 | 성벽 | 채집 stone | 기도 | |
| L5 | 성전 | 공격 | 공격 | 채집 food | |
| L6 | 경건 | 기도 | 신전 | 채집 food | |
| L7 | 교화 | 선교 | 선교 | 기도 | |
| L8 | 절제 | 채집 food | 신전 | 마을 | |
| L9 | 개척 | 마을 | 마을 | 채집 wood | |
| L10 | 검열 | 채집 food | 채집 wood | 기도 | `ban: true` — 유지 단계에 다음 장 봉인할 말을 정한다 |

### 4.2 율법 풀 `lawPool`

`engine.js:175`.

- 튜토리얼: `LAW_CARDS`에서 `L5, L7, L10`을 뺀 7장.
- 그 밖: `LAW_CARDS` 중 (`L10`은 `veteran && difficulty != 'easy'`일 때만) 지도자가 `remove`한 카드를 뺀 것 + 지도자 `add` 카드 + (시련 `sword`면 `L5` 두 장 더).

### 4.3 이번 장 카드 고르기

`engine.js:574-597`. 장 시작 10~12단계.

1. `lawCard = lawDeck.pop()`.
2. 들은 말 `heard`: `vowNext`가 있으면 `'vow'`, 아니면 **지난 장**(`round - 1`) 계시의 `doctrine`. 쉬움·튜토리얼은 반응하지 않는다.
3. 반응 표 `REACT`: `war → [L4, L3]`, `peace → [L7]`, `abundance → [L2, L9]`, `wisdom → [L6]`, `vow → [L5]`. `pref(card) = react.cards에 있으면 2, 아니면 0`.
4. **어려움**(튜토리얼 제외): `alt = lawDeck.pop()`. `lawThreat(alt) + pref(alt) > lawThreat(lawCard) + pref(lawCard)`이면(엄격히 클 때만) `lawCard = alt`. 고르지 않은 카드는 **버린다**(덱에 돌아가지 않음). `pref(lawCard)`면 `reacted = heard`.
   - `lawThreat(card)` = 카드 규칙 세 줄마다, 지금 `legalActions('enemy')`에 그 규칙과 맞는 행동(`type` 같고, 규칙에 `build`/`gather`가 있으면 그것도 같음)이 하나라도 있으면 가중치 `attack 3, preach 2, build 2, pray 1, gather 1`을 더한 값.
5. 보통: `pref(lawCard)`면 `reacted = heard`. 아니면 반응이 있을 때 덱 위 세 장(인덱스 `len-1, len-2, len-3`, 위부터)에서 `pref`인 첫 카드를 찾아 **지금 카드와 자리를 바꾼다**(지금 카드는 그 자리로 들어간다), `reacted = heard`.

`vowNext`는 서원(공격 금지, §14.3)이나 갈림길 「율법 심문관 — 쫓아낸다」가 `'attack'`으로 켠다.

### 4.4 계획 `planEnemy`

`engine.js:516-540`. 확정 1단계에서 한 번 계산하며(`enemyIntent` 표시도 같은 함수), 난수를 쓰지 않는다.

```text
ZEAL_ACT = { normal: 3, hard: 2 }                      # 쉬움은 없음
limit = actionLimit(enemy);  pool = legalActions(enemy);  used = {};  plan = []
rush  = player.cathedral >= 1 ? [{type:'attack', target:'capital'}] : []      # 대성당 원정 (§10)
rally = state.rally ? [{type:'attack'}] : []                                  # 결집 (§4.9)
act   = tutorial ? 1 : actOf
tail  = act >= ZEAL_ACT[difficulty] ? [card.rules[0], {type:'attack'}, card.rules[1], card.rules[2]]
                                    : card.rules                              # 막마다 칼 (§4.9)
rules = rush + rally + tail + card.rules                                      # 두 번째 바퀴에는 칼이 없다
for rule in rules:
    if len(plan) >= limit: break
    if rule.type in (attack, preach) and enemy.pop < 2: continue
    pick = pickForRule(rule, pool 중 칸 미사용)
    if not pick and rule.type in (attack, preach) and not tutorial:
        pick = pickForRule({type:'build', build:'village'}, pool 중 칸 미사용)   # 대체 마을 (§4.9)
    if pick: used += pick.tile; plan += pick
plan += autoFill(enemy, plan)          # 교리 없음: 부족한 자원 순 채집 → 남으면 기도
```

`pickForRule` (`engine.js:496`): 후보 = 종류(와 `gather`/`build`)가 맞는 행동.
- `target: 'capital'`(대성당 원정): 후보 중 수도 칸만, 없으면 없음. 공사가 시작되면 `legalActions`에 원정 공격(§3.8 3단계)이 들어가므로 우리 수도는 거리와 무관하게 늘 후보다.
- 공격·선교: 점수 `(마을 ? 0 : 2) + (성벽 ? 1 : 0)` 오름차순 안정 정렬의 첫째 → 성벽 없는 마을 → 성벽 있는 마을 → 수도.
- 마을·성벽 건설: 우리 수도까지 거리 오름차순(안정)의 첫째 → 우리 쪽으로 뻗는다.
- 그 밖(채집·기도·신전): `legalActions` 순서의 첫째.

`pool`은 계획 시작 시점의 자원으로 한 번 만들고 예산을 나누지 않으므로, `L9`처럼 마을 둘을 계획하거나 대상 없는 공격·선교 규칙 여럿이 대체 마을로 바뀌면 해결 때 자원이 모자라 뒤의 마을이 실패한다(§19-12).

율법파는 탐험하지 않고, 신앙 채집(언덕)도 하지 않는다(기본 노동은 식량·목재·돌만).

### 4.5 지도자 `ENEMY_LEADERS`

수치 보너스는 없고 덱 구성만 바꾼다. 대사는 해시로 고르는 연출(`leaderLine`).

| id | 이름 | 덱 더함 | 덱 뺌 | 제외 난이도 |
|---|---|---|---|---|
| `elder` | 장로 하르쿤 | — | — | |
| `iron` | 철의 대제사장 바락 | L5 | — | 쉬움 |
| `preacher` | 설교자 아모스 | L7 | L2 | |
| `builder` | 건축가 네훔 | L9, L6 | L5 | |

`builder`는 `L5`가 풀에 없으므로 2막의 성전 카드 삽입도 없다.

### 4.6 난이도

| | 쉬움 `easy` | 보통 `normal` | 어려움 `hard` |
|---|---|---|---|
| `enemyBonus` (행동 수) | 0 | +1 | +2 |
| 시작 자원 | §1.5 | §1.5 | §1.5 |
| 율법파의 뜻 공개 | 모든 행동 | 공격·선교·건설 | 공격만 |
| 지난 말에 반응 | 없음 | 덱 위 셋에서 교체 | 두 장 중 위협적인 쪽 (반응은 동점 깨기 +2) |
| 막마다 칼 `ZEAL_ACT` (§4.9) | 없음 | 3막부터 | 2막부터 |
| 원정·대체 마을·결집·퇴각·굳은 율법 (§4.9) | 있음 | 있음 | 있음 |
| 지도자 `iron` | 없음 | 있음 | 있음 |
| 검열 카드 L10 (veteran) | 없음 | 있음 | 있음 |
| 정경 교리 +1 | 적용 | 적용 | **없음** |
| 승천 | — | — | 1~5 (§16.4) |

### 4.7 율법파의 뜻 `enemyIntent`

`engine.js:733`. `planEnemy` 결과마다 `shown = 난이도 조건 && 그 칸이 revealed`. 튜토리얼은 쉬움처럼 전부. 청원 「위협」이 이것을 본다(§14.3). 결집·굳은 율법·원정 거리는 행동이 아니라 상태라서 화면이 뜻 카드에 따로 적는다(`lawBackHTML`, [06](06-ui-ux.md)).

### 4.8 율법파의 살림

- 유지 단계는 플레이어와 같은 식(생산·먹기·성장·신앙 수입·역병). 교리가 늘 0이라 성장 비용 2, 인구 한도 `3 + 2×마을`.
- 율법파 신앙은 기도·수입으로만 쌓이고, 쓰는 곳은 **율법 석판**뿐: 유지 단계에 `faith >= 10`이면 `faith -= 10`, 석판 +1 (장당 한 번, `edictOn`일 때만; 꺼져 있으면 신앙이 그냥 쌓인다).
- 율법파는 계시 비용·기적·교리·말투가 없다. 대성당을 짓지 않는다.

### 4.9 율법파의 반격 — 원정·칼·대체 마을·결집·퇴각·굳은 율법

`afab303`에서 더한 규칙. 모두 **튜토리얼에는 없고**, 첫 판·veteran 구분 없이 적용된다(칼만 난이도를 본다). 난수를 쓰지 않는다. 평가(`docs/EVALUATION-2026-09-30.md`) 뒤 벤치마크(`tools/tests/bench.mjs`)에서 보통 난이도 판 중 율법파가 한 번도 공격하지 않은 판이 54% → 8%로 줄었다.

| 규칙 | 조건 | 효과 | 위치 |
|---|---|---|---|
| **원정** `marchRange` | 튜토리얼 제외 | 율법파 **수도**의 reach 반경 `2 + (actOf − 1)` → 1막 2칸, 2막 3칸, 3막 4칸. 마을 반경은 1 그대로. 채집·마을·선교·공격 후보가 모두 넓어진다 | `engine.js:209-218` |
| **막마다 칼** `ZEAL_ACT` | 보통 3막부터, 어려움 2막부터 (쉬움 없음) | 첫 바퀴에서 카드 규칙 1 다음에 `{type:'attack'}` 한 줄 | `engine.js:516, 527-528` |
| **대체 마을** | 튜토리얼 제외 | 공격·선교 규칙에 고를 대상이 없으면 그 자리에 우리 쪽으로 뻗는 마을 건설을 고른다. 신도가 2 미만이면 규칙 자체를 건너뛰므로 대체도 없다 | `engine.js:535` |
| **결집** `rally` | 장 기록(§3.11)에서 `round >= wrathRound`이고 `ps − es >= 8`이면 켜지고, `ps − es <= 4`면 꺼진다 (그 사이는 유지; 튜토리얼·승자 있을 때는 갱신 없음) | 켜져 있는 동안 율법파 행동 수 +1, 계획의 원정 다음 맨 앞에 `{type:'attack'}` 한 줄. 새로 켜질 때 `log.rally` | `engine.js:928-933`, `223`, `529` |
| **퇴각** | 율법파 공격 패배, 튜토리얼 제외 | 인구 대신 `food = max(0, food − 1)` (`log.attackRetreat`) | `engine.js:1233-1237` |
| **굳은 율법** `lawGuard` | 튜토리얼 제외 | 아래 | `engine.js:899-908`, `267` |

결집은 신의 분노(§6.4)의 거울이다: 분노는 우리가 6점(승천 3이면 8점) 이상 **뒤질** 때, 결집은 8점 이상 **앞설** 때 찬다.

**되풀이에 굳는 율법** (`updateLawGuard`, `resolveRound`의 유지 단계 뒤·장 기록 앞):

```text
spoken = playerPlan 중 auto가 아닌 행동(= 계시로 받아들인 명령)의 type 집합
for k in [preach, attack]:
    before = lawGuard[k]
    lawGuard[k] = k in spoken ? min(2, before + 1) : 0
    if lawGuard[k] > before and not winner: log.lawGuard(k, n)      # fx.kind 'guard'
lawGuardOf(player, k) = min(2, lawGuard[k])     # 우리 k 판정의 방어 보너스 (§3.8 선교·공격)
```

- 계시로 선교를 명령한 장 다음 장에 율법파의 선교 방어 +1, 두 장 연달아 명령하면 +2(최대). 명령하지 않은 장이 한 번 끼면 0으로 풀린다. 공격도 따로 같은 식.
- 장 끝에 갱신하므로 **이번 장 판정에는 지난 장까지의 값**이 쓰인다. 명령이 막히거나 실패해도 센다. 기본 노동(뜻을 헤아린 선교·공격 포함, §3.5)과 침묵은 세지 않는다.
- 해석기가 만든 명령만 보므로, 같은 뜻을 다른 낱말로 말해도 굳는다. 글 자체를 되풀이한 벌은 메아리(§14.8)가 따로 준다.
- 메아리(§14.8)와 함께 들어가, 벤치마크에서 가장 센 한 줄 반복 스크립트의 승률이 100% → 33%로 내려갔다(`afab303` 커밋 기록).

---

## 5. 교리

### 5.1 오르는 법

`recordRevelation(text, doctrine, extra)` (`engine.js:1395-1417`), 확정 14단계.

```text
d = player.doctrine
if isEcho(text):                                   # 메아리 (§14.8) — revelations에 아직 이번 계시가 없을 때 본다
    revelations.push({round, text, doctrine, echo: true}); log.echo; return   # 교리·대립·연속 모두 없음
if doctrine and d[doctrine] < 6: d[doctrine] += 1
if doctrine and extra and d[doctrine] < 3: d[doctrine] = min(6, d[doctrine] + extra)    # 비유 말투 extra = 1
revelations.push({round, text, doctrine})
if winner: return
if not doctrine: streak = null; return
# 교리 대립 (veteran, 튜토리얼 제외)
opp = OPPOSED[doctrine]            # peace↔war, abundance↔wisdom
if d[opp] > perkFloor(d[opp]): d[opp] -= 1          # perkFloor: 6→6, 4~5→4, 2~3→2, 0~1→0
# 연속
streak = (streak.doctrine == doctrine) ? {doctrine, n+1} : {doctrine, n:1}
if streak.n >= 3: streak = null; streakMiracle(doctrine)
```

- 계시의 교리를 정하는 방법(석판 규칙·LLM)은 [05](05-interpreter.md). 해석 결과 `doctrine`은 키 하나 또는 `null`(석판 해석은 교리가 정해지지 않았는데 금지한 행동이 있으면 `peace`, `interpreter.js:238`; LLM은 한국어 교리 이름을 키로 바꾼다).
- 다른 교리 증가: 첫 이름 붙이기(지혜 +1, `wisdom < 3`일 때), 갈림길 「신도들의 다툼 — 편을 든다」(§7.2), 전생의 유적(§13.3), 정경·시련 `earth` 시작값(§1.5).
- 대립으로는 이미 얻은 특전 칸(2·4·6) 아래로 내려가지 않는다.

### 5.2 특전

| 교리 | 2칸 | 4칸 | 6칸 궁극 (`round >= ultRound`부터) |
|---|---|---|---|
| 평화 `peace` | 선교 +1 | 선교 +1 (누적, 합 최대 +2) | 장이 끝날 때 이웃 율법파 마을에 스며듦 |
| 전쟁 `war` | 공격 +1 | 공격 +1 (누적) | 공격에 지면 신도 대신 신앙 2 |
| 풍요 `abundance` | 식량 채집 +1 | 성장 비용 2 → 1 | 인구 한도 +2 |
| 지혜 `wisdom` | 기도 신앙 +1 | 행동 수 +1 | 다가올 계절 두 장 중 하나를 고름 |

2·4칸 특전은 그 값이 되는 즉시(다음 해결부터) 적용된다. 궁극은 6칸이어도 `ultRound`(8장, 빠른 판 6장) 전에는 잠들어 있다. 6칸이면 소명 「한길의 자」는 바로 이룬다.

### 5.3 궁극 효과

- **평화**: 유지 단계(표식 감소 뒤)에 `hasUlt(peace) && enemy.pop > 0 && player.pop > 0`이면, `state.tiles` 순서로 첫 번째 "율법파 마을이면서 우리 소유 칸 중 하나와 거리 1"인 칸을 대상으로 `ra = d6(), rd = d6()`, `ra > rd + 1`이면 율법파 −1, 우리 +1(한도 무시, 표식 없음). 대상이 없으면 난수도 없다.
- **전쟁**: §3.8 공격 패배 2단계.
- **풍요**: `popCap +2`.
- **지혜**: §3.1 8단계와 `chooseEvent`.

### 5.4 연속 작은 기적 `streakMiracle`

같은 교리 계시가 **세 장 연속**이면(교리 없는 계시·침묵이 끊는다) 한 번 일어나고 연속이 0으로 돌아간다 (`engine.js:1420`). 첫 판에도 있다. 메아리(§14.8)는 연속을 늘리지도 끊지도 않는다(`recordRevelation`이 연속 계산 전에 끝난다).

| 교리 | 효과 |
|---|---|
| 평화 | 율법파 `pop > 0`이면 율법파 −1, 우리 `pop < popCap`이면 +1 |
| 전쟁 | 보이는(`revealed`) 율법파 성벽 중 우리 수도에서 가장 가까운 것(거리 오름차순 안정 정렬, 동점은 칸 순서)을 허문다. 없으면 율법파 신앙 −2(최소 0) |
| 풍요 | 식량 +4 |
| 지혜 | 우리 소유 칸에서 거리 ≤ 2인 칸 모두 드러냄 → `discoverSites` |

끝나면 `checkVictory(final=false)`.

---

## 6. 기적과 신의 분노

### 6.1 손패와 드래프트

| 기적 id | 이름 | 기본 비용 | 효과 |
|---|---|---|---|
| `lightning` | 번개 | 4 | 목표: 보이는 율법파 칸. 수도면 석판 −2. 성벽이 있으면 허물고, 없으면 율법파 인구 −1(최소 0). **수도 내구도는 줄지 않는다** — 다만 마지막 신도를 쓰러뜨리면 곧이은 `checkVictory`의 남은 자(§15.2)가 율법파 수도를 −1 한다 |
| `rain` | 단비 | 3 | 식량 +3, `rainActive = true` (이번 장 가뭄 무효) |
| `bounty` | 풍요 | 5 | 목재 +2, 돌 +2 |
| `manna` | 만나 | 3 | 식량 +4 |
| `ark` | 방주 | 3 | `roundMods.ark = true` (§6.3) |
| `tongues` | 방언 | 3 | `roundMods.tongues = 1` → 선교 +1 (상한 2 밖) |
| `pillar` | 불기둥 | 3 | `roundMods.pillar = 1` → 공격 +1; 우리 소유 칸에서 거리 ≤ 3인 칸 모두 드러냄 |
| `revive` | 부활 | 5 | `pop < popCap`이면 인구 +1, 아니면 신앙 +2 |
| `doom` | 심판의 날 | 0 | 숨은 기적 (§6.4) |

- 첫 판: `FIRST_HAND = [lightning, rain, bounty]`.
- veteran: `[a, b, c]` — `a = hashPick([lightning, rain], 'hand0', seed)`, `rest = [bounty, manna, ark, tongues, pillar, revive]`, `b = hashPick(rest, 'hand1', seed)`, `c = hashPick(rest − b, 'hand2', seed)`.
- 시련 `storm`: `[lightning, bounty, pillar]` 고정.
- **드래프트** (veteran, 튜토리얼 제외, `round == draftRound`): 풀 = 손패에 없는 기적(시련 `storm`은 `rain` 제외, `MIRACLES` 순서). 세 번 `pool.splice(floor(rand(deck) × len), 1)`로 후보 3장. 플레이어가 하나를 골라 손패에 더한다(`takeMiracle`). 심판의 날은 드래프트에 나오지 않는다.

### 6.2 쓰기

`castMiracle(id, target)` (`engine.js:746`).

- 조건: 손패에 있음(심판의 날은 `doomReady`), `!miracleUsed`, `faith >= miracleCost`. 번개는 목표가 율법파 소유이고 `revealed`여야 한다.
- 비용 `miracleCost = doom ? 0 : max(1, cost − wrath − (시련 storm && lightning ? 1 : 0))`.
- 지불 → 효과 → `miracleUsed = true`, `stats.miracles += 1` → `checkVictory(final=false)`.
- 쓰는 때: 말하기 단계의 카드(즉시), 또는 계시 속 말로 부른 **말한 기적**(확정 2단계, 말투·갈림길 비용보다 먼저). 말한 기적은 확인 화면에서 칩으로 뺄 수 있다. 말한 번개의 목표: 계시에 나온 이름 붙인 율법파 칸, 없으면 보이는 율법파 칸 중 마을 우선·우리 수도에서 가까운 순의 첫째 (`main.js:608`).

### 6.3 방주 `roundMods.ark`

이번 장(해결과 유지)에 플레이어는: 식량이 음수여도 굶주림 없음(식량 0), 역병 없음, 우리 공격이 져도 손실 없음, 율법파 공격에 져도 인구 손실 없음(칸·수도 내구도는 잃는다). 신앙 바닥 이탈·침묵 이탈은 막지 않는다. 갈림길 「역병 치료사 — 대가를 치른다」도 방주를 켠다.

### 6.4 신의 분노와 심판의 날

- `recordHistory`에서(튜토리얼·승자 있을 때 제외): `gap = es − ps`.
  - `round >= wrathRound`이고 `gap >= (승천 ≥ 3 ? 8 : 6)`이면 `wrath = min(3, wrath + 1)`
  - 그렇지 않고 `gap <= 3`이면 `wrath = max(0, wrath − 1)`
  - 그 사이면 그대로.
- 효과: 모든 기적 비용 −`wrath` (최소 1).
- `doomReady = wrath >= 3 && !tutorial`이면 **심판의 날**을 쓸 수 있다(비용 0, 장당 기적 한 번에 포함): 율법파 `capitalHp −1`(최소 0), 인구 −1(최소 0), `wrath = 0`, 석판 −2. `capitalHp <= 0`이면 `winKind = 'doom'`으로 승리.

---

## 7. 계절(사건)·갈림길·미라

### 7.1 계절 `EVENTS`

| id | 이름 | 규칙 효과 |
|---|---|---|
| `calm` | 평온한 계절 | 없음 |
| `drought` | 가뭄 | 식량 채집 −1 (양쪽, 단비가 없으면) |
| `harvest` | 풍년 | 평원 식량 채집 +1 (양쪽) |
| `plague` | 역병 | 유지 단계에 양쪽 인구 −1 (`pop > 1`일 때, 방주 제외) |
| `threat` | 율법파 집결 | 율법파 공격 +1 |
| `prophet` | 떠돌이 예언자 | 탐험하면 반드시 신앙 +3 (난수 없음) |

계절은 청원의 필요도 바꾼다(§14.3).

### 7.2 갈림길 `DILEMMAS`

veteran 판에 셋이 계절 덱에 섞인다(§2.5; 첫 덱에만, 보충 덱에는 없다). 계절처럼 한 장을 차지하며 그 장에는 계절 효과가 없다. 선택: 계시 속 말(`dilemmaByText`: 선택마다 `tags` 정규식, 첫 일치) > 버튼(`dilemmaPick`) > 첫 선택.

| id | 이름 | 선택 | `gain` | 그 밖 |
|---|---|---|---|---|
| `refugees` | 난민 행렬 | `take` 받아들인다 | 식량 −2 | 인구 +1 |
| | | `send` 돌려보낸다 | 신앙 −1 | |
| `pilgrims` | 순례자 | `host` 맞아들인다 | 신앙 +2, 식량 −1 | |
| | | `ignore` 지나보낸다 | — | |
| `inquisitor` | 율법 심문관 | `expel` 쫓아낸다 | 신앙 +1 | `provoke`: `vowNext = 'attack'` (다음 장 율법파가 L5 쪽으로 반응) |
| | | `soothe` 달랜다 | 식량 −2 | |
| `schism` | 신도들의 다툼 | `side` 한쪽 편을 든다 | — | 가장 높은 교리 +1, 인구 −1 |
| | | `reconcile` 둘 다 달랜다 | 신앙 −2 | |
| `merchant` | 떠돌이 상인 | `trade` 곡식을 내준다 | 식량 −3, 돌 +2, 목재 +2 | |
| | | `pass` 보낸다 | — | |
| `healer` | 역병 치료사 | `pay` 대가를 치른다 | 신앙 −2 | `ark`: 이번 장 방주 |
| | | `refuse` 거절한다 | — | |

**비용 치르기** `payDilemma(pick)` (확정 5단계, `engine.js:1055`):

```text
o = 고른 선택 (없으면 첫 선택)
if o.gain의 음수 항목 중 하나라도 보유량이 모자라면:
    affordable(x) = x.gain의 음수 항목을 모두 치를 수 있음
    o = (음수 항목이 없는 첫 선택) ?? (affordable인 첫 선택, choice 순서) ?? o    # 바뀌면 log.dilemmaFallback
for 음수 항목 (k, v): s[k] = max(0, s[k] + v)      # 가진 만큼만 치른다 — 자원이 음수가 되지 않는다
if o.ark: roundMods.ark = true
pendingDilemma = o.id
```

예: 「난민 행렬」(두 선택 모두 비용)에서 식량 1로 `take`를 고르면, 신앙이 1 이상이면 `send`로 바뀌고, 신앙도 0이면 `take` 그대로 식량을 0까지만 낸다(`afab303` 전에는 식량 −1이 되었다, §19-4).

**결과** `resolveDilemma(pick, prepaid=true)` (해결 뒤·유지 전, `engine.js:1074`):

```text
양수 gain 항목: s[k] = max(0, s[k] + v)
if o.pop > 0: pop < popCap ? pop += 1 : food += 2
if o.pop < 0 and pop > 1: pop -= 1
if o.doctrine: top = DOCTRINES.reduce((b,k) => d[k] > d[b] ? k : b, 'wisdom');  if d[top] < 6: d[top] += 1
               # 동점이면 wisdom이 최대값이면 wisdom, 아니면 peace→war→abundance 중 먼저 최대인 것
if o.provoke: vowNext = 'attack'
if o.edict:   raiseEdict(+o.edict)
if o.calm:    player.faithless = 0; silentRun = 0
if o.ark:     roundMods.ark = true
```

해결 중 승자가 정해지면 결과는 적용되지 않는다(이미 낸 비용은 그대로).

### 7.3 분열의 예언자 미라 `MIRA`

- 조건 (장 시작 7단계): `veteran && !tutorial && !miraDone && actOf >= 2` 이고 (`(peace >= 3 && war >= 3) || (abundance >= 3 && wisdom >= 3)` 또는 `player.faithless >= 1`).
- 방금 뽑은 계절을 덱 위로 되돌리고(다음 장에 나온다) `event = MIRA`, `miraDone = true`. 판당 한 번. `special`이라 지혜 궁극 선택이 없다.
- `miraQuote`: 교리가 있는 마지막 계시와 `MIRA_TWIST[doctrine]`로 만든 연출 문장.

| 선택 | `gain` | 그 밖 |
|---|---|---|
| `punish` 벌한다 | 신앙 +2 | 인구 −1 |
| `embrace` 품는다 | 신앙 +1 | 석판 +1 |
| `reconcile` 화해시킨다 | 신앙 −2 | `calm`: `faithless = 0`, `silentRun = 0` |

---

## 8. 세 막·절기·달

`actOf(state) = round < floor(m/4) + 1 ? 1 : round < ceil(2m/3) ? 2 : 3` (`m = maxRounds`). `actStart = round > 1 && actOf(round) != actOf(round − 1)`.

| `maxRounds` | 1막 | 2막 | 3막 |
|---|---|---|---|
| 5 (튜토리얼) | 1 | 2–3 | 4–5 |
| 8 | 1–2 | 3–5 | 6–8 |
| 12 | 1–3 | 4–7 | 8–12 |
| 14 | 1–3 | 4–9 | 10–14 |

막이 바꾸는 규칙:

| 무엇 | 조건 | 효과 |
|---|---|---|
| 성전 카드 | veteran, 2막 첫 장, 풀에 L5 | L5를 덱 위 네 번째에 끼움 |
| 평온 없음 | veteran, 3막 첫 장 | 계절 덱에서 `calm` 제거 (§19: 보충 덱) |
| 성지가 석판을 움직임 | `edictOn`, 2막부터 | §9 |
| 미라 | veteran, 2막부터 | §7.3 |
| 원정 | 튜토리얼 제외 (첫 판에도) | 율법파 수도의 손 2막 +1칸, 3막 +2칸 (§4.9) |
| 막마다 칼 | 보통 3막, 어려움 2막부터 (튜토리얼 제외) | 율법파 계획에 공격 한 줄 (§4.9) |
| 승천 4 | 3막 | 율법파 공격·선교 주사위 +1 (`enemyZeal`) |

예: 12장 판이면 원정 거리 `marchRange`는 1~3장 0, 4~7장 1, 8~12장 2.

이름(`ACTS`): 제1막·개척, 제2막·경쟁, 제3막·심판. **절기**(2막 첫 장 「하지제」, 3막 첫 장 「추수제」, 마지막 장 「동지의 밤」)와 **달 이름**(`monthOf = MONTHS[min(11, floor((round−1)×12 / maxRounds))]`)은 장 제목 연출일 뿐 규칙 효과가 없다.

---

## 9. 율법 석판과 성지

`edictOn = veteran && !tutorial`. 꺼져 있으면 `raiseEdict`는 아무것도 하지 않는다.

`raiseEdict(n)` (`engine.js:939`): `edict = clamp(edict + n, 0, edictMax)`; 바뀌었으면 기록, `edictMax − 2`를 처음 넘으면 경고. **승패는 유지 단계의 `checkVictory`에서만** 본다.

| 원인 | 변화 | 시점 |
|---|---|---|
| 율법파 신전 단계 상승 | +2 | 건설 단계 |
| 율법파가 성지 소유 (2막부터) | +1 | 유지 (`holyAndEdict`) |
| 율법파 신앙 ≥ 10 → 신앙 −10 | +1 | 유지 (`holyAndEdict`, 장당 1회) |
| 플레이어 공격 승리 3번마다 (`bloodKills % 3 == 0`, 수도 타격 포함) | +1 | 공격 단계 |
| 미라 「품는다」 | +1 | 갈림길 결과 |
| 플레이어가 성지 소유 (2막부터) | −1 | 유지 |
| 번개가 율법파 수도에 | −2 | 기적 |
| 심판의 날 | −2 | 기적 |

- 최대 `EDICT_MAX = 12`(승천 ≥ 2면 10). 가득 차면 율법파 승리(`edict`).
- 유지 단계 순서상 석판 변화(`holyAndEdict`)가 `checkVictory`보다 먼저라, 건설로 12가 되어도 같은 유지 단계에서 성지로 −1 되면 이기지 못한다.
- **성지**(`holyId`, §2.4): 그 칸에 **마을**을 가진 쪽이 소유자. 짓거나(빈 칸이면), 빼앗거나(공격), 넘기거나(선교 표식 2) 해서 얻는다. 소유자는 승점 +2 — 이 승점은 **첫 판·1막에도** 적용된다(석판 효과만 2막·veteran 조건).

---

## 10. 대성당

플레이어만 짓는다. 신전 3단계에서 세 번에 나눠 올린다(합계 = 한 번에 짓던 비용 `돌 11·목재 11·신앙 13`).

| 공사 | 이름 | 비용 (돌·목재·신앙) | 빠른 판 | 필요한 우리 마을 |
|---|---|---|---|---|
| 1 | 기초 | 4 · 4 · 4 | 3 · 3 · 3 | 1 |
| 2 | 벽 | 4 · 4 · 4 | 3 · 3 · 3 | 2 |
| 3 | 첨탑 | 3 · 3 · 5 | 3 · 3 · 4 | 3 |

- **마을 조건**: 다음 단계를 올리려면 우리 마을이 `cathedralVillages = cathedral + 1`개 이상 있어야 한다(`legalActions`, `engine.js:401`). 마을을 잃으면 다음 단계가 합법 행동에서 빠진다(이미 올린 단계는 그대로).
- **원정**: 공사가 1 이상이면 율법파의 `legalActions`에 우리 수도 공격이 **거리와 무관하게** 들어가고(`crusade: true`, `engine.js:396-397`), `planEnemy`가 그 공격을 계획 맨 앞에 둔다(율법파 신도가 2 이상이면). 선공 여부와 무관하게 공격 단계에서 판정되며, 막기 규칙(§3.7)은 보통 공격과 같다.
- **무너짐**: 율법파 공격이 우리 수도를 치면(승리) `cathedral >= 1`일 때 공사 −1 — 기초까지 포함해 **어느 단계든** 무너진다(`engine.js:1248`). 방주는 막지 못한다. 우리 신도가 모두 쓰러져 남은 자(§15.2)가 수도를 흔들 때도 한 단계 무너진다.
- 3단계 완공 즉시 승리(`cathedral`). 공사 단계마다 승점 +1.
- 이 세 규칙은 `afab303`에서 더했다: 7×7에서 "신전을 높이 세우라" 한 줄만 되풀이해 이기던 판(92~100%)이 0%가 되었다(벤치마크 `tools/tests/bench.mjs`).

---

## 11. 소명

`veteran && !tutorial && !challenge`인 판. 후보 = `DESTINIES` 키(시련 `earth`는 `sword` 제외)를 `hashPick([0..9], seed, 'dest', id)` 오름차순, 동점은 id 문자열 오름차순으로 정렬. 앞의 셋이 `destinyOffer`, 첫째가 기본 `destiny = { id, done:false }`. 1장에만 고를 수 있다.

확인: 유지 단계(승패 판정 전)와 `recordHistory`의 `checkDestiny`. 이루면 `done = true`, 승점 +5 (`DESTINY_POINTS`). 한 번 이루면 끝.

| id | 이름 | 조건 `test(state)` |
|---|---|---|
| `villages` | 넓히는 자 | `round <= 8 && 우리 마을 >= 4` |
| `convert` | 부르는 자 | `stats.converted >= 3` (선교 성공 누적) |
| `ultimate` | 한길의 자 | 우리 교리 하나가 6 이상 (장 제한 없음) |
| `temple` | 쌓는 자 | `round <= 6 && templeLevel >= 3` |
| `feeder` | 먹이는 자 | `round >= maxRounds && !stats.starved` |
| `fortress` | 지키는 자 | `round >= maxRounds && capitalHp >= 3` |
| `sword` | 치는 자 | `stats.captured >= 2` (공격으로 빼앗은 마을) |
| `namer` | 부르는 이름 | 이름 붙인 칸 3개 |

마지막 장의 유지 단계에서 `feeder`·`fortress`를 먼저 보고 승점을 매긴다. 확정 14단계(교리) 뒤에야 이루어지는 소명은 다음 장 확인 때 반영된다.

---

## 12. 심판의 기준과 승점

`scoreBreakdown(side)` (`engine.js:1335`). 합계 = Σ `n × w`.

| 항목 | `n` | `w` |
|---|---|---|
| 신도 | `pop` | 기준표 `pop` |
| 마을 | 마을 수 | 기준표 `village` |
| 신전 | `templeLevel` | 기준표 `temple` |
| 수도 | `capitalHp` | 기준표 `hp` |
| 성벽 (기준에 `wall`이 있을 때) | 자기 소유 칸 중 성벽 수(수도 포함) | 기준표 `wall` |
| 성지 | 소유면 1 | 2 |
| 대성당 | 공사 단계 (0이면 항목 없음) | 1 |
| 소명 (플레이어) | 이루었으면 1 | 5 |
| 신앙 (기준에 `faith`가 있을 때) | `floor(faith / w.faith)` | 1 |

| 기준 id | 이름 | pop | village | temple | hp | 그 밖 |
|---|---|---|---|---|---|---|
| `classic` | 기본 | 2 | 3 | 2 | 1 | |
| `wide` | 넓은 자 | 1 | 5 | 2 | 1 | |
| `fertile` | 번성한 자 | 3 | 2 | 1 | 1 | |
| `pious` | 경건한 자 | 2 | 2 | 3 | 1 | 신앙 3마다 1 |
| `steadfast` | 굳센 자 | 2 | 2 | 2 | 3 | 성벽마다 1 |

첫 판은 늘 `classic`. 율법파도 같은 기준으로 센다.

---

## 13. 이름 있는 신도·성인·발견지·전설

### 13.1 이름 있는 신도

`followerName(key) = hashPick(PETITIONERS, seed, key)` — 행동 `key`로 신도 이름이 정해진다(같은 칸 같은 행동 = 같은 사람). `PETITIONERS` 12명.

### 13.2 성인

`deed(key, kind)` (`engine.js:240`): `deeds[이름][kind] += 1`. 성인은 판에 최대 2명, 종류마다 1명.

| 성인 | 조건 | 효과 |
|---|---|---|
| 설교자 성인 `preacher` | 같은 이름으로 선교 성공 3번 (= 같은 칸 선교 `key`) | 플레이어 선교 +1 (상한 2 안) |
| 수호자 성인 `guardian` | 율법파의 우리 수도 공격을 막아낸 장의 `guard:<round>` 이름 (1번이면 된다) | 우리 수도 방어 +1 |

우리 공격이 져서 신도를 잃으면(`fallen(key)`) 그 이름이 쓰러진 자 목록에 들고, 그 이름의 성인은 사라진다.

### 13.3 발견지

`discoverSites` (`engine.js:817`): 유지 단계(시야 갱신 뒤)와 지혜 연속 기적 뒤. `state.tiles` 순서로 `revealed`이고 아직 `found`가 아닌 발견지마다:

| id | 이름 | 효과 |
|---|---|---|
| `altar` | 잊힌 제단 | 신앙 +3 |
| `spring` | 말하는 샘 | 목재 +2, 돌 +1 |
| `bones` | 거인의 뼈 | 돌 +3 |
| `nomads` | 떠도는 유목민 | 선택: `take` → `pop < popCap`이면 인구 +1, 아니면 식량 +2 / `send` → 신앙 +2 |
| `legacy` | 전생의 유적 | `config.legacy.doctrine`이 있고 그 교리 < 3이면 교리 +1, 아니면 신앙 +2 |

- 선택이 필요한 유목민은 `pendingSite`에 칸을 두고, 이미 기다리는 유목민이 있으면 다음 유목민은 발견하지 않고 남겨 둔다(나중 장에 발견).
- 유목민 선택은 그 장 재생이 끝난 뒤 한다(`resolveSite`, `main.js:1260`). 판이 끝난 장이면 하지 않는다.
- 발견지는 율법파와 무관하다(율법파는 발견하지 않는다).

### 13.4 전설이 된 땅

`markLegends` (확정 11단계): 명령한(자동 아닌) 행동이 빼앗기·넘기기·대성당을 이룬 칸에 별칭(판당 최대 3). **수치 효과 없음**(표시·연대기용).

---

## 14. 말의 장치 요약 (→ 05)

판별 방법(정규식·LLM)은 모두 [05 해석기](05-interpreter.md). 아래는 엔진·확정 순서에서의 **수치 효과**만.

### 14.1 계시 비용과 길이

`revelationCostFor(text)` (`engine.js:723-727`):

```text
base = (len(trim(text)) > 30 and 인용한 말 없음) ? 2 : 1
cost = base + (봉인된 말 중 하나라도 text에 있으면 1 : 0) + (isEcho(text) ? 1 : 0)
```

- 길이 상한 100자(시련 `cloister` 20자). 비용은 계시할 때 먼저 낸다(§3.3).
- **인용**(`citedWords`): 최근 세 장(`round−3 ≤ r < round`) 계시의 명사와 겹치는 명사(인용 제외어·봉인된 말 제외). 메아리로 기록된 계시도 인용 대상이다.
- **메아리** +1: §14.8. 예전의 성언 할인(세 번 쓴 구절은 길어도 1)은 되풀이를 벌하는 메아리와 어긋나 `afab303`에서 없앴다.
- 다시 해석 신앙 −1, 말 거두기 veteran 신앙 −1 (§3.3).

### 14.2 은총 `grantGrace`

`engine.js:613`. 청원·서원·이름에서 오는 신앙은 **장당 합계 1**(`gracePerRound`). 장이 바뀌면 사용량을 0으로. 한도가 차면 0을 준다(기록도 없음).

### 14.3 청원·서원

**청원** `makePetition` (장 시작 16단계, `engine.js:624`): 아래 목록에서 **첫 번째로 참인** 것.

| 순서 | 조건 | 필요 (`need`) |
|---|---|---|
| 1 | 가뭄이거나 `food < pop` | 식량 채집 |
| 2 | 율법파의 뜻에 **보이는** 공격이 있음 | 성벽 (공격 명령도 응답으로 인정: `alt = 'attack'`) |
| 3 | `faith <= 2` | 기도 |
| 4 | 역병 | 기도 |
| 5 | 떠돌이 예언자 | 탐험 |
| 6 | `pop >= popCap` | 마을 |
| 7 | `wood < 2` | 목재 채집 |
| 8 | 그 밖 | 없음 (`need = null`) |

응답: 명령(`accepted`)에 필요와 맞는 행동이 있거나, 계시 글이 청원의 `keys` 정규식에 맞으면. 확정 13단계 `wordsAfter`에서 `need`가 있을 때: 응답했으면 `stats.petitions += 1`, `petitionIgnored = 0`, 은총 +1. 아니면 `petitionIgnored += 1`, 2가 되면 0으로 돌리고 `faith = max(0, faith − 1)`. **침묵한 장도 외면으로 센다.**

**서원** `keepVows(forbidden, plan)` (확정 12단계): 해석이 금지한 행동 중 공격·선교 종류가 있으면 — 공격이 있으면 `vowNext = 'attack'`(다음 장 율법파 반응 `vow` → L5); 이번 계획에 그 종류가 하나도 없으면 은총 +1(`stats.vows += 1`).

`wordsAfter` (`main.js:763-774`) 안의 순서: 청원 → 이름. 은총 상한 때문에 앞의 것이 먼저 받는다(서원은 그보다 앞, 12단계). 예전의 **기이한 해석** 은총(LLM 명령이 계시와 무관하면 판당 한 번 +1)은 숨은 규칙이라 `afab303`에서 없앴다(남아 있던 `state.oddUsed`도 `e68a240`에서 지웠다).

### 14.4 말투 `applyTone`

확정 3단계. 이전 장 보정 `gatherBonus`·`attackBonus`를 지우고:

| 말투 | 효과 |
|---|---|
| 명령 `command` | 없음 |
| 축복 `blessing` | `roundMods.gatherBonus = 1` → 이번 장 플레이어 첫 채집 +1 |
| 저주 `curse` | `roundMods.attackBonus = 1` → 이번 장 플레이어 공격 +1; 즉시 `faith = max(0, faith − 1)` |
| 비유 `metaphor` | 교리 +1 더 (`recordRevelation`의 `extra = 1`, 그 교리 < 3일 때) |

판별 우선순위 저주 > 축복 > 비유 > 명령 ([05](05-interpreter.md)).

### 14.5 이름 붙이기 `nameTile`

계시할 때(해석 전). 판당 3개. 대상 = 드러난 칸 중 종류가 맞고(`village`: 우리 마을, `capital`: 우리 수도, 그 밖: 그 지형이고 건물 없음) 아직 이름이 없고 같은 이름이 없는 칸 중 우리 수도에서 가장 가까운 칸(동점은 칸 순서). 효과: 은총 +1(§14.2), **판의 첫 이름**이면 확정 15단계에 `wisdom < 3`일 때 지혜 +1. 이름은 석판 해석기가 그 칸을 부르는 말이 된다. 소명 `namer`.

### 14.6 영원한 계명

새길 수 있는 때 `canCarve = veteran && !tutorial && round >= 3 && 계명 < 2`. 시련 `earth`는 `noSword`를 새길 수 없다. 확인 화면에서 새김을 표시하면 확정 6단계에 `carveCommandment`. 새긴 장부터 판 끝까지:

| id | 이름 | 효과 |
|---|---|---|
| `noSword` | 칼을 들지 말라 | 플레이어 공격 불가; 선교 +1 (상한 2 안) |
| `noExpand` | 땅을 넓히지 말라 | 플레이어 마을 건설 불가; 신전 돌 비용 −1 |
| `sabbath` | 안식하라 | `round % 4 == 0`인 장: 행동 수 −2(최소 1), 기도 ×2 |
| `noFamine` | 굶기지 말라 | 유지 단계 식량 −1 추가; 대신 굶주림으로 신도를 잃지 않음 |

새긴 장의 계획 조정 (`main.js:720-726`): `banned = { noSword:'attack', noExpand:'village' }[id]`; `kept = banned ? accepted 중 (type != banned && build != banned) : accepted 전부`; `plan = kept + autoFill(player, kept, forbidden + 뺀 칩, doctrine)`. `sabbath`·`noFamine`은 금하는 행동이 없어 명령이 그대로 남는다(예전에는 건설 외 명령이 모두 빠졌다 — `afab303`에서 고침, §19-3). 이 다시 채우기는 확인 화면에서 뺀 칩(`pending.dropped`)도 금지로 넘겨, 뺀 칩이 기본 노동으로 되살아나지 않는다(`e68a240`, §19-20).

### 14.7 예언

봉인(확정 8단계, 이미 있으면 불가): `{ kind, rounds(1~3), sealed: round, due: round + rounds − 1, base: {율법파 마을 수, 율법파 capitalHp, 우리 pop, converted, captured} }`. 유지 단계 `checkProphecy`:

| kind | 이루어짐 |
|---|---|
| `fall` | `stats.captured > base.captured` |
| `capital` | 율법파 `capitalHp < base.hp` |
| `pop` | 우리 `pop >= base.pop + 2` |
| `convert` | `stats.converted > base.converted` |

이루면 신앙 +`{1:4, 2:3, 3:2}[rounds]`, `stats.prophecies += 1`. 아니고 `round >= due`면 신앙 −2(최소 0). 어느 쪽이든 예언은 사라진다.

### 14.8 메아리 `isEcho`

`engine.js:729-730`. 튜토리얼 제외, 첫 판에도 있다.

```text
plainWords(x) = String(x ?? '')에서 공백(\s)과 유니코드 문장부호(\p{P})를 모두 지운 것
isEcho(text)  = !tutorial and text and plainWords(text) != ''
                and plainWords(text) == plainWords(revelations.at(-1)?.text)
```

- 비교 대상은 **마지막으로 기록된 계시**다(바로 지난 장이 아니어도 된다 — 침묵한 장은 계시를 남기지 않는다). 띄어쓰기·마침표·쉼표·따옴표만 다른 글은 같은 글이다. 기호(`~` 같은 `\p{S}`)와 이모지는 지우지 않는다.
- 효과: 계시 비용 +1(§14.1, 확인 화면의 비용 알약에 "되풀이"로 보인다), 그리고 `recordRevelation`이 `{…, echo: true}`만 기록하고 `log.echo`를 남긴 뒤 끝난다 — 교리 +1·비유 가속·교리 대립·연속(§5.1, §5.4)이 모두 없다. 해석·명령·말투·청원·이름·예언은 보통 계시와 같다.
- 기록에는 해석의 `doctrine`이 그대로 남으므로 다음 장 율법파는 그 교리에 반응한다(§4.3).
- 예: 5×5 보통 시드 2026, 1장 "기도하라"(비용 1, 지혜 0 → 1) 뒤 2장 "기도 하라."는 비용 2, 지혜는 1 그대로.
- 예전의 **성언**(`liturgy`: 세 계시에 나온 구절은 길어도 비용 1)은 되풀이를 부추겨 `afab303`에서 없앴다. `findLiturgy`·`updateLiturgy`는 코드에서 지워졌고, 기본값으로만 남아 있던 `state.liturgy`와 언어팩 키(`log.liturgy`·`kw.liturgyStrip`·`ui.tag.liturgy`)도 `e68a240`에서 지웠다.

### 14.9 침묵

`applySilence(spoke)` (확정 10단계): 계시하면 `silentRun = 0`. 침묵이면 `silentRun += 1`, `n = silentRun`:

| n | 첫 판·튜토리얼 | veteran |
|---|---|---|
| 1 | 없음 | 없음 |
| 2 | 기록만 | 신앙 −1 (최소 0) |
| ≥3 | 기록만 | `pop > 1`이면 우리 −1, 율법파 +1 |

침묵한 장: 계시 비용 없음, 자동 기도 우선(§3.5), 말투 없음, 연속 끊김, 교리 없음, 청원 외면으로 셈.

### 14.10 그 밖

| 장치 | 엔진 효과 |
|---|---|
| 숨은 말 (오늘의 계시) | 계시에 그 말이 있으면 `stats.sacred = 1` (판당 1회). 수치 효과 없음 |
| 검열 (L10) | 다음 장 봉인된 말을 쓰면 계시 비용 +1, 인용으로 치지 않음 |
| 신학 노트 | 해석기 동작만 바꾼다 |
| 대사제 성향 | 해석 말투만 |
| 전설 | 없음 |

---

## 15. 승패 판정

### 15.1 `winKind` 전체

| `winKind` | `winner` | 조건 | 판정 위치 |
|---|---|---|---|
| `doom` | player | 심판의 날로 율법파 `capitalHp <= 0` | 기적 카드 (말하기 단계; 심판의 날은 말로 부를 수 없다) |
| `capital` | 공격측 | 공격 승리로 상대 `capitalHp <= 0` (우리 쪽은 포위 +1/+2, 율법파는 대성당 원정으로 거리 무관 — §3.8, §10) | 공격 단계 즉시 |
| `capital` | 신도가 모두 쓰러진 쪽의 **상대** | 남은 자가 수도를 흔들어 `capitalHp <= 0` (튜토리얼 제외) | `checkVictory` 처음 (§15.2) |
| `cathedral` | player | 대성당 공사 3 (단계마다 마을 1·2·3) | 건설 단계 즉시 |
| `bothExtinct` | `'draw'` | 양쪽 `pop <= 0` — **튜토리얼에서만** (남은 자) | `checkVictory` |
| `convertAll` | player | 율법파 `pop <= 0` — **튜토리얼에서만** | `checkVictory` |
| `edict` | enemy | `edictOn && edict >= edictMax` (연대기 결말 종류도 `edict` — [07](07-progression.md)) | `checkVictory` |
| `extinct` | enemy | 우리 `pop <= 0` — **튜토리얼에서만** | `checkVictory` |
| `faith` | player | 신앙 승리 | `checkVictory` |
| `score` | 승점 높은 쪽 (**동점은 플레이어**) | 마지막 장 | `checkVictory(final)` |
| `tutorial` | 〃 | 튜토리얼 마지막 장 | `checkVictory(final)` |

### 15.2 `checkVictory(final = true)`

`engine.js:1370`. 이미 승자가 있으면 그대로.

```text
if winner: return winner
remnant()                              # 남은 자 (아래), 튜토리얼 제외
if winner: return winner
if p.pop <= 0 and e.pop <= 0:  draw / bothExtinct; return
if e.pop <= 0:                         player / convertAll
if no winner and edictOn and e.edict >= edictMax:  enemy / edict
if p.pop <= 0:                         enemy / extinct            # 가드 없음 → edict를 덮어쓴다
total = p.pop + e.pop
if no winner and total >= (quick ? 6 : 8) and round >= (quick ? 4 : 6) and p.pop >= total × 0.75:
                                       player / faith
if no winner and final and round >= maxRounds:
    ps, es = score(player), score(enemy);  winner = ps >= es ? player : enemy
    winKind = tutorial ? 'tutorial' : 'score'
```

**남은 자** `remnant` (`engine.js:1357-1368`, `448f553`): 수도가 서 있는 한 부족은 사라지지 않는다.

```text
remnant():
  if tutorial: return
  for side in [player, enemy]:                         # 이 순서
      s = sides[side];  cap = 그 진영 수도
      if s.pop > 0 or not cap or s.capitalHp <= 0 or winner: continue
      s.capitalHp -= 1
      if side == player and s.cathedral >= 1: s.cathedral -= 1
      log.remnant({who: side, hp: s.capitalHp})        # fx.kind 'loss', tile = 수도
      if s.capitalHp > 0: s.pop = 1                     # 한 명이 수도로 돌아온다 (인구 한도·식량 무관)
      else: winner = other(side); winKind = 'capital'; winReason = t('eng.win.capital', {who: winner})
```

- 그래서 튜토리얼이 아니면 `bothExtinct`·`convertAll`·`extinct`는 나오지 않는다(코드는 남아 있다 — 튜토리얼용). 전멸·전원 개종은 따로 이기는 길이 아니라 점령으로 가는 길이 된다: 커밋 기록에 따르면 smart 봇 판에서 갑작스러운 전멸 14%·전원 개종 8%가 사라지고 수도 점령 승리가 0% → 10%가 되었으며 승률은 그대로였다.
- 양쪽이 같은 판정에서 0이면 플레이어 먼저 흔들린다. 플레이어 수도가 무너지면 율법파가 이기고 율법파 쪽은 보지 않는다.
- 수도를 흔든 뒤 `pop = 1`이므로 같은 `checkVictory`의 신앙 승리(`p.pop >= 0.75 × total`, 인구 합 문턱)는 돌아온 한 명을 센다.

부르는 곳: 유지 단계 끝(`final=true`), `castMiracle`(`final=false`), `streakMiracle`(`final=false`). 그래서 말하기 단계의 기적(번개 등)이나 확정 뒤 연속 기적(평화)으로 마지막 신도가 쓰러져도 **그 자리에서** 남은 자가 돈다(튜토리얼에서는 `convertAll`·`extinct`). 공격·선교·굶주림으로 인구가 0이 되어도 판정은 그 장 유지 단계에서 한다.

### 15.3 승리 뒤 처리

- `resolveRound` 중 승자가 나면 남은 행동·갈림길 결과·유지를 건너뛴다. `updateLawGuard`(값만, 기록 없음)와 `recordHistory`는 부른다(분노·결집 제외).
- 확정 10~13단계는 승자가 있으면 건너뛴다. 14단계 `recordRevelation`은 계시를 기록하고 교리 +1까지만 한다(대립·연속 없음; 메아리면 교리도 없음).

---

## 16. 모드 보정

### 16.1 튜토리얼

`config.mode === 'tutorial'` (나머지는 `DEFAULT_CONFIG`: size 5, normal, seed 2026이지만 맵·시드는 무시).

| 항목 | 값 |
|---|---|
| 맵 3×3 (행 A→C) | A1 숲 · A2 **율법파 마을**(평원) · A3 **율법파 수도** / B1 산 · B2 평원 · B3 강 / C1 **우리 수도** · C2 평원 · C3 숲 |
| 시드 | 7 (`rng = { deck: 7 ^ 0x5BD1E995 = 1540483474, dice: 7 }`) |
| 장 수 | 5 |
| 시작 자원 | §1.5 표 |
| `enemyBonus` | 0 |
| 계절 순서 (1→5장) | calm, calm, harvest, calm, prophet |
| 율법 카드 순서 (1→5장) | L2, L1, L6, L2, L8 (5장 시작에 덱이 1장이라 7장짜리 풀로 `dealDeck(…, 9)`를 밑에 보충 — `rng.deck` 소비) |
| 없음 | 지도자, 발견지·영구 지형·성지, 율법 석판, 소명, 반응·두 장 비교, 신의 분노·심판의 날, veteran 기능 전부, 막 규칙, 율법파의 반격 전부(원정·칼·대체 마을·결집·퇴각·굳은 율법 — 튜토리얼의 율법파는 공격에 지면 신도를 잃는다), 메아리, 남은 자(튜토리얼은 전멸·전원 개종으로 끝날 수 있다) |
| 율법파의 뜻 | 모두 공개 |
| `quick` | 아니오 (3×3이지만 튜토리얼 제외) |
| 끝 | 5장 유지 단계에서 승점 비교 → `winKind 'tutorial'` |

### 16.2 두 번째 판부터 (`config.veteran`)

`veteran`은 서고에 끝낸 판이 하나라도 있으면 `true`(`main.js:271`). 오늘의 계시·시련은 늘 `true`, 도전 링크는 `v=0`이 아니면 `true`.

| 기능 | 첫 판 | veteran |
|---|---|---|
| 율법 석판 `edictOn` (석판 승리, 성지의 석판 효과, 율법파 신앙→석판) | 없음 | 있음 |
| 심판의 기준 | classic | 해시로 하나 |
| 대사제 성향 | loyal | 해시로 하나 |
| 기적 손패 | 번개·단비·풍요 | 해시로 셋 + 드래프트 |
| 갈림길 | 없음 | 셋이 계절 덱에 |
| 검열 카드 L10 | 없음 | 보통·어려움 |
| 소명 | 없음 | 셋 중 하나 (도전 링크 제외) |
| 막 규칙 (2막 성전 카드, 3막 평온 없음) | 없음 | 있음 |
| 미라 | 없음 | 있음 |
| 교리 대립 | 없음 | 있음 |
| 침묵 벌 (2번째 −1 신앙, 3번째부터 이탈) | 기록만 | 있음 |
| 영원한 계명 | 없음 | 3장부터 |
| 말 거두기 비용 | 무료 | 신앙 1 |
| 정경·전생의 유적 (`main.js:282`) | 없음 | 일반 판에서 전달 |

(예전 표의 「성언」 줄은 성언이 없어져 뺐다.)

veteran과 **무관하게** 있는 것: 지도자, 반응(쉬움 제외), 성지 승점 +2, 발견지·영구 지형, 신의 분노·심판의 날, 연속 기적, 성인, 청원·은총·서원, 말투, 이름, 예언, 인용 비용, 뜻을 헤아린 기본 노동, 메아리, 율법파의 반격(원정·칼·대체 마을·결집·퇴각·굳은 율법, §4.9), 대성당의 마을 조건·원정·무너짐, 포위.

### 16.3 난이도

§4.6 표.

### 16.4 승천 (어려움만, 누적)

`config.ascension` 0~5. 어려움에서 이기면 다음 단계가 열린다(`meta.openAscension`, [07](07-progression.md)). 어려움이 아니면 0.

| 단계 | 문구 (`data.ascension`) | 코드 효과 |
|---|---|---|
| 1 | 율법파 시작 신도 +1, 식량 +4 | 율법파 `pop +1`, `food +4` (`engine.js:159`) |
| 2 | 율법 석판 한계 −2 | `edictMax = 10` |
| 3 | 신의 분노가 차는 격차 6 → 8 | 분노 증가 조건 `gap >= 8` |
| 4 | 3막에 율법파 공격·선교 주사위 +1 | `enemyZeal` (`engine.js:265`): 3막에 율법파 공격 `atk +1`, 선교 `preachBonus +1`. 예전의 "3막 행동 +1"은 평가에서 효과가 측정되지 않아(0/1,250판, `docs/EVALUATION-2026-09-30.md`) `afab303`에서 바꿨다 |
| 5 | 은사 없이 시작 | `config.blessing = null` (`main.js:282`; 종료 화면 「새 땅」 단추도 같다, `main.js:845`) |

### 16.5 시련 `TRIALS`

모두 `veteran: true`, 소명 있음, 은사·정경·유적 없음.

| id | 이름 | 크기·난이도·시드 | 장 | 규칙 |
|---|---|---|---|---|
| `storm` | 폭풍의 주 | 5×5 · 보통 · 11101 | 12 | 손패 번개·풍요·불기둥 고정; 번개 비용 −1 추가; 드래프트에 단비 없음 |
| `earth` | 대지모 | 6×6 · 보통 · 22202 | 12 | 풍요 1로 시작; 플레이어 공격 불가; 성장 비용 1; 소명 `sword` 없음; 계명 `noSword` 불가 |
| `sword` | 칼의 해 | 5×5 · 보통 · 33303 | 12 | 지도자 `iron` 고정; 율법 풀에 L5 두 장 더 (기본 1 + iron 1 + 2 = 4장) |
| `cloister` | 침묵의 수도원 | 5×5 · 보통 · 44404 | 12 | 계시 20자까지 (`main.js:1852`) |
| `last` | 마지막 예언자 | 5×5 · 어려움 · 55505 | **8** | 율법파 `pop +2`, `food +8`; 신의 분노 1장부터 (`wrathRound = 1`). 5×5라 `quick`이 아니므로 궁극 8장(= 마지막 장), 드래프트 5장 |

별(`main.js:969`): 지면 0; 이기고 승점 차 ≥ 20이거나 `maxRounds` 전에 끝냈으면 3; 차 ≥ 10이면 2; 아니면 1.

### 16.6 오늘의 계시 (daily)

`meta.dailyConfig` (`meta.js`): `{ size:5, difficulty:'normal', seed: 1 + (FNV('gsg:' + 'YYYY-MM-DD') % 999998), daily: 날짜 }`, `veteran: true`. 정경·유적·은사 없음(정경 교리 +1은 `daily`면 엔진도 막는다). 숨은 말 `sacred`가 있다.

### 16.7 도전 링크 (challenge)

URL `?seed=&size=&diff=&target=&v=` (`main.js:62`): 시드 `min(999999, floor(seed))`, 크기(없으면 5), 난이도(없으면 normal), `veteran = v != '0'`, `canon: null`, `challenge: { target }`. 소명 없음, 은사·유적·승천 없음. 결과 문구: 이기고 승점 > `target`이면 성공(규칙에는 영향 없음).

### 16.8 은사·정경·유적 (일반 판)

일반 판(튜토리얼·오늘의 계시·도전·시련 제외)에서만 `main.js:282`이 넘긴다.

| 무엇 | 효과 | 조건 |
|---|---|---|
| 은사 `preacher` | 첫 개종 성공 전까지 선교 +1 (상한 2 안) | 경외 레벨 1 이상, 승천 5 아님 |
| 은사 `mason` | 신전 1→2 돌 −1 | 레벨 2 |
| 은사 `granary` | 시작 식량 +2 | 레벨 3 |
| 은사 `seer` | 시작(와 1장 유지)에 수도 둘레 3칸 시야 | 레벨 4 |
| 정경 `canon` | 교리 하나 +1 (어려움 제외) | veteran, 최근 봉헌 구절 |
| 전생의 유적 `legacy` | 유적 발견지 (§13.3) | veteran, 서고 최근 세 판 중 `seed % n`번째 판의 가운데 계시 |

### 16.9 빠른 판 (4×4)

`quick`: 8장, 궁극 6장, 드래프트 3장, 분노 3장부터, 대성당 비용 ×0.7 올림, 신앙 승리 `total >= 6 && round >= 4`. 사막·오아시스·발견지 없음(채석장은 있을 수 있다), 성지는 C4.

---

## 17. 표시용 계산 (확인 화면)

해결과 같은 식이어야 하는 표시 도우미. 상태를 바꾸지 않는다.

- `actionOdds(action, {curse})` (`engine.js:278-293`): 선교·공격 승률 = `#{(x, y) ∈ 1..6² : x + atk > y + def} / 36`. 공격 `atk`는 저주를 `roundMods.attackBonus ?? (curse ? 1 : 0)`로 미리 반영한다. 승천 4(`enemyZeal`), 포위(`siegeOf`), 굳은 율법(`lawGuardOf`, 선교·공격 모두)은 해결과 같게 들어 있다. **표시용 식에는 계절 「율법파 집결」(+1)과 수호자 성인(+1)이 빠져 있다**(플레이어 공격에는 무관, 율법파 공격 표시에만 차이). 뜻을 헤아린 기본 노동의 선교·공격 문턱(§3.5)도 이 값을 쓴다.
- `previewGains(plan)` (`engine.js:983`): 채집·기도 수입, 건설 비용, 장 끝 식량 `2 + 마을 − pop − (noFamine ? 1 : 0)`, 신앙 수입. 주사위·성장·역병은 빠진다. 화면은 여기에 축복(+1 첫 채집), 저주(신앙 −1), 말한 기적 비용과 즉시 수입, 갈림길 gain을 더해 보여 준다(`main.js:2031`).

---

## 18. 검증 예시

`node`로 `engine.js`를 직접 불러 얻은 값(커밋 `8b91681`에서 얻고 `448f553`에서 A·B를 다시 확인해 같았다). 골든 테스트 전체는 [이식 가이드](../godot/PORTING.md).

**A. `{ mode:'standard', size:5, difficulty:'normal', seed:2026 }` (첫 판)**

`generateMap` 결과:

```text
     1       2        3        4        5
A  desert  river    mountain E        plain
B  plain   plain    river    plain    forest
C  forest  mountain hill     mountain forest
D  forest  plain    river    plain    plain
E  plain   P        mountain river    desert
```

- 발견지 B2·D4 `nomads`; 영구 지형 A1·E5 `oasis`, C2·C4 `quarry`; 성지 C3; 지도자 `iron`.
- `createState` 직후 `rng = { deck: 1156837553, dice: 2026 }`.
- 계절 덱 (밑 → 위): `threat, harvest, drought, calm, prophet, plague, threat, calm, prophet, plague, drought, harvest, threat, harvest, calm, prophet, drought, plague` → 1장 역병.
- 율법 덱 (밑 → 위, 30장): `L9, L5, L3, L1, L4, L2, L6, L8, L5, L7, L4, L5, L2, L9, L8, L1, L7, L6, L5, L3, L9, L1, L5, L7, L5, L2, L3, L6, L8, L4` → 1장 L4.
- 처음 드러난 칸: C1 C2 C3 D1 D2 D3 E1 E2 E3 E4.
- 1장: 선 플레이어, 청원 = 기도(역병), 행동 수 플레이어 3 · 율법파 4. 율법파 계획 `gather:A3:stone, pray:A4:, gather:C4:stone, gather:B5:wood`. 명령 없는 플레이어 기본 노동 `gather:C2:stone, gather:C1:wood, gather:D2:food`.

**B. 같은 설정 + `veteran: true`**

- 지도자 `iron`, 사제 `literal`, 심판 `classic`, 손패 `[lightning, revive, tongues]`, 소명 후보 `[temple, ultimate, villages]`(기본 `temple`), `edictOn = true`, `rng.deck = -106833787`.
- 계절 덱 (밑 → 위): `harvest, calm, prophet, threat, drought, refugees, merchant, plague, healer, threat, plague, refugees, merchant, harvest, calm, healer, drought, prophet`.
- 반응이 없는 진행에서 1~5장 계절 `prophet, drought, healer, calm, harvest`, 율법 `L9, L7, L3, L2, L6`; 5장 드래프트 후보 `[bounty, ark, rain]`, 그 뒤 `rng.deck = 1092896356`.

**C. A와 같은 설정, 석판 해석으로 두 장 (`tools/tests/lib.mjs`의 `doSpeak`/`doAccept`, 커밋 `448f553`)**

- 1장 "기도하라": 비용 1, 교리 `wisdom`, 명령 `pray:E2:`, 기본 노동 `explore:B1:`(뜻을 헤아림, `heeded`) · `gather:C2:stone`. 확정 뒤 지혜 0 → 1, `lawGuard = {preach:0, attack:0}`, `rally = false`.
- 2장 "기도 하라.": `isEcho = true`, 비용 2 (다른 글 "기도하고 경배하라"는 1). 확정 뒤 지혜 1 그대로, `revelations[1] = { round:2, text:'기도 하라.', doctrine:'wisdom', echo:true }`.
- `marchRange(enemy)`: 1~3장 0, 4~7장 1, 8~12장 2.

---

## 19. 확인 필요

코드 그대로 옮기되, 의도인지 확인이 필요한 곳. 이식은 **현재 동작**을 재현해야 골든 테스트가 맞는다. 번호는 처음 쓴 때(`8b91681`)와 같게 두고, 그 뒤 고친 항목은 ~~줄을 긋고~~ 고친 커밋을 적었다.

1. ~~**수도 칸 막기**: 선 진영이 자기 수도에서 기도·신전·성벽·대성당을 하면 같은 장 상대의 그 수도 공격·선교가 막혔다.~~ — **고침** `5b7a94f`: 집 안 행동(기도, 신전·대성당·성벽 건설)은 칸을 차지하지 않는다. ~~남은 비대칭: 선 진영이 상대 수도를 공격·선교하면 같은 장 상대의 그 수도 기도·신전·성벽(·대성당)은 여전히 막혔다.~~ — **고침** `e68a240`: 후 진영의 집 안 행동도 막지 않는다. 이제 막기는 선후 양쪽에 대칭이다(§3.7, `engine.js:877-881`).
2. ~~**검증의 교리 교체와 예산**: 같은 칸에서 교리 우선 행동으로 바꿔도 예산을 다시 계산하지 않아 마을 둘이 함께 받아들여졌다.~~ — **고침** `afab303`: 교체 때 밀려난 행동의 비용을 돌려받고 새 행동의 비용을 다시 본다(§3.4, `engine.js:436-449`). 남은 점: 새 행동의 비용 검사가 교체 **전** 예산으로 먼저 한 번 걸러지므로, 밀려날 건설 비용을 돌려받아야만 치를 수 있는 건설은 교체되지 못하고 '자원 부족'으로 거절된다.
3. ~~**안식일·굶기지 말라를 새긴 장**: `banned`가 `undefined`라 건설 외 명령이 전부 빠졌다.~~ — **고침** `afab303` (`main.js:723`, §14.6).
4. ~~**난민 행렬에 무료 선택이 없음**: 대체가 원래 선택을 그대로 써서 식량·신앙이 음수가 될 수 있었다.~~ — **고침** `afab303`: 무료 선택 → 치를 수 있는 첫 선택 → 원래 선택(가진 만큼만, 0 하한) 순(§7.2, `engine.js:1061-1068`). 이제 갈림길로 자원이 음수가 되지 않는다. 남은 점: 치를 수 있는 선택은 `choice` 순서로 고르므로 플레이어가 고른 것과 다른 쪽이 된다(난민 `take`가 안 되면 `send`).
5. **신도 수 우위** (`data.js:66` 주석 "선교·공격"): 코드는 공격에만 적용한다.
6. **가뭄 문구** "평원·강 식량 채집 −1": 코드는 모든 식량 채집(오아시스 포함)에 적용한다.
7. **성지 위치**: 4×4·7×7에서 성지가 `mapgen`의 가운데 언덕(`mid`)과 다르다. 7×7에서 성지가 발견지와 겹치거나, 성지 칸의 영구 지형만 지워져 대칭 칸에 짝 없는 오아시스·채석장이 남을 수 있다. `placeSites`/`placeLegacy`는 `mid`만 피하고 실제 성지는 피하지 않는다.
8. **3막 보충 덱의 평온**: `startRound` 2단계 보충(`engine.js:548`)은 `calm`을 거르지 않는다. 3막에 덱이 바닥나면 평온이 다시 나올 수 있다(보통 덱이 넉넉해 실제로는 드물다).
9. **소명 장 문턱 고정**: 「넓히는 자」(8장까지)·「쌓는 자」(6장까지)는 8장짜리 판(4×4, 시련 `last`)에서도 같은 값이다.
10. **인구 한도를 무시하는 이동**: 선교 성공, 평화 궁극, 신앙 바닥 이탈, 침묵 이탈은 한도를 보지 않는다(한도는 성장·부활·유목민·난민·평화 연속 기적만 막는다).
11. ~~**대성당 1단계는 무너지지 않음**~~ — **바꿈** `afab303`: 수도가 맞을 때마다 `cathedral >= 1`이면 한 단계 무너진다(§10).
12. **율법파 계획은 예산을 나누지 않음**: `L9`(마을·마을)처럼 같은 비용 행동을 둘 계획해 한쪽이 해결 때 실패할 수 있다. `afab303` 뒤로는 대상 없는 공격·선교 규칙(칼·결집 포함)이 모두 **대체 마을**(§4.9)로 바뀌므로 한 계획에 마을이 셋 이상 들어가 뒤의 것이 실패하는 일이 더 잦다.
13. ~~**유목민 선택과 저장**: 해결 뒤 상태로 저장·불러오면 유목민 선택 없이 다음 장으로 갔다.~~ — **고침** `afab303`: `resumeLoaded`가 먼저 묻는다(`main.js:293-296`, §3.13).
14. **번개와 수도**: 율법파 수도에 번개를 쳐도 내구도는 줄지 않는다(석판 −2와 성벽/인구만).
15. ~~**승천 1의 식량 +4**가 문구에 없다.~~ — **고침** `afab303`: 문구가 "율법파 시작 신도 +1, 식량 +4".
16. **방주**: 율법파 공격에 져도 인구는 지키지만 마을은 빼앗기고 수도 내구도와 대성당 단계는 준다. 신앙 바닥·침묵 이탈은 막지 않는다.
17. **저주 말투**의 신앙 −1은 공격을 하지 않아도 낸다.
18. **표시용 승률**(§17)은 계절 「율법파 집결」·수호자 성인을 반영하지 않는다(승천 4·포위·굳은 율법은 반영).

`afab303`·`5b7a94f`에서 새로 생긴 확인 사항:

19. ~~**헤아린 성벽의 예산**: `autoFill`의 뜻을 헤아린 성벽(전쟁 교리)은 받아들인 건설의 비용을 빼지 않은 현재 보유 자원으로 골라, 받아들인 성벽·신전이 돌을 먼저 쓰면 해결 때 `log.buildNoRes`로 실패할 수 있었다.~~ — **고침** `e68a240`: 받아들인 건설을 치르고 남은 자원(`left`)으로 성벽 비용을 낼 수 있을 때만 헤아린 성벽을 고른다(§3.5, `engine.js:469-473`). 같은 커밋에서 늘 건너뛰던 `DOCTRINE_LABOR.abundance`도 지웠다.
20. ~~**계명 새긴 장의 다시 채우기**: `accept`의 `autoFill`은 확인 화면에서 뺀 칩(`pending.dropped`)을 금지로 넘기지 않아, 뺀 칩이 기본 노동으로 되살아날 수 있었다.~~ — **고침** `e68a240`: 뺀 칩도 금지 키로 넘긴다(§3.6, `main.js:724`).
21. **메아리의 기준**: 바로 지난 장이 아니라 **마지막으로 기록된 계시**와 비교한다(침묵을 끼워도 같은 글이면 메아리). 문장부호 `\p{P}`와 공백만 지우고 기호·이모지는 남긴다("쳐라~"와 "쳐라"는 다른 글). 메아리 계시도 `doctrine`을 기록하므로 율법파는 반응하고, 인용(§14.1) 대상도 된다. 연속(§5.4)은 늘지도 끊기지도 않는다.
22. **굳은 율법의 셈**: 해석기가 만든 명령의 종류만 센다 — 막히거나 실패한 명령도 세고, 뜻을 헤아린 선교·공격(`auto`)은 세지 않는다. 그래서 교리만 평화·전쟁으로 두고 선교·공격 낱말 없이 말하면(예: 평화 교리를 부르는 다른 말) 헤아린 자리로 선교·공격을 하면서 굳음을 피할 수 있다(단, 헤아린 자리는 승률 50% 이상일 때만).
23. **원정은 모든 후보를 넓힌다**: `marchRange`는 공격만이 아니라 율법파 수도의 `reach` 전체를 넓혀, 3막 율법파는 수도에서 4칸 떨어진 곳에 마을을 짓고 채집한다. 첫 판·쉬움에도 적용된다.
24. **결집의 문턱**: 결집은 `wrathRound`(보통 4장)부터 켜질 수 있고, 켜진 뒤 4점 이하로 좁혀질 때까지 유지된다(분노처럼 한 장씩 오르내리지 않는 켜기·끄기). 튜토리얼과 승자가 난 장은 갱신하지 않는다.
25. ~~**죽은 코드·키**: `state.oddUsed`, `state.liturgy`, 언어팩 `kw.liturgyStrip`·`log.liturgy`·`ui.tag.odd`·`ui.tag.liturgy`·`ui.grace.odd`·`ui.grace.otherDeed`·`ui.verdict.odd`, 없어진 장치를 말하는 주석, `tools/golden.mjs`의 `pending.odd`·`d.liturgy`가 남아 있었다.~~ — **고침** `e68a240`: 필드·키·CSS(`.v-odd`)·주석을 지웠다. 남은 흔적은 `ui.verdict.text`의 `grade === 'odd'` 갈래(옛 저장본의 `history[].verdict`용)와 언어팩 파일의 주석 두 줄(`i18n/ko/engine.js:185`, `i18n/ko/interp.js:136`)뿐이다. 이식판은 옛 저장본의 두 필드를 무시하기만 하면 된다.
26. **남은 자와 결말 종류**(`448f553`): 튜토리얼 밖에서는 `extinct`·`convertAll`·`bothExtinct`에 닿지 않지만 `checkVictory`·`outcomeKind`·에필로그(`story.lose.extinct`·`draw`)·연대기에는 남아 있다. 남은 자로 돌아온 한 명은 인구 한도와 식량을 보지 않고, 굶주림·전투로 다시 0이 되면 다음 `checkVictory`에서 또 흔들린다(내구도가 0이 되면 점령). 번개는 수도 내구도를 직접 줄이지 못하지만(§19-14) 마지막 신도를 쓰러뜨리면 남은 자로 줄인다.

---

## 20. Godot 이식 메모

1. **32비트 정수 흉내**: GDScript `int`는 64비트다. `rand`의 `| 0`, `>>>`, `Math.imul`을 정확히 옮긴다.
   - `int32(x) = ((x & 0xFFFFFFFF) ^ 0x80000000) - 0x80000000`
   - `x >>> k = (x & 0xFFFFFFFF) >> k` (논리 시프트는 먼저 32비트로 마스크)
   - `imul(a, b) = int32(int32(a) * int32(b))` — 부호 있는 32비트끼리 곱하면 64비트 안에 들어간다. 부호 없는 값끼리 곱하면 넘친다.
   - `rng.deck` 초기값은 음수일 수 있다(예: B의 `-106833787`). 저장·복원도 부호 있는 int32로.
   - `t ^= t + imul(…)`의 덧셈은 JS에서 잘리지 않은 채 `^`에서 32비트로 잘린다 → 64비트로 더한 뒤 `int32()`로 자르면 같다.
2. **난수 호출 순서가 곧 결과다.**
   - `rng.deck`: `createState`의 계절 덱 → 율법 덱; `startRound`의 계절 보충 → 율법 보충 → (3막 필터 뒤) 계절 보충 → 드래프트(최대 3회).
   - `rng.dice`: 해결 단계 순서(채집→건설→기도→탐험→선교→공격) × (선 → 후) × 계획 순서. 탐험 1회(실패) 또는 2회(보물), 예언자 계절 0회. 선교·공격은 공격측 `d6` 먼저, 방어측 다음. **전제가 깨진 행동(대상이 이미 상대 칸이 아님, 선교 대상 인구 0)과 막힌 행동은 난수를 쓰지 않는다.** 유지 단계 평화 궁극 2회(대상 있을 때만).
   - `afab303`·`5b7a94f`의 새 규칙(원정·칼·대체 마을·결집·퇴각·굳은 율법·포위·승천 4·메아리·헤아린 노동·대성당 원정)은 **난수를 새로 쓰지 않는다.** 다만 계획이 바뀌고(율법파 공격이 늘고 집 안 행동이 더는 막히지 않음) 해결되는 선교·공격 수가 달라져 `rng.dice` 소비가 바뀌었다 — 그래서 골든 파일이 모두 새로 만들어졌다([이식 가이드](../godot/PORTING.md)). `e68a240`의 막기 대칭(후 진영의 집 안 행동도 해결됨)과 헤아린 성벽 예산도 난수를 새로 쓰지 않지만 해결되는 행동을 바꿔, 골든을 다시 뽑았다(네 판의 결과가 달라졌다).
   - 맵용 난수기 네 개는 서로 독립이고 상태에 저장하지 않는다.
3. **안정 정렬**: JS `sort`는 안정 정렬이지만 GDScript `Array.sort_custom`은 **안정하지 않다**. 다음 정렬은 반드시 안정 정렬(병합 정렬, 또는 원래 인덱스를 2차 키로)로: 맵 다듬기 지형 집계, `rarest`, 자원 보장 칸, 기본 노동 자원 순서, 율법파 공격·선교 대상, 마을·성벽 거리, 이름 붙일 칸, 전쟁 연속 기적 성벽, 갈림길 셋, 소명(동점은 id), 성지(동점은 id).
4. **삽입 순서**: `reach`(Map), 탐험 후보(Map), 맵 다듬기 `counts`, `names` 개수 — Godot `Dictionary`는 삽입 순서를 지키므로 그대로 쓰면 된다. `legalActions`의 목록 순서가 율법파 선택과 기본 노동을 정한다.
5. **덱 위 = 배열 끝**. `pop_back()`으로 뽑는다. `dealDeck`은 새 섞음을 **앞에** 붙이고, 율법 덱 보충도 **앞에**(밑에) 붙인다. 2막 L5는 인덱스 `max(0, len−3)`에 `insert`.
6. **확정 순서**(§3.6): 율법파 계획은 말한 기적·말투·갈림길 비용보다 **먼저** 계산한다. 은총·침묵 벌·교리 상승은 유지와 승패 판정 **뒤**다. `resolveRound` 안에서는 유지 → `updateLawGuard` → `recordHistory`(분노 → 결집) 순이고, 결집·굳은 율법은 **다음 장** 계획·판정에 쓰인다. 메아리 판정은 `recordRevelation`이 이번 계시를 기록하기 **전**에 한다. 순서를 바꾸면 수치가 달라진다.
7. **막기 규칙**은 칸 id 비교다(§3.7, §19-1). 집 안 행동(기도, 신전·대성당·성벽 건설)은 선 진영이면 칸 집합에서 **빼고**, 후 진영이면 검사하지 않는다(막히지 않음, `e68a240`). 나머지 후 진영 행동만 칸 집합과 견준다.
8. **정수 연산**: `floor(pop/4)`, `floor(pop/3)`, `ceil(pop/2)` = `(pop + 1) / 2`(양수), `floor(m/4)`, `ceil(2m/3)` = `(2m + 2) / 3`, 대성당 빠른 판 `ceil(v×0.7)` = `(7v + 9) / 10`(→ 3·3·4), 신앙 승리 `p.pop >= total × 0.75` = `4 × p.pop >= 3 × total`. GDScript 정수 `/`는 0 쪽으로 자르고 JS `Math.floor`는 아래로 자른다. 인구·장 수·신앙은 이제 음수가 되지 않으므로(갈림길 비용도 0 하한, §19-4) 결과가 같다. 그래도 옛 저장(음수 신앙)을 불러올 수 있으니 「경건한 자」 승점 `floor(faith/3)`은 아래로 자르는 나눗셈(`floori(faith / 3.0)` 등)으로 옮기는 편이 안전하다.
9. **맵 생성의 실수 비교**: `rarest`는 `count / LIMIT`(64비트 실수)로 정렬한다. 같은 리터럴(0.4, 0.34, 0.26, 0.22)과 같은 나눗셈을 쓰면 JS와 같다. 상한 `ceil(rows×cols×LIMIT)`은 §2.2 표 값을 상수로 넣는 편이 안전하다. `rnd() > 0.45`, `rand() < 0.5` 비교도 그대로.
10. **`hashPick`**: 인자를 `str()`로 바꿔 `'|'`로 잇는다(정수 시드는 `"2026"`). 코드 포인트마다 첫 UTF-16 단위를 XOR — 이 게임의 문자열은 모두 BMP라 UTF-16 단위 순회와 같다. 결과는 `uint32(h) % len`. 인자 순서가 호출마다 다르다(§0.3 표).
11. **0 하한**: `max(0, …)`로 막는 곳(공격 패배·승리 인구, 율법파 퇴각 식량, 번개·심판의 날, 저주, 예언 실패, 침묵 2, 청원 외면, 전쟁 연속 기적, 갈림길 비용과 양수 적용)과 막지 않는 곳(`capitalHp -= 1` → `<= 0` 판정, 선교 `f.pop -= 1`(전제에서 `> 0` 확인), 율법파 신앙 −10(≥10 확인), 대성당 `cathedral -= 1`(`>= 1` 확인))을 구분한다.
12. **유지 순서**: 신앙 바닥 판정(`brokeFaith`)은 루프 **전**. 진영 루프는 플레이어 → 율법파, 인구 0인 진영은 통째로 건너뛴다. 신앙 수입은 성장 **뒤** 인구로, 역병은 수입 **뒤**.
13. **`checkVictory` 순서**: 이미 승자면 아무것도 안 한다 → 남은 자(플레이어 → 율법파, 튜토리얼 제외) → 승자가 났으면 끝 → `bothExtinct` → `convertAll` → `edict` → `extinct`(가드 없이 덮어씀) → `faith` → 점수(동점 플레이어). 남은 자는 상태를 바꾸므로(`capitalHp`, `cathedral`, `pop = 1`, 기록) `final=false` 호출에서도 돈다.
14. **장별 초기화 위치**: `roundMods`는 장 시작 14단계에서 비우고, 말하기 단계 기적(방주·방언·불기둥)과 확정의 말투·갈림길이 다시 채운다. `grace`는 `round`가 다를 때 게으르게 초기화. `miracleUsed`·`reinterpretUsed`·`rainActive`는 장 시작 1단계.
15. **축복 +1은 첫 채집 한 번**: 플레이어 채집 해결 때 `gatherBonus = 0`. 선후와 계획 순서상 첫 플레이어 채집이 받는다.
16. **`hasUlt`는 장 수까지 본다**: 풍요 궁극의 인구 한도 +2, 지혜 궁극 선택 등은 6칸이어도 8장(빠른 판 6장)부터.
17. **상태 기본값**: 불러오기(`hydrateState`, `engine.js:1118`)는 빠진 필드를 §1.6 기본값으로 채운다. 이식판 저장 형식도 같은 기본값을 둔다. `lawGuard`는 `{preach:0, attack:0}`, `rally`는 `false`로 채운다(`rally`는 `e68a240`부터; 그 전에는 채우지 않아 첫 `updateLawGuard`까지 `undefined`였다).
18. **칸 id는 한 글자 행 + 1부터 열**: `'ABCDEFGHI'`까지라 최대 9행. 성지·소명 동점 정렬의 문자열 비교는 대문자 한 글자 + 한 자리 숫자라 코드 포인트 비교와 같다.
19. **플레이어만 안개**: `legalActions('player')`는 `revealed`를 보고, 율법파는 보지 않는다. 율법파의 뜻 표시는 난이도 조건과 `revealed`를 함께 본다.
20. **글은 키로**: 로그·거부 사유·청원 문장 등은 모두 언어팩 키(`log.*`, `eng.*`)로 남기고, 정규식 키(`kw.*`)는 번역이 아니라 언어별로 새로 쓴다([05](05-interpreter.md), [i18n](../i18n.md)). 새 로그 키: `log.rally`, `log.echo`, `log.attackRetreat`, `log.lawGuard`(`{kind, n}`).
21. **메아리의 글 정규화**: JS `/[\s\p{P}]/gu`. JS의 `\s`는 유니코드 공백(NBSP `U+00A0`, 전각 공백 `U+3000`, `U+FEFF` 등)을 포함하지만 Godot `RegEx`(PCRE2)의 `\s`는 기본적으로 ASCII 공백만 잡는다. `[\s\p{Z}\x{FEFF}\p{P}]`처럼 유니코드 공백을 직접 넣어야 같다. `\p{P}`는 PCRE2도 같은 유니코드 범주다.
22. **원정·결집의 상태 의존**: `reach`(따라서 `legalActions('enemy')`, `lawThreat`, 율법파의 뜻)는 `actOf`(장 수)와 대성당 단계에, 율법파 행동 수와 계획은 `state.rally`에 기대므로, 장 시작의 어려움 카드 비교(`lawThreat`)도 원정 거리가 반영된 목록으로 한다. 같은 순서로 계산해야 카드 선택이 같다.
23. **대성당 원정 행동의 위치**: `legalActions('enemy')`에서 성벽 뒤·기도 앞에 들어간다(§3.8 3단계). 율법파 계획은 `target:'capital'`로 고르므로 위치가 결과를 바꾸지는 않지만, `enemyIntent`·`lawThreat`의 목록 순서와 `key`(`attack:<우리 수도>:`)는 같게 둔다.
