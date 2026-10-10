// 도메인 정보 검사 (js/game/domain/): 판을 돌리며 장마다 정보 함수들의 불변식을 본다
//   node tools/tests/info.mjs [판 수=60]
// - 읽기만 한다: 부르기 전후의 상태(serializeState)가 같다
// - 값이 엔진과 맞는다: 자원, 율법파의 뜻(보이는 것 + 가린 수), 할 수 있는 일, 건설 비용, 확인 화면 계산값
// - 못 보는 것이 없다: 안개 속 칸은 id·revealed뿐, undefined·NaN이 없다
// - 대사제의 눈(view 'priest')이 SEEN 표를 따른다: 전략 재료가 빠지고, 모자란 것은 어려움에서만 빠지고, 율법 카드는 공개 뒤에만
import { E, D, mulberry32, pick, REVELATIONS, doSpeak, doAccept } from './lib.mjs';

const { gameInfo, previewInfo, ledgerInfo, speechInfo, nextLawInfo, sideInfo, tileInfo, view, Res, KINDS, kindOf, kindParts, fromKey, seenOf } = await import(new URL('../../js/game/domain/index.js', import.meta.url).href);

const N = Number(process.argv[2] ?? 60);
const bad = {};
const note = (k, detail) => { (bad[k] ??= []).push(detail); };
const ok = (cond, k, detail) => { if (!cond) note(k, detail); };
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- 자원 묶음 ----------
const a = { food: 3, wood: 1, stone: 0, faith: 5 };
const b = Res.of({ wood: 2, faith: 1 });
ok(eqJ(b, { food: 0, wood: 2, stone: 0, faith: 1 }), 'res.of', b);
ok(eqJ(Res.add(a, b), { food: 3, wood: 3, stone: 0, faith: 6 }), 'res.add');
ok(eqJ(Res.sub(a, b), { food: 3, wood: -1, stone: 0, faith: 4 }), 'res.sub');
ok(eqJ(Res.scale(b, 3), { food: 0, wood: 6, stone: 0, faith: 3 }), 'res.scale');
ok(Res.canPay(a, Res.of({ food: 3, faith: 5 })) && !Res.canPay(a, b), 'res.canPay');
ok(eqJ(Res.short(a, { food: 4, wood: 1, stone: 2, faith: 1 }), { food: 1, wood: 0, stone: 2, faith: 0 }), 'res.short');
ok(Res.equal(a, { ...a }) && !Res.equal(a, b), 'res.equal');
ok(Res.render(b, D.RESOURCE_NAME).split(', ').length === 4, 'res.render');
ok(Res.canPay({ food: 1, wood: 0 }, { food: 1 }) && !Res.canPay({ food: 0 }, { food: 1 }), 'res.canPay-partial');
{ const h = { ...a, pop: 3 }; Res.pay(h, { wood: 1, faith: 2 }); ok(h.wood === 0 && h.faith === 3 && h.pop === 3, 'res.pay'); }
ok(eqJ(Res.floor({ food: -2, wood: 1, stone: 0, faith: -1 }, 0), { food: 0, wood: 1, stone: 0, faith: 0 }), 'res.floor');
for (const k of KINDS) ok(kindOf(kindParts(k)) === k, 'kind-roundtrip', k);
ok(eqJ(fromKey('build:C3:village'), { kind: 'build:village', tile: 'C3' }) && eqJ(fromKey('pray:B2:'), { kind: 'pray', tile: 'B2' }), 'fromKey');
ok(seenOf('us.score') === 'player' && seenOf('us.actions') === 'priest' && seenOf('board.tiles.terrain') === 'priest' && seenOf('board.tiles.value') === 'player' && seenOf('nope.x') === 'player', 'seenOf');

// 값 안에 undefined·NaN이 없는가
const clean = (v, path = '') => {
  if (v === undefined || (typeof v === 'number' && !Number.isFinite(v))) return path;
  if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) { const r = clean(v[i], `${path}[${i}]`); if (r) return r; } return null; }
  if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) { const r = clean(x, `${path}.${k}`); if (r) return r; } }
  return null;
};

// ---------- 판을 돌리며 ----------
const CONFIGS = [
  { mode: 'tutorial' },
  { size: 4, difficulty: 'easy', veteran: true },
  { size: 5, difficulty: 'normal', veteran: true },
  { size: 5, difficulty: 'normal' },
  { size: 6, difficulty: 'hard', veteran: true },
  // 지난 판의 유적과 도전장이 있는 판
  { size: 5, difficulty: 'hard', veteran: true, canon: { text: '강에서 물고기를 잡아라', doctrine: D.DOCTRINES[0] }, challenge: { target: 30 } },
];
let states = 0;
const priestLen = [];
const priestNoBoard = [];
for (let g = 0; g < N; g++) {
  const base = CONFIGS[g % CONFIGS.length];
  const cfg = { ...base, seed: 1000 + g * 7919 };
  const rng = mulberry32(g + 1);
  const state = E.createState(cfg);
  const diff = state.tutorial ? 'easy' : cfg.difficulty;
  for (let r = 0; r < state.maxRounds && !state.winner; r++) {
    E.startRound(state);
    const where = `g${g} r${state.round} ${base.mode ?? `${cfg.size}${diff[0]}`}`;
    const before = JSON.stringify(E.serializeState(state));
    const info = gameInfo(state);
    const shown = view(info, 'player', { difficulty: diff, revealed: false });
    const priest = view(info, 'priest', { difficulty: diff, revealed: false });
    const after = gameInfo(state, { revealed: true });
    const priestAfter = view(after, 'priest', { difficulty: diff, revealed: true });
    states += 1;

    // 읽기만 한다 · 같은 상태면 같은 객체
    ok(before === JSON.stringify(E.serializeState(state)), 'mutates-state', where);
    ok(eqJ(info, gameInfo(state)), 'not-deterministic', where);
    ok(!clean(info), 'undefined-or-nan', `${where} ${clean(info)}`);

    // 엔진과 같은 값
    const p = state.sides.player; const e = state.sides.enemy;
    ok(eqJ(info.us.resources, { food: p.food, wood: p.wood, stone: p.stone, faith: p.faith }), 'us-resources', where);
    ok(eqJ(info.enemy.resources, { food: e.food, wood: e.wood, stone: e.stone, faith: e.faith }), 'enemy-resources', where);
    ok(info.us.actions === E.actionLimit(state, 'player') && info.enemy.actions === E.actionLimit(state, 'enemy'), 'actions', where);
    const intents = E.enemyIntent(state);
    ok(info.enemy.intents.length + info.enemy.hiddenIntents === intents.length, 'intent-count', where);
    ok(info.enemy.intents.every((x) => state.tileAt[x.tile].revealed && KINDS.includes(x.kind)), 'intent-fog', where);
    const legalKinds = [...new Set(E.legalActions(state, 'player').map(kindOf))];
    ok(info.us.legalKinds.length === legalKinds.length && info.us.legalKinds.every((k) => legalKinds.includes(k)), 'legal-kinds', where);
    for (const k of ['village', 'wall']) if (info.us.legalKinds.includes(`build:${k}`)) ok(Res.canPay(info.us.resources, info.costs[k]), `cost-${k}`, where);
    ok(info.board.tiles.length === state.rows * state.cols, 'tile-count', where);
    for (const t of info.board.tiles) {
      if (!t.revealed) ok(eqJ(Object.keys(t).sort(), ['c', 'id', 'r', 'revealed', 'site']), 'fog-leak', `${where} ${t.id}`);
      else {
        ok(RES_SUM(t.value) === 0 || t.building !== 'capital', 'capital-value', `${where} ${t.id}`);
        const y = E.yieldOf(state.tileAt[t.id]);
        ok(t.yield.resource === (y.gather ?? null) && t.yield.amount === (y.amount ?? 0), 'tile-yield', `${where} ${t.id}`);
      }
    }
    ok(info.enemy.lawCard === null && after.enemy.lawCard?.id === state.lawCard.id, 'law-card-reveal', where);

    // 보는 이
    ok(eqJ(shown, info), 'player-view', where);
    // 진영·장·말의 층이 엔진과 같다
    for (const side of ['player', 'enemy']) {
      const si = sideInfo(state, side);
      ok(si.score === E.score(state, side) && si.popCap === E.popCap(state, side) && si.villages === E.villageCount(state, side) && si.income.faith === E.faithIncome(state, side), 'side-info', `${where} ${side}`);
    }
    ok(info.turn.act === (state.tutorial ? 1 : E.actOf(state)) && (state.tutorial ? info.turn.months === null : info.turn.months.length === state.maxRounds), 'turn-info', where);
    ok(info.setup.revelationMax === (cfg.trial === 'cloister' ? 20 : D.REVELATION_MAX) && info.setup.grace === E.graceOn(state), 'setup-info', where);
    ok(info.setup.priest === (state.priest ?? null) && info.setup.canon === (cfg.canon?.text ?? null)
      && (cfg.challenge ? info.setup.challenge?.target === cfg.challenge.target : info.setup.challenge === null), 'setup-extra', where);
    ok(info.turn.actStart === (!state.tutorial && !!E.actStart(state)), 'turn-act-start', where);
    // 기적 고르기: 제안된 기적과 그 비용이 엔진과 같다
    ok(state.miracleOffer
      ? eqJ(info.us.miracleOffer?.map((o) => o.id), state.miracleOffer) && info.us.miracleOffer.every((o) => o.cost === E.miracleCost(state, D.MIRACLES.find((m) => m.id === o.id)))
      : info.us.miracleOffer === null, 'miracle-offer', where);
    for (const t2 of ['', '강에서 물고기를 잡아라', '기도하라']) {
      const sp = speechInfo(state, t2);
      ok(sp.cost === (t2 ? E.revelationCostFor(state, t2) : 0) && sp.echo === E.isEcho(state, t2), 'speech-info', `${where} ${t2}`);
    }
    for (const doctrine of [null, 'war', 'peace']) {
      const nx = E.nextLawCard(state, doctrine, false); const ni = nextLawInfo(state, { doctrine, vow: false });
      ok(state.round >= state.maxRounds ? ni === null : (nx === null ? ni === null : ni?.card.id === nx.card.id && ni.reacted === !!nx.reacted), 'next-law-info', `${where} ${doctrine}`);
    }
    for (const k of ['score', 'resources', 'doctrine', 'miracles', 'commandments', 'prophecy']) ok(!(k in (priest.us ?? {})), 'priest-sees-us', `${where} us.${k}`);
    ok(priest.us?.actions === info.us.actions && Array.isArray(priest.us?.legalKinds), 'priest-misses-us', where);
    ok(('short' in (priest.us ?? {})) === (diff !== 'hard'), 'priest-short-by-difficulty', where);
    ok(!priest.turn && !priest.costs && !priest.event?.next && !priest.words?.petition, 'priest-sees-strategy', where);
    ok(priest.board?.tiles?.length === info.board.tiles.length && priest.board.tiles.every((t) => !('value' in t) && !('activity' in t) && !('marks' in t) && !('legend' in t)), 'priest-tiles', where);
    ok(!('lawCard' in (priest.enemy ?? {})) && !('leader' in (priest.enemy ?? {})), 'priest-sees-hidden-enemy', where);
    ok(priestAfter.enemy?.lawCard?.id === state.lawCard.id, 'priest-misses-revealed-card', where);
    ok(Array.isArray(priest.enemy?.intents) && priest.enemy.guard === info.enemy.guard, 'priest-misses-enemy', where);
    const s = JSON.stringify(priest);
    priestLen.push(s.length);
    const { board, ...rest } = priest;
    priestNoBoard.push(JSON.stringify(rest).length);

    // 확인 화면 계산값: 석판 해석 그대로
    const text = pick(rng, REVELATIONS);
    const pending = doSpeak(state, text);
    const plan = [...pending.accepted, ...pending.auto];
    const pv = previewInfo(state, { plan, text: pending.text, doctrine: pending.result.doctrine, dilemma: pending.dilemma });
    const g2 = E.previewGains(state, plan);
    // 화면이 하던 셈 그대로: 순변화 + 고른 갈림길의 득, 0 아래로는 자른다
    const opt = state.event?.choice?.find((o) => o.id === (pending.dilemma ?? state.dilemmaPick ?? state.event.choice[0].id));
    const want = Object.fromEntries(Object.entries(g2.after).map(([k, v]) => [k, Math.max(0, v + (opt?.gain?.[k] ?? 0))]));
    ok(eqJ(pv.gains, Res.of(g2.delta)) && eqJ(pv.after, Res.of(want)), 'preview-gains', where);
    // 행동마다 득: 거두기는 그 칸의 양, 기도는 기도 값 (다른 일은 없다)
    ok(plan.every((a) => (a.type === 'gather' ? pv.per[a.key]?.kind === 'gather' && pv.per[a.key].resource === a.gather && pv.per[a.key].n === E.gatherAmount(state, 'player', state.tileAt[a.tile])
      : a.type === 'pray' ? pv.per[a.key]?.kind === 'pray' && pv.per[a.key].n === E.prayValue(state, 'player') : !(a.key in pv.per))), 'preview-per', where);
    ok(Object.values(pv.odds).every((x) => x >= 0 && x <= 1) && Object.values(pv.crusade).every((x) => x >= 0 && x <= 1), 'preview-odds', where);
    const snapBefore = { ...state, tiles: E.snapshot(state).tiles, sides: E.snapshot(state).sides };
    doAccept(state, pending);
    const led = ledgerInfo(snapBefore, state);
    ok(led.score === E.score(state, 'player') - E.score(snapBefore, 'player') && led.pop === state.sides.player.pop - snapBefore.sides.player.pop, 'ledger-info', where);
  }
}
function RES_SUM(v) { return v.food + v.wood + v.stone + v.faith; }

const avg = (xs) => Math.round(xs.reduce((x, y) => x + y, 0) / xs.length);
console.log(`info: ${N}판 · ${states}장 검사 · 대사제의 눈 JSON 평균 ${avg(priestLen)}자 (판 빼면 ${avg(priestNoBoard)}자)`);
const keys = Object.keys(bad);
if (!keys.length) console.log('위반 없음');
for (const k of keys) console.log(`  ${k}: ${bad[k].length}건 — 예: ${bad[k].slice(0, 3).join(' / ')}`);
process.exitCode = keys.length ? 1 : 0;
