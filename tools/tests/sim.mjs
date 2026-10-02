// 밸런스 측정기: lib.mjs(한 장 진행)를 써서 정책별로 판을 돌리고 지표를 모은다 (독립 평가 때 만든 것)
import { E, I, L, C, D, mulberry32, pick, REVELATIONS, SMART_REVS, doSpeak, doAccept, siteStep } from './lib.mjs';
export { E, I, L, C, D, mulberry32, pick, REVELATIONS, SMART_REVS, doSpeak, doAccept };

// ---------------- fixed scripts (text) ----------------
// 고정 문장 돌려쓰기 (평가자가 찾은 눈먼 전쟁 돌리기 포함) — rotm:<이름>, 기적은 smartMiracle
export const ROTATIONS = {
  war3: ['율법파에게 저주를, 쳐라, 마을을 넓혀라', '분노하라, 쳐라, 마을을 넓혀라, 곡식을 거두라', '성벽을 쌓아 지켜라'],
  war3b: ['율법파 마을을 쳐라, 마을을 넓혀라', '성벽을 쌓아 지켜라, 곡식을 거두라', '율법파를 공격하라, 나무를 베라'],
  preachwar: ['가장 약한 율법파 마을에 사랑을 전하라, 곡식을 거두라', '성벽 없는 율법파 마을을 쳐라, 마을을 세워라', '약한 율법파 마을에 말씀을 전하라, 나무를 베라'],
  // 평가자 C가 400개 돌리기에서 찾은 것 (늘 선교, 교리는 섞는다) · 무작위 탐색으로 찾은 가장 센 돌리기
  cmix: ['안개 너머를 탐험하라, 이웃에게 사랑을 전하라, 돌을 캐라', '이웃에게 사랑을 전하라, 마을을 넓혀라, 율법파가 노리는 곳에 마을을 세워라', '곡식을 거두라, 이웃에게 사랑을 전하라'],
  search: ['대성당을 지어라, 곡식을 거두라', '율법파가 노리는 곳에 마을을 세워라, 쳐라', '이웃에게 사랑을 전하라, 약한 율법파 마을에 사랑을 전하라'],
  // 평가자 C가 손으로 쓴 선교 순환 (14차)
  cpre: ['율법파 마을에 말씀을 전하라, 마을을 세우라', '기도하라, 곡식을 거두라', '말씀을 전하라, 성벽을 쌓아라'],
  // 14차 뒤 무작위 300개 탐색의 1위 (5×5 보통·어려움·6×6 74%)
  search2: ['이웃에게 사랑을 전하라, 곡식을 거두라, 신전을 높이 세우라', '대성당을 지어라, 안개 너머를 탐험하라, 율법파가 노리는 곳에 마을을 세워라', '이웃에게 사랑을 전하라, 율법파가 노리는 곳에 마을을 세워라, 기도하라'],
  mix4: ['마을을 넓히고 곡식을 거두라, 나무를 베라', '돌을 캐고 신전을 높여라', '이웃에게 사랑을 전하고 곡식을 거두라', '쳐라, 성벽을 쌓아 지켜라'],
};
export const FIXED = {
  silence: null,
  pray: '기도하고 경배하라',
  preach: '이웃에게 사랑을 전하라',
  war: '분노하라, 쳐라',
  food: '들판에서 곡식을 거두라',
  expand: '마을을 넓혀라',
  temple: '신전을 높이 세우라',
  wall: '성벽을 쌓아 지켜라',
  explore: '안개 너머를 탐험하라',
  expstone: '마을을 넓히고, 돌을 캐라',
  builder: '마을을 넓혀라, 돌을 캐라, 신전을 높이 세우라',
  warpreach: '쳐라, 그리고 이웃에게 전하라',
  peacepray: '이웃에게 사랑을 전하라, 기도하라',
  combo: '이웃에게 사랑을 전하라, 마을을 넓혀라, 곡식을 거두라',
  warcombo: '분노하라, 쳐라, 마을을 넓혀라, 곡식을 거두라',
};

// ---------------- smart bot (copied from tools/tests/fuzz.mjs, unchanged logic) ----------------
function evalState(s) {
  if (s.winner === 'player') return 1000;
  if (s.winner === 'enemy' || s.winner === 'draw') return -1000;
  const p = s.sides.player;
  return E.score(s, 'player') - E.score(s, 'enemy') + 0.35 * Math.min(p.faith, 12) + 0.15 * (p.food + p.wood + p.stone) - (p.food < p.pop ? 2 : 0) - 2 * E.braceAhead(s);
}
export function cloneLite(s) { return structuredClone({ ...s, log: [] }); }
export function smartChooseText(state, rng, { cands = SMART_REVS, samples = 2, record = null } = {}) {
  let best = null; let bestV = -Infinity;
  const vals = [];
  for (const text of cands) {
    let v = 0;
    for (let k = 0; k < samples; k++) {
      const s = cloneLite(state);
      s.rng.dice = Math.floor(rng() * 2 ** 31);
      const pd = doSpeak(s, text, { seal: true });
      doAccept(s, pd);
      v += evalState(s);
    }
    vals.push(v / samples);
    if (v > bestV) { bestV = v; best = text; }
  }
  if (record) record.push(vals);
  return best;
}
const CLAUSES = ['강에서 물고기를 잡아라', '들판에서 곡식을 거두라', '숲의 나무를 베어라', '산에서 돌을 캐라', '마을을 넓혀라', '이웃에게 사랑을 전하라',
  '쳐라', '성벽을 쌓아 지켜라', '신전을 높이 세우라', '대성당을 지어라', '기도하라', '안개 너머를 탐험하라', '가장 약한 율법파 마을을 쳐라', '약한 율법파 마을에 사랑을 전하라'];
function valueOf(state, text, rng, samples = 2, foresight = 0) {
  let v = 0;
  for (let k = 0; k < samples; k++) {
    const s = cloneLite(state);
    s.rng.dice = Math.floor(rng() * 2 ** 31);
    const pd = doSpeak(s, text, { seal: true });
    doAccept(s, pd);
    v += evalState(s);
    // 앞을 보는 숙련: 이 말씀이 부를 다음 장 율법 카드의 위협을 뺀다
    if (foresight && !s.winner) { const nx = E.nextLawCard(s, s.revelations.at(-1)?.doctrine, false); if (nx) v -= foresight * E.lawThreat(s, nx.card); }
  }
  return v / samples;
}
export function plannerText(state, rng, foresight = 0) {
  let best = null; let bestV = valueOf(state, null, rng, 2, foresight);
  let cur = [];
  for (let depth = 0; depth < 3; depth++) {
    let stepBest = null; let stepV = -Infinity;
    for (const c of CLAUSES) {
      if (cur.includes(c)) continue;
      const text = [...cur, c].join(', ');
      const v = valueOf(state, text, rng, 2, foresight);
      if (v > stepV) { stepV = v; stepBest = c; }
    }
    if (stepBest == null || stepV <= bestV) break;
    cur = [...cur, stepBest]; bestV = stepV; best = cur.join(', ');
  }
  return best;
}
export function smartMiracle(state) {
  const p = state.sides.player;
  const hand = state.miracleHand;
  const can = (id) => hand.includes(id) && p.faith >= D.MIRACLES.find((m) => m.id === id).cost + 1;
  if (p.food < p.pop && can('manna')) return ['manna'];
  if (p.food < p.pop && can('rain')) return ['rain'];
  if (can('lightning') && p.faith >= 7) {
    const t = state.tiles.find((x) => x.owner === 'enemy' && x.revealed && x.building === 'village' && x.wall) ?? state.tiles.find((x) => x.owner === 'enemy' && x.revealed);
    if (t) return ['lightning', t.id];
  }
  if (can('bounty') && p.faith >= 8) return ['bounty'];
  if (can('revive') && p.faith >= 8 && p.pop < E.popCap(state, 'player')) return ['revive'];
  if (can('pillar') && p.faith >= 7) return ['pillar'];
  return null;
}

// ---------------- rollout bot: one-step choice scored by Monte-Carlo playouts with the smart-lite policy ----------------
function playoutValue(s, rng) {
  // continue the game with a cheap policy: fixed best-looking script chosen greedily (1 sample, short list)
  let guard = 0;
  while (!s.winner && guard++ < 20) {
    E.startRound(s);
    if (s.miracleOffer) E.takeMiracle(s, s.miracleOffer[0]);
    const mir = smartMiracle(s); if (mir) E.castMiracle(s, mir[0], mir[1]);
    if (s.winner) break;
    const text = smartChooseText(s, rng, { cands: ROLL_CANDS, samples: 1 });
    const pd = doSpeak(s, text, { seal: true }); doAccept(s, pd);
    if (s.pendingSite && !s.winner) E.resolveSite(s, 'take');
  }
  if (s.winner === 'player') return 1 + 0.01 * (E.score(s, 'player') - E.score(s, 'enemy'));
  return -1 + 0.01 * (E.score(s, 'player') - E.score(s, 'enemy'));
}
const ROLL_CANDS = [null, '들판에서 곡식을 거두라', '마을을 넓히고, 돌을 캐라', '이웃에게 사랑을 전하라', '분노하라, 쳐라', '신전을 높이 세우라', '기도하라', '대성당을 지어라', '숲의 나무를 베어라'];
export function rolloutChooseText(state, rng, { cands = SMART_REVS, playouts = 3 } = {}) {
  let best = null; let bestV = -Infinity;
  for (const text of cands) {
    let v = 0;
    for (let k = 0; k < playouts; k++) {
      const s = cloneLite(state);
      s.rng.dice = Math.floor(rng() * 2 ** 31);
      const pd = doSpeak(s, text, { seal: true });
      doAccept(s, pd);
      if (s.pendingSite && !s.winner) E.resolveSite(s, 'take');
      v += s.winner ? (s.winner === 'player' ? 2 : -2) : playoutValue(s, rng);
    }
    if (v > bestV) { bestV = v; best = text; }
  }
  return best;
}

// ---------------- policies ----------------
// returns { text, reinterpret, seal } for the speak step, plus hooks
export function makePolicy(name) {
  if (name === 'random') return {
    miracle: (s, rng) => {
      if (rng() >= 0.45) return null;
      const id = pick(rng, s.miracleHand);
      let target;
      if (id === 'lightning') { const en = s.tiles.filter((t) => t.owner === 'enemy' && t.revealed); target = en.length ? pick(rng, en).id : pick(rng, s.tiles).id; }
      return [id, target];
    },
    offer: (s, rng) => pick(rng, s.miracleOffer),
    speak: (s, rng) => ({ text: pick(rng, REVELATIONS), reinterpret: rng() < 0.1, seal: rng() < 0.6 }),
    site: (s, rng) => pick(rng, ['take', 'send']),
  };
  if (name === 'randcmd') return { // plausible commands, no plan, no miracles
    miracle: () => null, offer: (s) => s.miracleOffer[0],
    speak: (s, rng) => ({ text: pick(rng, SMART_REVS), seal: false }), site: () => 'take',
  };
  if (name === 'smart') return {
    miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null),
    offer: (s) => s.miracleOffer.find((x) => ['manna', 'ark', 'revive'].includes(x)) ?? s.miracleOffer[0],
    speak: (s, rng, ctx) => ({ text: smartChooseText(s, rng, { record: ctx?.record }), seal: true }), site: () => 'take',
  };
  if (name === 'planner') return { // 숙련자 대용: 절 12개에서 한 장마다 최대 세 절을 탐욕적으로 골라 한 문장으로 잇는다
    miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null),
    offer: (s) => s.miracleOffer.find((x) => ['manna', 'ark', 'revive'].includes(x)) ?? s.miracleOffer[0],
    speak: (s, rng) => ({ text: plannerText(s, rng), seal: true }), site: () => 'take',
  };
  if (name === 'foresight') return { // planner + 다음 장 율법 카드를 내다본다
    miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null),
    offer: (s) => s.miracleOffer.find((x) => ['manna', 'ark', 'revive'].includes(x)) ?? s.miracleOffer[0],
    speak: (s, rng) => ({ text: plannerText(s, rng, +(globalThis.process?.env?.FORESIGHT ?? 1)), seal: true }), site: () => 'take',
  };
  if (name === 'warplan') return { // 정복 지향: 율법파 수도를 둘러싸고 칠 수 있으면 친다, 아니면 planner
    miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null),
    offer: (s) => s.miracleOffer.find((x) => ['pillar', 'lightning'].includes(x)) ?? s.miracleOffer[0],
    speak: (s, rng) => {
      const cap = s.tiles.find((t) => t.building === 'capital' && t.owner === 'enemy');
      const L = E.legalActions(s, 'player');
      const hit = L.find((a) => a.type === 'attack' && a.tile === cap?.id);
      if (hit && E.actionOdds(s, hit) >= 0.45) return { text: '율법파의 수도를 쳐라, 성벽을 쌓아 지켜라', seal: true };
      return { text: plannerText(s, rng), seal: true };
    }, site: () => 'take',
  };
  if (name === 'smartcath') return { // smart + one human rule: push the temple; once the cathedral is possible, wall the capital, build it, hold
    miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null),
    offer: (s) => s.miracleOffer.find((x) => ['manna', 'ark', 'revive'].includes(x)) ?? s.miracleOffer[0],
    speak: (s, rng) => {
      const p = s.sides.player; const L = E.legalActions(s, 'player');
      const cap = s.tiles.find((t) => t.building === 'capital' && t.owner === 'player');
      if (p.cathedral) return { text: '우리 수도에 성벽을 쌓아라, 기도하라, 곡식을 거두라', seal: true };
      if (L.some((a) => a.build === 'cathedral')) return { text: cap.wall || p.stone < 2 + E.buildCost(s, 'player', 'cathedral').stone ? '대성당을 지어라, 곡식을 거두라' : '우리 수도에 성벽을 쌓아라, 곡식을 거두라', seal: true };
      if (L.some((a) => a.build === 'temple')) return { text: '신전을 높이 세우라', seal: true };
      return { text: smartChooseText(s, rng), seal: true };
    }, site: () => 'take',
  };
  if (name === 'cathbot') return { // 대성당만 노리는 대본: 신전 → 마을 → 돌·나무 → 수도 성벽 → 대성당 → 버티기
    miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null),
    offer: (s) => s.miracleOffer.find((x) => ['manna', 'ark', 'revive'].includes(x)) ?? s.miracleOffer[0],
    speak: (s) => {
      const p = s.sides.player; const L = E.legalActions(s, 'player');
      const cap = s.tiles.find((t) => t.building === 'capital' && t.owner === 'player');
      if (p.cathedral) return { text: '우리 수도에 성벽을 쌓아라, 기도하라, 곡식을 거두라', seal: true };
      if (L.some((a) => a.build === 'cathedral')) return { text: cap.wall || p.stone < 2 + E.buildCost(s, 'player', 'cathedral').stone ? '대성당을 지어라, 곡식을 거두라' : '우리 수도에 성벽을 쌓아라, 곡식을 거두라', seal: true };
      if (p.templeLevel < 3) return { text: L.some((a) => a.build === 'temple') ? '신전을 높이 세우라, 돌을 캐라, 곡식을 거두라' : '산에서 돌을 캐라, 숲의 나무를 베어라', seal: true };
      const c = E.buildCost(s, 'player', 'cathedral'); const parts = [];
      if (E.villageCount(s, 'player') < E.cathedralVillages(s)) parts.push('마을을 넓혀라');
      if (p.stone < (c.stone ?? 0) + 2) parts.push('산에서 돌을 캐라');
      if (p.wood < (c.wood ?? 0) + 2) parts.push('숲의 나무를 베어라');
      if (p.faith < (c.faith ?? 0) + 2) parts.push('기도하라');
      if (p.food < p.pop + 1) parts.push('곡식을 거두라');
      return { text: (parts.length ? parts : ['곡식을 거두라', '기도하라']).slice(0, 3).join(', '), seal: true };
    }, site: () => 'take',
  };
  if (name === 'smart4') return { // same as smart but 4 dice samples
    miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null),
    offer: (s) => s.miracleOffer.find((x) => ['manna', 'ark', 'revive'].includes(x)) ?? s.miracleOffer[0],
    speak: (s, rng) => ({ text: smartChooseText(s, rng, { samples: 4 }), seal: true }), site: () => 'take',
  };
  if (name === 'smartnomir') return {
    miracle: () => null, offer: (s) => s.miracleOffer[0],
    speak: (s, rng) => ({ text: smartChooseText(s, rng), seal: true }), site: () => 'take',
  };
  if (name === 'rollout') return {
    miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null),
    offer: (s) => s.miracleOffer.find((x) => ['manna', 'ark', 'revive'].includes(x)) ?? s.miracleOffer[0],
    speak: (s, rng) => ({ text: rolloutChooseText(s, rng), seal: true }), site: () => 'take',
  };
  const rm = name.match(/^rotm:(\w+)$/);
  if (rm) {
    const lines = ROTATIONS[rm[1]];
    if (!lines) throw new Error('unknown rotation ' + rm[1]);
    return { miracle: (s) => (s.round < s.maxRounds ? smartMiracle(s) : null), offer: (s) => s.miracleOffer[0], speak: (s) => ({ text: lines[(s.round - 1) % lines.length], seal: false }), site: () => 'take' };
  }
  const m = name.match(/^(fix|fixm):(\w+)$/);
  if (m) {
    const text = FIXED[m[2]];
    if (text === undefined) throw new Error('unknown fixed ' + m[2]);
    return {
      miracle: m[1] === 'fixm' ? (s) => (s.round < s.maxRounds ? smartMiracle(s) : null) : () => null,
      offer: (s) => s.miracleOffer[0],
      speak: () => ({ text, seal: false }), site: () => 'take',
    };
  }
  throw new Error('unknown policy ' + name);
}

// ---------------- game runner with instrumentation ----------------
function elemSym(ks, L) { // number of ways to choose L distinct tiles, one option each
  const e = new Array(L + 1).fill(0); e[0] = 1;
  for (const k of ks) for (let j = L; j >= 1; j--) e[j] += e[j - 1] * k;
  return e[L];
}

export function runGame(cfg, policyName, botSeed, opts = {}) {
  const pol = makePolicy(policyName);
  const rng = mulberry32(botSeed);
  const state = E.createState(cfg);
  if (opts.dice != null) state.rng.dice = opts.dice | 0;
  if (opts.deckShuffle != null) { // permute already-dealt decks with an independent rng
    const r = mulberry32(opts.deckShuffle);
    const sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } };
    sh(state.eventDeck); sh(state.lawDeck);
  }
  const M = {
    w: null, k: null, r: 0, mr: state.maxRounds, h: [],
    en: { atkPlan: 0, atkCapPlan: 0, atkN: 0, atkW: 0, capture: 0, capHit: 0, prN: 0, prW: 0, turn: 0, blocked: 0 },
    pl: { atkN: 0, atkW: 0, prN: 0, prW: 0, capHit: 0, blocked: 0, types: {}, acc: 0, auto: 0, heeded: 0 },
    neg: 0, edictMax: 0, miracles: 0, silent: 0,
    legal: [], lim: [], plans: [], tiles: [], types: [], elimLim: [],
    pop: [], enPop: [],
  };
  let guard = 0; let logSeen = 0;
  const ctx = { record: opts.recordSmart ? [] : null };
  while (!state.winner && guard++ < 40) {
    E.startRound(state);
    if (state.miracleOffer) E.takeMiracle(state, pol.offer(state, rng));
    if (state.eventChoice) E.chooseEvent(state, state.eventChoice[0]);
    // decision density snapshot
    const legal = E.legalActions(state, 'player');
    const lim = E.actionLimit(state, 'player');
    const byTile = new Map(); for (const a of legal) byTile.set(a.tile, (byTile.get(a.tile) ?? 0) + 1);
    M.legal.push(legal.length); M.lim.push(lim); M.tiles.push(byTile.size);
    M.types.push(new Set(legal.map((a) => a.type + (a.build ?? ''))).size);
    M.plans.push(Math.log10(Math.max(1, elemSym([...byTile.values()], Math.min(lim, byTile.size)))));
    if (opts.textSpace) M.elimLim.push(textSpace(state, opts.textSpace));
    // miracle
    const mir = pol.miracle(state, rng);
    if (mir) { const r = E.castMiracle(state, mir[0], mir[1]); if (r.ok) M.miracles++; }
    if (state.winner) { M.r = state.round; break; }
    const sp = pol.speak(state, rng, ctx);
    const pd = doSpeak(state, sp.text, { reinterpret: !!sp.reinterpret, seal: !!sp.seal });
    if (!pd.text) M.silent++;
    for (const a of [...pd.accepted, ...pd.auto]) M.pl.types[a.type] = (M.pl.types[a.type] ?? 0) + 1;
    M.pl.acc += pd.accepted.length; M.pl.auto += pd.auto.length; M.pl.heeded += pd.auto.filter((a) => a.heeded).length;
    // enemy plan targets before resolve
    const intent = E.planEnemy(state);
    for (const a of intent) if (a.type === 'attack') { M.en.atkPlan++; if (state.tileAt[a.tile].building === 'capital') M.en.atkCapPlan++; }
    doAccept(state, pd);
    for (const l of state.log.slice(logSeen)) {
      const k = l.fx?.kind; const side = l.side;
      if (k === 'blocked') { if (side === 'enemy') M.en.blocked++; else if (side === 'player') M.pl.blocked++; }
      if (k === 'attack' && l.dice) {
        const o = side === 'enemy' ? M.en : side === 'player' ? M.pl : null;
        if (o) { o.atkN++; if (l.dice.win) o.atkW++; if (l.fx.capital) o.capHit++; if (side === 'enemy' && l.fx.capture) o.capture++; }
      }
      if (k === 'preach' && l.dice && (side === 'enemy' || side === 'player') && !/peaceUlt/.test(l.text)) {
        const o = side === 'enemy' ? M.en : M.pl; o.prN++; if (l.dice.win) o.prW++; if (side === 'enemy' && l.fx.convert) o.turn++;
      }
    }
    logSeen = state.log.length;
    if (state.pendingSite && !state.winner) siteStep(state, pol.site(state, rng));
    logSeen = state.log.length;
    for (const side of E.SIDES) { const s = state.sides[side]; for (const k of ['food', 'wood', 'stone', 'faith', 'pop']) if (s[k] < 0) M.neg++; }
    M.edictMax = Math.max(M.edictMax, state.sides.enemy.edict ?? 0);
    M.pop.push(state.sides.player.pop); M.enPop.push(state.sides.enemy.pop);
    M.r = state.round;
  }
  M.w = state.winner; M.k = state.winKind;
  M.h = state.history.map((x) => [x.ps, x.es]);
  M.ps = E.score(state, 'player'); M.es = E.score(state, 'enemy');
  M.pv = E.villageCount(state, 'player'); M.ev = E.villageCount(state, 'enemy');
  M.pt = state.sides.player.templeLevel; M.cath = state.sides.player.cathedral ?? 0;
  M.stats = { conv: state.stats.converted, capt: state.stats.captured, starved: state.stats.starved ?? 0, turned: state.stats.turned ?? 0 };
  M.dest = state.destiny?.done ? 1 : 0; M.judg = state.judgement; M.leader = state.leader;
  if (ctx.record) M.smartVals = ctx.record;
  return M;
}

// how many distinct player plans can be expressed through the keyword interpreter using a text list
export function textSpace(state, list) {
  const plans = new Set();
  const typeProfiles = new Set();
  for (const text of list) {
    const s = cloneLite(state);
    const pd = doSpeak(s, text, {});
    const keys = [...pd.accepted, ...pd.auto].map((a) => a.key).sort();
    plans.add(keys.join('|'));
    typeProfiles.add([...pd.accepted, ...pd.auto].map((a) => a.type + (a.build ?? '') + (a.gather ?? '')).sort().join('|'));
  }
  return [plans.size, typeProfiles.size];
}
