# 05. 해석기 — 계시가 명령이 되기까지

> 플레이어가 쓴 자연어 **계시**를 신도들의 **명령**(엔진의 행동 객체 목록)으로 바꾸는 모든 것: 비용, LLM(대사제) 경로, 석판(키워드) 파서, 결과 객체, 엔진 검증, 확인 화면, 그리고 계시의 **낱말 자체가 규칙이 되는** 장치들.
> 코드가 기준이다. 인용은 `파일:줄` (2026-09-27 작업 트리 기준). 모르는 것·어색한 것은 맨 끝 [확인 필요](#확인-필요)에 모았다.
> 관련 문서: [01 개요](01-overview.md) · [02 규칙](02-rules.md) · [03 데이터](03-data.md) · [04 구조](04-architecture.md) · [06 UI/UX](06-ui-ux.md) · [Godot 이식 계획](../godot/PORTING.md)

## 0. 파일 지도

| 파일 | 맡은 일 |
|---|---|
| `js/game/interpreter.js` | 프롬프트 만들기(`buildPrompt`), LLM 해석(`interpretWithLLM`), 석판 해석(`interpretWithTablet`), 말-행동 잇기(`linkWords`), 신학 노트(`extractLesson`), 해석문 다듬기(`cleanSpeech`), 사제 말투(`voiceOf`) |
| `js/llm.js` | Chrome Prompt API 래퍼: 세션 생성(`createBaseSession`), 스키마 강제 스트리밍(`promptJSON`) |
| `js/game/lore.js` | 순수 텍스트 처리: 명사 뽑기(`nouns`), 인용(`citedWords`), 말투(`detectTone`), 이름(`parseNaming`), 예언(`parseProphecy`), 말한 기적(`parseMiracle`), 계명(`parseCommandment`), 성언(`findLiturgy`), 검열어(`frequentNoun`), 해시 선택(`hashPick`), 지도자 대사(`leaderLine`) |
| `js/game/engine.js` | 가능한 행동(`legalActions`), 검증(`validateOrders`), 자동 노동(`autoFill`), 비용(`revelationCostFor`), 말의 효과(은총·청원·이름·말투·예언·침묵·계명·성언·숨은 말·서원·교리 기록·연속 기적) |
| `js/game/main.js` | 흐름 배선: `speak` → `runInterpretation` → `interpret` → `derivePending` → 확인 화면 → `accept` → `wordsAfter`; 다시 해석·말 거두기·칩 빼기·예언 봉인·계명 새기기·제안 칩·예감 |
| `js/game/i18n/ko/interp.js` | 대사제 프롬프트(`interp.*`)와 **모든 해석용 정규식 원본**(`kw.*`) |
| `js/game/i18n/ko/engine.js:57-72` | 청원 응답 정규식 `kw.petition.*` |
| `js/game/i18n/ko/data.js` | 사제 성향·교리 말투 프롬프트(`data.priest.*.prompt`, `data.voice.*`), 갈림길 `kw.data.event.*.tags`, 계명 `kw.data.commandment.*.re`, 숨은 말 `kw.data.sacred.*.word` |
| `js/game/i18n/ko/ui.js:557-559` | 침묵 판정 `kw.ui.speech`, 선교 힌트 `kw.ui.preach` |
| `docs/EXPERIMENTS.md`, `lab/interpret.html`, `lab/scenario.js` | 프롬프트 실험 v1~v5와 채점 세트 |

언어팩 조회 `t(key, vars)`: 값이 문자열이면 `{이름}` 자리를 채우고, 함수면 `vars`를 넘겨 부른다 (`js/game/i18n.js:33-42`). 정규식은 전부 `new RegExp(t('kw.…'), 플래그)`로 만든다.

---

## 1. 파이프라인 한눈에

```mermaid
flowchart TD
  A[두루마리에 계시 입력] --> B{길이 ≤ revMax?}
  B -- 아니오 --> A
  B -- 예 --> C{kw.ui.speech 글자가 있나?}
  C -- 없음 --> S[침묵 silence]
  C -- 있음 --> D[비용 revelationCostFor<br/>신앙 부족이면 거부]
  D --> E[speakSnap 저장 · 신앙 차감<br/>이름 붙이기 nameTile]
  E --> F[runInterpretation<br/>LLM 또는 석판 · 연출과 병렬]
  F --> G[결과 객체<br/>interpretation/orders/forbidden/doctrine/source]
  G --> H[interpret: pending 생성<br/>말투·인용·예언 파싱]
  H --> I[derivePending: validateOrders + autoFill<br/>linkWords·청원·갈림길·기적·계명·기이한 해석]
  I --> J[확인 화면]
  J -- 칩 빼기/되살리기 --> I
  J -- 다시 해석 신앙1 --> F
  J -- 말 거두기 --> A
  J -- 수락 --> K[accept: 기적 → 말투 → 갈림길 비용 → 계명 → 숨은 말 → 예언 봉인<br/>resolveRound → 침묵 → 전설 → 서원 → wordsAfter → 교리 기록 → 성언 → 신학 노트 → 지도자 반박]
  S --> J
```

### 1.1 입력 단계 — `speak()` (`main.js:500-524`)

1. `text = textarea.value.trim()`. 비었으면 포커스만 준다.
2. `text.length > revMax()` 이면 거부. `revMax()`는 `REVELATION_MAX = 100`, 시련 「침묵의 수도원」(`trial === 'cloister'`)만 20 (`main.js:1846`, `data.js:56`). textarea `maxlength`도 같은 값.
3. **침묵 판정**: `KW_SPEECH = /[가-힣A-Za-z0-9]/` (`kw.ui.speech`, `main.js:37`)에 한 글자도 안 걸리면(예: `…`, `!!`) 대사제를 부르지 않고 `silence()`로 간다 → [4.11 침묵](#411-침묵).
4. 비용 `cost = revelationCostFor(state, text)` ([1.2](#12-계시-비용)). `faith < cost`면 거부 + 안내(`ui.notice.noFaith`).
5. `speakSnap = { state: JSON.stringify(serializeState(state)), text, cost }` — 말 거두기용 스냅숏. **신앙 차감 전**에 뜬다.
6. `faith -= cost`.
7. **이름 붙이기를 해석 전에 새긴다**: `nameTile(state, parseNaming(text))` (`main.js:518`). 그래서 새 이름이 대사제의 행동 목록(칸 이름)과 석판의 이름 규칙에 곧바로 들어간다 → [4.2](#42-이름-붙이기).
8. `runInterpretation(text)`를 **먼저 시작**하고, 인장·빛기둥 연출(`fx.castRevelation`, 약 2.3초)과 병렬로 기다린다. 연출이 끝나면 `interpret(text, job, naming)`.

> 프롬프트의 자원 수치는 **계시 비용을 치른 뒤**의 값이다 (5→6 순서).

### 1.2 계시 비용

`revelationCostFor` (`engine.js:680-684`):

```js
base = (text.trim().length > 30 && citedWords(state, text).length === 0
        && !(state.liturgy && text.includes(state.liturgy))) ? 2 : 1;
cost = base + (state.bannedWords.some((w) => text.includes(w)) ? 1 : 0);
```

| 조건 | 비용 |
|---|---|
| 30자 이하 | 1 |
| 31자 이상 | 2 |
| 31자 이상이지만 **인용**(최근 3장 계시와 겹치는 명사, [4.8](#48-성구-인용과-성언))이 하나라도 있음 | 1 |
| 31자 이상이지만 **성언**(`state.liturgy`)을 포함 | 1 |
| 위 결과 + **봉인된 말**(검열, [4.12](#412-검열-봉인된-말))을 포함 | +1 (최대 3) |

- 길이는 JS `String.length`(UTF-16 코드 단위). 한글 음절은 1, 이모지는 2 → [6.4](#64-정규식문자열-이식-노트).
- 입력 중 비용 알약은 `draft`로 실시간 계산하고, 인용이면 `인용 · 신앙 N`, 봉인어면 붉게 표시 (`main.js:2159-2172`).
- `data.js:58`의 `revelationCost`(길이만 보는 옛 함수)는 **쓰이지 않는다**.

### 1.3 해석 — `runInterpretation` (`main.js:538-550`)

```js
if (aiMode === 'llm') {
  try {
    await prepareLLM((p) => { progress = p; ... });   // 세션 준비 (다운로드 진행률)
    progress = null;
    return { result: await interpretWithLLM(state, text) };
  } catch (e) {
    return { result: interpretWithTablet(state, text), notice: t('ui.notice.llmFailed', { err: e.name }) };
  }
}
await fx.wait(700);                                    // 석판은 일부러 0.7초 뜸을 들인다
return { result: interpretWithTablet(state, text) };
```

- `aiMode`: 시작 시 `llmStatus()`가 `available | readily-available | downloadable | downloading | after-download` 중 하나면 `'llm'`, 아니면 `'tablet'`. URL `?ai=tablet`이면 강제로 석판 (`main.js:120-122`). 상단 AI 버튼으로 전환 가능 (가능할 때만, 해석 중에는 불가 — `main.js:425-430`).
- LLM이 어떤 이유로든 던지면 **같은 계시를 석판으로 해석**하고 확인 화면에 안내 문구(`대사제가 말씀을 알아듣지 못해 석판으로 해석했다 ({err}).`)를 띄운다. 비용은 다시 받지 않는다.

### 1.4 결과 객체 (해석기 출력)

세 경로 모두 같은 모양을 돌려준다. **`quote`/`reason` 같은 필드는 없다** — 대사제의 말은 `interpretation` 하나이고, 거부 사유는 검증 단계(`validateOrders`)의 `rejected[].reason`에 있다.

| 필드 | 타입 | LLM (`interpreter.js:147-154`) | 석판 (`interpreter.js:208-216`) | 침묵 (`main.js:640`) |
|---|---|---|---|---|
| `interpretation` | string | 모델의 `interpretation`을 `cleanSpeech`로 다듬은 것 | `interp.tablet.say` 또는 `interp.tablet.blur` | `ui.silence.first` / `ui.silence.again` |
| `orders` | Action[] | 모델이 고른 ID → 행동 (모르는 ID는 버림, 중복 가능) | 규칙이 고른 행동 − 금지된 것 | `[]` |
| `forbidden` | Action[] | 모델이 금지한 ID → 행동 | 부정 절에서 걸린 행동 전부 (중복 가능) | `[]` |
| `doctrine` | `'peace'｜'war'｜'abundance'｜'wisdom'｜null` | 항상 값이 있다 (스키마 enum). 한국어 이름 → id (`DOCTRINE_KO`) | 첫 규칙의 교리, 없으면 금지가 있을 때 `'peace'`, 아니면 `null` | `null` |
| `source` | `'llm'｜'tablet'｜'silence'` | `'llm'` | `'tablet'` | `'silence'` |
| `ms` | number | 스트리밍 전체 소요 ms (반올림) | 없음 | 없음 |

**행동 객체 (Action)** — `legalActions`가 만든다 (`engine.js:359-395`):

| 필드 | 값 | 비고 |
|---|---|---|
| `type` | `gather｜build｜pray｜preach｜attack｜explore` | |
| `tile` | `'C1'` 같은 칸 id | 행 문자 A~I + 열 번호 1부터 |
| `gather` | `food｜wood｜stone｜faith` | 채집만 |
| `build` | `village｜wall｜temple｜cathedral` | 건설만 |
| `side` | `'player'` | |
| `key` | `` `${type}:${tile}:${gather ?? build ?? ''}` `` | 예: `gather:B2:food`, `preach:A2:`, `build:C1:temple`. **모든 비교·저장·골든의 기준 키** |
| `text` | 행동 설명 (언어팩 `eng.act.*`) | 예: `평원(B2)에서 곡식을 거둔다 (식량 +2)` |
| `id` | `'A1'`… | LLM 경로에서만 (`buildPrompt`) |
| `auto` | `true` | `autoFill`이 채운 행동에만 |

### 1.5 엔진 검증 — `validateOrders` (`engine.js:399-432`)

입력: `orders`(뺀 칩 제외), `forbiddenKeys`, `doctrine`. 앞에서부터 하나씩:

1. `forbidden`에 키가 있으면 거부 — `계시가 금지`.
2. 건설이면 **이번 장에 이미 받아들인 건설 비용을 뺀 예산**(`budget`, 시작값 = 현재 자원)으로 감당되는지. 안 되면 `자원 부족`.
3. 이미 받아들인 행동과 **같은 칸**이면: 교리 선호표 `DOCTRINE_PREF`에 새 행동의 type이 있고 기존 행동의 type은 없으면 **교체**(기존 것을 `같은 장소 (교리에 맞는 행동 우선)`으로 거부), 아니면 새 것을 `같은 장소`로 거부.
4. 받아들인 수가 `actionLimit` 이상이면 `행동 수 초과`.
5. 통과하면 건설 비용을 예산에서 빼고 받아들인다.

```js
const DOCTRINE_PREF = {
  war: ['attack', 'build'], peace: ['preach', 'pray'],
  abundance: ['gather', 'build'], wisdom: ['pray', 'explore', 'build'],
};
```

출력: `{ accepted: Action[], rejected: { action, reason }[] }`.
(같은 칸 교체 때는 예산을 되돌리거나 새로 빼지 않는다 → [확인 필요](#확인-필요).)

**자동 노동 `autoFill`** (`engine.js:435-455`) — 명령이 채우지 못한 행동 수를 신도들이 알아서 채운다. 금지 키와 **확인 화면에서 뺀 키**는 쓰지 않는다 (`main.js:577`).
1. 신앙 ≤ `RULES.lowFaith`(2)이고 기도가 가능하며 수도 칸이 비어 있으면 **기도 먼저**.
2. 식량·목재·돌을 **보유량 오름차순**으로 두 바퀴 돌며, 각 자원의 첫 채집 행동(빈 칸)을 넣는다.
3. 그래도 자리가 남으면 기도.

### 1.6 확인 화면 (`main.js:552-608`, `2007-2076`, `2185-2208`)

`interpret()`가 `pending`을 만들고 `derivePending()`이 파생값을 계산한다. 칩을 뺄 때마다 `derivePending()`을 다시 부른다.

**`pending` 객체**

| 필드 | 뜻 | 만드는 곳 |
|---|---|---|
| `text` | 계시 원문 (침묵이면 `null`) | `interpret` |
| `result` | 해석기 결과 객체 | `interpret` |
| `fresh` | 해석문 타자기 연출 전 (수락 버튼 잠김) | `interpret`, 렌더 후 `false` |
| `naming` | `{ tile, first, name }` 또는 `null` | `speak` (다시 해석 때도 유지) |
| `dropped` | 뺀 칩 키 Set (최대 2) | 칩 클릭 |
| `tone` | `command｜blessing｜curse｜metaphor` | `detectTone(text)` |
| `cited` | 인용 낱말 배열 | `citedWords(state, text)` |
| `prophecy` | `{ kind, rounds }` 또는 `null` (이미 예언이 봉인돼 있으면 항상 `null`) | `parseProphecy(text)` |
| `seal` | 예언 봉인 체크 (기본 `false`) | 체크 상자 |
| `accepted`, `rejected` | 검증 결과 | `validateOrders` |
| `auto` | 자동 노동 | `autoFill` |
| `links` | `{ [action.key]: 낱말 }` | `linkWords` |
| `answered` | 청원에 답했나 | `petitionAnswered` |
| `dilemma` | 계시 말로 고른 갈림길 선택 id | `dilemmaByText` |
| `miracle` | `{ id, target, cost, key: 'miracle:<id>' }` 또는 `null` | `spokenMiracle` |
| `command` | 새길 수 있는 계명 id 또는 `null` | `parseCommandment` |
| `carve` | 계명 새기기 체크 (기본 없음=false) | 체크 상자 |
| `odd` | 기이한 해석 (처음 해석에서 **한 번만** 정한다) | `derivePending` |
| `prev` | 다시 해석하기 전의 `pending` (바꿔 보기용) | `reinterpret` |
| `incoming` | 미플이 날아가는 중 (조작 잠금) | `enterConfirm` |

**화면 구성**
- 머리: `확인` 제목, 사제 이름 · 출처(`LLM`/`석판`/`침묵`) · 소요 초 · 교리 이름.
- 계시 원문: `linkWords`가 찾은 낱말(과 인용 낱말)에 밑줄 (`markWords`, `main.js:2120`). 해석문이 다 나오면 밑줄에서 해당 칸으로 빛줄기(최대 3개, `drawLinks`).
- 태그 줄 (`main.js:2043-2058`): 말투 · 기이한 해석 · 청원 응답 · 이름 · 갈림길 · 성언 · 인용 · 반대 교리 -1(두 번째 판) · 교리 3연속 예고. **은총은 장당 하나**라서 서원 > 기이한 해석 > 청원 순으로 첫 하나에만 `· 은총`을 붙인다.
- 해석문 (타자기 연출, 교리 3칸 이상이면 `voice-<교리>` 먹빛).
- 칩: 받아들인 명령(번호·링크 낱말·예상 수익·선교/공격 승률·선공 표시) → 자동 노동(`알아서`) → 말한 기적 칩 → 뺀 칩(`뺌`) → 거부된 칩(사유) → 금지 칩(`⊘`, 공격·선교면 `서원 · 지키면 은총`, 그 밖은 `금지`).
- 미리보기: 자원 `지금→예상` (`previewGains` + 축복 첫 채집 +1, 저주 신앙 -1, 말한 기적 비용·수익, 갈림길 증감).
- 체크 상자: `예언으로 봉인 — "{이름}" {n}장 안에 이루어지면 신앙 +{보상}, 빗나가면 -2` / `영원한 계명으로 새긴다 — 「{이름}」 {설명} (되돌릴 수 없다)`.
- 경고: 교리가 전쟁인데 공격할 곳이 없음 / 평화 + `kw.ui.preach`(`이웃|율법|전하|설득`)인데 선교할 곳이 없음.

**버튼과 조작**

| 조작 | 조건 | 효과 |
|---|---|---|
| **수락하고 공개** (Enter) | 해석문 연출이 끝난 뒤 | `accept()` → [1.7](#17-수락과-해결) |
| 칩 누르기 | 연출 끝, 미플 착지 후 | 명령·기적 칩을 뺀다/되살린다. **최대 2개** (`한 장에 두 개까지만 뺄 수 있다.`). 빈 자리는 `autoFill`이 채운다 |
| **다시 해석 · 신앙 1** (R, ㄱ) | 계시가 있고, 이번 장 `reinterpretUsed`가 아니고, 신앙 ≥ 1 | 신앙 -1, `reinterpretUsed = true`, 같은 원문으로 `interpret()` 다시 (지금 `aiMode`로; 이름은 유지, 예언·말투 등 다시 파싱, 뺀 칩 초기화). 이전 해석은 `pending.prev`로 남는다 |
| **↔ 이전 해석과 바꾸기** | `pending.prev`가 있을 때 | 두 해석을 맞바꾼다 (비용 없음) |
| **말을 거두기** (Esc) | 확인 단계, `speakSnap` 있음, `reinterpretUsed` 아님, 튜토리얼 아님 | `speakSnap`의 상태로 되돌림(비용·이름 환불) → `reinterpretUsed = true` → 두 번째 판(`veteran`)이면 신앙 -1 → 원문을 두루마리에 되돌려 다시 쓰게 한다. **다시 해석과 같은 장당 한 번** |

### 1.7 수락과 해결

`accept()` (`main.js:690-752`). 순서가 수치에 영향을 주므로 그대로 지킨다.

1. 계시가 있으면 기록에 `god`(원문)·`priest`(해석문) 줄.
2. `before = snapshot`, **`enemyPlan = planEnemy(state)`** (기적·말투보다 먼저 정해진다).
3. 말한 기적(빼지 않았으면) `castMiracle` → 실패하면 기록만.
4. `applyTone(state, text ? tone : null)`. 침묵이면 `streak = null`.
5. 갈림길: `pending.dilemma ?? state.dilemmaPick ?? 첫 선택지` → `payDilemma` (비용 선지불).
6. `plan = accepted + auto`. 계명 체크 + `carveCommandment` 성공이면 새 계명과 충돌하는 명령(공격 / 마을 건설)을 빼고 `autoFill`로 다시 채운다.
7. `ordered = plan.filter(!auto)` (계시로 명한 행동).
8. `findSacred` (숨은 말), 체크했으면 `sealProphecy`.
9. **`resolveRound(state, plan, enemyPlan)`** — 해결과 유지(예언 판정 포함).
10. 승패 전이면: `applySilence(state, !!text)` → (계시면) `markLegends` → `keepVows` → `wordsAfter`(기이한 해석·청원·이름 은총).
11. 계시면 `recordRevelation(state, text, doctrine, metaphor ? 1 : 0)` → `updateLiturgy`. **교리는 해결이 끝난 뒤에 오른다** (확인 화면 수치 = 실제 해결).
12. 첫 이름이면 지혜 +1 (지혜 < 3일 때).
13. LLM 경로면 `extractLesson` → `state.lessons` (최대 3, 오래된 것부터 버림).
14. 기록·메타(어휘집 `noteWords` 등), 지도자 반박 대사, 재생.

---

## 2. LLM 경로 (대사제)

### 2.1 가용성과 세션 — `llm.js`, `interpreter.js:103-126`

- API 유무: `'LanguageModel' in self` (`llm.js:3`).
- 상태 확인 `llmStatus()`: `LanguageModel.availability({ expectedInputs:[{type:'text', languages:['en']}], expectedOutputs:[{type:'text', languages:['en']}] })`. 한국어가 공식 지원 언어(de, en, es, fr, ja)가 아니라 **영어로 확인**한다. 예외면 `'unavailable'`.
- **기본 세션은 한 번만** 만든다 (`prepareLLM`): `createBaseSession({ systemPrompt: SYSTEM_PROMPT, languages: ['ko', 'en'], onProgress })`.

```js
// llm.js:19-37
opts = {
  initialPrompts: [{ role: 'system', content: systemPrompt }],
  monitor(m) { m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded)); },
};
try {
  session = await LanguageModel.create({ ...opts,
    expectedInputs:  [{ type: 'text', languages }],          // ['ko','en']
    expectedOutputs: [{ type: 'text', languages: [languages[0]] }] });  // ['ko']
} catch (e) {
  if (e.name !== 'NotSupportedError') throw e;
  session = await LanguageModel.create(opts);                 // 언어 지정 없이 다시
}
```

- 미리 깨우기: 메인 화면에서 시작 버튼을 누를 때(`main.js:261`)와 시련 시작(`main.js:958`)에 `prepareLLM()`을 불러 둔다 (첫 계시 13초 → 3초). 실패하면 `preparing = null`로 되돌려 다음에 다시 시도.
- **매 해석마다 `session.clone()`** 으로 시스템 프롬프트만 든 깨끗한 세션을 복제해 쓰고 `finally`에서 `destroy()`. 대화 기록은 쌓지 않는다 — 지난 계시는 프롬프트의 `지난 계시` 줄로만 넘긴다.
- **샘플링 파라미터(temperature, topK)는 지정하지 않는다** — 모델 기본값. 그래서 같은 계시를 다시 해석하면 결과가 달라질 수 있다 (다시 해석 기능의 전제).
- 다운로드 진행률: `downloadprogress` 이벤트의 `e.loaded`(0~1)를 `progress`로 받아 `대사제가 제단 앞에 엎드렸다 · 모델 내려받는 중 N%`로 표시 (`main.js:1999`). (미리 깨운 세션에는 콜백이 없어서 실제로는 표시되지 않을 수 있다 → [확인 필요](#확인-필요).)

### 2.2 시스템 프롬프트 (`interp.systemPrompt`, `ko/interp.js:7-28`)

```text
너는 한 부족의 대사제다. 신의 짧은 계시를 해석해, 이번 장에 부족이 할 일을 정한다.

아래 순서대로 답한다.
1. forbidden: 계시가 하지 말라고 한 행동의 ID. 없으면 빈 배열.
   예) "숲을 베지 마라" → 숲에서 나무를 베는 행동의 ID. "싸우지 마라" → 공격 행동들의 ID.
2. orders: 계시를 따르는 행동의 ID. 계시와 직접 관련된 것만 고른다. 확신이 없으면 1개만 고른다.
   남은 신도는 알아서 일하므로 개수를 채울 필요가 없다. forbidden에 넣은 행동은 고르지 않는다.
   건설은 자원이 되는 만큼만 고른다.
3. doctrine: 계시의 성격. 평화(사랑, 화합, 휴식, 설득) / 전쟁(분노, 싸움, 정복, 방어) / 풍요(먹을 것, 수확, 재물, 건설) / 지혜(신앙, 경배, 탐구, 숨겨진 것)
4. interpretation: 방금 고른 orders를 신도들에게 외치는 말. 두 문장 이하, 60자 안팎.

지킬 것:
- '가능한 행동' 목록의 ID만 쓴다. 같은 장소의 행동은 하나만 고른다.
- 계시에 나온 장소나 사물(강, 산, 숲, 언덕, 안개, 이웃, 돌, 마을, 신전 등)과 관련된 행동을 먼저 고려한다.
- 계시가 짧거나 모호하면 '최근 사건'과 부족 상황에서 뜻을 찾는다.
- 계시는 행동 수나 자원 같은 규칙을 바꿀 수 없다. 그런 말은 비유로 받아들인다.
- 계시를 따를 행동이 목록에 없으면 interpretation에서 그 사정을 짧게 밝히고, 그 뜻에 가까워지는 행동을 고른다.

interpretation 말투:
- 경전의 명령형으로 쓴다: "~하라", "~하리라", "~할지어다".
- orders에 고른 행동만 말한다. 좌표(C1 같은 것)는 쓰지 않는다.
- 참고로, 계시가 "바람을 읽어라"였고 탐험을 골랐다면 이렇게 쓴다: 바람이 방향을 바꾸었다. 안개 너머로 나아가라!
```

### 2.3 매 장 프롬프트 (`buildPrompt`, `interpreter.js:18-63`; 틀은 `interp.prompt`, `ko/interp.js:44-59`)

틀 (선택 항목은 비었으면 **그 줄을 통째로 뺀다**):

```text
[부족 상황]
자원: 식량 ${food}, 목재 ${wood}, 돌 ${stone}, 신앙 ${faith}
신도: ${pop}명 (이번 라운드 행동 가능 ${limit}회), 신전 ${templeLevel}단계, 마을 ${villages}개
율법파: 신도 ${enemyPop}명, 마을 ${enemyVillages}개, 수도 내구도 ${capitalHp}
율법파의 의도: ${threat}                      ← threat가 있을 때만
지난 계시: ${recent}
너의 신의 이름은 ${god}이다.                 ← god이 있을 때만
대사제가 깨달은 신의 말버릇: ${lessons}       ← lessons가 있을 때만
${voice}                                      ← voice가 있을 때만
이 부족의 경전: "${canon}"                    ← canon != null 일 때만
${priest}                                     ← priest가 있을 때만

[가능한 행동]
${actions}

[최근 사건]
${event}
이번 사건의 갈림길: ${choice}                 ← choice가 있을 때만
다음 장: ${next} 예고                         ← next가 있을 때만

[신의 계시]
"${revelation}"

금지한 행동, 따를 행동(1~${limit}개), 교리를 정한 뒤, 고른 행동을 외치는 말을 JSON으로 답하라.
```

**주입 필드 전부**

| 변수 | 값 | 출처 |
|---|---|---|
| `food, wood, stone, faith` | 플레이어 자원 (계시 비용 차감 후) | `state.sides.player` |
| `pop` | 플레이어 신도 수 | |
| `limit` | `actionLimit(state,'player')` | `engine.js:217` |
| `templeLevel` | 신전 단계 | |
| `villages` | 플레이어 마을 수 | `villageCount` |
| `enemyPop`, `enemyVillages`, `capitalHp` | 율법파 신도·마을·**율법파 수도** 내구도 | `state.sides.enemy` |
| `threat` | `enemyIntent(state)` 중 **보이는(shown)** `attack`/`preach`를 `interp.threat`로: `{장소을/를} 공격하려 한다` / `{장소을/를} 개종시키려 한다`, `, `로 이음 | `interpreter.js:35-36` |
| `recent` | 지난 계시 **최근 2개** 원문을 `"…"`로 감싸 `, `로 이음. 없으면 `없음` (`interp.none`) | `state.revelations.slice(-2)` |
| `god` | 메인 화면에서 지은 신의 이름 (`config.god.name`) | |
| `lessons` | 신학 노트 `'낱말'=행동이름` 목록, `, `로 이음 ([3.6](#36-신학-노트와-명사-뽑기)) | `lessonList` |
| `voice` | 가장 깊은 교리가 **4칸 이상**이면 `DOCTRINE_VOICE[교리].prompt` ([4.17](#417-사제-성향과-교리-말투)) | `voiceOf(state, 4)` |
| `canon` | 정경 구절 `config.canon.text` (지난 판에 봉헌한 계시) | |
| `priest` | 사제 성향 프롬프트 `PRIESTS[state.priest].prompt` (충직한 사제는 빈 문자열) | |
| `actions` | 가능한 행동 목록 (아래) | |
| `event` | 이번 계절 카드 `state.event.text` | |
| `choice` | 갈림길 선택지 이름을 ` / `로 이음 | `state.event.choice` |
| `next` | 다음 계절 이름 (`nextEvent(state)`가 있고 `round < maxRounds`일 때) | |
| `revelation` | 계시 원문 (이스케이프 없음) | |

**가능한 행동 목록** (`interpreter.js:19-30`)
1. `legalActions(state, 'player')` 순서대로 `A1, A2, …` ID를 붙인다 (1부터, 전체 연번).
2. **칸별로 묶는다** — 칸이 처음 나온 순서. 묶음 머리는 `[칸 이름]`, 행동이 둘 이상이면 뒤에 ` (하나만 선택)` (`interp.oneOnly`).
3. 각 행동 줄은 두 칸 들여쓰기 `  A7: 평원(B2)에서 곡식을 거둔다 (식량 +2)`. 묶음 사이는 줄바꿈 하나.
4. 칸 이름은 `tileName(state, tile, 'player')`: 안개 `안개 지대(B3)`, 이름 붙인 칸 `요단(D3)`, 수도 `우리 신전(C1)`/`율법파 신전(A3)`, 마을 `우리 마을(…)`/`율법파 마을(…)`, 영구 지형 `채석장(C2)`, 그 밖은 지형 이름 (`engine.js:289-297`).

**조각 문구**

```js
'interp.oneOnly': ' (하나만 선택)',
'interp.none': '없음',
'interp.threat': (v) => `${josa(v.place, '을', '를')} ${{ attack: '공격하려', preach: '개종시키려', build: '지으려', gather: '채집하려', pray: '기도하려' }[v.type]} 한다`,
'interp.lessonItem': (v) => `'${v.word}'=${v.name}`,
'interp.lessonName': (v) => {           // 채집(식량|목재|돌|신앙) / 마을 건설|성벽|신전|대성당 / 기도|선교|공격|탐험|건설
  const type = { gather: '채집', pray: '기도', build: '건설', preach: '선교', attack: '공격', explore: '탐험' };
  return v.gather ? `${type.gather}(${{ food: '식량', wood: '목재', stone: '돌', faith: '신앙' }[v.gather]})`
    : v.build ? { village: '마을 건설', wall: '성벽', temple: '신전', cathedral: '대성당' }[v.build] : type[v.type];
},
```

사제 성향(`data.priest.*.prompt`)과 교리 말투(`data.voice.*.prompt`)의 원문은 [4.17](#417-사제-성향과-교리-말투).

**실제 예 1 — 튜토리얼 1장** (Node에서 `buildPrompt` 실행 결과):

```text
[부족 상황]
자원: 식량 5, 목재 3, 돌 1, 신앙 6
신도: 3명 (이번 라운드 행동 가능 3회), 신전 1단계, 마을 0개
율법파: 신도 3명, 마을 1개, 수도 내구도 3
지난 계시: 없음

[가능한 행동]
[숲(A1)] (하나만 선택)
  A1: 숲(A1)에서 나무를 벤다 (목재 +2)
  A2: 숲(A1)에 마을을 세운다 (목재 -2, 식량 -1, 영토 확장)
[율법파 마을(A2)] (하나만 선택)
  A3: 율법파 마을(A2)의 율법파에게 신의 뜻을 전한다 (개종 판정)
  A4: 율법파 마을(A2)을 공격한다 (전투 판정)
[산(B1)] (하나만 선택)
  A5: 산(B1)에서 돌을 캔다 (돌 +2)
  A6: 산(B1)에 마을을 세운다 (목재 -2, 식량 -1, 영토 확장)
[평원(B2)] (하나만 선택)
  A7: 평원(B2)에서 곡식을 거둔다 (식량 +2)
  A8: 평원(B2)에 마을을 세운다 (목재 -2, 식량 -1, 영토 확장)
[평원(C2)] (하나만 선택)
  A9: 평원(C2)에서 곡식을 거둔다 (식량 +2)
  A10: 평원(C2)에 마을을 세운다 (목재 -2, 식량 -1, 영토 확장)
[숲(C3)] (하나만 선택)
  A11: 숲(C3)에서 나무를 벤다 (목재 +2)
  A12: 숲(C3)에 마을을 세운다 (목재 -2, 식량 -1, 영토 확장)
[우리 신전(C1)]
  A13: 신전에서 기도한다 (신앙 +2)
[안개 지대(A3)]
  A14: 안개 지대(A3) 속을 탐험한다 (무엇이 있을지 모름)
[안개 지대(B3)]
  A15: 안개 지대(B3) 속을 탐험한다 (무엇이 있을지 모름)

[최근 사건]
평온한 계절이 이어진다.
다음 장: 평온한 계절 예고

[신의 계시]
"강물이 너희를 먹이리라"

금지한 행동, 따를 행동(1~3개), 교리를 정한 뒤, 고른 행동을 외치는 말을 JSON으로 답하라.
```

**실제 예 2 — 선택 줄이 모두 켜진 경우** (5×5, 시드 2026, 두 번째 판, 신 이름·정경·열혈 사제·전쟁 4칸·신학 노트 하나. 행동 목록은 줄임):

```text
[부족 상황]
자원: 식량 4, 목재 2, 돌 0, 신앙 4
신도: 3명 (이번 라운드 행동 가능 3회), 신전 1단계, 마을 0개
율법파: 신도 3명, 마을 0개, 수도 내구도 3
지난 계시: "숲에서 나무를 베어라", "이웃을 사랑하라"
너의 신의 이름은 엘로아이다.
대사제가 깨달은 신의 말버릇: '새벽'=탐험
말투: 짧고 거칠게, 불과 칼의 비유로.
이 부족의 경전: "강물처럼 흘러라"
대사제의 성향: 뜻이 모호하면 율법파와 맞서는 행동(공격, 선교)을 먼저 떠올린다.

[가능한 행동]
[숲(C1)] (하나만 선택)
  A1: 숲(C1)에서 나무를 벤다 (목재 +2)
  A2: 숲(C1)에 마을을 세운다 (목재 -2, 식량 -1, 영토 확장)
[채석장(C2)] (하나만 선택)
  A3: 채석장(C2)에서 돌을 캔다 (돌 +3)
  …
[우리 신전(E2)]
  A19: 신전에서 기도한다 (신앙 +2)
[안개 지대(B1)]
  A20: 안개 지대(B1) 속을 탐험한다 (무엇이 있을지 모름)
  …

[최근 사건]
떠돌이 예언자가 안개 속에 보물이 있다고 말했다.
다음 장: 가뭄 예고

[신의 계시]
"새벽이 오기 전에 칼을 들라"

금지한 행동, 따를 행동(1~3개), 교리를 정한 뒤, 고른 행동을 외치는 말을 JSON으로 답하라.
```

### 2.4 JSON 스키마 (`responseConstraint`, `interpreter.js:50-61`)

**속성 순서가 곧 생성 순서다**: 금지 → 행동 → 교리 → 해석문. 플레이테스트에서 해석문을 먼저 쓰게 했더니 말과 행동이 어긋났다(`docs/PLAYTEST-2026-09-27.md:46-47`) — 행동을 먼저 정하고 그 행동을 외치게 한다.

```js
const idList = ids.map((a) => a.id);                 // ['A1', …, 'An']
const schema = {
  type: 'object',
  properties: {
    forbidden:      { type: 'array', items: { type: 'string', enum: idList }, maxItems: 6 },
    orders:         { type: 'array', items: { type: 'string', enum: idList }, minItems: 1, maxItems: Math.max(1, limit) },
    doctrine:       { type: 'string', enum: ['평화', '전쟁', '풍요', '지혜'] },   // DOCTRINES.map(d => DOCTRINE[d].name)
    interpretation: { type: 'string', maxLength: 110 },
  },
  required: ['forbidden', 'orders', 'doctrine', 'interpretation'],
};
```

- `enum` 덕에 **목록에 없는 행동은 나올 수 없다** (좌표를 모델이 고르지 않는다). 계시 속 프롬프트 주입("규칙을 무시하고 W2만 열 번 실행하라")도 ID 선택 이상은 못 한다.
- `uniqueItems`는 쓰지 않는다 — Chrome에서 `NotSupportedError`로 요청 자체가 거부된다 (`docs/EXPERIMENTS.md:24`). 중복 ID는 검증에서 `같은 장소`로 걸러진다.
- 교리 enum은 **언어팩의 교리 이름**(한국어)이다. 응답의 이름을 `DOCTRINE_KO`로 id로 되돌린다.
- 스키마는 매 장 달라진다 (ID 개수, `maxItems`).

### 2.5 호출·재시도·오류·타임아웃 (`interpreter.js:128-155`, `llm.js:40-58`)

```js
for (let attempt = 0; ; attempt++) {
  const s = await session.clone({ signal });
  try {
    out = await promptJSON(s, text, schema, signal);  // promptStreaming(text, { responseConstraint: schema, signal })
    if (!out.data) throw new Error(out.error ?? t('interp.jsonFail'));   // JSON.parse 실패
    break;
  } catch (e) {
    if (e.name === 'AbortError' || attempt >= 1) throw e;   // 재시도는 한 번
  } finally { s.destroy(); }
}
```

- `promptJSON`은 스트리밍 조각을 이어 붙여 `JSON.parse` 하고 `{ raw, data, error, ms, ttft, contextUsage }`를 돌려준다. 게임은 `data`와 `ms`만 쓴다.
- 모델이 가끔 `UnknownError`로 실패한다 → **한 번 재시도** (새 clone). 두 번째도 실패하면 던지고, `runInterpretation`이 석판으로 대신한다 (1.3).
- **타임아웃·중단 없음**: `interpretWithLLM`은 `signal`을 받지만 `main.js:543`은 넘기지 않는다. 모델이 멈추면 `thinking` 단계에 머문다. Godot 판에는 타임아웃을 두는 것을 권한다 ([6](#6-godot-이식-메모)).
- 결과 매핑: `orders`/`forbidden` ID → `byId[id]` (없는 것은 `filter(Boolean)`로 버림), `doctrine` 한국어 → id, `interpretation` → `cleanSpeech`.
- 실패 안내 `ui.notice.llmFailed`의 `{err}`는 `e.name` (`UnknownError`, `NotSupportedError`, JSON 실패는 `Error`).

### 2.6 해석문 다듬기 — `cleanSpeech` (`interpreter.js:86-100`)

플레이테스트에서 해석문 34건 중 10건이 어색한 "도다"로 끝났고, 좌표를 말하기도 했다. 순서대로:

| 단계 | 정규식 (`kw.clean.*`, 플래그 `g`) | 치환 |
|---|---|---|
| 1. 다른 문자 체계 제거 | `/[^\p{Script=Hangul}\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]/gu` (코드에 박힘) | `''` |
| 2. 좌표 표기 제거 | `\s*\(?[A-I][1-9]\)?(?=[\s,.!?을를이가에의]\|$)` | `''` |
| 3. 떠도는 "도다" | `([!.?])\s*도다\s*[!.?]?` | `$1` |
| 4. 명령형 뒤 "도다" | `(라\|어라\|아라\|하라\|리라\|지어다)\s+도다([!.?]?)` | `$1$2` |
| 5. 어간에 붙은 "도다" | `(본\|온\|간\|중요\|필요\|분명\|가능)도다` | `kw.clean.stemFix`: 본→보도다, 온→오도다, 간→가도다, 그 밖은 `{a}하도다` |
| 6. 공백 정리 | `/\s{2,}/g` → `' '`, `trim()` | |
| 7. 두 문장까지 | `t.match(/[^.!?]+[.!?]*/g)`의 앞 2개를 이어 붙임 | |

예: `택하라! 도다! 산 C1에서 돌을 캐라 도다. 이것이 중요도다. 세번째 문장이다.` → `택하라! 산에서 돌을 캐라.`
예: `ㅋㅋ 가라! 漢字 বাংলা 평원(C2)을 지켜라` → `ㅋㅋ 가라! 평원을 지켜라` (한글 자모는 Hangul 문자 체계라 남는다).
석판의 해석문에는 적용하지 않는다.

### 2.7 실험 기록 요약 (`docs/EXPERIMENTS.md`)

환경: Chrome 154 Canary, 내장 Gemma 4, 한국어 프롬프트, 행동 수 3, 계시당 3회 반복. 채점 세트는 `lab/scenario.js`의 `SAMPLES`(기본 10)·`HARD_SAMPLES`(심화 14: 은유·부정·사건 의존·모순·꼼수·인젝션).

| 버전 | 세트 | 의도 적중 | 교리 적중 | 평균 응답 | 바뀐 것 |
|---|---|---|---|---|---|
| v1 | 기본 | 80% | 70% | 2.1초 | 설명투, 기도로 칸 채우기 |
| v2 | 기본 | 100% | 100% | 1.8초 | 장소별 묶음, 자동 채우기 |
| v3 | 기본/심화 | 90% / 93% | 100% / 85% | 1.6~1.8초 | 경전 말투 |
| v4 | 기본/심화 | 100% / 93% | 96% / 81% | 1.5~2.0초 | `forbidden` 칸 추가 |
| v5 | 기본/심화 | 87% / 93% | 100% / 100% | 2.3~2.5초 | 예시 1개("다른 계시였다면") |

얻은 규칙: 스키마 강제는 매우 안정적(수백 회 파싱 실패 0) · `uniqueItems` 미지원 · 한국어 enum 가능 · `UnknownError` 재시도 1회 필요 · 부정은 별도 칸(`forbidden`)으로 · **금지 표현 목록은 역효과**(그 표현이 나온다) · **완성된 예시 문장은 통째로 복사된다** · 모호한 계시는 최근 사건으로 해석된다 · 같은 장소 충돌(5~10%)은 프롬프트로 안 풀려 엔진(`DOCTRINE_PREF`)이 푼다.
게임판 프롬프트는 v5 이후 플레이테스트를 반영해 **생성 순서를 금지→행동→교리→해석문으로 바꾸고**, 말투 예시에서 "도다"를 빼고, 해석문 상한을 110자로 두었다. (`docs/DESIGN.md`의 초안 스키마 — `interpretation` 먼저, `maxLength: 80`, 좌표 객체 — 는 옛것이다.)

---

## 3. 석판(키워드) 파서 — `interpretWithTablet` (`interpreter.js:157-217`)

LLM이 없을 때의 해석기이자, LLM 모드에서도 **입력 중 예감(칸 강조)·계시 제안 거르기·기이한 해석 판정**에 쓰인다. 결정론적이다.

### 3.1 규칙표 (순서가 곧 우선순위)

정규식 원본 (`ko/interp.js:84-100`, 플래그 없음):

```js
'kw.tablet.river':   '강|물고기',
'kw.tablet.hill':    '언덕',
'kw.tablet.preach':  '사랑|이웃|전하|설득|가르|개종|품어',
'kw.tablet.attack':  '분노|공격|싸우|싸움|쳐라|정복|불태|벌하|칼',
'kw.tablet.rest':    '쉬어|쉬라|안식|평화',
'kw.tablet.wall':    '지켜|지키|방패|성벽|막아|수호',
'kw.tablet.food':    '배고|굶|먹|곡식|수확|들판',
'kw.tablet.wood':    '나무|숲|목재',
'kw.tablet.stone':   '돌|산|바위',
'kw.tablet.village': '마을|넓혀|번성|퍼져|땅을',
'kw.tablet.temple':  '높은|높이|신전|탑|대성당',
'kw.tablet.pray':    '기도|경배|섬기|바쳐|찬양|믿음',
'kw.tablet.explore': '찾|보이지|안개|탐험|숨겨|너머',
'kw.negation':       '마라|말라|말지|지 ?마|피하|멀리',
'kw.clauseSplit':    '[.,!?。]|그리고|하되|그러나',
```

| # | 키 | 걸리는 행동 `match(a, tile)` | 교리 |
|---|---|---|---|
| 1 | `river` | `a.type==='gather' && tile.terrain==='river'` | abundance |
| 2 | `hill` | `a.type==='gather' && tile.terrain==='hill'` | wisdom |
| 3 | `preach` | `a.type==='preach'` | peace |
| 4 | `attack` | `a.type==='attack'` | war |
| 5 | `rest` | `a.type==='pray'` | peace |
| 6 | `wall` | `a.build==='wall'` | war |
| 7 | `food` | `a.gather==='food'` | abundance |
| 8 | `wood` | `a.gather==='wood'` | abundance |
| 9 | `stone` | `a.gather==='stone'` | abundance |
| 10 | `village` | `a.build==='village'` | abundance |
| 11 | `temple` | `a.build==='temple' \|\| a.build==='cathedral'` | wisdom |
| 12 | `pray` | `a.type==='pray'` | wisdom |
| 13 | `explore` | `a.type==='explore'` | wisdom |

장소가 드러난 규칙(강·언덕)이 먼저다 (`강물` → 강가 채집이 평원 채집보다 먼저).
그 앞에 **동적 규칙** 두 종류가 붙는다 (`interpreter.js:186-190`):
- **이름 규칙** (`state.names`의 각 `[tileId, name]`): `re = new RegExp(name)`, `match = a.tile === tileId`, 교리 없음.
- **신학 노트 규칙** (`state.lessons`): `re = new RegExp(l.word)`, `match = a.type===l.type && (!l.gather || a.gather===l.gather) && (!l.build || a.build===l.build)`, 교리 없음.

규칙 순서: `[...이름, ...신학 노트, ...TABLET_RULES]`.

### 3.2 알고리즘

```text
legal  = legalActions(state,'player')      # 순서가 결과를 정한다 (3.3)
limit  = actionLimit(state,'player')
orders = [], forbidden = [], doctrine = null
for clause in revelation.split(CLAUSE):    # 절 나누기 (구분자는 버림)
    negative = NEGATION.test(clause)
    for rule in [이름…, 노트…, TABLET_RULES…]:
        if not rule.re.test(clause): continue
        matches = legal.filter(a => rule.match(a, tileAt[a.tile]))
        if negative:
            forbidden.push(...matches)          # 걸린 행동 전부 금지
        else:
            if matches.length and rule.doctrine: doctrine ??= rule.doctrine   # 첫 교리만
            if matches.length:
                a = matches[0]                  # ★ 첫 후보만 본다 (for…of + 무조건 break)
                if orders.length < limit and no order on a.tile: orders.push(a)
verbs = orders.map(a => a.text에서 끝의 " (…)" 제거)
interpretation = orders.length
    ? `${prefix} ${verbs.join(', 그리고 ')}!`      # prefix = voiceOf(state)(3칸) ? DOCTRINE_VOICE[v].prefix : '석판에 새겨진 말씀이도다.'
    : '석판의 말씀이 흐릿하도다. 각자 할 일을 하라.'
return {
  interpretation,
  orders: orders.filter(a => forbidden에 같은 key 없음),
  forbidden,
  doctrine: doctrine ?? (forbidden.length ? 'peace' : null),
  source: 'tablet',
}
```

세부 규칙 (코드 그대로 따라야 골든이 맞는다):
- **절 나누기**는 `String.split(정규식)` — 구분자(`. , ! ? 。`, `그리고`, `하되`, `그러나`)를 버린다. 캡처 묶음이 없다.
- **부정**은 절 단위. 부정 절에서는 명령을 하나도 만들지 않고, 걸린 규칙의 **모든** 가능한 행동을 금지한다 (여러 규칙이 같은 행동을 걸면 중복된다).
- **한 규칙은 한 절에서 행동 하나까지**, 그것도 `legal` 순서의 **첫 후보만**. 첫 후보의 칸이 이미 쓰였거나 행동 수가 찼으면 다른 후보를 찾지 않는다. 그래서 `곡식을 거두라, 곡식을 거두라, …`를 네 번 써도 명령은 하나다.
- **가능한 행동이 없는 규칙은 교리를 정하지 않는다** (`평화를 지켜라`가 성벽이 없다고 전쟁이 되지 않게).
- 이름·노트 규칙은 교리가 없다. 첫 교리는 규칙 순서(절 순서 → 규칙표 순서)로 정해지고 **계시 속 낱말의 위치와는 무관**하다.
- 교리가 끝내 없고 금지만 있으면 `peace` (절제의 말).
- 해석문은 금지로 걸러지기 **전** `orders`로 만든다 (드물게 금지된 행동을 말할 수 있다).
- 사제 성향(`PRIESTS`)은 석판에 영향이 없다. 교리 말투 머리말만 쓴다.

### 3.3 행동 순서에 대한 의존

석판은 "규칙에 맞는 **첫** 가능한 행동"을 고르므로 `legalActions`의 순서가 곧 **대상 칸 선택 규칙**이다 (`engine.js:359-395`):

1. `reach(state,'player')`의 칸 순서 — 소유 칸을 `state.tiles`(행 우선) 순서로 돌며, 각 칸에서 반경(수도 2, 마을 1) 안의 칸을 `state.tiles` 순서로 처음 본 것부터 (`engine.js:207-214`). 칸마다: 채집 → 마을 건설 → 선교 → 공격.
2. 성벽 (소유 건물 칸, `state.tiles` 순서).
3. 수도: 기도 → 신전 → 대성당.
4. 탐험 (닿는 범위 바로 바깥 안개 칸; `reach` 순서 × `neighbors` 방향 순서).

따라서 Godot 판은 `tiles` 배열 순서(행 우선), `reach`의 순회, 육각 이웃 방향표(`engine.js:40-43`)를 **JS와 똑같이** 해야 석판 결과가 같다. (상세는 [02 규칙](02-rules.md).)

### 3.4 알려진 한계 (의도된 절충 포함)

| 계시 | 결과 | 까닭 |
|---|---|---|
| `두려워하지 말고 쳐라` | 공격 (의도대로) | `말고`는 부정어가 아니다 (`지 ?마`는 `마`를 요구) |
| `숲을 베지 말고 산에서 돌을 캐라` | 숲 채집 **명령** + 돌 채집 | 같은 까닭. 쉼표로 나누면(`마라,`) 금지로 잡힌다 |
| `나를 위한 높은 곳을 마련하라` (신전 비용 부족) | 명령 없음, 교리 없음 | 신전 행동이 불가능 → 규칙이 아무것도 안 함 |
| `방패가 되어라` (돌 부족) | 명령 없음 | 성벽 불가능 |
| `불` | 명령 없음 | 규칙에 없음 (LLM은 사건으로 해석) |
| `강물이 너희를 먹이리라` (강이 안개 속) | 평원 곡식 | 강 규칙에 후보가 없어 `먹` → 식량 규칙 |
| `Love thy neighbor` | 명령 없음 | 한국어 어간만 안다 |
| `검은숲을 사랑하라` (A1에 `검은숲` 이름) | A1 채집 + 선교, 교리 평화 | 이름 규칙은 그 칸의 **첫** 행동(채집)을 고른다 |

### 3.5 말과 행동 잇기 — `linkWords` (`interpreter.js:221-240`)

확인 화면의 밑줄·빛줄기, 판결문, 기이한 해석 판정에 쓴다. **받아들인 행동마다** 그 행동을 부른 낱말 하나를 찾는다. 먼저 찾은 것이 이긴다:

1. 그 칸의 이름(`state.names[a.tile]`)이 계시에 들어 있으면 그 이름.
2. 신학 노트: `revelation.includes(l.word) && a.type===l.type && (!l.gather || a.gather===l.gather)` (건설 종류는 보지 않는다).
3. 석판 규칙 순서대로: `m = revelation.match(rule.re)`(계시 전체에서 첫 일치)가 있고 `rule.match(a, tile)`이면 `m[0]`.
4. 그 칸의 **지형 이름**(`TERRAIN[tile.terrain].name`, 예: `숲`, `평원`)이 계시에 있으면 그 이름.

출력 `{ [a.key]: 낱말 }`. LLM이 고른 행동에도 같은 규칙을 쓴다 (그래서 LLM이 자유롭게 해석해도 밑줄이 그어진다).

### 3.6 신학 노트와 명사 뽑기

**`nouns(text)`** (`lore.js:17-30`) — 한국어 명사 후보를 거칠게 뽑는다:

```text
for raw in text.split(/[^가-힣]+/):                       # kw.nounSplit — 한글 음절 덩어리만
    if raw.length < 2 or VERBISH.test(raw): continue      # 동사 어미로 끝나면 버림
    w = raw.replace(PARTICLE, '')                         # 끝의 조사 하나 떼기
    if w.length >= 2 and w not in STOP and not VERBISH.test(w): out.push(w)
```

```js
'kw.particle': '(에게서|에게|에서|으로|이여|이시여|께서|까지|부터|처럼|같이|을|를|이|가|은|는|에|로|와|과|의|도|만|여|아|야)$',
'kw.verbish':  '(라|다|오|자|니|며|고|면|서|리라|하라|마라|지어다|노라|도다|소서|하리|되리|이리|어라|아라|거라|느냐)$',
'kw.stop':     ['너희', '우리', '나의', '너의', '그들', '저들', '이제', '모두', '함께', '그리고', '그러나', '오늘', '다시', '반드시', '결코', '영원히'],
```

예: `이 강을 요단이라 부르라. 요단의 물고기를 거두어라` → `['요단', '물고기']` (`강`은 한 글자라 빠진다). `빛나는 등불을 따라가라` → `['빛나', '등불']` (형용사도 섞인다).

**`extractLesson(state, revelation, orders)`** (`interpreter.js:242-253`) — **LLM 경로에서만**, 해결 뒤에 부른다 (`main.js:731`):
1. `words = nouns(revelation)` 중 석판 규칙 어느 것에도 안 걸리고(`BASIC` = 모든 `kw.tablet.*` 원본을 `|`로 이은 정규식), `kw.lessonStop`에 없고, 붙인 이름이 아닌 것.
2. 없으면 `null`. 있으면 `words[0]`이 이미 노트에 있으면 `null`.
3. 아니면 `{ word: words[0], type, gather, build }` — **받아들인 첫 명령**(`accepted[0]`)의 종류를 그 낱말의 뜻으로 배운다.
4. `state.lessons`에 넣고 **최대 3개** (넘으면 가장 오래된 것부터 버림). 재생이 끝나면 사제가 `깨달았나이다. 신께서 '{word}'이라 하시면 {뜻}을 뜻하시는군요.`라고 말한다. 연대기에서 하나씩 **잊게 하기** 가능 (`main.js:2346`).

```js
'kw.lessonStop': ['신도', '말씀', '백성', '부족', '율법파', '율법', '계절', '이번', '신이', '신께서', '나의', '모든'],
```

노트는 이후 LLM 프롬프트(`대사제가 깨달은 신의 말버릇`)와 석판 규칙에 쓰인다 → **LLM이 가르친 말버릇을 석판도 알아듣는다**.

### 3.7 석판의 다른 쓰임

| 쓰임 | 위치 | 어떻게 |
|---|---|---|
| 입력 중 예감 | `scheduleHints` (`main.js:2274-2285`) | 입력 멈춤 250ms 뒤 `interpretWithTablet(draft).orders`의 칸(최대 6)을 보드에 흐리게 강조. LLM 결정과 다를 수 있다 |
| 계시 제안 칩 | `suggestions` (`main.js:2232-2243`) | 후보 문장 중 석판으로 명령이 1개 이상 나오고 봉인어가 없는 것만 ([4.20](#420-계시-제안과-예감)) |
| 기이한 해석 | `derivePending` (`main.js:586-589`) | LLM 명령이 석판 명령과 하나도 겹치지 않는가 ([4.6](#46-기이한-해석)) |
| LLM 실패 대체 | `runInterpretation` | 1.3 |

---

## 4. 말이 규칙이 되는 장치

요약표 (자세한 것은 아래 절). "은총"은 장당 1 상한이 있는 신앙 보상 ([4.7](#47-은총과-상한)).

| 장치 | 탐지 | 효과 | 첫 판에도? |
|---|---|---|---|
| 말투 | `kw.tone.*` | 축복: 첫 채집 +1 / 저주: 공격 +1, 신앙 -1 / 비유: 교리 +1 추가 | 예 |
| 이름 붙이기 | `kw.naming` | 칸 이름, 은총 +1, 첫 이름 지혜 +1 | 예 |
| 예언 | `kw.prophecy.*` + 봉인 체크 | 이루면 신앙 +4/3/2, 빗나가면 -2 | 예 |
| 청원 | 명령 종류 또는 `kw.petition.*` | 답하면 은총 +1, 두 번 외면하면 신앙 -1 | 예 |
| 서원 | 금지한 공격·선교를 끝까지 안 함 | 은총 +1, 공격 금지는 율법파가 노린다 | 예 |
| 기이한 해석 | LLM 명령이 계시와 무관 | 판당 한 번 은총 +1 | 예 (LLM만) |
| 인용 | 최근 3장 계시와 겹치는 명사 | 긴 계시도 비용 1 | 예 |
| 성언 | 세 번 되풀이한 구절 | 그 구절이 든 계시는 비용 1 | 두 번째 판부터 |
| 영원한 계명 | `kw.eternal` + 계명 정규식 + 체크 | 판 끝까지 규칙 변경 | 두 번째 판, 3장부터 |
| 말한 기적 | `kw.miracle.*` (손패에 있을 때) | 수락 때 기적 시전 | 예 |
| 침묵 | 글자 없음 / 침묵 버튼 | 연속 침묵 페널티 | 페널티는 두 번째 판부터 |
| 검열 | 율법 카드 L10 | 봉인어를 쓰면 비용 +1 | 두 번째 판, 보통 이상 |
| 교리 기록 | 해석 결과 `doctrine` | 교리 +1, 대립 -1, 3연속 기적, 율법파 반응 | 대립은 두 번째 판부터 |
| 숨은 말 | `kw.data.sacred.*.word` | 성서 기록 (수치 없음) | 오늘의 계시만 |
| 갈림길 응답 | `kw.data.event.*.tags` | 버튼 대신 말로 선택 | 두 번째 판(두 갈래 사건) |
| 전설이 된 땅 | 명한 행동이 점령·개종·대성당 | 칸 별칭 + 인용 | 예 |
| 사제·말투 | 판마다 사제, 교리 깊이 | 프롬프트 한 줄, 석판 머리말 | 사제는 두 번째 판부터 |
| 지도자 대사 | 계시 첫 명사 | 반박 대사 | 예 |
| 판결문 | 명령 성공률 | 성취/반쯤/빗나감/기이 도장 | 예 |

### 4.1 말투

`lore.js:83-90`, `engine.js:624-629`, `data.js:73-79`.

```js
'kw.tone.curse':    '저주|멸하|망하리|벌하리|재앙',
'kw.tone.blessing': '축복|복을|복되|복이|번성하라|은혜',
'kw.tone.metaphor': '처럼|같이|듯|마냥',
```

탐지 우선순위: **저주 > 축복 > 비유 > 명령**(아무것도 없음). 석판·LLM 공통 (원문만 본다). 수락 때 `applyTone`:

| 말투 | 효과 | 코드 |
|---|---|---|
| 축복 `blessing` | `roundMods.gatherBonus = 1` → 이번 장 **플레이어의 첫 채집** +1 (그 채집에서 소모) | `engine.js:335`, `1086` |
| 저주 `curse` | `roundMods.attackBonus = 1` → 이번 장 **모든** 플레이어 공격 주사위 +1, 그리고 즉시 신앙 -1 (0 미만 없음) | `engine.js:628`, `1158` |
| 비유 `metaphor` | `recordRevelation(..., extra=1)`: 교리 +1 뒤에 그 교리가 아직 3(`graceDoctrineBelow`) 미만이면 +1 더 (최대 6) | `engine.js:1314-1316` |
| 명령 `command` | 없음 | |

- 침묵이면 `applyTone(null)` (보너스 지움).
- 확인 화면 승률(`actionOdds`)은 저주면 공격 +1을 미리 반영한다.
- `같이`(함께), `벌하리`(석판 공격 어간 `벌하`와 겹침) 같은 오탐이 있다.

### 4.2 이름 붙이기

`lore.js:92-102`, `engine.js:609-622`.

```js
'kw.naming': String.raw`(강물|강|숲|산|평원|들판|들|언덕|사막|마을|신전)(?:을|를)\s*['"“‘]?([가-힣]{1,6}(?:\s[가-힣]{1,4})?)['"”’]?\s*(?:이)?라\s*(?:부르|칭하|하라|이름)`,
'kw.namingTail': '(이)$',
'kw.nameable': { 강: 'river', 강물: 'river', 숲: 'forest', 산: 'mountain', 평원: 'plain', 들판: 'plain', 들: 'plain', 언덕: 'hill', 사막: 'desert', 마을: 'village', 신전: 'capital' },
```

**탐지 `parseNaming`**: `m = text.match(NAMING)`; `name = m[2].replace(/(이)$/, '').trim()` (탐욕적 매칭 때문에 `요단이라`의 `이`가 이름에 붙어 나오는 것을 뗀다); 길이 2~8이 아니면 무시 (한 글자 이름은 다른 말과 너무 쉽게 겹친다); `{ kind: NAMEABLE[m[1]], name }`.

| 계시 | 결과 |
|---|---|
| `이 강을 요단이라 부르라` | `{ kind: 'river', name: '요단' }` |
| `저 숲을 검은 숲이라 하라` | `{ kind: 'forest', name: '검은 숲' }` |
| `산을 '시온'이라 칭하라` | `{ kind: 'mountain', name: '시온' }` |

**새기기 `nameTile`** (계시를 낼 때, 해석 **전**):
- 판당 이름 `RULES.maxNames = 3`개까지.
- 후보: **보이는** 칸 중 `kind`에 맞는 칸 — `village`는 우리 마을, `capital`은 우리 수도, 그 밖은 `terrain === kind && !building`; 이미 이름이 있거나 같은 이름이 쓰인 칸은 제외.
- 우리 수도에서 **가장 가까운** 칸 (거리 같으면 `state.tiles` 순서 — 안정 정렬).
- `state.names[tile] = name`, `{ tile, first }` (`first` = 이 판의 첫 이름).

**효과**
- 칸 이름이 `요단(D3)`처럼 바뀌어 프롬프트·기록·UI 전부에 쓰인다.
- 석판 **이름 규칙**, `linkWords` 1순위, 말한 번개의 표적 선택([4.10](#410-말한-기적)).
- 수락 뒤 `wordsAfter`: 은총 +1 (`{장소}를 '{이름}'이라 부르게 했다`).
- 첫 이름이면 해결 뒤 지혜 +1 (지혜 < 3일 때, `main.js:729`).
- 전설이 된 땅은 이름 있는 칸에 붙지 않는다. 소명 「부르는 이름」(이름 셋), 업적 `namer`.
- 말을 거두면 이름도 되돌려진다 (스냅숏이 이름 전).

### 4.3 예언 (`lore.js:104-119`, `engine.js:631-660`, `data.js:81-90`)

```js
'kw.prophecy.capital': '(탑|수도|성채).*(무너|흔들|부서|쓰러)',
'kw.prophecy.fall':    '(마을|땅|성벽).*(무너|함락|빼앗|불타|부서)|(무너|함락).*(마을|땅)',
'kw.prophecy.convert': '(개종|돌아오|돌아서|품으|말씀을 받)',
'kw.prophecy.pop':     '(불어나|번성|늘어나|자손|태어나)',
'kw.prophecy.future':  '리라|리니|것이다|되리|지리',
'kw.prophecy.negated': String.raw`지\s*않|지\s*못|아니하|마라|말라|지\s*마`,
'kw.prophecy.big':     String.raw`(\d+)\s*(장|계절|번)`,
'kw.prophecy.count':   String.raw`(한|두|세|1|2|3)\s*(장|계절|번)`,
'kw.prophecy.numbers': { 한: 1, 두: 2, 세: 3 },
```

**탐지 `parseProphecy`** ("~하리라"만으로는 걸지 않는다):
1. 유형: capital → fall → convert → pop 순으로 첫 일치. 없으면 `null`.
2. 미래형(`future`)이 없으면 `null`.
3. 부정(`negated`)이 있으면 `null` (부정하는 예언은 봉인하지 않는다).
4. `big`의 수가 3보다 크면 `null` (`5장 안에…`).
5. 기한 `count` → 수 낱말/숫자, 없으면 **2**. 1~3으로 자른다.

| 계시 | 결과 |
|---|---|
| `율법파의 탑이 두 장 안에 무너지리라` | `{ kind: 'capital', rounds: 2 }` |
| `마을이 무너지리라` | `{ kind: 'fall', rounds: 2 }` |
| `신도가 불어나리라` | `{ kind: 'pop', rounds: 2 }` |
| `탑이 무너지지 않으리라` | `null` (부정) |
| `5장 안에 개종하리라` | `null` (기한 초과) |

**봉인**: 이미 예언이 걸려 있으면 파싱하지 않는다 (동시에 하나). 확인 화면 체크 상자(기본 해제)를 켜고 수락하면, **해결 전에** `sealProphecy`:

```js
state.prophecy = { kind, rounds, sealed: round, due: round + rounds - 1,
  base: { villages: 적 마을 수, hp: 적 수도 내구도, pop: 우리 신도, converted: stats.converted, captured: stats.captured } };
```

**판정** `checkProphecy` — 매 장 유지 단계 끝 무렵 (봉인한 장부터):

| 유형 | 이루어짐 조건 (기준 대비) |
|---|---|
| `fall` 율법파의 마을이 무너지리라 | `stats.captured > base.captured` (공격으로 **빼앗은** 칸. 선교로 넘어온 마을은 세지 않음) |
| `capital` 율법파의 탑이 흔들리리라 | `enemy.capitalHp < base.hp` |
| `pop` 신도가 불어나리라 | `player.pop >= base.pop + 2` |
| `convert` 이웃이 말씀으로 돌아오리라 | `stats.converted > base.converted` |

- 이루면 신앙 `+PROPHECY.reward[rounds]` = **1장 +4, 2장 +3, 3장 +2** (은총 상한과 무관), `stats.prophecies += 1`.
- 못 이룬 채 `round >= due`면 신앙 **-2** (0 미만 없음).
- 진행 중이면 두루마리 위에 `봉인된 예언 — "…" — N장 남음` (`N = due - round + 1`).

### 4.4 청원 (`engine.js:580-607`, `main.js:761-769`)

매 장 시작(`startRound`)에 한 신도가 가장 급한 것을 묻는다. 이름은 `hashPick(PETITIONERS, seed, round, 'petitioner')`. 위에서부터 첫 조건:

| 조건 | 필요(need) | `alt` | 응답 정규식 (`kw.petition.*`) |
|---|---|---|---|
| 가뭄 또는 식량 < 신도 | 채집(식량) | | `강\|물\|곡식\|들\|먹\|거두\|수확` |
| 율법파의 보이는 공격 의도 | 성벽 건설 | 공격 | `지키\|막\|성벽\|방패\|쳐\|싸우` |
| 신앙 ≤ 2 | 기도 | | `기도\|경배\|믿\|섬기\|찬양` |
| 역병 | 기도 | | `기도\|치유\|살리\|낫\|지키` |
| 떠돌이 예언자 | 탐험 | | `안개\|찾\|탐험\|너머\|보물` |
| 신도 ≥ 인구 한도 | 마을 건설 | | `마을\|터\|넓\|세우` |
| 목재 < 2 | 채집(목재) | | `숲\|나무\|목재\|베` |
| (그 밖) | 없음 — 한가한 물음 | | |

**응답 판정 `petitionAnswered(state, text, accepted)`**: 받아들인 명령 중 need와 종류가 맞는 것(채집 자원·건설 종류까지)이 있거나, `alt` 종류 명령이 있거나, **계시에 응답 정규식이 걸리면** 답한 것.
**수락 뒤 `wordsAfter`**: need가 있을 때 — 답했으면 `stats.petitions += 1`, 외면 횟수 0, **은총 +1**. 못 답했으면 외면 횟수 +1, **2에 이르면** 0으로 되돌리고 신앙 -1 (`청원이 거듭 외면당해…`). 침묵도 외면으로 센다. (정규식은 문자열로 `state.petition.keys`에 저장된다 — 저장·복원용.)

### 4.5 서원 (금욕) — `keepVows` (`engine.js:1357-1365`)

수락 뒤(계시가 있을 때):
1. `types` = 해석 결과 `forbidden` 중 `attack`/`preach` 종류 (중복 제거). 없으면 끝.
2. `attack`이 들어 있으면 `state.vowNext = 'attack'` → **다음 장 율법파가 「성전」(L5) 카드를 앞당겨 쓴다** (쉬움·튜토리얼 제외, `REACT.vow`).
3. 이번 장 계획(자동 노동 포함)에 그 종류가 하나라도 있으면 끝(은총 없음).
4. 아니면 **은총 +1** (`칼을 거두는 서원을 지켰다`), `stats.vows += 1`.
금지는 가능한 행동에서만 나오므로 "할 수 있었던 공격·선교를 금한" 경우만 해당된다. 확인 화면의 금지 칩에 `서원 · 지키면 은총`이 붙는다.

### 4.6 기이한 해석

`main.js:585-589`, `755-760`. 처음 해석(칩을 빼기 전)에서 **한 번** 정한다:
`!state.oddUsed && source === 'llm' && accepted.length > 0 && linkWords 결과가 비었음 && 석판 명령과 받아들인 명령이 키 하나도 안 겹침`.
수락 뒤 은총 +1 (`신께서 '{계시 첫 명사}'이라 하셨으나 사제는 '{첫 명령}'으로 들었다 — 기이한 해석`)을 받으면 `state.oddUsed = true` — **판당 한 번**. 판결문 도장이 `기이`가 된다.

### 4.7 은총과 상한

`grantGrace` (`engine.js:569-578`):

```js
if (state.grace.round !== state.round) state.grace = { round: state.round, used: 0 };
give = max(0, min(n, RULES.gracePerRound /* 1 */ - state.grace.used));
```

**장당 신앙 1까지.** 부르는 순서: 서원(`keepVows`) → 기이한 해석 → 청원 → 이름. 먼저 받은 하나만 효과가 있다. 예언 보상·연속 기적·기적은 은총이 아니다.

### 4.8 성구 인용과 성언

**인용 `citedWords(state, text)`** (`lore.js:41-46`):
`past` = `round-3 ≤ r.round < round`인 계시들의 명사 집합. 이번 계시의 명사(중복 제거) 중 `past`에 있고, `kw.citeStop`에 없고, 봉인어가 아닌 것.
효과: 31자 이상이어도 **비용 1** ([1.2](#12-계시-비용)). 확인 화면 `인용 · '등불'` 태그와 밑줄.

```js
'kw.citeStop': ['신도', '말씀', '백성', '부족', '율법파', '율법', '마을', '우리', '너희'],
```

**성언 `findLiturgy(texts)`** (`lore.js:63-81`, `engine.js:974-982`) — 두 번째 판부터, 판당 하나, 계시를 기록할 때마다(`recordRevelation` 뒤) 찾는다:
1. 각 계시에서 한글·공백 외 문자를 공백으로(`kw.liturgyStrip` = `[^가-힣\s]`, `g`), 공백으로 나눈 낱말 목록.
2. 모든 위치에서 **1낱말·2낱말 구절**(공백 하나로 이음) 중 공백 뺀 글자 수 **4~8**인 것을, 계시마다 한 번씩 센다.
3. **3개 이상의 계시**에 나온 구절 중 문자열이 가장 긴 것 (같으면 먼저 센 것).
예: `빛이 있으라 강을 보라` / `… 숲을 보라` / `… 산을 보라` → `빛이 있으라`.
효과: `state.liturgy`에 새기고 기록(`성언이 생겼다 — 「…」. 이 구절은 이제 신앙 1로 전해진다.`). 이후 그 구절을 포함한 계시는 **길어도 비용 1**, 확인 화면에 `성언 「…」` 태그.

### 4.9 영원한 계명 (`lore.js:55-61`, `engine.js:965-973`, `data.js:216-223`)

- 새길 수 있음 `canCarve`: 두 번째 판 && 튜토리얼 아님 && `round >= 3` && 계명 < `MAX_COMMANDMENTS = 2`.
- 탐지: `kw.eternal` = `영원히|영원토록`이 **있어야** 하고, 그다음 계명표 순서(noSword → noExpand → sabbath → noFamine)로 첫 일치.
- 이미 새긴 계명, 시련 「대지모」의 `noSword`는 제외.
- 확인 화면 체크 상자(기본 해제). 수락 때 체크돼 있으면 **해결 전에** 새긴다 — 이번 장부터 지키므로 충돌 명령(`noSword` → 공격, `noExpand` → 마을 건설)을 빼고 `autoFill`로 채운다 (`main.js:712-718`). 되돌릴 수 없다.

| id | 탐지 정규식 (`kw.data.commandment.*.re`) | 효과 (판 끝까지) |
|---|---|---|
| `noSword` 칼을 들지 말라 | `(칼\|싸우\|공격\|치지\|쳐)[^.!?]*(말라\|마라\|않)` | 공격 행동이 목록에서 사라짐. 선교 주사위 +1 (교리·성인과 합쳐 최대 +2) |
| `noExpand` 땅을 넓히지 말라 | `(땅\|마을\|넓히)[^.!?]*(말라\|마라\|않)` | 마을 건설 불가. 신전 돌 비용 -1 |
| `sabbath` 안식하라 | `(안식\|쉬어\|쉬라\|쉬리라)` | `round % 4 === 0`인 장: 행동 수 -2 (최소 1), 기도 신앙 ×2 |
| `noFamine` 굶기지 말라 | `(굶기지\|굶주리지\|굶지\|배곯지)` | 매 장 식량 -1 추가 소비, 대신 식량이 모자라도 굶어 죽지 않음 |

### 4.10 말한 기적

`lore.js:48-53`, `main.js:592-608`.

```js
'kw.miracle.lightning': '번개|벼락|불을 내려|불벼락',
'kw.miracle.rain':      '단비|비를 내려|비가 내리|비를 부어',
'kw.miracle.bounty':    '풍요를 내려|넘치게 하',
'kw.miracle.manna':     '만나|양식을 내려',
'kw.miracle.ark':       '방주',
'kw.miracle.tongues':   '방언|혀를 풀',
'kw.miracle.pillar':    '불기둥',
'kw.miracle.revive':    '부활|되살아|일어나라|일으켜',
```

- `parseMiracle(text, hand)`: **손패 순서대로** 첫 일치 id. 손에 없는 기적의 낱말은 무시.
- `spokenMiracle`: 이번 장 기적을 아직 안 썼고 신앙 ≥ `miracleCost`(분노만큼 할인, 최소 1)일 때만 (신앙은 계시 비용을 치른 뒤 값).
- 번개 표적: 계시에 이름이 나온 **율법파 칸** → 없으면 보이는 율법파 칸 중 마을 먼저, 우리 수도에서 가까운 순. 표적이 없으면 기적 없음.
- 확인 화면에 기적 칩(`기적 · 신앙 N`)으로 나오고, 칩처럼 뺄 수 있다 (뺀 칩 2개 한도에 포함).
- 수락 때 **다른 무엇보다 먼저** `castMiracle` (말투·갈림길 비용에 밀려 실패하지 않게). 기적 효과는 [02 규칙](02-rules.md).

### 4.11 침묵

`main.js:630-644`, `engine.js:933-945`. 침묵 = 침묵 버튼, 또는 글자(`kw.ui.speech`)가 없는 계시. 비용 없음, 대사제를 부르지 않는다.
- 계획: **기도 먼저** + `autoFill`. 해석문은 `신께서 침묵하셨다. 고요 속에…` (연속이면 `신께서 또 침묵하셨다…`).
- 교리 기록 없음, 연속 교리 끊김(`streak = null`), 청원은 외면으로 셈.
- 해결 뒤 `applySilence(state, spoke=false)`: `silentRun += 1` (계시를 내리면 0으로).

| 연속 | 첫 판 / 튜토리얼 | 두 번째 판부터 |
|---|---|---|
| 1번째 | 없음 | 없음 |
| 2번째 | 기록만 (`신의 침묵이 길어진다…`) | 신앙 -1 |
| 3번째부터 매번 | 기록만 | 신도 > 1이면 신도 -1, **율법파 신도 +1** (`신이 떠났다고 수군댄다…`) |

(갈림길 「미라 — 화해시킨다」는 `silentRun`을 0으로 되돌린다.)

### 4.12 검열 (봉인된 말)

`engine.js:1242-1246`, `528-530`, `lore.js:32-39`.

- 율법 카드 L10 「검열」(`ban: true`) — 두 번째 판 && 난이도 보통 이상일 때만 덱에 든다.
- 그 카드를 쓴 장의 유지 단계에서 `bannedNext = frequentNoun(state.revelations)` — 지금까지 계시에서 **가장 많은 계시에 나온 명사**(계시당 한 번 세기, 동률이면 먼저 나온 것). 명사가 없으면 `hashPick(eng.banWords = ['분노','사랑','번개','전쟁','풍요'], seed, round)`.
- **다음 장에만** `state.bannedWords = [그 말]`.
- 효과: 그 말을 **부분 문자열로** 포함한 계시는 비용 +1. 인용 낱말에서 제외. 제안 칩에서 제외. 두루마리에 `봉인 · '{word}'` 칩, 입력에 걸리면 붉게.

### 4.13 교리 기록·대립·연속 기적·율법파 반응 (`engine.js:1311-1355`, `500-554`)

`recordRevelation(state, text, doctrine, extra)` — 해결 **뒤**:
1. `doctrine`이 있고 6 미만이면 +1. 비유면 [4.1](#41-말투)의 추가 +1.
2. `state.revelations.push({ round, text, doctrine })`. 승패가 났으면 여기서 끝.
3. `doctrine`이 없으면 `streak = null`.
4. **교리 대립** (두 번째 판, 튜토리얼 아님): 반대 교리(`OPPOSED`: 평화↔전쟁, 풍요↔지혜)가 이미 얻은 특전 칸(0/2/4/6) 위에 있으면 -1.
5. **연속**: 같은 교리면 `n+1`, 아니면 1. **3에 이르면** 초기화하고 작은 기적:

| 교리 | 3연속 기적 |
|---|---|
| 평화 | 율법파 신도 > 0이면 율법파 -1, 우리 신도 +1 (한도 안에서) |
| 전쟁 | 우리 수도에서 가장 가까운 보이는 율법파 성벽 하나 무너짐. 없으면 율법파 신앙 -2 |
| 풍요 | 식량 +4 |
| 지혜 | 우리 땅에서 2칸 안의 안개가 걷히고 발견지 판정 |

확인 화면에 `{교리} 세 장째 — 말씀이 이어지면 기적` 태그 (현재 streak가 같은 교리 2일 때).
**율법파가 들었다** (`startRound`): 지난 장 계시의 교리(또는 서원 `vowNext`)에 맞서는 율법 카드를 앞당긴다 — 전쟁→L4/L3, 평화→L7, 풍요→L2/L9, 지혜→L6, 서원→L5 (쉬움·튜토리얼 제외). 보통: 뽑힌 카드가 맞서는 카드가 아니면 덱 위 세 장 중 맞서는 카드와 맞바꾼다. 어려움: 두 장의 위협 점수(`lawThreat`)에 맞서는 카드면 +2를 더해 비교한다 (`engine.js:532-554`). 지도자가 `REACT[...].line`으로 말한다.

### 4.14 오늘의 숨은 말 (`engine.js:84`, `983-988`)

- **오늘의 계시(daily) 모드에서만**: `state.sacred = hashPick(SACRED_WORDS, 'sacred', config.daily)`. 단어: 무지개·등불·씨앗·샘물·새벽·소금·날개 (`kw.data.sacred.*.word`), 각각 단서 문장이 있다.
- 두루마리 위 `오늘의 숨은 말 — 단서 — "…" (N글자)`.
- 수락 때 `text.includes(word)`면 한 번만 `stats.sacred = 1`, 기록 `숨은 말 「…」을 찾았다! 성서에 새겨진다.` 수치 효과는 없다.

### 4.15 갈림길 응답 (`engine.js:990-995`)

두 갈래 사건(두 번째 판부터 덱에 셋)과 분열의 예언자 미라는 버튼으로 고르거나 **계시의 말로** 답한다: `dilemmaByText` = 선택지 순서대로 `new RegExp(o.tags).test(text)`의 첫 일치. 우선순위 `계시로 고른 것 > 버튼 > 첫 선택지`. 확인 화면 `이 사건에 대한 뜻 · {선택}` 태그. 태그 정규식은 `ko/data.js:155-215`.

### 4.16 전설이 된 땅 (`engine.js:947-963`)

계시로 **명한** 행동(자동 노동 제외)이 그 장에 점령·개종으로 칸이 넘어옴·대성당을 이뤘으면, 그 칸(이름 없고 성지 아니고 아직 전설 아닌 칸)에 별칭: `{교리 형용사 | N장의} {신전|마을|지형}` (분노의/빛의/넘치는/별의). 인용 `text.slice(0, 24)`. 판당 3개.

### 4.17 사제 성향과 교리 말투

**사제** (`data.js:92-99`) — 수치 효과 없음. 첫 판(과 튜토리얼)은 `loyal`, 두 번째 판부터 `hashPick(['literal','dreamer','zealot','cautious'], 'priest', seed)`. LLM 프롬프트에 한 줄:

| id | 이름 | 프롬프트 |
|---|---|---|
| `loyal` | 충직한 사제 엘리 | (없음) |
| `literal` | 문자주의자 오르 | `대사제의 성향: 비유를 싫어하고 계시에 나온 낱말 그대로의 행동을 고른다.` |
| `dreamer` | 몽상가 이펜 | `대사제의 성향: 계시를 비유로 읽기를 좋아하고, 숨은 뜻에 맞는 행동을 고른다.` |
| `zealot` | 열혈 사제 테사 | `대사제의 성향: 뜻이 모호하면 율법파와 맞서는 행동(공격, 선교)을 먼저 떠올린다.` |
| `cautious` | 신중한 사제 무트 | `대사제의 성향: 뜻이 모호하면 부족을 지키고 먹이는 행동(채집, 성벽, 기도)을 먼저 떠올린다.` |

**교리 말투 `DOCTRINE_VOICE`** (`data.js:138-144`) — `voiceOf(state, min)`: 가장 깊은 교리(동률이면 **지혜** 우선, 그다음 평화→전쟁→풍요 순의 먼저 것 — `reduce` 초기값이 `'wisdom'`이고 `>`로 비교)가 `min` 이상이면 그 교리.

| 교리 | 4칸↑: LLM 프롬프트 줄 | 3칸↑: 석판 머리말 |
|---|---|---|
| 전쟁 | `말투: 짧고 거칠게, 불과 칼의 비유로.` | `불이 말하노니,` |
| 평화 | `말투: 부드럽고 따뜻하게, 빛과 물의 비유로.` | `빛이 속삭이노니,` |
| 풍요 | `말투: 넉넉하고 흥겹게, 곡식과 잔치의 비유로.` | `곳간이 노래하노니,` |
| 지혜 | `말투: 수수께끼처럼, 별과 안개의 비유로.` | `수수께끼로 이르노니,` |

3칸 이상이면 확인 화면 해석문에 교리 먹빛(`voice-<교리>` 클래스)도 입힌다.

### 4.18 지도자 대사 — `leaderLine` (`lore.js:121-130`)

`kind`: `intro`(1장), `card`(해결 재생 때 율법 카드가 뒤집히면), `rebuttal`(계시에 대한 반박 — 있으면 card 대신 말함), `villageLost`/`capitalLow`(재생 중 우리가 빼앗거나 수도를 칠 때). (주석의 `win`/`lose`는 데이터에 없다.)
- 풀: `card`는 `lines.card[카드id] ?? lines.card.any`, `rebuttal`은 `lines.rebuttal[교리] ?? lines.rebuttal.any`.
- 고르기: `hashPick(pool, seed, round, kind, cardId ?? '', word ?? '')` — **주사위를 쓰지 않는다** (대사를 늘려도 판 결과가 안 바뀐다).
- 반박의 `word` = `nouns(text)[0]`. 대사 속 `'{word}'`를 조사까지 맞춰 채운다 (`interp.leaderLine`): `'{word}'라` → 받침이면 `'…'이라`, `'{word}'를` → `'…'을/를`, 나머지 `{word}` → 그대로. `word`가 없으면 `그 말`.
  예: 장로, 전쟁, word=`분노` → `분노하는 신이라… 율법은 흔들리지 않는다.`

**`hashPick`** (`lore.js:10-15`) — FNV-1a 변형, 결정론의 핵심:

```js
let h = 0x811c9dc5;
for (const ch of salts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
return list[(h >>> 0) % list.length];
```

### 4.19 판결문 (`main.js:1278-1294`)

재생이 끝나면 계시에 도장: 받아들인 명령 중 결과가 좋았던 비율(주사위면 승리, 아니면 `fail`/`blocked`가 아닌 기록) — `odd`면 `기이`, ≥ 0.7 `성취`, ≥ 0.3 `반쯤`, 그 밖 `빗나감`. 문장의 낱말은 `linkWords`의 첫 낱말(없으면 원문 앞 12자). 장 기록(`history[].verdict`)에 남는다.

### 4.20 계시 제안과 예감

- **제안 칩** (`main.js:2224-2253`): 말하기 단계에서 두루마리가 **8초** 비어 있으면, 처음 세 판(서고 기록 < 3)·튜토리얼 아님·설정 켜짐일 때 두 개를 띄운다. 후보 순서: 청원 need에 맞는 문장 → 공격 의도가 보이면 성벽 문장 → 신앙 ≤ 2면 기도 문장 → 마을·탐험·선교 문장. 중복 제거, 봉인어 포함 제외, **석판으로 명령이 1개 이상 나오는 것만**, 앞의 2개. 누르면 28ms 간격으로 타자해 넣는다.

```js
'ui.suggest.food':    '강과 들판에서 먹을 것을 거두어라',
'ui.suggest.wood':    '숲에서 나무를 베어라',
'ui.suggest.wall':    '성벽을 쌓아 이웃의 칼을 막아라',
'ui.suggest.village': '땅을 넓혀 새 마을을 세워라',
'ui.suggest.pray':    '신전에 모여 기도하라',
'ui.suggest.explore': '안개 너머를 찾아 나서라',
'ui.suggest.preach':  '이웃에게 나의 말씀을 전하라',
```

- **튜토리얼 예시**(`tut.*.suggest`)도 석판이 알아듣는 문장이어야 한다: `강물이 너희를 먹이리라`, `신전에서 기도하라`, `땅을 넓혀 새 마을을 세워라`, `이웃에게 나의 말씀을 전하라`.
- **예감**: [3.7](#37-석판의-다른-쓰임).

### 4.21 정경과 미라 (서사 연결)

- **정경**: 판이 끝나면 계시 하나를 봉헌할 수 있다 (`meta.addCanon({text, doctrine})`, 최근 3개 보관). 다음 두 번째 판 이상에서 `config.canon = getCanon()[0]` → 프롬프트 `이 부족의 경전: "…"`, 그리고 (오늘의 계시·어려움·튜토리얼이 아니면) 시작 교리 +1.
- **미라의 외침**: 분열의 예언자가 나오면 교리가 있던 마지막 계시를 비틀어 인용한다 — `신께서 "{text}"라 하셨으니, 곧 {비틀기}는 뜻이다!` (`eng.miraQuote`).

---

## 5. 언어 의존성

해석기는 **한국어에 깊게 묶여 있다**. 번역이 아니라 **그 언어로 새로 써야** 하는 것 (`docs/i18n.md` 「번역이 아니라 새로 써야 하는 부분」):

| 무엇 | 키 | 한국어에 묶인 점 |
|---|---|---|
| 석판 어휘·부정·절 | `kw.tablet.*`, `kw.negation`, `kw.clauseSplit`, `kw.lessonStop` | 동사 **어간**(`거두`, `싸우`, `지키`) 부분 일치에 기댄다. 교착어라 어미가 붙어도 걸린다. 부정은 `마라/말라/지 마` 어미 |
| 명사 뽑기 | `kw.nounSplit`(`[^가-힣]+`), `kw.particle`(조사 목록), `kw.verbish`(어미 목록), `kw.stop`, `kw.citeStop` | **한글 음절 범위**로 낱말을 자르고, 끝의 **조사 하나**를 뗀다. 로마자 계시에서는 명사가 하나도 안 나온다 (노트·인용·성언·검열어·반박 낱말 없음) |
| 성언 | `kw.liturgyStrip`(`[^가-힣\s]`) | 한글만 남긴다 |
| 말한 기적·계명·말투·이름·예언 | `kw.miracle.*`, `kw.eternal`, `kw.tone.*`, `kw.naming`, `kw.namingTail`, `kw.nameable`, `kw.prophecy.*`(수 낱말 `한/두/세` 포함) | 이름 문형 `…을/를 …이라 부르라`, 미래형 `리라/리니`, 이름 끝 `이` 떼기 |
| 청원·갈림길·계명 | `kw.petition.*`, `kw.data.event.*.choice.*.tags`, `kw.data.commandment.*.re` | |
| 숨은 말 | `kw.data.sacred.*.word` | 화면에도 나온다 (단서의 글자 수 표시) |
| 침묵·선교 힌트 | `kw.ui.speech`(`[가-힣A-Za-z0-9]`), `kw.ui.preach` | |
| 해석문 다듬기 | `kw.clean.*` | 좌표 뒤 조사 목록 `[을를이가에의]`, "도다" 어미 교정 |
| 프롬프트 | `interp.systemPrompt`, `interp.prompt`, `interp.threat`, `interp.lessonName`, `data.priest.*.prompt`, `data.voice.*` | "그 언어로 답하라"로 바꾼다. 교리 enum은 교리 이름을 따라 자동으로 바뀐다 |
| 제안·튜토리얼 예시 | `ui.suggest.*`, `tut.*.suggest` | 그 언어의 `kw.*`로 해석되는 문장이어야 한다 |

**조사(josa)**: 받침에 따라 `을/를`, `이/가`, `이라/라`, `으로/로`를 고른다 (`ko/grammar.js` — `batchim`, `josa`; 괄호 좌표 `우리 마을(D2)`는 괄호 앞 글자 기준). 쓰이는 곳: `interp.threat`, `interp.leaderLine`, 로그·UI 문장들. 새 언어는 `grammar.js`를 그 언어에 맞게 새로 쓴다.

**코드에 남은 언어 의존** (언어팩 밖):
- `cleanSpeech`의 문자 체계 필터 `\p{Script=Hangul}\p{Script=Latin}` (`interpreter.js:92`) — 다른 문자 체계를 더해야 한다.
- 세션 언어 `languages: ['ko', 'en']` (`interpreter.js:122`), 가용성 확인 `'en'` (`interpreter.js:110-111`) — 하드코딩.
- 목록 구분자 `', '`(최근 계시·위협·노트), `' / '`(갈림길), 행동 설명 끝 `/ \(.*\)$/` 떼기 (`interpreter.js:207`, `main.js:758`).
- `engine.js:14`가 `i18n/ko/grammar.js`를 직접 import 한다.
- 프롬프트의 `너의 신의 이름은 ${god}이다.`는 받침을 보지 않는다 (`엘로아이다`).

---

## 6. Godot 이식 메모

### 6.1 해석기 인터페이스

JS 설계(`docs/DESIGN.md:26` "해석기 인터페이스 분리")를 그대로 둔다. 엔진은 해석기를 모르고, 해석기는 엔진의 `legal_actions`/`action_limit`만 읽는다.

```gdscript
# core/interpreter/interpreter.gd
class_name Interpreter
# 결과: { interpretation: String, orders: Array[Dictionary], forbidden: Array[Dictionary],
#         doctrine: String|null ('peace'|'war'|'abundance'|'wisdom'), source: 'llm'|'tablet'|'silence', ms?: int }
func interpret(state: GameState, text: String) -> Dictionary:   # LLM 구현은 await 가능한 코루틴
	return {}
```

폴백 사슬은 JS와 같게: **LLM(또는 원격) → 실패/타임아웃/형식 오류 → 같은 계시를 석판으로**, 안내 문구 `ui.notice.llmFailed`. 석판은 LLM 모드에서도 항상 있어야 한다 (예감·제안·기이한 해석).

### 6.2 선택지

| 방법 | 장점 | 단점 | 메모 |
|---|---|---|---|
| **(a) 석판만 GDScript로** | 오프라인, 결정론, 골든으로 바로 검증 | 자유 문장 이해가 얕다 (3.4) | 최소 구현. 어느 방법이든 이것부터 |
| **(b) 로컬 LLM** (llama.cpp 기반 GDExtension) | 오프라인, 비용 없음, 원판(Chrome 내장 Gemma)과 같은 성격 | 모델 파일 수 GB, 메모리·첫 로드 시간, 기기 편차 | JSON 문법 제약(GBNF) 필수 |
| **(c) 원격 API** (예: Anthropic Claude API) | 해석 품질이 가장 좋다 | 네트워크·비용·지연, **API 키를 게임에 넣으면 안 된다** → 중계 서버 | 구조화 출력으로 스키마 강제 |

**(a) 석판 GDScript 뼈대** — 3.2의 알고리즘을 한 줄씩 옮긴다. 정규식은 언어팩(`docs/export/i18n-ko.json`)의 `kw.*` 원본을 `RegEx.create_from_string()`으로 만든다.

```gdscript
const RULE_ORDER := ["river","hill","preach","attack","rest","wall","food","wood","stone","village","temple","pray","explore"]
const RULE_DOCTRINE := {"river":"abundance","hill":"wisdom","preach":"peace","attack":"war","rest":"peace","wall":"war",
	"food":"abundance","wood":"abundance","stone":"abundance","village":"abundance","temple":"wisdom","pray":"wisdom","explore":"wisdom"}

static func rule_match(id: String, a: Dictionary, tile: Dictionary) -> bool:
	match id:
		"river": return a.type == "gather" and tile.terrain == "river"
		"hill": return a.type == "gather" and tile.terrain == "hill"
		"preach": return a.type == "preach"
		"attack": return a.type == "attack"
		"rest", "pray": return a.type == "pray"
		"wall": return a.get("build") == "wall"
		"food", "wood", "stone": return a.get("gather") == id
		"village": return a.get("build") == "village"
		"temple": return a.get("build") in ["temple", "cathedral"]
		"explore": return a.type == "explore"
	return false

func interpret(state, text: String) -> Dictionary:
	var legal: Array = Engine.legal_actions(state, "player")   # JS와 같은 순서여야 한다 (3.3)
	var limit: int = Engine.action_limit(state, "player")
	var rules := _named_rules(state) + _lesson_rules(state) + _tablet_rules   # {re, doctrine, match: Callable}
	var orders := []; var forbidden := []; var doctrine = null
	for clause in regex_split(CLAUSE, text):
		var negative := NEGATION.search(clause) != null
		for rule in rules:
			if rule.re.search(clause) == null: continue
			var matches := legal.filter(func(a): return rule.match.call(a, state.tile_at[a.tile]))
			if negative:
				forbidden.append_array(matches)
			elif not matches.is_empty():
				if doctrine == null and rule.doctrine != null: doctrine = rule.doctrine
				var a = matches[0]   # 첫 후보만 (JS의 무조건 break)
				if orders.size() < limit and not orders.any(func(o): return o.tile == a.tile):
					orders.append(a)
	# … 해석문(금지 거르기 전 orders로), orders에서 금지 key 거르기, doctrine ?? (금지 있으면 'peace')
	return {}

static func regex_split(re: RegEx, s: String) -> PackedStringArray:   # JS String.split(regex) 대체
	var out := PackedStringArray(); var last := 0
	for m in re.search_all(s):
		out.append(s.substr(last, m.get_start() - last)); last = m.get_end()
	out.append(s.substr(last))
	return out
```

**(b) 로컬 LLM** — llama.cpp를 감싼 Godot 애드온(GDExtension; 예: NobodyWho 계열)을 쓴다. 핵심은 **문법 제약 샘플링**: llama.cpp의 GBNF 문법(또는 JSON 스키마 → GBNF 변환기)으로 2.4 스키마를 강제한다. enum 제약이 곧 "목록 밖 행동 불가"를 보장하므로 반드시 켠다. 모델은 한국어가 되는 작은 지시 모델(원판과 같은 Gemma 계열 등)의 GGUF 양자화본. 시스템 프롬프트만 든 기본 컨텍스트를 한 번 만들어 두고(원판의 `clone()` 대응: KV 캐시에 시스템 프롬프트 접두부를 남기고 매 해석마다 그 뒤를 비운다) 매 장 사용자 프롬프트만 넣는다. 첫 로드는 게임 시작 화면에서 미리 한다 (원판의 `prepareLLM` 미리 깨우기). 애드온별 API는 [확인 필요](#확인-필요).

**(c) 원격 API — Claude API 예** (GDScript에는 공식 SDK가 없으므로 `HTTPRequest`로 Messages API를 직접 부른다):

```gdscript
var body := {
	"model": "claude-opus-5",
	"max_tokens": 4096,
	"system": T.t("interp.systemPrompt"),
	"output_config": {
		"effort": "low",                                  # 해석은 짧은 분류 작업 → 지연을 줄인다
		"format": {"type": "json_schema", "schema": schema_for_claude(built.schema)},
	},
	"fallbacks": "default",                               # 안전 분류기 거절 시 서버 쪽 대체 모델
	"messages": [{"role": "user", "content": built.text}],
}
var headers := [
	"content-type: application/json",
	"anthropic-version: 2023-06-01",
	"anthropic-beta: server-side-fallback-2026-07-01",
	# x-api-key 는 게임이 아니라 중계 서버가 붙인다
]
http.timeout = 15.0
http.request(RELAY_URL + "/v1/messages", headers, HTTPClient.METHOD_POST, JSON.stringify(body))
var res = await http.request_completed          # [result, code, headers, body]
# 200이 아니거나, stop_reason 이 "refusal"/"max_tokens" 이면 → 석판으로 대체
# content 배열에서 type == "text" 블록을 찾아 JSON.parse_string (thinking 블록은 건너뛴다)
```

- **API 키는 절대 빌드에 넣지 않는다.** 키를 가진 작은 중계 서버가 요청을 받아 `x-api-key`를 붙여 넘기게 한다 (요청 수 제한·로그도 그곳에서).
- **스키마 차이**: Claude 구조화 출력은 모든 객체에 `additionalProperties: false`가 필요하고, 문자열 `maxLength`를 지원하지 않는다 → 빼고, 해석문 길이는 `cleanSpeech`(두 문장 자르기)로 맞춘다. 배열 `minItems`/`maxItems` 지원 여부는 확인이 필요하다 — 빼도 엔진 검증(`validateOrders`의 행동 수 한도, 빈 명령은 `autoFill`)이 같은 결과를 보장한다.
- **스키마를 장마다 바꾸지 않는 편이 좋다**: 새 스키마는 처음 한 번 컴파일 지연이 있고 같은 스키마는 캐시된다. `enum`을 `A1…A60`처럼 **고정 상한**으로 두고, 이번 장에 없는 ID는 매핑에서 버리면(`filter(Boolean)`과 같음) 스키마가 판 내내 같다.
- 모델 선택(더 싼·빠른 등급을 쓸지)은 지연·비용과 품질을 6.5의 LLM 품질 평가(채점 세트)로 재서 정한다. 위 예의 `effort: "low"`는 지연을 줄이기 위한 시작값이다.
- 오프라인·오류·타임아웃이면 석판으로 되돌아간다 (원판과 같은 안내 문구).

### 6.3 반드시 같아야 하는 것

1. **가능한 행동 목록의 내용과 순서** (`legalActions`) — LLM ID(`A1…`)와 석판의 첫 후보 선택이 모두 여기에 달려 있다.
2. **행동 키 형식** `type:tile:gather|build|''` — 골든·금지·뺀 칩·링크·판결의 공통 키.
3. **ID 형식** `A{1부터}`, 칸별 묶음 순서, 행동 설명 문구 (`eng.act.*`) — 프롬프트 재현.
4. **스키마의 의미**: 금지 → 행동 → 교리 → 해석문 순서, enum으로 ID 제한, 교리 enum = 언어팩 교리 이름.
5. **검증 규칙** (`validateOrders`: 금지 → 누적 건설 예산 → 같은 칸(교리 선호) → 행동 수)과 `autoFill`.
6. **결과 객체 모양** (1.4)과 폴백 사슬.
7. **수락 순서** (1.7) — 교리는 해결 뒤, 기적은 맨 앞, 계명은 해결 전.
8. **`hashPick`** 비트 단위 동일 (지도자 대사·청원자·사제·검열어 대체·숨은 말).
9. **`cleanSpeech`** (LLM 해석문 표시가 같게).

### 6.4 정규식·문자열 이식 노트

Godot `RegEx`는 PCRE2다. 현재 코드가 쓰는 JS 정규식 기능과 대응:

| JS에서 쓰는 것 | 어디 | Godot/PCRE2 |
|---|---|---|
| 플래그 없는 `new RegExp(src)` + `.test()` | 거의 전부 | `RegEx.create_from_string(src)`, `search(s) != null`. 비전역이라 `lastIndex` 문제 없음 |
| `str.match(re)` (비전역) → `m[0]`, `m[1]`, `m[2]` | 이름, 예언 기한, `linkWords` | `search()` → `get_string(0/1/2)`. **괄호 묶음 순서를 바꾸지 말 것** (코드가 번호로 읽는다) |
| `g` + `str.replace(re, '$1')` | `cleanSpeech` 3·4단계, `kw.liturgyStrip` | `re.sub(s, "$1", true)` |
| `g` + 콜백 치환 | `cleanSpeech` 5단계(`stemFix`) | 콜백이 없다 → `search_all`로 돌며 직접 이어 붙인다 |
| `String.split(regex)` | 절 나누기, 명사 나누기, 성언 `/\s+/` | 위 `regex_split` 도우미 (패턴이 빈 문자열에 걸리지 않으므로 결과가 같다) |
| `str.match(/[^.!?]+[.!?]*/g)` | 두 문장 자르기 | `search_all` |
| `/[^\p{Script=Hangul}\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]/gu` | `cleanSpeech` 1단계 | `\p{Script=…}` 대신 **`\p{Hangul}`, `\p{Latin}`** 으로 쓴다 (모든 PCRE2 판이 받는 문법) |
| 앞 보기 `(?=…)` | `kw.clean.coord` | 지원 |
| **뒤 보기 `(?<=…)`** | **쓰지 않는다** (현재 코드에 없음) | — |
| 한글 범위 `[가-힣]` | 명사·이름·성언 | Godot 문자열은 UTF-32라 코드 포인트 범위로 동작 |
| `\s` | 여러 곳 | JS는 유니코드 공백(U+3000 등)도 `\s`. PCRE2는 기본이 ASCII → 패턴 앞에 `(*UCP)`를 붙이거나 입력을 정규화 |
| 따옴표 `“ ‘ ” ’` | `kw.naming` | 그대로 |
| `String.raw\`…\`` | 언어팩 원본 | JSON/리소스 파일에 원본 그대로 두면 GDScript 이스케이프를 피할 수 있다 |
| `includes` | 비용·링크·숨은 말·성언 | `String.contains()` |
| `.length` | 비용(30자), 이름 길이, 성언 4~8자, 두 글자 명사 | JS는 UTF-16 단위, Godot는 코드 포인트. 한글은 같고 **이모지 등 BMP 밖 문자만 다르다** → 필요하면 UTF-16 길이 함수를 따로 둔다 |
| `.trim()` | 입력, 이름 | JS는 유니코드 공백·BOM까지 지운다. `strip_edges()`는 제어문자·ASCII 공백 위주 → 필요하면 정규식으로 |

`hashPick` GDScript (JS `Math.imul` 32비트 곱을 마스크로 재현, BMP 밖 문자는 JS처럼 상위 서러게이트만 쓴다):

```gdscript
static func hash_pick(list: Array, salts: Array):
	if list.is_empty(): return null
	var parts := PackedStringArray()
	for x in salts: parts.append("" if x == null else str(x))
	var s := "|".join(parts)
	var h := 0x811c9dc5
	for i in s.length():
		var c := s.unicode_at(i)
		if c > 0xFFFF: c = 0xD800 + ((c - 0x10000) >> 10)
		h = (h ^ c) & 0xFFFFFFFF
		h = (h * 0x01000193) & 0xFFFFFFFF
	return list[h % list.size()]
```

(`str(2026)` = `"2026"`로 JS의 숫자→문자열과 같다. 실수 시드를 쓰지 말 것.)

### 6.5 테스트 전략 (골든)

1. **판 골든** — 이미 있다: `node tools/golden.mjs` → `docs/export/golden/*.json`. 장마다 `revelation`, `cost`, `tone`, `tablet.{orders, forbidden, doctrine, interpretation}`, `accepted`, `rejected`, `auto`, `petitionAnswered`, `plan`, 기록이 들어 있다. Godot 테스트: 같은 계시를 석판에 넣어 `tablet`이 같은지, 검증·자동 노동 결과가 같은지.
2. **함수 골든** — 순수 함수는 표로 비교한다. JS에서 뽑는 법 (저장소 루트에서, 결과를 JSON으로 떨어뜨려 Godot 테스트 입력으로 쓴다):

```js
// node --input-type=module -e "…"  또는 임시 .mjs 파일
const root = 'file:///<repo>/js/game/';
const E = await import(root + 'engine.js');
const I = await import(root + 'interpreter.js');
const L = await import(root + 'lore.js');
const st = E.createState({ mode: 'tutorial' }); E.startRound(st);
console.log(JSON.stringify({
  prompt: I.buildPrompt(st, '강물이 너희를 먹이리라'),          // text·schema 바이트 비교
  tablet: I.interpretWithTablet(st, '숲을 베지 마라, 산에서 돌을 캐라'),
  nouns: L.nouns('이 강을 요단이라 부르라. 요단의 물고기를 거두어라'),
  naming: L.parseNaming('이 강을 요단이라 부르라'),
  prophecy: L.parseProphecy('율법파의 탑이 두 장 안에 무너지리라'),
  clean: I.cleanSpeech('택하라! 도다! 산 C1에서 돌을 캐라 도다.'),
}));
```

3. **프롬프트 골든** — 같은 상태에서 `buildPrompt(...).text`가 JS와 **바이트까지 같은지** (LLM 경로의 재현성). 스키마 JSON도.
4. **LLM 품질 평가** (비결정론) — `lab/scenario.js`의 `SAMPLES`/`HARD_SAMPLES`(기대 `expect`, 피할 `avoid`, 교리)를 새 모델·새 프롬프트로 여러 번 돌려 의도 적중률·교리 적중률·응답 시간을 잰다. 기준선: v5 의도 87~93%, 교리 100% (2.7). 원격/로컬 모델을 바꿀 때마다 돌린다.
5. **가짜 해석기** — 엔진 테스트는 해석기 대신 골든의 명령 키를 그대로 넣는다 (`docs/godot/PORTING.md` 골든 절).

**석판 골든 표** (튜토리얼 3×3, 1장 시작 상태, 행동 수 3 — 위 2.3 예 1의 행동 목록):

| 계시 | orders | forbidden | doctrine | 해석문 / 링크 |
|---|---|---|---|---|
| `강물이 너희를 먹이리라` | `gather:B2:food` | | abundance | `석판에 새겨진 말씀이도다. 평원(B2)에서 곡식을 거둔다!` / `먹` |
| `숲을 베지 마라` | | `gather:A1:wood`, `gather:C3:wood` | peace | `석판의 말씀이 흐릿하도다. 각자 할 일을 하라.` |
| `이웃을 사랑하라` | `preach:A2:` | | peace | 링크 `이웃` |
| `두려워하지 말고 쳐라` | `attack:A2:` | | war | 링크 `쳐라` |
| `나를 위한 높은 곳을 마련하라` | | | null | 흐릿 (신전 비용 부족) |
| `보이지 않는 곳에 답이 있다` | `explore:A3:` | | wisdom | 링크 `보이지` |
| `산에서 돌을 캐고, 숲에서 나무를 베어라` | `gather:B1:stone`, `gather:A1:wood` | | abundance | `…산(B1)에서 돌을 캔다, 그리고 숲(A1)에서 나무를 벤다!` / `산`, `숲` |
| `오늘은 쉬어라` | `pray:C1:` | | peace | 링크 `쉬어` |
| `싸우지 마라` | | `attack:A2:` | peace | 흐릿 |
| `불` | | | null | 흐릿 |
| `배고픔을 잊게 하라` | `gather:B2:food` | | abundance | 링크 `배고` |
| `방패가 되어라` | | | null | 흐릿 (성벽 비용 부족) |
| `모든 것을 바쳐 나를 경배하라` | `pray:C1:` | | wisdom | 링크 `바쳐` |
| `숲을 베지 말고 산에서 돌을 캐라` | `gather:A1:wood`, `gather:B1:stone` | | abundance | (3.4 한계) |
| `숲을 베지 마라, 산에서 돌을 캐라` | `gather:B1:stone` | `gather:A1:wood`, `gather:C3:wood` | abundance | |
| `숲을 베지 마라 그리고 산에서 돌을 캐라` | `gather:B1:stone` | `gather:A1:wood`, `gather:C3:wood` | abundance | |
| `곡식을 거두라, 곡식을 거두라, 곡식을 거두라, 곡식을 거두라` | `gather:B2:food` | | abundance | 반복해도 하나 |

이어서 A1에 `검은숲` 이름(`이 숲을 검은숲이라 부르라` → `nameTile` = `{tile:'A1', first:true}`), 노트 `{word:'새벽', type:'explore'}`를 넣은 상태:

| 계시 | orders | doctrine | 해석문 |
|---|---|---|---|
| `검은숲에서 일하라` | `gather:A1:wood` | abundance (숲 규칙) | `…검은숲(A1)에서 나무를 벤다!` |
| `검은숲을 사랑하라` | `gather:A1:wood`, `preach:A2:` | peace | |
| `새벽을 맞으라` | `explore:A3:` | null (노트 규칙은 교리 없음) | |

**함수 골든** (같은 실행에서):

| 호출 | 결과 |
|---|---|
| `detectTone('너희에게 축복을' / '율법파에 저주를' / '강물처럼 흘러라' / '나무를 베라')` | `blessing` / `curse` / `metaphor` / `command` |
| `findLiturgy(['빛이 있으라 강을 보라','빛이 있으라 숲을 보라','빛이 있으라 산을 보라'])` | `빛이 있으라` |
| `parseCommandment('영원히 칼을 들지 말라', COMMANDMENTS)` | `noSword` |
| `parseMiracle('단비와 번개', ['lightning','rain'])` | `lightning` (손패 순서) |
| `citedWords` (1장 전 계시 `등불을 밝혀라`, 지금 `등불 아래에서 기도하라`) | `['등불']` |
| `revelationCostFor` 32자, 인용 없음 / 31자 이상 + 인용 | 2 / 1 |
| `extractLesson('빛나는 등불을 따라가라', [탐험])` | `{ word: '빛나', type: 'explore', … }` |
| `extractLesson('산처럼 높이 올라라', …)` | `null` (두 글자 이상 명사 없음) |
| `nouns('너희는 강물처럼 흘러라. 신도들이여 등불을 들라')` | `['강물', '신도들', '등불']` |
| `validateOrders([A1 숲 채집, A1 마을, A2 선교, A2 공격], [], 'abundance')` | 받음: 숲 채집, 선교 / 거부: 마을·공격 `같은 장소` |
| `validateOrders([A2 선교, A2 공격], [], 'war')` | 받음: 공격 / 거부: 선교 `같은 장소 (교리에 맞는 행동 우선)` |
| `autoFill([B2 곡식])` (식량5·목재3·돌1) | `gather:B1:stone`, `gather:A1:wood` |
| `leaderLine(장로, 'rebuttal', {doctrine:'war', word:'분노'})` (`config.seed` 2026, 1장) | `분노하는 신이라… 율법은 흔들리지 않는다.` |

---

## 확인 필요

코드와 설명이 어긋나거나, 의도가 불분명하거나, 이식 때 결정이 필요한 것.

1. **다운로드 진행률이 표시되지 않을 수 있다**: `prepareLLM`은 `preparing ??= createBaseSession({ …, onProgress })`라서 처음 부른 쪽의 콜백만 쓴다. 메인 화면에서 콜백 없이 미리 깨우므로(`main.js:261`) `runInterpretation`이 넘기는 진행률 콜백은 무시된다 (`interpreter.js:120-126`). 의도인지?
2. **LLM 타임아웃·중단이 없다**: `interpretWithLLM`의 `signal`을 `main.js:543`이 넘기지 않는다. 모델이 멈추면 해석 중 화면에 갇힌다. Godot 판은 타임아웃 → 석판 대체를 권한다.
3. **석판의 "첫 후보만" 규칙** (`interpreter.js:200-203`의 무조건 `break`): 첫 후보 칸이 이미 쓰였으면 두 번째 후보를 찾지 않는다. 의도(규칙당 하나)로 보이나, "곡식을 두 번 거두라" 같은 말이 명령 하나로 줄어든다. 골든을 맞추려면 그대로 옮긴다.
4. **석판 해석문은 금지로 거르기 전 명령으로 만든다** (`interpreter.js:207-212`) — 금지된 행동을 말할 수 있다 (드문 경우).
5. **`validateOrders`의 같은 칸 교체**가 건설 예산을 조정하지 않는다 (`engine.js:416-425`): 기존 건설을 새 행동으로 바꿔도 예산이 복구되지 않고, 새 건설로 바꾸면 예산에서 빠지지 않는다.
6. **`~지 말고`는 부정이 아니다**: "두려워하지 말고 쳐라"를 살리려는 절충이지만 "숲을 베지 말고 돌을 캐라"가 숲 채집을 명령한다.
7. **청원 외면에 침묵이 포함된다** (`wordsAfter`가 침묵에도 불린다). 의도인지?
8. **예언 `fall`은 공격 점령만 센다** (`stats.captured`). 선교로 넘어온 마을(`stats.turned`)은 "마을이 무너지리라"를 이루지 못한다.
9. **`linkWords`의 노트 비교는 건설 종류를 보지 않는다** (석판의 노트 규칙은 본다).
10. **`extractLesson`은 받아들인 첫 명령을 뜻으로 배운다** — 그 낱말이 정말 그 행동을 불렀는지는 보지 않는다 (`빛나`처럼 형용사 조각도 배운다).
11. **가용성 확인은 `en`, 세션은 `['ko','en']`**: 한국어 비공식 지원 때문. 다른 언어팩을 더하면 코드 수정이 필요하다.
12. **옛 문서와 코드 차이**: `docs/DESIGN.md`의 초안 스키마(해석문 먼저, 80자, 좌표 객체)와 `docs/EXPERIMENTS.md` v4/v5의 생성 순서(해석 → 금지 → 행동 → 교리)는 지금 코드(금지 → 행동 → 교리 → 해석문, 110자)와 다르다. 코드가 기준.
13. **쓰이지 않는 것**: `data.js:58` `revelationCost`, `leaderLine` 주석의 `win`/`lose` 종류.
14. **`너의 신의 이름은 ${god}이다`** 는 받침을 보지 않는다 (`interp.prompt`).
15. **Godot `RegEx`의 유니코드 속성 지원**: Godot가 PCRE2를 어떤 옵션(UTF/UCP)으로 컴파일하는지에 따라 `\p{Hangul}`, `\s`의 동작이 다를 수 있다. 이식 첫날 `\p{Hangul}`·`[가-힣]`·`(*UCP)\s`를 작은 테스트로 확인할 것.
16. **Claude 구조화 출력의 배열 제약**: `minItems`/`maxItems`가 받아들여지는지(“복잡한 배열 제약” 미지원 목록에 드는지) 실제 요청으로 확인. `maxLength`는 미지원이 확실하다.
17. **로컬 LLM 애드온**: 어떤 Godot llama.cpp 애드온이 GBNF/JSON 스키마 제약을 GDScript로 노출하는지, 한국어 품질이 되는 모델 크기는 무엇인지 — 6.5의 LLM 품질 평가로 정한다.
18. **이모지 등 BMP 밖 문자**: 비용(30자)·이름 길이·`hashPick`에서 JS(UTF-16)와 Godot(코드 포인트)가 달라질 수 있다. 골든에 이모지 사례를 하나 넣어 둘 것.
