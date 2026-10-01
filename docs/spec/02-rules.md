# 02. 규칙 — 엔진 명세

> **기준**: 커밋 `448f553` (2026-09-30), 명세 검토 수정 `e68a240`, 3차 균형 `9b43bbf`(심판의 날 판에 한 번, 신앙 승리는 장 끝·개종 조건, 큰 판의 대성당 마을·원정 공격 +1·7×7 율법파 행동 +1, 일로도 보는 메아리)와 석판의 곳·수의 말 `78c891e`(해석기 쪽 — [05](05-interpreter.md)), 4차 `87a0fce`(선공은 승점이 뒤진 쪽, 결집 12·6점과 장마다 신도 +1, 같은 기적을 다시 쓰면 비용 +1, 두 장 전과도 보는 메아리, `RULESET` 6)·튜토리얼 `2825b37`(늘 우리가 선공, 청원 외면 벌 없음)·판 크기 표 `7a28084`(`MAP_SIZES`·`sizeRules`, 7×7 대성당 ×1.5), 5차(규칙 덜어내기) `435c3cc`(신도 수 우위 주사위 삭제, 수도 내구도 3 → 2, 수도는 늘 "수도", `RULESET` 7)·`8ba0ef8`(모듈이 끝낸 판마다 한 묶음씩 열린다 — `config.unlock`, §16.2)·`bcdeb22`(해석기 쪽 — [05](05-interpreter.md); 말한 번개가 "수도"를 짚으면 율법파 수도)·`3a790f5`(따라잡기 셋을 "저울" 하나로 — §4.9), 6차 `0c95856`(대성당 공사 중에는 율법파가 선공 — §3.1·§10, 계시 비용은 길이와 무관하게 1 — 30자 가산·인용 할인 삭제 §14.1, 종료 화면 「새 맵」도 해금 단계를 넘김, 옛 저장본의 수도 내구도를 2로 자름, `RULESET` 8)·`b470e03`(해석기 쪽 — [05](05-interpreter.md))·`0a0a974`(대사제 성향이 헤아린 노동을 정한다 — §3.5, 어려움도 율법파의 건설을 보인다 — §4.7, 튜토리얼 대본), 7차 `df1cb16`(되풀이 규칙을 하나로 — 지난 두 계시와 같은 일들이면 율법파가 우리 선교·공격에 대비한다, 결집의 "장마다 신도 +1" 삭제, `RULESET` 9 — §4.9·§14.8)·`16492f4`(보통은 율법파의 뜻을 기도만 빼고 모두 보인다 — §4.7, 확인 화면 승률이 율법파가 예고한 성벽을 센다 — §17, 인용 꼬리표 삭제; 나머지는 해석기 쪽 — [05](05-interpreter.md))·`c12a1e9`(율법 석판은 성지·율법파 신전·번개·심판의 날(과 미라)로만 움직인다 — 신앙 전환·피의 율법 삭제, 12 → 10칸, `RULESET` 10 — §9), 그리고 `55d33dd`(대성당 원정의 공격 +1 삭제 — §10, 되풀이 판정 하나 — 율법파의 대비는 지난 계시의 메아리 판정으로 다음 장 시작에(`braceLaw`, §4.9), `lawGuard`는 수 하나, `state.ruleset`과 옛 저장본의 석판 자르기, 헤아린 노동도 예고된 성벽을 셈 — §3.5; `RULESET`은 10 그대로), 8차 `846fd60`(포위 삭제 — §3.8, 성인은 이름·업적만 — 선교 +1·수도 방어 +1 삭제 §13.2, 청원 외면 벌 삭제 — §14.3, 안개 속 율법파 마을의 기록 `log.villageFog` — §3.8, `RULESET` 11), 9차 `88878b6`(연속 작은 기적 삭제 — 같은 교리를 세 장 이어 말해도 율법파가 우리를 읽는다(`readUs`, §4.9·§5.4), 전쟁 교리 4칸은 공격 +1 대신 성벽이 돌 1(§5.2·§3.8), 대비 기록은 우리 수도 칸, `RULESET` 12)·`1cc1887`(율법 알약 "우리를 읽음"), `d3fe641`(확인 화면이 율법파가 읽을 계시를 미리 알림 — `wouldRead`, 튜토리얼에서는 연속 점을 숨김, 교리 없는 메아리는 연속을 끊음)·10차 `95eca5f`(전쟁 교리의 헤아린 손은 성벽부터 — §3.5; 나머지는 해석기 쪽 — [05](05-interpreter.md); 규칙서의 승점 줄이 성지·대성당을 적음 — §12), 11차 `8250dd7`(은총 하나 — 말투는 수치가 없고 이룬 예언은 은총·빗나가도 벌 없음, 첫 이름의 지혜 +1·비유의 교리 +1 삭제 — §14.2·§14.4·§14.7; 플레이어의 남는 손은 모자란 것만 채움 — §3.5; 절 하나는 손 둘 — [05](05-interpreter.md); `RULESET` 13), `1fbb160`(확인 화면의 읽힘 예고가 다음 장에 실제로 걸릴 대비 +1/+2를 적음 — §4.9·§19-54; "가장 먼 곳"은 짚은 칸에서 멀어짐 — [05](05-interpreter.md)), 12차 `d7ad6e0`(대성당 — 맞아도·남은 자에도 단계가 무너지지 않고, 단계마다 우리 마을 하나(큰 판은 판 크기 표만큼 더)·돌 3·나무 3·신앙 3 — §10; 석판의 공격·선교 과녁은 우리 땅에서 가까운 곳, "약한" 곳을 말하면 승률 순, 짓는 일은 수를 말하지 않으면 한 손 — [05](05-interpreter.md); `RULESET` 14), 13차 `e174a18`(채집·기도뿐인 계시는 되풀이가 아니다 — §14.8; 율법파는 전쟁·평화의 세 장만 읽는다 — §4.9·§5.4; 석판의 금지어 `지 마`가 문장 끝·`라/세/시/십/소/요` 앞에서만, 율법파가 선공으로 먼저 차지할 칸을 짚지 않은 일이 피함, 짚은 칸 수만큼 짓기 — [05](05-interpreter.md); `RULESET` 15), 14차 `3f33be1`(율법파는 번갈아 말한 전쟁·평화 세 장도 읽는다 — §4.9·§5.4; 대성당은 한 번 짓고 다음 장 율법파의 원정 세 번을 버티면 승리, 단계·단계 승점 없음 — §10; 성지 자리가 시드마다 `holyFor` — §2.4; 일을 두고 한 말·곁말·넉넉함은 시키는 말이 아니고 짚은 금지는 그곳만 — [05](05-interpreter.md); `RULESET` 16), 15차 `637c05a`(율법파는 칼이나 말씀을 세 장 이어 들으면 읽는다 — 공격·선교를 시킨 계시도, §4.9·§5.4; 결집은 8점에 켜지고 4점에 풀리며 결집한 율법파의 손은 신도 수에 묶이지 않는다 — §4.9; 원정의 세 공격은 신도·손 수와 무관 — §4.4·§10; 성지와 그 대칭 칸은 맵 생성이 건드리지 않고 영구 지형도 두지 않는다 — §2.2·§2.3; `RULESET` 17)와 `24927a6`(풍년 평원·강 +2, 가뭄 −2, 평온한 장은 우리 선교 +1, 기도한 장의 역병은 우리를 비킨다 — §7.1; 석판의 같은 일은 계시 하나에 둘까지 — [05](05-interpreter.md); `RULESET` 18), 16차 `76c0053`(마을은 선교로 **세 번** 이겨야 넘어온다 — `FLIP_MARKS`, 양쪽; 선교에 이기면 상대 신도는 줄지만 우리 인구가 가득 찼으면 데려오지 못한다 — §3.8; 같은 종류 넷째 명령은 거절 — §3.4; 헤아린 손은 이미 둘인 종류를 고르지 않고 열혈은 전쟁·평화 계시에서만 칼·말씀을 먼저 — §3.5; 율법파의 기본 노동은 원정 셋을 세지 않는다 — §4.4; 석판의 지형·성벽 없는 곳·차지 — [05](05-interpreter.md); `RULESET` 19), 17차 `238120e`(마지막 한 명은 설득되지 않는다 — 상대 신도가 둘 이상일 때만 선교가 합법이고 하나면 실패, 양쪽 — §3.8; 데려오지 못한 개종은 세지 않고 기록도 "흩어졌다" — §3.8; 칼·말씀의 "말씀"은 선교뿐 — 평화 교리만으로는 읽지 않는다, §4.9; 확인 화면에서 헤아린 손을 뺄 수 있다 — §3.5; 석판 — [05](05-interpreter.md); `RULESET` 20)까지 반영. 7차에는 `0a0a974` 기준으로 적혀 있던 줄 번호를 `git diff 0a0a974 c12a1e9`로 한꺼번에 옮겼고(그래서 아래에 적은 더 옛 기준의 밀림은 그대로 남는다), `55d33dd`에서 다시 `git diff c12a1e9 55d33dd`로, `846fd60`에서 `git diff 55d33dd 846fd60`로, `1cc1887`에서 `git diff d196f5d 1cc1887`로, `95eca5f`에서 `git diff dd51364 95eca5f`로, `8250dd7`에서 `git diff 2da6a39 8250dd7`로, `d7ad6e0`에서 `git diff 0ff0311 d7ad6e0`으로, `e174a18`에서 `git diff a50d3a0 e174a18`로, `3f33be1`에서 `git diff 63a63bb 3f33be1`로 옮겼다(`mapgen.js`는 손으로), `24927a6`에서 `git diff a65443b 24927a6`로, `76c0053`에서 `git diff 53ddafe 76c0053`로, `238120e`에서 `git diff a429341 238120e`로 옮겼다. 새로 쓰거나 고친 인용은 `238120e` 기준이다. 또 함수 이름 바로 뒤에 붙은 인용(`이름` (`파일:줄`)·(`이름`, `파일:줄`) 꼴)은 정의를 찾아 `c12a1e9` 줄로 맞췄고 이번에 함께 옮겼다. 6차에 고친 인용은 `0a0a974` 기준 줄 번호다 — `3a790f5` 기준으로 적은 인용은 `engine.js` 472행 뒤 +8(자동 노동 몸통 안은 +8~+14), 497행 뒤 +14, 616행 뒤 +16, 1161행 뒤 +17줄, `data.js` 58행 뒤 −1줄, `main.js` 494행 뒤 +2줄(2205행 뒤는 +1줄) 밀렸다. 5차에 고친 인용은 `3a790f5` 기준 줄 번호다(그 전 `4e2e0f7` 기준으로 적은 것은 `engine.js` 61행 뒤 +6줄, 303행 뒤 −2줄이 밀렸다 — 합쳐 303행 뒤는 +4줄). 코드와 이 문서가 다르면 코드가 기준이다. `e68a240`에서 `engine.js` 460행 뒤는 4~5줄, `9b43bbf`에서 201행 뒤 +2·222행 뒤 +3·259행 뒤 +5·734행 뒤 +15·760행 뒤 +16줄 밀렸다 — 그 뒤를 가리키는 줄 번호 중 이번에 고치지 않은 것은 `448f553` 기준이다.
> 처음 쓴 때(`8b91681`) 뒤로 바뀐 규칙 — 율법파의 원정·칼·대체 마을·결집·퇴각과 되풀이를 읽는 율법(§4.9), 메아리(§14.8), 대성당의 마을 조건과 원정(§10), 포위(§3.8 — `846fd60`에서 다시 뺐다), 남은 자(§15.2), 승천 4(§16.4), 명령 검증 예산(§3.4), 뜻을 헤아린 기본 노동과 그 성벽 예산·대사제 성향(§3.5), 대성당 원정의 율법파 선공(§3.1), 길이와 무관한 계시 비용(§14.1), 갈림길 비용 하한(§7.2), 집 안 행동은 칸을 막지도 막히지도 않음(§3.7), 성언·기이한 해석 삭제(죽은 필드까지 `e68a240`) — 은 본문에 녹였고, 해결된 확인 사항은 §19에 표시했다.
> 규칙의 원천은 `js/game/engine.js`(판정·해결), 표는 `js/game/data.js`, 맵은 `js/game/mapgen.js`다. 한 장 안에서 **엔진 함수를 부르는 순서**(계시 비용, 말한 기적, 말투, 갈림길 비용, 계명, 해결 뒤 은총 등)는 화면 컨트롤러 `js/game/main.js`가 정하므로 그것도 규칙으로 적는다.
> 위치 표기: `engine.js:875` = `js/game/engine.js` 867행. `main.js`, `data.js`, `mapgen.js`, `lore.js`, `meta.js`도 같은 폴더.
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
- 행동 객체(`legalActions`가 만든다, `engine.js:377`):

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
  | `crusade` | 율법파가 대성당이 선 우리 수도를 거리와 무관하게 치는 원정 공격이면 `true` (§10, `3f33be1` 전에는 공사 중). `key`는 보통 공격과 같다 |

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
| 율법파 지도자 | `hashPick(후보 지도자, 'leader', seed, difficulty)` | `engine.js:134` |
| 대사제 성향 | `hashPick(loyal 뺀 4명, 'priest', seed)` | `engine.js:136` |
| 심판의 기준 | `hashPick(JUDGEMENTS 키 5개, 'judgement', seed)` | `engine.js:138` |
| 기적 손패 | `'hand0'`·`'hand1'`·`'hand2'` + seed (§6.1) | `engine.js:143` |
| 소명 순서 | 소명 id마다 `hashPick([0..9], seed, 'dest', id)` | `engine.js:117` |
| 갈림길 셋 | 갈림길 id마다 `hashPick([0..96], seed, 'dil', id)` | `engine.js:150` |
| 청원자 | `hashPick(PETITIONERS, seed, round, 'petitioner')` | `engine.js:673` |
| 이름 있는 신도 | `hashPick(PETITIONERS, seed, action.key)` | `engine.js:238` |
| 검열 대체어 | `hashPick(eng.banWords, seed, round)` | `engine.js:1333` |
| 숨은 말 (오늘의 계시) | `hashPick(SACRED_WORDS, 'sacred', daily)` | `engine.js:90` |

### 0.4 정렬·반올림·자료 순서

- JS `Array.prototype.sort`는 **안정 정렬**이다. 이 문서에서 "정렬"은 모두 안정 정렬이고, 동점은 원래 순서를 유지한다.
- 칸 목록 `state.tiles`는 **행 우선**(A1, A2, …, B1, …) 순서다. `find`/`filter`는 이 순서를 따른다.
- `reach`, 탐험 후보, 맵 다듬기의 지형 집계는 **삽입 순서를 지키는 맵**이다(§1.7, §2.2).
- 자원·인구는 모두 정수다. 나눗셈은 명시된 `floor`/`ceil`만 쓴다: 행동 수 `floor(pop/4)`, 신앙 수입 `floor(pop/3)`, 성장 비축 `ceil(pop/2)`, 막 경계 `floor(m/4)`·`ceil(2m/3)`, 대성당 비용 배율 `ceil(v × k)`(4×4 `k = 0.7`, 6×6 `1.5`, 7×7 `2` — §1.1 판 크기 표), 경건한 자 승점 `floor(faith/3)`.

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
- **판 크기 표** (`7a28084`): 판마다 다른 규칙 수는 모두 `MAP_SIZES`(`data.js:361-369`) 한곳에 있고(규칙서의 표와 같다), 엔진은 `sizeRules(state) = MAP_SIZES[rows] ?? MAP_SIZES[5]`(`engine.js:208`)로 읽는다. 표에 없는 3×3 튜토리얼은 5×5 값을 받되, 대성당 비용·마을 더하기·율법파 행동은 `tutorial`이면 따로 막는다(×1, 0, 0).

  | 판 | 장 `rounds` | 대성당 비용 `cathedralCost` (돌·목재·신앙) | 대성당 마을 더하기 `cathedralVillages` (필요한 마을) | 율법파 행동 `enemyActions` | 신앙 승리 `faith` (인구 합 `pop` · 장 `round` · 개종 `converts`) | 궁극·드래프트·분노 `at` (`ult` · `draft` · `wrath`) |
  |---|---|---|---|---|---|---|
  | 4×4 | 8 | ×0.7 (5·5·5) | 0 (2) | 0 | 6 · 4장부터 · 1 | 6 · 3 · 3 |
  | 5×5 | 12 | ×1 (6·6·6) | 0 (2) | 0 | 8 · 6장부터 · 2 | 8 · 5 · 4 |
  | 6×6 | 12 | **×1.5** (9·9·9) | 1 (3) | 0 | 8 · 6장부터 · 2 | 8 · 5 · 4 |
  | 7×7 | 14 | **×2** (12·12·12) | **3** (5) | +1 | 8 · 6장부터 · 2 | 8 · 5 · 4 |

  읽는 곳: `ultRound`·`draftRound`·`wrathRound`(시련 `last`는 1)·`cathedralVillages`·`faithConverts`·`buildCost(…, 'cathedral')`·`actionLimit`(율법파)·`checkVictory`(신앙 승리) — 모두 `engine.js:203-212, 229-236, 327-331, 1440`. 장 수는 전처럼 `createState`가 `MAP_SIZES[config.size].rounds`로 정한다. `7a28084`의 새 규칙은 **7×7 대성당 ×1.5**뿐이었다(커밋 기록: 평가자 B의 건설 휴리스틱이 7×7 보통 80판 중 60판을 대성당으로 이기던 것이 23판) — 나머지 값은 예전의 흩어진 예외(`quick`, `max(0, rows − 5)`, `rows >= 7`)와 같아서 다른 크기와 골든은 그대로다. `3f33be1`에서 대성당 열을 바꿨다: 비용 배율 6×6 ×1 → ×1.5, 7×7 ×1.5 → ×2, 마을 더하기 7×7 2 → 3(기본도 1 → 2 — §10). `d7ad6e0`~`e174a18`의 괄호 값은 단계별 비용 4×4·5×5·6×6 3·3·3, 7×7 5·5·5, 필요한 마을 1·1·2·3이었다. `quick(state) = rows <= 4 && !tutorial`(`engine.js:202`)은 아직 내보내지만 어느 규칙도 부르지 않는다(§19-37).

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

영구 지형 `feature`는 지형의 채집을 **대신한다** (`yieldOf`, `engine.js:340`):

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
| `faithMarks` | 없음 또는 `{ side, n, round }` | 믿음의 표식 (§3.8 선교) — `76c0053`부터 `n`이 `FLIP_MARKS`(3)에 닿으면 마을이 넘어온다(그 전 2) |

### 1.5 진영 상태와 시작값

`state.sides[side]` (`engine.js:123`):

| 필드 | 시작값 | 뜻 |
|---|---|---|
| `food` `wood` `stone` `faith` | 아래 표 | 자원 |
| `pop` | 아래 표 | 신도(인구) |
| `templeLevel` | 1 | 신전 단계 (최대 `MAX_TEMPLE = 3`) |
| `capitalHp` | 2 (`CAPITAL_HP` — `435c3cc`에서 3 → 2, 양쪽 모두) | 수도 내구도 |
| `faithless` | 0 | 신앙 0으로 버틴 연속 장 수 |
| `cathedral` | 0 | 대성당을 지었으면 1 (`3f33be1` 전에는 공사 단계 0~3; 옛 저장본은 `hydrateState`가 1로 — §10) |
| `crusadeEnd` (판 상태) | `null` | 대성당을 지은 장 + 1 — 원정의 장. 그 장 유지 단계 끝에 우리 수도가 서 있으면 대성당 승리(§10, §15.2, `3f33be1`) |
| `prayedAt` (판 상태) | `0` | 우리가 마지막으로 기도한 장(`resolveAction`의 `pray`, 플레이어만 — 명령·헤아린 손·기본 노동 모두). 그 장이 역병이면 우리는 인구를 잃지 않는다(§3.10, §7.1, `24927a6`). 옛 저장본은 `hydrateState`가 0으로 채운다 |
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

맵 크기는 시작 자원을 바꾸지 않는다. 시작 보정은 이 순서로 더한다 (`engine.js:154-160`):

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
| `first` | (장 시작에 정함) | 선 진영 — 승점이 뒤진 쪽, 같으면 홀짝, 튜토리얼은 늘 우리, 대성당을 지었으면 율법파(`0c95856` — `3f33be1` 전에는 공사 중) (§3.1) |
| `leader` | `null` | 율법파 지도자 id |
| `priest` | `'loyal'` | 대사제 성향 — `0a0a974`부터 헤아린 노동의 손 수·먼저 고르는 일·선교/공격 승률 문턱을 정한다 (§3.5). 그 전에는 수치 효과가 없었다(LLM 프롬프트 한 줄뿐) |
| `judgement` | `'classic'` | 심판의 기준 |
| `miracleHand` | `['lightning','rain','bounty']` | 기적 손패 |
| `miracleOffer` | `null` | 드래프트 후보 |
| `miracleUsed` | `false` | 이번 장 기적 사용 |
| `reinterpretUsed` | `false` | 이번 장 다시 해석/말 거두기 사용 |
| `rainActive` | `false` | 이번 장 단비 (가뭄 무효) |
| `roundMods` | `{}` | 이번 장 보정: `ark`·`tongues`·`pillar` (`8250dd7` 전에는 말투의 `gatherBonus`·`attackBonus`도) |
| `wrath` | 0 | 신의 분노 0~3 |
| `doomUsed` | `false` | 심판의 날을 이미 내렸는가 — 판에 한 번 (§6.4, `9b43bbf`) |
| `miracleUses` | `{}` | 기적 id → 이 판에서 쓴 횟수. 같은 기적을 다시 쓸 때마다 비용 +1 (§6.2, `87a0fce`) |
| `lawGuard` | `0` | 되풀이를 읽는 율법 — 메아리(§14.8)로 기록된 계시가 몇 장 이어졌나(0~2). 이번 장 우리 선교·공격의 율법파 방어 보너스 (§4.9). `55d33dd` 전에는 `{ preach, attack }` 두 칸이었다(`df1cb16`~ 늘 같은 값) — 불러올 때 둘 중 큰 값 하나로 바꾼다 |
| `ruleset` | `RULESET` | 이 상태가 만들어진 규칙 판(`55d33dd`). `hydrateState`가 옛 저장본(이 필드가 없거나 10 미만)을 보고 석판을 자른 뒤 지금 `RULESET`으로 바꾼다(§20-17) |
| `rally` | `false` | 율법파의 결집 (§4.9) — `637c05a`부터 우리가 8점 이상 앞서면 켜지고 4점 이내면 풀리며, 켜져 있는 동안 율법파의 행동 수는 신도 수에 묶이지 않는다 |
| `edictOn` | `!tutorial && 해금 단계 >= 1` (`8ba0ef8` 전에는 `!!veteran && !tutorial`) | 율법 석판 사용 — 두 번째 판부터 (§16.2) |
| `holyId` | `null` | 성지 칸 id |
| `destiny`, `destinyOffer` | `null` | 소명 |
| `pendingDilemma`, `dilemmaPick` | `null` | 갈림길 |
| `pendingSite` | `null` | 선택을 기다리는 발견지 칸 |
| `miraDone`, `miraQuote` | `false`, `null` | 미라 |
| `eventChoice` | `null` | 지혜 궁극의 계절 두 장 |
| `bannedWords`, `bannedNext` | `[]`, `null` | 검열 |
| `reacted`, `vowNext` | `null` | 율법파가 들은 말 |
| `streak` | `null` | `{ doctrine, n }` 칼이나 말씀을 이어 든 계시 수 — `637c05a`부터 공격·선교를 시킨(`sig`에 `attack`·`preach`) 계시나 전쟁(`238120e` 전에는 전쟁·평화) 계시를 섞어도 세고(`swordOrWord`), 어느 것도 아닌 계시는 `null`로 끊는다. `doctrine`은 마지막 계시의 교리라 교리 없는 공격 계시면 `null`일 수 있다(§19-62). `3f33be1`에는 전쟁·평화만(번갈아도), `e174a18`에는 같은 전쟁·평화, 그 전에는 같은 교리를 이어 말한 수(교리 없는 메아리는 끊지 않았다). `88878b6`부터 3에서 멈추고(교리 칸의 점 셋) 메아리 계시도 센다. 규칙에는 쓰이지 않는다(율법파가 읽는지는 `revelations`로 본다 — §4.9). 그 전에는 3이 되면 연속 기적과 함께 비웠다 |
| `grace` | `{ round:0, used:0 }` | 장당 은총 사용량 |
| `names` | `{}` | 칸 id → 붙인 이름 |
| `petition` | `null` | 청원 (`846fd60` 전에는 연속 외면 수 `petitionIgnored`(0)도 있었다 — 외면 벌과 함께 지웠다, §14.3) |
| `prophecy` | `null` | 봉인된 예언 |
| `commandments` | `[]` | 영원한 계명 id |
| `saints`, `deeds`, `fallen` | `[]`, `{}`, `[]` | 성인 |
| `legends` | `{}` | 전설이 된 땅 (수치 효과 없음) |
| `silentRun` | 0 | 연속 침묵 |
| `sacred` | `daily`면 숨은 말, 아니면 `null` | |
| `stats` | `{ converted:0, captured:0, miracles:0, prophecies:0, petitions:0 }` (+ 나중에 `starved`·`turned`·`vows`·`sacred`) | 소명·업적 |
| `revelations` | `[]` | `{ round, text, doctrine, sig? }` (메아리면 `echo: true`가 붙는다; `sig`는 석판이 알아들은 일의 목록, 비었으면 없다 — §14.8) |
| `history` | `[]` | 장마다 `{ round, ps, es, res, text }` |
| `log` | `[]` | 진행 기록 |
| `winner`, `winReason`, `winKind` | `null`, `''`, `null` | §15 |

(성언·기이한 해석이 남긴 죽은 필드 `liturgy`·`oddUsed`는 `e68a240`에서 `createState`·`hydrateState` 모두에서 지웠다. 피의 율법의 셈 `bloodKills`(플레이어 공격 승리 수 — 3의 배수마다 석판 +1)도 `c12a1e9`에서 규칙과 함께 두 곳에서 지웠다. 옛 저장본에 있으면 읽는 곳 없이 남을 뿐이다.)

### 1.7 파생 수치

| 이름 | 식 | 위치 |
|---|---|---|
| `reach(side)` | 자기 수도에서 거리 ≤ `2 + marchRange(side)`, 자기 마을에서 거리 ≤ 1인 칸의 합집합. **순서**: `ownedTiles`(행 우선) 하나씩, 그 칸의 반경 안 칸을 `state.tiles` 순서로 훑어 처음 나온 순서대로 | `engine.js:217-225` |
| `marchRange(side)` | 율법파의 원정: `side == 'enemy' && !tutorial ? actOf − 1 : 0` → 수도의 손이 1막 2칸, 2막 3칸, 3막 4칸. 첫 판에도, 모든 난이도에서 (§4.9) | `engine.js:206` |
| `actionLimit(side)` | `limit = min(6, 2 + templeLevel + floor(pop/4) + bonus)`; 플레이어는 안식일이면 `limit = max(1, limit - 2)`; 율법파가 결집 중이고 `pop > 0`이면 `max(0, limit)`(신도 수에 묶이지 않는다 — `637c05a`); 그 밖은 `max(0, min(limit, pop))` | `engine.js:228-237` |
| 　`bonus` (율법파) | `enemyBonus + (rally ? 1 : 0) + (tutorial ? 0 : sizeRules.enemyActions)` — 결집(§4.9)과 **큰 판의 손**(7×7이면 +1: 넓은 판에서 거리만으로 안전해지지 않게. `9b43bbf`에서 `rows >= 7`로 넣었고 `7a28084`부터 판 크기 표 §1.1에서 읽는다). 승천 4는 더 이상 행동 수를 늘리지 않는다 (§16.4) | `engine.js:225` |
| 　`bonus` (플레이어) | `doctrine.wisdom >= 4 ? 1 : 0` | |
| `popCap(side)` | `3 + 2 × 마을 수 + (hasUlt(side,'abundance') ? 2 : 0)` | `engine.js:203` |
| `faithIncome(side)` | `1 + floor(pop/3) + (templeLevel - 1)` | `engine.js:230` |
| `prayValue(side)` | `(2 + (wisdom >= 2 ? 1 : 0)) × (플레이어 && 안식일 ? 2 : 1)` | `engine.js:226` |
| `isSabbath` | 계명 `sabbath`가 있고 `round % 4 == 0` | `engine.js:227` |
| `gatherAmount(side, tile)` | §3.8 채집 | `engine.js:332` |
| `buildCost(side, build)` | §3.8 건설 | `engine.js:309` |
| ~~`superiority(s, f)`~~ | **`435c3cc`에서 지웠다.** 전에는 `s.pop >= f.pop + 3 ? 1 : 0`을 공격·방어 주사위에 더했다(선교에는 없었다). 앞선 쪽이 더 앞서는 눈덩이라서 뺐다 — 커밋 기록의 smart 봇 판: 15점 이상 대차 43% → 34%, 3점 이내 접전 17% → 22%, 역전 37% → 42%, 실력 차는 그대로(가장 센 한 줄 19%) | — |
| `preachBonus(side)` | §3.8 선교 | `engine.js:272-279` |
| ~~`siegeOf(side, tile)`~~ | ~~포위: 플레이어가 율법파 **수도**를 칠 때, 그 수도의 이웃 중 우리 소유 칸이 2개면 1, 3개 이상이면 2, 그 밖은 0 (`9b43bbf`~`c12a1e9`에는 율법파가 대성당 공사 중인 우리 수도를 칠 때 1인 **원정** 갈래도)~~ — **없어짐** `846fd60`: 함수와 두 공격 식(해결·`actionOdds`)의 항을 지웠다(§3.8) | — |
| `enemyZeal(side)` | 승천 4: `side == 'enemy' && ascension >= 4 && actOf == 3 ? 1 : 0` — 율법파 공격·선교 주사위에 더한다 | `engine.js:264` |
| `lawGuardOf(side)` | 되풀이를 읽는 율법: `side == 'player' ? min(2, lawGuard) : 0` — 우리 선교·공격에 맞서는 율법파 방어 보너스 (§4.9; `55d33dd` 전에는 `lawGuardOf(side, type)`) | `engine.js:270` |
| `sizeRules` | 판 크기 표 한 줄 `= MAP_SIZES[rows] ?? MAP_SIZES[5]` (§1.1, `7a28084`) | `engine.js:203` |
| `cathedralVillages` | 대성당에 필요한 우리 마을 수 `= CATHEDRAL.villages(2) + (tutorial ? 0 : sizeRules.cathedralVillages)` — 4×4·5×5 2, 6×6 3, 7×7 5(`3f33be1`; `d7ad6e0`~`e174a18`에는 `1 + …`로 1·1·2·3, 그 전에는 `cathedral + 1 + …`라 단계마다 하나씩 더) (§10) | `engine.js:210` |
| `faithConverts` | 신앙 승리에 필요한 개종 수 `= sizeRules.faith.converts` — 4×4 1, 그 밖 2 (§15.2, `9b43bbf`) | `engine.js:206` |
| `isEcho(text, sig)`, `spokenOf(text)` | 메아리 (§14.8) | `engine.js:774-781` |
| `hasUlt(side, k)` | `side == 'player' && doctrine[k] >= 6 && round >= ultRound` | `engine.js:200` |
| `ultRound` | `sizeRules.at.ult` — 4×4 6, 그 밖 8 (상수 `ULT_ROUND = 8`은 남아 있지만 `main.js`가 import만 하고 쓰지 않는다) | `engine.js:197` |
| `draftRound` | `sizeRules.at.draft` — 4×4 3, 그 밖 5 | `engine.js:198` |
| `wrathRound` | 시련 `last` 1, 아니면 `sizeRules.at.wrath` — 4×4 3, 그 밖 4 | `engine.js:199` |
| `actOf` | §8 | `engine.js:1047` |
| `edictMax` | `EDICT_MAX − (승천 ≥ 2 ? 2 : 0)` = 10 또는 8 (`c12a1e9` 전에는 12 또는 10) | `engine.js:1013` |
| `holyOwner` | 성지 칸에 **마을**이 있으면 그 주인, 아니면 `null` | `engine.js:1012` |
| `villageCount(side)` | `building == 'village' && owner == side`인 칸 수 | |

`RULES` 상수 (`data.js:58`): `followersPerAction 4`, `followersPerFaith 3`, `baseFaithIncome 1`, `heresyGrace 1`, `lowFaith 2`, `gracePerRound 1`, `graceDoctrineBelow 3`(`8250dd7`부터 전생의 유적만 쓴다 — 비유·첫 이름의 교리 보너스는 없어졌다; `data.js`의 주석은 아직 그 둘을 말한다), `maxNames 3` (`superiority 3`은 `435c3cc`에서 규칙과 함께 지웠다). 그 밖: `MAX_ACTIONS 6`, `MAX_TEMPLE 3`, `CAPITAL_HP 2`(`435c3cc` 전 3), `DOCTRINE_MAX 6`, `EDICT_MAX 10`(`c12a1e9` 전 12), `DESTINY_POINTS 5`, `MAX_COMMANDMENTS 2`, `REVELATION_MAX 100`.

### 1.8 시야 `updateVision`

`engine.js:183`. 플레이어의 `reach` 안 칸을 모두 `revealed = true`. 또한 우리 수도에서 거리 ≤ `r`인 칸을 드러낸다: `r = 3`(은사 `seer`이고 `round <= 1`) 아니면 2. 부르는 때: `createState` 끝, 매 장 유지 단계. 안개는 한 번 걷히면 다시 덮이지 않는다. 그 밖에 드러나는 경우: 플레이어가 마을을 지은 칸, 선교로 넘어온 마을, 탐험(대상과 이웃), 불기둥(3칸)(`88878b6` 전에는 지혜 연속 기적(2칸)도).

---

## 2. 판 만들기 (`createState`)

### 2.1 순서

`engine.js:66-163`. **이 순서가 곧 난수·해시 호출 순서다.**

1. `cfg = { ...DEFAULT_CONFIG, ...config }`. `diff = DIFFICULTY[cfg.difficulty] ?? normal`.
2. 맵: 튜토리얼이면 `TUTORIAL.map`, 아니면 `generateMap({ rows: size, cols: size, seed })` (§2.2).
3. 상태 필드 기본값(§1.6), `rng = { deck: s ^ 0x5BD1E995, dice: s }` (`s` = 튜토리얼 7, 아니면 `cfg.seed`).
4. 칸 만들기: `P` → 우리 수도, `E` → 율법파 수도, `V` → 율법파 마을(튜토리얼만). 이 셋의 지형은 `plain`.
5. (튜토리얼 제외) 발견지 `placeSites` → 영구 지형 `placeFeatures(taken = 발견지)` → `cfg.legacy`가 있으면 전생의 유적 `placeLegacy(taken = 발견지)` (§2.3).
6. (튜토리얼 제외) 성지 고르기 (§2.4 — `holyFor`, 맵 생성의 언덕과 같은 칸).
7. 소명: 해금 2단계 이상이고 `!tutorial && !challenge`이면 (§11).
8. 진영 상태와 시작값 (§1.5 표; 보정은 10단계).
9. 덱: 튜토리얼은 고정 순서(§16.1). 아니면 지도자 → 사제(해금 3) → 심판(해금 2) → 기적 손패(storm/해금 3) → 갈림길 셋(해금 3) → 계절 덱 `dealDeck` → 율법 덱 `dealDeck` (§2.5, §2.6).

"해금 N단계" = `unlockedCfg(cfg, N)` — `(cfg.unlock ?? (cfg.veteran ? 4 : 0)) >= N` (`engine.js:69`, `8ba0ef8`; §16.2). `unlock`이 없는 설정(오늘의 계시·시련·도전·골든)은 예전처럼 `veteran`이면 전부 켜진다. 판 안에서는 `unlocked(state, N) = !tutorial && unlockedCfg(config, N)`(`engine.js:70`)로 본다. 해시·난수를 부르는 **순서는 그대로**이고 해금되지 않은 단계는 그 호출을 건너뛸 뿐이다.
10. 시작 보정 (§1.5 목록).
11. `updateVision`. 발견지는 이때 드러나도 **첫 유지 단계**에서야 발견된다.

### 2.2 맵 생성 `generateMap`

`mapgen.js:42`. 목표: 점대칭(공평), 수도 주변 필수 자원, 사막 제한, 한 지형 쏠림 방지. `rnd`는 `mulberry32(seed)`. `set(r, c, t)`는 칸과 그 **대칭 칸을 함께** 바꾼다. `cells`는 행 우선 목록.

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
5. **성지 언덕**: `mid = holyFor(rows, cols, seed)`(§2.4, `3f33be1`)를 `hill`로. 성지가 가운데 칸이 아니면 대칭 칸도 언덕이 된다. 아래 7·9단계와 §2.3의 `mid`는 이 칸이다. `3f33be1` 전에는 가운데 칸 `(floor(rows/2), floor(cols/2))`였다(짝수 크기는 대칭 칸도 — 4×4 B2·C3, 6×6 C3·D4) — 그래서 성지가 가운데 칸이 아닌 시드는 맵 지형부터 달라졌다(골든 — [golden README](../export/golden/README.md)).
6. **사막 정리**:
   - 칸 또는 그 대칭 칸이 어느 수도와 거리 ≤ 1인 사막 → `set(칸, fix[floor(rnd()×4)])`, `fix = [plain, forest, mountain, river]`. (행 우선, 사막 칸마다 `rnd` 1번. 대칭 칸은 이미 바뀌어 다시 걸리지 않는다.)
   - 칸 또는 그 대칭 칸이 사막 이웃을 2개 이상 가진 사막 → `set(칸, rarest('desert'))` (난수 없음; `'desert'`는 `LIMIT`에 없으므로 네 지형 전부 후보).
   - 사막 수 > `floor(rows×cols×0.1)`인 동안: `deserts()[floor(rnd()×len)]`를 `rarest('desert')`로. (사막은 대칭 쌍으로만 생기므로 4×4는 상한 1 → 사막 0개.)
7. **수도 주변 자원 보장** (최대 4바퀴, 한 바퀴에 바뀐 게 없으면 끝): 우리 수도, 율법파 수도 순으로 `near` = 그 수도와 거리 ≤ 2이고 수도 자신·**성지 칸과 그 대칭 칸**(`isHoly`, `637c05a` — 그 전에는 `mid` 하나만)이 아닌 칸. 필요 목록 `[[plain, river], [forest], [mountain]]` 순으로 `near`에 그 종류가 하나도 없으면 바꿀 칸 = `near`의 첫 사막, 없으면 `near`를 "그 칸 지형이 `near`에 몇 개 있나" 내림차순 안정 정렬한 첫째 → `set(칸, 목록의 첫 지형)`. 난수 없음.
8. `rows×cols >= 25`이고 사막이 0개면: `nearCap(p, 2)`가 아니고 언덕이 아닌 칸 중 `rnd`로 하나를 사막으로 (`set`).
9. **다시 상한** `capTerrain(movable)`: `movable` = 칸·대칭 칸 모두 수도와 거리 > 2, 성지 칸·그 대칭 칸 아님(`isHoly`, `637c05a` — 그 전에는 `mid`만), 사막 아님.
10. 결과 복사본에 수도 표시 `P`(우리) `E`(율법파).

> 참고 `nearCap(p, d)`: `p` 또는 그 대칭 칸이 어느 수도와 거리 ≤ `d`. odd-r 밀림 때문에 점대칭이 육각 거리를 정확히 보존하지 않아 양쪽을 다 본다.

### 2.3 발견지·영구 지형·전생의 유적

모두 생성된 맵(수도가 `P`/`E`로 표시된 격자)을 보고 정한다.

**발견지 `placeSites`** (`mapgen.js:140`): 후보 = 행 우선으로 "앞쪽 절반" 칸(`r < rows-1-r`, 또는 가운데 행에서 `c < cols-1-c`) 중, 칸과 대칭 칸 모두 `distance(우리 수도) > 2`, `distance(율법파 수도) > 1`, `mid` 아님, 수도 아님. 쌍 수 = `rows×cols >= 36 ? 2 : 1` (4×4는 조건을 만족하는 칸이 없어 발견지가 없다). 한 쌍마다 `p = 후보.splice(floor(rnd()×len))`, 그다음 `kind = kinds.splice(floor(rnd()×len))` (`kinds = [nomads, altar, spring, bones]`, 뽑은 건 빠진다). 칸과 대칭 칸에 같은 발견지.

**영구 지형 `placeFeatures`** (`mapgen.js:160`): `oasis`(사막), `quarry`(산) 순으로. 후보 = 앞쪽 절반 칸 중 칸·대칭 칸 모두 그 지형, 발견지 칸 아님, 두 칸 모두 두 수도와 거리 > 1, 두 칸 모두 성지 칸이 아님(`holyFor`, `637c05a` — 성지의 대칭 칸이 후보면 짝인 성지 칸이 걸려 빠진다). 후보가 있으면 `cands[floor(rnd()×len)]` 한 번(없으면 난수도 안 씀). 칸과 대칭 칸에 둔다. 사막이 없는 4×4에는 오아시스가 없다.

**전생의 유적 `placeLegacy`** (`mapgen.js:182`): `config.legacy`가 있을 때만(§16.8). 후보 = 행 우선 모든 칸 중 수도 아님, 발견지 칸 아님, 두 수도와 거리 ≥ 2, 성지 칸(`holyFor`, `3f33be1` — 그 전에는 가운데 칸) 아님 → `cands[floor(rnd()×len)]`. 그 칸의 `site = { id:'legacy', found:false }`. (영구 지형 칸과 겹칠 수 있다.)

### 2.4 성지 고르기

`engine.js:114-119`, 자리는 `holyFor`(`mapgen.js:31-40`, `3f33be1`). 튜토리얼 제외.

```text
holyFor(rows, cols, seed):
    caps = capitalsFor(rows, cols);  mid = (floor(rows/2), floor(cols/2))
    cands = 행 우선 모든 칸 p 중
            distance(p, 우리 수도) == distance(p, 율법파 수도) and distance(p, mid) <= 2 and distance(p, 우리 수도) > 1
    return cands ? cands[floor(mulberry32((seed ?? 0) ^ 0x6c0a5e11)() × len(cands))] : mid
```

`createState`가 그 칸의 `terrain = 'hill'`, `feature = null`로 바꾸고 `holyId`에 둔다. `generateMap`(§2.2 5단계)·`placeSites`·`placeLegacy`(§2.3)도 같은 함수로 같은 칸을 얻는다. `holyFor`는 부를 때마다 새 `mulberry32`의 첫 값 하나만 쓰므로 판의 `rng`·맵 생성 난수의 순서와 무관하다(시드만 본다).

| 판 | 후보 (행 우선 — 이 순서의 첨자를 뽑는다) |
|---|---|
| 4×4 | B1 · C4 (서로 대칭 칸) |
| 5×5 | B1 · C3 · D4 |
| 6×6 | C3 · D4 · E6 |
| 7×7 | C3 · E5 (서로 대칭 칸) |

- 까닭(12차 평가 — `EVALUATION-2026-09-30.md`): 수도·성지 자리가 판마다 같았다(평가자 A: 5×5 200시드 모두 수도 E2/A4·성지 C3, 첫 수의 62%가 성지 마을). 수도 자리는 그대로 둔다 — 수도를 옮겨 보니 육각 칸의 홀짝 밀림 때문에 같은 거리라도 7×7 승률이 19%와 87%로 갈렸다. 성지 자리별 승률은 표본 오차 안(커밋 기록).
- `3f33be1` 전(`8b91681`~`e174a18`): 건물 없는 칸 중 `cost(t) = |distance(t, 우리 수도) − distance(t, 율법파 수도)| × 100 + (t.terrain == 'hill' ? 0 : 10) + distance(t, mid)`가 가장 작은 칸(동점은 id `localeCompare` 오름차순) — 5×5 C3, 6×6 D4(= `mid`), 4×4 C4, 7×7 대개 E5(가끔 B1·F6). `mapgen`의 언덕과 발견지·유적의 회피는 가운데 칸 `mid`였으므로 4×4·7×7에서 성지와 달랐다(§19-7).
- 이제 성지 칸이 `mapgen`의 언덕과 같고, 발견지(칸·대칭 칸 모두)와 유적은 그 칸을 피한다. 성지가 가운데 칸이 아니면 대칭 칸도 언덕이다(`set`). `637c05a`부터 맵 생성의 자원 보장·다시 상한이 성지 칸과 대칭 칸을 건드리지 않고, 영구 지형도 두 칸에 두지 않는다(§19-7 고침).

### 2.5 판마다 정해지는 것

튜토리얼이 아니면 (`engine.js:133-147`):

| 무엇 | 규칙 |
|---|---|
| 지도자 `leader` | 시련 `sword`면 `iron`. 아니면 `notOn`에 난이도가 없는 지도자(`elder, iron, preacher, builder` 순서에서 쉬움은 `iron` 제외) 중 `hashPick(…, 'leader', seed, difficulty)`. **첫 판에도** 정해진다. |
| 대사제 `priest` | 해금 3(네 번째 판부터)이면 `hashPick([literal, dreamer, zealot, cautious], 'priest', seed)`. 아니면 `loyal`. LLM 프롬프트에 한 줄([05](05-interpreter.md)), 그리고 `0a0a974`부터 **어느 모드에서나** 헤아린 노동을 정한다(§3.5 — 그 전에는 수치 효과가 없었다). `loyal`이 아닌 판은 1장에 사제가 제 성향을 말한다(`ui.priestIntro`, [06](06-ui-ux.md)). |
| 심판 `judgement` | 해금 2(세 번째 판부터)이면 `hashPick([classic, wide, fertile, pious, steadfast], 'judgement', seed)`. 아니면 `classic`. |
| 기적 손패 | §6.1 |
| 갈림길 셋 | 해금 3이면 `DILEMMAS`를 `hashPick([0..96], seed, 'dil', id)` 오름차순 안정 정렬해 앞의 셋. 아니면 없음. |
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
| 계절 `eventDeck` | `EVENTS` 6장 + (해금 3) 갈림길 3장 | `maxRounds + 2` |
| 율법 `lawDeck` | `lawPool(state)` (§4.2) | `maxRounds × 2 + 2` (어려움은 장마다 두 장을 보므로) |

계절 덱 뒤로 율법 덱을 섞으므로 `rng.deck` 소비 순서는 계절 → 율법이다. 장 시작의 보충은 §3.1.

---

## 3. 한 장의 진행

### 3.0 전체 순서

```text
[장 시작]  startRound                                              engine.js:554   (§3.1)
[말하기]   플레이어 선택 — 순서 자유, 난수 없음                         (§3.2)
           소명(1장) · 기적 드래프트 · 지혜 궁극 계절 고르기 · 갈림길 버튼 · 기적 카드(번개는 목표 칸)
[계시]     speak: 길이 검사 → 침묵 판정 → 비용 → 되풀이 판정 spokenOf 보관 → 비용 지불 → 이름 붙이기 → 해석   main.js:514    (§3.3)
[확인]     validateOrders → autoFill(교리) → 청원·갈림길·말한 기적·계명·예언 판별 (상태 불변)  main.js:587
           (선택) 칩 빼기 · 칩 옮기기 ⇄ · 다시 해석(LLM 모드만, 신앙 -1) · 말 거두기 · 예언 봉인 · 계명 새김 표시
[확정]     accept                                                  main.js:701    (§3.6)
            1 planEnemy   2 말한 기적   3 (없음 — 8250dd7 전 applyTone)   4 (침묵) streak=null   5 payDilemma
            6 계명 새기기   7 findSacred   8 sealProphecy
            9 resolveRound: 막기(집 안 행동 제외) → 6단계 해결 → 갈림길 결과 → upkeep
                            → recordHistory(분노·결집)   (되풀이의 대비는 다음 startRound의 braceLaw — 55d33dd)
           10 applySilence  11 markLegends  12 keepVows  13 wordsAfter
           14 recordRevelation(말할 때의 되풀이 판정으로 — 메아리면 교리 없음)   15 (없음 — 8250dd7 전 첫 이름 → 지혜 +1)   16 신학 노트
[재생 뒤]  유목민 선택(pendingSite) → 승자 있으면 끝, 없으면 다음 startRound
```

### 3.1 장 시작 `startRound`

`engine.js:585-656`. 정확한 순서:

1. `round += 1`; **`braceLaw`**(되풀이를 읽는 율법 — 지난 장 계시가 메아리였으면 대비, §4.9, `55d33dd`); `miracleUsed = false`; `reinterpretUsed = false`; `rainActive = false`.
2. 계절 덱이 비었으면 `eventDeck = dealDeck(EVENTS, 6)` (**갈림길 없이**) — `rng.deck`.
3. 율법 덱이 2장 미만이면 `lawDeck = dealDeck(lawPool, 9) + lawDeck` (**밑에** 붙인다) — `rng.deck`.
4. `unlocked(state, 3) && actStart`(해금 3, 막이 바뀐 첫 장)이면:
   - 2막: `lawPool`에 `L5`가 있으면 `L5` 한 장을 `lawDeck`의 인덱스 `max(0, len-3)`에 끼운다 → 끼운 뒤 **위에서 네 번째**. (보통 난이도면 3장 뒤에 나온다.)
   - 3막: 계절 덱에서 `calm`을 모두 뺀다.
5. 계절 덱이 (4에서 비어) 비었으면 `dealDeck(unlocked(state, 3) && 3막 ? calm 뺀 EVENTS : EVENTS, 6)`.
6. `event = eventDeck.pop()`.
7. **미라** (§7.3): 조건이 맞으면 방금 뽑은 계절을 덱 위로 되돌리고 `event = MIRA`.
8. **지혜 궁극**: `!event.special && hasUlt('wisdom') && 덱이 있고 && 덱 위 카드 id != event.id`이면 `eventChoice = [event.id, 덱 위 id]`, 아니면 `null`.
9. `bannedWords = bannedNext ? [bannedNext] : []`; `bannedNext = null`.
10. `lawCard = lawDeck.pop()`.
11. **들은 말**(§4.3): `heard = vowNext ? 'vow' : (지난 장 계시의 doctrine ?? null)`. `react = heard && !tutorial && difficulty != 'easy' ? REACT[heard] : null`. `reacted = null`, `vowNext = null`.
12. 어려움(튜토리얼 제외)이면 두 번째 카드 비교, 아니면 반응 교체 (§4.3).
13. **선공** (`engine.js:642-645`): 튜토리얼이면 늘 `first = 'player'`(`2825b37`). 아니면 `d = score(player) − score(enemy)`(§12 — 장 시작 시점, 곧 지난 장 해결 뒤의 승점)로 `d < 0`이면 `'player'`, `d > 0`이면 `'enemy'`, 같으면 `round` 홀수 `'player'`·짝수 `'enemy'`. **그다음** (`0c95856`) 튜토리얼이 아니고 우리 `cathedral >= 1`(`3f33be1`부터 대성당을 지었으면 — 그 전에는 공사 중)이면 승점과 무관하게 `first = 'enemy'` — 대성당 원정(§10)의 일부다. 승점을 일부러 뒤지게 두어 선공을 쥔 채 대성당만 올리던 한 줄(평가자 C: "대성당을 지어라, 마을을 넓혀라"를 매 장 — 7×7 어려움 45~50% 승)을 막으려는 것으로, 커밋 기록: 그 줄 28% → 16%(7×7 어려움 43% → 20%), 세 줄 돌려쓰기 27% → 9%, 숙련 플레이와 진행 속도는 그대로(greedy 54%, 15점 이상 대차 34%). **승점이 뒤진 쪽이 먼저 칸을 쓴다**(`87a0fce` — 그 전에는 늘 홀짝으로 번갈았다). 앞선 쪽이 굴러가는 판을 늦추려는 것으로, 커밋 기록의 smart 봇 판(결집 강화·기적 재사용 비용과 함께 잰 값): 15점 이상 대차 61% → 43%, 3점 이내 접전 11% → 17%, 중반 8점 선두 유지 80% → 70%, 역전 30% → 37%. 첫 장은 보통·어려움이면 율법파 시작 신도가 많아(고전 기준 승점 10 : 12 — `435c3cc` 전에는 수도 내구도 3이라 11 : 13) 우리가 선이고, 쉬움은 같아서(10 : 10) 홀수 장이라 우리가 선이다. 규칙서·화면 규칙은 이 선공을 신의 분노(§6.4)·결집(§4.9)과 함께 **저울** 하나로 묶어 보여 준다(§4.9 끝).
14. `roundMods = {}`; `dilemmaPick = null`.
15. `round > 1`이면 `destinyOffer = null` (1장에 고르지 않으면 기본 소명 그대로).
16. `petition = makePetition(state)` (§14.3) — 안에서 `enemyIntent`→`planEnemy`를 부르지만 난수는 없다.
17. `round == draftRound && unlocked(state, 3)`이면 기적 드래프트 후보 3장 (§6.1) — `rng.deck`.

### 3.2 말하기 단계에서 할 수 있는 일

화면이 `phase === 'speak'`일 때만(`main.js:1974`). 모두 난수가 없다.

| 무엇 | 함수 | 규칙 |
|---|---|---|
| 소명 고르기 (1장) | `chooseDestiny(id)` | `destinyOffer`에 있어야 함 |
| 기적 드래프트 | `takeMiracle(id)` | `miracleOffer`에 있어야 함; 손패에 더하고 `miracleOffer = null` |
| 계절 고르기 (지혜 궁극) | `chooseEvent(id)` | `eventChoice`에 있고 지금과 다르면: 덱 위를 뽑아 `event`로, 지금 계절은 덱 위로, `eventChoice = null`, 청원 다시 만듦. 율법 카드는 그대로 |
| 갈림길 버튼 | `state.dilemmaPick = 선택 id` | 계시 속 말이 있으면 말이 우선 (§7.2) |
| 기적 카드 | `castMiracle(id, target)` | 장당 하나 (§6.2) — 효과가 **즉시** 적용되고 `checkVictory(final=false)` |

### 3.3 계시와 해석

`speak()` (`main.js:516`):

1. 글을 `trim`. 비었으면 아무 일 없음. 길이 > `REVELATION_MAX`(100; 시련 `cloister`는 20)면 거절.
2. 글에 `[가-힣A-Za-z0-9]`(`kw.ui.speech`)가 하나도 없으면 **침묵**(§3.5 끝, §14.9)으로 처리한다(비용 없음).
3. 비용 `revelationCostFor(text)` (§14.1 — 메아리면 +1). 신앙이 모자라면 거절(계시할 수 없음 — 침묵은 가능). 그다음 **되풀이 판정을 지금 상태로 한 번 해 둔다**: `speakSnap.spoken = spokenOf(text)` (`{ sig, echo }`, §14.8, `main.js:524`, `9b43bbf`). 지불: `faith -= cost`.
4. 이름 붙이기 `nameTile(parseNaming(text))` (§14.5) — 해석 **전에** 새긴다.
5. 해석: LLM 또는 석판 → `{ interpretation, orders, forbidden, doctrine, source }` (석판은 `heard`·`banned`도 — [05](05-interpreter.md)). `orders`·`forbidden`은 `legalActions('player')`의 원소, `doctrine`은 교리 키 또는 `null`. LLM이 30초 안에 답하지 않거나 실패하면 같은 계시를 석판으로 해석한다(`main.js:556-562`). 방법은 [05 해석기](05-interpreter.md).

확인 화면 파생값 `derivePending` (`main.js:589`) — 상태를 바꾸지 않는다:

- `validateOrders(player, orders − 빠진 칩, forbidden keys, doctrine)` → `accepted`, `rejected`
- `auto = autoFill(player, accepted, forbidden keys + 빠진 칩, doctrine)` — 교리가 있으면 대사제 성향만큼(충직 한 자리, 문자주의 없음, 몽상가 둘) 그 뜻대로 (§3.5)
- 청원 응답 여부, 글로 고른 갈림길, 말한 기적, 새길 수 있는 계명, 예언(없을 때만) 판별 — §14

**칩 옮기기** ⇄ (`78c891e`, 튜토리얼 제외, 비용 없음): 받아들인 명령 하나를 **같은 종류**(`type`·`build`·`gather`가 같은)의 다른 합법 행동으로 바꾼다. 후보 `moveChoices(key)` = `legalActions('player')` 중 같은 종류이고, 그 명령 자신이 아니고, 다른 받아들인 명령의 칸이 아니고, 금지 목록에 없는 것. 고르면 `result.orders`에서 그 명령을 바꿔 끼우고 `derivePending`을 다시 한다(`main.js:1661-1680`). 교리·금지·해석문은 그대로다.

선택 행동: **다시 해석**(`faith >= 1`, 장당 한 번, `faith -= 1`, `reinterpretUsed = true`; 화면은 **LLM 모드(`aiMode === 'llm'`)일 때만** 이 단추를 보인다 — 석판 모드는 결정론이라 다시 해도 같다. LLM 모드면 LLM 실패로 석판이 대신한 장에도 보인다, `main.js:2082`, `e68a240`), **말 거두기**(계시 직전 상태로 되돌림, `reinterpretUsed = true`, veteran이면 `faith = max(0, faith-1)`; 튜토리얼에선 없음). 다시 해석과 말 거두기는 `reinterpretUsed`를 함께 쓴다.

### 3.4 명령 검증 `validateOrders`

`engine.js:423-461`. 입력 순서대로 하나씩:

```text
limit = actionLimit(side);  budget = {food, wood, stone, faith} 현재값;  pref = DOCTRINE_PREF[doctrine] ?? []
for a in chosen:
  if a.key in forbidden:                         reject('계시가 금지'); continue
  if side == player and accepted 중 (type·build·gather가 a와 같은 것) >= 3:   # 76c0053 — 같은 종류 넷째
                                                 reject(eng.reject.many '같은 일은 계시 하나에 셋까지'); continue
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

**같은 종류는 셋까지**(`76c0053`, 플레이어만): 이미 받아들인 명령 가운데 종류(`type`·`build`·`gather`)가 같은 것이 셋이면 넷째를 `eng.reject.many` "같은 일은 계시 하나에 셋까지"로 거절한다. 석판은 해석에서 이미 같은 일을 둘(수를 말하면 셋)까지로 자르므로([05](05-interpreter.md) 3.2) 이 검사는 주로 LLM 경로의 명령에 걸린다 — 석판은 둘, LLM은 셋이 상한이다.

`DOCTRINE_PREF`: `war → [attack, build]`, `peace → [preach, pray]`, `abundance → [gather, build]`, `wisdom → [pray, explore, build]`.

한 진영은 **한 칸에 한 행동**만 한다(검증·기본 노동·율법파 계획 모두 칸 중복을 막는다).

### 3.5 기본 노동 `autoFill`

`autoFill(side, accepted, forbidden, doctrine = null)` (`engine.js:474-531`). 명령 뒤 남은 행동 수를 신도들이 채운다. 반환값에 `auto: true`.

```text
limit = actionLimit(side);  used = accepted의 칸들;  filled = []
# 1) 뜻을 헤아린 자리 (플레이어, 계시에 교리가 있고 DOCTRINE_LABOR에 그 교리가 있을 때만)
DOCTRINE_LABOR = { peace: [preach, pray], war: [wall, attack], wisdom: [explore, pray] }   # 풍요는 없다; 전쟁은 95eca5f부터 성벽 먼저 (그 전 [attack, wall])
PRIEST_LABOR = {                         # 0a0a974 — 대사제 성향: 몇 손(hands), 무엇부터(first), 선교·공격 승률 문턱(odds)
    loyal:    { hands: 1, first: [],               odds: 0.5 },
    literal:  { hands: 0, first: [],               odds: 0.5 },   # 말한 그대로만 — 헤아린 자리 없음
    dreamer:  { hands: 2, first: [],               odds: 0.5 },
    zealot:   { hands: 1, first: [attack, preach], odds: 0.4 },
    cautious: { hands: 1, first: [wall, pray],     odds: 0.6 } }
temper = PRIEST_LABOR[state.priest] ?? PRIEST_LABOR.loyal
if side == player and doctrine in DOCTRINE_LABOR and len(accepted) < limit:
    left  = 진영 자원의 사본; accepted의 건설마다 pay(left, buildCost(그 건설))   # 받아들인 건설을 치르고 남은 것
    first = (doctrine ∈ [war, peace] or temper.first에 attack·preach가 없음) ? temper.first : []   # 76c0053 — 열혈의 칼·말씀은 전쟁·평화 계시에서만
    kinds = 중복 없이 [...first, ...DOCTRINE_LABOR[doctrine]]                  # 성향의 일이 교리의 일보다 먼저
    repeat temper.hands 번, len(accepted) + len(filled) < limit 인 동안:
        legal = legalActions(side) 중 금지 아니고 칸 미사용인 것 (legalActions 순서, 손마다 다시 거른다)
        for kind in kinds:
            cand = legal 중 (kind == wall ? build == wall and canPay(left, buildCost(wall)) : type == kind and type != build)   # 88878b6 전에는 COST.wall
                   이고 accepted + filled 중 종류(type·build·gather)가 같은 것이 둘 미만     # 76c0053 — 이미 둘인 일에 셋째 손을 보태지 않는다
                   이고 (선교·공격이면 actionOdds(a) >= temper.odds)
            if cand: pick = cand[0]; (성벽이면 pay(left, buildCost(wall))); filled += pick (heeded: true); used += 그 칸; break
# 2) 플레이어: 남는 손은 모자란 것만 채우고 나머지는 쉰다 (8250dd7)
if side == player:
    pool = legalActions(player) 중 금지 아니고 칸 미사용인 것 (legalActions 순서)
    room() = len(accepted) + len(filled) < limit
    planned(res) = accepted + filled 중 gather == res인 수
    best(res) = pool 중 gather == res이고 칸 미사용인 것을 gatherAmount 내림차순 안정 정렬한 첫째
    if faith <= lowFaith(2): pool의 pray (칸 미사용이면) 하나                      # 바닥난 신앙
    k = 0..1: food + 2 × planned(food) < pop + 2 인 동안 best(food) 하나씩 (없거나 room 없으면 멈춤)   # 다음 장 먹을 식량, 둘까지
    for res in [wood, stone]: if side[res] < 2 and planned(res) == 0: best(res) 하나   # 바닥난 나무·돌
    return filled
# 3) 율법파: 예전과 같은 기본 노동
order = ['food','wood','stone']을 현재 보유량 오름차순 안정 정렬
pool  = legalActions(side) 중 gather이고 금지 아닌 것 (legalActions 순서)
prayFirst = legalActions(side)의 pray (금지 아니면)
if side == player and faith <= 2 and prayFirst and 그 칸 미사용 and len(accepted) + len(filled) < limit:   # 8250dd7부터는 2)에서 끝나 율법파만 여기에 온다
    filled += prayFirst
for res in order + order:                           # 6번
    if len(accepted) + len(filled) >= limit: break
    pick = pool에서 gather == res이고 칸 미사용인 첫 행동
    if pick: filled += pick
if len(accepted)+len(filled) < limit and pray 있음 and 수도 칸 미사용: filled += pray
```

- **대사제 성향**(`0a0a974`, 평가자 A: "대사제 모듈은 LLM 프롬프트만 바꾼다"): 헤아린 자리는 모드(LLM·석판)와 무관하게 엔진이 정하므로 성향이 어느 모드에서나 판에 드러난다. 충직(해금 3 전과 튜토리얼의 `loyal`)은 예전과 같은 한 손·50%. 문자주의는 헤아린 자리가 없다(말한 그대로만 — 남은 손은 모두 기본 노동). 몽상가는 두 손 — 손마다 종류 목록을 처음부터 다시 보므로 같은 종류가 둘 나올 수 있다(지혜 → 탐험 둘). 열혈은 공격·선교를 **교리보다 먼저** 보고 문턱이 40%라, 평화·지혜 계시에서도 먼저 칠 수 있다. 신중은 성벽·기도를 먼저 보고 선교·공격은 60%부터다. 성향은 교리가 `DOCTRINE_LABOR`에 있을 때만 작동한다 — 풍요·교리 없음·침묵·율법파는 어느 성향이든 헤아린 자리가 없다. 예 (튜토리얼 1장, 식량5·목재3·돌1, 받아들인 명령 `gather:B2:food`, 선교·공격 승률 42%): 평화 → 충직·몽상가·신중 `pray:C1:`(헤아림), 열혈 `attack:A2:`(헤아림), 문자주의 없음; 전쟁 → 충직·몽상가 없음, 열혈 `attack:A2:`, 신중 `pray:C1:`(성벽을 못 쌓아 기도); 지혜 → 충직 `explore:A3:`, 몽상가 `explore:A3:`·`explore:B3:`, 열혈 `attack:A2:`, 신중 `pray:C1:`. 헤아린 자리가 없으면 그 손은 아래 기본 노동이 채운다(`8250dd7`부터 플레이어는 모자란 것만 — 아래).
- **헤아린 손 빼기**(`238120e`): 확인 화면의 "뜻을 헤아림" 칩(`data-heed`)을 누르면 `pending.noHeed`가 켜져 `derivePending`이 `autoFill(…, doctrine = null)`로 다시 채운다(`main.js:596`) — 헤아린 손 없이 모자란 것만 채우고 나머지는 쉰다. 뺀 자리는 `ui.chip.heedOff` "뜻을 헤아린 손을 뺐다" 칩으로 남고 다시 누르면 되살아난다. 다만 계명을 새기는 장의 다시 채우기(`main.js:734`)는 `result.doctrine`을 그대로 넘겨 뺀 헤아린 손이 되살아난다(§19-67).
- **플레이어의 남는 손**(`8250dd7`, 평가 9차 뒤 플레이어가 고른 방향): 헤아린 손 뒤의 남는 손은 **모자란 것만** 채운다 — 신앙이 바닥났으면(`lowFaith` 2 이하) 기도, 다음 장 먹을 식량이 모자라면(`food + 2 × 계획한 식량 채집 < pop + 2`) 가장 많이 나오는 식량 칸을 둘까지, 나무·돌이 2 미만이고 계획에 없으면 그것 하나씩. 그 밖의 손은 **쉰다**(일은 계시가 정한다). 그 전에는 모자란 자원 순으로 채집을 돌려 행동 수를 늘 채웠고, 남으면 기도했다. 율법파의 기본 노동은 그대로다. 커밋 기록: 계시가 정한 행동의 비율이 planner 약 40% → 79%, smart 31% → 61%; 가장 센 고정 문장 20% → 6%; 눈먼 돌려쓰기 53~54% 대 planner 63%·warplan 64%·smart 55%; smartcath 35% → 51%; smart 판 신앙 승리 4~5% → 13%.
- 헤아린 자리의 승률 문턱은 확인 화면 기준(`actionOdds`)이다(`8250dd7` 전에도 저주 보정은 넣지 않았다). `55d33dd`부터 확인 칩처럼 율법파가 이번 장에 그 칸에 두른다고 보인 성벽도 센다(`wallAhead`, `engine.js:487`, §17). 성벽은 `legalActions`(현재 보유 자원으로 거름)에 더해, **받아들인 건설의 비용을 치르고 남은 자원**(`left`)으로 성벽 비용(돌 2)을 낼 수 있을 때만 고른다(`e68a240`, §19-19). 그래서 받아들인 성벽·신전이 돌을 먼저 쓰면 헤아린 성벽은 나오지 않고 다음 종류(없으면 기본 노동)로 넘어간다. `0a0a974`부터 헤아린 성벽도 고르는 즉시 `left`에서 치른다(손이 둘이어도 돌이 모자란 두 번째 성벽을 고르지 않게).
- 전쟁 교리의 헤아린 손은 `95eca5f`부터 **성벽을 먼저** 고른다 — 성벽만 말한 계시("성벽을 쌓아 지켜라")에 헤아린 공격이 끼어들지 않게. 그래서 공격을 말한 전쟁 계시도 둘러쌀 곳과 돌이 있으면 헤아린 손이 성벽을 쌓는다(골든 `s7-hard-first` 14장 "율법파의 마을을 쳐라": 헤아린 G1 공격 → C1 성벽, 29:55 → 36:52).
- 풍요는 `DOCTRINE_LABOR`에 항목이 없다 — 모자란 자원부터 거두는 아래 기본 노동이 곧 풍요의 뜻이라, 풍요 계시의 기본 노동은 교리 없음과 같다(`e68a240` 전에는 `abundance: [gather]`를 두고 늘 건너뛰었다).
- 헤아린 행동도 `auto`라서 되풀이를 읽는 율법(§4.9)의 목록에는 들지 않는다.
- 율법파의 기본 노동(`planEnemy` 끝)과 **침묵**은 교리 없이 부르므로 헤아린 자리가 없다. 침묵일 때 플레이어 계획 = `[pray(auto)] + autoFill(player, [pray])` (기도할 수 없으면 `autoFill(player, [])`) (`main.js:647`) — `8250dd7`부터 기도 뒤 남는 손은 모자란 것만 채운다(침묵 단추 `ui.silence.btn` "침묵하기 — 신도들은 기도하고 모자란 것만 채운다").
- 예: 5×5 보통 시드 2026, 1장 "기도하라"(지혜, 식량 4·목재 2·돌 0·인구 3) → 명령 `pray:E2:`, 기본 노동 `explore:B1:`(헤아림) · `gather:D2:food`(식량 4 < 3 + 2 — `8250dd7`; 그 전에는 가장 모자란 돌 `gather:C2:stone`).

### 3.6 확정 `accept`

`main.js:707-768`. 엔진 호출 순서:

1. `enemyPlan = planEnemy(state)` — **말한 기적·갈림길 비용보다 먼저** 정한다.
2. 말한 기적(빼지 않았으면) `castMiracle(id, target)` (§6.2). 실패해도 계속.
3. (없음 — `8250dd7` 전에는 `applyTone(state, text ? tone : null)`, §14.4.)
4. 침묵이면 `streak = null`.
5. 갈림길 계절이면 `pick = 글로 고른 선택 ?? dilemmaPick ?? 첫 선택` → `payDilemma(pick)` (§7.2).
6. `plan = accepted + auto`. 계명을 새기기로 했고 `carveCommandment` 성공이면 계획에서 그 계명이 금한 행동을 빼고 `autoFill(player, kept, forbidden + 뺀 칩, doctrine)`로 다시 채운다 (§14.6). 확인 화면에서 뺀 칩(`pending.dropped`)도 금지 키로 넘기므로 다시 채울 때 되살아나지 않는다(`main.js:726`, `e68a240`).
7. 계시가 있으면 `findSacred(text)` (§14.10).
8. 예언을 봉인했으면 `sealProphecy` (§14.7).
9. `resolveRound(state, plan, enemyPlan)` (§3.7).
10. 승자 없으면 `applySilence(state, !!text)` (§14.9).
11. 승자 없고 계시 있으면 `markLegends` (§13.4).
12. 승자 없고 계시 있으면 `keepVows(result.forbidden, plan)` (§14.3).
13. 승자 없으면 `wordsAfter`: 청원 응답 → 이름 은총 (§14.3; `846fd60` 전에는 외면도 셌다).
14. 계시 있으면 `recordRevelation(text, doctrine, speakSnap.spoken ?? spokenOf(text))` (§5.1, `main.js:745` — `8250dd7` 전에는 셋째 인자로 비유면 1인 `extra`). 메아리면 교리가 오르지 않는다 (§14.8). 되풀이 판정은 **말할 때**(§3.3 3단계) 해 둔 값을 쓴다 — 해결 뒤에는 할 수 있는 일이 달라져 석판의 읽음이 바뀌기 때문이다(`9b43bbf`).
15. (없음 — `8250dd7` 전에는 이번 장에 **첫 이름**을 붙였고 `wisdom < 3`이면 `wisdom += 1`.)
16. LLM 해석이면 신학 노트 추출 ([05](05-interpreter.md)) — 엔진 수치 없음.

> 10~16은 `resolveRound` 안의 **유지 단계와 승패 판정 뒤**에 일어난다. 그래서 마지막 장의 승점에는 이번 장 은총(유지 단계의 예언 은총 제외)·교리·침묵 벌이 들어가지 않고, 이번 장 계시로 오른 교리 특전은 **다음 장부터** 적용된다.

### 3.7 해결 `resolveRound`

`engine.js:923-952`.

1. **동시 공개와 막기**: 선 진영(`state.first`) 계획에서 **집 안 행동을 뺀** 행동의 칸 집합을 만든다. 후 진영 행동 중 **집 안 행동이 아니면서** 그 집합에 든 칸을 노리는 것은 모두 **막힘**(`blocked`) — 해결하지 않고 `log.blocked`만 남긴다(난수 없음).
   - 집 안 행동 `home(a)` = `a.type == 'pray'` 또는 `a.type == 'build' && a.build in [temple, cathedral, wall]`. 제 수도·건물 안에서 하는 일이라 칸을 **차지하지도(`5b7a94f`) 막히지도(`e68a240`) 않는다** — 선후와 무관하게 양쪽이 같다. 그래서 선 진영이 수도에서 기도·신전·대성당을 하거나 수도·마을에 성벽을 올려도 같은 장 상대의 그 칸 공격·선교는 막히지 않고, 거꾸로 선 진영이 상대 수도를 공격·선교해도(대성당 원정 포함) 상대의 그 수도 기도·신전·대성당·성벽은 그대로 해결된다. 공격이 마지막 단계라 집 안 행동이 먼저 해결된 뒤 판정된다.
   - 칸을 차지하고 막힐 수도 있는 행동: 채집, 마을 건설, 탐험, 선교, 공격. 예: 율법파가 선인 장(우리가 승점에서 앞서거나, 같은 승점의 짝수 장 — §3.1)에 율법파가 우리 마을을 공격하면 같은 장 우리가 그 마을에서 하는 채집은 막힌다.
2. **6단계**: `PHASE_ORDER = [gather, build, pray, explore, preach, attack]`. 단계마다 선 진영의 그 종류 행동을 계획 순서대로, 그다음 후 진영. 막힌 행동과 `state.winner`가 정해진 뒤의 행동은 건너뛴다. 각 행동은 `resolveAction` (§3.8).
3. `pendingDilemma`가 있고 승자가 없으면 `resolveDilemma(pendingDilemma, prepaid=true)` → `pendingDilemma = null` (§7.2).
4. 승자가 없으면 `upkeep` (§3.10).
5. `recordHistory` — **승자가 있어도** 부른다 (§3.11). (`55d33dd` 전에는 이 앞에 `updateLawGuard(playerPlan)`가 받아들인 명령으로 대비를 정했다 — 이제 다음 장 `startRound`의 `braceLaw`가 한다, §4.9.)

### 3.8 행동별 규칙

#### 합법 행동 `legalActions(side)` (`engine.js:377`)

만드는 순서(= 목록 순서; 율법파 선택과 기본 노동이 이 순서를 쓴다):

1. `reach(side)`의 칸마다(§1.7 순서 — 율법파는 원정 `marchRange`만큼 수도의 손이 길다; 플레이어는 `revealed` 아닌 칸 건너뜀):
   - **채집**: `yieldOf(칸).gather`가 있고, 상대 소유가 아니고, 수도가 아니면 `gather`.
   - **마을**: 주인·건물 없고, `canPay(현재 자원, {wood 2, food 1})`, (플레이어) 계명 `noExpand` 없음.
   - 상대 소유 칸이면 **선교**(`238120e`부터 상대 신도가 둘 이상일 때만 — 마지막 한 명은 설득되지 않는다), 그리고 (플레이어) 계명 `noSword` 없고 시련 `earth`가 아니면 **공격**.
2. 자기 소유 칸(행 우선) 중 건물이 있고 성벽이 없고 돌 2가 있으면 **성벽**.
3. (율법파만) **대성당 원정**: 우리 `cathedral >= 1`(대성당을 지었음)이고 우리 수도가 있고 1에서 우리 수도 공격이 아직 목록에 없으면(= reach 밖이면) `{ type:'attack', tile: 우리 수도, crusade: true }` (`engine.js:401`, §10).
4. 자기 수도가 있으면 **기도**; `templeLevel < 3`이고 비용이 되면 **신전**; (플레이어만) `templeLevel == 3 && !cathedral && round < maxRounds && 우리 마을 수 >= cathedralVillages`이고 비용이 되면 **대성당**(`engine.js:405`, `3f33be1` — 그 전에는 `cathedral < 3`, 마지막 장 조건 없음).
5. (플레이어만) **탐험**: `reach`의 칸마다 이웃(방향 순서) 중 `revealed`가 아니고 `reach`에 없는 칸 (처음 나온 순서, 중복 없음).

#### 행동 요약

| 종류 | 누가 | 대상 | 비용 | 효과 | 난수 (`rng.dice`) |
|---|---|---|---|---|---|
| 채집 `gather` | 양쪽 | reach 안의 채집 가능 칸 | — | 자원 `+gatherAmount` | 없음 |
| 마을 `build village` | 양쪽 | reach 안의 빈 칸 | 목재 2, 식량 1 | 칸 소유 + 마을 | 없음 |
| 성벽 `build wall` | 양쪽 | 자기 수도·마을 | 돌 2 | `wall = true` | 없음 |
| 신전 `build temple` | 양쪽 | 자기 수도 | 돌 `2L`, 목재 `L+1` (`L` = 현재 단계) | 단계 +1; 율법파면 석판 +2 | 없음 |
| 대성당 `build cathedral` | 플레이어 | 자기 수도 (신전 3단계·마을 조건·마지막 장 아님 §10) | §10 | `cathedral = 1`, `crusadeEnd = round + 1` — 다음 장 원정(`3f33be1` 전: 공사 +1, 3이면 승리) | 없음 |
| 기도 `pray` | 양쪽 | 자기 수도 | — | 신앙 `+prayValue` | 없음 |
| 탐험 `explore` | 플레이어 | reach 바로 바깥 안개 | — | 드러냄 + 보물 | 0~2회 |
| 선교 `preach` | 양쪽 | reach 안 상대 칸 | — | 개종 판정 | 2회 |
| 공격 `attack` | 양쪽 | reach 안 상대 칸 (율법파는 대성당이 서 있으면 우리 수도도) | — | 전투 판정 | 2회 |

#### 채집 (`engine.js:1225`)

- 칸이 해결 시점에 상대 소유면 실패(`log.gatherFoe`). (채집이 첫 단계라 실제로는 일어나지 않는다.)
- 양 `gatherAmount(side, tile)`:

  ```text
  n = yieldOf(tile).amount
  if 채집 자원 == food:
      if event == drought and not rainActive:  n -= 2      # 평원·강·오아시스 모두 (§19-6) — 24927a6 전에는 −1
      if event == harvest and tile.terrain in (plain, river): n += 2   # 24927a6 전에는 평원만 +1
      if side.doctrine.abundance >= 2:        n += 1
  n = max(0, n)
  ```
- (`8250dd7` 전에는 축복 말투의 `roundMods.gatherBonus`로 이번 장 플레이어의 첫 채집 한 번이 +1이었다.)

#### 건설 (`engine.js:1237`)

- 해결 시점에 `canPay(현재 자원, buildCost)`가 아니면 실패(`log.buildNoRes`). 채집이 먼저 해결되므로 이번 장 채집한 자원으로 지을 수 있다.
- `buildCost`:

  | 건물 | 비용 | 보정 |
  |---|---|---|
  | village | 목재 2, 식량 1 | — |
  | wall | 돌 2 | 플레이어: 전쟁 교리 4칸 이상이면 돌 1 (`88878b6`, `engine.js:333-334`). 합법 행동·행동 설명·헤아린 노동의 성벽 예산도 이 값을 쓴다 |
  | temple | `{ stone: 2L, wood: L+1 }` (1→2: 돌 2·목재 2, 2→3: 돌 4·목재 3) | 플레이어: 계명 `noExpand`면 돌 −1, 은사 `mason`이고 `L == 1`이면 돌 −1 (각각 최소 0) |
  | cathedral | `CATHEDRAL.cost` (돌 6·목재 6·신앙 6 — `3f33be1`; 그 전에는 단계 배열 `CATHEDRAL[min(2, cathedral)].cost`) | 튜토리얼이 아니고 `k = sizeRules.cathedralCost`가 1이 아니면 각 값 `ceil(v × k)` — 4×4 ×0.7, 6×6 ×1.5, 7×7 ×2 (`engine.js:328-332`, `7a28084`·`3f33be1`; 그 전에는 빠른 판 ×0.7만) |
- 마을: 칸에 이미 주인이 있으면 실패(`log.villageTaken`). 성공하면 `owner = side`, `building = 'village'`, 플레이어면 `revealed = true`. 기록은 `log.village`인데, 칸이 아직 드러나지 않았으면(율법파가 안개 속에 지음) `846fd60`부터 `log.villageFog`("율법파가 안개 속(C3)에 마을을 세웠다.", `{who, place, id}`)다 — 그 전에는 같은 자리에 칸 이름 대신 "안개 지대(C3)를 세웠다"가 나왔다(`engine.js:1243`).
- 성벽: 지불하고 `wall = true`.
- 신전: `templeLevel >= 3`이면 **아무 기록 없이** 끝. 아니면 지불, `templeLevel += 1`, 율법파면 `raiseEdict(+2)`.
- 대성당: 지불, `cathedral = 1`, `state.crusadeEnd = round + 1`, `log.cathedral`(`engine.js:1252-1254`, `3f33be1`). 승리는 원정의 장 끝 `checkVictory`(§10, §15.2). (`3f33be1` 전: `cathedral += 1`, `cathedral >= 3`이면 즉시 `winner = side`, `winKind = 'cathedral'` — 이후 행동은 해결되지 않았다.)

#### 기도 (`engine.js:1231`)

`faith += prayValue(side)`.

#### 탐험 (`engine.js:1256`)

```text
tile.revealed = true; 이웃 모두 revealed = true
if event == prophet:  faith += 3                 # 난수를 쓰지 않는다
elif rand(dice) < 0.5:
    res = ['wood','stone','faith'][floor(rand(dice) * 3)];  side[res] += 2
else: 드러내기만
```

드러난 발견지는 유지 단계의 `discoverSites`에서 발견된다.

#### 선교 (`engine.js:1267-1295`)

```text
if tile.owner != foe or foe.pop <= 1:  log.preachNone, 난수 없음   # 238120e — 마지막 한 명은 설득되지 않는다 (그 전에는 pop <= 0)
bonus = preachBonus(side)
def   = (tile이 수도 ? 1 : 0) + (tile.wall ? 1 : 0) + lawGuardOf(side)   # 되풀이를 읽는 율법 (우리 선교에만, §4.9)
ra = d6(); rd = d6()                              # 공격측 먼저
win = ra + bonus > rd + def                       # 동점은 실패
if win:
    joined = side.pop < popCap(side)
    foe.pop -= 1; if joined: side.pop += 1        # 76c0053 — 가득 찼으면 상대 신도가 흩어지기만 한다 (그 전에는 한도를 보지 않고 +1)
    if player: (joined면 stats.converted += 1); deed(key, 'preach')   # 238120e — 데려온 개종만 센다 (76c0053에는 데려오지 못해도 셌다, §19-64)
    if tile이 마을:
        faithMarks = (같은 진영의 표식이면 n+1, 아니면 {side, n:1}), round = 지금 장
        if faithMarks.n >= FLIP_MARKS(3): tile.owner = side; faithMarks = null   # 성벽은 남는다 (76c0053 — 그 전 2)
                              (player면 stats.turned += 1, revealed = true); log.preachTurn
        else: log.preachMark({who, place, n: faithMarks.n, of: FLIP_MARKS, joined})   # 238120e — "… 믿음의 표식 n/3."
    else: log.preach({who, place, joined})             # joined가 거짓이면 "1명이 흩어졌다(살 곳이 없어 오지 못했다)" (238120e)
```

- `preachBonus`: 율법파 = `(peace>=2) + (peace>=4) + enemyZeal`(교리는 늘 0이라 승천 4의 3막에만 +1). 플레이어 = `min(2, (peace>=2) + (peace>=4) + (계명 noSword) + (은사 preacher이고 converted == 0)) + roundMods.tongues + (event == calm ? 1 : 0)`. 방언과 평온한 장(`24927a6`, 플레이어만)은 상한 밖이다. 설교자 성인의 +1은 `846fd60`에서 뺐다(§13.2).
- 신도 수 우위는 어느 판정에도 없다 — 선교에는 처음부터 없었고, 공격의 우위 +1도 `435c3cc`에서 지웠다 (§1.7, §19 5번).
- 믿음의 표식은 유지 단계에서 `round - faithMarks.round >= 2`면 하나 줄어든다 → 성공 뒤 **다음 두 장 안**에 다시 성공해야 표식이 쌓인다. `76c0053`부터 세 번(`FLIP_MARKS`, `engine.js:534` — `238120e`부터 내보내 `main.js`가 툴팁에 쓴다) 이겨야 마을이 넘어온다(양쪽 — 율법파의 선교도). 13·14차 평가: 평가자 C의 선교 순환(`rotm:cpre`)이 72%였다 — 커밋 기록: 72% → 48%, 숙련 플레이는 그대로. 기록 `log.preachMark`의 "믿음의 표식 1/2."와 칸 툴팁 `ui.tip.marks`의 "N/2 — 한 번 더 전하면…", 보드의 표식 테(반 바퀴씩)는 아직 둘을 기준으로 한다(§19-63).
- **마지막 한 명**(`238120e`, 양쪽): 상대 신도가 하나뿐이면 선교는 합법 행동에 들지 않고(`legalActions`), 계획된 선교도 해결 때 `log.preachNone` "{place}에는 설득할 이가 없었다 — 마지막 남은 이는 끝까지 제 율법을 지킨다."로 실패한다(그 전 글 "{place}에는 설교할 상대가 없었다."). 선교만으로 상대 부족을 비워 남은 자 규칙(§15.2)으로 수도를 흔드는 길을 막는다 — 커밋 기록: `rotm:search2` 전체 56% → 35%, C의 선교 순환 43% → 30%, planner 55%·warplan 56%, 고정 돌리기 최고 40%. 평화 궁극의 스며듦(§5.3)은 이 조건을 보지 않는다(§19-65).
- `76c0053`부터 선교에 이기면 상대 신도는 늘 하나 줄지만, 우리(선교한 쪽) 인구가 `popCap`에 닿아 있으면 데려오지 못한다(규칙서: "우리 인구가 가득 찼으면 흩어지기만 한다"). 그 전에는 한도를 보지 않았다(§19-10).
- 수도 선교는 인구만 옮긴다.

#### 공격 (`engine.js:1296-1303`)

```text
if tile.owner != foe:  실패 기록, 난수 없음
atk = (war>=2)                                            # 전쟁 4칸의 +1은 88878b6에서 뺐다(4칸은 성벽 돌 1), 신도 수 우위 +1은 435c3cc에서
    + (side == enemy and event == threat ? 1 : 0)
    + enemyZeal(side)                                     # 승천 4, 3막 율법파 +1
    + (side == enemy and tile이 우리 수도 and player.cathedral >= 1 ? CATHEDRAL.crusade.bonus(1) : 0)   # 대성당 원정 +1 (3f33be1, §10)
                                                          # (포위 siegeOf +1/+2는 846fd60에서 지웠다; 원정 +1은 9b43bbf~c12a1e9에도 있었다)
    + (side == player ? roundMods.pillar : 0)                  # 저주 말투의 attackBonus +1은 8250dd7에서 지웠다
def = (tile.wall ? 2 : 0) + (tile이 수도 ? 1 : 0)            # 수호자 성인 +1(우리 수도)은 846fd60에서 지웠다
    + lawGuardOf(side)                                    # 되풀이를 읽는 율법 (우리 공격에만, §4.9)
ra = d6(); rd = d6()
win = ra + atk > rd + def                                 # 동점은 방어 승
```

- ~~**포위** `siegeOf`: 율법파 수도의 이웃(최대 6칸) 중 우리 소유 칸(마을)이 2개면 +1, 3개 이상이면 +2. 마을 공격에는 없다.~~ — **없어짐** `846fd60`: 공격 식(해결·`actionOdds`)에서 항을 빼고 함수를 지웠다. 커밋 기록: 평가자 C의 수도 돌격이 4×4 90% → 62%, 5×5 56% → 36%(하네스), 탐욕 최적화기는 그대로(72%, 82%). 규칙서의 보정 표·점령 설명과 `ui.rules.win1`·`core4`에서도 뺐다.
- ~~**원정 +1** (같은 함수, `9b43bbf`): 율법파가 우리 **수도**를 치고 우리 `cathedral >= 1`이면(튜토리얼 제외) +1. 거리와 무관한 원정 공격(`crusade: true`)이든 reach 안의 보통 공격이든 같다.~~ — **없어짐** `55d33dd`: 원정은 선공·거리 무관 공격·맞으면 한 단계 무너짐만 남았다(§10). 커밋 기록: 대성당을 노리는 봇이 7×7 어려움 20% → 38%(하네스), 신전 한 줄 스크립트는 그대로 0%. **다시 생김** `3f33be1`: 대성당이 서 있는 동안 율법파가 우리 수도를 치면 +1(`CATHEDRAL.crusade.bonus` — 위 식, 원정 공격이든 reach 안의 보통 공격이든).

패배(`!win`):
1. 방어측이 우리 수도면 `deed('guard:' + round, 'guard')` (수호자 성인 후보, §13.2).
2. 공격측이 전쟁 궁극(`hasUlt(side,'war')`, 플레이어만)이고 `faith >= 2`면 `faith -= 2`, 인구 손실 없음.
3. 아니면 공격측이 플레이어이고 `roundMods.ark`면 손실 없음.
4. 아니면 공격측이 플레이어면 `fallen(key)` (그 이름의 성인은 순교).
5. 공격측이 율법파이고 튜토리얼이 아니면 **퇴각**: `enemy.food = max(0, food − 1)`, 인구 손실 없음 (`log.attackRetreat`, §4.9).
6. 그 밖(플레이어, 튜토리얼의 율법파)은 `side.pop = max(0, pop - 1)`.

승리:
1. 방어측이 플레이어이고 `roundMods.ark`가 아니면 `foe.pop = max(0, pop - 1)`. (방주면 인구는 지키지만 칸은 빼앗긴다.)
2. ~~공격측이 플레이어면 `bloodKills += 1`; 3의 배수마다 `raiseEdict(+1)`.~~ — **없어짐** `c12a1e9`(피의 율법, §9).
3. 수도면: `foe.capitalHp -= 1`. (`afab303`~`8250dd7`에는 방어측이 플레이어이고 `cathedral >= 1`이면 `cathedral -= 1` — 어느 단계든 한 단계 무너졌다, 방주도 막지 못했다. `d7ad6e0`에서 지웠다 — §10.) `capitalHp <= 0`이면 `winner = 공격측`, `winKind = 'capital'`, `winReason = t('eng.win.capital', { who: 공격측 })`("적 수도 점령" / 율법파가 이기면 "우리 수도 함락"). **수도는 빼앗기지 않는다.**
5. 1에서 방어측 인구가 0이 되어도 여기서는 끝나지 않는다 — 그 장 유지 단계 끝 `checkVictory`의 **남은 자**(§15.2)가 수도를 흔들고 한 명을 돌려보낸다.
4. 마을이면: `owner = 공격측`, `wall = false`, `faithMarks = null`; 플레이어면 `stats.captured += 1`.

### 3.9 갈림길 결과

§7.2. 비용(음수)은 확정 5단계에서 이미 냈고, 6단계 해결 뒤·유지 전에 나머지를 적용한다.

### 3.10 유지 `upkeep`

`engine.js:1336-1407`. 정확한 순서:

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
    if event == plague and s.pop > 1 and not (player and (roundMods.ark or prayedAt == round)): s.pop -= 1   # 기도한 장은 24927a6
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

- ~~**결집의 신도** (`87a0fce`): 결집이 켜져 있으면 율법파 유지 단계에서 굶주림·성장 판정 뒤, 신앙 수입 전에 신도 +1(`log.rallyJoin`, 인구 한도·식량 무관).~~ — **없어짐** `df1cb16`: 평가자 C가 따라잡기가 겹쳐 중반의 앞섬이 의미 없어진다고 본 것을 받아 뺐다(커밋 기록: 중반 8점 선두 유지 64% → 70%, 점령·신앙 승리 약 두 배). 결집은 이제 행동 +1과 공격 먼저뿐이다(§4.9). 언어팩 `log.rallyJoin`도 지웠다.
- 검열 대상 `frequentNoun`은 지금까지의 계시(이번 장 계시는 아직 기록 전이라 빠짐)에서 명사별 "나온 계시 수"가 가장 많은 것, 동점은 먼저 나온 것. 명사 추출은 [05](05-interpreter.md).
- 이탈·검열·예언·석판 뒤에 승패를 본다(§15).

### 3.11 장 기록 `recordHistory`

`engine.js:986-1008`. `resolveRound` 끝에(유지 단계 다음 — `55d33dd` 전에는 `updateLawGuard` 다음) 항상:

1. `history.push({ round, ps: score(player), es: score(enemy), res: 플레이어 자원·인구, text: null })` (확정 뒤 `text`를 채운다).
2. `checkDestiny`.
3. 튜토리얼이거나 승자가 있으면 끝. 아니면 **신의 분노** 갱신 (§6.4).
4. 이어서 **율법파의 결집** 갱신 (§4.9, `engine.js:1003-1007`): `round >= wrathRound && ps − es >= RALLY_LEAD`(8, `engine.js:985`)이면 `rally = true`, 아니면 `ps − es <= RALLY_LEAD / 2`(4)일 때 `rally = false`, 그 사이면 그대로(`637c05a` — `87a0fce`~`3f33be1`에는 12점에 켜지고 6점에 꺼졌고, 그 전에는 8·4점). 새로 켜지면 `log.rally` (율법파 수도 칸, `fx.kind: 'rally'` — `e68a240` 전에는 `'wrath'`를 빌려 썼다). `df1cb16`부터 문구는 "…율법파의 행동이 하나 늘고 칼을 먼저 든다."(신도가 모여든다는 말을 뺐다). 코드 주석은 `637c05a`에서 "우리가 8점 이상 앞서면 율법파는 행동 +1(신도 수에 묶이지 않는다), 공격을 먼저 한다 (4점 이내로 좁혀지면 풀린다)"로 고쳤다(그 전에는 "장마다 신도가 하나씩 모여든다"가 남아 있었다). `log.rally`도 `637c05a`부터 "…행동이 하나 늘고(신도가 줄어도 손이 줄지 않는다) 칼을 먼저 든다."

### 3.12 해결 뒤 말의 장치

§3.6의 10~16. 수치는 §14.

### 3.13 다음 장

재생이 끝나면 `pendingSite`가 있고 판이 끝나지 않았으면 유목민 선택(`resolveSite`, §13.3). 그다음 승자가 있으면 종료, 없으면 `startRound`. 해결 뒤 상태(`'resolved'`)로 저장한 판을 불러와도 `pendingSite`가 있으면 다음 장 전에 유목민 선택을 먼저 묻는다(`resumeLoaded`, `main.js:287-298`). 승자가 **말하기 단계의 기적**으로 정해지면(심판의 날, 번개로 전원 소멸 등) 그 장은 확정·해결 없이 바로 끝난다.

---

## 4. 율법파 (오토마)

### 4.1 율법 카드

`LAW_CARDS` (`data.js:266`). 카드마다 규칙 세 줄. 율법파는 카드의 세 줄을 **두 번** 차례로 시도한다. 그 앞과 사이에 대성당 원정(세 번)·결집·막마다 칼의 공격 규칙이 끼어든다(§4.4, §4.9).

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

`engine.js:172`.

- 튜토리얼: `LAW_CARDS`에서 `L5, L7, L10`을 뺀 7장.
- 그 밖: `LAW_CARDS` 중 (`L10`은 `unlocked(state, 4) && difficulty != 'easy'`일 때만 — 다섯 번째 판부터, `8ba0ef8` 전에는 `veteran`) 지도자가 `remove`한 카드를 뺀 것 + 지도자 `add` 카드 + (시련 `sword`면 `L5` 두 장 더).

### 4.3 이번 장 카드 고르기

`engine.js:586-610`. 장 시작 10~12단계.

1. `lawCard = lawDeck.pop()`.
2. 들은 말 `heard`: `vowNext`가 있으면 `'vow'`, 아니면 **지난 장**(`round - 1`) 계시의 `doctrine`. 쉬움·튜토리얼은 반응하지 않는다.
3. 반응 표 `REACT`: `war → [L4, L3]`, `peace → [L7]`, `abundance → [L2, L9]`, `wisdom → [L6]`, `vow → [L5]`. `pref(card) = react.cards에 있으면 2, 아니면 0`.
4. **어려움**(튜토리얼 제외): `alt = lawDeck.pop()`. `lawThreat(alt) + pref(alt) > lawThreat(lawCard) + pref(lawCard)`이면(엄격히 클 때만) `lawCard = alt`. 고르지 않은 카드는 **버린다**(덱에 돌아가지 않음). `pref(lawCard)`면 `reacted = heard`.
   - `lawThreat(card)` = 카드 규칙 세 줄마다, 지금 `legalActions('enemy')`에 그 규칙과 맞는 행동(`type` 같고, 규칙에 `build`/`gather`가 있으면 그것도 같음)이 하나라도 있으면 가중치 `attack 3, preach 2, build 2, pray 1, gather 1`을 더한 값.
5. 보통: `pref(lawCard)`면 `reacted = heard`. 아니면 반응이 있을 때 덱 위 세 장(인덱스 `len-1, len-2, len-3`, 위부터)에서 `pref`인 첫 카드를 찾아 **지금 카드와 자리를 바꾼다**(지금 카드는 그 자리로 들어간다), `reacted = heard`.

`vowNext`는 서원(공격 금지, §14.3)이나 갈림길 「율법 심문관 — 쫓아낸다」가 `'attack'`으로 켠다.

### 4.4 계획 `planEnemy`

`engine.js:558-582`. 확정 1단계에서 한 번 계산하며(`enemyIntent` 표시도 같은 함수), 난수를 쓰지 않는다.

```text
ZEAL_ACT = { normal: 3, hard: 2 }                      # 쉬움은 없음
limit = actionLimit(enemy);  pool = legalActions(enemy);  used = {};  plan = []
rush  = player.cathedral >= 1 ? [{type:'attack', target:'capital', crusade:true}] × 3 : []   # 대성당 원정 (§10, 3f33be1 — 그 전에는 crusade 없이 한 줄)
rally = state.rally ? [{type:'attack'}] : []                                  # 결집 (§4.9)
act   = tutorial ? 1 : actOf
tail  = act >= ZEAL_ACT[difficulty] ? [card.rules[0], {type:'attack'}, card.rules[1], card.rules[2]]
                                    : card.rules                              # 막마다 칼 (§4.9)
rules = rush + rally + tail + card.rules                                      # 두 번째 바퀴에는 칼이 없다
crusading = 0                                                                 # 637c05a
for rule in rules:
    if not rule.crusade and len(plan) − crusading >= limit: break             # 원정의 세 번은 행동 수에 들지 않는다 (637c05a)
    if not rule.crusade and rule.type in (attack, preach) and enemy.pop < 2: continue   # 원정은 신도 수와 무관 (637c05a)
    pick = rule.crusade ? (pool에서 우리 수도 칸 공격의 첫째 ?? null)        # 원정: used를 보지 않는다 — 같은 공격이 세 번 (3f33be1)
                        : pickForRule(rule, pool 중 칸 미사용)
    if not pick and rule.type in (attack, preach) and not tutorial:
        pick = pickForRule({type:'build', build:'village'}, pool 중 칸 미사용)   # 대체 마을 (§4.9)
    if pick: used += pick.tile; plan += pick; if rule.crusade: crusading += 1
plan += autoFill(enemy, plan 중 crusade가 아닌 것)   # 교리 없음: 부족한 자원 순 채집 → 남으면 기도 (76c0053 — 그 전에는 원정 셋도 세어 남은 손이 줄었다, §19-61)
```

`pickForRule` (`engine.js:537-555`): 후보 = 종류(와 `gather`/`build`)가 맞는 행동.
- `target: 'capital'`: 후보 중 수도 칸만, 없으면 없음. `3f33be1`부터 원정 규칙(`crusade: true`)은 `pickForRule`을 거치지 않고 `pool` 전체에서 수도 칸 공격을 고르므로(한 칸에 한 가지의 예외 — 같은 수도 공격이 계획에 세 번 들어간다) 이 갈래를 부르는 규칙이 없다. 대성당이 서면 `legalActions`에 원정 공격(§3.8 3단계)이 들어가므로 우리 수도는 거리와 무관하게 늘 후보다. `637c05a`부터 원정 규칙은 율법파 신도 수를 보지 않고 행동 수에도 들지 않는다(`crusading`) — 그 전에는 신도가 2 미만이면 건너뛰고 행동 수가 셋보다 적으면 그만큼만 쳤다(§19-60).
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
| 율법파의 뜻 공개 | 모든 행동 | 기도만 빼고 모두 (`16492f4` — 그 전에는 공격·선교·건설) | 공격·건설 (`0a0a974` — 그 전에는 공격만) |
| 지난 말에 반응 | 없음 | 덱 위 셋에서 교체 | 두 장 중 위협적인 쪽 (반응은 동점 깨기 +2) |
| 막마다 칼 `ZEAL_ACT` (§4.9) | 없음 | 3막부터 | 2막부터 |
| 원정·대체 마을·결집·퇴각·되풀이를 읽는 율법·7×7 행동 +1 (§4.9) | 있음 | 있음 | 있음 |
| 지도자 `iron` | 없음 | 있음 | 있음 |
| 검열 카드 L10 (해금 4) | 없음 | 있음 | 있음 |
| 정경 교리 +1 | 적용 | 적용 | **없음** |
| 승천 | — | — | 1~5 (§16.4) |

### 4.7 율법파의 뜻 `enemyIntent`

`engine.js:784-791`. `planEnemy` 결과마다 `shown = 난이도 조건 && 그 칸이 revealed`. 난이도 조건: 쉬움 전부, 보통 `type != 'pray'`(`16492f4` — 칸을 차지하는 일은 채집까지 모두 보이고, 수도 안의 일이라 막지도 막히지도 않는 기도만 가린다. 신전·성벽 건설도 칸을 차지하지 않지만(§3.7) 건설이라 보인다. 그 전에는 `type ∈ {attack, preach, build}`), 어려움 `type ∈ {attack, build}`(`0a0a974` — 어려움에서도 읽고 막는 판단이 남게 건설을 보인다; 선교·채집·기도는 가린다. 그 전에는 공격만). 튜토리얼은 쉬움처럼 전부. 석판의 곳의 말 "노리는 곳"(`kw.place.aim`)도 `shown`만 가리키므로 어려움에서도 율법파의 마을·성벽 자리를 짚을 수 있다 — `16492f4`부터 보이는 뜻 가운데 채집이 아닌 것이 하나라도 있으면 그것만 가리킨다(보통에서 채집이 보이게 되어 "노리는 곳"이 채집 칸으로 흩어지지 않게, [05](05-interpreter.md)). 보이는 뜻 중 **성벽 건설**은 확인 화면의 승률과 석판의 공격·선교 후보 순위가 그 칸에 성벽이 선 것으로 센다(`wallAhead`, §17 — 건설이 공격·선교보다 먼저 풀린다). 청원 「위협」이 이것을 본다(§14.3). 결집·되풀이를 읽는 율법·원정 거리는 행동이 아니라 상태라서 화면이 뜻 카드에 따로 적는다(`lawBackHTML`, [06](06-ui-ux.md)).

### 4.8 율법파의 살림

- 유지 단계는 플레이어와 같은 식(생산·먹기·성장·신앙 수입·역병). 교리가 늘 0이라 성장 비용 2, 인구 한도 `3 + 2×마을`.
- 율법파 신앙은 기도·수입으로만 쌓이고 **쓰는 곳이 없다** — 심판의 기준 「경건」(`pious`, 신앙 3마다 승점 1, §12)에서 승점으로만 읽힌다. `c12a1e9` 전에는 유지 단계에 `faith >= 10`이면 `faith -= 10`, 석판 +1(장당 한 번, `edictOn`일 때만)이었다 — 평가(6차)에서 플레이어가 손쓸 수 없는 석판 시계라 판마다 약 3.5칸을 채운다고 보고 뺐다(§9).
- 율법파는 계시 비용·기적·교리·말투가 없다. 대성당을 짓지 않는다.

### 4.9 율법파의 반격 — 원정·칼·대체 마을·결집·퇴각·되풀이를 읽는 율법

`afab303`에서 더한 규칙. 모두 **튜토리얼에는 없고**, 첫 판·veteran·해금 단계(§16.2) 구분 없이 적용된다(칼만 난이도를 본다). 난수를 쓰지 않는다. 평가(`docs/EVALUATION-2026-09-30.md`) 뒤 벤치마크(`tools/tests/bench.mjs`)에서 보통 난이도 판 중 율법파가 한 번도 공격하지 않은 판이 54% → 8%로 줄었다.

| 규칙 | 조건 | 효과 | 위치 |
|---|---|---|---|
| **원정** `marchRange` | 튜토리얼 제외 | 율법파 **수도**의 reach 반경 `2 + (actOf − 1)` → 1막 2칸, 2막 3칸, 3막 4칸. 마을 반경은 1 그대로. 채집·마을·선교·공격 후보가 모두 넓어진다 | `engine.js:206-215` |
| **막마다 칼** `ZEAL_ACT` | 보통 3막부터, 어려움 2막부터 (쉬움 없음) | 첫 바퀴에서 카드 규칙 1 다음에 `{type:'attack'}` 한 줄 | `engine.js:524, 527-528` |
| **대체 마을** | 튜토리얼 제외 | 공격·선교 규칙에 고를 대상이 없으면 그 자리에 우리 쪽으로 뻗는 마을 건설을 고른다. 신도가 2 미만이면 규칙 자체를 건너뛰므로 대체도 없다 | `engine.js:546` |
| **결집** `rally` | 장 기록(§3.11)에서 `round >= wrathRound`이고 `ps − es >= 8`이면 켜지고, `ps − es <= 4`이면 꺼진다 (그 사이는 유지; 튜토리얼·승자 있을 때는 갱신 없음. `637c05a` — `87a0fce`~`3f33be1`에는 12·6점, 그 전에는 8·4점) | 켜져 있는 동안 율법파 행동 수 +1이고 `637c05a`부터 **신도 수에 묶이지 않는다**(`actionLimit`의 `min(limit, pop)`을 건너뛴다 — 공격·선교는 여전히 신도 둘 이상일 때만), 계획의 원정 다음 맨 앞에 `{type:'attack'}` 한 줄. 새로 켜질 때 `log.rally`. (`87a0fce`~`df1cb16` 사이에는 유지 단계마다 율법파 신도 +1도 있었다 — §3.10) | `engine.js:1003-1007`, `231`, `235`, `564` |
| **큰 판의 손** (`9b43bbf`) | 판 크기 표의 `enemyActions`(7×7만 1, §1.1 — `7a28084`부터 표에서 읽는다), 튜토리얼 제외 | 율법파 행동 수 +1 (`actionLimit`의 `bonus`, 인구 상한은 그대로). 결집과 겹친다 | `engine.js:225` |
| **퇴각** | 율법파 공격 패배, 튜토리얼 제외 | 인구 대신 `food = max(0, food − 1)` (`log.attackRetreat`) | `engine.js:1258-1262` |
| **되풀이를 읽는 율법** `lawGuard` | 튜토리얼 제외 | 아래 | `engine.js:959-982`, `271` |

결집은 신의 분노(§6.4)의 거울이다: 분노는 우리가 6점(승천 3이면 8점) 이상 **뒤질** 때, 결집은 8점 이상 **앞설** 때 찬다(`637c05a`에서 12점 → 8점으로 되돌리고 손이 신도 수에 묶이지 않게 했다 — 13차 평가 A: 율법파가 신도 1~2명으로 쪼그라들면 행동 +1이 아무것도 바꾸지 못했다; 커밋 기록: 대차 46% → 43%, 중반 선두가 지는 판 36% → 40%, war3 49% → 42%, planner 64% → 56%. 그 전 `87a0fce`에서 8점 → 12점으로 늦추는 대신 장마다 신도가 모여들게 했다 — 선공이 뒤진 쪽으로 가는 §3.1과 함께 앞선 판이 끝까지 굴러가지 않게. `df1cb16`에서 그 신도 +1을 뺐다 — 따라잡기가 겹쳐 중반의 앞섬이 의미 없어진다는 평가자 C의 지적; 커밋 기록의 smart 봇: 중반 8점 선두 유지 64% → 70%, 15점 이상 대차 34% → 40%).

**저울** (`3a790f5`): 규칙은 그대로이고 **보여 주는 법**만 바꿨다. 규칙서(`docs/RULEBOOK.md` 6절)와 화면 규칙서의 "한눈에" 묶음(`ui.rules.core6`, `main.js:1161`에서 `core4` 다음·`core5` 앞)은 따라잡기 셋을 "승점이 뒤진 쪽이 힘을 얻는다"는 한 개념으로 묶는다.

| 뒤진 정도 | 뒤진 쪽이 받는 것 | 규칙 |
|---|---|---|
| 조금이라도 (같으면 번갈아) | 선공 — 같은 칸을 먼저 쓴다. 단 우리가 대성당을 지었으면 늘 율법파(`0c95856`, §10) | §3.1 13단계 |
| 우리가 6점 이상 (`wrathRound`부터, 승천 3이면 8점) | 신의 분노 — 기적이 싸지고, 가득 차면 「심판의 날」 (판에 한 번) | §6.4 |
| 율법파가 8점 이상 (`wrathRound`부터) | 결집 — 율법파 행동 +1(신도 수에 묶이지 않는다)·공격 먼저 (4점 이내면 풀린다; `637c05a` 전에는 12·6점, `df1cb16` 전에는 장마다 신도 +1도) | 위 표 |

(`ui.rules.core6`의 문구는 승천 3의 8점과 4장부터라는 시점을 생략한다. `df1cb16`에서 뺀 결집의 신도 +1은 `55d33dd`에서 `ui.rules.core6`에서도 지웠다 — 이제 "결집(행동 +1·먼저 공격)". 원정·칼은 저울이 아니라 막의 규칙으로 따로 남았다 — 규칙서 5절.)

**되풀이를 읽는 율법 — 율법파가 우리를 읽는다** (`braceLaw`, `engine.js:976-982`, `startRound`의 `round += 1` 바로 뒤 — `55d33dd`; 판정 `readUs`, `engine.js:959-966` — `88878b6`). `df1cb16`에서 되풀이 규칙 둘(말의 메아리 §14.8, 칼의 굳은 율법)을 **하나의 원칙**으로 합쳤고, `55d33dd`에서 판정까지 하나로 했으며, `88878b6`에서 연속 작은 기적(§5.4)을 이 규칙에 넣었다: 지난 장 계시가 메아리(§14.8 — 적는 동안 비용 알약에 "되풀이"가 뜨는 바로 그 판정, `recordRevelation`이 `echo: true`로 기록)였거나, **칼이나 말씀을 세 장 이어 들었으면**(마지막 세 계시가 이어진 세 장이고 셋 모두 `swordOrWord` — `238120e`부터 교리가 **전쟁**이거나 일 목록 `sig`에 공격·선교가 있다, `637c05a`~`76c0053`에는 교리가 전쟁·평화이거나; `637c05a`부터 다른 일과 섞어도. `3f33be1`~`637c05a` 전에는 교리만 보고 전쟁·평화를 번갈아도, 그 전에는 셋이 같은 교리), 다음 장 율법파가 우리를 읽고 **우리 선교·공격 모두에** 대비한다.

```text
readUs(state, r):                                 # 88878b6 — r장의 계시로 율법파가 우리를 읽는가
    last = revelations.at(-1)
    if not last or last.round != r: return false     # 그 장에 계시가 없었다(침묵)
    if last.echo: return true                        # 되풀이
    r3 = revelations의 마지막 셋
    return len(r3) == 3 and 셋 모두 swordOrWord and r3[0].round == r − 2   # 칼·말씀 세 장 연속, 섞여도 (637c05a — 3f33be1에는 셋의 교리가 모두 전쟁·평화; 메아리 계시도 센다)
READ_DOCTRINES = [war, peace]                     # e174a18 — 그 전에는 교리면 무엇이든 (풍요·지혜 세 장도 읽혔다)
swordOrWord(x) = x 있음 and (x.doctrine == war or x.sig의 '|' 조각에 attack·preach가 있음)   # 238120e, engine.js:958 (637c05a~76c0053: doctrine ∈ READ_DOCTRINES — 평화 교리만으로도)
braceLaw(state):                                  # startRound 1단계, round를 올린 직후
    if tutorial: return
    echoed = readUs(state, round − 1)
    before = lawGuard
    lawGuard = echoed ? min(2, before + 1) : 0
    if lawGuard > before: log.lawGuard(n = lawGuard)                # fx.kind 'guard', 우리 수도 칸(88878b6 — 그 전에는 율법파 수도) — 이번 장의 기록
braceAhead(state) = (tutorial or not readUs(state, round)) ? 0 : min(2, lawGuard + 1)   # 이번 장 계시를 기록한 뒤 다음 장 대비를 미리 본다 (봇 — tools/tests/sim.mjs)
lawGuardOf(player) = min(2, lawGuard)      # 이번 장 우리 선교·공격 판정의 방어 보너스 (§3.8), 율법파 쪽은 0
```

- 읽힌 계시 다음 장에 율법파의 선교·공격 방어 +1, 읽힘이 이어지면 +2(최대). 읽히지 않은 계시(메아리가 아니고 칼·말씀 세 장째도 아님)나 침묵(계시가 기록되지 않아 `last.round`가 지난 장이 아니다)이 한 번 끼면 0으로 풀린다. 칼·말씀을 이어 들면 세 장째부터 장마다 읽힌다 — 네 장이면 넷째 장 계시 뒤 +2가 된다. `637c05a`부터 **공격·선교를 시킨 계시**도 센다(교리가 풍요·지혜여도 — "마을을 세우고 이웃에게 사랑을 전하라") — 13차 평가 C가 400개 돌리기에서 찾은, 늘 선교하지만 교리가 섞여(지혜·평화·풍요) 읽히지 않던 돌리기(`rotm:cmix`)가 5×5 첫 판 94~95%·전체 75%였다. 커밋 기록·평가 문서: 그 돌리기 80% → 37%, 선교 돌리기 28%. `3f33be1`부터 둘을 **번갈아도**(평화·전쟁·평화) 읽힌다 — 12차 평가에서 세 평가자가 함께 짚은 선교 돌리기(`rotm:preachwar`: 약한 곳에 선교 / 성벽 없는 곳을 침 / 선교)가 5×5에서 숙련 봇과 같았다(첫 판 보통 88~95%). 커밋 기록·평가 문서: 선교 돌리기 70% → 31~38%(5×5 첫 판 보통 93% → 48%), planner 79%·warplan 75%는 그대로, 가장 센 돌리기는 이제 `war3` 49~56%. 규칙서의 말("전쟁·평화를 세 장 이어")은 그대로이고 화면 글에 "(번갈아도)"를 붙였다(`ui.rules.core3`·`doctrine2`·`enemy3`·`ui.mat.streakTip` — `doctrine2`는 "같은 교리를 세 장"에서 고침). `e174a18`부터 **전쟁·평화만** 읽힌다(`READ_DOCTRINES`) — 풍요·지혜를 세 장 이어 말해도 읽히지 않는다(평가 11차: 공격을 한 적 없는 살림 위주 플레이어가 "읽혀" 대비를 맞았다). 되풀이한 일에 선교·공격이 없어도 오른다("마을을 넓혀라"를 거듭해도 다음 장 우리 선교·공격에 방어 +1이 붙는다) — 다만 `e174a18`부터 채집·기도뿐인 계시는 되풀이가 아니다(§14.8).
- 기록 `log.lawGuard` = "율법파가 우리의 말씀을 읽고 대비한다 — 이번 장 우리의 선교·공격에 방어 +{n}."(`88878b6` — 그 전 "되풀이된 말씀을")은 값이 **오를 때만**(1이 될 때, 2가 될 때) 대비가 걸리는 장의 `startRound`에서 남는다 — 최대에 머무는 장에는 없다. `startRound`의 기록이라 해결 재생(수락 뒤 로그만 돈다)에는 들지 않는다 — `846fd60`부터 `newRound`가 장이 열릴 때 따로 `playFx`로 보인다 — `88878b6`부터 기록의 칸이 **우리 수도**라 늘 보인다(그 전에는 율법파 수도라 안개 속이면 건너뛰었다). 율법 카드 뒷면의 알약은 "우리를 읽음: 선교·공격 방어 +n"(`1cc1887` — 그 전 "되풀이를 읽음")이다([06](06-ui-ux.md), §19-49).
- 판정 재료가 비용과 같다(`55d33dd`): 글이 같거나 석판이 글에서 읽은 일이 지난 두 계시와 같으면(`isEcho`, 말할 때 `spokenOf`로 보관) 비용 +1이고 **그 계시**가 다음 장의 대비를 켠다. 칩을 빼거나 LLM이 다르게 읽어도 둘이 어긋나지 않는다(§19-45 고침). 칼·말씀 세 장의 읽힘은 비용과 무관하다. 확인 화면은 `d3fe641`부터 `wouldRead(state, text, doctrine)`(`engine.js:969-974` — 튜토리얼이 아니고, 메아리이거나 이번(`{doctrine, sig: planSig(text)}` — `637c05a`)과 바로 앞 두 장이 모두 `swordOrWord`이고 이어진 장)로 둘 다 미리 알린다: 메아리면 `ui.tag.readEcho` "되풀이 — 율법파가 읽는다 (다음 장 선교·공격 방어 +1)", 칼·말씀 세 장째면 `ui.tag.streak` "칼·말씀 세 장째 — 율법파가 읽는다 (다음 장 선교·공격 방어 +{n})"(`637c05a` — `3f33be1`에는 "전쟁·평화 세 장째({이번 교리}) — …", 그 전 "{교리} 세 장째 — …"; 부르는 쪽은 아직 `{name}`을 넘긴다 — §19-62)([06](06-ui-ux.md)) — `1fbb160`부터 둘 다 "(다음 장 선교·공격 방어 +{n})", `n = min(2, lawGuard + 1)`(§19-54). `e174a18`부터 `wouldRead`도 전쟁·평화일 때만, `3f33be1`부터 섞여도 참으로 본다(그 전에는 셋이 같은 교리). 튜토리얼은 메아리가 없고 `braceLaw`도 돌지 않는다. 커밋 기록(`88878b6`, 평가 8차에서 두 평가자가 따로 찾은 눈먼 세 줄 전쟁 돌리기가 82~94%로 숙련 봇과 같거나 앞섰다): 5×5 보통 첫 판 `rotm:war3` 71% 대 smart 83%·planner 78%·warplan 88%, 전체 `war3` 56%·숙련 봇 54~56%.
- `55d33dd` 전(`df1cb16`~`c12a1e9`)에는 `updateLawGuard(playerPlan)`가 `resolveRound`의 유지 단계 뒤에 **받아들인 명령**(`auto` 아님)의 종류 목록을 지난 두 계시의 `sig`와 견주어 `{ preach, attack }` 두 칸을 함께 올렸다(되풀이한 장마다 기록). 옛 저장본의 두 칸은 불러올 때 큰 값 하나로 바뀐다(`hydrateState`). 커밋 기록(`55d33dd`): 고정 문장의 전쟁 줄이 제대로 막힌다 — `fix:warcombo` 15% → 6%, `fix:war` 7% → 3%, 숙련 봇은 그대로.
- `df1cb16` 전 규칙(`afab303`~): 계시로 **선교를 명령한** 장 다음 장에 선교 방어 +1, 연달아 +2, 명령하지 않은 장이 끼면 0 — 공격도 따로 같은 식(되풀이 여부와 무관하게, 같은 종류의 명령을 이어 쓰면 굳었다). 기록은 종류별로 `log.lawGuard({kind, n})`였다. 커밋 기록: 평가자 C의 성벽/전쟁 번갈아 쓰기 44% → 25%(하네스), smart 봇 중 planner 42% → 59%·warplan 46% → 62%, 가장 센 한 줄 19%.
- 메아리(§14.8)와 함께 처음 들어갔을 때(`afab303`) 벤치마크에서 가장 센 한 줄 반복 스크립트의 승률이 100% → 33%로 내려갔다(커밋 기록).

---

## 5. 교리

### 5.1 오르는 법

`recordRevelation(text, doctrine, spoken = spokenOf(text))` (`8250dd7` 전에는 `doctrine` 뒤에 `extra`) (`engine.js:1476-1496`), 확정 14단계. 화면은 `spoken`에 말할 때 보관한 `speakSnap.spoken`을 넘긴다(§3.6).

```text
d = player.doctrine
sig = spoken.sig || undefined                      # 빈 목록이면 기록하지 않는다
if spoken.echo:                                    # 메아리 (§14.8) — 말할 때 판정한 값
    revelations.push({round, text, doctrine, echo: true, sig})
    streak = streakAfter(doctrine, sig)            # 88878b6 — 메아리도 연속을 센다 (3f33be1 전: 교리가 있을 때만 갱신; sig는 637c05a)
    log.echo; return                                                   # 교리·대립 없음
if doctrine and d[doctrine] < 6: d[doctrine] += 1
# (8250dd7 전: if doctrine and extra and d[doctrine] < 3: d[doctrine] += extra — 비유 말투 extra = 1)
revelations.push({round, text, doctrine, sig})
if winner: return
streak = streakAfter(doctrine, sig)                # 3f33be1 — 교리 대립보다 먼저 (그 전에는 대립 뒤, 교리가 없으면 null)
if not doctrine: return
# 교리 대립 (unlocked(state, 4) — 다섯 번째 판부터, 튜토리얼 제외; 8ba0ef8 전에는 veteran)
opp = OPPOSED[doctrine]            # peace↔war, abundance↔wisdom
if d[opp] > perkFloor(d[opp]): d[opp] -= 1          # perkFloor: 6→6, 4~5→4, 2~3→2, 0~1→0
# 연속 (교리 칸의 점 — 88878b6부터 3에서 멈추고, 기적은 없다) — engine.js:1474
streakAfter(doctrine, sig) = swordOrWord({doctrine, sig})
        ? {doctrine, n: (streak ? min(3, streak.n + 1) : 1)}   # 칼·말씀은 섞여도 이어진다 (637c05a — streak이 있으면 곧 칼·말씀의 연속)
        : null                                                  # 칼도 말씀도 아니면 끊는다
# (637c05a 전 3f33be1: doctrine ∈ READ_DOCTRINES ? {doctrine, n: (streak.doctrine ∈ READ_DOCTRINES ? min(3, n+1) : 1)} : null)
# (3f33be1 전: streak = (streak.doctrine == doctrine) ? {doctrine, min(3, n+1)} : {doctrine, n:1} — 어느 교리든 같은 교리끼리)
```

- 계시의 교리를 정하는 방법(석판 규칙·LLM)은 [05](05-interpreter.md). 해석 결과 `doctrine`은 키 하나 또는 `null`(석판 해석은 교리가 정해지지 않았는데 금지한 행동이 있으면 `peace`, `interpreter.js:257`; LLM은 한국어 교리 이름을 키로 바꾼다).
- 다른 교리 증가(`8250dd7`부터 첫 이름 붙이기의 지혜 +1은 없다): 갈림길 「신도들의 다툼 — 편을 든다」(§7.2), 전생의 유적(§13.3), 정경·시련 `earth` 시작값(§1.5).
- 대립으로는 이미 얻은 특전 칸(2·4·6) 아래로 내려가지 않는다.

### 5.2 특전

| 교리 | 2칸 | 4칸 | 6칸 궁극 (`round >= ultRound`부터) |
|---|---|---|---|
| 평화 `peace` | 선교 +1 | 선교 +1 (누적, 합 최대 +2) | 장이 끝날 때 이웃 율법파 마을에 스며듦 |
| 전쟁 `war` | 공격 +1 | 성벽이 돌 1 (원래 2 — `88878b6`; 그 전에는 공격 +1 누적) | 공격에 지면 신도 대신 신앙 2 |
| 풍요 `abundance` | 식량 채집 +1 | 성장 비용 2 → 1 | 인구 한도 +2 |
| 지혜 `wisdom` | 기도 신앙 +1 | 행동 수 +1 | 다가올 계절 두 장 중 하나를 고름 |

2·4칸 특전은 그 값이 되는 즉시(다음 해결부터) 적용된다. 궁극은 6칸이어도 `ultRound`(8장, 빠른 판 6장) 전에는 잠들어 있다. 6칸이면 소명 「한길의 자」는 바로 이룬다.

### 5.3 궁극 효과

- **평화**: 유지 단계(표식 감소 뒤)에 `hasUlt(peace) && enemy.pop > 0 && player.pop > 0`이면, `state.tiles` 순서로 첫 번째 "율법파 마을이면서 우리 소유 칸 중 하나와 거리 1"인 칸을 대상으로 `ra = d6(), rd = d6()`, `ra > rd + 1`이면 율법파 −1, 우리 +1(한도 무시, 표식 없음). 대상이 없으면 난수도 없다.
- **전쟁**: §3.8 공격 패배 2단계.
- **풍요**: `popCap +2`.
- **지혜**: §3.1 8단계와 `chooseEvent`.

### 5.4 연속 — 율법파가 읽는다 (예전의 연속 작은 기적)

`88878b6`부터 같은 교리를 **세 장 이어** 말하면(교리 없는 계시·침묵이 끊는다, 메아리 계시도 센다) 기적 대신 **율법파가 우리를 읽는다** — `e174a18`부터 전쟁·평화일 때만(풍요·지혜 세 장은 연속 점만 찼다), `3f33be1`부터 전쟁·평화를 **번갈아도**(풍요·지혜·교리 없는 계시는 점도 끊는다), `637c05a`부터 **칼이나 말씀**(공격·선교를 시켰거나 전쟁·평화를 말한 계시 — 섞어도; `238120e`부터 평화 교리만으로는 칼·말씀이 아니다 — 말씀은 선교) — 되풀이와 같은 대비(다음 장 우리 선교·공격 방어 +1, 이어지면 +2, §4.9 `readUs`). 판정은 `state.streak`이 아니라 `revelations`의 마지막 세 계시로 한다. 확인 화면 꼬리표는 `1fbb160`부터 "(다음 장 선교·공격 방어 +{n})"을 붙인다 — `n = min(2, lawGuard + 1)`. `state.streak`은 교리 칸의 점(`ui.mat.streak` "연속 ●●○" — 마지막 계시의 교리 칸에, 툴팁 `ui.mat.streakTip` — `637c05a`부터 "칼이나 말씀을 세 장 이어 들면(공격·선교를 시키거나 전쟁·평화를 말하면 — 번갈아도) 율법파가 읽고 대비한다 (다음 장 선교·공격 방어 +1, 이어지면 +2)", `3f33be1`에는 "전쟁·평화를 세 장 이어 말하면(번갈아도) …", `e174a18`에는 "(번갈아도)" 없이, 그 전 "같은 교리를 세 장 이어 말하면 … (다음 장 선교·공격 방어 +1)")과 확인 화면 꼬리표(`ui.tag.streak`)에만 쓰이고 3에서 멈춘다. 튜토리얼에서는 대비가 없고 `d3fe641`부터 점과 꼬리표도 뜨지 않는다(§19-52). 확인 화면의 꼬리표는 `d3fe641`부터 `wouldRead`로 되풀이까지 미리 알린다(§4.9).

~~`streakMiracle`: 같은 교리 계시가 세 장 연속이면 한 번 일어나고 연속이 0으로 돌아갔다. 첫 판에도 있었다. 메아리는 연속을 늘리지도 끊지도 않았다.~~ — **없어짐** `88878b6`(평가 8차: 같은 교리를 이어 말하는 눈먼 전쟁 돌리기가 숙련 봇을 앞섰다). 옛 효과 — 평화: 율법파 −1·우리 +1(한도 안) / 전쟁: 보이는 율법파 성벽 중 우리 수도에서 가장 가까운 것을 허묾, 없으면 율법파 신앙 −2 / 풍요: 식량 +4 / 지혜: 우리 칸에서 거리 2 안을 드러내고 `discoverSites`, 끝나면 `checkVictory(final=false)`. 기록 `log.streak.*` 다섯, 띠 `ui.banner.streak`, 연출 `playFx`의 `streak` 갈래도 지웠다.

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
| `doom` | 심판의 날 | 0 | 숨은 기적, 판에 한 번 (§6.4) |

- 첫 판~세 번째 판(해금 3 미만): `FIRST_HAND = [lightning, rain, bounty]`.
- 해금 3(네 번째 판부터, `8ba0ef8` 전에는 veteran): `[a, b, c]` — `a = hashPick([lightning, rain], 'hand0', seed)`, `rest = [bounty, manna, ark, tongues, pillar, revive]`, `b = hashPick(rest, 'hand1', seed)`, `c = hashPick(rest − b, 'hand2', seed)`.
- 시련 `storm`: `[lightning, bounty, pillar]` 고정.
- **드래프트** (`unlocked(state, 3)` — 해금 3, 튜토리얼 제외, `round == draftRound`): 풀 = 손패에 없는 기적(시련 `storm`은 `rain` 제외, `MIRACLES` 순서). 세 번 `pool.splice(floor(rand(deck) × len), 1)`로 후보 3장. 플레이어가 하나를 골라 손패에 더한다(`takeMiracle`). 심판의 날은 드래프트에 나오지 않는다.

### 6.2 쓰기

`castMiracle(id, target)` (`engine.js:800`).

- 조건: 손패에 있음(심판의 날은 `doomReady`), `!miracleUsed`, `faith >= miracleCost`. 번개는 목표가 율법파 소유이고 `revealed`여야 한다.
- 비용 `miracleCost = doom ? 0 : max(1, cost − wrath − (시련 storm && lightning ? 1 : 0)) + (miracleUses[id] ?? 0)` (`engine.js:795`). **같은 기적을 다시 쓸 때마다 신앙 +1** (`87a0fce` — 번개 하나로 판을 끌고 가지 않게). 횟수는 판 전체 누적이라 장이 바뀌어도 줄지 않고, 분노 할인은 앞의 `max(1, …)`에만 걸려 재사용 가산은 깎이지 않는다. 예: 단비(3)는 첫 번 3, 두 번째 4, 분노 2이면 두 번째 `max(1, 1) + 1 = 2`. 심판의 날은 늘 0.
- 지불 → 효과 → `miracleUsed = true`, `usedMiracle(id)`(`miracleUses = {...miracleUses, [id]: n + 1}`, `engine.js:776`) → `stats.miracles += 1` → `checkVictory(final=false)`. 성공한 쓰임만 센다(조건·목표 검사에서 되돌아가면 세지 않는다). 심판의 날도 세지만 비용에는 영향이 없다. 말한 기적(아래)도 `castMiracle`을 거치므로 같이 센다.
- `miracleUses`는 `createState`에서 `{}`. `435c3cc`부터 `hydrateState`도 `??= {}`로 채운다(`engine.js:1200`, `doomUsed ??= false`와 함께). `55d33dd` 전에는 `updateLawGuard`의 `??= {}`도 있었다(`braceLaw`에는 없다). 옛 저장본은 그 전까지 쓴 횟수를 모르므로 0부터 센다.
- 화면의 손패 툴팁(`main.js:2014`, `435c3cc`)은 분노 할인과 재사용 가산을 따로 적는다: 분노가 있고 `cost > miracleCost − uses`(할인이 실제로 걸렸을 때)면 `ui.hand.wrath` " (분노 {n}칸, -{off})" — `off = cost − (miracleCost − uses)`, 재사용한 적이 있으면 `ui.hand.reuse` " (다시 쓴 만큼 +{n})" — `n = uses`. 심판의 날 카드에는 둘 다 없다. 그 전에는 `off = cost − miracleCost` 하나라 둘이 겹치면 "-0"·음수가 나왔다(§19 34번).
- 쓰는 때: 말하기 단계의 카드(즉시), 또는 계시 속 말로 부른 **말한 기적**(확정 2단계, 말투·갈림길 비용보다 먼저). 말한 기적은 확인 화면에서 칩으로 뺄 수 있다. 말한 번개의 목표: 계시에 나온 이름 붙인 율법파 칸, 없으면 (`bcdeb22`부터) 계시가 수도를 가리키고(`kw.place.capital` — "수도·본거지·도읍·도성·적의 성·심장부") 율법파 수도가 드러나 있으면 **율법파 수도**, 없으면 보이는 율법파 칸 중 마을 우선·우리 수도에서 가까운 순의 첫째 (`main.js:615-621`; 골든 구동기 `tools/golden.mjs:124-129`도 같다). `0c95856`부터 우리 말(`kw.place.ours` — "우리·나의·내")이 함께 있으면 수도 조준을 하지 않는다 — "번개로 우리 수도를 지켜라"는 율법파 수도가 아니라 마을 우선 순서의 첫 칸을 친다(그 전에는 누구의 수도인지 보지 않았다).

### 6.3 방주 `roundMods.ark`

이번 장(해결과 유지)에 플레이어는: 식량이 음수여도 굶주림 없음(식량 0), 역병 없음, 우리 공격이 져도 손실 없음, 율법파 공격에 져도 인구 손실 없음(칸·수도 내구도는 잃는다). 신앙 바닥 이탈·침묵 이탈은 막지 않는다. 갈림길 「역병 치료사 — 대가를 치른다」도 방주를 켠다.

### 6.4 신의 분노와 심판의 날

- `recordHistory`에서(튜토리얼·승자 있을 때 제외): `gap = es − ps`.
  - `round >= wrathRound`이고 `gap >= (승천 ≥ 3 ? 8 : 6)`이면 `wrath = min(3, wrath + 1)`
  - 그렇지 않고 `gap <= 3`이면 `wrath = max(0, wrath − 1)`
  - 그 사이면 그대로.
- 효과: 모든 기적 비용 −`wrath` (최소 1).
- `doomReady = wrath >= 3 && !tutorial && !doomUsed`이면 **심판의 날**을 쓸 수 있다(비용 0, 장당 기적 한 번에 포함, `engine.js:769`): 율법파 `capitalHp −1`(최소 0), 인구 −1(최소 0), `wrath = 0`, **`doomUsed = true`**, 석판 −2. `capitalHp <= 0`이면 `winKind = 'doom'`으로 승리.
- **판에 한 번** (`9b43bbf`): 일부러 뒤처져 분노를 채우고 심판의 날을 거듭 내리는 길(7×7 보통에서 기도와 심판의 날만으로 97% 승리)을 막는다. 그 뒤에도 분노는 차고 내려 기적 비용을 낮춘다. 분노가 3이 될 때의 기록 `log.wrathFull`은 `{ doom: !doomUsed }`를 받아, 이미 썼으면 "신의 분노가 가득 찼다 — 기적이 가장 싸다.", 아니면 "…「심판의 날」을 내릴 수 있다 (판에 한 번)."이라 쓴다(`engine.js:952`).
- `doomUsed`는 `createState`에서 `false`. `435c3cc`부터 `hydrateState`도 `??= false`로 채운다(`engine.js:1200`; `55d33dd` 전에는 `updateLawGuard`의 `??= false`도 있었다).
- 수도 내구도가 2(`435c3cc`)라서 심판의 날 한 번 + 수도 공격 한 번이면 점령이다. 기록 문구는 "율법파 수도가 흔들리고(내구도 {hp})"(`log.doom`, `data.miracle.doom.text` — 예전의 "율법파의 탑"은 모두 "수도"로 바꿨다).

---

## 7. 계절(사건)·갈림길·미라

### 7.1 계절 `EVENTS`

| id | 이름 | 규칙 효과 |
|---|---|---|
| `calm` | 평온한 계절 | 이번 장 **우리 선교 +1**(`preachBonus`, 상한 밖 — `24927a6`; 그 전에는 효과 없음). 글 "평온한 계절 — 율법파의 마음도 누그러졌다." |
| `drought` | 가뭄 | 식량 채집 −2 (양쪽, 단비가 없으면 — `24927a6`; 그 전에는 −1. 규칙 글 "평원·강 식량 채집 -2"와 달리 오아시스 등 모든 식량 채집, §19-6) |
| `harvest` | 풍년 | 평원·강 식량 채집 +2 (양쪽 — `24927a6`; 그 전에는 평원만 +1) |
| `plague` | 역병 | 유지 단계에 양쪽 인구 −1 (`pop > 1`일 때; 우리는 방주가 있거나 `24927a6`부터 **이번 장 기도했으면**(`prayedAt == round`) 제외) |
| `threat` | 율법파 집결 | 율법파 공격 +1 |
| `prophet` | 떠돌이 예언자 | 탐험하면 반드시 신앙 +3 (난수 없음) |

계절은 청원의 필요도 바꾼다(§14.3).

### 7.2 갈림길 `DILEMMAS`

해금 3(네 번째 판부터, `8ba0ef8` 전에는 veteran) 판에 셋이 계절 덱에 섞인다(§2.5; 첫 덱에만, 보충 덱에는 없다). 계절처럼 한 장을 차지하며 그 장에는 계절 효과가 없다. 선택: 계시 속 말(`dilemmaByText`: 선택마다 `tags` 정규식, 첫 일치) > 버튼(`dilemmaPick`) > 첫 선택.

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

**비용 치르기** `payDilemma(pick)` (확정 5단계, `engine.js:1077`):

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

**결과** `resolveDilemma(pick, prepaid=true)` (해결 뒤·유지 전, `engine.js:1096`):

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

- 조건 (장 시작 7단계): `unlocked(state, 4) && !miraDone && actOf >= 2`(해금 4 — 다섯 번째 판부터, 검열과 같은 묶음; `8ba0ef8` 전에는 `veteran && !tutorial`) 이고 (`(peace >= 3 && war >= 3) || (abundance >= 3 && wisdom >= 3)` 또는 `player.faithless >= 1`).
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
| 성전 카드 | 해금 3, 2막 첫 장, 풀에 L5 | L5를 덱 위 네 번째에 끼움 |
| 평온 없음 | 해금 3, 3막 첫 장 | 계절 덱에서 `calm` 제거 (§19: 보충 덱) |
| 막 머리말 | 해금 3, 막이 바뀐 첫 장 | 화면이 `ACTS[막].text`를 율법파 지도자 말풍선으로 (`main.js:495`, 규칙 효과 없음) |
| 성지가 석판을 움직임 | `edictOn`(해금 1), 2막부터 | §9 |
| 미라 | 해금 4, 2막부터 | §7.3 |
| 원정 | 튜토리얼 제외 (첫 판에도) | 율법파 수도의 손 2막 +1칸, 3막 +2칸 (§4.9) |
| 막마다 칼 | 보통 3막, 어려움 2막부터 (튜토리얼 제외) | 율법파 계획에 공격 한 줄 (§4.9) |
| 승천 4 | 3막 | 율법파 공격·선교 주사위 +1 (`enemyZeal`) |

예: 12장 판이면 원정 거리 `marchRange`는 1~3장 0, 4~7장 1, 8~12장 2.

이름(`ACTS`): 제1막·개척, 제2막·경쟁, 제3막·심판. **절기**(2막 첫 장 「하지제」, 3막 첫 장 「추수제」, 마지막 장 「동지의 밤」)와 **달 이름**(`monthOf = MONTHS[min(11, floor((round−1)×12 / maxRounds))]`)은 장 제목 연출일 뿐 규칙 효과가 없다.

---

## 9. 율법 석판과 성지

`edictOn = !tutorial && 해금 >= 1` — 두 번째 판부터(§16.2, `8ba0ef8` 전에는 `veteran && !tutorial`로 같은 판). 꺼져 있으면 `raiseEdict`는 아무것도 하지 않는다. 석판을 내리는 번개는 "율법파 수도"를 친다 — 기록 까닭 `eng.edict.lightning`은 `435c3cc`부터 "번개가 율법파 수도의 돌판을 쪼갰다", 신전을 높여 오르는 까닭 `eng.edict.temple`은 "율법파가 신전을 높였다", 경고 `log.edictNear`는 "…성지를 쥐거나 번개로 율법파 수도를 쳐서 막아야 한다"(예전의 "탑").

`raiseEdict(n)` (`engine.js:1014-1022`): `edict = clamp(edict + n, 0, edictMax)`; 바뀌었으면 기록, `edictMax − 2`를 처음 넘으면 경고. **승패는 유지 단계의 `checkVictory`에서만** 본다.

| 원인 | 변화 | 시점 |
|---|---|---|
| 율법파 신전 단계 상승 | +2 | 건설 단계 (`engine.js:1249`) |
| 율법파가 성지 소유 (2막부터) | +1 | 유지 (`holyAndEdict`, `engine.js:1023-1029`) |
| 미라 「품는다」 | +1 | 갈림길 결과 |
| 플레이어가 성지 소유 (2막부터) | −1 | 유지 |
| 번개가 율법파 수도에 | −2 | 기적 |
| 심판의 날 | −2 | 기적 |

- 최대 `EDICT_MAX = 10`(승천 ≥ 2면 8). 가득 차면 율법파 승리(`edict`).
- **`c12a1e9`에서 뺀 두 원인**: 율법파 신앙 ≥ 10 → 신앙 −10, 석판 +1(유지, 장당 1회)과 **피의 율법**(플레이어 공격 승리 3번마다 +1 — `bloodKills % 3 == 0`, 수도 타격 포함; 상태 필드 `bloodKills`와 기록 까닭 `eng.edict.faith`·`eng.edict.blood`도 지웠다). 같은 커밋에서 12칸 → 10칸. 까닭(6차 평가): 석판이 모듈로 열리는 두 번째 판에서 난이도 절벽 — 네 줄 돌려쓰기 51% → 19%, 그 패배의 65%가 석판; 석판을 채운 것은 율법파가 성지를 쥔 장(판마다 약 5.5)과 플레이어가 손쓸 수 없는 신앙 전환(약 3.5)이었다. 커밋 기록: 5×5 보통 첫 판 → 둘째 판 돌려쓰기 45% → 37%(전에는 45% → 18%), 석판으로 끝난 판 6% → 3%. 이제 석판은 **성지·율법파 신전·번개·심판의 날**로만 움직인다(그리고 미라 「품는다」 +1 — 커밋 기록·규칙서·툴팁 `ui.mat.edictTip`은 이 갈림길과 심판의 날을 적지 않는다).
- **옛 저장본** (`55d33dd`): `state.ruleset`이 10 미만(없으면 0)인 저장본을 불러오면 두 진영의 석판을 `min(edict, edictMax − 1)`로 자른다 — 12칸 시절의 석판이 새 한계에 닿아 불러오자마자 지지 않게(`engine.js:1211`, §20-17).
- 유지 단계 순서상 석판 변화(`holyAndEdict`)가 `checkVictory`보다 먼저라, 건설로 10이 되어도 같은 유지 단계에서 성지로 −1 되면 이기지 못한다.
- **성지**(`holyId`, §2.4): 그 칸에 **마을**을 가진 쪽이 소유자. 짓거나(빈 칸이면), 빼앗거나(공격), 넘기거나(선교 표식 3 — `76c0053` 전 2) 해서 얻는다. 소유자는 승점 +2 — 이 승점은 **첫 판·1막에도** 적용된다(석판 효과만 2막·veteran 조건).

---

## 10. 대성당

`3f33be1`부터 **한 번에 짓고 한 장을 버티는** 승리다. 플레이어만 짓는다. `CATHEDRAL = { cost: {stone: 6, wood: 6, faith: 6}, crusade: {attacks: 3, bonus: 1}, villages: 2 }` (`data.js:23-25`).

| 판 | 비용 (돌·목재·신앙) | 필요한 우리 마을 |
|---|---|---|
| 4×4 (×0.7) | 5 · 5 · 5 | 2 |
| 5×5 (×1) | 6 · 6 · 6 | 2 |
| 6×6 (×1.5) | 9 · 9 · 9 | 3 |
| 7×7 (×2) | 12 · 12 · 12 | 5 |

- **짓기** (`legalActions`, `engine.js:405`): 신전 3단계이고, 아직 짓지 않았고(`!cathedral`), `round < maxRounds`(마지막 장에는 못 짓는다 — 버틸 장이 없다), 우리 마을이 `cathedralVillages = CATHEDRAL.villages(2) + sizeRules.cathedralVillages`개 이상(`engine.js:210`, 튜토리얼은 더하기 0 — 판 크기 표의 더하기는 4×4·5×5 0, 6×6 1, 7×7 3), 비용을 낼 수 있을 때. 비용은 판 크기 표(§1.1)의 `cathedralCost`로 각 값을 `ceil(v × k)` (§3.8 건설, `engine.js:328-332`). 마을을 잃으면 합법 행동에서 빠진다.
- **지으면** (`resolveAction`, `engine.js:1252-1254`): 지불, `cathedral = 1`, `state.crusadeEnd = round + 1`, 기록 `log.cathedral` "신도들이 대성당을 세웠다! 율법파가 원정을 떠난다 — 다음 장 수도를 세 번 친다. 그 장을 버티면 이긴다."(`fx.kind 'build'`, ⛪). 승점은 주지 않는다(단계 승점 줄 `eng.score.cathedral`을 지웠다 — §12). 율법파의 이번 장 계획은 해결 전에 정해졌으므로(`main.js` `accept`의 `planEnemy`) 원정은 다음 장부터다.
- **원정** (다음 장 — `cathedral >= 1`이면):
  - 선공은 승점과 무관하게 **율법파**(`startRound`, `engine.js:645`, §3.1 13단계).
  - 율법파의 `legalActions`에 우리 수도 공격이 **거리와 무관하게** 들어간다(`crusade: true`, `engine.js:401` — 닿는 범위 안이면 보통 공격 그대로).
  - `planEnemy`가 규칙 맨 앞에 `{type:'attack', target:'capital', crusade:true}`를 **세 번**(`CATHEDRAL.crusade.attacks`) 둔다(`engine.js:566`). 이 규칙은 `pickForRule` 대신 후보에서 수도 칸 공격을 곧장 고르고, **한 칸에 한 가지(`used`)를 따지지 않아** 같은 공격이 세 번 계획에 들어간다(`engine.js:576`). `637c05a`부터 세 번은 율법파 신도 수·행동 수(`limit`)와 상관없다 — 원정 규칙은 신도 둘 미만의 건너뛰기를 받지 않고, 계획의 행동 수 셈에서 빠진다(`crusading`, `engine.js:571-578`). 그 전에는 다른 공격처럼 신도가 하나면 원정 공격이 하나도 없어 대성당이 저절로 이겼다(§19-60).
  - 대성당이 서 있는 동안 율법파가 우리 수도를 치면 공격 +1(`CATHEDRAL.crusade.bonus`, `engine.js:1300`, §3.8). 막기 규칙(§3.7)과 다른 주사위 보정은 보통 공격과 같다.
- **승리** (`checkVictory`, `engine.js:1458-1462`): 유지 단계 끝(`final`)에 `crusadeEnd`가 있고 `round >= crusadeEnd`이고 우리 수도 내구도 > 0이면 `winner = player`, `winKind = 'cathedral'`, 사유 `eng.win.cathedral` "대성당이 원정을 버텼다", 기록 `log.cathedralDone` "대성당의 종이 울렸다 — 율법파의 원정을 버텨 냈다!"(`fx.kind 'cathedral'`, 우리 수도 칸). 신앙 승리 다음, 마지막 장 승점보다 먼저 본다(§15). 원정 중에 수도가 무너지면 율법파의 점령 승리다.
- 화면 규칙서(`ui.rules.win3`): "신전 3단계에서 대성당을 짓는다(돌 6·나무 6·신앙 6, 우리 마을 둘 — 6×6은 셋에 비용 1.5배, 7×7은 다섯에 비용 2배). 지으면 율법파가 원정한다 — 다음 장 선공을 쥐고 거리에 상관없이 우리 수도를 세 번 친다(+1). 그 장이 끝날 때 수도가 서 있으면 이긴다. 마지막 장에는 짓지 못한다."
- 저장: `crusadeEnd`는 새 상태 필드다(기본 `null`). `hydrateState`는 규칙 판 16 전 저장본에서 `cathedral > 0`(세 단계 시절에 한 단계라도 올림)이면 `cathedral = 1`, `crusadeEnd ??= round + 1`로 바꾼다 — 불러온 다음 장이 원정이다(`engine.js:1202-1204`).
- `3f33be1`의 까닭(12차 평가 — 사용자 결정, `EVALUATION-2026-09-30.md`): "대성당 승리가 죽었다" — 대성당 대본이 벤치에서 1%, 평가자 C의 대성당 돌진 5~7%. 바꾼 뒤 대성당만 노리는 대본(`cathbot`, 수도에 성벽부터) 5×5 24~33%·6×6 32~45%·7×7 21~53%로 같은 판의 planner보다 낮다. `smartcath`도 성벽을 두르고 짓는다([tools/tests/README](../../tools/tests/README.md)).

**그 전 대성당** (`afab303`~`e174a18` — 옮기지 않는다):
- 신전 3단계에서 기초·벽·첨탑 세 단계(`CATHEDRAL` 배열, 이름 `data.cathedral.0~2.name`)를 올렸고, 셋째 단계를 지으면 즉시 승리, 공사 단계마다 승점 +1이었다. 단계 비용은 `d7ad6e0`부터 3·3·3(그 전 4·4·4, 4·4·4, 3·3·5 — 쓰이지 않던 `COST.cathedral` 돌 11·목재 11·신앙 13과 합계가 같았다), 7×7은 ×1.5(`7a28084` — 평가자 B의 건설 휴리스틱이 7×7 보통 80판 중 60판을 대성당으로 이겼다 → 23판). 필요한 마을은 `d7ad6e0`부터 단계와 무관하게 1 + 판 크기 더하기(6×6 +1, 7×7 +2 — `9b43bbf`에서 `max(0, rows − 5)`로 더했고 `7a28084`부터 판 크기 표), 그 전에는 단계마다 하나씩 더(1·2·3에 더하기).
- 공사가 1 이상이면 율법파가 원정했다: 거리와 무관한 수도 공격 **한 번**(계획 맨 앞), `0c95856`부터 율법파 선공. `9b43bbf`~`c12a1e9`에는 그 공격이 +1(`siegeOf`)이었다 — `55d33dd`에서 뺐다(대성당을 노리는 봇 7×7 어려움 20% → 38%, 하네스). `afab303`~`8250dd7`에는 율법파가 우리 수도를 칠 때마다(남은 자에도) 한 단계 무너졌다(`log.cathedralFall` — `d7ad6e0`에서 지움).
- 세 규칙(단계·마을 조건·원정)은 `afab303`에서 더했다: 7×7에서 "신전을 높이 세우라" 한 줄만 되풀이해 이기던 판(92~100%)이 0%가 되었다(벤치 `tools/tests/bench.mjs`). `9b43bbf`의 큰 판 마을 조건·원정 +1·7×7 율법파 행동 +1(§4.9)은 7×7 보통 건설 한 줄을 71% → 50%로 낮췄다. `d7ad6e0`의 3·3·3과 무너지지 않는 단계는 대성당 스크립트를 5×5 5% → 25%, 6×6 5% → 43%로 올렸지만(조정자의 하네스), 12차 평가의 벤치 대본은 1%였다.

---

## 11. 소명

해금 2(세 번째 판부터, `8ba0ef8` 전에는 veteran)이고 `!tutorial && !challenge`인 판. 후보 = `DESTINIES` 키(시련 `earth`는 `sword` 제외)를 `hashPick([0..9], seed, 'dest', id)` 오름차순, 동점은 id 문자열 오름차순으로 정렬. 앞의 셋이 `destinyOffer`, 첫째가 기본 `destiny = { id, done:false }`. 1장에만 고를 수 있다.

확인: 유지 단계(승패 판정 전)와 `recordHistory`의 `checkDestiny`. 이루면 `done = true`, 승점 +5 (`DESTINY_POINTS`). 한 번 이루면 끝.

| id | 이름 | 조건 `test(state)` |
|---|---|---|
| `villages` | 넓히는 자 | `round <= 8 && 우리 마을 >= 4` |
| `convert` | 부르는 자 | `stats.converted >= 3` (선교 성공 누적) |
| `ultimate` | 한길의 자 | 우리 교리 하나가 6 이상 (장 제한 없음) |
| `temple` | 쌓는 자 | `round <= 6 && templeLevel >= 3` |
| `feeder` | 먹이는 자 | `round >= maxRounds && !stats.starved` |
| `fortress` | 지키는 자 | `round >= maxRounds && capitalHp >= CAPITAL_HP` (`435c3cc`부터 상수로 — 지금 2, 곧 수도가 한 번도 맞지 않음. 글 "끝까지 수도를 한 번도 내주지 않기 (내구도 온전히)") |
| `sword` | 치는 자 | `stats.captured >= 2` (공격으로 빼앗은 마을) |
| `namer` | 부르는 이름 | 이름 붙인 칸 3개 |

마지막 장의 유지 단계에서 `feeder`·`fortress`를 먼저 보고 승점을 매긴다. 확정 14단계(교리) 뒤에야 이루어지는 소명은 다음 장 확인 때 반영된다.

---

## 12. 심판의 기준과 승점

`scoreBreakdown(side)` (`engine.js:1410`). 합계 = Σ `n × w`.

| 항목 | `n` | `w` |
|---|---|---|
| 신도 | `pop` | 기준표 `pop` |
| 마을 | 마을 수 | 기준표 `village` |
| 신전 | `templeLevel` | 기준표 `temple` |
| 수도 | `capitalHp` | 기준표 `hp` |
| 성벽 (기준에 `wall`이 있을 때) | 자기 소유 칸 중 성벽 수(수도 포함) | 기준표 `wall` |
| 성지 | 소유면 1 | 2 |
| ~~대성당~~ | ~~공사 단계 (0이면 항목 없음)~~ | ~~1~~ — **없어짐** `3f33be1`(줄 이름 `eng.score.cathedral`도) |
| 소명 (플레이어) | 이루었으면 1 | 5 |
| 신앙 (기준에 `faith`가 있을 때) | `floor(faith / w.faith)` | 1 |

| 기준 id | 이름 | pop | village | temple | hp | 그 밖 |
|---|---|---|---|---|---|---|
| `classic` | 기본 | 2 | 3 | 2 | 1 | |
| `wide` | 넓은 자 | 1 | 5 | 2 | 1 | |
| `fertile` | 번성한 자 | 3 | 2 | 1 | 1 | |
| `pious` | 경건한 자 | 2 | 2 | 3 | 1 | 신앙 3마다 1 |
| `steadfast` | 굳센 자 | 2 | 2 | 2 | 3 | 성벽마다 1 |

첫 판은 늘 `classic`. 율법파도 같은 기준으로 센다. 규칙서(`docs/RULEBOOK.md`)의 승점 줄은 `95eca5f`부터 성지(마을이 있으면 +2)와 대성당 단계(+1)도 적었다 — 엔진은 처음부터 셌다(이 표). 대성당 단계 승점은 `3f33be1`에서 단계와 함께 없어졌다.

---

## 13. 이름 있는 신도·성인·발견지·전설

### 13.1 이름 있는 신도

`followerName(key) = hashPick(PETITIONERS, seed, key)` — 행동 `key`로 신도 이름이 정해진다(같은 칸 같은 행동 = 같은 사람). `PETITIONERS` 12명.

### 13.2 성인

`deed(key, kind)` (`engine.js:250`): `deeds[이름][kind] += 1`. 성인은 판에 최대 2명, 종류마다 1명.

| 성인 | 조건 | 효과 |
|---|---|---|
| 설교자 성인 `preacher` | 같은 이름으로 선교 성공 3번 (= 같은 칸 선교 `key`) | 없음 — 이름·기록·업적만 (`846fd60` 전: 플레이어 선교 +1, 상한 2 안) |
| 수호자 성인 `guardian` | 율법파의 우리 수도 공격을 막아낸 장의 `guard:<round>` 이름 (1번이면 된다) | 없음 — 이름·기록·업적만 (`846fd60` 전: 우리 수도 방어 +1) |

`846fd60`에서 성인의 주사위 보정 둘을 숨은 규칙이라 뺐다(평가 7차). 기록 `log.saint`는 "…성인으로 추앙받는다 — 설교자 성인."(전에는 "(선교 +1)"·"(수도 방어 +1)"이 붙었다), 매트의 성인 알약 툴팁 `ui.mat.saintPreacher`·`saintGuard`는 "말씀을 셋 이상 전한 신도"·"수도를 지켜 낸 신도"다.

우리 공격이 져서 신도를 잃으면(`fallen(key)`) 그 이름이 쓰러진 자 목록에 들고, 그 이름의 성인은 사라진다.

### 13.3 발견지

`discoverSites` (`engine.js:873`): 유지 단계(시야 갱신 뒤). (`88878b6` 전에는 지혜 연속 기적 뒤에도.) `state.tiles` 순서로 `revealed`이고 아직 `found`가 아닌 발견지마다:

| id | 이름 | 효과 |
|---|---|---|
| `altar` | 잊힌 제단 | 신앙 +3 |
| `spring` | 말하는 샘 | 목재 +2, 돌 +1 |
| `bones` | 거인의 뼈 | 돌 +3 |
| `nomads` | 떠도는 유목민 | 선택: `take` → `pop < popCap`이면 인구 +1, 아니면 식량 +2 / `send` → 신앙 +2 |
| `legacy` | 전생의 유적 | `config.legacy.doctrine`이 있고 그 교리 < 3이면 교리 +1, 아니면 신앙 +2 |

- 선택이 필요한 유목민은 `pendingSite`에 칸을 두고, 이미 기다리는 유목민이 있으면 다음 유목민은 발견하지 않고 남겨 둔다(나중 장에 발견).
- 유목민 선택은 그 장 재생이 끝난 뒤 한다(`resolveSite`, `main.js:1256`). 판이 끝난 장이면 하지 않는다.
- 발견지는 율법파와 무관하다(율법파는 발견하지 않는다).

### 13.4 전설이 된 땅

`markLegends` (확정 11단계): 명령한(자동 아닌) 행동이 빼앗기·넘기기·대성당을 이룬 칸에 별칭(판당 최대 3). **수치 효과 없음**(표시·연대기용).

---

## 14. 말의 장치 요약 (→ 05)

판별 방법(정규식·LLM)은 모두 [05 해석기](05-interpreter.md). 아래는 엔진·확정 순서에서의 **수치 효과**만.

### 14.1 계시 비용과 길이

`revelationCostFor(text)` (`engine.js:764-766`):

```text
cost = 1 + (봉인된 말 중 하나라도 text에 있으면 1 : 0) + (isEcho(text) ? 1 : 0)   # isEcho는 글 또는 일의 목록으로 (§14.8)
```

- **길이는 비용에 들지 않는다**(`0c95856`). 그 전에는 `base = (len(trim(text)) > 30 and 인용한 말 없음) ? 2 : 1` — 30자를 넘으면 2, 다만 최근 세 장 계시의 명사를 섞어 쓰면(**인용**, `citedWords`) 1이었다. 평가자 A가 거의 의미가 없다고 본 두 규칙을 함께 지웠고, 커밋 기록으로 하네스의 밸런스는 그대로였다. `data.js`의 옛 함수 `revelationCost`도 지웠다([03](03-data.md#함수-칸-fn)). 규칙서·화면 규칙서(`ui.rules.flow1` "신앙 1 — 금한 낱말이나 되풀이면 +1", `ui.rules.words5`는 인용 대신 되풀이 설명)와 튜토리얼 2장 대사(`tut.speak2.0`)도 바꿨다.
- 길이 상한 100자(시련 `cloister` 20자). 비용은 계시할 때 먼저 낸다(§3.3).
- ~~`citedWords`(최근 세 장 계시와 겹치는 명사)는 남아 있지만 이제 비용에 쓰이지 않는다 — 확인 화면의 "인용 · '…'" 꼬리표와 보라 밑줄만 만든다.~~ — **없어짐** `16492f4`: 효과 없는 장치를 알리지 않게 `citedWords`(`lore.js`)·`kw.citeStop`·꼬리표 `ui.tag.cited`·밑줄 `u.lw.cite`·`.cost-pill.cite`를 모두 지웠다([05](05-interpreter.md), [06](06-ui-ux.md)).
- **메아리** +1: §14.8. 예전의 성언 할인(세 번 쓴 구절은 길어도 1)은 되풀이를 벌하는 메아리와 어긋나 `afab303`에서 없앴다.
- 다시 해석 신앙 −1, 말 거두기 veteran 신앙 −1 (§3.3).

### 14.2 은총 `grantGrace`

`engine.js:660`. **은총은 하나의 규칙**(`8250dd7`): 말씀이 신도에게 닿으면 신앙 +1 — 청원에 답했을 때, 금한 칼·설교를 지켰을 때(서원), 땅에 이름을 붙였을 때, 봉인한 예언이 이루어졌을 때. 넷이 합쳐 **장당 1**(`gracePerRound`). 장이 바뀌면 사용량을 0으로. 한도가 차면 0을 준다(기록도 없음). 부르는 순서는 예언(유지 단계, `checkProphecy`) → 서원(확정 12단계) → 청원 → 이름(13단계)이라 앞의 것이 받는다. 화면 규칙서 `ui.rules.words1`이 이 규칙을 그대로 적는다("<b>은총</b> — 말씀이 신도에게 닿으면 신앙 +1 (장당 한 번): …").

### 14.3 청원·서원

**청원** `makePetition` (장 시작 16단계, `engine.js:671`): 아래 목록에서 **첫 번째로 참인** 것.

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

응답: 명령(`accepted`)에 필요와 맞는 행동이 있거나, 계시 글이 청원의 `keys` 정규식에 맞으면. 확정 13단계 `wordsAfter`에서 `need`가 있고 응답했으면 `stats.petitions += 1`, 은총 +1. 응답하지 않아도 아무 일이 없다 — `846fd60`에서 **외면 벌**(두 번 외면하면 `faith = max(0, faith − 1)`, 침묵한 장도 외면으로 셈, 튜토리얼은 `2825b37`부터 세지 않음)과 `state.petitionIgnored`, 기록 `ui.log.petitionIgnored`를 숨은 규칙이라 지웠다(화면 `main.js`, 골든 구동기 `tools/golden.mjs`, 테스트 구동기 `tools/tests/lib.mjs` 모두).

**서원** `keepVows(forbidden, plan)` (확정 12단계): 해석이 금지한 행동 중 공격·선교 종류가 있으면 — 공격이 있으면 `vowNext = 'attack'`(다음 장 율법파 반응 `vow` → L5); 이번 계획에 그 종류가 하나도 없으면 은총 +1(`stats.vows += 1`).

`wordsAfter` (`main.js:771-777`) 안의 순서: 청원 → 이름. 은총 상한 때문에 앞의 것이 먼저 받는다(서원은 그보다 앞, 12단계; `8250dd7`부터 이룬 예언은 그보다도 앞 — 유지 단계). 확인 화면의 "· 은총" 꼬리표는 서원 > 청원 순으로만 붙여, 그 장에 예언이 이루어져 은총을 먼저 가져가는 경우는 모른다(§19-55). 예전의 **기이한 해석** 은총(LLM 명령이 계시와 무관하면 판당 한 번 +1)은 숨은 규칙이라 `afab303`에서 없앴다(남아 있던 `state.oddUsed`도 `e68a240`에서 지웠다).

### 14.4 말투

`8250dd7`부터 말투는 **수치가 없다**. 글은 "대사제의 말씨가 달라진다"고 하지만 코드는 말투로 해석문을 바꾸지 않는다(석판의 머리말은 교리 말투 `voiceOf`, LLM 프롬프트에도 말투 지시가 없다) — 남은 것은 확인 화면 꼬리표, 어휘집의 `tone:*` 항목, 골든의 `tone`뿐이다(§19-57). `applyTone`과 `roundMods.gatherBonus`·`attackBonus`를 지웠고, `data.tone.*.text`는 "대사제의 말씨가 달라진다 (수치는 그대로)", 확인 화면 꼬리표 `ui.tag.tone`은 "{name}의 말투"(툴팁이 그 글), 규칙서 `ui.rules.words3`은 "말투(축복·저주·비유)는 대사제의 말씨를 바꿀 뿐 수치는 바꾸지 않는다". 판별 우선순위 저주 > 축복 > 비유 > 명령 ([05](05-interpreter.md)).

`8250dd7` 전 효과(확정 3단계 `applyTone`이 이전 장 보정을 지우고):

| 말투 | 효과 (`8250dd7` 전) |
|---|---|
| 명령 `command` | 없음 |
| 축복 `blessing` | `roundMods.gatherBonus = 1` → 이번 장 플레이어 첫 채집 +1 |
| 저주 `curse` | `roundMods.attackBonus = 1` → 이번 장 플레이어 공격 +1; 즉시 `faith = max(0, faith − 1)` |
| 비유 `metaphor` | 교리 +1 더 (`recordRevelation`의 `extra = 1`, 그 교리 < 3일 때) |

### 14.5 이름 붙이기 `nameTile`

계시할 때(해석 전). 판당 3개. 대상 = 드러난 칸 중 종류가 맞고(`village`: 우리 마을, `capital`: 우리 수도, 그 밖: 그 지형이고 건물 없음) 아직 이름이 없고 같은 이름이 없는 칸 중 우리 수도에서 가장 가까운 칸(동점은 칸 순서). 효과: 은총 +1(§14.2). (`8250dd7` 전에는 **판의 첫 이름**이면 확정 15단계에 `wisdom < 3`일 때 지혜 +1도.) 이름은 석판 해석기가 그 칸을 부르는 말이 된다. 소명 `namer`.

### 14.6 영원한 계명

새길 수 있는 때 `canCarve = unlocked(state, 4) && round >= 3 && 계명 < 2`(해금 4 — 다섯 번째 판부터, `engine.js:1090`; `8ba0ef8` 전에는 `veteran && !tutorial`). 시련 `earth`는 `noSword`를 새길 수 없다. 확인 화면에서 새김을 표시하면 확정 6단계에 `carveCommandment`. 새긴 장부터 판 끝까지:

| id | 이름 | 효과 |
|---|---|---|
| `noSword` | 칼을 들지 말라 | 플레이어 공격 불가; 선교 +1 (상한 2 안) |
| `noExpand` | 땅을 넓히지 말라 | 플레이어 마을 건설 불가; 신전 돌 비용 −1 |
| `sabbath` | 안식하라 | `round % 4 == 0`인 장: 행동 수 −2(최소 1), 기도 ×2 |
| `noFamine` | 굶기지 말라 | 유지 단계 식량 −1 추가; 대신 굶주림으로 신도를 잃지 않음 |

새긴 장의 계획 조정 (`main.js:729-735`): `banned = { noSword:'attack', noExpand:'village' }[id]`; `kept = banned ? accepted 중 (type != banned && build != banned) : accepted 전부`; `plan = kept + autoFill(player, kept, forbidden + 뺀 칩, doctrine)`. `sabbath`·`noFamine`은 금하는 행동이 없어 명령이 그대로 남는다(예전에는 건설 외 명령이 모두 빠졌다 — `afab303`에서 고침, §19-3). 이 다시 채우기는 확인 화면에서 뺀 칩(`pending.dropped`)도 금지로 넘겨, 뺀 칩이 기본 노동으로 되살아나지 않는다(`e68a240`, §19-20).

### 14.7 예언

봉인(확정 8단계, 이미 있으면 불가): `{ kind, rounds(1~3), sealed: round, due: round + rounds − 1, base: {율법파 마을 수, 율법파 capitalHp, 우리 pop, converted, captured} }`. 유지 단계 `checkProphecy`:

| kind | 이루어짐 |
|---|---|
| `fall` | `stats.captured > base.captured` |
| `capital` | 율법파 `capitalHp < base.hp` |
| `pop` | 우리 `pop >= base.pop + 2` |
| `convert` | `stats.converted > base.converted` |

이루면 `stats.prophecies += 1`, 기록 `log.prophecyDone`("예언이 이루어졌다 — “{name}”."), 그리고 **은총** `grantGrace(1, eng.why.prophecy)`(§14.2 — 장당 한 번의 은총을 다른 은총과 나눠 쓴다). 아니고 `round >= due`면 `log.prophecyFailed`("예언이 빗나갔다 — … 신도들이 수군거린다.")만 — **벌이 없다**. 어느 쪽이든 예언은 사라진다. `8250dd7` 전에는 이루면 신앙 +`{1:4, 2:3, 3:2}[rounds]`(`PROPHECY.reward`), 빗나가면 신앙 −2(`PROPHECY.penalty`, 최소 0)였다. 봉인 칸의 글 `ui.sealProphecy`는 "…{n}장 안에 이루어지면 은총(신앙 +1)", 규칙서 `ui.rules.words4`는 "…빗나가도 벌은 없다".

### 14.8 메아리 `isEcho`

`engine.js:767-781`. 튜토리얼 제외, 첫 판에도 있다. `9b43bbf`부터 **글**이 같을 때뿐 아니라 **일**(석판이 알아듣는 일의 종류)이 같을 때도 메아리다 — 말만 바꿔 같은 계획을 되풀이하는 길을 막는다(같은 계획의 두 문장을 번갈아 쓰는 스크립트의 승률 45% → 25%, 커밋 기록). `87a0fce`부터 일은 **두 장 전 계시**와도 견준다 — 두 계시를 번갈아 쓰는 것(A, B, A, B …)도 되풀이다(번갈아 쓰기 스크립트 27% → 18%, 커밋 기록). 글은 여전히 마지막 계시와만 견준다.

```text
plainWords(x) = String(x ?? '')에서 공백(\s)과 유니코드 문장부호(\p{P})를 모두 지운 것
planSig(text) = 해석기가 setPlanSig로 넣어 둔 함수 (없으면 '')      # interpreter.js:547-548
              = interpretWithTablet(state, text).orders의 종류 키를 중복 없이 정렬해 '|'로 이은 것
                종류 키: gather → 'gather:<자원>', build → 'build:<건물>', 그 밖 → type   (칸은 보지 않는다)
economyOnly(sig) = sig != '' and sig의 종류 키가 모두 'gather:…' 또는 'pray'   # e174a18 — 살림뿐인 계획
isEcho(text, sig = planSig(text)) =
    !tutorial and text and plainWords(text) != '' and not economyOnly(sig) and (   # 살림뿐이면 글이 같아도 메아리가 아니다 (e174a18)
        plainWords(text) == plainWords(last?.text)            # 글이 마지막 계시와 같다
        or (sig != '' and (sig == last?.sig                   # 일의 목록이 마지막 계시와 같다 (빈 목록끼리는 아니다)
                           or sig == prev?.sig)) )            # 또는 두 장 전 계시와 같다 (87a0fce)
    where last = revelations.at(-1), prev = revelations.at(-2)
spokenOf(text) = { sig: planSig(text), echo: isEcho(text, 그 sig) }      # 말할 때 한 번 (§3.3)
```

- 비교 대상은 **기록된 계시**다 — 글은 마지막 하나, 일은 마지막 둘(바로 지난 장이 아니어도 된다 — 침묵한 장은 계시를 남기지 않는다. 메아리로 기록된 계시도 센다). 띄어쓰기·마침표·쉼표·따옴표만 다른 글은 같은 글이다. 기호(`~` 같은 `\p{S}`)와 이모지는 지우지 않는다.
- **일의 목록 `sig`**: LLM 모드에서도 늘 **석판**으로 읽는다(결정론). 종류만 보므로 칸·개수·금지는 상관없다 — "율법파의 마을을 쳐라"와 "율법파에게 재앙을! 그들의 수도를 쳐라"는 둘 다 `attack`, "이웃에게 나의 말씀을 전하라"와 "싸우지 마라, 이웃을 사랑하라"는 둘 다 `preach`(금지는 목록에 없다)라 메아리다. 석판이 아무 일도 못 읽으면(`sig = ''`) 글 비교만 한다. 예: `기도하라` → `pray`, `기도하고 곡식을 거두라` → `gather:food|pray`.
- **말할 때 판정한다**: 화면은 인장을 누를 때(비용 지불·이름 붙이기 전) `spokenOf`를 `speakSnap.spoken`에 보관하고, 확정 14단계에서 그대로 `recordRevelation`에 넘긴다(§3.6). 해결이 끝나면 합법 행동이 바뀌어 같은 글도 다른 목록으로 읽힐 수 있기 때문이다. 비용의 `isEcho`(§14.1)도 같은 상태에서 계산하므로 둘은 어긋나지 않는다. 골든 구동기(`tools/golden.mjs`)와 테스트 구동기(`tools/tests/lib.mjs`)도 `pending.spoken`으로 같은 일을 한다.
- 기록: `revelations`의 새 항목에 `sig`를 붙인다(비었으면 없음). 옛 저장본의 계시에는 `sig`가 없어 다음 한 번은 글로만 비교된다.
- 효과: 계시 비용 +1(§14.1, 확인 화면의 비용 알약에 "되풀이"로 보이고 툴팁 `ui.echo.tip`은 "지난 계시와 같은 말, 또는 지난 두 계시와 같은 일들 — …"(`87a0fce`)), 그리고 `recordRevelation`이 `{…, echo: true, sig}`만 기록하고 `log.echo`를 남긴 뒤 끝난다 — 교리 +1·비유 가속·교리 대립·연속(§5.1, §5.4)이 모두 없다. 해석·명령·말투·청원·이름·예언은 보통 계시와 같다.
- 기록에는 해석의 `doctrine`이 그대로 남으므로 다음 장 율법파는 그 교리에 반응한다(§4.3).
- **율법파의 대비** (`df1cb16`, `55d33dd`): 되풀이는 율법파도 읽는다 — 메아리로 기록된 계시(`echo: true`)가 있으면 다음 장 시작(`braceLaw`)에 그 장 우리 선교·공격에 율법파 방어 +1(이어지면 +2, §4.9). `88878b6`부터 같은 교리를 세 장 이어 말해도 똑같이 읽힌다(`readUs`, §5.4). `55d33dd`부터 판정이 메아리와 **같다**(전에는 확정 때 받아들인 명령의 종류로 따로 판정해 비용의 "되풀이"와 어긋날 수 있었다 — §19-45). 규칙서·화면 규칙서는 둘을 하나의 규칙으로 설명한다(`ui.rules.core3` "지난 두 계시와 같은 일을 시키면 — 말만 바꿔도 — 신앙 +1·교리 없음, 그리고 율법파가 그 말씀을 읽고 대비한다…", `ui.rules.enemy3`, 튜토리얼 `tut.speak4.2`).
- **살림은 되풀이가 아니다**(`e174a18`): 이번 계시의 일 목록이 채집(`gather:*`)과 기도(`pray`)뿐이면(`economyOnly`) 글이 마지막 계시와 똑같아도 메아리가 아니다 — 비용 +1·교리 없음·율법파의 대비가 모두 없다. 빈 목록(석판이 아무 일도 못 읽음)은 살림이 아니라 글 비교는 그대로다. 평가 11차에서 먹고 기도하는 장을 거듭한 플레이어가 "되풀이"로 벌을 받았다(커밋 기록).
- 예: 5×5 보통 시드 2026, 1장 "기도하라"(비용 1, 지혜 0 → 1, `sig = 'pray'`) 뒤 2장 "기도 하라."(같은 글)·"기도하고 경배하라"·"신전에서 기도하라"(같은 일)·"기도하고 곡식을 거두라"는 `e174a18`부터 모두 비용 1이고 지혜가 오른다(살림뿐 — 그 전에는 앞의 셋이 메아리·비용 2). 같은 판 1장 "마을을 세워라"(`sig = 'build:village'`) 뒤 "마을을 넓혀라"·"땅을 넓혀 마을 두 곳을 세워라"는 메아리·비용 2, "마을을 세우고 곡식을 거두라"(`build:village|gather:food`)는 비용 1.
- 두 장 전 예 (같은 판, `87a0fce`): "마을을 세워라"(`build:village`) → "성벽을 쌓아라" 뒤 "마을을 넓혀라"는 글이 마지막 계시와 다르지만 일이 두 장 전과 같아 메아리·비용 2(`e174a18` 전의 예 "기도하라" → "곡식을 거두라" → "기도하라"는 이제 살림뿐이라 메아리가 아니다). "기도하고 곡식을 거두라"(`gather:food|pray`)는 어느 쪽과도 달라 비용 1.
- 예전의 **성언**(`liturgy`: 세 계시에 나온 구절은 길어도 비용 1)은 되풀이를 부추겨 `afab303`에서 없앴다. `findLiturgy`·`updateLiturgy`는 코드에서 지워졌고, 기본값으로만 남아 있던 `state.liturgy`와 언어팩 키(`log.liturgy`·`kw.liturgyStrip`·`ui.tag.liturgy`)도 `e68a240`에서 지웠다.

### 14.9 침묵

`applySilence(spoke)` (확정 10단계): 계시하면 `silentRun = 0`. 침묵이면 `silentRun += 1`, `n = silentRun`:

| n | 첫 판·튜토리얼 | veteran (해금 단계와 무관 — `engine.js:1065`은 `8ba0ef8` 뒤에도 `config.veteran`을 본다) |
|---|---|---|
| 1 | 없음 | 없음 |
| 2 | 기록만 | 신앙 −1 (최소 0) |
| ≥3 | 기록만 | `pop > 1`이면 우리 −1, 율법파 +1 |

침묵한 장: 계시 비용 없음, 자동 기도 우선(§3.5), 말투 없음, 연속 끊김, 교리 없음(`846fd60` 전에는 청원 외면으로도 셌다 — 외면 벌은 없어졌다).

### 14.10 그 밖

| 장치 | 엔진 효과 |
|---|---|
| 숨은 말 (오늘의 계시) | 계시에 그 말이 있으면 `stats.sacred = 1` (판당 1회). 수치 효과 없음 |
| 검열 (L10) | 다음 장 봉인된 말을 쓰면 계시 비용 +1 (예전에는 인용 꼬리표에서도 뺐다 — 인용은 `0c95856`부터 비용 효과가 없었고 `16492f4`에서 없어졌다) |
| 신학 노트 | 해석기 동작만 바꾼다 |
| 대사제 성향 | LLM 프롬프트 한 줄, 그리고 `0a0a974`부터 헤아린 노동(§3.5) |
| 전설 | 없음 |

---

## 15. 승패 판정

### 15.1 `winKind` 전체

| `winKind` | `winner` | 조건 | 판정 위치 |
|---|---|---|---|
| `doom` | player | 심판의 날(판에 한 번)로 율법파 `capitalHp <= 0` | 기적 카드 (말하기 단계; 심판의 날은 말로 부를 수 없다) |
| `capital` | 공격측 | 공격 승리로 상대 `capitalHp <= 0` (율법파는 대성당 원정으로 거리 무관 — §3.8, §10; 우리 쪽 포위 +1/+2는 `846fd60`에서 없어졌다) | 공격 단계 즉시 |
| `capital` | 신도가 모두 쓰러진 쪽의 **상대** | 남은 자가 수도를 흔들어 `capitalHp <= 0` (튜토리얼 제외) | `checkVictory` 처음 (§15.2) |
| `cathedral` | player | 대성당을 지은 다음 장(`crusadeEnd`) 끝에 우리 `capitalHp > 0` — 율법파의 원정(선공, 수도 공격 세 번 +1)을 버팀 (§10, `3f33be1`; 그 전에는 공사 3단계 완공, 건설 단계 즉시) | `checkVictory(final)` — 신앙 다음, 승점 앞 |
| `bothExtinct` | `'draw'` | 양쪽 `pop <= 0` — **튜토리얼에서만** (남은 자) | `checkVictory` |
| `convertAll` | player | 율법파 `pop <= 0` — **튜토리얼에서만** | `checkVictory` |
| `edict` | enemy | `edictOn && edict >= edictMax` (연대기 결말 종류도 `edict` — [07](07-progression.md)) | `checkVictory` |
| `extinct` | enemy | 우리 `pop <= 0` — **튜토리얼에서만** | `checkVictory` |
| `faith` | player | 신앙 승리 — 인구의 3/4 + 선교로 데려온 이 `faithConverts`명 이상 (§15.2) | `checkVictory(final)` — **장 끝에만** |
| `score` | 승점 높은 쪽 (**동점은 플레이어**) | 마지막 장 | `checkVictory(final)` |
| `tutorial` | 〃 | 튜토리얼 마지막 장 | `checkVictory(final)` |

### 15.2 `checkVictory(final = true)`

`engine.js:1443-1471`. 이미 승자가 있으면 그대로.

```text
if winner: return winner
remnant()                              # 남은 자 (아래), 튜토리얼 제외
if winner: return winner
if p.pop <= 0 and e.pop <= 0:  draw / bothExtinct; return
if e.pop <= 0:                         player / convertAll
if no winner and edictOn and e.edict >= edictMax:  enemy / edict
if p.pop <= 0:                         enemy / extinct            # 가드 없음 → edict를 덮어쓴다
total = p.pop + e.pop;  fr = sizeRules.faith                     # 판 크기 표 (§1.1, 7a28084)
if no winner and final and total >= fr.pop and round >= fr.round and p.pop >= total × 0.75
             and stats.converted >= faithConverts:               # = fr.converts — 4×4 6·4·1, 그 밖 8·6·2
                                       player / faith
if no winner and final and crusadeEnd and round >= crusadeEnd and p.capitalHp > 0:   # 3f33be1 (§10)
                                       player / cathedral;  log.cathedralDone (fx.kind 'cathedral', 우리 수도 칸)
if no winner and final and round >= maxRounds:
    ps, es = score(player), score(enemy);  winner = ps >= es ? player : enemy
    winKind = tutorial ? 'tutorial' : 'score'
```

**신앙 승리** (`9b43bbf`): 장이 끝날 때(`final`, 유지 단계 끝)만 보고, 인구 조건에 더해 **선교 성공으로 데려온 신도**(`stats.converted`, 선교 판정 승리마다 +1 — 평화 궁극·이탈의 이동(`88878b6` 전에는 평화 연속 기적도)은 세지 않는다)가 `faithConverts`(4×4 1, 그 밖 2 — 판 크기 표)명 이상이어야 한다. 전에는 기적·연속 기적 뒤(`final = false`)에도 보았고 개종 조건이 없어, 신앙 승리의 63%가 개종 하나 없이(칼·번개로 율법파를 줄여) 났다. 바꾼 뒤 smart 봇 판의 결말은 승점 74%·점령 14%·신앙 6%·율법 석판 6%다(전에는 신앙 35%, 커밋 기록).

**남은 자** `remnant` (`engine.js:1431-1441`, `448f553`): 수도가 서 있는 한 부족은 사라지지 않는다.

```text
remnant():
  if tutorial: return
  for side in [player, enemy]:                         # 이 순서
      s = sides[side];  cap = 그 진영 수도
      if s.pop > 0 or not cap or s.capitalHp <= 0 or winner: continue
      s.capitalHp -= 1                                  # (d7ad6e0 전: 플레이어면 cathedral >= 1일 때 cathedral -= 1도)
      log.remnant({who: side, hp: s.capitalHp})        # fx.kind 'loss', tile = 수도
      if s.capitalHp > 0: s.pop = 1                     # 한 명이 수도로 돌아온다 (인구 한도·식량 무관)
      else: winner = other(side); winKind = 'capital'; winReason = t('eng.win.capital', {who: winner})
```

- 그래서 튜토리얼이 아니면 `bothExtinct`·`convertAll`·`extinct`는 나오지 않는다(코드는 남아 있다 — 튜토리얼용). 전멸·전원 개종은 따로 이기는 길이 아니라 점령으로 가는 길이 된다: 커밋 기록에 따르면 smart 봇 판에서 갑작스러운 전멸 14%·전원 개종 8%가 사라지고 수도 점령 승리가 0% → 10%가 되었으며 승률은 그대로였다.
- 양쪽이 같은 판정에서 0이면 플레이어 먼저 흔들린다. 플레이어 수도가 무너지면 율법파가 이기고 율법파 쪽은 보지 않는다.
- 수도를 흔든 뒤 `pop = 1`이므로 같은 `checkVictory`의 신앙 승리(`p.pop >= 0.75 × total`, 인구 합 문턱)는 돌아온 한 명을 센다 — 신앙 승리는 장 끝(`final`) 호출에서만 보므로 유지 단계 끝의 경우다.

부르는 곳: 유지 단계 끝(`final=true`), `castMiracle`(`final=false`) — `88878b6` 전에는 `streakMiracle`(`final=false`)도. 그래서 말하기 단계의 기적(번개 등)이나 (예전에는) 확정 뒤 연속 기적(평화)으로 마지막 신도가 쓰러져도 **그 자리에서** 남은 자가 돈다(튜토리얼에서는 `convertAll`·`extinct`). 신앙 승리와 마지막 장 승점은 `final`일 때만 본다. 공격·선교·굶주림으로 인구가 0이 되어도 판정은 그 장 유지 단계에서 한다.

### 15.3 승리 뒤 처리

- `resolveRound` 중 승자가 나면 남은 행동·갈림길 결과·유지를 건너뛴다. `recordHistory`는 부른다(분노·결집 제외). (`55d33dd` 전에는 `updateLawGuard`도 값만 바꿨다 — 이제 대비는 다음 `startRound`의 몫이고, 승자가 나면 다음 장이 없다.)
- 확정 10~13단계는 승자가 있으면 건너뛴다. 14단계 `recordRevelation`은 계시를 기록하고 교리 +1까지만 한다(대립·연속 없음; 메아리면 교리도 없음 — 메아리의 연속 셈은 승자 검사 전이라 한다).

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
| 없음 | 지도자, 발견지·영구 지형·성지, 율법 석판, 소명, 반응·두 장 비교, 신의 분노·심판의 날, veteran·해금 모듈 전부(`unlocked()`가 튜토리얼이면 늘 거짓), 막 규칙, 율법파의 반격 전부(원정·칼·대체 마을·결집·퇴각·되풀이를 읽는 율법 — 튜토리얼의 율법파는 공격에 지면 신도를 잃는다), 메아리, 남은 자(튜토리얼은 전멸·전원 개종으로 끝날 수 있다) |
| 율법파의 뜻 | 모두 공개 |
| 선공 | **늘 우리** (`2825b37` — 그 전에는 홀짝이라 4장에 율법파가 먼저 제 마을을 써서 선교 수업 "이웃에게 나의 말씀을 전하라"가 늘 막혔다; §3.1) |
| 청원 외면 벌 | 없음 — `2825b37`부터 튜토리얼은 세지 않았고, `846fd60`부터는 어느 판에도 없다 (§14.3) |
| 판 크기 규칙 | `sizeRules`는 5×5 값(3×3 줄이 없다)이지만 대성당 비용·마을 더하기·율법파 행동은 `tutorial`이면 적용하지 않는다(×1, 0, 0). `quick`도 아니오 |
| 끝 | 5장 유지 단계에서 승점 비교 → `winKind 'tutorial'` |

### 16.2 모듈 해금 (`config.unlock`)과 두 번째 판부터 (`config.veteran`)

`8ba0ef8`부터 모듈은 **판을 끝낼 때마다 한 묶음씩** 열린다(그 전에는 두 번째 판에 아래 표의 모듈이 한꺼번에 켜졌다 — 평가자 A: "두 번째 판에 모듈이 일곱 개쯤 한꺼번에 켜진다", planner의 5×5 어려움 승률이 그 단계에서 52% → 28%).

```text
MODULES = 4                                                             # engine.js:68
unlockedCfg(cfg, level) = (cfg.unlock ?? (cfg.veteran ? MODULES : 0)) >= level   # engine.js:69 (내보내지 않음)
unlocked(state, level)  = !state.tutorial && unlockedCfg(state.config, level)    # engine.js:70 (main.js도 쓴다)
```

- `config.unlock` = 끝낸 판 수(0~4). 일반 판만 `main.js:282`이 `unlock: min(MODULES, 서고의 판 수)`를 넘긴다. 서고(`meta.getHistory()`, `finishGame`이 `pushHistory`)는 오늘의 계시·시련·도전 판도 담으므로 그런 판을 끝내도 단계가 오른다(튜토리얼은 `finishGame`을 거치지 않아 세지 않는다).
- `unlock`이 **없는** 설정은 예전처럼 `veteran`이면 전부(4), 아니면 0: 오늘의 계시(`veteran: true`)·시련(`veteran: true`)·도전 링크(`v != 0`이면 전부)·골든 구동기(`veteran` 설정). 그래서 골든 파일은 이 커밋에서 바뀌지 않았다.
- 종료 화면 「같은 맵 다시」(`restart`)는 `state.config`를 그대로 넘겨 **같은 단계**로 다시 둔다. 「새 맵」(`main.js:848`)은 `0c95856`부터 일반 새 게임처럼 `unlock: min(MODULES, 서고 길이)`를 넘긴다(그 전에는 `veteran: true`만 넘겨 모든 모듈이 켜졌다 — §19 38번).
- 새 판을 시작할 때 화면이 이번에 열린 묶음과 다음에 열릴 묶음을 알린다(`showUnlockNote`, [06](06-ui-ux.md)).

| 해금 단계 (끝낸 판) | 몇 번째 판부터 | 열리는 것 | 코드 |
|---|---|---|---|
| 1 | 두 번째 | 율법 석판 `edictOn`(석판 승리, 성지·율법파 신전·번개·심판의 날·미라의 석판 효과; 율법파 신앙→석판과 피의 율법은 `c12a1e9`에서 없어졌다, §9) | `createState` `edictOn` |
| 2 | 세 번째 | 심판의 기준(해시로 하나), 소명(셋 중 하나, 도전 링크 제외) | `unlockedCfg(cfg, 2)` |
| 3 | 네 번째 | 대사제 성향(해시로 하나 — `0a0a974`부터 헤아린 노동의 손 수·먼저 고르는 일도, §3.5), 기적 손패(해시로 셋) + 드래프트, 갈림길 셋, 세 막 규칙(2막 성전 카드, 3막 평온 없음, 막 머리말) | `unlockedCfg(cfg, 3)`, `unlocked(state, 3)` |
| 4 | 다섯 번째 | 교리 대립, 영원한 계명(3장부터), 검열 카드 L10(보통·어려움), 미라 | `unlocked(state, 4)` |

해금되지 않은 판의 값: 석판 없음, 심판 `classic`, 소명 없음, 대사제 `loyal`, 손패 번개·단비·풍요, 드래프트·갈림길·막 규칙·교리 대립·계명·검열·미라 없음.

`veteran`(서고에 끝낸 판이 하나라도 있으면 `true`, `main.js:271`; 오늘의 계시·시련은 늘 `true`, 도전 링크는 `v=0`이 아니면 `true`)은 이제 모듈이 아닌 것만 가른다:

| 기능 | 첫 판 | veteran |
|---|---|---|
| 침묵 벌 (2번째 −1 신앙, 3번째부터 이탈) | 기록만 | 있음 (`engine.js:1065`) |
| 말 거두기 비용 | 무료 | 신앙 1 (`main.js:696`) |
| 정경·전생의 유적 (`main.js:282`) | 없음 | 일반 판에서 전달 |
| 최고 기록(`meta.setBest`) | 남기지 않음 | 일반 판에서 남김 (`main.js:794`) |

(예전 표의 「성언」 줄은 성언이 없어져 뺐다.)

해금 단계·veteran과 **무관하게** 있는 것: 지도자, 반응(쉬움 제외), 성지 승점 +2, 발견지·영구 지형, 신의 분노·심판의 날, 성인, 청원·은총·서원, 말투, 이름, 예언, 뜻을 헤아린 기본 노동(성향은 해금 3 전이면 `loyal` — 한 손), 메아리(글·일), 대성당 원정의 율법파 선공(`0c95856`), 율법파의 반격(원정·칼·대체 마을·결집·퇴각·되풀이를 읽는 율법·7×7 행동 +1, §4.9), 대성당의 마을 조건(큰 판 더하기 포함)·원정·무너짐, 포위, 심판의 날 판에 한 번, 신앙 승리의 개종 조건.

### 16.3 난이도

§4.6 표.

### 16.4 승천 (어려움만, 누적)

`config.ascension` 0~5. 어려움에서 이기면 다음 단계가 열린다(`meta.openAscension`, [07](07-progression.md)). 어려움이 아니면 0.

| 단계 | 문구 (`data.ascension`) | 코드 효과 |
|---|---|---|
| 1 | 율법파 시작 신도 +1, 식량 +4 | 율법파 `pop +1`, `food +4` (`engine.js:156`) |
| 2 | 율법 석판 한계 −2 | `edictMax = 10` |
| 3 | 신의 분노가 차는 격차 6 → 8 | 분노 증가 조건 `gap >= 8` |
| 4 | 3막에 율법파 공격·선교 주사위 +1 | `enemyZeal` (`engine.js:268`): 3막에 율법파 공격 `atk +1`, 선교 `preachBonus +1`. 예전의 "3막 행동 +1"은 평가에서 효과가 측정되지 않아(0/1,250판, `docs/EVALUATION-2026-09-30.md`) `afab303`에서 바꿨다 |
| 5 | 은사 없이 시작 | `config.blessing = null` (`main.js:282`; 종료 화면 「새 맵」 단추도 같다, `main.js:841`) |

### 16.5 시련 `TRIALS`

모두 `veteran: true`이고 `unlock`이 없어 **모든 모듈이 켜진다**(§16.2), 소명 있음, 은사·정경·유적 없음.

| id | 이름 | 크기·난이도·시드 | 장 | 규칙 |
|---|---|---|---|---|
| `storm` | 폭풍의 주 | 5×5 · 보통 · 11101 | 12 | 손패 번개·풍요·불기둥 고정; 번개 비용 −1 추가; 드래프트에 단비 없음 |
| `earth` | 대지모 | 6×6 · 보통 · 22202 | 12 | 풍요 1로 시작; 플레이어 공격 불가; 성장 비용 1; 소명 `sword` 없음; 계명 `noSword` 불가 |
| `sword` | 칼의 해 | 5×5 · 보통 · 33303 | 12 | 지도자 `iron` 고정; 율법 풀에 L5 두 장 더 (기본 1 + iron 1 + 2 = 4장) |
| `cloister` | 침묵의 수도원 | 5×5 · 보통 · 44404 | 12 | 계시 20자까지 (`main.js:1842`) |
| `last` | 마지막 예언자 | 5×5 · 어려움 · 55505 | **8** | 율법파 `pop +2`, `food +8`; 신의 분노 1장부터 (`wrathRound = 1`). 5×5 표 값이라 궁극 8장(= 마지막 장), 드래프트 5장 |

별(`main.js:965`): 지면 0; 이기고 승점 차 ≥ 20이거나 `maxRounds` 전에 끝냈으면 3; 차 ≥ 10이면 2; 아니면 1.

### 16.6 오늘의 계시 (daily)

`meta.dailyConfig` (`meta.js`): `{ size:5, difficulty:'normal', seed: 1 + (FNV('gsg:' + 'YYYY-MM-DD') % 999998), daily: 날짜 }`, `veteran: true`(`unlock` 없음 → 모든 모듈, §16.2). 정경·유적·은사 없음(정경 교리 +1은 `daily`면 엔진도 막는다). 숨은 말 `sacred`가 있다.

### 16.7 도전 링크 (challenge)

URL `?seed=&size=&diff=&target=&v=` (`main.js:62`): 시드 `min(999999, floor(seed))`, 크기(없으면 5), 난이도(없으면 normal), `veteran = v != '0'`(`unlock` 없음 → `v=1`이면 모든 모듈, `v=0`이면 첫 판처럼 없음, §16.2), `canon: null`, `challenge: { target }`. 소명 없음, 은사·유적·승천 없음. 결과 문구: 이기고 승점 > `target`이면 성공(규칙에는 영향 없음).

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

### 16.9 판 크기별 보정 (4×4 · 6×6 · 7×7)

모두 판 크기 표(§1.1, `MAP_SIZES`·`sizeRules`, `7a28084`)에 있다.

- **4×4 (빠른 판)**: 8장, 궁극 6장, 드래프트 3장, 분노 3장부터, 대성당 비용 ×0.7 올림(5·5·5, 마을 조건은 5×5와 같은 둘), 신앙 승리 `total >= 6 && round >= 4`이고 개종 1명(그 밖은 2명). 사막·오아시스·발견지 없음(채석장은 있을 수 있다), 성지는 B1 또는 C4(`3f33be1` 전에는 늘 C4). 예전에는 `quick(state)`로 갈랐고 값은 같다.
- **6×6**: 12장, 대성당 비용 ×1.5 올림(9·9·9)과 마을 +1(셋) — `3f33be1`(그 전 비용 ×1, 단계마다 마을 2).
- **7×7**: 14장, 대성당 비용 ×2 올림(12·12·12)과 마을 +3(다섯) — `3f33be1`(그 전 ×1.5·단계마다 마을 3, `7a28084` 전 ×1), 율법파 행동 +1(§4.9).

---

## 17. 표시용 계산 (확인 화면)

해결과 같은 식이어야 하는 표시 도우미. 상태를 바꾸지 않는다.

- `actionOdds(action, {wallAhead})`(`8250dd7` 전에는 `{curse, wallAhead}`) (`engine.js:282-297`): 선교·공격 승률 = `#{(x, y) ∈ 1..6² : x + atk > y + def} / 36`. 신도 수 우위는 `435c3cc`에서 해결과 함께 여기서도 뺐다. (`8250dd7` 전에는 공격 `atk`가 저주를 `roundMods.attackBonus ?? (curse ? 1 : 0)`로 미리 반영했다 — 말투가 수치를 잃어 없어졌다.) 승천 4(`enemyZeal`), 되풀이를 읽는 율법(`lawGuardOf`, 선교·공격 모두)은 해결과 같게 들어 있다(`846fd60` 전에는 포위 `siegeOf`도, `55d33dd` 전에는 원정 +1도). **`wallAhead`**(`16492f4`): 참이면 그 칸에 성벽이 있는 것으로 센다(공격 방어 +2, 선교 방어 +1 — `tile.wall || wallAhead`). 확인 칩의 승률(`oddsTag`, `main.js:1890-1896`)은 **보이는** 율법파의 뜻 가운데 그 칸의 성벽 건설이 있으면 참으로 넘긴다 — 건설이 공격·선교보다 먼저 풀리므로(§3.7) 예고된 성벽은 판정 때 서 있다(평가 6차: 전에는 42%로 보였지만 실제로는 약 17%). 석판의 공격·선교 후보 순위(`rankMatches`)도 같게 넘긴다 — `d7ad6e0`부터는 절에 "약한"·"성벽 없는" 같은 말(`kw.place.weakest`)이 있을 때만 승률 순이고, 없으면 우리 땅에서 가까운 순이다([05](05-interpreter.md)). 뜻을 헤아린 기본 노동의 문턱(§3.5, `engine.js:494`)도 `55d33dd`부터 같게 넘긴다(보이는 성벽 예고의 칸 목록, `engine.js:487`) — 그 전에는 `wallAhead` 없이 불렀다(§19-46). **표시용 식에는 계절 「율법파 집결」(+1)이 빠져 있다**(플레이어 공격에는 무관, 율법파 공격 표시에만 차이; `846fd60` 전에는 수호자 성인 +1도 빠져 있었다 — 규칙에서 없어졌다). 뜻을 헤아린 기본 노동의 선교·공격 문턱(§3.5)도 이 값을 쓴다.
- `previewGains(plan)` (`engine.js:1056`): 채집·기도 수입, 건설 비용, 장 끝 식량 `2 + 마을 − pop − (noFamine ? 1 : 0)`, 신앙 수입. 주사위·성장·역병은 빠진다. 화면은 여기에 말한 기적 비용과 즉시 수입, 갈림길 gain을 더해 보여 준다(`main.js:2057-2069`; `8250dd7` 전에는 축복 +1 첫 채집·저주 신앙 −1도).

---

## 18. 검증 예시

`node`로 `engine.js`를 직접 불러 얻은 값(커밋 `8b91681`에서 얻고 `448f553`에서 A·B를 다시 확인해 같았다). 골든 테스트 전체는 [이식 가이드](../godot/PORTING.md).

**A. `{ mode:'standard', size:5, difficulty:'normal', seed:2026 }` (첫 판)**

`generateMap` 결과:

```text
     1       2        3        4        5
A  desert  river    mountain E        plain
B  plain   hill     river    plain    forest
C  forest  mountain forest   mountain forest
D  forest  plain    river    hill     plain
E  plain   P        mountain river    desert
```

- 발견지 B1·D5 `nomads`; 영구 지형 A1·E5 `oasis`, C2·C4 `quarry`; 성지 D4(`holyFor` — 대칭 칸 B2도 언덕); 지도자 `iron`. (`3f33be1` 전: 맵의 언덕은 가운데 C3 하나, B2·D4 평원, 발견지 B2·D4, 성지 C3. 덱·`rng`·1장 계획은 그대로다.)
- `createState` 직후 `rng = { deck: 1156837553, dice: 2026 }`.
- 계절 덱 (밑 → 위): `threat, harvest, drought, calm, prophet, plague, threat, calm, prophet, plague, drought, harvest, threat, harvest, calm, prophet, drought, plague` → 1장 역병.
- 율법 덱 (밑 → 위, 30장): `L9, L5, L3, L1, L4, L2, L6, L8, L5, L7, L4, L5, L2, L9, L8, L1, L7, L6, L5, L3, L9, L1, L5, L7, L5, L2, L3, L6, L8, L4` → 1장 L4.
- 처음 드러난 칸: C1 C2 C3 D1 D2 D3 E1 E2 E3 E4.
- 1장: 선 플레이어, 청원 = 기도(역병), 행동 수 플레이어 3 · 율법파 4. 율법파 계획 `gather:A3:stone, pray:A4:, gather:C4:stone, gather:B5:wood`. 명령 없는 플레이어 기본 노동 `gather:D2:food, gather:C2:stone`(식량 4·목재 2·돌 0·인구 3 — 식량이 다음 장에 모자라 하나, 돌이 0이라 하나, 셋째 손은 쉰다; `8250dd7` 전에는 `gather:C2:stone, gather:C1:wood, gather:D2:food`).

**B. 같은 설정 + `veteran: true`** (`unlock`이 없으므로 해금 4 — 모든 모듈, §16.2)

- 지도자 `iron`, 사제 `literal`, 심판 `classic`, 손패 `[lightning, revive, tongues]`, 소명 후보 `[temple, ultimate, villages]`(기본 `temple`), `edictOn = true`, `rng.deck = -106833787`.
- 계절 덱 (밑 → 위): `harvest, calm, prophet, threat, drought, refugees, merchant, plague, healer, threat, plague, refugees, merchant, harvest, calm, healer, drought, prophet`.
- 반응이 없는 진행에서 1~5장 계절 `prophet, drought, healer, calm, harvest`, 율법 `L9, L7, L3, L2, L6`; 5장 드래프트 후보 `[bounty, ark, rain]`, 그 뒤 `rng.deck = 1092896356`.

**C. A와 같은 설정, 석판 해석으로 두 장 (`tools/tests/lib.mjs`의 `doSpeak`/`doAccept`, 커밋 `448f553`)**

- 1장 "기도하라": 비용 1, 교리 `wisdom`, 명령 `pray:E2:`, 기본 노동 `explore:B1:`(뜻을 헤아림, `heeded`) · `gather:D2:food`(`8250dd7`; 그 전 `gather:C2:stone`). 확정 뒤 지혜 0 → 1, `revelations[0] = { round:1, text:'기도하라', doctrine:'wisdom', sig:'pray' }`, `lawGuard = 0`(`55d33dd` 전 `{preach:0, attack:0}`), `rally = false`. (`8250dd7`에서 다시 돌려 확인.)
- 2장 "기도 하라.": `e174a18`부터 `isEcho = false`(일 목록 `pray`가 살림뿐), 비용 1, 확정 뒤 지혜 1 → 2, `revelations[1] = { round:2, text:'기도 하라.', doctrine:'wisdom', sig:'pray' }`. (`9b43bbf`~`d7ad6e0`에는 `isEcho = true`·비용 2, 글이 다른 "기도하고 경배하라"도 일의 목록이 같아 메아리·비용 2, "기도하고 곡식을 거두라"는 1이었고, 확정 뒤 지혜는 1 그대로·기록에 `echo:true`.) 확정 뒤 지혜 1 그대로, `revelations[1] = { round:2, text:'기도 하라.', doctrine:'wisdom', echo:true, sig:'pray' }`. (`9b43bbf`·`78c891e` 코드로 다시 확인.)
- `marchRange(enemy)`: 1~3장 0, 4~7장 1, 8~12장 2.

---

## 19. 확인 필요

코드 그대로 옮기되, 의도인지 확인이 필요한 곳. 이식은 **현재 동작**을 재현해야 골든 테스트가 맞는다. 번호는 처음 쓴 때(`8b91681`)와 같게 두고, 그 뒤 고친 항목은 ~~줄을 긋고~~ 고친 커밋을 적었다.

1. ~~**수도 칸 막기**: 선 진영이 자기 수도에서 기도·신전·성벽·대성당을 하면 같은 장 상대의 그 수도 공격·선교가 막혔다.~~ — **고침** `5b7a94f`: 집 안 행동(기도, 신전·대성당·성벽 건설)은 칸을 차지하지 않는다. ~~남은 비대칭: 선 진영이 상대 수도를 공격·선교하면 같은 장 상대의 그 수도 기도·신전·성벽(·대성당)은 여전히 막혔다.~~ — **고침** `e68a240`: 후 진영의 집 안 행동도 막지 않는다. 이제 막기는 선후 양쪽에 대칭이다(§3.7, `engine.js:883-887`).
2. ~~**검증의 교리 교체와 예산**: 같은 칸에서 교리 우선 행동으로 바꿔도 예산을 다시 계산하지 않아 마을 둘이 함께 받아들여졌다.~~ — **고침** `afab303`: 교체 때 밀려난 행동의 비용을 돌려받고 새 행동의 비용을 다시 본다(§3.4, `engine.js:428-442`). 남은 점: 새 행동의 비용 검사가 교체 **전** 예산으로 먼저 한 번 걸러지므로, 밀려날 건설 비용을 돌려받아야만 치를 수 있는 건설은 교체되지 못하고 '자원 부족'으로 거절된다.
3. ~~**안식일·굶기지 말라를 새긴 장**: `banned`가 `undefined`라 건설 외 명령이 전부 빠졌다.~~ — **고침** `afab303` (`main.js:725`, §14.6).
4. ~~**난민 행렬에 무료 선택이 없음**: 대체가 원래 선택을 그대로 써서 식량·신앙이 음수가 될 수 있었다.~~ — **고침** `afab303`: 무료 선택 → 치를 수 있는 첫 선택 → 원래 선택(가진 만큼만, 0 하한) 순(§7.2, `engine.js:1083-1090`). 이제 갈림길로 자원이 음수가 되지 않는다. 남은 점: 치를 수 있는 선택은 `choice` 순서로 고르므로 플레이어가 고른 것과 다른 쪽이 된다(난민 `take`가 안 되면 `send`).
5. ~~**신도 수 우위** (`data.js:66` 주석 "선교·공격"): 코드는 공격에만 적용한다.~~ — **없어짐** `435c3cc`: 규칙(공격·방어의 +1)과 `RULES.superiority`를 함께 지웠다(§1.7). 화면 규칙서 `ui.rules.faith1`에서도 뺐다.
6. ~~**가뭄 문구** "평원·강 식량 채집 −2"(`24927a6` — 그 전 −1): 코드는 모든 식량 채집(오아시스 포함)에 적용한다.~~ — **고침** `76c0053`: 문구가 "식량 채집 -2"(A6). 풍년은 `24927a6`부터 문구("평원·강 식량 채집 +2")와 코드가 같다.
7. ~~**성지 위치**: 4×4·7×7에서 성지가 `mapgen`의 가운데 언덕(`mid`)과 다르다. 7×7에서 성지가 발견지와 겹치거나, 성지 칸의 영구 지형만 지워져 대칭 칸에 짝 없는 오아시스·채석장이 남을 수 있다. `placeSites`/`placeLegacy`는 `mid`만 피하고 실제 성지는 피하지 않는다.~~ — **고침** `3f33be1`: 맵 생성·발견지·유적·`createState`가 모두 `holyFor`의 같은 칸을 쓴다(§2.4). 남은 틈이던 4×4(두 후보 B1·C4가 서로 대칭 칸이라 맵 생성 7단계가 대칭 칸을 바꾸면 성지 칸도 바뀌어, 시드 0~2999 중 26판에서 맵의 성지가 언덕이 아니고 19판에서 짝 없는 채석장이 남았다)는 **고침** `637c05a`: `isHoly`가 성지와 대칭 칸을 자원 보장·다시 상한에서 빼고, `placeFeatures`가 두 칸을 피한다 — 같은 시드 범위에서 네 크기 모두 0판(이 문서를 고치며 다시 셈). 골든의 첫 맵은 바뀌지 않았다.
8. **3막 보충 덱의 평온**: `startRound` 2단계 보충(`engine.js:591`)은 `calm`을 거르지 않는다. 3막에 덱이 바닥나면 평온이 다시 나올 수 있다(보통 덱이 넉넉해 실제로는 드물다).
9. **소명 장 문턱 고정**: 「넓히는 자」(8장까지)·「쌓는 자」(6장까지)는 8장짜리 판(4×4, 시련 `last`)에서도 같은 값이다.
10. **인구 한도를 무시하는 이동**: 평화 궁극, 신앙 바닥 이탈, 침묵 이탈은 한도를 보지 않는다(한도는 성장·부활·유목민·난민과 `76c0053`부터 **선교 성공**도 막는다 — 그 전에는 선교 성공도 한도를 보지 않았다; `88878b6` 전에는 평화 연속 기적도).
11. ~~**대성당 1단계는 무너지지 않음**~~ — **바꿈** `afab303`: 수도가 맞을 때마다 `cathedral >= 1`이면 한 단계 무너진다(§10). **다시 바꿈** `d7ad6e0`: 어느 단계도 무너지지 않는다. `3f33be1`부터 단계가 없다(한 번 짓는다).
12. **율법파 계획은 예산을 나누지 않음**: `L9`(마을·마을)처럼 같은 비용 행동을 둘 계획해 한쪽이 해결 때 실패할 수 있다. `afab303` 뒤로는 대상 없는 공격·선교 규칙(칼·결집 포함)이 모두 **대체 마을**(§4.9)로 바뀌므로 한 계획에 마을이 셋 이상 들어가 뒤의 것이 실패하는 일이 더 잦다.
13. ~~**유목민 선택과 저장**: 해결 뒤 상태로 저장·불러오면 유목민 선택 없이 다음 장으로 갔다.~~ — **고침** `afab303`: `resumeLoaded`가 먼저 묻는다(`main.js:293-296`, §3.13).
14. **번개와 수도**: 율법파 수도에 번개를 쳐도 내구도는 줄지 않는다(석판 −2와 성벽/인구만). `bcdeb22`부터 말한 번개가 "번개로 적의 수도를"이면 율법파 수도를 겨누므로(§6.2) 이 차이가 더 자주 드러난다 — 규칙서가 말하는 "번개로 율법파 수도를 치면 (석판을) 막는다"와는 맞다.
15. ~~**승천 1의 식량 +4**가 문구에 없다.~~ — **고침** `afab303`: 문구가 "율법파 시작 신도 +1, 식량 +4".
16. **방주**: 율법파 공격에 져도 인구는 지키지만 마을은 빼앗기고 수도 내구도는 준다(`d7ad6e0` 전에는 대성당 단계도). 신앙 바닥·침묵 이탈은 막지 않는다.
17. ~~**저주 말투**의 신앙 −1은 공격을 하지 않아도 낸다.~~ — **없어짐** `8250dd7`: 말투가 수치를 잃었다(§14.4).
18. **표시용 승률**(§17)은 계절 「율법파 집결」을 반영하지 않는다(승천 4·되풀이를 읽는 율법은 반영, `16492f4`부터 예고된 율법파 성벽도 반영; `846fd60`에서 포위와 수호자 성인이 규칙에서 없어져 그 둘의 차이는 사라졌다).

`afab303`·`5b7a94f`에서 새로 생긴 확인 사항:

19. ~~**헤아린 성벽의 예산**: `autoFill`의 뜻을 헤아린 성벽(전쟁 교리)은 받아들인 건설의 비용을 빼지 않은 현재 보유 자원으로 골라, 받아들인 성벽·신전이 돌을 먼저 쓰면 해결 때 `log.buildNoRes`로 실패할 수 있었다.~~ — **고침** `e68a240`: 받아들인 건설을 치르고 남은 자원(`left`)으로 성벽 비용을 낼 수 있을 때만 헤아린 성벽을 고른다(§3.5, `engine.js:462-466`). 같은 커밋에서 늘 건너뛰던 `DOCTRINE_LABOR.abundance`도 지웠다.
20. ~~**계명 새긴 장의 다시 채우기**: `accept`의 `autoFill`은 확인 화면에서 뺀 칩(`pending.dropped`)을 금지로 넘기지 않아, 뺀 칩이 기본 노동으로 되살아날 수 있었다.~~ — **고침** `e68a240`: 뺀 칩도 금지 키로 넘긴다(§3.6, `main.js:726`).
21. **메아리의 기준**: 바로 지난 장이 아니라 **마지막으로 기록된 계시**와 비교한다(침묵을 끼워도 같은 글이면 메아리). 문장부호 `\p{P}`와 공백만 지우고 기호·이모지는 남긴다("쳐라~"와 "쳐라"는 다른 글). 메아리 계시도 `doctrine`을 기록하므로 율법파는 반응한다(인용 대상이기도 했으나 인용은 `16492f4`에서 없어졌다). 연속(§5.4)은 늘지도 끊기지도 않는다. `9b43bbf`부터는 글이 달라도 석판이 읽은 일의 목록이 같으면 메아리다(§19-27).
22. ~~**굳은 율법의 셈**: 해석기가 만든 명령의 종류만 센다 — 막히거나 실패한 명령도 세고, 뜻을 헤아린 선교·공격(`auto`)은 세지 않는다. 그래서 교리만 평화·전쟁으로 두고 선교·공격 낱말 없이 말하면(예: 평화 교리를 부르는 다른 말) 헤아린 자리로 선교·공격을 하면서 굳음을 피할 수 있다(단, 헤아린 자리는 승률 50% 이상일 때만 — `0a0a974`부터는 성향에 따라: 열혈은 40%부터이고 교리가 평화·지혜여도 공격·선교를 먼저 보며, 몽상가는 두 손, 신중은 60%, 문자주의는 헤아린 자리가 없다. §3.5).~~ — **바뀜** `df1cb16`: 율법파의 대비는 이제 선교·공격 명령이 아니라 **되풀이**(받아들인 명령의 종류가 지난 두 계시와 같음)를 본다(§4.9). 헤아린 일(`auto`)이 목록에 들지 않는 것은 그대로라, 명령 없이 교리만 부르는 계시(받아들인 명령이 없어 `sig = ''`)는 대비를 켜지도 잇지도 않고 0으로 푼다. 메아리와 판정 재료가 다른 점은 §19-45.
23. **원정은 모든 후보를 넓힌다**: `marchRange`는 공격만이 아니라 율법파 수도의 `reach` 전체를 넓혀, 3막 율법파는 수도에서 4칸 떨어진 곳에 마을을 짓고 채집한다. 첫 판·쉬움에도 적용된다.
24. **결집의 문턱**: 결집은 `wrathRound`(보통 4장)부터 켜질 수 있고, 켜진 뒤 6점 이하로 좁혀질 때까지 유지된다(분노처럼 한 장씩 오르내리지 않는 켜기·끄기; `87a0fce` 전에는 8점에 켜지고 4점에 꺼졌다). 튜토리얼과 승자가 난 장은 갱신하지 않는다. (켜져 있는 동안의 신도 +1 — §19-33 — 은 `df1cb16`에서 없어졌다.)
25. ~~**죽은 코드·키**: `state.oddUsed`, `state.liturgy`, 언어팩 `kw.liturgyStrip`·`log.liturgy`·`ui.tag.odd`·`ui.tag.liturgy`·`ui.grace.odd`·`ui.grace.otherDeed`·`ui.verdict.odd`, 없어진 장치를 말하는 주석, `tools/golden.mjs`의 `pending.odd`·`d.liturgy`가 남아 있었다.~~ — **고침** `e68a240`: 필드·키·CSS(`.v-odd`)·주석을 지웠다. 남은 흔적은 `ui.verdict.text`의 `grade === 'odd'` 갈래(옛 저장본의 `history[].verdict`용)와 언어팩 파일의 주석 두 줄(`i18n/ko/engine.js:182`, `i18n/ko/interp.js:156`)뿐이다. 이식판은 옛 저장본의 두 필드를 무시하기만 하면 된다.
26. **남은 자와 결말 종류**(`448f553`): 튜토리얼 밖에서는 `extinct`·`convertAll`·`bothExtinct`에 닿지 않지만 `checkVictory`·`outcomeKind`·에필로그(`story.lose.extinct`·`draw`)·연대기에는 남아 있다. 남은 자로 돌아온 한 명은 인구 한도와 식량을 보지 않고, 굶주림·전투로 다시 0이 되면 다음 `checkVictory`에서 또 흔들린다(내구도가 0이 되면 점령 — `435c3cc`부터 내구도 2라, 맞은 적 없는 수도도 두 번 전멸하면 점령이다). 번개는 수도 내구도를 직접 줄이지 못하지만(§19-14) 마지막 신도를 쓰러뜨리면 남은 자로 줄인다.

`9b43bbf`·`78c891e`에서 새로 생긴 확인 사항:

27. **일로 보는 메아리의 폭**(§14.8): 목록은 종류만 보므로 칸·수·금지가 달라도 메아리다. 골든에서 보이는 예 — "이 산을 시온이라 부르라"(석판이 `산`을 돌 캐기로 읽음) 다음 "시온에서 돌을 캐어 오라"(`s4-easy-first` 7장), 예언 "이웃이 말씀을 받아 두 장 안에 돌아오리라"(선교) 다음 "이웃에게 나의 말씀을 전하라"(`s6-normal-veteran` 7장), "율법파에게 재앙을! 그들의 마을을 쳐라" 다음 말한 기적 "번개를 내려 율법파를 벌하라"(둘 다 공격, `s5-normal-first` 12장). 이름 붙이기·예언·말한 기적을 담은 계시도 석판이 읽은 일로만 판정된다. 또 LLM 모드에서도 목록은 석판으로 만들므로 대사제가 다르게 읽은 계시도 석판 기준으로 메아리가 된다.
28. ~~**`doomUsed`의 기본값**: `hydrateState`가 채우지 않는다(`updateLawGuard`가 첫 해결 때 `??= false`).~~ — **고침** `435c3cc`: `hydrateState`가 `doomUsed ??= false`·`miracleUses ??= {}`를 채운다(`engine.js:1183`). 이식판 저장 형식도 `false`·`{}`를 기본으로 둔다(§20-17).
29. **신앙 승리의 개종 셈**: `stats.converted`는 선교 판정 승리만 센다 — 평화 궁극(§5.3)(`88878b6` 전에는 평화 연속 기적도)으로 넘어온 신도는 인구 조건에는 들고 개종 조건에는 들지 않는다. 신앙 승리는 장 끝에만 보므로, 말하기 단계의 기적으로 조건을 채워도 그 장 유지 단계까지 기다린다.
30. ~~**`RULESET`은 5 그대로**: `9b43bbf`는 승리 조건·대성당·율법파 행동 수를 바꿨지만 `RULESET`([03 상수](03-data.md#상수))을 올리지 않아, 최고 기록 키 `-r5`에 전후 판이 섞인다.~~ — **고침** `87a0fce`: `RULESET = 6`(선공·결집·기적 재사용·두 장 전 메아리와 함께). `-r5` 기록에는 `e68a240`~`87a0fce` 직전 판이 남고(그 안에서는 `9b43bbf` 전후가 섞인다), `7a28084`의 7×7 대성당 ×1.5는 `-r6` 안에서 올리지 않고 바뀌었다([07 §17.1](07-progression.md#171-ruleset-datajs240-241)). `435c3cc`에서 `RULESET = 7`(신도 수 우위 삭제·수도 내구도 2); `8ba0ef8`의 해금 단계는 `-r7` 안에서 올리지 않고 들어왔다(일반 판의 모듈 구성이 바뀌지만 그때 최고 기록 키에는 해금 단계가 없었다). `0c95856`에서 `RULESET = 8`(대성당 공사 중 율법파 선공, 길이와 무관한 계시 비용)이고, 같은 커밋부터 최고 기록 키에 해금 단계가 붙는다(`-u{unlock}`, 해금 4 미만일 때 — [07 §13](07-progression.md#13-시드별-최고-기록-metajs105-115)). `0a0a974`의 대사제 성향 노동과 어려움의 건설 공개는 `-r8` 안에서 올리지 않고 들어왔다(해금 3 이상 판·어려움 판의 결과가 바뀐다 — 골든 다섯 판이 바뀌었다).
31. ~~**원정 +1의 범위**: `siegeOf`는 `crusade` 표시가 아니라 "율법파가 우리 수도를 치고 공사 단계 ≥ 1"만 보므로, reach 안에서 하는 보통 수도 공격도 +1을 받는다. 공사가 무너져 0이 되면 곧바로 사라진다.~~ — **없어짐** `55d33dd`: 원정 +1을 지웠다(§10).

`87a0fce`·`2825b37`·`7a28084`에서 새로 생긴 확인 사항:

32. **선공은 장 시작 승점으로**(§3.1): 장 시작 시점의 `score`(심판의 기준·성지·소명 포함, §12)로 가르므로 1점만 앞서도 상대가 선이다. 막기(§3.7) 때문에 선은 같은 칸을 먼저 쓰는 이점이라 앞선 쪽은 계속 후가 된다. 같은 승점이면 예전처럼 홀짝. 확인 칩의 선공 표시(`firstNote`)와 규칙서 `ui.rules.core2`("선공은 승점이 뒤진 쪽(같으면 번갈아)")가 이 규칙을 따른다. 튜토리얼은 늘 우리가 선이다(`2825b37`). `0c95856`부터 우리 대성당 공사 중(`cathedral >= 1`)에는 승점과 무관하게 율법파가 선이다 — 확인 칩·트랙 표시는 `state.first`를 읽으므로 맞지만, `ui.rules.core2`·`core6`(저울)의 글은 이 예외를 적지 않는다(`ui.rules.win3`과 규칙서 대성당 줄에만 있다). 공사가 무너져 0이 되면 다음 장부터 곧바로 승점 규칙으로 돌아간다.
33. ~~**결집의 신도는 한도를 보지 않는다**(§3.10): 인구 한도·식량과 무관하게 장마다 +1이라 §19-10의 "한도를 보지 않는 이동"에 더해진다. 켜진 장의 유지에는 아직 없고(장 기록이 유지 뒤), 격차가 좁혀져 꺼지는 장의 유지에는 한 번 더 있다. 골든 `s5-easy-first-war`에서 결집 한 번에 신도가 일곱 번 모여든다.~~ — **없어짐** `df1cb16`: 결집의 신도 +1을 뺐다(§3.10, §4.9).
34. **기적 재사용 비용**(§6.2): 판 전체 누적이고 분노 할인을 받지 않는다. 손패 카드의 할인 표시 `.cut`과 옛 비용 취소선은 `miracleCost < cost`일 때만이라 재사용으로 비싸진 카드는 새 비용만 보인다. ~~`miracleUses`를 `hydrateState`가 채우지 않고, 분노 툴팁의 `-{off}`가 재사용과 겹치면 0·음수가 된다.~~ — **고침** `435c3cc`: `hydrateState`가 채우고(§19-28), 툴팁은 분노 할인(`ui.hand.wrath`, 할인이 실제로 걸릴 때만)과 재사용 가산(`ui.hand.reuse` " (다시 쓴 만큼 +{n})")을 따로 적는다(`main.js:2014`, §6.2) — [06 §11](06-ui-ux.md#11-확인-필요-목록).
35. **두 장 전 메아리의 폭**(§14.8): `revelations.at(-2)`는 침묵을 건너뛴 두 번째 앞 **기록된** 계시이고 메아리로 기록된 계시도 포함한다. 그래서 A·B를 번갈아 쓰면 셋째 계시부터 모두 메아리지만 세 계시(A, B, C)를 돌려 쓰면 걸리지 않는다. 글 비교는 마지막 계시만. 골든에서 두 장 전 일 메아리는 네 판(`s6-normal-veteran` 12장, `s6-easy-veteran` 3장, `s7-normal-veteran` 6장, `s4-hard-veteran-asc4` 5·7장 — `0a0a974`로 다시 뽑은 판 기준, `c12a1e9`에서 다시 세어 같다)에 있다.
36. ~~**튜토리얼 청원 벌과 구동기**: 화면(`main.js:769`)은 `2825b37`부터 튜토리얼에서 청원 외면을 세지 않지만, 골든 구동기 `tools/golden.mjs:184`와 테스트 구동기 `tools/tests/lib.mjs:109`에는 그 조건이 없어 골든 `tutorial-3x3.json`의 우리 신앙이 2장부터 1 적었다.~~ — **고침** `435c3cc`: 두 구동기에도 `!state.tutorial` 조건을 넣고(`tools/golden.mjs:186`, `tools/tests/lib.mjs:109`, 화면 `main.js:773`) 골든을 다시 뽑았다([golden README](../export/golden/README.md)).
37. **`quick`·`ULT_ROUND`는 쓰이지 않는다**: `7a28084` 뒤로 판 크기 규칙은 모두 `sizeRules`로 읽고, `quick(state)`(`engine.js:202`)과 `ULT_ROUND`(`engine.js:200`, `main.js`가 import만 함)는 남은 이름뿐이다. 표에 없는 크기(3×3 튜토리얼 등)는 5×5 값을 쓴다. `data.js`의 표 주석은 궁극·드래프트·분노 장을 `rounds.ult/draft/wrath`라 부르지만 실제 칸은 `at.ult/draft/wrath`다.

`435c3cc`·`8ba0ef8`·`bcdeb22`·`3a790f5`에서 새로 생긴 확인 사항:

38. ~~**종료 화면 「새 맵」은 모든 모듈을 켠다**(§16.2): `main.js:850`은 `veteran: true`만 넘기고 `unlock`을 넘기지 않아 `unlockedCfg`가 `veteran ? 4 : 0`으로 떨어졌다. 첫 판을 끝내고 「새 맵」을 누르면 해금 4 판이 되었고 해금 안내도 뜨지 않았다.~~ — **고침** `0c95856`: 「새 맵」도 `unlock: min(MODULES, 서고 길이)`를 넘긴다(`main.js:848`) — 해금 안내도 뜬다. 남은 점: 「같은 맵 다시」(`restart`)는 원래 `config`를 넘겨 해금 단계가 그대로다(판을 끝내도 오르지 않는다).
39. **해금은 끝낸 판 수만 본다**: `unlock = min(4, 서고 길이)`라 이기든 지든, 오늘의 계시·시련·도전 판이든 한 판으로 센다. 서고가 50판에서 잘려도 4 이상이라 영향이 없다. 저장된 판을 이어 하면 저장 때의 `config.unlock`을 쓴다.
40. **수도 내구도 2의 파급**(`435c3cc`): 심판의 날(−1) 한 번 + 수도 공격 한 번이면 점령, 남은 자 두 번이면 점령. 소명 「지키는 자」는 `capitalHp >= CAPITAL_HP`라 한 번도 맞지 않아야 한다(글도 "한 번도 내주지 않기"로 바뀜). 승점의 수도 항목(`hp × w.hp`)이 1씩 줄어 양쪽 시작 승점이 고전 기준 10 : 12(쉬움 10 : 10)가 되고, 「굳건한 자」(`steadfast`, `hp` 가중 3)에서는 3점 줄어든다. 골든 11판은 모두 다시 뽑혔다(대부분 양쪽 −1). `0c95856`부터 `hydrateState`가 옛 저장본의 `capitalHp`를 `CAPITAL_HP`로 자른다(`engine.js:1201` — `Math.min(capitalHp, 2)`) — `435c3cc` 전 판을 이어 해도 한 번도 맞지 않은 수도가 3을 들고 있지 않다.
41. **"수도" 한 이름의 남은 곳**(`435c3cc`): 칸 이름(`eng.tile.capital` "우리/율법파 수도(id)")·석판·심판의 날·규칙서 글은 "수도"로 맞췄다. `0c95856`에서 칸 툴팁의 건물 줄(`main.js:418`: 우리 `ui.tip.temple` "우리 수도 — 신전이 서 있다. 기도하는 곳", 율법파 `ui.tip.tower` "율법파 수도 — 율법의 탑이 서 있다")과 예언 이름 `data.prophecy.capital.name`("율법파 수도가 흔들리리라")도 맞췄다. 남은 곳: 이름 붙이기 은총 글의 수도 칸 이름(`TERRAIN_NAME` → `ui.terrain.temple` "신전", `main.js:778`), 지도자 대사(`data.leader.*.line.capitalLow` "탑이 흔들린다…"), 결말 글(`story.*conquest*`)과 업적 이름(`story.ach.fortress.name` "흔들림 없는 신전", `story.ach.conquest.name` "무너진 탑"). 해석기의 `kw.prophecy.capital`은 "탑|수도|성채"를 모두 받는다.
42. ~~**해금 4 안내에 미라가 없다**: 미라는 `unlocked(state, 4)`(§7.3)지만 `ui.unlock.4`는 "교리 대립, 영원한 계명, 율법파의 검열"만 적었다.~~ — **고침** `0c95856`: `ui.unlock.4`가 "…율법파의 검열, 분열의 예언자 미라"다.

`0c95856`·`b470e03`·`0a0a974`에서 새로 생긴 확인 사항:

43. ~~**대성당 선공은 공사 단계만 본다**(§3.1 13단계): `cathedral >= 1`이면 율법파가 선이다 — `d7ad6e0`부터 공사가 무너지지 않으므로 한 번 올리면 판 끝까지 율법파가 선이다(그 전에는 공사가 무너져 0이 되면 다음 장부터 승점 규칙으로 돌아갔다).~~ — **바뀜** `3f33be1`: 대성당을 지은 다음 장(원정의 장)이 끝나면 판이 끝나므로(이기거나 수도가 무너진다) 율법파 선공은 그 한 장뿐이다. 달라지는 것은 우리가 뒤지거나 같을 때뿐이다 — 우리가 앞서면 승점 규칙으로도 뒤진 율법파가 선이다. 튜토리얼에는 대성당이 없다. 골든 11판에는 대성당이 없어 이 규칙이 드러나지 않는다([golden README](../export/golden/README.md)).
44. **대사제 성향의 헤아린 노동**(§3.5, `0a0a974`): 열혈의 `first`(공격·선교)는 교리의 일보다 먼저라 평화 계시에서도 승률 40%면 먼저 친다 — 평화 교리에서 공격이 나온다(`76c0053`부터 열혈의 `first`는 전쟁·평화 계시에서만 쓴다 — 그 전에는 지혜 계시에서도 쳤다; 골든 `s4-hard-veteran-asc4` 2장 "높은 신전을 쌓아 나를 섬겨라"의 헤아린 손이 공격 → 탐험). `76c0053`부터 헤아린 손은 이미 둘인 종류를 고르지 않는다. 신중은 전쟁 계시에서도 성벽을 쌓을 수 없으면 기도를 고른다. 몽상가의 두 번째 손은 종류 목록을 처음부터 다시 보므로 같은 종류를 둘 고를 수 있다. 성향과 무관하게 풍요·교리 없음·침묵에는 헤아린 자리가 없다. 헤아린 선교·공격은 `auto`라 되풀이를 읽는 율법(§4.9)의 목록에 들지 않는다(§19-22). 해금 3 전(네 번째 판 전)과 튜토리얼·골든 첫 판은 `loyal`이다 — 골든의 두 번째 판 다섯 판은 모두 성향이 있어(`cautious`·`literal`·`dreamer`·`dreamer`·`zealot`) 이 커밋에서 다시 뽑혔다.

`df1cb16`·`16492f4`·`c12a1e9`에서 새로 생긴 확인 사항:

45. ~~**되풀이의 두 판정**(§4.9, §14.8): 비용·교리의 메아리(`isEcho`)는 **말할 때** 글(마지막 계시와 같은 글)과 석판이 **글에서** 읽은 일의 목록(`spokenOf`)으로 정하고, 율법파의 대비(`updateLawGuard`)는 **해결 때** 받아들인 명령(`playerPlan` 중 `auto`가 아닌 것)의 종류로 정한다. 둘 다 지난 두 계시의 `sig`와 견주지만 재료가 달라 어긋난다: (1) 같은 글이라도 석판이 읽은 일이 없거나(`sig = ''`) 칩을 빼 받아들인 종류가 달라지면 비용은 +1인데 대비는 없다, (2) LLM 모드에서는 저장된 `sig`가 석판의 읽음이고 받아들인 명령은 대사제의 것이라, 대사제가 석판과 다르게 읽으면 비용의 "되풀이"와 율법파의 대비가 따로 논다(석판 모드에서는 `validateOrders`에 걸린 명령이나 뺀 칩이 없으면 같다). 골든 `s7-hard-first` 6·7장 "율법파의 마을을 쳐라"는 글이 같아 비용 2인데, 6장은 칠 곳이 없어 받아들인 명령이 비고 7장은 앞 두 계시의 일 목록이 비어 있어 대비가 없다(8장에야 `log.lawGuard`). 규칙서·화면 규칙서·튜토리얼은 하나의 규칙으로 설명한다. 이식판은 이 차이를 그대로 옮겨야 골든이 맞는다.~~ — **고침** `55d33dd`: 율법파의 대비도 메아리 판정(말할 때 `spokenOf`로 정해 `recordRevelation`이 `echo`로 기록한 것)을 쓴다 — 다음 장 `startRound`의 `braceLaw`가 지난 계시의 `echo`를 본다(§4.9). 칩을 빼거나 LLM이 석판과 다르게 읽어도 비용의 "되풀이"와 대비가 같다. 골든 `s7-hard-first` 6·7장 "율법파의 마을을 쳐라"는 이제 글이 같아 메아리이므로 7장에 +1, 8장에 +2가 걸린다(9장 결과가 바뀌어 41:41 → 율법파 39:46 — [golden README](../export/golden/README.md)).
46. ~~**예고된 성벽은 표시와 석판에만**(§17): `wallAhead`는 확인 칩의 승률과 석판의 후보 순위에만 들어가고, 뜻을 헤아린 기본 노동의 승률 문턱(§3.5, `autoFill`의 `actionOdds(state, a)`)에는 들어가지 않는다 — 헤아린 공격은 곧 성벽이 설 칸을 문턱 위로 볼 수 있다.~~ — **고침** `55d33dd`: 헤아린 노동도 보이는 성벽 예고를 센다(`engine.js:487`, `497`). 남은 것: `wallAhead`는 **보이는** 뜻만 보므로 안개 속(`revealed` 아님) 칸의 성벽 예고는 세지 않는다(쉬움·보통·어려움 모두 건설은 보이는 난이도다 — 세 곳이 같은 목록을 쓴다). 골든 `s4-hard-veteran-asc4` 5장의 헤아린 공격이 C2 → D3으로 바뀌었다.
47. **석판을 움직이는 것의 목록**(§9, `c12a1e9`): ~~커밋 기록·규칙서·석판 툴팁은 성지·신전·번개만 적는다~~ — `55d33dd`부터 석판 툴팁(`ui.mat.edictTip` "…내림: 우리가 성지를 쥠(장마다 −1)·번개로 율법파 수도를 침(−2)·심판의 날(−2)")과 규칙서(`docs/RULEBOOK.md` 모듈 표)가 심판의 날(−2)도 적는다. 미라 「품는다」(+1, `data.js` 미라 선택 `embrace`의 `edict: 1`)는 툴팁·규칙서에 없고 선택지 글("신앙 +1, 율법 석판 +1")에만 적힌다. 또 율법파 신앙이 쓰이는 곳이 없어져(§4.8) 쌓이기만 하므로, 심판의 기준 「경건」(`pious`, 신앙 3마다 승점 1) 판에서는 율법파 승점이 크게 는다 — 골든 `s6-easy-veteran`(경건)의 율법파 신앙 승점이 2 → 15가 되어 결과가 우리 38:29 승 → 율법파 38:42 승으로 바뀌었다([golden README](../export/golden/README.md)). 이 쌓임은 그대로 둔다(`55d33dd` 때의 판단 — 석판 모듈이 꺼진 첫 판에서도 율법파 신앙은 쓰이는 곳 없이 쌓였다).
48. ~~**`lawGuard`의 두 칸**: `df1cb16`부터 `preach`·`attack`이 늘 같은 값으로 오르내려 한 칸이면 충분하다. 저장 형식과 `lawGuardOf(state, side, type)`의 모양은 그대로 두었다(옛 저장본에는 두 값이 다를 수 있다 — 화면은 둘 중 큰 값을 적고, 판정은 종류별 값을 쓴다). 기록 `log.lawGuard`는 `attack > 0`일 때만 조건을 보는데 되풀이한 장에는 늘 참이다.~~ — **고침** `55d33dd`: `lawGuard`는 수 하나(0~2), `lawGuardOf(state, side)`. 옛 저장본의 두 칸은 `hydrateState`가 둘 중 큰 값으로 바꾼다(`engine.js:1199`). 기록은 값이 오를 때만 남는다(§4.9).
49. ~~**대비 기록은 재생되지 않는다**(§4.9, `55d33dd`): `log.lawGuard`는 이제 `startRound`(`braceLaw`)에서 남는데, 화면의 재생은 수락 때 남은 로그(`resolved.logs = state.log.slice(from)`, `main.js:753`)만 돌린다. 그래서 대비는 연대기와 율법 카드 뒷면의 알약으로만 보이고, 재생의 `guard` 갈래(`main.js:1599-1602` — 율법파 수도의 고리·"대비" 글씨)는 더 이상 쓰이지 않는다. 골든 구동기는 `startRound` 앞에서 로그 위치를 잡으므로 이 줄이 그 장 `log`의 맨 앞에 있다.~~ — **고침** `846fd60`: `newRound`가 장 제목 카드 뒤에 그 장의 `guard` 줄을 `playFx`로 보인다(`main.js:491-493`, 글 `ui.fx.guard` "율법파가 대비한다"). 다만 `playFx`는 드러나지 않은 칸의 율법파 기록을 건너뛰므로 율법파 수도가 안개 속이면(보통 그렇다) 여전히 보이지 않는다([06 §11-23](06-ui-ux.md#11-확인-필요-목록)). `88878b6`에서 기록의 칸을 우리 수도로 바꿔 늘 보인다.
50. ~~**`RULESET`은 10 그대로**(§9, [03 상수](03-data.md#상수)): `55d33dd`는 원정 +1을 빼고 대비의 판정을 바꿔 결과가 달라졌지만(골든 `s7-hard-first` 41:41 → 39:46) `RULESET`을 올리지 않았다 — 최고 기록 키 `-r10`에 전후 판이 섞인다. 새 `state.ruleset`은 저장본이 만들어진 규칙 판을 적지만 `RULESET` 10 그대로라, `55d33dd` 전 규칙 10에서 만든 저장본(필드 없음 → 0)도 석판 자르기를 한 번 더 받는다(그 판의 석판은 이미 새 한계를 쓰고, 한계에 닿으면 장 끝에 율법파 승리로 끝나므로 사실상 바뀌지 않는다).~~ — **고침** `846fd60`: `RULESET` 11(포위·성인 보정·청원 외면 벌 삭제와 함께). `55d33dd`~`846fd60` 사이의 판은 `-r10` 기록에 섞여 남는다. `55d33dd`~`846fd60`에서 만든 저장본은 `ruleset` 10이라 석판 자르기를 받지 않는다(§9).
51. ~~**옛 주석 하나**(`846fd60`): `engine.js:268`의 "선교 보너스: … + 성인 설교자 (교리·성인·계명 합은 최대 +2)"는 성인 보정이 없어진 뒤에도 남았고, `siegeOf`를 지우면서 `preachBonus`(`273`)가 아니라 `enemyZeal` 위에 붙었다. 규칙은 §3.8 그대로(교리·계명·은사 합 최대 +2).~~ — **고침** `88878b6`: 주석을 `preachBonus` 바로 위로 옮기고 성인을 뺐다(`engine.js:271`).
52. ~~**튜토리얼의 연속 표시**(`88878b6`): 튜토리얼은 `braceLaw`·`braceAhead`가 돌지 않아 율법파가 읽지 않는데, 교리 칸의 연속 점(툴팁 "…율법파가 읽고 대비한다")과 확인 화면 꼬리표 `ui.tag.streak` "{교리} 세 장째 — 율법파가 읽는다"는 튜토리얼 조건 없이 뜬다(`main.js:1983`, `2099`). 튜토리얼 대본의 제안(풍요·지혜·풍요·평화·풍요)으로는 나오지 않고 직접 같은 교리를 세 번 말할 때만이다.~~ — **고침** `d3fe641`: 튜토리얼에서는 교리 칸의 점을 숨기고(`!cur.tutorial`), 꼬리표는 튜토리얼에서 거짓인 `wouldRead`가 정한다.
53. ~~**연속 점과 읽힘이 어긋나는 틈**(`88878b6`): 점(`state.streak`)은 교리가 없는 **메아리**에서 끊기지 않지만(`if (doctrine)`만 갱신), `readUs`는 마지막 세 계시에 교리 없는 계시가 끼면 읽지 않는다. 교리 없는 메아리를 사이에 둔 같은 교리 두 계시 뒤 세 번째를 말하면 꼬리표는 "세 장째 — 율법파가 읽는다"인데 읽힘은 없다(그 메아리 자체가 되풀이라 그 다음 장에는 대비가 걸린다). 드물다.~~ — **고침** `d3fe641`: 교리 없는 메아리도 연속을 비운다(`state.streak = null`). 꼬리표도 `state.streak`이 아니라 `wouldRead`(`readUs`와 같은 식)로 정한다.
54. ~~**읽힘 예고의 "+1"**(`d3fe641`): 확인 화면 꼬리표·메아리 툴팁 `ui.echo.tip`·교리 칸 툴팁 `ui.mat.streakTip`이 늘 "다음 장 선교·공격 방어 +1"이라 적었다~~ — **고침** `1fbb160`(꼬리표가 `{n}` = `min(2, lawGuard + 1)`, `main.js:2097-2100`)·`e174a18`(두 툴팁이 "+1, 이어지면 +2").
55. **은총 꼬리표와 예언 은총**(`8250dd7`): 이룬 예언의 은총은 유지 단계(`checkProphecy`)에서 서원·청원·이름보다 먼저 장당 한 번의 몫을 가져간다. 확인 화면의 "· 은총" 꼬리표는 서원 > 청원 순으로만 정해(`main.js:2086-2088`) 그 장에 예언이 이루어질지는 모르므로, 청원 꼬리표가 "· 은총"을 약속해도 예언이 이루어지면 청원 은총은 0이다(기록도 없음).
56. **옛 주석과 남은 코드**(`8250dd7`): `engine.js`의 "// 해결 전: 말투 효과 (축복 = 첫 채집 +1, 저주 = 공격 +1과 신앙 -1)"(`applyTone`을 지운 자리, 예언 봉인 위), `data.js`의 `PROPHECY` 주석 "짧을수록 보상이 크다", `RULES.graceDoctrineBelow` 주석 "비유·첫 이름의 교리 보너스는…"이 없어진 규칙을 말한다(`grantGrace` 위 "청원·말투·이름에서 오는 신앙", `TONES` 위 "계시의 문체가 효과가 된다", `RULES.gracePerRound`의 "청원·말투·이름 붙이기"도). `autoFill`의 플레이어 갈래가 일찍 돌아가므로 그 뒤의 `side === 'player'` 기도 먼저 갈래(`engine.js:519-521`)는 닿지 않고, `nameTile`이 돌려주는 `first`는 읽는 곳이 없다. 또 `eng.why.prophecy`는 "예언 “{name}”이 이루어졌다"로 조사를 `이`로 고정해, "…무너지리라”이"처럼 받침 없는 예언 이름 넷 모두에 어색하다("…”가"가 맞다).
57. **말투는 말씨도 바꾸지 않는다**(`8250dd7`): `data.tone.*.text`(꼬리표 툴팁)와 규칙서 `ui.rules.words3`은 말투가 "대사제의 말씨"를 바꾼다고 하지만, `pending.tone`을 읽는 곳은 확인 화면 꼬리표와 어휘집(`noteWords('tone:…')`)뿐이다 — 석판 해석문의 머리말은 교리 말투(`voiceOf`)이고 LLM 프롬프트(`interp.systemPrompt`)에는 말투 지시가 없다(LLM은 원문을 보므로 우연히 따라갈 수는 있다). 글을 고칠지, 해석문에 말투를 실을지 정할 것. (`76c0053`에서 `docs/RULEBOOK.md`는 "말투는 대사제의 말씨만 바꾼다" 줄을 뺐다 — 게임 안의 `data.tone.*.text`·`ui.rules.words3`은 그대로다.)
58. ~~**대성당의 옛 주석**(`d7ad6e0`): `engine.js:210`의 "대성당 단계마다 필요한 마을: 1·2·3"과 `data.js` `CATHEDRAL` 위 "합계는 한 번에 짓던 비용과 같다"가 옛 규칙을 말했다~~ — **고침** `e174a18`(주석 둘을 새 규칙으로). 남은 것이던 `COST.cathedral`(11·11·13)은 `3f33be1`에서 지웠다. 대성당을 한 번 짓게 바꾼 뒤 남은 옛 주석은 §19-59.

`3f33be1`에서 새로 생긴 확인 사항:

59. ~~**대성당·읽힘의 옛 주석**(`3f33be1`): `engine.js:207`의 "대성당 단계마다 필요한 마을: 하나, 큰 판은 판이 넓은 만큼 더 (6×6 +1, 7×7 +2)"와 `210`의 "대성당 단계마다 우리 마을이 있어야 한다: 5×5는 하나", 읽힘의 `946`·`958` "같은 교리" 주석이 옛 규칙을 말했다.~~ — **고침** `637c05a`: 207행을 지우고 210행을 "대성당에 필요한 우리 마을: 둘, 큰 판은 판 크기 표만큼 더 (6×6 셋, 7×7 다섯)"(`engine.js:209`)로, 읽힘 주석을 칼·말씀으로 고쳤다(`engine.js:954-956`, `962`).
60. ~~**원정의 세 공격은 율법파 신도와 행동 수에 매인다**(§4.4, §10): 원정 규칙도 다른 공격처럼 `enemy.pop < 2`이면 건너뛰고 행동 수를 써서, 원정의 장 계획 때 율법파 신도가 하나뿐이면 수도 공격이 하나도 없어 그대로 이기고 둘이면 두 번만 쳤다.~~ — **고침** `637c05a`(문서 대리인의 A44): 원정 규칙은 신도 둘 미만의 건너뛰기를 받지 않고 행동 수 셈에서 빠진다(`crusading`).

`637c05a`·`24927a6`에서 새로 생긴 확인 사항:

61. ~~**원정 셋은 율법파의 남은 손을 줄인다**(`637c05a`, §4.4): 계획 루프는 원정 셋을 행동 수에서 빼지만 마지막의 `autoFill(enemy, plan)`은 원정 셋을 센 `accepted.length`로 남은 손을 셌다.~~ — **고침** `76c0053`(A45): `autoFill(state, side, plan.filter(a => !a.crusade))`.
62. **교리 없는 칼·말씀 계시**(`637c05a`, §4.9·§5.4; 확인 화면이 멈추던 것은 `76c0053`에서 고침 — 꼬리표를 `{ n }`만으로 부른다, D28; 남은 것은 연속 점): `swordOrWord`는 일 목록(`sig`)만으로도 참이라 교리가 `null`인 계시(이름만 말한 계시가 이름 붙인 칸의 율법파 행동 — 그 칸을 율법파가 차지한 뒤 — 을 고른 경우 등)도 칼·말씀이다. 그때 `state.streak.doctrine`이 `null`이라 교리 칸의 점(`cur.streak?.doctrine === k`)이 어느 칸에도 뜨지 않고, 확인 화면은 `wouldRead`가 참이면 `t('ui.tag.streak', { name: DOCTRINE[result.doctrine].name, n })`(`637c05a`~`24927a6`의 `main.js:2098` — `76c0053`부터 `{ n }`만, `main.js:2099`)를 먼저 계산해 `DOCTRINE[null].name`에서 **TypeError**가 난다(꼬리표 글은 `637c05a`부터 `{name}`을 쓰지 않는다). 튜토리얼 맵에서 A2에 이름 "시온"을 두고 지난 두 장을 공격·선교로 두면 "시온" → `preach:A2:`, 교리 `null`, `wouldRead` 참 — 이 문서를 고치며 재현했다. 드물지만 화면이 멈춘다 — 부르는 쪽에서 `name`을 빼면 된다([06](06-ui-ux.md) 확인 필요 29).

`76c0053`에서 새로 생긴 확인 사항:

63. ~~**믿음의 표식 표시는 아직 둘을 기준으로 한다**(`76c0053`, §3.8): 기록 `log.preachMark`는 늘 "믿음의 표식 1/2.", 칸 툴팁 `ui.tip.marks`는 "{n}/2 — 한 번 더 전하면…", 보드의 표식 테는 표식 둘이면 한 바퀴였다.~~ — **고침** `238120e`(D29): 기록 "믿음의 표식 {n}/{of}"(`of = FLIP_MARKS`), 툴팁 "믿음의 표식 {n}/{of} — {of − n}번 더 전하면 우리 땅 (두 장 넘게 끊기면 하나씩 지워진다)", 테는 표식마다 1/3(`stroke-dasharray 4n 12`), 주석도 "세 번(FLIP_MARKS)".
64. ~~**데려오지 못한 개종**(`76c0053`, §3.8): 인구가 가득 차 데려오지 못해도 기록은 "1명이 개종했다"이고 `stats.converted`가 올랐다.~~ — **고침** `238120e`(A46): `joined`일 때만 `stats.converted += 1`, 기록은 "1명이 흩어졌다(살 곳이 없어 오지 못했다)".

`238120e`에서 새로 생긴 확인 사항:

65. **평화 궁극은 마지막 한 명도 데려온다**(`238120e`, §5.3): 선교는 상대 신도가 하나면 실패하지만 평화 궁극의 스며듦(유지 단계, `engine.js:1372-1382`)은 `enemy.pop > 0`만 보아 율법파의 마지막 신도를 데려올 수 있다 — 그러면 남은 자 규칙(§15.2)이 율법파 수도를 흔든다. "마지막 남은 이는 끝까지 제 율법을 지킨다"는 선교에만 걸린다. 드물다(평화 6칸, 8장부터).
66. **마지막 한 명 때문에 못 하는 선교의 까닭**(`238120e`): 상대 신도가 하나면 선교가 합법 행동에서 빠지므로 석판은 "선교"를 알아들어도 후보가 없어 까닭 코드 `preach`를 남기고, 그 글은 `CANNOT_WHY.preach` "닿는 율법파 땅이 없다"다 — 닿는 땅이 있는데도 그렇게 알린다.
67. **계명을 새기면 뺀 헤아린 손이 돌아온다**(`238120e`, §3.5): 확인 화면에서 헤아린 손을 빼면(`pending.noHeed`) `derivePending`은 교리 없이 기본 노동을 채우지만, 수락 때 계명을 새겨 받아들인 명령을 다시 거르는 갈래(`accept`, `main.js:734`)는 `autoFill(state, 'player', kept, fk, result.doctrine)`로 `noHeed`를 보지 않는다 — 계명을 새긴 장에는 뺀 헤아린 손이 다시 들어간다(`e68a240`의 §19-20 — 뺀 칩이 되살아나던 것 — 과 같은 꼴).

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
   - `afab303`·`5b7a94f`의 새 규칙(원정·칼·대체 마을·결집·퇴각·굳은 율법·포위·승천 4·메아리·헤아린 노동·대성당 원정)은 **난수를 새로 쓰지 않는다.** 다만 계획이 바뀌고(율법파 공격이 늘고 집 안 행동이 더는 막히지 않음) 해결되는 선교·공격 수가 달라져 `rng.dice` 소비가 바뀌었다 — 그래서 골든 파일이 모두 새로 만들어졌다([이식 가이드](../godot/PORTING.md)). `e68a240`의 막기 대칭(후 진영의 집 안 행동도 해결됨)과 헤아린 성벽 예산도 난수를 새로 쓰지 않지만 해결되는 행동을 바꿔, 골든을 다시 뽑았다(네 판의 결과가 달라졌다). `9b43bbf`(7×7 율법파 행동 +1, 원정 +1, 신앙 승리 조건, 일 메아리)와 `78c891e`(석판의 곳·수의 말 — 명령 칸이 바뀐다)도 난수를 새로 쓰지 않지만 계획·판정·교리가 바뀌어 골든을 다시 뽑았다([golden README](../export/golden/README.md)). `87a0fce`(승점으로 정하는 선공, 결집 12·6점과 신도 +1, 기적 재사용 비용, 두 장 전 메아리, 석판의 절 나누기)도 난수를 새로 쓰지 않지만 선후(= 해결 순서 × 선 → 후의 `rng.dice` 소비 순서)와 계획이 바뀌어 튜토리얼 밖 10판을 다시 뽑았고, `2825b37`(튜토리얼은 늘 우리가 선)은 튜토리얼 판을 바꿨다. `7a28084`(판 크기 표)는 골든을 바꾸지 않았다(골든에 7×7 대성당이 없다). `435c3cc`(신도 수 우위 삭제 — 공격 보정이 바뀌어 승패가 달라진다, 수도 내구도 2, 튜토리얼 청원 벌 조건)도 난수를 새로 쓰지 않지만 11판 모두 다시 뽑았고, `8ba0ef8`(해금 단계)은 골든 설정에 `unlock`이 없어 바꾸지 않았고, `bcdeb22`(석판 조준·말한 번개)는 `s5-hard-veteran`·`s7-normal-veteran`을 바꿨다. 6차도 난수를 새로 쓰지 않는다: `0c95856`(계시 비용 — `s5-normal-first` 10장의 긴 계시가 2 → 1, 결과 그대로; 대성당 선공은 골든에 대성당 공사가 없어 드러나지 않는다), `b470e03`(석판이 공격·선교 대상을 승률 순으로 고름 등 — `s5-normal-first`, `s7-hard-first` 41:41 → 38:48로 패), `0a0a974`(대사제 성향 노동·어려움의 건설 공개 — 두 번째 판 다섯 판, 그중 넷의 최종 승점이 달라졌다). 7·8차도 난수를 새로 쓰지 않는다: `df1cb16`·`16492f4`·`c12a1e9`·`55d33dd`는 판정 보정·계획이 바뀌어 골든을 다시 뽑았고, `846fd60`(포위·성인 보정·청원 외면 벌 삭제, 석판 어휘, 한 절에서 같은 자원 두 번 채집 금지)은 튜토리얼 밖 열 판을 바꿨다 — 결과는 `s6-easy-veteran`(38:42 → 39:42)만 달라졌다([golden README](../export/golden/README.md)). `88878b6`~`d7ad6e0`도 난수를 새로 쓰지 않는다 — 골든이 바뀐 것은 계획(석판의 손 수·과녁, 자동 노동)이 달라져 주사위를 굴리는 행동과 순서가 바뀌었기 때문이다(`8250dd7`·`d7ad6e0`은 11판 모두). `3f33be1`의 `holyFor`(§2.4)는 따로 만든 `mulberry32(seed ^ 0x6c0a5e11)`의 첫 값 하나만 쓰므로 판의 `rng`와 맵 생성 난수의 순서는 그대로지만, 맵 생성 5단계의 언덕이 성지 자리로 옮겨 가 4×4 세 판·`s5-normal-first`·7×7 두 판의 첫 맵이 달라졌고(성지 칸이 바뀐 판은 넷), 연속 점(`streak`)이 풍요·지혜에서 `null`이 되어 11판 모두 다시 뽑았다([golden README](../export/golden/README.md)).
   - 맵용 난수기 네 개는 서로 독립이고 상태에 저장하지 않는다.
3. **안정 정렬**: JS `sort`는 안정 정렬이지만 GDScript `Array.sort_custom`은 **안정하지 않다**. 다음 정렬은 반드시 안정 정렬(병합 정렬, 또는 원래 인덱스를 2차 키로)로: 맵 다듬기 지형 집계, `rarest`, 자원 보장 칸, 기본 노동 자원 순서, 율법파 공격·선교 대상, 마을·성벽 거리, 이름 붙일 칸, 갈림길 셋(전쟁 연속 기적 성벽은 `88878b6`에서 없어짐), 소명(동점은 id), 성지(동점은 id).
4. **삽입 순서**: `reach`(Map), 탐험 후보(Map), 맵 다듬기 `counts`, `names` 개수 — Godot `Dictionary`는 삽입 순서를 지키므로 그대로 쓰면 된다. `legalActions`의 목록 순서가 율법파 선택과 기본 노동을 정한다.
5. **덱 위 = 배열 끝**. `pop_back()`으로 뽑는다. `dealDeck`은 새 섞음을 **앞에** 붙이고, 율법 덱 보충도 **앞에**(밑에) 붙인다. 2막 L5는 인덱스 `max(0, len−3)`에 `insert`.
6. **확정 순서**(§3.6): 율법파 계획은 말한 기적·말투·갈림길 비용보다 **먼저** 계산한다. 은총·침묵 벌·교리 상승은 유지와 승패 판정 **뒤**다. `resolveRound` 안에서는 유지 → `recordHistory`(분노 → 결집) 순이고, 결집은 **다음 장** 계획에 쓰인다. 되풀이를 읽는 율법은 다음 장 `startRound`가 `round`를 올린 **직후**(`braceLaw`, 카드·선공보다 먼저) 지난 계시의 `echo`로 정한다(§4.9, `55d33dd` — 그 전에는 `resolveRound` 안의 `updateLawGuard`가 이번 장 계시가 `revelations`에 들어가기 전에 받아들인 명령으로 정했다). 선공은 **다음 `startRound`**가 그때의 승점으로 정한다(§3.1) — `score`가 읽는 상태(인구·마을·신전·수도·성벽·성지·대성당·소명·신앙과 심판의 기준)가 같은 시점 값이어야 선후가 같다. 메아리 판정은 **말할 때**(비용을 치르고 이름을 붙이기 전, `spokenOf`) 해 두었다가 `recordRevelation`에 넘긴다 — 해결 뒤에 다시 판정하면 석판의 읽음이 달라져 결과가 바뀔 수 있다(`9b43bbf`). 순서를 바꾸면 수치가 달라진다.
7. **막기 규칙**은 칸 id 비교다(§3.7, §19-1). 집 안 행동(기도, 신전·대성당·성벽 건설)은 선 진영이면 칸 집합에서 **빼고**, 후 진영이면 검사하지 않는다(막히지 않음, `e68a240`). 나머지 후 진영 행동만 칸 집합과 견준다.
8. **정수 연산**: `floor(pop/4)`, `floor(pop/3)`, `ceil(pop/2)` = `(pop + 1) / 2`(양수), `floor(m/4)`, `ceil(2m/3)` = `(2m + 2) / 3`, 대성당 4×4 `ceil(v×0.7)` = `(7v + 9) / 10`(6 → 5), 6×6 `ceil(v×1.5)` = `(3v + 1) / 2`(6 → 9), 7×7 `v × 2`(6 → 12) — 판 크기 표의 배율(`0.7`, `1.5`, `2`)을 실수로 곱하지 말고 이 정수 식으로 옮기는 편이 안전하다, 신앙 승리 `p.pop >= total × 0.75` = `4 × p.pop >= 3 × total`. GDScript 정수 `/`는 0 쪽으로 자르고 JS `Math.floor`는 아래로 자른다. 인구·장 수·신앙은 이제 음수가 되지 않으므로(갈림길 비용도 0 하한, §19-4) 결과가 같다. 그래도 옛 저장(음수 신앙)을 불러올 수 있으니 「경건한 자」 승점 `floor(faith/3)`은 아래로 자르는 나눗셈(`floori(faith / 3.0)` 등)으로 옮기는 편이 안전하다.
9. **맵 생성의 실수 비교**: `rarest`는 `count / LIMIT`(64비트 실수)로 정렬한다. 같은 리터럴(0.4, 0.34, 0.26, 0.22)과 같은 나눗셈을 쓰면 JS와 같다. 상한 `ceil(rows×cols×LIMIT)`은 §2.2 표 값을 상수로 넣는 편이 안전하다. `rnd() > 0.45`, `rand() < 0.5` 비교도 그대로.
10. **`hashPick`**: 인자를 `str()`로 바꿔 `'|'`로 잇는다(정수 시드는 `"2026"`). 코드 포인트마다 첫 UTF-16 단위를 XOR — 이 게임의 문자열은 모두 BMP라 UTF-16 단위 순회와 같다. 결과는 `uint32(h) % len`. 인자 순서가 호출마다 다르다(§0.3 표).
11. **0 하한**: `max(0, …)`로 막는 곳(공격 패배·승리 인구, 율법파 퇴각 식량, 번개·심판의 날, 침묵 2(저주 −1과 예언 실패 −2는 `8250dd7`에서 없어짐; 전쟁 연속 기적의 율법파 신앙 −2는 `88878b6`, 청원 외면 −1은 `846fd60`에서 없어짐), 갈림길 비용과 양수 적용)과 막지 않는 곳(`capitalHp -= 1` → `<= 0` 판정, 선교 `f.pop -= 1`(전제에서 `> 0` 확인), 대성당 `cathedral -= 1`(`>= 1` 확인 — `d7ad6e0`에서 규칙과 함께 없어졌다))을 구분한다. (율법파 신앙 −10(≥10 확인)은 `c12a1e9`에서 규칙과 함께 없어졌다.)
12. **유지 순서**: 신앙 바닥 판정(`brokeFaith`)은 루프 **전**. 진영 루프는 플레이어 → 율법파, 인구 0인 진영은 통째로 건너뛴다. 신앙 수입은 성장 **뒤** 인구로, 역병은 수입 **뒤**.
13. **`checkVictory` 순서**: 이미 승자면 아무것도 안 한다 → 남은 자(플레이어 → 율법파, 튜토리얼 제외) → 승자가 났으면 끝 → `bothExtinct` → `convertAll` → `edict` → `extinct`(가드 없이 덮어씀) → `faith` → `cathedral`(`3f33be1`, `final`만) → 점수(동점 플레이어). 남은 자는 상태를 바꾸므로(`capitalHp`, `pop = 1`, 기록 — `d7ad6e0` 전에는 `cathedral`도) `final=false` 호출에서도 돈다.
14. **장별 초기화 위치**: `roundMods`는 장 시작 14단계에서 비우고, 말하기 단계 기적(방주·방언·불기둥)과 확정의 말투·갈림길이 다시 채운다. `grace`는 `round`가 다를 때 게으르게 초기화. `miracleUsed`·`reinterpretUsed`·`rainActive`는 장 시작 1단계.
15. ~~**축복 +1은 첫 채집 한 번**: 플레이어 채집 해결 때 `gatherBonus = 0`. 선후와 계획 순서상 첫 플레이어 채집이 받는다.~~ — **없어짐** `8250dd7`(말투가 수치를 잃었다).
16. **`hasUlt`는 장 수까지 본다**: 풍요 궁극의 인구 한도 +2, 지혜 궁극 선택 등은 6칸이어도 8장(4×4 6장 — `sizeRules.at.ult`)부터.
17. **상태 기본값**: 불러오기(`hydrateState`, `engine.js:1186`)는 빠진 필드를 §1.6 기본값으로 채운다. 이식판 저장 형식도 같은 기본값을 둔다. `lawGuard`는 수가 아니면(없거나 `55d33dd` 전의 `{preach, attack}`) 두 칸 중 큰 값(없으면 0)으로 바꾸고(`engine.js:1199`), `rally`는 `false`로 채운다(`rally`는 `e68a240`부터). `doomUsed`(`9b43bbf`)와 `miracleUses`(`87a0fce`)는 `435c3cc`부터 `hydrateState`도 `false`·`{}`로 채운다(`engine.js:1200`) — 이식판도 불러올 때 `false`·`{}`로 채운다. `55d33dd`부터 `state.ruleset`이 10 미만(없으면 0)이면 두 진영의 석판을 `min(edict, edictMax − 1)`로 자르고(12칸 시절 저장본이 새 한계에 닿아 곧바로 지지 않게, `engine.js:1211`) `ruleset = RULESET`으로 적는다(`1201`). `3f33be1`부터 `ruleset`이 16 미만이고 우리 `cathedral > 0`이면 `cathedral = 1`, `crusadeEnd ??= round + 1`(세 단계 시절 공사 중이던 판은 불러온 다음 장이 원정 — §10), 그 밖은 `crusadeEnd ??= null`(`engine.js:1202-1204`) — 이식판도 같게 바꾼다. `petitionIgnored`는 `846fd60`부터 채우지 않는다(옛 저장본에 있으면 읽는 곳 없이 남는다). `config.unlock`(`8ba0ef8`)은 `config` 안에 저장되므로 따로 채울 것이 없다 — 없으면 `veteran`으로 판정한다(§16.2). `revelations[].sig`는 없으면 없는 대로 둔다(글 비교만 된다). `0c95856`부터 두 진영의 `capitalHp`를 `min(capitalHp, CAPITAL_HP)`로 자른다(`engine.js:1201`, `435c3cc` 전 저장본의 내구도 3) — 이식판도 불러올 때 같게 자른다.
18. **칸 id는 한 글자 행 + 1부터 열**: `'ABCDEFGHI'`까지라 최대 9행. 성지·소명 동점 정렬의 문자열 비교는 대문자 한 글자 + 한 자리 숫자라 코드 포인트 비교와 같다.
19. **플레이어만 안개**: `legalActions('player')`는 `revealed`를 보고, 율법파는 보지 않는다. 율법파의 뜻 표시는 난이도 조건과 `revealed`를 함께 본다.
20. **글은 키로**: 로그·거부 사유·청원 문장 등은 모두 언어팩 키(`log.*`, `eng.*`)로 남기고, 정규식 키(`kw.*`)는 번역이 아니라 언어별로 새로 쓴다([05](05-interpreter.md), [i18n](../i18n.md)). 새 로그 키(`88878b6`에서 연속 기적의 `log.streak.*` 다섯을 지웠다): `log.rally`, `log.echo`, `log.attackRetreat`, `log.villageFog`(`846fd60`), `log.lawGuard`(`{n}` — `df1cb16` 전에는 `{kind, n}`, `55d33dd`부터 "…이번 장 우리의 선교·공격에 방어 +{n}."). `log.rallyJoin`(`87a0fce`, 결집의 신도)은 `df1cb16`에서, 석판 까닭 `eng.edict.faith`·`eng.edict.blood`는 `c12a1e9`에서 지웠다. `log.wrathFull`은 `9b43bbf`부터 문자열이 아니라 `{doom}`을 받는 함수다.
21. **메아리의 글 정규화**: JS `/[\s\p{P}]/gu`. JS의 `\s`는 유니코드 공백(NBSP `U+00A0`, 전각 공백 `U+3000`, `U+FEFF` 등)을 포함하지만 Godot `RegEx`(PCRE2)의 `\s`는 기본적으로 ASCII 공백만 잡는다. `[\s\p{Z}\x{FEFF}\p{P}]`처럼 유니코드 공백을 직접 넣어야 같다. `\p{P}`는 PCRE2도 같은 유니코드 범주다.
22. **원정·결집의 상태 의존**: `reach`(따라서 `legalActions('enemy')`, `lawThreat`, 율법파의 뜻)는 `actOf`(장 수)와 대성당(`cathedral >= 1`)에, 율법파 행동 수와 계획은 `state.rally`에 기대므로, 장 시작의 어려움 카드 비교(`lawThreat`)도 원정 거리가 반영된 목록으로 한다. 같은 순서로 계산해야 카드 선택이 같다.
23. **대성당 원정 행동의 위치**: `legalActions('enemy')`에서 성벽 뒤·기도 앞에 들어간다(§3.8 3단계). 율법파 계획의 원정 규칙은 `pool`에서 수도 칸 공격의 **첫째**를 고르므로(`3f33be1` — 그 전에는 `target:'capital'`의 `pickForRule`) 같은 칸 공격이 reach 안의 보통 공격으로 먼저 들어 있으면 그것을(`crusade` 없음) 세 번 고른다. 위치가 결과를 바꾸지는 않지만 `enemyIntent`·`lawThreat`의 목록 순서와 `key`(`attack:<우리 수도>:`)는 같게 둔다. 계획에 같은 행동이 세 번 들어가므로 이식판이 계획을 칸 id로 묶거나 중복을 지우면 안 된다.
24. **엔진이 해석기를 부른다 (메아리의 일 목록)**: `engine.js`는 해석기를 import하지 않고, `interpreter.js`가 읽힐 때 `setPlanSig(fn)`으로 함수를 넣어 둔다(모듈 변수 `planSigFn`, `engine.js:770-772`). 해석기를 싣지 않으면 `planSig`는 `''`이라 메아리가 글로만 판정된다 — 골든·테스트 구동기는 해석기를 불러오므로 일 판정이 켜져 있다. 이식판은 엔진에 `Callable`을 주입하거나 엔진이 석판을 직접 부르게 하되, **석판이 없는 엔진 단독 테스트에서는 메아리가 달라진다**는 것을 알아 둔다. 목록은 `orders`의 종류 키를 중복 없이 JS 기본 `sort()`(UTF-16 코드 단위 순)로 정렬해 `'|'`로 잇는다 — 키가 모두 ASCII라 Godot `PackedStringArray.sort()`와 같다.
25. **판 크기 보정은 `rows`로 표를 찾는다** (`7a28084`): `sizeRules = MAP_SIZES[rows] ?? MAP_SIZES[5]`. 정사각 판뿐이라 `rows`와 `cols`가 같지만 `rows`로 찾는다. `data.json`의 `MAP_SIZES`는 숫자 키가 문자열이므로(`"4"`…`"7"`, [03](03-data.md)) `str(rows)`로 찾고 없으면 `"5"`. 튜토리얼(3×3)은 5×5 줄을 받지만 대성당 비용·마을 더하기·율법파 행동은 `tutorial`이면 ×1·0·0이다. `cathedralCost`만 실수일 수 있고(0.7, 1, 1.5, 2) 나머지 칸은 정수다.
