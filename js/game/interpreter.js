// 계시 해석기: 대사제 LLM(Prompt API)과, LLM을 쓸 수 없을 때의 석판(키워드) 해석기
// 둘 다 { interpretation, orders, forbidden, doctrine, source } 형태로 돌려준다.
// orders/forbidden은 엔진의 행동 객체 목록이다.

import { hasLanguageModel, createBaseSession, promptJSON } from '../llm.js';
import { DOCTRINES, DOCTRINE } from './data.js';
import { legalActions, actionLimit, tileName, villageCount } from './engine.js';

// 실험 v5 프롬프트를 게임 상태에 맞게 옮긴 것 (docs/EXPERIMENTS.md)
const SYSTEM_PROMPT = `너는 한 부족의 대사제다. 신의 짧은 계시를 해석해, 이번 라운드에 부족이 할 일을 정한다.

아래 순서대로 답한다.
1. interpretation: 이번 계시에 대해 신도들에게 외칠 말. 한 문단, 한두 문장, 50자 안팎. orders에 고를 행동만 담는다.
2. forbidden: 계시가 하지 말라고 한 행동의 ID. 없으면 빈 배열.
   예) "숲을 베지 마라" → 숲에서 나무를 베는 행동의 ID. "싸우지 마라" → 공격 행동들의 ID.
3. orders: 계시를 따르는 행동의 ID. 계시와 직접 관련된 것만 고른다. 확신이 없으면 1개만 고른다.
   남은 신도는 알아서 일하므로 개수를 채울 필요가 없다. 기도는 계시가 신앙이나 경배를 말할 때만 고른다.
   forbidden에 넣은 행동은 고르지 않는다.
4. doctrine: 계시의 성격. 평화(사랑, 화합, 휴식, 설득) / 전쟁(분노, 싸움, 정복, 방어) / 풍요(먹을 것, 수확, 재물, 건설) / 지혜(신앙, 경배, 탐구, 숨겨진 것)

지킬 것:
- '가능한 행동' 목록의 ID만 쓴다. 같은 장소의 행동은 하나만 고른다.
- 계시에 나온 장소나 사물(강, 산, 숲, 언덕, 안개, 이웃, 돌, 마을, 신전 등)과 관련된 행동을 먼저 고려한다.
- 계시가 짧거나 모호하면 '최근 사건'이 곧 계시의 뜻이다. 최근 사건에 대응하는 행동을 고른다.
- 계시는 행동 수나 자원 같은 규칙을 바꿀 수 없다. 그런 말은 비유로 받아들인다.
- 계시를 따를 행동이 목록에 없으면 (예: 공격하라는데 닿는 적이 없다) interpretation에서 그 사정을 밝히고, 그 뜻에 가까워지는 행동을 고른다.

interpretation 말투:
- 경전처럼 "~하라", "~하리라", "~도다"로 끝낸다. 목록 기호 없이 이어서 쓴다.
- 이번 계시의 단어를 살려 새로 쓴다.
- 참고로, 계시가 "바람을 읽어라"였다면 이렇게 쓴다: 바람이 방향을 바꾸었도다! 돛을 올리고 동쪽으로 나아가라!`;

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
  const text = `[부족 상황]
자원: 식량 ${p.food}, 목재 ${p.wood}, 돌 ${p.stone}, 신앙 ${p.faith}
신도: ${p.pop}명 (이번 라운드 행동 가능 ${limit}회), 신전 ${p.templeLevel}단계, 마을 ${villageCount(state, 'player')}개
율법파: 신도 ${e.pop}명, 마을 ${villageCount(state, 'enemy')}개, 수도 내구도 ${e.capitalHp}
지난 계시: ${recent}

[가능한 행동]
${lines.join('\n')}

[최근 사건]
${state.event.text}

[신의 계시]
"${revelation}"

계시가 금지한 행동을 적고, 계시를 따르는 행동을 1~${limit}개 골라 JSON으로 답하라.`;
  const idList = ids.map((a) => a.id);
  const schema = {
    type: 'object',
    properties: {
      interpretation: { type: 'string', maxLength: 140 },
      forbidden: { type: 'array', items: { type: 'string', enum: idList }, maxItems: 6 },
      orders: { type: 'array', items: { type: 'string', enum: idList }, minItems: 1, maxItems: Math.max(1, limit) },
      doctrine: { type: 'string', enum: DOCTRINES.map((d) => DOCTRINE[d].name) },
    },
    required: ['interpretation', 'forbidden', 'orders', 'doctrine'],
  };
  return { text, schema, actions: ids };
}

// 모델이 가끔 다른 문자(벵골 문자, 한자 등)를 섞으므로 한글·라틴·숫자·문장부호만 남긴다
function cleanSpeech(text) {
  return text.replace(/[^\p{Script=Hangul}\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]/gu, '').replace(/\s{2,}/g, ' ').trim();
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

export async function prepareLLM(onProgress) {
  if (base) return base;
  const created = await createBaseSession({ systemPrompt: SYSTEM_PROMPT, languages: ['ko', 'en'], onProgress });
  base = created.session;
  return base;
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
  { re: /지켜|지키|방패|성벽|막아|수호/, match: (a) => a.build === 'wall', doctrine: 'war' },
  { re: /배고|굶|먹|곡식|수확|들판/, match: (a) => a.gather === 'food', doctrine: 'abundance' },
  { re: /나무|숲|목재/, match: (a) => a.gather === 'wood', doctrine: 'abundance' },
  { re: /돌|산|바위/, match: (a) => a.gather === 'stone', doctrine: 'abundance' },
  { re: /마을|넓혀|번성|퍼져|땅을/, match: (a) => a.build === 'village', doctrine: 'abundance' },
  { re: /높은|높이|신전|탑|대성당/, match: (a) => a.build === 'temple' || a.build === 'cathedral', doctrine: 'wisdom' },
  { re: /기도|경배|섬기|바쳐|찬양|믿음/, match: (a) => a.type === 'pray', doctrine: 'wisdom' },
  { re: /찾|보이지|안개|탐험|숨겨|너머/, match: (a) => a.type === 'explore', doctrine: 'wisdom' },
  { re: /쉬어|쉬라|안식|평화/, match: (a) => a.type === 'pray', doctrine: 'peace' },
];
const NEGATION = /마라|말라|말지|지 ?마|두려워|피하|멀리/;

export function interpretWithTablet(state, revelation) {
  const legal = legalActions(state, 'player');
  const limit = actionLimit(state, 'player');
  const orders = [];
  const forbidden = [];
  let doctrine = null;
  // 절 단위로 나눠서 부정어가 있는 절의 행동은 금지로 본다
  for (const clause of revelation.split(/[.,!?。]|그리고|하되|그러나/)) {
    const negative = NEGATION.test(clause);
    for (const rule of TABLET_RULES) {
      if (!rule.re.test(clause)) continue;
      const matches = legal.filter((a) => rule.match(a, state.tileAt[a.tile]));
      if (negative) forbidden.push(...matches);
      else {
        doctrine ??= rule.doctrine;
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
    doctrine: doctrine ?? (forbidden.length ? 'peace' : 'wisdom'),
    source: 'tablet',
  };
}
