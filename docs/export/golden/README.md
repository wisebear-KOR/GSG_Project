# 골든 벡터 — 엔진 동등성 시험

JS 엔진으로 끝까지 둔 판의 **장별 기록**이다. Godot판이 같은 설정·같은 계시로 같은 판을 만들어 내는지 장마다 비교하는 데 쓴다. 생성물이므로 손으로 고치지 않는다: `node tools/golden.mjs`.

- 구동기는 **석판(키워드) 해석기** 경로를 `js/game/main.js` 그대로 따라 한다 (LLM·화면 연출·메타 저장은 뺀다).
- 결정론: 난수는 엔진의 시드 스트림(`state.rng.deck`, `state.rng.dice`)뿐이고 시각을 넣지 않는다. 두 번 돌려도 바이트까지 같다 (아래 "다시 만들기").
- 글(로그 문장·해석문·거절 이유)은 한국어 언어팩 그대로다.
- 지금 파일은 `1c81cd4`에서 다시 만든 것이다(`ruleset` 21 — 이 문서를 고치며 `39500e9`에서 `node tools/golden.mjs`를 다시 돌려 11판과 `index.json` 모두 커밋된 파일과 바이트까지 같음을 확인했다; `39500e9`의 석판 변경은 골든 계시에 닿지 않는다). `1c81cd4`(저울 하나 — 6점 이상 뒤진 쪽은 다음 장 행동 +1, 신의 분노·심판의 날·결집의 공격 먼저 삭제; 대성당 4·4·4; 평화 궁극은 마지막 한 명을 데려오지 않음): 튜토리얼·`s4-easy-first` 밖 **아홉 판**이 바뀌었다. 저울은 1장 기록부터 걸린다 — 율법파 쪽(`log.rally` "저울이 기운다 — 우리가 6점 넘게 앞서자 율법파가 결집한다…", `fx.kind: 'rally'`)은 `s4-easy-first-war` 1·5장, `s5-easy-first-war` 5장, `s5-normal-first` 3장, `s6-easy-veteran` 3장, 우리 쪽(`log.scaleUs` "저울이 기운다 — 6점 넘게 뒤진 우리 신도들이 힘을 낸다…", `fx.kind: 'wrath'`)은 `s4-hard-veteran-asc4` 1장(승천 4라 8점), `s5-hard-veteran` 3장, `s5-normal-first` 6·9장, `s6-easy-veteran` 10장, `s6-normal-veteran` 1·4장, `s7-hard-first` 5장, `s7-normal-veteran` 1·5장에 기울었다(풀릴 때는 기록이 없다). 처음 갈린 곳은 다음 장의 손 수다 — 율법파: `s4-easy-first-war` 2장 채집 하나 더, `s5-normal-first` 4장 채집 둘 더(신도 수에 묶이지 않는다), `s6-easy-veteran` 4장 마을 하나 더, `s5-easy-first-war` 6장은 결집의 공격 먼저(B1)가 빠지고 채집; 우리: 헤아린 노동이 한 손 더 — `s4-hard-veteran-asc4` 3장·`s5-hard-veteran` 6장·`s7-normal-veteran` 6장의 식량. `s6-normal-veteran`·`s7-hard-first`는 우리 쪽이 기울었어도 남는 손이 쉬어 기록 글만 바뀌었다. 결과: `s5-normal-first` 율법파 19:26 → **우리 30:21**, `s4-easy-first-war` 27:11 → 32:8, `s5-easy-first-war` 26:12 → 31:23, `s5-hard-veteran` 11장 석판 22:51 → 17:55, `s4-hard-veteran-asc4` 8장 수도 함락 6:27 → **5장** 2:30(4장 율법파의 공격으로 내구도 1, 5장 우리 공격이 둘 다 막혀 마지막 신도를 잃고 **남은 자**로 무너짐); `s6-easy-veteran` 44:40·`s6-normal-veteran` 10:59·`s7-hard-first` 15:62·`s7-normal-veteran` 35:60은 그대로. 신의 분노·심판의 날은 더 나오지 않는다(digest의 `wrath`는 늘 0). 그 전 파일은 `238120e`에서 만든 것이었다(`ruleset` 20 — `238120e`에서 바이트까지 같음을 확인했다). `238120e`(마지막 한 명은 설득되지 않음, 데려온 개종만 셈, 칼·말씀의 말씀은 선교뿐, 석판 어휘, 믿음의 표식 n/3): 일곱 판이 바뀌었으나 결과가 달라진 것은 `s4-hard-veteran-asc4`뿐이다 — 5장이 끝날 때 우리 신도가 하나라 율법파의 선교가 합법 행동에서 빠지고, 6장 어려움의 율법 카드 고르기(`lawThreat`)가 L7 → L6이 되어 판이 갈렸다. 7장 율법파의 선교는 "설득할 이가 없었다"로 실패하고, **8장 율법파의 공격**이 수도를 무너뜨렸다(6장 남은 자 8:25 → 8장 6:27). 나머지는 글만: 기록 "믿음의 표식 1/3"(`s5-easy-first-war`·`s5-normal-first`·튜토리얼)과 데려오지 못한 선교의 "1명이 흩어졌다(살 곳이 없어 오지 못했다)"(`s5-easy-first-war` 율법파, `s6-normal-veteran` 우리), 평화 교리만의 계시의 연속 점이 `null`(`s5-hard-veteran`·`s6-normal-veteran`·`s7-normal-veteran`). 그 전 파일은 `76c0053`에서 만든 것이었다(`ruleset` 19 — `76c0053`에서 바이트까지 같음을 확인했다). `76c0053`(마을은 선교 세 번에, 인구가 가득 차면 데려오지 못하는 개종, 헤아린 손은 이미 둘인 일을 고르지 않고 열혈은 전쟁·평화 계시에서만 칼·말씀을 먼저, 석판의 지형·성벽 없는 곳·차지): 여섯 판이 바뀌었다 — 처음 갈린 곳은 헤아린 손이다: `s4-hard-veteran-asc4` 2장 "높은 신전을 쌓아 나를 섬겨라"(열혈, 지혜 계시)의 공격 → 탐험, `s5-normal-first` 4장·`s6-easy-veteran` 4장·`s7-normal-veteran` 5장 "안개 너머를 탐험하라"의 셋째 탐험 → 기도(같은 일 둘까지), `s6-normal-veteran` 7장 기본 노동. 결과: `s4-hard-veteran-asc4` 7장 수도 함락 8:27 → **6장** 8:25(6장 남은 자), `s5-normal-first` 20:25 → 19:26, `s6-easy-veteran` 46:36 → 44:40, `s6-normal-veteran` 19:54 → 10:59(12장 율법파가 우리 수도를 쳤다), `s7-normal-veteran` 36:60 → 35:60; `s5-easy-first-war`는 율법파가 굶은 기록 한 줄만 없어졌다(결과 그대로). 그 전 파일은 `24927a6`에서 만든 것이었다(`ruleset` 18 — `24927a6`에서 바이트까지 같음을 확인했다). 첫 맵은 모두 그대로다(`637c05a`의 성지 보호는 골든 시드에서 지형을 바꾸지 않았다). `637c05a`(칼·말씀 읽힘, 결집 8·4점과 신도 수에 묶이지 않는 손, 석판 어휘): 두 판이 바뀌었다 — `s4-easy-first-war` 7장 결집한 율법파가 신도가 줄었는데도 손을 다 써 채집 둘을 더했다(23:11 그대로), `s5-easy-first-war`는 결집이 5장에 켜져(12점 → 8점) 6장 율법파가 B1을 치는 등 판이 달라졌다(24:13 → 26:12; 11장에 메아리, 12장 대비). `24927a6`(풍년 평원·강 +2, 가뭄 −2, 평온한 장 우리 선교 +1, 기도한 장의 역병 면함, 석판의 같은 일 둘까지): **11판이 모두** 바뀌었다 — 수확량이 바뀌어 기본 노동이 달라졌고(`s4-easy-first-war` 5장 식량 둘이 빠짐, `s5-easy-first-war`·`s5-hard-veteran`·`s6-*` 3~10장 식량 하나가 더해짐), `s5-normal-first` 9장 "너희는 들판에서 곡식을 거두고 숲에서 나무를 베어 겨울을 준비하라"는 식량 셋·목재 하나가 식량 둘·목재 둘이 되었고(같은 일 둘까지), `s7-normal-veteran` 6장부터 율법파가 마을 대신 채집을 한다. 결과: `s4-easy-first` 17:23 → 19:21, `s4-easy-first-war` 23:11 → 27:11, `s4-hard-veteran-asc4` 8:30 → 8:27(7장 수도 함락 그대로), `s5-hard-veteran` 22:49 → 22:51(11장 석판 그대로), `s5-normal-first` 20:26 → 20:25, `s6-easy-veteran` 44:34 → 46:36, `s6-normal-veteran` 19:53 → 19:54, `s7-normal-veteran` 13장 율법 석판 17:64 → **14장 승점 36:60**; `s5-easy-first-war`(26:12)·`s7-hard-first`(15:62)·튜토리얼(24:22)은 결과 그대로(`s7-hard-first`·튜토리얼은 글만). 그 전 파일은 `3f33be1`에서 만든 것이었다(`ruleset` 16 — `3f33be1`에서 바이트까지 같음을 확인했다). `3f33be1`(성지 자리 `holyFor`, 섞인 전쟁·평화도 읽음, 연속 점은 전쟁·평화만, 대성당 한 번 짓기, 석판의 곁말·넉넉함·일을 두고 한 말·짚은 금지·`takes`): **11판이 모두** 바뀌었다. 성지 자리가 맵 생성의 언덕을 옮겨 4×4 세 판·`s5-normal-first`·7×7 두 판의 첫 맵이 달라졌다 — 성지 칸이 바뀐 판은 `s4-easy-first-war`·`s4-hard-veteran-asc4`(C4 → B1), `s5-normal-first`(C3 → D4 — 발견지도 B2·D4 → B1·D5), `s7-normal-veteran`(E5 → C3)이고, `s4-easy-first`·`s7-hard-first`는 성지는 그대로지만 가운데 칸에 서던 언덕이 성지 칸으로 옮겨 갔다. 모든 판의 `streak`이 풍요·지혜 계시에서 `null`이 되었고(그래서 `s5-hard-veteran`·`s6-*`·튜토리얼은 이 글만 바뀌었다 — `s5-hard-veteran`은 7장에 섞인 전쟁·평화로 새 대비 +1도), `s5-normal-first`는 9장 대비가 +2가 되었다. 석판: "성벽을 쌓아 우리 땅을 지켜라"가 성벽만이다(`땅을 지키`가 마을 제외어 — `s5-easy-first-war`·`s7-hard-first` 4장, `s7-normal-veteran` 13장에서 마을이 빠졌다). 결과: `s4-easy-first-war` 24:15 → 23:11, `s4-hard-veteran-asc4` 6장 수도 함락 4:29 → **7장** 수도 함락 8:30(7장 율법파의 선교로 마지막 신도를 잃어 남은 자로 무너짐), `s5-easy-first-war` 32:8 → 24:13, `s7-hard-first` 22:52 → 15:62, `s7-normal-veteran` 14장 승점 28:66 → **13장 율법 석판** 17:64(성지가 C3로 옮긴 판); 나머지 여섯 판은 결과가 그대로다. 대성당을 짓는 판은 여전히 없다. 그 전 파일은 `e174a18`에서 만든 것이었다(`ruleset` 15 — `e174a18`에서 바이트까지 같음을 확인했다). `e174a18`(채집·기도뿐인 계시는 메아리가 아님, 율법파는 전쟁·평화의 세 장만 읽음, 율법파가 선공인 장에 짚지 않은 일이 율법파가 먼저 차지할 칸을 피함, 금지어 `지 마`, 튜토리얼 제안 "땅을 넓혀 마을 두 곳을 세워라"): 아홉 판이 바뀌었다(`s6-easy-veteran`·`s4-hard-veteran-asc4`는 그대로). 튜토리얼 대본의 3장이 새 제안이라 마을이 둘이고 **우리 24:22**로 끝난다(`d7ad6e0`에는 율법파 17:24). 살림뿐인 계시의 메아리가 없어졌다 — `s5-hard-veteran` 10장 "높은 신전을 쌓아 나를 섬겨라", `s6-normal-veteran` 4장 "검은숲에서 나무를 베어라", `s7-normal-veteran` 6장 "언덕에 올라 나를 찬양하라"의 비용 2 → 1, `s4-easy-first`는 메아리가 하나도 없다; 풍요 세 장으로 읽히던 `s4-easy-first`·`s6-normal-veteran`·`s7-hard-first` 4장의 대비도 없어졌다. 율법파가 선공인 장의 과녁 피하기: `s4-easy-first` 5장 식량 D1 → B1, `s4-easy-first-war` 5장 마을 A1 → A2, `s5-normal-first` 5장 식량 D2 → E1, `s5-easy-first-war` 8장 "성벽을 쌓아 우리 땅을 지켜라"의 성벽 B1 → E2(율법파가 칠 B1에서 비켜 간다 — [KNOWN-ISSUES B42](../../godot/KNOWN-ISSUES.md); 헤아린 손이 B1 성벽을 따로 쌓았다). 결과: 튜토리얼 율법파 17:24 → 우리 24:22, `s4-easy-first` 15:23 → 17:23, `s4-easy-first-war` 23:13 → 24:15; 나머지는 승점이 그대로다(`s7-hard-first`는 기록 글만). 그 전 파일은 `d7ad6e0`에서 만든 것이었다(`ruleset` 14 — `d7ad6e0`에서 바이트까지 같음을 확인했다). `1fbb160`("가장 먼 곳", 읽힘 예고의 `{n}`)은 골든 파일을 다시 쓰지 않았다(골든 대본에 "가장 먼"·"가장"·"제일"이 없다). `d7ad6e0`(곳을 말하지 않은 공격·선교는 우리 땅에서 가장 가까운 율법파 칸, 짓는 일은 수를 말하지 않으면 한 손, 무너지지 않는 대성당·단계마다 마을 하나): **11판이 모두** 바뀌었다. 골든 대본에는 "약한"·"성벽 없는" 같은 말(`kw.place.weakest`)이 없어 공격·선교는 모두 가까운 순이다 — `s7-hard-first` 8장 "그들의 수도를 쳐라" E2 → F2, 14장 "율법파의 마을을 쳐라" E4·D1 → E1·F1, `s4-hard-veteran-asc4` 5장 같은 문장 D1·D3 → C2·C3(율법파가 성벽을 예고한 C2도), `s5-hard-veteran` 6장 C3·D2 → C2·D2, `s6-easy-veteran` 12장 F3·C3 → C3·D3. "땅을 넓혀 새 마을을 세워라"는 마을 하나다. 결과: `tutorial-3x3` 우리 24:22 → **율법파 17:24**(3장 마을이 하나라 5장에 율법파가 B1에 마을을 세우고 신전을 높인다 — [KNOWN-ISSUES A43](../../godot/KNOWN-ISSUES.md)), `s5-hard-veteran` 6장 수도 함락 10:28 → 다시 **11장 율법 석판 22:49**, `s6-normal-veteran` 26:58 → 19:53(이름 붙이기 "검은숲"이 3장 은총을 다시 받는다), `s6-easy-veteran` 47:30 → 44:34, `s7-hard-first` 25:55 → 22:52, `s7-normal-veteran` 33:66 → 28:66; `s4-easy-first` 15:23, `s5-normal-first` 20:26, `s4-easy-first-war` 23:13, `s5-easy-first-war` 32:8, `s4-hard-veteran-asc4` 6장 4:29는 그대로다. 대성당 공사는 골든에 없어 새 대성당 규칙은 드러나지 않는다. 그 전 파일은 `8250dd7`에서 만든 것이었다(`ruleset` 13 — `8250dd7`에서 바이트까지 같음을 확인했다). `8250dd7`(은총 하나 — 말투의 수치·첫 이름의 지혜 +1·비유의 교리 +1 삭제, 이룬 예언은 은총·빗나가도 벌 없음; 석판의 절 하나는 손 둘; 플레이어의 남는 손은 모자란 것만): **11판이 모두** 바뀌었다. 계획이 달라졌다 — 수를 말하지 않은 절이 두 곳을 맡고("율법파의 마을을 쳐라" → 공격 둘), 자동 노동은 모자란 것만 채워 쉬는 손이 생긴다(`s6-easy-veteran`의 계획 길이는 2장부터 늘 4였는데 이제 1~4). 예언은 은총이 되었다 — `s5-normal-first` 6장에 봉인한 "율법파의 마을이 무너지리라"가 7장에 이루어져 은총(그 전에는 빗나가 −2), `s6-normal-veteran` 6장 "이웃이 말씀으로 돌아오리라"는 +3 대신 은총 +1, `s6-easy-veteran` 3장의 "신도가 불어나리라"는 5장에 빗나가지만 벌이 없다(그 전에는 이루어져 +2); 은총 기록의 글은 "예언 “…리라”이 이루어졌다"(조사 고정 — [KNOWN-ISSUES E7](../../godot/KNOWN-ISSUES.md)). 장당 은총 하나라 `s6-normal-veteran` 3장의 이름 붙이기("검은숲")는 청원 은총에 밀려 은총이 없다. 결과: `tutorial-3x3` 17:17 → 24:22, `s4-easy-first` 15:24 → 15:23, `s5-normal-first` 23:27 → 20:26, `s5-hard-veteran` 11장 율법 석판 31:47 → **6장 수도 함락 10:28**(5장 율법파의 공격으로 내구도 1, 6장 남은 자), `s6-normal-veteran` 19:53 → 26:58, `s6-easy-veteran` **율법파 39:42 → 우리 47:30**, `s7-hard-first` 36:52 → 25:55, `s7-normal-veteran` 25:66 → 33:66, `s4-easy-first-war` 27:13 → 23:13, `s5-easy-first-war` 36:8 → 32:8, `s4-hard-veteran-asc4` 7장 6:30 → **6장 4:29**(4장 율법파의 공격으로 내구도 1, 6장 남은 자 — 그 전에는 남은 자 두 번). 칙령(율법 석판)으로 끝나는 판은 없어졌다. 그 전 파일은 `95eca5f`에서 만든 것이었다(`ruleset` 12 — `95eca5f`에서 바이트까지 같음을 확인했다). `d3fe641`(교리 없는 메아리가 연속을 비움)은 `s6-easy-veteran` 6장 `digest.streak` 한 곳(`{wisdom, 2}` → `null` — 6장 "안개 너머를 탐험하라"가 교리 없는 메아리)만, `95eca5f`(전쟁 교리의 헤아린 손은 성벽부터; 나머지 석판 변경은 골든 계시에 닿지 않았다)는 `s7-hard-first` 14장 "율법파의 마을을 쳐라"의 헤아린 손을 G1 공격 → C1 성벽으로 바꿔 E1이 원정대를 물리치고 **율법파 29:55 → 36:52**가 되었다. 그 전 파일은 `88878b6`에서 만든 것이었다(`ruleset` 12 — `1cc1887`에서 바이트까지 같음을 확인했다; `d6167fc`·`1cc1887`은 골든에 닿지 않는다). `88878b6`(연속 작은 기적 삭제 — 같은 교리를 세 장 이어 말하면 율법파가 읽는다, 전쟁 교리 4칸은 공격 +1 대신 성벽 돌 1, 대비 기록은 "율법파가 우리의 말씀을 읽고…"이고 칸은 우리 수도, `RULESET` 12): 튜토리얼과 `s5-hard-veteran` 밖 아홉 판이 바뀌었다. 여섯 판은 기록만 — 대비 줄의 글과 `fx.tile`(율법파 수도 → 우리 수도), `digest.streak`(3에서 멈추고 비지 않으며 메아리도 센다). 3장에 풍요 연속 기적("말씀이 세 장 이어졌다 — 풍요의 기적. 곳간이 넘친다. 식량 +4.")이 났던 세 판은 그 기적이 없어지고 4장에 대비(+1)가 걸린다 — `s4-easy-first`(4장 헤아린 노동의 순서가 바뀌고 5장에 청원 은총, 결과 그대로), `s6-normal-veteran`(4장 +1, 5장 +2; 11장 갈림길 「떠돌이 상인」의 곡식을 치를 수 없어 「보낸다」로, 결과 그대로), `s7-hard-first`(4장 헤아린 노동 F2 목재 → G3 식량부터 판이 갈려 **율법파 39:46 → 29:55**). 전쟁 4칸의 성벽 값은 골든에서 드러나지 않았다. 그 전 파일은 `846fd60`에서 만든 것이었다(`ruleset` 11 — `846fd60`에서 바이트까지 같음을 확인했다). `846fd60`(포위·성인 보정·청원 외면 벌 삭제, 안개 속 율법파 마을의 기록, 지도자 반박 돌림, 석판 어휘·한 절에서 같은 자원 두 번 없음, `RULESET` 11): 튜토리얼 밖 열 판이 바뀌었다(튜토리얼은 그대로). 대부분은 기록만이다 — 외면 벌 줄("청원이 거듭 외면당해…신앙 -1.")이 빠져 그 뒤 신앙이 늘고, "율법파가 안개 지대(C3)를 세웠다"가 `log.villageFog` "율법파가 안개 속(C3)에 마을을 세웠다"로, 성인 기록에서 "(수도 방어 +1)"이 빠지고, 지도자 반박(`leader` [ui] 줄)이 돌아가며 나온다. 수호자 성인이 있던 판(`s4-hard-veteran-asc4` 4장, `s5-hard-veteran` 7장, `s5-normal-first` 12장, `s6-normal-veteran` 9장, `s7-hard-first` 9장)은 율법파가 우리 수도를 친 주사위의 방어 보정이 1 줄었지만 모두 그대로 막혔다. 계획이 바뀐 판은 둘 — `s4-easy-first` 1장·`s6-easy-veteran` 2장 "강물이 너희를 먹이리라"가 식량을 한 번만 거둔다(강 규칙만; 그 전에는 `먹` → 식량 규칙도 한 칸 더). 결과는 `s6-easy-veteran`만 38:42 → 39:42(율법파 승 그대로). 포위는 골든에서 드러나지 않았다(우리 수도 공격 판정에 포위 보정이 붙은 장이 없었다). 그 전 파일은 `55d33dd`에서 만든 것이었다(`ruleset` 10 — `55d33dd`에서 바이트까지 같음을 확인했다). `55d33dd`(대성당 원정의 공격 +1 삭제, 율법파의 대비는 비용의 "되풀이"와 같은 메아리 판정으로 다음 장 시작에, 헤아린 노동의 승률 문턱이 예고된 성벽을 셈; `RULESET`은 그대로): 튜토리얼과 `s5-hard-veteran`(메아리가 없는 판) 밖 아홉 판이 바뀌었다. 대비 기록 `log.lawGuard`가 새 문구("…대비한다 — 이번 장 우리의 선교·공격에 방어 +n.")로 **대비가 걸리는 장의 `log` 맨 앞**(`startRound`)에 남고, 메아리로 기록된 장마다 판정되므로 나오는 장도 바뀌었다(예: `s6-easy-veteran` 3·5장 → 4·6·7장, 7장은 "+2"). 수가 바뀐 판은 둘이다 — `s4-hard-veteran-asc4` 5장 "율법파의 마을을 쳐라"의 헤아린 공격이 율법파가 성벽을 예고한 C2를 피해 D3(결과 그대로), `s7-hard-first`는 6·7장 "율법파의 마을을 쳐라"(글 메아리)로 7장 +1·8장 +2의 대비가 걸려(전에는 받아들인 일이 달라 8장 +1만) 8장 E3 공격이 막히고(방어 2 → 4) **우리 41:41 → 율법파 39:46**. 원정 +1은 골든에 대성당 공사가 없어 드러나지 않는다. 7차 `df1cb16`·`16492f4`·`c12a1e9`의 파일(`ruleset` 10 — `c12a1e9`에서 바이트까지 같음을 확인했다): `df1cb16`(되풀이 규칙 하나 — 받아들인 일들이 지난 두 계시와 같을 때만 율법파가 우리 선교·공격에 대비, 결집의 장마다 신도 +1 삭제, `RULESET` 9): 튜토리얼 밖 10판이 바뀌었다. 여섯 판은 기록(대비 로그 `log.lawGuard`의 새 문구와 나오는 장, 결집 로그 문구)만 달라지고 수는 그대로였고, 네 판은 승점이 달라졌다(승자는 그대로) — `s4-easy-first-war` 7장 "율법파에게 재앙을! 그들의 수도를 쳐라"에서 대비가 없어 헤아린 공격(`attack:C3:`)이 붙어 24:18 → 27:13, `s5-easy-first-war`는 결집의 신도가 없어 7장부터 율법파 계획이 줄어 19:17 → 36:8, `s6-easy-veteran`은 12장 "율법파의 마을을 쳐라"(글 메아리)의 D2 공격이 대비 없이 굴려져 막힘 → 점령, 33:33 → 38:29, `s7-normal-veteran`은 10장 "싸우지 마라, 이웃을 사랑하라"에 헤아린 선교가 붙어 24:66 → 25:66. `16492f4`(석판·보통의 뜻 공개·예고된 성벽을 세는 승률): 여섯 판이 바뀌었다. 셋은 해석문만 — 금지만 알아들은 계시가 "흐릿" 대신 `interp.tablet.forbidOnly`(예: `s6-normal-veteran` "…공격은 하지 말라…"), 닿지 않는 수도에 `율법파 수도(지금 그곳에서는 할 수 없다)`가 붙는다(`s4-easy-first-war`·`s5-easy-first-war`·`s6-normal-veteran`, 수는 그대로). 셋은 공격 후보의 승률 순위가 율법파가 그 장에 예고한 성벽을 세어(`wallAhead`) 과녁이 바뀌었다 — `s4-hard-veteran-asc4` 5장 "율법파의 마을을 쳐라" C2 → D1(결과 그대로), `s5-hard-veteran` 6장 같은 문장 C3 → D3(석판 20:47 → 25:41, 9장 그대로), `s7-hard-first` 8장 "율법파에게 재앙을! 그들의 수도를 쳐라" F2 → E3(**율법파 38:48 → 우리 41:41**, 동점은 우리 — `b470e03` 전의 결과로 돌아갔다). 어려움이라 율법파의 성벽 건설이 보이는 판들이다. `c12a1e9`(율법 석판의 신앙 전환·피의 율법 삭제, 10칸, `RULESET` 10): 두 번째 판 다섯이 바뀌었다 — `s5-hard-veteran`은 석판이 느리게 차 9장 석판 25:41 → **11장** 석판 31:47, `s6-easy-veteran`은 심판의 기준이 「경건」(신앙 3마다 승점 1)이라 신앙을 석판에 쓰지 않게 된 율법파의 신앙 승점이 2 → 15가 되어 9장부터 선공이 바뀌고 **우리 38:29 → 율법파 38:42**, `s4-hard-veteran-asc4`·`s6-normal-veteran`·`s7-normal-veteran`은 석판 로그만 달라지고 결과는 그대로다. 그 전 기록: `0a0a974`까지의 파일은 6차 `0c95856`·`b470e03`·`0a0a974`에서 만든 것이었다(`ruleset` 8 — `0a0a974`에서 바이트까지 같음을 확인했다). `0c95856`(대성당 공사 중 율법파 선공, 계시 비용은 길이와 무관하게 1, `RULESET` 8): `index.json`의 `ruleset`이 8이 되고 `s5-normal-first`만 바뀌었다 — 10장 "너희는 들판에서 곡식을 거두고 숲에서 나무를 베어 겨울을 준비하라"(30자 넘음)의 `cost`가 2 → 1이라 그 뒤 신앙이 1씩 많다(결과 23:27 그대로). 대성당 선공은 골든 판에 대성당 공사가 없어 드러나지 않는다. `b470e03`(석판: 공격·선교는 승률 순 등): `s5-normal-first`(11장 "그들의 마을을 쳐라" D1 → E1, 결과 그대로)와 `s7-hard-first`(8장 "그들의 수도를 쳐라" E3 → F2, **우리 41:41 → 율법파 38:48**)가 바뀌었다. `0a0a974`(대사제 성향이 헤아린 노동을 정함, 어려움의 뜻 공개에 건설): 성향이 있는 두 번째 판 다섯이 모두 바뀌었다 — `s5-hard-veteran`(신중, 석판 20:47 그대로), `s6-normal-veteran`(문자주의, 18:54 → 19:53), `s6-easy-veteran`(몽상가, 40:25 → 33:33 — 동점은 우리), `s7-normal-veteran`(몽상가, 30:64 → 24:66), `s4-hard-veteran-asc4`(열혈, 8장 2:44 → **7장** 6:30 — 남은 자가 3장·7장에 수도를 흔들어 함락). 첫 판·튜토리얼(`loyal`)은 바뀌지 않았다. 그 전 기록: `3a790f5`까지의 파일은 `435c3cc`(11판 모두)와 `bcdeb22`(`s5-hard-veteran`·`s7-normal-veteran`)에서 만든 것이었다(`ruleset` 7 — `3a790f5`에서 바이트까지 같음을 확인했다). `435c3cc`(신도 수 우위 주사위 삭제, 수도 내구도 3 → 2, 구동기의 튜토리얼 청원 벌 조건)에서 11판 모두 다시 바뀌었다 — 결과(승자·결말 종류·장 수)는 모두 그대로이고 최종 승점은 대부분 양쪽 −1(승점의 수도 항목): `tutorial-3x3` 18:18 → 17:17, `s4-easy-first` 16:25 → 15:24, `s5-normal-first` 24:28 → 23:27, `s5-hard-veteran` 석판 18:54 → 20:47, `s6-normal-veteran` 19:55 → 18:54, `s6-easy-veteran` 41:26 → 40:25, `s7-hard-first` 42:42 → 41:41(동점은 우리), `s7-normal-veteran` 30:67 → 26:64, `s4-easy-first-war` 25:19 → 24:18, `s5-easy-first-war` 20:18 → 19:17, `s4-hard-veteran-asc4` 점령 2:48 → 2:44(수도 내구도 2라 남은 자 두 번 — 6장 내구도 1, 8장 0 — 으로 함락). `8ba0ef8`(모듈 단계 해금)은 골든 설정에 `unlock`이 없어(`veteran` 판은 모든 모듈) 판 파일을 바꾸지 않았고 `index.json`의 `ruleset`만 7로 맞췄다. `bcdeb22`(석판의 조준·말한 번개의 수도)에서 `s5-hard-veteran`(결과 그대로)과 `s7-normal-veteran`(26:64 → 30:64)이 바뀌었다. 예전의 **알려진 차이**(튜토리얼 청원 벌 — 화면은 `2825b37`부터 세지 않는데 구동기는 세어 `tutorial-3x3.json`의 신앙이 2장부터 1 적었다)는 `435c3cc`에서 구동기(`tools/golden.mjs:186`)에 `!state.tutorial`을 넣어 없어졌다([KNOWN-ISSUES E5](../../godot/KNOWN-ISSUES.md)). 그 전 기록: `87a0fce`(튜토리얼 밖 10판)와 `2825b37`(튜토리얼 판)에서 만든 파일(`ruleset` 6)은 `4e2e0f7`까지 바이트째 같았다(`7a28084`의 판 크기 표는 골든을 바꾸지 않는다). `87a0fce`(승점이 뒤진 쪽이 선공, 결집 12/6점과 장마다 신도 +1, 같은 기적 재사용 +1, 두 장 전 메아리, 석판의 `~고/~며/~면서` 절 나누기와 새 곳의 말)에서 10판 모두 최종 승점이 달라졌다 — `s4-easy-first` 16:24 → 16:25, `s5-normal-first` 우리 30:22 → 율법파 24:28, `s5-hard-veteran` 석판 28:46 → 18:54, `s6-normal-veteran` 13:60 → 19:55, `s6-easy-veteran` 율법파 26:34 → 우리 41:26, `s7-hard-first` 율법파 37:49 → 우리 42:42(동점은 우리), `s7-normal-veteran` 15:69 → 30:67, `s4-easy-first-war` 27:11 → 25:19, `s5-easy-first-war` 39:9 → 20:18, `s4-hard-veteran-asc4` 승점 14:44 → **점령**(8장, 남은 자로 우리 수도 함락, 2:48). `2825b37`(튜토리얼은 늘 우리가 선, 첫 제안 "들판이 너희를 먹이리라")은 튜토리얼 판을 바꿨지만 결과 18:18은 그대로였다. 그 전 기록: `78c891e`에서 다시 만든 파일(`ruleset` 5)은 이 문서의 이전 판에서 바이트까지 같음을 확인했었다. `9b43bbf`(7×7 율법파 행동 +1, 대성당 원정 +1, 신앙 승리는 장 끝·개종 조건, 심판의 날 한 번, 일로도 보는 메아리)에서 판 파일 9개가 바뀌어 네 판의 결과가 달라졌고 — `s4-easy-first` 18:24 → 16:24, `s7-hard-first` 25:55 → 37:49, `s7-normal-veteran` 15:67 → 15:69, `s5-easy-first-war`는 6장 신앙 승리(28:11) → 12장 승점 승리(39:9, 개종 없이 인구만 채운 신앙 승리가 막힘) — `78c891e`(석판의 곳·수의 말, 한 칸에 한 가지, 해석문 머리말 `석판이 이르되,`)에서 11판 모두가 다시 바뀌었으나 결과는 그대로다. 그 전 기록: `afab303`(재조정: 율법파의 원정·결집·굳은 율법, 메아리, 대성당 조건, 뜻을 헤아린 노동 등)에서 만든 파일이 `1b582ee`·`448f553`까지 바이트째 같았는데, `e68a240`의 막기 대칭(후 진영의 기도·신전·대성당·성벽도 막히지 않음)·헤아린 성벽 예산·결집 로그의 `fx.kind` `rally`로 판 파일 9개가 바뀌었고, 그중 네 판(`s5-hard-veteran`, `s6-normal-veteran`, `s7-hard-first`, `s4-hard-veteran-asc4`)의 최종 승점이 달라졌다.

## 판 목록

[`index.json`](index.json)에 같은 목록이 기계용으로 있다 (`games[]`: `file`, `config`, `rounds`, `winner`, `winKind`, `score`).

| 파일 | 맵 | 난이도 | 두 번째 판 | 시드 | 지도자 / 심판 | 장 | 결과 (승점) | 크기 |
|---|---|---|---|---|---|---|---|---|
| [tutorial-3x3.json](tutorial-3x3.json) | 3×3 튜토리얼 | — | 아니오 | 7 (고정) | — / classic | 5/5 | player · tutorial (24:22) | 23 KB |
| [s4-easy-first.json](s4-easy-first.json) | 4×4 | easy | 아니오 | 4101 | elder / classic | 8/8 | enemy · score (19:21) | 34 KB |
| [s5-normal-first.json](s5-normal-first.json) | 5×5 | normal | 아니오 | 2026 | iron / classic | 12/12 | player · score (30:21) | 67 KB |
| [s5-hard-veteran.json](s5-hard-veteran.json) | 5×5 | hard | 예 | 5303 | preacher / steadfast | 11/12 | enemy · edict (17:55) | 61 KB |
| [s6-normal-veteran.json](s6-normal-veteran.json) | 6×6 | normal | 예 | 6202 | iron / wide | 12/12 | enemy · score (10:59) | 66 KB |
| [s6-easy-veteran.json](s6-easy-veteran.json) | 6×6 | easy | 예 | 6605 | builder / pious | 12/12 | player · score (44:40) | 62 KB |
| [s7-hard-first.json](s7-hard-first.json) | 7×7 | hard | 아니오 | 7304 | builder / classic | 14/14 | enemy · score (15:62) | 76 KB |
| [s7-normal-veteran.json](s7-normal-veteran.json) | 7×7 | normal | 예 | 7707 | preacher / steadfast | 14/14 | enemy · score (35:60) | 79 KB |
| [s4-easy-first-war.json](s4-easy-first-war.json) | 4×4 | easy | 아니오 | 404 | elder / classic | 8/8 | player · score (32:8) | 40 KB |
| [s5-easy-first-war.json](s5-easy-first-war.json) | 5×5 | easy | 아니오 | 202 | preacher / classic | 12/12 | player · score (31:23) | 60 KB |
| [s4-hard-veteran-asc4.json](s4-hard-veteran-asc4.json) | 4×4 | hard | 예 | 4404 · 승천 4 · 은사 mason | iron / fertile | 5/8 | enemy · capital (2:30 — 5장, 4장 율법파의 공격으로 내구도 1, 5장 남은 자로 우리 수도 함락) | 30 KB |

(크기는 `1c81cd4`에서 뽑은 바이트 수를 1000으로 나눠 반올림했다 — 11판과 `index.json` 합계 601,193바이트(`39500e9`도 같다), `tools/golden.mjs`가 찍는 값; `238120e`에는 613,057바이트, `76c0053`에는 602,287바이트, `24927a6`에는 606,349바이트, `637c05a`에는 602,085바이트, `3f33be1`에는 593,433바이트, `e174a18`에는 597,187바이트, `d7ad6e0`에는 598,553바이트, `8250dd7`에는 581,361바이트, `95eca5f`에는 623,236바이트.) 대사제 성향(`setup.priest`): 첫 판·튜토리얼은 `loyal`, 두 번째 판은 `s5-hard-veteran` `cautious`, `s6-normal-veteran` `literal`, `s6-easy-veteran`·`s7-normal-veteran` `dreamer`, `s4-hard-veteran-asc4` `zealot` — `0a0a974`부터 이것이 `auto`(헤아린 노동)를 바꾼다.

"두 번째 판" = `config.veteran`. 골든 설정에는 `unlock`이 없으므로 `8ba0ef8` 뒤에도 `veteran` 판은 해금 4 — 모든 모듈(율법 석판·심판의 기준·소명·대사제·드래프트·갈림길·세 막·교리 대립·계명·검열·미라)이 켜진다. 일반 판의 해금 1~3 구성(두 번째~네 번째 판)은 골든이 다루지 않는다. 튜토리얼의 `config`에는 `DEFAULT_CONFIG`(size 5, normal, seed 2026)가 섞여 있지만 튜토리얼에서는 쓰이지 않는다.

## 구동기가 한 장에 하는 일

`state = createState(config)` 다음, 판이 끝날 때까지 되풀이한다. 괄호 안은 `main.js`의 함수. **[ui]** 는 엔진이 아니라 화면 컨트롤러가 `state.log`에 직접 넣는 줄이다 (골든의 로그에 `"ui": true`로 표시).

1. **장 시작** (`newRound`): `startRound(state)` — `55d33dd`부터 맨 앞의 `braceLaw`가 지난 장 계시가 메아리였으면 대비를 올리고 `log.lawGuard`를 남긴다(이 장 `log`의 첫 줄).
2. **닫을 수 없는 선택 창** — 구동기는 늘 첫 선택지를 고른다.
   - 1장이고 `state.destinyOffer`가 있으면 `chooseDestiny(state, destinyOffer[0])` → `destinyPick`.
   - `state.miracleOffer`가 있으면 `takeMiracle(state, miracleOffer[0])` → `miracleDraft`.
3. **계시** (`speak` → `interpret` → `derivePending`). 칩을 빼지 않고, 다시 해석·말 거두기·버튼 기적·계절 고르기·갈림길 버튼은 쓰지 않는다.
   1. 글자가 없으면(`kw.ui.speech` 불일치, 예: `…`) **침묵** 경로로 (아래).
   2. `cost = revelationCostFor(state, text)`. `faith < cost`면 화면은 인장을 받지 않는다 — 구동기는 이때 침묵으로 넘기고 `unaffordable: cost`를 남긴다 (지금 골든에는 이런 장이 없다).
   3. `spoken = spokenOf(state, text)` — 되풀이 판정 `{sig, echo}`를 **지금** 해 두고(화면의 `speakSnap.spoken`, `9b43bbf`) 4-14에 넘긴다. 그다음 `faith -= cost`.
   4. `naming = nameTile(state, parseNaming(text))` — 이름은 **해석 전에** 새긴다 (새 이름이 석판 규칙에 들어간다).
   5. `result = interpretWithTablet(state, text)`.
   6. `tone = detectTone(text)`, `prophecy = state.prophecy ? null : parseProphecy(text)`.
   7. `{accepted, rejected} = validateOrders(state, 'player', result.orders, forbiddenKeys, result.doctrine)`, `auto = autoFill(state, 'player', accepted, forbiddenKeys, result.doctrine)` (`forbiddenKeys = result.forbidden의 key`). **교리를 넘긴다** — 대사제 성향만큼(충직 1, 문자주의 0, 몽상가 2 — `0a0a974`) 자리가 계시의 뜻을 헤아린 노동(`heeded`)이 된다 ([02 §3.5](../../spec/02-rules.md#35-기본-노동-autofill)). 그 뒤의 손은 `8250dd7`부터 모자란 것만 채우고 쉬므로 `accepted` + `auto`가 행동 수보다 적을 수 있다.
   8. `answered = petitionAnswered(state, text, accepted)`, `dilemma = dilemmaByText(state, text)`, `miracle = spokenMiracle(text)`, `command = canCarve(state) ? parseCommandment(text, COMMANDMENTS) : null` (새길 수 없는 계명·이미 새긴 계명이면 `null`).
   - **침묵**: `pray = legalActions(state, 'player')` 중 첫 기도, `auto = [pray(auto), ...autoFill(state, 'player', [pray])]`(교리 없음), 글 `null`.
   - `spokenMiracle(text)`: `parseMiracle(text, state.miracleHand)`의 기적이 이번 장 아직 안 썼고(`!state.miracleUsed`) 신앙이 `miracleCost` 이상일 때. 번개의 과녁은 계시에 이름이 나온 율법파 칸, 없으면 (`bcdeb22`부터) 계시에 수도 말(`kw.place.capital`)이 있고 율법파 수도가 드러나 있으면 그 수도, 없으면 보이는 율법파 칸 중 마을 먼저 → 우리 수도에서 가까운 순(동률은 `state.tiles` 순서)의 첫 칸 (`tools/golden.mjs:116-133`, 화면 `main.js:605-623`과 같다).
4. **공개와 해결** (`accept`).
   1. 글이 있으면 [ui] `god`(계시 원문)·`priest`(해석문) 두 줄.
   2. `enemyPlan = planEnemy(state)`. 여기서부터의 로그를 `logsSince`라 한다.
   3. 말한 기적: `castMiracle(state, id, target)` (실패하면 [ui] 한 줄).
   4. 침묵이면 `state.streak = null`. (`8250dd7` 전에는 여기서 `applyTone(state, text ? tone : null)` — 말투는 이제 수치가 없다.)
   5. 갈림길 사건(`state.event.choice`)이면 `payDilemma(state, dilemma ?? state.dilemmaPick ?? choice[0].id)` — 비용을 먼저 치르고, 결과는 `resolveRound` 안에서 유지 단계 전에 `resolveDilemma(…, prepaid=true)`로 난다. (엔진 API가 있으므로 따로 부를 것이 없다.)
   6. `plan = [...accepted, ...auto]`. 계명 체크(`carve`)가 켜져 있고 `carveCommandment(state, command)`가 성공하면 `plan = kept + autoFill(state, 'player', kept, forbiddenKeys, result.doctrine)` (`kept` = 새 계명이 막는 공격/마을 건설을 뺀 `accepted`; 안식·굶기지 말라처럼 막는 것이 없으면 `accepted` 전부 — `afab303` 전에는 건설 외 명령이 모두 빠졌다). 화면(`main.js`)은 확인 화면에서 뺀 칩도 금지 키에 더해 넘기지만(`e68a240`), 구동기는 칩을 빼지 않으므로 같다.
   7. `ordered = plan 중 auto가 아닌 것`.
   8. 글이 있으면 `findSacred(state, text)` (오늘의 계시에서만 효과).
   9. 예언 체크(`seal`)가 켜져 있고 `prophecy`가 있으면 `sealProphecy(state, prophecy)`.
   10. `resolveRound(state, plan, enemyPlan)` — 막기(집 안 행동은 칸을 차지하지도 막히지도 않는다)·해결·갈림길 결과·유지(봉인한 예언의 판정 — `8250dd7`부터 이루어지면 은총이라 12·13단계보다 먼저 장당 은총을 쓴다)·승패(남은 자 포함)·장 기록(분노·결집)이 이 안에서 끝난다. (되풀이를 읽는 율법은 `55d33dd`부터 1단계 `startRound`의 `braceLaw`가 14단계에 기록된 계시의 `echo`로 정한다 — `df1cb16`~`c12a1e9`에는 여기서 `updateLawGuard`가 받아들인 명령으로 정했다.)
   11. 승부가 안 났으면 `applySilence(state, !!text)`.
   12. 승부가 안 났고 글이 있으면 `markLegends(state, text, result.doctrine, ordered, logsSince)`, 이어서 `keepVows(state, result.forbidden, plan)`.
   13. 승부가 안 났으면 청원·이름의 은총 (`wordsAfter` — 장당 은총 하나라, 예언·서원이 먼저 받았으면 0이고 기록도 없다): `answered`면 `stats.petitions += 1`, `grantGrace(state, 1, …)`. 외면에는 아무 일도 없다(`846fd60` — 그 전에는 튜토리얼이 아닐 때 두 번 외면하면 신앙 −1과 [ui] 한 줄이었다). 이름을 붙였으면 `grantGrace(state, 1, …)`. (예전의 기이한 해석 은총은 `afab303`에서 없어졌다.)
   14. 글이 있으면 `recordRevelation(state, text, result.doctrine, spoken)`(`8250dd7` 전에는 넷째 인자로 비유의 가속 `tone === 'metaphor' ? 1 : 0`이 끼었다) — 3-3에서 판정한 메아리(지난 계시와 글이 같거나, 석판이 읽은 일의 종류가 같음)면 교리가 오르지 않는다. (예전의 `updateLiturgy`는 없어졌다.)
   15. (없음 — `8250dd7` 전에는 첫 이름이고 지혜 교리가 `RULES.graceDoctrineBelow`(3)보다 낮으면 지혜 +1.)
   16. `state.history.at(-1).text = text`.
   17. 글이 있고 지도자가 있으면 [ui] `leader` 한 줄: `leaderLine(state, 'rebuttal', { doctrine: result.doctrine, word: nouns(text)[0] })` — `846fd60`부터 반박은 같은 교리로 기록된 계시 수만큼 풀에서 돌아간다(14단계 뒤라 이번 계시도 센다, [05 §4.18](../spec/05-interpreter.md)).
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
| `tone` | `command` / `blessing` / `curse` / `metaphor` (`8250dd7`부터 기록뿐 — 수치에 닿지 않는다) |
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
| `log[]` | 이번 장에 `state.log`에 쌓인 줄 — `startRound` 앞에서부터 (아래). `55d33dd`부터 `startRound`가 남기는 대비 줄(`fx.kind: 'guard'`)이 맨 앞에 올 수 있다 |
| `digest` | 장이 끝난 뒤 상태 요약 (아래) |

행동 key는 엔진과 같다: `` `${type}:${tile}:${gather ?? build ?? ''}` `` — 예 `gather:C2:stone`, `build:E2:temple`, `explore:B2:`, `pray:E2:`.

**log[]**: `{side, text, dice?, fx?, act?, ui?}`

- `side`: `player` / `enemy` / `god` / `priest` / `leader`.
- `dice`: `{attacker, attackerBonus, defender, defenderBonus, win}` (선교·공격·평화 궁극).
- `fx`: 엔진 연출 정보에서 규칙에 닿는 것만 — `kind`(`gain`, `build`, `attack`, `preach`, `blocked`, `fail`, `birth`, `loss`, `warn`, `edict`, `wrath`, `rally`, `guard`, `grace`, `dilemma`, `treasure`, `site`, `saint`, `legend`, `commandment`, `prophecy`, `ban`, `doctrine`, `rain`, `lightning`, `explore` …), `tile`, `gain`, `capture`, `convert`, `capital`, `up`.
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
| `wrath`, `streak`, `silentRun` | 신의 분노(`1c81cd4`부터 늘 0 — 저울 `trailing`은 digest에 없다), 연속 교리 `{doctrine, n}`(`88878b6`부터 n은 3에서 멈추고 메아리 계시도 센다 — 점 표시용), 연속 침묵 |
| `names`, `legends`, `commandments`, `prophecy`, `destiny`, `saints`, `vowNext`, `bannedNext`, `pendingSite` | 있을 때만 (예전의 `liturgy`는 성언이 없어져 `e68a240`에서 구동기에서도 뺐다) |
| `stats` | `state.stats` 그대로 (`converted`, `captured`, `miracles`, `prophecies`, `petitions`, `turned?`, `starved?`, `vows?`, `sacred?`) |
| `rng` | 장이 끝난 뒤의 `{deck, dice}` — **부호 있는 32비트 정수** |
| `winner`, `winKind` | 승부 (`null`이면 진행 중) |

**result**: `rounds`, `winner`, `winKind`, `winReason`(한국어), `score{player, enemy}`, `breakdown{player, enemy}`(`scoreBreakdown().parts`의 `{key, n, w}`), `history[]`(`{round, ps, es}`), `revelations[]`(`{round, doctrine}`), `stats`.

digest에 **없는** 새 상태: `lawGuard`(되풀이를 읽는 율법, `55d33dd`부터 수 하나 — 대비가 오르는 장의 `log` 맨 앞에 `fx.kind: 'guard'` 줄이 남는다(`88878b6`부터 `fx.tile`은 우리 수도); 지난 장 계시가 메아리였거나 `88878b6`부터 마지막 세 계시가 이어진 세 장의 같은 교리였으면 오른다 — `readUs`), `rally`(결집 — `1c81cd4`부터 `trailing === 'enemy'`의 거울), `trailing`(저울, `1c81cd4` — 새로 기울 때 `log.rally`·`log.scaleUs` 줄이 남는다), `revelations[].echo`(메아리)와 `revelations[].sig`(일 목록, `9b43bbf`), `doomUsed`(심판의 날을 썼나 — 골든은 심판의 날을 쓰지 않아 늘 거짓), `miracleUses`(기적별 쓴 횟수, `87a0fce` — 말한 기적이 있는 판은 `{id: 1}`이 되지만 다시 쓰지 않아 비용에 드러나지 않는다). 선공 `first`는 장마다 `rounds[].first`로 있고 `87a0fce`부터 장 시작 승점(지난 장 `digest.player.score`·`enemy.score`)이 뒤진 쪽이다 — 이것이 어긋나면 그 장의 막기·주사위가 모두 어긋난다. 이 값은 다음 장의 계획·판정(율법파 행동 수, 방어 보너스)과 비용(`cost` — 메아리면 +1), 로그(`log.lawGuard`·`log.rally`·`log.echo`, `fx.kind` `guard`·`rally`·`doctrine` — 결집은 `e68a240` 전에는 `wrath`였다)로만 드러나므로, 어긋나면 그다음 장의 `cost`·`enemyPlan`·`dice`에서 처음 보인다. 이식판 하네스는 이 값들을 따로 찍어 두면 원인을 빨리 찾는다. 특히 일 목록은 **석판**이 만들므로 석판을 이식하지 않은 B 방식(아래)에서는 기록된 `tablet.orders`로 목록을 만들어 넣어야 `cost`가 맞는다.

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
        var log_from := st.log.size()        # start_round 앞에서 — 대비(log.lawGuard)는 start_round가 남긴다 (55d33dd)
        GameEngine.start_round(st)
        expect_eq(st.event.id, rec.event); expect_eq(st.law_card.id, rec.lawCard); expect_eq(st.first, rec.first)
        if rec.has("destinyPick"): GameEngine.choose_destiny(st, rec.destinyPick)
        if rec.has("miracleDraft"): GameEngine.take_miracle(st, rec.miracleDraft.pick)
        var pending := Driver.speak(st, rec.revelation, rec.get("sealRequested", false), rec.get("carveRequested", false))
        if rec.has("tablet"): check_tablet(pending, rec.tablet)   # orders/forbidden key, doctrine
        check_keys(pending.accepted, rec.accepted); check_keys(pending.auto, rec.auto)
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
- 메아리의 일 목록(`sig`)은 비용 전에 석판으로 만든다. 석판이 없으면 이 장의 `tablet.orders`에서 종류 키(`gather:<자원>`/`build:<건물>`/type)를 뽑아 중복 없이 정렬해 `|`로 이어 쓴다 — 골든 구동기는 이름 붙이기 **전** 상태로 석판을 돌리므로, 이름을 붙인 장에서는 드물게 다를 수 있다. `cost`가 기록과 같은지로 확인한다.
- 그다음 `validateOrders`·`autoFill`·`petitionAnswered`·`dilemmaByText`·`spokenMiracle`·`parseCommandment`를 그대로 돌리고 `accepted`/`auto`/`petitionAnswered`/`dilemma`/`miracle`과 맞는지 본다. `tone`은 `detectTone`을 이식하지 않았다면 기록값을 쓴다(`8250dd7`부터는 수치에 닿지 않아 엔진 비교에는 없어도 된다).
- 엔진만 먼저 맞추고 싶다면 `plan`(`ordered`에 없는 key는 `auto: true`로 표시)과 `enemyPlan`을 기록에서 바로 만들어 `resolveRound`에 넣어도 된다. 이때도 3-3·3-4, 4-3~4-9, 4-11~4-17을 같은 순서로 불러야 digest가 맞는다.

### 비교 요령

- **어긋난 첫 장, 첫 칸을 찾는다.** 순서: `initialMap` → `setup`(덱·rng) → 장마다 `event`/`lawCard`/`reacted`/`petition` → `tablet` → `accepted`/`auto` → `enemyPlan` → `log` 순서 → `digest`.
- `digest.rng`가 가장 날카로운 검사다. `dice`가 어긋나면 주사위를 굴린 **횟수나 순서**(해결 순서 `gather → build → pray → explore → preach → attack`, 선 플레이어 먼저, 탐험의 `rand` 두 번, 평화 궁극의 `d6` 두 번)가 다르다. `deck`이 어긋나면 덱 나누기(`dealDeck`/`shuffle`)나 5장 기적 드래프트가 다르다.
- 난수는 32비트 정수 연산이다 (`Math.imul`, `>>>`, `| 0`). GDScript의 `int`는 64비트이므로 매 연산 뒤 32비트로 잘라야 한다. 비교는 부호 있는 32비트 값으로.
- JSON 숫자는 Godot에서 `float`로 읽힌다 — `int()`로 바꿔 비교한다. 사전의 키 순서는 비교하지 않는다.
- 로그 `text`까지 맞추려면 같은 한국어 언어팩과 `josa`/`batchim`이 필요하다. 규칙 검증만이라면 `side`·`fx`·`dice`·`act`로 충분하다. `rejected[].reason`도 한국어 글(`eng.reject.*`)이다.

## 다루는 것 / 다루지 않는 것

다룬다: 맵 3×3~7×7, 쉬움·보통·어려움, 첫 판·두 번째 판, 튜토리얼 고정 덱, 승천 4(`enemyZeal`) + 은사(석공), 지도자 넷 전부, 심판의 기준 다섯 전부, 결과 네 가지(score·tutorial·edict·capital — `9b43bbf`부터 신앙 승리 판이 없다; 칙령은 `s5-hard-veteran` 11장(`8250dd7`에는 없었다); 수도 함락은 `s4-hard-veteran-asc4` — `1c81cd4`부터 4장 율법파의 공격으로 내구도 1, 5장 남은 자로 0(`238120e`에는 4장과 8장 **율법파의 공격** 둘로, 그 전에는 4장 공격으로 내구도 1, 남은 자로 0 — `76c0053` 6장, `3f33be1`~`24927a6` 7장, `e174a18`까지 6장; `8250dd7`에는 `s5-hard-veteran`도 5장 공격·6장 남은 자); 튜토리얼은 `d7ad6e0`에만 율법파가 앞서 끝났다(`e174a18`부터 다시 우리 24:22); `87a0fce`~`95eca5f`에는 `s4-hard-veteran-asc4`만 남은 자 두 번으로 — `435c3cc`부터 수도 내구도 2라 두 번이면 0, `0a0a974`부터 3장·7장), **승점으로 정하는 선공**(`87a0fce` — 모든 판에서 홀짝과 다른 장이 있다; `s5-easy-first-war`는 12장 중 11장, `s6-easy-veteran`은 8장이 율법파 선 — `d7ad6e0`; `8250dd7`에는 7장, `55d33dd`~`95eca5f`에는 8장), **대사제 성향 넷의 헤아린 노동**(`0a0a974` — 두 번째 판 다섯; 열혈 `s4-hard-veteran-asc4`는 지혜 계시 "높은 신전을 쌓아 나를 섬겨라"에도 헤아린 공격을 한다), 어려움 율법파의 뜻에 건설(`0a0a974` — 청원 「위협」이 보는 `shown`이 달라진다; 골든 계시에는 "노리는 곳"이 없다), **곳을 말하지 않은 공격·선교는 우리 땅에서 가장 가까운 과녁**(`d7ad6e0` — `s7-hard-first` 8·14장, `s4-hard-veteran-asc4` 5장, `s5-hard-veteran` 6장, `s6-easy-veteran` 12장; `b470e03`~`8250dd7`에는 승률 순) · 튜토리얼은 늘 우리 선(`2825b37`), 율법파의 원정·막마다 칼·퇴각(여러 판), 되풀이를 읽는 율법(7판 — `e174a18`부터 `s4-easy-first`·`s5-hard-veteran`의 메아리가 살림뿐이라 없어졌다; `88878b6`~`d7ad6e0`에는 같은 교리 세 장으로도 읽혀 `s4-easy-first`·`s6-normal-veteran`·`s7-hard-first` 4장(풍요 세 장)에 대비가 걸렸지만 `e174a18`부터 전쟁·평화만 읽어 골든에는 세 장 읽힘이 없다 — 모두 메아리; `55d33dd`부터 메아리로 기록된 계시 다음 장마다; 글 메아리도 대비를 켠다 — `s7-hard-first` 6·7장 "율법파의 마을을 쳐라" → 7장 +1·8장 +2, 이어지는 최대는 기록 없이 유지; `c12a1e9`까지는 받아들인 일로 판정해 이 두 장에 대비가 없었다), 결집(1판 — `s5-easy-first-war`; 켜진 뒤 장마다 모여들던 결집의 신도 `log.rallyJoin`은 `df1cb16`에서 없어졌다), 메아리(7판 — `s4-easy-first-war`·`s4-hard-veteran-asc4`·`s5-normal-first`·`s6-easy-veteran`·`s6-normal-veteran`·`s7-hard-first`·`s7-normal-veteran`; 모두 일 메아리를 포함하고, 그중 3판 `s6-normal-veteran`·`s6-easy-veteran`·`s4-hard-veteran-asc4`에는 두 장 전 계시와 같은 일의 메아리, `87a0fce`; `e174a18`에서 다시 셈 — 살림뿐인 계시가 메아리가 아니게 되어 `d7ad6e0`의 9판에서 `s4-easy-first`·`s5-hard-veteran`이 빠지고, 두 장 전 메아리에서 `s7-normal-veteran`이 빠졌다; `c12a1e9`~`95eca5f`에는 9판·4판), (**예고된 율법파 성벽을 세는 공격 순위** — `16492f4`~`8250dd7`의 `s4-hard-veteran-asc4` 5장, `s5-hard-veteran` 6장, `s7-hard-first` 8장 — 는 `d7ad6e0`부터 승률 순이 "약한" 같은 말이 있을 때만이라 골든에 드러나지 않는다; 헤아린 노동의 승률 문턱에는 여전히 든다), 금지만 알아들은 해석문과 닿지 않는 수도 알림(`16492f4` — 해석문 `tablet.interpretation`에만 드러난다), 율법 석판 승리(`s5-hard-veteran` 11장 — `c12a1e9`부터 성지·율법파 신전으로만 찬다; `8250dd7`에는 5/10에서 6장에 수도가 먼저 무너졌다), `~고` 절 나누기("…곡식을 거두고 숲에서 나무를 베어…"), 7×7 율법파 행동 +1(7×7 두 판), 신의 분노가 가득 참(5판 — `d7ad6e0`; `8250dd7` 4판, 그 전 6판, "판에 한 번" 문구), 석판의 곳을 가리키는 말("그들의 수도를 쳐라", "숲에 들어가", "언덕에 올라", 붙인 이름 "시온에서"·"검은숲에서"), 뜻을 헤아린 기본 노동, 석판 규칙, 부정 절(금지), 이름 붙이기와 이름으로 부르기, 말투 넷(`8250dd7`부터 `tone` 기록뿐), 예언 봉인(성취·실패 — `8250dd7`부터 성취는 은총: `s5-normal-first` 7장·`s6-normal-veteran` 6장, 실패는 벌 없음: `s6-easy-veteran` 5장), 절 하나의 손 둘과 쉬는 손(`8250dd7`), 계명 셋(굶기지 말라·칼을 들지 말라·안식), 말한 기적(단비·번개), 기적 드래프트, 소명, 갈림길(말로 답함·기본값), 분열의 예언자 미라, 발견지(보물·유목민 선택), 검열 카드, 율법파의 반응 카드, 신의 분노, 성인, 전설의 땅, (연속 교리 기적은 `88878b6`에서 없어졌다), 두 번째 판의 침묵 3연속. (이 목록에 있던 "분열의 예언자 미라"는 `87a0fce` 뒤로, "지혜 궁극의 계절 선택지 등장"은 `afab303` 뒤로 골든 판에 나오지 않는다 — `8250dd7`에서 확인했다.)

다루지 않는다 (필요하면 `tools/golden.mjs`의 `GAMES`에 판을 더한다):

- LLM 해석 경로 (`buildPrompt`, 신학 노트 `extractLesson`, 30초 타임아웃), 다시 해석·말 거두기·칩 빼기.
- 버튼으로 쓰는 기적(심판의 날은 `1c81cd4`부터 나오지 않는다), 지혜 궁극으로 계절 바꾸기(`chooseEvent`), 갈림길 버튼.
- 시련(`config.trial`), 오늘의 계시(`config.daily`, 숨은 말), 정경·전생의 유적·신의 이름(`config.canon`/`legacy`/`god`).
- 저장·불러오기(`serializeState`/`hydrateState`).
- **남은 자 규칙**(`remnant` — 신도가 모두 쓰러진 쪽의 수도가 흔들림; `1c81cd4`부터 다시 `s4-hard-veteran-asc4` 5장에 우리 쪽으로 걸린다 — 율법파 쪽 남은 자는 없다; `238120e`에는 골든 11판 어디에도 걸리지 않았고(공격 둘로 수도를 잃었다), 그 전에는 `s4-hard-veteran-asc4`가 공격 + 남은 자로 수도를 잃었다; `8250dd7`에는 `s5-hard-veteran`도), 승리 종류 `capital` 중 **우리가** 율법파 수도를 무너뜨리는 경우, 분열의 예언자 미라, "약한"·"성벽 없는" 곳을 말한 공격·선교(`kw.place.weakest`의 승률 순 — 석판 회귀 시험은 종류만 본다), 지혜 궁극(계절 선택지), `cathedral`(`3f33be1`의 한 번 짓는 대성당 — 마을 둘·비용 4/4/4(`1c81cd4` — 그 전 6/6/6)와 판 크기 배율·마지막 장 금지, 다음 장 원정의 선공·거리 무관 수도 공격 세 번 +1·계획의 같은 공격 세 번·원정의 장 끝 승리, 16 전 저장본의 단계 → 1 포함; 그 전의 단계 대성당도 다룬 적 없다), 율법파가 성벽을 두르려는 곳(`kw.place.aimWall`), `doom`(판에 한 번), `faith`(장 끝·개종 조건 — `9b43bbf` 뒤로 골든 판은 여기에 닿지 않는다); 같은 기적을 다시 쓰는 비용 +1(`87a0fce` — 골든 판은 기적을 판마다 많아야 한 번 쓴다); 수의 말(`한 곳`·`두 곳`·`세 번`), 덤 손이 행동 수에 밀리는 경우(`8250dd7` — 석판 회귀 시험도 종류만 본다), `87a0fce`의 새 곳의 말(율법파 마을·지형 옆·신전 옆·방향·포위)과 "잊지 마라"·할 일 없는 금지 절, 한 칸을 다투는 `heard …:tile`·행동 수 `…:limit`(해석 결과의 `heard`는 골든에 없다 — 석판 회귀 시험이 다룬다), 확인 칩 옮기기(⇄); `extinct`·`convertAll`·`bothExtinct`(이제 튜토리얼에서만 날 수 있다); 계명 `noExpand`; 갈림길 비용을 못 내 다른 선택으로 바뀌는 경우; 신앙이 모자라 말하지 못한 장(`unaffordable`); 두 개 이상의 "~지 말고"(`e68a240`부터 모두 금지 절이 된다 — 석판 회귀 시험 `tools/tests/tablet-cases.mjs`가 다룬다); `bcdeb22`의 석판 변경 대부분(`~되` 절 나누기, '짓·일·것' 금지 넘김과 곳만 짚은 금지, 칸 좌표 여럿, "가까운", 율법파 마을 곁, 짓는 말의 수도 — 회귀 시험이 다룬다); `b470e03`의 석판 변경 대부분("A가 아니라 B", "~지 않게", "안 해도 돼", "차지하라", 비유 절, 누구의 것인지 말하지 않은 "수도", 오아시스, 짚은 칸에서 못 한 일 `far:` — 회귀 시험이 다룬다; `heard`는 골든에 없다); **대성당 공사 중 율법파 선공**(`0c95856` — 골든 판에 대성당 공사가 없다), 30자 넘는 계시의 옛 비용(`0c95856` 뒤로 모든 계시가 1); 모듈 해금 1~3 단계(`config.unlock`, `8ba0ef8` — 골든 설정에는 `unlock`이 없다).

## 다시 만들기

```sh
node tools/golden.mjs            # 판마다 한 줄씩 요약을 찍는다
node tools/golden.mjs            # 한 번 더 → git diff docs/export/golden 이 비어 있어야 한다
```

스크립트는 파일을 쓰기 전에 `JSON.parse`로 다시 읽어 보고, 한 파일이 1.5 MB를 넘으면 멈춘다. 지금은 11판, 모두 합쳐 약 0.6 MB다. `GAMES`에서 판을 빼거나 이름을 바꾸면 옛 파일은 지워지지 않으므로 손으로 지운다 (`index.json`이 기준 목록이다).
