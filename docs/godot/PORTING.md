# Godot 4 이식 가이드

웹판(JS, `js/game/`)을 Godot 4로 옮기기 위한 계획서다. 규칙과 화면의 세부는 [`docs/spec/`](../spec/01-overview.md)에 있고, 이 문서는 **어떻게 옮기고 어떻게 같다는 것을 증명할지**를 다룬다.

> 이식 중 결정할 것(현재 웹판의 버그·이상 동작 모음)은 [KNOWN-ISSUES.md](KNOWN-ISSUES.md). 원칙은 "먼저 똑같이 재현하고, 그다음 JS와 함께 고친다".
> 기준: 커밋 `448f553` (2026-09-30), 명세 검토 수정 `e68a240`, 3차 균형 `9b43bbf`, 석판의 곳·수의 말 `78c891e`, 4차 `87a0fce`·튜토리얼 `2825b37`·판 크기 표 `7a28084`·접근성 `4e2e0f7`, 5차 `435c3cc`·모듈 단계 해금 `8ba0ef8`·석판 조준 `bcdeb22`·저울 `3a790f5`, 6차 `0c95856`·`b470e03`·`0a0a974`, 7차 `df1cb16`·`16492f4`·`c12a1e9`까지 반영. 처음 쓴 뒤 규칙이 크게 바뀌었다(`afab303` 재조정, `5b7a94f` 수도 막기, `448f553` 남은 자, `e68a240` 막기 대칭·헤아린 성벽 예산·"~지 말고" 전부 금지·`RULESET` 5, `9b43bbf` 심판의 날 한 번·신앙 승리 개종 조건·큰 판 보정·일 메아리, `78c891e` 곳을 가리키는 말·수의 말·한 칸에 한 가지·칩 옮기기, `87a0fce` 승점이 뒤진 쪽이 선공·결집 12/6점과 장마다 신도 +1·같은 기적 재사용 +1·두 장 전 메아리·석판의 `~고` 절 나누기와 새 곳의 말·`RULESET` 6, `2825b37` 튜토리얼은 늘 우리가 선·청원 벌 없음, `7a28084` 판 크기 표 `MAP_SIZES`·7×7 대성당 ×1.5, `435c3cc` 신도 수 우위 삭제·수도 내구도 2·`RULESET` 7·튜토리얼 청원 벌 조건을 골든 구동기에도, `8ba0ef8` 모듈이 끝낸 판마다 한 묶음씩(`config.unlock`), `bcdeb22` 석판의 `~되` 절 나누기·금지 넘김 조건·칸 이름 우선·가까운·율법파 마을 곁·짓는 말의 수도, 말한 번개의 수도 조준, `3a790f5` 따라잡기를 "저울" 하나로 보여 줌, `0c95856` 대성당 공사 중 율법파 선공·계시 비용은 길이와 무관하게 1(30자 가산·인용 할인 삭제)·「새 맵」의 해금 단계·최고 기록 키의 해금 단계·옛 저장본의 수도 내구도 자르기·`RULESET` 8, `b470e03` 석판이 공격·선교를 승률 순으로 조준·짚은 칸에서 못 한 일 `far:`·"A가 아니라 B"·"차지하라"·비유 절·"수도"의 적/우리 가르기를 공격·선교 말로, `0a0a974` 대사제 성향이 헤아린 노동을 정함(`PRIEST_LABOR`)·어려움도 율법파의 건설을 보임·튜토리얼 새 대사, `df1cb16` 되풀이 규칙 하나 — 받아들인 일이 지난 두 계시와 같으면 율법파가 선교·공격에 대비·결집의 신도 +1 삭제·`RULESET` 9, `16492f4` 보통은 율법파의 뜻을 기도만 빼고 보임·확인 칩 승률과 석판의 공격 순위가 예고된 성벽을 셈·석판의 "X 대신"·피할 칸·짚은 칸 비키기·금지된 칸 옮기기·닿지 않는 수도·성지 알림·곳이 된 지형과 특징·재료·탑·"율법파를 건드리지 마"·금지만 알아들은 해석문·인용 삭제, `c12a1e9` 율법 석판은 성지·율법파 신전·번개·심판의 날(과 미라)로만·10칸·`bloodKills` 삭제·`RULESET` 10, `55d33dd` 대성당 원정의 공격 +1 삭제·율법파의 대비는 비용의 "되풀이"와 같은 판정으로 다음 장 시작에(`braceLaw`)·`lawGuard`는 수 하나·`state.ruleset`과 옛 저장본의 석판 자르기·헤아린 노동도 예고된 성벽을 셈·석판의 닿지 않는 곳 코드 `far:capital.enemy`(`FAR_NAME`)·"D2 대신"은 피할 칸; `RULESET`은 10 그대로, 8차 `846fd60` 포위 삭제·성인은 이름·업적만·청원 외면 벌 삭제·안개 속 율법파 마을 기록·장이 열릴 때 대비 연출·지도자 반박 돌림·석판 어휘(한정의 부정, 구어, 필요의 말)·방향 코사인·한 절에서 같은 자원 두 번 없음·`RULESET` 11, 9차 `88878b6` 연속 작은 기적 삭제·같은 교리 세 장이면 율법파가 우리를 읽음(`readUs`, `braceAhead`)·전쟁 교리 4칸은 성벽 돌 1·대비 기록은 우리 수도 칸·석판 "노리는 곳"(칸을 차지하는 뜻, `aimBonus`, `far:aim`)·방향 (코사인+1)/2·`RULESET` 12, `d6167fc` 캐시 번호, `1cc1887` 율법 알약 "우리를 읽음", `d3fe641` 확인 화면의 읽힘 예고 `wouldRead`, 10차 `95eca5f` 석판의 금지로 끝나는 절·곳을 짚은 금지·"평원에서"·"가장 먼 곳"·이교도도 율법파, 전쟁의 헤아린 손은 성벽부터, 11차 `8250dd7` 은총 하나(말투는 수치 없음·이룬 예언은 은총·빗나가도 벌 없음·첫 이름의 지혜 +1과 비유의 교리 +1 삭제)·석판의 절 하나는 손 둘(`kw.count1`, 덤 손 `nth`)·플레이어의 남는 손은 모자란 것만·`RULESET` 13), `1fbb160` "가장 먼 곳"이 짚은 칸을 고르지 않음·읽힘 예고 +{n}, 12차 `d7ad6e0` 석판의 가까운 과녁(`kw.place.weakest`가 있을 때만 승률 순)·짓는 일 한 손·`placeOf`의 `spec`/`generic`/`refs`/`closeRef`, 대성당이 무너지지 않음·단계마다 마을 하나·3/3/3·`RULESET` 14, 13차 `e174a18` 살림뿐인 계시는 메아리가 아님(`economyOnly`)·전쟁·평화만 읽음(`READ_DOCTRINES`)·석판의 `lostTiles`/`lastLost`·`kw.rather`·금지어 `지 마`의 어미·짚은 칸 수만큼 짓기·`RULESET` 15, `3f33be1` 대성당은 한 번 짓고 원정을 버팀(`CATHEDRAL` 객체·`crusadeEnd`)·섞인 전쟁·평화도 읽음(`streakAfter`)·성지 자리 `holyFor`(`mapgen.js`)·석판의 `kw.aside`·`kw.plentyAnd`·`kw.place.aimWall`·짚은 금지·`takes`·`RULESET` 16, `637c05a` 칼·말씀을 읽음(`swordOrWord`)·결집 8·4점과 신도 수에 묶이지 않는 손·원정 `crusading`·성지 보호 `isHoly`·첫 판 쉬움·석판의 `kw.onlyThis`·`RULESET` 17, `24927a6` 계절 효과(풍년·가뭄 ±2·평온 선교 +1·기도한 장의 역병 — `prayedAt`)·석판의 같은 일 둘까지·`RULESET` 18, `76c0053` 마을은 선교 세 번에(`FLIP_MARKS`)·선교 성공의 `popCap`·같은 종류 넷째 명령 거절(`eng.reject.many`)·헤아린 손의 같은 일 둘까지·열혈은 전쟁·평화에서만·율법파 `autoFill`은 원정 제외·석판의 `onTerrain`·`kw.place.unwalled`·확인 화면의 쉬는 신도 칩·`RULESET` 19, `238120e` 마지막 한 명은 설득되지 않음(합법 행동·해결 둘 다)·`joined`·`FLIP_MARKS` 내보냄·`swordOrWord`는 전쟁 교리나 공격·선교·헤아린 손 빼기(`pending.noHeed`)·석판의 `kw.place.foeward`·`RULESET` 20, `1c81cd4` 저울 하나(`trailing`·`SCALE_GAP` — 6점 이상 뒤진 쪽 행동 +1, 신의 분노·심판의 날·결집의 공격 먼저를 대신함; 분노 코드는 남았지만 닿지 않아 옮기지 않는다)·대성당 4·4·4·평화 궁극 `enemy.pop > 1`·`preach:last`·계명 갈래의 `noHeed`·「새 맵」의 `firstEasy`·`RULESET` 21, `39500e9` 석판의 `kw.neitherNor`·곁말·넉넉함·`pinned`·`aimWall` 마을, `b1ff73e` 분노·심판의 날 코드 삭제(`wrath`·`doomUsed`·`DOOM`·`doomReady`·`wrathRound`·`at.wrath` — 불러올 때 두 필드를 지움)·우리 쪽 저울 연출 `scale`·"노리는 곳"은 한 칸·석판의 `kw.leaveAnd`·`kw.idList`·서수, `db4135b` 다음 장 율법 카드 미리 보기 `nextLawCard`·`lawThreat` 내보냄·벤치 구동기의 `keepVows`) — 명세 02·05·07과 골든은 모두 새 동작 기준이다.

## 원칙

1. **엔진부터, 화면은 나중에.** 규칙 엔진(`engine.js`)은 DOM을 모르는 순수 함수 모음이다. 먼저 GDScript로 옮기고 골든 테스트로 JS와 같은 결과를 내는지 확인한 뒤 화면을 만든다.
2. **결정론을 비트 단위로 맞춘다.** 같은 시드 → 같은 맵·같은 덱·같은 주사위. 난수·해시·정렬·반올림을 JS와 똑같이 한다 (아래 [결정론](#결정론-비트-단위로-맞추기)).
3. **데이터는 JSON으로 가져온다.** 표와 한국어 문구는 [`docs/export/`](../export/README.md)에서 JSON으로 뽑아 두었다. 손으로 옮겨 적지 않는다.
4. **화면은 Godot답게 새로 짠다.** HTML/CSS를 흉내 내지 말고 Control·Container·Theme로 같은 정보 구조와 느낌을 만든다 ([06 UI/UX](../spec/06-ui-ux.md)).

## 권장 환경

- Godot **4.3 이상**, GDScript(정적 타입 표기 권장). 엔진 코어만 C#으로 옮겨도 되지만 아래 예시는 GDScript다.
- 테스트: 헤드리스 실행 `godot --headless -s res://tests/run_golden.gd` (GUT 같은 애드온을 써도 된다).

## 프로젝트 구조 제안

```
res://
  core/                      # Node를 쓰지 않는 순수 로직 (RefCounted / static)
    rng.gd                   # mulberry32 스트림, d6, shuffle      ← engine.js rand/d6/shuffle, mapgen.js mulberry32
    hash.gd                  # FNV-1a, hash_pick                   ← lore.js hashPick, meta.js hash
    stable_sort.gd           # 안정 정렬 (JS Array.sort와 같은 결과)
    hex.gd                   # 좌표·이웃·거리 (홀수 행 오른쪽 밀림)
    mapgen.gd                ← mapgen.js
    data.gd                  # data.json 로더 + 상수 (RULES, COST …)  ← data.js
    engine.gd                # 규칙 엔진                              ← engine.js
    lore.gd                  # 명사 추출, 말투, 이름, 예언, 대사       ← lore.js
    interpreter/
      tablet.gd              # 석판(키워드) 해석기                    ← interpreter.js interpretWithTablet
      llm_client.gd          # LLM 해석기 (선택)                      ← interpreter.js interpretWithLLM, js/llm.js
    chronicle.gd             # 판 요약·에필로그·업적                  ← chronicle.js
  autoload/
    I18n.gd                  # t(key, vars) ← i18n.js + i18n-ko.json
    Meta.gd                  # 저장·진행 (user://) ← meta.js
    Settings.gd, Sfx.gd, Music.gd  ← sound.js
    Game.gd                  # 한 판의 컨트롤러·단계 기계 ← main.js의 상태/흐름 부분
  ui/                        # 화면 (Control 씬)
    main_menu.tscn, table.tscn(topbar, tribe_mat, side_col, altar), end_screen.tscn,
    modals/*.tscn, tutorial_overlay.tscn, tooltip.tscn
  board/
    hex_board.tscn (Node2D), tile.gd, meeple.tscn, board_fx.gd  ← board.js, fx.js
  art/svg/*.svg              # docs/export/svg 에서 복사 (47개 심볼)
  data/data.json, data/i18n-ko.json   # docs/export 에서 복사
  tests/run_golden.gd, tests/golden/*.json
```

### JS 모듈 → Godot 대응

| JS | 줄 수 | Godot | 비고 |
|---|---|---|---|
| `engine.js` | 1522 | `core/engine.gd` | 순수 함수. 헤아린 노동의 손 수·먼저 고르는 일·승률 문턱은 대사제 성향 표 `PRIEST_LABOR`(`autoFill` 안, `data.json`에 없다 — `0a0a974`, [02 §3.5](../spec/02-rules.md#35-기본-노동-autofill)). 결집한 율법파의 행동 수는 `637c05a`부터 신도 수에 묶이지 않는다(`actionLimit`). 계절 효과는 `gatherAmount`(풍년·가뭄 ±2)·`preachBonus`(평온 +1, 플레이어만)·`upkeep`(역병 — 그 장에 기도했으면 우리는 면함, 새 상태 `prayedAt`을 `resolveAction`의 기도가 적는다)에 흩어져 있다(`24927a6`). 선공은 대성당이 서 있으면 율법파(`0c95856`; `3f33be1`부터 대성당은 한 번 짓고 다음 장 원정의 끝에 수도가 서 있으면 `checkVictory`가 승리를 낸다 — 계획에 같은 수도 공격이 세 번 들어간다). 상태는 `Dictionary` 하나로 두면 골든 JSON과 바로 비교된다. 메아리의 일 목록은 석판에서 받는다(`setPlanSig` — 아래 표). 판 크기별 수는 모두 `sizeRules(state)`로 `MAP_SIZES` 한 줄을 읽는다(`7a28084`). 모듈은 `veteran`이 아니라 `unlocked(state, level)`(`config.unlock ?? (veteran ? 4 : 0)`, `8ba0ef8`)로 켠다 — 침묵 벌만 여전히 `veteran`을 본다([02 §16.2](../spec/02-rules.md#162-모듈-해금-configunlock과-두-번째-판부터-configveteran)) |
| `data.js` | 391 | `data/data.json` + `core/data.gd` | 함수 값(`$fn`)은 GDScript로 다시 쓴다 ([03 데이터](../spec/03-data.md)) — `0c95856`에서 `revelationCost`를 지워 `COST.temple`·`DESTINIES.*.test`만 남았다. `MAP_SIZES`는 판 크기 표 전부(장·대성당 비용·마을·율법파 행동·신앙 승리·궁극/드래프트 장 — 분노 장은 `b1ff73e`에서 지웠다) |
| `mapgen.js` | 202 | `core/mapgen.gd` | 골든의 초기 맵으로 검증. `637c05a`부터 자원 보장·다시 상한이 성지 칸과 그 대칭 칸(`isHoly`)을, `placeFeatures`가 두 칸을 피한다. 성지 자리 `holyFor`(`3f33be1`)는 `seed ^ 0x6c0a5e11`의 새 `mulberry32` 첫 값으로 후보를 고르고, `generateMap`·`placeSites`·`placeLegacy`·`createState`가 각자 부른다 |
| `interpreter.js`, `lore.js` | 555+107 | `core/interpreter/*`, `core/lore.gd` | 정규식은 `kw.*` 문자열을 `RegEx`로 ([05 해석기](../spec/05-interpreter.md)). 석판 사전은 갈래마다 고정 길이인 뒤보기·앞보기를 쓴다. 곳을 가리키는 말(`placeOf`·`byPlace` — `87a0fce`의 지형 곁·신전 옆·방향·마을, `bcdeb22`의 칸 이름 전부(`exact` +2, 그 수만큼 명령)·가까운(`(20 − 거리)/100`, 실수 점수)·율법파 마을·오아시스 포함, 누구의 것인지 말하지 않은 수도는 `b470e03`부터 공격·선교 말 유무로, `16492f4`부터 금하는 말도; `16492f4`의 채석장·곳이 된 오아시스·피할 칸(`avoid` −10)·닿지 않는 수도·성지의 이름 `named`)과 절 나누기(`~되/~고/~며/~면서/~듯`)·비유 절 건너뛰기·"A가 아니라 B"(`kw.notBut` — 캡처 둘, `16492f4`부터 `~에서`로 끝나면 지우고 칸 이름뿐이면 그대로)·"X 대신"(`kw.instead`)·부정 넘김(`kw.negCarry`)·곳만 짚은 금지·후보 줄 세우기(`rankMatches` — 차지는 마을 먼저, 공격·선교는 엔진 `actionOdds` 순이라 승률 식이 먼저 맞아야 한다)·해결 단계(한 칸에 한 가지·짚은 칸 비키기·금지된 칸 옮기기·행동 수·`far:` 까닭·금지만 알아들은 해석문)는 05 §3.2. `8250dd7`부터 절 하나의 규칙은 손 둘(짚은 칸·붙인 이름이나 `kw.count1`이면 하나)이고, 수를 말하지 않아 늘어난 둘째 손은 pick의 `nth`로 행동 수를 자를 때 모든 첫 손 뒤로 간다 — 정렬 키 `(nth, 절, 글 속 위치, pick 순번)`을 그대로 옮긴다. 언어팩의 **객체 값** `kw.place.terrainName`·`kw.place.dir`을 `Dictionary`로 읽는다 |
| `chronicle.js` | 151 | `core/chronicle.gd` | |
| `meta.js` | 167 | `autoload/Meta.gd` | `localStorage` → `user://*.json` ([07 진행](../spec/07-progression.md)) |
| `i18n.js` + `i18n/ko/*` | ~1740 | `autoload/I18n.gd` + `i18n-ko.json` | 함수 값 처리 방법은 아래 |
| `main.js` | 2474 | `autoload/Game.gd` + `ui/*` | 단계 기계와 화면 갱신을 나눈다 ([04 구조](../spec/04-architecture.md)) |
| `board.js`, `art.js` | 192+248 | `board/*`, `art/svg/*` | SVG 심볼은 파일로 뽑아 두었다 |
| `fx.js` | 849 | `board/board_fx.gd`, `ui/*` | Tween, AnimationPlayer, 파티클. 연출 줄이기의 첫 값은 저장한 선택, 없으면 OS의 동작 줄이기(`4e2e0f7`). 웹 내보내기라면 `JavaScriptBridge.eval`로 같은 `matchMedia('(prefers-reduced-motion: reduce)')`를 읽을 수 있고, 다른 플랫폼은 읽을 길을 따로 정한다(없으면 화려하게) |
| `sound.js` | 411 | `autoload/Sfx.gd`, `Music.gd` | Web Audio 합성 → 아래 [소리](#소리) |
| `tutorial.js` | 193 | `ui/tutorial_overlay.gd` | 3장 확인 단계(`2825b37`), 4장의 되풀이 대사와 끝의 성벽·저울 대사(`0a0a974`)까지 단계 표는 [06 §9](../spec/06-ui-ux.md#9-튜토리얼-흐름-tutorialjs) |
| `js/llm.js` | 58 | `core/interpreter/llm_client.gd` | Chrome Prompt API 전용 → 대체 필요 |

### 엔진 밖(`main.js`)에 있는 규칙 — 반드시 같이 옮긴다

웹판은 몇몇 규칙을 화면 컨트롤러인 `main.js`에서 처리한다. `engine.gd`만 옮기면 빠지므로, Godot의 한 판 컨트롤러(`Game.gd`)에 넣는다. 골든 기록에서는 이 규칙이 남긴 기록 줄에 `ui: true`가 붙어 있다 ([golden README](../export/golden/README.md)).

| 규칙 | 하는 일 |
|---|---|
| `spokenMiracle` | 계시에 기적 이름이 있으면 그 기적을 먼저 내린다. 번개의 목표: 이름 붙인 율법파 칸 → (`bcdeb22`) 계시에 수도 말(`kw.place.capital`)이 있고 우리 말(`kw.place.ours`)은 없으며(`0c95856`) 율법파 수도가 드러났으면 그 수도 → 마을 우선·우리 수도에서 가까운 율법파 칸 (`main.js:607-625`) |
| 침묵 경로 | 계시 없이 넘기면 `applySilence` 흐름 (기도 먼저 + 교리 없는 기본 노동 — `8250dd7`부터 모자란 것만 채우고 나머지 손은 쉰다) |
| 기본 노동에 교리 넘기기 | `derivePending`과 계명 새긴 뒤 다시 채우기가 `autoFill(…, result.doctrine)`을 부른다(확인 화면에서 헤아린 손을 뺐으면 둘 다 `null` — `238120e`, 다시 채우기는 `1c81cd4`부터) — 대사제 성향만큼(충직 1, 문자주의 0, 몽상가 2 — `0a0a974`) 자리가 계시의 뜻을 헤아린 행동(`heeded`)이 된다 ([02 §3.5](../spec/02-rules.md#35-기본-노동-autofill)). 교리를 넘기지 않으면 골든과 달라진다. 그 뒤의 플레이어 손은 `8250dd7`부터 모자란 것만(신앙 ≤ 2면 기도, 다음 장 식량, 2 미만인 나무·돌) 채우고 쉰다 — 율법파의 기본 노동은 예전 그대로라 엔진에 갈래가 둘이다 |
| 첫 장 사제 소개 | 대사제가 `loyal`이 아닌 판의 1장 3.6초 뒤 사제 말풍선 `ui.priestIntro`("이번 판의 대사제는 {trait}.") (`main.js:500`, `0a0a974`). 규칙에는 닿지 않는다 |
| 계명 새긴 장 | 새긴 계명이 금한 행동(`noSword` 공격, `noExpand` 마을)만 빼고 `autoFill`로 다시 채운다. 금지 키에 확인 화면에서 뺀 칩도 더해 넘기므로 뺀 칩이 되살아나지 않는다 (`main.js:729-735`, `e68a240`). 헤아린 손을 뺐으면(`pending.noHeed`) 교리 대신 `null`을 넘긴다(`1c81cd4`) |
| `wordsAfter` | 청원에 답하면 은총, 이름 붙이기 은총(장당 은총 하나 — `8250dd7`부터 유지 단계의 이룬 예언이 먼저 가져갈 수 있다). 청원을 외면해도 벌이 없다(`846fd60` — 그 전에는 두 번 외면하면 신앙 -1, 튜토리얼은 `2825b37`부터 세지 않았다; 화면·골든·테스트 구동기에서 함께 지웠다). (예전의 기이한 해석 은총은 `afab303`에서 없어졌다) |
| 이름 붙이기 은총 | 은총뿐 (`8250dd7` 전에는 첫 이름이면 지혜 교리 +1도 — 옮기지 않는다) |
| LLM 타임아웃 | LLM 해석이 30초 안에 오지 않으면 같은 계시를 석판으로 (`main.js:556-562`) — 해석기를 바꿔도 대체 경로는 둔다 |
| 다시 해석 | 단추는 LLM 모드(`aiMode === 'llm'`)에서만 있다 — 석판 모드는 결정론이라 같은 결과. LLM 모드면 LLM 실패로 석판이 대신한 해석에도 있다 (`main.js:2081`, `e68a240`; 그 전에는 해석 출처가 석판이면 숨었다) |
| 비용 알약 | `costPill(text)` 하나가 계시 비용·라벨·상태(`over`·`echo`·`banned`)·툴팁을 정하고 그리기와 입력 갱신이 같이 쓴다. 라벨은 되풀이면 "신앙 N · 되풀이", 아니면 "신앙 N" (`main.js:2193-2202`, [06 §2.1](../spec/06-ui-ux.md#21-speak--계시-쓰기); `0c95856`에서 인용 상태 `cite`와 `ui.faithCostCited`를 지웠다 — 비용이 길이·인용과 무관해졌다. `16492f4`에서 인용 꼬리표·밑줄(`citedWords`)도 지웠다 — 옮기지 않는다) |
| 결집·되풀이를 읽는 율법 재생 | 로그 `fx.kind` `rally`(결집 — `1c81cd4`부터 저울의 율법파 쪽; 우리 쪽 `log.scaleUs`는 `b1ff73e`부터 제 연출 `scale` — 우리 수도에 금빛 링과 "저울 +1", 띠 "저울"; 그 전에는 `wrath` 연출 "신의 분노", [KNOWN-ISSUES D32](KNOWN-ISSUES.md))·`guard`(되풀이를 읽는 율법 — `df1cb16`부터 되풀이한 장마다, `55d33dd`부터 대비가 오르는 장의 시작에)는 율법파 수도 칸에 붉은 링 + 떠오르는 글(`ui.fx.rally`·`ui.fx.guard`), 실패음, 700ms. 행동 띠는 없다 (`main.js:1589-1593`, `e68a240` — 그 전에는 결집이 `wrath` 연출을 빌렸다). `55d33dd`부터 `guard` 줄은 `startRound`에서 남아 해결 재생에 들지 않고, `846fd60`부터 `newRound`가 장 제목 뒤(2.3초)에 따로 `playFx`로 보인다(글 "율법파가 대비한다"). `88878b6`부터 기록의 칸이 우리 수도라 늘 보인다(그 전에는 율법파 수도라 안개 속이면 `playFx`가 건너뛰었다 — [KNOWN-ISSUES D21·D22](KNOWN-ISSUES.md)). 골든의 `guard` 줄 `fx.tile`도 우리 수도다 |
| 도감 기록 | 튜토리얼에서는 도감(`gsg.seen`)에 아무것도 적지 않는다 — 카드·번개로 쓴 기적도 (`main.js:1642`, `1671`, `e68a240`) |
| 장 기록의 계시 글 | 수락 뒤 `state.history.at(-1).text = text`(`main.js:749-750` — 연대기·장 결산이 읽는다). LLM 프롬프트의 "최근 계시"는 이것이 아니라 엔진 상태 `state.revelations`의 마지막 둘이다(`interpreter.js:34`) |
| 지도자의 반박 대사 | 율법파 지도자가 지난 계시에 맞받아치는 기록 줄 |
| 되풀이 판정은 말할 때 | 인장을 누를 때(비용 지불·이름 붙이기 전) `spokenOf(state, text)` = `{ sig, echo }`를 `speakSnap.spoken`에 두고, 수락의 `recordRevelation(…, spoken)`에 그대로 넘긴다 (`main.js:524`, `738`, `9b43bbf`). 해결 뒤 다시 판정하면 석판의 읽음이 달라져 교리·기록이 골든과 어긋날 수 있다. 골든 구동기와 `lib.mjs`는 `pending.spoken`으로 같은 일을 한다 |
| 칩 옮기기 ⇄ | 확인 화면에서 받아들인 명령을 같은 종류(`type`·`build`·`gather`)의 다른 합법 행동으로 바꾼다 — 금지된 것·다른 받아들인 칩의 칸 제외, 비용 없음, `2825b37`부터 튜토리얼에서도 (`moveChoices`·`moveChip`, `main.js:1672-1684`, `78c891e`). 칩은 키보드(포커스 + Enter·Space)로도 뺀다(`4e2e0f7`, [06 §2.3](../spec/06-ui-ux.md)). `result.orders`를 바꿔 끼우고 `derivePending`을 다시 부른다. 골든 구동기는 칩을 옮기지 않는다 |
| 선공 표시 | 확인 칩의 "선공 · 막음"/"빼앗김"은 우리 칩과 율법파의 뜻이 둘 다 집 안 행동이 아닐 때만 (`firstNote`, `9b43bbf`) — 엔진 막기 규칙과 같게 |
| 수락 순서 | 율법파 계획 확정 → 말한 기적 → 갈림길 비용(`8250dd7` 전에는 말투 효과도) → 계명 새기기·예언 봉인(기준값 저장) → 해결(엔진 안에서 유지 → 장 기록·결집) → 침묵·전설·서원·`wordsAfter` → 교리 기록(말할 때 판정한 메아리면 교리 없음, `echo: true`로 남는다; 예전의 성언 갱신 `updateLiturgy`는 없어졌다). 되풀이를 읽는 율법은 `55d33dd`부터 다음 장 `startRound` 맨 앞의 `braceLaw`가 이 `echo`로 정한다(그 전에는 해결 안의 `updateLawGuard`가 받아들인 명령으로) ([02 §3.6](../spec/02-rules.md#36-확정-accept)) |
| 강제 선택 | 소명·기적 드래프트는 계시 전에 고른다 (웹판은 2.5초 뒤 모달, 이미 말했으면 건너뜀) |
| 모듈 해금 단계 | 일반 새 게임(`main.js:282`)과 `0c95856`부터 종료 화면 「새 맵」(`main.js:848`)이 `config.unlock = min(MODULES, 끝낸 판 수)`를 넣는다. 「새 맵」은 `1c81cd4`부터 첫 판의 쉬움(`setup.firstEasy`)도 풀어 기본 난이도로 연다. 오늘의 계시·시련·도전은 넣지 않아 베테랑이면 전부 켜진다. 최고 기록 키에는 `0c95856`부터 해금 단계(`-u{n}`, 4 미만일 때)가 붙는다([07 §13](../spec/07-progression.md)). 새 판 0.4초 뒤 단계가 오르면 해금 안내(`showUnlockNote`, `gsg.unlockNote` = 마지막으로 보인 단계) — [07 §16.1](../spec/07-progression.md) |
| 다음 장 율법 카드 미리 보기 | `db4135b`: 계절 칸 "다음 장"의 둘째 줄 — 말하기 단계에는 적는 중인 글을 석판으로 읽어 교리와 "공격 금지가 있는가"를 엔진 `nextLawCard(state, doctrine, vow)`에 넘기고(빈 글 = 침묵), 다른 단계에는 이번 장에 기록된 계시의 교리를 넘긴다. 규칙은 바꾸지 않지만 다음 장 시작(`startRound`)의 카드 고르기와 같은 식이어야 한다([02 §4.3](../spec/02-rules.md#43-이번-장-카드-고르기)). 알려진 어긋남: 확인 화면에서는 계시가 아직 기록되지 않아 침묵의 카드가 보이고(D34), LLM 모드에서도 석판으로 읽으며(D35), 갈림길 「쫓아낸다」의 도발을 모른다(A50) — 이식판은 같이 옮기거나 같이 고친다 |

## 결정론: 비트 단위로 맞추기

GDScript의 `int`는 64비트 부호 있는 정수라, JS의 32비트 연산(`| 0`, `>>> 0`, `Math.imul`)을 직접 흉내 내야 한다. 아래 코드는 같은 방식의 파이썬 흉내로 JS 출력과 비트 단위로 같음을 확인했다 (시드 `4242 ^ 0x5bd1e995` 첫 네 값: `0.335698114010, 0.638164782897, 0.077758353204, 0.266365614487`, `hash("2026-09-27") = 2379378891`).

```gdscript
# res://core/rng.gd
class_name Rng32

static func i32(x: int) -> int:
	x &= 0xFFFFFFFF
	return x - 0x100000000 if x >= 0x80000000 else x

static func u32(x: int) -> int:
	return x & 0xFFFFFFFF

# Math.imul: 곱을 16비트로 나눠 64비트 넘침을 피한다
static func imul(a: int, b: int) -> int:
	var ah := (a >> 16) & 0xFFFF
	var al := a & 0xFFFF
	var bh := (b >> 16) & 0xFFFF
	var bl := b & 0xFFFF
	return i32(al * bl + (((ah * bl + al * bh) << 16) & 0xFFFFFFFF))

# mulberry32 한 걸음. state는 int32 값(스트림 상태)이고, [새 상태, 0 이상 1 미만의 난수]를 돌려준다
static func step(state: int) -> Array:
	var s := i32(state + 0x6d2b79f5)
	var t := s
	t = imul(t ^ (u32(t) >> 15), t | 1)
	t ^= i32(t + imul(t ^ (u32(t) >> 7), t | 61))
	return [s, float(u32(t ^ (u32(t) >> 14))) / 4294967296.0]

# engine.js rand(state, stream): state.rng[stream]을 한 걸음 진행
static func rand(game: Dictionary, stream := "dice") -> float:
	var r := step(game.rng[stream])
	game.rng[stream] = r[0]
	return r[1]

static func d6(game: Dictionary) -> int:
	return 1 + int(floor(rand(game) * 6.0))

# 뒤에서부터 섞는 Fisher-Yates, 'deck' 스트림
static func shuffle(game: Dictionary, list: Array) -> Array:
	var a := list.duplicate()
	for i in range(a.size() - 1, 0, -1):
		var j := int(floor(rand(game, "deck") * (i + 1)))
		var tmp = a[i]; a[i] = a[j]; a[j] = tmp
	return a
```

```gdscript
# res://core/hash.gd — FNV-1a (lore.js hashPick, meta.js hash)
class_name Fnv

static func hash32(text: String) -> int:
	var h := 0x811c9dc5
	for i in text.length():
		var c := text.unicode_at(i)
		if c > 0xFFFF:                       # JS는 charCodeAt(0) = 상위 대리 문자를 쓴다
			c = 0xD800 + ((c - 0x10000) >> 10)
		h ^= c
		h = Rng32.imul(h, 0x01000193)
	return Rng32.u32(h)

# hashPick(list, ...salts): salts를 '|'로 이어 해시
static func pick(list: Array, salts: Array):
	if list.is_empty(): return null
	var parts := PackedStringArray()
	for s in salts: parts.append(js_str(s))
	return list[hash32("|".join(parts)) % list.size()]

# JS의 String(x)와 같게: 정수 값은 소수점 없이, null은 "null", true는 "true"
static func js_str(v) -> String:
	if v == null: return "null"
	if v is float and v == floor(v): return str(int(v))
	if v is bool: return "true" if v else "false"
	return str(v)
```

### 틀리기 쉬운 곳

| 항목 | JS 동작 | Godot에서 할 일 |
|---|---|---|
| 정렬 | `Array.prototype.sort`는 **안정 정렬**. 엔진은 "거리순 정렬 후 `[0]`" 같은 곳에서 동점이면 원래 순서의 첫 항목을 고른다 (`engine.js:512, 519, 554, 556, 711`, `mapgen.js:62, 69, 114`, `chronicle.js:35` — 성지 고르기의 정렬(`engine.js:113`)은 `3f33be1`에서 `holyFor`로 바뀌며 없어졌다). 석판 해석기의 후보 순위(`rankMatches`, `interpreter.js:204-226` — 채집은 수확량, `b470e03`부터 차지는 마을 먼저, 공격·선교는 `d7ad6e0`부터 우리 땅까지의 거리 오름차순, 절에 `kw.place.weakest`가 있을 때만 승률 내림차순 — `16492f4`부터 보이는 율법파 성벽 건설을 센 승률)는 원래 인덱스를 마지막 키로 넣어 안정성에 기대지 않는다 | `sort_custom`은 안정성을 보장하지 않는다. 인덱스를 붙여 비교하거나 병합 정렬을 쓴다 (`core/stable_sort.gd`) |
| `localeCompare` | 소명 id 동점 비교에만 쓴다 (`engine.js:123` — `3f33be1` 전에는 성지 동점의 칸 id 비교 `engine.js:113`도) | 소문자 영문 id라 일반 문자열 비교와 같다 |
| 반올림 | `Math.floor`, `Math.ceil(v * k)`(대성당 비용 배율 — 판 크기 표의 `cathedralCost`, 4×4 0.7·6×6 1.5·7×7 2, `engine.js:330-334`, `7a28084`·`3f33be1`; `1c81cd4`부터 비용 4라 4×4 3(`ceil(2.8)`)·6×6 6·7×7 8 — `3f33be1`~`238120e`에는 비용 6이라 4×4 5·6×6 9·7×7 12, `d7ad6e0`~`e174a18`에는 단계 비용 3이라 4×4 3, 7×7(×1.5) 5) | GDScript `float`도 IEEE double이라 같은 식이면 같은 값. 정수 나눗셈(`/`)을 섞지 말고 `floor()`/`ceil()`로 쓴다(정수 식은 [02 §20-8](../spec/02-rules.md#20-godot-이식-메모): `(7v + 9) / 10`, `(3v + 1) / 2`) |
| 선공 | `startRound`가 장 시작 승점(`score`)이 뒤진 쪽을 선으로(같으면 홀짝, 튜토리얼은 늘 우리 — `87a0fce`·`2825b37`), 그다음 우리 대성당이 서 있으면 율법파로(`0c95856`; `3f33be1` 전에는 공사 중) (`engine.js:644-647`). 선후가 해결 순서와 `rng.dice` 소비 순서를 정한다 | `score`를 같은 시점·같은 식(심판의 기준 가중치 포함)으로 먼저 옮겨야 선후가 맞는다. 골든의 장마다 `first`로 먼저 확인한다 |
| 객체 키 순서 | 문자열 키는 삽입 순서, **정수처럼 보이는 키는 숫자 순서가 먼저** | Godot `Dictionary`는 삽입 순서. `{1:…, 2:…}` 같은 정수 키 표를 순회하는 곳은 키를 정렬해서 돈다 |
| 난수 호출 순서 | 스트림별(`deck`, `dice`, 맵 생성용 시드 변형 4가지)로 호출 순서가 결과를 정한다 | [02 규칙](../spec/02-rules.md)의 RNG 순서를 그대로 따른다. 화면 쪽 연출에는 엔진 스트림을 쓰지 않는다 |
| `for (const ch of str)` | 코드 포인트 단위 순회 | `unicode_at` 순회와 같다. 해시만 위 대리 문자 처리가 필요 |
| 정규식 | JS 정규식 (`u` 플래그, `\p{Script=Hangul}`, 앞 보기 `kw.clean.coord`와 석판 사전(`kw.tablet.*`)의 앞 보기 `(?!…)`·**고정 길이 뒤 보기** `(?<!…)`, 메아리의 `[\s\p{P}]`). `\s`는 유니코드 공백 | Godot `RegEx`는 PCRE2. `\p{Script=Hangul}` → `\p{Hangul}`, 패턴 앞에 `(*UCP)`를 붙여 `\s`·`\w`를 유니코드로(또는 메아리처럼 `[\s\p{Z}\x{FEFF}\p{P}]`로 직접). PCRE2는 갈래마다 고정 길이인 뒤 보기를 지원한다(`(?<!돌아\|들어\|나)`처럼 갈래끼리 길이가 달라도 된다 — `87a0fce`의 절 나누기 `(?<=[가-힣]고\|[가-힣]며\|[가-힣]면서) `도 맨 바깥 갈래가 2·2·3글자라 된다). 플래그는 `(?i)` 같은 인라인 옵션. 정규식 split·콜백 치환이 없어 도우미가 필요하다 — `splitDont`는 다섯 패턴(`kw.dontAnd`·`stopAnd`·`enoughAnd`·`notBut`·`nounAnd` — `notBut`은 `b470e03`, 갈래마다 캡처가 따로라 걸린 쪽을 쓰고 `~에서(가)`로 끝나면 그대로 둔다)을 차례로 **모든 일치**에 콜백 치환한다(`e68a240`부터, KNOWN-ISSUES B7). 절 나누기의 긍정 뒤 보기에 `b470e03`의 `[가-힣]듯` 갈래(2글자)도 있다. 석판의 `text.search()` 위치는 같은 글 안의 순서 비교에만 쓰므로 코드 포인트 위치로 옮겨도 된다 ([05 §6.4](../spec/05-interpreter.md#64-정규식문자열-이식-노트)) |
| 엔진 → 해석기 역참조 | `interpreter.js`가 읽힐 때 `setPlanSig(fn)`으로 석판 함수를 엔진에 넣고, 엔진의 `isEcho`·`spokenOf`가 부른다(`9b43bbf`) — import 순환은 없지만 실행 때 엔진이 석판에 기댄다 | 엔진에 `Callable`을 주입한다. 석판 없이 엔진만 돌리면 메아리가 글로만 판정되어 골든의 `cost`·`log.echo`와 어긋난다 |
| 글자 수 | `String.length`는 UTF-16 단위 (계시 상한 100자·시련 20자, 이름 길이 — `0c95856` 전에는 30자 비용 경계도) | 이모지 같은 4바이트 문자는 2로 센다. `length()` 대신 UTF-16 길이를 세는 함수를 쓴다 |

## 검증: 골든 테스트

[`docs/export/golden/`](../export/golden/README.md)에 JS 엔진이 만든 결정론적 판 기록이 있다 (`node tools/golden.mjs`로 다시 만든다).

1. **맵**: 각 골든의 `config`로 맵을 만들고 초기 칸 목록(지형·특징·발견지·주인·건물)이 같은지.
2. **엔진**: 해석 결과 대신 골든에 기록된 명령 키를 그대로 넣고 장마다 상태 요약(자원·인구·승점·교리·칸 주인·승패)과 기록 문장이 같은지. 해석기와 떼어 엔진만 검증한다.
3. **석판 해석기**: 같은 계시 문장을 넣어 명령 키·교리·금지 목록이 같은지.
4. 전부 맞으면 계시 문장만으로 한 판 전체를 돌려 최종 결과까지 같은지.

JS 쪽 규칙을 고치면 `node tools/golden.mjs`로 기록을 다시 만들고 Godot 테스트도 같이 돌린다. 골든은 `afab303`에서 새 규칙으로 모두 다시 만들어졌고, 그 뒤 `1b582ee`(석판 어휘)·`448f553`(남은 자)의 코드로 다시 돌려도 12개 파일이 바이트까지 같았다(`448f553`에서 확인) — 골든 계시들이 바뀐 어휘·남은 자에 닿지 않는다는 뜻이지, 그 규칙을 검증한다는 뜻은 아니다. `e68a240`에서는 막기 대칭(후 진영의 기도·신전·대성당·성벽도 막히지 않음)과 헤아린 성벽 예산이 해결되는 행동을 바꿔 골든을 다시 뽑았다 — 판 파일 9개가 바뀌었고(결집 로그의 `fx.kind`가 `wrath`에서 `rally`로 바뀐 것 포함), 그중 네 판(`s5-hard-veteran`, `s6-normal-veteran`, `s7-hard-first`, `s4-hard-veteran-asc4`)의 최종 승점이 달라졌다. `9b43bbf`(7×7 율법파 행동 +1, 원정 +1, 신앙 승리는 장 끝·개종 조건, 일 메아리)에서 판 파일 9개가 다시 바뀌어 네 판의 결과가 달라졌고(`s5-easy-first-war`는 6장 신앙 승리 → 12장 승점 승리), `78c891e`(석판의 곳·수의 말, 해석문 머리말 `석판이 이르되,`)에서 11판 모두가 다시 바뀌었으나 결과는 그대로다. `87a0fce`(승점이 뒤진 쪽이 선공, 결집 12/6점과 신도 +1, 기적 재사용 비용, 두 장 전 메아리, 석판 절 나누기)에서 튜토리얼 밖 10판이 다시 바뀌어 10판 모두 최종 승점이 달라졌고 세 판은 승자가 바뀌었다(예: `s5-normal-first` 30:22 승 → 24:28 패, `s4-hard-veteran-asc4`는 남은 자로 우리 수도 함락), `2825b37`(튜토리얼은 늘 우리가 선)에서 튜토리얼 판이 바뀌었다(결과 18:18 그대로). `7a28084`(판 크기 표)는 골든을 바꾸지 않았다. `435c3cc`(신도 수 우위 삭제, 수도 내구도 2, 튜토리얼 청원 벌 조건을 구동기에도)에서 11판 모두 다시 바뀌었고(대부분 양쪽 최종 승점 −1 — 수도 항목; `s5-hard-veteran` 18:54 → 20:47, `s7-normal-veteran` 30:67 → 26:64, `s4-hard-veteran-asc4` 2:48 → 2:44, 튜토리얼 18:18 → 17:17), `8ba0ef8`(모듈 단계 해금)은 골든 설정에 `unlock`이 없어(`veteran` 판은 전부 켜짐) 판 파일을 바꾸지 않고 `index.json`의 `ruleset`만 7로 맞췄고, `bcdeb22`(석판 조준·말한 번개)에서 `s5-hard-veteran`·`s7-normal-veteran`이 바뀌었다(`s7-normal-veteran` 26:64 → 30:64) — 자세한 것은 [golden README](../export/golden/README.md). 6차에서는 `0c95856`(계시 비용 — `s5-normal-first` 10장의 긴 계시가 2 → 1, 결과 그대로; 대성당 선공은 골든에 대성당 공사가 없어 드러나지 않는다)이 `index.json`의 `ruleset`을 8로 올렸고, `b470e03`(석판이 공격·선교를 승률 순으로)이 `s5-normal-first`(결과 그대로)·`s7-hard-first`(41:41 승 → 38:48 패)를, `0a0a974`(대사제 성향 노동·어려움의 건설 공개)가 두 번째 판 다섯 판(`s5-hard-veteran` 결과 그대로, `s6-normal-veteran` 18:54 → 19:53, `s6-easy-veteran` 40:25 → 33:33 — 동점은 우리, `s7-normal-veteran` 30:64 → 24:66, `s4-hard-veteran-asc4` 8장 2:44 → 7장 6:30 점령)을 바꿨다. 7차에서는 `df1cb16`(되풀이 규칙 하나·결집의 신도 삭제)이 튜토리얼 밖 10판을 바꿔 네 판의 승점이 달라졌고(`s4-easy-first-war` 24:18 → 27:13, `s5-easy-first-war` 19:17 → 36:8, `s6-easy-veteran` 33:33 → 38:29, `s7-normal-veteran` 24:66 → 25:66 — 승자는 그대로) `ruleset`을 9로, `16492f4`(석판·예고된 성벽을 세는 승률)가 여섯 판을 바꿔 — 셋은 해석문만 — `s5-hard-veteran`(석판 20:47 → 25:41)·`s7-hard-first`(율법파 38:48 → 우리 41:41)의 결과를 바꿨고, `c12a1e9`(석판의 신앙 전환·피의 율법 삭제, 10칸)가 두 번째 판 다섯을 바꿔 `s5-hard-veteran`(9장 → 11장 석판 31:47)·`s6-easy-veteran`(심판 「경건」에서 율법파 신앙 승점이 늘어 우리 38:29 → 율법파 38:42)의 결과를 바꾸고 `ruleset`을 10으로 올렸다. `55d33dd`(대성당 원정 +1 삭제, 대비를 메아리 판정으로 다음 장 시작에, 헤아린 노동이 예고된 성벽을 셈)는 튜토리얼과 `s5-hard-veteran` 밖 아홉 판을 바꿨다 — 대부분은 대비 기록이 다음 장 `log` 맨 앞으로 옮기고 글이 바뀐 것이고, `s4-hard-veteran-asc4` 5장의 헤아린 공격(C2 → D3, 결과 그대로)과 `s7-hard-first`(7·8장에 대비가 걸려 우리 41:41 → 율법파 39:46)의 해결이 바뀌었다. `846fd60`(포위·성인 보정·청원 외면 벌 삭제, 안개 속 율법파 마을 기록, 지도자 반박 돌림, 석판 어휘·같은 자원 두 번 없음)은 튜토리얼 밖 열 판을 바꿨다 — 대부분 기록만(외면 벌 줄이 빠져 신앙이 늘고, 율법파 공격이 우리 수도를 칠 때 방어가 1 줄고, 지도자 반박과 안개 속 마을 글이 바뀜) 달라졌고, `s4-easy-first` 1장·`s6-easy-veteran` 2장 "강물이 너희를 먹이리라"는 같은 식량을 한 번만 거둔다. 결과는 `s6-easy-veteran`(38:42 → 39:42)만 달라졌다. `88878b6`(연속 작은 기적 삭제·같은 교리 세 장이면 율법파가 읽음, 전쟁 4칸은 성벽 돌 1, 대비 기록 문구·칸)은 튜토리얼과 `s5-hard-veteran` 밖 아홉 판을 바꿨다 — 대부분 기록(대비 문구 "우리의 말씀을 읽고"와 칸, `digest.streak`이 3에서 멈추고 비지 않음)만이고, 풍요 연속 기적(식량 +4)이 3장에 났던 세 판(`s4-easy-first`, `s6-normal-veteran`, `s7-hard-first`)은 그 기적 대신 4장에 대비가 걸려 뒤가 달라졌다. 결과는 `s7-hard-first`만 율법파 39:46 → 29:55. `d3fe641`은 `s6-easy-veteran`의 `digest.streak` 한 곳(교리 없는 메아리가 연속을 비움)만, `95eca5f`(전쟁의 헤아린 손은 성벽부터)는 `s7-hard-first` 14장의 헤아린 G1 공격을 C1 성벽으로 바꿔 29:55 → 36:52로 바꿨다. `8250dd7`(말투 수치 삭제·예언 은총·절 하나에 손 둘·남는 손은 모자란 것만)에서는 11판이 모두 바뀌었다: 칙령으로 끝나던 `s5-hard-veteran`은 6장에 율법파가 우리 수도를 무너뜨려 끝나고(10:28 — 그 전 11장 칙령 31:47), `s6-easy-veteran`은 승자가 바뀌었고(39:42 패 → 47:30 승), `s4-hard-veteran-asc4`는 한 장 일찍(6장) 수도가 무너진다; 나머지는 승패가 그대로다([golden README](../export/golden/README.md)). `d7ad6e0`(가까운 과녁·짓는 일 한 손·무너지지 않는 대성당)에서도 11판이 모두 바뀌었다: 튜토리얼은 우리 24:22 → **율법파 17:24**(3장 "땅을 넓혀 새 마을을 세워라"가 마을 하나만), `s5-hard-veteran`은 6장 수도 함락 10:28 → 다시 **11장 율법 석판 22:49**, `s6-normal-veteran` 26:58 → 19:53, `s6-easy-veteran` 47:30 → 44:34, `s7-hard-first` 25:55 → 22:52, `s7-normal-veteran` 33:66 → 28:66; 나머지 다섯은 승점이 그대로다([golden README](../export/golden/README.md)). `e174a18`(살림은 되풀이가 아님·전쟁·평화만 읽음·먼저 차지될 칸 피하기·금지어·튜토리얼 제안)에서는 아홉 판이 바뀌었다(`s6-easy-veteran`·`s4-hard-veteran-asc4`는 그대로): 튜토리얼은 다시 **우리 24:22**(3장 "땅을 넓혀 마을 두 곳을 세워라"가 마을 둘), `s4-easy-first` 15:23 → 17:23, `s4-easy-first-war` 23:13 → 24:15; 나머지 여섯 판은 승점이 그대로다([golden README](../export/golden/README.md)). `3f33be1`(대성당·섞인 읽힘·성지 자리·석판)에서는 열한 판이 모두 바뀌었다 — 성지 자리가 맵 생성의 언덕을 옮겨 4×4 세 판·`s5-normal-first`·7×7 두 판의 첫 맵이 달라졌고(성지 칸이 바뀐 판: `s4-easy-first-war`·`s4-hard-veteran-asc4` C4 → B1, `s5-normal-first` C3 → D4, `s7-normal-veteran` E5 → C3), 연속 점이 풍요·지혜에서 `null`이 되었다: `s4-easy-first-war` 24:15 → 23:11, `s4-hard-veteran-asc4` 6장 수도 함락 4:29 → 7장 8:30, `s5-easy-first-war` 32:8 → 24:13, `s7-hard-first` 22:52 → 15:62, `s7-normal-veteran` 14장 승점 28:66 → 13장 율법 석판 17:64; 나머지 여섯 판은 결과가 그대로다([golden README](../export/golden/README.md)). `637c05a`(칼·말씀 읽힘, 결집 8점·신도에 묶이지 않는 손, 석판 어휘)에서는 두 판만 바뀌었다 — `s4-easy-first-war`(7장 결집한 율법파가 신도 수와 무관하게 채집 둘을 더함, 23:11 그대로)와 `s5-easy-first-war`(6장 결집으로 B1 공격 등, 24:13 → 26:12). `24927a6`(계절 효과·같은 일 둘까지)에서는 열한 판 모두 바뀌었다(튜토리얼·`s7-hard-first`는 글만): `s4-easy-first` 17:23 → 19:21, `s4-easy-first-war` 23:11 → 27:11, `s4-hard-veteran-asc4` 8:30 → 8:27, `s5-hard-veteran` 22:49 → 22:51, `s5-normal-first` 20:26 → 20:25, `s6-easy-veteran` 44:34 → 46:36, `s6-normal-veteran` 19:53 → 19:54, `s7-normal-veteran` 13장 율법 석판 17:64 → 14장 승점 36:60; `s5-easy-first-war`·`s7-hard-first`·튜토리얼은 결과 그대로([golden README](../export/golden/README.md)). `76c0053`(선교 세 번에 넘어오는 마을·인구가 가득 차면 데려오지 못하는 개종·헤아린 손의 같은 일 둘까지·열혈은 전쟁·평화에서만·석판)에서는 여섯 판이 바뀌었다(`s5-easy-first-war`는 율법파가 굶은 기록 한 줄만): `s4-hard-veteran-asc4` 7장 수도 함락 8:27 → **6장** 8:25(6장 남은 자), `s5-normal-first` 20:25 → 19:26, `s6-easy-veteran` 46:36 → 44:40, `s6-normal-veteran` 19:54 → 10:59, `s7-normal-veteran` 36:60 → 35:60([golden README](../export/golden/README.md)). `238120e`(마지막 한 명은 설득되지 않음, 데려온 개종만 셈, 칼·말씀의 말씀은 선교뿐, 석판, 표식 글 n/3)에서는 일곱 판이 바뀌었으나 결과가 달라진 것은 `s4-hard-veteran-asc4`뿐이다: 6장 어려움의 율법 카드 고르기(`lawThreat`)가 우리 신도가 하나라 선교 후보가 빠져 L7 → L6이 되어 판이 갈렸고, 6장 남은 자 8:25 → **8장 율법파의 공격**으로 수도 함락 6:27(7장 율법파의 선교는 "설득할 이가 없었다"). 나머지 여섯 판은 기록 글(믿음의 표식 "1/3", "흩어졌다")이나 연속 점(평화 교리만의 계시는 이제 `null`)만 바뀌었다([golden README](../export/golden/README.md)). `1c81cd4`(저울 하나, 대성당 4·4·4)에서는 튜토리얼·`s4-easy-first` 밖 아홉 판이 바뀌었다 — 저울이 기운 장의 다음 장에 행동이 하나 늘어(율법파 쪽은 결집의 공격 먼저가 없어지고) 결과가 달라진 판: `s5-normal-first` 율법파 19:26 → **우리 30:21**, `s4-easy-first-war` 27:11 → 32:8, `s5-easy-first-war` 26:12 → 31:23, `s5-hard-veteran` 석판 22:51 → 17:55(11장 그대로), `s4-hard-veteran-asc4` 8장 수도 함락 6:27 → **5장** 2:30(5장 우리 공격자가 모두 쓰러져 남은 자로 무너짐 — 남은 자 규칙이 골든에 다시 걸린다). `s6-*`·`s7-*` 넷은 결과가 그대로다(`s6-normal-veteran`·`s7-hard-first`는 저울 기록 글만). `39500e9`(석판)는 골든을 바꾸지 않았다. `b1ff73e`(분노 코드 삭제, "노리는 곳"은 한 칸, 석판 어휘)는 열한 판 모두를 **글만** 바꿨다 — digest의 `wrath` 칸이 빠지고(필드가 없어졌다), 우리 쪽 저울 줄의 `fx.kind`가 `'scale'`, 저울 글이 "6점 이상"·"크게 뒤진"; 수·결과는 그대로(합계 601,193 → 598,883바이트). `db4135b`(다음 장 카드 미리 보기)는 골든에 닿지 않는다. `index.json`의 `ruleset`은 21이다(`1c81cd4`; `238120e`에서 20, `76c0053`에서 19, `24927a6`에서 18, `637c05a`에서 17, `3f33be1`에서 16, `e174a18`에서 15, `d7ad6e0`에서 14, `8250dd7`에서 13, `88878b6`에서 12, `846fd60`에서 11, `c12a1e9`에서 10, `55d33dd`는 올리지 않았다). 예전의 알려진 차이(튜토리얼 청원 벌 — [KNOWN-ISSUES](KNOWN-ISSUES.md) E5)는 `435c3cc`에서 구동기를 고쳐 없어졌다: 이제 `tutorial-3x3.json`의 신앙이 실제 게임과 같다. 이식판도 `main.js`대로 튜토리얼 조건을 넣는다. 규칙 밸런스는 골든이 아니라 `tools/tests/bench.mjs`로 본다([tools/tests](../../tools/tests/README.md)).

## 언어팩

- `docs/export/i18n-ko.json`에 1,349개 키가 있다(`db4135b`에서 다음 장 율법 카드의 `ui.heard.next`(함수)·`ui.heard.nextTip`을 더했다 — `ui.rules.enemy2`도 바뀌었다; 1,347개는 `b1ff73e`에서 분노·심판의 날의 키 여덟(`data.miracle.doom.name`·`text`, `eng.edict.doom`, `eng.win.doom`, `log.doom`, `log.wrathFull`, `log.wrath`, `ui.hand.wrath`)을 지우고 석판의 `kw.leaveAnd`·`kw.idList`를 더했다 — `ui.banner.wrath`·`ui.fx.wrath`는 `ui.banner.scale`·`ui.fx.scale`로 이름을 바꿨다; 1,353개는 `39500e9`에서 석판의 `kw.neitherNor`를 더했다 — `ui.rules.core2`와 석판 사전 열한 키의 글도 바뀌었다; 1,352개는 `1c81cd4`에서 `log.scaleUs`를 더하고 `ui.rules.words5`·`ui.rules.enemy3`을 지웠다 — 저울·읽힘의 규칙서 글, `log.rally`, `ui.law.rally`, 함수가 된 `ui.compose.sub`, `tut.end5.4`, 승천 3·시련 「마지막 예언자」 글도 바뀌었다; 1,353개는 `238120e`에서 `kw.place.foeward`·`ui.chip.heedOff`를 더하고 `ui.rules.words3`을 지웠다 — 선교 기록 셋·표식 툴팁·읽힘 글 넷·`tut.end5.1`과 석판 사전 열네 키의 글도 바뀌었다; 1,352개는 `76c0053`에서 `ui.chip.rest`(함수)·`ui.chip.restTip`·`eng.reject.many`·`kw.place.unwalled`·`tut.end5.5`를 더했다 — 가뭄 규칙 글과 석판 사전 여섯 키도 바뀌었다; 1,347개는 `637c05a`에서 석판의 `kw.onlyThis`를 더했다 — 읽힘·결집의 규칙서·툴팁·꼬리표·로그, `24927a6`의 계절 규칙 글 넷과 평온의 글, 석판 사전 열네 키의 글도 바뀌었다; 1,346개는 `3f33be1`에서 석판의 `kw.aside`·`kw.plentyAnd`·`kw.place.aimWall`을 더하고 대성당 단계 이름 `data.cathedral.0~2.name`과 승점 줄 `eng.score.cathedral`을 지웠다 — 대성당의 행동·기록·승리 글, 규칙서·툴팁·꼬리표 여럿과 석판 사전 스물하나 키의 글도 바뀌었다; 1,347개는 `e174a18`에서 `kw.rather`를 더했다 — 툴팁 둘·규칙서 둘·튜토리얼 제안과 석판 사전 열다섯 키의 글도 바뀌었다; 1,346개는 `d7ad6e0`에서 `kw.place.weakest`를 더하고 `log.cathedralFall`을 지웠다 — `ui.rules.win3`, `ui.tag.streak`·`ui.tag.readEcho`(`{n}`, `1fbb160`)와 석판 사전 열일곱 키의 글도 바뀌었다; `8250dd7`의 `eng.why.prophecy`(함수)·`kw.count1`을 더했다 — 말투·예언·침묵·규칙서의 글 여럿도 바뀌었다; `95eca5f`의 1,344개 — `d3fe641`의 `ui.tag.readEcho`, `95eca5f`의 `kw.place.gatherAt`·`kw.place.farthest`를 더했다; `88878b6`의 1,341개 — 연속 기적의 `log.streak.*` 다섯과 `ui.banner.streak`을 지웠다; `1cc1887`에서 `ui.law.guard`의 글이 "우리를 읽음"이 되었다; `846fd60`의 1,347개 — `log.villageFog`(함수)·`kw.partialNeg`·`kw.place.aimBuild`를 더하고 `ui.log.petitionIgnored`를 지웠다; `55d33dd`의 1,345개 — `interp.place.capital`·`interp.place.holy`를 지웠다; 닿지 않는 곳의 이름은 키가 아닌 `ko/interp.js`의 표 `FAR_NAME`으로; `df1cb16`~`c12a1e9`의 1,347개 — 석판의 `kw.notButPlace`·`kw.instead`·`kw.place.idOnly`·`kw.place.avoidId`·`kw.tablet.woodExcept`·`kw.place.quarry`·`kw.place.oasisAt`, `interp.place.capital`(함수)·`interp.place.holy`·`interp.tablet.forbidOnly`(함수)의 10개를 더하고 `log.rallyJoin`·`ui.tag.cited`·`kw.citeStop`·`kw.place.buildWord`·`eng.edict.faith`·`eng.edict.blood`의 6개를 지웠다; `0c95856`~`0a0a974`의 1,343개 — `ui.faithCostCited`를 지우고 석판의 `kw.notBut`·`kw.tablet.stoneExcept`·`prayExcept`·`exploreExcept`·`gatherAnyExcept`·`kw.tablet.claim`·`kw.simile`·`kw.place.oasis`, `ui.priestIntro`(함수), `tut.speak4.2`·`tut.end5.3`·`tut.end5.4`의 12개를 더했다; `435c3cc`~`3a790f5`의 1,332개(`ui.hand.reuse`, `ui.unlock.next`(함수), `ui.rules.core6`, 석판의 `kw.negCarry`·`kw.tablet.riverExcept`·`preachExcept`·`kw.place.foeVillage`·`closest`·`buildWord`의 9개를 더했다), `87a0fce`·`2825b37`의 1,323개, `78c891e`는 1,311개, `e68a240`은 1,287개). 값은 문자열·배열·객체·함수(`{"$fn": 원문}`) 중 하나다 — 객체 값은 넷이고 그중 `kw.place.terrainName`·`kw.place.dir`(`87a0fce`)은 석판이 낱말로 찾는 표다 ([언어팩](../i18n.md), [export README](../export/README.md)). 함수 셋(`interp.tablet.cannot`·`ui.heard.cannot`·`ui.heard.also`)은 키가 아닌 도우미 `cannotLabel`(`ko/interp.js:15-20` — `b470e03`부터 `far:<칸>` 갈래가 있고 `16492f4`부터 그 글이 "(지금 그곳에서는 할 수 없다)"이며 `far:<곳>`도 받는다; `55d33dd`부터 곳은 코드 `capital.enemy`·`capital.player`·`holy`(`88878b6`부터 `aim`도)이고 같은 파일의 표 `FAR_NAME`(`ko/interp.js:14`)이 이름을 붙인다)을 부르므로 그것도 함께 옮긴다. `interp.tablet.forbidOnly`도 같은 파일의 상수 `FORBID_KIND`·`CANNOT_KIND`를 쓴다. 석판의 `splitDont` 안에 있던 언어팩 밖의 한국어 검사 `/에서가?$/`(`b470e03`)는 `16492f4`에서 키 `kw.notButPlace`로 옮겨졌다.
- Godot 기본 번역(`TranslationServer`, CSV/PO)은 문자열만 다룬다. 이 게임은 한국어 조사(을/를, 이/가 …)와 조건 문장이 **함수 값**이라 그대로는 안 된다. 두 가지 길:
  1. **권장:** `I18n.gd` 오토로드가 JSON을 읽고, 함수 값 키는 GDScript 함수 표(`ko_fn.gd`)로 다시 쓴다. 조사는 `josa(name, "을", "를")` 도우미(`i18n/ko/grammar.js`와 같은 규칙: 괄호 앞 글자의 받침 기준).
  2. 함수 값을 `{place|을/를}` 같은 표기로 바꾸는 변환 단계를 두고 `I18n.gd`가 받침을 보고 조사를 고른다. 조건이 있는 문장은 키를 둘로 나눈다. 새 언어를 넣을 때는 이쪽이 번역가에게 편하다.
- `kw.*`(해석기가 계시를 알아듣는 정규식)는 번역이 아니라 언어별로 새로 쓴다.

## 해석기(LLM)

웹판의 LLM은 Chrome 내장 Prompt API라 Godot에는 없다. 선택지:

| 방법 | 장점 | 단점 |
|---|---|---|
| 석판(키워드) 해석기만 | 오프라인, 결정론, 바로 이식 가능 | 자유 문장 이해가 얕다 |
| 로컬 LLM (llama.cpp 기반 GDExtension, 예: godot-llm 계열) + JSON 문법(GBNF) | 오프라인, 배포 가능 | 모델 파일 크기(수 GB), GPU 편차, 한국어 품질은 모델 선택에 달림 |
| 원격 API (예: Anthropic Claude API, `HTTPRequest`) | 해석 품질이 가장 좋다 | 키를 게임에 넣으면 안 된다 → 중계 서버 필요, 비용·네트워크 |

어느 쪽이든 **엔진이 만드는 "가능한 행동 목록"의 ID 중에서만 고르게 하는 구조와 JSON 스키마는 그대로** 둔다. 응답은 엔진이 다시 검증하고, 실패하면 석판으로 되돌아간다. 프롬프트 원문과 스키마는 [05 해석기](../spec/05-interpreter.md).

## 화면

- 레이아웃: 웹판의 데스크톱 배치(왼쪽 부족 판 · 가운데 보드 · 오른쪽 기둥 · 아래 제단)를 `HBoxContainer`/`VBoxContainer`로 짜고, 좁은 화면 배치는 [06 UI/UX](../spec/06-ui-ux.md)의 반응형 규칙을 따른다.
- 재질: 양피지·나무·금박은 `StyleBoxFlat`(그라디언트는 `StyleBoxTexture`나 셰이더)로 Theme에 모은다. 색 토큰은 06 문서의 표를 그대로 쓴다.
- 보드: 육각 칸은 `Polygon2D`나 커스텀 `_draw()`로 그리고, 지형 그림은 `art/svg/s-*.svg`를 텍스처로 올린다. 칸 좌표·크기 공식은 06 문서에 있다.
- 아이콘·그림: `docs/export/svg/`의 47개 파일(`node tools/export-svg.mjs`로 다시 뽑는다). Godot은 SVG를 가져올 때 래스터로 굽으니 가져오기 배율(scale)을 2~4로 둔다. 다만 Godot의 SVG 가져오기는 **필터(그림자·종이 질감)와 일부 무늬를 무시**한다 — 그림이 밋밋하면 `docs/export/svg/index.html`을 브라우저로 열어 **PNG로 받기**(투명 배경 512px)를 쓴다. 미플(`s-meeple`)과 안개(`s-fog`)는 쓰는 쪽에서 색을 입히는 심볼이라 흰색/투명으로 보이는 게 정상이다 — `modulate`나 셰이더로 칠한다.
- 툴팁: 웹판의 양피지 툴팁은 `Control.tooltip_text` + 커스텀 `_make_custom_tooltip()`으로 만든다.
- 글꼴: 06 문서의 글꼴(제목·본문·UI)을 `FontFile`로 넣는다. 한글 글리프가 있는 글꼴이어야 한다.

## 소리

웹판은 음원 파일 없이 Web Audio로 효과음과 음악을 합성한다 (`sound.js`). 두 가지 길:
1. 웹판에서 효과음을 `OfflineAudioContext`로 렌더링해 `.wav`로 떠서 가져온다 (가장 빠르다).
2. `AudioStreamGenerator`로 같은 합성을 GDScript로 옮긴다 (음악의 절차적 변주를 살릴 때).

효과음 목록과 발생 시점은 06 문서에 있다.

## 저장과 진행

- 판 저장: 엔진 상태(`serializeState`)를 JSON으로 `user://save.json`. `SAVE_VERSION`과 `hydrateState`의 기본값 채우기(`??=`)를 그대로 옮겨 옛 저장본을 읽을 수 있게 한다.
- 진행: 웹판의 `localStorage` 키(`gsg.*`)를 키 이름 그대로 `user://meta.json` 한 파일의 필드로 두면 웹판 기록 내보내기 JSON을 그대로 가져올 수 있다 ([07 진행](../spec/07-progression.md)).

## 이식 순서

| 단계 | 할 일 | 끝났다는 기준 |
|---|---|---|
| M0 | `rng.gd`, `hash.gd`, `stable_sort.gd`, `hex.gd`, `data.json` 로딩 | 난수·해시 단위 테스트가 JS 값과 같다 |
| M1 | `mapgen.gd` | 골든 초기 맵 전부 일치 |
| M2 | `engine.gd` (규칙 전부) | 기록된 명령 키로 돌린 골든 전부 일치 |
| M3 | `tablet.gd`, `lore.gd` | 골든의 해석 결과 일치, 계시 문장만으로 골든 전부 일치 |
| M4 | 최소 화면: 보드·부족 판·계시 입력·확인·해결 로그 | 한 판을 끝까지 할 수 있다 |
| M5 | 전체 화면: 기적 손패, 오른쪽 기둥, 연출, 소리, 반응형, 접근성, 툴팁 | 06 문서 체크리스트 |
| M6 | 튜토리얼, 메인 화면, 종료 화면, 모달 | |
| M7 | 메타 진행 (경외·은사·성서·서고·시련·승천·오늘의 계시) | 07 문서 체크리스트 |
| M8 | LLM 해석기 (선택한 방법) | 해석 실패 시 석판으로 되돌아간다 |
| M9 | 다른 언어 (`kw.*` 새로 쓰기 포함), 플랫폼 빌드 | |

## 웹판에서 가져올 것 한눈에

| 경로 | 무엇 | 다시 만드는 법 |
|---|---|---|
| `docs/export/data.json` | 데이터 표 전부 (한국어 문구 포함) | `node tools/export-data.mjs` |
| `docs/export/i18n-ko.json` | 한국어팩 1,344키 (`95eca5f`) | 같음 |
| `docs/export/golden/*.json` | 결정론 판 기록 (골든 테스트) | `node tools/golden.mjs` |
| `docs/export/svg/*.svg` | 그림 심볼 47개 (+ `index.html` 미리보기·PNG 받기) | `node tools/export-svg.mjs` |
| `tools/tests/` | 결정론·퍼징 검사 (불변식 목록은 04 문서 §5.2), 석판 회귀 시험(1195문장), 밸런스 벤치마크 ([README](../../tools/tests/README.md)) | `node tools/tests/fuzz.mjs`, `node tools/tests/tablet-cases.mjs`, `node tools/tests/bench.mjs` |
