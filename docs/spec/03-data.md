# 03. 데이터 — 데이터 표 레퍼런스

> `js/game/data.js`가 내보내는 표 52개(`0c95856`에서 쓰이지 않던 `revelationCost`를 지워 54 → 53, `b1ff73e`에서 심판의 날 `DOOM`을 지워 52)의 뜻·스키마·행 수·쓰는 곳. **실제 값은 [`docs/export/data.json`](../export/data.json)** 에 있다 (`node tools/export-data.mjs`로 만든다 — [export README](../export/README.md)).
> 표의 수치를 **어떻게 쓰는지**(판정 공식)는 [02 규칙](02-rules.md), 상태 객체와 결정론은 [04 구조](04-architecture.md)에 있다. 코드와 이 문서가 다르면 코드가 기준이다.

## 읽는 법

- **글 칸**(`name`, `text`, `rule`, `desc`, `label`, `trait`, `prompt`, `intro`, `lines` …)은 언어팩 키를 `t()`로 풀어 넣은 한국어다. 원래 키는 `data.js` 소스에 그대로 보인다. 모양은 거의 `data.<표>.<id>.<칸>` — 예: `TERRAIN.plain.name` ← `data.terrain.plain.name`, `EVENTS[drought].rule` ← `data.event.drought.rule`, `ENEMY_LEADERS.iron.lines.card.L5` ← `data.leader.iron.line.card.L5`. 다국어 Godot판은 키를 들고 있다가 그릴 때 번역하는 편이 낫다.
- **`kw.*` 칸**은 번역이 아니라 **정규식 원본**(또는 낱말)이다: 갈림길 `tags`, 계명 `re`, 숨은 말 `word`. 언어마다 그 언어의 어휘로 새로 쓴다 ([`docs/i18n.md`](../i18n.md)).
- **함수 칸**은 `data.json`에서 `{"$fn": "<소스>"}`로 나온다 ([아래](#함수-칸-fn)).
- **숫자 키**(`MAP_SIZES`, `DOCTRINE.*.perks`, `FESTIVALS`)는 JSON에서 문자열 키다(`PROPHECY.reward`는 `8250dd7`에서 없어졌다).
- 자원 이름은 늘 `food`·`wood`·`stone`·`faith`, 인구는 `pop`. 비용·이득 객체(`{wood: 2, food: 1}`)는 이 키의 부분집합이고 값은 정수(이득은 음수일 수 있다).
- 교리 id는 `peace`·`war`·`abundance`·`wisdom` (`DOCTRINES` 순서), 진영은 `player`·`enemy`.
- **쓰는 곳** 약어: `engine`(engine.js), `main`(main.js — 화면 컨트롤러), `interp`(interpreter.js), `lore`(lore.js), `chron`(chronicle.js), `meta`(meta.js).

## 한눈에

| 이름 | 모양 | 행 | 쓰는 곳 | 한 줄 |
|---|---|---|---|---|
| [`TERRAIN`](#terrain) | 객체 | 6 | engine, interp, main | 지형별 채집 자원·양 |
| [`FEATURES`](#features) | 객체 | 2 | engine, main | 영구 지형(오아시스·채석장) |
| [`RESOURCE_NAME`](#resource_name--gather_verb) | 객체 | 4 | engine, main | 자원 표시 이름 |
| [`GATHER_VERB`](#resource_name--gather_verb) | 객체 | 4 | engine | 채집 동사 |
| [`COST`](#cost) | 객체 | 4 | engine | 건설 비용 (`temple`은 함수) |
| [`CATHEDRAL`](#cathedral) | 객체 | 3 키 | engine | 대성당 — 비용·원정·마을 (`3f33be1`; 그 전에는 세 단계 배열) |
| [`PLAYER_START`](#player_start--difficulty) | 객체 | 5 | engine | 우리 부족 시작 자원 |
| [`DIFFICULTY`](#player_start--difficulty) | 객체 | 3 | engine, main, chron | 난이도: 율법파 보너스·시작 자원 |
| [`MAP_SIZES`](#map_sizes) | 객체 | 4 | engine, main | 판 크기 표: 맵 크기 → 장 수와 판마다 다른 규칙 수 전부 (`7a28084`) |
| [`TUTORIAL`](#tutorial) | 객체 | — | engine | 튜토리얼 고정 시나리오 |
| [`TRIALS`](#trials) | 객체 | 5 | engine, main | 시련 (고정 맵 + 비틀린 규칙) |
| [`ASCENSION`](#ascension) | 배열 | 5 | main | 승천 단계 설명 |
| [`EVENTS`](#events) | 배열 | 6 | engine, main | 계절(사건) 카드 |
| [`DILEMMAS`](#dilemmas--mira) | 배열 | 6 | engine, main | 두 갈래 사건 |
| [`MIRA`](#dilemmas--mira) | 객체 | 1 | engine | 분열의 예언자 (세 갈래 특수 사건) |
| [`MIRA_TWIST`](#dilemmas--mira) | 객체 | 4 | engine | 미라가 비트는 교리별 말 |
| [`LAW_CARDS`](#law_cards) | 배열 | 10 | engine, main | 율법파(오토마) 카드 |
| [`ENEMY_LEADERS`](#enemy_leaders) | 객체 | 4 | engine, lore, main, chron | 율법파 지도자: 덱 변경·대사 |
| [`REACT`](#react) | 객체 | 5 | engine, main | 지난 장의 말에 맞서는 율법 카드 |
| [`DOCTRINES`](#doctrines--doctrine) | 배열 | 4 | engine, interp, main, chron | 교리 id 순서 |
| [`DOCTRINE`](#doctrines--doctrine) | 객체 | 4 | interp, main, chron | 교리 이름·특전 글 |
| [`OPPOSED`](#opposed) | 객체 | 4 | engine, main | 대립 교리 |
| [`DOCTRINE_VOICE`](#doctrine_voice) | 객체 | 4 | interp | 교리가 깊어질 때 사제의 말투 |
| [`MIRACLES`](#miracles--first_hand--doom) | 배열 | 8 | engine, main | 기적 카드 |
| [`FIRST_HAND`](#miracles--first_hand--doom) | 배열 | 3 | engine | 해금 3 전(첫 판~세 번째 판) 손패 |
| ~~[`DOOM`](#miracles--first_hand--doom)~~ | 객체 | 1 | — | 숨은 기적 「심판의 날」 — `1c81cd4`부터 나오지 않았고 `b1ff73e`에서 지웠다 |
| [`TONES`](#tones) | 객체 | 4 | main | 말투 이름·툴팁 글 (`8250dd7`부터 수치 없음) |
| [`PROPHECY`](#prophecy) | 객체 | — | engine, main | 예언 종류 (`8250dd7` 전에는 보상·벌도) |
| [`COMMANDMENTS`](#commandments) | 객체 | 4 | engine, main | 영원한 계명 |
| [`SACRED_WORDS`](#sacred_words) | 배열 | 7 | engine | 오늘의 계시의 숨은 말 |
| [`PETITIONERS`](#petitioners) | 배열 | 12 | engine | 이름 있는 신도(청원자) |
| [`PRIESTS`](#priests) | 객체 | 5 | engine, interp, main | 대사제 성향 (헤아린 노동의 수치는 engine의 `PRIEST_LABOR` — 표 밖) |
| [`DESTINIES`](#destinies) | 객체 | 8 | engine, main | 소명 (`test`는 함수) |
| [`JUDGEMENTS`](#judgements) | 객체 | 5 | engine, main | 심판의 기준 (승점 가중치) |
| [`ACTS`](#acts--festivals--months) | 배열 | 3 | engine, main | 세 막 |
| [`FESTIVALS`](#acts--festivals--months) | 객체 | 3 | main | 막이 바뀔 때의 절기 이름 |
| [`MONTHS`](#acts--festivals--months) | 배열 | 12 | engine | 달 이름 |
| [`SITES`](#sites) | 객체 | 5 | engine, main | 안개 속 발견지 |
| [`AWE_LEVELS`](#awe_levels--awe_titles--blessings) | 배열 | 5 | main | 경외 레벨 문턱 |
| [`AWE_TITLES`](#awe_levels--awe_titles--blessings) | 배열 | 6 | main | 경외 레벨 칭호 |
| [`BLESSINGS`](#awe_levels--awe_titles--blessings) | 객체 | 4 | main (+engine이 `config.blessing`으로) | 은사 |
| [`SIGILS`](#sigils) | 객체 | 6 | main | 신의 인장 → SVG 심볼 |
| [`RULES`](#rules) | 객체 | 8 | engine, main | 규칙 수치 모음 (`superiority`는 `435c3cc`에서 지웠다) |
| [상수](#상수) | 수 | — | — | `CAPITAL_HP` 2, `MAX_TEMPLE` 3, `MAX_ACTIONS` 6, `DOCTRINE_MAX` 6, `EDICT_MAX` 10, `DESTINY_POINTS` 5, `MAX_COMMANDMENTS` 2, `REVELATION_MAX` 100, `MAX_ROUNDS` 12, `RULESET` 22 (engine의 `MODULES` 4는 `data.js` 밖) |
| ~~[`revelationCost`](#함수-칸-fn)~~ | — | — | — | **없어짐** `0c95856` — 쓰이지 않던 길이 비용 함수. 계시 비용은 engine `revelationCostFor` ([02 §14.1](02-rules.md#141-계시-비용과-길이)) |

---

## 지형과 자원

### TERRAIN

지형별로 무엇을 얼마나 채집하는가. 키 = 지형 id.

| 칸 | 형 | 뜻 |
|---|---|---|
| `name` | 문자열 | 표시 이름 (`data.terrain.<id>.name`) |
| `gather` | `'food'｜'wood'｜'stone'｜'faith'｜null` | 채집 자원. `null`(사막)이면 채집 행동이 생기지 않는다 |
| `amount` | 정수 | 기본 채집량 |

행 6: `plain`(식량 2), `forest`(목재 2), `mountain`(돌 2), `river`(식량 1), `hill`(신앙 1), `desert`(없음).

- engine: `yieldOf(tile)`이 `FEATURES`가 없을 때 이 행을 쓴다. `gatherAmount()`가 가뭄·풍년·풍요 교리·축복을 더한다. `tileName()`이 이름을 쓴다.
- interp: `linkWords()`가 계시 속 지형 이름을 찾는다. main: 칸 툴팁.
- 맵 생성 가중치(`plain 30, forest 24, mountain 16, river 13, desert 10, hill 4`)는 이 표가 아니라 `mapgen.js`의 `WEIGHTS`에 있다.

### FEATURES

한 번 놓이면 판 끝까지 남는 지형 특징. 있으면 `TERRAIN`의 채집 대신 이것을 쓴다.

| 칸 | 형 | 뜻 |
|---|---|---|
| `name` | 문자열 | `data.feature.<id>.name` |
| `on` | 지형 id | 놓이는 지형 (`mapgen.placeFeatures`가 이 지형 쌍에만 놓는다) |
| `gather`, `amount` | `TERRAIN`과 같음 | |

행 2: `oasis`(사막, 식량 3), `quarry`(산, 돌 3). 점대칭 한 쌍씩, 수도 옆 제외. 성지 칸은 특징을 지운다.

### RESOURCE_NAME · GATHER_VERB

자원 id → 표시 이름(`식량`…), 자원 id → 채집 동사(`곡식을 거둔다`…). 각 4행. 로그·행동 설명·미리보기 글에 쓴다 (engine `describe`, `costText`, main 매트).

### COST

건설 비용. 키 = 건물 id.

| 키 | 값 | 비고 |
|---|---|---|
| `village` | `{wood: 2, food: 1}` | |
| `wall` | `{stone: 2}` | |
| `temple` | **함수** `(level) => ({stone: level*2, wood: level+1})` | 현재 신전 단계로 다음 단계 비용: 1→2 돌 2·목재 2, 2→3 돌 4·목재 3 |
| ~~`cathedral`~~ | ~~`{stone: 11, wood: 11, faith: 13}`~~ | **없어짐** `3f33be1` — 한 번에 짓던 시절의 합계로 쓰이지 않은 채 남아 있었다. 비용은 `CATHEDRAL.cost` |

- engine: `buildCost(state, side, build)`가 `temple`에 계명 `noExpand`(돌 −1)·은사 `mason`(1단계일 때 돌 −1)을 적용하고, `cathedral`은 `CATHEDRAL.cost`로 돌린다. 나머지는 `COST[build]` 그대로. `legalActions`는 `COST.village`·`COST.wall`로 지을 수 있는지 본다.

### CATHEDRAL

대성당 (플레이어만, 신전 3단계 뒤 한 번 — `3f33be1`). `data.js:25`: `{ cost: {stone: 4, wood: 4, faith: 4}, crusade: {attacks: 3, bonus: 1}, villages: 2 }` (`1c81cd4`에서 비용 6·6·6 → 4·4·4 — 커밋 기록: 없어진 신의 분노의 싼 기적이 대성당 값을 대 주고 있었다).

| 칸 | 형 | 뜻 |
|---|---|---|
| `cost` | 비용 객체 | 돌 4·목재 4·신앙 4 — 판 크기 표의 `cathedralCost`로 각 값 `ceil(v × k)` (`buildCost`) |
| `crusade` | `{attacks, bonus}` | 원정: 지은 다음 장 율법파가 우리 수도를 `attacks`(3)번 계획하고(`planEnemy`), 대성당이 서 있는 동안 율법파의 우리 수도 공격 +`bonus`(1) |
| `villages` | 정수 | 필요한 우리 마을의 기본 수(2) → `cathedralVillages()` = 이 값 + 판 크기 표의 `cathedralVillages` |

판별 비용·마을: 4×4 3/3/3·2, 5×5 4/4/4·2, 6×6 6/6/6·3, 7×7 8/8/8·5(돌/목재/신앙·마을; `3f33be1`~`238120e`에는 5/5/5, 6/6/6, 9/9/9, 12/12/12). 튜토리얼은 ×1·더하기 0. 지은 다음 장(`state.crusadeEnd`) 끝에 우리 수도가 서 있으면 승리(`winKind: 'cathedral'`, `checkVictory`).

**그 전**(`afab303`~`e174a18`): 세 단계 배열 `[{name, cost}]`(이름 `data.cathedral.0~2.name` 기초·벽·첨탑 — `3f33be1`에서 키도 지웠다). 비용은 `d7ad6e0`부터 단계마다 3/3/3(그 전 4/4/4, 4/4/4, 3/3/5로 합계가 `COST.cathedral`과 같았다), 7×7 ×1.5 → 5/5/5. 셋째 단계를 지으면 즉시 승리, 단계마다 승점 +1.

표에 없는 규칙 (engine, [02 §10](02-rules.md#10-대성당)):
- 우리 마을이 `cathedralVillages = CATHEDRAL.villages + MAP_SIZES[n].cathedralVillages`개 있어야 하고, 마지막 장에는 짓지 못한다 (`legalActions`) — 4×4·5×5 2, 6×6 3, 7×7 5(`3f33be1`; `d7ad6e0`~`e174a18`에는 `1 + …`로 1·1·2·3, 그 전에는 `cathedral + 1 + …`로 단계마다 하나씩 더. `9b43bbf`에서 큰 판 더하기, `7a28084`부터 판 크기 표에서 읽는다. 튜토리얼은 더하기 0).
- 대성당이 서면 율법파의 합법 행동에 우리 수도 공격이 거리와 무관하게 들어가고(`crusade: true`), `planEnemy`가 그것을 맨 앞에 세 번 둔다(rush — 한 칸에 한 가지의 예외). 그 장 율법파가 선공이다(`0c95856`). 율법파의 우리 수도 공격 +1은 `9b43bbf`~`c12a1e9`(`siegeOf`, 공사 중)에 있었고 `3f33be1`에서 `crusade.bonus`로 다시 생겼다.
- ~~율법파가 우리 수도를 치면 어느 단계든 한 단계 무너진다(`cathedral >= 1`).~~ — `d7ad6e0`에서 없어졌다: 올린 단계는 맞아도, 남은 자 규칙에도 무너지지 않는다.

### PLAYER_START · DIFFICULTY

`PLAYER_START`: 우리 부족 시작 `{food: 4, wood: 2, stone: 0, faith: 4, pop: 3}` (튜토리얼은 `TUTORIAL.start`).

`DIFFICULTY` (키 `easy`·`normal`·`hard`):

| 칸 | 형 | 뜻 |
|---|---|---|
| `name` | 문자열 | `data.difficulty.<id>.name` |
| `enemyBonus` | 정수 | 율법파 행동 수 보너스 (0/1/2) → `state.enemyBonus` → `actionLimit` |
| `enemyStart` | `{food, wood, stone, faith, pop}` | 율법파 시작 자원 |

난이도가 바꾸는 다른 것들(표 밖, engine): 어려움은 율법 카드 두 장을 보고 위협적인 쪽을 쓴다(그래서 율법 덱은 난이도와 무관하게 `maxRounds × 2 + 2`장을 미리 나눈다), 쉬움은 율법파가 지난 장의 말에 반응하지 않고 `iron` 지도자가 나오지 않는다, 율법파의 뜻을 보여 주는 범위(쉬움 전부 / 보통 기도만 빼고 모두 — `16492f4`, 그 전에는 공격·선교·건설 / 어려움 공격·건설 — `0a0a974`, 그 전에는 공격만), 검열 카드는 보통 이상.

### MAP_SIZES

**판 크기 표** (`7a28084`): 맵 한 변 → 그 크기의 모든 규칙 수. 판마다 다른 수는 이 표에만 있다(규칙서 `docs/RULEBOOK.md`의 "판 크기 표"와 같다 — 규칙서 표에는 `39500e9`부터, 이 표에는 `b1ff73e`부터 `at.wrath` 칸이 없다). 그 전에는 `{name, rounds}`뿐이었고 나머지는 엔진의 흩어진 예외(`quick()`, `max(0, rows − 5)`, `rows >= 7`)였다 — 값은 7×7 대성당 비용 말고는 같다. `3f33be1`에서 대성당 칸을 바꿨다(6×6 비용 1 → 1.5, 7×7 1.5 → 2, 7×7 마을 2 → 3).

| 칸 | 형 | 뜻 · 쓰는 곳 |
|---|---|---|
| `name` | 문자열 | `data.mapSize.<n>.name` — 설정 화면 |
| `rounds` | 정수 | 장 수 → `createState`의 `maxRounds`(시련의 `rounds`가 먼저), main 설정·시련 목록 |
| `cathedralCost` | 수 (실수일 수 있다) | 대성당 비용 배율 → `buildCost(…, 'cathedral')`가 1이 아니면 `ceil(v × k)` |
| `cathedralVillages` | 정수 | 대성당에 더 필요한 마을 → `cathedralVillages()` = `CATHEDRAL.villages`(2) + 이 값 (`3f33be1` — 그 전에는 1 + 이 값) |
| `enemyActions` | 정수 | 율법파 행동 수 더하기 → `actionLimit('enemy')` |
| `faith` | `{pop, round, converts}` | 신앙 승리 문턱: 두 부족 인구 합, 그 장부터, 선교로 데려온 수 → `checkVictory`·`faithConverts()` |
| `at` | `{ult, draft}` | 교리 궁극이 깨어나는 장·기적 드래프트 장 → `ultRound()`·`draftRound()`. `b1ff73e` 전에는 신의 분노가 차기 시작하는 장 `wrath`(→ `wrathRound()`, 시련 `last`는 분노 1장)도 있었다. `wrath`는 `1c81cd4`부터 읽는 규칙이 없다 — 신의 분노가 저울로 바뀌었고 저울에는 시점 문턱이 없다([02 §6.4](02-rules.md#64-신의-분노와-심판의-날)) |

| 키 | `name` | `rounds` | `cathedralCost` | `cathedralVillages` | `enemyActions` | `faith` | `at` |
|---|---|---|---|---|---|---|---|
| `4` | 빠르게 | 8 | 0.7 | 0 | 0 | `{pop:6, round:4, converts:1}` | `{ult:6, draft:3}` |
| `5` | 작게 | 12 | 1 | 0 | 0 | `{pop:8, round:6, converts:2}` | `{ult:8, draft:5}` |
| `6` | 보통 | 12 | **1.5** | 1 | 0 | `{pop:8, round:6, converts:2}` | `{ult:8, draft:5}` |
| `7` | 크게 | 14 | **2** | **3** | 1 | `{pop:8, round:6, converts:2}` | `{ult:8, draft:5}` |

- engine은 `sizeRules(state) = MAP_SIZES[state.rows] ?? MAP_SIZES[5]`로 읽는다. 튜토리얼(3×3)은 5×5 줄을 받되 `cathedralCost`·`cathedralVillages`·`enemyActions`는 `tutorial`이면 쓰지 않는다(×1, 0, 0). 시련의 판도 크기대로 이 표를 쓴다.
- JSON에서는 키가 문자열(`"4"`~`"7"`)이다. `data.js` 주석은 `at`을 `rounds.ult/draft`라 적었지만(`b1ff73e` 전에는 `rounds.ult/draft/wrath`) 실제 칸 이름은 `at`이다.

---

## 판 설정

### TUTORIAL

3×3 고정 튜토리얼 (5장, 율법파는 공격하지 않는 카드만).

| 칸 | 형 | 뜻 |
|---|---|---|
| `id` | `'tutorial'` | |
| `title` | 문자열 | |
| `seed` | 정수 (7) | 두 RNG 스트림의 시드 (`config.seed` 대신) |
| `rounds` | 정수 (5) | `maxRounds` |
| `map` | 3×3 문자열 배열 | 지형 id, 또는 `'P'`(우리 수도)·`'E'`(율법파 수도)·`'V'`(율법파 마을). 수도·마을 칸의 지형은 `plain` |
| `start` | `{player, enemy}` 각 `{food, wood, stone, faith, pop}` | 시작 자원 |
| `enemyBonus` | 정수 (0) | |
| `events` | 사건 id 5개 | 장 순서대로 (`EVENTS`에서 찾는다) |
| `lawCards` | 율법 카드 id 5개 | 장 순서대로 |

engine은 `events`·`lawCards`를 **뒤집어** 덱에 넣는다 (덱은 끝에서 뽑으므로). 튜토리얼에는 발견지·영구 지형·성지·지도자가 없고, 율법 덱이 바닥나면 `L5`·`L7`·`L10`을 뺀 카드로 채운다.

### TRIALS

시련: 고정 설정 + 비틀린 규칙 하나. 키 = 시련 id (`config.trial`).

| 칸 | 형 | 뜻 |
|---|---|---|
| `name`, `desc`, `intro` | 문자열 | |
| `size`, `difficulty`, `seed` | 맵 한 변 · 난이도 id · 정수 | 고정 설정 |
| `rounds` | 정수 (선택) | 있으면 `maxRounds`를 덮는다 (`last`: 8) |

규칙은 표가 아니라 engine·main이 id로 갈라 적용한다: `storm` — 손패 번개·풍요·불기둥 고정, 번개 비용 −1, 드래프트에 단비 없음. `earth` — 플레이어 공격 불가, 풍요 교리 1로 시작, 인구 증가 비용 1, 칼 소명·`noSword` 계명 없음. `sword` — 지도자 `iron` 고정, 율법 덱에 `L5` 두 장 더. `cloister` — 계시 20자까지(main `revMax`). `last` — 율법파 신도 +2·식량 +8(`1c81cd4` 전에는 분노가 1장부터도 — 설명 `data.trial.last.desc`는 그때 "여덟 장, 어려운 율법파가 둘 더 많은 채로 시작한다."로 고쳤고, 코드의 `wrathRound` 갈래는 `b1ff73e`에서 지웠다).

### ASCENSION

어려움에서 이기면 열리는 승천 1~5단계의 **설명 글** 5줄 (main 설정 화면, 언어팩 배열 `data.ascension`): "율법파 시작 신도 +1, 식량 +4" · "율법 석판 한계 -2" · "우리 쪽 저울(행동 +1)이 기우는 격차 6 → 8"(`1c81cd4` — 그 전 "신의 분노가 차는 격차 6 → 8") · "3막에 율법파 공격·선교 주사위 +1" · "은사 없이 시작". 효과는 engine이 `config.ascension` 값으로 적용한다: ≥1 율법파 신도 +1·식량 +4, ≥2 율법 석판 한계 −2(`edictMax`), ≥3 우리 쪽 저울의 격차 6→8(`1c81cd4` 전에는 분노가 차는 격차), ≥4 3막에 율법파 공격·선교 주사위 +1(`enemyZeal` — 예전의 "3막 율법파 행동 +1"을 `afab303`에서 바꿨다), 5 은사 없이 시작(main — 설정 화면과 종료 화면 「새 맵」 모두). 1단계 글의 "식량 +4"와 4단계 글은 `afab303`에서 코드에 맞게 고쳤다.

---

## 카드

### EVENTS

계절 카드 (장마다 한 장). 배열.

| 칸 | 형 | 뜻 |
|---|---|---|
| `id` | 문자열 | |
| `name`, `text` | 문자열 | 이름, LLM 프롬프트의 "최근 사건" |
| `rule` | 문자열 | 규칙 요약 (화면) |

행 6. 효과는 engine이 id로 적용한다: `calm` 우리 선교 +1(`preachBonus`, 상한 밖 — `24927a6`; 그 전에는 효과 없음; 해금 3 — 네 번째 판부터 — 3막에서는 덱에서 빠진다) · `drought` 식량 채집 −2 (단비가 내린 장은 없음 — `24927a6` 전 −1; 글은 `76c0053`부터 "식량 채집 -2" — 그 전 "평원·강 식량 채집 -2"였지만 코드는 모든 식량 채집) · `harvest` 평원·강 식량 채집 +2(`24927a6` 전에는 평원만 +1) · `plague` 장 끝에 양쪽 인구 −1 (인구 >1일 때, 방주가 우리를 지키고 `24927a6`부터 그 장에 기도했어도 — `state.prayedAt`) · `threat` 율법파 공격 주사위 +1 · `prophet` 탐험하면 반드시 신앙 +3. 청원(`makePetition`)도 가뭄·역병·예언자를 본다.
덱: `dealDeck(EVENTS + (해금 3이면 DILEMMAS 중 셋), maxRounds + 2)`. "해금 N" = engine `unlocked(state, N)`/`unlockedCfg(cfg, N)` — 끝낸 판 수 `config.unlock`(없으면 `veteran ? 4 : 0`)이 N 이상 (`8ba0ef8`, [02 §16.2](02-rules.md#162-모듈-해금-configunlock과-두-번째-판부터-configveteran)).

### DILEMMAS · MIRA

**`DILEMMAS`**: 두 갈래 사건 (해금 3 — 네 번째 판부터, 판마다 시드 해시로 여섯 중 셋이 사건 덱에 섞인다). `EVENTS` 행에 `choice`가 붙은 모양.

| 칸 | 형 | 뜻 |
|---|---|---|
| `id`, `name`, `text`, `rule` | 문자열 | `EVENTS`와 같음 |
| `choice[]` | 선택지 2개 | 첫째가 기본값 |
| `choice[].id`, `.label`, `.text` | 문자열 | |
| `choice[].tags` | **정규식 원본** (`kw.data.event.<id>.choice.<c>.tags`) | 계시 원문에 맞으면 그 선택 (`dilemmaByText`: 첫 번째로 맞는 선택지) |
| `choice[].gain` | 비용·이득 객체 (선택) | 음수는 해결 **전**에 `payDilemma`가 먼저 치르고(못 내면 음수가 없는 선택지로 바뀐다), 양수는 해결 뒤 `resolveDilemma`가 준다 |
| `choice[].pop` | `+1｜-1` (선택) | 인구 +1(한도가 차 있으면 식량 +2) / −1(1명은 남긴다) |
| `choice[].doctrine` | `1` (선택) | 가장 높은 교리 +1 (최고값이 같으면 `wisdom`이 먼저, 아니면 `peace`→`war`→`abundance` 순의 첫째 — `DOCTRINES.reduce(…, 'wisdom')`가 더 클 때만 바꾼다) |
| `choice[].provoke` | `true` (선택) | 다음 장 율법파가 공격 카드를 고른다 (`vowNext = 'attack'`) |
| `choice[].ark` | `true` (선택) | 이번 장 방주 (`roundMods.ark`) |

행 6: `refugees`, `pilgrims`, `inquisitor`, `schism`, `merchant`, `healer`.

**`MIRA`**: 분열의 예언자 — 덱에 없고, 해금 4(다섯 번째 판부터)·2막부터 대립 교리가 둘 다 3 이상이거나 신앙 바닥으로 한 장을 버텼을 때 **한 번** 그 장의 사건을 밀어내고 나온다 (`startRound`). 모양은 `DILEMMAS` 행과 같고 `special: true`, 선택지 셋. 선택지 칸이 둘 더 있다: `edict` (정수, 율법 석판 +n), `calm` (`true`, 신앙 바닥 카운트·연속 침묵을 0으로).

**`MIRA_TWIST`**: 교리 id → 미라가 지난 계시를 비틀어 인용할 때 붙이는 말 (`eng.miraQuote`). 4행.

### LAW_CARDS

율법파(오토마) 카드. 장마다 한 장 뽑아 규칙을 위에서부터 (두 바퀴) 실행한다.

| 칸 | 형 | 뜻 |
|---|---|---|
| `id` | `'L1'`…`'L10'` | |
| `name`, `text` | 문자열 | |
| `rules[]` | `{type, gather?, build?}` 3개 | `type`: `gather`·`build`·`pray`·`preach`·`attack`. 조건에 맞는 가능한 행동이 없으면 다음 규칙으로 |
| `ban` | `true` (L10만) | 검열: 장 끝에 플레이어가 가장 자주 쓴 명사를 다음 장에 봉인 (쓰면 계시 비용 +1) |

행 10: L1 확장(마을·목재·식량), L2 식량·식량·기도, L3 돌·성벽·목재, L4 성벽·돌·기도, L5 공격·공격·식량, L6 신전·기도·식량(`e41430e` — 그 전 기도·신전·식량이라 신전이 오르지 않았다), L7 선교·선교·기도, L8 식량·신전·마을, L9 마을·마을·목재, L10 식량·목재·기도(검열).

- engine `planEnemy`: `rules = [rush?, ...tail, ...card.rules]`. 표에 없는 합성 규칙이 끼어든다 — `rush` `{type: 'attack', target: 'capital', crusade: true}` × `CATHEDRAL.crusade.attacks`(3)(우리 대성당이 서면 — `3f33be1` 전에는 공사가 시작되면 한 줄; `1c81cd4` 전에는 그 다음에 결집 중이면 `rally` `{type: 'attack'}`도), 그리고 `tail`은 막마다 칼(`ZEAL_ACT`: 보통 3막·어려움 2막부터)이면 `[rules[0], {type: 'attack'}, rules[1], rules[2]]`, 아니면 `card.rules`. 공격·선교는 율법파 신도가 2 이상일 때만, 대상이 없으면(튜토리얼 제외) 우리 쪽으로 마을을 짓는다. 남는 행동은 `autoFill`. 자세한 것은 [02 §4.4·§4.9](02-rules.md#44-계획-planenemy).
- `lawPool`: 튜토리얼은 L5·L7·L10 제외. 검열 L10은 해금 4(다섯 번째 판부터) + 보통 이상. 지도자 `deck.remove`/`deck.add`를 적용 (add는 **한 장 더** — 같은 id가 두 번 들어갈 수 있다). 해금 3(네 번째 판부터)이면 2막 첫 장에 (풀에 L5가 있으면) L5 한 장을 덱 끝에서 네 번째 자리(`splice(len − 3, 0, L5)` — 다음에 뽑을 세 장 바로 밑)에 끼운다.
- `lawThreat`(어려움의 두 장 비교): 실제로 할 수 있는 규칙마다 가중치 attack 3, preach 2, build 2, pray 1, gather 1.

### ENEMY_LEADERS

율법파 지도자 (판마다 한 명, 튜토리얼 제외). 덱 구성과 대사만 바꾼다 — 수치 보너스는 없다.

| 칸 | 형 | 뜻 |
|---|---|---|
| `name`, `title`, `desc` | 문자열 | |
| `deck` | `{add: [카드 id], remove: [카드 id]}` | 율법 덱 변경 |
| `notOn` | `[난이도 id]` (선택) | 이 난이도에서는 나오지 않는다 (`iron`: easy) |
| `lines.intro` | 문자열 배열 | 1장 인사 |
| `lines.card` | `{<카드 id>｜any: 문자열 배열}` | 카드를 쓸 때 (그 카드 줄이 없으면 `any`) |
| `lines.rebuttal` | `{<교리 id>｜any: 문자열 배열}` | 계시에 대한 반박 (연대기에 남는다). 대사 속 `{word}`는 계시의 첫 명사로 채운다 (`interp.leaderLine`이 조사를 맞춘다) |
| `lines.villageLost`, `lines.capitalLow` | 문자열 배열 | 마을을 잃을 때, 수도가 맞을 때 |

행 4: `elder`(덱 변경 없음), `iron`(+L5, 쉬움 제외), `preacher`(+L7 −L2), `builder`(+L9 +L6 −L5).
고르기: `hashPick(쉬움이면 iron을 뺀 목록, 'leader', seed, difficulty)`, 시련 `sword`는 `iron`. 대사 고르기: `lore.leaderLine` → `hashPick(pool, seed, round, kind, cardId ?? '', word ?? '')`.

### REACT

율법파가 **지난 장의 계시 교리**(또는 금욕 서원 `vow`)를 듣고 고르는 카드. 키 = 교리 id 또는 `vow`.

| 칸 | 형 | 뜻 |
|---|---|---|
| `cards` | 율법 카드 id 배열 | 이 카드들을 선호한다 |
| `line` | 문자열 | 지도자가 하는 말 (main) |

`war` → L4·L3, `peace` → L7, `abundance` → L2·L9, `wisdom` → L6, `vow` → L5. engine `startRound` (쉬움·튜토리얼 제외): 어려움은 두 장 비교에서 맞서는 카드의 위협도에 +2를 더하고, 그 밖에는 뽑힌 카드가 맞으면 그대로, 아니면 덱 위 세 장 중 첫 맞는 카드와 바꾼다 → `state.reacted`. `db4135b`부터 같은 규칙을 다음 장 시작 전에 흉내 내는 `nextLawCard`가 계시를 적는 동안 다음 장 카드를 미리 보인다([02 §4.3](02-rules.md#43-이번-장-카드-고르기)).

---

## 교리

### DOCTRINES · DOCTRINE

`DOCTRINES` = `['peace', 'war', 'abundance', 'wisdom']` — 교리 id와 **순서**(교리 객체를 만들 때, 동률 처리, 화면 순서).

`DOCTRINE` (키 = 교리 id):

| 칸 | 형 | 뜻 |
|---|---|---|
| `name` | 문자열 | `평화`·`전쟁`·`풍요`·`지혜` (LLM 스키마의 enum 값이기도 하다 — interp `DOCTRINE_KO`) |
| `perks` | `{"2": 글, "4": 글, "6": 글}` | 특전 **설명 글**. 효과는 engine에 있다 |

특전 효과(engine): 평화 2·4 선교 +1씩 · 전쟁 2 공격 +1, 4 우리 성벽 비용 돌 1(`88878b6` — 그 전에는 4도 공격 +1, `buildCost`) · 풍요 2 식량 채집 +1, 4 인구 증가 비용 1 · 지혜 2 기도 +1, 4 행동 +1. 6칸 궁극은 플레이어만, `ultRound`(8장, 빠른 판 6장)부터: 평화 — 장 끝 이웃 율법파 마을에 선교 굴림, 전쟁 — 진 공격이 신도 대신 신앙 2를 잃는다, 풍요 — 인구 한도 +2, 지혜 — 다음 계절 두 장 중 고르기. `DOCTRINE_MAX` = 6.

### OPPOSED

교리 → 반대 교리 (`peace↔war`, `abundance↔wisdom`). 해금 4(다섯 번째 판부터)면 `recordRevelation`이 반대 교리를 한 칸 내린다 (이미 얻은 특전 칸 2·4·6 아래로는 내리지 않는다). 미라의 발동 조건(대립 교리가 둘 다 3 이상)은 engine이 같은 쌍을 직접 적어 검사한다. main은 확인 화면에 "흔들릴 교리"를 보여 준다.

### DOCTRINE_VOICE

가장 깊은 교리가 대사제의 말투를 바꾼다. 키 = 교리 id.

| 칸 | 뜻 |
|---|---|
| `prompt` | 최고 교리 4칸 이상일 때 LLM 프롬프트에 넣는 한 줄 (`voiceOf(state, 4)`) |
| `prefix` | 최고 교리 3칸 이상일 때 석판 해석문의 머리말 (`voiceOf(state)` 기본 3; 아니면 `interp.tablet.prefix`) |

---

## 기적

### MIRACLES · FIRST_HAND · DOOM

`MIRACLES` (배열, 8행):

| 칸 | 형 | 뜻 |
|---|---|---|
| `id` | 문자열 | `lightning`·`rain`·`bounty`·`manna`·`ark`·`tongues`·`pillar`·`revive` |
| `name`, `text` | 문자열 | |
| `cost` | 정수 | 신앙 비용 (4·3·5·3·3·3·3·5). 실제 비용 `miracleCost = max(1, cost − (storm 시련의 번개면 1)) + 다시 쓴 횟수` (`b1ff73e` 전에는 분노만큼도 깎였다 — `1c81cd4`부터 분노는 늘 0이었다) |
| `target` | `'enemy'` (번개만) | 율법파의 보이는 칸을 골라야 한다 |

효과는 engine `castMiracle`/`MIRACLE_FX`에 있다: 번개(성벽을 무너뜨리거나 신도 −1, 수도면 석판 −2), 단비(식량 +3, 이번 장 가뭄 무효), 풍요(목재·돌 +2), 만나(식량 +4), 방주(이번 장 우리 손실 막기), 방언(선교 +1), 불기둥(시야 3칸, 공격 +1), 부활(인구 +1, 한도면 신앙 +2). 장당 하나.

`FIRST_HAND` = `['lightning', 'rain', 'bounty']` — 첫 판~세 번째 판(과 튜토리얼)의 손패. 해금 3(네 번째 판부터)은 `hashPick`으로 번개/단비 중 하나 + 나머지에서 둘. 해금 3 판의 드래프트(5장, 빠른 판 3장)에서 손에 없는 기적 가운데 `deck` 난수로 셋을 보여 하나를 더한다.

~~`DOOM`~~ — 숨은 기적 「심판의 날」: `{id: 'doom', name, cost: 0, hidden: true, text}`. **`b1ff73e`에서 지웠다**(`1c81cd4`부터 신의 분노가 차지 않아 나오지 않았다; 설명 글 `data.miracle.doom.*`도 지웠다; 이식판은 옮기지 않는다, [02 §6.4](02-rules.md#64-신의-분노와-심판의-날)). 그 전: 신의 분노가 3이면(튜토리얼 제외) **판에 한 번** 쓸 수 있었다(`state.doomUsed`, `9b43bbf`): 율법파 수도 −1·신도 −1, 분노 0, 석판 −2. 드래프트에 나오지 않는다. 설명 `data.miracle.doom.text`도 "… 분노가 가라앉는다. 판에 한 번."으로 바뀌었다.

---

## 말의 장치

### TONES

말투 → `{name, text}` (`command`·`blessing`·`curse`·`metaphor`, `command.text`는 빈 문자열). **표시용**이다 (main 확인 화면의 꼬리표 `{이름}의 말투`와 그 툴팁). 판정은 `lore.detectTone`(정규식 `kw.tone.*`, 저주 > 축복 > 비유 > 명령). `8250dd7`부터 말투는 **효과가 없다** — `text`는 셋 다 `대사제의 말씨가 달라진다 (수치는 그대로)`. 그 전에는 `text`가 효과 글이었고 효과는 `engine.applyTone`(축복: 첫 채집 +1, 저주: 공격 +1·신앙 −1)과 main(비유: 교리 +1 가속)이 걸었다. `data.js`의 주석("계시의 문체가 효과가 된다")은 옛 뜻 그대로다.

### PROPHECY

| 칸 | 형 | 뜻 |
|---|---|---|
| `kinds` | `{fall｜capital｜pop｜convert: {name, short}}` | 예언 종류의 이름 |

`8250dd7`에서 `reward`(`{"1": 4, "2": 3, "3": 2}` — 기한별 이루면 받는 신앙)와 `penalty`(2 — 빗나가면 잃는 신앙)를 지웠다. 이룬 예언은 이제 **은총**(신앙 +1, 장당 한 번의 몫 — `grantGrace`)이고 빗나가도 벌이 없다. 주석 "짧을수록 보상이 크다"는 남았다.

종류 판정은 `lore.parseProphecy`(`kw.prophecy.*`), 봉인은 `sealProphecy`(기한 `due = round + rounds − 1`, 기준값 저장), 판정은 장 끝 `checkProphecy`(이루면 은총, 기한이 지나면 기록만): `fall` 우리가 마을을 빼앗음, `capital` 율법파 수도 내구도가 줄었음, `pop` 우리 인구 +2 이상, `convert` 개종 성공.

### COMMANDMENTS

영원한 계명 ("영원히 …"로 새긴다; 해금 4(다섯 번째 판부터)·3장부터, 판당 `MAX_COMMANDMENTS` = 2). 키 = 계명 id.

| 칸 | 형 | 뜻 |
|---|---|---|
| `name`, `text` | 문자열 | |
| `re` | **정규식 원본** (`kw.data.commandment.<id>.re`) | `lore.parseCommandment`: 계시에 `kw.eternal`("영원히")이 있고 이 정규식이 맞으면 그 계명 (표 순서대로 첫 번째) |

행 4 — 효과는 engine: `noSword` 플레이어 공격 불가, 선교 +1 · `noExpand` 마을 건설 불가, 신전 돌 −1 · `sabbath` 4의 배수 장마다 행동 −2(최소 1)·기도 ×2 · `noFamine` 장 끝 식량 1을 더 쓰고 대신 굶어 줄지 않는다. 시련 `earth`에서는 `noSword`를 새길 수 없다(`carvable`).

### SACRED_WORDS

오늘의 계시(`config.daily`)에만: `hashPick(SACRED_WORDS, 'sacred', daily)`로 하나를 고른다. 행 7.

| 칸 | 형 | 뜻 |
|---|---|---|
| `word` | 낱말 (`kw.data.sacred.<i>.word`) | 계시에 **문자열로 포함**되면(`includes`) 성서에 새겨진다 (`findSacred`, 판당 한 번) |
| `clue` | 문자열 | 화면에 보이는 단서 |

### PETITIONERS

"직업 이름" 12개 (`data.petitioners` 배열). engine: 장마다 청원자 `hashPick(PETITIONERS, seed, round, 'petitioner')`, 행동을 한 신도의 이름 `followerName = hashPick(PETITIONERS, seed, actionKey)` (성인·쓰러진 자).

### PRIESTS

대사제 성향. 해금 3 전(첫 판~세 번째 판)은 `loyal`, 해금 3(네 번째 판부터)이면 `hashPick(loyal을 뺀 키, 'priest', seed)`. 이 표에는 글만 있고, `0a0a974`부터 성향이 정하는 수치(헤아린 노동의 손 수·먼저 고르는 일·선교/공격 승률 문턱)는 engine `autoFill`의 `PRIEST_LABOR`에 있다 — `loyal` 1손·50%, `literal` 0손, `dreamer` 2손, `zealot` 공격·선교 먼저·40%, `cautious` 성벽·기도 먼저·60% ([02 §3.5](02-rules.md#35-기본-노동-autofill)). `data.json`에는 없다.

| 칸 | 뜻 |
|---|---|
| `name` | 화면 (확인 화면 머리, 사제 말풍선 이름) |
| `trait` | 성향 한 줄. `0a0a974`에서 헤아린 노동을 덧붙여 적었다(예: 문자주의 "말한 그대로만 한다 — 계시의 뜻을 헤아려 더 하는 일이 없다", 열혈 "… 남는 손이 먼저 치거나 전한다 (이길 확률 40%부터)"). 같은 커밋부터 `loyal`이 아닌 판의 1장에 사제 말풍선 `ui.priestIntro`("이번 판의 대사제는 {trait}.")로 보인다 — 그 전에는 화면 어디에도 쓰이지 않았다 |
| `prompt` | LLM 프롬프트에 넣는 한 줄 (`loyal`은 빈 문자열) |

행 5: `loyal`, `literal`, `dreamer`, `zealot`, `cautious`.

---

## 판의 목표와 흐름

### DESTINIES

소명 (해금 2 — 세 번째 판부터, 도전 링크 제외). 판 시작에 셋을 제시하고 고르지 않으면 첫째. 이루면 승점 `DESTINY_POINTS`(5).

| 칸 | 형 | 뜻 |
|---|---|---|
| `name`, `text` | 문자열 | |
| `test` | **함수** `(st, v) => boolean` | `st` = 게임 상태, `v = {villages: villageCount(st, 'player')}` |

행 8과 조건(함수 원문 요약): `villages` 8장까지 마을 4 · `convert` 개종 3회 · `ultimate` 교리 하나가 6 · `temple` 6장까지 신전 3단계 · `feeder` 마지막 장까지 굶은 적 없음 · `fortress` 마지막 장에 수도 내구도 `>= CAPITAL_HP`(`435c3cc`부터 상수 — 지금 2, 한 번도 맞지 않음) · `sword` 마을 2곳 빼앗기 (시련 `earth`에서는 제시하지 않는다) · `namer` 이름 3개.
제시 순서: `Object.keys(DESTINIES)`를 `hashPick([0..9], seed, 'dest', id)` 오름차순(동률은 id 사전순)으로 정렬해 앞의 셋. 판정: 장 끝 `checkDestiny`(유지 단계 안과 `recordHistory`에서).

### JUDGEMENTS

심판의 기준 = 승점 공식. 해금 2 전(첫 판·두 번째 판)은 `classic`, 해금 2(세 번째 판부터)면 `hashPick(키 목록, 'judgement', seed)`.

| 칸 | 형 | 뜻 |
|---|---|---|
| `name`, `text` | 문자열 | |
| `w` | `{pop, village, temple, hp, wall?, faith?}` | 가중치 |

`scoreBreakdown`: 인구×`w.pop` + 마을 수×`w.village` + 신전 단계×`w.temple` + 수도 내구도×`w.hp` + (`w.wall`이면) 성벽 칸 수×`w.wall` + 성지 2 + 소명 5 + (`w.faith`이면) `floor(신앙 / w.faith)`. **`w.faith`는 곱하는 값이 아니라 나누는 값**이다. (대성당 단계×1은 `3f33be1`에서 단계와 함께 없어졌다.)
행 5: `classic`(2·3·2·1), `wide`(1·5·2·1), `fertile`(3·2·1·1), `pious`(2·2·3·1, 신앙 3당 1), `steadfast`(2·2·2·3, 성벽 1).

### ACTS · FESTIVALS · MONTHS

- `ACTS`: 세 막 `{name, text?}` (1막은 `text`가 없다). 막 번호 `actOf(state)`: `round < floor(maxRounds/4)+1` → 1, `round < ceil(maxRounds×2/3)` → 2, 그 밖 3. 막이 바뀌면 규칙이 바뀐다 (2막: 율법 덱에 L5(해금 3), 성지가 석판을 움직이기 시작(해금 1), 미라 가능(해금 4) / 3막: 평온한 계절 없음(해금 3), 승천 4의 율법파 공격·선교 주사위 +1). 막 머리말 `text`는 해금 3부터 지도자 말로 나온다. main은 막 이름·글을 장 제목과 지도자 말로 보여 준다.
- `FESTIVALS`: `{"2": 하지제, "3": 추수제, "last": 동지의 밤}` — 막이 바뀌는 장·마지막 장의 부제 (main).
- `MONTHS`: 달 이름 12개. `monthOf(state) = MONTHS[min(11, floor((round−1)×12 / maxRounds))]`.

### SITES

안개 속 발견지 — 칸이 처음 보일 때 한 번 (`discoverSites`, 장 끝 시야 갱신 뒤 — `88878b6` 전에는 지혜 연속 기적 뒤에도). 키 = 발견지 id.

| 칸 | 형 | 뜻 |
|---|---|---|
| `name`, `text` | 문자열 | |
| `gain` | 이득 객체 (선택) | 즉시 받는다 |
| `choice[]` | `{id, label, text}` 2개 (선택) | 고를 것이 있는 발견지 (`state.pendingSite`로 남기고 `resolveSite`가 처리). 선택이 필요한 발견은 한 번에 하나 |

행 5: `nomads`(선택: `take` 인구 +1 — 한도면 식량 +2 / `send` 신앙 +2, **효과는 `resolveSite`에 하드코딩**), `altar`(신앙 +3), `spring`(목재 +2·돌 +1), `bones`(돌 +3), `legacy`(전생의 유적: `gain`은 신앙 +2이지만 engine은 `config.legacy.doctrine`이 있고 그 교리가 3 미만이면 교리 +1을 대신 준다).
놓기: `mapgen.placeSites` — 점대칭 쌍, 36칸 미만 1쌍·이상 2쌍, 종류는 `nomads`·`altar`·`spring`·`bones`에서 뽑는다. `legacy`는 `config.legacy`가 있을 때 `placeLegacy`로 한 칸.

---

## 메타 진행

### AWE_LEVELS · AWE_TITLES · BLESSINGS

- `AWE_LEVELS` = `[20, 50, 100, 160, 240]` — 경외가 이 값에 닿을 때마다 레벨 +1 (main, `meta.addAwe`).
- `AWE_TITLES` — 레벨 0~5의 칭호 6개 (main).
- `BLESSINGS` — 은사 `{level, name, text}`, 키 `preacher`(1)·`mason`(2)·`granary`(3)·`seer`(4). 레벨이 닿으면 고를 수 있고 main이 `config.blessing`으로 넘긴다 (오늘의 계시·도전·튜토리얼·승천 5 제외). 효과는 engine: `preacher` 첫 개종까지 선교 +1, `mason` 신전 1→2 돌 −1, `granary` 시작 식량 +2, `seer` 1장 시야 3칸.

### SIGILS

신의 인장 키 → SVG 심볼 id (`light: 'i-faith'`, `sword: 'd-war'`, `dove: 'd-peace'`, `grain: 'i-food'`, `eye: 'e-prophet'`, `storm: 'm-lightning'`). main이 설정 화면과 계시 인장 단추에 그린다 (`config.god.sigil`). 심볼은 `js/game/art.js` (낱장은 `docs/export/svg/`).

---

## 규칙 수치

### RULES

| 칸 | 값 | 뜻 (쓰는 곳) |
|---|---|---|
| `followersPerAction` | 4 | 신도 4명마다 행동 +1 (`actionLimit`) |
| `followersPerFaith` | 3 | 신도 3명마다 신앙 수입 +1 (`faithIncome`) |
| `baseFaithIncome` | 1 | 매 장 기본 신앙 수입 |
| `heresyGrace` | 1 | 신앙 0으로 버틸 수 있는 장 수, 그다음 장부터 신도가 율법파로 떠난다 (`upkeep`) |
| `lowFaith` | 2 | 이 이하이면 자동 노동이 기도를 먼저 하고(`8250dd7`부터 플레이어 쪽은 "모자란 것" 셋 가운데 첫째) 신앙 청원이 나온다 (`autoFill`, `makePetition`) |
| `gracePerRound` | 1 | 청원·서원·이름·이룬 예언(`8250dd7`)으로 받는 은총 신앙의 장당 한도 (`grantGrace`) |
| `graceDoctrineBelow` | 3 | 전생의 유적의 교리 가속은 그 교리가 이 값보다 낮을 때만 (`discoverSites`). `8250dd7` 전에는 비유(`recordRevelation`)·첫 이름(main)의 가속도 이 값을 봤다 — `data.js`의 주석은 아직 그 둘을 말한다 |
| `maxNames` | 3 | 판당 이름 수 (`nameTile`) |

칸 8개. `superiority`(3 — 신도가 이만큼 많으면 공격·방어 주사위 +1)는 `435c3cc`에서 규칙과 함께 지웠다([02 §1.7](02-rules.md#17-파생-수치)). `data.json`의 `RULES`에도 없다.

### 상수

| 이름 | 값 | 뜻 · 쓰는 곳 |
|---|---|---|
| `CAPITAL_HP` | 2 | 수도 내구도 시작값과 `0c95856`부터 옛 저장본을 불러올 때의 상한(`hydrateState`가 `min(capitalHp, CAPITAL_HP)`) (engine), 소명 `fortress`의 문턱 (`DESTINIES`), 화면 칸 수·업적 「흔들림 없는 신전」의 판정 `capitalFull` (main). `435c3cc`에서 3 → 2 (양쪽) — 점령이 실제로 닿는 길이 되게: 커밋 기록의 탐욕 최적화기에서 수도 점령으로 이긴 판 7% → 15%, 고정 한 줄 스크립트는 그대로 |
| `MAX_TEMPLE` | 3 | 신전 최고 단계 |
| `MAX_ACTIONS` | 6 | 행동 수 상한 (`actionLimit`) |
| `DOCTRINE_MAX` | 6 | 교리 트랙 끝 = 궁극 |
| `EDICT_MAX` | 10 | 율법 석판이 이만큼 차면 율법파 승리 (`edictMax`: 승천 2부터 −2 → 8; `data.js:26`). `c12a1e9`에서 12 → 10 — 같은 커밋에서 율법파 신앙 → 석판 전환과 피의 율법을 지워 석판은 성지·율법파 신전·번개·심판의 날(과 미라 「품는다」)로만 움직인다([02 §9](02-rules.md#9-율법-석판과-성지) — 심판의 날은 `b1ff73e`에서 지웠지만 `data.js:26`의 주석에는 남았다). 코드 주석은 오르내리는 원인을 적는다 |
| `DESTINY_POINTS` | 5 | 소명 승점 |
| `MAX_COMMANDMENTS` | 2 | 판당 계명 수 |
| `REVELATION_MAX` | 100 | 계시 글자 수 상한 (main `revMax`; 시련 `cloister`는 20) |
| `MAX_ROUNDS` | 12 | **쓰이지 않는다** (`createState`는 `MAP_SIZES`가 없을 때 숫자 12를 직접 쓴다) |
| `RULESET` | 22 | 규칙 판 번호 (`data.js:240`). 기록·최고 기록 키에 붙어 규칙이 바뀐 판끼리 비교하지 않게 한다 (main, chron, meta `bestKey`). `55d33dd`부터 새 상태에 `state.ruleset`으로도 적혀, 불러올 때 10 미만(없으면 0)이면 석판을 새 한계 아래로 자른다(engine `hydrateState`). `e68a240`에서 4 → 5로 올렸다 — `afab303`(원정·결집·대성당 조건 등)·`448f553`(남은 자)·`e68a240`(막기 대칭·헤아린 성벽 예산)의 규칙 변경이 한 번에 반영된다. 그 사이(`afab303`~`e68a240` 직전)에 둔 판은 재조정 전의 판과 같은 `-r4` 키로 남아 있다. `9b43bbf`(심판의 날 한 번·신앙 승리 개종 조건·큰 판 보정)는 올리지 않아 `-r5`에 그 전후 판이 섞인다. `87a0fce`에서 5 → 6(승점으로 정하는 선공, 결집 12·6점과 신도 +1, 같은 기적 재사용 +1, 두 장 전 메아리). `7a28084`의 7×7 대성당 ×1.5는 올리지 않고 `-r6` 안에서 바뀌었다. `435c3cc`에서 6 → 7(신도 수 우위 삭제, 수도 내구도 2). `8ba0ef8`의 해금 단계는 올리지 않았다. `0c95856`에서 7 → 8(대성당 공사 중 율법파 선공, 30자 가산·인용 할인 삭제 — 같은 커밋부터 최고 기록 키에 해금 단계 `-u{n}`도 붙는다, [07 §13](07-progression.md#13-시드별-최고-기록-metajs105-115)). `0a0a974`(대사제 성향 노동, 어려움의 건설 공개)는 올리지 않았다. `df1cb16`에서 8 → 9(되풀이 규칙을 하나로 — 되풀이면 율법파가 선교·공격에 대비, 결집의 신도 +1 삭제). `16492f4`(보통의 율법파 뜻 공개, 예고된 성벽을 세는 승률, 석판 해석기)는 올리지 않았다. `c12a1e9`에서 9 → 10(석판의 신앙 전환·피의 율법 삭제, `EDICT_MAX` 12 → 10). `55d33dd`(대성당 원정 +1 삭제, 율법파의 대비를 메아리 판정으로)는 올리지 않아 `-r10`에 그 전후 판이 섞인다. `846fd60`에서 10 → 11(포위·성인 보정·청원 외면 벌 삭제), `88878b6`에서 11 → 12(연속 기적 대신 율법파가 읽음, 전쟁 4칸은 성벽 돌 1), `8250dd7`에서 12 → 13(은총 하나 — 말투 수치 삭제·예언 은총, 절 하나에 손 둘, 남는 손은 모자란 것만), `d7ad6e0`에서 13 → 14(대성당은 무너지지 않고 단계마다 마을 하나·3/3/3, 석판의 공격·선교 과녁은 가까운 곳, 짓는 일은 한 손), `e174a18`에서 14 → 15(살림뿐인 계시는 되풀이가 아님, 율법파는 전쟁·평화의 세 장만 읽음, 석판의 금지어·먼저 차지될 칸 피하기), `3f33be1`에서 15 → 16(번갈아 말한 전쟁·평화도 읽음, 대성당은 한 번 짓고 원정을 버팀, 성지 자리가 시드마다 — 불러올 때 16 미만이고 대성당 공사가 있었으면 지은 것으로 바꾼다, engine `hydrateState`), `637c05a`에서 16 → 17(칼·말씀 세 장을 읽음 — 공격·선교를 시킨 계시도, 결집 8·4점과 신도 수에 묶이지 않는 손, 원정의 세 번은 신도·손 수와 무관, 성지와 대칭 칸 보호), `24927a6`에서 17 → 18(풍년·가뭄 ±2, 평온한 장 선교 +1, 기도한 장의 역병 면함, 석판의 같은 일은 둘까지), `76c0053`에서 18 → 19(마을은 선교 세 번에 넘어옴, 인구가 가득 차면 데려오지 못함, 같은 종류 넷째 명령 거절, 헤아린 손의 같은 일 둘까지·열혈은 전쟁·평화에서만, 석판의 지형·성벽 없는 곳·차지), `238120e`에서 19 → 20(마지막 한 명은 설득되지 않음 — 양쪽, 데려오지 못한 개종은 세지 않음, 칼·말씀의 말씀은 선교뿐, 석판 어휘), `1c81cd4`에서 20 → 21(저울 하나 — 6점 이상 뒤진 쪽 행동 +1이 신의 분노·심판의 날·결집을 대신한다, 대성당 4·4·4, 평화 궁극은 마지막 한 명을 데려오지 않음 — 불러올 때 21 미만이면 `rally = false`, engine `hydrateState`). `39500e9`(석판)·`b1ff73e`(분노 코드 삭제 — 불러올 때 `wrath`·`doomUsed`를 지운다, "노리는 곳"은 한 칸, 석판 어휘)·`db4135b`(다음 장 율법 카드 미리 보기)는 올리지 않았다. `e41430e`에서 21 → 22(율법 카드 L6 경건의 규칙 순서를 신전 → 기도 → 식량으로 — 율법파가 신전을 높이고 석판이 오른다; 석판 어휘·`dilemmaChoice`도 같은 커밋) |

`data.js` 밖의 상수: engine의 **`FLIP_MARKS` = 3**(`engine.js:536`, `76c0053` — `238120e`부터 내보낸다; 같은 마을에서 선교로 이만큼 이기면 넘어온다, main이 칸 툴팁 `ui.tip.marks`의 `{of}`로 쓴다), 내보내지 않는 **`SCALE_GAP` = 6**(`engine.js:999`, `1c81cd4` — 저울이 기우는 승점 차, 우리 쪽은 승천 3부터 +2; 그 전 자리에는 결집의 `RALLY_LEAD` = 8)과 **`MODULES` = 4**(`engine.js:68`, `8ba0ef8`) — 모듈 해금 단계의 최대(끝낸 판 수를 이 값에서 자른다). main이 import해 `unlock: min(MODULES, 서고 길이)`로 넘기고 해금 안내의 끝을 정한다. `data.json`에는 없다.

---

## 함수 칸 ($fn)

`data.json`에서 `{"$fn": "<소스>"}`로 나오는 칸은 둘뿐이다(9개 — `COST.temple` 1 + `DESTINIES.*.test` 8; 셋째였던 최상위 `revelationCost`는 `0c95856`에서 지웠다). GDScript로 옮긴 모양을 함께 적는다.

| 자리 | 원문 | GDScript |
|---|---|---|
| `COST.temple` | `(level) => ({ stone: level * 2, wood: level + 1 })` | `func temple_cost(level: int) -> Dictionary: return {"stone": level * 2, "wood": level + 1}` |
| `DESTINIES.<id>.test` (8개) | `(st, v) => …` — 예 `villages`: `(st, v) => st.round <= 8 && v.villages >= 4` | id → `Callable(state, v) -> bool` 표. `ultimate`는 `Object.values(st.sides.player.doctrine).some((x) => x >= 6)`, `namer`는 `Object.keys(st.names ?? {}).length >= 3`처럼 상태 필드를 직접 읽으므로 04의 상태 필드 이름을 따른다 |
| ~~`revelationCost` (최상위)~~ | ~~`(text) => (text.trim().length > 30 ? 2 : 1)`~~ | **없어짐** `0c95856` (쓰이지 않던 함수; `data.js:54`에는 주석 한 줄만 남았다). 비용은 engine `revelationCostFor`: 신앙 1, 봉인된 말을 쓰면 +1, 지난 계시를 되풀이하면(메아리 `isEcho`) +1 — 길이와 인용은 보지 않는다 |

글자 수(`length`)는 JS 문자열 길이(UTF-16 단위)다. 한글 음절은 한 단위이므로 Godot `String.length()`와 같다.

## kw.* 칸

`data.js`에서 언어팩의 `kw.*` 키를 읽는 칸은 셋이고, 모두 계시 원문(플레이어가 쓴 글)에 대한 검사다.

| 칸 | 키 | 쓰는 법 |
|---|---|---|
| `DILEMMAS[].choice[].tags`, `MIRA.choice[].tags` | `kw.data.event.<id>.choice.<c>.tags` | `new RegExp(tags).test(text)` — 플래그 없음. 선택지 순서대로 첫 번째 |
| `COMMANDMENTS.<id>.re` | `kw.data.commandment.<id>.re` | `kw.eternal`이 맞은 뒤 `new RegExp(re).test(text)` — 플래그 없음 |
| `SACRED_WORDS[].word` | `kw.data.sacred.<i>.word` | `text.includes(word)` (정규식 아님) |

나머지 `kw.*`(석판 규칙·곳과 수의 말 `kw.place.*`·`kw.count2/3`(`78c891e`)·부정어와 부정이 아닌 말 `kw.notNeg`·곳의 말 `kw.place.village`/`nearTerrain`/`terrainName`/`home`/`dir`/`dirWord`(`87a0fce`)·명사 뽑기·말투·예언·이름 붙이기·청원 키 등)는 `data.js`를 거치지 않고 interp·lore·engine이 언어팩에서 직접 읽는다 — [05 해석기](05-interpreter.md)와 [`i18n-ko.json`](../export/i18n-ko.json).

## 결정론 도우미 (요약)

자세한 것은 [04 구조](04-architecture.md). 데이터 표를 **고르는** 곳은 모두 아래 둘 중 하나를 쓴다.

- **시드 RNG** — mulberry32 한 걸음. 상태는 부호 있는 32비트 정수 하나.
  ```js
  let t = (s = (s + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;   // [0, 1)
  ```
  engine은 스트림 둘: `state.rng.dice = seed`(주사위·탐험), `state.rng.deck = seed ^ 0x5bd1e995`(덱 섞기·기적 드래프트). 튜토리얼 시드는 `TUTORIAL.seed`. `mapgen`은 판마다 새 생성기: 지형 `seed`, 발견지 `seed ^ 0x2f6b1a3d`, 영구 지형 `seed ^ 0x51a7c0de`, 전생의 유적 `seed ^ 0x1e6ac7`. 섞기는 Fisher–Yates(끝에서부터, `j = floor(rand × (i+1))`), 덱은 끝에서 뽑는다.
- **`hashPick(list, ...salts)`** (lore.js) — 난수를 쓰지 않는 선택 (글을 늘려도 판이 바뀌지 않게). `salts.join('|')`의 글자마다 FNV-1a 32비트(`h = 0x811c9dc5; h ^= code; h = imul(h, 0x01000193)`), 결과 `list[(h >>> 0) % list.length]`. 주의: `join`은 `null`/`undefined`를 빈 문자열로, 수를 JS 기본 문자열(`2026`)로 바꾼다. 지도자·사제·심판·손패·갈림길 셋·소명 순서·청원자·신도 이름·지도자 대사·검열 대체어가 이것으로 정해진다.
- **정렬 안정성**: 갈림길 셋 고르기처럼 비교값이 같을 수 있는 `sort`는 JS의 **안정 정렬**(동률은 원래 순서)에 기댄다. Godot `sort_custom`은 안정성을 보장하지 않으므로 원래 인덱스를 두 번째 키로 쓴다.

골든 벡터([`docs/export/golden/`](../export/golden/README.md))의 `setup.eventDeck`/`lawDeck`/`rng`와 장마다의 `digest.rng`로 이 모든 것을 검증할 수 있다.
