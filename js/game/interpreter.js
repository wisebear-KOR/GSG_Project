// 계시 해석기: 대사제 LLM(Prompt API)과, LLM을 쓸 수 없을 때의 석판(키워드) 해석기
// 둘 다 { interpretation, orders, forbidden, doctrine, source } 형태로 돌려준다.
// orders/forbidden은 엔진의 행동 객체 목록이다.

import { hasLanguageModel, createBaseSession, promptJSON } from '../llm.js';
import { DOCTRINES, DOCTRINE, PRIESTS, TERRAIN, DOCTRINE_VOICE } from './data.js';
import { nouns } from './lore.js';
import { legalActions, actionLimit, tileName, villageCount, enemyIntent, nextEvent, gatherAmount, cathedralVillages, setPlanSig, capitalOf, distance } from './engine.js';
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
// 장소가 드러난 규칙을 먼저 둔다 (강물 → 강가 채집). match(a, tile). kind는 "알아들었으나 못 한다"를 알릴 때 쓴다
const kw = (key, flags) => new RegExp(t(key), flags);
const TABLET_RULES = [
  { kind: 'gather', re: kw('kw.tablet.river'), match: (a, t) => a.type === 'gather' && t.terrain === 'river', doctrine: 'abundance' },
  { kind: 'gather', re: kw('kw.tablet.hill'), match: (a, t) => a.type === 'gather' && t.terrain === 'hill', doctrine: 'wisdom' },
  { kind: 'preach', re: kw('kw.tablet.preach'), match: (a) => a.type === 'preach', doctrine: 'peace' },
  { kind: 'attack', re: kw('kw.tablet.attack'), except: kw('kw.tablet.attackExcept'), match: (a) => a.type === 'attack', doctrine: 'war' },
  { kind: 'pray', re: kw('kw.tablet.rest'), match: (a) => a.type === 'pray', doctrine: 'peace' },
  { kind: 'wall', re: kw('kw.tablet.wall'), except: kw('kw.tablet.wallExcept'), match: (a) => a.build === 'wall', doctrine: 'war' },
  { kind: 'gather', re: kw('kw.tablet.food'), match: (a) => a.gather === 'food', doctrine: 'abundance' },
  { kind: 'gather', re: kw('kw.tablet.wood'), match: (a) => a.gather === 'wood', doctrine: 'abundance' },
  { kind: 'gather', re: kw('kw.tablet.stone'), match: (a) => a.gather === 'stone', doctrine: 'abundance' },
  { kind: 'village', re: kw('kw.tablet.village'), except: kw('kw.tablet.villageExcept'), match: (a) => a.build === 'village', doctrine: 'abundance' },
  { kind: 'temple', re: kw('kw.tablet.temple'), except: kw('kw.tablet.templeExcept'), match: (a) => a.build === 'temple' || a.build === 'cathedral', doctrine: 'wisdom' },
  { kind: 'pray', re: kw('kw.tablet.pray'), match: (a) => a.type === 'pray', doctrine: 'wisdom' },
  { kind: 'explore', re: kw('kw.tablet.explore'), match: (a) => a.type === 'explore', doctrine: 'wisdom' },
  { kind: 'gather', re: kw('kw.tablet.gatherAny'), match: (a) => a.type === 'gather', doctrine: 'abundance', fallback: true },
];
const MANY = kw('kw.many');
// 수의 말: "마을 두 개" → 규칙 하나가 명령을 둘까지, "세 곳" → 셋까지
const COUNT = [[kw('kw.count3'), 3], [kw('kw.count2'), 2]];
const DONT_AND = kw('kw.dontAnd', 'g');
const NOUN_AND = kw('kw.nounAnd', 'g');
const STOP_AND = kw('kw.stopAnd', 'g');
const ENOUGH_AND = kw('kw.enoughAnd', 'g');
const FEAR = kw('kw.fear');
const toNeg = (m, verb) => (FEAR.test(verb) ? `${verb} ` : t('kw.dontAndNeg', { verb }));
// 앞의 것을 금지 절로 떼어 낸다: "숲을 베지 말고 돌을 캐라" → "숲을 베지 마라, 돌을 캐라", "공격 말고 선교",
// "나무는 그만 베고 돌을 캐라", "기도는 됐고 일이나 해". "두려워하지 말고 쳐라"는 금지가 아니다 → "두려워하 쳐라"
const splitDont = (text) => text.replace(DONT_AND, toNeg).replace(STOP_AND, toNeg).replace(ENOUGH_AND, toNeg).replace(NOUN_AND, toNeg);
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

// 곳을 가리키는 말: 수도·성지·율법파가 노리는 곳·칸 이름(E4)·붙인 이름은 칸을, "숲에"처럼 장소가 된 지형은 지형을 가리킨다.
// 장소가 된 지형 말은 지운 글(text)로 규칙을 읽는다 — "숲에 마을을 세워라"는 나무를 베라는 말이 아니다
const PLACE_TERRAIN = ['river', 'plain', 'forest', 'mountain', 'hill', 'desert'].map((k) => [k, kw(`kw.place.${k}`, 'g')]);
const PLACE = {
  capital: kw('kw.place.capital'), holy: kw('kw.place.holy'), aim: kw('kw.place.aim'), near: kw('kw.place.near'),
  foe: kw('kw.place.foe'), ours: kw('kw.place.ours'), id: kw('kw.place.id'),
};
function placeOf(state, clause) {
  const anchors = new Set();
  const terrains = new Set();
  let text = clause;
  for (const [k, re] of PLACE_TERRAIN) {
    re.lastIndex = 0;
    if (re.test(text)) { terrains.add(k); re.lastIndex = 0; text = text.replace(re, ' '); }
  }
  if (PLACE.capital.test(clause)) {
    const foe = PLACE.foe.test(clause);
    const ours = PLACE.ours.test(clause);
    for (const side of ['player', 'enemy']) {
      if (foe || ours ? (side === 'enemy' ? foe : ours) : true) { const c = capitalOf(state, side); if (c) anchors.add(c.id); }
    }
  }
  if (PLACE.holy.test(clause) && state.holyId) anchors.add(state.holyId);
  if (PLACE.aim.test(clause)) for (const x of enemyIntent(state)) if (x.shown) anchors.add(x.tile);
  const m = clause.match(PLACE.id);
  if (m && state.tileAt[m[1].toUpperCase() + m[2]]) anchors.add(m[1].toUpperCase() + m[2]);
  for (const [id, name] of Object.entries(state.names ?? {})) if (clause.includes(name)) anchors.add(id);
  return { anchors, terrains, near: PLACE.near.test(clause), text };
}
// 가리킨 곳에 맞을수록 앞 (같으면 원래 순서): 가리킨 칸 4 ("옆에"면 그 이웃이 4), 가리킨 칸의 이웃 2, 지형이 맞으면 +1
function byPlace(state, place, matches) {
  if (!place.anchors.size && !place.terrains.size) return matches;
  const score = (a) => {
    const tl = state.tileAt[a.tile];
    let s = 0;
    for (const id of place.anchors) {
      const d = distance(tl, state.tileAt[id]);
      s = Math.max(s, d === 0 ? (place.near ? 1 : 4) : d === 1 ? (place.near ? 4 : 2) : 0);
    }
    return s + (place.terrains.has(tl.terrain) ? 1 : 0);
  };
  return matches.map((a, i) => ({ a, i, s: score(a) })).sort((x, y) => y.s - x.s || x.i - y.i).map((x) => x.a);
}

// 알아들었으나 할 수 없는 까닭: 계명·시련이 막았으면 그것을, 아니면 종류만 (언어팩이 문장으로 바꾼다)
function cannotWhy(state, kind) {
  const cmd = state.commandments ?? [];
  if (kind === 'attack' && cmd.includes('noSword')) return 'attack:law';
  if (kind === 'attack' && state.config.trial === 'earth') return 'attack:earth';
  if (kind === 'village' && cmd.includes('noExpand')) return 'village:law';
  if (kind === 'temple' && state.sides.player.templeLevel >= 3 && villageCount(state, 'player') < cathedralVillages(state)) return 'temple:villages';
  return kind;
}
const baseKind = (a) => (a.type === 'gather' ? 'gather' : a.type === 'build' ? (a.build === 'cathedral' ? 'temple' : a.build) : a.type);

export function interpretWithTablet(state, revelation) {
  const legal = legalActions(state, 'player');
  const limit = actionLimit(state, 'player');
  const orders = [];
  const forbidden = [];
  let doctrine = null;
  const learned = (state.lessons ?? []).map((l) => ({
    re: new RegExp(l.word), doctrine: null,
    match: (a) => a.type === l.type && (!l.gather || a.gather === l.gather) && (!l.build || a.build === l.build),
  }));
  // 붙인 이름만 말했으면 그 땅에서 할 수 있는 첫 일 (다른 규칙이 없을 때만 — 있으면 이름은 곳을 가리킨다)
  const named = Object.entries(state.names ?? {}).map(([id, name]) => ({ re: new RegExp(name), doctrine: null, lastResort: true, match: (a) => a.tile === id }));
  const rules = [...learned, ...TABLET_RULES, ...named];
  const hitsOf = (text) => rules.map((rule, idx) => ({ rule, idx, pos: text.search(rule.re) }))
    .filter((h) => h.pos >= 0 && !h.rule.except?.test(text));
  const heard = [];
  const banned = [];
  const picks = [];
  // 절 단위로 나눠서 부정어가 있는 절의 행동은 금지로 본다. 같은 칸을 다투면 규칙 순서(구체적인 말이 먼저)로,
  // 행동 수가 모자라면 먼저 말한 일부터 남긴다
  const clauses = splitDont(revelation).split(CLAUSE);
  for (let ci = 0; ci < clauses.length; ci++) {
    const clause = clauses[ci];
    if (!clause.trim()) continue;
    const negative = NEGATION.test(clause);
    const many = COUNT.find(([re]) => re.test(clause))?.[1] ?? (MANY.test(clause) ? 2 : 1);
    const place = placeOf(state, clause);
    let hits = hitsOf(place.text);
    if (!hits.length && place.text !== clause) hits = hitsOf(clause);
    const found = hits.map((h) => ({ ...h, matches: byPlace(state, place, rankMatches(state, h.rule, legal.filter((a) => h.rule.match(a, state.tileAt[a.tile])))) }));
    // 무엇을 거둘지 말했으면 "거두라" 같은 두루뭉술한 채집은 쓰지 않는다
    const gathered = found.some((h) => !h.rule.fallback && !h.rule.lastResort && h.matches.some((a) => a.type === 'gather'));
    const plain = found.some((h) => !h.rule.lastResort);
    for (const { rule, matches, pos } of found) {
      if ((rule.fallback && gathered) || (rule.lastResort && plain)) continue;
      if (negative) { forbidden.push(...matches); if (rule.kind) banned.push(rule.kind); continue; }
      // 알아들었으나 지금 할 수 없는 말 (닿는 율법파가 없다 등) — "흐릿하다"와 구별해 알려 준다
      if (!matches.length) { if (rule.kind) heard.push(cannotWhy(state, rule.kind)); continue; }
      // 가능한 행동이 없는 규칙은 교리를 정하지 않는다 ("평화를 지켜라"가 성벽이 없어 전쟁이 되지 않게)
      if (rule.doctrine) doctrine ??= rule.doctrine;
      let took = 0;
      const free = (b) => !picks.some((o) => o.a.tile === b.tile || o.a.key === b.key);
      for (const a of matches) {
        if (took >= many) break;
        if (!free(a)) continue;
        picks.push({ a, ci, pos, kind: rule.kind, alts: matches }); took += 1;
      }
      // 칸이 모두 찼으면 먼저 온 일을 다른 칸으로 옮길 수 있는지 본다 ("성벽을 쌓고 기도하라" → 성벽은 마을에)
      for (const a of took ? [] : matches) {
        const holder = picks.find((o) => o.a.tile === a.tile);
        const alt = holder?.alts.find((b) => b.key !== holder.a.key && b.tile !== a.tile && free(b));
        if (!alt) continue;
        holder.a = alt;
        picks.push({ a, ci, pos, kind: rule.kind, alts: matches }); took = 1;
        break;
      }
      // 한 칸에 한 가지라 못 한 일도 까닭과 함께 알린다 ("기도하고 신전을 지어라" — 둘 다 수도에서 하는 일)
      if (!took && rule.kind) heard.push(`${rule.kind}:tile`);
    }
  }
  // 행동 수를 넘으면 먼저 말한 일부터 남기고, 빠진 일은 까닭과 함께 알린다
  const byTurn = picks.filter((p) => !forbidden.some((f) => f.key === p.a.key)).map((p, i) => ({ ...p, i })).sort((x, y) => x.ci - y.ci || x.pos - y.pos || x.i - y.i);
  for (const p of byTurn.slice(limit)) if (p.kind) heard.push(`${p.kind}:limit`);
  const keep = new Set(byTurn.slice(0, limit).map((p) => p.a.key));
  orders.push(...picks.map((p) => p.a).filter((a) => keep.has(a.key)));
  const kept = orders;
  const done = new Set(kept.map(baseKind));
  const unheard = [...new Set(heard)].filter((k) => !done.has(k.split(':')[0]));
  const verbs = kept.map((a) => a.text.replace(/ \(.*\)$/, ''));
  return {
    interpretation: kept.length
      ? t('interp.tablet.say', { prefix: voiceOf(state) ? DOCTRINE_VOICE[voiceOf(state)].prefix : t('interp.tablet.prefix'), verbs })
      : unheard.length ? t('interp.tablet.cannot', { kinds: unheard }) : t('interp.tablet.blur'),
    heard: unheard,
    banned: [...new Set(banned)],
    orders: kept,
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
