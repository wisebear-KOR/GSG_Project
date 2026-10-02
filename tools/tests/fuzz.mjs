import { E, I, L, C, D, mulberry32, pick, REVELATIONS, SMART_REVS, doSpeak, doAccept, siteStep, roundTrip, deepDiff } from './lib.mjs';

const BAD = /undefined|NaN|\[object/;
const keysOf = (plan) => plan.map((a) => a.key + '@' + a.side).join('|');

// ---------------- reasonable bot (one-step lookahead with resampled dice) ----------------
function evalState(s) {
  if (s.winner === 'player') return 1000;
  if (s.winner === 'enemy' || s.winner === 'draw') return -1000;
  const p = s.sides.player;
  return E.score(s, 'player') - E.score(s, 'enemy') + 0.35 * Math.min(p.faith, 12) + 0.15 * (p.food + p.wood + p.stone) - (p.food < p.pop ? 2 : 0);
}
function cloneLite(s) { return structuredClone({ ...s, log: [] }); }
function smartChooseText(state, rng) {
  let best = null; let bestV = -Infinity;
  for (const text of SMART_REVS) {
    let v = 0;
    for (let k = 0; k < 2; k++) {
      const s = cloneLite(state);
      s.rng.dice = Math.floor(rng() * 2 ** 31);
      const pd = doSpeak(s, text, { seal: true });
      doAccept(s, pd);
      v += evalState(s);
    }
    if (v > bestV) { bestV = v; best = text; }
  }
  return best;
}
function smartMiracle(state, rng) {
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

// ---------------- one game ----------------
export function playGame(cfg, botSeed, { policy = 'random', hydrate = true, checks = true } = {}) {
  const rng = mulberry32(botSeed);           // decisions
  const hrng = mulberry32(botSeed ^ 0x9e3779b9); // hydrate decisions (independent so choices match with/without)
  const V = [];
  const flag = (type, msg, round) => V.push({ type, msg, round });
  const stat = { miracleOffers: 0, sites: 0, siteChoices: 0, propSealed: 0, propWon: 0, propFailed: 0, pOverCap: 0, intentDriftAfterMiracle: 0, eventChoices: 0, miraclesCast: 0, hydrates: 0 };
  let state;
  try {
    state = E.createState(cfg);
  } catch (e) { flag('exception', `createState: ${e.stack.split('\n').slice(0, 3).join(' | ')}`, 0); return { V, stat }; }
  let guard = 0;
  let logSeen = 0;
  const rt = (where) => {
    let h;
    try { h = roundTrip(state); } catch (e) { flag('exception', `hydrate@${where}: ${e.message}`, state.round); return; }
    const d = deepDiff(state, h);
    if (d) flag('hydrate-diff', `${where}: ${d}`, state.round);
    stat.hydrates += 1;
    state = h;
  };
  try {
    while (!state.winner && guard++ < 40) {
      E.startRound(state);
      const R = state.round;
      if (checks && R > state.maxRounds) flag('round>max', `round ${R} > maxRounds ${state.maxRounds}`, R);
      const intentStart = keysOf(E.enemyIntent(state));
      if (state.miracleOffer) {
        stat.miracleOffers += 1;
        const offer = state.miracleOffer;
        const id = policy === 'smart' ? (offer.find((x) => ['manna', 'ark', 'revive'].includes(x)) ?? offer[0]) : pick(rng, offer);
        if (!E.takeMiracle(state, id)) flag('takeMiracle', `refused offered ${id}`, R);
        if (state.miracleHand.length !== new Set(state.miracleHand).size) flag('miracleHand-dup', state.miracleHand.join(','), R);
      }
      if (state.eventChoice) {
        stat.eventChoices += 1;
        const before = state.event.id;
        const id = pick(rng, state.eventChoice);
        E.chooseEvent(state, id);
        if (state.event.id !== id) flag('chooseEvent', `chose ${id} but event is ${state.event.id} (was ${before})`, R);
      }
      if (hydrate && hrng() < 0.25) rt('speak');
      // miracles
      let modsBefore = null;
      let mir = null;
      if (policy === 'smart') mir = state.round < state.maxRounds ? smartMiracle(state, rng) : null;
      else if (rng() < 0.45) {
        const id = pick(rng, state.miracleHand);
        let target;
        if (id === 'lightning') {
          const enemies = state.tiles.filter((t) => t.owner === 'enemy' && t.revealed);
          target = rng() < 0.85 && enemies.length ? pick(rng, enemies).id : pick(rng, state.tiles).id;
        }
        mir = [id, target];
      }
      if (mir) {
        const pre = JSON.stringify(state.sides.player);
        const r = E.castMiracle(state, mir[0], mir[1]);
        if (!r.ok && JSON.stringify(state.sides.player) !== pre) flag('miracle-fail-side-effect', `${mir[0]} failed but player changed`, R);
        if (r.ok) stat.miraclesCast += 1;
        // second cast must be refused
        const r2 = E.castMiracle(state, mir[0], mir[1]);
        if (r.ok && r2.ok) flag('miracle-twice', `${mir[0]} cast twice in one round`, R);
        modsBefore = { ...state.roundMods };
        // 번개로 끝나는 판은 UI가 받는 정상 경로(endByMiracle)다 — 그 밖의 기적이 판을 끝내면 이상
        if (r.ok && state.winner && mir[0] !== 'lightning') flag('winner-before-resolve', `castMiracle(${mir[0]}) ended game in speak phase of round ${R}/${state.maxRounds}: ${state.winReason}`, R);
      }
      if (checks && intentStart !== keysOf(E.enemyIntent(state))) stat.intentDriftAfterMiracle += 1;
      if (state.winner && mir?.[0] === 'lightning') break; // UI ends the game only on lightning; other miracles fall through to a voided resolve
      // speak
      const text = policy === 'smart' ? smartChooseText(state, rng) : pick(rng, REVELATIONS);
      const pd = doSpeak(state, text, { reinterpret: policy === 'random' && rng() < 0.1, seal: policy === 'smart' || rng() < 0.6 });
      if (checks) {
        const limit = E.actionLimit(state, 'player');
        const all = [...pd.accepted, ...pd.auto];
        if (all.length > limit) flag('over-limit', `${all.length} actions > limit ${limit}`, R);
        if (new Set(all.map((a) => a.tile)).size !== all.length) flag('dup-tile', all.map((a) => a.key).join(','), R);
        const legal = new Set(E.legalActions(state, 'player').map((a) => a.key));
        for (const a of all) if (!legal.has(a.key)) flag('illegal-order', a.key, R);
        for (const a of pd.auto) if (pd.forbiddenKeys.includes(a.key)) flag('auto-forbidden', a.key, R);
      }
      const intent = E.enemyIntent(state).map(({ shown, ...a }) => a);
      if (pd.seal && pd.prophecy && !state.prophecy) stat.propSealed += 1;
      const propBefore = state.stats.prophecies;
      const graceBefore = state.log.filter((l) => l.fx?.kind === 'grace' && l.round === R).length;
      const plan = doAccept(state, pd);
      if (checks && keysOf(intent) !== keysOf(plan)) flag('intent!=plan', `shown ${keysOf(intent)} vs executed ${keysOf(plan)}`, R);
      if (state.stats.prophecies > propBefore) stat.propWon += 1;
      if (state.log.slice(logSeen).some((l) => /예언이 빗나갔다/.test(l.text))) stat.propFailed += 1;
      if (modsBefore && !pd.text) for (const k of ['ark', 'tongues', 'pillar']) if (modsBefore[k] && !state.roundMods[k]) flag('silence-wipes-miracle', `silence cleared roundMods.${k} set by miracle ${mir[0]}`, R);
      if (state.pendingSite) {
        stat.siteChoices += 1;
        if (!state.winner) siteStep(state, policy === 'smart' ? 'take' : pick(rng, ['take', 'send', 'bogus']));
      }
      // ---- invariants ----
      if (checks) {
        const newLogs = state.log.slice(logSeen);
        stat.sites += newLogs.filter((l) => l.fx?.kind === 'treasure' && /—/.test(l.text) || l.fx?.kind === 'site').length;
        const grace = state.log.filter((l) => l.fx?.kind === 'grace' && l.round === R);
        const g = grace.reduce((s, l) => s + (l.fx.gain?.faith ?? 0), 0);
        if (g > 1) flag('grace>1', `grace ${g} in round`, R);
        if (state.grace.used > 1) flag('grace>1', `grace.used ${state.grace.used}`, R);
        for (const side of E.SIDES) {
          const s = state.sides[side];
          for (const k of ['food', 'wood', 'stone', 'faith', 'pop', 'capitalHp', 'templeLevel', 'faithless']) {
            if (typeof s[k] !== 'number' || !Number.isFinite(s[k])) flag('NaN', `${side}.${k}=${s[k]}`, R);
            else if (s[k] < 0) flag('negative', `${side}.${k}=${s[k]}`, R);
          }
          for (const k of Object.keys(s.doctrine)) if (s.doctrine[k] < 0 || s.doctrine[k] > D.DOCTRINE_MAX) flag('doctrine-range', `${side}.${k}=${s.doctrine[k]}`, R);
          const caps = state.tiles.filter((t) => t.building === 'capital' && t.owner === side);
          if (caps.length !== 1) flag('capital-count', `${side} has ${caps.length} capitals`, R);
        }
        const p = state.sides.player;
        if (p.pop > E.popCap(state, 'player')) stat.pOverCap += 1;
        for (const t of state.tiles) {
          if (t.faithMarks && !(t.faithMarks.n >= 1 && t.faithMarks.n <= E.FLIP_MARKS - 1 && Number.isInteger(t.faithMarks.n))) flag('faithMarks', `${t.id} n=${t.faithMarks.n}`, R);
          if (t.faithMarks && t.building !== 'village') flag('faithMarks-nonvillage', t.id, R);
          if (t.faithMarks && t.faithMarks.side === t.owner) flag('faithMarks-own', `${t.id} marks by owner ${t.owner}`, R);
          if (t.building && !t.owner) flag('ownerless-building', `${t.id} ${t.building}`, R);
          if (t.owner && !t.building) flag('owned-empty', `${t.id} owned by ${t.owner} w/o building`, R);
          if (t.wall && !t.building) flag('wall-empty', t.id, R);
        }
        // births must respect popCap at the time (snap has tiles+sides)
        for (const l of newLogs) {
          if (l.fx?.kind === 'birth' && l.snap && /태어났다/.test(l.text)) {
            const vc = l.snap.tiles.filter((t) => t.owner === l.side && t.building === 'village').length;
            const cap = 3 + 2 * vc + (E.hasUlt({ ...state, sides: l.snap.sides }, l.side, 'abundance') ? 2 : 0);
            if (l.snap.sides[l.side].pop > cap) flag('growth>cap', `${l.side} pop ${l.snap.sides[l.side].pop} > cap ${cap} after birth`, R);
          }
        }
        // 남은 자: 판이 이어지면 장 끝에 어느 쪽도 신도 0으로 남지 않는다 (수도가 흔들리고 한 명이 돌아온다)
        for (const side of ['player', 'enemy']) if (!state.winner && !state.tutorial && state.sides[side].pop <= 0) flag('extinct-no-remnant', `${side} pop 0 at round end but game continued`, R);
        if (R >= state.maxRounds && !state.winner) flag('no-winner-at-max', `round ${R}`, R);
        for (const l of newLogs) {
          if (typeof l.text !== 'string' || !l.text.trim()) flag('log-empty', JSON.stringify(l).slice(0, 120), R);
          else if (l.side !== 'god' && BAD.test(l.text)) flag('log-bad', `[${l.side}] ${l.text}`, R);
        }
        const hist = state.history.at(-1);
        if (!hist || hist.round !== R) flag('history', `no history for round ${R}`, R);
      }
      logSeen = state.log.length;
      if (hydrate && hrng() < 0.2) { rt('resolved'); logSeen = state.log.length; }
    }
    if (!state.winner) flag('no-end', `game did not end after ${guard} rounds`, state.round);
    // chronicle
    const h = state.history;
    const summary = C.summarizeGame(state, { comeback: state.winner === 'player' && h.some((x) => x.es - x.ps >= 6), capitalFull: state.sides.player.capitalHp === D.CAPITAL_HP });
    const ep = C.epilogue(state);
    const ach = C.evaluateAchievements(summary);
    C.closestAchievement(summary, {});
    const scene = C.decisiveScene(state); const luck = C.diceLuck(state); const top = C.topRevelations(state);
    const str = JSON.stringify({ ep, summary: { ...summary, date: 'x' }, scene, top });
    if (/undefined|NaN|\[object/.test(str.replace(/"text":"[^"]*"/g, ''))) flag('chronicle-bad', str.match(/.{0,60}(undefined|NaN|\[object).{0,30}/)?.[0], state.round);
    if (!ep.title || !ep.body || !ep.epithet) flag('epilogue-empty', JSON.stringify(ep), state.round);
    if (!Number.isFinite(luck.luck)) flag('diceLuck', String(luck.luck), state.round);
    return { V, stat, state, summary, ach };
  } catch (e) {
    flag('exception', e.stack.split('\n').slice(0, 4).join(' | '), state?.round);
    return { V, stat, state };
  }
}

const finalSig = (s) => s && JSON.stringify(E.serializeState(s), (k, v) => (k === 'snap' ? undefined : v));

// ---------------- driver ----------------
const N = Number(process.argv[2] ?? 600);
const POLICY = process.argv[3] ?? 'random';
const master = mulberry32(Number(process.argv[4] ?? 12345));
const violations = new Map();
const games = [];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const tutorial = master() < 0.08;
  const cfg = tutorial ? { mode: 'tutorial' } : {
    mode: 'standard', size: pick(master, [5, 6, 7]), difficulty: pick(master, ['easy', 'normal', 'hard']),
    seed: Math.floor(master() * 1e6), veteran: master() < 0.5,
  };
  if (!tutorial && master() < 0.15) cfg.canon = { text: '강에서 물고기를 잡아라', doctrine: pick(master, D.DOCTRINES) };
  const botSeed = Math.floor(master() * 1e9);
  const r = playGame(cfg, botSeed, { policy: POLICY, hydrate: true });
  // determinism: same inputs, no hydrate; and replay with hydrate
  const detEvery = POLICY === 'smart' ? 5 : 1;
  if (i % detEvery === 0 && r.state) {
    const a = playGame(cfg, botSeed, { policy: POLICY, hydrate: false, checks: false });
    const b = playGame(cfg, botSeed, { policy: POLICY, hydrate: true, checks: false });
    if (finalSig(a.state) !== finalSig(b.state)) r.V.push({ type: 'nondeterminism', msg: 'same seed+inputs gave different outcome (hydrate run vs repeat)', round: r.state.round });
    if (finalSig(a.state) !== finalSig(r.state)) {
      const d = deepDiff(E.hydrateState(JSON.parse(finalSig(a.state))), E.hydrateState(JSON.parse(finalSig(r.state))));
      r.V.push({ type: 'hydrate-changes-outcome', msg: `no-hydrate vs hydrate run differ: ${d}`, round: r.state.round });
    }
  }
  for (const v of r.V) {
    const key = v.type;
    const rec = violations.get(key) ?? { count: 0, games: new Set(), best: null, samples: [] };
    rec.count += 1; rec.games.add(i);
    const size = (cfg.size ?? 3) * 100 + (v.round ?? 99);
    if (!rec.best || size < rec.bestSize) { rec.best = { cfg, botSeed, policy: POLICY, ...v }; rec.bestSize = size; }
    if (rec.samples.length < 3 && !rec.samples.includes(v.msg)) rec.samples.push(v.msg);
    violations.set(key, rec);
  }
  games.push({ cfg, botSeed, winner: r.state?.winner, reason: r.state?.winReason, kind: r.state && r.state.winner ? C.outcomeKind(r.state) : null, rounds: r.state?.round, maxRounds: r.state?.maxRounds,
    score: r.state ? [E.score(r.state, 'player'), E.score(r.state, 'enemy')] : null, stat: r.stat, pstats: r.state?.stats, ach: r.ach });
}
const out = { N, POLICY, ms: Date.now() - t0, violations: [...violations.entries()].map(([k, v]) => ({ type: k, count: v.count, games: v.games.size, repro: v.best, samples: v.samples })), games };
const fs = await import('node:fs');
fs.writeFileSync(new URL(`./result-${POLICY}.json`, import.meta.url), JSON.stringify(out, null, 1)); // .gitignore에 있다
console.log(`${N} games (${POLICY}) in ${out.ms}ms`);
for (const v of out.violations.sort((a, b) => b.games - a.games)) console.log(`${v.type}: ${v.count}x in ${v.games} games | repro ${JSON.stringify(v.repro)}\n   ${v.samples.join('\n   ')}`);
