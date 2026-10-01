// 규칙 엔진: 상태 생성, 가능한 행동, 명령 검증, 율법파(오토마), 라운드 해결, 유지, 승리 판정
// LLM은 이 엔진이 만든 행동 목록 중에서 고르기만 한다. 수치와 판정은 전부 여기서 한다.

import {
  TERRAIN, RESOURCE_NAME, GATHER_VERB, COST, MAX_TEMPLE, CAPITAL_HP, MAX_ACTIONS, RULES,
  DOCTRINES, DOCTRINE_MAX, EVENTS, LAW_CARDS, MIRACLES, DIFFICULTY, MAP_SIZES, PLAYER_START, TUTORIAL, ENEMY_LEADERS,
  PRIESTS, PETITIONERS, PROPHECY, FIRST_HAND, SITES, DOOM, JUDGEMENTS, OPPOSED, REACT,
  CATHEDRAL, EDICT_MAX, DESTINIES, DESTINY_POINTS, ACTS, DILEMMAS, FEATURES, COMMANDMENTS, MAX_COMMANDMENTS, SACRED_WORDS,
  MIRA, MIRA_TWIST, MONTHS, TRIALS, RULESET,
} from './data.js';
import { generateMap, placeSites, placeFeatures, placeLegacy } from './mapgen.js';
import { frequentNoun, hashPick } from './lore.js';
import { t } from './i18n.js';
import { josa, batchim } from './i18n/ko/grammar.js';

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
// config: { mode: 'standard' | 'tutorial', size: 5|6|7, difficulty: 'easy'|'normal'|'hard', seed, veteran, unlock }
// veteran: 한 판이라도 끝낸 적이 있으면 true. unlock: 끝낸 판 수(0~4) — 모듈이 한 판에 한 묶음씩 열린다 (없으면 veteran이면 전부)
export const DEFAULT_CONFIG = { mode: 'standard', size: 5, difficulty: 'normal', seed: 2026 };

// 모듈은 판을 끝낼 때마다 한 묶음씩 열린다: 1 율법 석판 · 2 심판의 기준·소명 · 3 대사제 성향·기적 드래프트·두 갈래 사건·세 막 ·
// 4 교리 대립·영원한 계명·검열(분열의 예언자). unlock이 없으면 veteran이면 전부 (오늘의 계시·시련·도전·골든)
export const MODULES = 4;
const unlockedCfg = (cfg, level) => (cfg.unlock ?? (cfg.veteran ? MODULES : 0)) >= level;
export const unlocked = (state, level) => !state.tutorial && unlockedCfg(state.config, level);

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
    priest: 'loyal', names: {}, lessons: [], petition: null, prophecy: null,
    grace: { round: 0, used: 0 }, roundMods: {}, miracleHand: [...FIRST_HAND], miracleOffer: null, pendingSite: null,
    judgement: 'classic', wrath: 0, streak: null, vowNext: null, reacted: null, doomUsed: false, miracleUses: {}, lawGuard: 0, rally: false, ruleset: RULESET,
    edictOn: !tutorial && (cfg.unlock ?? (cfg.veteran ? MODULES : 0)) >= 1, destiny: null, destinyOffer: null, holyId: null,
    commandments: [], saints: [], deeds: {}, fallen: [], silentRun: 0, legends: {},
    miraDone: false, miraQuote: null, pendingDilemma: null,
    sacred: cfg.daily ? hashPick(SACRED_WORDS, 'sacred', cfg.daily) : null, stats: { converted: 0, captured: 0, miracles: 0, prophecies: 0, petitions: 0 },
    miracleUsed: false, reinterpretUsed: false,
    log: [], revelations: [], history: [], winner: null, winReason: '', winKind: null,
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
  // 소명: 세 번째 판부터 셋 중 하나 (고르지 않으면 첫째)
  if (unlockedCfg(cfg, 2) && !tutorial && !cfg.challenge) {
    const ids = Object.keys(DESTINIES).filter((d) => !(cfg.trial === 'earth' && d === 'sword')).sort((a, b) => hashPick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], cfg.seed, 'dest', a) - hashPick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], cfg.seed, 'dest', b) || a.localeCompare(b));
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
    if (unlockedCfg(cfg, 3)) state.priest = hashPick(Object.keys(PRIESTS).filter((k) => k !== 'loyal'), 'priest', cfg.seed);
    // 두 번째 판부터 심판의 기준이 판마다 바뀐다
    if (unlockedCfg(cfg, 2)) state.judgement = hashPick(Object.keys(JUDGEMENTS), 'judgement', cfg.seed);
    // 두 번째 판부터 기적은 판마다 셋을 받는다 (번개·단비 중 하나는 꼭 든다)
    if (cfg.trial === 'storm') state.miracleHand = ['lightning', 'bounty', 'pillar'];
    else if (unlockedCfg(cfg, 3)) {
      const rest = MIRACLES.map((m) => m.id).filter((id) => !['lightning', 'rain'].includes(id));
      const a = hashPick(['lightning', 'rain'], 'hand0', cfg.seed);
      const b = hashPick(rest, 'hand1', cfg.seed);
      const c = hashPick(rest.filter((x) => x !== b), 'hand2', cfg.seed);
      state.miracleHand = [a, b, c];
    }
    // 판 전체에 쓸 카드를 미리 나눠 둔다 (어려움은 장마다 두 장을 보므로 두 배)
    // 두 갈래 사건은 판마다 셋만 (시드 해시로 고른다)
    const dilemmas = unlockedCfg(cfg, 3) ? [...DILEMMAS].sort((a, b) => hashPick([...Array(97).keys()], cfg.seed, 'dil', a.id) - hashPick([...Array(97).keys()], cfg.seed, 'dil', b.id)).slice(0, 3) : [];
    state.eventDeck = dealDeck(state, [...EVENTS, ...dilemmas], state.maxRounds + 2);
    state.lawDeck = dealDeck(state, lawPool(state), state.maxRounds * 2 + 2);
  }
  if (cfg.trial === 'earth') state.sides.player.doctrine.abundance = 1;
  if (cfg.trial === 'last') { state.sides.enemy.pop += 2; state.sides.enemy.food += 8; }
  if ((cfg.ascension ?? 0) >= 1) { state.sides.enemy.pop += 1; state.sides.enemy.food += 4; }
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
  const censor = unlocked(state, 4) && state.config.difficulty !== 'easy';
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
export const ultRound = (state) => sizeRules(state).at.ult;
export const draftRound = (state) => sizeRules(state).at.draft;
export const wrathRound = (state) => (state.config?.trial === 'last' ? 1 : sizeRules(state).at.wrath);
export const hasUlt = (state, side, key) => side === 'player' && state.sides[side].doctrine[key] >= DOCTRINE_MAX && state.round >= ultRound(state);
// 대성당 단계마다 필요한 마을: 1·2·3, 큰 판은 판이 넓은 만큼 더 (6×6 +1, 7×7 +2)
// 판 크기 표 (튜토리얼·시련의 작은 판은 5×5 값을 따른다)
export const sizeRules = (state) => MAP_SIZES[state.rows] ?? MAP_SIZES[5];
// 대성당 단계마다 우리 마을이 있어야 한다: 5×5는 하나 (큰 판은 판 크기 표만큼 더)
export const cathedralVillages = (state) => 1 + (state.tutorial ? 0 : sizeRules(state).cathedralVillages);
// 신앙 승리에 필요한 개종 (선교로 데려온 율법파 신도)
export const faithConverts = (state) => sizeRules(state).faith.converts;
export const popCap = (state, side) => 3 + 2 * villageCount(state, side) + (hasUlt(state, side, 'abundance') ? 2 : 0);

// 신도가 닿을 수 있는 범위: 수도에서 2칸, 마을에서 1칸
export const marchRange = (state, side) => (side === 'enemy' && !state.tutorial ? actOf(state) - 1 : 0);
export function reach(state, side) {
  const set = new Map();
  const march = marchRange(state, side);
  for (const t of ownedTiles(state, side)) {
    const radius = t.building === 'capital' ? 2 + march : 1;
    for (const x of state.tiles) if (distance(t, x) <= radius) set.set(x.id, x);
  }
  return [...set.values()];
}

// 행동 수 = 2 + 신전 단계 + 신도 4명당 1 (+ 지혜 교리 / 율법파 난이도 보너스), 최대 6, 신도 수를 넘지 않는다
export function actionLimit(state, side) {
  const s = state.sides[side];
  // 율법파는 판이 넓을수록 손이 많다 (7×7 +1): 넓은 판에서 거리만으로 안전해지지 않게
  const bonus = side === 'enemy' ? state.enemyBonus + (state.rally ? 1 : 0) + (state.tutorial ? 0 : sizeRules(state).enemyActions) : (s.doctrine.wisdom >= 4 ? 1 : 0);
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
  logEvent(state, 'player', t('log.saint', { name, kind: saint }), null, { kind: 'saint', tile: capitalOf(state, 'player')?.id });
}
function fallen(state, key) {
  const name = followerName(state, key);
  if (!state.fallen.includes(name)) state.fallen.push(name);
  const i = state.saints.findIndex((x) => x.name === name);
  if (i >= 0) { state.saints.splice(i, 1); logEvent(state, 'player', t('log.saintFallen', { name }), null, { kind: 'loss', tile: capitalOf(state, 'player')?.id }); }
}

// 승천 4: 3막에 율법파의 공격·선교 주사위 +1
export const enemyZeal = (state, side) => (side === 'enemy' && (state.config.ascension ?? 0) >= 4 && actOf(state) === 3 ? 1 : 0);
// 되풀이를 읽는 율법: 우리 선교·공격에 방어 +1, 되풀이가 이어지면 +2 (braceLaw)
export const lawGuardOf = (state, side) => (side === 'player' ? Math.min(2, state.lawGuard ?? 0) : 0);
// 선교 보너스: 평화 교리 + 방언 + 계명(칼을 들지 말라) (교리·계명 합은 최대 +2)
export function preachBonus(state, side) {
  const s = state.sides[side];
  if (side !== 'player') return (s.doctrine.peace >= 2 ? 1 : 0) + (s.doctrine.peace >= 4 ? 1 : 0) + enemyZeal(state, side);
  const base = (s.doctrine.peace >= 2 ? 1 : 0) + (s.doctrine.peace >= 4 ? 1 : 0)
    + (state.commandments?.includes('noSword') ? 1 : 0)
    + (state.config.blessing === 'preacher' && !state.stats.converted ? 1 : 0);
  return Math.min(2, base) + (state.roundMods.tongues ?? 0);
}

// 선교·공격의 보너스와 승률 (확인 화면 표시용 — resolveAction과 같은 계산)
export function actionOdds(state, a, { wallAhead = false } = {}) {
  const side = a.side ?? 'player';
  const s = state.sides[side]; const f = state.sides[other(side)];
  const t = state.tileAt[a.tile];
  let atk = 0; let def = 0;
  if (a.type === 'attack') {
    atk = (s.doctrine.war >= 2 ? 1 : 0) + enemyZeal(state, side) + (side === 'player' ? (state.roundMods.pillar ?? 0) : 0);
    def = (t.wall || wallAhead ? 2 : 0) + (t.building === 'capital' ? 1 : 0) + lawGuardOf(state, side);
  } else if (a.type === 'preach') {
    atk = preachBonus(state, side);
    def = (t.building === 'capital' ? 1 : 0) + (t.wall || wallAhead ? 1 : 0) + lawGuardOf(state, side);
  } else return null;
  let w = 0;
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + atk > y + def) w++;
  return w / 36;
}


// ---------- 행동 설명 ----------
// 한국어 조사 도우미는 언어팩(i18n/ko/grammar.js)으로 옮겼다. 기존 import를 위해 다시 내보낸다
export { josa, batchim };

// 이름은 항상 플레이어 시점("우리" = 플레이어). 안개는 플레이어가 볼 때만 가린다
export function tileName(state, tile, viewer = 'player') {
  if (viewer === 'player' && !tile.revealed) return t('eng.tile.fog', { id: tile.id });
  const given = state.names?.[tile.id];
  if (given) return t('eng.tile.named', { name: given, id: tile.id });
  if (tile.building === 'capital') return t('eng.tile.capital', { owner: tile.owner, id: tile.id });
  if (tile.building === 'village') return t('eng.tile.village', { owner: tile.owner, id: tile.id });
  if (tile.feature) return t('eng.tile.land', { name: FEATURES[tile.feature].name, id: tile.id });
  return t('eng.tile.land', { name: TERRAIN[tile.terrain].name, id: tile.id });
}

function costText(cost) {
  return Object.entries(cost).map(([k, v]) => t('eng.cost.item', { res: RESOURCE_NAME[k], n: v })).join(', ');
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
    const k = state.tutorial ? 1 : sizeRules(state).cathedralCost;
    return k === 1 ? c : Object.fromEntries(Object.entries(c).map(([r, v]) => [r, Math.ceil(v * k)]));
  }
  // 전쟁 교리 4칸: 성벽이 돌 1
  if (build === 'wall' && side === 'player' && s.doctrine.war >= 4) return { stone: 1 };
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
  return Math.max(0, n);
}

function describe(state, side, a) {
  const tl = state.tileAt[a.tile];
  const place = tileName(state, tl, side);
  const s = state.sides[side];
  switch (a.type) {
    case 'gather': return t('eng.act.gather', { place, river: tl.terrain === 'river', verb: GATHER_VERB[a.gather], res: RESOURCE_NAME[a.gather], n: gatherAmount(state, side, tl) });
    case 'pray': return t('eng.act.pray', { n: prayValue(state, side) });
    case 'build':
      if (a.build === 'village') return t('eng.act.village', { place, cost: costText(COST.village) });
      if (a.build === 'wall') return t('eng.act.wall', { place, cost: costText(buildCost(state, side, 'wall')) });
      if (a.build === 'temple') return t('eng.act.temple', { cost: costText(buildCost(state, side, 'temple')) });
      return t('eng.act.cathedral', { part: CATHEDRAL[Math.min(2, s.cathedral ?? 0)].name, cost: costText(buildCost(state, side, 'cathedral')), stage: s.cathedral ?? 0 });
    case 'preach': return t('eng.act.preach', { place });
    case 'attack': return t('eng.act.attack', { place, wall: tl.wall });
    case 'explore': return t('eng.act.explore', { place });
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
    if (t.building && !t.wall && canPay(s, buildCost(state, side, 'wall'))) add({ type: 'build', build: 'wall', tile: t.id });
  }
  const foeCap = capitalOf(state, foe);
  if (side === 'enemy' && foeCap && (state.sides.player.cathedral ?? 0) >= 1 && !list.some((a) => a.type === 'attack' && a.tile === foeCap.id)) add({ type: 'attack', tile: foeCap.id, crusade: true });
  if (cap) {
    add({ type: 'pray', tile: cap.id });
    if (s.templeLevel < MAX_TEMPLE && canPay(s, buildCost(state, side, 'temple'))) add({ type: 'build', build: 'temple', tile: cap.id });
    if (side === 'player' && s.templeLevel === MAX_TEMPLE && (s.cathedral ?? 0) < 3 && villageCount(state, side) >= cathedralVillages(state) && canPay(s, buildCost(state, side, 'cathedral'))) add({ type: 'build', build: 'cathedral', tile: cap.id });
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
    if (forbidden.includes(a.key)) { rejected.push({ action: a, reason: t('eng.reject.forbidden') }); continue; }
    const cost = costOf(a);
    if (cost && !canPay(budget, cost)) { rejected.push({ action: a, reason: t('eng.reject.cost') }); continue; }
    const clash = accepted.findIndex((x) => x.tile === a.tile);
    if (clash >= 0) {
      const keep = accepted[clash];
      if (pref.includes(a.type) && !pref.includes(keep.type)) {
        const kc = costOf(keep);
        if (kc) for (const [k, v] of Object.entries(kc)) budget[k] += v;
        if (cost && !canPay(budget, cost)) {
          if (kc) pay(budget, kc);
          rejected.push({ action: a, reason: t('eng.reject.cost') });
          continue;
        }
        if (cost) pay(budget, cost);
        accepted[clash] = a;
        rejected.push({ action: keep, reason: t('eng.reject.clashPref') });
      } else {
        rejected.push({ action: a, reason: t('eng.reject.clash') });
      }
      continue;
    }
    if (accepted.length >= limit) { rejected.push({ action: a, reason: t('eng.reject.limit') }); continue; }
    if (cost) pay(budget, cost);
    accepted.push(a);
  }
  return { accepted, rejected };
}

// 계시와 무관하게 남은 신도가 하는 기본 노동: 신앙이 바닥나면 기도부터, 그다음 가장 부족한 자원 채집
// 풍요는 따로 두지 않는다 — 모자란 자원을 거두는 기본 노동이 곧 풍요의 뜻이다
const DOCTRINE_LABOR = { peace: ['preach', 'pray'], war: ['wall', 'attack'], wisdom: ['explore', 'pray'] };
// 대사제의 성향이 뜻을 헤아리는 손: 몇 손(hands), 무엇부터(first), 싸움·선교는 이길 확률이 얼마일 때(odds)
const PRIEST_LABOR = {
  loyal: { hands: 1, first: [], odds: 0.5 },
  literal: { hands: 0, first: [], odds: 0.5 },
  dreamer: { hands: 2, first: [], odds: 0.5 },
  zealot: { hands: 1, first: ['attack', 'preach'], odds: 0.4 },
  cautious: { hands: 1, first: ['wall', 'pray'], odds: 0.6 },
};
export function autoFill(state, side, accepted, forbidden = [], doctrine = null) {
  const limit = actionLimit(state, side);
  const s = state.sides[side];
  const used = new Set(accepted.map((a) => a.tile));
  const leading = [];
  // 신도들은 계시의 뜻을 헤아려 남은 손을 그 뜻대로 쓴다 (선교·공격은 이길 만할 때만). 몇 손을, 무엇부터 쓰는지는 대사제의 성향:
  // 충직(기본) 한 손 · 문자주의 없음(말한 그대로만) · 몽상가 두 손(숨은 뜻까지) · 열혈 싸움·선교부터 · 신중 성벽·기도부터(싸움은 확실할 때만)
  const temper = PRIEST_LABOR[state.priest] ?? PRIEST_LABOR.loyal;
  if (side === 'player' && doctrine && DOCTRINE_LABOR[doctrine] && accepted.length < limit) {
    // 성벽은 받아들인 건설을 치르고 남은 돌로 따진다
    const left = { ...s };
    for (const a of accepted) if (a.type === 'build') pay(left, buildCost(state, side, a.build));
    const kinds = [...new Set([...temper.first, ...DOCTRINE_LABOR[doctrine]])];
    const walls = new Set(enemyIntent(state).filter((x) => x.shown && x.build === 'wall').map((x) => x.tile));
    for (let n = 0; n < temper.hands && accepted.length + leading.length < limit; n++) {
      const legal = legalActions(state, side).filter((a) => !forbidden.includes(a.key) && !used.has(a.tile));
      for (const kind of kinds) {
        const cand = legal.filter((a) => (kind === 'wall' ? a.build === 'wall' && canPay(left, buildCost(state, side, 'wall')) : a.type === kind && a.type !== 'build'))
          .filter((a) => !['preach', 'attack'].includes(a.type) || actionOdds(state, a, { wallAhead: walls.has(a.tile) }) >= temper.odds);
        if (!cand.length) continue;
        const pick = cand[0];
        if (pick.build === 'wall') pay(left, buildCost(state, side, 'wall'));
        used.add(pick.tile); leading.push({ ...pick, auto: true, heeded: true });
        break;
      }
    }
  }
  const filled = [...leading];
  // 우리 신도의 남는 손은 모자란 것만 채운다 — 다음 장 먹을 식량, 바닥난 신앙(기도), 바닥난 나무·돌. 나머지는 쉰다 (일은 계시가 정한다)
  if (side === 'player') {
    const pool = legalActions(state, side).filter((a) => !forbidden.includes(a.key) && !used.has(a.tile));
    const room = () => accepted.length + filled.length < limit;
    const take = (a) => { if (!a || !room()) return false; used.add(a.tile); filled.push({ ...a, auto: true }); return true; };
    const planned = (res) => [...accepted, ...filled].filter((a) => a.gather === res).length;
    const best = (res) => pool.filter((a) => a.gather === res && !used.has(a.tile)).sort((x, y) => gatherAmount(state, side, state.tileAt[y.tile]) - gatherAmount(state, side, state.tileAt[x.tile]))[0];
    if (s.faith <= RULES.lowFaith) take(pool.find((a) => a.type === 'pray' && !used.has(a.tile)));
    for (let k = 0; k < 2 && s.food + 2 * planned('food') < s.pop + 2; k++) if (!take(best('food'))) break;
    for (const res of ['wood', 'stone']) if (s[res] < 2 && !planned(res)) take(best(res));
    return filled;
  }
  const order = ['food', 'wood', 'stone'].sort((x, y) => s[x] - s[y]);
  const pool = legalActions(state, side).filter((a) => a.type === 'gather' && !forbidden.includes(a.key));
  const prayFirst = legalActions(state, side).find((a) => a.type === 'pray' && !forbidden.includes(a.key));
  if (side === 'player' && s.faith <= RULES.lowFaith && prayFirst && !used.has(prayFirst.tile) && accepted.length + filled.length < limit) {
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

const ZEAL_ACT = { normal: 3, hard: 2 };
export function planEnemy(state) {
  const side = 'enemy';
  const limit = actionLimit(state, side);
  const card = state.lawCard;
  const pool = legalActions(state, side);
  const used = new Set();
  const plan = [];
  // 대성당 공사가 시작되면 율법파는 수도를 먼저 친다
  const rush = (state.sides.player.cathedral ?? 0) >= 1 ? [{ type: 'attack', target: 'capital' }] : [];
  // 막이 갈수록 율법은 칼을 든다: 율법 카드 첫 줄 다음에 공격 한 번 (보통은 3막부터, 어려움은 2막부터)
  const act = state.tutorial ? 1 : actOf(state);
  const tail = act >= (ZEAL_ACT[state.config.difficulty] ?? 9) ? [card.rules[0], { type: 'attack' }, ...card.rules.slice(1)] : card.rules;
  const rules = [...rush, ...(state.rally ? [{ type: 'attack' }] : []), ...tail, ...card.rules];
  for (const rule of rules) {
    if (plan.length >= limit) break;
    // 공격·선교는 신도가 둘 이상일 때만 (수도를 비우지 않는다)
    if ((rule.type === 'attack' || rule.type === 'preach') && state.sides.enemy.pop < 2) continue;
    let pick = pickForRule(state, rule, pool.filter((a) => !used.has(a.tile)));
    if (!pick && (rule.type === 'attack' || rule.type === 'preach') && !state.tutorial) pick = pickForRule(state, { type: 'build', build: 'village' }, pool.filter((a) => !used.has(a.tile)));
    if (pick) { used.add(pick.tile); plan.push(pick); }
  }
  plan.push(...autoFill(state, side, plan));
  return plan;
}

// ---------- 라운드 ----------
export function startRound(state) {
  state.round += 1;
  braceLaw(state);
  state.miracleUsed = false;
  state.reinterpretUsed = false;
  state.rainActive = false;
  if (!state.eventDeck.length) state.eventDeck = dealDeck(state, EVENTS, 6);
  if (state.lawDeck.length < 2) state.lawDeck.unshift(...dealDeck(state, lawPool(state), 9));
  // 세 막 (두 번째 판부터): 2막에 들어서면 성전 카드 한 장을 덱에 넣고, 3막에는 평온한 계절이 오지 않는다
  if (unlocked(state, 3) && actStart(state)) {
    if (actOf(state) === 2 && lawPool(state).some((c) => c.id === 'L5')) state.lawDeck.splice(Math.max(0, state.lawDeck.length - 3), 0, LAW_CARDS.find((c) => c.id === 'L5'));
    if (actOf(state) === 3) state.eventDeck = state.eventDeck.filter((e) => e.id !== 'calm');
  }
  if (!state.eventDeck.length) state.eventDeck = dealDeck(state, unlocked(state, 3) && actOf(state) === 3 ? EVENTS.filter((e) => e.id !== 'calm') : EVENTS, 6);
  state.event = state.eventDeck.pop();
  // 분열의 예언자: 두 번째 판·2막부터 한 번. 대립 교리가 둘 다 3 이상이거나 신앙 바닥으로 한 장을 버텼을 때
  const d0 = state.sides.player.doctrine;
  const split = (d0.peace >= 3 && d0.war >= 3) || (d0.abundance >= 3 && d0.wisdom >= 3);
  if (unlocked(state, 4) && !state.miraDone && actOf(state) >= 2 && (split || state.sides.player.faithless >= 1)) {
    state.eventDeck.push(state.event);
    state.event = MIRA;
    state.miraDone = true;
    const past = state.revelations.filter((r) => r.doctrine);
    const q = past.length ? past[past.length - 1] : null;
    state.miraQuote = q ? t('eng.miraQuote', { text: q.text, twist: MIRA_TWIST[q.doctrine] }) : t('eng.miraQuoteNone');
  }
  // 지혜 궁극: 다가올 계절 두 장 중 하나를 고른다 (고르지 않으면 첫 장)
  state.eventChoice = !state.event.special && hasUlt(state, 'player', 'wisdom') && state.eventDeck.length && state.eventDeck.at(-1).id !== state.event.id
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
  // 선공은 승점이 뒤진 쪽 (같으면 번갈아). 튜토리얼은 늘 우리가 선공 — 배우는 일이 막히지 않게
  state.first = state.tutorial || state.round % 2 === 1 ? 'player' : 'enemy';
  if (!state.tutorial) { const d = score(state, 'player') - score(state, 'enemy'); if (d < 0) state.first = 'player'; else if (d > 0) state.first = 'enemy'; }
  // 대성당 공사가 시작되면 율법파가 원정한다 — 뒤져도 선공은 율법파 (점수를 일부러 낮춰 선공을 쥐는 대성당 한 줄을 막는다)
  if (!state.tutorial && (state.sides.player.cathedral ?? 0) >= 1) state.first = 'enemy';
  state.roundMods = {};
  state.dilemmaPick = null;
  if (state.round > 1) state.destinyOffer = null; // 1장에 고르지 않았으면 첫 소명 그대로
  state.petition = makePetition(state);
  if (state.round === draftRound(state) && unlocked(state, 3)) {
    const pool = MIRACLES.map((m) => m.id).filter((id) => !state.miracleHand.includes(id) && !(state.config.trial === 'storm' && id === 'rain'));
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
  logEvent(state, 'player', t('log.grace', { why, n: give }), null, { kind: 'grace', gain: { faith: give }, tile: capitalOf(state, 'player')?.id });
  return give;
}

// 신도들의 청원: 지금 부족에게 가장 급한 것을 한 사람이 묻는다
function makePetition(state) {
  const p = state.sides.player;
  const who = hashPick(PETITIONERS, state.config.seed, state.round, 'petitioner');
  const threat = enemyIntent(state).find((a) => a.shown && a.type === 'attack');
  const needs = [
    [state.event?.id === 'drought' || p.food < p.pop, { text: t('eng.petition.food'), need: { type: 'gather', gather: 'food' }, keys: t('kw.petition.food') }],
    [threat, { text: t('eng.petition.threat', { place: tileName(state, state.tileAt[threat?.tile ?? capitalOf(state, 'player').id]) }), need: { type: 'build', build: 'wall' }, alt: 'attack', keys: t('kw.petition.threat') }],
    [p.faith <= RULES.lowFaith, { text: t('eng.petition.faith'), need: { type: 'pray' }, keys: t('kw.petition.faith') }],
    [state.event?.id === 'plague', { text: t('eng.petition.plague'), need: { type: 'pray' }, keys: t('kw.petition.plague') }],
    [state.event?.id === 'prophet', { text: t('eng.petition.prophet'), need: { type: 'explore' }, keys: t('kw.petition.prophet') }],
    [p.pop >= popCap(state, 'player'), { text: t('eng.petition.crowded'), need: { type: 'build', build: 'village' }, keys: t('kw.petition.crowded') }],
    [p.wood < 2, { text: t('eng.petition.wood'), need: { type: 'gather', gather: 'wood' }, keys: t('kw.petition.wood') }],
    [true, { text: t('eng.petition.idle'), need: null, keys: null }],
  ];
  const [, pick] = needs.find(([cond]) => cond);
  // keys는 정규식 원본 문자열이다 (저장·복원할 수 있게)
  return { from: who, ...pick, keys: pick.keys ?? null };
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
    // 이루어진 예언은 은총이다 (장당 한 번의 은총을 다른 은총과 나눠 쓴다)
    state.stats.prophecies += 1;
    state.prophecy = null;
    logEvent(state, 'player', t('log.prophecyDone', { name: PROPHECY.kinds[pr.kind].name }), null, { kind: 'prophecy', tile: home });
    grantGrace(state, 1, t('eng.why.prophecy', { name: PROPHECY.kinds[pr.kind].name }));
  } else if (state.round >= pr.due) {
    state.prophecy = null;
    logEvent(state, 'player', t('log.prophecyFailed', { name: PROPHECY.kinds[pr.kind].name }), null, { kind: 'warn', tile: home });
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

// 계시 비용: 신앙 1 + 봉인된 말을 쓰면 +1 + 되풀이면 +1 (길이는 보지 않는다 — 말을 아끼게 하는 규칙이 멋진 말을 벌하지 않게)
export function revelationCostFor(state, text) {
  return 1 + (state.bannedWords.some((w) => text.includes(w)) ? 1 : 0) + (isEcho(state, text) ? 1 : 0);
}
// 메아리: 지난 계시를 되풀이하면 무뎌진다 (신앙 +1, 교리가 오르지 않는다). 글자가 같거나(띄어쓰기·문장부호는 보지 않는다)
// 말을 바꿔도 석판이 알아듣는 일들이 지난 계시와 똑같으면 되풀이다. 일의 목록은 해석기가 알려 준다 (setPlanSig)
const plainWords = (x) => String(x ?? '').replace(/[\s\p{P}]/gu, '');
let planSigFn = null;
export const setPlanSig = (f) => { planSigFn = f; };
const planSig = (state, text) => (planSigFn ? planSigFn(state, text) : '');
export const isEcho = (state, text, sig = planSig(state, text)) => {
  if (state.tutorial || !text || plainWords(text) === '') return false;
  const last = state.revelations?.at(-1);
  // 두 장 전의 일과 같아도 되풀이다 (두 계시를 번갈아 쓰는 것도 되풀이)
  return plainWords(text) === plainWords(last?.text) || (!!sig && (sig === last?.sig || sig === state.revelations?.at(-2)?.sig));
};
// 말하는 순간의 되풀이 판정 (확정 뒤 recordRevelation에 넘긴다 — 해결 뒤에는 할 수 있는 일이 달라지므로)
export const spokenOf = (state, text) => { const sig = planSig(state, text); return { sig, echo: isEcho(state, text, sig) }; };

// 율법파가 이번 장에 할 일 (예고용). 공개하는 범위는 난이도에 따라 다르다
export function enemyIntent(state) {
  const plan = planEnemy(state);
  const diff = state.tutorial ? 'easy' : state.config.difficulty;
  const shown = diff === 'easy' ? () => true
    : diff === 'normal' ? (a) => a.type !== 'pray' // 보통은 칸을 차지하는 일을 모두 보인다 (기도는 수도 안의 일이라 막지도 막히지도 않는다)
      : (a) => a.type === 'attack' || a.type === 'build'; // 어려움도 칼과 건설은 보인다 — 읽고 막는 판단이 남게 (선교·채집·기도는 가림)
  return plan.map((a) => ({ ...a, shown: shown(a) && state.tileAt[a.tile].revealed }));
}

// 기적 비용: 신의 분노만큼 싸진다 (최소 1). 심판의 날은 공짜
// 같은 기적을 다시 쓸 때마다 신앙 1이 더 든다 (번개 하나로 판을 끌고 가지 않게)
export const miracleCost = (state, m) => (m.id === DOOM.id ? 0 : Math.max(1, m.cost - (state.wrath ?? 0) - (state.config.trial === 'storm' && m.id === 'lightning' ? 1 : 0)) + (state.miracleUses?.[m.id] ?? 0));
const usedMiracle = (state, id) => { state.miracleUses = { ...(state.miracleUses ?? {}), [id]: (state.miracleUses?.[id] ?? 0) + 1 }; };
// 심판의 날은 판에 한 번 — 일부러 뒤처져 여러 번 내리는 길을 막는다
export const doomReady = (state) => (state.wrath ?? 0) >= 3 && !state.tutorial && !state.doomUsed;

export function castMiracle(state, id, targetTile) {
  const m = id === DOOM.id ? DOOM : MIRACLES.find((x) => x.id === id);
  const s = state.sides.player;
  if (id === DOOM.id ? !doomReady(state) : !state.miracleHand.includes(id)) return { ok: false, text: t('eng.miracle.notInHand') };
  const cost = miracleCost(state, m);
  if (state.miracleUsed || s.faith < cost) return { ok: false, text: t('eng.miracle.cannot') };
  const home = capitalOf(state, 'player')?.id;
  if (MIRACLE_FX[id]) {
    s.faith -= cost;
    MIRACLE_FX[id](state, s, home);
    state.miracleUsed = true;
    usedMiracle(state, id);
    state.stats.miracles += 1;
    checkVictory(state, false);
    return { ok: true };
  }
  if (m.id === 'lightning') {
    const tl = state.tileAt[targetTile];
    if (!tl || tl.owner !== 'enemy' || !tl.revealed) return { ok: false, text: t('eng.miracle.needTarget') };
    s.faith -= cost;
    if (tl.building === 'capital') raiseEdict(state, -2, t('eng.edict.lightning'));
    if (tl.wall) { tl.wall = false; logEvent(state, 'player', t('log.lightningWall', { place: tileName(state, tl) }), null, { tile: tl.id, kind: 'lightning' }); }
    else { state.sides.enemy.pop = Math.max(0, state.sides.enemy.pop - 1); logEvent(state, 'player', t('log.lightningHit', { place: tileName(state, tl) }), null, { tile: tl.id, kind: 'lightning' }); }
  } else if (m.id === 'rain') {
    s.faith -= cost; s.food += 3; state.rainActive = true;
    logEvent(state, 'player', t('log.rain'), null, { kind: 'rain', gain: { food: 3 } });
  } else {
    s.faith -= cost; s.wood += 2; s.stone += 2;
    logEvent(state, 'player', t('log.bounty'), null, { kind: 'bounty', gain: { wood: 2, stone: 2 } });
  }
  state.miracleUsed = true;
  usedMiracle(state, id);
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
    state.wrath = 0; state.doomUsed = true;
    raiseEdict(state, -2, t('eng.edict.doom'));
    logEvent(state, 'player', t('log.doom', { hp: e.capitalHp }), null, { kind: 'lightning', tile: cap?.id });
    if (e.capitalHp <= 0) { state.winner = 'player'; state.winReason = t('eng.win.doom'); state.winKind = 'doom'; }
  },
  manna: (state, s, home) => { s.food += 4; logEvent(state, 'player', t('log.manna'), null, { kind: 'rain', gain: { food: 4 }, tile: home }); },
  ark: (state, s, home) => { state.roundMods.ark = true; logEvent(state, 'player', t('log.ark'), null, { kind: 'bless', tile: home, label: t('eng.fx.ark') }); },
  tongues: (state, s, home) => { state.roundMods.tongues = 1; logEvent(state, 'player', t('log.tongues'), null, { kind: 'bless', tile: home, label: t('eng.fx.tongues') }); },
  pillar: (state, s, home) => {
    state.roundMods.pillar = 1;
    const mine = ownedTiles(state, 'player');
    for (const tl of state.tiles) if (mine.some((m) => distance(m, tl) <= 3)) tl.revealed = true;
    logEvent(state, 'player', t('log.pillar'), null, { kind: 'bless', tile: home, label: t('eng.fx.pillar') });
  },
  revive: (state, s, home) => {
    if (s.pop < popCap(state, 'player')) { s.pop += 1; logEvent(state, 'player', t('log.revive'), null, { kind: 'birth', tile: home }); }
    else { s.faith += 2; logEvent(state, 'player', t('log.reviveFull'), null, { kind: 'bless', tile: home, label: t('eng.fx.revive') }); }
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
  for (const tl of state.tiles) {
    if (!tl.site || tl.site.found || !tl.revealed) continue;
    const site = SITES[tl.site.id];
    if (site.choice && state.pendingSite) continue; // 선택이 필요한 발견은 한 번에 하나 (다음 장에 이어진다)
    tl.site.found = true;
    if (site.choice) { state.pendingSite = tl.id; logEvent(state, 'player', t('log.siteMeet', { place: tileName(state, tl), site: site.name }), null, { kind: 'site', tile: tl.id }); continue; }
    const s = state.sides.player;
    const lg = tl.site.id === 'legacy' ? state.config.legacy : null;
    if (lg) {
      const d = lg.doctrine && s.doctrine[lg.doctrine] < RULES.graceDoctrineBelow ? lg.doctrine : null;
      if (d) s.doctrine[d] += 1; else s.faith += 2;
      logEvent(state, 'player', t('log.legacy', { god: lg.god, epithet: lg.epithet, quote: lg.quote, doc: d ? t(`eng.doctrine.${d}`) : null }), null, { kind: 'treasure', tile: tl.id, gain: d ? undefined : { faith: 2 } });
      continue;
    }
    for (const [k, v] of Object.entries(site.gain)) s[k] += v;
    const gains = Object.entries(site.gain).map(([k, v]) => t('eng.gain.item', { res: RESOURCE_NAME[k], n: v })).join(', ');
    logEvent(state, 'player', t('log.site', { name: site.name, text: site.text, gains }), null, { kind: 'treasure', tile: tl.id, gain: site.gain });
  }
}
export function resolveSite(state, choice) {
  const tl = state.tileAt[state.pendingSite];
  state.pendingSite = null;
  if (!tl) return null;
  const s = state.sides.player;
  if (choice === 'take') {
    if (s.pop < popCap(state, 'player')) { s.pop += 1; return t('log.nomadJoin'); }
    s.food += 2; return t('log.nomadLeave');
  }
  s.faith += 2; return t('log.nomadBless');
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
  // 같은 칸을 양쪽이 고르면 선 플레이어가 차지한다. 다만 제 수도·건물 안에서 하는 일(기도, 신전·대성당·성벽)은
  // 칸을 차지하는 일이 아니고, 막히지도 않는다 — 수도에서 기도만 해도 상대의 수도 공격이 막히던 구멍을 닫고,
  // 거꾸로 상대가 선으로 우리 수도를 쳐도 우리 기도·신전·성벽은 그대로 한다 (양쪽이 같다)
  const home = (a) => a.type === 'pray' || (a.type === 'build' && ['temple', 'cathedral', 'wall'].includes(a.build));
  const firstTiles = new Set(plans[first].filter((a) => !home(a)).map((a) => a.tile));
  const blocked = new Set();
  for (const a of plans[other(first)]) {
    if (firstTiles.has(a.tile) && !home(a)) {
      blocked.add(a);
      logEvent(state, a.side, t('log.blocked', { who: a.side, place: tileName(state, state.tileAt[a.tile], 'player') }), null, { tile: a.tile, kind: 'blocked' });
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
  // 갈림길의 결과는 유지 단계 전에 (마지막 장의 승패에도 들어가게)
  if (state.pendingDilemma && !state.winner) { resolveDilemma(state, state.pendingDilemma, true); state.pendingDilemma = null; }
  if (!state.winner) upkeep(state);
  recordHistory(state);
}

// 율법파가 우리를 읽는다: 그 장 계시가 되풀이였거나(지난 두 계시와 같은 일들) 같은 교리를 세 장 이어 말했으면
// 다음 장 우리 선교·공격에 방어 +1, 읽힘이 이어지면 +2. 말을 바꾸면(침묵 포함) 풀린다
function readUs(state, round) {
  const r = state.revelations;
  const last = r.at(-1);
  if (!last || last.round !== round) return false;
  if (last.echo) return true;
  const r3 = r.slice(-3);
  return r3.length === 3 && !!r3[0].doctrine && r3.every((x) => x.doctrine === r3[0].doctrine) && r3[0].round === round - 2;
}
// 이번 장 계시를 받은 뒤라면: 다음 장에 율법파가 대비할 만큼 (봇이 미리 본다 — 확인 화면은 wouldRead와 지금의 lawGuard로 같은 값을 낸다)
// 이번 계시를 내리면 율법파가 읽는가 (확인 화면이 미리 알린다): 되풀이이거나, 지난 두 장을 이어서 같은 교리로 말했고 이번도 그 교리
export function wouldRead(state, text, doctrine) {
  if (state.tutorial || !text) return false;
  if (isEcho(state, text)) return true;
  const r = state.revelations; const a = r.at(-1); const b = r.at(-2);
  return !!doctrine && a?.doctrine === doctrine && b?.doctrine === doctrine && a.round === state.round - 1 && b.round === state.round - 2;
}
export const braceAhead = (state) => (state.tutorial || !readUs(state, state.round) ? 0 : Math.min(2, (state.lawGuard ?? 0) + 1));
function braceLaw(state) {
  if (state.tutorial) return;
  const echoed = readUs(state, state.round - 1);
  const before = state.lawGuard ?? 0;
  state.lawGuard = echoed ? Math.min(2, before + 1) : 0;
  if (state.lawGuard > before) logEvent(state, 'enemy', t('log.lawGuard', { n: state.lawGuard }), null, { kind: 'guard', tile: capitalOf(state, 'player')?.id });
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
    logEvent(state, 'player', state.wrath >= 3 ? t('log.wrathFull', { doom: !state.doomUsed }) : t('log.wrath', { n: state.wrath }), null, { kind: 'wrath', tile: capitalOf(state, 'player')?.id });
  }
  // 율법파의 결집: 우리가 12점 이상 앞서면 율법파는 행동 +1, 공격을 먼저 한다 (6점 이내로 좁혀지면 풀린다)
  const wasRally = state.rally;
  if (state.round >= wrathRound(state) && ps - es >= 12) state.rally = true;
  else if (ps - es <= 6) state.rally = false;
  if (state.rally && !wasRally) logEvent(state, 'enemy', t('log.rally'), null, { kind: 'rally', tile: capitalOf(state, 'enemy')?.id });
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
  logEvent(state, 'enemy', t('log.edict', { plus: n > 0, d: e.edict - before, why, edict: e.edict, max: edictMax(state) }), null, { kind: 'edict', up: n > 0, tile: capitalOf(state, 'enemy')?.id });
  if (before < edictMax(state) - 2 && e.edict >= edictMax(state) - 2) logEvent(state, 'player', t('log.edictNear'), null, { kind: 'warn' });
}
function holyAndEdict(state) {
  if (!state.edictOn) return;
  // 성지는 2막부터 석판을 움직인다 (그 전에 성지를 두고 다툴 시간을 준다)
  const owner = actOf(state) >= 2 ? holyOwner(state) : null;
  if (owner === 'enemy') raiseEdict(state, 1, t('eng.edict.holyEnemy'));
  else if (owner === 'player') raiseEdict(state, -1, t('eng.edict.holyPlayer'));
}

// 소명 (장이 끝날 때 확인)
function checkDestiny(state) {
  const d = state.destiny;
  if (!d || d.done) return;
  if (DESTINIES[d.id].test(state, { villages: villageCount(state, 'player') })) {
    d.done = true;
    logEvent(state, 'player', t('log.destiny', { name: DESTINIES[d.id].name, text: DESTINIES[d.id].text, n: DESTINY_POINTS }), null, { kind: 'prophecy', tile: capitalOf(state, 'player')?.id });
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
    if (a.type === 'gather') { const n = gatherAmount(state, 'player', state.tileAt[a.tile]); d[a.gather] += n; per[a.key] = t('eng.preview.gain', { n, res: RESOURCE_NAME[a.gather] }); }
    else if (a.type === 'pray') { const n = prayValue(state, 'player'); d.faith += n; per[a.key] = t('eng.preview.faith', { n }); }
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
  if (!state.config.veteran || state.tutorial) { logEvent(state, 'player', t('log.silence'), null, { kind: 'warn', tile: home }); return; }
  if (n === 2) { p.faith = Math.max(0, p.faith - 1); logEvent(state, 'player', t('log.silence2'), null, { kind: 'warn', tile: home }); return; }
  if (p.pop > 1) { p.pop -= 1; state.sides.enemy.pop += 1; logEvent(state, 'player', t('log.silence3'), null, { kind: 'loss', tile: home }); }
}

// ---------- 전설이 된 땅: 계시로 명한 일이 큰 결과를 낸 칸에 별칭이 붙는다 ----------
export function markLegends(state, text, doctrine, orders, logs) {
  if (!text) return [];
  const made = [];
  for (const a of orders) {
    if (Object.keys(state.legends).length >= 3) break;
    const hit = logs.find((l) => l.act === a.key && (l.fx?.capture || l.fx?.convert || l.fx?.kind === 'cathedral' || (a.build === 'cathedral' && l.fx?.kind === 'build')));
    const tl = state.tileAt[a.tile];
    if (!hit || state.legends[tl.id] || state.names[tl.id] || tl.id === state.holyId) continue;
    const base = tl.building === 'capital' ? t('eng.legend.capital') : tl.building === 'village' ? t('eng.legend.village') : TERRAIN[tl.terrain]?.name ?? t('eng.legend.land');
    const name = t('eng.legend.name', { doctrine, round: state.round, base });
    state.legends[tl.id] = { name, quote: text.slice(0, 24), round: state.round };
    made.push(name);
    logEvent(state, 'player', t('log.legend', { name, quote: text.slice(0, 24) }), null, { kind: 'legend', tile: tl.id });
  }
  return made;
}

// ---------- 영원한 계명, 숨은 말 ----------
export const carvable = (state, id) => !(state.config.trial === 'earth' && id === 'noSword');
export const canCarve = (state) => unlocked(state, 4) && state.round >= 3 && state.commandments.length < MAX_COMMANDMENTS;
export function carveCommandment(state, id) {
  if (!canCarve(state) || !COMMANDMENTS[id] || state.commandments.includes(id) || !carvable(state, id)) return false;
  state.commandments.push(id);
  logEvent(state, 'player', t('log.commandment', { name: COMMANDMENTS[id].name, text: COMMANDMENTS[id].text }), null, { kind: 'commandment', tile: capitalOf(state, 'player')?.id });
  return true;
}
// 숨은 말: 계시에 그 낱말이 들어가면 찾는다 (판당 하나)
export function findSacred(state, text) {
  if (!state.sacred || state.stats.sacred || !text?.includes(state.sacred.word)) return false;
  state.stats.sacred = 1;
  logEvent(state, 'player', t('log.sacred', { word: state.sacred.word }), null, { kind: 'prophecy', tile: capitalOf(state, 'player')?.id });
  return true;
}

// ---------- 두 갈래 사건 ----------
export function dilemmaByText(state, text) {
  const opts = state.event?.choice;
  if (!opts || !text) return null;
  return opts.find((o) => new RegExp(o.tags).test(text))?.id ?? null;
}
// 갈림길 비용을 먼저 치른다. 감당할 수 없으면 비용 없는 선택으로 바뀐다
export function payDilemma(state, pick) {
  const ev = state.event;
  if (!ev?.choice) return null;
  let o = ev.choice.find((x) => x.id === pick) ?? ev.choice[0];
  const s = state.sides.player;
  const cost = Object.entries(o.gain ?? {}).filter(([, v]) => v < 0);
  if (cost.some(([k, v]) => s[k] < -v)) {
    // 무료 선택이 없으면 치를 수 있는 선택으로, 그것도 없으면 가진 만큼만 치른다 (자원이 음수가 되지 않게)
    const affordable = (x) => Object.entries(x.gain ?? {}).every(([k, v]) => v >= 0 || s[k] >= -v);
    const free = ev.choice.find((x) => !Object.values(x.gain ?? {}).some((v) => v < 0)) ?? ev.choice.find(affordable) ?? o;
    if (free !== o) logEvent(state, 'player', t('log.dilemmaFallback', { ev: ev.name, label: o.label, free: free.label }), null, { kind: 'dilemma' });
    o = free;
  }
  for (const [k, v] of Object.entries(o.gain ?? {})) if (v < 0) s[k] = Math.max(0, s[k] + v);
  if (o.ark) state.roundMods.ark = true;
  state.pendingDilemma = o.id;
  return o.id;
}

export function resolveDilemma(state, pick, prepaid = false) {
  const ev = state.event;
  if (!ev?.choice) return;
  const o = ev.choice.find((x) => x.id === pick) ?? ev.choice[0];
  const s = state.sides.player;
  for (const [k, v] of Object.entries(o.gain ?? {})) if (!prepaid || v > 0) s[k] = Math.max(0, s[k] + v);
  let noRoom = false;
  if (o.pop > 0) { if (s.pop < popCap(state, 'player')) s.pop += 1; else { s.food += 2; noRoom = true; } }
  if (o.pop < 0 && s.pop > 1) s.pop -= 1;
  if (o.doctrine) {
    const d = s.doctrine;
    const top = DOCTRINES.reduce((b, k) => (d[k] > d[b] ? k : b), 'wisdom');
    if (d[top] < DOCTRINE_MAX) d[top] += 1;
  }
  if (o.provoke) state.vowNext = 'attack';
  if (o.edict) raiseEdict(state, o.edict, t('eng.edict.mira'));
  if (o.calm) { state.sides.player.faithless = 0; state.silentRun = 0; }
  if (o.ark) state.roundMods.ark = true;
  logEvent(state, 'player', t('log.dilemma', { ev: ev.name, label: o.label, text: o.text, noRoom }), null, { kind: 'dilemma', tile: capitalOf(state, 'player')?.id });
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
  if ([state.event, state.lawCard, ...state.eventDeck, ...state.lawDeck].some((c) => c === undefined)) throw new Error(t('eng.unknownCard'));
  state.tileAt = Object.fromEntries(state.tiles.map((t) => [t.id, t]));
  state.bannedWords ??= []; state.bannedNext ??= null; state.eventChoice ??= null; state.history ??= [];
  state.priest ??= 'loyal'; state.names ??= {}; state.lessons ??= []; state.prophecy ??= null;
  if (typeof state.lawGuard !== 'number') state.lawGuard = Math.max(state.lawGuard?.attack ?? 0, state.lawGuard?.preach ?? 0);
  state.rally ??= false; state.doomUsed ??= false; state.miracleUses ??= {};
  for (const sd of Object.values(state.sides)) sd.capitalHp = Math.min(sd.capitalHp, CAPITAL_HP);
  state.judgement ??= 'classic'; state.wrath ??= 0; state.streak ??= null; state.vowNext ??= null; state.reacted ??= null;
  state.edictOn ??= false; state.dilemmaPick ??= null; state.winKind ??= null;
  state.silentRun ??= 0; state.legends ??= {}; state.miraDone ??= false; state.pendingDilemma ??= null; state.miraQuote ??= null;
  state.commandments ??= []; state.saints ??= []; state.deeds ??= {}; state.fallen ??= []; state.sacred ??= null; state.destiny ??= null; state.destinyOffer ??= null; state.holyId ??= null;
  for (const sd of Object.values(state.sides)) { sd.cathedral ??= 0; sd.edict ??= 0; }
  // 규칙 10 전의 저장: 석판이 12칸이었다 — 새 한계에 닿아 곧바로 지지 않게 한 칸 아래로
  if ((state.ruleset ?? 0) < 10) for (const sd of Object.values(state.sides)) sd.edict = Math.min(sd.edict, edictMax(state) - 1);
  state.ruleset = RULESET;
  state.grace ??= { round: 0, used: 0 }; state.roundMods ??= {}; state.miracleHand ??= [...FIRST_HAND]; state.miracleOffer ??= null; state.pendingSite ??= null; state.stats ??= { converted: 0, captured: 0, miracles: 0, prophecies: 0, petitions: 0 };
  return state;
}

function resolveAction(state, a) {
  const side = a.side;
  const foe = other(side);
  const s = state.sides[side];
  const f = state.sides[foe];
  const tl = state.tileAt[a.tile];
  const place = tileName(state, tl, 'player');
  switch (a.type) {
    case 'gather': {
      if (tl.owner === foe) return logEvent(state, side, t('log.gatherFoe', { who: side, place }), null, { tile: tl.id, kind: 'fail' });
      const n = gatherAmount(state, side, tl);
      s[a.gather] += n;
      return logEvent(state, side, t('log.gather', { who: side, place, res: RESOURCE_NAME[a.gather], n }), null, { tile: tl.id, kind: 'gain', gain: { [a.gather]: n } });
    }
    case 'pray': {
      const n = prayValue(state, side);
      s.faith += n;
      return logEvent(state, side, t('log.pray', { who: side, n }), null, { tile: tl.id, kind: 'gain', gain: { faith: n } });
    }
    case 'build': {
      const cost = buildCost(state, side, a.build);
      if (!canPay(s, cost)) return logEvent(state, side, t('log.buildNoRes', { who: side, place }), null, { tile: tl.id, kind: 'fail' });
      if (a.build === 'village') {
        if (tl.owner) return logEvent(state, side, t('log.villageTaken', { place }), null, { tile: tl.id, kind: 'fail' });
        pay(s, cost); tl.owner = side; tl.building = 'village'; tl.revealed ||= side === 'player';
        return logEvent(state, side, t(tl.revealed ? 'log.village' : 'log.villageFog', { who: side, place: tileName(state, tl, 'player'), id: tl.id }), null, { tile: tl.id, kind: 'build', icon: '🏠' });
      }
      if (a.build === 'wall') { pay(s, cost); tl.wall = true; return logEvent(state, side, t('log.wall', { who: side, place }), null, { tile: tl.id, kind: 'build', icon: '🧱' }); }
      if (a.build === 'temple') {
        if (s.templeLevel >= MAX_TEMPLE) return;
        pay(s, cost); s.templeLevel += 1;
        if (side === 'enemy') raiseEdict(state, 2, t('eng.edict.temple'));
        return logEvent(state, side, t('log.temple', { who: side, level: s.templeLevel }), null, { tile: tl.id, kind: 'build', icon: side === 'player' ? '⛪' : '🏛️' });
      }
      pay(s, cost);
      s.cathedral = (s.cathedral ?? 0) + 1;
      if (s.cathedral >= 3) {
        state.winner = side; state.winReason = t('eng.win.cathedral'); state.winKind = 'cathedral';
        return logEvent(state, side, t('log.cathedralDone', { who: side }), null, { tile: tl.id, kind: 'cathedral' });
      }
      return logEvent(state, side, t('log.cathedral', { who: side, part: CATHEDRAL[s.cathedral - 1].name, stage: s.cathedral }), null, { tile: tl.id, kind: 'build', icon: '⛪' });
    }
    case 'explore': {
      tl.revealed = true;
      for (const n of neighbors(state, tl)) n.revealed = true;
      if (state.event?.id === 'prophet') { s.faith += 3; return logEvent(state, side, t('log.prophetTreasure', { place }), null, { tile: tl.id, kind: 'treasure', gain: { faith: 3 } }); }
      if (rand(state) < 0.5) {
        const res = ['wood', 'stone', 'faith'][Math.floor(rand(state) * 3)];
        s[res] += 2;
        return logEvent(state, side, t('log.exploreFind', { place, res: RESOURCE_NAME[res] }), null, { tile: tl.id, kind: 'treasure', gain: { [res]: 2 } });
      }
      return logEvent(state, side, t('log.explore', { place }), null, { tile: tl.id, kind: 'explore' });
    }
    case 'preach': {
      if (tl.owner !== foe || f.pop <= 0) return logEvent(state, side, t('log.preachNone', { place }), null, { tile: tl.id, kind: 'fail' });
      // 수도·성벽 안이면 설득하기 어렵다 (+1씩)
      const bonus = preachBonus(state, side);
      const defBonus = (tl.building === 'capital' ? 1 : 0) + (tl.wall ? 1 : 0) + lawGuardOf(state, side);
      const ra = d6(state); const rd = d6(state);
      const win = ra + bonus > rd + defBonus;
      const dice = { attacker: ra, attackerBonus: bonus, defender: rd, defenderBonus: defBonus, win };
      if (win) {
        f.pop -= 1; s.pop += 1;
        // 마을에 믿음의 표식이 두 번 쌓이면 그 마을이 넘어온다 (수도는 제외, 성벽은 남는다)
        if (side === 'player') { state.stats.converted += 1; deed(state, a.key, 'preach'); }
        if (tl.building === 'village') {
          tl.faithMarks = tl.faithMarks?.side === side ? { side, n: tl.faithMarks.n + 1, round: state.round } : { side, n: 1, round: state.round };
          if (tl.faithMarks.n >= 2) {
            tl.owner = side; tl.faithMarks = null;
            if (side === 'player') state.stats.turned = (state.stats.turned ?? 0) + 1;
            if (side === 'player') tl.revealed = true;
            return logEvent(state, side, t('log.preachTurn', { who: side, place }), dice, { tile: tl.id, kind: 'preach', convert: true });
          }
          return logEvent(state, side, t('log.preachMark', { who: side, place }), dice, { tile: tl.id, kind: 'preach' });
        }
        return logEvent(state, side, t('log.preach', { who: side, place }), dice, { tile: tl.id, kind: 'preach' });
      }
      return logEvent(state, side, t('log.preachFail', { who: side, place }), dice, { tile: tl.id, kind: 'preach' });
    }
    case 'attack': {
      if (tl.owner !== foe) return logEvent(state, side, t('log.attackNotFoe', { place }), null, { tile: tl.id, kind: 'fail' });
      const bonus = (s.doctrine.war >= 2 ? 1 : 0)
        + (side === 'enemy' && state.event?.id === 'threat' ? 1 : 0) + enemyZeal(state, side) + (side === 'player' ? (state.roundMods.pillar ?? 0) : 0);
      const defBonus = (tl.wall ? 2 : 0) + (tl.building === 'capital' ? 1 : 0) + lawGuardOf(state, side);
      const ra = d6(state); const rd = d6(state);
      const win = ra + bonus > rd + defBonus;
      const dice = { attacker: ra, attackerBonus: bonus, defender: rd, defenderBonus: defBonus, win };
      if (!win) {
        if (foe === 'player' && tl.building === 'capital') deed(state, `guard:${state.round}`, 'guard');
        if (hasUlt(state, side, 'war') && s.faith >= 2) {
          s.faith -= 2;
          return logEvent(state, side, t('log.attackWarSave', { who: side, place }), dice, { tile: tl.id, kind: 'attack' });
        }
        if (side === 'player' && state.roundMods.ark) return logEvent(state, side, t('log.attackArk', { who: side, place }), dice, { tile: tl.id, kind: 'attack' });
        if (side === 'player') fallen(state, a.key);
        // 율법파 원정대는 지면 물러난다 (신도 대신 식량 1)
        if (side === 'enemy' && !state.tutorial) {
          s.food = Math.max(0, s.food - 1);
          return logEvent(state, side, t('log.attackRetreat', { place }), dice, { tile: tl.id, kind: 'attack' });
        }
        s.pop = Math.max(0, s.pop - 1);
        return logEvent(state, side, t('log.attackFail', { who: side, place }), dice, { tile: tl.id, kind: 'attack' });
      }
      if (!(foe === 'player' && state.roundMods.ark)) f.pop = Math.max(0, f.pop - 1);
      if (tl.building === 'capital') {
        f.capitalHp -= 1;
        logEvent(state, side, t('log.attackCapital', { who: side, place, hp: f.capitalHp }), dice, { tile: tl.id, kind: 'attack', capital: true });
        if (f.capitalHp <= 0) { state.winner = side; state.winReason = t('eng.win.capital', { who: side }); state.winKind = 'capital'; }
        return;
      }
      tl.owner = side; tl.wall = false; tl.faithMarks = null;
      if (side === 'player') state.stats.captured += 1;
      return logEvent(state, side, t('log.capture', { who: side, place }), dice, { tile: tl.id, kind: 'attack', capture: true });
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
    // 수도는 식량 2, 마을은 식량 1을 스스로 생산한다. 신도 1명당 식량 1을 먹는다
    s.food += 2 + villageCount(state, side);
    s.food -= s.pop;
    if (side === 'player' && state.commandments?.includes('noFamine')) s.food -= 1; // 굶기지 말라: 늘 한 줌씩 더 나눈다
    if (s.food < 0 && side === 'player' && (state.roundMods.ark || state.commandments?.includes('noFamine'))) {
      s.food = 0;
    } else if (s.food < 0) {
      s.food = 0; s.pop = Math.max(0, s.pop - 1);
      if (side === 'player') state.stats.starved = (state.stats.starved ?? 0) + 1;
      logEvent(state, side, t('log.starve', { who: side }), null, { kind: 'loss' });
    } else {
      // 식량에 여유가 있을 때만 늘어난다: 증가 비용 + 신도 절반만큼의 비축
      const growCost = s.doctrine.abundance >= 4 || (side === 'player' && state.config.trial === 'earth') ? 1 : 2;
      if (s.pop < popCap(state, side) && s.food >= growCost + Math.ceil(s.pop / 2)) {
        s.food -= growCost; s.pop += 1;
        logEvent(state, side, t('log.birth', { who: side }), null, { kind: 'birth' });
      }
    }
    s.faith += faithIncome(state, side);
    if (state.event?.id === 'plague' && s.pop > 1 && !(side === 'player' && state.roundMods.ark)) { s.pop -= 1; logEvent(state, side, t('log.plague', { who: side }), null, { kind: 'loss' }); }
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
      logEvent(state, 'player', t(win ? 'log.peaceUlt' : 'log.peaceUltFail', { place: tileName(state, target) }),
        { attacker: ra, attackerBonus: 0, defender: rd, defenderBonus: 1, win }, { tile: target.id, kind: 'preach' });
    }
  }
  // 검열 카드: 다음 장에 플레이어가 가장 자주 쓴 말을 봉인한다
  if (state.lawCard?.ban) {
    state.bannedNext = frequentNoun(state.revelations) ?? hashPick(t('eng.banWords'), state.config.seed, state.round);
    logEvent(state, 'enemy', t('log.ban', { word: state.bannedNext }), null, { kind: 'ban' });
  }
  // 신앙이 바닥난 채로 한 장을 버티면 경고, 그다음 장부터 신도가 율법파로 떠난다
  const p = state.sides.player;
  if (brokeFaith) {
    p.faithless += 1;
    if (p.faithless > RULES.heresyGrace && p.pop > 1) {
      p.pop -= 1; state.sides.enemy.pop += 1;
      logEvent(state, 'player', t('log.heresy'), null, { kind: 'loss' });
    } else {
      logEvent(state, 'player', t('log.faithless'), null, { kind: 'warn' });
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
    { key: 'pop', label: t('eng.score.pop'), n: s.pop, w: w.pop },
    { key: 'village', label: t('eng.score.village'), n: villageCount(state, side), w: w.village },
    { key: 'temple', label: t('eng.score.temple'), n: s.templeLevel, w: w.temple },
    { key: 'hp', label: t('eng.score.hp'), n: s.capitalHp, w: w.hp },
  ];
  if (w.wall) parts.push({ key: 'wall', label: t('eng.score.wall'), n: walls, w: w.wall });
  if (holyOwner(state) === side) parts.push({ key: 'holy', label: t('eng.score.holy'), n: 1, w: 2 });
  if (s.cathedral) parts.push({ key: 'cathedral', label: t('eng.score.cathedral'), n: s.cathedral, w: 1 });
  if (side === 'player' && state.destiny?.done) parts.push({ key: 'destiny', label: t('eng.score.destiny'), n: 1, w: DESTINY_POINTS });
  if (w.faith) parts.push({ key: 'faith', label: t('eng.score.faith'), n: Math.floor(s.faith / w.faith), w: 1, note: t('eng.score.faithNote', { n: w.faith }) });
  return { parts, total: parts.reduce((a, p) => a + p.n * p.w, 0) };
}
export function score(state, side) { return scoreBreakdown(state, side).total; }

// final: 마지막 장의 승점 판정까지 할지 (기적처럼 장 중간에 부를 때는 false)
// 남은 자: 수도가 서 있는 한 부족은 사라지지 않는다. 신도가 모두 쓰러지면 수도가 한 번 맞은 것처럼 흔들리고(내구도 -1,
// 대성당 한 단계) 한 명이 수도로 돌아온다. 그래서 전멸·전원 개종은 따로 이기는 길이 아니라 점령으로 가는 길이다
function remnant(state) {
  if (state.tutorial) return;
  for (const side of ['player', 'enemy']) {
    const s = state.sides[side]; const cap = capitalOf(state, side);
    if (s.pop > 0 || !cap || s.capitalHp <= 0 || state.winner) continue;
    s.capitalHp -= 1;
    logEvent(state, side, t('log.remnant', { who: side, hp: s.capitalHp }), null, { tile: cap.id, kind: 'loss' });
    if (s.capitalHp > 0) s.pop = 1;
    else { state.winner = other(side); state.winReason = t('eng.win.capital', { who: other(side) }); state.winKind = 'capital'; }
  }
}

export function checkVictory(state, final = true) {
  if (state.winner) return state.winner;
  remnant(state);
  if (state.winner) return state.winner;
  const { player: p, enemy: e } = state.sides;
  if (p.pop <= 0 && e.pop <= 0) { state.winner = 'draw'; state.winReason = t('eng.win.draw'); state.winKind = 'bothExtinct'; return state.winner; }
  if (e.pop <= 0) { state.winner = 'player'; state.winReason = t('eng.win.convertAll'); state.winKind = 'convertAll'; }
  if (!state.winner && state.edictOn && e.edict >= edictMax(state)) { state.winner = 'enemy'; state.winReason = t('eng.win.edict'); state.winKind = 'edict'; }
  if (p.pop <= 0) { state.winner = 'enemy'; state.winReason = t('eng.win.extinct'); state.winKind = 'extinct'; }
  // 신앙 승리는 장 끝에만 본다. 인구의 3/4이 우리 신도이고, 그 가운데 선교로 데려온 이가 있어야 한다 (칼과 번개만으로는 신앙이 아니다)
  const total = state.sides.player.pop + state.sides.enemy.pop;
  const fr = sizeRules(state).faith;
  if (!state.winner && final && total >= fr.pop && state.round >= fr.round && state.sides.player.pop >= total * 0.75 && (state.stats.converted ?? 0) >= faithConverts(state)) {
    state.winner = 'player'; state.winReason = t('eng.win.faith'); state.winKind = 'faith';
  }
  if (!state.winner && final && state.round >= state.maxRounds) {
    const ps = score(state, 'player');
    const es = score(state, 'enemy');
    state.winner = ps >= es ? 'player' : 'enemy';
    state.winReason = state.tutorial ? t('eng.win.tutorial', { ps, es }) : t('eng.win.rounds', { n: state.maxRounds, ps, es });
    state.winKind = state.tutorial ? 'tutorial' : 'score';
  }
  return state.winner;
}

// 계시를 내리면 교리 트랙이 오른다
export function recordRevelation(state, text, doctrine, spoken = spokenOf(state, text)) {
  const d = state.sides.player.doctrine;
  const sig = spoken.sig || undefined;
  if (spoken.echo) {
    state.revelations.push({ round: state.round, text, doctrine, echo: true, sig });
    state.streak = !doctrine ? null : state.streak?.doctrine === doctrine ? { doctrine, n: Math.min(3, state.streak.n + 1) } : { doctrine, n: 1 };
    logEvent(state, 'player', t('log.echo'), null, { kind: 'doctrine' });
    return;
  }
  if (doctrine && d[doctrine] < DOCTRINE_MAX) d[doctrine] += 1;
  state.revelations.push({ round: state.round, text, doctrine, sig });
  if (state.winner) return; // 판이 끝난 뒤에는 교리 대립이 점수를 바꾸지 않는다
  if (!doctrine) { state.streak = null; return; }
  // 교리 대립 (두 번째 판부터): 반대 교리가 흔들린다. 이미 얻은 특전 칸 아래로는 내려가지 않는다
  const opp = OPPOSED[doctrine];
  if (unlocked(state, 4) && d[opp] > perkFloor(d[opp])) {
    d[opp] -= 1;
    logEvent(state, 'player', t('log.doctrineShaken', { doc: t(`eng.doctrine.${opp}`) }), null, { kind: 'doctrine' });
  }
  // 같은 교리를 이어 말한 장 수 (교리 칸의 점 — 셋이면 율법파가 읽는다)
  state.streak = state.streak?.doctrine === doctrine ? { doctrine, n: Math.min(3, state.streak.n + 1) } : { doctrine, n: 1 };
}
const perkFloor = (v) => (v >= 6 ? 6 : v >= 4 ? 4 : v >= 2 ? 2 : 0);


// 금욕 서원: 할 수 있었던 공격·선교를 금했고 끝까지 하지 않았으면 은총. 공격을 금하면 율법파가 그 틈을 노린다
export function keepVows(state, forbidden, plan) {
  const types = [...new Set(forbidden.map((a) => a.type).filter((x) => x === 'attack' || x === 'preach'))];
  if (!types.length) return false;
  if (types.includes('attack')) state.vowNext = 'attack';
  if (plan.some((a) => types.includes(a.type))) return false;
  if (grantGrace(state, 1, t('eng.why.vow', { types }))) state.stats.vows = (state.stats.vows ?? 0) + 1;
  return true;
}
