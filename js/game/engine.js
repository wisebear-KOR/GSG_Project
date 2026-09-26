// 규칙 엔진: 상태 생성, 가능한 행동, 명령 검증, 율법파(오토마), 라운드 해결, 유지, 승리 판정
// LLM은 이 엔진이 만든 행동 목록 중에서 고르기만 한다. 수치와 판정은 전부 여기서 한다.

import {
  TERRAIN, RESOURCE_NAME, GATHER_VERB, COST, MAX_TEMPLE, CAPITAL_HP, MAX_ACTIONS, RULES,
  DOCTRINES, DOCTRINE_MAX, EVENTS, LAW_CARDS, MIRACLES, DIFFICULTY, MAP_SIZES, PLAYER_START, TUTORIAL, ENEMY_LEADERS,
} from './data.js';
import { generateMap } from './mapgen.js';
import { frequentNoun, hashPick } from './lore.js';

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
    maxRounds: tutorial ? TUTORIAL.rounds : (MAP_SIZES[cfg.size]?.rounds ?? 12),
    enemyBonus: tutorial ? TUTORIAL.enemyBonus : diff.enemyBonus,
    tiles: [], tileAt: {}, sides: {}, eventDeck: [], lawDeck: [],
    event: null, lawCard: null, rainActive: false, leader: null, bannedWords: [], bannedNext: null, eventChoice: null,
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
  const start = tutorial ? TUTORIAL.start : { player: PLAYER_START, enemy: diff.enemyStart };
  for (const side of SIDES) {
    state.sides[side] = {
      ...start[side], templeLevel: 1, capitalHp: CAPITAL_HP, faithless: 0,
      doctrine: Object.fromEntries(DOCTRINES.map((d) => [d, 0])),
    };
  }
  if (tutorial) {
    // 튜토리얼은 사건과 율법 카드 순서가 정해져 있다 (뒤에서부터 뽑으므로 거꾸로 넣는다)
    state.eventDeck = TUTORIAL.events.map((id) => EVENTS.find((e) => e.id === id)).reverse();
    state.lawDeck = TUTORIAL.lawCards.map((id) => LAW_CARDS.find((c) => c.id === id)).reverse();
  } else {
    const leaders = Object.entries(ENEMY_LEADERS).filter(([, l]) => !l.notOn?.includes(cfg.difficulty)).map(([id]) => id);
    state.leader = hashPick(leaders, 'leader', cfg.seed, cfg.difficulty);
    // 판 전체에 쓸 카드를 미리 나눠 둔다 (어려움은 장마다 두 장을 보므로 두 배)
    state.eventDeck = dealDeck(state, EVENTS, state.maxRounds + 2);
    state.lawDeck = dealDeck(state, lawPool(state), state.maxRounds * 2 + 2);
  }
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
  return pool;
}

// 우리 신도가 닿는 곳(수도 2칸, 마을 1칸)은 항상 보인다
export function updateVision(state) {
  for (const t of reach(state, 'player')) t.revealed = true;
  const home = capitalOf(state, 'player');
  if (home) for (const t of state.tiles) if (distance(t, home) <= 2) t.revealed = true;
}

export const capitalOf = (state, side) => state.tiles.find((t) => t.owner === side && t.building === 'capital');
export const ownedTiles = (state, side) => state.tiles.filter((t) => t.owner === side);
export const villageCount = (state, side) => state.tiles.filter((t) => t.owner === side && t.building === 'village').length;
// 교리 궁극(6칸)은 8장부터 깨어난다 (한 교리만 외쳐 6장 만에 게임을 끝내지 못하게)
export const ULT_ROUND = 8;
export const hasUlt = (state, side, key) => side === 'player' && state.sides[side].doctrine[key] >= DOCTRINE_MAX && state.round >= ULT_ROUND;
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
  const bonus = side === 'enemy' ? state.enemyBonus : (s.doctrine.wisdom >= 4 ? 1 : 0);
  const limit = Math.min(MAX_ACTIONS, 2 + s.templeLevel + Math.floor(s.pop / RULES.followersPerAction) + bonus);
  return Math.max(0, Math.min(limit, s.pop));
}

// 매 장 들어오는 신앙: 기본 1 + 신도 3명당 1 + (신전 단계 - 1)
export const faithIncome = (state, side) => {
  const s = state.sides[side];
  return RULES.baseFaithIncome + Math.floor(s.pop / RULES.followersPerFaith) + (s.templeLevel - 1);
};

// 신도 수가 상대보다 3명 이상 많으면 선교·공격 주사위 +1
const superiority = (s, f) => (s.pop >= f.pop + RULES.superiority ? 1 : 0);

// ---------- 행동 설명 ----------
// 받침에 맞는 조사를 붙인다. "우리 마을(D2)"처럼 괄호 앞 글자를 기준으로 한다
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
  const who = tile.owner === 'player' ? '우리' : '율법파';
  if (tile.building === 'capital') return `${who} 신전(${tile.id})`;
  if (tile.building === 'village') return `${who} 마을(${tile.id})`;
  return `${TERRAIN[tile.terrain].name}(${tile.id})`;
}

function costText(cost) {
  return Object.entries(cost).map(([k, v]) => `${RESOURCE_NAME[k]} -${v}`).join(', ');
}
const canPay = (s, cost) => Object.entries(cost).every(([k, v]) => s[k] >= v);
const pay = (s, cost) => { for (const [k, v] of Object.entries(cost)) s[k] -= v; };

export function gatherAmount(state, side, tile) {
  const terr = TERRAIN[tile.terrain];
  let n = terr.amount;
  if (terr.gather === 'food') {
    if (state.event?.id === 'drought' && !state.rainActive) n -= 1;
    if (state.event?.id === 'harvest' && tile.terrain === 'plain') n += 1;
    if (state.sides[side].doctrine.abundance >= 2) n += 1;
  }
  return Math.max(0, n);
}

function describe(state, side, a) {
  const t = state.tileAt[a.tile];
  const place = tileName(state, t, side);
  const s = state.sides[side];
  switch (a.type) {
    case 'gather': return `${place}에서 ${t.terrain === 'river' ? '물고기를 잡는다' : GATHER_VERB[a.gather]} (${RESOURCE_NAME[a.gather]} +${gatherAmount(state, side, t)})`;
    case 'pray': return `신전에서 기도한다 (신앙 +${2 + (s.doctrine.wisdom >= 2 ? 1 : 0)})`;
    case 'build':
      if (a.build === 'village') return `${place}에 마을을 세운다 (${costText(COST.village)}, 영토 확장)`;
      if (a.build === 'wall') return `${place}에 성벽을 쌓는다 (${costText(COST.wall)}, 방어 +2)`;
      if (a.build === 'temple') return `신전을 높인다 (${costText(COST.temple(s.templeLevel))}, 행동 수 +1)`;
      return `대성당을 짓는다 (${costText(COST.cathedral)}, 불가사의 승리)`;
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
    const terr = TERRAIN[t.terrain];
    if (terr.gather && t.owner !== foe && t.building !== 'capital') add({ type: 'gather', tile: t.id, gather: terr.gather });
    if (!t.owner && !t.building && canPay(s, COST.village)) add({ type: 'build', build: 'village', tile: t.id });
    if (t.owner === foe) {
      add({ type: 'preach', tile: t.id });
      add({ type: 'attack', tile: t.id });
    }
  }
  for (const t of ownedTiles(state, side)) {
    if (t.building && !t.wall && canPay(s, COST.wall)) add({ type: 'build', build: 'wall', tile: t.id });
  }
  if (cap) {
    add({ type: 'pray', tile: cap.id });
    if (s.templeLevel < MAX_TEMPLE && canPay(s, COST.temple(s.templeLevel))) add({ type: 'build', build: 'temple', tile: cap.id });
    if (side === 'player' && s.templeLevel === MAX_TEMPLE && canPay(s, COST.cathedral)) add({ type: 'build', build: 'cathedral', tile: cap.id });
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
  const costOf = (a) => (a.type !== 'build' ? null : a.build === 'temple' ? COST.temple(s.templeLevel) : COST[a.build]);
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
  const rules = [...card.rules, ...card.rules];
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
  state.event = state.eventDeck.pop();
  // 지혜 궁극: 다가올 계절 두 장 중 하나를 고른다 (고르지 않으면 첫 장)
  state.eventChoice = hasUlt(state, 'player', 'wisdom') && state.eventDeck.length ? [state.event.id, state.eventDeck.at(-1).id] : null;
  // 지난 장 검열 카드가 봉인한 말은 이번 장에만 효력이 있다
  state.bannedWords = state.bannedNext ? [state.bannedNext] : [];
  state.bannedNext = null;
  state.lawCard = state.lawDeck.pop();
  // 어려움: 율법 카드를 두 장 보고 지금 더 위협적인 쪽을 쓴다 (다른 한 장은 버린다)
  if (state.config.difficulty === 'hard' && !state.tutorial) {
    const alt = state.lawDeck.pop();
    if (lawThreat(state, alt) > lawThreat(state, state.lawCard)) state.lawCard = alt;
  }
  state.first = state.round % 2 === 1 ? 'player' : 'enemy';
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
}

// 계시 비용: 기본(30자 이하 1, 넘으면 2) + 봉인된 말을 쓰면 +1
export function revelationCostFor(state, text) {
  const base = text.trim().length > 30 ? 2 : 1;
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

export function castMiracle(state, id, targetTile) {
  const m = MIRACLES.find((x) => x.id === id);
  const s = state.sides.player;
  if (state.miracleUsed || s.faith < m.cost) return { ok: false, text: '신앙이 부족하거나 이미 기적을 썼다.' };
  if (m.id === 'lightning') {
    const t = state.tileAt[targetTile];
    if (!t || t.owner !== 'enemy' || !t.revealed) return { ok: false, text: '보이는 율법파 칸을 골라야 한다.' };
    s.faith -= m.cost;
    if (t.wall) { t.wall = false; logEvent(state, 'player', `⚡ 번개가 ${tileName(state, t)}의 성벽을 무너뜨렸다.`, null, { tile: t.id, kind: 'lightning' }); }
    else { state.sides.enemy.pop = Math.max(0, state.sides.enemy.pop - 1); logEvent(state, 'player', `⚡ 번개가 ${tileName(state, t)}에 떨어져 율법파 1명이 쓰러졌다.`, null, { tile: t.id, kind: 'lightning' }); }
  } else if (m.id === 'rain') {
    s.faith -= m.cost; s.food += 3; state.rainActive = true;
    logEvent(state, 'player', '🌧️ 단비가 내렸다. 식량 +3.', null, { kind: 'rain', gain: { food: 3 } });
  } else {
    s.faith -= m.cost; s.wood += 2; s.stone += 2;
    logEvent(state, 'player', '🎁 풍요의 기적. 목재 +2, 돌 +2.', null, { kind: 'bounty', gain: { wood: 2, stone: 2 } });
  }
  state.miracleUsed = true;
  checkVictory(state);
  return { ok: true };
}

// 보드에 보이는 상태만 복사한다 (연출 재생용)
export function snapshot(state) {
  return {
    tiles: state.tiles.map((t) => ({ ...t })),
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
  state.history.push({
    round: state.round, ps: score(state, 'player'), es: score(state, 'enemy'),
    res: { food: p.food, wood: p.wood, stone: p.stone, faith: p.faith, pop: p.pop }, text: null,
  });
}

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
  const ev = (id) => EVENTS.find((e) => e.id === id);
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
      s[a.gather] += n;
      return logEvent(state, side, `${subj(side)} ${place}에서 ${josa(RESOURCE_NAME[a.gather], '을', '를')} ${n} 얻었다.`, null, { tile: t.id, kind: 'gain', gain: { [a.gather]: n } });
    }
    case 'pray': {
      const n = 2 + (s.doctrine.wisdom >= 2 ? 1 : 0);
      s.faith += n;
      return logEvent(state, side, `${subj(side)} 기도해 신앙을 ${n} 얻었다.`, null, { tile: t.id, kind: 'gain', gain: { faith: n } });
    }
    case 'build': {
      const cost = a.build === 'temple' ? COST.temple(s.templeLevel) : COST[a.build];
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
        return logEvent(state, side, `${poss(side)} 신전이 ${s.templeLevel}단계로 높아졌다.`, null, { tile: t.id, kind: 'build', icon: side === 'player' ? '⛪' : '🏛️' });
      }
      pay(s, cost);
      state.winner = side; state.winReason = '대성당 완공';
      return logEvent(state, side, `${subj(side)} 대성당을 완공했다!`, null, { tile: t.id, kind: 'cathedral' });
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
      // 율법에 매인 자들은 설득하기 어렵다: 기본 방어 +1, 수도·성벽 안이면 +1씩
      const bonus = (s.doctrine.peace >= 2 ? 1 : 0) + (s.doctrine.peace >= 4 ? 1 : 0);
      const defBonus = (side === 'player' ? 1 : 0) + (t.building === 'capital' ? 1 : 0) + (t.wall ? 1 : 0);
      const ra = d6(state); const rd = d6(state);
      const win = ra + bonus > rd + defBonus;
      const dice = { attacker: ra, attackerBonus: bonus, defender: rd, defenderBonus: defBonus, win };
      if (win) {
        f.pop -= 1; s.pop += 1;
        // 마을에 믿음의 표식이 두 번 쌓이면 그 마을이 넘어온다 (수도는 제외, 성벽은 남는다)
        if (t.building === 'village') {
          t.faithMarks = t.faithMarks?.side === side ? { side, n: t.faithMarks.n + 1, round: state.round } : { side, n: 1, round: state.round };
          if (t.faithMarks.n >= 2) {
            t.owner = side; t.faithMarks = null;
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
        + (side === 'enemy' && state.event?.id === 'threat' ? 1 : 0);
      const defBonus = (t.wall ? 2 : 0) + (t.building === 'capital' ? 1 : 0) + superiority(f, s);
      const ra = d6(state); const rd = d6(state);
      const win = ra + bonus > rd + defBonus;
      const dice = { attacker: ra, attackerBonus: bonus, defender: rd, defenderBonus: defBonus, win };
      if (!win) {
        if (hasUlt(state, side, 'war') && s.faith >= 2) {
          s.faith -= 2;
          return logEvent(state, side, `${poss(side)} 공격이 ${place}에서 막혔다. 전쟁의 가호가 신앙 2를 태워 쓰러질 자를 살렸다.`, dice, { tile: t.id, kind: 'attack' });
        }
        s.pop = Math.max(0, s.pop - 1);
        return logEvent(state, side, `${poss(side)} 공격이 ${place}에서 막혔다. 공격자 1명이 쓰러졌다.`, dice, { tile: t.id, kind: 'attack' });
      }
      f.pop = Math.max(0, f.pop - 1);
      if (t.building === 'capital') {
        f.capitalHp -= 1;
        logEvent(state, side, `${subj(side)} ${J(place, '을', '를')} 쳤다! 수도 내구도 ${f.capitalHp}.`, dice, { tile: t.id, kind: 'attack', capital: true });
        if (f.capitalHp <= 0) { state.winner = side; state.winReason = '적 수도 점령'; }
        return;
      }
      t.owner = side; t.wall = false; t.faithMarks = null;
      return logEvent(state, side, `${subj(side)} ${J(place, '을', '를')} 빼앗았다!`, dice, { tile: t.id, kind: 'attack', capture: true });
    }
    default:
  }
}

function upkeep(state) {
  for (const side of SIDES) {
    const s = state.sides[side];
    if (s.pop <= 0) continue; // 사라진 부족은 다시 늘어나지 않는다
    const who = side === 'player' ? '우리 부족' : '율법파';
    // 수도는 식량 2, 마을은 식량 1을 스스로 생산한다. 신도 1명당 식량 1을 먹는다
    s.food += 2 + villageCount(state, side);
    s.food -= s.pop;
    if (s.food < 0) {
      s.food = 0; s.pop = Math.max(0, s.pop - 1);
      logEvent(state, side, `${josa(who, '이', '가')} 굶주려 1명을 잃었다.`, null, { kind: 'loss' });
    } else {
      // 식량에 여유가 있을 때만 늘어난다: 증가 비용 + 신도 절반만큼의 비축
      const growCost = s.doctrine.abundance >= 4 ? 1 : 2;
      if (s.pop < popCap(state, side) && s.food >= growCost + Math.ceil(s.pop / 2)) {
        s.food -= growCost; s.pop += 1;
        logEvent(state, side, `${who}에 새 ${side === 'player' ? '신도가' : '구성원이'} 태어났다.`, null, { kind: 'birth' });
      }
    }
    s.faith += faithIncome(state, side);
    if (state.event?.id === 'plague' && s.pop > 1) { s.pop -= 1; logEvent(state, side, `역병으로 ${who} 1명을 잃었다.`, null, { kind: 'loss' }); }
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
    logEvent(state, 'enemy', `율법파가 검열을 선포했다. 다음 장에는 '${state.bannedNext}'라는 말을 쓰지 못한다.`, null, { kind: 'ban' });
  }
  // 신앙이 바닥난 채로 한 장을 버티면 경고, 그다음 장부터 신도가 율법파로 떠난다
  const p = state.sides.player;
  if (p.faith <= 0) {
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
  updateVision(state);
  checkVictory(state);
}

export function score(state, side) {
  const s = state.sides[side];
  return s.pop * 2 + villageCount(state, side) * 3 + s.templeLevel * 2 + s.capitalHp;
}

export function checkVictory(state) {
  if (state.winner) return state.winner;
  const { player: p, enemy: e } = state.sides;
  if (p.pop <= 0 && e.pop <= 0) { state.winner = 'draw'; state.winReason = '양쪽 부족이 모두 사라짐'; return state.winner; }
  if (e.pop <= 0) { state.winner = 'player'; state.winReason = '율법파 전원 개종·소멸'; }
  if (p.pop <= 0) { state.winner = 'enemy'; state.winReason = '신도가 모두 사라짐'; }
  const total = state.sides.player.pop + state.sides.enemy.pop;
  if (!state.winner && total >= 8 && state.round >= 6 && state.sides.player.pop >= total * 0.75) {
    state.winner = 'player'; state.winReason = '신앙 승리 (인구의 3/4이 신도)';
  }
  if (!state.winner && state.round >= state.maxRounds) {
    const ps = score(state, 'player');
    const es = score(state, 'enemy');
    state.winner = ps >= es ? 'player' : 'enemy';
    state.winReason = state.tutorial ? `튜토리얼 완료 — 승점 ${ps} : ${es}` : `${state.maxRounds}장 종료 — 승점 ${ps} : ${es}`;
  }
  return state.winner;
}

// 계시를 내리면 교리 트랙이 오른다
export function recordRevelation(state, text, doctrine) {
  const d = state.sides.player.doctrine;
  if (doctrine && d[doctrine] < DOCTRINE_MAX) d[doctrine] += 1;
  state.revelations.push({ round: state.round, text, doctrine });
}
