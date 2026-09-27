# Godot 4 이식 가이드

웹판(JS, `js/game/`)을 Godot 4로 옮기기 위한 계획서다. 규칙과 화면의 세부는 [`docs/spec/`](../spec/01-overview.md)에 있고, 이 문서는 **어떻게 옮기고 어떻게 같다는 것을 증명할지**를 다룬다.

> 이식 중 결정할 것(현재 웹판의 버그·이상 동작 모음)은 [KNOWN-ISSUES.md](KNOWN-ISSUES.md). 원칙은 "먼저 똑같이 재현하고, 그다음 JS와 함께 고친다".

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
| `engine.js` | 1365 | `core/engine.gd` | 순수 함수. 상태는 `Dictionary` 하나로 두면 골든 JSON과 바로 비교된다 |
| `data.js` | 395 | `data/data.json` + `core/data.gd` | 함수 값(`$fn`)은 GDScript로 다시 쓴다 ([03 데이터](../spec/03-data.md)) |
| `mapgen.js` | 187 | `core/mapgen.gd` | 골든의 초기 맵으로 검증 |
| `interpreter.js`, `lore.js` | 253+130 | `core/interpreter/*`, `core/lore.gd` | 정규식은 `kw.*` 문자열을 `RegEx`로 ([05 해석기](../spec/05-interpreter.md)) |
| `chronicle.js` | 150 | `core/chronicle.gd` | |
| `meta.js` | 167 | `autoload/Meta.gd` | `localStorage` → `user://*.json` ([07 진행](../spec/07-progression.md)) |
| `i18n.js` + `i18n/ko/*` | ~1560 | `autoload/I18n.gd` + `i18n-ko.json` | 함수 값 처리 방법은 아래 |
| `main.js` | 2356 | `autoload/Game.gd` + `ui/*` | 단계 기계와 화면 갱신을 나눈다 ([04 구조](../spec/04-architecture.md)) |
| `board.js`, `art.js` | 183+248 | `board/*`, `art/svg/*` | SVG 심볼은 파일로 뽑아 두었다 |
| `fx.js` | 847 | `board/board_fx.gd`, `ui/*` | Tween, AnimationPlayer, 파티클 |
| `sound.js` | 407 | `autoload/Sfx.gd`, `Music.gd` | Web Audio 합성 → 아래 [소리](#소리) |
| `tutorial.js` | 177 | `ui/tutorial_overlay.gd` | |
| `js/llm.js` | 58 | `core/interpreter/llm_client.gd` | Chrome Prompt API 전용 → 대체 필요 |

### 엔진 밖(`main.js`)에 있는 규칙 — 반드시 같이 옮긴다

웹판은 몇몇 규칙을 화면 컨트롤러인 `main.js`에서 처리한다. `engine.gd`만 옮기면 빠지므로, Godot의 한 판 컨트롤러(`Game.gd`)에 넣는다. 골든 기록에서는 이 규칙이 남긴 기록 줄에 `ui: true`가 붙어 있다 ([golden README](../export/golden/README.md)).

| 규칙 | 하는 일 |
|---|---|
| `spokenMiracle` | 계시에 기적 이름이 있으면 그 기적을 먼저 내린다 |
| 침묵 경로 | 계시 없이 넘기면 `applySilence` 흐름 |
| `wordsAfter` | 청원에 답하면 은총, 청원을 두 번 외면하면 신앙 -1 |
| 이름 붙이기 은총 | 첫 이름이면 지혜 교리 +1 |
| 지난 계시 인용 | `history.at(-1).text`를 다음 해석에 넘긴다 |
| 지도자의 반박 대사 | 율법파 지도자가 지난 계시에 맞받아치는 기록 줄 |
| 수락 순서 | 율법파 계획 확정 → 말한 기적 → 말투 효과·갈림길 비용 → 계명 새기기·예언 봉인(기준값 저장) → 해결 → 교리 기록 ([05](../spec/05-interpreter.md)) |
| 강제 선택 | 소명·기적 드래프트는 계시 전에 고른다 (웹판은 2.5초 뒤 모달, 이미 말했으면 건너뜀) |

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
| 정렬 | `Array.prototype.sort`는 **안정 정렬**. 엔진은 "거리순 정렬 후 `[0]`" 같은 곳에서 동점이면 원래 순서의 첫 항목을 고른다 (`engine.js:113, 439, 472, 474, 618, 1342`, `mapgen.js:50, 57, 102`, `chronicle.js:34`) | `sort_custom`은 안정성을 보장하지 않는다. 인덱스를 붙여 비교하거나 병합 정렬을 쓴다 (`core/stable_sort.gd`) |
| `localeCompare` | 칸 id(`A1`…`I9`) 비교에만 쓴다 (`engine.js:113`) | 영문 대문자+한 자리 숫자라 일반 문자열 비교와 같다 |
| 반올림 | `Math.floor`, `Math.ceil(v * 0.7)`(빠른 판 비용, `engine.js:314`) | GDScript `float`도 IEEE double이라 같은 식이면 같은 값. 정수 나눗셈(`/`)을 섞지 말고 `floor()`/`ceil()`로 쓴다 |
| 객체 키 순서 | 문자열 키는 삽입 순서, **정수처럼 보이는 키는 숫자 순서가 먼저** | Godot `Dictionary`는 삽입 순서. `{1:…, 2:…}` 같은 정수 키 표를 순회하는 곳은 키를 정렬해서 돈다 |
| 난수 호출 순서 | 스트림별(`deck`, `dice`, 맵 생성용 시드 변형 4가지)로 호출 순서가 결과를 정한다 | [02 규칙](../spec/02-rules.md)의 RNG 순서를 그대로 따른다. 화면 쪽 연출에는 엔진 스트림을 쓰지 않는다 |
| `for (const ch of str)` | 코드 포인트 단위 순회 | `unicode_at` 순회와 같다. 해시만 위 대리 문자 처리가 필요 |
| 정규식 | JS 정규식 (`u` 플래그, `\p{Script=Hangul}`, 앞 보기 한 곳 `kw.clean.coord`, 뒤 보기는 없음). `\s`는 유니코드 공백 | Godot `RegEx`는 PCRE2. `\p{Script=Hangul}` → `\p{Hangul}`, 패턴 앞에 `(*UCP)`를 붙여 `\s`·`\w`를 유니코드로. 플래그는 `(?i)` 같은 인라인 옵션. 정규식 split·콜백 치환이 없어 도우미가 필요하다 ([05](../spec/05-interpreter.md)) |
| 글자 수 | `String.length`는 UTF-16 단위 (계시 30자 비용 경계) | 이모지 같은 4바이트 문자는 2로 센다. `length()` 대신 UTF-16 길이를 세는 함수를 쓴다 |

## 검증: 골든 테스트

[`docs/export/golden/`](../export/golden/README.md)에 JS 엔진이 만든 결정론적 판 기록이 있다 (`node tools/golden.mjs`로 다시 만든다).

1. **맵**: 각 골든의 `config`로 맵을 만들고 초기 칸 목록(지형·특징·발견지·주인·건물)이 같은지.
2. **엔진**: 해석 결과 대신 골든에 기록된 명령 키를 그대로 넣고 장마다 상태 요약(자원·인구·승점·교리·칸 주인·승패)과 기록 문장이 같은지. 해석기와 떼어 엔진만 검증한다.
3. **석판 해석기**: 같은 계시 문장을 넣어 명령 키·교리·금지 목록이 같은지.
4. 전부 맞으면 계시 문장만으로 한 판 전체를 돌려 최종 결과까지 같은지.

JS 쪽 규칙을 고치면 `node tools/golden.mjs`로 기록을 다시 만들고 Godot 테스트도 같이 돌린다.

## 언어팩

- `docs/export/i18n-ko.json`에 1,256개 키가 있다. 값은 문자열·배열·함수(`{"$fn": 원문}`) 셋 중 하나다 ([언어팩](../i18n.md)).
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
| `docs/export/i18n-ko.json` | 한국어팩 1,256키 | 같음 |
| `docs/export/golden/*.json` | 결정론 판 기록 (골든 테스트) | `node tools/golden.mjs` |
| `docs/export/svg/*.svg` | 그림 심볼 47개 (+ `index.html` 미리보기·PNG 받기) | `node tools/export-svg.mjs` |
| `tools/tests/` | 결정론·퍼징 검사 (불변식 목록은 04 문서 §5.2) | `node tools/tests/fuzz.mjs` |
