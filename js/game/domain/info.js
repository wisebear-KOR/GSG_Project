// @ts-check
// 정보 객체: 게임이 쓰는 모든 정보를 주제별로 만든다 (docs/redesign/INFO.md, ./types.d.ts의 4절).
// - 원본은 늘 엔진의 state다. 여기 함수는 state(또는 재생용 view)를 읽기만 한다
// - 화면·해석기·도구는 정보를 state에서 직접 셈하지 않고 여기서 받는다. 덩어리마다 함수가 따로 있어 필요한 것만 부른다
// - 둘 다 못 보는 정보(덱의 뒷순서, 안개 속 칸의 내용, 가려진 뜻, 주사위)는 넣지 않는다

import {
  legalActions, actionLimit, popCap, villageCount, faithIncome, score, scoreBreakdown, enemyIntent, marchRange,
  edictMax, buildCost, gatherAmount, yieldOf, miracleCost, nextEvent, actOf, actStart, monthOf, previewGains, revelationCostFor, fortuneCard,
  actionOdds, crusadeSurvival, wouldRead, isEcho, prayValue, graceOn, unlocked, nextLawCard,
} from '../engine.js';
import { RULES, MAX_TEMPLE, MIRACLES, ENEMY_LEADERS, JUDGEMENTS, EVENTS, DILEMMAS, REVELATION_MAX, REST_ROUNDS } from '../data.js';
import { Res } from './resources.js';
import { KINDS, kindOf, fromKey, isHomeAct } from './kinds.js';

/** @typedef {import('./types').Resources} Resources */
/** @typedef {import('./types').GameState} GameState */
/** @typedef {import('./types').GameInfo} GameInfo */
/** @typedef {import('./types').Action} Action */
/** @typedef {import('./types').Side} Side */

/** @param {{ id: string, name: string, text?: string, rule?: string, choice?: unknown[] }} c @returns {import('./types').CardInfo} */
const card = (c) => ({ id: c.id, name: c.name, text: c.text ?? '', rule: c.rule ?? '', dilemma: !!c.choice });

// ---------- 판 설정과 장 ----------

/** @param {GameState} state @returns {import('./types').SetupInfo} */
export function setupInfo(state) {
  const c = state.config;
  return {
    tutorial: state.tutorial, size: c.size, difficulty: c.difficulty, seed: c.seed, veteran: !!c.veteran,
    modules: [1, 2, 3, 4].filter((l) => unlocked(state, l)).length,
    grace: graceOn(state), edict: !!state.edictOn,
    trial: c.trial ?? null, ascension: c.ascension ?? 0, blessing: c.blessing ?? null, daily: c.daily ?? null,
    challenge: c.challenge ? { target: c.challenge.target ?? null } : null,
    // 지난 판의 유적: 대사제가 옛 계시로 인용한다
    canon: c.canon?.text ?? null,
    priest: state.priest ?? null,
    god: { name: c.god?.name ?? null, sigil: c.god?.sigil ?? null },
    // 수도원의 시련은 계시를 짧게 묶는다
    revelationMax: c.trial === 'cloister' ? 20 : REVELATION_MAX,
  };
}

/** @param {GameState} state @returns {import('./types').TurnInfo} */
export function turnInfo(state) {
  const id = state.judgement ?? 'classic';
  const j = JUDGEMENTS[/** @type {keyof typeof JUDGEMENTS} */ (id)] ?? JUDGEMENTS.classic;
  return {
    round: state.round, maxRounds: state.maxRounds,
    act: state.tutorial ? 1 : actOf(state),
    actStart: !state.tutorial && !!actStart(state),
    month: state.tutorial || !state.round ? null : monthOf(state),
    months: state.tutorial ? null : Array.from({ length: state.maxRounds }, (_, i) => monthOf(state, i + 1)),
    first: state.first ?? null,
    scale: state.trailing ?? null,
    winner: state.winner ?? null,
    judgement: { id, name: j.name, weights: { ...j.w } },
  };
}

// ---------- 사건 ----------

/** @param {GameState} state @returns {import('./types').EventInfo} */
export function eventInfo(state) {
  const ev = state.event;
  const nx = nextEvent(state);
  const byId = (/** @type {string} */ id) => /** @type {{ id: string, name: string, rule?: string }} */ (EVENTS.find((e) => e.id === id) ?? DILEMMAS.find((e) => e.id === id) ?? { id, name: id });
  return {
    now: ev ? card(ev) : null,
    next: nx && state.round < state.maxRounds ? card(nx) : null,
    choice: ev?.choice ? ev.choice.map((o) => ({ id: o.id, label: o.label, text: o.text, ...(o.gain ? { gain: { ...o.gain } } : {}) })) : null,
    picked: ev?.choice ? state.dilemmaPick ?? ev.choice[0].id : null,
    options: state.eventChoice ? state.eventChoice.map((id) => ({ id, name: byId(id).name, rule: byId(id).rule ?? '' })) : null,
    quote: ev?.id === 'mira' ? state.miraQuote ?? null : null,
    // 땅의 운 (규칙 28): 이번 장 카드와 한 장 앞서 보이는 다음 장 카드, 그리고 바꾸는 칸
    fortune: { now: fortuneInfo(state.fortune?.now), next: fortuneInfo(state.fortune?.next) },
  };
}

/** @param {{ id: string, tiles: string[] } | null | undefined} f @returns {import('./types').FortuneInfo | null} */
function fortuneInfo(f) {
  const c = f ? fortuneCard(f.id) : null;
  return c && f ? { id: c.id, name: c.name, text: c.text, res: /** @type {import('./types').ResourceKey | null} */ (c.res), to: /** @type {import('./types').Activity | null} */ (c.to), tiles: [...f.tiles] } : null;
}

// ---------- 판 ----------

/**
 * 칸 하나. 안개 속 칸은 자리와 "?" 표시만
 * @param {GameState} state
 * @param {import('./types').Tile} t
 * @returns {import('./types').TileInfo}
 */
export function tileInfo(state, t) {
  if (!t.revealed) return { id: t.id, r: t.r, c: t.c, revealed: false, site: !!(t.site && !t.site.found) };
  const y = yieldOf(t);
  const lg = state.legends?.[t.id];
  return {
    id: t.id, r: t.r, c: t.c, revealed: true,
    terrain: t.terrain, feature: t.feature ?? null, owner: t.owner, building: t.building, wall: t.wall,
    holy: t.id === state.holyId,
    cathedral: t.building === 'capital' && t.owner === 'player' && !!state.sides?.player?.cathedral,
    name: state.names?.[t.id] ?? null,
    legend: lg ? { name: lg.name, quote: lg.quote, round: lg.round } : null,
    // 활성도 (규칙 28): 풍요 +1 · 정상 · 빈곤 −1. recover: 빈곤 땅이 아무도 거두지 않으면 정상으로 돌아오기까지 남은 장 수
    activity: t.activity ?? 'normal',
    recover: (t.activity ?? 'normal') === 'poor' && !state.tutorial ? Math.max(1, (REST_ROUNDS[/** @type {keyof typeof REST_ROUNDS} */ (state.config.difficulty)] ?? 1) - (t.rest ?? 0)) : null,
    yield: { resource: y.gather ?? null, amount: y.amount ?? 0 },
    // 절대 가치: 누가 쥐었든 칸의 값. 수도는 거둘 수 없어 0
    value: t.building === 'capital' || !y.gather ? Res.zero() : Res.of({ [y.gather]: gatherAmount(state, 'player', t) }),
    marks: t.faithMarks ? { side: t.faithMarks.side, n: t.faithMarks.n } : null,
  };
}

/** @param {GameState} state @returns {import('./types').BoardInfo} */
export function boardInfo(state) {
  return { rows: state.rows, cols: state.cols, tiles: state.tiles.map((t) => tileInfo(state, t)) };
}

// ---------- 진영 ----------

/**
 * 두 진영에 공통인 정보 (양쪽 매트)
 * @param {GameState} state
 * @param {Side} side
 * @returns {import('./types').SideInfo}
 */
export function sideInfo(state, side) {
  const s = state.sides[side];
  const villages = villageCount(state, side);
  return {
    side,
    resources: Res.of(s),
    income: Res.of({ food: 2 + villages, faith: faithIncome(state, side) }),
    upkeep: Res.of({ food: s.pop + (side === 'player' && state.commandments?.includes('noFamine') ? 1 : 0) }),
    pop: s.pop, popCap: popCap(state, side),
    actions: actionLimit(state, side),
    temple: s.templeLevel, villages, capitalHp: s.capitalHp, cathedral: s.cathedral ?? 0,
    score: score(state, side),
    scoreParts: scoreBreakdown(state, side).parts.map((/** @type {any} */ p) => ({ key: p.key, label: p.label, n: p.n, w: p.w, ...(p.note ? { note: p.note } : {}) })),
  };
}

// 자동 채우기(autoFill)가 "모자라다"고 보는 기준과 같다: 다음 장 먹을 식량(신도 + 2), 나무·돌 2, 신앙은 경고선 위
/** @param {GameState} state @returns {Resources} */
const needOf = (state) => ({ food: state.sides.player.pop + 2, wood: 2, stone: 2, faith: RULES.lowFaith + 1 });

/** @param {GameState} state @returns {import('./types').UsInfo} */
export function usInfo(state) {
  const p = state.sides.player;
  /** @type {Action[]} */
  const legal = legalActions(state, 'player');
  return {
    ...sideInfo(state, 'player'),
    legalKinds: KINDS.filter((k) => legal.some((a) => kindOf(a) === k)),
    short: Res.short(Res.of(p), needOf(state)),
    lowFaith: p.faith <= RULES.lowFaith,
    faithless: p.faithless,
    doctrine: { ...p.doctrine },
    streak: state.streak ? { doctrine: state.streak.doctrine, n: state.streak.n } : null,
    commandments: [...(state.commandments ?? [])],
    saints: (state.saints ?? []).map((x) => ({ name: x.name, kind: x.kind })),
    miracles: state.miracleHand.map((id) => {
      const m = /** @type {{ id: string, cost: number }} */ (MIRACLES.find((x) => x.id === id));
      const cost = miracleCost(state, m);
      return { id, cost, base: m.cost, uses: state.miracleUses?.[id] ?? 0, usable: !state.miracleUsed && p.faith >= cost };
    }),
    miracleUsed: !!state.miracleUsed,
    // 기적 고르기: 이번 장에 손에 넣을 수 있게 제안된 기적
    miracleOffer: state.miracleOffer ? state.miracleOffer.map((id) => {
      const m = /** @type {{ id: string, cost: number }} */ (MIRACLES.find((x) => x.id === id));
      return { id, cost: miracleCost(state, m), base: m.cost };
    }) : null,
    prophecy: state.prophecy ? { kind: state.prophecy.kind, due: state.prophecy.due, left: state.prophecy.due - state.round + 1 } : null,
    destiny: state.destiny ? { id: state.destiny.id, done: state.destiny.done, pending: !!state.destinyOffer } : null,
    lessons: (state.lessons ?? []).map((l) => ({ ...l })),
    grace: { used: state.grace?.round === state.round ? state.grace.used : 0, max: RULES.gracePerRound },
    silent: state.silentRun ?? 0,
    reinterpretUsed: !!state.reinterpretUsed,
  };
}

/**
 * 율법파의 이번 장 뜻과 대비 (율법 카드 뒷면, 판 위의 붉은 표식). 장이 열리기 전이나 판이 끝났으면 뜻은 없다
 * @param {GameState} state
 * @returns {import('./types').IntentsInfo}
 */
export function intentsInfo(state) {
  /** @type {Action[]} */
  const all = state.round && !state.winner ? enemyIntent(state) : [];
  return {
    shown: all.filter((a) => a.shown).map((a) => ({ kind: kindOf(a), tile: a.tile })),
    hidden: all.filter((a) => !a.shown).length,
    guard: /** @type {0 | 1 | 2} */ (Math.min(2, state.lawGuard ?? 0)),
    rally: !!state.rally,
    march: marchRange(state, 'enemy'),
  };
}

/**
 * @param {GameState} state
 * @param {{ revealed?: boolean, intents?: boolean }} [opts] revealed: 이번 장 율법 카드가 공개됐나 (해결 단계부터),
 *   intents: 율법파의 뜻까지 셈하나 (매트처럼 뜻이 필요 없으면 false — 계획을 다시 짜지 않는다)
 * @returns {import('./types').EnemyInfo}
 */
export function enemyInfo(state, { revealed = false, intents = true } = {}) {
  const e = state.sides.enemy;
  const it = intents ? intentsInfo(state) : { shown: [], hidden: 0, guard: /** @type {0 | 1 | 2} */ (Math.min(2, state.lawGuard ?? 0)), rally: !!state.rally, march: marchRange(state, 'enemy') };
  const leader = state.leader ? ENEMY_LEADERS[/** @type {keyof typeof ENEMY_LEADERS} */ (state.leader)] : null;
  return {
    ...sideInfo(state, 'enemy'),
    intents: it.shown, hiddenIntents: it.hidden, guard: it.guard, rally: it.rally, march: it.march,
    edict: state.edictOn ? { n: e.edict, max: edictMax(state) } : null,
    leader: leader && state.leader ? { id: state.leader, name: leader.name, title: leader.title, desc: leader.desc } : null,
    lawCard: revealed && state.lawCard ? card(state.lawCard) : null,
    reacted: state.reacted ?? null,
  };
}

// ---------- 말의 층 ----------

/** @param {GameState} state @returns {import('./types').WordsInfo} */
export function wordsInfo(state) {
  return {
    revelations: state.revelations.slice(-2).reverse().map((r) => ({ round: r.round, text: r.text })),
    // 지난 장에 실제로 풀린 우리 일 (막힌 일은 빠진다 — 해결 로그의 행동 key)
    lastOrders: [...new Set(state.log.filter((l) => l.round === state.round - 1 && l.side === 'player' && l.act).map((l) => /** @type {string} */ (l.act)))].map(fromKey),
    petition: state.petition ? { from: state.petition.from, text: state.petition.text, need: state.petition.need ? kindOf(state.petition.need) : null } : null,
    banned: [...(state.bannedWords ?? [])],
    sacred: state.sacred && !state.stats?.sacred ? { clue: state.sacred.clue, n: state.sacred.word.length } : null,
  };
}

/**
 * 계시를 적는 동안의 정보: 비용(신앙 1 + 봉인된 말 + 되풀이), 되풀이인가, 봉인된 말을 썼나, 신앙이 모자라나
 * @param {GameState} state
 * @param {string} text
 * @returns {{ cost: number, echo: boolean, banned: boolean, over: boolean }}
 */
export function speechInfo(state, text) {
  const d = text.trim();
  const cost = d ? revelationCostFor(state, text) : 0;
  return { cost, echo: isEcho(state, d), banned: (state.bannedWords ?? []).some((w) => text.includes(w)), over: cost > state.sides.player.faith };
}

/**
 * 다음 장 율법 카드 예고: 지금 말씀의 교리와 칼을 금했는지에 따라 율법파가 고를 카드 (어려움은 두 장)
 * @param {GameState} state
 * @param {{ doctrine: import('./types').Doctrine | null, vow: boolean }} words
 *   reacted: 그 카드가 지금 말씀에 맞서 고른 것인가
 * @returns {{ card: { id: string, name: string, text: string }, reacted: boolean, alt: { card: { id: string, name: string, text: string }, reacted: boolean } | null } | null}
 */
export function nextLawInfo(state, { doctrine, vow }) {
  const nx = state.round < state.maxRounds ? nextLawCard(state, doctrine, vow) : null;
  if (!nx) return null;
  const c = (/** @type {any} */ x) => ({ id: x.id, name: x.name, text: x.text });
  return { card: c(nx.card), reacted: !!nx.reacted, alt: nx.alt ? { card: c(nx.alt.card), reacted: !!nx.alt.reacted } : null };
}

// ---------- 비용 ----------

/** @param {GameState} state @returns {Record<import('./types').BuildKind, Resources | null>} */
export function costsInfo(state) {
  const p = state.sides.player;
  return {
    village: Res.of(buildCost(state, 'player', 'village')),
    wall: Res.of(buildCost(state, 'player', 'wall')),
    temple: p.templeLevel >= MAX_TEMPLE ? null : Res.of(buildCost(state, 'player', 'temple')),
    cathedral: p.cathedral ? null : Res.of(buildCost(state, 'player', 'cathedral')),
  };
}

// ---------- 정보 객체 ----------

/**
 * 판의 모든 정보. 말하기 단계(장이 열린 뒤 계시 전)에 부르는 것이 기준이다 — 율법파의 뜻은 이번 장 계획이다.
 * @param {GameState} state
 * @param {{ revealed?: boolean }} [opts] revealed: 이번 장 율법 카드가 공개됐나 (해결 단계부터)
 * @returns {GameInfo}
 */
export function gameInfo(state, { revealed = false } = {}) {
  return {
    setup: setupInfo(state),
    turn: turnInfo(state),
    event: eventInfo(state),
    board: boardInfo(state),
    us: usInfo(state),
    enemy: enemyInfo(state, { revealed }),
    words: wordsInfo(state),
    costs: costsInfo(state),
  };
}

// ---------- 확인 화면 ----------

// 말한 기적이 확인 화면의 예상에 더하는 것 (엔진 castMiracle의 효과와 같다)
/** @type {Record<string, Partial<Resources>>} */
export const MIRACLE_PREVIEW_GAIN = { rain: { food: 3 }, manna: { food: 4 }, bounty: { wood: 2, stone: 2 } };

/**
 * 확인 화면의 계산값 (계시를 받은 뒤)
 * @param {GameState} state
 * @param {{ plan: Action[], text?: string | null, doctrine?: import('./types').Doctrine | null,
 *   miracle?: { id: string, cost: number } | null, dilemma?: string | null }} p
 *   plan: 받아들인 일 + 자동 채우기, miracle: 말한 기적(뺀 것이면 null), dilemma: 글로 고른 갈림길
 * @returns {import('./types').PreviewInfo}
 */
export function previewInfo(state, { plan, text = null, doctrine = null, miracle = null, dilemma = null }) {
  const g = previewGains(state, plan);
  /** @type {Action[]} */
  const shown = enemyIntent(state).filter((/** @type {Action} */ x) => x.shown);
  const walls = new Set(shown.filter((x) => x.build === 'wall').map((x) => x.tile));
  /** @type {import('./types').PreviewInfo['per']} */
  const per = {};
  /** @type {Record<string, number>} */
  const odds = {};
  /** @type {Record<string, number>} */
  const crusade = {};
  /** @type {Record<string, 'block' | 'lost'>} */
  const first = {};
  for (const a of plan) {
    if (a.type === 'gather' && a.gather) per[a.key] = { kind: 'gather', resource: a.gather, n: gatherAmount(state, 'player', state.tileAt[a.tile]) };
    else if (a.type === 'pray') per[a.key] = { kind: 'pray', resource: 'faith', n: prayValue(state, 'player') };
    if (a.type === 'attack' || a.type === 'preach') { const o = actionOdds(state, a, { wallAhead: walls.has(a.tile) }); if (o != null) odds[a.key] = o; }
    // 대성당: 다음 장 원정을 버틸 확률 — 이번 장에 그 칸(우리 수도)에 성벽을 두르면 그 성벽까지
    if (a.build === 'cathedral') crusade[a.key] = crusadeSurvival(state, { wallAhead: plan.some((x) => x.build === 'wall' && x.tile === a.tile) });
    if (!isHomeAct(a) && shown.some((x) => x.tile === a.tile && !isHomeAct(x))) first[a.key] = state.first === 'player' ? 'block' : 'lost';
  }
  // 말한 기적과 갈림길은 해결 전에 따로 풀리므로 예상에만 더한다 (0 아래로는 내려가지 않는다)
  let extra = miracle ? Res.add(Res.of({ faith: -miracle.cost }), Res.of(MIRACLE_PREVIEW_GAIN[miracle.id])) : Res.zero();
  const opt = state.event?.choice?.find((o) => o.id === (dilemma ?? state.dilemmaPick ?? state.event?.choice?.[0].id));
  if (opt?.gain) extra = Res.add(extra, Res.of(opt.gain));
  return {
    cost: text ? revelationCostFor(state, text) : 0,
    per,
    gains: Res.of(g.delta),
    after: Res.floor(Res.add(Res.of(g.after), extra), 0),
    odds, crusade, first,
    read: { will: text ? wouldRead(state, text, doctrine) : false, level: Math.min(2, (state.lawGuard ?? 0) + 1), echo: text ? isEcho(state, text) : false },
  };
}

// ---------- 장 결산 ----------

/**
 * 해결 전후의 차이 (장 결산)
 * @param {GameState} before 해결 전 (재생용 view도 된다)
 * @param {GameState} after 해결 뒤
 * @returns {import('./types').LedgerInfo}
 */
export function ledgerInfo(before, after) {
  const b = before.sides.player; const a = after.sides.player;
  const gap = score(after, 'enemy') - score(after, 'player');
  const w = turnInfo(after).judgement.weights;
  return {
    resources: Res.sub(Res.of(a), Res.of(b)),
    pop: a.pop - b.pop,
    villages: villageCount(after, 'player') - villageCount(before, 'player'),
    score: score(after, 'player') - score(before, 'player'),
    enemyScore: score(after, 'enemy') - score(before, 'enemy'),
    // 마지막 세 장 안에서 뒤지거나 비겼으면: 따라잡는 데 필요한 것 (비기면 우리가 이긴다)
    catchUp: !after.winner && gap >= 0 && after.round >= after.maxRounds - 3 ? { gap, villages: Math.ceil(gap / w.village), pop: Math.ceil(gap / w.pop) } : null,
  };
}
