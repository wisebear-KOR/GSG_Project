# 골든 벡터 — 엔진 동등성 시험

JS 엔진으로 끝까지 둔 판의 **장별 기록**이다. Godot판이 같은 설정·같은 계시로 같은 판을 만들어 내는지 장마다 비교하는 데 쓴다. 생성물이므로 손으로 고치지 않는다: `node tools/golden.mjs`.

- 구동기는 **석판(키워드) 해석기** 경로를 `js/game/main.js` 그대로 따라 한다 (LLM·화면 연출·메타 저장은 뺀다).
- 결정론: 난수는 엔진의 시드 스트림(`state.rng.deck`, `state.rng.dice`)뿐이고 시각을 넣지 않는다. 두 번 돌려도 바이트까지 같다 (아래 "다시 만들기").
- 글(로그 문장·해석문·거절 이유)은 한국어 언어팩 그대로다.
- 지금 파일은 `e68a240`에서 다시 만든 것이다(`ruleset` 5). `afab303`(재조정: 율법파의 원정·결집·굳은 율법, 메아리, 대성당 조건, 뜻을 헤아린 노동 등)에서 만든 파일이 `1b582ee`·`448f553`까지 바이트째 같았는데, `e68a240`의 막기 대칭(후 진영의 기도·신전·대성당·성벽도 막히지 않음)·헤아린 성벽 예산·결집 로그의 `fx.kind` `rally`로 판 파일 9개가 바뀌었고, 그중 네 판(`s5-hard-veteran`, `s6-normal-veteran`, `s7-hard-first`, `s4-hard-veteran-asc4`)의 최종 승점이 달라졌다.

## 판 목록

[`index.json`](index.json)에 같은 목록이 기계용으로 있다 (`games[]`: `file`, `config`, `rounds`, `winner`, `winKind`, `score`).

| 파일 | 맵 | 난이도 | 두 번째 판 | 시드 | 지도자 / 심판 | 장 | 결과 (승점) | 크기 |
|---|---|---|---|---|---|---|---|---|
| [tutorial-3x3.json](tutorial-3x3.json) | 3×3 튜토리얼 | — | 아니오 | 7 (고정) | — / classic | 5/5 | player · tutorial (18:18) | 23 KB |
| [s4-easy-first.json](s4-easy-first.json) | 4×4 | easy | 아니오 | 4101 | elder / classic | 8/8 | enemy · score (18:24) | 38 KB |
| [s5-normal-first.json](s5-normal-first.json) | 5×5 | normal | 아니오 | 2026 | iron / classic | 12/12 | player · score (30:22) | 62 KB |
| [s5-hard-veteran.json](s5-hard-veteran.json) | 5×5 | hard | 예 | 5303 | preacher / steadfast | 9/12 | enemy · edict (28:46) | 53 KB |
| [s6-normal-veteran.json](s6-normal-veteran.json) | 6×6 | normal | 예 | 6202 | iron / wide | 12/12 | enemy · score (13:60) | 71 KB |
| [s6-easy-veteran.json](s6-easy-veteran.json) | 6×6 | easy | 예 | 6605 | builder / pious | 12/12 | enemy · score (26:34) | 63 KB |
| [s7-hard-first.json](s7-hard-first.json) | 7×7 | hard | 아니오 | 7304 | builder / classic | 14/14 | enemy · score (25:55) | 82 KB |
| [s7-normal-veteran.json](s7-normal-veteran.json) | 7×7 | normal | 예 | 7707 | preacher / steadfast | 14/14 | enemy · score (15:67) | 80 KB |
| [s4-easy-first-war.json](s4-easy-first-war.json) | 4×4 | easy | 아니오 | 404 | elder / classic | 8/8 | player · score (27:11) | 37 KB |
| [s5-easy-first-war.json](s5-easy-first-war.json) | 5×5 | easy | 아니오 | 202 | preacher / classic | 6/12 | player · faith (28:11) | 30 KB |
| [s4-hard-veteran-asc4.json](s4-hard-veteran-asc4.json) | 4×4 | hard | 예 | 4404 · 승천 4 · 은사 mason | iron / fertile | 8/8 | enemy · score (14:44) | 44 KB |

"두 번째 판" = `config.veteran` (율법 석판·심판의 기준·소명·교리 대립·갈림길·세 막 등이 켜진다). 튜토리얼의 `config`에는 `DEFAULT_CONFIG`(size 5, normal, seed 2026)가 섞여 있지만 튜토리얼에서는 쓰이지 않는다.

## 구동기가 한 장에 하는 일

`state = createState(config)` 다음, 판이 끝날 때까지 되풀이한다. 괄호 안은 `main.js`의 함수. **[ui]** 는 엔진이 아니라 화면 컨트롤러가 `state.log`에 직접 넣는 줄이다 (골든의 로그에 `"ui": true`로 표시).

1. **장 시작** (`newRound`): `startRound(state)`.
2. **닫을 수 없는 선택 창** — 구동기는 늘 첫 선택지를 고른다.
   - 1장이고 `state.destinyOffer`가 있으면 `chooseDestiny(state, destinyOffer[0])` → `destinyPick`.
   - `state.miracleOffer`가 있으면 `takeMiracle(state, miracleOffer[0])` → `miracleDraft`.
3. **계시** (`speak` → `interpret` → `derivePending`). 칩을 빼지 않고, 다시 해석·말 거두기·버튼 기적·계절 고르기·갈림길 버튼은 쓰지 않는다.
   1. 글자가 없으면(`kw.ui.speech` 불일치, 예: `…`) **침묵** 경로로 (아래).
   2. `cost = revelationCostFor(state, text)`. `faith < cost`면 화면은 인장을 받지 않는다 — 구동기는 이때 침묵으로 넘기고 `unaffordable: cost`를 남긴다 (지금 골든에는 이런 장이 없다).
   3. `faith -= cost`.
   4. `naming = nameTile(state, parseNaming(text))` — 이름은 **해석 전에** 새긴다 (새 이름이 석판 규칙에 들어간다).
   5. `result = interpretWithTablet(state, text)`.
   6. `tone = detectTone(text)`, `prophecy = state.prophecy ? null : parseProphecy(text)`.
   7. `{accepted, rejected} = validateOrders(state, 'player', result.orders, forbiddenKeys, result.doctrine)`, `auto = autoFill(state, 'player', accepted, forbiddenKeys, result.doctrine)` (`forbiddenKeys = result.forbidden의 key`). **교리를 넘긴다** — 한 자리가 계시의 뜻을 헤아린 노동(`heeded`)이 된다 ([02 §3.5](../../spec/02-rules.md#35-기본-노동-autofill)).
   8. `answered = petitionAnswered(state, text, accepted)`, `dilemma = dilemmaByText(state, text)`, `miracle = spokenMiracle(text)`, `command = canCarve(state) ? parseCommandment(text, COMMANDMENTS) : null` (새길 수 없는 계명·이미 새긴 계명이면 `null`).
   - **침묵**: `pray = legalActions(state, 'player')` 중 첫 기도, `auto = [pray(auto), ...autoFill(state, 'player', [pray])]`(교리 없음), 글 `null`.
   - `spokenMiracle(text)`: `parseMiracle(text, state.miracleHand)`의 기적이 이번 장 아직 안 썼고(`!state.miracleUsed`) 신앙이 `miracleCost` 이상일 때. 번개의 과녁은 계시에 이름이 나온 율법파 칸, 없으면 보이는 율법파 칸 중 마을 먼저 → 우리 수도에서 가까운 순(동률은 `state.tiles` 순서)의 첫 칸.
4. **공개와 해결** (`accept`).
   1. 글이 있으면 [ui] `god`(계시 원문)·`priest`(해석문) 두 줄.
   2. `enemyPlan = planEnemy(state)`. 여기서부터의 로그를 `logsSince`라 한다.
   3. 말한 기적: `castMiracle(state, id, target)` (실패하면 [ui] 한 줄).
   4. `applyTone(state, text ? tone : null)`; 침묵이면 `state.streak = null`.
   5. 갈림길 사건(`state.event.choice`)이면 `payDilemma(state, dilemma ?? state.dilemmaPick ?? choice[0].id)` — 비용을 먼저 치르고, 결과는 `resolveRound` 안에서 유지 단계 전에 `resolveDilemma(…, prepaid=true)`로 난다. (엔진 API가 있으므로 따로 부를 것이 없다.)
   6. `plan = [...accepted, ...auto]`. 계명 체크(`carve`)가 켜져 있고 `carveCommandment(state, command)`가 성공하면 `plan = kept + autoFill(state, 'player', kept, forbiddenKeys, result.doctrine)` (`kept` = 새 계명이 막는 공격/마을 건설을 뺀 `accepted`; 안식·굶기지 말라처럼 막는 것이 없으면 `accepted` 전부 — `afab303` 전에는 건설 외 명령이 모두 빠졌다). 화면(`main.js`)은 확인 화면에서 뺀 칩도 금지 키에 더해 넘기지만(`e68a240`), 구동기는 칩을 빼지 않으므로 같다.
   7. `ordered = plan 중 auto가 아닌 것`.
   8. 글이 있으면 `findSacred(state, text)` (오늘의 계시에서만 효과).
   9. 예언 체크(`seal`)가 켜져 있고 `prophecy`가 있으면 `sealProphecy(state, prophecy)`.
   10. `resolveRound(state, plan, enemyPlan)` — 막기(집 안 행동은 칸을 차지하지도 막히지도 않는다)·해결·갈림길 결과·유지·승패(남은 자 포함)·굳은 율법(`updateLawGuard`)·장 기록(분노·결집)이 이 안에서 끝난다.
   11. 승부가 안 났으면 `applySilence(state, !!text)`.
   12. 승부가 안 났고 글이 있으면 `markLegends(state, text, result.doctrine, ordered, logsSince)`, 이어서 `keepVows(state, result.forbidden, plan)`.
   13. 승부가 안 났으면 청원·이름의 은총 (`wordsAfter`): `answered`면 `stats.petitions += 1`, `petitionIgnored = 0`, `grantGrace(state, 1, …)`; 아니면 `++petitionIgnored >= 2`일 때 0으로 되돌리고 신앙 −1과 [ui] 한 줄. 이름을 붙였으면 `grantGrace(state, 1, …)`. (예전의 기이한 해석 은총은 `afab303`에서 없어졌다.)
   14. 글이 있으면 `recordRevelation(state, text, result.doctrine, tone === 'metaphor' ? 1 : 0)` — 지난 계시를 그대로 되풀이한 메아리면 교리가 오르지 않는다. (예전의 `updateLiturgy`는 없어졌다.)
   15. 첫 이름이고 지혜 교리가 `RULES.graceDoctrineBelow`(3)보다 낮으면 지혜 +1.
   16. `state.history.at(-1).text = text`.
   17. 글이 있고 지도자가 있으면 [ui] `leader` 한 줄: `leaderLine(state, 'rebuttal', { doctrine: result.doctrine, word: nouns(text)[0] })`.
5. **재생 끝** (`playback`): 승부가 안 났고 `state.pendingSite`가 있으면(유목민) `resolveSite(state, 첫 선택지 'take')`와 [ui] 한 줄 → `site`.
6. 승부가 났으면(`state.winner`) 끝, 아니면 1로.

확인 화면의 두 체크 상자(예언 봉인·계명 새기기)는 기본이 꺼짐이다. 대본 항목이 `{ "text": …, "seal": true }` / `{ "carve": true }`일 때만 켠다 (`sealRequested`, `carveRequested`).

## 파일 모양

```jsonc
{
  "name": "s5-normal-first",
  "config": { "mode": "standard", "size": 5, "difficulty": "normal", "seed": 2026, "veteran": false },  // createState에 그대로
  "script": [ "땅을 넓혀 새 마을을 세워라", { "text": "…리라", "seal": true }, "…" ],                   // 장마다 하나 (모자라면 처음부터 다시)
  "initialMap": { "grid": [[…]], "tiles": [{…}], "revealed": "0101…" },
  "setup": { … },        // createState 직후 (startRound 전)
  "rounds": [ { … } ],   // 장마다 하나
  "result": { … }
}
```

**initialMap**

| 칸 | 뜻 |
|---|---|
| `grid` | `mapgen.generateMap({rows, cols, seed})`의 원래 격자 (`'P'`/`'E'` = 수도). 튜토리얼은 `TUTORIAL.map` (`'V'` = 율법파 마을) |
| `tiles[]` | `createState`가 만든 칸 (`id`, `r`, `c`, `terrain`, `feature`, `site`, `owner`, `building`) — 성지 언덕·발견지·영구 지형이 놓인 뒤. 수도 칸의 `terrain`은 `plain` |
| `revealed` | 칸마다 `'1'`(보임)/`'0'`, `state.tiles` 순서 (A1, A2, …, B1, … 행 우선) |

**setup**: `rows`, `cols`, `maxRounds`, `enemyBonus`, `leader`, `priest`, `judgement`, `edictOn`, `holyId`, `miracleHand`, `destinyOffer`, `destiny`, `sides`(아래 digest의 진영 모양), `eventDeck`·`lawDeck`(카드 id — **배열 끝에서 뽑는다**), `rng`(카드를 나눈 뒤의 `{deck, dice}`).

**rounds[]** (없는 칸은 해당 없음)

| 칸 | 뜻 |
|---|---|
| `round`, `event`, `lawCard`, `first`, `act` | `startRound` 뒤의 장 번호·계절 카드 id·율법 카드 id·선 플레이어·막 (`actOf`) |
| `reacted` | 율법파가 지난 장의 말(교리 또는 `vow`)에 맞선 카드를 골랐으면 그 말 |
| `eventChoice` | 지혜 궁극으로 고를 수 있던 두 계절 (구동기는 고르지 않는다 = 첫 장 그대로) |
| `bannedWords` | 검열 카드가 이번 장에 봉인한 말 |
| `petition` | `{from, need}` — 청원자와 필요 (`need`는 `{type, gather?, build?}` 또는 `null`) |
| `destinyPick`, `miracleDraft` | 선택 창에서 고른 것 (`miracleDraft = {offer, pick}`) |
| `revelation`, `sealRequested`, `carveRequested` | 대본의 계시 원문과 체크 상자 |
| `silent`, `unaffordable` | 침묵으로 처리됨 / 신앙이 모자라 침묵 (필요했던 비용) |
| `cost` | 치른 계시 비용 |
| `tone` | `command` / `blessing` / `curse` / `metaphor` |
| `naming` | `{tile, name, first}` — 이번 계시로 새긴 이름 |
| `tablet` | 석판 해석 결과 `{orders, forbidden, doctrine, interpretation}` (행동은 key) |
| `accepted`, `rejected`, `auto` | `validateOrders`가 받은 명령 · 버린 명령 `{key, reason}` · `autoFill`이 채운 노동 (계명 새기기 전) |
| `petitionAnswered` | `petitionAnswered()` 결과 |
| `enemyPlan` | `planEnemy()` 결과 (key) |
| `miracle` | 말한 기적 `{id, target, cost, ok}` |
| `dilemma` | `{pick, byText, paid}` — 고른 갈림길, 계시의 말로 골랐는가, `payDilemma`가 실제로 적용한 선택 (비용을 못 내면 공짜 선택으로 바뀐다) |
| `carved`, `sealed` | 새긴 계명 id / 봉인한 예언 `{kind, rounds}` |
| `plan`, `ordered` | `resolveRound`에 넘긴 최종 명령 (key). `plan` 중 `ordered`에 없는 것은 `auto: true` |
| `site` | 발견지 선택 `{tile, choice}` |
| `log[]` | 이번 장에 `state.log`에 쌓인 줄 (아래) |
| `digest` | 장이 끝난 뒤 상태 요약 (아래) |

행동 key는 엔진과 같다: `` `${type}:${tile}:${gather ?? build ?? ''}` `` — 예 `gather:C2:stone`, `build:E2:temple`, `explore:B2:`, `pray:E2:`.

**log[]**: `{side, text, dice?, fx?, act?, ui?}`

- `side`: `player` / `enemy` / `god` / `priest` / `leader`.
- `dice`: `{attacker, attackerBonus, defender, defenderBonus, win}` (선교·공격·평화 궁극).
- `fx`: 엔진 연출 정보에서 규칙에 닿는 것만 — `kind`(`gain`, `build`, `attack`, `preach`, `blocked`, `fail`, `birth`, `loss`, `warn`, `edict`, `wrath`, `rally`, `guard`, `grace`, `dilemma`, `streak`, `treasure`, `site`, `saint`, `legend`, `commandment`, `prophecy`, `ban`, `doctrine`, `rain`, `lightning`, `explore` …), `tile`, `gain`, `capture`, `convert`, `capital`, `up`.
- `act`: 이 줄을 만든 행동의 key (행동 해결 중에 난 줄만).
- `ui: true`: 엔진이 아니라 `main.js`가 넣은 줄. 엔진만 이식해 비교할 때는 건너뛴다.

**digest**

| 칸 | 뜻 |
|---|---|
| `player`, `enemy` | `food`, `wood`, `stone`, `faith`, `pop`, `templeLevel`, `capitalHp`, `cathedral`, `edict`, `villages`(`villageCount`), `score`(`score()`); 플레이어만 `faithless`, `doctrine{peace,war,abundance,wisdom}` |
| `owners`, `buildings`, `walls` | 주인 있는 칸 → `player`/`enemy`, 건물 있는 칸 → `capital`/`village`, 성벽 칸 목록 |
| `faithMarks` | 믿음의 표식 `{side, n}` (있을 때만) |
| `revealed` | `initialMap.revealed`와 같은 비트 문자열 |
| `holyOwner` | 성지를 쥔 쪽 (`holyOwner()`) |
| `wrath`, `streak`, `silentRun` | 신의 분노, 연속 교리 `{doctrine, n}`, 연속 침묵 |
| `names`, `legends`, `commandments`, `prophecy`, `destiny`, `saints`, `vowNext`, `bannedNext`, `pendingSite` | 있을 때만 (예전의 `liturgy`는 성언이 없어져 `e68a240`에서 구동기에서도 뺐다) |
| `stats` | `state.stats` 그대로 (`converted`, `captured`, `miracles`, `prophecies`, `petitions`, `turned?`, `starved?`, `vows?`, `sacred?`) |
| `rng` | 장이 끝난 뒤의 `{deck, dice}` — **부호 있는 32비트 정수** |
| `winner`, `winKind` | 승부 (`null`이면 진행 중) |

**result**: `rounds`, `winner`, `winKind`, `winReason`(한국어), `score{player, enemy}`, `breakdown{player, enemy}`(`scoreBreakdown().parts`의 `{key, n, w}`), `history[]`(`{round, ps, es}`), `revelations[]`(`{round, doctrine}`), `stats`.

digest에 **없는** 새 상태: `lawGuard`(굳은 율법), `rally`(결집), `revelations[].echo`(메아리). 이 값은 다음 장의 계획·판정(율법파 행동 수, 방어 보너스)과 로그(`log.lawGuard`·`log.rally`·`log.echo`, `fx.kind` `guard`·`rally`·`doctrine` — 결집은 `e68a240` 전에는 `wrath`였다)로만 드러나므로, 어긋나면 그다음 장의 `enemyPlan`·`dice`에서 처음 보인다. 이식판 하네스는 이 셋을 따로 찍어 두면 원인을 빨리 찾는다.

## Godot 하네스

두 가지 방식이 있다. 둘 다 장마다 **같은 순서**(위 "구동기가 한 장에 하는 일")로 이식한 엔진 함수를 부른다.

**A. 석판까지 이식한 경우** — 계시 원문을 이식한 `interpret_with_tablet()`에 넣고 전부 비교한다.

```gdscript
func run_golden(path: String) -> void:
    var g: Dictionary = load_json(path)
    var st := GameEngine.create_state(g.config)
    check_map(st, g.initialMap)          # tiles 6칸 + revealed
    check_setup(st, g.setup)             # 덱 id 순서, 지도자/사제/심판/손패, rng
    for rec in g.rounds:
        GameEngine.start_round(st)
        expect_eq(st.event.id, rec.event); expect_eq(st.law_card.id, rec.lawCard); expect_eq(st.first, rec.first)
        if rec.has("destinyPick"): GameEngine.choose_destiny(st, rec.destinyPick)
        if rec.has("miracleDraft"): GameEngine.take_miracle(st, rec.miracleDraft.pick)
        var pending := Driver.speak(st, rec.revelation, rec.get("sealRequested", false), rec.get("carveRequested", false))
        if rec.has("tablet"): check_tablet(pending, rec.tablet)   # orders/forbidden key, doctrine
        check_keys(pending.accepted, rec.accepted); check_keys(pending.auto, rec.auto)
        var log_from := st.log.size()        # start_round는 로그를 남기지 않는다
        var enemy_plan := Driver.accept(st, pending)   # 4-1 ~ 4-17
        Driver.after_playback(st)                      # 5 (발견지)
        check_keys(enemy_plan, rec.enemyPlan)
        check_log(st.log.slice(log_from), rec.log)     # side, fx.kind, fx.tile, dice, act (ui 줄은 선택)
        check_digest(st, rec.digest)                   # 정수 전부 + rng
    check_result(st, g.result)
```

**B. 다른 해석기(LLM만, 또는 다른 파서)를 쓰는 경우** — 기록된 해석을 그대로 먹인다. 해석기는 건너뛰고 나머지는 A와 같다.

- `silent`이면 침묵 경로.
- 아니면 `faith -= cost`; `naming`이 있으면 `state.names[naming.tile] = naming.name` (`nameTile`이 하는 일, `first`는 기록을 쓴다).
- 해석 결과 = `{orders, forbidden, doctrine}`: `tablet.orders`/`tablet.forbidden`의 key를 **이름 붙이기 뒤의** `legal_actions(state, "player")`에서 key로 찾아 행동 객체로 바꾼다. `doctrine = tablet.doctrine`.
- 그다음 `validateOrders`·`autoFill`·`petitionAnswered`·`dilemmaByText`·`spokenMiracle`·`parseCommandment`를 그대로 돌리고 `accepted`/`auto`/`petitionAnswered`/`dilemma`/`miracle`과 맞는지 본다. `tone`은 `detectTone`을 이식하지 않았다면 기록값을 쓴다.
- 엔진만 먼저 맞추고 싶다면 `plan`(`ordered`에 없는 key는 `auto: true`로 표시)과 `enemyPlan`을 기록에서 바로 만들어 `resolveRound`에 넣어도 된다. 이때도 3-3·3-4, 4-3~4-9, 4-11~4-17을 같은 순서로 불러야 digest가 맞는다.

### 비교 요령

- **어긋난 첫 장, 첫 칸을 찾는다.** 순서: `initialMap` → `setup`(덱·rng) → 장마다 `event`/`lawCard`/`reacted`/`petition` → `tablet` → `accepted`/`auto` → `enemyPlan` → `log` 순서 → `digest`.
- `digest.rng`가 가장 날카로운 검사다. `dice`가 어긋나면 주사위를 굴린 **횟수나 순서**(해결 순서 `gather → build → pray → explore → preach → attack`, 선 플레이어 먼저, 탐험의 `rand` 두 번, 평화 궁극의 `d6` 두 번)가 다르다. `deck`이 어긋나면 덱 나누기(`dealDeck`/`shuffle`)나 5장 기적 드래프트가 다르다.
- 난수는 32비트 정수 연산이다 (`Math.imul`, `>>>`, `| 0`). GDScript의 `int`는 64비트이므로 매 연산 뒤 32비트로 잘라야 한다. 비교는 부호 있는 32비트 값으로.
- JSON 숫자는 Godot에서 `float`로 읽힌다 — `int()`로 바꿔 비교한다. 사전의 키 순서는 비교하지 않는다.
- 로그 `text`까지 맞추려면 같은 한국어 언어팩과 `josa`/`batchim`이 필요하다. 규칙 검증만이라면 `side`·`fx`·`dice`·`act`로 충분하다. `rejected[].reason`도 한국어 글(`eng.reject.*`)이다.

## 다루는 것 / 다루지 않는 것

다룬다: 맵 3×3~7×7, 쉬움·보통·어려움, 첫 판·두 번째 판, 튜토리얼 고정 덱, 승천 4(`enemyZeal`) + 은사(석공), 지도자 넷 전부, 심판의 기준 다섯 전부, 결과 네 가지(score·tutorial·edict·faith), 율법파의 원정·막마다 칼·퇴각(여러 판), 굳은 율법(8판), 결집(3판), 메아리(3판), 뜻을 헤아린 기본 노동, 석판 규칙, 부정 절(금지), 이름 붙이기와 이름으로 부르기, 말투 넷, 예언 봉인(성취·실패), 계명 셋(굶기지 말라·칼을 들지 말라·안식), 말한 기적(단비·번개), 기적 드래프트, 소명, 갈림길(말로 답함·기본값), 분열의 예언자 미라, 발견지(보물·유목민 선택), 검열 카드, 율법파의 반응 카드, 신의 분노, 성인, 전설의 땅, 연속 교리 기적, 두 번째 판의 침묵 3연속, 지혜 궁극의 계절 선택지 등장.

다루지 않는다 (필요하면 `tools/golden.mjs`의 `GAMES`에 판을 더한다):

- LLM 해석 경로 (`buildPrompt`, 신학 노트 `extractLesson`, 30초 타임아웃), 다시 해석·말 거두기·칩 빼기.
- 버튼으로 쓰는 기적(심판의 날 포함), 지혜 궁극으로 계절 바꾸기(`chooseEvent`), 갈림길 버튼.
- 시련(`config.trial`), 오늘의 계시(`config.daily`, 숨은 말), 정경·전생의 유적·신의 이름(`config.canon`/`legacy`/`god`).
- 저장·불러오기(`serializeState`/`hydrateState`).
- 승리 종류 `capital`(공격·남은 자), `cathedral`(대성당 원정·마을 조건 포함), `doom`; 남은 자(`448f553` — 골든 판은 인구 0에 닿지 않는다); `extinct`·`convertAll`·`bothExtinct`(이제 튜토리얼에서만 날 수 있다); 계명 `noExpand`; 갈림길 비용을 못 내 다른 선택으로 바뀌는 경우; 신앙이 모자라 말하지 못한 장(`unaffordable`); 두 개 이상의 "~지 말고"(`e68a240`부터 모두 금지 절이 된다 — 석판 회귀 시험 `tools/tests/tablet-cases.mjs`가 다룬다).

## 다시 만들기

```sh
node tools/golden.mjs            # 판마다 한 줄씩 요약을 찍는다
node tools/golden.mjs            # 한 번 더 → git diff docs/export/golden 이 비어 있어야 한다
```

스크립트는 파일을 쓰기 전에 `JSON.parse`로 다시 읽어 보고, 한 파일이 1.5 MB를 넘으면 멈춘다. 지금은 11판, 모두 합쳐 약 0.6 MB다. `GAMES`에서 판을 빼거나 이름을 바꾸면 옛 파일은 지워지지 않으므로 손으로 지운다 (`index.json`이 기준 목록이다).
