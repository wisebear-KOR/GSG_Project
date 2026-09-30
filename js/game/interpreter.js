// 계시 해석기: 대사제 LLM(Prompt API)과, LLM을 쓸 수 없을 때의 석판(키워드) 해석기
// 둘 다 { interpretation, orders, forbidden, doctrine, source } 형태로 돌려준다.
// orders/forbidden은 엔진의 행동 객체 목록이다.

import { hasLanguageModel, createBaseSession, promptJSON } from '../llm.js';
import { DOCTRINES, DOCTRINE, PRIESTS, TERRAIN, DOCTRINE_VOICE } from './data.js';
import { nouns } from './lore.js';
import { legalActions, actionLimit, tileName, villageCount, enemyIntent, nextEvent, gatherAmount, cathedralVillages, setPlanSig } from './engine.js';
import { t } from './i18n.js';

// 실험 v5 프롬프트를 게임에 맞게 옮긴 것 (docs/EXPERIMENTS.md).
// 플레이테스트(docs/PLAYTEST-2026-09-27.md) 반영: 행동을 먼저 정하고 해석문은 마지막에 쓴다 → 말과 행동이 일치한다.
const SYSTEM_PROMPT = t('interp.systemPrompt');

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
    const note = list.length > 1 ? t('interp.oneOnly') : '';
    return `[${name}]${note}\n${list.map((a) => `  ${a.id}: ${a.text}`).join('\n')}`;
  });
  const p = state.sides.player;
  const e = state.sides.enemy;
  const limit = actionLimit(state, 'player');
  const recent = state.revelations.slice(-2).map((r) => `"${r.text}"`).join(', ') || t('interp.none');
  const threat = enemyIntent(state).filter((a) => a.shown && ['attack', 'preach'].includes(a.type))
    .map((a) => t('interp.threat', { place: tileName(state, state.tileAt[a.tile], 'player'), type: a.type })).join(', ');
  const voice = voiceOf(state, 4);
  const next = nextEvent(state) && state.round < state.maxRounds ? nextEvent(state).name : '';
  const text = t('interp.prompt', {
    food: p.food, wood: p.wood, stone: p.stone, faith: p.faith,
    pop: p.pop, limit, templeLevel: p.templeLevel, villages: villageCount(state, 'player'),
    enemyPop: e.pop, enemyVillages: villageCount(state, 'enemy'), capitalHp: e.capitalHp, threat,
    recent, god: state.config.god?.name ?? '', lessons: lessonList(state),
    voice: voice ? DOCTRINE_VOICE[voice].prompt : '', canon: state.config.canon ? state.config.canon.text : null,
    priest: PRIESTS[state.priest]?.prompt ?? '',
    actions: lines.join('\n'), event: state.event.text,
    choice: state.event.choice ? state.event.choice.map((o) => o.label).join(' / ') : '', next,
    revelation,
  });
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

const lessonName = (l) => t('interp.lessonName', { type: l.type, gather: l.gather, build: l.build });
// 신학 노트 목록 (프롬프트에 넣는다). 없으면 빈 문자열
function lessonList(state) {
  if (!state.lessons?.length) return '';
  return state.lessons.map((l) => t('interp.lessonItem', { word: l.word, name: lessonName(l) })).join(', ');
}
export const describeLesson = lessonName;

// 가장 깊은 교리가 min칸 이상이면 그 교리 (사제의 말투)
export function voiceOf(state, min = 3) {
  const d = state.sides.player.doctrine;
  const top = DOCTRINES.reduce((b, k) => (d[k] > d[b] ? k : b), 'wisdom');
  return d[top] >= min ? top : null;
}

// 해석문 다듬기 (플레이테스트에서 34건 중 10건이 어색한 "도다"로 끝났다)
// - 다른 문자(벵골 문자, 한자 등) 제거
// - 좌표 표기 제거: "산 C1", "평원(C2)"
// - 문장 뒤에 떠도는 "도다" 제거: "택하라! 도다!" → "택하라!", "되살려라 도다." → "되살려라."
// - "본도다/온도다/중요도다"처럼 어간에 잘못 붙은 "도다"를 "다"로
// - 문장은 두 개까지
const CLEAN = {
  coord: new RegExp(t('kw.clean.coord'), 'g'), dangling: new RegExp(t('kw.clean.dangling'), 'g'),
  afterVerb: new RegExp(t('kw.clean.afterVerb'), 'g'), stem: new RegExp(t('kw.clean.stem'), 'g'),
  stemFix: (a) => t('kw.clean.stemFix', { a }),
};
export function cleanSpeech(text) {
  let t = text.replace(/[^\p{Script=Hangul}\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]/gu, '');
  t = t.replace(CLEAN.coord, '');
  t = t.replace(CLEAN.dangling, '$1');
  t = t.replace(CLEAN.afterVerb, '$1$2');
  t = t.replace(CLEAN.stem, (m, a) => CLEAN.stemFix(a));
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
      if (!out.data) throw new Error(out.error ?? t('interp.jsonFail'));
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
const kw = (key, flags) => new RegExp(t(key), flags);
const TABLET_RULES = [
  { re: kw('kw.tablet.river'), match: (a, t) => a.type === 'gather' && t.terrain === 'river', doctrine: 'abundance' },
  { re: kw('kw.tablet.hill'), match: (a, t) => a.type === 'gather' && t.terrain === 'hill', doctrine: 'wisdom' },
  { kind: 'preach', re: kw('kw.tablet.preach'), match: (a) => a.type === 'preach', doctrine: 'peace' },
  { kind: 'attack', re: kw('kw.tablet.attack'), match: (a) => a.type === 'attack', doctrine: 'war' },
  { re: kw('kw.tablet.rest'), match: (a) => a.type === 'pray', doctrine: 'peace' },
  { kind: 'wall', re: kw('kw.tablet.wall'), except: kw('kw.tablet.wallExcept'), match: (a) => a.build === 'wall', doctrine: 'war' },
  { re: kw('kw.tablet.food'), match: (a) => a.gather === 'food', doctrine: 'abundance' },
  { re: kw('kw.tablet.wood'), match: (a) => a.gather === 'wood', doctrine: 'abundance' },
  { re: kw('kw.tablet.stone'), match: (a) => a.gather === 'stone', doctrine: 'abundance' },
  { kind: 'village', re: kw('kw.tablet.village'), except: kw('kw.tablet.villageExcept'), match: (a) => a.build === 'village', doctrine: 'abundance' },
  { kind: 'temple', re: kw('kw.tablet.temple'), except: kw('kw.tablet.templeExcept'), match: (a) => a.build === 'temple' || a.build === 'cathedral', doctrine: 'wisdom' },
  { re: kw('kw.tablet.pray'), match: (a) => a.type === 'pray', doctrine: 'wisdom' },
  { kind: 'explore', re: kw('kw.tablet.explore'), match: (a) => a.type === 'explore', doctrine: 'wisdom' },
  { re: kw('kw.tablet.gatherAny'), match: (a) => a.type === 'gather', doctrine: 'abundance', fallback: true },
];
const MANY = kw('kw.many');
const DONT_AND = kw('kw.dontAnd', 'g');
const FEAR = kw('kw.fear');
// "숲을 베지 말고 돌을 캐라" → "숲을 베지 마라, 돌을 캐라" / "두려워하지 말고 쳐라" → "두려워하 쳐라"
const splitDont = (text) => text.replace(DONT_AND, (m, verb) => (FEAR.test(verb) ? `${verb} ` : t('kw.dontAndNeg', { verb })));
// 같은 채집이면 더 많이 나오는 칸부터, 무엇을 거둘지 말하지 않았으면 가장 모자란 자원부터
function rankMatches(state, rule, matches) {
  if (!matches.length || matches[0].type !== 'gather') return matches;
  const p = state.sides.player;
  const need = (a) => (rule.fallback ? p[a.gather] ?? 0 : 0);
  return matches.map((a, i) => ({ a, i, n: need(a), g: gatherAmount(state, 'player', state.tileAt[a.tile]) }))
    .sort((x, y) => x.n - y.n || y.g - x.g || x.i - y.i).map((x) => x.a);
}
// "두려워하지 말고 쳐라"는 금지가 아니다 (두려워는 부정어가 아니다)
const NEGATION = kw('kw.negation');
const CLAUSE = kw('kw.clauseSplit');

// 알아들었으나 할 수 없는 까닭: 계명·시련이 막았으면 그것을, 아니면 종류만 (언어팩이 문장으로 바꾼다)
function cannotWhy(state, kind) {
  const cmd = state.commandments ?? [];
  if (kind === 'attack' && cmd.includes('noSword')) return 'attack:law';
  if (kind === 'attack' && state.config.trial === 'earth') return 'attack:earth';
  if (kind === 'village' && cmd.includes('noExpand')) return 'village:law';
  if (kind === 'temple' && state.sides.player.templeLevel >= 3 && villageCount(state, 'player') < cathedralVillages(state)) return 'temple:villages';
  return kind;
}

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
  const heard = [];
  for (const clause of splitDont(revelation).split(CLAUSE)) {
    const negative = NEGATION.test(clause);
    const many = MANY.test(clause) ? 2 : 1;
    let gathered = false;
    for (const rule of [...named, ...learned, ...TABLET_RULES]) {
      if (!rule.re.test(clause) || rule.except?.test(clause)) continue;
      if (rule.fallback && gathered) continue;
      const matches = rankMatches(state, rule, legal.filter((a) => rule.match(a, state.tileAt[a.tile])));
      if (matches.some((a) => a.type === 'gather')) gathered = true;
      if (negative) { forbidden.push(...matches); continue; }
      // 알아들었으나 지금 할 수 없는 말 (닿는 율법파가 없다 등) — "흐릿하다"와 구별해 알려 준다
      if (!matches.length && rule.kind) heard.push(cannotWhy(state, rule.kind));
      // 가능한 행동이 없는 규칙은 교리를 정하지 않는다 ("평화를 지켜라"가 성벽이 없어 전쟁이 되지 않게)
      if (matches.length && rule.doctrine) doctrine ??= rule.doctrine;
      let took = 0;
      for (const a of matches) {
        if (took >= many || orders.length >= limit) break;
        if (orders.some((o) => o.tile === a.tile || o.key === a.key)) continue;
        orders.push(a); took += 1;
        // 양의 말이 없으면 규칙마다 비어 있는 첫 후보 하나만 쓴다
        if (many === 1) break;
      }
    }
  }
  const verbs = orders.map((a) => a.text.replace(/ \(.*\)$/, ''));
  return {
    interpretation: orders.length
      ? t('interp.tablet.say', { prefix: voiceOf(state) ? DOCTRINE_VOICE[voiceOf(state)].prefix : t('interp.tablet.prefix'), verbs })
      : heard.length ? t('interp.tablet.cannot', { kinds: [...new Set(heard)] }) : t('interp.tablet.blur'),
    heard: [...new Set(heard)],
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
const LESSON_STOP = new Set(t('kw.lessonStop'));
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

// 되풀이 판정에 쓰는 일의 목록: 석판이 이 계시에서 알아듣는 일의 종류 (칸은 보지 않는다)
const kindKey = (a) => (a.type === 'gather' ? `gather:${a.gather}` : a.type === 'build' ? `build:${a.build}` : a.type);
setPlanSig((state, text) => [...new Set(interpretWithTablet(state, text).orders.map(kindKey))].sort().join('|'));
