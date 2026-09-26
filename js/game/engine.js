// 규칙 엔진: 상태 생성, 가능한 행동, 명령 검증, 율법파(오토마), 라운드 해결, 유지, 승리 판정
// LLM은 이 엔진이 만든 행동 목록 중에서 고르기만 한다. 수치와 판정은 전부 여기서 한다.

import {
  TERRAIN, RESOURCE_NAME, GATHER_VERB, COST, MAX_TEMPLE, CAPITAL_HP, MAX_ACTIONS, RULES,
  DOCTRINES, DOCTRINE_MAX, EVENTS, LAW_CARDS, MIRACLES, DIFFICULTY, MAP_SIZES, PLAYER_START, TUTORIAL, ENEMY_LEADERS,
  PRIESTS, PETITIONERS, PROPHECY, FIRST_HAND, SITES, DOOM, JUDGEMENTS, OPPOSED, REACT,
  CATHEDRAL, EDICT_MAX, DESTINIES, DESTINY_POINTS, ACTS, DILEMMAS, FEATURES, COMMANDMENTS, MAX_COMMANDMENTS, SACRED_WORDS,
  MIRA, MIRA_TWIST, MONTHS, TRIALS,
} from './data.js';
import { generateMap, placeSites, placeFeatures, placeLegacy } from './mapgen.js';
import { frequentNoun, hashPick, citedWords, findLiturgy } from './lore.js';

export const SIDES = ['player', 'enemy'];
export const other = (side) => (side === 'player' ? 'enemy' : 'player');
const ROWS = 'ABCDEFGHI';

// ---------- 난수 (시드 고정으로 재현 가능) ----------
// 흐름을 둘로 나눈다: deck(사건·율법 카드 순서)과 dice(주사위·탐험).
// 덱은 판 시작에 미리 나눠 두므로, 플레이어가 무엇을 하든 같은 시드면 같은 계절·율법이 나온다.
export function rand(state, stream = 'dice') {
  let t = (state.rng[stream] = (state.rng[stream] + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const d6 = (state) => 1 + Math.floor(rand(state) * 6);
function shuffle(state, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(state, 'deck') * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- 육각 좌표 (홀수 행이 오른쪽으로 밀린 배치) ----------
const DIRS = {
  even: [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]],
  odd: [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]],
};
export const tileId = (r, c) => `${ROWS[r]}${c + 1}`;

export function neighbors(state, tile) {
  const dirs = tile.r % 2 ? DIRS.odd : DIRS.even;
  return dirs.map(([dr, dc]) => state.tileAt[tileId(tile.r + dr, tile.c + dc)]).filter(Boolean);
}

function cube(t) {
  const x = t.c - (t.r - (t.r & 1)) / 2;
  return [x, t.r, -x - t.r];
}
export function distance(a, b) {
  const [ax, ay, az] = cube(a);
  const [bx, by, bz] = cube(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

// ---------- 상태 ----------
// config: { mode: 'standard' | 'tutorial', size: 5|6|7, difficulty: 'easy'|'normal'|'hard', seed, veteran }
// veteran: 한 판이라도 끝낸 적이 있으면 true (검열 카드 등 두 번째 판부터 나오는 것들)
export const DEFAULT_CONFIG = { mode: 'standard', size: 5, difficulty: 'normal', seed: 2026 };

export function createState(config = DEFAULT_CONFIG) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tutorial = cfg.mode === 'tutorial';
  const diff = DIFFICULTY[cfg.difficulty] ?? DIFFICULTY.normal;
  const map = tutorial ? TUTORIAL.map : generateMap({ rows: cfg.size, cols: cfg.size, seed: cfg.seed });
  const state = {
    config: cfg, tutorial, rows: map.length, cols: map[0].length,
    rng: { deck: (tutorial ? TUTORIAL.seed : cfg.seed) ^ 0x5bd1e995, dice: tutorial ? TUTORIAL.seed : cfg.seed }, round: 0,
    maxRounds: tutorial ? TUTORIAL.rounds : (TRIALS[cfg.trial]?.rounds ?? MAP_SIZES[cfg.size]?.rounds ?? 12),
    enemyBonus: tutorial ? TUTORIAL.enemyBonus : diff.enemyBonus,
    tiles: [], tileAt: {}, sides: {}, eventDeck: [], lawDeck: [],
    event: null, lawCard: null, rainActive: false, leader: null, bannedWords: [], bannedNext: null, eventChoice: null,
    priest: 'loyal', names: {}, lessons: [], petition: null, petitionIgnored: 0, prophecy: null,
    grace: { round: 0, used: 0 }, roundMods: {}, miracleHand: [...FIRST_HAND], miracleOffer: null, pendingSite: null,
    judgement: 'classic', wrath: 0, streak: null, vowNext: null, reacted: null, oddUsed: false,
    edictOn: !!cfg.veteran && !tutorial, destiny: null, destinyOffer: null, holyId: null,
    commandments: [], liturgy: null, saints: [], deeds: {}, fallen: [], silentRun: 0, legends: {},
    miraDone: false, miraQuote: null, bloodKills: 0,
    sacred: cfg.daily ? hashPick(SACRED_WORDS, 'sacred', cfg.daily) : null, stats: { converted: 0, captured: 0, miracles: 0, prophecies: 0, petitions: 0 },
    miracleUsed: false, reinterpretUsed: false,
    log: [], revelations: [], history: [], winner: null, winReason: '',
  };
  map.forEach((row, r) => row.forEach((cell, c) => {
    const capital = cell === 'P' ? 'player' : cell === 'E' ? 'enemy' : null;
    const village = cell === 'V' ? 'enemy' : null;
    const tile = {
      id: tileId(r, c), r, c,
      terrain: capital || village ? 'plain' : cell,
      owner: capital ?? village, building: capital ? 'capital' : village ? 'village' : null, wall: false, revealed: false,
    };
    state.tiles.push(tile);
    state.tileAt[tile.id] = tile;
  }));
  const siteSpots = tutorial ? [] : placeSites({ rows: state.rows, cols: state.cols, seed: cfg.seed, map });
  for (const p of siteSpots) state.tileAt[tileId(p.r, p.c)].site = { id: p.kind, found: false };
  if (!tutorial) {
    for (const p of placeFeatures({ rows: state.rows, cols: state.cols, seed: cfg.seed, map, taken: siteSpots })) state.tileAt[tileId(p.r, p.c)].feature = p.kind;
    // 전생의 유적: 지난 판의 신이 남긴 말 (config.legacy가 있을 때만 — 오늘의 계시·도전은 없다)
    const spot = cfg.legacy ? placeLegacy({ rows: state.rows, cols: state.cols, seed: cfg.seed, map, taken: siteSpots }) : null;
    if (spot) state.tileAt[tileId(spot.r, spot.c)].site = { id: 'legacy', found: false };
  }
  // 성지: 맵 가운데 언덕 (쥔 쪽이 승점 +2, 율법 석판을 올리거나 내린다)
  if (!tutorial) {
    const pc = state.tiles.find((t) => t.owner === 'player' && t.building === 'capital');
    const ec = state.tiles.find((t) => t.owner === 'enemy' && t.building === 'capital');
    const mid = { r: Math.floor(state.rows / 2), c: Math.floor(state.cols / 2) };
    const cost = (t) => Math.abs(distance(t, pc) - distance(t, ec)) * 100 + (t.terrain === 'hill' ? 0 : 10) + distance(t, mid);
    const holy = state.tiles.filter((t) => !t.building).sort((a, b) => cost(a) - cost(b) || a.id.localeCompare(b.id))[0];
    holy.terrain = 'hill';
    holy.feature = null;
    state.holyId = holy.id;
  }
  // 소명: 두 번째 판부터 셋 중 하나 (고르지 않으면 첫째)
  if (cfg.veteran && !tutorial && !cfg.challenge) {
    const ids = Object.keys(DESTINIES).sort((a, b) => hashPick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], cfg.seed, 'dest', a) - hashPick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], cfg.seed, 'dest', b) || a.localeCompare(b));
    state.destinyOffer = ids.slice(0, 3);
    state.destiny = { id: ids[0], done: false };
  }
  const start = tutorial ? TUTORIAL.start : { player: PLAYER_START, enemy: diff.enemyStart };
  for (const side of SIDES) {
    state.sides[side] = {
      ...start[side], templeLevel: 1, capitalHp: CAPITAL_HP, faithless: 0, cathedral: 0, edict: 0,
      doctrine: Object.fromEntries(DOCTRINES.map((d) => [d, 0])),
    };
  }
  if (tutorial) {
    // 튜토리얼은 사건과 율법 카드 순서가 정해져 있다 (뒤에서부터 뽑으므로 거꾸로 넣는다)
    state.eventDeck = TUTORIAL.events.map((id) => EVENTS.find((e) => e.id === id)).reverse();
    state.lawDeck = TUTORIAL.lawCards.map((id) => LAW_CARDS.find((c) => c.id === id)).reverse();
  } else {
    const leaders = Object.entries(ENEMY_LEADERS).filter(([, l]) => !l.notOn?.includes(cfg.difficulty)).map(([id]) => id);
    state.leader = cfg.trial === 'sword' ? 'iron' : hashPick(leaders, 'leader', cfg.seed, cfg.difficulty);
    // 첫 판은 충직한 사제. 그 뒤로는 판마다 다른 성향
    if (cfg.veteran) state.priest = hashPick(Object.keys(PRIESTS).filter((k) => k !== 'loyal'), 'priest', cfg.seed);
    // 두 번째 판부터 심판의 기준이 판마다 바뀐다
    if (cfg.veteran) state.judgement = hashPick(Object.keys(JUDGEMENTS), 'judgement', cfg.seed);
    // 두 번째 판부터 기적은 판마다 셋을 받는다 (번개·단비 중 하나는 꼭 든다)
    if (cfg.trial === 'storm') state.miracleHand = ['lightning', 'bounty', 'pillar'];
    else if (cfg.veteran) {
      const rest = MIRACLES.map((m) => m.id).filter((id) => !['lightning', 'rain'].includes(id));
      const a = hashPick(['lightning', 'rain'], 'hand0', cfg.seed);
      const b = hashPick(rest, 'hand1', cfg.seed);
      const c = hashPick(rest.filter((x) => x !== b), 'hand2', cfg.seed);
      state.miracleHand = [a, b, c];
    }
    // 판 전체에 쓸 카드를 미리 나눠 둔다 (어려움은 장마다 두 장을 보므로 두 배)
    // 두 갈래 사건은 판마다 셋만 (시드 해시로 고른다)
    const dilemmas = cfg.veteran ? [...DILEMMAS].sort((a, b) => hashPick([...Array(97).keys()], cfg.seed, 'dil', a.id) - hashPick([...Array(97).keys()], cfg.seed, 'dil', b.id)).slice(0, 3) : [];
    state.eventDeck = dealDeck(state, [...EVENTS, ...dilemmas], state.maxRounds + 2);
    state.lawDeck = dealDeck(state, lawPool(state), state.maxRounds * 2 + 2);
  }
  if (cfg.trial === 'earth') state.sides.player.doctrine.abundance = 1;
  if (cfg.trial === 'last') state.sides.enemy.pop += 2;
  if ((cfg.ascension ?? 0) >= 1) state.sides.enemy.pop += 1;
  // 은사 (오늘의 계시·도전·튜토리얼에선 main이 넘기지 않는다)
  if (cfg.blessing === 'granary') state.sides.player.food += 2;
  // 정경: 지난 판에 봉헌한 구절이 이 부족의 교리를 한 칸 올려 둔다 (오늘의 계시·어려움에선 말씀만 전해진다)
  if (cfg.canon && !cfg.daily && cfg.difficulty !== 'hard' && !tutorial) state.sides.player.doctrine[cfg.canon.doctrine] += 1;
  updateVision(state);
  return state;
}

// 섞은 묶음을 이어 붙여 n장 이상의 덱을 만든다 (뒤에서부터 뽑는다)
function dealDeck(state, pool, n) {
  const deck = [];
  while (deck.length < n) deck.unshift(...shuffle(state, pool));
  return deck;
}
// 율법 덱: 튜토리얼은 온순한 카드만. 지도자가 카드를 더하거나 뺀다. 검열은 두 번째 판부터, 보통 이상
function lawPool(state) {
  if (state.tutorial) return LAW_CARDS.filter((c) => !['L5', 'L7', 'L10'].includes(c.id));
  const leader = ENEMY_LEADERS[state.leader];
  const censor = state.config.veteran && state.config.difficulty !== 'easy';
  const pool = LAW_CARDS.filter((c) => (c.id !== 'L10' || censor) && !leader?.deck.remove.includes(c.id));
  for (const id of leader?.deck.add ?? []) pool.push(LAW_CARDS.find((c) => c.id === id));
  if (state.config.trial === 'sword') pool.push(LAW_CARDS.find((c) => c.id === 'L5'), LAW_CARDS.find((c) => c.id === 'L5'));
  return pool;
}

// 우리 신도가 닿는 곳(수도 2칸, 마을 1칸)은 항상 보인다
export function updateVision(state) {
  for (const t of reach(state, 'player')) t.revealed = true;
  const home = capitalOf(state, 'player');
  const r = state.config?.blessing === 'seer' && state.round <= 1 ? 3 : 2;
  if (home) for (const t of state.tiles) if (distance(t, home) <= r) t.revealed = true;
}

export const capitalOf = (state, side) => state.tiles.find((t) => t.owner === side && t.building === 'capital');
export const ownedTiles = (state, side) => state.tiles.filter((t) => t.owner === side);
export const villageCount = (state, side) => state.tiles.filter((t) => t.owner === side && t.building === 'village').length;
// 교리 궁극(6칸)은 8장부터 깨어난다 (한 교리만 외쳐 6장 만에 게임을 끝내지 못하게)
export const ULT_ROUND = 8;
// 빠른 판(4×4 · 8장)은 박자를 앞당긴다
export const quick = (state) => state.rows <= 4 && !state.tutorial;
export const ultRound = (state) => (quick(state) ? 6 : ULT_ROUND);
export const draftRound = (state) => (quick(state) ? 3 : 5);
export const wrathRound = (state) => (state.config?.trial === 'last' ? 1 : quick(state) ? 3 : 4);
export const hasUlt = (state, side, key) => side === 'player' && state.sides[side].doctrine[key] >= DOCTRINE_MAX && state.round >= ultRound(state);
export const popCap = (state, side) => 3 + 2 * villageCount(state, side) + (hasUlt(state, side, 'abundance') ? 2 : 0);

// 신도가 닿을 수 있는 범위: 수도에서 2칸, 마을에서 1칸
export function reach(state, side) {
  const set = new Map();
  for (const t of ownedTiles(state, side)) {
    const radius = t.building === 'capital' ? 2 : 1;
    for (const x of state.tiles) if (distance(t, x) <= radius) set.set(x.id, x);
  }
  return [...set.values()];
}

// 행동 수 = 2 + 신전 단계 + 신도 4명당 1 (+ 지혜 교리 / 율법파 난이도 보너스), 최대 6, 신도 수를 넘지 않는다
export function actionLimit(state, side) {
  const s = state.sides[side];
  const bonus = side === 'enemy' ? state.enemyBonus + ((state.config.ascension ?? 0) >= 4 && actOf(state) === 3 ? 1 : 0) : (s.doctrine.wisdom >= 4 ? 1 : 0);
  let limit = Math.min(MAX_ACTIONS, 2 + s.templeLevel + Math.floor(s.pop / RULES.followersPerAction) + bonus);
  if (side === 'player' && isSabbath(state)) limit = Math.max(1, limit - 2);
  return Math.max(0, Math.min(limit, s.pop));
}

export const prayValue = (state, side) => (2 + (state.sides[side].doctrine.wisdom >= 2 ? 1 : 0)) * (side === 'player' && isSabbath(state) ? 2 : 1);
export const isSabbath = (state) => state.commandments?.includes('sabbath') && state.round % 4 === 0;

// 매 장 들어오는 신앙: 기본 1 + 신도 3명당 1 + (신전 단계 - 1)
export const faithIncome = (state, side) => {
  const s = state.sides[side];
  return RULES.baseFaithIncome + Math.floor(s.pop / RULES.followersPerFaith) + (s.templeLevel - 1);
};

// ---------- 이름 있는 신도와 성인 ----------
export const followerName = (state, key) => hashPick(PETITIONERS, state.config.seed, key);
function deed(state, key, kind) {
  const name = followerName(state, key);
  const d = (state.deeds[name] ??= { preach: 0, guard: 0 });
  d[kind] += 1;
  if (state.saints.length >= 2 || state.saints.some((x) => x.name === name)) return;
  const saint = kind === 'preach' && d.preach >= 3 ? 'preacher' : kind === 'guard' && d.guard >= 1 ? 'guardian' : null;
  if (!saint || state.saints.some((x) => x.kind === saint)) return;
  state.saints.push({ name, kind: saint });
  logEvent(state, 'player', `${name}${batchim(name) ? '이' : '가'} 성인으로 추앙받는다 — ${saint === 'preacher' ? '설교자 성인 (선교 +1)' : '수호자 성인 (수도 방어 +1)'}.`, null, { kind: 'saint', tile: capitalOf(state, 'player')?.id });
}
function fallen(state, key) {
  const name = followerName(state, key);
  if (!state.fallen.includes(name)) state.fallen.push(name);
  const i = state.saints.findIndex((x) => x.name === name);
  if (i >= 0) { state.saints.splice(i, 1); logEvent(state, 'player', `성인 ${name}${batchim(name) ? '이' : '가'} 쓰러져 순교했다.`, null, { kind: 'loss', tile: capitalOf(state, 'player')?.id }); }
}

// 선교 보너스: 평화 교리 + 방언 + 계명(칼을 들지 말라) + 성인 설교자 (교리·성인·계명 합은 최대 +2)
export function preachBonus(state, side) {
  const s = state.sides[side];
  if (side !== 'player') return (s.doctrine.peace >= 2 ? 1 : 0) + (s.doctrine.peace >= 4 ? 1 : 0);
  const base = (s.doctrine.peace >= 2 ? 1 : 0) + (s.doctrine.peace >= 4 ? 1 : 0)
    + (state.commandments?.includes('noSword') ? 1 : 0) + (state.saints?.some((x) => x.kind === 'preacher') ? 1 : 0)
    + (state.config.blessing === 'preacher' && !state.stats.converted ? 1 : 0);
  return Math.min(2, base) + (state.roundMods.tongues ?? 0);
}

// 선교·공격의 보너스와 승률 (확인 화면 표시용 — resolveAction과 같은 계산)
export function actionOdds(state, a, { curse = false } = {}) {
  const side = a.side ?? 'player';
  const s = state.sides[side]; const f = state.sides[other(side)];
  const t = state.tileAt[a.tile];
  let atk = 0; let def = 0;
  if (a.type === 'attack') {
    atk = (s.doctrine.war >= 2 ? 1 : 0) + (s.doctrine.war >= 4 ? 1 : 0) + superiority(s, f) + (side === 'player' ? (state.roundMods.attackBonus ?? (curse ? 1 : 0)) + (state.roundMods.pillar ?? 0) : 0);
    def = (t.wall ? 2 : 0) + (t.building === 'capital' ? 1 : 0) + superiority(f, s);
  } else if (a.type === 'preach') {
    atk = preachBonus(state, side);
    def = (t.building === 'capital' ? 1 : 0) + (t.wall ? 1 : 0);
  } else return null;
  let w = 0;
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + atk > y + def) w++;
  return w / 36;
}

// 신도 수가 상대보다 3명 이상 많으면 선교·공격 주사위 +1
const superiority = (s, f) => (s.pop >= f.pop + RULES.superiority ? 1 : 0);

// ---------- 행동 설명 ----------
// 받침에 맞는 조사를 붙인다. "우리 마을(D2)"처럼 괄호 앞 글자를 기준으로 한다
export const batchim = (w) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
export function josa(name, withBatchim, without) {
  const base = name.replace(/\([^)]*\)$/, '');
  const code = base.charCodeAt(base.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 ? code % 28 !== 0 : true;
  return name + (has ? withBatchim : without);
}
const subj = (side) => (side === 'player' ? '신도들이' : '율법파가');
const topic = (side) => (side === 'player' ? '신도들은' : '율법파는');
const poss = (side) => (side === 'player' ? '신도들의' : '율법파의');

// 이름은 항상 플레이어 시점("우리" = 플레이어). 안개는 플레이어가 볼 때만 가린다
export function tileName(state, tile, viewer = 'player') {
  if (viewer === 'player' && !tile.revealed) return `안개 지대(${tile.id})`;
  const given = state.names?.[tile.id];
  if (given) return `${given}(${tile.id})`;
  const who = tile.owner === 'player' ? '우리' : '율법파';
  if (tile.building === 'capital') return `${who} 신전(${tile.id})`;
  if (tile.building === 'village') return `${who} 마을(${tile.id})`;
  if (tile.feature) return `${FEATURES[tile.feature].name}(${tile.id})`;
  return `${TERRAIN[tile.terrain].name}(${tile.id})`;
}

function costText(cost) {
  return Object.entries(cost).map(([k, v]) => `${RESOURCE_NAME[k]} -${v}`).join(', ');
}
const canPay = (s, cost) => Object.entries(cost).every(([k, v]) => s[k] >= v);
// 건설 비용 (신전은 단계, 대성당은 공사 단계에 따라)
export function buildCost(state, side, build) {
  const s = state.sides[side];
  if (build === 'temple') {
    const c = { ...COST.temple(s.templeLevel) };
    if (side === 'player' && state.commandments?.includes('noExpand')) c.stone = Math.max(0, c.stone - 1);
    if (side === 'player' && state.config.blessing === 'mason' && s.templeLevel === 1) c.stone = Math.max(0, c.stone - 1);
    return c;
  }
  if (build === 'cathedral') {
    const c = CATHEDRAL[Math.min(2, s.cathedral ?? 0)].cost;
    return quick(state) ? Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.ceil(v * 0.7)])) : c;
  }
  return COST[build];
}
const pay = (s, cost) => { for (const [k, v] of Object.entries(cost)) s[k] -= v; };

// 칸의 채집: 지형 + 영구 지형(오아시스·채석장)
export function yieldOf(tile) {
  const f = tile.feature && FEATURES[tile.feature];
  if (f) return { gather: f.gather, amount: f.amount };
  return TERRAIN[tile.terrain];
}

export function gatherAmount(state, side, tile) {
  const terr = yieldOf(tile);
  let n = terr.amount;
  if (terr.gather === 'food') {
    if (state.event?.id === 'drought' && !state.rainActive) n -= 1;
    if (state.event?.id === 'harvest' && tile.terrain === 'plain') n += 1;
    if (state.sides[side].doctrine.abundance >= 2) n += 1;
  }
  if (side === 'player' && state.roundMods?.gatherBonus) n += 1;
  return Math.max(0, n);
}

function describe(state, side, a) {
  const t = state.tileAt[a.tile];
  const place = tileName(state, t, side);
  const s = state.sides[side];
  switch (a.type) {
    case 'gather': return `${place}에서 ${t.terrain === 'river' ? '물고기를 잡는다' : GATHER_VERB[a.gather]} (${RESOURCE_NAME[a.gather]} +${gatherAmount(state, side, t)})`;
    case 'pray': return `신전에서 기도한다 (신앙 +${prayValue(state, side)})`;
    case 'build':
      if (a.build === 'village') return `${place}에 마을을 세운다 (${costText(COST.village)}, 영토 확장)`;
      if (a.build === 'wall') return `${place}에 성벽을 쌓는다 (${costText(COST.wall)}, 방어 +2)`;
      if (a.build === 'temple') return `신전을 높인다 (${costText(buildCost(state, side, 'temple'))}, 행동 수 +1)`;
      return `대성당의 ${josa(CATHEDRAL[Math.min(2, s.cathedral ?? 0)].name, '을', '를')} 올린다 (${costText(buildCost(state, side, 'cathedral'))}, ${s.cathedral ?? 0}/3단계${(s.cathedral ?? 0) === 2 ? ' — 완공하면 승리' : ''})`;
    case 'preach': return `${place}의 율법파에게 신의 뜻을 전한다 (개종 판정)`;
    case 'attack': return `${josa(place, '을', '를')} 공격한다 (전투 판정${t.wall ? ', 성벽 있음' : ''})`;
    case 'explore': return `${place} 속을 탐험한다 (무엇이 있을지 모름)`;
    default: return a.type;
  }
}

// ---------- 가능한 행동 ----------
export function legalActions(state, side) {
  const s = state.sides[side];
  const foe = other(side);
  const visible = (t) => side !== 'player' || t.revealed;
  const cap = capitalOf(state, side);
  const list = [];
  const add = (a) => list.push({ ...a, side, key: `${a.type}:${a.tile}:${a.gather ?? a.build ?? ''}` });

  const inReach = reach(state, side);
  for (const t of inReach) {
    if (!visible(t)) continue;
    const terr = yieldOf(t);
    if (terr.gather && t.owner !== foe && t.building !== 'capital') add({ type: 'gather', tile: t.id, gather: terr.gather });
    const cmd = side === 'player' ? state.commandments ?? [] : [];
    if (!t.owner && !t.building && canPay(s, COST.village) && !cmd.includes('noExpand')) add({ type: 'build', build: 'village', tile: t.id });
    if (t.owner === foe) {
      add({ type: 'preach', tile: t.id });
      if (!cmd.includes('noSword') && !(side === 'player' && state.config.trial === 'earth')) add({ type: 'attack', tile: t.id });
    }
  }
  for (const t of ownedTiles(state, side)) {
    if (t.building && !t.wall && canPay(s, COST.wall)) add({ type: 'build', build: 'wall', tile: t.id });
  }
  if (cap) {
    add({ type: 'pray', tile: cap.id });
    if (s.templeLevel < MAX_TEMPLE && canPay(s, buildCost(state, side, 'temple'))) add({ type: 'build', build: 'temple', tile: cap.id });
    if (side === 'player' && s.templeLevel === MAX_TEMPLE && (s.cathedral ?? 0) < 3 && canPay(s, buildCost(state, side, 'cathedral'))) add({ type: 'build', build: 'cathedral', tile: cap.id });
  }
  // 탐험: 닿는 범위 바로 바깥의 안개 칸 (플레이어만)
  if (side === 'player') {
    const ids = new Set(inReach.map((t) => t.id));
    const fog = new Map();
    for (const t of inReach) for (const n of neighbors(state, t)) if (!n.revealed && !ids.has(n.id)) fog.set(n.id, n);
    for (const t of fog.values()) add({ type: 'explore', tile: t.id });
  }
  return list.map((a) => ({ ...a, text: describe(state, side, a) }));
}

// ---------- 명령 검증 ----------
// 교리별로 같은 장소에서 겹쳤을 때 남길 행동 (실험에서 같은 장소 충돌은 프롬프트로 해결되지 않았다)
const DOCTRINE_PREF = {
  war: ['attack', 'build'], peace: ['preach', 'pray'], abundance: ['gather', 'build'], wisdom: ['pray', 'explore', 'build'],
};

export function validateOrders(state, side, chosen, forbidden = [], doctrine = null) {
  const limit = actionLimit(state, side);
  const accepted = [];
  const rejected = [];
  const pref = DOCTRINE_PREF[doctrine] ?? [];
  // 건설은 이번 라운드에 이미 고른 건설 비용까지 합쳐서 감당할 수 있어야 한다
  const s = state.sides[side];
  const budget = { food: s.food, wood: s.wood, stone: s.stone, faith: s.faith };
  const costOf = (a) => (a.type !== 'build' ? null : buildCost(state, side, a.build));
  for (const a of chosen) {
    if (forbidden.includes(a.key)) { rejected.push({ action: a, reason: '계시가 금지' }); continue; }
    const cost = costOf(a);
    if (cost && !canPay(budget, cost)) { rejected.push({ action: a, reason: '자원 부족' }); continue; }
    const clash = accepted.findIndex((x) => x.tile === a.tile);
    if (clash >= 0) {
      const keep = accepted[clash];
      if (pref.includes(a.type) && !pref.includes(keep.type)) {
        accepted[clash] = a;
        rejected.push({ action: keep, reason: '같은 장소 (교리에 맞는 행동 우선)' });
      } else {
        rejected.push({ action: a, reason: '같은 장소' });
      }
      continue;
    }
    if (accepted.length >= limit) { rejected.push({ action: a, reason: '행동 수 초과' }); continue; }
    if (cost) pay(budget, cost);
    accepted.push(a);
  }
  return { accepted, rejected };
}

// 계시와 무관하게 남은 신도가 하는 기본 노동: 신앙이 바닥나면 기도부터, 그다음 가장 부족한 자원 채집
export function autoFill(state, side, accepted, forbidden = []) {
  const limit = actionLimit(state, side);
  const s = state.sides[side];
  const used = new Set(accepted.map((a) => a.tile));
  const order = ['food', 'wood', 'stone'].sort((x, y) => s[x] - s[y]);
  const pool = legalActions(state, side).filter((a) => a.type === 'gather' && !forbidden.includes(a.key));
  const filled = [];
  const prayFirst = legalActions(state, side).find((a) => a.type === 'pray' && !forbidden.includes(a.key));
  if (side === 'player' && s.faith <= RULES.lowFaith && prayFirst && !used.has(prayFirst.tile) && accepted.length < limit) {
    used.add(prayFirst.tile); filled.push({ ...prayFirst, auto: true });
  }
  for (const res of [...order, ...order]) {
    if (accepted.length + filled.length >= limit) break;
    const pick = pool.find((a) => a.gather === res && !used.has(a.tile));
    if (pick) { used.add(pick.tile); filled.push({ ...pick, auto: true }); }
  }
  // 채집할 곳이 없으면 신전에서 기도한다
  const pray = legalActions(state, side).find((a) => a.type === 'pray' && !forbidden.includes(a.key));
  if (accepted.length + filled.length < limit && pray && !used.has(pray.tile)) filled.push({ ...pray, auto: true });
  return filled;
}

// ---------- 율법파 (오토마) ----------
function pickForRule(state, rule, pool) {
  const foe = 'player';
  const foeCap = capitalOf(state, foe);
  const byDist = (a, b) => distance(state.tileAt[a.tile], foeCap) - distance(state.tileAt[b.tile], foeCap);
  const cands = pool.filter((a) => a.type === rule.type
    && (!rule.gather || a.gather === rule.gather) && (!rule.build || a.build === rule.build));
  if (!cands.length) return null;
  if (rule.target === 'capital') return cands.find((a) => state.tileAt[a.tile].building === 'capital') ?? null;
  if (rule.type === 'attack' || rule.type === 'preach') {
    // 성벽 없는 마을 → 마을 → 수도 순으로 노린다
    const score = (a) => {
      const t = state.tileAt[a.tile];
      return (t.building === 'village' ? 0 : 2) + (t.wall ? 1 : 0);
    };
    return [...cands].sort((a, b) => score(a) - score(b))[0];
  }
  if (rule.type === 'build' && (rule.build === 'village' || rule.build === 'wall')) return [...cands].sort(byDist)[0];
  return cands[0];
}

export function planEnemy(state) {
  const side = 'enemy';
  const limit = actionLimit(state, side);
  const card = state.lawCard;
  const pool = legalActions(state, side);
  const used = new Set();
  const plan = [];
  // 대성당 공사가 시작되면 율법파는 수도를 먼저 친다
  const rush = (state.sides.player.cathedral ?? 0) >= 1 ? [{ type: 'attack', target: 'capital' }] : [];
  const rules = [...rush, ...card.rules, ...card.rules];
  for (const rule of rules) {
    if (plan.length >= limit) break;
    // 공격·선교는 신도가 둘 이상일 때만 (수도를 비우지 않는다)
    if ((rule.type === 'attack' || rule.type === 'preach') && state.sides.enemy.pop < 2) continue;
    const pick = pickForRule(state, rule, pool.filter((a) => !used.has(a.tile)));
    if (pick) { used.add(pick.tile); plan.push(pick); }
  }
  plan.push(...autoFill(state, side, plan));
  return plan;
}

// ---------- 라운드 ----------
export function startRound(state) {
  state.round += 1;
  state.miracleUsed = false;
  state.reinterpretUsed = false;
  state.rainActive = false;
  if (!state.eventDeck.length) state.eventDeck = dealDeck(state, EVENTS, 6);
  if (state.lawDeck.length < 2) state.lawDeck.unshift(...dealDeck(state, lawPool(state), 9));
  // 세 막 (두 번째 판부터): 2막에 들어서면 성전 카드 한 장을 덱에 넣고, 3막에는 평온한 계절이 오지 않는다
  if (state.config.veteran && !state.tutorial && actStart(state)) {
    if (actOf(state) === 2 && lawPool(state).some((c) => c.id === 'L5')) state.lawDeck.splice(Math.max(0, state.lawDeck.length - 3), 0, LAW_CARDS.find((c) => c.id === 'L5'));
    if (actOf(state) === 3) state.eventDeck = state.eventDeck.filter((e) => e.id !== 'calm');
  }
  if (!state.eventDeck.length) state.eventDeck = dealDeck(state, state.config.veteran && actOf(state) === 3 ? EVENTS.filter((e) => e.id !== 'calm') : EVENTS, 6);
  state.event = state.eventDeck.pop();
  // 분열의 예언자: 두 번째 판·2막부터 한 번. 대립 교리가 둘 다 3 이상이거나 신앙 바닥으로 한 장을 버텼을 때
  const d0 = state.sides.player.doctrine;
  const split = (d0.peace >= 3 && d0.war >= 3) || (d0.abundance >= 3 && d0.wisdom >= 3);
  if (state.config.veteran && !state.tutorial && !state.miraDone && actOf(state) >= 2 && (split || state.sides.player.faithless >= 1)) {
    state.eventDeck.push(state.event);
    state.event = MIRA;
    state.miraDone = true;
    const past = state.revelations.filter((r) => r.doctrine);
    const q = past.length ? past[past.length - 1] : null;
    state.miraQuote = q ? `신께서 “${q.text}”라 하셨으니, 곧 ${MIRA_TWIST[q.doctrine]}는 뜻이다!` : '신은 이미 우리를 떠났다!';
  }
  // 지혜 궁극: 다가올 계절 두 장 중 하나를 고른다 (고르지 않으면 첫 장)
  state.eventChoice = hasUlt(state, 'player', 'wisdom') && state.eventDeck.length && state.eventDeck.at(-1).id !== state.event.id
    ? [state.event.id, state.eventDeck.at(-1).id] : null;
  // 지난 장 검열 카드가 봉인한 말은 이번 장에만 효력이 있다
  state.bannedWords = state.bannedNext ? [state.bannedNext] : [];
  state.bannedNext = null;
  state.lawCard = state.lawDeck.pop();
  // 율법파가 지난 장의 말씀을 들었다: 그 말에 맞서는 카드를 고른다 (쉬움·튜토리얼 제외, 난수 없이)
  const heard = state.vowNext ? 'vow' : state.revelations.find((r) => r.round === state.round - 1)?.doctrine ?? null;
  const react = heard && !state.tutorial && state.config.difficulty !== 'easy' ? REACT[heard] : null;
  const pref = (card) => (react?.cards.includes(card.id) ? 2 : 0);
  state.reacted = null;
  state.vowNext = null;
  // 어려움: 율법 카드를 두 장 보고 지금 더 위협적인 쪽을 쓴다 (다른 한 장은 버린다). 들은 말은 동점 깨기로
  if (state.config.difficulty === 'hard' && !state.tutorial) {
    const alt = state.lawDeck.pop();
    if (lawThreat(state, alt) + pref(alt) > lawThreat(state, state.lawCard) + pref(state.lawCard)) state.lawCard = alt;
    if (pref(state.lawCard)) state.reacted = heard;
  } else if (react && pref(state.lawCard)) {
    state.reacted = heard; // 마침 뽑힌 카드가 들은 말에 맞선다
  } else if (react) {
    // 덱 위 세 장 가운데 들은 말에 맞서는 카드가 있으면 그 카드를 먼저 쓴다 (지금 카드는 그 자리로)
    const i = [1, 2, 3].map((k) => state.lawDeck.length - k).find((j) => j >= 0 && pref(state.lawDeck[j]));
    if (i !== undefined) {
      const pick = state.lawDeck[i];
      state.lawDeck[i] = state.lawCard;
      state.lawCard = pick;
      state.reacted = heard;
    }
  }
  state.first = state.round % 2 === 1 ? 'player' : 'enemy';
  state.roundMods = {};
  state.dilemmaPick = null;
  if (state.round > 1) state.destinyOffer = null; // 1장에 고르지 않았으면 첫 소명 그대로
  state.petition = makePetition(state);
  if (state.round === draftRound(state) && state.config.veteran && !state.tutorial) {
    const pool = MIRACLES.map((m) => m.id).filter((id) => !state.miracleHand.includes(id));
    const offer = [];
    for (let i = 0; i < 3 && pool.length; i++) offer.push(pool.splice(Math.floor(rand(state, 'deck') * pool.length), 1)[0]);
    state.miracleOffer = offer;
  }
}

// ---------- 말의 층: 청원, 은총, 말투, 이름, 예언 ----------
// 은총: 청원·말투·이름에서 오는 신앙은 장당 한도까지만
export function grantGrace(state, n, why) {
  if (state.grace.round !== state.round) state.grace = { round: state.round, used: 0 };
  const give = Math.max(0, Math.min(n, RULES.gracePerRound - state.grace.used));
  if (!give) return 0;
  state.grace.used += give;
  state.sides.player.faith += give;
  logEvent(state, 'player', `은총 — ${why}. 신앙 +${give}.`, null, { kind: 'grace', gain: { faith: give }, tile: capitalOf(state, 'player')?.id });
  return give;
}

// 신도들의 청원: 지금 부족에게 가장 급한 것을 한 사람이 묻는다
function makePetition(state) {
  const p = state.sides.player;
  const who = hashPick(PETITIONERS, state.config.seed, state.round, 'petitioner');
  const threat = enemyIntent(state).find((a) => a.shown && a.type === 'attack');
  const needs = [
    [state.event?.id === 'drought' || p.food < p.pop, { text: '먹을 것이 모자라옵니다. 어디서 거두리까?', need: { type: 'gather', gather: 'food' }, keys: /강|물|곡식|들|먹|거두|수확/ }],
    [threat, { text: `율법파가 ${josa(tileName(state, state.tileAt[threat?.tile ?? capitalOf(state, 'player').id]), '을', '를')} 노리옵니다. 어찌 지키리까?`, need: { type: 'build', build: 'wall' }, alt: 'attack', keys: /지키|막|성벽|방패|쳐|싸우/ }],
    [p.faith <= RULES.lowFaith, { text: '신이시여, 저희 믿음이 흔들리옵니다.', need: { type: 'pray' }, keys: /기도|경배|믿|섬기|찬양/ }],
    [state.event?.id === 'plague', { text: '역병이 돕니다. 저희를 버리지 마소서.', need: { type: 'pray' }, keys: /기도|치유|살리|낫|지키/ }],
    [state.event?.id === 'prophet', { text: '예언자가 안개 속 보물을 말하옵니다. 가 보리까?', need: { type: 'explore' }, keys: /안개|찾|탐험|너머|보물/ }],
    [p.pop >= popCap(state, 'player'), { text: '집이 비좁사옵니다. 새 터를 주소서.', need: { type: 'build', build: 'village' }, keys: /마을|터|넓|세우/ }],
    [p.wood < 2, { text: '땔감이 떨어졌사옵니다.', need: { type: 'gather', gather: 'wood' }, keys: /숲|나무|목재|베/ }],
    [true, { text: '신이시여, 이번 계절엔 무엇을 하리까?', need: null, keys: null }],
  ];
  const [, pick] = needs.find(([cond]) => cond);
  return { from: who, ...pick, keys: pick.keys?.source ?? null };
}

// 청원에 답했는가: 명령한 행동이 필요와 맞거나, 계시에 그 뜻의 말이 있으면
export function petitionAnswered(state, text, orders) {
  const pt = state.petition;
  if (!pt?.need || !text) return false;
  const hit = orders.some((a) => a.type === pt.need.type && (!pt.need.gather || a.gather === pt.need.gather) && (!pt.need.build || a.build === pt.need.build))
    || (pt.alt && orders.some((a) => a.type === pt.alt));
  return hit || (pt.keys ? new RegExp(pt.keys).test(text) : false);
}

// 이름 붙이기: 가장 가까운 그 지형(또는 우리 마을·신전)에 이름을 새긴다
export function nameTile(state, naming) {
  if (!naming || Object.keys(state.names).length >= RULES.maxNames) return null;
  const home = capitalOf(state, 'player');
  const fits = (t) => (naming.kind === 'village' ? t.building === 'village' && t.owner === 'player'
    : naming.kind === 'capital' ? t.building === 'capital' && t.owner === 'player'
      : t.terrain === naming.kind && !t.building);
  const cands = state.tiles.filter((t) => t.revealed && fits(t) && !state.names[t.id] && !Object.values(state.names).includes(naming.name));
  if (!cands.length) return null;
  const t = cands.sort((a, b) => distance(a, home) - distance(b, home))[0];
  const first = Object.keys(state.names).length === 0;
  state.names[t.id] = naming.name;
  return { tile: t.id, first };
}

// 해결 전: 말투 효과 (축복 = 첫 채집 +1, 저주 = 공격 +1과 신앙 -1)
export function applyTone(state, tone) {
  delete state.roundMods.gatherBonus; delete state.roundMods.attackBonus;
  if (tone === 'blessing') state.roundMods.gatherBonus = 1;
  if (tone === 'curse') { state.roundMods.attackBonus = 1; state.sides.player.faith = Math.max(0, state.sides.player.faith - 1); }
}

// 예언 봉인
export function sealProphecy(state, p) {
  if (state.prophecy || !p) return false;
  const e = state.sides.enemy;
  state.prophecy = {
    ...p, sealed: state.round, due: state.round + p.rounds - 1,
    base: { villages: villageCount(state, 'enemy'), hp: e.capitalHp, pop: state.sides.player.pop, converted: state.stats.converted, captured: state.stats.captured },
  };
  return true;
}

function checkProphecy(state) {
  const pr = state.prophecy;
  if (!pr) return;
  const b = pr.base;
  const done = { fall: state.stats.captured > b.captured, capital: state.sides.enemy.capitalHp < b.hp,
    pop: state.sides.player.pop >= b.pop + 2, convert: state.stats.converted > b.converted }[pr.kind];
  const home = capitalOf(state, 'player')?.id;
  if (done) {
    const r = PROPHECY.reward[pr.rounds];
    state.sides.player.faith += r;
    state.stats.prophecies += 1;
    state.prophecy = null;
    logEvent(state, 'player', `예언이 이루어졌다 — “${PROPHECY.kinds[pr.kind].name}”. 신앙 +${r}.`, null, { kind: 'prophecy', gain: { faith: r }, tile: home });
  } else if (state.round >= pr.due) {
    state.sides.player.faith = Math.max(0, state.sides.player.faith - PROPHECY.penalty);
    state.prophecy = null;
    logEvent(state, 'player', `예언이 빗나갔다 — “${PROPHECY.kinds[pr.kind].name}”. 신도들이 수군거린다. 신앙 -${PROPHECY.penalty}.`, null, { kind: 'warn', tile: home });
  }
}

// 율법 카드가 지금 얼마나 위협적인가: 실제로 할 수 있는 공격·선교·건설에 가중치
function lawThreat(state, card) {
  const pool = legalActions(state, 'enemy');
  const weight = { attack: 3, preach: 2, build: 2, pray: 1, gather: 1 };
  return card.rules.reduce((sum, r) => sum + (pool.some((a) => a.type === r.type && (!r.build || a.build === r.build) && (!r.gather || a.gather === r.gather)) ? weight[r.type] : 0), 0);
}

// 지혜 궁극: 다음 카드와 바꿔 쓴다 (안 고른 카드는 덱 맨 위로 돌아간다)
export function chooseEvent(state, id) {
  if (!state.eventChoice?.includes(id) || state.event.id === id) return;
  const next = state.eventDeck.pop();
  state.eventDeck.push(state.event);
  state.event = next;
  state.eventChoice = null;
  state.petition = makePetition(state);
}

// 계시 비용: 기본(30자 이하 1, 넘으면 2) + 봉인된 말을 쓰면 +1
export function revelationCostFor(state, text) {
  // 지난 계시를 인용하면 길어도 1 (성구 인용 사슬)
  const base = text.trim().length > 30 && !citedWords(state, text).length && !(state.liturgy && text.includes(state.liturgy)) ? 2 : 1;
  return base + (state.bannedWords.some((w) => text.includes(w)) ? 1 : 0);
}

// 율법파가 이번 장에 할 일 (예고용). 공개하는 범위는 난이도에 따라 다르다
export function enemyIntent(state) {
  const plan = planEnemy(state);
  const diff = state.tutorial ? 'easy' : state.config.difficulty;
  const shown = diff === 'easy' ? () => true
    : diff === 'normal' ? (a) => ['attack', 'preach', 'build'].includes(a.type)
      : (a) => a.type === 'attack';
  return plan.map((a) => ({ ...a, shown: shown(a) && state.tileAt[a.tile].revealed }));
}

// 기적 비용: 신의 분노만큼 싸진다 (최소 1). 심판의 날은 공짜
export const miracleCost = (state, m) => (m.id === DOOM.id ? 0 : Math.max(1, m.cost - (state.wrath ?? 0) - (state.config.trial === 'storm' && m.id === 'lightning' ? 1 : 0)));
export const doomReady = (state) => (state.wrath ?? 0) >= 3 && !state.tutorial;

export function castMiracle(state, id, targetTile) {
  const m = id === DOOM.id ? DOOM : MIRACLES.find((x) => x.id === id);
  const s = state.sides.player;
  if (id === DOOM.id ? !doomReady(state) : !state.miracleHand.includes(id)) return { ok: false, text: '손에 없는 기적이다.' };
  const cost = miracleCost(state, m);
  if (state.miracleUsed || s.faith < cost) return { ok: false, text: '신앙이 부족하거나 이미 기적을 썼다.' };
  const home = capitalOf(state, 'player')?.id;
  if (MIRACLE_FX[id]) {
    s.faith -= cost;
    MIRACLE_FX[id](state, s, home);
    state.miracleUsed = true;
    state.stats.miracles += 1;
    checkVictory(state, false);
    return { ok: true };
  }
  if (m.id === 'lightning') {
    const t = state.tileAt[targetTile];
    if (!t || t.owner !== 'enemy' || !t.revealed) return { ok: false, text: '보이는 율법파 칸을 골라야 한다.' };
    s.faith -= cost;
    if (t.building === 'capital') raiseEdict(state, -2, '번개가 탑의 돌판을 쪼갰다');
    if (t.wall) { t.wall = false; logEvent(state, 'player', `⚡ 번개가 ${tileName(state, t)}의 성벽을 무너뜨렸다.`, null, { tile: t.id, kind: 'lightning' }); }
    else { state.sides.enemy.pop = Math.max(0, state.sides.enemy.pop - 1); logEvent(state, 'player', `⚡ 번개가 ${tileName(state, t)}에 떨어져 율법파 1명이 쓰러졌다.`, null, { tile: t.id, kind: 'lightning' }); }
  } else if (m.id === 'rain') {
    s.faith -= cost; s.food += 3; state.rainActive = true;
    logEvent(state, 'player', '🌧️ 단비가 내렸다. 식량 +3.', null, { kind: 'rain', gain: { food: 3 } });
  } else {
    s.faith -= cost; s.wood += 2; s.stone += 2;
    logEvent(state, 'player', '🎁 풍요의 기적. 목재 +2, 돌 +2.', null, { kind: 'bounty', gain: { wood: 2, stone: 2 } });
  }
  state.miracleUsed = true;
  state.stats.miracles += 1;
  checkVictory(state, false);
  return { ok: true };
}

// 새 기적들 (번개·단비·풍요는 castMiracle 안에 있다)
const MIRACLE_FX = {
  doom: (state, s, home) => {
    const e = state.sides.enemy;
    const cap = capitalOf(state, 'enemy');
    e.capitalHp = Math.max(0, e.capitalHp - 1);
    e.pop = Math.max(0, e.pop - 1);
    state.wrath = 0;
    raiseEdict(state, -2, '심판의 날이 돌판을 갈랐다');
    logEvent(state, 'player', `심판의 날 — 하늘이 갈라져 율법파의 탑이 흔들리고(수도 내구도 ${e.capitalHp}) 한 사람이 쓰러졌다. 신의 분노가 가라앉는다.`, null, { kind: 'lightning', tile: cap?.id });
    if (e.capitalHp <= 0) { state.winner = 'player'; state.winReason = '적 수도 점령 (심판의 날)'; }
  },
  manna: (state, s, home) => { s.food += 4; logEvent(state, 'player', '만나가 내렸다. 식량 +4.', null, { kind: 'rain', gain: { food: 4 }, tile: home }); },
  ark: (state, s, home) => { state.roundMods.ark = true; logEvent(state, 'player', '방주의 기적 — 이번 장에는 아무도 잃지 않으리라.', null, { kind: 'bless', tile: home, label: '방주' }); },
  tongues: (state, s, home) => { state.roundMods.tongues = 1; logEvent(state, 'player', '방언의 은사 — 이번 장 선교에 힘이 실린다.', null, { kind: 'bless', tile: home, label: '방언' }); },
  pillar: (state, s, home) => {
    state.roundMods.pillar = 1;
    const mine = ownedTiles(state, 'player');
    for (const t of state.tiles) if (mine.some((m) => distance(m, t) <= 3)) t.revealed = true;
    logEvent(state, 'player', '불기둥이 앞서간다 — 안개가 걷히고 이번 장 공격에 힘이 실린다.', null, { kind: 'bless', tile: home, label: '불기둥' });
  },
  revive: (state, s, home) => {
    if (s.pop < popCap(state, 'player')) { s.pop += 1; logEvent(state, 'player', '쓰러진 자가 일어났다. 신도 +1.', null, { kind: 'birth', tile: home }); }
    else { s.faith += 2; logEvent(state, 'player', '부활의 기적 — 그러나 자리가 없어 빛만 남았다. 신앙 +2.', null, { kind: 'bless', tile: home, label: '부활' }); }
  },
};

// 5장: 새 기적 하나를 고른다
export function takeMiracle(state, id) {
  if (!state.miracleOffer?.includes(id)) return false;
  state.miracleHand.push(id);
  state.miracleOffer = null;
  return true;
}

// 발견지: 새로 드러난 칸에 있으면 한 번 일어난다 (유목민은 선택이 필요해 pendingSite로 남긴다)
export function discoverSites(state) {
  for (const t of state.tiles) {
    if (!t.site || t.site.found || !t.revealed) continue;
    const site = SITES[t.site.id];
    if (site.choice && state.pendingSite) continue; // 선택이 필요한 발견은 한 번에 하나 (다음 장에 이어진다)
    t.site.found = true;
    if (site.choice) { state.pendingSite = t.id; logEvent(state, 'player', `${tileName(state, t)}에서 ${josa(site.name, '을', '를')} 만났다.`, null, { kind: 'site', tile: t.id }); continue; }
    const s = state.sides.player;
    const lg = t.site.id === 'legacy' ? state.config.legacy : null;
    if (lg) {
      const d = lg.doctrine && s.doctrine[lg.doctrine] < RULES.graceDoctrineBelow ? lg.doctrine : null;
      if (d) s.doctrine[d] += 1; else s.faith += 2;
      const who = lg.god ? `「${lg.epithet}」 ${lg.god}` : `「${lg.epithet}」`;
      logEvent(state, 'player', `전생의 유적 — 여기 ${who}${batchim(lg.god || lg.epithet) ? '이' : '가'} “${lg.quote}”라 말씀하셨다. ${d ? `${({ peace: '평화', war: '전쟁', abundance: '풍요', wisdom: '지혜' })[d]} +1` : '신앙 +2'}.`, null, { kind: 'treasure', tile: t.id, gain: d ? undefined : { faith: 2 } });
      continue;
    }
    for (const [k, v] of Object.entries(site.gain)) s[k] += v;
    logEvent(state, 'player', `${site.name} — ${site.text} ${Object.entries(site.gain).map(([k, v]) => `${RESOURCE_NAME[k]} +${v}`).join(', ')}.`, null, { kind: 'treasure', tile: t.id, gain: site.gain });
  }
}
export function resolveSite(state, choice) {
  const t = state.tileAt[state.pendingSite];
  state.pendingSite = null;
  if (!t) return null;
  const s = state.sides.player;
  if (choice === 'take') {
    if (s.pop < popCap(state, 'player')) { s.pop += 1; return '유목민이 신도가 되었다. 신도 +1.'; }
    s.food += 2; return '자리가 없어 유목민은 양식을 두고 떠났다. 식량 +2.';
  }
  s.faith += 2; return '유목민이 축복을 받고 떠났다. 신앙 +2.';
}

// 보드에 보이는 상태만 복사한다 (연출 재생용)
export function snapshot(state) {
  return {
    tiles: state.tiles.map((t) => ({ ...t, faithMarks: t.faithMarks && { ...t.faithMarks } })),
    sides: JSON.parse(JSON.stringify(state.sides)),
  };
}

// fx: 연출 정보 { tile, kind, gain, icon, ... }. snap: 이 일이 일어난 직후의 보드
// 지금 해결 중인 행동의 키 (로그를 행동과 잇는다: 판결문·단어 연결용)
let currentAct = null;
function logEvent(state, side, text, dice = null, fx = null) {
  state.log.push({ round: state.round, side, text, dice, fx, act: currentAct, snap: snapshot(state) });
}

const PHASE_ORDER = ['gather', 'build', 'pray', 'explore', 'preach', 'attack'];

// 양쪽 명령을 동시에 공개하고 규칙 순서대로 해결한다
export function resolveRound(state, playerPlan, enemyPlan) {
  const first = state.first;
  const plans = { player: playerPlan, enemy: enemyPlan };
  // 같은 칸을 양쪽이 고르면 선 플레이어가 차지한다
  const firstTiles = new Set(plans[first].map((a) => a.tile));
  const blocked = new Set();
  for (const a of plans[other(first)]) {
    if (firstTiles.has(a.tile)) {
      blocked.add(a);
      logEvent(state, a.side, `${topic(a.side)} ${josa(tileName(state, state.tileAt[a.tile], 'player'), '을', '를')} 상대에게 먼저 빼앗겨 행동하지 못했다.`, null, { tile: a.tile, kind: 'blocked' });
    }
  }
  for (const phase of PHASE_ORDER) {
    for (const side of [first, other(first)]) {
      for (const a of plans[side]) {
        if (a.type !== phase || blocked.has(a) || state.winner) continue;
        currentAct = a.key;
        resolveAction(state, a);
        currentAct = null;
      }
    }
  }
  if (!state.winner) upkeep(state);
  recordHistory(state);
}

// 장마다 두 진영의 승점과 살림을 남긴다 (결산·그래프·회고용)
function recordHistory(state) {
  const p = state.sides.player;
  const ps = score(state, 'player');
  const es = score(state, 'enemy');
  state.history.push({
    round: state.round, ps, es,
    res: { food: p.food, wood: p.wood, stone: p.stone, faith: p.faith, pop: p.pop }, text: null,
  });
  checkDestiny(state);
  // 신의 분노: 4장부터 6점 이상 뒤지면 차오르고, 3점 이내로 좁히면 가라앉는다
  if (state.tutorial || state.winner) return;
  const before = state.wrath;
  if (state.round >= wrathRound(state) && es - ps >= ((state.config.ascension ?? 0) >= 3 ? 8 : 6)) state.wrath = Math.min(3, state.wrath + 1);
  else if (es - ps <= 3) state.wrath = Math.max(0, state.wrath - 1);
  if (state.wrath > before) {
    logEvent(state, 'player', state.wrath >= 3 ? '신의 분노가 가득 찼다. 「심판의 날」을 내릴 수 있다.' : `신의 분노가 차오른다 (${state.wrath}/3) — 기적이 ${state.wrath}만큼 싸진다.`, null, { kind: 'wrath', tile: capitalOf(state, 'player')?.id });
  }
}

// ---------- 율법 석판과 성지 ----------
export const holyTile = (state) => (state.holyId ? state.tileAt[state.holyId] : null);
export const holyOwner = (state) => { const t = holyTile(state); return t?.building === 'village' ? t.owner : null; };
export const edictMax = (state) => EDICT_MAX - ((state?.config?.ascension ?? 0) >= 2 ? 2 : 0);
export function raiseEdict(state, n, why) {
  if (!state.edictOn || n === 0) return;
  const e = state.sides.enemy;
  const before = e.edict;
  e.edict = Math.max(0, Math.min(edictMax(state), e.edict + n));
  if (e.edict === before) return;
  logEvent(state, 'enemy', `율법 석판 ${n > 0 ? '+' : ''}${e.edict - before} — ${why} (${e.edict}/${edictMax(state)}).`, null, { kind: 'edict', tile: capitalOf(state, 'enemy')?.id });
  if (before < edictMax(state) - 2 && e.edict >= edictMax(state) - 2) logEvent(state, 'player', '율법 석판이 거의 완성되었다! 성지를 쥐거나 탑을 쳐서 막아야 한다.', null, { kind: 'warn' });
}
function holyAndEdict(state) {
  if (!state.edictOn) return;
  // 성지는 2막부터 석판을 움직인다 (그 전에 성지를 두고 다툴 시간을 준다)
  const owner = actOf(state) >= 2 ? holyOwner(state) : null;
  if (owner === 'enemy') raiseEdict(state, 1, '율법파가 성지에서 율법을 외웠다');
  else if (owner === 'player') raiseEdict(state, -1, '성지의 말씀이 율법을 지웠다');
  const e = state.sides.enemy;
  if (e.faith >= 10) { e.faith -= 10; raiseEdict(state, 1, '율법파가 경건을 돌에 새겼다'); }
}

// 소명 (장이 끝날 때 확인)
function checkDestiny(state) {
  const d = state.destiny;
  if (!d || d.done) return;
  if (DESTINIES[d.id].test(state, { villages: villageCount(state, 'player') })) {
    d.done = true;
    logEvent(state, 'player', `소명을 이루었다 — 「${DESTINIES[d.id].name}」 ${DESTINIES[d.id].text}. 승점 +${DESTINY_POINTS}.`, null, { kind: 'prophecy', tile: capitalOf(state, 'player')?.id });
  }
}
export function chooseDestiny(state, id) {
  if (!state.destinyOffer?.includes(id)) return;
  state.destiny = { id, done: false };
  state.destinyOffer = null;
}

// ---------- 세 막 ----------
export function actOf(state) {
  const m = state.maxRounds;
  const r = state.round;
  return r < Math.floor(m / 4) + 1 ? 1 : r < Math.ceil((m * 2) / 3) ? 2 : 3;
}
export const actStart = (state) => state.round > 1 && actOf(state) !== actOfRound(state, state.round - 1);
const actOfRound = (state, r) => actOf({ ...state, round: r });

// ---------- 결과 미리보기 (확인 화면용, 주사위 행동은 뺀다) ----------
export function previewGains(state, plan) {
  const s = state.sides.player;
  const d = { food: 0, wood: 0, stone: 0, faith: 0 };
  const per = {};
  for (const a of plan) {
    if (a.type === 'gather') { const n = gatherAmount(state, 'player', state.tileAt[a.tile]); d[a.gather] += n; per[a.key] = `+${n} ${RESOURCE_NAME[a.gather]}`; }
    else if (a.type === 'pray') { const n = prayValue(state, 'player'); d.faith += n; per[a.key] = `+${n} 신앙`; }
    else if (a.type === 'build') { for (const [k, v] of Object.entries(buildCost(state, 'player', a.build))) d[k] -= v; }
  }
  // 장이 끝날 때: 식량 생산(수도 2 + 마을) − 먹는 양, 신앙 수입
  d.food += 2 + villageCount(state, 'player') - s.pop - (state.commandments?.includes('noFamine') ? 1 : 0);
  d.faith += faithIncome(state, 'player');
  const after = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, s[k] + v]));
  return { delta: d, after, per };
}

// ---------- 침묵도 계시다 ----------
// 연속 침묵: 한 번은 모두 기도하고, 두 번째는 신앙이 흔들리고(-1), 세 번째부터는 신이 떠났다며 한 사람씩 떠난다 (두 번째 판부터)
export function applySilence(state, spoke) {
  if (spoke) { state.silentRun = 0; return; }
  state.silentRun += 1;
  const n = state.silentRun;
  const p = state.sides.player;
  const home = capitalOf(state, 'player')?.id;
  if (n === 1) return;
  if (!state.config.veteran || state.tutorial) { logEvent(state, 'player', '신의 침묵이 길어진다. 신도들이 하늘을 올려다본다.', null, { kind: 'warn', tile: home }); return; }
  if (n === 2) { p.faith = Math.max(0, p.faith - 1); logEvent(state, 'player', '신의 침묵이 길어진다. 믿음이 흔들린다 (신앙 -1).', null, { kind: 'warn', tile: home }); return; }
  if (p.pop > 1) { p.pop -= 1; state.sides.enemy.pop += 1; logEvent(state, 'player', '신이 떠났다고 수군댄다. 한 사람이 율법파로 갔다.', null, { kind: 'loss', tile: home }); }
}

// ---------- 전설이 된 땅: 계시로 명한 일이 큰 결과를 낸 칸에 별칭이 붙는다 ----------
const LEGEND_ADJ = { war: '분노의', peace: '빛의', abundance: '넘치는', wisdom: '별의' };
export function markLegends(state, text, doctrine, orders, logs) {
  if (!text) return [];
  const made = [];
  for (const a of orders) {
    if (Object.keys(state.legends).length >= 3) break;
    const hit = logs.find((l) => l.act === a.key && (l.fx?.capture || l.fx?.convert || l.fx?.kind === 'cathedral'));
    const t = state.tileAt[a.tile];
    if (!hit || state.legends[t.id] || state.names[t.id] || t.id === state.holyId) continue;
    const base = t.building === 'capital' ? '신전' : t.building === 'village' ? '마을' : TERRAIN[t.terrain]?.name ?? '땅';
    const name = `${LEGEND_ADJ[doctrine] ?? `${state.round}장의`} ${base}`;
    state.legends[t.id] = { name, quote: text.slice(0, 24), round: state.round };
    made.push(name);
    logEvent(state, 'player', `이 땅은 이제 「${name}」이라 불린다 — “${text.slice(0, 24)}”.`, null, { kind: 'legend', tile: t.id });
  }
  return made;
}

// ---------- 영원한 계명, 성언, 숨은 말 ----------
export const canCarve = (state) => state.config.veteran && !state.tutorial && state.round >= 3 && state.commandments.length < MAX_COMMANDMENTS;
export function carveCommandment(state, id) {
  if (!canCarve(state) || !COMMANDMENTS[id] || state.commandments.includes(id)) return false;
  state.commandments.push(id);
  logEvent(state, 'player', `영원한 계명을 새겼다 — 「${COMMANDMENTS[id].name}」. ${COMMANDMENTS[id].text}.`, null, { kind: 'commandment', tile: capitalOf(state, 'player')?.id });
  return true;
}
// 성언은 계시가 쌓일 때 찾는다 (두 번째 판부터, 판당 하나)
export function updateLiturgy(state) {
  if (state.liturgy || !state.config.veteran || state.tutorial) return null;
  const p = findLiturgy(state.revelations.map((r) => r.text));
  if (!p) return null;
  state.liturgy = p;
  logEvent(state, 'player', `성언이 생겼다 — 「${p}」. 이 구절은 이제 신앙 1로 전해진다.`, null, { kind: 'saint', tile: capitalOf(state, 'player')?.id });
  return p;
}
export function findSacred(state, text) {
  if (!state.sacred || state.stats.sacred || !text?.includes(state.sacred.word)) return false;
  state.stats.sacred = 1;
  logEvent(state, 'player', `숨은 말 「${state.sacred.word}」${batchim(state.sacred.word) ? '을' : '를'} 찾았다! 성서에 새겨진다.`, null, { kind: 'prophecy', tile: capitalOf(state, 'player')?.id });
  return true;
}

// ---------- 두 갈래 사건 ----------
export function dilemmaByText(state, text) {
  const opts = state.event?.choice;
  if (!opts || !text) return null;
  return opts.find((o) => new RegExp(o.tags).test(text))?.id ?? null;
}
export function resolveDilemma(state, pick) {
  const ev = state.event;
  if (!ev?.choice) return;
  const o = ev.choice.find((x) => x.id === pick) ?? ev.choice[0];
  const s = state.sides.player;
  for (const [k, v] of Object.entries(o.gain ?? {})) s[k] = Math.max(0, s[k] + v);
  let note = '';
  if (o.pop > 0) { if (s.pop < popCap(state, 'player')) s.pop += 1; else { s.food += 2; note = ' 머물 자리가 없어 양식만 나누고 떠났다 (식량 +2).'; } }
  if (o.pop < 0 && s.pop > 1) s.pop -= 1;
  if (o.doctrine) {
    const d = s.doctrine;
    const top = DOCTRINES.reduce((b, k) => (d[k] > d[b] ? k : b), 'wisdom');
    if (d[top] < DOCTRINE_MAX) d[top] += 1;
  }
  if (o.provoke) state.vowNext = 'attack';
  if (o.edict) raiseEdict(state, o.edict, '미라의 소문이 율법파에 닿았다');
  if (o.calm) { state.sides.player.faithless = 0; state.silentRun = 0; }
  if (o.ark) state.roundMods.ark = true;
  logEvent(state, 'player', `${ev.name} — ${o.label}. ${o.text}.${note}`, null, { kind: 'dilemma', tile: capitalOf(state, 'player')?.id });
}

// 달 이름: 판 길이에 맞춰 한 해를 나눈다
export const monthOf = (state, round = state.round) => MONTHS[Math.min(11, Math.floor(((round - 1) * 12) / state.maxRounds))];

// 다음 장의 계절 (덱의 다음 카드)
export const nextEvent = (state) => state.eventDeck.at(-1) ?? null;

// ---------- 저장과 불러오기 ----------
export const SAVE_VERSION = 1;
// 로그의 보드 스냅숏은 크고 재생에만 쓰므로 버린다. 카드는 id로 줄인다
export function serializeState(state) {
  const { tileAt, ...rest } = state;
  return {
    ...rest,
    log: state.log.map(({ snap, ...l }) => l),
    event: state.event?.id ?? null, lawCard: state.lawCard?.id ?? null,
    eventDeck: state.eventDeck.map((c) => c.id), lawDeck: state.lawDeck.map((c) => c.id),
  };
}
export function hydrateState(obj) {
  const ev = (id) => EVENTS.find((e) => e.id === id) ?? DILEMMAS.find((e) => e.id === id) ?? (id === 'mira' ? MIRA : undefined);
  const law = (id) => LAW_CARDS.find((c) => c.id === id);
  const state = {
    ...obj,
    log: obj.log.map((l) => ({ ...l, snap: null })),
    event: obj.event ? ev(obj.event) : null, lawCard: obj.lawCard ? law(obj.lawCard) : null,
    eventDeck: obj.eventDeck.map(ev), lawDeck: obj.lawDeck.map(law),
  };
  if ([state.event, state.lawCard, ...state.eventDeck, ...state.lawDeck].some((c) => c === undefined)) throw new Error('알 수 없는 카드');
  state.tileAt = Object.fromEntries(state.tiles.map((t) => [t.id, t]));
  state.bannedWords ??= []; state.bannedNext ??= null; state.eventChoice ??= null; state.history ??= [];
  state.priest ??= 'loyal'; state.names ??= {}; state.lessons ??= []; state.petitionIgnored ??= 0; state.prophecy ??= null;
  state.judgement ??= 'classic'; state.wrath ??= 0; state.streak ??= null; state.vowNext ??= null; state.reacted ??= null; state.oddUsed ??= false;
  state.edictOn ??= false; state.dilemmaPick ??= null;
  state.silentRun ??= 0; state.legends ??= {}; state.miraDone ??= false; state.miraQuote ??= null; state.bloodKills ??= 0;
  state.commandments ??= []; state.liturgy ??= null; state.saints ??= []; state.deeds ??= {}; state.fallen ??= []; state.sacred ??= null; state.destiny ??= null; state.destinyOffer ??= null; state.holyId ??= null;
  for (const sd of Object.values(state.sides)) { sd.cathedral ??= 0; sd.edict ??= 0; }
  state.grace ??= { round: 0, used: 0 }; state.roundMods ??= {}; state.miracleHand ??= [...FIRST_HAND]; state.miracleOffer ??= null; state.pendingSite ??= null; state.stats ??= { converted: 0, captured: 0, miracles: 0, prophecies: 0, petitions: 0 };
  return state;
}

function resolveAction(state, a) {
  const side = a.side;
  const foe = other(side);
  const s = state.sides[side];
  const f = state.sides[foe];
  const t = state.tileAt[a.tile];
  const place = tileName(state, t, 'player');
  const J = (x, a, b) => josa(x, a, b);
  switch (a.type) {
    case 'gather': {
      if (t.owner === foe) return logEvent(state, side, `${topic(side)} ${J(place, '이', '가')} 이미 적의 땅이라 채집하지 못했다.`, null, { tile: t.id, kind: 'fail' });
      const n = gatherAmount(state, side, t);
      if (side === 'player' && state.roundMods.gatherBonus) state.roundMods.gatherBonus = 0; // 축복은 첫 채집 한 번
      s[a.gather] += n;
      return logEvent(state, side, `${subj(side)} ${place}에서 ${josa(RESOURCE_NAME[a.gather], '을', '를')} ${n} 얻었다.`, null, { tile: t.id, kind: 'gain', gain: { [a.gather]: n } });
    }
    case 'pray': {
      const n = prayValue(state, side);
      s.faith += n;
      return logEvent(state, side, `${subj(side)} 기도해 신앙을 ${n} 얻었다.`, null, { tile: t.id, kind: 'gain', gain: { faith: n } });
    }
    case 'build': {
      const cost = buildCost(state, side, a.build);
      if (!canPay(s, cost)) return logEvent(state, side, `${topic(side)} 자원이 모자라 ${place}에 짓지 못했다.`, null, { tile: t.id, kind: 'fail' });
      if (a.build === 'village') {
        if (t.owner) return logEvent(state, side, `${J(place, '은', '는')} 이미 주인이 있어 마을을 세우지 못했다.`, null, { tile: t.id, kind: 'fail' });
        pay(s, cost); t.owner = side; t.building = 'village'; t.revealed ||= side === 'player';
        return logEvent(state, side, `${subj(side)} ${J(tileName(state, t, 'player'), '을', '를')} 세웠다.`, null, { tile: t.id, kind: 'build', icon: '🏠' });
      }
      if (a.build === 'wall') { pay(s, cost); t.wall = true; return logEvent(state, side, `${subj(side)} ${place}에 성벽을 쌓았다.`, null, { tile: t.id, kind: 'build', icon: '🧱' }); }
      if (a.build === 'temple') {
        if (s.templeLevel >= MAX_TEMPLE) return;
        pay(s, cost); s.templeLevel += 1;
        if (side === 'enemy') raiseEdict(state, 2, '율법파가 탑을 높였다');
        return logEvent(state, side, `${poss(side)} 신전이 ${s.templeLevel}단계로 높아졌다.`, null, { tile: t.id, kind: 'build', icon: side === 'player' ? '⛪' : '🏛️' });
      }
      pay(s, cost);
      s.cathedral = (s.cathedral ?? 0) + 1;
      if (s.cathedral >= 3) {
        state.winner = side; state.winReason = '대성당 완공';
        return logEvent(state, side, `${subj(side)} 대성당의 첨탑을 올려 완공했다!`, null, { tile: t.id, kind: 'cathedral' });
      }
      return logEvent(state, side, `${subj(side)} 대성당의 ${josa(CATHEDRAL[s.cathedral - 1].name, '을', '를')} 올렸다 (${s.cathedral}/3). 율법파가 이를 알아챘다.`, null, { tile: t.id, kind: 'build', icon: '⛪' });
    }
    case 'explore': {
      t.revealed = true;
      for (const n of neighbors(state, t)) n.revealed = true;
      if (state.event?.id === 'prophet') { s.faith += 3; return logEvent(state, side, `${place}에서 예언자가 말한 보물을 찾았다! 신앙 +3.`, null, { tile: t.id, kind: 'treasure', gain: { faith: 3 } }); }
      if (rand(state) < 0.5) {
        const res = ['wood', 'stone', 'faith'][Math.floor(rand(state) * 3)];
        s[res] += 2;
        return logEvent(state, side, `${J(place, '을', '를')} 탐험해 ${josa(RESOURCE_NAME[res], '을', '를')} 2 찾았다.`, null, { tile: t.id, kind: 'treasure', gain: { [res]: 2 } });
      }
      return logEvent(state, side, `${J(place, '을', '를')} 탐험했다. 안개가 걷혔다.`, null, { tile: t.id, kind: 'explore' });
    }
    case 'preach': {
      if (t.owner !== foe || f.pop <= 0) return logEvent(state, side, `${place}에는 설교할 상대가 없었다.`, null, { tile: t.id, kind: 'fail' });
      // 수도·성벽 안이면 설득하기 어렵다 (+1씩)
      const bonus = preachBonus(state, side);
      const defBonus = (t.building === 'capital' ? 1 : 0) + (t.wall ? 1 : 0);
      const ra = d6(state); const rd = d6(state);
      const win = ra + bonus > rd + defBonus;
      const dice = { attacker: ra, attackerBonus: bonus, defender: rd, defenderBonus: defBonus, win };
      if (win) {
        f.pop -= 1; s.pop += 1;
        // 마을에 믿음의 표식이 두 번 쌓이면 그 마을이 넘어온다 (수도는 제외, 성벽은 남는다)
        if (side === 'player') { state.stats.converted += 1; deed(state, a.key, 'preach'); }
        if (t.building === 'village') {
          t.faithMarks = t.faithMarks?.side === side ? { side, n: t.faithMarks.n + 1, round: state.round } : { side, n: 1, round: state.round };
          if (t.faithMarks.n >= 2) {
            t.owner = side; t.faithMarks = null;
            if (side === 'player') state.stats.turned = (state.stats.turned ?? 0) + 1;
            if (side === 'player') t.revealed = true;
            return logEvent(state, side, `${poss(side)} 설교가 통했다! ${place} 전체가 ${side === 'player' ? '말씀' : '율법'}에 물들어 넘어왔다.`, dice, { tile: t.id, kind: 'preach', convert: true });
          }
          return logEvent(state, side, `${poss(side)} 설교가 통했다! ${place}에서 1명이 개종했다. 믿음의 표식 1/2.`, dice, { tile: t.id, kind: 'preach' });
        }
        return logEvent(state, side, `${poss(side)} 설교가 통했다! ${place}에서 1명이 개종했다.`, dice, { tile: t.id, kind: 'preach' });
      }
      return logEvent(state, side, `${poss(side)} 설교가 ${place}에서 외면당했다.`, dice, { tile: t.id, kind: 'preach' });
    }
    case 'attack': {
      if (t.owner !== foe) return logEvent(state, side, `${J(place, '은', '는')} 이미 적의 땅이 아니었다.`, null, { tile: t.id, kind: 'fail' });
      const bonus = (s.doctrine.war >= 2 ? 1 : 0) + (s.doctrine.war >= 4 ? 1 : 0) + superiority(s, f)
        + (side === 'enemy' && state.event?.id === 'threat' ? 1 : 0) + (side === 'player' ? (state.roundMods.attackBonus ?? 0) + (state.roundMods.pillar ?? 0) : 0);
      const guardian = foe === 'player' && t.building === 'capital' && state.saints?.some((x) => x.kind === 'guardian') ? 1 : 0;
      const defBonus = (t.wall ? 2 : 0) + (t.building === 'capital' ? 1 : 0) + superiority(f, s) + guardian;
      const ra = d6(state); const rd = d6(state);
      const win = ra + bonus > rd + defBonus;
      const dice = { attacker: ra, attackerBonus: bonus, defender: rd, defenderBonus: defBonus, win };
      if (!win) {
        if (foe === 'player' && t.building === 'capital') deed(state, `guard:${state.round}`, 'guard');
        if (hasUlt(state, side, 'war') && s.faith >= 2) {
          s.faith -= 2;
          return logEvent(state, side, `${poss(side)} 공격이 ${place}에서 막혔다. 전쟁의 가호가 신앙 2를 태워 쓰러질 자를 살렸다.`, dice, { tile: t.id, kind: 'attack' });
        }
        if (side === 'player' && state.roundMods.ark) return logEvent(state, side, `${poss(side)} 공격이 ${place}에서 막혔다. 방주의 가호로 아무도 쓰러지지 않았다.`, dice, { tile: t.id, kind: 'attack' });
        if (side === 'player') fallen(state, a.key);
        s.pop = Math.max(0, s.pop - 1);
        return logEvent(state, side, `${poss(side)} 공격이 ${place}에서 막혔다. 공격자 1명이 쓰러졌다.`, dice, { tile: t.id, kind: 'attack' });
      }
      if (!(foe === 'player' && state.roundMods.ark)) f.pop = Math.max(0, f.pop - 1);
      if (side === 'player') {
        state.bloodKills = (state.bloodKills ?? 0) + 1;
        if (state.bloodKills % 3 === 0) raiseEdict(state, 1, '쓰러진 자의 피가 율법을 굳힌다');
      }
      if (t.building === 'capital') {
        f.capitalHp -= 1;
        if (foe === 'player' && (f.cathedral ?? 0) >= 2) { f.cathedral -= 1; logEvent(state, side, `대성당의 ${CATHEDRAL[f.cathedral].name}이 무너졌다 (${f.cathedral}/3).`, null, { tile: t.id, kind: 'loss' }); }
        logEvent(state, side, `${subj(side)} ${J(place, '을', '를')} 쳤다! 수도 내구도 ${f.capitalHp}.`, dice, { tile: t.id, kind: 'attack', capital: true });
        if (f.capitalHp <= 0) { state.winner = side; state.winReason = '적 수도 점령'; }
        return;
      }
      t.owner = side; t.wall = false; t.faithMarks = null;
      if (side === 'player') state.stats.captured += 1;
      return logEvent(state, side, `${subj(side)} ${J(place, '을', '를')} 빼앗았다!`, dice, { tile: t.id, kind: 'attack', capture: true });
    }
    default:
  }
}

function upkeep(state) {
  // 신앙이 바닥났는지는 이번 장 수입이 들어오기 전에 본다 (수입이 늘 1 이상이라 뒤에서 보면 절대 0이 아니다)
  const brokeFaith = state.sides.player.faith <= 0;
  for (const side of SIDES) {
    const s = state.sides[side];
    if (s.pop <= 0) continue; // 사라진 부족은 다시 늘어나지 않는다
    const who = side === 'player' ? '우리 부족' : '율법파';
    // 수도는 식량 2, 마을은 식량 1을 스스로 생산한다. 신도 1명당 식량 1을 먹는다
    s.food += 2 + villageCount(state, side);
    s.food -= s.pop;
    if (side === 'player' && state.commandments?.includes('noFamine')) s.food -= 1; // 굶기지 말라: 늘 한 줌씩 더 나눈다
    if (s.food < 0 && side === 'player' && (state.roundMods.ark || state.commandments?.includes('noFamine'))) {
      s.food = 0;
    } else if (s.food < 0) {
      s.food = 0; s.pop = Math.max(0, s.pop - 1);
      if (side === 'player') state.stats.starved = (state.stats.starved ?? 0) + 1;
      logEvent(state, side, `${josa(who, '이', '가')} 굶주려 1명을 잃었다.`, null, { kind: 'loss' });
    } else {
      // 식량에 여유가 있을 때만 늘어난다: 증가 비용 + 신도 절반만큼의 비축
      const growCost = s.doctrine.abundance >= 4 || (side === 'player' && state.config.trial === 'earth') ? 1 : 2;
      if (s.pop < popCap(state, side) && s.food >= growCost + Math.ceil(s.pop / 2)) {
        s.food -= growCost; s.pop += 1;
        logEvent(state, side, `${who}에 새 ${side === 'player' ? '신도가' : '구성원이'} 태어났다.`, null, { kind: 'birth' });
      }
    }
    s.faith += faithIncome(state, side);
    if (state.event?.id === 'plague' && s.pop > 1 && !(side === 'player' && state.roundMods.ark)) { s.pop -= 1; logEvent(state, side, `역병으로 ${who} 1명을 잃었다.`, null, { kind: 'loss' }); }
  }
  // 믿음의 표식은 두 장 동안 이어지지 않으면 하나 사라진다
  for (const t of state.tiles) {
    if (t.faithMarks && state.round - t.faithMarks.round >= 2) {
      t.faithMarks.n -= 1; t.faithMarks.round = state.round;
      if (t.faithMarks.n <= 0) t.faithMarks = null;
    }
  }
  // 평화 궁극: 우리 땅에 닿은 율법파 마을 하나에 말씀이 스며든다 (표식은 남기지 않는다)
  const pp = state.sides.player;
  if (hasUlt(state, 'player', 'peace') && state.sides.enemy.pop > 0 && pp.pop > 0) {
    const mine = ownedTiles(state, 'player');
    const target = state.tiles.find((t) => t.owner === 'enemy' && t.building === 'village' && mine.some((m) => distance(m, t) === 1));
    if (target) {
      const ra = d6(state); const rd = d6(state);
      const win = ra > rd + 1;
      if (win) { state.sides.enemy.pop -= 1; pp.pop += 1; }
      logEvent(state, 'player', win ? `평화의 말씀이 ${tileName(state, target)}에 스며들어 1명이 개종했다.` : `평화의 말씀이 ${tileName(state, target)}에 닿았으나 스며들지 못했다.`,
        { attacker: ra, attackerBonus: 0, defender: rd, defenderBonus: 1, win }, { tile: target.id, kind: 'preach' });
    }
  }
  // 검열 카드: 다음 장에 플레이어가 가장 자주 쓴 말을 봉인한다
  if (state.lawCard?.ban) {
    state.bannedNext = frequentNoun(state.revelations) ?? hashPick(['분노', '사랑', '번개', '전쟁', '풍요'], state.config.seed, state.round);
    logEvent(state, 'enemy', `율법파가 검열을 선포했다. 다음 장에는 '${state.bannedNext}'${batchim(state.bannedNext) ? '이라는' : '라는'} 말을 쓰지 못한다.`, null, { kind: 'ban' });
  }
  // 신앙이 바닥난 채로 한 장을 버티면 경고, 그다음 장부터 신도가 율법파로 떠난다
  const p = state.sides.player;
  if (brokeFaith) {
    p.faithless += 1;
    if (p.faithless > RULES.heresyGrace && p.pop > 1) {
      p.pop -= 1; state.sides.enemy.pop += 1;
      logEvent(state, 'player', '신앙이 바닥나 신도 1명이 율법파로 떠났다.', null, { kind: 'loss' });
    } else {
      logEvent(state, 'player', '신앙이 바닥나 신도들이 흔들린다. 이대로면 다음 장에 떠나는 자가 생긴다.', null, { kind: 'warn' });
    }
  } else {
    p.faithless = 0;
  }
  checkProphecy(state);
  holyAndEdict(state);
  checkDestiny(state);
  updateVision(state);
  discoverSites(state);
  checkVictory(state);
}

// 승점 항목 (심판의 기준 가중치를 따른다)
export function scoreBreakdown(state, side) {
  const s = state.sides[side];
  const w = JUDGEMENTS[state.judgement ?? 'classic']?.w ?? JUDGEMENTS.classic.w;
  const walls = state.tiles.filter((t) => t.owner === side && t.wall).length;
  const parts = [
    { key: 'pop', label: '신도', n: s.pop, w: w.pop },
    { key: 'village', label: '마을', n: villageCount(state, side), w: w.village },
    { key: 'temple', label: '신전', n: s.templeLevel, w: w.temple },
    { key: 'hp', label: '수도', n: s.capitalHp, w: w.hp },
  ];
  if (w.wall) parts.push({ key: 'wall', label: '성벽', n: walls, w: w.wall });
  if (holyOwner(state) === side) parts.push({ key: 'holy', label: '성지', n: 1, w: 2 });
  if (s.cathedral) parts.push({ key: 'cathedral', label: '대성당', n: s.cathedral, w: 1 });
  if (side === 'player' && state.destiny?.done) parts.push({ key: 'destiny', label: '소명', n: 1, w: DESTINY_POINTS });
  if (w.faith) parts.push({ key: 'faith', label: '신앙', n: Math.floor(s.faith / w.faith), w: 1, note: `신앙 ${w.faith}마다` });
  return { parts, total: parts.reduce((a, p) => a + p.n * p.w, 0) };
}
export function score(state, side) { return scoreBreakdown(state, side).total; }

// final: 마지막 장의 승점 판정까지 할지 (기적처럼 장 중간에 부를 때는 false)
export function checkVictory(state, final = true) {
  if (state.winner) return state.winner;
  const { player: p, enemy: e } = state.sides;
  if (p.pop <= 0 && e.pop <= 0) { state.winner = 'draw'; state.winReason = '양쪽 부족이 모두 사라짐'; return state.winner; }
  if (e.pop <= 0) { state.winner = 'player'; state.winReason = '율법파 전원 개종·소멸'; }
  if (!state.winner && state.edictOn && e.edict >= edictMax(state)) { state.winner = 'enemy'; state.winReason = '율법 석판 완성'; }
  if (p.pop <= 0) { state.winner = 'enemy'; state.winReason = '신도가 모두 사라짐'; }
  const total = state.sides.player.pop + state.sides.enemy.pop;
  const qk = quick(state);
  if (!state.winner && total >= (qk ? 6 : 8) && state.round >= (qk ? 4 : 6) && state.sides.player.pop >= total * 0.75) {
    state.winner = 'player'; state.winReason = '신앙 승리 (인구의 3/4이 신도)';
  }
  if (!state.winner && final && state.round >= state.maxRounds) {
    const ps = score(state, 'player');
    const es = score(state, 'enemy');
    state.winner = ps >= es ? 'player' : 'enemy';
    state.winReason = state.tutorial ? `튜토리얼 완료 — 승점 ${ps} : ${es}` : `${state.maxRounds}장 종료 — 승점 ${ps} : ${es}`;
  }
  return state.winner;
}

// 계시를 내리면 교리 트랙이 오른다
export function recordRevelation(state, text, doctrine, extra = 0) {
  const d = state.sides.player.doctrine;
  if (doctrine && d[doctrine] < DOCTRINE_MAX) d[doctrine] += 1;
  // 비유·첫 이름 같은 가속은 그 교리가 낮을 때만 (궁극에 너무 빨리 닿지 않게)
  if (doctrine && extra && d[doctrine] < RULES.graceDoctrineBelow) d[doctrine] = Math.min(DOCTRINE_MAX, d[doctrine] + extra);
  state.revelations.push({ round: state.round, text, doctrine });
  if (state.winner) return; // 판이 끝난 뒤에는 교리 대립·연속 기적이 점수를 바꾸지 않는다
  if (!doctrine) { state.streak = null; return; }
  // 교리 대립 (두 번째 판부터): 반대 교리가 흔들린다. 이미 얻은 특전 칸 아래로는 내려가지 않는다
  const opp = OPPOSED[doctrine];
  if (state.config.veteran && !state.tutorial && d[opp] > perkFloor(d[opp])) {
    d[opp] -= 1;
    logEvent(state, 'player', `${DOCTRINE_NAME[opp]}의 서약이 흔들린다 (${DOCTRINE_NAME[opp]} -1).`, null, { kind: 'doctrine' });
  }
  // 같은 교리를 세 장 이어 말하면 작은 기적이 일어난다
  state.streak = state.streak?.doctrine === doctrine ? { doctrine, n: state.streak.n + 1 } : { doctrine, n: 1 };
  if (state.streak.n >= 3) { state.streak = null; streakMiracle(state, doctrine); }
}
const perkFloor = (v) => (v >= 6 ? 6 : v >= 4 ? 4 : v >= 2 ? 2 : 0);
const DOCTRINE_NAME = { peace: '평화', war: '전쟁', abundance: '풍요', wisdom: '지혜' };

function streakMiracle(state, doctrine) {
  const p = state.sides.player;
  const e = state.sides.enemy;
  const home = capitalOf(state, 'player')?.id;
  const head = `말씀이 세 장 이어졌다 — ${DOCTRINE_NAME[doctrine]}의 기적.`;
  if (doctrine === 'peace' && e.pop > 0) {
    e.pop -= 1;
    if (p.pop < popCap(state, 'player')) p.pop += 1;
    logEvent(state, 'player', `${head} 율법파 한 사람이 스스로 말씀을 받아들였다.`, null, { kind: 'streak', tile: capitalOf(state, 'enemy')?.id ?? home, doctrine });
  } else if (doctrine === 'war') {
    const wall = state.tiles.filter((t) => t.owner === 'enemy' && t.wall && t.revealed).sort((a, b) => distance(a, state.tileAt[home]) - distance(b, state.tileAt[home]))[0];
    if (wall) { wall.wall = false; logEvent(state, 'player', `${head} ${tileName(state, wall)}의 성벽이 무너졌다.`, null, { kind: 'streak', tile: wall.id, doctrine }); }
    else { e.faith = Math.max(0, e.faith - 2); logEvent(state, 'player', `${head} 율법파가 두려워 떤다 (율법파 신앙 -2).`, null, { kind: 'streak', tile: home, doctrine }); }
  } else if (doctrine === 'abundance') {
    p.food += 4;
    logEvent(state, 'player', `${head} 곳간이 넘친다. 식량 +4.`, null, { kind: 'streak', tile: home, doctrine, gain: { food: 4 } });
  } else if (doctrine === 'wisdom') {
    const mine = ownedTiles(state, 'player');
    for (const t of state.tiles) if (mine.some((m) => distance(m, t) <= 2)) t.revealed = true;
    logEvent(state, 'player', `${head} 안개가 걷혔다.`, null, { kind: 'streak', tile: home, doctrine });
    discoverSites(state);
  }
  checkVictory(state, false);
}

// 금욕 서원: 할 수 있었던 공격·선교를 금했고 끝까지 하지 않았으면 은총. 공격을 금하면 율법파가 그 틈을 노린다
export function keepVows(state, forbidden, plan) {
  const types = [...new Set(forbidden.map((a) => a.type).filter((t) => t === 'attack' || t === 'preach'))];
  if (!types.length) return false;
  if (types.includes('attack')) state.vowNext = 'attack';
  if (plan.some((a) => types.includes(a.type))) return false;
  const what = types.map((t) => (t === 'attack' ? '칼' : '설교')).join('과 ');
  if (grantGrace(state, 1, `${josa(what, '을', '를')} 거두는 서원을 지켰다`)) state.stats.vows = (state.stats.vows ?? 0) + 1;
  return true;
}
