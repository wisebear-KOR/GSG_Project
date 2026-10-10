# 재사용 분류표

재설계([README.md](README.md))에 앞서 지금 코드·문서를 다섯 갈래로 나눈다. 기준 커밋은 `34f4cbd` (RULESET 27)이다.
줄 번호는 그 커밋 기준이다. 약어: **E** `js/game/engine.js`, **D** `js/game/data.js`, **I** `js/game/interpreter.js`, **M** `js/game/main.js`.

| 분류 | 뜻 |
|---|---|
| **그대로** | 칸의 값·칸 고르기와 무관하다. 손대지 않는다 |
| **고쳐 씀** | 돌아가지만 칸의 값을 읽거나, 칸을 고르거나, 새 칸 필드가 필요하다 |
| **새로 씀** | 핵심 일이 칸의 값·칸 고르기라 바뀐다. 또는 지금 없는 것이다 (§10) |
| **다시 생성** | 생성물. 규칙이 바뀐 뒤 도구로 다시 만든다 |
| **재검토** | 땜질 규칙. 새 깊이가 그 공략을 막는지 재고 나서 걷어낼지 정한다 (§7) |

---

## 1. 한눈에 보기

| 층 | 그대로 | 바뀌는 핵심 |
|---|---|---|
| 데이터·엔진 | engine.js 내보내기 약 75개 | 새로 씀 2 (`yieldOf`, `gatherAmount`), 고쳐 씀 12, 재검토 약 11 |
| 해석기 | 석판의 낱말 읽기 전부 (절 나누기·부정·수·장소 말) | `rankMatches`를 새로 씀, `byPlace`가 배치 점수의 뼈대가 된다, LLM의 행동 목록 |
| 화면 | 효과음·연출·아트·저장·연대기 | 칸 표식, 툴팁, 확인 칩의 까닭, ⇄ |
| 언어팩 | 장소·규칙 정규식 전부 | 툴팁·칩·규칙 글, 튜토리얼 몇 줄, 새 장소 어휘 |
| 도구·시험 | det · edge · i18n-check · export · bench 틀 | golden 기록 항목, fuzz 불변식, 새 봇과 측정 |
| 문서 | 은총·모듈·진행 | 규칙서 §2·§4, spec 02·03·05·06의 지형·채집·배치 절 |

**칸 하나에서 나오는 값은 한 쌍의 함수에서만 나온다**: `yieldOf`·`gatherAmount` (E:358-373).
절대 가치를 바꾸는 일은 이 두 함수와, 이 둘을 부르는 다섯 곳만 건드리면 된다 (§2.2).
**칸을 고르는 곳은 여섯이다**: 석판 순위, LLM, ⇄, 자동 채우기, 율법파, 번개·이름 붙이기. 재설계는 이 여섯을 배치 점수 하나로 모은다 (§3.4).

## 2. 데이터·엔진

### 2.1 데이터 (`js/game/data.js`)

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `TERRAIN` (평원 식량 2 · 숲 나무 2 · 산 돌 2 · 강 식량 1 · 언덕 신앙 1 · 사막 없음) | D:5-12 | 새로 씀 | 활성도 단계에 따른 양 |
| `FEATURES` (오아시스 식량 3 · 채석장 돌 3) | D:203-206 | 새로 씀 | 같은 틀로 |
| 사건 가뭄·풍년 | D:108-115 | 새로 씀 | 사건 덱에서 빼서 땅의 운 덱으로 옮긴다 (README §5.2) |
| 풍요 교리 특전 (식량 채집 +1) | D:100-104 | 고쳐 씀 | 보정이 새 절대 가치에 얹히도록 |
| `LAW_CARDS` | D:263-285 | 그대로 | 종류·자원만 적혀 있다 |
| `RULESET = 27` | D:238-239 | 고쳐 씀 | 28로 |
| `TUTORIAL.map` | D:373-390 | 고쳐 씀 | 칸마다 양을 적어야 하면 |
| 그 밖 (비용·교리·기적·모듈·난이도·맵 크기…) | | 그대로 | |

### 2.2 칸의 값을 읽는 곳 (`js/game/engine.js`)

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `yieldOf` | E:358-362 | 새로 씀 | 절대 가치 = 지형·특징 × 활성도 |
| `gatherAmount` (가뭄 −2, 풍년 +2, 풍요 2칸 +1) | E:364-373 | 새로 씀 | 가뭄·풍년 보정은 지운다 (땅의 운이 칸의 단계로 대신한다). 풍요 교리 +1만 새 값 위에 남는다 |
| `describe` — 행동 글 "(식량 +2)" | E:375-392 | 고쳐 씀 | LLM이 보는 글. 활성도를 보일지 (D7) |
| `legalActions` | E:395-433 | 고쳐 씀 | 채집 후보와 글. 모양 `{type, tile, gather?, build?, side, key, text}`은 그대로 |
| `autoFill`의 `best()` | E:528 | 고쳐 씀 | 지금 절대 가치 최대 → 기본값 원칙 (D6) |
| `previewGains` | E:1085-1099 | 고쳐 씀 | 새 값으로 |
| 채집 해결 (`resolveAction`) | E:1262-1267 | 고쳐 씀 | 여기서 칸 사용을 표시한다 |

### 2.3 칸 상태와 흐름

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `createState`의 칸 필드 `id, r, c, terrain, owner, building, wall, revealed` | E:96-120 | 고쳐 씀 | 활성도 필드 초기화 |
| `startRound` | E:603- | 고쳐 씀 | 회복을 여기 또는 장 끝에 |
| `resolveRound` 끝 (`upkeep` 뒤 `recordHistory`) | E:982-983 | 고쳐 씀 | 장 끝 회복·감소를 한 번에. 다음 장의 행동 글·미리보기가 새 값을 보인다 |
| `upkeep` | E:1375-1398 | 고쳐 씀 | 활성도가 장마다 바뀌면 |
| `snapshot` (칸을 얕게 복사) | E:938-943 | 고쳐 씀 | 활성도가 객체면 깊은 복사 |
| `hydrateState` | E:1220-1252 | 고쳐 씀 | 옛 저장에 활성도 채우기 (`ruleset < 28`) |
| `serializeState` | E:1211-1219 | 그대로 | 칸을 통째로 저장한다 |
| `rand`·`d6`·흐름(`deck`·`dice`) | E:23-28 | 그대로 | 활성도는 난수 없이 결정적으로 → 주사위·golden 흐름이 어긋나지 않는다 |
| 한 칸 한 가지 (`validateOrders`·`autoFill`·`planEnemy`·`resolveRound` 막기) | E:455-473, 495, 581, 958-969 | 그대로 | |
| `faithMarks` (칸마다 쌓이는 선교 표식) | E:1319-1327 | 그대로 | 칸마다 바뀌는 값의 선례 — 활성도 필드의 본보기 |

`planEnemy`·`legalActions`·`enemyIntent`는 여러 번 불리므로 순수해야 한다. fuzz가 "보인 의도 = 실행한 계획"을 잰다 (`tools/tests/fuzz.mjs:126-131`).
활성도는 해결 단계에서만 바꾼다.

### 2.4 율법파 (모두 수확량을 보지 않는다)

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `planEnemy` | E:576-600 | 고쳐 씀 | 율법파도 활성도를 따르면 (D2) |
| `pickForRule` — 채집은 닿는 첫 칸 | E:555-573 | 고쳐 씀 | 같은 칸만 거듭 쓰게 된다. D2에 따라 덜 지친 칸 |
| 율법파 `autoFill` | E:534-548 | 고쳐 씀 | 같은 이유 |
| `enemyIntent`, `lawThreat`, `nextLawCard` | E:791-835 | 그대로 | |

### 2.5 그대로인 엔진 내보내기 (약 75개)

`SIDES` `other` `rand` `d6` `tileId` `neighbors` `distance` · `DEFAULT_CONFIG` `MODULES` `unlocked` `graceOn` · `updateVision` `capitalOf` `ownedTiles` `villageCount` · `ULT_ROUND` `quick` `ultRound` `draftRound` `hasUlt` `sizeRules` `cathedralVillages` `faithConverts` `popCap` · `reach` `prayValue` `isSabbath` `faithIncome` `followerName` · `enemyZeal` `preachBonus` `actionOdds` `tileName` `buildCost` · `validateOrders` `FLIP_MARKS` · `grantGrace` `petitionAnswered` `nameTile` `sealProphecy` `nextLawCard` `lawThreat` `chooseEvent` `enemyIntent` · `miracleCost` `castMiracle` `takeMiracle` `discoverSites` `resolveSite` · `holyTile` `holyOwner` `edictMax` `raiseEdict` `chooseDestiny` `actOf` `actStart` · `applySilence` `markLegends` `carvable` `canCarve` `carveCommandment` `findSacred` · `dilemmaByText` `dilemmaChoice` `payDilemma` `resolveDilemma` `monthOf` `nextEvent` · `SAVE_VERSION` `serializeState` `scoreBreakdown` `score` `checkVictory` `keepVows`

연결 규칙(D3)을 넣으면 `villageCount`가 고쳐 씀으로 옮겨 간다 (`lab/redesign/connection-variants.patch`에 구현이 있다).

### 2.6 맵 만들기 (`js/game/mapgen.js`)

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `generateMap` | mapgen.js:42-137 | 고쳐 씀 | 칸마다 양을 정하면. 사이트·특징처럼 따로 소금 친 난수를 써서 지금 지도를 지킨다 |
| `placeFeatures` | mapgen.js:160-179 | 새로 씀 | 특징이 새 값 틀을 따르게 |
| `placeSites`, `placeLegacy`, `holyFor`, `capitalsFor` | | 그대로 | |

## 3. 해석기

### 3.1 석판 (`js/game/interpreter.js`)

지금은 한 절마다 `rankMatches`(값·전략 순위) → `byPlace`(말과의 맞음, 안정 재정렬) → `lastLost` → `onTerrain` 순서다 (I:448-452).
말에 장소가 없으면 `byPlace`가 그대로 돌려주므로 **`rankMatches`가 혼자 칸을 정한다** (I:361). 플레이어에게 가장 잘 보이는 곳은 장소 없는 절의 둘째 손이다.

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `TABLET_RULES` (15개, 일의 종류 알아듣기) | I:160-176 | 그대로 | |
| `splitDont`, 부정·비유·절 나누기 | I:180-199, 228-233 | 그대로 | |
| 수의 말 (기본 두 손, 짚으면 한 손, "세 곳") | I:177-179, 433-437 | 그대로 | |
| `placeOf` (짚은 칸·이름·지형·방향·수도·성지·노리는 곳·가장 가까운/먼…) | I:247-340 | 그대로 | 출력이 곧 "장소 표현"이다 — 의도 형식(§10)의 원형 |
| `placeOf`의 "노리는 곳" 풀이 (다툴 수 있는 칸 먼저, `aimBonus`) | I:306-319 | 고쳐 씀 | 전략 판단 부분을 떼어 낸다 |
| `aimFor` | I:344-351 | 고쳐 씀 | 같은 이유 |
| `aligned`·`hexXY` (방향 기하) | I:353-358 | 그대로 | |
| **`byPlace`** (방향 +3, 짚은 칸 4·이웃 2, 정확 +2, 피함 −10, 가까운/먼, 지형 +1) | I:360-379 | 고쳐 씀 | **배치 점수의 뼈대**. 안정 재정렬이 아니라 주된 점수로, 장소 없을 때 빈손으로 돌아가지 않게 |
| `rankMatches` R1 "차지" (마을 → 채집 → 공격) | I:207 | 고쳐 씀 | "어디"가 아니라 "무엇"을 정한다 — 의도 층으로 |
| `rankMatches` R2 공격·선교: 수도 나중, 우리 땅에서 가까운 순 | I:210-215 | 새로 씀 | 전략 판단 → 기본값(D5)으로 |
| `rankMatches` R3 "약한/성벽 없는": 이길 확률 순 | I:216-220 | 새로 씀 | 말로 짚은 것이니 맞음 속성("성벽 없음·수도 아님")으로 바꾼다 |
| `rankMatches` R4 채집: 모자란 자원 → **절대 가치 큰 순** | I:221-225 | 새로 씀 | 활성도가 들어오면 덜 지친 칸을 자동으로 골라 결정을 빼앗는다 |
| `lostTiles`·`lastLost` (율법파가 먼저 차지할 칸은 뒤로) | I:394-400 | 고쳐 씀 | 엔진의 배치 점수로 옮긴다 |
| `onTerrain` (지형을 말하면 그 지형만) | I:447 | 그대로 | |
| 손 나누기·비키기 (`free`, 짚은 칸 비키기, 금지된 칸 옮기기) | I:466-507 | 그대로 | 대안은 순위 목록의 다음 것이므로 점수가 바뀌면 따라 바뀐다 |
| 행동 수 한도·까닭 알림 (`heard`, `far:`) | I:497-521 | 그대로 | `far:`는 "맞음 실패" 신호로 확인 화면에 쓸 만하다 |
| `cannotWhy`, `cleanSpeech`, `voiceOf`, 교리 말투 | I:65-100, 382-390 | 그대로 | |
| `linkWords` | I:542-561 | 그대로 | 배치 까닭 설명으로 넓힐 수 있다 |
| `extractLesson` | I:566-574 | 고쳐 씀 | 장소 말(`kw.place.*`)을 배우지 않게 — 지금은 "성지에 마을을"이 '성지'=마을로 배운다 |
| `setPlanSig` (종류만) | I:577-578 | 재검토 | §7 되풀이 |

### 3.2 LLM (`interpreter.js`, `js/llm.js`)

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `js/llm.js` (Prompt API 래퍼) | 전체 | 그대로 | |
| `buildPrompt`의 상황 블록 | I:31-49 | 그대로 | |
| `buildPrompt`의 행동 목록 — **LLM이 칸에 묶인 행동 ID(A1…)를 직접 고른다** | I:18-30, 50-61 | 새로 씀 (D7) | 의도 + 장소 표현을 내게 하고 엔진이 고른다. D7을 미루면 고쳐 씀 (활성도를 글에 보이기) |
| `interpretWithLLM` (ID → 행동 그대로) | I:128-155 | 고쳐 씀 | 엔진 배치 점수를 거치게 |
| `interp.systemPrompt` — "건설은 자원이 되는 만큼만", "모호하면 상황에서 뜻을 찾는다" | ko/interp.js:25-46 | 고쳐 씀 | 값·전략 판단 지시를 덜어 낸다 |
| `interp.prompt` | ko/interp.js:62-77 | 고쳐 씀 | |

LLM이 지금 보지 못하는 것: 이길 확률, 거리, 수도의 위치, 성지(`tileName`이 표시하지 않는다), 율법파의 건설·채집·성벽 의도(위협 줄은 공격·선교만).
그래서 "성지에", "노리는 곳에 마을을"을 LLM은 대개 풀지 못한다 — 의도 형식으로 바꾸면 석판의 `placeOf`가 이것을 대신 푼다.

### 3.3 실험실

| 요소 | 분류 | |
|---|---|---|
| `lab/interpret.html`, `lab/scenario.js` | 그대로 | 프롬프트 실험. 자체 `buildUserPrompt`·`autoFill` 사본을 가진다 |
| `lab/decide/`, `lab/decide.html` | 그대로 | 결정형 모델 시험대 ([DECISION-MODELS](../DECISION-MODELS-2026-10-03.md)). 6단계에서 작은 모델 비교에 다시 쓴다 |

### 3.4 칸을 고르는 여섯 곳 → 배치 점수 하나로

| 곳 | 위치 | 지금 쓰는 신호 | 재설계 |
|---|---|---|---|
| 석판 순위 | I:204-226, 360-400 | 말 + 절대 가치 + 전략 | 배치 점수 |
| LLM | I:18-63 | 모델이 직접 | 배치 점수 (D7) |
| ⇄ 칸 옮기기 | M:1664-1684 | 순서 없음 (`legalActions` 순서) | 배치 점수 순으로 보이거나 없앰 (D4) |
| 자동 채우기 | E:492-549 | 절대 가치 최대, 교리 손은 첫 칸 | 기본값 원칙 (D6) |
| 율법파 | E:555-573 | 닿는 첫 칸·가까운 칸 | D2 |
| 번개 표적 `spokenMiracle`, 이름 붙이기 `nameTile` | M:613-622, E:719-732 | 가장 가까운 칸 | 그대로 두거나 배치 점수 |

## 4. 화면

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `renderBoard` | board.js:89-149 | 고쳐 씀 | 칸 표식. 빈자리: 왼쪽 아래 (−0.46R, +0.36R) — 의도 배지(board.js:140)의 거울. 본보기는 `cath-pip`(127) |
| 메인 화면 미니맵 (같은 `renderBoard`) | style.css:668 | 고쳐 씀 | 표식을 숨길지 |
| 아트 심볼 (자원 아이콘 i-food 등 이미 있음) | art.js:167-174 | 그대로 | 활성도 심볼을 새로 그리면 고쳐 씀 |
| `game/style.css` | 87-121, 743-751, 957-958, 1012-1016 | 고쳐 씀 (더하기만) | 표식 CSS, 연출 줄임 목록(422-425), 색맹 모드는 모양으로도 구분 |
| 툴팁 `tileTipHTML` — 지금 정적 `yieldOf` 양만 보인다 | M:414-428 | 고쳐 씀 | "자원 × 양 × 단계"와 다음 장 변화 |
| `renderBoardView` (힌트·선택 가능 칸·aria-label) | M:1806-1827 | 고쳐 씀 | 표식 데이터 전달 |
| 확인 화면 칩 (번호·연결 낱말·"+2 식량"·확률·⇄) | M:2060-2119 | 고쳐 씀 | 칩마다 배치 까닭(`.why`)과 칸의 값 |
| ⇄ `moveChoices`·`moveChip` | M:1664-1684, 2239-2250 | 고쳐 씀 (D4) | 대안을 점수 순으로 보이거나, 비용을 붙이거나, 없앤다 |
| 채집 떠오르는 글 "+N 식량" | M:1465-1495 | 그대로 | 활성도 내려가는 연출은 여기에 더한다 |
| 말하는 동안의 힌트 칸 (`scheduleHints`)·알아들은 말 | M:2373-2417 | 그대로 | 석판 결과를 따르므로 저절로 바뀐다 |
| 플레이어 판(자원·수입) `matHTML` | M:1952-2010 | 그대로 | |
| 규칙 창 `showRules` | M:1160-1178 | 고쳐 씀 | "땅의 값" 절 |
| `tutorial.js` (대사 틀) | 8-55 | 그대로 | 표식 설명이 필요하면 단계 하나 더 |
| `fx.js`, `sound.js`, `chronicle.js`, `meta.js`, `lore.js`, `i18n.js` | | 그대로 | `meta.js`의 `bestKey`는 RULESET을 따라간다 |

티켓 [074](../tickets/074.md)는 칸 위 수확량 숫자를 "미리보기와 겹친다"는 이유로 폐기했다. 칸마다 값이 달라지면 그 이유가 사라진다.

## 5. 언어팩 (`js/game/i18n/ko/`)

| 요소 | 위치 | 분류 | 무엇이 바뀌나 |
|---|---|---|---|
| `kw.place.*`, `kw.tablet.*` 정규식 전부 | interp.js:106-238 | 그대로 | |
| 새 장소 어휘 — "쉬던 땅", "묵은 땅", "기름진 곳", "지친 땅" | interp.js | 새로 씀 | 지금은 수확·질을 말하는 장소 말이 없다. 절대 가치를 말로 짚게 한다 |
| 지형·자원·특징 이름 | data.js:7-16, 233-234 | 그대로 | |
| 가뭄·풍년·풍요 특전 글 | data.js:81, 93, 96 | 고쳐 씀 | |
| `eng.act.gather` "…에서 {verb} ({res} +{n})" | engine.js:35 | 고쳐 씀 | LLM이 보는 글 |
| 툴팁 `ui.tip.*` (`gather`, `barren`, `village`) | ui.js:84-99 | 새로 씀 | |
| 칩·미리보기·⇄ 글 (`ui.preview.*`, `ui.notice.pickMove`, `ui.move.tip`) | ui.js:9-11, 518-542 | 고쳐 씀 | 까닭·값 키를 더한다 |
| 규칙 창 `ui.rules.core1/core2/flow2/flow4` | ui.js:272-282 | 고쳐 씀 | |
| 튜토리얼 `tut.speak1.1/1.2`, `tut.confirm1.*`, `tut.end5.5` | story.js:95-124 | 고쳐 씀 | |
| 튜토리얼 `tut.confirm3.*` (⇄와 장소 말 설명) | story.js:112-113 | 새로 씀 (D4에 따라) | |
| 튜토리얼 제안 "들판이 너희를 먹이리라" | story.js:99 | 고쳐 씀 | 석판이 고르는 칸에 기댄다. golden 대본도 이 글을 쓴다 |
| `tools/i18n-check.mjs` | | 그대로 | 코드 안의 한글과 빠진 키만 본다 |

## 6. 도구·시험

| 요소 | 분류 | 무엇이 바뀌나 |
|---|---|---|
| `det.mjs`, `edge.mjs`, `par.mjs`, `bench.mjs`·`bench-worker.mjs` 틀 | 그대로 | |
| `tablet-cases.mjs` (1372개, **일의 종류만** 단언) | 그대로 | 칸을 바꿔도 거의 깨지지 않는다. 칸까지 단언하는 배치 사례를 따로 더한다 (§10) |
| `lib.mjs` (main.js `derivePending`의 사본) | 고쳐 씀 | 확인 화면 흐름이 바뀌면 같이 |
| `sim.mjs` 정책들 (`smart`, `planner`, `warplan`, `rotm:*`, `fix:*`…) — **모두 글만 고르고 칸은 해석기에 맡긴다** | 그대로 | 활성도를 아는 대본·모르는 대본을 새로 더한다 |
| `sim.mjs` `evalState`의 `-2*braceAhead` | 재검토 | 읽힘을 걷어내면 함께 |
| `fuzz.mjs` | 고쳐 씀 | 활성도 범위 불변식을 `FLIP_MARKS`처럼 더한다 |
| `golden.mjs` — `digest()`(268-298)·`initialMap()`(312-323)에 칸의 값이 없다 | 고쳐 씀 | 활성도를 기록에 더한다 |
| `export-data.mjs`, `export-svg.mjs` | 그대로 | data.js의 새 표를 저절로 내보낸다 |
| `tools/tests/README.md` | 고쳐 씀 | 수확량·배치 서술과 정책 표. 옛 벤치 수치는 기록으로 둔다 |

## 7. 땜질 규칙 (재검토)

새 깊이를 넣은 뒤, 하나씩 빼며 그 공략이 살아나는지 잰다. 위에서부터 활성도와 가장 가까운 순서다.

| 규칙 | 위치 | 막는 공략 | 활성도·연결과의 관계 |
|---|---|---|---|
| **읽힘 — 되풀이** (`setPlanSig`, `isEcho`, `economyOnly`, `revelationCostFor`, `recordRevelation`의 되풀이 갈래) | E:808-823, 1511-1516 | 같은 계시 돌리기 | 활성도가 같은 땅 되풀이를 벌한다. 단 지금 되풀이는 살림(채집·기도)을 예외로 둔다 — 겹치지 않는 부분부터 본다 |
| 읽힘 — 칼이나 말씀 세 장 (`readUs`, `braceLaw`, `streakAfter`, `lawGuardOf`, `wouldRead`, `braceAhead`) | E:273, 991-1008, 1506 | 공격·선교 돌리기 | 연결에서 끊는 공격이 세지므로 오히려 필요할 수 있다. 하나로 합치기는 이미 실패했다 (EVALUATION:738) |
| 저울 (`actionLimit`의 +1, `recordHistory`의 선공) | E:232-238, 1028-1036 | 대차 | 대차가 줄면 가볍게 |
| 성벽 패배 −2, 원정대 퇴각 | E:1351-1358 | 성벽 친 곳 들이받기 | |
| 원정 (`crusadeSurvival` 등) | E:419, 584, 663, 1337, 1491 | 대성당 서두르기 | |
| `marchRange` (막마다 멀리) | E:216 | | |
| 남은 자 (`remnant`) | E:1463-1473 | 전멸 | |

## 8. 이미 죽은 코드

| 요소 | 위치 | |
|---|---|---|
| `OPPOSED` | D:139 (E:7에서 들여오지만 쓰지 않는다) | 지울 수 있다 |
| `PRIEST_LABOR`의 충직 아닌 항목 | E:485-491 | `hydrateState`가 대사제를 늘 충직으로 둔다 |
| `PRIESTS[…].prompt` | D:87-93, ko/data.js:61-70 | 같은 이유 |

## 9. 문서와 생성물

| 문서 | 새로 씀 | 고쳐 씀 |
|---|---|---|
| `docs/RULEBOOK.md` | §2 지형 줄(38), §4 채집 줄(68) | §3(56, 58), §4 "곳을 가리키는 말"(85-99), 한 쪽 규칙 |
| `docs/spec/01-overview.md` | | 용어집(52-110)에 절대 가치·상대 가치·배치 점수 |
| `docs/spec/02-rules.md` | §1.3 지형과 채집, §3.5 autoFill, §3.8 채집 | §1.4 칸 필드, §1.7, §3.10, §5.2, §7.1, §17, §19. §18 검증 예는 다시 생성 |
| `docs/spec/03-data.md` | TERRAIN·FEATURES(70-96) | 상수 |
| `docs/spec/04-architecture.md` | | §2.4 Tile, §2.7 스냅숏, §2.8 저장, §4.5 |
| `docs/spec/05-interpreter.md` | §1.5 autoFill, §3.2 `rankMatches`, §6.2 GDScript `rank_matches` | §1.4, §1.6 확인 화면, §2.3 프롬프트, `byPlace` |
| `docs/spec/06-ui-ux.md` | | §2.3 확인, §3.3 칸 층, §3.10 툴팁, §3.12 미니맵, §5.3·§5.6 연출, §8.5 색맹, §9 튜토리얼 |
| `docs/spec/07-progression.md` | | §17.1 RULESET, §17.2 SAVE_VERSION. 나머지 그대로 |
| `docs/godot/PORTING.md`, `KNOWN-ISSUES.md` | | "엔진 밖 규칙"의 ⇄, golden 항목, 화면 · A6, B12, C5, C10 |

생성물은 다시 생성한다: `docs/export/data.json`·`i18n-ko.json`(`export-data.mjs`), `golden/*.json` 11판(`golden.mjs`), `svg/`(아트 심볼을 바꿀 때만, `export-svg.mjs`).

main 작업 트리에는 `34f4cbd`에 맞춘 문서 동기화가 커밋 안 된 채 멈춰 있다 (HANDOFF §1).
spec 03·07과 export README의 RULESET이 26으로 남은 것도 그 동기화가 고칠 몫이다. 재설계 문서 작업은 그 정리 뒤에 한다.

## 10. 새로 써야 하는 것 (지금 없는 것)

| # | 무엇 | 어디에 붙나 | 기대는 것 |
|---|---|---|---|
| N1 | **칸 활성도 필드와 바뀌는 규칙** — 쓰면 지치고 쉬면 회복 | 칸 필드(`createState`), 채집 해결(E:1262), 장 끝(E:982) | D1·D2 |
| N2 | **절대 가치 함수** — 지형·특징 × 활성도 + 사건 보정 | `yieldOf`·`gatherAmount` 자리 | N1 |
| N3 | **배치 점수 함수** (엔진 한곳) — 말과의 맞음 + 기본값 + 구조 제약 | 엔진. 석판·LLM·⇄·자동 채우기가 함께 쓴다 | `byPlace` 항목, D5 |
| N4 | **의도 형식** — 해석기 → 엔진 계약: 일의 종류·자원/건물·수·장소 표현·긍정/금지 | 석판 `placeOf`의 출력이 원형. LLM 스키마. 6단계 작은 모델의 출력 | D7 |
| N5 | 새 장소 어휘 (쉬던/묵은/기름진/지친 땅) | `kw.place.*`와 `placeOf` | N1 |
| N6 | 칸 표식, 툴팁의 값 줄, 확인 칩의 배치 까닭, 활성도 연출 | board.js, main.js, style.css, ui.js | N1·N3 |
| N7 | 봇과 측정 — 활성도를 아는/모르는 대본, 자리 신탁, 칸 무작위 손실, (a)~(e) 측정 | `sim.mjs`, `lab/redesign/mini.mjs`를 `tools/tests/`로 정식화 | N1 |
| N8 | 배치 시험 — 칸까지 단언하는 석판 사례, fuzz 활성도 불변식 | `tools/tests/` | N3 |
| N9 | 옛 저장 옮기기 — `ruleset < 28`이면 활성도를 채운다 (SAVE_VERSION은 올리지 않는다) | `hydrateState` | N1 |
| N10 | 규칙서·spec의 새 절, 용어집 | `docs/` | 전부 |
| N11 | **땅의 운 덱** — 카드 데이터, 장마다 뽑기, 점대칭 두 칸에 놓기, 다음 장 예고 화면 | data.js, `startRound`, 사건 예고 옆 화면 | README §5.2 |

## 11. 다시 쓸 실험 자산

| 자산 | 위치 | 쓰임 |
|---|---|---|
| 연결 규칙 · `cdef` · 자리 신탁 · 칸 무작위 변형 | [`lab/redesign/connection-variants.patch`](../../lab/redesign/connection-variants.patch) | 1단계 실험의 출발점 |
| 작은 벤치, 패치 스크립트, 연결 실험 원자료, 평가자 프롬프트 | [`lab/redesign/`](../../lab/redesign/README.md) | 1단계·5단계 |
| 결정형 모델 시험대 | `lab/decide/` | 6단계 |
| HANDOFF의 함정 목록 (한글 음절 정규식, 역슬래시, except 범위, 주석이 코드를 삼킴…) | [HANDOFF §7](../HANDOFF-2026-10-03.md) | 모든 단계 |

## 12. 재설계와 무관하게 찾은 문제

| 문제 | 위치 | |
|---|---|---|
| 옛 저장의 기본값 세 개(`names`, `lessons`, `prophecy`)가 주석 안에 들어가 실행되지 않는다. 이 필드가 없는 저장을 불러오면 M:748(`state.lessons.push`)·M:616(`Object.entries(state.names)`)에서 멈출 수 있다 | E:1232 | 따로 고칠 작업으로 띄워 두었다 |
| 석판 사례 수가 README에는 1368, 실제는 1372 | `tools/tests/README.md` | 문서 동기화 때 |
