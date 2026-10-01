// 계시 해석기: 대사제 LLM(Prompt API)과, LLM을 쓸 수 없을 때의 석판(키워드) 해석기
// 둘 다 { interpretation, orders, forbidden, doctrine, source } 형태로 돌려준다.
// orders/forbidden은 엔진의 행동 객체 목록이다.

import { hasLanguageModel, createBaseSession, promptJSON } from '../llm.js';
import { DOCTRINES, DOCTRINE, PRIESTS, TERRAIN, DOCTRINE_VOICE } from './data.js';
import { nouns } from './lore.js';
import { legalActions, actionLimit, tileName, villageCount, enemyIntent, nextEvent, gatherAmount, cathedralVillages, setPlanSig, capitalOf, distance, actionOdds } from './engine.js';
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
  { kind: 'gather', re: kw('kw.tablet.river'), except: kw('kw.tablet.riverExcept'), match: (a, t) => a.type === 'gather' && t.terrain === 'river', doctrine: 'abundance' },
  { kind: 'gather', re: kw('kw.tablet.hill'), except: kw('kw.place.holy'), match: (a, t) => a.type === 'gather' && t.terrain === 'hill', doctrine: 'wisdom' },
  { kind: 'preach', re: kw('kw.tablet.preach'), except: kw('kw.tablet.preachExcept'), match: (a) => a.type === 'preach', doctrine: 'peace' },
  { kind: 'attack', re: kw('kw.tablet.attack'), except: kw('kw.tablet.attackExcept'), match: (a) => a.type === 'attack', doctrine: 'war' },
  { kind: 'pray', re: kw('kw.tablet.rest'), except: kw('kw.tablet.restExcept'), match: (a) => a.type === 'pray', doctrine: 'peace' },
  { kind: 'wall', re: kw('kw.tablet.wall'), except: kw('kw.tablet.wallExcept'), match: (a) => a.build === 'wall', doctrine: 'war' },
  { kind: 'gather', re: kw('kw.tablet.food'), except: kw('kw.tablet.foodExcept'), match: (a) => a.gather === 'food', doctrine: 'abundance' },
  { kind: 'gather', re: kw('kw.tablet.wood'), except: kw('kw.tablet.woodExcept'), match: (a) => a.gather === 'wood', doctrine: 'abundance' },
  { kind: 'gather', re: kw('kw.tablet.stone'), except: kw('kw.tablet.stoneExcept'), match: (a) => a.gather === 'stone', doctrine: 'abundance' },
  { kind: 'village', re: kw('kw.tablet.village'), except: kw('kw.tablet.villageExcept'), match: (a) => a.build === 'village', doctrine: 'abundance' },
  { kind: 'temple', re: kw('kw.tablet.temple'), except: kw('kw.tablet.templeExcept'), match: (a) => a.build === 'temple' || a.build === 'cathedral', doctrine: 'wisdom' },
  { kind: 'pray', re: kw('kw.tablet.pray'), except: kw('kw.tablet.prayExcept'), match: (a) => a.type === 'pray', doctrine: 'wisdom' },
  { kind: 'explore', re: kw('kw.tablet.explore'), except: kw('kw.tablet.exploreExcept'), match: (a) => a.type === 'explore', doctrine: 'wisdom' },
  { kind: 'village', claim: true, re: kw('kw.tablet.claim'), match: (a) => a.build === 'village' || a.type === 'attack', doctrine: 'abundance' },
  { kind: 'gather', re: kw('kw.tablet.gatherAny'), except: kw('kw.tablet.gatherAnyExcept'), match: (a) => a.type === 'gather', doctrine: 'abundance', fallback: true },
];
const MANY = kw('kw.many');
// 수의 말: "마을 두 개" → 규칙 하나가 명령을 둘까지, "세 곳" → 셋까지
const COUNT = [[kw('kw.count3'), 3], [kw('kw.count2'), 2], [kw('kw.count1'), 1]];
const DONT_AND = kw('kw.dontAnd', 'g');
const NOUN_AND = kw('kw.nounAnd', 'g');
const STOP_AND = kw('kw.stopAnd', 'g');
const ENOUGH_AND = kw('kw.enoughAnd', 'g');
const NOT_BUT = kw('kw.notBut', 'g');
const INSTEAD = kw('kw.instead', 'g');
const IS_ID = kw('kw.place.idOnly');
const NOT_BUT_PLACE = kw('kw.notButPlace');
const FEAR = kw('kw.fear');
const toNeg = (m, verb) => (FEAR.test(verb) ? `${verb} ` : t('kw.dontAndNeg', { verb }));
// 앞의 것을 금지 절로 떼어 낸다: "숲을 베지 말고 돌을 캐라" → "숲을 베지 마라, 돌을 캐라", "공격 말고 선교",
// "나무는 그만 베고 돌을 캐라", "기도는 됐고 일이나 해". "두려워하지 말고 쳐라"는 금지가 아니다 → "두려워하 쳐라"
const splitDont = (text) => text.replace(DONT_AND, toNeg).replace(STOP_AND, toNeg).replace(ENOUGH_AND, toNeg).replace(NOT_BUT, (m, a, b) => (NOT_BUT_PLACE.test(a ?? b) ? ' ' : IS_ID.test(a ?? b) ? m : toNeg(m, a ?? b))).replace(INSTEAD, (m, a) => (IS_ID.test(a) ? m : toNeg(m, a))).replace(NOUN_AND, (m, a) => (IS_ID.test(a) ? m : toNeg(m, a)));
// 같은 채집이면 더 많이 나오는 칸부터, 무엇을 거둘지 말하지 않았으면 가장 모자란 자원부터
function rankMatches(state, rule, matches) {
  if (!matches.length) return matches;
  // 차지: 같은 자리면 마을을 먼저 (빈 땅을 먼저 차지해 막는다), 율법파 땅이면 공격
  if (rule.claim) return matches.map((a, i) => ({ a, i })).sort((x, y) => (x.a.type === 'attack') - (y.a.type === 'attack') || x.i - y.i).map((x) => x.a);
  // 선교·공격은 이길 만한 곳부터 (확인 칩에 보이는 확률) — "약한 마을을 쳐라", "성벽 없는 곳을"도 이렇게 풀린다
  if (matches[0].type === 'attack' || matches[0].type === 'preach') {
    const walls = new Set(enemyIntent(state).filter((x) => x.shown && x.build === 'wall').map((x) => x.tile));
    return matches.map((a, i) => ({ a, i, p: actionOdds(state, a, { wallAhead: walls.has(a.tile) }) ?? 0 })).sort((x, y) => y.p - x.p || x.i - y.i).map((x) => x.a);
  }
  if (matches[0].type !== 'gather') return matches;
  const p = state.sides.player;
  const need = (a) => (rule.fallback ? p[a.gather] ?? 0 : 0);
  return matches.map((a, i) => ({ a, i, n: need(a), g: gatherAmount(state, 'player', state.tileAt[a.tile]) }))
    .sort((x, y) => x.n - y.n || y.g - x.g || x.i - y.i).map((x) => x.a);
}
// "두려워하지 말고 쳐라"는 금지가 아니다 (두려워는 부정어가 아니다)
const NEGATION = kw('kw.negation');
const NOT_NEG = kw('kw.notNeg');
const NEG_CARRY = kw('kw.negCarry');
const SIMILE = kw('kw.simile');
const PARTIAL_NEG = kw('kw.partialNeg');
const CLAUSE = kw('kw.clauseSplit');

// 곳을 가리키는 말: 수도·성지·율법파가 노리는 곳·칸 이름(E4)·붙인 이름은 칸을, "숲에"처럼 장소가 된 지형은 지형을 가리킨다.
// 장소가 된 지형 말은 지운 글(text)로 규칙을 읽는다 — "숲에 마을을 세워라"는 나무를 베라는 말이 아니다
const PLACE_TERRAIN = ['river', 'plain', 'forest', 'mountain', 'hill', 'desert'].map((k) => [k, kw(`kw.place.${k}`, 'g')]);
const PLACE = {
  capital: kw('kw.place.capital'), holy: kw('kw.place.holy'), aim: kw('kw.place.aim'), near: kw('kw.place.near'),
  foe: kw('kw.place.foe'), ours: kw('kw.place.ours'), id: kw('kw.place.id'), village: kw('kw.place.village'),
  nearTerrain: kw('kw.place.nearTerrain'), home: kw('kw.place.home'), dir: kw('kw.place.dirWord'), closest: kw('kw.place.closest'), farthest: kw('kw.place.farthest'),
  foeVillage: kw('kw.place.foeVillage'), oasis: kw('kw.place.oasis'), gatherAt: kw('kw.place.gatherAt'), aimBuild: kw('kw.place.aimBuild'), quarry: kw('kw.place.quarry'), oasisAt: kw('kw.place.oasisAt'), claim: kw('kw.tablet.claim'), avoidId: kw('kw.place.avoidId', 'g'), ids: kw('kw.place.id', 'g'),
};
const HOSTILE = [kw('kw.tablet.attack'), kw('kw.tablet.preach')];
const VILLAGE_WORD = kw('kw.tablet.village');
const VILLAGE_EXCEPT = kw('kw.tablet.villageExcept');
function placeOf(state, clause) {
  const anchors = new Set();
  const terrains = new Set();
  let text = clause;
  // "산 옆에": 그 지형 칸들을 가리키고 그 이웃을 고른다 (산을 캐라는 말로 읽지 않는다)
  const nt = clause.match(PLACE.nearTerrain);
  if (nt) {
    const terrain = t('kw.place.terrainName')[nt[1]];
    for (const x of state.tiles) if (x.terrain === terrain) anchors.add(x.id);
    text = text.replace(nt[0], ' ');
  }
  for (const [k, re] of PLACE_TERRAIN) {
    re.lastIndex = 0;
    if (re.test(text)) { terrains.add(k); re.lastIndex = 0; text = text.replace(re, ' '); }
  }
  const ga = clause.match(PLACE.gatherAt);
  if (ga) { const k = t('kw.place.terrainName')[ga[1]]; if (k) terrains.add(k); }
  const named = [];
  if (PLACE.capital.test(clause)) {
    const foe = PLACE.foe.test(clause);
    const ours = PLACE.ours.test(clause);
    // 누구의 수도인지 말하지 않았으면: 칼·말씀의 말이 있거나 금하는 말이면 율법파 수도("수도는 건드리지 마라"), 아니면 우리 수도
    const mine = foe || ours ? ours : !HOSTILE.some((re) => re.test(clause)) && !NEGATION.test(clause);
    for (const side of ['player', 'enemy']) {
      if (foe || ours ? (side === 'enemy' ? foe : ours) : (side === 'player') === mine) { const c = capitalOf(state, side); if (c) { anchors.add(c.id); named.push(`capital.${side}`); } }
    }
  }
  if (PLACE.holy.test(clause) && state.holyId) { anchors.add(state.holyId); named.push('holy'); }
  // 이름 붙은 곳 (오아시스·채석장): 그 칸을 가리킨다
  for (const f of ['oasis', 'quarry']) if (PLACE[f].test(clause)) for (const x of state.tiles) if (x.feature === f) anchors.add(x.id);
  text = text.replace(PLACE.oasisAt, ' ');
  let near = !!nt || PLACE.near.test(clause);
  if (PLACE.home.test(clause)) { const c = capitalOf(state, 'player'); if (c) { anchors.add(c.id); near = true; } }
  // 방향: 우리 수도에서 그쪽에 있는 칸 ("동쪽 안개를 걷어라")
  const dm = clause.match(PLACE.dir);
  const home = capitalOf(state, 'player');
  const dir = dm && home ? t('kw.place.dir')[dm[1]] : null;
  // "율법파 마을을 쳐라"는 율법파 마을, "그 마을에 성벽을"은 우리 마을 (새로 세우라는 말이면 가리키지 않는다)
  const foeVillage = PLACE.foeVillage.test(clause);
  if (PLACE.village.test(clause) && (!PLACE.capital.test(clause) || foeVillage)) {
    const side = foeVillage || PLACE.foe.test(clause) || PLACE.claim.test(clause) ? 'enemy' : 'player';
    if (side === 'enemy' || !VILLAGE_WORD.test(clause) || VILLAGE_EXCEPT.test(clause)) {
      for (const x of state.tiles) if (x.owner === side && x.building === 'village') anchors.add(x.id);
    }
  }
  const aimBonus = new Map();
  if (PLACE.aim.test(clause)) {
    const inside = (x) => x.type === 'pray' || (x.type === 'build' && x.build !== 'village');
    const shown = enemyIntent(state).filter((x) => x.shown && !inside(x));
    const pool = PLACE.aimBuild.test(clause) ? shown.filter((x) => x.build === 'village') : shown;
    for (const x of pool) { anchors.add(x.tile); if (x.build === 'village') aimBonus.set(x.tile, 0.5); }
    if (pool.length) named.push('aim');
  }
  // 칸 이름과 붙인 이름은 넓은 가리킴(마을·수도)보다 앞선다 ("C2 마을에 성벽을")
  const exact = new Set();
  for (const m of clause.matchAll(PLACE.ids)) if (state.tileAt[m[1].toUpperCase() + m[2]]) exact.add(m[1].toUpperCase() + m[2]);
  for (const [id, name] of Object.entries(state.names ?? {})) if (clause.includes(name)) exact.add(id);
  const avoid = new Set();
  for (const m2 of clause.matchAll(PLACE.avoidId)) { const id = m2[1].toUpperCase() + m2[2]; avoid.add(id); exact.delete(id); }
  for (const id of exact) anchors.add(id);
  for (const id of avoid) anchors.delete(id);
  // "적 수도에서 가장 먼 곳": 짚은 곳은 가까이 갈 곳이 아니라 멀어질 기준이다
  const farthest = PLACE.farthest.test(clause) ? (anchors.size ? [...anchors].map((id) => state.tileAt[id]) : home ? [home] : null) : null;
  if (farthest) { anchors.clear(); named.length = 0; exact.clear(); aimBonus.clear(); }
  return { anchors, exact, avoid, named, terrains, near, text, dir, home, aimBonus, farthest, closest: PLACE.closest.test(clause) };
}
// 방향과 얼마나 곧게 놓였는가 (0~1): 육각 칸의 화면 좌표로 본 방향과 그 방향의 코사인
const hexXY = (tl) => [tl.c + (tl.r & 1) / 2, tl.r * 0.866];
function aligned(tl, home, [dr, dc]) {
  const [x, y] = hexXY(tl); const [hx, hy] = hexXY(home);
  const vx = x - hx; const vy = y - hy; const len = Math.hypot(vx, vy);
  return len ? ((vx * dc + vy * dr) / len + 1) / 2 : 0;
}
// 가리킨 곳에 맞을수록 앞 (같으면 원래 순서): 가리킨 칸 4 ("옆에"면 그 이웃이 4), 가리킨 칸의 이웃 2, 지형이 맞으면 +1
function byPlace(state, place, matches) {
  if (!place.anchors.size && !place.terrains.size && !place.dir && !place.closest && !place.farthest && !place.avoid?.size) return matches;
  const score = (a) => {
    const tl = state.tileAt[a.tile];
    let s = 0;
    if (place.dir) s += 3 * aligned(tl, place.home, place.dir);
    for (const id of place.anchors) {
      const d = distance(tl, state.tileAt[id]);
      s = Math.max(s, d === 0 ? (place.near ? 1 : 4) : d === 1 ? (place.near ? 4 : 2) : 0);
    }
    if (place.exact.has(tl.id)) s += 2;
    if (place.avoid?.has(tl.id)) s -= 10;
    s += place.aimBonus?.get(tl.id) ?? 0;
    // "가까운": 우리 수도에서 가까울수록 조금 앞 (같은 점수끼리의 순서)
    if (place.closest && place.home) s += (20 - distance(tl, place.home)) / 100;
    if (place.farthest) s += Math.min(...place.farthest.map((f) => distance(tl, f))) / 2;
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
  const clauses = splitDont(revelation).split(CLAUSE).filter((c) => c?.trim());
  // 금지 절이 할 일 말 없이 '짓·일·것'만 가리키면 그 금지는 앞 절을 받는다 ("무릎 꿇고 비는 짓은 그만하라")
  const negs = clauses.map((c) => NEGATION.test(c) && !NOT_NEG.test(c));
  for (let ci = 1; ci < clauses.length; ci++) if (negs[ci] && !hitsOf(clauses[ci]).length && NEG_CARRY.test(clauses[ci])) negs[ci - 1] = true;
  for (let ci = 0; ci < clauses.length; ci++) {
    const clause = clauses[ci];
    if (SIMILE.test(clause) || PARTIAL_NEG.test(clause)) continue;
    const negative = negs[ci];
    const place = placeOf(state, clause);
    // "E1과 E2에"처럼 칸을 여럿 짚으면 그만큼
    // 절 하나는 손 둘까지 움직인다 ("곡식을 거두라" → 두 곳). 짚은 칸·이름 붙은 곳이면 그곳만, "한 곳"이면 하나
    const dflt = place.exact.size || place.named.length ? 1 : 2;
    // 수를 말하지 않아 둘이 된 손의 둘째는 덤이다: 행동 수가 모자라면 다른 절의 첫 손이 먼저
    const implicit = !COUNT.some(([re]) => re.test(clause)) && !MANY.test(clause);
    const many = Math.max(COUNT.find(([re]) => re.test(clause))?.[1] ?? (MANY.test(clause) ? 2 : dflt), Math.min(3, place.exact.size));
    let hits = hitsOf(place.text);
    if (!hits.length && place.text !== clause) hits = hitsOf(clause);
    // 할 일 말 없는 금지가 곳을 가리키면 그곳에서 하는 일을 금한다 ("수도는 건드리지 마라")
    // "율법파를 건드리지 마": 곳 없이 율법파만 말했으면 율법파 땅 모두 ("율법파 마을은 말고"처럼 곳을 말했으면 그곳만)
    if (negative && !hits.length && !place.anchors.size && PLACE.foe.test(clause) && !FEAR.test(clause) && !PLACE.village.test(clause) && !PLACE.capital.test(clause)) {
      for (const x of state.tiles) if (x.owner === 'enemy') place.anchors.add(x.id);
      banned.push('attack', 'preach');
    }
    if (negative && !hits.length && place.anchors.size) { forbidden.push(...legal.filter((a) => place.anchors.has(a.tile) && (a.type === 'attack' || a.type === 'preach'))); continue; }
    const found = hits.map((h) => ({ ...h, matches: byPlace(state, place, rankMatches(state, h.rule, legal.filter((a) => h.rule.match(a, state.tileAt[a.tile])))) }));
    // 무엇을 거둘지 말했으면 "거두라" 같은 두루뭉술한 채집은 쓰지 않는다
    const gathered = found.some((h) => !h.rule.fallback && !h.rule.lastResort && h.matches.some((a) => a.type === 'gather'));
    const plain = found.some((h) => !h.rule.lastResort);
    for (const { rule, matches, pos } of found) {
      if ((rule.fallback && gathered) || (rule.lastResort && plain)) continue;
      if (negative) {
        const scoped = place.terrains.size || place.anchors.size ? matches.filter((a) => place.terrains.has(state.tileAt[a.tile].terrain) || place.anchors.has(a.tile)) : matches;
        forbidden.push(...(scoped.length ? scoped : matches)); if (rule.kind) banned.push(rule.kind); continue;
      }
      // 알아들었으나 지금 할 수 없는 말 (닿는 율법파가 없다 등) — "흐릿하다"와 구별해 알려 준다
      if (!matches.length) { if (rule.kind) heard.push(cannotWhy(state, rule.kind)); continue; }
      // 가능한 행동이 없는 규칙은 교리를 정하지 않는다 ("평화를 지켜라"가 성벽이 없어 전쟁이 되지 않게)
      if (rule.doctrine) doctrine ??= rule.claim && matches[0].type === 'attack' ? 'war' : rule.doctrine;
      let took = 0;
      const free = (b) => !picks.some((o) => o.a.tile === b.tile || o.a.key === b.key);
      for (const a of matches) {
        if (took >= many) break;
        if (many === 1 && a.type === 'gather' && picks.some((o) => o.ci === ci && o.a.type === 'gather' && o.a.gather === a.gather)) { took = 1; break; }
        if (!free(a) && place.exact.has(a.tile)) {
          // 짚은 칸을 이름 없이 먼저 가져간 일은 다른 칸으로 비킨다
          const holder = picks.find((o) => o.a.tile === a.tile && !o.aimed);
          const alt = holder?.alts.find((b) => b.key !== holder.a.key && b.tile !== a.tile && free(b));
          if (alt) holder.a = alt;
        }
        if (!free(a)) continue;
        picks.push({ a, ci, pos, kind: rule.kind, alts: matches, aimed: place.anchors.size > 0, nth: implicit ? took : 0 }); took += 1;
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
    // 짚은 칸(E4·붙인 이름)에서 할 수 있는 일이 없으면 다른 칸에서 한 까닭을 알린다
    // (그 일 자체를 할 수 없으면 — 닿는 율법파 땅이 없다 등 — 그 까닭만 알린다)
    const able = found.some((h) => h.matches.length);
    for (const id of place.exact) if (!negative && able && !picks.some((p) => p.a.tile === id)) heard.push(`far:${id}`);
    if (!negative && able && place.named.length && !place.exact.size && !picks.some((p) => p.ci === ci && [...place.anchors].some((id) => distance(state.tileAt[p.a.tile], state.tileAt[id]) <= (place.near ? 1 : 0)))) heard.push(`far:${place.named[0]}`);
  }
  // 뒤 절이 금한 칸을 앞 절이 골랐으면 금하지 않은 다른 칸으로 옮긴다 ("공격은 하되 수도는 건드리지 마라")
  const ban = new Set(forbidden.map((f) => f.key));
  for (const p of picks) {
    if (!ban.has(p.a.key)) continue;
    const alt = p.alts?.find((b) => !ban.has(b.key) && !picks.some((o) => o !== p && (o.a.tile === b.tile || o.a.key === b.key)));
    if (alt) p.a = alt;
  }
  // 행동 수를 넘으면 먼저 말한 일부터 남기고, 빠진 일은 까닭과 함께 알린다
  const byTurn = picks.filter((p) => !forbidden.some((f) => f.key === p.a.key)).map((p, i) => ({ ...p, i })).sort((x, y) => (x.nth ?? 0) - (y.nth ?? 0) || x.ci - y.ci || x.pos - y.pos || x.i - y.i);
  for (const p of byTurn.slice(limit)) if (p.kind) heard.push(`${p.kind}:limit`);
  const keep = new Set(byTurn.slice(0, limit).map((p) => p.a.key));
  orders.push(...picks.map((p) => p.a).filter((a) => keep.has(a.key)));
  const kept = orders;
  const done = new Set(kept.map(baseKind));
  const unheard = [...new Set(heard)].filter((k) => k.startsWith('far:') || !done.has(k.split(':')[0]));
  const verbs = kept.map((a) => a.text.replace(/ \(.*\)$/, ''));
  return {
    interpretation: kept.length
      ? t('interp.tablet.say', { prefix: voiceOf(state) ? DOCTRINE_VOICE[voiceOf(state)].prefix : t('interp.tablet.prefix'), verbs })
      : unheard.length ? t('interp.tablet.cannot', { kinds: unheard })
      : forbidden.length || banned.length ? t('interp.tablet.forbidOnly', { kinds: [...new Set(forbidden.length ? forbidden.map((a) => (a.type === 'gather' ? `gather:${a.gather}` : baseKind(a))) : banned)] }) : t('interp.tablet.blur'),
    heard: unheard,
    banned: [...new Set(banned)],
    orders: kept,
    forbidden,
    doctrine: doctrine ?? (forbidden.length || banned.length ? 'peace' : null),
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
