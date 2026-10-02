// 엔진 동등성 골든 벡터: node tools/golden.mjs
//   docs/export/golden/<이름>.json — 정해 둔 계시 목록으로 한 판을 끝까지 두고, 장마다 해석·명령·기록·상태 요약을 남긴다
//   docs/export/golden/index.json  — 판 목록 (설정·장 수·결과)
// 석판(키워드) 해석기 경로를 main.js 그대로 따라 한다: speak() → interpret()/derivePending() → accept() → wordsAfter()
// → (발견지 선택) → newRound()/startRound(). 화면 연출·메타 저장(meta.*)·LLM 경로는 뺀다.
// 결정론: 난수는 엔진의 시드 스트림뿐이고 시각을 넣지 않는다. 두 번 돌리면 바이트까지 같은 파일이 나와야 한다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const outDir = join(root, 'docs', 'export', 'golden');

// 브라우저 저장소 대신 (i18n.js가 언어를 고를 때 읽는다 → 한국어)
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem() {} }, configurable: true, writable: true });

const load = (p) => import(pathToFileURL(join(root, p)).href);
const E = await load('js/game/engine.js');
const D = await load('js/game/data.js');
const L = await load('js/game/lore.js');
const { interpretWithTablet } = await load('js/game/interpreter.js');
const { t, lang } = await load('js/game/i18n.js');
const { generateMap } = await load('js/game/mapgen.js');
if (lang !== 'ko') throw new Error(`expected the Korean pack, got '${lang}'`);

// ---------- 판 목록 ----------
// 계시 항목: 문자열, 또는 { text, seal?: 예언 봉인 체크, carve?: 계명 새기기 체크 } (확인 화면의 체크 상자)
// '…'처럼 글자가 없는 계시는 침묵이다 (main.js의 kw.ui.speech 검사)
const SILENCE = '…';
const GAMES = [
  {
    name: 'tutorial-3x3',
    config: { mode: 'tutorial' },
    // 튜토리얼 안내자(세라)가 넣어 주는 예시 그대로 + 5장은 말한 대로 내리는 기적(단비)
    script: [t('tut.speak1.4.suggest'), t('tut.speak2.1.suggest'), t('tut.speak3.2.suggest'), t('tut.speak4.1.suggest'), '단비를 내려 들판을 적셔라'],
  },
  {
    name: 's4-easy-first',
    config: { mode: 'standard', size: 4, difficulty: 'easy', seed: 4101, veteran: false },
    script: ['강물이 너희를 먹이리라', '땅을 넓혀 새 마을을 세워라', '숲에 들어가 나무를 베어라', '이웃에게 나의 말씀을 전하라',
      '축복하노니 들판의 곡식을 거두어라', '이 산을 시온이라 부르라', '시온에서 돌을 캐어 오라', SILENCE],
  },
  {
    name: 's5-normal-first',
    config: { mode: 'standard', size: 5, difficulty: 'normal', seed: 2026, veteran: false },
    script: ['땅을 넓혀 새 마을을 세워라', '산에서 돌을 캐어 오라', '신전에서 기도하라', '안개 너머를 탐험하라',
      '들판의 곡식을 거두고, 숲의 나무를 베어라', { text: '두 장 안에 율법파의 마을이 무너지리라', seal: true }, '율법파의 마을을 쳐라',
      '싸우지 마라, 이웃을 사랑하라', '너희는 들판에서 곡식을 거두고 숲에서 나무를 베어 겨울을 준비하라', '높은 신전을 쌓아 나를 섬겨라',
      '율법파에게 재앙을! 그들의 마을을 쳐라', '번개를 내려 율법파를 벌하라'],
  },
  {
    name: 's5-hard-veteran',
    config: { mode: 'standard', size: 5, difficulty: 'hard', seed: 5303, veteran: true },
    script: ['이웃에게 나의 말씀을 전하라', '강물처럼 흘러 이웃에게 말씀을 전하라', '땅을 넓혀 새 마을을 세워라', { text: '영원히 굶기지 말라', carve: true },
      '성벽을 쌓아 우리 땅을 지켜라', '율법파의 마을을 쳐라', '단비를 내려 들판을 적셔라', '나그네를 받아 품어라',
      '언덕에 올라 나를 찬양하라', '높은 신전을 쌓아 나를 섬겨라', '안개 너머를 탐험하라', SILENCE],
  },
  {
    name: 's6-normal-veteran',
    config: { mode: 'standard', size: 6, difficulty: 'normal', seed: 6202, veteran: true },
    script: ['들판의 곡식을 거두고, 숲의 나무를 베어라', '땅을 넓혀 새 마을을 세워라', '이 숲을 검은숲이라 부르라', '검은숲에서 나무를 베어라',
      { text: '영원히 칼을 들지 말라', carve: true }, { text: '이웃이 말씀을 받아 두 장 안에 돌아오리라', seal: true }, '이웃에게 나의 말씀을 전하라', '이웃에게 나의 말씀을 전하라',
      '신전에서 기도하라', '높은 신전을 쌓아 나를 섬겨라', '산에서 돌을 캐어 오라', '나를 위한 대성당을 지어라'],
  },
  {
    name: 's6-easy-veteran',
    config: { mode: 'standard', size: 6, difficulty: 'easy', seed: 6605, veteran: true },
    script: ['땅을 넓혀 새 마을을 세워라', '강물이 너희를 먹이리라', { text: '세 장 안에 자손이 불어나리라', seal: true }, '안개 너머를 탐험하라',
      '안개 너머를 탐험하라', '안개 너머를 탐험하라', SILENCE, SILENCE, SILENCE, '신전에서 기도하라', '율법파의 마을을 쳐라', '율법파의 마을을 쳐라'],
  },
  {
    name: 's7-hard-first',
    config: { mode: 'standard', size: 7, difficulty: 'hard', seed: 7304, veteran: false },
    script: ['땅을 넓혀 새 마을을 세워라', '숲에 들어가 나무를 베어라', '산에서 돌을 캐어 오라', '성벽을 쌓아 우리 땅을 지켜라',
      '율법파의 마을을 쳐라', '율법파의 마을을 쳐라', '율법파의 마을을 쳐라', '율법파에게 재앙을! 그들의 수도를 쳐라',
      '높은 신전을 쌓아 나를 섬겨라', '들판의 곡식을 거두고, 숲의 나무를 베어라', '번개를 내려 율법파를 벌하라', '땅을 넓혀 새 마을을 세워라',
      '신전에서 기도하라', '율법파의 마을을 쳐라'],
  },
  {
    name: 's7-normal-veteran',
    config: { mode: 'standard', size: 7, difficulty: 'normal', seed: 7707, veteran: true },
    script: ['이웃을 사랑하라', '땅을 넓혀 새 마을을 세워라', '강물처럼 흘러 이웃에게 말씀을 전하라', { text: '영원히 안식하라', carve: true },
      '안개 너머를 탐험하라', '언덕에 올라 나를 찬양하라', '들판의 곡식을 거두고, 숲의 나무를 베어라', '땅을 넓혀 새 마을을 세워라',
      '이웃에게 나의 말씀을 전하라', '싸우지 마라, 이웃을 사랑하라', '높은 신전을 쌓아 나를 섬겨라', '산에서 돌을 캐어 오라',
      '성벽을 쌓아 우리 땅을 지켜라', '신전에서 기도하라'],
  },
  // 승점 판정이 아닌 승리 두 가지: 개종으로 율법파가 사라짐(convertAll), 인구 3/4(faith)
  {
    name: 's4-easy-first-war',
    config: { mode: 'standard', size: 4, difficulty: 'easy', seed: 404, veteran: false },
    script: ['땅을 넓혀 새 마을을 세워라', '율법파의 마을을 쳐라', '율법파에게 재앙을! 그들의 수도를 쳐라', '성벽을 쌓아 우리 땅을 지켜라',
      '땅을 넓혀 새 마을을 세워라', '율법파의 마을을 쳐라', '율법파에게 재앙을! 그들의 수도를 쳐라', '성벽을 쌓아 우리 땅을 지켜라'],
  },
  {
    name: 's5-easy-first-war',
    config: { mode: 'standard', size: 5, difficulty: 'easy', seed: 202, veteran: false },
    script: ['땅을 넓혀 새 마을을 세워라', '율법파의 마을을 쳐라', '율법파에게 재앙을! 그들의 수도를 쳐라', '성벽을 쌓아 우리 땅을 지켜라',
      '땅을 넓혀 새 마을을 세워라', '율법파의 마을을 쳐라', '율법파에게 재앙을! 그들의 수도를 쳐라', '성벽을 쌓아 우리 땅을 지켜라',
      '땅을 넓혀 새 마을을 세워라', '율법파의 마을을 쳐라', '율법파에게 재앙을! 그들의 수도를 쳐라', '성벽을 쌓아 우리 땅을 지켜라'],
  },
  {
    name: 's4-hard-veteran-asc4',
    // 승천 4 + 은사(석공): 승천 규칙(율법파 시작 보너스, 석판 상한 -2, 분노 문턱 8, 3막 행동 +1)과 은사 비용 할인
    config: { mode: 'standard', size: 4, difficulty: 'hard', seed: 4404, veteran: true, ascension: 4, blessing: 'mason' },
    script: ['신전에서 기도하라', '높은 신전을 쌓아 나를 섬겨라', '율법파의 마을을 쳐라', '성벽을 쌓아 우리 땅을 지켜라',
      '율법파의 마을을 쳐라', '땅을 넓혀 새 마을을 세워라', '율법파에게 재앙을! 그들의 수도를 쳐라', '율법파의 마을을 쳐라'],
  },
];

// ---------- main.js의 석판 경로 ----------
const KW_SPEECH = new RegExp(t('kw.ui.speech'));
const uiLogs = new WeakSet(); // main.js가 직접 state.log에 넣는 줄 (엔진이 아닌 줄)
const uiLog = (state, entry) => { uiLogs.add(entry); state.log.push(entry); return entry; };

// main.js spokenMiracle(): 손에 있고, 이번 장에 아직 안 썼고, 신앙이 되면
function spokenMiracle(state, text) {
  const id = L.parseMiracle(text, state.miracleHand);
  if (!id || state.miracleUsed) return null;
  const m = D.MIRACLES.find((x) => x.id === id);
  const cost = E.miracleCost(state, m);
  if (state.sides.player.faith < cost) return null;
  let target = null;
  if (id === 'lightning') {
    const home = E.capitalOf(state, 'player');
    const named = Object.entries(state.names).find(([tid, n]) => text.includes(n) && state.tileAt[tid].owner === 'enemy');
    const enemies = state.tiles.filter((x) => x.owner === 'enemy' && x.revealed).sort((a, b) => (a.building === 'village' ? 0 : 1) - (b.building === 'village' ? 0 : 1) || E.distance(a, home) - E.distance(b, home));
    const cap = E.capitalOf(state, 'enemy');
    const atCap = cap?.revealed && new RegExp(t('kw.place.capital')).test(text) && !new RegExp(t('kw.place.ours')).test(text) ? cap.id : null;
    target = named?.[0] ?? atCap ?? enemies[0]?.id ?? null;
    if (!target) return null;
  }
  return { id, target, cost, key: `miracle:${id}` };
}

// main.js silence(): 고요 속에 신도들은 먼저 기도한다
function silence(state) {
  const pray = E.legalActions(state, 'player').find((a) => a.type === 'pray');
  const auto = pray ? [{ ...pray, auto: true }, ...E.autoFill(state, 'player', [pray])] : E.autoFill(state, 'player', []);
  return {
    text: null,
    result: { interpretation: state.silentRun >= 1 ? t('ui.silence.again') : t('ui.silence.first'), orders: [], forbidden: [], doctrine: null, source: 'silence' },
    accepted: [], rejected: [], auto, dropped: new Set(),
  };
}

// main.js speak() + interpret() + derivePending() (석판 해석기, 칩을 빼지 않는다)
function speak(state, entry, rec) {
  const text = entry.text.trim();
  if (!KW_SPEECH.test(text)) { rec.silent = true; return silence(state); }
  const cost = E.revelationCostFor(state, text);
  const p = state.sides.player;
  // 화면은 신앙이 모자라면 인장을 받지 않는다. 골든 구동기는 이때 침묵으로 넘긴다
  if (p.faith < cost) { rec.silent = true; rec.unaffordable = cost; return silence(state); }
  rec.cost = cost;
  const spoken = E.spokenOf(state, text);
  p.faith -= cost;
  // 이름 붙이기는 해석 전에 새긴다 (새 이름이 석판 규칙에 들어간다)
  const naming = E.nameTile(state, L.parseNaming(text));
  if (naming) naming.name = state.names[naming.tile];
  const result = interpretWithTablet(state, text);
  const pending = {
    text, result, naming, dropped: new Set(),
    tone: L.detectTone(text), prophecy: state.prophecy ? null : L.parseProphecy(text),
    seal: !!entry.seal, carve: !!entry.carve, spoken,
  };
  const forbiddenKeys = result.forbidden.map((a) => a.key);
  const orders = result.orders.filter((a) => !pending.dropped.has(a.key));
  const { accepted, rejected } = E.validateOrders(state, 'player', orders, forbiddenKeys, result.doctrine);
  pending.accepted = accepted;
  pending.rejected = rejected;
  pending.auto = E.autoFill(state, 'player', accepted, [...forbiddenKeys, ...pending.dropped], result.doctrine);
  pending.answered = E.petitionAnswered(state, text, accepted);
  pending.dilemma = E.dilemmaByText(state, text);
  pending.miracle = spokenMiracle(state, text);
  pending.command = E.canCarve(state) ? L.parseCommandment(text, D.COMMANDMENTS) : null;
  if (pending.command && !E.carvable(state, pending.command)) pending.command = null;
  if (pending.command && state.commandments.includes(pending.command)) pending.command = null;
  return pending;
}

// main.js wordsAfter(): 청원 응답·이름 붙이기의 은총, 외면당한 청원
function wordsAfter(state, pd) {
  const pt = state.petition;
  if (pt?.need) {
    if (pd.answered) { state.stats.petitions += 1; E.grantGrace(state, 1, t('ui.grace.petition', { from: pt.from })); }
  }
  if (pd.naming) {
    const tl = state.tileAt[pd.naming.tile];
    const place = tl.building === 'village' ? t('ui.terrain.village') : tl.building === 'capital' ? t('ui.terrain.temple') : D.TERRAIN[tl.terrain]?.name ?? t('ui.terrain.land');
    E.grantGrace(state, 1, t('ui.grace.naming', { place, name: pd.naming.name }));
  }
}

// main.js accept(): 동시 공개와 해결, 그 뒤의 말의 장치들
function accept(state, pending, rec) {
  const { text, result, accepted, auto } = pending;
  if (text) {
    uiLog(state, { round: state.round, side: 'god', text: t('ui.log.godSaid', { text }) });
    uiLog(state, { round: state.round, side: 'priest', text: result.interpretation });
  }
  const enemyPlan = E.planEnemy(state);
  rec.enemyPlan = enemyPlan.map((a) => a.key);
  const from = state.log.length;
  if (pending.miracle && !pending.dropped.has(pending.miracle.key)) {
    const r = E.castMiracle(state, pending.miracle.id, pending.miracle.target);
    rec.miracle = { id: pending.miracle.id, target: pending.miracle.target, cost: pending.miracle.cost, ok: r.ok };
    if (!r.ok) uiLog(state, { round: state.round, side: 'player', text: t('ui.log.miracleFailed', { why: r.text }) });
  }
  if (!text) state.streak = null;
  const pick = state.event.choice ? pending.dilemma ?? state.dilemmaPick ?? state.event.choice[0].id : null;
  if (pick) rec.dilemma = { pick, byText: !!pending.dilemma, paid: E.payDilemma(state, pick) };
  let plan = [...accepted, ...auto];
  if (pending.command && pending.carve && E.carveCommandment(state, pending.command)) {
    rec.carved = pending.command;
    const banned = { noSword: 'attack', noExpand: 'village' }[pending.command];
    const kept = accepted.filter((a) => !banned || (a.type !== banned && a.build !== banned));
    const fk = result.forbidden.map((a) => a.key);
    plan = [...kept, ...E.autoFill(state, 'player', kept, fk, result.doctrine)];
  }
  const ordered = plan.filter((a) => !a.auto);
  if (text) E.findSacred(state, text);
  if (pending.seal && pending.prophecy && E.sealProphecy(state, pending.prophecy)) rec.sealed = pending.prophecy;
  rec.plan = plan.map((a) => a.key);
  rec.ordered = ordered.map((a) => a.key); // plan 가운데 auto가 아닌 것 (나머지는 auto: true)
  E.resolveRound(state, plan, enemyPlan);
  if (!state.winner) E.applySilence(state, !!text);
  if (!state.winner && text) E.markLegends(state, text, result.doctrine, ordered, state.log.slice(from));
  if (!state.winner && text) E.keepVows(state, result.forbidden, plan);
  if (!state.winner) wordsAfter(state, pending);
  // 교리는 해결이 끝난 뒤에 오른다
  if (text) { E.recordRevelation(state, text, result.doctrine, pending.spoken); }
  const last = state.history.at(-1);
  if (last) last.text = text;
  // 지도자의 반박은 연대기에만 남는다
  if (text && state.leader) {
    const line = L.leaderLine(state, 'rebuttal', { doctrine: result.doctrine, word: L.nouns(text)[0] });
    if (line) uiLog(state, { round: state.round, side: 'leader', text: t('ui.log.leaderSaid', { name: D.ENEMY_LEADERS[state.leader].name, line }) });
  }
}

// ---------- 기록 모양 ----------
const keys = (list) => list.map((a) => a.key);
const revealedBits = (state) => state.tiles.map((x) => (x.revealed ? '1' : '0')).join('');

function logEntry(l) {
  const o = { side: l.side, text: l.text };
  if (l.dice) o.dice = l.dice;
  if (l.fx) {
    const { kind, tile, gain, capture, convert, capital, up } = l.fx;
    o.fx = Object.fromEntries(Object.entries({ kind, tile, gain, capture, convert, capital, up }).filter(([, v]) => v !== undefined && v !== null));
  }
  if (l.act) o.act = l.act;
  if (uiLogs.has(l)) o.ui = true;
  return o;
}

function sideDigest(state, side) {
  const s = state.sides[side];
  const o = {
    food: s.food, wood: s.wood, stone: s.stone, faith: s.faith, pop: s.pop,
    templeLevel: s.templeLevel, capitalHp: s.capitalHp, cathedral: s.cathedral ?? 0, edict: s.edict ?? 0,
    villages: E.villageCount(state, side), score: E.score(state, side),
  };
  if (side === 'player') { o.faithless = s.faithless; o.doctrine = { ...s.doctrine }; }
  return o;
}

function digest(state) {
  const owners = {}; const buildings = {}; const walls = []; const faithMarks = {};
  for (const x of state.tiles) {
    if (x.owner) owners[x.id] = x.owner;
    if (x.building) buildings[x.id] = x.building;
    if (x.wall) walls.push(x.id);
    if (x.faithMarks) faithMarks[x.id] = { side: x.faithMarks.side, n: x.faithMarks.n };
  }
  const d = {
    player: sideDigest(state, 'player'), enemy: sideDigest(state, 'enemy'),
    owners, buildings, walls, revealed: revealedBits(state),
  };
  if (Object.keys(faithMarks).length) d.faithMarks = faithMarks;
  d.holyOwner = E.holyOwner(state);
  d.streak = state.streak;
  d.silentRun = state.silentRun;
  if (Object.keys(state.names).length) d.names = { ...state.names };
  if (Object.keys(state.legends).length) d.legends = Object.fromEntries(Object.entries(state.legends).map(([k, v]) => [k, v.name]));
  if (state.commandments.length) d.commandments = [...state.commandments];
  if (state.prophecy) d.prophecy = { kind: state.prophecy.kind, rounds: state.prophecy.rounds, due: state.prophecy.due };
  if (state.destiny) d.destiny = { ...state.destiny };
  if (state.saints.length) d.saints = state.saints.map((x) => ({ ...x }));
  if (state.vowNext) d.vowNext = state.vowNext;
  if (state.bannedNext) d.bannedNext = state.bannedNext;
  if (state.pendingSite) d.pendingSite = state.pendingSite;
  d.stats = { ...state.stats };
  d.rng = { ...state.rng };
  d.winner = state.winner;
  d.winKind = state.winKind;
  return d;
}

function setupOf(state) {
  return {
    rows: state.rows, cols: state.cols, maxRounds: state.maxRounds, enemyBonus: state.enemyBonus,
    leader: state.leader, priest: state.priest, judgement: state.judgement, edictOn: state.edictOn,
    holyId: state.holyId, miracleHand: [...state.miracleHand], destinyOffer: state.destinyOffer, destiny: state.destiny,
    sides: { player: sideDigest(state, 'player'), enemy: sideDigest(state, 'enemy') },
    // 덱은 배열 끝에서 뽑는다 (pop). 여기 적힌 순서 그대로가 엔진 배열이다
    eventDeck: state.eventDeck.map((c) => c.id), lawDeck: state.lawDeck.map((c) => c.id),
    rng: { ...state.rng },
  };
}

function initialMap(state) {
  const cfg = state.config;
  return {
    // mapgen.generateMap()의 원래 격자 (P/E = 수도). 튜토리얼은 고정 맵 (V = 율법파 마을)
    grid: state.tutorial ? D.TUTORIAL.map : generateMap({ rows: cfg.size, cols: cfg.size, seed: cfg.seed }),
    // createState()가 만든 칸 (성지 언덕·발견지·영구 지형까지 놓인 뒤)
    tiles: state.tiles.map((x) => ({
      id: x.id, r: x.r, c: x.c, terrain: x.terrain, feature: x.feature ?? null, site: x.site?.id ?? null, owner: x.owner, building: x.building,
    })),
    revealed: revealedBits(state),
  };
}

// ---------- 한 판 ----------
function playGame(spec) {
  const state = E.createState(spec.config);
  const out = {
    name: spec.name,
    config: state.config,
    script: spec.script,
    initialMap: initialMap(state),
    setup: setupOf(state),
    rounds: [],
  };
  let i = 0;
  for (let guard = 0; !state.winner && guard < state.maxRounds + 2; guard++) {
    const logFrom = state.log.length;
    E.startRound(state); // main.js newRound()
    const rec = {
      round: state.round, event: state.event.id, lawCard: state.lawCard.id, first: state.first, act: E.actOf(state),
    };
    if (state.reacted) rec.reacted = state.reacted;
    if (state.eventChoice) rec.eventChoice = [...state.eventChoice]; // 지혜 궁극: 구동기는 고르지 않는다 (첫 장 그대로)
    if (state.bannedWords.length) rec.bannedWords = [...state.bannedWords];
    rec.petition = state.petition ? { from: state.petition.from, need: state.petition.need } : null; // 첫 판(은총이 잠긴 판)엔 청원이 없다
    // 선택 창 (화면은 닫을 수 없는 모달이다): 구동기는 늘 첫 선택지를 고른다
    if (state.round === 1 && state.destinyOffer) { const pick = state.destinyOffer[0]; E.chooseDestiny(state, pick); rec.destinyPick = pick; }
    if (state.miracleOffer) { const offer = [...state.miracleOffer]; E.takeMiracle(state, offer[0]); rec.miracleDraft = { offer, pick: offer[0] }; }
    const raw = spec.script[i++ % spec.script.length];
    const entry = typeof raw === 'string' ? { text: raw } : raw;
    rec.revelation = entry.text;
    if (entry.seal) rec.sealRequested = true;
    if (entry.carve) rec.carveRequested = true;
    const pending = speak(state, entry, rec);
    if (pending.text) {
      rec.tone = pending.tone;
      if (pending.naming) rec.naming = { tile: pending.naming.tile, name: pending.naming.name, first: pending.naming.first };
      rec.tablet = {
        orders: keys(pending.result.orders), forbidden: keys(pending.result.forbidden),
        doctrine: pending.result.doctrine, interpretation: pending.result.interpretation,
      };
      rec.accepted = keys(pending.accepted);
      rec.rejected = pending.rejected.map((r) => ({ key: r.action.key, reason: r.reason }));
      rec.petitionAnswered = pending.answered;
    }
    rec.auto = keys(pending.auto);
    accept(state, pending, rec);
    // main.js playback() 끝: 선택이 필요한 발견지 (유목민) — 구동기는 첫 선택지 'take'
    if (state.pendingSite && !state.winner) {
      const tile = state.pendingSite;
      const choice = D.SITES[state.tileAt[tile].site.id].choice[0].id;
      const msg = E.resolveSite(state, choice);
      rec.site = { tile, choice };
      if (msg) uiLog(state, { round: state.round, side: 'player', text: msg });
    }
    rec.log = state.log.slice(logFrom).map(logEntry);
    rec.digest = digest(state);
    out.rounds.push(rec);
  }
  const breakdown = (side) => E.scoreBreakdown(state, side).parts.map((p) => ({ key: p.key, n: p.n, w: p.w }));
  out.result = {
    rounds: state.round, winner: state.winner, winKind: state.winKind, winReason: state.winReason,
    score: { player: E.score(state, 'player'), enemy: E.score(state, 'enemy') },
    breakdown: { player: breakdown('player'), enemy: breakdown('enemy') },
    history: state.history.map((h) => ({ round: h.round, ps: h.ps, es: h.es })),
    revelations: state.revelations.map((r) => ({ round: r.round, doctrine: r.doctrine })),
    stats: { ...state.stats },
  };
  return out;
}

// ---------- 출력 ----------
// 짧은 값은 한 줄에, 긴 값만 펼친다 (읽기 쉽고 diff하기 쉽게). JSON.stringify와 같은 값·같은 키 순서
function fmt(v, indent = '') {
  const flat = JSON.stringify(v);
  if (flat === undefined) return 'null';
  if (v === null || typeof v !== 'object' || flat.length + indent.length <= 120) return flat;
  const next = `${indent}  `;
  if (Array.isArray(v)) return `[\n${v.map((x) => next + fmt(x, next)).join(',\n')}\n${indent}]`;
  const entries = Object.entries(v).filter(([, x]) => x !== undefined && typeof x !== 'function');
  return `{\n${entries.map(([k, x]) => `${next}${JSON.stringify(k)}: ${fmt(x, next)}`).join(',\n')}\n${indent}}`;
}

mkdirSync(outDir, { recursive: true });
const index = [];
let total = 0;
for (const spec of GAMES) {
  const game = playGame(spec);
  const text = `${fmt(game)}\n`;
  JSON.parse(text); // 다시 읽을 수 있는지
  const file = `${spec.name}.json`;
  writeFileSync(join(outDir, file), text);
  const bytes = Buffer.byteLength(text);
  total += bytes;
  if (bytes > 1.5 * 1024 * 1024) throw new Error(`${file} is too large: ${bytes} bytes`);
  index.push({ file, config: game.config, rounds: game.result.rounds, winner: game.result.winner, winKind: game.result.winKind, score: game.result.score });
  console.log(`${relative(root, join(outDir, file)).replaceAll('\\', '/')}: ${game.rounds.length} rounds, ${game.result.winner}/${game.result.winKind} ${game.result.score.player}:${game.result.score.enemy}, ${bytes} bytes`);
}
const indexText = `${fmt({ generator: 'tools/golden.mjs', ruleset: D.RULESET, lang, games: index })}\n`;
writeFileSync(join(outDir, 'index.json'), indexText);
total += Buffer.byteLength(indexText);
console.log(`total ${total} bytes in ${GAMES.length} games`);
