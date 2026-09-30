# docs/export — Godot 이식용 기계 판독 데이터

웹판(JS)에서 뽑아낸, 이식하는 쪽이 코드를 읽지 않고 바로 불러 쓸 수 있는 파일들이다. 모두 **생성물**이므로 손으로 고치지 않는다. 원본(`js/game/…`)이 바뀌면 다시 뽑는다.

| 파일 | 내용 | 만드는 스크립트 |
|---|---|---|
| [`data.json`](data.json) | `js/game/data.js`의 내보내기 53개 전부(`0c95856`에서 쓰이지 않던 `revelationCost`를 지워 54 → 53) (지형·비용·카드·교리·기적·난이도·튜토리얼 …). 글 칸은 한국어 언어팩에서 풀어 넣은 값 | `node tools/export-data.mjs` |
| [`i18n-ko.json`](i18n-ko.json) | 한국어 언어팩 전체 1345키 (`ko.js`가 합치는 `ko/*.js` 병합본. `df1cb16`~`55d33dd`는 커밋마다 다시 뽑았고, 이 문서를 고치며 `55d33dd`에서 다시 돌려 바이트까지 같았다 — `data.json` 36,414바이트·`i18n-ko.json` 114,213바이트(`c12a1e9`의 114,278바이트에서 `interp.place.*` 두 키가 빠졌다)·골든도 같았다) | `node tools/export-data.mjs` |
| [`golden/`](golden/README.md) | 엔진 동등성 골든 벡터: 정해 둔 계시로 끝까지 둔 11판의 장별 기록 | `node tools/golden.mjs` |
| `svg/` | 그림 심볼을 낱장 SVG로 (있다면) | `node tools/export-svg.mjs` |

표 하나하나의 뜻·스키마·쓰는 곳은 [docs/spec/03-data.md](../spec/03-data.md)에 있다.

## 다시 만들기

```sh
node tools/export-data.mjs   # data.json, i18n-ko.json
node tools/golden.mjs        # golden/*.json
```

- Node 20 이상, 설치할 패키지는 없다 (`js/game`의 ES 모듈을 그대로 `import`한다).
- 두 스크립트 모두 **결정론적**이다: 시각·`Math.random`을 쓰지 않으므로 같은 코드에서 두 번 돌리면 바이트까지 같은 파일이 나온다. 코드를 고친 뒤 다시 돌려 `git diff`가 비어 있으면 데이터·규칙이 바뀌지 않은 것이다.
- 스크립트는 `localStorage`를 가짜로 채워 i18n이 **한국어**를 고르게 한다 (`lang !== 'ko'`면 멈춘다).
- 줄바꿈은 `\n`, 인코딩은 UTF-8 (BOM 없음).

## data.json

```jsonc
{
  "$meta": { "source": "js/game/data.js", "generator": "tools/export-data.mjs", "lang": "ko", "ruleset": 10,
             "conventions": [...], "regexStringFields": [...], "plainWordFields": [...] },
  "ACTS": [...], "ASCENSION": [...], ..., "TUTORIAL": {...}
}
```

- 최상위 키 = `data.js`의 내보내기 이름 (이름순). `$meta`만 예외다.
- 글 칸(`name`, `text`, `rule`, `desc`, `label`, `lines` …)은 이미 한국어 문자열이다. 원래 언어팩 키는 `data.js` 소스에 보인다 (`data.<표>.<id>.<칸>` 꼴 — 03-data.md 참고). 다국어 Godot판이라면 값 대신 키를 들고 있다가 그릴 때 번역하는 편이 낫다.
- `$meta.regexStringFields`: 문자열이지만 **정규식 원본**인 칸 (`DILEMMAS[].choice[].tags`, `MIRA.choice[].tags`, `COMMANDMENTS.*.re`). 계시 원문에 `RegEx`로 검색한다.
- `$meta.plainWordFields`: 문자열 포함(`includes`)으로만 비교하는 낱말 (`SACRED_WORDS[].word`).

## i18n-ko.json

평평한 사전 하나: `"키": 값`. 키 순서는 `ko.js`가 합친 순서(ui → shell → engine → data → interp → story) 그대로다.

| 값 모양 | 개수 | 쓰는 법 (`t(key, vars)`) |
|---|---|---|
| 문자열 | 1172 | `vars`가 있으면 `{이름}` 자리를 `vars[이름]`으로 바꾼다 (없는 이름은 그대로 둔다) |
| 문자열 배열 | 41 | 그대로 돌려준다 (대사 후보·달 이름·청원자·금칙어 목록 등) |
| 객체 | 4 | 그대로 (`kw.nameable`: 이름 붙일 낱말 → 지형, `kw.prophecy.numbers`: 한/두/세 → 1/2/3, 그리고 `87a0fce`의 `kw.place.terrainName`: 지형 낱말 → 지형 id `{"강": "river", "강가": "river", "평원": "plain", "들판": "plain", "숲": "forest", "산": "mountain", "언덕": "hill", "사막": "desert"}`, `kw.place.dir`: 방위 낱말 → `[행 부호, 열 부호]` `{"동": [0, 1], "서": [0, -1], "남": [1, 0], "북": [-1, 0]}` — 수는 Godot에서 `float`로 읽힌다) |
| 함수 `{"$fn": …}` | 128 | `fn(vars ?? {})`의 반환 문자열. 손으로 옮겨야 한다 (아래) |

- 빠진 키는 키 이름을 그대로 돌려준다 (`t('없는.키') === '없는.키'`).
- `kw.*` 키(140개 — `78c891e`에서 금지 절 `kw.nounAnd`·`kw.stopAnd`·`kw.enoughAnd`, `kw.tablet.attackExcept`, 곳을 가리키는 말 `kw.place.*` 13개, 수의 말 `kw.count2`·`kw.count3`을 더해 112개, `87a0fce`에서 `kw.notNeg`, `kw.tablet.restExcept`·`kw.tablet.foodExcept`, `kw.place.village`·`nearTerrain`·`terrainName`·`home`·`dir`·`dirWord` 9개를 더해 121개, `bcdeb22`에서 `kw.negCarry`, `kw.tablet.riverExcept`·`kw.tablet.preachExcept`, `kw.place.foeVillage`·`closest`·`buildWord` 6개를 더해 127개, `b470e03`에서 `kw.notBut`, `kw.tablet.stoneExcept`·`prayExcept`·`exploreExcept`·`gatherAnyExcept`, `kw.tablet.claim`, `kw.simile`, `kw.place.oasis` 8개를 더해 135개, `16492f4`에서 `kw.notButPlace`·`kw.instead`·`kw.place.idOnly`·`kw.place.avoidId`·`kw.tablet.woodExcept`·`kw.place.quarry`·`kw.place.oasisAt` 7개를 더하고 쓰이지 않던 `kw.place.buildWord`와 인용의 `kw.citeStop`을 지웠다)는 **번역이 아니라** 계시를 읽는 정규식 원본·낱말 목록이다. 코드가 `new RegExp(t('kw.…'), 플래그)`로 만든다. 플래그는 코드에 있다: 대부분 없음, `g`(모두 바꾸기)는 `kw.clean.coord`·`kw.clean.dangling`·`kw.clean.afterVerb`·`kw.clean.stem`, 금지 절 `kw.dontAnd`·`kw.nounAnd`·`kw.stopAnd`·`kw.enoughAnd`·`kw.notBut`(`b470e03`)·`kw.instead`(`16492f4`), 장소가 된 지형 `kw.place.river`·`plain`·`forest`·`mountain`·`hill`·`desert`, 피할 칸 `kw.place.avoidId`(`16492f4`)(interpreter.js) 열일곱, 그리고 `bcdeb22`부터 칸 좌표 `kw.place.id`는 플래그 없는 것과 `g` 사본(`PLACE.ids`, 모든 좌표를 `matchAll`) 둘로 만든다. 말한 번개(`main.js`·`tools/golden.mjs`의 `spokenMiracle`)는 `kw.place.capital`을 플래그 없이 한 번 더 만든다. `kw.dontAnd`는 `e68a240`부터 `kw` 도우미가 `'g'`를 실제로 넘겨 모든 "~지 말고"가 바뀐다(그 전에는 플래그를 버려 첫 번째만 — [05](../spec/05-interpreter.md)). 쓰이지 않던 `kw.liturgyStrip`은 `e68a240`에서 지웠다. `kw.dontAndNeg`는 정규식이 아니라 금지 절을 만드는 **함수**다. 배열 값 `kw.stop`·`kw.lessonStop`은 정규식이 아니라 낱말 집합이다(`kw.citeStop`은 `16492f4`에서 지웠다).
- 함수 값 128개: `ui.*` 65, `log.*` 43, `eng.*` 10, `interp.*` 8, `kw.*` 2 (`78c891e`에서 `ui.heard.also`·`ui.heard.forbid`·`ui.heard.kindWord`, `9b43bbf`에서 `log.wrathFull`이 함수가 되었고, `8ba0ef8`에서 `ui.unlock.next`(`{what}` → "다음 판에는: …")를, `0a0a974`에서 `ui.priestIntro`(`{trait}` → "이번 판의 대사제는 {trait}.")를 더했고, `16492f4`에서 `interp.place.capital`(`{side}` → "율법파 수도"/"우리 수도")·`interp.tablet.forbidOnly`(`{kinds}` → "석판이 이르되, …은 하지 말라. …")를 더하고 `ui.tag.cited`를 지웠고, `55d33dd`에서 `interp.place.capital`을 다시 지웠다(닿지 않는 곳의 이름은 아래 `FAR_NAME`). `df1cb16`의 `log.lawGuard`·`ui.law.guard`는 인자가 `{n}`만이 되었고(`55d33dd`에서 `log.lawGuard`의 글이 "…대비한다 — 이번 장 우리의 선교·공격에 방어 +{n}."으로), `c12a1e9`의 `ui.mat.edictTip`은 문자열이라 `{max}` 자리만 남았다). 인자는 늘 `v` 하나(변수 객체)이고 문자열을 돌려준다. 21개가 `josa`(`16492f4`의 `interp.tablet.forbidOnly` 포함), 7개가 `batchim`을 부른다 — 둘 다 `js/game/i18n/ko/grammar.js`에 있다. 3개(`interp.tablet.cannot`·`ui.heard.cannot`·`ui.heard.also`)는 `js/game/i18n/ko/interp.js`의 도우미 `cannotLabel`(까닭 코드 → "선교(닿는 율법파 땅이 없다)", 아래)을, 1개(`interp.tablet.forbidOnly`)는 같은 파일의 상수 `FORBID_KIND`·`CANNOT_KIND`를 부른다 — 원문이 JSON에 없으니 함께 옮긴다:

```js
// 받침이 있는가 (마지막 글자가 한글 음절이고 종성이 있으면 true)
export const batchim = (w) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
// 조사 붙이기: "우리 마을(D2)"처럼 끝의 괄호를 떼고 받침을 본다. 한글이 아니면 받침 있음으로 친다
export function josa(name, withBatchim, without) {
  const base = name.replace(/\([^)]*\)$/, '');
  const code = base.charCodeAt(base.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 ? code % 28 !== 0 : true;
  return name + (has ? withBatchim : without);
}
```

```js
// ko/interp.js:4-20 — "알아들었으나 못 한다"의 까닭 ('종류' 또는 '종류:까닭'), 55d33dd 기준
const CANNOT_KIND = { preach: '선교', attack: '공격', wall: '성벽', village: '마을', temple: '신전', explore: '탐험', pray: '기도', gather: '채집' };
const CANNOT_WHY = {
  preach: '닿는 율법파 땅이 없다', attack: '닿는 율법파 땅이 없다', wall: '자원이 모자라거나 둘러쌀 곳이 없다', village: '자원이나 빈 땅이 없다',
  temple: '자원이 모자라다', explore: '닿는 안개가 없다', gather: '닿는 곳에 그 자원이 없다', pray: '수도가 없다',
  'attack:law': '계명이 칼을 금한다', 'attack:earth': '이 시련에서는 칼을 들 수 없다', 'village:law': '계명이 넓히기를 금한다',
  tile: '그 칸에는 이미 다른 일이 있다 — 한 칸에 한 가지', limit: '행동 수가 모자라다',
};
const FORBID_KIND = { 'gather:wood': '나무 베기', 'gather:stone': '돌 캐기', 'gather:food': '먹을 것 거두기', 'gather:faith': '묵상' };   // 16492f4 — interp.tablet.forbidOnly가 쓴다
// 닿지 않는 곳의 이름 (해석기는 capital.enemy·capital.player·holy 또는 칸 이름을 넘긴다) — 55d33dd, 그 전에는 언어팩 키 interp.place.*의 글이 코드에 들어 있었다
const FAR_NAME = { 'capital.enemy': '율법파 수도', 'capital.player': '우리 수도', holy: '성지' };
export const cannotLabel = (k) => {
  const [kind, why] = k.split(':');
  if (kind === 'far') return `${FAR_NAME[why] ?? why}(지금 그곳에서는 할 수 없다)`;   // b470e03 짚은 칸, 16492f4부터 수도·성지도 (그 전 글: "손이 닿지 않는 곳 — 다른 칸에서 한다")
  if (why === 'villages') return '대성당(마을이 모자라다)';
  return `${CANNOT_KIND[kind] ?? kind}(${CANNOT_WHY[k] ?? CANNOT_WHY[why] ?? CANNOT_WHY[kind] ?? ''})`;
};
```

## `$fn` / `$re` 표식

JSON에 담을 수 없는 값은 버리지 않고 원문으로 남긴다. 이식하는 사람이 논리를 보고 GDScript로 옮기라는 뜻이다 (실행하라는 뜻이 아니다).

| JS 값 | JSON | 예 |
|---|---|---|
| 함수 | `{"$fn": "<소스 원문>"}` — 키가 `$fn` 하나뿐인 객체 | `COST.temple` → `{"$fn": "(level) => ({ stone: level * 2, wood: level + 1 })"}` |
| 정규식 | `{"$re": "<source>", "flags": "<flags>"}` | (지금 `data.js`에는 없다. 규칙만 정해 둠) |

- 소스 원문은 `Function.prototype.toString()` 그대로이고 줄바꿈만 `\n`으로 맞췄다.
- `data.json`에 함수가 있는 곳: `COST.temple`, `DESTINIES.*.test` (8개) — 모두 9개(최상위 `revelationCost`는 `0c95856`에서 지웠다). 설명과 GDScript 대응은 [03-data.md의 함수 칸](../spec/03-data.md#함수-칸-fn)에.
- 판별: `v is Dictionary and v.size() == 1 and v.has("$fn")`.

## Godot 4에서 불러오기

```gdscript
# res://data/ 아래로 복사해 둔다고 할 때
static func load_json(path: String) -> Variant:
    var f := FileAccess.open(path, FileAccess.READ)
    assert(f != null, "cannot open %s" % path)
    var v: Variant = JSON.parse_string(f.get_as_text())
    assert(v != null, "bad JSON: %s" % path)
    return v

var DATA: Dictionary = load_json("res://data/data.json")
var KO: Dictionary = load_json("res://data/i18n-ko.json")

func is_fn(v: Variant) -> bool:
    return v is Dictionary and v.size() == 1 and v.has("$fn")

func t(key: String, vars: Dictionary = {}) -> Variant:
    if not KO.has(key): return key
    var v: Variant = KO[key]
    if is_fn(v): return I18nFns.call_fn(key, vars)   # 128개는 GDScript로 옮긴 함수 표에서 찾는다
    if v is String and not vars.is_empty():
        for k in vars: v = v.replace("{%s}" % k, str(vars[k]))
    return v
```

주의할 점:

- **숫자는 float로 들어온다.** Godot 4의 `JSON.parse_string()`은 JSON 숫자를 정수여도 `float`로 읽는다. 비용·주사위·인구처럼 정수여야 하는 값은 `int()`로 바꿔 쓴다 (정수 나눗셈·`%`가 JS와 같게).
- **숫자 키는 문자열이다.** `MAP_SIZES["5"]`, `PROPHECY.reward["2"]`, `DOCTRINE.peace.perks["4"]`, `FESTIVALS["2"]`.
- 한 번 읽은 사전은 바꾸지 말고 공유한다 (JS에서도 표는 읽기 전용이다). 상태에 복사해 넣을 때는 `duplicate(true)`.
- `JSON.parse_string()`은 실패하면 `null`을 준다. 줄·열 정보가 필요하면 `JSON.new().parse()`와 `get_error_line()`을 쓴다.
- `kw.*` 정규식은 Godot `RegEx`(PCRE2)로 대부분 그대로 컴파일된다. 한글 범위 `[가-힣]`, 대체(`|`), 비포획 묶음, 앞보기(`(?=…)`)를 쓴다. JS 전용인 `\p{Script=Hangul}` 같은 유니코드 속성·`u` 플래그는 코드(`cleanSpeech`) 쪽에만 있다.
