# 01. 개요 — 말씀이 있으라 (Let There Be)

> 이 폴더(`docs/spec/`)는 웹판(JS)을 **엔진과 무관한 명세**로 옮긴 것이다. Godot 4로 다시 만들 때 코드를 보지 않고도 같은 게임을 만들 수 있게 하는 것이 목표다.
> 코드와 문서가 다르면 **코드가 기준**이다. 이 문서들은 2026-09-27 커밋(`8b91681`) 기준으로 쓰였고, 2026-09-30 재조정(`afab303`)·수도 막기 수정(`5b7a94f`)·휴대폰 배치(`3092cf1`)·석판 어휘(`1b582ee`)·남은 자(`448f553`)·명세 검토 수정(`e68a240`: 막기 대칭, "~지 말고" 전부 금지, `RULESET` 5 등)·3차 균형(`9b43bbf`: 심판의 날 한 번, 신앙 승리 개종 조건, 큰 판 보정, 일 메아리)·석판의 곳과 수의 말(`78c891e`: 칸 고르기, 칩 옮기기)을 반영해 고쳤고, 그 뒤 4차~6차(`87a0fce`~`0a0a974`)와 7차(`df1cb16` 되풀이 규칙 하나·결집의 신도 삭제, `16492f4` 보통에서 율법파의 뜻을 거의 다 보임·석판의 대조와 곳의 말·인용 삭제, `c12a1e9` 율법 석판은 성지·율법파 신전·번개로만 — 10칸)과 `55d33dd`(대성당 원정의 공격 +1 삭제, 율법파의 대비는 비용의 "되풀이"와 같은 판정으로 다음 장 시작에, 옛 저장본의 석판 자르기)도 반영했다. 문서마다 머리에 기준 커밋이 있다.

## 한 줄

플레이어는 **말(계시)로만 세상을 움직이는 신**이다. 매 장 한 줄의 계시를 적으면 대사제(LLM 또는 키워드 해석기)가 그 뜻을 헤아려 신도들의 일을 정하고, 신 없이 **율법 카드**대로만 움직이는 이웃 부족 **율법파**와 육각 보드 위에서 겨룬다.

## 설계 기둥

| 기둥 | 뜻 | 구현의 중심 |
|---|---|---|
| 말이 규칙이 된다 | 계시의 낱말·말투·이름·예언·곳(칸 이름·지형)·되풀이가 게임 효과가 된다 (예전의 인용은 `0c95856`에 비용 효과를 잃고 `16492f4`에서 없어졌다) | 해석기 + 말의 장치 ([05](05-interpreter.md)) |
| LLM은 해석과 서사만 | 판정·전투·자원은 전부 결정론적 규칙 엔진이 한다. LLM은 "가능한 행동 목록"의 ID 중에서만 고른다 | `engine.js` ([02](02-rules.md)) |
| 읽을 수 있는 적 | 율법파는 스크립트 오토마. 이번 장의 뜻(행동)이 난이도만큼 미리 보인다(보통은 기도만 빼고 모두 — `16492f4`). 막이 갈수록 멀리 닿고 칼을 들며, 크게 앞서면 결집하고, 되풀이한 말씀을 읽고 대비한다(`df1cb16`) | 율법 카드, 지도자, 율법파의 뜻, 원정·결집·되풀이를 읽는 율법 ([02 §4.9](02-rules.md#49-율법파의-반격--원정칼대체-마을결집퇴각되풀이를-읽는-율법)) |
| LLM 없이도 끝까지 | 키워드 "석판" 해석기로 모든 기능을 쓸 수 있다 | `interpretWithTablet` |
| 재현 가능 | 같은 시드 → 같은 맵·같은 덱·같은 주사위 | 시드 RNG 스트림 ([04](04-architecture.md)) |
| 판 밖에 남는 것 | 경외·은사·성서·서고·시련·승천 | 메타 진행 ([07](07-progression.md)) |

## 핵심 루프 (한 장)

```mermaid
flowchart LR
  A[장 시작<br/>계절·율법 카드·청원·율법파의 뜻] --> B[계시 쓰기<br/>신앙 1~2 · 알아들은 말이 바로 보인다]
  B --> C[대사제 해석<br/>LLM 또는 석판]
  C --> D[확인<br/>칩 빼기 · 다시 해석 · 말 거두기 · 예언 봉인]
  D --> E[동시 공개와 해결<br/>채집→건설→기도→탐험→선교→공격]
  E --> F[갈림길 결과 · 유지<br/>식량·신앙 수입·인구]
  F --> G{승패?}
  G -- 아니오 --> A
  G -- 예 --> H[종료 화면 · 에필로그 · 경외]
```

- 기적(손패 카드)은 장당 하나, 계시 전에 쓴다. 침묵(계시 없이 넘기기)도 선택지다.
- 승리 길: 적 수도 점령(포위하면 쉬워진다), 신앙 승리(장 끝에 인구 3/4, 선교로 데려온 이 둘 이상 — 빠른 판은 하나), 대성당 완공(단계마다 마을이 필요하고 큰 판은 더 많이, 공사가 시작되면 율법파가 선공을 쥐고 거리와 무관하게 수도로 원정한다 — 맞을 때마다 한 단계 무너진다; `55d33dd` 전에는 원정 공격 +1), 마지막 장 승점. 율법파는 율법 석판 10칸을 채우면 이긴다(두 번째 판부터 — 2막부터 성지를 쥔 쪽이 장마다 한 칸씩 올리거나 내리고, 율법파 신전 +2, 번개로 율법파 수도를 치거나 심판의 날이면 −2, 미라를 품으면 +1; `c12a1e9` 전에는 12칸이고 율법파 신앙·우리 칼로도 올랐다).
- 수도가 서 있는 한 부족은 사라지지 않는다(남은 자): 신도가 모두 쓰러지면 수도가 흔들리고 한 명이 돌아온다. 그래서 전멸·전원 개종은 따로 끝나는 길이 아니라 점령으로 가는 길이다(튜토리얼 제외).
- 같은 글을 되풀이하거나, 말만 바꿔 석판이 읽는 일이 지난 두 계시 가운데 하나와 같으면 무뎌진다(메아리: 신앙 +1, 교리 없음). `df1cb16`부터는 되풀이하면 율법파도 그 말씀을 읽고 다음 장 우리 선교·공격에 대비한다(방어 +1, 이어지면 +2 — `55d33dd`부터 비용의 "되풀이"와 같은 판정). 계시에 곳("강가에", "율법파의 수도를", "E4에")과 수("두 곳")를 말하면 석판이 그 칸·그만큼 고르고, 확인 화면에서 칩을 ⇄로 다른 칸에 옮길 수 있다.

## 판의 크기

| 맵 | 장 수 | 비고 |
|---|---|---|
| 3×3 | 5 | 튜토리얼 (안내자: 사관 세라) |
| 4×4 | 8 | 빠른 판 |
| 5×5 | 12 | 기본 |
| 6×6 | 12 | |
| 7×7 | 14 | |

난이도는 쉬움·보통·어려움이고, 어려움에서 승천 1~5가 열린다. 첫 판은 기능이 줄어 있고, `8ba0ef8`부터 **판을 끝낼 때마다 한 묶음씩** 모듈이 열린다(`config.unlock`): 두 번째 판 율법 석판, 세 번째 판 심판의 기준·소명, 네 번째 판 대사제 성향·기적 드래프트·갈림길·세 막, 다섯 번째 판 교리 대립·영원한 계명·검열·미라. `config.veteran`(끝낸 판이 하나라도 있음)은 침묵 벌·말 거두기 비용·정경·최고 기록만 가른다 — 목록은 [02 §16.2](02-rules.md#162-모듈-해금-configunlock과-두-번째-판부터-configveteran).

## 용어집 (한국어 ↔ 영어 ↔ 코드)

Godot 코드의 이름을 정할 때 오른쪽 열을 그대로 쓰면 JS 코드·골든 테스트와 대응시키기 쉽다.

| 한국어 | 영어(제안) | 코드 식별자 |
|---|---|---|
| 계시 | revelation | `state.revelations`, `recordRevelation` |
| 대사제 | high priest (interpreter) | `PRIESTS`, `interpretWithLLM` |
| 석판 (해석기) | tablet parser | `interpretWithTablet` |
| 우리 부족 / 신도 | player tribe / followers | side `'player'`, `pop` |
| 율법파 | Law faction (automa) | side `'enemy'` |
| 장 / 막 | round / act | `round`, `maxRounds`, `ACTS`, `actOf` |
| 계절 | season (event) | `EVENTS`, `state.event` |
| 율법 카드 | law card | `LAW_CARDS`, `state.lawCard` |
| 율법파의 뜻 | enemy intent | `enemyIntent`, `planEnemy` |
| 율법 석판 | edict tablet | `edict`, `EDICT_MAX`, `raiseEdict` |
| 원정 · 막마다 칼 · 결집 · 퇴각 | march · zeal · rally · retreat | `marchRange`, `ZEAL_ACT`, `state.rally`, `log.attackRetreat` |
| 되풀이를 읽는 율법 (예전 이름: 되풀이에 굳는 율법·굳은 율법) | law guard | `state.lawGuard`, `lawGuardOf`, `braceLaw` (`55d33dd` 전 `updateLawGuard`) |
| 포위 · 남은 자 | siege · remnant | `siegeOf`, `remnant` |
| 지도자 | leader | `ENEMY_LEADERS`, `state.leader` |
| 식량·목재·돌·신앙 | food · wood · stone · faith | `food`, `wood`, `stone`, `faith` |
| 채집·건설·기도·탐험·선교·공격 | gather · build · pray · explore · preach · attack | 행동 `type` |
| 마을·성벽·신전·수도 | village · wall · temple · capital | `building`, `wall`, `temple`, `CAPITAL_HP` |
| 대성당 | cathedral | `CATHEDRAL`, `sides.player.cathedral` |
| 성지 | holy site | `holyId` (지형 `hill`) |
| 선공(선) | first player | `state.first` |
| 교리 (평화·전쟁·풍요·지혜) | doctrine (peace·war·abundance·wisdom) | `DOCTRINES`, `doctrine[k]`, `DOCTRINE_MAX` |
| 궁극 | ultimate | `ULT_ROUND`, `hasUlt` |
| 연속 (작은 기적) | streak | `streak` |
| 기적 / 신의 분노 / 심판의 날 | miracle / wrath / doom | `MIRACLES`, `wrath`, `DOOM` |
| 청원 · 은총 · 서원 | petition · grace · vow | `petition`, `grantGrace`, `vow` |
| 말투 (축복·저주·비유) | tone (blessing·curse·metaphor) | `TONES`, `detectTone` |
| 이름 붙이기 | naming | `parseNaming`, `state.names` |
| 예언 | prophecy | `PROPHECY`, `parseProphecy`, `state.prophecy` |
| ~~인용~~ | citation | 없어졌다 — `citedWords`·`ui.tag.cited`는 `16492f4`에서 지웠다 |
| 메아리 (지난 계시를 되풀이 — 글 또는 일) | echo | `isEcho`, `spokenOf` |
| 알아들은 말 | heard words (live parse line) | `heardHTML`, `interpretWithTablet().heard` |
| 뜻을 헤아림 (교리를 따른 기본 노동) | heeded labour | `autoFill(…, doctrine)`, 행동 `heeded` |
| ~~성언 (세 번 쓴 구절 = 전례)~~ | ~~sacred saying (liturgy)~~ | 없어졌다(`afab303`). 남아 있던 `state.liturgy` 필드도 `e68a240`에서 지웠다 |
| 오늘의 숨은 말 | hidden word of the day | `SACRED_WORDS`, `state.sacred` |
| 영원한 계명 | eternal commandment | `COMMANDMENTS`, `commandments` |
| 침묵 | silence | `applySilence`, `silentRun` |
| 봉인된 말(검열) | banned words | `bannedWords` |
| 갈림길 | dilemma | `DILEMMAS`, `pendingDilemma` |
| 분열의 예언자 미라 | Mira the schismatic | `MIRA` |
| 소명 | destiny | `DESTINIES` |
| 심판의 기준 | judgement (scoring rule) | `JUDGEMENTS`, `state.judgement` |
| 성인 · 전설 | saint · legend | `saints`, `legends` |
| 발견지 · 지형 특징 | site · feature (oasis, quarry) | `SITES`, `FEATURES` |
| 경외 · 칭호 · 은사 | awe · title · blessing | `AWE_LEVELS`, `AWE_TITLES`, `BLESSINGS` |
| 성서 · 서고 · 도감 · 정경 | bible (achievements) · library · codex · canon | `ACHIEVEMENTS`, `meta.*` |
| 시련 · 승천 · 오늘의 계시 | trial · ascension · daily | `TRIALS`, `ASCENSION`, `dailyConfig` |
| 사관 세라 | Sera the scribe (tutorial NPC) | `tutorial.js` |
| 연대기 · 제단 · 두루마리 | chronicle · altar · scroll | UI (`#chronicle`, `#altar`, `.scroll`) |
| 판 결과 종류 | win kind | `state.winKind` |

## 문서 지도

| 문서 | 내용 |
|---|---|
| [01 개요](01-overview.md) | 이 문서 |
| [02 규칙](02-rules.md) | 모든 규칙: 맵 생성, 장 진행, 행동, 주사위, 율법파, 교리, 기적, 사건, 승패 |
| [03 데이터](03-data.md) | 데이터 표 스키마 — 실제 값은 [`docs/export/data.json`](../export/data.json) |
| [04 구조](04-architecture.md) | JS 모듈 구조, 상태 객체, 결정론(RNG·해시), 저장, 화면 컨트롤러 |
| [05 해석기](05-interpreter.md) | 계시 → 명령: LLM 프롬프트·스키마, 석판 파서, 말의 장치 전부 |
| [06 UI/UX](06-ui-ux.md) | 화면·단계별 UI, 보드 그리기, 디자인 토큰, 연출, 소리, 반응형, 접근성, 튜토리얼 |
| [07 진행](07-progression.md) | 판 밖의 진행: 저장 키, 경외·은사·성서·서고·시련·승천·오늘의 계시 |
| [Godot 이식 가이드](../godot/PORTING.md) | Godot 4 구조 제안, 단계별 이식 순서, 검증 방법 |
| [언어팩](../i18n.md) · [제목](../naming.md) | 번역 구조, 제목 결정 |
| [티켓 101](../tickets/README.md) | 기능 하나하나의 설계 이유와 검토 기록 |
