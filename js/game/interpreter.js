// 계시 해석기: 대사제 LLM(Prompt API)과, LLM을 쓸 수 없을 때의 석판(키워드) 해석기
// 둘 다 { interpretation, orders, forbidden, doctrine, source } 형태로 돌려준다.
// orders/forbidden은 엔진의 행동 객체 목록이다.

import { hasLanguageModel, createBaseSession, promptJSON } from '../llm.js';
import { DOCTRINES, DOCTRINE, PRIESTS, TERRAIN } from './data.js';
import { nouns } from './lore.js';
import { legalActions, actionLimit, tileName, villageCount, enemyIntent, josa, nextEvent } from './engine.js';

// 실험 v5 프롬프트를 게임에 맞게 옮긴 것 (docs/EXPERIMENTS.md).
// 플레이테스트(docs/PLAYTEST-2026-09-27.md) 반영: 행동을 먼저 정하고 해석문은 마지막에 쓴다 → 말과 행동이 일치한다.
const SYSTEM_PROMPT = `너는 한 부족의 대사제다. 신의 짧은 계시를 해석해, 이번 장에 부족이 할 일을 정한다.

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
- 참고로, 계시가 "바람을 읽어라"였고 탐험을 골랐다면 이렇게 쓴다: 바람이 방향을 바꾸었다. 안개 너머로 나아가라!`;

const DOCTRINE_KO = Object.fromEntries(DOCTRINES.map((d) => [DOCTRINE[d].name, d]));

// 가능한 행동에 A1, A2… ID를 붙이고 장소별로 묶어 프롬프트를 만든다
export function buildPrompt(state, revelation) {
  const legal = legalActions(state, 'player');
  const ids = legal.map((a, i) => ({ ...a, id: `A${i + 1}` }));
  const byTile = new Map();
  for (const a of ids) {
    if (!byTile.has(a.tile)) byTile.set(a.tile, []);
    byTile.get(a.tile).push(a);
  }
  const lines = [...byTile.entries()].map(([tile, list]) => {
    const name = tileName(state, state.tileAt[tile], 'player');
    const note = list.length > 1 ? ' (하나만 선택)' : '';
    return `[${name}]${note}\n${list.map((a) => `  ${a.id}: ${a.text}`).join('\n')}`;
  });
  const p = state.sides.player;
  const e = state.sides.enemy;
  const limit = actionLimit(state, 'player');
  const recent = state.revelations.slice(-2).map((r) => `"${r.text}"`).join(', ') || '없음';
  const verb = { attack: '공격하려', preach: '개종시키려', build: '지으려', gather: '채집하려', pray: '기도하려' };
  const threat = enemyIntent(state).filter((a) => a.shown && ['attack', 'preach'].includes(a.type))
    .map((a) => `${josa(tileName(state, state.tileAt[a.tile], 'player'), '을', '를')} ${verb[a.type]} 한다`).join(', ');
  const text = `[부족 상황]
자원: 식량 ${p.food}, 목재 ${p.wood}, 돌 ${p.stone}, 신앙 ${p.faith}
신도: ${p.pop}명 (이번 라운드 행동 가능 ${limit}회), 신전 ${p.templeLevel}단계, 마을 ${villageCount(state, 'player')}개
율법파: 신도 ${e.pop}명, 마을 ${villageCount(state, 'enemy')}개, 수도 내구도 ${e.capitalHp}${threat ? `\n율법파의 의도: ${threat}` : ''}
지난 계시: ${recent}${lessonLine(state)}${state.config.canon ? `\n이 부족의 경전: "${state.config.canon.text}"` : ''}${PRIESTS[state.priest]?.prompt ? `\n${PRIESTS[state.priest].prompt}` : ''}

[가능한 행동]
${lines.join('\n')}

[최근 사건]
${state.event.text}${nextEvent(state) && state.round < state.maxRounds ? `\n다음 장: ${nextEvent(state).name} 예고` : ''}

[신의 계시]
"${revelation}"

금지한 행동, 따를 행동(1~${limit}개), 교리를 정한 뒤, 고른 행동을 외치는 말을 JSON으로 답하라.`;
  const idList = ids.map((a) => a.id);
  // 속성 순서가 생성 순서다: 금지 → 행동 → 교리 → 해석문
  const schema = {
    type: 'object',
    properties: {
      forbidden: { type: 'array', items: { type: 'string', enum: idList }, maxItems: 6 },
      orders: { type: 'array', items: { type: 'string', enum: idList }, minItems: 1, maxItems: Math.max(1, limit) },
      doctrine: { type: 'string', enum: DOCTRINES.map((d) => DOCTRINE[d].name) },
      interpretation: { type: 'string', maxLength: 110 },
    },
    required: ['forbidden', 'orders', 'doctrine', 'interpretation'],
  };
  return { text, schema, actions: ids };
}

const TYPE_KO = { gather: '채집', pray: '기도', build: '건설', preach: '선교', attack: '공격', explore: '탐험' };
const lessonName = (l) => (l.gather ? `${TYPE_KO.gather}(${{ food: '식량', wood: '목재', stone: '돌', faith: '신앙' }[l.gather]})` : l.build ? { village: '마을 건설', wall: '성벽', temple: '신전', cathedral: '대성당' }[l.build] : TYPE_KO[l.type]);
function lessonLine(state) {
  if (!state.lessons?.length) return '';
  return `\n대사제가 깨달은 신의 말버릇: ${state.lessons.map((l) => `'${l.word}'=${lessonName(l)}`).join(', ')}`;
}
export const describeLesson = lessonName;

// 해석문 다듬기 (플레이테스트에서 34건 중 10건이 어색한 "도다"로 끝났다)
// - 다른 문자(벵골 문자, 한자 등) 제거
// - 좌표 표기 제거: "산 C1", "평원(C2)"
// - 문장 뒤에 떠도는 "도다" 제거: "택하라! 도다!" → "택하라!", "되살려라 도다." → "되살려라."
// - "본도다/온도다/중요도다"처럼 어간에 잘못 붙은 "도다"를 "다"로
// - 문장은 두 개까지
export function cleanSpeech(text) {
  let t = text.replace(/[^\p{Script=Hangul}\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]/gu, '');
  t = t.replace(/\s*\(?[A-I][1-9]\)?(?=[\s,.!?을를이가에의]|$)/g, '');
  t = t.replace(/([!.?])\s*도다\s*[!.?]?/g, '$1');
  t = t.replace(/(라|어라|아라|하라|리라|지어다)\s+도다([!.?]?)/g, '$1$2');
  t = t.replace(/(본|온|간|중요|필요|분명|가능)도다/g, (m, a) => ({ 본: '보도다', 온: '오도다', 간: '가도다' })[a] ?? `${a}하도다`);
  t = t.replace(/\s{2,}/g, ' ').trim();
  const sentences = t.match(/[^.!?]+[.!?]*/g) ?? [t];
  return sentences.slice(0, 2).join('').trim();
}

// ---------- LLM 해석기 ----------
let base = null;

export async function llmStatus() {
  if (!hasLanguageModel()) return 'no-api';
  try {
    // 한국어는 공식 지원 언어가 아니라 영어 기준으로 모델 준비 상태를 확인한다
    return await LanguageModel.availability({
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });
  } catch {
    return 'unavailable';
  }
}

// 세션은 한 번만 만든다. 메인 화면에서 미리 부르면 첫 계시가 빨라진다 (첫 장 13초 → 3초)
let preparing = null;
export function prepareLLM(onProgress) {
  if (base) return Promise.resolve(base);
  preparing ??= createBaseSession({ systemPrompt: SYSTEM_PROMPT, languages: ['ko', 'en'], onProgress })
    .then((created) => { base = created.session; return base; })
    .catch((e) => { preparing = null; throw e; });
  return preparing;
}

export async function interpretWithLLM(state, revelation, signal) {
  const { text, schema, actions } = buildPrompt(state, revelation);
  const byId = Object.fromEntries(actions.map((a) => [a.id, a]));
  const session = await prepareLLM();
  let out;
  // 모델이 가끔 UnknownError로 실패하므로 한 번 다시 시도한다
  for (let attempt = 0; ; attempt++) {
    const s = await session.clone({ signal });
    try {
      out = await promptJSON(s, text, schema, signal);
      if (!out.data) throw new Error(out.error ?? 'JSON 파싱 실패');
      break;
    } catch (e) {
      if (e.name === 'AbortError' || attempt >= 1) throw e;
    } finally {
      s.destroy();
    }
  }
  const d = out.data;
  return {
    interpretation: cleanSpeech(d.interpretation),
    orders: d.orders.map((id) => byId[id]).filter(Boolean),
    forbidden: d.forbidden.map((id) => byId[id]).filter(Boolean),
    doctrine: DOCTRINE_KO[d.doctrine] ?? d.doctrine,
    source: 'llm',
    ms: Math.round(out.ms),
  };
}

// ---------- 석판 해석기 (키워드) ----------
// 장소가 드러난 규칙을 먼저 둔다 (강물 → 강가 채집). match(a, tile)
const TABLET_RULES = [
  { re: /강|물고기/, match: (a, t) => a.type === 'gather' && t.terrain === 'river', doctrine: 'abundance' },
  { re: /언덕/, match: (a, t) => a.type === 'gather' && t.terrain === 'hill', doctrine: 'wisdom' },
  { re: /사랑|이웃|전하|설득|가르|개종|품어/, match: (a) => a.type === 'preach', doctrine: 'peace' },
  { re: /분노|공격|싸우|싸움|쳐라|정복|불태|벌하|칼/, match: (a) => a.type === 'attack', doctrine: 'war' },
  { re: /쉬어|쉬라|안식|평화/, match: (a) => a.type === 'pray', doctrine: 'peace' },
  { re: /지켜|지키|방패|성벽|막아|수호/, match: (a) => a.build === 'wall', doctrine: 'war' },
  { re: /배고|굶|먹|곡식|수확|들판/, match: (a) => a.gather === 'food', doctrine: 'abundance' },
  { re: /나무|숲|목재/, match: (a) => a.gather === 'wood', doctrine: 'abundance' },
  { re: /돌|산|바위/, match: (a) => a.gather === 'stone', doctrine: 'abundance' },
  { re: /마을|넓혀|번성|퍼져|땅을/, match: (a) => a.build === 'village', doctrine: 'abundance' },
  { re: /높은|높이|신전|탑|대성당/, match: (a) => a.build === 'temple' || a.build === 'cathedral', doctrine: 'wisdom' },
  { re: /기도|경배|섬기|바쳐|찬양|믿음/, match: (a) => a.type === 'pray', doctrine: 'wisdom' },
  { re: /찾|보이지|안개|탐험|숨겨|너머/, match: (a) => a.type === 'explore', doctrine: 'wisdom' },
];
// "두려워하지 말고 쳐라"는 금지가 아니다 (두려워는 부정어가 아니다)
const NEGATION = /마라|말라|말지|지 ?마|피하|멀리/;

export function interpretWithTablet(state, revelation) {
  const legal = legalActions(state, 'player');
  const limit = actionLimit(state, 'player');
  const orders = [];
  const forbidden = [];
  let doctrine = null;
  // 절 단위로 나눠서 부정어가 있는 절의 행동은 금지로 본다
  const learned = (state.lessons ?? []).map((l) => ({
    re: new RegExp(l.word), doctrine: null,
    match: (a) => a.type === l.type && (!l.gather || a.gather === l.gather) && (!l.build || a.build === l.build),
  }));
  const named = Object.entries(state.names ?? {}).map(([id, name]) => ({ re: new RegExp(name), doctrine: null, match: (a) => a.tile === id }));
  for (const clause of revelation.split(/[.,!?。]|그리고|하되|그러나/)) {
    const negative = NEGATION.test(clause);
    for (const rule of [...named, ...learned, ...TABLET_RULES]) {
      if (!rule.re.test(clause)) continue;
      const matches = legal.filter((a) => rule.match(a, state.tileAt[a.tile]));
      if (negative) forbidden.push(...matches);
      else {
        // 가능한 행동이 없는 규칙은 교리를 정하지 않는다 ("평화를 지켜라"가 성벽이 없어 전쟁이 되지 않게)
        if (matches.length && rule.doctrine) doctrine ??= rule.doctrine;
        for (const a of matches) {
          if (orders.length < limit && !orders.some((o) => o.tile === a.tile)) orders.push(a);
          break;
        }
      }
    }
  }
  const verbs = orders.map((a) => a.text.replace(/ \(.*\)$/, '')).join(', 그리고 ');
  return {
    interpretation: orders.length
      ? `석판에 새겨진 말씀이도다. ${verbs}!`
      : '석판의 말씀이 흐릿하도다. 각자 할 일을 하라.',
    orders: orders.filter((a) => !forbidden.some((f) => f.key === a.key)),
    forbidden,
    doctrine: doctrine ?? (forbidden.length ? 'peace' : null),
    source: 'tablet',
  };
}

// ---------- 말과 행동 잇기 ----------
// 행동마다 계시 속 어떤 낱말이 그 행동을 불렀는지 찾는다: 이름 → 신학 노트 → 석판 규칙 → 지형 이름
export function linkWords(state, revelation, orders) {
  const out = {};
  if (!revelation) return out;
  for (const a of orders) {
    const t = state.tileAt[a.tile];
    let word = null;
    const name = state.names?.[a.tile];
    if (name && revelation.includes(name)) word = name;
    for (const l of state.lessons ?? []) if (!word && revelation.includes(l.word) && a.type === l.type && (!l.gather || a.gather === l.gather)) word = l.word;
    for (const rule of TABLET_RULES) {
      if (word) break;
      const m = revelation.match(rule.re);
      if (m && rule.match(a, t)) word = m[0];
    }
    const terr = TERRAIN[t?.terrain]?.name;
    if (!word && terr && revelation.includes(terr)) word = terr;
    if (word) out[a.key] = word;
  }
  return out;
}

// 신학 노트: 석판 규칙에 없는 낱말이 명령한 행동을 불렀다면 그 말버릇을 배운다
const LESSON_STOP = new Set(['신도', '말씀', '백성', '부족', '율법파', '율법', '계절', '이번', '신이', '신께서', '나의', '모든']);
const BASIC = new RegExp(TABLET_RULES.map((r) => r.re.source).join('|'));
export function extractLesson(state, revelation, orders) {
  if (!revelation || !orders.length) return null;
  const words = nouns(revelation).filter((w) => !BASIC.test(w) && !LESSON_STOP.has(w) && !Object.values(state.names ?? {}).includes(w));
  if (!words.length) return null;
  const a = orders[0];
  const known = (state.lessons ?? []).find((l) => l.word === words[0]);
  if (known) return null;
  return { word: words[0], type: a.type, gather: a.gather ?? null, build: a.build ?? null };
}
