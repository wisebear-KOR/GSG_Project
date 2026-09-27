// 한국어 언어팩 — interp (해석기: interpreter.js · lore.js)
import { josa, batchim } from './grammar.js';

export default {
  // ---------- 대사제(LLM) 프롬프트 ----------
  // 다른 언어에서는 번역하되, 모델이 그 언어로 답하도록 지시를 바꾼다
  'interp.systemPrompt': `너는 한 부족의 대사제다. 신의 짧은 계시를 해석해, 이번 장에 부족이 할 일을 정한다.

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
- 참고로, 계시가 "바람을 읽어라"였고 탐험을 골랐다면 이렇게 쓴다: 바람이 방향을 바꾸었다. 안개 너머로 나아가라!`,
  // 한 장소에 행동이 여럿일 때 장소 이름 뒤에 붙는 말
  'interp.oneOnly': ' (하나만 선택)',
  // 지난 계시가 없을 때
  'interp.none': '없음',
  // 율법파의 의도: place를 attack/preach/… 하려 한다
  'interp.threat': (v) => `${josa(v.place, '을', '를')} ${{ attack: '공격하려', preach: '개종시키려', build: '지으려', gather: '채집하려', pray: '기도하려' }[v.type]} 한다`,
  // 신학 노트 한 줄: '낱말'=행동 이름
  'interp.lessonItem': (v) => `'${v.word}'=${v.name}`,
  // 신학 노트가 가리키는 행동 이름 (describeLesson)
  'interp.lessonName': (v) => {
    const type = { gather: '채집', pray: '기도', build: '건설', preach: '선교', attack: '공격', explore: '탐험' };
    return v.gather ? `${type.gather}(${{ food: '식량', wood: '목재', stone: '돌', faith: '신앙' }[v.gather]})`
      : v.build ? { village: '마을 건설', wall: '성벽', temple: '신전', cathedral: '대성당' }[v.build] : type[v.type];
  },
  // 매 장 프롬프트 본문. 선택 항목(threat, god, lessons, voice, canon, priest, choice, next)은 비었으면 줄을 뺀다
  'interp.prompt': (v) => `[부족 상황]
자원: 식량 ${v.food}, 목재 ${v.wood}, 돌 ${v.stone}, 신앙 ${v.faith}
신도: ${v.pop}명 (이번 라운드 행동 가능 ${v.limit}회), 신전 ${v.templeLevel}단계, 마을 ${v.villages}개
율법파: 신도 ${v.enemyPop}명, 마을 ${v.enemyVillages}개, 수도 내구도 ${v.capitalHp}${v.threat ? `\n율법파의 의도: ${v.threat}` : ''}
지난 계시: ${v.recent}${v.god ? `\n너의 신의 이름은 ${v.god}이다.` : ''}${v.lessons ? `\n대사제가 깨달은 신의 말버릇: ${v.lessons}` : ''}${v.voice ? `\n${v.voice}` : ''}${v.canon != null ? `\n이 부족의 경전: "${v.canon}"` : ''}${v.priest ? `\n${v.priest}` : ''}

[가능한 행동]
${v.actions}

[최근 사건]
${v.event}${v.choice ? `\n이번 사건의 갈림길: ${v.choice}` : ''}${v.next ? `\n다음 장: ${v.next} 예고` : ''}

[신의 계시]
"${v.revelation}"

금지한 행동, 따를 행동(1~${v.limit}개), 교리를 정한 뒤, 고른 행동을 외치는 말을 JSON으로 답하라.`,
  'interp.jsonFail': 'JSON 파싱 실패',

  // ---------- 석판(키워드) 해석기의 말 ----------
  'interp.tablet.prefix': '석판에 새겨진 말씀이도다.',
  // prefix: 머리말(교리 말투 또는 위 문장), verbs: 행동 문구 목록
  'interp.tablet.say': (v) => `${v.prefix} ${v.verbs.join(', 그리고 ')}!`,
  'interp.tablet.blur': '석판의 말씀이 흐릿하도다. 각자 할 일을 하라.',

  // ---------- 율법파 지도자 대사 ----------
  // 대사 속 '{word}' 자리에 계시의 낱말을 조사와 함께 넣는다 (word가 없으면 '그 말')
  'interp.leaderLine': (v) => {
    const w = v.word ?? '그 말';
    const b = batchim(w);
    return v.line.replaceAll("'{word}'라", `'${w}'${b ? '이라' : '라'}`).replaceAll("'{word}'를", `'${w}'${b ? '을' : '를'}`)
      .replaceAll("'{word}'?", `'${w}'?`).replaceAll('{word}', w);
  },

  // ======================================================================
  // kw.* — 플레이어가 쓴 계시(와 모델의 해석문)를 읽는 정규식 원본·낱말 목록.
  // 번역하지 않는다. 언어마다 그 언어의 어간·조사·어휘로 새로 만들어야 한다.
  // (코드는 new RegExp(t('kw.…'), 원래 플래그)로 만든다. 괄호 묶음 순서는 코드가 m[1], m[2]로 읽으므로 지킨다)
  // ======================================================================

  // 석판 규칙 (장소가 드러난 규칙이 먼저. 순서는 코드의 TABLET_RULES가 정한다)
  'kw.tablet.river': '강|물고기',
  'kw.tablet.hill': '언덕',
  'kw.tablet.preach': '사랑|이웃|전하|설득|가르|개종|품어',
  'kw.tablet.attack': '분노|공격|싸우|싸움|쳐라|정복|불태|벌하|칼',
  'kw.tablet.rest': '쉬어|쉬라|안식|평화',
  'kw.tablet.wall': '지켜|지키|방패|성벽|막아|수호',
  'kw.tablet.food': '배고|굶|먹|곡식|수확|들판',
  'kw.tablet.wood': '나무|숲|목재',
  'kw.tablet.stone': '돌|산|바위',
  'kw.tablet.village': '마을|넓혀|번성|퍼져|땅을',
  'kw.tablet.temple': '높은|높이|신전|탑|대성당',
  'kw.tablet.pray': '기도|경배|섬기|바쳐|찬양|믿음',
  'kw.tablet.explore': '찾|보이지|안개|탐험|숨겨|너머',
  // 부정어 ("두려워하지 말고 쳐라"는 금지가 아니다)
  'kw.negation': '마라|말라|말지|지 ?마|피하|멀리',
  // 절 나누기
  'kw.clauseSplit': '[.,!?。]|그리고|하되|그러나',
  // 신학 노트로 배우지 않는 낱말
  'kw.lessonStop': ['신도', '말씀', '백성', '부족', '율법파', '율법', '계절', '이번', '신이', '신께서', '나의', '모든'],

  // 해석문 다듬기 (모델이 쓴 글): 좌표 표기, 떠도는 "도다", 어간에 잘못 붙은 "도다"
  'kw.clean.coord': String.raw`\s*\(?[A-I][1-9]\)?(?=[\s,.!?을를이가에의]|$)`,
  'kw.clean.dangling': String.raw`([!.?])\s*도다\s*[!.?]?`,
  'kw.clean.afterVerb': String.raw`(라|어라|아라|하라|리라|지어다)\s+도다([!.?]?)`,
  'kw.clean.stem': '(본|온|간|중요|필요|분명|가능)도다',
  // kw.clean.stem의 첫 묶음(a)을 고친 말
  'kw.clean.stemFix': (v) => ({ 본: '보도다', 온: '오도다', 간: '가도다' })[v.a] ?? `${v.a}하도다`,

  // 명사 뽑기 (lore.nouns): 낱말 나누기, 조사, 동사 어미, 뺄 낱말
  'kw.nounSplit': '[^가-힣]+',
  'kw.particle': '(에게서|에게|에서|으로|이여|이시여|께서|까지|부터|처럼|같이|을|를|이|가|은|는|에|로|와|과|의|도|만|여|아|야)$',
  'kw.verbish': '(라|다|오|자|니|며|고|면|서|리라|하라|마라|지어다|노라|도다|소서|하리|되리|이리|어라|아라|거라|느냐)$',
  'kw.stop': ['너희', '우리', '나의', '너의', '그들', '저들', '이제', '모두', '함께', '그리고', '그러나', '오늘', '다시', '반드시', '결코', '영원히'],
  // 성구 인용에서 뺄 낱말
  'kw.citeStop': ['신도', '말씀', '백성', '부족', '율법파', '율법', '마을', '우리', '너희'],
  // 성언: 글자가 아닌 것을 지운다
  'kw.liturgyStrip': String.raw`[^가-힣\s]`,

  // 말한 대로 내리는 기적
  'kw.miracle.lightning': '번개|벼락|불을 내려|불벼락',
  'kw.miracle.rain': '단비|비를 내려|비가 내리|비를 부어',
  'kw.miracle.bounty': '풍요를 내려|넘치게 하',
  'kw.miracle.manna': '만나|양식을 내려',
  'kw.miracle.ark': '방주',
  'kw.miracle.tongues': '방언|혀를 풀',
  'kw.miracle.pillar': '불기둥',
  'kw.miracle.revive': '부활|되살아|일어나라|일으켜',
  // 영원한 계명: 이 말이 있어야 한다
  'kw.eternal': '영원히|영원토록',

  // 말투: 저주 > 축복 > 비유 (아니면 명령)
  'kw.tone.curse': '저주|멸하|망하리|벌하리|재앙',
  'kw.tone.blessing': '축복|복을|복되|복이|번성하라|은혜',
  'kw.tone.metaphor': '처럼|같이|듯|마냥',

  // 이름 붙이기: "이 강을 요단이라 부르라". m[1] = 지형 낱말(kw.nameable의 키), m[2] = 이름
  'kw.naming': String.raw`(강물|강|숲|산|평원|들판|들|언덕|사막|마을|신전)(?:을|를)\s*['"“‘]?([가-힣]{1,6}(?:\s[가-힣]{1,4})?)['"”’]?\s*(?:이)?라\s*(?:부르|칭하|하라|이름)`,
  // 이름 끝에서 떼어 낼 말
  'kw.namingTail': '(이)$',
  'kw.nameable': { 강: 'river', 강물: 'river', 숲: 'forest', 산: 'mountain', 평원: 'plain', 들판: 'plain', 들: 'plain', 언덕: 'hill', 사막: 'desert', 마을: 'village', 신전: 'capital' },

  // 예언: 유형 → 미래형 확인 → 부정 거르기 → 기한(m[1] = 수)
  'kw.prophecy.capital': '(탑|수도|성채).*(무너|흔들|부서|쓰러)',
  'kw.prophecy.fall': '(마을|땅|성벽).*(무너|함락|빼앗|불타|부서)|(무너|함락).*(마을|땅)',
  'kw.prophecy.convert': '(개종|돌아오|돌아서|품으|말씀을 받)',
  'kw.prophecy.pop': '(불어나|번성|늘어나|자손|태어나)',
  'kw.prophecy.future': '리라|리니|것이다|되리|지리',
  'kw.prophecy.negated': String.raw`지\s*않|지\s*못|아니하|마라|말라|지\s*마`,
  'kw.prophecy.big': String.raw`(\d+)\s*(장|계절|번)`,
  'kw.prophecy.count': String.raw`(한|두|세|1|2|3)\s*(장|계절|번)`,
  // 기한의 수 낱말 (숫자가 아닌 것)
  'kw.prophecy.numbers': { 한: 1, 두: 2, 세: 3 },
};
