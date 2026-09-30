# 05. 해석기 — 계시가 명령이 되기까지

> 플레이어가 쓴 자연어 **계시**를 신도들의 **명령**(엔진의 행동 객체 목록)으로 바꾸는 모든 것: 비용, LLM(대사제) 경로, 석판(키워드) 파서, 결과 객체, 엔진 검증, 확인 화면, 그리고 계시의 **낱말 자체가 규칙이 되는** 장치들.
> 기준: 커밋 `448f553` (2026-09-30), 명세 검토 수정 `e68a240`("~지 말고" 전부 금지, 할 수 없는 까닭 코드, 다시 해석 버튼 조건, 헤아린 성벽 예산), 일로도 보는 메아리 `9b43bbf`, **곳을 가리키는 말·수의 말·한 칸에 한 가지·칩 옮기기·넓힌 사전** `78c891e`까지 반영. 코드가 기준이다. 인용은 `파일:줄`. 석판 부분(§3)은 `78c891e` 줄 번호로 새로 적었고, 그 밖에 이번에 고치지 않은 인용은 `448f553`·`e68a240` 기준이다(`main.js`는 `9b43bbf`·`78c891e`에서 697행 뒤 +2, 1665행 뒤 +26, 2207행 뒤 +39, 2301행 뒤 +44 밀렸다). 모르는 것·어색한 것은 맨 끝 [확인 필요](#확인-필요)에 모았다.
> 관련 문서: [01 개요](01-overview.md) · [02 규칙](02-rules.md) · [03 데이터](03-data.md) · [04 구조](04-architecture.md) · [06 UI/UX](06-ui-ux.md) · [Godot 이식 계획](../godot/PORTING.md)

## 0. 파일 지도

| 파일 | 맡은 일 |
|---|---|
| `js/game/interpreter.js` | 프롬프트 만들기(`buildPrompt`), LLM 해석(`interpretWithLLM`), 석판 해석(`interpretWithTablet` — 곳을 가리키는 말 `placeOf`·`byPlace` 포함), 말-행동 잇기(`linkWords`), 신학 노트(`extractLesson`), 해석문 다듬기(`cleanSpeech`), 사제 말투(`voiceOf`), 메아리용 일 목록을 엔진에 넣기(`setPlanSig`, 모듈 끝) |
| `js/llm.js` | Chrome Prompt API 래퍼: 세션 생성(`createBaseSession`), 스키마 강제 스트리밍(`promptJSON`) |
| `js/game/lore.js` | 순수 텍스트 처리: 명사 뽑기(`nouns`), 인용(`citedWords`), 말투(`detectTone`), 이름(`parseNaming`), 예언(`parseProphecy`), 말한 기적(`parseMiracle`), 계명(`parseCommandment`), 검열어(`frequentNoun`), 해시 선택(`hashPick`), 지도자 대사(`leaderLine`) |
| `js/game/engine.js` | 가능한 행동(`legalActions`), 검증(`validateOrders`), 자동 노동(`autoFill`), 비용(`revelationCostFor`)과 메아리(`isEcho`·`spokenOf`), 말의 효과(은총·청원·이름·말투·예언·침묵·계명·숨은 말·서원·교리 기록·연속 기적) |
| `js/game/main.js` | 흐름 배선: `speak` → `runInterpretation` → `interpret` → `derivePending` → 확인 화면 → `accept` → `wordsAfter`; 다시 해석·말 거두기·칩 빼기·칩 옮기기(⇄)·예언 봉인·계명 새기기·제안 칩·예감·알아들은 말 줄(`heardHTML`) |
| `js/game/i18n/ko/interp.js` | 대사제 프롬프트(`interp.*`)와 **모든 해석용 정규식 원본**(`kw.*`), 그리고 키가 아닌 도우미 `cannotLabel`(까닭 코드 → "선교(닿는 율법파 땅이 없다)", `ko/interp.js:4-16`, `ko/ui.js`도 import한다) |
| `js/game/i18n/ko/engine.js:62-77` | 청원 응답 정규식 `kw.petition.*` |
| `js/game/i18n/ko/data.js` | 사제 성향·교리 말투 프롬프트(`data.priest.*.prompt`, `data.voice.*`), 갈림길 `kw.data.event.*.tags`, 계명 `kw.data.commandment.*.re`, 숨은 말 `kw.data.sacred.*.word` |
| `js/game/i18n/ko/ui.js:580-582` | 침묵 판정 `kw.ui.speech`, 선교 힌트 `kw.ui.preach` |
| `docs/EXPERIMENTS.md`, `lab/interpret.html`, `lab/scenario.js` | 프롬프트 실험 v1~v5와 채점 세트 |

언어팩 조회 `t(key, vars)`: 값이 문자열이면 `{이름}` 자리를 채우고, 함수면 `vars`를 넘겨 부른다 (`js/game/i18n.js:33-42`). 정규식은 전부 `new RegExp(t('kw.…'), 플래그)`로 만든다.

---

## 1. 파이프라인 한눈에

```mermaid
flowchart TD
  A[두루마리에 계시 입력<br/>비용 알약 · 알아들은 말 · 예감 - 석판] --> B{길이 ≤ revMax?}
  B -- 아니오 --> A
  B -- 예 --> C{kw.ui.speech 글자가 있나?}
  C -- 없음 --> S[침묵 silence]
  C -- 있음 --> D[비용 revelationCostFor<br/>신앙 부족이면 거부]
  D --> E[speakSnap 저장 + 되풀이 판정 spokenOf · 신앙 차감<br/>이름 붙이기 nameTile]
  E --> F[runInterpretation<br/>LLM 또는 석판 · 연출과 병렬]
  F --> G[결과 객체<br/>interpretation/orders/forbidden/doctrine/source<br/>석판은 heard/banned도]
  G --> H[interpret: pending 생성<br/>말투·인용·예언 파싱]
  H --> I[derivePending: validateOrders + autoFill 교리 한 자리<br/>linkWords·청원·갈림길·기적·계명]
  I --> J[확인 화면]
  J -- 칩 빼기/되살리기 · 칩 옮기기 ⇄ --> I
  J -- 다시 해석 신앙1<br/>LLM 모드에서만 --> F
  J -- 말 거두기 --> A
  J -- 수락 --> K[accept: 기적 → 말투 → 갈림길 비용 → 계명 → 숨은 말 → 예언 봉인<br/>resolveRound → 침묵 → 전설 → 서원 → wordsAfter → 교리 기록·메아리 → 신학 노트 → 지도자 반박]
  S --> J
```

### 1.1 입력 단계 — `speak()` (`main.js:510-534`)

1. `text = textarea.value.trim()`. 비었으면 포커스만 준다.
2. `text.length > revMax()` 이면 거부. `revMax()`는 `REVELATION_MAX = 100`, 시련 「침묵의 수도원」(`trial === 'cloister'`)만 20 (`main.js:1852`, `data.js:56`). textarea `maxlength`도 같은 값.
3. **침묵 판정**: `KW_SPEECH = /[가-힣A-Za-z0-9]/` (`kw.ui.speech`, `main.js:38`)에 한 글자도 안 걸리면(예: `…`, `!!`) 대사제를 부르지 않고 `silence()`로 간다 → [4.11 침묵](#411-침묵).
4. 비용 `cost = revelationCostFor(state, text)` ([1.2](#12-계시-비용)). `faith < cost`면 거부 + 안내(`ui.notice.noFaith`).
5. `speakSnap = { state: JSON.stringify(serializeState(state)), text, cost, spoken: spokenOf(state, text) }` — 말 거두기용 스냅숏. **신앙 차감 전**에 뜬다. `spoken = { sig, echo }`는 이 순간의 되풀이 판정으로, 수락 때 `recordRevelation`에 그대로 넘긴다(`9b43bbf`, [4.6](#46-메아리-되풀이한-계시)).
6. `faith -= cost`.
7. **이름 붙이기를 해석 전에 새긴다**: `nameTile(state, parseNaming(text))` (`main.js:528`). 그래서 새 이름이 대사제의 행동 목록(칸 이름)과 석판의 이름 규칙에 곧바로 들어간다 → [4.2](#42-이름-붙이기).
8. `runInterpretation(text)`를 **먼저 시작**하고, 인장·빛기둥 연출(`fx.castRevelation`, 약 2.3초)과 병렬로 기다린다. 연출이 끝나면 `interpret(text, job, naming)`.

> 프롬프트의 자원 수치는 **계시 비용을 치른 뒤**의 값이다 (5→6 순서).
>
> 인장을 누르기 전, 쓰는 동안에는 비용 알약([1.2](#12-계시-비용))이 바로, 두루마리 아래 **알아들은 말** 줄과 보드의 예감 칸 강조가 입력이 멈추고 250ms 뒤 갱신된다. 둘 다 석판으로 계산한다 → [3.7](#37-석판의-다른-쓰임).

### 1.2 계시 비용

`revelationCostFor`, `isEcho`, `spokenOf` (`engine.js:732-749`):

```js
base = (text.trim().length > 30 && citedWords(state, text).length === 0) ? 2 : 1;
cost = base
     + (state.bannedWords.some((w) => text.includes(w)) ? 1 : 0)   // 봉인된 말
     + (isEcho(state, text) ? 1 : 0);                               // 메아리

const plainWords = (x) => String(x ?? '').replace(/[\s\p{P}]/gu, '');   // 공백·문장부호를 모두 지운다
// 일의 목록: interpreter.js가 setPlanSig로 넣는 함수 (9b43bbf)
//   = interpretWithTablet(state, text).orders의 종류 키(gather:<자원> / build:<건물> / type)를 중복 없이 정렬해 '|'로 이음
const planSig = (state, text) => (planSigFn ? planSigFn(state, text) : '');
isEcho = (state, text, sig = planSig(state, text)) => {
  if (state.tutorial || !text || plainWords(text) === '') return false;
  const last = state.revelations?.at(-1);
  return plainWords(text) === plainWords(last?.text) || (!!sig && sig === last?.sig);
};
spokenOf = (state, text) => { const sig = planSig(state, text); return { sig, echo: isEcho(state, text, sig) }; };
```

| 조건 | 비용 |
|---|---|
| 30자 이하 | 1 |
| 31자 이상 | 2 |
| 31자 이상이지만 **인용**(최근 3장 계시와 겹치는 명사, [4.8](#48-성구-인용))이 하나라도 있음 | 1 |
| 위 결과 + **봉인된 말**(검열, [4.12](#412-검열-봉인된-말))을 포함 | +1 |
| 위 결과 + **메아리**(바로 앞 계시를 공백·문장부호만 바꿔 되풀이하거나, 석판이 알아듣는 일의 종류가 바로 앞 계시와 같음, [4.6](#46-메아리-되풀이한-계시)) | +1 (이론상 최대 4) |

- 메아리의 "바로 앞 계시"는 `state.revelations`의 마지막 항목이다. 침묵은 기록되지 않으므로 침묵한 장을 건너뛰고, 앞선 메아리도 기록되므로 세 번째 되풀이도 메아리다. 튜토리얼에서는 늘 거짓.
- 일의 목록은 **석판**으로 만든다(LLM 모드여도). 입력 중 비용 알약도 매 입력마다 석판을 한 번 더 돌려 이 목록을 본다(`costPill` → `isEcho`).
- 긴 계시를 그대로 되풀이하면 대개 앞 계시의 명사가 **인용**으로 잡혀 기본이 1이 되므로 1+1 = 2다. 앞 계시가 3장보다 오래됐으면(사이가 침묵) 인용이 안 잡혀 2+1 = 3.
- 길이는 JS `String.length`(UTF-16 코드 단위). 한글 음절은 1, 이모지는 2 → [6.4](#64-정규식문자열-이식-노트).
- 입력 중 비용 알약은 `draft`로 실시간 계산한다 (`costPill`, `main.js:2198-2208`): 메아리면 `신앙 N · 되풀이`(메아리가 인용보다 앞선다, `e68a240`), 아니고 인용이면 `인용 · 신앙 N`. 메아리는 `echo` 클래스에 툴팁 `ui.echo.tip` = `지난 계시와 같은 말, 또는 말만 바꾼 같은 일들 — 되풀이된 말씀은 무뎌진다 (신앙 +1, 교리가 오르지 않는다)`, 봉인어면 붉게.
- `data.js:58`의 `revelationCost`(길이만 보는 옛 함수)는 **쓰이지 않는다**.

### 1.3 해석 — `runInterpretation` (`main.js:548-563`)

```js
if (aiMode === 'llm') {
  try {
    await prepareLLM((p) => { progress = p; ... });   // 세션 준비 (다운로드 진행률)
    progress = null;
    // 모델이 멈추면 30초 뒤 석판으로 넘긴다 (내려받기는 위에서 끝난 뒤라 타이머 밖)
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 30000);
    try { return { result: await interpretWithLLM(state, text, ctl.signal) }; } finally { clearTimeout(timer); }
  } catch (e) {
    return { result: interpretWithTablet(state, text), notice: t('ui.notice.llmFailed', { err: e.name }) };
  }
}
await fx.wait(700);                                    // 석판은 일부러 0.7초 뜸을 들인다
return { result: interpretWithTablet(state, text) };
```

- `aiMode`: 시작 시 `llmStatus()`가 `available | readily-available | downloadable | downloading | after-download` 중 하나면 `'llm'`, 아니면 `'tablet'`. URL `?ai=tablet`이면 강제로 석판 (`main.js:121-123`). 상단 AI 버튼으로 전환 가능 (가능할 때만, 해석 중에는 불가 — `main.js:435-440`).
- LLM이 어떤 이유로든 던지면 **같은 계시를 석판으로 해석**하고 확인 화면에 안내 문구(`대사제가 말씀을 알아듣지 못해 석판으로 해석했다 ({err}).`)를 띄운다. 비용은 다시 받지 않는다.
- **30초 타임아웃** (`main.js:553-556`): `interpretWithLLM`에 `AbortController`의 `signal`을 넘긴다. 30초가 지나면 `abort()` → `session.clone`/`promptStreaming`이 `AbortError`를 던지고(재시도하지 않는다, 2.5) 위 `catch`가 석판으로 대신한다 (`{err}` = `AbortError`). 모델 내려받기(`prepareLLM`)는 타이머가 켜지기 전에 끝난다.
- 석판으로 대신한 결과도 `source: 'tablet'`이지만, 다시 해석 버튼은 해석 출처가 아니라 `aiMode === 'llm'`을 보므로 **버튼이 있다** — 누르면 LLM에 다시 묻는다 (1.6, `e68a240`. 그 전에는 출처가 석판이면 숨었다).

### 1.4 결과 객체 (해석기 출력)

세 경로 모두 같은 모양을 돌려준다. **`quote`/`reason` 같은 필드는 없다** — 대사제의 말은 `interpretation` 하나이고, 거부 사유는 검증 단계(`validateOrders`)의 `rejected[].reason`에 있다.

| 필드 | 타입 | LLM (`interpreter.js:147-154`) | 석판 (`interpreter.js:324-334`) | 침묵 (`main.js:648`) |
|---|---|---|---|---|
| `interpretation` | string | 모델의 `interpretation`을 `cleanSpeech`로 다듬은 것 | 명령이 있으면 `interp.tablet.say`(머리말 `석판이 이르되,` 또는 교리 말투), 없고 `heard`가 있으면 `interp.tablet.cannot`, 그 밖은 `interp.tablet.blur` | `ui.silence.first` / `ui.silence.again` |
| `orders` | Action[] | 모델이 고른 ID → 행동 (모르는 ID는 버림, 중복 가능) | 규칙이 고른 행동 − 금지된 것, 행동 수(`actionLimit`)까지 — 넘치면 **먼저 말한 일**부터 남긴다 (칸·키 중복 없음, [3.2](#32-알고리즘)) | `[]` |
| `forbidden` | Action[] | 모델이 금지한 ID → 행동 | 부정 절에서 걸린 행동 전부 (중복 가능) | `[]` |
| `doctrine` | `'peace'｜'war'｜'abundance'｜'wisdom'｜null` | 항상 값이 있다 (스키마 enum). 한국어 이름 → id (`DOCTRINE_KO`) | 후보가 있던 첫 규칙의 교리, 없으면 금지가 있을 때 `'peace'`, 아니면 `null` | `null` |
| `heard` | string[] | 없음 | 알아들었으나 하지 못한 일의 까닭 코드 (중복 제거, [3.2](#32-알고리즘)): 후보가 없으면 종류 `preach｜attack｜wall｜village｜temple｜explore｜pray｜gather` 또는 계명·시련·마을 조건 `attack:law｜attack:earth｜village:law｜temple:villages`(`cannotWhy`), 칸이 겹쳐 못 했으면 `<종류>:tile`, 행동 수를 넘겨 빠졌으면 `<종류>:limit`(`78c891e`). 같은 기본 종류의 명령이 하나라도 남았으면 그 종류의 코드는 뺀다 | 없음 |
| `banned` | string[] | 없음 | 부정 절에서 걸린 규칙의 종류(`attack`, `gather` …, 중복 제거) — **금할 대상이 없어도** 남는다. 알아들은 말 줄의 "금함: 공격"에 쓴다(`78c891e`) | 없음 |
| `source` | `'llm'｜'tablet'｜'silence'` | `'llm'` | `'tablet'` | `'silence'` |
| `ms` | number | 스트리밍 전체 소요 ms (반올림) | 없음 | 없음 |

**행동 객체 (Action)** — `legalActions`가 만든다 (`engine.js:373-411`):

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
| `heeded` | `true` | `autoFill`이 교리를 헤아려 채운 한 자리에만 (`auto`와 함께) |

### 1.5 엔진 검증 — `validateOrders` (`engine.js:415-456`)

입력: `orders`(뺀 칩 제외), `forbiddenKeys`, `doctrine`. 앞에서부터 하나씩:

1. `forbidden`에 키가 있으면 거부 — `계시가 금지`.
2. 건설이면 **이번 장에 이미 받아들인 건설 비용을 뺀 예산**(`budget`, 시작값 = 현재 자원)으로 감당되는지. 안 되면 `자원 부족`.
3. 이미 받아들인 행동과 **같은 칸**이면: 교리 선호표 `DOCTRINE_PREF`에 새 행동의 type이 있고 기존 행동의 type은 없으면 **교체**, 아니면 새 것을 `같은 장소`로 거부. 교체할 때는 예산도 맞춘다 (`engine.js:435-445`):
   - 기존 행동이 건설이면 그 비용을 예산에 **되돌린다**.
   - 새 행동이 건설인데 되돌린 예산으로도 못 치르면, 되돌림을 취소하고 새 것을 `자원 부족`으로 거부 (기존 것은 남는다).
   - 치를 수 있으면 새 건설 비용을 빼고, 기존 것을 `같은 장소 (교리에 맞는 행동 우선)`으로 거부하고 그 자리에 새 것을 넣는다.
   - 두 행동이 모두 건설이면 선호 여부가 같아 교체가 일어나지 않으므로, 실제로는 되돌림과 차감 중 한쪽만 일어난다.
4. 받아들인 수가 `actionLimit` 이상이면 `행동 수 초과`.
5. 통과하면 건설 비용을 예산에서 빼고 받아들인다.

```js
const DOCTRINE_PREF = {
  war: ['attack', 'build'], peace: ['preach', 'pray'],
  abundance: ['gather', 'build'], wisdom: ['pray', 'explore', 'build'],
};
```

출력: `{ accepted: Action[], rejected: { action, reason }[] }`.

**자동 노동 `autoFill(state, side, accepted, forbidden, doctrine)`** (`engine.js:461-497`) — 명령이 채우지 못한 행동 수를 신도들이 알아서 채운다. 금지 키와 **확인 화면에서 뺀 키**는 쓰지 않는다. 해석 결과의 `doctrine`을 넘기는 곳은 `derivePending` (`main.js:590`)과 계명 새기기 뒤 다시 채우기 (`main.js:725`) 둘이고, 둘 다 금지 키에 뺀 칩 키를 더해 넘긴다(다시 채우기 쪽은 `e68a240`부터). 침묵(`silence`)과 율법파(`planEnemy`)는 교리 없이 부른다.

```js
// 풍요는 따로 두지 않는다 — 모자란 자원을 거두는 기본 노동이 곧 풍요의 뜻이다 (e68a240)
const DOCTRINE_LABOR = { peace: ['preach', 'pray'], war: ['attack', 'wall'], wisdom: ['explore', 'pray'] };
```

0. **뜻을 헤아린 한 자리** (플레이어, `doctrine`이 `DOCTRINE_LABOR`에 있고, 받아들인 명령이 행동 수보다 적을 때): `DOCTRINE_LABOR[doctrine]`의 종류 순서대로, 금지·뺀 키와 이미 쓴 칸을 뺀 `legalActions` 중 첫 후보 하나. `wall`은 `a.build === 'wall'`이고 **받아들인 건설의 비용을 치르고 남은 자원**(`left`)으로 성벽 비용을 낼 수 있을 때만(`e68a240` — 그 전에는 현재 보유 자원만 봐서 해결 때 돌이 모자랄 수 있었다), 그 밖은 `a.type === 종류`(건설 제외). 선교·공격은 확인 화면 승률 `actionOdds ≥ 0.5`일 때만. 풍요는 표에 없으므로 헤아린 자리가 없다. 고른 행동에는 `{ auto: true, heeded: true }`를 붙이고, 확인 화면 칩 이름이 `알아서` 대신 `뜻을 헤아림`(툴팁 `ui.chip.heededTip`)이 된다.
1. 신앙 ≤ `RULES.lowFaith`(2)이고 기도가 가능하며 수도 칸이 비어 있으면 **기도 먼저** (자리 셈에 0의 한 자리를 넣는다).
2. 식량·목재·돌을 **보유량 오름차순**으로 두 바퀴 돌며, 각 자원의 첫 채집 행동(빈 칸)을 넣는다.
3. 그래도 자리가 남으면 기도.

예 (튜토리얼 1장, 식량5·목재3·돌1, 받아들인 명령 `gather:B2:food`): 평화 → `pray:C1:`(헤아림; 선교 승률 42%라 건너뜀) + `gather:B1:stone` / 지혜 → `explore:A3:`(헤아림) + `gather:B1:stone` / 전쟁 → 공격 승률 42%, 성벽 불가라 헤아린 자리 없음 → `gather:B1:stone`, `gather:A1:wood` (교리 없음·풍요와 같다).
헤아린 자리도 `auto`라서, 계시로 **명한** 선교·공격만 세는 "되풀이에 굳는 율법"(`updateLawGuard`, [02 규칙](02-rules.md))에는 들지 않는다.

### 1.6 확인 화면 (`main.js:565-616`, `2022-2089`, `2200-2224`)

`interpret()`가 `pending`을 만들고 `derivePending()`이 파생값을 계산한다. 칩을 빼거나 옮길 때마다 `derivePending()`을 다시 부른다.

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
| `auto` | 자동 노동 (교리를 헤아린 한 자리는 `heeded: true`) | `autoFill(…, result.doctrine)` |
| `links` | `{ [action.key]: 낱말 }` | `linkWords` |
| `answered` | 청원에 답했나 | `petitionAnswered` |
| `dilemma` | 계시 말로 고른 갈림길 선택 id | `dilemmaByText` |
| `miracle` | `{ id, target, cost, key: 'miracle:<id>' }` 또는 `null` | `spokenMiracle` |
| `command` | 새길 수 있는 계명 id 또는 `null` | `parseCommandment` |
| `carve` | 계명 새기기 체크 (기본 없음=false) | 체크 상자 |
| `prev` | 다시 해석하기 전의 `pending` (바꿔 보기용) | `reinterpret` |
| `incoming` | 미플이 날아가는 중 (조작 잠금) | `enterConfirm` |

**화면 구성**
- 머리: `확인` 제목, 사제 이름 · 출처(`LLM`/`석판`/`침묵`) · 소요 초 · 교리 이름.
- 계시 원문: `linkWords`가 찾은 낱말(과 인용 낱말)에 밑줄 (`markWords`, `main.js:2133`). 해석문이 다 나오면 밑줄에서 해당 칸으로 빛줄기(최대 3개, `drawLinks`).
- 태그 줄 (`main.js:2058-2071`): 말투 · 청원 응답 · 이름 · 갈림길 · 인용 · 반대 교리 -1(두 번째 판) · 교리 3연속 예고. **은총은 장당 하나**라서 서원 > 청원 순으로 첫 하나에만 `· 은총`을 붙인다 (금지 칩에 공격·선교가 있으면 서원이 은총을 가져가 청원 태그에는 붙지 않는다).
- 해석문 (타자기 연출, 교리 3칸 이상이면 `voice-<교리>` 먹빛). 석판이 알아들었으나 할 수 없는 말이면 `석판은 그 뜻을 헤아렸으나 지금은 할 수 없도다 — …`([3.2](#32-알고리즘)).
- 칩: 받아들인 명령(번호·링크 낱말·예상 수익·선교/공격 승률·선공 표시 — 기도·신전·대성당·성벽 같은 집 안 행동에는 붙지 않고 율법파의 집 안 행동과도 견주지 않는다(`firstNote`, `9b43bbf`)·옮길 곳이 있으면 ⇄) → 자동 노동(`알아서`, 교리를 헤아린 한 자리는 `뜻을 헤아림`) → 말한 기적 칩 → 뺀 칩(`뺌`) → 거부된 칩(사유) → 금지 칩(`⊘`, 공격·선교면 `서원 · 지키면 은총`, 그 밖은 `금지`).
- 미리보기: 자원 `지금→예상` (`previewGains` + 축복 첫 채집 +1, 저주 신앙 -1, 말한 기적 비용·수익, 갈림길 증감).
- 체크 상자: `예언으로 봉인 — "{이름}" {n}장 안에 이루어지면 신앙 +{보상}, 빗나가면 -2` / `영원한 계명으로 새긴다 — 「{이름}」 {설명} (되돌릴 수 없다)`.
- 경고: 교리가 전쟁인데 공격할 곳이 없음 / 평화 + `kw.ui.preach`(`이웃|율법|전하|설득`)인데 선교할 곳이 없음.

**버튼과 조작**

| 조작 | 조건 | 효과 |
|---|---|---|
| **수락하고 공개** (Enter) | 해석문 연출이 끝난 뒤 | `accept()` → [1.7](#17-수락과-해결) |
| 칩 누르기 | 연출 끝, 미플 착지 후 | 명령·기적 칩을 뺀다/되살린다. **최대 2개** (`한 장에 두 개까지만 뺄 수 있다.`). 빈 자리는 `autoFill`이 채운다 |
| **⇄ 옮기기** → 빛나는 칸 (Esc 취소) | 연출 끝, 미플 착지 후; 받아들인 명령에 옮길 곳이 있을 때(튜토리얼 없음) (`78c891e`) | 같은 일을 다른 칸에서 한다: 후보는 `legalActions` 중 **같은 종류**(`type`·`build`·`gather`), 그 명령 자신이 아니고, 다른 받아들인 명령의 칸이 아니고, 금지되지 않은 것(`moveChoices`, `main.js:1672-1678`). 고르면 `result.orders`에서 그 명령을 바꿔 끼우고(`moveChip`) `derivePending` — 교리·금지·해석문은 그대로, 비용 없음, 횟수 제한 없음 |
| **다시 해석 · 신앙 1** (R, ㄱ) | `aiMode === 'llm'`일 때만 버튼이 있다 (`main.js:2092`, `e68a240`; 석판 모드는 결정론이라 같은 답이 나온다. LLM 실패로 석판이 대신한 경우에도 LLM 모드면 버튼이 있다 — 그 전에는 해석 출처가 `tablet`이면 숨었다). 버튼이 있어도 계시가 있고, 이번 장 `reinterpretUsed`가 아니고, 신앙 ≥ 1이어야 눌린다 (침묵이면 꺼진 채 보인다) | 신앙 -1, `reinterpretUsed = true`, 같은 원문으로 `interpret()` 다시 (지금 `aiMode`로; 이름은 유지, 예언·말투 등 다시 파싱, 뺀 칩 초기화). 이전 해석은 `pending.prev`로 남는다 |
| **↔ 이전 해석과 바꾸기** | `pending.prev`가 있을 때 | 두 해석을 맞바꾼다 (비용 없음) |
| **말을 거두기** (Esc) | 확인 단계, `speakSnap` 있음, `reinterpretUsed` 아님, 튜토리얼 아님 | `speakSnap`의 상태로 되돌림(비용·이름 환불) → `reinterpretUsed = true` → 두 번째 판(`veteran`)이면 신앙 -1 → 원문을 두루마리에 되돌려 다시 쓰게 한다. **다시 해석과 같은 장당 한 번** |

### 1.7 수락과 해결

`accept()` (`main.js:698-760`). 순서가 수치에 영향을 주므로 그대로 지킨다.

1. 계시가 있으면 기록에 `god`(원문)·`priest`(해석문) 줄.
2. `before = snapshot`, **`enemyPlan = planEnemy(state)`** (기적·말투보다 먼저 정해진다).
3. 말한 기적(빼지 않았으면) `castMiracle` → 실패하면 기록만.
4. `applyTone(state, text ? tone : null)`. 침묵이면 `streak = null`.
5. 갈림길: `pending.dilemma ?? state.dilemmaPick ?? 첫 선택지` → `payDilemma` (비용 선지불).
6. `plan = accepted + auto`. 계명 체크 + `carveCommandment` 성공이면 새 계명과 충돌하는 명령(`noSword` → 공격 / `noExpand` → 마을 건설)을 빼고 `autoFill(state, 'player', kept, 금지 키, result.doctrine)`로 다시 채운다 (`main.js:720-726`). 충돌 종류가 없는 계명(`sabbath`, `noFamine`)이면 명령을 모두 남긴다.
7. `ordered = plan.filter(!auto)` (계시로 명한 행동).
8. `findSacred` (숨은 말), 체크했으면 `sealProphecy`.
9. **`resolveRound(state, plan, enemyPlan)`** — 해결과 유지(예언 판정 포함).
10. 승패 전이면: `applySilence(state, !!text)` → (계시면) `markLegends` → `keepVows` → `wordsAfter`(청원·이름 은총).
11. 계시면 `recordRevelation(state, text, doctrine, metaphor ? 1 : 0, speakSnap?.spoken ?? spokenOf(state, text))`. **교리는 해결이 끝난 뒤에 오른다** (확인 화면 수치 = 실제 해결). 메아리면 교리가 오르지 않는다 — 메아리 여부는 **말할 때** 판정해 둔 값이다 ([4.6](#46-메아리-되풀이한-계시)).
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

- 미리 깨우기: 메인 화면에서 시작 버튼을 누를 때(`main.js:262`)와 시련 시작(`main.js:961`)에 `prepareLLM()`을 불러 둔다 (첫 계시 13초 → 3초). 실패하면 `preparing = null`로 되돌려 다음에 다시 시도.
- **매 해석마다 `session.clone()`** 으로 시스템 프롬프트만 든 깨끗한 세션을 복제해 쓰고 `finally`에서 `destroy()`. 대화 기록은 쌓지 않는다 — 지난 계시는 프롬프트의 `지난 계시` 줄로만 넘긴다.
- **샘플링 파라미터(temperature, topK)는 지정하지 않는다** — 모델 기본값. 그래서 같은 계시를 다시 해석하면 결과가 달라질 수 있다 (다시 해석 기능의 전제).
- 다운로드 진행률: `downloadprogress` 이벤트의 `e.loaded`(0~1)를 `progress`로 받아 `대사제가 제단 앞에 엎드렸다 · 모델 내려받는 중 N%`로 표시 (`main.js:2014`). (미리 깨운 세션에는 콜백이 없어서 실제로는 표시되지 않을 수 있다 → [확인 필요](#확인-필요).)

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
| `limit` | `actionLimit(state,'player')` | `engine.js:221` |
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
4. 칸 이름은 `tileName(state, tile, 'player')`: 안개 `안개 지대(B3)`, 이름 붙인 칸 `요단(D3)`, 수도 `우리 신전(C1)`/`율법파 신전(A3)`, 마을 `우리 마을(…)`/`율법파 마을(…)`, 영구 지형 `채석장(C2)`, 그 밖은 지형 이름 (`engine.js:303-311`).

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
- **타임아웃 30초**: `runInterpretation`이 `AbortController`를 만들어 `signal`을 넘기고 30초 뒤 `abort()`한다 (`main.js:553-556`). `signal`은 `session.clone({ signal })`과 `promptStreaming(…, { signal })` 둘 다에 간다. `AbortError`는 재시도하지 않고 바로 던지므로 석판으로 대신한다 (1.3). Godot 판도 같은 타임아웃 → 석판 대체를 둔다 ([6](#6-godot-이식-메모)).
- 결과 매핑: `orders`/`forbidden` ID → `byId[id]` (없는 것은 `filter(Boolean)`로 버림), `doctrine` 한국어 → id, `interpretation` → `cleanSpeech`.
- 실패 안내 `ui.notice.llmFailed`의 `{err}`는 `e.name` (`UnknownError`, `NotSupportedError`, 타임아웃은 `AbortError`, JSON 실패는 `Error`).

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

## 3. 석판(키워드) 파서 — `interpretWithTablet` (`interpreter.js:157-335`)

LLM이 없을 때의 해석기이자, LLM 모드에서도 **입력 중 알아들은 말 줄·예감(칸 강조)·계시 제안 거르기·LLM 실패 대체·메아리의 일 목록**에 쓰인다. 결정론적이다. `78c891e`에서 크게 바뀌었다: 곳을 가리키는 말로 칸을 고르고(`placeOf`·`byPlace`), 수의 말로 둘·셋을 만들고, 한 칸을 다투면 먼저 온 일을 다른 칸으로 옮기거나 까닭(`:tile`)을 알리고, 행동 수가 모자라면 먼저 말한 일부터 남긴다(`:limit`). 금지 절을 떼어 내는 모양도 넷으로 늘었다.

### 3.1 규칙표 (순서가 곧 우선순위)

정규식 원본 (`ko/interp.js:98-156`, 규칙표는 플래그 없음 — `interpreter.js:159`의 `kw(key, flags)`를 플래그 없이 부른다. 플래그를 주는 곳은 `'g'`를 받는 금지 절 넷 `kw.dontAnd`·`kw.nounAnd`·`kw.stopAnd`·`kw.enoughAnd`와 장소가 된 지형 `kw.place.<지형>` 여섯이다). 낱말 일부에 걸리지 않게 **앞뒤 보기**로 어절 경계를 흉내 낸다: `강하고`·`강화해`는 강이 아니고(`강(?![하해한력요제조화])`), `돌아가서`·`돌격`은 돌이 아니고(`돌(?![아보려봐이격팔])`, `(?<!돌아|들어|나)가라`), `생산`은 산이 아니고(`(?<![생출재야등])산`), `지켜보라`는 성벽이 아니고(`지켜(?!보)`), `빛나는`·`금빛`은 탐험이 아니고(`(?<![금은])빛(?![깔나])`), `쳐들어오면`은 공격 명령이 아니고(`쳐들(?!어오)`), `짓밟아`는 탐험이 아니고(`(?<!짓)밟아`), `강화해`는 화해(선교)가 아니고(`(?<!강)화해`), `신전도`는 전도(선교)가 아니고(`(?<!신)전도`), `미개척`은 마을 개척이 아니다(`(?<!미)개척`). 뒤 보기는 모두 **갈래마다 고정 길이**다(`(?<!돌아|들어|나)`는 2·2·1글자 갈래) → [6.4](#64-정규식문자열-이식-노트).

```js
// 석판 규칙 (장소가 드러난 규칙이 먼저. 순서는 코드의 TABLET_RULES가 정한다)
// 낱말 일부에 걸리지 않게 앞뒤를 본다: "강하고"는 강이 아니고, "돌아가서"는 돌이 아니고, "생산"은 산이 아니다
'kw.tablet.river': '(?<![가-힣])강(?![하해한력요제조화])|물고기|강물|강가|물가',
'kw.tablet.hill': '언덕',
'kw.tablet.preach': '사랑|이웃|전하|전파|설득|가르|개종|품어|복음|동족|믿게|알려|알리|받아들|맞이|환대|(?<!강)화해|손을 내밀|퍼뜨|풀어 주|구원|해방|자유를|형제로|맞으라|맞아들|양을 모|흩어진|목자|끌어안|자비|친하게|우리 편|친구로|벗으로|선교|(?<!신)전도|포교|교화|전해|말씀을 심|말씀을 뿌|화친|친교|손잡|꼬셔|꼬시|선포|열방|진리|설교',
'kw.tablet.attack': '분노|공격|싸우|싸워|싸움|쳐라|치라|쳐서|쳐부|쳐내|쳐들(?!어오)|물리치|무찌|무찔|정복|빼앗|불태|불로|벌하|칼|창을|창으로|전쟁|심판하|멸하|진격|몰아|쫓아|밀어내|무너|허물|부수|침략|습격|토벌|섬멸|응징|깨뜨|불살|태워|진군|파괴|박살|짓밟|원수|갚아|적진|급습|점령|쓰러뜨|엎어|덮쳐|치러 가|심판을 내|되찾|문을 부숴|부숴라|부숴 버|돌격|함락|죽여|죽이|약탈|포위|혼내|혼쭐|불 ?질러|불을 ?놓|무기를|때려|눈에는 눈|이에는 이|복수|앙갚|패줘|패라|패 줘|두들겨|출정|출전|전사들|전멸|정벌|불의 비|재로 돌|교만을 꺾|밀어버|밀어 버|이교도',
'kw.tablet.rest': '쉬어|쉬라|쉬게|안식|평화|쉬면서|쉬고|쉬자|고마워|고맙',
'kw.tablet.wall': '지켜(?!보)|지키|방패|성벽|막아|수호|방어|요새|울타리|담을|담장|방벽|성을 쌓|성곽|성채|버텨|튼튼|성을|(?<![가-힣])벽(?!화)|(?<!서)두르|(?:공격|침략|습격|침입|적)에 대비|담벼락|수비|경계를|경계하|굳건히 지|성을 굳건|방책|보강|강화해',
'kw.tablet.food': '배고|배불|굶|먹|곡식|수확|들판|식량|양식|겨울|열매|풍년|고기|낚|밭|곳간|곡간|빵|농사|씨를|추수|거둬|사냥|창고|채워|채우|이삭|주린|떡|밥|보습|쟁기|만나를|곡물|젖|양 ?떼|가축|목축|논을|논밭|가꾸|그물|은빛 생명|신도를 늘|사람을 늘|많아지게',
'kw.tablet.wood': '나무|숲|목재|장작|땔감|벌목|재목',
'kw.tablet.stone': '(?<![생출재야등])산(?![책업출])|돌(?![아보려봐이격팔])|바위|채석|캐|석재|광맥|광산|파라|파내|채굴|암석|채취',
'kw.tablet.village': '마을(?!마다)|넓혀|넓히|번성|번창|퍼져|땅을|(?<!미)개척|집을|집이|자손|자녀|낳아|불어나|불려|정착|터를|백성을|인구|식구|터전|거처|보금자리|살 곳|모여 살|함께 살|많아지|후손|수를 늘|수를 불|뿌리내|천막|영토|집 좀|집 지|집 짓|신도를 늘|신도를 불|사람을 늘|충만|고을|이주|거주지|지붕|깃들|새 집|동네',
// 마을 규칙을 쓰지 않는 말 (적의 마을을 빼앗으라는 뜻이면 우리 마을을 짓지 않는다)
'kw.tablet.villageExcept': '밟아|거룩한 집|적의|율법파의|그들의|저들의|원수의|빼앗|정복|나의 집|주의 집|마을 둘레|마을 주위|마을 주변|마을을 지키|마을을 지켜|미지의|낯선 땅|모르는 땅|땅을 탐|땅을 찾|땅을 살|마을을 ?(?:공격|습격|약탈|쳐|치|점령|빼앗|무너|허물|부수|태워|불)|마을에 불|놈들|적들|지도를|마을(?:엔|에는|에) (?:벽|성벽|울타리|방벽)|마을을 (?:둘러|감싸)',
'kw.tablet.temple': '높은|높이|신전을|신전 |탑|대성당|성전|제단|나의 집|주의 집|성소|거룩한 집|첨탑|영화롭|(?<![가-힣])전을|예배당|성당|교회|사원|신전도|신전이|처소|거하실|거할 곳',
// 신전 규칙을 쓰지 않는 말 (율법파의 탑을 무너뜨리라는 뜻이면 우리 신전을 높이지 않는다)
'kw.tablet.templeExcept': '쓰러뜨|무너|부수|허물|불살|태워|깨뜨|율법의|적의|그들의|저들의|원수의',
// 성벽 규칙을 쓰지 않는 말 (적의 성벽을 깨뜨리라는 뜻, 안식일·계명을 지키라는 뜻)
'kw.tablet.wallExcept': '(?:(?<!외)적|율법파|그들|저들|원수)의 ?(?:성|벽|방벽|요새|울타리|담|수도|마을)|점령|깨뜨|무너|허물|부수|안식|계명|말씀을 지|약속을 지',
'kw.tablet.pray': '기도|경배|섬기|바쳐|찬양|찬미|믿음|믿으|믿어|예배(?!당)|제사|제물|엎드|무릎|감사|영광|묵상|경건|신앙|찬송|노래|향을|단을|기억하|쉬며|우러러|경외|섬겨|기다려|기다리|침묵|기원|회개|금식',
'kw.tablet.explore': '찾|보이지|안개|탐험|숨겨|너머|살펴|살피|둘러|세상|(?<![금은])빛(?![깔나])|(?<!돌아|들어|나)가라|떠나|나아가|알아보|정찰|길을(?! 잃)|밝혀|밝히|어둠|(?<!짓)밟아|낯선|모르는 땅|미지|내디|발을 들|발을 내|먼 곳|땅끝|가 보|눈을 들|가보|구경|탐색|수색|둘러봐|지도를|탐사|미개척|척후|국경 밖|발자국|저편|건너편 땅|(?<!미)개척',
// 무엇을 거둘지 말하지 않은 채집: 가장 모자란 자원을 거둔다 (구체적인 채집 말이 없을 때만)
'kw.tablet.gatherAny': '자원|(?<!불러 )모아|모으|거두|생산|비축|채집|일하|일해|일을 하',
// 양의 말: 규칙 하나가 명령을 둘까지 만든다
'kw.many': '모두|많이|여러|곳곳|마다|최대한|가득|온 땅',
// "~지 말고": 앞의 행동은 금지다. 다만 두려움·걱정을 말리는 것이면 금지가 아니다 ("두려워하지 말고 쳐라")
'kw.dontAnd': '(\\S+?)지 ?말고',
// "~지 말고"를 금지 절로 바꾼 모양 (뒤에 쉼표를 두어 다음 절과 나눈다)
'kw.dontAndNeg': (v) => `${v.verb}지 마라,`,
// "공격 말고 선교" (명사 + 말고), "그만 베고", "기도는 됐고": 앞의 것은 금지다
'kw.nounAnd': '(\\S+?)(?:은|는|이|가|을|를)? 말고(?!기)',
'kw.stopAnd': '그만 ?(\\S+?)고(?= )',
'kw.enoughAnd': '(\\S+?)(?:은|는)? ?됐고',
// 공격 규칙을 쓰지 않는 말 (적의 공격에 대비하라는 뜻)
'kw.tablet.attackExcept': '(?:공격|침략|습격|침입)(?:에|을|으로부터|이)? ?(?:대비|막|방어|버티)|쳐들어오|공격해 ?오|원수를 ?(?:사랑|품|용서|축복)|보습|쟁기|양 ?떼를 쳐|양을 쳐|가축을 쳐|원수(?:들)?에게(?:도)? ?(?:설교|전|사랑|자비|용서)',
// 곳을 가리키는 말: "~에"로 장소가 된 지형(그 지형의 칸을 고른다, 채집 말로 읽지 않는다)
'kw.place.river': '(?:강가|강변|물가|강)에(?!서)',
'kw.place.plain': '(?:평원|들판|벌판|들)에(?!서)',
'kw.place.forest': '(?:숲속|숲)에(?!서)',
'kw.place.mountain': '(?:산기슭|산자락|산)에(?!서)',
'kw.place.hill': '언덕에(?!서)',
'kw.place.desert': '(?:사막|광야)에(?!서)',
// 수도·성지·율법파가 노리는 곳·"옆에" (어느 쪽 수도인지는 foe/ours로 가린다)
'kw.place.capital': '수도|본거지|도읍|도성',
'kw.place.holy': '성지|거룩한 땅|가운데 언덕',
'kw.place.aim': '노리는|노린|노려|넘보는|탐내는',
'kw.place.near': '옆|곁|근처|가까이|둘레|주변|어귀',
'kw.place.foe': '율법파|적|저들|그들|원수|놈들',
'kw.place.ours': '우리|나의|내 ',
// 칸 이름 (보드의 좌표): "E4", "e 4"
'kw.place.id': '(?<![A-Za-z])([A-Ia-i]) ?([1-9])(?![0-9])',
// 수의 말: "마을 두 개", "세 곳", "두 번"
'kw.count2': '두 ?(?:개|곳|번|채|군데|마을|땅)|둘(?:이|을|씩)|2 ?(?:개|곳|번)',
'kw.count3': '세 (?:개|곳|번|채|군데|마을|땅)|세곳|셋|3 ?(?:개|곳|번)',
'kw.fear': '두려워|겁내|걱정|주저|망설|슬퍼|염려|의심',
// 부정어 ("두려워하지 말고 쳐라"는 금지가 아니다)
'kw.negation': '마라|말라|말지|지 ?마|피하|멀리하|멀리 하|멈춰|멈추|그쳐|그치|그만|안 ?된다|안 ?돼|금한다|금하노라|하지 않|삼가|(?:숲|나무|산림)(?:을|를)? (?:지켜|지키|보호|아껴)',
// 절 나누기
'kw.clauseSplit': '[.,!?。]|그리고|하되|그러나|(?<=[가-힣])되(?= )',
```

규칙표 `TABLET_RULES` (`interpreter.js:160-175`). `78c891e`부터 모든 규칙에 `kind`가 있다(`heard` 까닭 코드와 알아들은 말 줄의 "금함"에 쓴다):

| # | 키 | 걸리는 행동 `match(a, tile)` | 교리 | `kind` | `except` (걸리면 이 절에서 규칙을 건너뜀) |
|---|---|---|---|---|---|
| 1 | `river` | `a.type==='gather' && tile.terrain==='river'` | abundance | `gather` | |
| 2 | `hill` | `a.type==='gather' && tile.terrain==='hill'` | wisdom | `gather` | |
| 3 | `preach` | `a.type==='preach'` | peace | `preach` | |
| 4 | `attack` | `a.type==='attack'` | war | `attack` | `attackExcept` (`78c891e`) — 적의 공격에 **대비·막기**(`공격에 대비`, `침략을 막`), `쳐들어오`·`공격해 오`, 원수를 사랑·용서하라는 말, 농사·목축의 `보습`·`쟁기`·`양 떼를 쳐` |
| 5 | `rest` | `a.type==='pray'` | peace | `pray` | |
| 6 | `wall` | `a.build==='wall'` | war | `wall` | `wallExcept` — 적·율법파·그들·저들·원수**의** 성·벽·요새·수도·마을을 말하는 것(`(?:(?<!외)적\|율법파\|그들\|저들\|원수)의 ?(?:성\|벽\|…)` — 단 `외적의`는 예외가 아니다), 점령·깨뜨·무너·허물·부수, 안식·계명·말씀·약속을 **지키라**는 말 |
| 7 | `food` | `a.gather==='food'` | abundance | `gather` | |
| 8 | `wood` | `a.gather==='wood'` | abundance | `gather` | |
| 9 | `stone` | `a.gather==='stone'` | abundance | `gather` | |
| 10 | `village` | `a.build==='village'` | abundance | `village` | `villageExcept` — 적·율법파의 땅을 빼앗으라는 말, **우리 것이 아닌 마을을 치라는 말**(`마을을 공격/쳐/점령/불…`, `마을에 불`, `놈들`, `적들`), 탐험을 뜻하는 말(`밟아`, `미지의`, `낯선 땅`, `땅을 탐/찾/살`, `지도를`…), 마을 둘레에 성벽을 두르라는 말(`마을 둘레/주위/주변`, `마을을 지키/지켜`, `마을에 벽/성벽/울타리`, `마을을 둘러/감싸`), 신전을 뜻하는 `나의 집/주의 집/거룩한 집` |
| 11 | `temple` | `a.build==='temple' \|\| a.build==='cathedral'` | wisdom | `temple` | `templeExcept` — 율법파의 탑을 무너뜨리거나 쓰러뜨리라는 말 |
| 12 | `pray` | `a.type==='pray'` | wisdom | `pray` | |
| 13 | `explore` | `a.type==='explore'` | wisdom | `explore` | |
| 14 | `gatherAny` (`fallback`) | `a.type==='gather'` | abundance | `gather` | — 같은 절에서 다른 규칙(신학 노트 규칙 포함, 이름 규칙 제외, 부정 절이어도)이 채집 후보를 찾았으면 건너뜀 |

장소가 드러난 규칙(강·언덕)이 먼저다 (`강물` → 강가 채집이 평원 채집보다 먼저). `gatherAny`는 "무엇을 거둘지 말하지 않은 채집"(`자원을 모아라`, `생산을 늘려라`, `일하라`)을 받는 맨 끝 규칙이다. `kind`가 같은 규칙이 여럿이다(채집 다섯, 기도 둘).

**동적 규칙** 두 종류 (`interpreter.js:261-267`):
- **신학 노트 규칙** (`state.lessons`): `re = new RegExp(l.word)`, `match = a.type===l.type && (!l.gather || a.gather===l.gather) && (!l.build || a.build===l.build)`, 교리 없음.
- **이름 규칙** (`state.names`의 각 `[tileId, name]`): `re = new RegExp(name)`, `match = a.tile === tileId`, 교리 없음, **`lastResort: true`** — 같은 절에 다른 규칙이 하나라도 걸리면 쓰지 않는다. 이름은 이제 주로 **곳을 가리키는 말**로 쓰인다(아래 `placeOf`) — "검은숲에서 나무를 베어라"는 이름 규칙이 아니라 숲 규칙이 검은숲 칸을 앞세워 고른다. 이름만 말하면("검은숲") 그 칸의 첫 행동.

규칙 순서: `[...신학 노트, ...TABLET_RULES, ...이름]` (`78c891e` 전에는 `[...이름, ...노트, ...TABLET_RULES]`). 동적 규칙에는 `kind`·`except`·`fallback`이 없다 — 그래서 `heard`·`banned`에 들지 않는다.

**금지 절로 떼어 내는 말, 곳·수의 말** (같은 파일):

| 키 | 쓰임 | 플래그 |
|---|---|---|
| `kw.dontAnd` | "~지 말고" — 캡처 1 = 동사 | `g` |
| `kw.nounAnd` | "공격 말고 선교", "나무를 말고" — 캡처 1 = 앞 낱말(조사 `은는이가을를` 하나는 캡처 밖), 뒤가 `기`면 아님(`말고기`) | `g` |
| `kw.stopAnd` | "그만 베고 " — 캡처 1 = 동사, 뒤에 공백이 있어야 한다 | `g` |
| `kw.enoughAnd` | "기도는 됐고" — 캡처 1 = 앞 낱말 | `g` |
| `kw.dontAndNeg` | 떼어 낸 금지 절의 모양 `(v) => \`${v.verb}지 마라,\`` (넷이 같이 쓴다) | 함수 |
| `kw.fear` | 금지가 아닌 동사(두려워·걱정…) — 넷 모두 이것에 걸리면 `"${verb} "`로 지우기만 | 없음 |
| `kw.place.river`·`plain`·`forest`·`mountain`·`hill`·`desert` | "강가에", "숲에", "산에" — **장소가 된 지형**(뒤가 `서`면 아님: "숲에서 나무를 베어라"는 채집 말) | `g` |
| `kw.place.capital`, `kw.place.foe`, `kw.place.ours` | 수도 — 적·율법파·그들 말이 있으면 율법파 수도, 우리·나의 말이 있으면 우리 수도, 둘 다 없으면 두 수도 모두 | 없음 |
| `kw.place.holy` | 성지·거룩한 땅·가운데 언덕 → `state.holyId` | 없음 |
| `kw.place.aim` | 노리는·노린·넘보는 → 보이는 율법파의 뜻(`enemyIntent`의 `shown`) 칸들 | 없음 |
| `kw.place.near` | 옆·곁·근처·둘레 → 가리킨 칸이 아니라 **그 이웃**을 앞세운다 | 없음 |
| `kw.place.id` | 칸 이름 `E4`, `e 4` — 캡처 1 = 행 글자(대문자로 바꿈), 2 = 열 숫자. 첫 일치 하나만, 그 칸이 판에 있을 때만 | 없음 |
| `kw.count2`, `kw.count3` | 수의 말: "두 곳", "둘을", "2개" → 2 / "세 번", "셋" → 3. `count3`을 먼저 본다 | 없음 |

### 3.2 알고리즘

`interpretWithTablet(state, revelation)` (`interpreter.js:255-335`, `78c891e`):

```text
legal  = legalActions(state,'player')      # 순서가 결과를 정한다 (3.3)
limit  = actionLimit(state,'player')
rules  = [노트…, TABLET_RULES…, 이름…]      # 이름 규칙은 lastResort (3.1)
forbidden = [], heard = [], banned = [], picks = [], doctrine = null
hitsOf(text) = rules 중 rule.re가 text에 걸리고 rule.except는 text에 걸리지 않는 것 (규칙 순서),
               각각 pos = text.search(rule.re)            # 그 글 안 첫 일치 위치 — 같은 절 안의 말한 순서
clauses = splitDont(revelation).split(CLAUSE)             # 금지 절 떼어 내기 → 절 나누기 (구분자는 버림)
for ci, clause in clauses:
    if clause.trim() == '': continue
    negative = NEGATION.test(clause)
    many  = COUNT3.test(clause) ? 3 : COUNT2.test(clause) ? 2 : MANY.test(clause) ? 2 : 1
    place = placeOf(state, clause)                         # { anchors, terrains, near, text } (아래)
    hits  = hitsOf(place.text)                             # 장소가 된 지형 말("숲에")을 지운 글로 읽는다
    if hits 없음 and place.text != clause: hits = hitsOf(clause)   # "강가에"만 말했으면 원문으로 다시
    found = hits마다 matches = byPlace(place, rankMatches(rule, legal.filter(a => rule.match(a, tileAt[a.tile]))))
    gathered = found 중 fallback·lastResort가 아닌 규칙에 채집 후보가 있는가   # 부정 절이어도
    plain    = found 중 lastResort가 아닌 규칙이 있는가
    for {rule, matches, pos} in found:                     # 규칙 순서 (구체적인 말이 먼저)
        if (rule.fallback and gathered) or (rule.lastResort and plain): continue
        if negative:
            forbidden.push(...matches); if rule.kind: banned.push(rule.kind)   # 대상이 없어도 banned
            continue
        if matches 없음:
            if rule.kind: heard.push(cannotWhy(state, rule.kind))            # 알아들었으나 지금 못 함
            continue
        if rule.doctrine: doctrine ??= rule.doctrine      # 후보가 있는 첫 규칙 (노트·이름 규칙은 교리 없음)
        free(b) = picks 중 b와 칸이나 키가 같은 것이 없음
        took = 0
        for a in matches:                                  # 줄 세운 후보 중 빈 것부터 many개까지
            if took >= many: break
            if free(a): picks.push({a, ci, pos, kind: rule.kind, alts: matches}); took += 1
        if took == 0:                                      # 칸이 모두 찼으면 먼저 온 일을 옮길 수 있나
            for a in matches:
                holder = picks 중 a.tile을 쥔 것
                alt = holder.alts 중 (key != holder.a.key and tile != a.tile and free)인 첫 후보
                if alt: holder.a = alt; picks.push({a, ci, pos, kind: rule.kind, alts: matches}); took = 1; break
        if took == 0 and rule.kind: heard.push(rule.kind + ':tile')          # 한 칸에 한 가지
# 행동 수를 넘으면 먼저 말한 일부터 남긴다
byTurn = picks 중 금지(key가 forbidden에 있음)되지 않은 것을 (ci, pos, pick 순번) 오름차순 정렬
for p in byTurn[limit:]: if p.kind: heard.push(p.kind + ':limit')
keep   = byTurn[:limit]의 key 집합
orders = picks 중 keep에 든 것의 a   # 내보내는 순서는 pick 순서(절 → 규칙), 옮겨진 일은 원래 자리
done   = orders의 기본 종류 (gather는 'gather', build는 build 이름 — cathedral은 'temple', 그 밖 type)
unheard = unique(heard) 중 ':' 앞 종류가 done에 없는 것
interpretation = orders ? interp.tablet.say({ prefix, verbs: orders의 text에서 끝 " (…)"를 뗀 것 })
               : unheard ? interp.tablet.cannot({ kinds: unheard })
               :           interp.tablet.blur
    # prefix = voiceOf(state)(3칸) ? DOCTRINE_VOICE[v].prefix : '석판이 이르되,'   (78c891e 전 '석판에 새겨진 말씀이도다.')
return { interpretation, heard: unheard, banned: unique(banned), orders, forbidden,
         doctrine: doctrine ?? (forbidden.length ? 'peace' : null), source: 'tablet' }
```

**`splitDont`** (`interpreter.js:179-187`) — 절 나누기 **전에** 한 번, 네 모양을 이 순서로 모두(`g`) 바꾼다:

```js
const toNeg = (m, verb) => (FEAR.test(verb) ? `${verb} ` : t('kw.dontAndNeg', { verb }));   // "…지 마라,"
const splitDont = (text) => text.replace(DONT_AND, toNeg)      // "숲을 베지 말고"   → "숲을 베지 마라,"
  .replace(STOP_AND, toNeg)                                     // "그만 베고 "       → "베지 마라, "
  .replace(ENOUGH_AND, toNeg)                                   // "기도는 됐고"      → "기도지 마라,"
  .replace(NOUN_AND, toNeg);                                    // "공격 말고"        → "공격지 마라,"
```

- `숲을 베지 말고 산에서 돌을 캐라` → `숲을 베지 마라, 산에서 돌을 캐라` → 앞 절은 부정(숲 채집 금지), 뒤 절은 돌 채집.
- `두려워하지 말고 쳐라` → 동사 `두려워하`가 `kw.fear`에 걸려 `두려워하  쳐라` → 금지 없이 공격.
- `공격 말고 선교하라` → `공격지 마라, 선교하라` → 공격 금지(`banned: ['attack']`), 선교. `나무는 그만 베고 돌을 캐라` → 목재 채집 금지, 돌. `기도는 됐고 일이나 해` → 기도 금지.
- 동사·낱말은 공백 없는 덩어리 `(\S+?)`(가장 왼쪽 일치라 어절 첫 글자부터)다. 금지 절의 모양은 넷 모두 `kw.dontAndNeg`이라 명사 뒤에도 "지 마라"가 붙는다(`공격지 마라`) — 부정어(`마라`)와 규칙 어휘(`공격`)만 걸리면 되므로 문법은 보지 않는다.
- **전역이라 모든 일치가 금지 절이 된다**(겹치지 않는 일치를 왼쪽부터, 일치마다 `kw.fear`를 따로 본다). `숲을 베지 말고 기도하지 말고 돌을 캐라` → 숲 채집·기도 금지, 돌 채집 명령. `e68a240` 전에는 `kw`가 플래그를 버려 첫 `~지 말고`만 바뀌었다.

**`rankMatches`** (`interpreter.js:189-195`) — 후보의 **첫 원소가 채집**일 때만 목록 전체를 다시 줄 세운다 (안정 정렬 + 원래 순번으로 동점 처리):
1. `gatherAny`(`fallback`)면 **플레이어 보유량이 적은 자원**부터 (`p[a.gather]`, 신앙 채집이면 `p.faith`). 다른 규칙은 이 키가 모두 0.
2. 그다음 **수확량이 많은 칸**부터: `gatherAmount(state, 'player', tile)` (`engine.js:341-351` — 지형·지물 수확량, 가뭄 -1, 풍년 평원 +1, 풍요 2칸↑ 식량 +1, 축복 `gatherBonus` +1).
3. 같으면 `legal` 순서.

**`placeOf(state, clause)`** (`interpreter.js:200-228`, `78c891e`) — 절에서 **곳을 가리키는 말**을 찾는다:

```text
anchors = Set(), terrains = Set(), text = clause
for k in [river, plain, forest, mountain, hill, desert]:          # 이 순서, 앞에서 지운 글에 이어서
    if kw.place.<k> 가 text에 걸림: terrains.add(k); text = text에서 그 말을 모두 ' '로 바꾼 것
if kw.place.capital 이 clause에 걸림:
    foe = kw.place.foe 걸림, ours = kw.place.ours 걸림
    foe나 ours가 있으면 그쪽(둘 다면 둘 다) 수도, 둘 다 없으면 두 수도 모두를 anchors에   # 수도가 없으면 넣지 않음
if kw.place.holy 걸림 and state.holyId: anchors.add(holyId)
if kw.place.aim 걸림: enemyIntent(state) 중 shown인 것의 tile을 모두 anchors에      # 율법파가 노리는 곳
m = clause.match(kw.place.id); if m and tileAt[m[1].toUpperCase() + m[2]]: anchors.add(그 id)   # 첫 일치 하나
for [id, name] in state.names: if clause.includes(name): anchors.add(id)            # 붙인 이름
return { anchors, terrains, near: kw.place.near 걸림, text }
```

- 지형 말은 `~에`(뒤가 `서`가 아님)일 때만 곳이다: `숲에 마을을 세워라`는 숲 칸에 마을이고 나무를 베라는 말이 아니다(숲 규칙은 지운 글에서 안 걸린다). `숲에서 나무를 베어라`는 그대로 채집 말이다.
- 수도·성지·노리는 곳·칸 이름·붙인 이름은 원문(`clause`)에서 찾는다. 곳의 말은 규칙이 아니라 **줄 세우기**에만 쓰인다 — 그 말만 있고 일의 말이 없으면 명령이 없다(지형 말만 있으면 원문으로 다시 읽어 채집이 될 수 있다: `강가에` → 강 규칙).

**`byPlace(state, place, matches)`** (`interpreter.js:229-242`) — 가리킨 곳에 맞을수록 앞으로 (안정 정렬, 동점은 원래 순서):

```text
if anchors도 terrains도 없음: return matches (그대로)
score(a) = max over anchor of ( d == 0 ? (near ? 1 : 4) : d == 1 ? (near ? 4 : 2) : 0 )   # d = distance(a의 칸, anchor)
         + (a의 칸 지형이 terrains에 있으면 1)
```

- 가리킨 칸 4, 그 이웃 2. `옆에`(`near`)면 이웃이 4이고 가리킨 칸 자체는 1. 지형이 맞으면 +1. 거리 2 이상은 0.
- `rankMatches` **뒤에** 적용된다 — 채집은 수확량 순서가 동점 깨기로 남는다.
- 후보(`legal`)에 없는 칸은 고를 수 없다. 가리킨 칸이 닿지 않으면 그 이웃이, 그것도 없으면 원래 첫 후보가 된다(`율법파의 수도를 쳐라` — 튜토리얼에서 율법파 수도 A3는 닿지 않아 이웃 A2 공격).

세부 규칙 (코드 그대로 따라야 골든이 맞는다):
- **절 나누기**는 `splitDont` 뒤의 글을 `String.split(정규식)` — 구분자(`. , ! ? 。`, `그리고`, `하되`, `그러나`, 그리고 `78c891e`부터 한글 뒤·공백 앞의 `되` — "성벽을 쌓**되** 공격하지 마라")를 버린다. 캡처 묶음이 없다. 빈 절(공백뿐)은 건너뛴다.
- **예외(`except`)** 는 규칙을 읽는 그 글(지형 말을 지운 글, 또는 다시 읽은 원문)에서 본다. 걸린 절에서는 그 규칙이 아예 없는 것과 같다 (명령·금지·`heard`·`banned`·교리 모두 없음). `적의 마을을 빼앗아라` → 마을 규칙 건너뜀, 공격만. `안식일을 지켜라` → 성벽 규칙 건너뜀, `안식` → 기도(쉼). `적의 공격에 대비해 성벽을 쌓아라` → 공격 규칙 건너뜀(`attackExcept`), 성벽만.
- **부정**은 절 단위. 부정 절에서는 명령을 하나도 만들지 않고, 걸린 규칙의 **모든** 가능한 행동을 금지하며(여러 규칙이 같은 행동을 걸면 중복된다. 채집은 `rankMatches`·`byPlace` 순서로 들어간다) 그 규칙의 `kind`를 `banned`에 넣는다 — 금할 행동이 하나도 없어도(`공격하지 마라`인데 닿는 율법파가 없음). 부정 절은 `heard`·교리를 만들지 않는다. 부정어는 `78c891e`에서 늘었다: `멈춰/멈추`, `그쳐/그치`, `그만`, `안 된다/안 돼`, `금한다`, `하지 않`, `삼가`, 그리고 **숲·나무·산림을 지켜/지키/보호/아껴** — "숲을 지켜라"는 베지 말라는 뜻이다(그 절의 성벽 규칙도 함께 금지로 걸린다 — [확인 필요](#확인-필요)).
- **한 규칙은 한 절에서 명령 `many`개까지**: 1, 양의 말(`kw.many`)이면 2, 수의 말이면 2·3(`kw.count2`·`kw.count3`, `78c891e`). 줄 세운 후보 중 **아직 명령하지 않은 칸·키**부터. 그래서 `곡식을 거두라, 곡식을 거두라, 곡식을 거두라, 곡식을 거두라`는 식량 칸 둘(B2, C2)을 채우고 셋째 절부터는 빈 후보가 없어 `gather:tile`이 생기지만 식량 명령이 남아 걸러진다. `마을 두 곳을 세워라` → 마을 둘, `곡식을 세 번 거두라` → 식량 칸이 둘뿐이면 둘.
- **한 칸에 한 가지**: 같은 칸을 여러 규칙이 원하면 **규칙 순서**(3.1 표)가 먼저인 쪽이 갖는다. 뒤의 규칙이 빈 후보를 하나도 못 찾으면, 그 칸을 쥔 앞 일이 **자기 다음 후보로 옮겨 갈 수 있는지** 본다 — 옮길 수 있으면 옮기고 둘 다 한다(`성벽을 쌓고 기도하라` → 마을이 있으면 성벽은 마을로, 기도는 수도). 없으면 `heard`에 `<kind>:tile`(`기도하고 신전을 지어라` → 신전(규칙 11)이 수도를 갖고 `pray:tile`, `성벽을 높이 쌓아라` → 성벽 + `temple:tile`). `78c891e` 전에는 조용히 버렸다.
- **행동 수**: 금지되지 않은 pick이 `limit`를 넘으면 **먼저 말한 일**(절 순서, 같은 절이면 글 속 위치)부터 남기고, 빠진 일은 `<kind>:limit`. 예 (튜토리얼, 행동 3): `곡식을 거두고 나무를 베고 돌을 캐고 기도하라` → 식량·목재·돌, `heard: ['pray:limit']`. `기도하고 곡식을 거두고 나무를 베고 돌을 캐라` → 기도가 먼저라 남고 돌이 빠지지만, 채집이 남았으므로 `gather:limit`은 걸러진다. `78c891e` 전에는 규칙 순서로 앞의 것부터 채워 뒤의 규칙이 밀렸다.
- **`heard` 거르기**: 같은 **기본 종류**의 명령이 하나라도 남았으면 그 종류의 까닭 코드는 모두 뺀다(`split(':')[0]`과 명령의 기본 종류 비교; 대성당 명령은 `temple`). 그래서 `heard`는 "그 종류는 하나도 못 했다"는 뜻이다. 명령이 있어도 쌓이지만(`성벽을 쌓고 곡식을 거두라` → 명령 식량, `heard: ['wall']`) 해석문에는 **명령이 하나도 없을 때만** 쓴다.
- **`gatherAny`는 구체 규칙의 뒷받침**: 같은 절에서 다른 규칙(노트 규칙 포함, 이름 규칙 제외, 부정 절 포함)의 후보에 채집이 하나라도 있었으면 건너뛴다. `곡식을 모아라` → 식량만, `자원을 모아라` → 가장 모자란 돌.
- **이름 규칙은 마지막 수단**: 같은 절에 다른 규칙이 하나라도 걸렸으면(후보가 없어도) 쓰지 않는다. 이름은 `placeOf`의 anchor로 칸을 앞세운다.
- **가능한 행동이 없는 규칙은 교리를 정하지 않는다** (`평화를 지켜라`가 성벽이 없다고 전쟁이 되지 않게). 첫 교리는 **규칙 순서**(절 순서 → 규칙표 순서)로 정해지고 계시 속 낱말의 위치와는 무관하다. 행동 수로 빠진 일의 규칙도 교리는 정할 수 있다.
- **`cannotWhy(state, kind)`** (`interpreter.js:244-252`, `e68a240`) — 후보가 없을 때의 까닭. 계명·시련·마을 조건이 막았으면 그것을, 아니면 종류 그대로. 위에서부터 첫 번째:

  | 조건 | 코드 |
  |---|---|
  | `kind == attack`이고 계명 `noSword`를 새김 | `attack:law` |
  | `kind == attack`이고 시련 「대지모」(`config.trial == 'earth'`) | `attack:earth` |
  | `kind == village`이고 계명 `noExpand`를 새김 | `village:law` |
  | `kind == temple`이고 신전이 3단계(`templeLevel >= 3`)인데 우리 마을 수 < `cathedralVillages`(대성당 다음 단계에 필요한 마을, 큰 판은 더 많다) | `temple:villages` |
  | 그 밖 | `kind` (`gather`·`pray`도 `78c891e`부터 나온다) |

  해결 단계가 더하는 코드: `<kind>:tile`(한 칸에 한 가지), `<kind>:limit`(행동 수).
- 까닭 문장은 언어팩 도우미 `cannotLabel(code)`(`ko/interp.js:4-16`, `78c891e`)가 만든다: `종류이름(까닭)`. 종류 이름은 `CANNOT_KIND`(선교·공격·성벽·마을·신전·탐험·기도·채집), 까닭은 `CANNOT_WHY`에서 코드 전체 → `:` 뒤 → 종류 순으로 찾는다 — 선교·공격 `닿는 율법파 땅이 없다`, 성벽 `자원이 모자라거나 둘러쌀 곳이 없다`, 마을 `자원이나 빈 땅이 없다`, 신전 `자원이 모자라다`, 탐험 `닿는 안개가 없다`, 채집 `닿는 곳에 그 자원이 없다`, 기도 `수도가 없다`, `attack:law` `계명이 칼을 금한다`, `attack:earth` `이 시련에서는 칼을 들 수 없다`, `village:law` `계명이 넓히기를 금한다`, `…:tile` `그 칸에는 이미 다른 일이 있다 — 한 칸에 한 가지`, `…:limit` `행동 수가 모자라다`. `temple:villages`만 따로 `대성당(마을이 모자라다)`. `interp.tablet.cannot` = `석판은 그 뜻을 헤아렸으나 지금은 할 수 없도다 — {cannotLabel을 ", "로}. 나머지는 각자 할 일을 하라.` 예: 계명 「칼을 들지 말라」를 새긴 뒤 `적을 쳐라` → `…할 수 없도다 — 공격(계명이 칼을 금한다)…`.
- 교리가 끝내 없고 금지만 있으면 `peace` (절제의 말).
- 해석문은 **남은 명령**(금지·행동 수로 거른 뒤)으로 만든다 — `78c891e` 전에는 금지로 거르기 전 명령으로 만들어 금지된 행동을 말할 수 있었다.
- 사제 성향(`PRIESTS`)은 석판에 영향이 없다. 교리 말투 머리말만 쓴다.

### 3.3 행동 순서에 대한 의존

석판은 "규칙에 맞는 가능한 행동 중 **첫 빈** 것"(채집은 `rankMatches`로 수확량 순으로 줄 세우고, 곳을 가리키는 말이 있으면 `byPlace`로 한 번 더 줄 세운 뒤, 동점은 이 순서)을 고르므로 `legalActions`의 순서가 곧 **곳을 말하지 않았을 때의 대상 칸 선택 규칙**이다 (`engine.js:378-416`). 건설·선교·공격·탐험은 곳의 말이 없으면 줄 세우지 않으므로 이 순서 그대로다 (`나무를 베어 집을 지어라` → A1은 벌목이 차지해 마을은 다음 빈 칸 산 B1; `B2에 마을을 세워라`처럼 곳을 말하면 그 칸):

1. `reach(state,'player')`의 칸 순서 — 소유 칸을 `state.tiles`(행 우선) 순서로 돌며, 각 칸에서 반경(수도 2, 마을 1) 안의 칸을 `state.tiles` 순서로 처음 본 것부터 (`engine.js:212-220`). 칸마다: 채집 → 마을 건설 → 선교 → 공격.
2. 성벽 (소유 건물 칸, `state.tiles` 순서).
3. 수도: 기도 → 신전 → 대성당.
4. 탐험 (닿는 범위 바로 바깥 안개 칸; `reach` 순서 × `neighbors` 방향 순서).

따라서 Godot 판은 `tiles` 배열 순서(행 우선), `reach`의 순회, 육각 이웃 방향표(`engine.js:40-43`)를 **JS와 똑같이** 해야 석판 결과가 같다. (상세는 [02 규칙](02-rules.md).)

### 3.4 알려진 한계 (의도된 절충 포함)

| 계시 | 결과 | 까닭 |
|---|---|---|
| `나를 위한 높은 곳을 마련하라` (신전 비용 부족) | 명령 없음, 교리 없음, 해석문 `…지금은 할 수 없도다 — 신전(자원이 모자라다)…` | 신전 행동이 불가능 → `heard: ['temple']`만 |
| `방패가 되어라` (돌 부족) | 명령 없음, `heard: ['wall']` | 성벽 불가능 |
| `불` | 명령 없음, 흐릿 | 규칙에 없음 (LLM은 사건으로 해석) |
| `강물이 너희를 먹이리라` (강이 안개 속) | 평원 곡식 | 강 규칙에 후보가 없어(`heard`에 `gather`가 생기지만 걸러짐) `먹` → 식량 규칙 |
| `Love thy neighbor` | 명령 없음 | 한국어 어간만 안다 |
| `검은숲을 사랑하라` (A1에 `검은숲` 이름) | 선교 + A1 채집, 교리 평화 | `검은숲` 속 `숲`에 숲 규칙이 걸리고, 이름이 곳이 되어 A1을 앞세운다. 이름 규칙 자체는 다른 규칙이 있어 쓰지 않는다 (`78c891e` 전: A1 채집 + 선교 + C3 채집) |
| `나무를 베어 집을 지어라` | A1 벌목 + **산 B1**에 마을 | 곳을 말하지 않으면 첫 빈 마을 후보 (3.3). `산에 마을을`, `B2에 마을을`처럼 곳을 말하면 그 칸이 앞선다 |
| `율법파의 탑을 무너뜨려라` (율법파 수도가 안개 속) | 가까운 율법파 마을 A2 공격 | 공격 규칙은 탑과 마을을 가리지 않는다 (`templeExcept` 덕에 우리 신전은 높이지 않는다). `탑`은 곳의 말이 아니다 — `율법파의 수도를 쳐라`는 수도가 닿으면 수도를, 아니면 그 이웃을 앞세운다 |
| `강가에 마을을 세워라` (닿는 강에 빈 땅이 없음) | 첫 빈 마을 후보 | 곳의 말은 줄 세우기일 뿐이라 그 지형 후보가 없으면 원래 순서 (튜토리얼: 숲 A1) |
| `율법파가 노리는 곳에 성벽을 쌓아라` | 노리는 칸이 우리 수도·마을이면 그곳 | 율법파의 뜻이 **보이는**(`shown`) 칸만 가리킨다 — 어려움처럼 공격만 보이는 판에서는 마을 건설 의도를 가리킬 수 없다 |
| `숲을 지켜라` | 명령 없음, 숲 채집 **과 성벽** 금지 | `(숲\|나무\|산림)을 지켜`가 부정어라 그 절 전체가 부정이 되고, 성벽 규칙(`지켜`)도 걸려 금지된다 |
| `곡식을 거두고 나무를 베고 돌을 캐고 기도하라` (행동 3) | 식량·목재·돌, `heard: ['pray:limit']` | 먼저 말한 셋만 한다 |

### 3.5 말과 행동 잇기 — `linkWords` (`interpreter.js:339-358`)

확인 화면의 밑줄·빛줄기, 판결문, 알아들은 말 줄(3.7)에 쓴다. **받아들인 행동마다** 그 행동을 부른 낱말 하나를 찾는다. 먼저 찾은 것이 이긴다:

1. 그 칸의 이름(`state.names[a.tile]`)이 계시에 들어 있으면 그 이름.
2. 신학 노트: `revelation.includes(l.word) && a.type===l.type && (!l.gather || a.gather===l.gather)` (건설 종류는 보지 않는다).
3. 석판 규칙(`TABLET_RULES`, `gatherAny` 포함) 순서대로: `m = revelation.match(rule.re)`(계시 전체에서 첫 일치)가 있고 `rule.match(a, tile)`이면 `m[0]`. `except`·`splitDont`·절 나누기는 보지 않는다 (원문 전체를 본다).
4. 그 칸의 **지형 이름**(`TERRAIN[tile.terrain].name`, 예: `숲`, `평원`)이 계시에 있으면 그 이름.

출력 `{ [a.key]: 낱말 }`. LLM이 고른 행동에도 같은 규칙을 쓴다 (그래서 LLM이 자유롭게 해석해도 밑줄이 그어진다). 예: `자원을 모아라` → `gather:B1:stone`의 낱말 `자원`, `멀리 가라` → `explore:A3:`의 낱말 `가라`.

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

**`extractLesson(state, revelation, orders)`** (`interpreter.js:363-371`) — **LLM 경로에서만**, 해결 뒤에 부른다 (`main.js:739`):
1. `words = nouns(revelation)` 중 석판 규칙 어느 것에도 안 걸리고(`BASIC` = `TABLET_RULES`의 `re` 원본 14개 — `gatherAny` 포함, `*Except` 제외 — 를 `|`로 이은 정규식, `interpreter.js:362`), `kw.lessonStop`에 없고, 붙인 이름이 아닌 것. 어휘가 늘수록 `BASIC`에 걸려 배우지 않는 낱말도 는다 (`자비를 베풀라`의 `자비`, `성당에 모여라`의 `성당`은 이제 석판 어휘라 `null`). 반대로 앞뒤 보기로 뺀 조각(`빛나`, `금빛`)은 `BASIC`에도 안 걸려 노트로 배울 수 있다.
2. 없으면 `null`. 있으면 `words[0]`이 이미 노트에 있으면 `null`.
3. 아니면 `{ word: words[0], type, gather, build }` — **받아들인 첫 명령**(`accepted[0]`)의 종류를 그 낱말의 뜻으로 배운다.
4. `state.lessons`에 넣고 **최대 3개** (넘으면 가장 오래된 것부터 버림). 재생이 끝나면 사제가 `깨달았나이다. 신께서 '{word}'이라 하시면 {뜻}을 뜻하시는군요.`라고 말한다. 연대기에서 하나씩 **잊게 하기** 가능 (`main.js:2378`).

```js
'kw.lessonStop': ['신도', '말씀', '백성', '부족', '율법파', '율법', '계절', '이번', '신이', '신께서', '나의', '모든'],
```

노트는 이후 LLM 프롬프트(`대사제가 깨달은 신의 말버릇`)와 석판 규칙에 쓰인다 → **LLM이 가르친 말버릇을 석판도 알아듣는다**.

### 3.7 석판의 다른 쓰임

| 쓰임 | 위치 | 어떻게 |
|---|---|---|
| 알아들은 말 줄 | `heardHTML` (`main.js:2339-2355`), 두루마리 아래 `#heardLine` (`main.js:2041`) | 아래 |
| 메아리의 일 목록 | `setPlanSig` (`interpreter.js:374-375`) → 엔진 `isEcho`·`spokenOf` | 석판 `orders`의 종류 키를 정렬해 이은 것 — [4.6](#46-메아리-되풀이한-계시) |
| 입력 중 예감 | `scheduleHints` (`main.js:2358-2371`) | 입력 멈춤 250ms 뒤 알아들은 말 줄을 다시 그리고, `interpretWithTablet(draft).orders`의 칸(최대 6)을 보드에 흐리게 강조. LLM 결정과 다를 수 있다 |
| 계시 제안 칩 | `suggestions` (`main.js:2248-2259`) | 후보 문장 중 석판으로 명령이 1개 이상 나오고 봉인어가 없는 것만 ([4.20](#420-계시-제안과-예감)) |
| LLM 실패·타임아웃 대체 | `runInterpretation` | 1.3 |

**알아들은 말 줄** — 말하기 단계에서 textarea 바로 아래(`aria-live="polite"`). 렌더할 때 한 번, 그 뒤 `oninput` → `scheduleHints`(250ms)마다 `heardHTML(draft)`로 갈아 끼운다. 모드와 무관하게 **석판**으로 계산한다:

```js
function heardHTML(text) {
  if (!text?.trim()) return '';
  const r = interpretWithTablet(state, text.trim());
  const links = linkWords(state, text, r.orders);
  // 금한 일: 금지 행동이 있으면 그 종류 이름(중복 제거), 없으면 banned 종류 (78c891e)
  const fk = r.forbidden.length ? [...new Set(r.forbidden.map(kindName))] : (r.banned ?? []).map((k) => t('ui.heard.kindWord', { k }));
  const forbid = fk.length ? ` <span class="heard-no">${t('ui.heard.forbid', { kinds: fk })}</span>` : '';
  if (r.orders.length) {   // 행동마다 "낱말 → 종류" (링크 낱말이 없으면 종류만), " · "로 잇는다
    const parts = r.orders.map((a) => (links[a.key] ? t('ui.heard.pair', { word, kind: kindName(a) }) : kindName(a)));
    const also = r.heard?.length ? ` <span class="heard-no">${t('ui.heard.also', { kinds: r.heard })}</span>` : '';
    return `${t(aiMode === 'llm' ? 'ui.heard.guess' : 'ui.heard.label')} ${parts.join(' · ')}${also}${forbid}`;
  }
  if (r.heard?.length) return t('ui.heard.cannot', { kinds: r.heard }) + forbid;
  if (forbid) return `${t(aiMode === 'llm' ? 'ui.heard.guess' : 'ui.heard.label')}${forbid}`;
  return t('ui.heard.none');
}
```

| 키 (`ko/ui.js:17-28`) | 문구 |
|---|---|
| `ui.heard.label` (석판 모드) | `알아들은 말 —` |
| `ui.heard.guess` (LLM 모드) | `석판의 예감 (대사제는 더 헤아린다) —` |
| `ui.heard.pair` | `<b>{word}</b> → {kind}` |
| `ui.heard.kind` | `{자원} 채집` / `기도` / `탐험` / `선교` / `공격` / `마을 건설` / `성벽` / `신전 높이기` / `대성당` |
| `ui.heard.cannot` | `뜻은 알아들었으나 지금은 할 수 없다 — {cannotLabel을 ", "로}` (`heard`의 까닭 코드 — 3.2. `78c891e`부터 `interp.tablet.cannot`과 같은 도우미라 사유 문구가 같다) |
| `ui.heard.also` | `못 함: {cannotLabel을 ", "로}` — 명령이 있을 때 덧붙이는 못 한 일 (`78c891e`) |
| `ui.heard.forbid` | `금함: {종류 이름을 ", "로}` (`78c891e`) |
| `ui.heard.kindWord` | `banned` 종류 → 이름: 선교·공격·성벽·마을·신전·탐험·기도·채집 (`78c891e`) |
| `ui.heard.none` | `아직 알아들은 말이 없다 — 곡식·나무·돌·마을·성벽·기도·안개·이웃·쳐라 같은 말을 넣어 보라` |

`못 함:`·`금함:` 조각은 `<span class="heard-no">`(적갈색, 줄바꿈 없음 — [06 §2.1](06-ui-ux.md#21-speak--계시-쓰기))로 감싼다. 예 (튜토리얼 1장): `나무를 베어 집을 지어라` → `알아들은 말 — <b>나무</b> → 목재 채집 · <b>집을</b> → 마을 건설`, `방패가 되어라` → `뜻은 알아들었으나 지금은 할 수 없다 — 성벽(자원이 모자라거나 둘러쌀 곳이 없다)`, `싸우지 마라` → `알아들은 말 — 금함: 공격`, `공격 말고 선교하라` → `알아들은 말 — <b>선교</b> → 선교 금함: 공격`, 자원을 채운 튜토리얼에서 `기도하고 신전을 지어라` → `알아들은 말 — <b>신전을</b> → 신전 높이기 못 함: 기도(그 칸에는 이미 다른 일이 있다 — 한 칸에 한 가지)`. `78c891e` 전에는 명령만 보여 주고 금지와 못 한 일은 보여 주지 않았다.

### 3.8 이해력 측정 — 회귀 시험

- `node tools/tests/tablet-cases.mjs [--all]` — 새 플레이어가 쓸 법한 문장 **549개**(`78c891e` 기준 — `e68a240`의 254개 + 평가자 A·B·C의 새 문장 + 눈 가린 묶음 7)와 기대 행동. 상태는 튜토리얼 3×3 1장(`createState({ mode: 'tutorial', seed: 1 })` + `startRound`)에 목재·돌·식량을 6으로 채운 것 (율법파 마을이 바로 옆이라 선교·공격 대상이 있고, 성벽·마을을 지을 수 있다).
- 판정: `want`의 행동 종류(`gather:food`, `build:wall`, `pray`, …; `gather:any`는 아무 채집, `forbid:…`는 금지, `heard:<까닭 코드>`는 해석기가 그 까닭을 알림 — 예 `heard:pray:tile`, `78c891e`)가 **모두** 나오고, `avoid`에 적힌 종류가 명령에 **하나도** 없으면 성공. 실패한 문장만 출력하고(`--all`이면 전부) 끝에 `석판 이해: n/N (%)`.
- `78c891e`에서 **549/549 통과**. `e68a240`이 더한 문장은 `숲을 베지 말고 기도하지 말고 돌을 캐라`(돌 채집 명령, 숲 채집·기도 금지), `78c891e`의 까닭 문장은 `기도하고 신전을 지어라`·`성벽을 쌓고 기도하라`(`heard:pray:tile`)와 `저들의 우상을 부수고 나의 말씀을 심으라`(`heard:attack:tile` — 닿는 율법파 칸이 하나뿐이라 선교와 공격이 한 칸을 다툼)다. Godot 판도 같은 표를 GDScript 테스트로 돌린다 (6.5).

**측정 이력** — 새 묶음은 **그 묶음에 맞춰 어휘를 고치기 전에** 한 번 재고, 고친 뒤 회귀 시험에 넣었다 (시험 파일의 절 주석):

| 묶음 | 문장 수 | 첫 측정 | 비고 |
|---|---|---|---|
| 2026-09-30 평가 (`docs/EVALUATION-2026-09-30.md`) | 37 | **41%** | 이 작업 전의 석판. `강하고`→강·`돌아가서`→돌 같은 오독 포함 |
| 첫 40문장 | 40 | — | 평가가 짚은 문장(`식량을 모아라`, `빛이 있으라`, `싸워라`, `너희는 강하고 담대하라`, `돌아가서 기다려라` …) |
| 묶음 1~3 | 85 | 묶음 3: **67%** | |
| 묶음 4 | 30 | **77%** | |
| 묶음 5 | 40 | **68%** | 은유 섞음 |
| 묶음 6 | 58 | **90%** | 어휘를 보지 않은 에이전트가 씀 (눈 가린 시험) |
| `e68a240` | 1 | — | "~지 말고"가 둘인 문장 (고친 동작의 회귀 시험) |
| 평가자 A (`78c891e`) | 72 | **66%** | 두 번째 외부 평가의 평가자들이 쓴 처음 보는 문장 — 곳을 고르고 싶다는 불만이 가장 많았다 |
| 평가자 B (`78c891e`) | 90 | **73%** | 한 칸을 다투는 문장(`heard:…:tile`) 포함 |
| 평가자 C (`78c891e`) | 57 | **50%** | |
| 묶음 7 (`78c891e`) | 76 | **75%** | 어휘를 보지 않은 에이전트가 씀, 상투어를 피함 (눈 가린 시험). 금지한 일을 해 버린 문장은 0% |

재고 나서 고쳐 넣었으므로 549/549는 과적합된 수치다. 처음 보는 문장에 대한 이해율은 마지막 측정들 — 평가자 50~73%, 눈 가린 묶음 7 75%(`78c891e`) — 이 가장 가까운 추정이다(묶음 7은 묶음 6과 달리 상투어를 피해 썼다). 새 문장을 더할 때는 먼저 재고 나서 고친다.

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
| 메아리 | 바로 앞 계시와 공백·문장부호 빼고 같음, 또는 석판이 알아듣는 일의 종류가 같음 (`isEcho`, 말할 때 `spokenOf`) | 비용 +1, 교리 기록 없음 | 예 (튜토리얼 제외) |
| 인용 | 최근 3장 계시와 겹치는 명사 | 긴 계시도 비용 1 | 예 |
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
| 판결문 | 명령 성공률 | 성취/반쯤/빗나감 도장 | 예 |

(예전의 **기이한 해석**(LLM이 계시와 무관한 행동을 고르면 판당 한 번 은총 +1)과 **성언**(세 번 되풀이한 구절이 든 계시는 비용 1)은 `afab303`에서 빠졌다. 성언은 되풀이를 벌하는 메아리와 서로 어긋났다. 죽은 필드로 남아 있던 `state.oddUsed`·`state.liturgy`와 두 장치의 언어팩 키도 `e68a240`에서 지웠다 — 옮기지 않는다.)

### 4.1 말투

`lore.js:65-72`, `engine.js:667-672`, `data.js:73-79`.

```js
'kw.tone.curse':    '저주|멸하|망하리|벌하리|재앙',
'kw.tone.blessing': '축복|복을|복되|복이|번성하라|은혜',
'kw.tone.metaphor': '처럼|같이|듯|마냥',
```

탐지 우선순위: **저주 > 축복 > 비유 > 명령**(아무것도 없음). 석판·LLM 공통 (원문만 본다). 수락 때 `applyTone`:

| 말투 | 효과 | 코드 |
|---|---|---|
| 축복 `blessing` | `roundMods.gatherBonus = 1` → 이번 장 **플레이어의 첫 채집** +1 (그 채집에서 소모) | `engine.js:349`, `1147` |
| 저주 `curse` | `roundMods.attackBonus = 1` → 이번 장 **모든** 플레이어 공격 주사위 +1, 그리고 즉시 신앙 -1 (0 미만 없음) | `engine.js:671`, `1219` |
| 비유 `metaphor` | `recordRevelation(..., extra=1)`: 교리 +1 뒤에 그 교리가 아직 3(`graceDoctrineBelow`) 미만이면 +1 더 (최대 6) | `engine.js:1402-1404` |
| 명령 `command` | 없음 | |

- 침묵이면 `applyTone(null)` (보너스 지움).
- 확인 화면 승률(`actionOdds`)은 저주면 공격 +1을 미리 반영한다.
- `같이`(함께), `벌하리`(석판 공격 어간 `벌하`와 겹침) 같은 오탐이 있다.

### 4.2 이름 붙이기

`lore.js:74-84`, `engine.js:652-665`.

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
- 석판: 이름이 **곳을 가리키는 말**이 되어 그 칸을 앞세우고(`placeOf`), 다른 일의 말이 없으면 **이름 규칙**(마지막 수단)이 그 칸의 첫 행동을 고른다(3.1·3.2, `78c891e`). `linkWords` 1순위, 말한 번개의 표적 선택([4.10](#410-말한-기적)).
- 수락 뒤 `wordsAfter`: 은총 +1 (`{장소}를 '{이름}'이라 부르게 했다`).
- 첫 이름이면 해결 뒤 지혜 +1 (지혜 < 3일 때, `main.js:737`).
- 전설이 된 땅은 이름 있는 칸에 붙지 않는다. 소명 「부르는 이름」(이름 셋), 업적 `namer`.
- 말을 거두면 이름도 되돌려진다 (스냅숏이 이름 전).

### 4.3 예언 (`lore.js:86-101`, `engine.js:674-703`, `data.js:81-90`)

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

### 4.4 청원 (`engine.js:623-650`, `main.js:764-772`)

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

### 4.5 서원 (금욕) — `keepVows` (`engine.js:1445-1453`)

수락 뒤(계시가 있을 때):
1. `types` = 해석 결과 `forbidden` 중 `attack`/`preach` 종류 (중복 제거). 없으면 끝.
2. `attack`이 들어 있으면 `state.vowNext = 'attack'` → **다음 장 율법파가 「성전」(L5) 카드를 앞당겨 쓴다** (쉬움·튜토리얼 제외, `REACT.vow`).
3. 이번 장 계획(자동 노동 포함)에 그 종류가 하나라도 있으면 끝(은총 없음).
4. 아니면 **은총 +1** (`칼을 거두는 서원을 지켰다`), `stats.vows += 1`.
금지는 가능한 행동에서만 나오므로 "할 수 있었던 공격·선교를 금한" 경우만 해당된다. 확인 화면의 금지 칩에 `서원 · 지키면 은총`이 붙는다.

### 4.6 메아리 (되풀이한 계시)

`engine.js:732-749`, `1417-1425`, 일 목록 `interpreter.js:374-375`. 지난 계시를 **되풀이**하면 말씀이 무뎌진다 — "한 줄짜리 필승 문장"을 막는 장치 (`afab303`; 아래 "되풀이에 굳는 율법"과 함께 가장 센 한 줄 전략의 봇 승률을 100% → 33%로 낮췄다). `9b43bbf`부터는 **말만 바꾼 같은 계획**도 되풀이다 — 같은 계획을 두 문장으로 번갈아 말하는 스크립트의 승률이 45% → 25%가 되었다(커밋 기록).
- 탐지 `isEcho(state, text, sig)`: 튜토리얼이 아니고, 글이 비지 않았고, 다음 둘 중 하나.
  1. **글**: `/[\s\p{P}]/gu`로 공백·문장부호를 모두 지운 글이 `state.revelations.at(-1).text`를 똑같이 지운 것과 같다. `이웃을, 사랑하라!`는 `이웃을 사랑하라`의 메아리다.
  2. **일**: 이번 계시의 일 목록 `sig`가 비어 있지 않고 마지막 계시에 기록된 `sig`와 같다. `sig` = 석판(`interpretWithTablet`)이 이 계시에서 내는 `orders`의 종류 키(`gather:<자원>`·`build:<건물>`·그 밖 `type`)를 중복 없이 정렬해 `|`로 이은 것 — 칸·개수·금지는 보지 않는다. 예: `기도하라`·`무릎 꿇고 경배하라`·`신전에서 기도하라`는 모두 `pray`, `기도하고 곡식을 거두라`는 `gather:food|pray`.
- 일 목록은 엔진이 스스로 만들지 못한다: `interpreter.js`가 읽힐 때 `setPlanSig((state, text) => …)`로 넣는다. 해석기를 불러오지 않은 스크립트에서는 `''`이라 글로만 판정한다. LLM 모드에서도 **석판**으로 만든다 — 대사제가 다르게 읽어도 석판 기준이다.
- **말할 때 판정**: `spokenOf(state, text) = { sig, echo }`를 인장을 누를 때(비용 지불 전) 계산해 `speakSnap.spoken`에 두고, 수락 때 `recordRevelation(…, spoken)`에 넘긴다(1.1, 1.7). 해결 뒤 다시 판정하지 않는 까닭: 해결로 할 수 있는 일이 바뀌면 같은 글이 다른 목록으로 읽힌다. 비용(`revelationCostFor` 안의 `isEcho`)도 같은 순간에 계산하므로 비용과 기록이 어긋나지 않는다.
- 비용: `revelationCostFor`에 **+1** ([1.2](#12-계시-비용)). 입력 중 비용 알약이 `신앙 N · 되풀이`로 바뀐다 (메아리가 인용 표시보다 먼저, 툴팁 "지난 계시와 같은 말, 또는 말만 바꾼 같은 일들 — …").
- 교리: 수락 뒤 `recordRevelation`이 넘겨받은 `spoken.echo`를 보고, 메아리면 `state.revelations.push({ round, text, doctrine, echo: true, sig })` + 기록 `같은 말씀이 되풀이되어 무뎌졌다 — 교리가 오르지 않는다.`(`log.echo`)만 하고 **곧바로 끝낸다** — 교리 +1, 비유의 추가 +1, 교리 대립, 연속(`streak`) 갱신과 3연속 기적이 모두 없다 (4.13의 1~5단계를 건너뜀). 메아리가 아니어도 `sig`는 기록한다(비었으면 필드 없음).
- 폭이 넓다: 이름 붙이기 계시(`이 산을 시온이라 부르라` — 석판은 `산`을 돌 캐기로 읽는다) 다음 `시온에서 돌을 캐어 오라`, 선교 예언 다음 선교 명령, 공격 명령 다음 말한 번개(`번개를 내려 율법파를 벌하라` — `벌하`가 공격)도 메아리다. 골든 11판 중 9판에 메아리가 있고 그중 8판이 말만 바꾼 되풀이다([golden README](../export/golden/README.md)).
- 메아리 계시도 `revelations`에 (`doctrine`까지) 남으므로 세 번째 되풀이도 메아리이고, 인용(4.8)·검열어(`frequentNoun`)·지도자 반박, 다음 장 "율법파가 들었다" 반응(`engine.js:576`, 4.13)에는 평소처럼 쓰인다.
- 확인 화면에 별도 태그는 없다 (비용 알약과 해결 뒤 기록으로만 보인다).
- 비슷한 "되풀이 벌칙"이 하나 더 있다: 계시로 **명한** 선교·공격을 연달아 쓰면 율법파가 그 행동에 방어 +1/+2를 쌓는다 (`lawGuard`, 낱말이 아니라 명령 종류를 본다 — [02 규칙](02-rules.md)).

### 4.7 은총과 상한

`grantGrace` (`engine.js:612-621`):

```js
if (state.grace.round !== state.round) state.grace = { round: state.round, used: 0 };
give = max(0, min(n, RULES.gracePerRound /* 1 */ - state.grace.used));
```

**장당 신앙 1까지.** 부르는 순서: 서원(`keepVows`) → 청원 → 이름 (`wordsAfter`). 먼저 받은 하나만 효과가 있다. 예언 보상·연속 기적·기적은 은총이 아니다.

### 4.8 성구 인용

**인용 `citedWords(state, text)`** (`lore.js:41-46`):
`past` = `round-3 ≤ r.round < round`인 계시들의 명사 집합. 이번 계시의 명사(중복 제거) 중 `past`에 있고, `kw.citeStop`에 없고, 봉인어가 아닌 것.
효과: 31자 이상이어도 **비용 1** ([1.2](#12-계시-비용)). 확인 화면 `인용 · '등불'` 태그와 밑줄.

```js
'kw.citeStop': ['신도', '말씀', '백성', '부족', '율법파', '율법', '마을', '우리', '너희'],
```

인용은 **낱말을 섞어 쓰는** 것이고, 지난 계시를 **통째로** 되풀이하면 메아리([4.6](#46-메아리-되풀이한-계시))라 비용이 오히려 +1이다 (`ui.rules.words5`). 같은 구절을 세 번 쓰면 비용 1이 되던 **성언**(`findLiturgy`, `updateLiturgy`, `state.liturgy`)은 메아리와 어긋나 빠졌다 (`afab303`).

### 4.9 영원한 계명 (`lore.js:55-61`, `engine.js:1031-1039`, `data.js:216-223`)

- 새길 수 있음 `canCarve`: 두 번째 판 && 튜토리얼 아님 && `round >= 3` && 계명 < `MAX_COMMANDMENTS = 2`.
- 탐지: `kw.eternal` = `영원히|영원토록`이 **있어야** 하고, 그다음 계명표 순서(noSword → noExpand → sabbath → noFamine)로 첫 일치.
- 이미 새긴 계명, 시련 「대지모」의 `noSword`는 제외.
- 확인 화면 체크 상자(기본 해제). 수락 때 체크돼 있으면 **해결 전에** 새긴다 — 이번 장부터 지키므로 충돌 명령(`noSword` → 공격, `noExpand` → 마을 건설)을 빼고 `autoFill`로 채운다 (`main.js:720-726`). 되돌릴 수 없다.

| id | 탐지 정규식 (`kw.data.commandment.*.re`) | 효과 (판 끝까지) |
|---|---|---|
| `noSword` 칼을 들지 말라 | `(칼\|싸우\|공격\|치지\|쳐)[^.!?]*(말라\|마라\|않)` | 공격 행동이 목록에서 사라짐. 선교 주사위 +1 (교리·성인과 합쳐 최대 +2) |
| `noExpand` 땅을 넓히지 말라 | `(땅\|마을\|넓히)[^.!?]*(말라\|마라\|않)` | 마을 건설 불가. 신전 돌 비용 -1 |
| `sabbath` 안식하라 | `(안식\|쉬어\|쉬라\|쉬리라)` | `round % 4 === 0`인 장: 행동 수 -2 (최소 1), 기도 신앙 ×2 |
| `noFamine` 굶기지 말라 | `(굶기지\|굶주리지\|굶지\|배곯지)` | 매 장 식량 -1 추가 소비, 대신 식량이 모자라도 굶어 죽지 않음 |

### 4.10 말한 기적

`lore.js:48-53`, `main.js:600-616`.

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

`main.js:638-652`, `engine.js:999-1011`. 침묵 = 침묵 버튼, 또는 글자(`kw.ui.speech`)가 없는 계시. 비용 없음, 대사제를 부르지 않는다.
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

`engine.js:1308-1312`, `572-573`, `lore.js:32-39`.

- 율법 카드 L10 「검열」(`ban: true`) — 두 번째 판 && 난이도 보통 이상일 때만 덱에 든다.
- 그 카드를 쓴 장의 유지 단계에서 `bannedNext = frequentNoun(state.revelations)` — 지금까지 계시에서 **가장 많은 계시에 나온 명사**(계시당 한 번 세기, 동률이면 먼저 나온 것). 명사가 없으면 `hashPick(eng.banWords = ['분노','사랑','번개','전쟁','풍요'], seed, round)`.
- **다음 장에만** `state.bannedWords = [그 말]`.
- 효과: 그 말을 **부분 문자열로** 포함한 계시는 비용 +1. 인용 낱말에서 제외. 제안 칩에서 제외. 두루마리에 `봉인 · '{word}'` 칩, 입력에 걸리면 붉게.

### 4.13 교리 기록·대립·연속 기적·율법파 반응 (`engine.js:1394-1443`, `575-597`)

`recordRevelation(state, text, doctrine, extra, spoken = spokenOf(state, text))` — 해결 **뒤**:
0. **메아리**(`spoken.echo` — 말할 때 판정한 값)면 `{ round, text, doctrine, echo: true, sig }`를 기록하고 `log.echo`를 남긴 뒤 끝 — 아래 1~5가 모두 없다 ([4.6](#46-메아리-되풀이한-계시)).
1. `doctrine`이 있고 6 미만이면 +1. 비유면 [4.1](#41-말투)의 추가 +1.
2. `state.revelations.push({ round, text, doctrine, sig })` (`sig`는 비었으면 없음). 승패가 났으면 여기서 끝.
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
**율법파가 들었다** (`startRound`): 지난 장 계시의 교리(또는 서원 `vowNext`)에 맞서는 율법 카드를 앞당긴다 — 전쟁→L4/L3, 평화→L7, 풍요→L2/L9, 지혜→L6, 서원→L5 (쉬움·튜토리얼 제외). 보통: 뽑힌 카드가 맞서는 카드가 아니면 덱 위 세 장 중 맞서는 카드와 맞바꾼다. 어려움: 두 장의 위협 점수(`lawThreat`)에 맞서는 카드면 +2를 더해 비교한다 (`engine.js:575-597`). 지도자가 `REACT[...].line`으로 말한다.

### 4.14 오늘의 숨은 말 (`engine.js:84`, `1041-1046`)

- **오늘의 계시(daily) 모드에서만**: `state.sacred = hashPick(SACRED_WORDS, 'sacred', config.daily)`. 단어: 무지개·등불·씨앗·샘물·새벽·소금·날개 (`kw.data.sacred.*.word`), 각각 단서 문장이 있다.
- 두루마리 위 `오늘의 숨은 말 — 단서 — "…" (N글자)`.
- 수락 때 `text.includes(word)`면 한 번만 `stats.sacred = 1`, 기록 `숨은 말 「…」을 찾았다! 성서에 새겨진다.` 수치 효과는 없다.

### 4.15 갈림길 응답 (`engine.js:1048-1053`)

두 갈래 사건(두 번째 판부터 덱에 셋)과 분열의 예언자 미라는 버튼으로 고르거나 **계시의 말로** 답한다: `dilemmaByText` = 선택지 순서대로 `new RegExp(o.tags).test(text)`의 첫 일치. 우선순위 `계시로 고른 것 > 버튼 > 첫 선택지`. 확인 화면 `이 사건에 대한 뜻 · {선택}` 태그. 태그 정규식은 `ko/data.js:155-215`.

### 4.16 전설이 된 땅 (`engine.js:1013-1029`)

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

### 4.18 지도자 대사 — `leaderLine` (`lore.js:103-112`)

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

### 4.19 판결문 (`main.js:1282-1297`)

재생이 끝나면 계시에 도장: 받아들인 명령 중 결과가 좋았던 비율(주사위면 승리, 아니면 `fail`/`blocked`가 아닌 기록) — ≥ 0.7 `성취`, ≥ 0.3 `반쯤`, 그 밖 `빗나감`. 문장의 낱말은 `linkWords`의 첫 낱말(없으면 원문 앞 12자). 장 기록(`history[].verdict`)에 남는다.

### 4.20 계시 제안과 예감

- **제안 칩** (`main.js:2240-2269`): 말하기 단계에서 두루마리가 **8초** 비어 있으면, 처음 세 판(서고 기록 < 3)·튜토리얼 아님·설정 켜짐일 때 두 개를 띄운다. 후보 순서: 청원 need에 맞는 문장 → 공격 의도가 보이면 성벽 문장 → 신앙 ≤ 2면 기도 문장 → 마을·탐험·선교 문장. 중복 제거, 봉인어 포함 제외, **석판으로 명령이 1개 이상 나오는 것만**, 앞의 2개. 누르면 28ms 간격으로 타자해 넣는다.

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
| 석판 어휘·부정·절 | `kw.tablet.*`(`*Except` — `attackExcept` 포함, `gatherAny` 포함), `kw.many`, `kw.count2`·`kw.count3`, `kw.dontAnd`, `kw.nounAnd`, `kw.stopAnd`, `kw.enoughAnd`, `kw.dontAndNeg`, `kw.fear`, `kw.negation`, `kw.clauseSplit`, `kw.lessonStop` | 동사 **어간**(`거두`, `싸우`, `지키`) 부분 일치에 기댄다. 교착어라 어미가 붙어도 걸린다. 띄어쓰기로 안 갈리는 낱말 조각(`강하고`, `돌아가서`, `생산`, `강화해`, `돌격`)은 앞뒤 보기로 거른다. 부정은 `마라/말라/지 마/멈춰/안 된다` 등, `~지 말고`·`~ 말고`·`그만 ~고`·`~는 됐고`는 금지 절로 바꾼다(`kw.dontAndNeg`가 그 언어의 금지형과 절 구분자를 만든다). 절 구분자에 `~되`가 있다. 양의 말(`모두/많이/…마다`)과 수의 말(`두 곳/세 번/셋`)도 언어마다 다르다 |
| 곳을 가리키는 말 | `kw.place.*` (지형 여섯 `river`…`desert`, `capital`, `holy`, `aim`, `near`, `foe`, `ours`, `id`) | 장소격 조사 `~에`(뒤가 `서`면 아님)로 지형을 곳으로 읽는다. 수도·성지·"노리는 곳"·"옆"은 낱말, 우리/적 가르기는 소유 표현, 칸 이름은 `[A-I] ?[1-9]` 좌표 (`78c891e`) |
| 명사 뽑기 | `kw.nounSplit`(`[^가-힣]+`), `kw.particle`(조사 목록), `kw.verbish`(어미 목록), `kw.stop`, `kw.citeStop` | **한글 음절 범위**로 낱말을 자르고, 끝의 **조사 하나**를 뗀다. 로마자 계시에서는 명사가 하나도 안 나온다 (노트·인용·검열어·반박 낱말 없음) |
| 말한 기적·계명·말투·이름·예언 | `kw.miracle.*`, `kw.eternal`, `kw.tone.*`, `kw.naming`, `kw.namingTail`, `kw.nameable`, `kw.prophecy.*`(수 낱말 `한/두/세` 포함) | 이름 문형 `…을/를 …이라 부르라`, 미래형 `리라/리니`, 이름 끝 `이` 떼기 |
| 청원·갈림길·계명 | `kw.petition.*`, `kw.data.event.*.choice.*.tags`, `kw.data.commandment.*.re` | |
| 숨은 말 | `kw.data.sacred.*.word` | 화면에도 나온다 (단서의 글자 수 표시) |
| 침묵·선교 힌트 | `kw.ui.speech`(`[가-힣A-Za-z0-9]`), `kw.ui.preach` | |
| 석판의 말·알아들은 말 | `interp.tablet.prefix/say/cannot/blur`, `ui.heard.*`(`also`·`forbid`·`kindWord` 포함), 언어팩 도우미 `cannotLabel` | 까닭 코드별 "지금 할 수 없는 까닭" 문구 (`attack:law` 같은 코드 넷, `<종류>:tile`·`<종류>:limit` 포함, 3.2). `cannotLabel`은 키가 아니라 `ko/interp.js`가 내보내는 함수라 언어팩마다 새로 둔다 |
| 해석문 다듬기 | `kw.clean.*` | 좌표 뒤 조사 목록 `[을를이가에의]`, "도다" 어미 교정 |
| 프롬프트 | `interp.systemPrompt`, `interp.prompt`, `interp.threat`, `interp.lessonName`, `data.priest.*.prompt`, `data.voice.*` | "그 언어로 답하라"로 바꾼다. 교리 enum은 교리 이름을 따라 자동으로 바뀐다 |
| 제안·튜토리얼 예시 | `ui.suggest.*`, `tut.*.suggest` | 그 언어의 `kw.*`로 해석되는 문장이어야 한다 |

**조사(josa)**: 받침에 따라 `을/를`, `이/가`, `이라/라`, `으로/로`를 고른다 (`ko/grammar.js` — `batchim`, `josa`; 괄호 좌표 `우리 마을(D2)`는 괄호 앞 글자 기준). 쓰이는 곳: `interp.threat`, `interp.leaderLine`, 로그·UI 문장들. 새 언어는 `grammar.js`를 그 언어에 맞게 새로 쓴다.

**코드에 남은 언어 의존** (언어팩 밖):
- `cleanSpeech`의 문자 체계 필터 `\p{Script=Hangul}\p{Script=Latin}` (`interpreter.js:92`) — 다른 문자 체계를 더해야 한다.
- 세션 언어 `languages: ['ko', 'en']` (`interpreter.js:122`), 가용성 확인 `'en'` (`interpreter.js:110-111`) — 하드코딩.
- 목록 구분자 `', '`(최근 계시·위협·노트), `' / '`(갈림길), 행동 설명 끝 `/ \(.*\)$/` 떼기 (`interpreter.js:323`).
- `engine.js:14`가 `i18n/ko/grammar.js`를 직접 import 한다.
- 메아리 판정의 `/[\s\p{P}]/gu` (`engine.js:739`)는 언어팩 밖에 있지만 어느 언어에나 맞는다 (공백·문장부호만 다른 같은 글). 일 목록(`sig`)은 석판을 거치므로 그 언어의 `kw.*`에 달려 있다.
- 프롬프트의 `너의 신의 이름은 ${god}이다.`는 받침을 보지 않는다 (`엘로아이다`).

---

## 6. Godot 이식 메모

### 6.1 해석기 인터페이스

JS 설계(`docs/DESIGN.md:26` "해석기 인터페이스 분리")를 그대로 둔다. 엔진은 해석기를 모르고, 해석기는 엔진의 `legal_actions`/`action_limit`만 읽는다.

```gdscript
# core/interpreter/interpreter.gd
class_name Interpreter
# 결과: { interpretation: String, orders: Array[Dictionary], forbidden: Array[Dictionary],
#         doctrine: String|null ('peace'|'war'|'abundance'|'wisdom'), source: 'llm'|'tablet'|'silence',
#         heard?: Array[String], banned?: Array[String] (석판만), ms?: int (LLM만) }
# 엔진의 메아리가 석판의 일 목록을 쓴다 (JS: interpreter.js가 engine.setPlanSig로 등록) — Rules에 Callable로 넣는다
func interpret(state: GameState, text: String) -> Dictionary:   # LLM 구현은 await 가능한 코루틴
	return {}
```

폴백 사슬은 JS와 같게: **LLM(또는 원격) → 실패/타임아웃(JS는 30초)/형식 오류 → 같은 계시를 석판으로**, 안내 문구 `ui.notice.llmFailed`. 석판은 LLM 모드에서도 항상 있어야 한다 (알아들은 말 줄·예감·제안·대체).

### 6.2 선택지

| 방법 | 장점 | 단점 | 메모 |
|---|---|---|---|
| **(a) 석판만 GDScript로** | 오프라인, 결정론, 골든으로 바로 검증 | 자유 문장 이해가 얕다 (3.4) | 최소 구현. 어느 방법이든 이것부터 |
| **(b) 로컬 LLM** (llama.cpp 기반 GDExtension) | 오프라인, 비용 없음, 원판(Chrome 내장 Gemma)과 같은 성격 | 모델 파일 수 GB, 메모리·첫 로드 시간, 기기 편차 | JSON 문법 제약(GBNF) 필수 |
| **(c) 원격 API** (예: Anthropic Claude API) | 해석 품질이 가장 좋다 | 네트워크·비용·지연, **API 키를 게임에 넣으면 안 된다** → 중계 서버 | 구조화 출력으로 스키마 강제 |

**(a) 석판 GDScript 뼈대** — 3.2의 알고리즘을 한 줄씩 옮긴다. 정규식은 언어팩(`docs/export/i18n-ko.json`)의 `kw.*` 원본을 `RegEx.create_from_string()`으로 만든다 (앞뒤 보기 포함 그대로 — 6.4).

```gdscript
# id, 교리, kind, 예외 키, fallback — interpreter.js:160-175와 같은 순서 (78c891e부터 kind는 모두 있다)
const TABLET_RULES := [
	{"id": "river",     "doctrine": "abundance", "kind": "gather"},
	{"id": "hill",      "doctrine": "wisdom",    "kind": "gather"},
	{"id": "preach",    "doctrine": "peace",     "kind": "preach"},
	{"id": "attack",    "doctrine": "war",       "kind": "attack",  "except": "kw.tablet.attackExcept"},
	{"id": "rest",      "doctrine": "peace",     "kind": "pray"},
	{"id": "wall",      "doctrine": "war",       "kind": "wall",    "except": "kw.tablet.wallExcept"},
	{"id": "food",      "doctrine": "abundance", "kind": "gather"},
	{"id": "wood",      "doctrine": "abundance", "kind": "gather"},
	{"id": "stone",     "doctrine": "abundance", "kind": "gather"},
	{"id": "village",   "doctrine": "abundance", "kind": "village", "except": "kw.tablet.villageExcept"},
	{"id": "temple",    "doctrine": "wisdom",    "kind": "temple",  "except": "kw.tablet.templeExcept"},
	{"id": "pray",      "doctrine": "wisdom",    "kind": "pray"},
	{"id": "explore",   "doctrine": "wisdom",    "kind": "explore"},
	{"id": "gatherAny", "doctrine": "abundance", "kind": "gather",  "fallback": true},
]

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
		"gatherAny": return a.type == "gather"
	return false

# JS의 전역 replace('g')처럼 **모든** 일치를 왼쪽부터 바꾼다 — 네 패턴을 이 순서로 (interpreter.js:184-187)
func sub_neg(re: RegEx, text: String) -> String:
	var out := ""; var last := 0
	for m in re.search_all(text):           # 겹치지 않는 일치
		var verb := m.get_string(1)
		out += text.substr(last, m.get_start() - last)
		out += (verb + " ") if FEAR.search(verb) != null else T.t("kw.dontAndNeg", {"verb": verb})
		last = m.get_end()
	return out + text.substr(last)

func split_dont(text: String) -> String:
	return sub_neg(NOUN_AND, sub_neg(ENOUGH_AND, sub_neg(STOP_AND, sub_neg(DONT_AND, text))))

# 알아들었으나 할 수 없는 까닭 코드 (interpreter.js:244-252, 3.2)
static func cannot_why(state, kind: String) -> String:
	var cmd: Array = state.get("commandments", [])
	if kind == "attack" and "noSword" in cmd: return "attack:law"
	if kind == "attack" and state.config.get("trial") == "earth": return "attack:earth"
	if kind == "village" and "noExpand" in cmd: return "village:law"
	if kind == "temple" and state.sides.player.templeLevel >= 3 \
			and Engine.village_count(state, "player") < Engine.cathedral_villages(state): return "temple:villages"
	return kind

static func base_kind(a: Dictionary) -> String:
	if a.type == "gather": return "gather"
	if a.type == "build": return "temple" if a.build == "cathedral" else a.build
	return a.type

# 첫 후보가 채집이면: (fallback이면 보유량 적은 자원) → 수확량 많은 칸 → 원래 순번
func rank_matches(state, rule: Dictionary, matches: Array) -> Array:
	if matches.is_empty() or matches[0].type != "gather": return matches
	var p = state.sides.player
	var rows := []
	for i in matches.size():
		var a = matches[i]
		var need = p.get(a.get("gather", ""), 0) if rule.get("fallback", false) else 0
		rows.append({"a": a, "i": i, "n": need, "g": Engine.gather_amount(state, "player", state.tile_at[a.tile])})
	rows.sort_custom(func(x, y): return x.n < y.n if x.n != y.n else (x.g > y.g if x.g != y.g else x.i < y.i))
	return rows.map(func(x): return x.a)

# 곳을 가리키는 말 (interpreter.js:207-228)
func place_of(state, clause: String) -> Dictionary:
	var anchors := {}; var terrains := {}; var text := clause     # Dictionary를 집합으로 (순서는 결과에 영향 없음)
	for k in ["river", "plain", "forest", "mountain", "hill", "desert"]:
		if PLACE_TERRAIN[k].search(text) != null:
			terrains[k] = true
			text = PLACE_TERRAIN[k].sub(text, " ", true)             # 모두 ' '로
	if PLACE.capital.search(clause) != null:
		var foe := PLACE.foe.search(clause) != null
		var ours := PLACE.ours.search(clause) != null
		for side in ["player", "enemy"]:
			if (foe or ours) and not ((side == "enemy" and foe) or (side == "player" and ours)): continue
			var c = Engine.capital_of(state, side)
			if c: anchors[c.id] = true
	if PLACE.holy.search(clause) != null and state.holyId: anchors[state.holyId] = true
	if PLACE.aim.search(clause) != null:
		for x in Engine.enemy_intent(state): if x.shown: anchors[x.tile] = true
	var m := PLACE.id.search(clause)
	if m:
		var id := m.get_string(1).to_upper() + m.get_string(2)
		if state.tile_at.has(id): anchors[id] = true
	for id in state.names: if clause.contains(state.names[id]): anchors[id] = true
	return {"anchors": anchors.keys(), "terrains": terrains, "near": PLACE.near.search(clause) != null, "text": text}

func by_place(state, place: Dictionary, matches: Array) -> Array:
	if place.anchors.is_empty() and place.terrains.is_empty(): return matches
	var rows := []
	for i in matches.size():
		var tl = state.tile_at[matches[i].tile]
		var s := 0
		for id in place.anchors:
			var d := Hex.distance(tl, state.tile_at[id])
			s = max(s, (1 if place.near else 4) if d == 0 else ((4 if place.near else 2) if d == 1 else 0))
		if place.terrains.has(tl.terrain): s += 1
		rows.append({"a": matches[i], "i": i, "s": s})
	rows.sort_custom(func(x, y): return x.s > y.s if x.s != y.s else x.i < y.i)   # 안정 정렬 대신 순번을 2차 키로
	return rows.map(func(x): return x.a)

func interpret(state, text: String) -> Dictionary:
	var legal: Array = Engine.legal_actions(state, "player")   # JS와 같은 순서여야 한다 (3.3)
	var limit: int = Engine.action_limit(state, "player")
	var rules := _lesson_rules(state) + _tablet_rules + _named_rules(state)   # 이름 규칙은 {"lastResort": true}
	var forbidden := []; var heard := []; var banned := []; var picks := []; var doctrine = null
	var clauses := regex_split(CLAUSE, split_dont(text))
	for ci in clauses.size():
		var clause: String = clauses[ci]
		if clause.strip_edges() == "": continue                  # JS trim()과의 차이는 6.4
		var negative := NEGATION.search(clause) != null
		var many := 3 if COUNT3.search(clause) else (2 if COUNT2.search(clause) else (2 if MANY.search(clause) else 1))
		var place := place_of(state, clause)
		var hits := hits_of(rules, place.text)                  # [{rule, pos}] — pos는 그 글 안 첫 일치 시작
		if hits.is_empty() and place.text != clause: hits = hits_of(rules, clause)
		var found := []
		for h in hits:
			var ms := legal.filter(func(a): return h.rule.match.call(a, state.tile_at[a.tile]))
			found.append({"rule": h.rule, "pos": h.pos, "matches": by_place(state, place, rank_matches(state, h.rule, ms))})
		var gathered := found.any(func(f): return not f.rule.get("fallback", false) and not f.rule.get("lastResort", false) \
				and f.matches.any(func(a): return a.type == "gather"))
		var plain := found.any(func(f): return not f.rule.get("lastResort", false))
		for f in found:
			var rule: Dictionary = f.rule; var matches: Array = f.matches
			if (rule.get("fallback", false) and gathered) or (rule.get("lastResort", false) and plain): continue
			if negative:
				forbidden.append_array(matches)
				if rule.has("kind"): banned.append(rule.kind)
				continue
			if matches.is_empty():
				if rule.has("kind"): heard.append(cannot_why(state, rule.kind))
				continue
			if doctrine == null and rule.get("doctrine") != null: doctrine = rule.doctrine
			var took := 0
			for a in matches:
				if took >= many: break
				if _free(picks, a): picks.append({"a": a, "ci": ci, "pos": f.pos, "kind": rule.get("kind"), "alts": matches}); took += 1
			if took == 0:
				for a in matches:
					var holder = _holder_of(picks, a.tile)
					var alt = null
					for b in holder.alts:
						if b.key != holder.a.key and b.tile != a.tile and _free(picks, b): alt = b; break
					if alt == null: continue
					holder.a = alt
					picks.append({"a": a, "ci": ci, "pos": f.pos, "kind": rule.get("kind"), "alts": matches}); took = 1
					break
			if took == 0 and rule.has("kind"): heard.append(rule.kind + ":tile")
	# 행동 수: 먼저 말한 일부터 (절 → 글 속 위치 → pick 순번)
	var by_turn := []
	for i in picks.size():
		if not forbidden.any(func(x): return x.key == picks[i].a.key): by_turn.append(picks[i].merged({"i": i}))
	by_turn.sort_custom(func(x, y): return x.ci < y.ci if x.ci != y.ci else (x.pos < y.pos if x.pos != y.pos else x.i < y.i))
	for p in by_turn.slice(limit): if p.kind != null: heard.append(p.kind + ":limit")
	var keep := {}
	for p in by_turn.slice(0, limit): keep[p.a.key] = true
	var orders := picks.map(func(p): return p.a).filter(func(a): return keep.has(a.key))
	# … done = orders의 base_kind 집합, unheard = 중복 없는 heard 중 split(":")[0]이 done에 없는 것,
	#   해석문(say / 명령 없고 unheard 있으면 cannot / 그 밖 blur), banned 중복 제거, doctrine ?? (금지 있으면 'peace')
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

1. **가능한 행동 목록의 내용과 순서** (`legalActions`) — LLM ID(`A1…`)와 석판의 첫 빈 후보 선택이 모두 여기에 달려 있다.
2. **행동 키 형식** `type:tile:gather|build|''` — 골든·금지·뺀 칩·링크·판결의 공통 키.
3. **ID 형식** `A{1부터}`, 칸별 묶음 순서, 행동 설명 문구 (`eng.act.*`) — 프롬프트 재현.
4. **스키마의 의미**: 금지 → 행동 → 교리 → 해석문 순서, enum으로 ID 제한, 교리 enum = 언어팩 교리 이름.
5. **검증 규칙** (`validateOrders`: 금지 → 누적 건설 예산 → 같은 칸(교리 선호, 교체 때 예산 되돌림) → 행동 수)과 `autoFill`(교리를 헤아린 한 자리 `DOCTRINE_LABOR`(풍요 없음) + 승률 0.5 문턱 + 헤아린 성벽은 받아들인 건설을 치르고 남은 자원으로 포함).
6. **결과 객체 모양** (1.4)과 폴백 사슬.
7. **석판의 세부**: 규칙 순서(노트 → 표 → 이름)·`kind`·`except`·`fallback`·`lastResort`, `splitDont`(네 모양, 모든 일치, 이 순서), 양의 말(2)·수의 말(2·3), `placeOf`(지형 말 지우기 순서, 수도의 적/우리 가르기, 칸 이름 첫 일치)와 `byPlace` 점수(4·2, `옆`이면 1·4, 지형 +1), `rankMatches`(→ `gatherAmount`까지 같아야 한다) 뒤 `byPlace` 순서, 첫 **빈** 후보와 칸을 쥔 일 옮기기, 행동 수는 (절, 글 속 위치, pick 순번) 순서로 자르기, `orders`는 pick 순서로 내보내기, `heard`와 `cannotWhy`·`:tile`·`:limit` 까닭 코드와 기본 종류로 거르기, `banned`. 회귀 시험 `tools/tests/tablet-cases.mjs` 549문장이 모두 같게 나와야 한다.
8. **수락 순서** (1.7) — 교리는 해결 뒤, 기적은 맨 앞, 계명은 해결 전.
9. **`hashPick`** 비트 단위 동일 (지도자 대사·청원자·사제·검열어 대체·숨은 말).
10. **메아리 판정** `isEcho` (공백·문장부호 지우기, 튜토리얼 제외, 석판의 일 목록 `sig` 비교 — 종류 키를 JS 기본 정렬 순으로 `|` 연결) — 비용과 교리 기록이 달라진다. 판정은 **말할 때** 한 번 해 두고 수락 때 그 값을 쓴다(`spokenOf`).
11. **`cleanSpeech`** (LLM 해석문 표시가 같게).

### 6.4 정규식·문자열 이식 노트

Godot `RegEx`는 PCRE2다. 현재 코드가 쓰는 JS 정규식 기능과 대응:

| JS에서 쓰는 것 | 어디 | Godot/PCRE2 |
|---|---|---|
| 플래그 없는 `new RegExp(src)` + `.test()` | 거의 전부 | `RegEx.create_from_string(src)`, `search(s) != null`. 비전역이라 `lastIndex` 문제 없음 |
| `text.search(re)` → 첫 일치 위치 | 석판 `hitsOf`의 `pos` (`interpreter.js:268`) | `search(s).get_start()`. JS는 UTF-16 단위, Godot는 코드 포인트 위치지만 **같은 글 안의 순서 비교**에만 쓰므로 결과가 같다 |
| `g` 정규식 + `.test()` 뒤 `.replace()` | 장소가 된 지형 `kw.place.<지형>` (`placeOf`, `interpreter.js:211-214` — `lastIndex`를 0으로 되돌려 가며 쓴다) | `search(text) != null`이면 `sub(text, " ", true)`. Godot `RegEx`에는 `lastIndex` 상태가 없다 |
| `str.match(re)` (비전역) → `m[0]`, `m[1]`, `m[2]` | 이름, 예언 기한, `linkWords` | `search()` → `get_string(0/1/2)`. **괄호 묶음 순서를 바꾸지 말 것** (코드가 번호로 읽는다) |
| `g` + `str.replace(re, '$1')` | `cleanSpeech` 3·4단계 | `re.sub(s, "$1", true)` |
| `g` + `replace(/[\s\p{P}]/gu, '')` | 메아리 `isEcho`의 `plainWords` (`engine.js:739`) | `re.sub(s, "", true)`. `\p{P}`는 PCRE2가 UTF 모드에서 그대로 받는다. `\s`는 아래 `(*UCP)` 주의 |
| `g` + 콜백 치환 | `cleanSpeech` 5단계(`stemFix`), `splitDont`(`kw.dontAnd`·`kw.stopAnd`·`kw.enoughAnd`·`kw.nounAnd` 차례로 — `interpreter.js:159`의 `kw`가 `e68a240`부터 `'g'`를 넘긴다) | 콜백이 없다 → `search_all`로 돌며 직접 이어 붙인다 (6.2 `sub_neg`·`split_dont`). 네 번의 치환은 앞 치환의 결과 글에 차례로 한다. `e68a240` 전 JS는 `splitDont`만 첫 일치 하나를 바꿨다 |
| `String.split(regex)` | 절 나누기, 명사 나누기 | 위 `regex_split` 도우미 (패턴이 빈 문자열에 걸리지 않으므로 결과가 같다) |
| `str.match(/[^.!?]+[.!?]*/g)` | 두 문장 자르기 | `search_all` |
| `/[^\p{Script=Hangul}\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]/gu` | `cleanSpeech` 1단계 | `\p{Script=…}` 대신 **`\p{Hangul}`, `\p{Latin}`** 으로 쓴다 (모든 PCRE2 판이 받는 문법) |
| 앞 보기 `(?=…)`, `(?!…)` | `kw.clean.coord`, 석판 어휘 여럿 (`강(?![하해…])`, `지켜(?!보)`, `마을(?!마다)`, `쳐들(?!어오)`, `예배(?!당)`, `길을(?! 잃)` …), `kw.nounAnd`의 `말고(?!기)`, `kw.stopAnd`의 `고(?= )`, `kw.place.<지형>`의 `에(?!서)`, `kw.place.id`의 `(?![0-9])`, `kw.clauseSplit`의 `되(?= )` | 지원 |
| **뒤 보기 `(?<!…)`, `(?<=…)`** | 석판 어휘: `kw.tablet.river`·`preach`·`wall`·`stone`·`village`·`temple`·`explore`·`gatherAny`, `kw.tablet.wallExcept` (`(?<![가-힣])`, `(?<!강)`, `(?<!신)`, `(?<![생출재야등])`, `(?<!미)`, `(?<!서)`, `(?<![금은])`, `(?<!돌아\|들어\|나)`, `(?<!짓)`, `(?<!외)` — 이것은 `(?:(?<!외)적\|…)` 묶음 안, `(?<!불러 )`), `kw.place.id`의 `(?<![A-Za-z])`, `kw.clauseSplit`의 **긍정** 뒤 보기 `(?<=[가-힣])되` | 모두 **갈래마다 고정 길이**라 PCRE2가 받는다. `(?<!돌아\|들어\|나)`처럼 갈래끼리 길이가 달라도(2·2·1) 각 갈래가 고정이면 PCRE2는 허용한다 — 안 되는 것은 한 갈래 안에서 길이가 변하는 뒤 보기(`(?<!a+)`, `(?<!ab?)` 등)다. 어휘를 늘릴 때 이 규칙을 지킨다 |
| 한글 범위 `[가-힣]` | 명사·이름·석판 뒤 보기 | Godot 문자열은 UTF-32라 코드 포인트 범위로 동작 |
| `\s`, `\S` | 여러 곳 (`kw.dontAnd`·`kw.nounAnd`·`kw.stopAnd`·`kw.enoughAnd`의 `(\S+?)`, `isEcho`) | JS는 유니코드 공백(U+3000 등)도 `\s`. PCRE2는 기본이 ASCII → 패턴 앞에 `(*UCP)`를 붙이거나 입력을 정규화 |
| 따옴표 `“ ‘ ” ’` | `kw.naming` | 그대로 |
| `String.raw\`…\`` | 언어팩 원본 | JSON/리소스 파일에 원본 그대로 두면 GDScript 이스케이프를 피할 수 있다 |
| `includes` | 비용(봉인어)·링크·숨은 말 | `String.contains()` |
| `.length` | 비용(30자), 이름 길이, 두 글자 명사 | JS는 UTF-16 단위, Godot는 코드 포인트. 한글은 같고 **이모지 등 BMP 밖 문자만 다르다** → 필요하면 UTF-16 길이 함수를 따로 둔다 |
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

1. **판 골든** — 이미 있다: `node tools/golden.mjs` → `docs/export/golden/*.json`. 장마다 `revelation`, `cost`, `tone`, `tablet.{orders, forbidden, doctrine, interpretation}`, `accepted`, `rejected`, `auto`, `petitionAnswered`, `plan`, 기록이 들어 있다 (`heard`·`banned`와 `auto`의 `heeded` 표시, 계시의 `sig`는 골든에 없다 — `auto` 키 목록에 헤아린 자리가 들어 있을 뿐이고, 일로 본 메아리는 `cost`와 `log.echo` 줄로만 드러난다). Godot 테스트: 같은 계시를 석판에 넣어 `tablet`이 같은지, 검증·자동 노동 결과가 같은지. 골든은 `afab303`에서 새 석판·자동 노동으로 다시 만들었고, `e68a240`(막기 대칭·헤아린 성벽 예산), `9b43bbf`(규칙 3차·일 메아리)·`78c891e`(곳·수의 말, 머리말 `석판이 이르되,`)에서 다시 뽑았다.
   - **석판 회귀 시험** — `tools/tests/tablet-cases.mjs`의 549문장(3.8)을 그대로 GDScript 표로 옮겨, 명령·금지의 종류와 `heard:` 까닭 코드가 JS와 같은지 본다.
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

**석판 골든 표** (튜토리얼 3×3, 1장 시작 상태 `createState({ mode: 'tutorial' })` + `startRound`, 식량5·목재3·돌1, 행동 수 3 — 위 2.3 예 1의 행동 목록. `78c891e` 코드로 Node에서 다시 실행한 결과. 머리말은 `석판이 이르되,`, 빈 칸의 `heard`·`banned`는 `[]`):

| 계시 | orders | forbidden | doctrine | 해석문 / 링크 / `heard`·`banned` |
|---|---|---|---|---|
| `강물이 너희를 먹이리라` | `gather:B2:food` | | abundance | `석판이 이르되, 평원(B2)에서 곡식을 거둔다!` / `먹` |
| `숲을 베지 마라` | | `gather:A1:wood`, `gather:C3:wood` | peace | `석판의 말씀이 흐릿하도다. 각자 할 일을 하라.` / `banned: ['gather']` |
| `이웃을 사랑하라` | `preach:A2:` | | peace | 링크 `이웃` |
| `두려워하지 말고 쳐라` | `attack:A2:` | | war | 링크 `쳐라` (`kw.fear` → 금지 아님) |
| `나를 위한 높은 곳을 마련하라` | | | null | `석판은 그 뜻을 헤아렸으나 지금은 할 수 없도다 — 신전(자원이 모자라다). 나머지는 각자 할 일을 하라.` (`heard: ['temple']`) |
| `보이지 않는 곳에 답이 있다` | `explore:A3:` | | wisdom | 링크 `보이지` |
| `산에서 돌을 캐고, 숲에서 나무를 베어라` | `gather:B1:stone`, `gather:A1:wood` | | abundance | `…산(B1)에서 돌을 캔다, 그리고 숲(A1)에서 나무를 벤다!` / `산`, `숲` |
| `오늘은 쉬어라` | `pray:C1:` | | peace | 링크 `쉬어` |
| `싸우지 마라` | | `attack:A2:` | peace | 흐릿 / `banned: ['attack']` |
| `불` | | | null | 흐릿 |
| `배고픔을 잊게 하라` | `gather:B2:food` | | abundance | 링크 `배고` |
| `방패가 되어라` | | | null | `…할 수 없도다 — 성벽(자원이 모자라거나 둘러쌀 곳이 없다)…` (`heard: ['wall']`) |
| `모든 것을 바쳐 나를 경배하라` | `pray:C1:` | | wisdom | 링크 `바쳐` |
| `숲을 베지 말고 산에서 돌을 캐라` | `gather:B1:stone` | `gather:A1:wood`, `gather:C3:wood` | abundance | `splitDont` → `숲을 베지 마라, 산에서 …` / `banned: ['gather']` |
| `숲을 베지 마라, 산에서 돌을 캐라` | `gather:B1:stone` | `gather:A1:wood`, `gather:C3:wood` | abundance | |
| `숲을 베지 마라 그리고 산에서 돌을 캐라` | `gather:B1:stone` | `gather:A1:wood`, `gather:C3:wood` | abundance | |
| `숲을 베지 말고 돌을 캐지 말고 기도하라` | `pray:C1:` | `gather:A1:wood`, `gather:C3:wood`, `gather:B1:stone` | wisdom | 두 `~지 말고`가 모두 금지 절 (3.2; `e68a240` 전에는 돌 채집이 **명령**되고 교리 abundance) |
| `숲을 베지 말고 기도하지 말고 돌을 캐라` | `gather:B1:stone` | `gather:A1:wood`, `gather:C3:wood`, `pray:C1:` | abundance | `banned: ['gather', 'pray']` (`e68a240` 전에는 기도가 **명령**) |
| `곡식을 거두라, 곡식을 거두라, 곡식을 거두라, 곡식을 거두라` | `gather:B2:food`, `gather:C2:food` | | abundance | 절마다 첫 빈 식량 칸 — 둘뿐이라 둘 (셋째 절부터의 `gather:tile`은 식량 명령이 있어 걸러짐) |
| `곡식을 많이 거두라` | `gather:B2:food`, `gather:C2:food` | | abundance | 양의 말 `많이` → 둘 |
| `자원을 모아라` | `gather:B1:stone` | | abundance | `gatherAny` → 가장 모자란 돌 / 링크 `자원` |
| `곡식을 모아라` | `gather:B2:food` | | abundance | 식량 규칙이 채집을 찾아 `gatherAny`는 건너뜀 |
| `거두지 마라` | | `gather:B1:stone`, `gather:A1:wood`, `gather:C3:wood`, `gather:B2:food`, `gather:C2:food` | peace | `gatherAny` 금지, 모자란 자원 순 |
| `성벽을 쌓고 곡식을 거두라` | `gather:B2:food` | | abundance | `heard: ['wall']`이지만 명령이 있어 해석문은 `say` |
| `너희는 강하고 담대하라` | | | null | 흐릿 (`강(?![하…])`) |
| `돌아가서 기다려라` | `pray:C1:` | | wisdom | 링크 `기다려` (돌·탐험은 앞뒤 보기로 빠짐) |
| `지켜보라` | | | null | 흐릿 (`지켜(?!보)`) |
| `멀리 가라` | `explore:A3:` | | wisdom | 링크 `가라` (`멀리`는 부정어가 아님) |
| `빛이 있으라` | `explore:A3:` | | wisdom | 링크 `빛` |
| `안식일을 지켜라` | `pray:C1:` | | peace | 성벽 규칙은 `wallExcept`(`안식`)로 건너뜀 / 링크 `안식` |
| `적의 마을을 빼앗아라` | `attack:A2:` | | war | 마을 규칙은 `villageExcept`로 건너뜀 / 링크 `빼앗` |
| `율법파의 탑을 무너뜨려라` | `attack:A2:` | | war | 링크 `무너` |
| `나무를 베어 집을 지어라` | `gather:A1:wood`, `build:B1:village` | | abundance | A1은 벌목이 차지 → 마을은 다음 빈 칸 B1 / `나무`, `집을` |

이어서 A1에 `검은숲` 이름(`이 숲을 검은숲이라 부르라` → `nameTile` = `{tile:'A1', first:true}`), 노트 `{word:'새벽', type:'explore'}`를 넣은 상태 (`78c891e`에서 이름 규칙이 마지막 수단이 되어 결과가 바뀌었다):

| 계시 | orders | doctrine | 해석문 |
|---|---|---|---|
| `검은숲에서 일하라` | `gather:A1:wood` | abundance (숲 규칙) | `석판이 이르되, 검은숲(A1)에서 나무를 벤다!` — 숲 규칙(`숲`)이 이름 곳(A1, 점수 4)을 앞세워 A1을 쓰고, `일하`(`gatherAny`)와 이름 규칙은 건너뛴다 (`78c891e` 전: A1 + 다음 빈 숲 C3) |
| `검은숲을 사랑하라` | `preach:A2:`, `gather:A1:wood` | peace | 규칙 순서대로 선교(3번) 다음 숲(8번) (`78c891e` 전: A1 채집 + 선교 + C3 채집) |
| `새벽을 맞으라` | `explore:A3:`, `preach:A2:` | peace | 노트 규칙(교리 없음)이 탐험, `맞으라`(선교 어휘)가 선교·평화 |
| `검은숲` | `gather:A1:wood` | abundance | 이 경우도 숲 규칙이 걸려 이름 규칙은 쓰이지 않는다(결과는 같다) |

튜토리얼 상태에 목재·돌·식량을 6으로 채우면 (`tablet-cases.mjs`의 상태, `createState({ mode: 'tutorial', seed: 1 })`, 행동 수 3):

| 계시 | 결과 |
|---|---|
| `성벽을 쌓아라` | `build:C1:wall` (war) |
| `적의 성벽을 깨뜨려라` | `attack:A2:`만 (성벽 규칙 예외) |
| `성벽을 높이 쌓아라` | `build:C1:wall`, `heard: ['temple:tile']` (신전 후보 C1은 이미 성벽이 씀) |
| `높은 탑을 쌓아라` | `build:C1:temple` (wisdom) |
| `모두 함께 밭을 갈아라` | `gather:B2:food`, `gather:C2:food` |
| `기도하고 신전을 지어라` | `build:C1:temple`, `heard: ['pray:tile']` (wisdom) |
| `성벽을 쌓고 기도하라` | `build:C1:wall`, `heard: ['pray:tile']` (마을이 없어 성벽이 옮겨 갈 곳이 없다) |
| `공격 말고 선교하라` | `preach:A2:`, 금지 `attack:A2:`, `banned: ['attack']` (peace) |
| `나무는 그만 베고 돌을 캐라` | `gather:B1:stone`, 금지 `gather:A1:wood`·`gather:C3:wood` |
| `기도는 됐고 일이나 해` | 명령 없음, 금지 `pray:C1:` (peace, 흐릿) |
| `적의 공격에 대비해 성벽을 쌓아라` | `build:C1:wall`만 (`attackExcept`) / 링크 `공격에 대비` |
| `마을 두 곳을 세워라` | `build:A1:village`, `build:B1:village` |
| `곡식을 세 번 거두라` | `gather:B2:food`, `gather:C2:food` (식량 칸이 둘뿐) |
| `산에 마을을 세워라` | `build:B1:village` (지형 곳 +1) |
| `강가에 마을을 세워라` | `build:A1:village` (닿는 강 B3가 없어 원래 첫 후보) |
| `B2에 마을을 세워라` | `build:B2:village` |
| `율법파 수도 옆에 마을을 세워라` | `build:B2:village` (A3의 이웃, `옆` → 4) |
| `율법파의 수도를 쳐라` | `attack:A2:` (A3는 닿지 않아 이웃 A2가 2점) |
| `숲을 지켜라` | 명령 없음, 금지 `build:C1:wall`·`gather:A1:wood`·`gather:C3:wood`, `banned: ['wall', 'gather']` |
| `성벽을 쌓되 공격하지 마라` | `build:C1:wall`, 금지 `attack:A2:` (`~되` 절 나누기) |
| `곡식을 거두고 나무를 베고 돌을 캐고 기도하라` | `gather:B2:food`, `gather:A1:wood`, `gather:B1:stone`, `heard: ['pray:limit']` |
| `기도하고 곡식을 거두고 나무를 베고 돌을 캐라` | `gather:B2:food`, `gather:A1:wood`, `pray:C1:` (기도가 먼저 말해져 남고 돌이 빠짐; 채집이 남아 `gather:limit`은 걸러짐) |

5×5 보통 시드 2026 첫 판 1장에 목재·돌·식량을 6으로 채운 상태 (마을 후보 `C1 숲, C2 산(채석장), C3 언덕, D1 숲, D2 평원, D3 강, E1 평원, E3 산, E4 강` 순):

| 계시 | 결과 |
|---|---|
| `마을을 세워라` | `build:C1:village` |
| `강가에 마을을 세워라` | `build:D3:village` (강 +1, 동점이면 앞선 D3) |
| `D4에 마을을 세워라` | `build:D3:village` (D4는 후보가 아니라 그 이웃 D3가 2점) |
| `우리 수도 옆에 마을을 세워라` | `build:D1:village` (우리 수도 E2의 이웃 중 첫 후보) |
| `마을 세 곳을 세워라` | `build:C1:village`, `build:C2:village`, `build:C3:village` |
| `강가에서 물고기를 잡아라` | `gather:D3:food`(강 규칙), `gather:D2:food`(`고기` → 식량 규칙) — `강가에서`는 곳이 아니라 채집 말 |

**함수 골든** (같은 실행에서):

| 호출 | 결과 |
|---|---|
| `detectTone('너희에게 축복을' / '율법파에 저주를' / '강물처럼 흘러라' / '나무를 베라')` | `blessing` / `curse` / `metaphor` / `command` |
| `parseCommandment('영원히 칼을 들지 말라', COMMANDMENTS)` | `noSword` |
| `parseMiracle('단비와 번개', ['lightning','rain'])` | `lightning` (손패 순서) |
| `citedWords` (1장 전 계시 `등불을 밝혀라`, 지금 `등불 아래에서 기도하라`) | `['등불']` |
| `revelationCostFor` 32자, 인용 없음 / 31자 이상 + 인용 | 2 / 1 |
| `isEcho` / `revelationCostFor` (`createState({ mode: 'standard', seed: 2026, veteran: true, mapSize: 5 })` 1장, 앞 계시 `이웃을 사랑하라`) — `이웃을 사랑하라` / `이웃을  사랑하라 !!` / `이웃을, 사랑하라!` / `이웃을 사랑하라 그리고 기도하라` | `true`·2 / `true`·2 / `true` / `false` |
| `isEcho` 튜토리얼 상태, 같은 글 | `false` |
| 위 표준 상태에서 `recordRevelation(st, '이웃을 사랑하라', 'peace', 0)` | 교리 변화 없음, 마지막 기록 `{ round: 1, text: '이웃을 사랑하라', doctrine: 'peace', echo: true }`(이 판 1장에는 닿는 율법파가 없어 `sig`가 비어 필드가 없다), 로그 `같은 말씀이 되풀이되어 무뎌졌다 — 교리가 오르지 않는다.` |
| `spokenOf` / `revelationCostFor` (`createState({ mode: 'standard', size: 5, difficulty: 'normal', seed: 2026 })` 1장, 앞 계시 `기도하라`를 `recordRevelation(…, spokenOf(st, '기도하라'))`로 기록 → `sig: 'pray'`) — `기도 하라.` / `무릎 꿇고 경배하라` / `신전에서 기도하라` / `기도하고 곡식을 거두라` | `{sig:'pray', echo:true}`·2 / 같음·2 / 같음·2 / `{sig:'gather:food\|pray', echo:false}`·1 (`9b43bbf`) |
| `extractLesson('빛나는 등불을 따라가라', [탐험])` | `{ word: '빛나', type: 'explore', … }` |
| `extractLesson('산처럼 높이 올라라', …)` | `null` (두 글자 이상 명사 없음) |
| `extractLesson('자비를 베풀라', …)` / `('성당에 모여라', …)` | `null` / `null` (`자비`·`성당`은 석판 어휘) |
| `nouns('너희는 강물처럼 흘러라. 신도들이여 등불을 들라')` | `['강물', '신도들', '등불']` |
| `validateOrders([A1 숲 채집, A1 마을, A2 선교, A2 공격], [], 'abundance')` | 받음: 숲 채집, 선교 / 거부: 마을·공격 `같은 장소` |
| `validateOrders([A2 선교, A2 공격], [], 'war')` | 받음: 공격 / 거부: 선교 `같은 장소 (교리에 맞는 행동 우선)` |
| `autoFill([B2 곡식])` (식량5·목재3·돌1) | `gather:B1:stone`, `gather:A1:wood` |
| `autoFill([B2 곡식], [], 교리)` — 평화 / 지혜 / 전쟁 / 풍요 | `pray:C1:`(heeded), `gather:B1:stone` / `explore:A3:`(heeded), `gather:B1:stone` / `gather:B1:stone`, `gather:A1:wood` / 같음 (선교·공격 승률 0.42 < 0.5, 성벽 불가, 풍요는 헤아린 자리 없음) |
| `validateOrders([B1 마을, B1 돌 채집, B2 마을], [], 'abundance')` | 받음: B1 마을 / 거부: B1 돌 `같은 장소`(둘 다 선호라 교체 없음), B2 마을 `자원 부족` |
| `leaderLine(장로, 'rebuttal', {doctrine:'war', word:'분노'})` (`config.seed` 2026, 1장) | `분노하는 신이라… 율법은 흔들리지 않는다.` |

---

## 확인 필요

코드와 설명이 어긋나거나, 의도가 불분명하거나, 이식 때 결정이 필요한 것.

1. **다운로드 진행률이 표시되지 않을 수 있다**: `prepareLLM`은 `preparing ??= createBaseSession({ …, onProgress })`라서 처음 부른 쪽의 콜백만 쓴다. 메인 화면에서 콜백 없이 미리 깨우므로(`main.js:262`) `runInterpretation`이 넘기는 진행률 콜백은 무시된다 (`interpreter.js:120-126`). 의도인지?
2. ~~**(버그) `~지 말고`는 첫 번째 것만 금지로 바뀐다**: `interpreter.js:159`의 `kw`가 플래그 인자를 버려 `kw('kw.dontAnd', 'g')`가 비전역 정규식이 되었고, `숲을 베지 말고 돌을 캐지 말고 기도하라`에서 돌 채집이 **명령**되었다.~~ — **고침** `e68a240`: `kw = (key, flags) => new RegExp(t(key), flags)`라 모든 `~지 말고`가 금지 절이 된다(3.2). 회귀 시험에 `숲을 베지 말고 기도하지 말고 돌을 캐라`를 더했다(3.8). 골든에는 `~지 말고`가 두 번 든 문장이 없어 이 수정으로 바뀐 골든은 없다. Godot 판도 모든 일치를 바꾼다 (6.2 `split_dont`).
3. ~~**`interpreter.js:225` 주석이 동작과 어긋난다**: "규칙마다 첫 후보만 쓰던 동작은 양의 말이 없을 때 그대로 (골든과 같은 결과)"라고 했지만, 실제로는 이미 명령한 칸·키를 건너뛴 **첫 빈 후보**를 고른다.~~ — **고침** `e68a240`: 주석이 "양의 말이 없으면 규칙마다 비어 있는 첫 후보 하나만 쓴다"(`interpreter.js:235`)로 바뀌었다. 동작은 그대로다 — `afab303` 전(첫 후보만, 쓰였으면 포기)과 결과가 다르다: `곡식을 거두라` 네 번은 예전 1개, 지금 2개; `검은숲에서 일하라`는 예전 A1만, `e68a240`에서 A1+C3. 그 주석은 `78c891e`에서 해결 단계(pick·옮기기·행동 수)를 새로 짜며 없어졌고, `검은숲에서 일하라`는 이름이 곳이 되어 다시 A1만이다(6.5).
4. ~~**석판 해석문은 금지로 거르기 전 명령으로 만든다** — 금지된 행동을 말할 수 있다 (드문 경우).~~ — **고침** `78c891e`: 해석문은 금지·행동 수로 거른 뒤 남은 명령(`kept`)으로 만든다(`interpreter.js:315-327`).
5. ~~**석판이 대신한 뒤에는 다시 해석할 수 없다**: 다시 해석 버튼이 `pending.result.source === 'tablet'`이면 숨어, LLM 실패·타임아웃으로 석판이 대신한 장에는 대사제에게 다시 물을 길이 없었다.~~ — **고침** `e68a240`: 버튼은 `aiMode === 'llm'`일 때만 보인다(`main.js:2092`) — 석판 모드에서는 없고, LLM 모드에서는 석판이 대신한 뒤에도 있다. 튜토리얼 대사(`tut.confirm1.1`)와 단축키 도움말(`ui.rules.keys1` "R 다시 해석(대사제)")도 이에 맞췄다.
6. ~~**죽은 필드·키·주석** (기이한 해석·성언을 뺀 흔적): `state.oddUsed`·`state.liturgy`, 언어팩 `ui.tag.odd`·`ui.tag.liturgy`·`ui.grace.odd`·`ui.grace.otherDeed`·`ui.verdict.odd`·`log.liturgy`·`kw.liturgyStrip`, 없어진 장치를 말하는 주석, `tools/golden.mjs`의 `pending.odd`·`d.liturgy`, 늘 건너뛰는 `DOCTRINE_LABOR.abundance`.~~ — **고침** `e68a240`: 모두 지웠다. 남은 것은 `ui.verdict.text`의 `odd` 갈래(옛 저장본의 판결용)와 언어팩 파일의 주석 두 줄(`i18n/ko/engine.js:185`, `i18n/ko/interp.js:136`)뿐이다. Godot 판에는 옮기지 않는다 (옛 저장본을 읽을 때 무시만 한다).
7. **청원 외면에 침묵이 포함된다** (`wordsAfter`가 침묵에도 불린다). 의도인지?
8. **예언 `fall`은 공격 점령만 센다** (`stats.captured`). 선교로 넘어온 마을(`stats.turned`)은 "마을이 무너지리라"를 이루지 못한다.
9. **`linkWords`는 석판과 조금 다르게 본다**: 노트 비교에서 건설 종류를 보지 않고(석판의 노트 규칙은 본다), `except`·`splitDont`·절 나누기 없이 원문 전체의 첫 일치를 쓴다. 곳을 가리키는 말(`placeOf`)도 모른다 — `검은숲에서 일하라`의 밑줄은 이름 `검은숲`이지만 명령은 숲 규칙이 만들었다. 밑줄 낱말이 명령을 실제로 만든 낱말과 다를 수 있다.
10. **`extractLesson`은 받아들인 첫 명령을 뜻으로 배운다** — 그 낱말이 정말 그 행동을 불렀는지는 보지 않는다 (`빛나`처럼 형용사 조각도 배운다).
11. **가용성 확인은 `en`, 세션은 `['ko','en']`**: 한국어 비공식 지원 때문. 다른 언어팩을 더하면 코드 수정이 필요하다.
12. **옛 문서와 코드 차이**: `docs/DESIGN.md`의 초안 스키마(해석문 먼저, 80자, 좌표 객체)와 `docs/EXPERIMENTS.md` v4/v5의 생성 순서(해석 → 금지 → 행동 → 교리)는 지금 코드(금지 → 행동 → 교리 → 해석문, 110자)와 다르다. 코드가 기준.
13. **쓰이지 않는 것**: `data.js:58` `revelationCost`, `leaderLine` 주석의 `win`/`lose` 종류.
14. **`너의 신의 이름은 ${god}이다`** 는 받침을 보지 않는다 (`interp.prompt`).
15. **Godot `RegEx`의 유니코드 속성 지원**: Godot가 PCRE2를 어떤 옵션(UTF/UCP)으로 컴파일하는지에 따라 `\p{Hangul}`, `\s`의 동작이 다를 수 있다. 이식 첫날 `\p{Hangul}`·`[가-힣]`·`(*UCP)\s`·`\p{P}`, 석판의 뒤 보기(`(?<![가-힣])강`, 갈래 길이가 다른 `(?<!돌아|들어|나)가라`, 긍정 뒤 보기 `(?<=[가-힣])되(?= )`)를 작은 테스트로 확인할 것 (가장 빠른 길은 3.8의 549문장 회귀 시험을 그대로 돌리는 것).
16. **Claude 구조화 출력의 배열 제약**: `minItems`/`maxItems`가 받아들여지는지(“복잡한 배열 제약” 미지원 목록에 드는지) 실제 요청으로 확인. `maxLength`는 미지원이 확실하다.
17. **로컬 LLM 애드온**: 어떤 Godot llama.cpp 애드온이 GBNF/JSON 스키마 제약을 GDScript로 노출하는지, 한국어 품질이 되는 모델 크기는 무엇인지 — 6.5의 LLM 품질 평가로 정한다.
18. **이모지 등 BMP 밖 문자**: 비용(30자)·이름 길이·`hashPick`에서 JS(UTF-16)와 Godot(코드 포인트)가 달라질 수 있다. 골든에 이모지 사례를 하나 넣어 둘 것.
19. ~~**"할 수 없다"의 사유가 늘 맞지는 않다**: 사유가 종류별 고정 문구라, 계명 `noSword`나 시련 「대지모」로 공격이 목록에서 빠져도 `공격(닿는 율법파 땅이 없다)`, 계명 `noExpand`로 마을이 막혀도 `마을(자원이나 빈 땅이 없다)`라고 말했다.~~ — **고침** `e68a240`: `cannotWhy`가 까닭 코드(`attack:law`·`attack:earth`·`village:law`·`temple:villages`)를 넣고 언어팩이 그 문장을 낸다(3.2). 남은 점: 코드는 계명·시련·대성당 마을 조건만 가리고, 그 밖의 까닭은 여전히 종류별 고정 문구다.
20. **석판 이해율 수치는 과적합돼 있다**: 회귀 시험 549/549는 튜닝에 쓴 문장들이다. 처음 보는 문장의 이해율은 `78c891e`의 첫 측정 — 평가자 A 66%·B 73%·C 50%, 눈 가린 묶음 7 75%(3.8) — 이 가장 가까운 값이고, 은유 문장은 68%였다(묶음 5). 튜토리얼이 "은유도 헤아린다"고 말하던 약속은 `tut.speak5.1`에서 "알아들은 말을 보며 고쳐 쓰라"로 바뀌었다.

`9b43bbf`·`78c891e`에서 새로 생긴 확인 사항:

21. **"숲을 지켜라"는 성벽도 금한다**: 부정어 `kw.negation`에 `(숲|나무|산림)을 지켜/지키/보호/아껴`가 들어 절 전체가 부정이 되고, 같은 절에 걸린 성벽 규칙(`지켜`)의 행동까지 금지된다(`banned: ['wall', 'gather']`). `숲을 지키고 성벽을 쌓아라`처럼 한 절에 두면 성벽이 명령되지 않는다.
22. **곳의 말은 줄 세우기일 뿐**: 가리킨 칸이 후보에 없으면 이웃이나 원래 첫 후보가 되고, 그 사실을 알려 주지 않는다(`heard`가 없다). 칩 옮기기(⇄)로 고칠 수 있지만 후보가 같은 종류·합법 행동뿐이다. `kw.place.foe`의 `적`은 한 글자라 `적의 공격에 대비해` 같은 문장에서도 "율법파 쪽"으로 읽힌다(수도 말이 함께 있을 때만 영향).
23. **칸 이름 좌표는 첫 일치 하나**: `B2와 C3에 마을을`은 B2만, `C3와 B2에`는 C3만 앞세운다(마을 하나). 또 `(?<![A-Za-z])([A-Ia-i]) ?([1-9])`라 소문자·띄어 쓴 `a 3`도 좌표 A3로 읽힌다.
24. **나중에 금지될 pick도 칸을 잡는다**: 금지는 모든 절을 본 뒤에 거르므로, 앞 절에서 고른 일이 뒤 절의 금지로 빠져도 그 일이 쥐었던 칸을 다른 규칙이 쓰지 못한 채 끝난다. `나무를 베고 마을을 세워라, 나무는 베지 마라` → 벌목(A1)은 금지로 빠지고 마을은 A1이 아니라 B1(튜토리얼, 자원 6). 빈 자리는 `autoFill`이 채운다.
25. **일 메아리는 석판 기준**: LLM 모드에서 대사제가 다른 일로 읽어도 메아리는 석판의 목록으로 판정한다. 석판이 아무 일도 못 읽는 계시(비유만의 문장)는 글이 같을 때만 메아리다 — 비유를 바꿔 가며 같은 대사제 해석을 끌어내는 것은 막지 않는다.
26. **`heard` 코드 `pray`·`gather`**: 기도 규칙은 수도가 없을 때만, 채집 규칙은 닿는 곳에 그 자원이 없을 때(강이 안개 속 등) 알린다. 강 규칙의 `gather`처럼 다른 채집 명령이 있으면 걸러지므로 "그 종류를 하나도 못 했다"일 때만 보인다.
