// 게임 진행과 화면: 사건 → 계시 → 해석 확인 → 동시 공개·해결(한 단계씩 연출) → 다음 장
import {
  createState, startRound, legalActions, validateOrders, autoFill, planEnemy, resolveRound,
  recordRevelation, castMiracle, actionLimit, popCap, villageCount, score, tileName, snapshot, capitalOf, other,
  faithIncome, DEFAULT_CONFIG, enemyIntent, revelationCostFor, chooseEvent, josa, batchim,
  grantGrace, petitionAnswered, nameTile, applyTone, sealProphecy, takeMiracle, resolveSite,
  scoreBreakdown, miracleCost, doomReady, nextEvent, keepVows, hasUlt, ULT_ROUND, actionOdds,
} from './engine.js';
import {
  DOCTRINES, DOCTRINE, DOCTRINE_MAX, MIRACLES, REVELATION_MAX, RESOURCE_NAME, ENEMY_LEADERS, EVENTS, TONES, PROPHECY, PRIESTS, SITES, DOOM, JUDGEMENTS, OPPOSED, REACT, CAPITAL_HP, MAX_TEMPLE, TERRAIN, RULES, DIFFICULTY, MAP_SIZES,
} from './data.js';
import { renderBoard, tileToHost, markerToScreen } from './board.js';
import { installArt } from './art.js';
import { Tutorial } from './tutorial.js';
import * as meta from './meta.js';
import { leaderLine, nouns, detectTone, parseNaming, parseProphecy, citedWords } from './lore.js';
import {
  summarizeGame, epilogue, topRevelations, decisiveScene, diceLuck, evaluateAchievements, closestAchievement, ACHIEVEMENTS, difficultyName, doctrineName,
} from './chronicle.js';
import { llmStatus, prepareLLM, interpretWithLLM, interpretWithTablet, linkWords, extractLesson, describeLesson, voiceOf } from './interpreter.js';
import * as fx from './fx.js';
import { sfx, soundOn, setSound, musicOn, setMusic, music, unlockAudio } from './sound.js';

installArt();
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const svgUse = (id, cls = '', vb = '0 0 24 24') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true"><use href="#${id}"/></svg>`;
// 미플 심볼은 원점이 (0,0)이 아니므로 위치와 크기를 명시해야 잘리지 않는다
const meepleSvg = (side, cls = '') => `<svg class="${cls}" viewBox="-14 -16 28 30" aria-hidden="true"><use href="#s-meeple" x="-14" y="-16" width="28" height="30" fill="url(#g-meeple-${side})" stroke="rgba(0,0,0,.55)" stroke-width="1.1"/></svg>`;
const RES_KEYS = ['food', 'wood', 'stone', 'faith'];
const MIRACLE_ART = { doom: 'm-pillar', lightning: 'm-lightning', rain: 'm-rain', bounty: 'm-bounty', manna: 'm-manna', ark: 'm-ark', tongues: 'm-tongues', pillar: 'm-pillar', revive: 'm-revive' };

let state;
let phase = 'speak';        // speak | thinking | confirm | playing | resolved | over
let aiMode = 'tablet';
let aiState = '';
let aiUsable = false;
let pending = null;
let resolved = null;
let view = null;            // 재생 중 보드 스냅숏
let matView = null;         // 재생 중 매트 스냅숏 (토큰이 도착한 뒤에 갱신)
let targeting = null;
let draft = '';
let notice = '';
let progress = null;
let dealSeason = false;
let flipLaw = false;
let prevNums = {};
let prevDoctrine = {};
let focusId = null;         // 해결 재생 중 카메라가 비추는 칸
let tutorial = null;        // 튜토리얼 진행 중이면 안내자
let setup = loadSetup();    // 메인 화면에서 고른 새 게임 설정
// 도전 링크: ?seed=&size=&diff=&target= (설정을 덮어쓰되 저장하지 않는다)
const challenge = (() => {
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get('seed'));
  if (!(seed > 0)) return null;
  const size = MAP_SIZES[Number(q.get('size'))] ? Number(q.get('size')) : 5;
  const difficulty = DIFFICULTY[q.get('diff')] ? q.get('diff') : 'normal';
  const target = Math.max(0, Number(q.get('target')) || 0);
  return { seed: Math.min(999999, Math.floor(seed)), size, difficulty, target };
})();
if (challenge) setup = { ...setup, size: challenge.size, difficulty: challenge.difficulty, seed: challenge.seed };
let loadedPhase = null;     // 저장에서 불러온 판이면 그 판의 단계 ('speak' | 'resolved')
let hintTiles = [];         // 계시를 쓰는 동안 말씀이 닿을 것 같은 칸 (석판 해석 예감)
let hintTimer = null;
let acceptLock = 0;         // Enter 연타 방지
let resolved_rebuttal = null; // 이번 장 지도자의 반박 (율법 카드가 뒤집힌 뒤 말한다)
let pendingLesson = null;   // 이번 장 대사제가 새로 배운 말버릇 (재생이 끝나면 알린다)

function loadSetup() {
  try {
    const s = JSON.parse(localStorage.getItem('gsg.setup') ?? 'null');
    if (s && MAP_SIZES[s.size] && DIFFICULTY[s.difficulty] && s.seed > 0) return { ...DEFAULT_CONFIG, ...s, mode: 'standard' };
  } catch { /* 저장된 설정이 없거나 깨졌다 */ }
  return { ...DEFAULT_CONFIG, seed: randomSeed() };
}
function saveSetup() { try { localStorage.setItem('gsg.setup', JSON.stringify(setup)); } catch { /* 무시 */ } }
function randomSeed() { return 1 + Math.floor(Math.random() * 999998); }
let lastAltarPhase = null;  // 제단 전환 연출용

const V = () => view ?? state;
const frameEl = () => $('boardFrame');

// ---------- 시작 ----------
async function init() {
  fx.ambient($('ambient'));
  const saved = meta.loadGame();
  if (saved) { state = saved.state; loadedPhase = saved.uiPhase; }
  else state = createState(setup);
  bindTools();
  bindSetup();
  renderSetup();
  renderSubtitle();
  aiState = await llmStatus();
  aiUsable = ['available', 'readily-available', 'downloadable', 'downloading', 'after-download'].includes(aiState);
  aiMode = aiUsable && new URLSearchParams(location.search).get('ai') !== 'tablet' ? 'llm' : 'tablet';
  renderMainStatus();
  // 메인 화면 뒤로 흐릿하게 비치도록 보드와 매트를 먼저 그린다
  renderTools();
  renderBoardView();
  renderMats();
  // ?play 이면 메인 화면을 건너뛴다 (시험용)
  if (new URLSearchParams(location.search).has('play')) { $('mainScreen').hidden = true; if (loadedPhase) resumeLoaded(); else newRound(); }
  else showMain();
}

// ---------- 메인 화면 ----------
const inProgress = () => state.round > 0 && !state.winner;

function showMain() {
  const ms = $('mainScreen');
  ms.classList.remove('leaving');
  ms.hidden = false;
  tutorial?.hide();
  // 진행 중인 판이 있으면 돌아가기 버튼을 맨 앞에 둔다
  let resume = $('resumeGame');
  if (inProgress()) {
    if (!resume) {
      resume = document.createElement('button');
      resume.id = 'resumeGame'; resume.type = 'button'; resume.className = 'btn-primary ms-start';
      resume.onclick = () => startFromMain('resume');
      $('startGame').before(resume);
    }
    resume.innerHTML = `제 ${state.round + (loadedPhase === 'resolved' ? 1 : 0)} 장으로 돌아가기 <small>${state.rows}×${state.cols} · ${DIFFICULTY[state.config.difficulty].name}</small> <kbd>Enter</kbd>`;
    $('startGame').className = 'btn-ghost ms-start';
    $('startGame').innerHTML = '새 게임 시작';
  } else {
    resume?.remove();
    $('startGame').className = 'btn-primary ms-start';
    $('startGame').innerHTML = challenge ? `도전 시작 <small>${challenge.target ? `승점 ${challenge.target}을 넘어라` : `시드 ${challenge.seed}`}</small> <kbd>Enter</kbd>` : '새 게임 시작 <kbd>Enter</kbd>';
  }
  renderMainStatus();
  renderSetup();
  renderMetaLinks();
  ($('resumeGame') ?? $('startGame')).focus({ preventScroll: true });
}

// ---------- 새 게임 설정 ----------
const DIFF_HINT = {
  easy: '율법파 행동 +0, 적은 시작 자원',
  normal: '율법파 행동 +1',
  hard: '율법파 행동 +2, 율법 카드 두 장 중 위협적인 쪽을 쓴다',
};

function bindSetup() {
  for (const [id, key, cast] of [['optSize', 'size', Number], ['optDiff', 'difficulty', String]]) {
    $(id).querySelectorAll('button').forEach((b) => {
      b.onclick = () => { setup[key] = cast(b.dataset.v); saveSetup(); sfx.click(); renderSetup(); };
    });
  }
  $('optSeed').onchange = () => {
    const v = Math.max(1, Math.min(999999, Math.floor(Number($('optSeed').value) || 1)));
    setup.seed = v; saveSetup(); renderSetup();
  };
  $('reseed').onclick = () => { setup.seed = randomSeed(); saveSetup(); sfx.dice(); renderSetup(); };
  $('startTutorial').onclick = () => startFromMain('tutorial');
  $('startDaily').onclick = () => startFromMain('daily');
  $('msLibrary').onclick = () => { sfx.page(); showLibrary(); };
  $('msBible').onclick = () => { sfx.page(); showBible(); };
}

function renderSetup() {
  $('optSize').querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === setup.size));
  $('optDiff').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === setup.difficulty));
  $('optSeed').value = setup.seed;
  $('diffHint').textContent = DIFF_HINT[setup.difficulty];
  // 미리보기: 같은 설정으로 맵을 만들어 전부 드러낸다
  const preview = createState({ ...setup, mode: 'standard' });
  for (const t of preview.tiles) t.revealed = true;
  renderBoard($('mapPreview'), preview, {});
  const st = {};
  for (const t of preview.tiles) st[t.terrain] = (st[t.terrain] ?? 0) + 1;
  const best = meta.getBest(setup);
  $('mapHint').textContent = `${setup.size}×${setup.size} · ${MAP_SIZES[setup.size].rounds}장 · 사막 ${st.desert ?? 0}칸 · 성지 ${st.hill ?? 0}칸${best != null ? ` · 이 맵 최고 ${best}` : ''}`;
}

function renderMainStatus() {
  const [cls, text] = aiMode === 'llm'
    ? aiState === 'available' || aiState === 'readily-available'
      ? ['', '대사제 준비됨 · Chrome 내장 AI가 계시를 해석한다']
      : ['warn', '대사제 모델은 첫 계시 때 내려받는다 (수 GB)']
    : ['off', aiUsable ? '석판 해석기로 플레이한다 (헤더에서 LLM으로 전환)' : '이 브라우저에는 내장 AI가 없어 석판(키워드) 해석기로 플레이한다'];
  $('msStatus').innerHTML = `<span class="dot ${cls}"></span><span>${text}</span>`;
  $('msMusic').textContent = musicOn() ? '♪ 음악 켜짐' : '♪ 음악 꺼짐';
  $('msSound').textContent = soundOn() ? '효과음 켜짐' : '효과음 꺼짐';
  $('msMotion').textContent = fx.motion.reduced ? '✧ 연출 줄임' : '✦ 연출 화려하게';
}

// mode: 'new' | 'resume' | 'tutorial'
function startFromMain(mode = 'new') {
  const ms = $('mainScreen');
  if (ms.hidden || ms.classList.contains('leaving')) return;
  // 사용자 입력 안에서 오디오를 연다 (이 전에는 AudioContext를 만들지 않는다)
  unlockAudio();
  sfx.holy();
  // 대사제 세션을 미리 깨워 둔다 (첫 계시가 13초 → 3초)
  if (aiMode === 'llm') prepareLLM().catch(() => {});
  ms.classList.add('leaving');
  setTimeout(() => {
    ms.hidden = true;
    ms.classList.remove('leaving');
    if (mode === 'resume' && inProgress()) {
      if (loadedPhase) resumeLoaded(); else tutorial?.on('speak', state.round);
      return;
    }
    const veteran = meta.getHistory().length > 0;
    if (mode === 'tutorial') beginGame({ mode: 'tutorial' });
    else if (mode === 'daily') beginGame({ ...meta.dailyConfig(), veteran: true });
    else if (challenge && mode === 'new') beginGame({ ...setup, mode: 'standard', veteran: true, canon: null, challenge: { target: challenge.target } });
    else beginGame({ ...setup, mode: 'standard', veteran, canon: veteran ? meta.getCanon()[0] ?? null : null });
  }, fx.motion.reduced ? 150 : 850);
}

// 저장에서 불러온 판을 이어 간다
function resumeLoaded() {
  const at = loadedPhase;
  loadedPhase = null;
  resolved = null;
  renderSubtitle();
  music.start();
  if (at === 'resolved') { newRound(); return; }
  phase = 'speak';
  pending = null;
  dealSeason = true;
  music.setMood('calm');
  render();
  fx.chapter(frameEl(), `제 ${state.round} 장`, '다시 이어서');
  if (state.miracleOffer) setTimeout(showMiracleDraft, fx.motion.reduced ? 300 : 2500);
}

function beginGame(config) {
  loadedPhase = null;
  tutorial?.destroy();
  tutorial = config.mode === 'tutorial' ? new Tutorial({ onSuggest: suggestRevelation, onEnd: endTutorial }) : null;
  state = createState(config);
  resolved = null;
  prevNums = {};
  prevDoctrine = {};
  renderSubtitle();
  newRound();
}

function renderSubtitle() {
  if (state.config.challenge) { $('subtitle').textContent = `도전 · ${state.rows}×${state.cols} ${DIFFICULTY[state.config.difficulty].name} · 시드 ${state.config.seed}${state.config.challenge.target ? ` · 승점 ${state.config.challenge.target}을 넘어라` : ''}`; return; }
  if (state.config.daily) { $('subtitle').textContent = `오늘의 계시 · ${state.config.daily}${state.leader ? ` · ${ENEMY_LEADERS[state.leader].name}` : ''}`; return; }
  $('subtitle').textContent = state.tutorial ? '튜토리얼 · 첫 계시'
    : `${state.rows}×${state.cols} · 율법파 ${DIFFICULTY[state.config.difficulty].name} · 시드 ${state.config.seed}${state.leader ? ` · ${ENEMY_LEADERS[state.leader].name}` : ''}${state.judgement !== 'classic' ? ` · 심판 「${JUDGEMENTS[state.judgement].name}」` : ''}`;
}

function suggestRevelation(text) {
  const ta = document.querySelector('.scroll textarea');
  if (!ta) return;
  ta.value = text;
  ta.dispatchEvent(new Event('input'));
  ta.focus();
}

function endTutorial({ skipped }) {
  if (!skipped) meta.unlockAchievements(['tutorial']);
  const title = skipped ? '튜토리얼을 마쳤다' : '튜토리얼 완료';
  const sub = skipped ? '언제든 메인 화면에서 다시 볼 수 있다.' : state.winReason;
  fx.endScreen(true, title, sub, () => showMain(), { againLabel: '본 게임으로', closeLabel: '보드 보기' });
}

function bindMain() {
  $('startGame').onclick = () => startFromMain('new');
  $('msSound').onclick = () => { setSound(!soundOn()); renderMainStatus(); renderTools(); sfx.click(); };
  $('msMusic').onclick = () => { setMusic(!musicOn()); renderMainStatus(); renderTools(); sfx.click(); };
  $('msMotion').onclick = () => { fx.setReduced(!fx.motion.reduced); renderMainStatus(); renderTools(); sfx.click(); };
  addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('mainScreen').hidden && document.activeElement?.id !== 'optSeed') {
      e.preventDefault();
      startFromMain($('resumeGame') ? 'resume' : 'new');
    }
    if (e.key === 'Escape' && $('mainScreen').hidden && phase !== 'thinking' && phase !== 'playing' && !document.querySelector('.choice-modal:not(.list-modal)')) showMain();
  });
  addEventListener('keydown', onKey);
}

function bindTileTips() {
  const tip = $('tileTip');
  const board = $('board');
  board.addEventListener('pointermove', (e) => {
    const g = e.target.closest?.('.tile');
    if (!g) { tip.classList.remove('show'); return; }
    const cur = V();
    const t = cur.tileAt[g.dataset.id];
    tip.innerHTML = tileTipHTML(cur, t);
    tip.classList.add('show');
    const x = Math.min(e.clientX + 18, innerWidth - tip.offsetWidth - 8);
    const y = Math.min(e.clientY + 18, innerHeight - tip.offsetHeight - 8);
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
  });
  board.addEventListener('pointerleave', () => tip.classList.remove('show'));
}

function tileTipHTML(cur, t) {
  if (!t.revealed) return `<b>안개 지대 · ${t.id}</b><span>아직 아무도 가 보지 않은 땅. 탐험하면 모습이 드러난다.</span>`;
  const terr = TERRAIN[t.terrain];
  const owner = t.owner === 'player' ? '우리 부족의 땅' : t.owner === 'enemy' ? '율법파의 땅' : '주인 없는 땅';
  const bld = t.building === 'capital' ? (t.owner === 'player' ? '신전 — 기도하는 곳' : '율법파의 탑') : t.building === 'village' ? '마을 — 인구 한도 +2, 식량 +1' : '';
  const gather = t.building === 'capital' ? '' : terr.gather ? `${RESOURCE_NAME[terr.gather]} 채집 +${terr.amount}` : '메마른 땅 — 아무것도 얻을 수 없다';
  const marks = t.faithMarks ? `믿음의 표식 ${t.faithMarks.n}/2 — ${t.faithMarks.side === 'player' ? '한 번 더 전하면 우리 땅' : '율법파가 한 번 더 가르치면 넘어간다'}` : '';
  const intent = ['speak', 'thinking', 'confirm'].includes(phase) ? enemyIntent(state).find((a) => a.shown && a.tile === t.id) : null;
  const threat = intent ? `율법파가 이번 장에 이곳을 노린다: ${enemyLabel(intent).replace(/\(.*\)$/, '')} — ${state.first === 'player' ? '선공이니 먼저 움직이면 막는다' : '율법파가 선공이라 먼저 가져간다'}` : '';
  return `<b>${esc(tileName(cur, t, 'player'))}</b><span>${[owner, bld, gather, t.wall ? '성벽 — 방어 +2' : '', marks, threat].filter(Boolean).map(esc).join('<br>')}</span>`;
}

function bindTools() {
  bindMain();
  bindTileTips();
  $('home').onclick = () => { if (document.querySelector('.choice-modal:not(.list-modal)')) return; sfx.click(); showMain(); };
  $('ai').onclick = () => {
    if (!aiUsable || phase === 'thinking') return;
    aiMode = aiMode === 'llm' ? 'tablet' : 'llm';
    sfx.click();
    renderTools();
  };
  $('sound').onclick = () => { setSound(!soundOn()); renderTools(); sfx.click(); };
  $('music').onclick = () => { setMusic(!musicOn()); renderTools(); sfx.click(); };
  $('motion').onclick = () => { fx.setReduced(!fx.motion.reduced); renderTools(); sfx.click(); };
  $('openChron').onclick = () => { renderChron(); $('chronicle').classList.add('open'); sfx.page(); };
  $('closeChron').onclick = () => $('chronicle').classList.remove('open');
}

// 장이 끝나면 판 위의 미플이 각자의 매트로 돌아간다
async function returnMeeples() {
  const pieces = [...document.querySelectorAll('#board .pieces .meeple')];
  if (!pieces.length || fx.motion.reduced) return;
  const items = [];
  const counts = { player: 0, enemy: 0 };
  for (const g of pieces) {
    const side = g.dataset.side;
    const slot = document.querySelectorAll(`#mat${side === 'player' ? 'Player' : 'Enemy'} .meeples svg`)[counts[side]++];
    if (!slot) continue;
    items.push({ from: center(g.querySelector('.meeple-body') ?? g), to: center(slot), side });
    g.style.opacity = '0';
  }
  await fx.flyMeeples(items.slice(0, 10), () => {});
}

async function newRound() {
  if (resolved) { lockAltar(); await returnMeeples(); }
  startRound(state);
  phase = 'speak';
  pending = null;
  resolved = null;
  targeting = null;
  notice = '';
  dealSeason = true;
  focusId = null;
  fx.unfocus(frameEl());
  music.start();
  music.setMood('calm');
  render();
  meta.saveGame(state, 'speak');
  if (state.miracleOffer) setTimeout(showMiracleDraft, fx.motion.reduced ? 300 : 2500);
  const judge = state.judgement !== 'classic' ? ` · 심판의 기준 「${JUDGEMENTS[state.judgement].name}」` : '';
  fx.chapter(frameEl(), `제 ${state.round} 장`, state.round === 1 ? `${state.event.name}${judge}` : state.event.name);
  if (state.round === 1 && state.leader) setTimeout(() => leaderSay(leaderLine(state, 'intro')), fx.motion.reduced ? 300 : 2400);
  else if (state.reacted && REACT[state.reacted]) setTimeout(() => leaderSay(REACT[state.reacted].line), fx.motion.reduced ? 300 : 2400);
  if (tutorial) {
    const round = state.round;
    // 장 제목이 걷힌 뒤에 말을 건다. 그새 계시를 내렸다면(제단이 잠겼다면) 이번 장 설명은 건너뛴다
    setTimeout(() => {
      if (phase === 'speak' && state.round === round && !document.querySelector('.seal-btn')?.disabled) tutorial?.on('speak', round);
    }, fx.motion.reduced ? 400 : 2300);
  }
}

// 같은 설정(같은 맵)으로 다시
function restart() {
  beginGame(state.config);
}

// ---------- 계시 ----------
async function speak() {
  const ta = document.querySelector('.scroll textarea');
  const text = (ta?.value ?? '').trim();
  if (!text) { ta?.focus(); return; }
  const cost = revelationCostFor(state, text);
  const p = state.sides.player;
  if (p.faith < cost) { notice = `신앙이 모자라다 (필요 ${cost}, 보유 ${p.faith}). 계시를 줄이거나 침묵하라.`; sfx.fail(); renderAltar(); return; }
  p.faith -= cost;
  draft = '';
  hintTiles = [];
  targeting = null;
  lockAltar();
  tutorial?.hide();
  // 이름 붙이기는 해석 전에 새긴다 (새 이름이 대사제의 목록에 들어간다)
  const naming = nameTile(state, parseNaming(text));
  if (naming) naming.name = state.names[naming.tile];
  // 인장·빛기둥 연출이 도는 동안 대사제가 먼저 해석을 시작한다
  const job = runInterpretation(text);
  await fx.castRevelation(document.querySelector('.scroll'), document.querySelector('.seal-btn'), frameEl(), text);
  await interpret(text, job, naming);
}

function lockAltar() { document.querySelectorAll('#altar button, #altar textarea').forEach((b) => { b.disabled = true; }); }

// 해석만 한다 (화면은 건드리지 않는다). 실패하면 석판으로 대신한다
async function runInterpretation(text) {
  if (aiMode === 'llm') {
    try {
      await prepareLLM((p) => { progress = p; if (phase === 'thinking') renderAltar(); });
      progress = null;
      return { result: await interpretWithLLM(state, text) };
    } catch (e) {
      return { result: interpretWithTablet(state, text), notice: `대사제가 말씀을 알아듣지 못해 석판으로 해석했다 (${e.name}).` };
    }
  }
  await fx.wait(700);
  return { result: interpretWithTablet(state, text) };
}

async function interpret(text, job = runInterpretation(text), naming = pending?.naming ?? null) {
  phase = 'thinking';
  notice = '';
  render();
  const done = await job;
  const result = done.result;
  notice = done.notice ?? '';
  pending = {
    text, result, fresh: true, naming, dropped: new Set(),
    tone: detectTone(text), cited: citedWords(state, text),
    prophecy: state.prophecy ? null : parseProphecy(text), seal: false,
  };
  derivePending();
  await enterConfirm();
}

// 확인 화면의 파생값: 뺀 칩을 제외하고 다시 검증하고, 연결·청원·기이한 해석을 다시 계산한다
function derivePending() {
  const { text, result } = pending;
  const forbiddenKeys = result.forbidden.map((a) => a.key);
  const orders = result.orders.filter((a) => !pending.dropped.has(a.key));
  const { accepted, rejected } = validateOrders(state, 'player', orders, forbiddenKeys, result.doctrine);
  pending.accepted = accepted;
  pending.rejected = rejected;
  pending.auto = autoFill(state, 'player', accepted, forbiddenKeys);
  pending.links = text ? linkWords(state, text, accepted) : {};
  pending.answered = text ? petitionAnswered(state, text, accepted) : false;
  // 기이한 해석: LLM이 계시의 어떤 낱말과도 잇지 못하는 행동을 골랐고, 석판과도 겹치지 않을 때 (판당 한 번)
  pending.odd = !state.oddUsed && result.source === 'llm' && accepted.length > 0 && !Object.keys(pending.links).length
    && !interpretWithTablet(state, text).orders.some((o) => accepted.some((a) => a.key === o.key));
}

async function enterConfirm() {
  const placed = [...pending.accepted, ...pending.auto];
  // 날아가기 전의 매트 미플 자리를 잰다
  const slots = [...document.querySelectorAll('#matPlayer .meeples svg')];
  const from = placed.map((_, i) => slots[i] ? center(slots[i]) : null);
  pending.incoming = true;
  phase = 'confirm';
  render();
  const board = $('board');
  const items = placed.map((a, i) => ({ from: from[i] ?? center(board), to: markerToScreen(board, state.tileAt[a.tile], 'player'), side: 'player' }));
  await fx.flyMeeples(items, (i) => landMeeple(placed[i].tile, 'player'));
  pending.incoming = false;
}

const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
function landMeeple(tile, side) {
  const g = document.querySelector(`#board .meeple.incoming[data-tile="${tile}"][data-side="${side}"]`);
  if (g) { g.classList.remove('incoming'); g.classList.add('land'); }
}

function silence() {
  sfx.page();
  hintTiles = [];
  targeting = null;
  const auto = autoFill(state, 'player', []);
  pending = {
    text: null,
    result: { interpretation: '신께서 침묵하셨다. 신도들은 각자 일터로 향한다.', orders: [], forbidden: [], doctrine: null, source: 'silence' },
    accepted: [], rejected: [], auto, fresh: true, dropped: new Set(), cited: [], links: {},
  };
  enterConfirm();
}

async function reinterpret() {
  const p = state.sides.player;
  if (state.reinterpretUsed || p.faith < 1 || !pending?.text) return;
  p.faith -= 1;
  state.reinterpretUsed = true;
  await interpret(pending.text);
}

async function accept() {
  lockAltar();
  const { text, result, accepted, auto } = pending;
  tutorial?.hide();
  if (text) {
    state.log.push({ round: state.round, side: 'god', text: `“${text}”` });
    state.log.push({ round: state.round, side: 'priest', text: result.interpretation });
  }
  const before = snapshot(state);
  const enemyPlan = planEnemy(state);
  const from = state.log.length;
  applyTone(state, text ? pending.tone : null);
  if (pending.seal && pending.prophecy) sealProphecy(state, pending.prophecy);
  resolveRound(state, [...accepted, ...auto], enemyPlan);
  if (!state.winner && text) keepVows(state, result.forbidden, [...accepted, ...auto]);
  if (!state.winner) wordsAfter(pending);
  // 교리는 해결이 끝난 뒤에 오른다: 확인 화면에 보인 수치 그대로 해결되도록
  if (text) recordRevelation(state, text, result.doctrine, pending.tone === 'metaphor' ? 1 : 0);
  if (pending.naming?.first && state.sides.player.doctrine.wisdom < RULES.graceDoctrineBelow) state.sides.player.doctrine.wisdom += 1;
  // 신학 노트: LLM이 석판 규칙에 없는 말버릇을 행동으로 읽었으면 배운다
  const lesson = text && result.source === 'llm' ? extractLesson(state, text, accepted) : null;
  if (lesson) { state.lessons.push(lesson); if (state.lessons.length > 3) state.lessons.shift(); pendingLesson = lesson; }
  const last = state.history.at(-1);
  if (last) last.text = text;
  resolved = { enemyPlan, playerPlan: [...accepted, ...auto], logs: state.log.slice(from), shown: [], words: pending };
  // 지도자의 반박은 연대기에만 남는다 (재생할 보드 장면이 없다)
  if (text && state.leader) {
    const line = leaderLine(state, 'rebuttal', { doctrine: result.doctrine, word: nouns(text)[0] });
    if (line) { state.log.push({ round: state.round, side: 'leader', text: `${ENEMY_LEADERS[state.leader].name}: “${line}”` }); resolved_rebuttal = line; }
  }
  await playback(before);
}

// 해결 뒤: 청원 응답·이름 붙이기의 은총, 외면당한 청원 (로그에 남아 재생된다)
function wordsAfter(pd) {
  if (pd.odd && !state.oddUsed) {
    state.oddUsed = true;
    const said = nouns(pd.text)[0] ?? pd.text.slice(0, 8);
    const heard = pd.accepted[0]?.text.replace(/ \(.*\)$/, '') ?? '다른 일';
    grantGrace(state, 1, `신께서 '${said}'${batchim(said) ? '이라' : '라'} 하셨으나 사제는 '${heard}'로 들었다 — 기이한 해석`);
  }
  const pt = state.petition;
  if (pt?.need) {
    if (pd.answered) { state.stats.petitions += 1; state.petitionIgnored = 0; grantGrace(state, 1, `${pt.from}의 청원에 응답했다`); }
    else if (++state.petitionIgnored >= 2) {
      state.petitionIgnored = 0;
      state.sides.player.faith = Math.max(0, state.sides.player.faith - 1);
      state.log.push({ round: state.round, side: 'player', text: `청원이 거듭 외면당해 신도들이 서운해한다. 신앙 -1.`, fx: { kind: 'warn' }, snap: snapshot(state) });
    }
  }
  if (pd.naming) grantGrace(state, 1, `${TERRAIN_NAME(pd.naming.tile)}${hasBatchim(TERRAIN_NAME(pd.naming.tile)) ? '을' : '를'} '${pd.naming.name}'${hasBatchim(pd.naming.name) ? '이라' : '라'} 부르게 했다`);
}
const hasBatchim = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
const TERRAIN_NAME = (id) => { const t = state.tileAt[id]; return t.building === 'village' ? '마을' : t.building === 'capital' ? '신전' : TERRAIN[t.terrain]?.name ?? '땅'; };

// ---------- 판의 끝: 서고에 남기고, 성서를 채우고, 종료 양피지를 편다 ----------
function finishGame() {
  if (!state.tutorial) meta.clearSave();
  const h = state.history;
  const summary = summarizeGame(state, {
    comeback: state.winner === 'player' && h.some((x) => x.es - x.ps >= 6),
    capitalFull: state.sides.player.capitalHp === CAPITAL_HP,
  });
  const had = meta.getAchievements();
  meta.pushHistory(summary);
  const fresh = meta.unlockAchievements(evaluateAchievements(summary));
  if (state.config.daily) meta.recordDaily(state.config.daily, { winner: state.winner, score: summary.score, rounds: state.round });
  const standard = !state.tutorial && !state.config.daily && !state.config.challenge && state.config.veteran;
  summary.newBest = standard && state.winner === 'player' && meta.setBest(state.config, summary.score[0]);
  checkOnboard(true);
  showEnd(summary, fresh, had);
}

function showEnd(summary, fresh, had) {
  const won = state.winner === 'player';
  const title = state.winner === 'draw' ? '무승부' : won ? '승리' : '패배';
  const ch = state.config.challenge;
  const chText = ch ? (ch.target ? (won && summary.score[0] > ch.target ? ` · 도전 성공 (${summary.score[0]} > ${ch.target})` : ` · 도전 실패 — ${summary.score[0]} : ${ch.target}`) : '') : '';
  const sub = `${state.winReason.replace(/ — 승점.*/, '')} · 승점 ${summary.score[0]} : ${summary.score[1]}${chText}`;
  const ep = epilogue(state);
  const scene = decisiveScene(state);
  const luck = diceLuck(state);
  const top = topRevelations(state);
  const near = closestAchievement(summary, { ...had, ...Object.fromEntries(fresh.map((id) => [id, 1])) });
  const achName = (id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id;
  const graph = scoreGraph(state.history);
  const canCanon = state.config.veteran && !state.tutorial;
  const canon = meta.getCanon();
  const body = `
    <div class="end-tabs" role="tablist"><button class="on" data-tab="story">역사가</button><button data-tab="record">기록</button><button data-tab="book">경전</button></div>
    <div class="end-page" data-page="story">
      <div class="ep-title">${esc(ep.title)}</div>
      <p class="ep-body">${esc(ep.body)}</p>
      ${ep.quote ? `<p class="ep-quote">${esc(ep.quote)}</p>` : ''}
      <div class="ep-epithet">이 신은 「${esc(ep.epithet)}」${hasBatchim(ep.epithet) ? '으로' : '로'} 기억되었다.</div>
      ${fresh.length ? `<div class="ep-ach">새 구절이 성서에 기록되었다 — ${fresh.map((id) => `「${esc(achName(id))}」`).join(' ')}</div>` : ''}
      ${summary.newBest ? `<div class="ep-ach best">새 기록 — 이 맵(시드 ${state.config.seed})에서 승점 ${summary.score[0]}</div>` : ''}
    </div>
    <div class="end-page" data-page="record" hidden>
      ${graph}
      ${scene ? `<p class="rec-line"><b>결정적 장면</b> 제 ${scene.round} 장${scene.revelation ? ` — “${esc(scene.revelation)}”` : ''} → ${esc(scene.text)}</p>` : ''}
      ${top.length ? `<div class="rec-top"><b>가장 강한 말씀</b>${top.map((t) => `<span>제 ${t.round} 장 “${esc(t.text)}” <i>${t.gain >= 0 ? '+' : ''}${t.gain}</i></span>`).join('')}</div>` : ''}
      <p class="rec-line"><b>주사위 운</b> ${luck.n ? `${luck.n}번 굴려 기대보다 ${luck.luck >= 0 ? '+' : ''}${luck.luck.toFixed(1)}승` : '굴린 적 없음'}</p>
      ${near ? `<p class="rec-line"><b>다음 구절까지</b> 「${esc(near.a.name)}」 — ${esc(near.a.desc)} (${Math.round(near.p * 100)}%)</p>` : ''}
    </div>
    <div class="end-page" data-page="book" hidden>
      ${canCanon ? '<p class="book-help">한 구절을 정경으로 봉헌하면 다음 판에 그 교리가 한 칸 올라 시작한다.</p>' : '<p class="book-help">두 번째 판부터는 이 경전의 한 구절을 정경으로 봉헌할 수 있다.</p>'}
      <ol class="book">${state.revelations.map((r) => `<li><span class="bk-r">제 ${r.round} 장</span><span class="bk-t">“${esc(r.text)}”</span><span class="bk-d">${esc(doctrineName(r.doctrine))}</span>
        ${canCanon ? `<button class="text-btn canon" data-text="${esc(r.text)}" data-doc="${r.doctrine ?? 'wisdom'}" type="button">${canon.some((c) => c.text === r.text) ? '봉헌됨' : '봉헌'}</button>` : ''}</li>`).join('') || '<li>이 판에는 계시가 없었다.</li>'}</ol>
    </div>`;
  const o = fx.endScreen(won, title, sub, restart, {
    bodyHTML: body,
    buttons: [
      { label: '시편 복사', keep: true, onClick: () => copyPsalm(summary) },
      { label: '같은 맵 다시', cls: 'btn-primary', onClick: restart },
      { label: '새 맵', onClick: () => { setup.seed = randomSeed(); saveSetup(); beginGame({ ...setup, mode: 'standard', veteran: true, canon: meta.getCanon()[0] ?? null }); } },
      { label: '메인 화면', onClick: () => showMain() },
      { label: '보드 보기' },
    ],
  });
  const host = document.querySelector('.endscreen.rich');
  host?.querySelectorAll('.end-tabs button').forEach((b) => {
    b.onclick = () => {
      sfx.page();
      host.querySelectorAll('.end-tabs button').forEach((x) => x.classList.toggle('on', x === b));
      host.querySelectorAll('.end-page').forEach((p) => { p.hidden = p.dataset.page !== b.dataset.tab; });
    };
  });
  host?.querySelectorAll('.canon').forEach((b) => {
    b.onclick = () => { meta.addCanon({ text: b.dataset.text, doctrine: b.dataset.doc }); sfx.seal(); host.querySelectorAll('.canon').forEach((x) => { x.textContent = meta.getCanon().some((c) => c.text === x.dataset.text) ? '봉헌됨' : '봉헌'; }); };
  });
  return o;
}

// 시편 카드: 결정적 장면의 계시·대사제의 외침·결과·도전 링크를 텍스트로 복사한다
async function copyPsalm(summary) {
  const scene = decisiveScene(state);
  const round = scene?.round ?? state.revelations.at(-1)?.round;
  const rev = state.revelations.find((r) => r.round === round)?.text;
  const cry = state.log.find((l) => l.round === round && l.side === 'priest')?.text;
  const url = `${location.origin}${location.pathname}?seed=${state.config.seed}&size=${state.rows}&diff=${state.config.difficulty}&target=${summary.score[0]}`;
  const won = state.winner === 'player' ? '승리' : state.winner === 'draw' ? '무승부' : '패배';
  const text = [
    `「계시록: 말씀의 전쟁」${round ? ` 제 ${round} 장` : ''}`,
    rev ? `신: “${rev}”` : null,
    cry ? `대사제: “${cry}”` : null,
    scene ? `→ ${scene.text}` : null,
    `${won} (${state.winReason.replace(/ — 승점.*/, '')}) · 승점 ${summary.score[0]} : ${summary.score[1]} · ${state.rows}×${state.cols} ${DIFFICULTY[state.config.difficulty].name}`,
    `이 신은 「${summary.epithet}」${batchim(summary.epithet) ? '으로' : '로'} 기억되었다.`,
    `같은 맵에 도전하기: ${url}`,
  ].filter(Boolean).join('\n');
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.append(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch { /* 무시 */ }
    ta.remove();
  }
  const b = [...document.querySelectorAll('.end-actions button')].find((x) => x.textContent.startsWith('시편'));
  if (b) { b.textContent = ok ? '복사했다' : '복사 실패'; setTimeout(() => { b.textContent = '시편 복사'; }, 1800); }
  sfx.page();
}

// 장별 승점 곡선 (SVG)
function scoreGraph(h) {
  if (h.length < 2) return '';
  const W = 520; const H = 150; const P = 26;
  const max = Math.max(...h.flatMap((x) => [x.ps, x.es]), 10);
  const x = (i) => P + (i * (W - P * 2)) / (h.length - 1);
  const y = (v) => H - P - (v / max) * (H - P * 2);
  const line = (k) => h.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
  const marks = h.map((p, i) => (p.verdict === 'full' ? `<circle cx="${x(i)}" cy="${y(p.ps)}" r="4" class="g-full"/>` : '')).join('');
  return `<svg class="score-graph" viewBox="0 0 ${W} ${H}"><path d="M${P},${H - P}H${W - P}" class="g-axis"/>
    <path d="${line('es')}" class="g-enemy"/><path d="${line('ps')}" class="g-player"/>${marks}
    <text x="${W - P}" y="${y(h.at(-1).ps) - 8}" class="g-lbl p">우리 ${h.at(-1).ps}</text><text x="${W - P}" y="${y(h.at(-1).es) + 16}" class="g-lbl e">율법파 ${h.at(-1).es}</text></svg>`;
}

// ---------- 메인 화면: 서고·성서·오늘의 계시 ----------
function renderMetaLinks() {
  const n = meta.getHistory().length;
  $('msLibrary').hidden = n === 0;
  $('msBible').hidden = n === 0 && !Object.keys(meta.getAchievements()).length;
  $('startDaily').hidden = n === 0;
  const today = meta.dayKey();
  const done = meta.getDaily()[today];
  $('dailyHint').textContent = done ? `오늘 ${done.winner === 'player' ? '승리' : '패배'} · 이번 달 ${meta.dailyDaysThisMonth()}일` : `${Number(today.slice(5, 7))}월 ${Number(today.slice(8))}일 · 이번 달 ${meta.dailyDaysThisMonth()}일`;
  $('msLibrary').textContent = `서고 · ${n}판`;
  $('msBible').textContent = `성서 · ${Object.keys(meta.getAchievements()).length}/${ACHIEVEMENTS.length}`;
}

function listModal(title, html) {
  const o = document.createElement('div');
  o.className = 'choice-modal list-modal';
  o.innerHTML = `<div class="list-box"><div class="list-head"><h3>${esc(title)}</h3><button class="btn-ghost list-close" type="button">닫기</button></div><div class="list-body">${html}</div></div>`;
  document.body.append(o);
  const close = () => { o.classList.add('out'); setTimeout(() => o.remove(), 300); };
  o.querySelector('.list-close').onclick = close;
  o.onclick = (e) => { if (e.target === o) close(); };
  return o;
}

function showLibrary() {
  const hist = meta.getHistory();
  const wins = hist.filter((g) => g.winner === 'player').length;
  const kinds = {};
  for (const g of hist) if (g.winner === 'player') kinds[g.kind] = (kinds[g.kind] ?? 0) + 1;
  const kindName = { conquest: '점령', faith: '개종', cathedral: '대성당', score: '승점' };
  const byDiff = ['easy', 'normal', 'hard'].map((d) => {
    const g = hist.filter((x) => x.difficulty === d);
    return g.length ? `<span>${difficultyName(d)} <b>${g.filter((x) => x.winner === 'player').length}</b>/${g.length}</span>` : '';
  }).join('');
  const avgRounds = hist.length ? (hist.reduce((a, g) => a + g.rounds, 0) / hist.length).toFixed(1) : 0;
  const best = hist.filter((g) => g.winner === 'player').sort((a, b) => b.score[0] - a.score[0])[0];
  const maxKind = Math.max(1, ...Object.values(kinds));
  const bars = Object.entries(kindName).map(([k, n]) => `<div class="kbar"><span>${n}</span><i style="width:${((kinds[k] ?? 0) / maxKind) * 100}%"></i><b>${kinds[k] ?? 0}</b></div>`).join('');
  const stats = `<div class="lib-stats"><span><b>${hist.length}</b>판</span><span><b>${wins}</b>승</span><span>승률 <b>${hist.length ? Math.round((wins / hist.length) * 100) : 0}%</b></span>
    ${byDiff}<span>평균 <b>${avgRounds}</b>장</span>${best ? `<span>최고 승점 <b>${best.score[0]}</b></span>` : ''}</div>
    ${wins ? `<div class="kbars">${bars}</div>` : ''}`;
  const rows = hist.map((g, i) => `<details class="lib-row"><summary><span class="lr-date">${esc(g.date.slice(5, 10).replace('-', '/'))}</span>
      <span class="lr-res ${g.winner === 'player' ? 'win' : 'lose'}">${g.winner === 'player' ? '승리' : g.winner === 'draw' ? '무승부' : '패배'}</span>
      <span class="lr-meta">${g.size}×${g.size} · ${esc(difficultyName(g.difficulty))}${g.daily ? ' · 오늘의 계시' : ''} · ${g.rounds}장 · ${g.score[0]}:${g.score[1]}</span>
      <span class="lr-ep">「${esc(g.epithet)}」</span></summary>
      <ol class="book">${g.revelations.map((r) => `<li><span class="bk-r">제 ${r.round} 장</span><span class="bk-t">“${esc(r.text)}”</span></li>`).join('') || '<li>계시 없음</li>'}</ol>
      <div class="lr-foot">시드 ${g.seed}${g.leader ? ` · ${esc(g.leader)}` : ''} · ${esc(g.reason)}</div></details>`).join('');
  listModal('서고 — 지난 판들', stats + (rows || '<p>아직 기록이 없다.</p>'));
}

function showBible() {
  const have = meta.getAchievements();
  const html = `<div class="bible">${ACHIEVEMENTS.map((a) => `<div class="verse ${have[a.id] ? 'got' : ''}"><b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${have[a.id] ? `<i>${esc(have[a.id])}</i>` : ''}</div>`).join('')}</div>`;
  listModal(`성서 — ${Object.keys(have).length} / ${ACHIEVEMENTS.length} 구절`, html);
}

// ---------- 사관 세라의 과제 (튜토리얼 뒤 첫 판들) ----------
const TASKS = [
  { text: '마을 하나를 세우소서', done: () => villageCount(state, 'player') >= 1 },
  { text: '기적을 한 번 내리소서', done: () => state.stats.miracles >= 1 },
  { text: '교리 하나를 두 칸까지 쌓으소서', done: () => DOCTRINES.some((k) => state.sides.player.doctrine[k] >= 2) },
  { text: '한 판을 이기소서', done: (end) => end && state.winner === 'player' },
];
const CHEER = ['잘하셨습니다. 땅이 넓어지면 신도도 늘지요. 다음은 기적입니다.', '하늘이 움직였군요! 이제 한 가지 뜻을 꾸준히 말해 교리를 쌓아 보시지요.', '교리가 문명이 되어 갑니다. 이제 이기실 차례입니다.', '훌륭하십니다. 이제 저는 기록만 하겠습니다. 신의 뜻대로 하소서.'];
function currentTask() {
  if (state.tutorial) return null;
  const ob = meta.getOnboard();
  return ob.off || ob.step >= TASKS.length ? null : { ...TASKS[ob.step], step: ob.step };
}
function checkOnboard(end = false) {
  const t = currentTask();
  if (!t || !t.done(end)) return;
  meta.setOnboard({ ...meta.getOnboard(), step: t.step + 1 });
  if (!end) matSay('matPlayer', '사관 세라', CHEER[t.step], 'priest');
  renderMats();
}

// ---------- 선택 카드 (기적 드래프트, 발견지) ----------
function choiceModal({ kind, title, text, options }) {
  return new Promise((resolve) => {
    const o = document.createElement('div');
    o.className = 'choice-modal';
    o.innerHTML = `<div class="choice-box"><div class="kind">${esc(kind)}</div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}
      <div class="choice-row">${options.map((op, i) => `<button type="button" class="choice-card" data-i="${i}">${op.art ? svgUse(op.art, 'art', '0 0 48 48') : ''}<b>${esc(op.label)}</b><span>${esc(op.text)}</span>${op.cost != null ? `<i>신앙 ${op.cost}</i>` : ''}</button>`).join('')}</div></div>`;
    document.body.append(o);
    document.activeElement?.blur?.();
    sfx.deal();
    o.querySelectorAll('.choice-card').forEach((b) => fx.attachTilt(b, 8));
    o.querySelectorAll('.choice-card').forEach((b) => {
      b.onclick = () => { sfx.holy(); o.classList.add('out'); setTimeout(() => o.remove(), 350); resolve(options[Number(b.dataset.i)].id); };
    });
  });
}

async function showMiracleDraft() {
  if (!state.miracleOffer || phase !== 'speak') return;
  const id = await choiceModal({
    kind: '제 5 장 · 새 기적', title: '하늘이 새 기적을 내민다 — 하나를 받으라', text: '받은 기적은 이 판이 끝날 때까지 손에 남는다.',
    options: state.miracleOffer.map((mid) => { const m = MIRACLES.find((x) => x.id === mid); return { id: mid, label: m.name, text: m.text, cost: m.cost, art: MIRACLE_ART[mid] }; }),
  });
  takeMiracle(state, id);
  if (phase === 'speak') meta.saveGame(state, 'speak');
  renderAltar();
}

async function showSiteChoice() {
  const t = state.tileAt[state.pendingSite];
  const site = SITES[t.site.id];
  const id = await choiceModal({ kind: `발견 · ${tileName(state, t)}`, title: site.name, text: site.text, options: site.choice.map((c) => ({ id: c.id, label: c.label, text: c.text })) });
  const msg = resolveSite(state, id);
  if (!msg) return;
  state.log.push({ round: state.round, side: 'player', text: msg });
  fx.floatText($('board'), t, msg.split('.')[0], 'good');
  renderMats();
  renderAltar();
}

// 판결문: 명령한 행동이 얼마나 이루어졌나
function verdictOf(pd, logs) {
  if (!pd?.text || !pd.accepted.length) return null;
  let ok = 0;
  let best = null;
  for (const a of pd.accepted) {
    const mine = logs.filter((l) => l.act === a.key);
    const good = mine.some((l) => (l.dice ? l.dice.win : !['fail', 'blocked'].includes(l.fx?.kind)));
    if (good) { ok += 1; best ??= mine.find((l) => l.dice?.win) ?? mine[0]; }
  }
  const rate = ok / pd.accepted.length;
  const grade = pd.odd ? 'odd' : rate >= 0.7 ? 'full' : rate >= 0.3 ? 'half' : 'miss';
  const word = Object.values(pd.links ?? {})[0] ?? pd.text.slice(0, 12);
  const deed = best ? best.text.replace(/^(신도들이|신도들의|우리 신도의)\s*/, '').replace(/\.$/, '') : '';
  const ira = `'${word}'${hasBatchim(word) ? '이라' : '라'}`;
  const text = grade === 'miss' ? `신께서 ${ira} 하셨으나, 말씀은 아직 이루어지지 않았다.`
    : `신께서 ${ira} 하셨고, ${deed}.`;
  return { grade, text: grade === 'odd' ? `신께서 ${ira} 하셨으나 사제는 다르게 들었다. 그래도 ${deed || '무언가 이루어졌다'}.` : text, stamp: { full: '성취', half: '반쯤', miss: '빗나감', odd: '기이' }[grade] };
}

// ---------- 해결 재생 ----------
const makeView = (snap) => ({
  ...state, tiles: snap.tiles, sides: snap.sides, tileAt: Object.fromEntries(snap.tiles.map((t) => [t.id, t])),
});

async function playback(before) {
  const enemySlots = [...document.querySelectorAll('#matEnemy .meeples svg')];
  const enemyFrom = resolved.enemyPlan.map((_, i) => enemySlots[i] ? center(enemySlots[i]) : null);
  phase = 'playing';
  view = makeView(before);
  flipLaw = true;
  resolved.incomingEnemy = true;
  music.setMood('tension');
  sfx.deal();
  render();
  if (state.leader) {
    const said = resolved_rebuttal ?? leaderLine(state, 'card', { card: state.lawCard });
    resolved_rebuttal = null;
    setTimeout(() => leaderSay(said), 500);
  }
  const board = $('board');
  const visible = resolved.enemyPlan.filter((a) => state.tileAt[a.tile].revealed);
  await fx.wait(450);
  await fx.flyMeeples(visible.map((a) => ({
    from: enemyFrom[resolved.enemyPlan.indexOf(a)] ?? center($('matEnemy')),
    to: markerToScreen(board, view.tileAt[a.tile], 'enemy'), side: 'enemy',
  })), (i) => landMeeple(visible[i].tile, 'enemy'));
  resolved.incomingEnemy = false;
  await fx.wait(350);
  let lastHidden = false;
  let combo = 0;
  for (const log of resolved.logs) {
    if (!log.snap) continue;
    matView = view;
    view = makeView(log.snap);
    resolved.shown.push(log);
    const t = log.fx?.tile ? view.tileAt[log.fx.tile] : null;
    const seen = t && (t.revealed || log.side === 'player');
    focusId = seen ? t.id : null;
    renderBoardView();
    renderAltar();
    if (seen) fx.focusTile(frameEl(), board, t); else fx.unfocus(frameEl());
    // 안개 속 율법파의 일은 연달아 나오면 한 번만 알리고 빠르게 넘긴다
    const hidden = t && !seen;
    const repeatHidden = hidden && lastHidden;
    lastHidden = hidden;
    const banner = repeatHidden ? null : bannerFor(log, seen);
    if (banner && !fx.motion.skip) { fx.actionBanner(frameEl(), banner); await fx.wait(420); }
    if (repeatHidden) await fx.wait(120); else await playFx(log);
    // 연속 성공 콤보: 우리 성공이 이어질수록 음이 오른다
    if (log.side === 'player' && log.fx) {
      const good = log.dice ? log.dice.win : ['gain', 'build', 'treasure', 'grace', 'streak', 'birth', 'cathedral', 'prophecy'].includes(log.fx.kind);
      const bad = log.dice ? !log.dice.win : ['fail', 'blocked', 'loss', 'warn'].includes(log.fx.kind);
      if (good) combo += 1; else if (bad) combo = 0;
      if (good && combo >= 2 && !fx.motion.skip) sfx.coin(Math.min(7, combo + 2));
      if (good && combo >= 3 && !fx.motion.skip && !fx.motion.reduced && t) fx.floatText($('board'), t, `×${combo}`, 'gold', -40);
    }
    if (state.leader && log.side === 'player' && log.fx?.capital) leaderSay(leaderLine(state, 'capitalLow'));
    else if (state.leader && log.side === 'player' && (log.fx?.capture || log.fx?.convert)) leaderSay(leaderLine(state, 'villageLost'));
    matView = null;
    renderMats();
    renderTrack();
  }
  focusId = null;
  fx.unfocus(frameEl());
  fx.clearBanner(frameEl());
  view = null;
  fx.motion.skip = false;
  phase = state.winner ? 'over' : 'resolved';
  if (phase !== 'over') music.setMood('calm');
  resolved.ledger = ledgerOf(before);
  resolved.verdict = verdictOf(resolved.words, resolved.logs);
  if (resolved.verdict && state.history.at(-1)) state.history.at(-1).verdict = resolved.verdict.grade;
  render();
  playLedger();
  if (phase !== 'over') revealPerk(before);
  if (resolved.verdict) setTimeout(() => (resolved.verdict.grade === 'miss' ? sfx.fail() : sfx.seal?.()), 200);
  if (pendingLesson) { const l = pendingLesson; pendingLesson = null; setTimeout(() => priestSay(`깨달았나이다. 신께서 '${l.word}'${batchim(l.word) ? '이라' : '라'} 하시면 ${josa(describeLesson(l), '을', '를')} 뜻하시는군요.`), 900); }
  if (state.pendingSite && phase !== 'over') await showSiteChoice();
  if (phase === 'over') { if (!state.tutorial) meta.clearSave(); } else meta.saveGame(state, 'resolved');
  if (tutorial) {
    if (phase === 'over') { music.setMood('end'); tutorial.on('end', state.round); return; }
    tutorial.on('resolved', state.round);
  }
  if (phase === 'over') {
    music.setMood('end');
    await fx.wait(700);
    finishGame();
  } else checkOnboard();
}

// 교리 특전 해금: 새로 넘은 칸(2·4·6), 또는 8장에 깨어난 궁극 — 장당 하나
function revealPerk(before) {
  const b = before.sides.player.doctrine;
  const d = state.sides.player.doctrine;
  for (const k of DOCTRINES) {
    for (const lv of [6, 4, 2]) {
      if (b[k] < lv && d[k] >= lv) {
        const early = lv === 6 && state.round < ULT_ROUND;
        setTimeout(() => fx.perkReveal(frameEl(), { title: `${DOCTRINE[k].name} ${lv}칸 · ${early ? '잠든 궁극' : lv === 6 ? '궁극' : '특전 해금'}`, text: early ? `${ULT_ROUND}장에 깨어난다 — ${DOCTRINE[k].perks[lv].replace(/^궁극\(8장부터\) — /, '')}` : DOCTRINE[k].perks[lv].replace(/^궁극\(8장부터\) — /, ''), icon: `d-${k}` }), 900);
        return;
      }
    }
  }
  if (state.round === ULT_ROUND - 1) {
    const k = DOCTRINES.find((x) => d[x] >= DOCTRINE_MAX);
    if (k) setTimeout(() => fx.perkReveal(frameEl(), { title: `${DOCTRINE[k].name} · 궁극이 깨어난다`, text: `다음 장부터 — ${DOCTRINE[k].perks[6].replace(/^궁극\(8장부터\) — /, '')}`, icon: `d-${k}` }), 900);
  }
}

// ---------- 장 결산: 이번 장에 무엇이 늘고 줄었나 ----------
function ledgerOf(before) {
  const b = before.sides.player;
  const a = state.sides.player;
  const bv = makeView(before);
  const rows = [];
  for (const k of RES_KEYS) if (a[k] !== b[k]) rows.push({ key: k, label: RESOURCE_NAME[k], d: a[k] - b[k] });
  if (a.pop !== b.pop) rows.push({ key: 'pop', label: '신도', d: a.pop - b.pop });
  const vd = villageCount(state, 'player') - villageCount(bv, 'player');
  if (vd) rows.push({ key: 'village', label: '마을', d: vd });
  const gap = score(state, 'enemy') - score(state, 'player');
  let hint = null;
  if (!state.winner && gap >= 0 && state.round >= state.maxRounds - 3) {
    const w = JUDGEMENTS[state.judgement ?? 'classic'].w;
    const need = gap; // 동점이면 우리가 이긴다
    hint = need === 0 ? '지금은 동점 — 이대로면 우리가 이긴다' : `역전까지 ${need}점 — 마을 ${Math.ceil(need / w.village)}개 또는 신도 ${Math.ceil(need / w.pop)}명`;
  }
  return { rows, score: score(state, 'player') - score(bv, 'player'), enemyScore: score(state, 'enemy') - score(bv, 'enemy'), hint };
}

function ledgerHTML(l) {
  if (!l) return '';
  const sign = (d) => (d > 0 ? `+${d}` : `${d}`);
  const items = l.rows.map((r, i) => `<span class="lg-item ${r.d > 0 ? 'up' : 'down'}" style="--i:${i}">${esc(r.label)} <b>${sign(r.d)}</b></span>`).join('');
  return `<div class="ledger"><span class="lg-head">이번 장</span>${items || '<span class="lg-item" style="--i:0">변화 없음</span>'}
    <span class="lg-score ${l.score >= 0 ? 'up' : 'down'}" style="--i:${l.rows.length}">승점 <b>${sign(l.score)}</b></span>
    <span class="lg-enemy">율법파 ${sign(l.enemyScore)}</span>${l.hint ? `<span class="lg-hint">${esc(l.hint)}</span>` : ''}</div>`;
}

// 항목이 하나씩 쌓이며 음이 오른다
function playLedger() {
  const l = resolved?.ledger;
  if (!l || fx.motion.reduced) return;
  l.rows.forEach((r, i) => setTimeout(() => sfx.coin(i), 120 + i * 130));
  setTimeout(() => { if (l.score > 0) sfx.chime(); }, 160 + l.rows.length * 130);
}

// 해결 단계마다 보드 위에 띄우는 띠
function bannerFor(log, seen) {
  const e = log.fx;
  if (!e) return null;
  if (log.side !== 'player' && log.side !== 'enemy') return null;
  const who = log.side === 'player' ? '우리 신도' : '율법파';
  if (e.tile && !seen) return { side: log.side, icon: 's-tablet', title: `${who} · 안개 속의 움직임`, detail: '무엇을 했는지 보이지 않는다' };
  const res = e.gain ? Object.keys(e.gain)[0] : null;
  const isPray = e.kind === 'gain' && res === 'faith' && log.fx.tile && view?.tileAt[log.fx.tile]?.building === 'capital';
  const map = {
    gain: [isPray ? 'i-temple' : `i-${res}`, isPray ? '기도' : '채집'],
    treasure: ['i-faith', '보물 발견'], explore: ['e-prophet', '탐험'], build: ['i-house', '건설'], cathedral: ['i-temple', '대성당'],
    preach: ['d-peace', '선교'], attack: ['d-war', '공격'], blocked: ['i-shield', '선점당함'], fail: ['i-shield', '헛걸음'],
    birth: ['i-house', '새 생명'], loss: ['i-shield', '잃음'], warn: ['i-faith', '신앙의 흔들림'], ban: ['s-tablet', '검열'], grace: ['i-faith', '은총'], prophecy: ['i-faith', '예언 성취'], bless: ['i-faith', '기적'], wrath: ['d-war', '신의 분노'], streak: ['i-faith', '말씀이 이어졌다'], site: ['e-prophet', '발견'], lightning: ['m-lightning', '번개'], rain: ['m-rain', '단비'], bounty: ['m-bounty', '풍요'],
  }[e.kind];
  if (!map) return null;
  const [icon, verb] = map;
  return { side: log.side, icon, title: `${who} · ${verb}`, detail: log.text };
}

async function playFx(log) {
  const e = log.fx;
  const svg = $('board');
  const cur = V();
  const tile = e?.tile ? cur.tileAt[e.tile] : null;
  if (!e || (tile && !tile.revealed && log.side === 'enemy')) return fx.wait(380);
  const color = log.side === 'player' ? '#8fb4f2' : '#ff8f7f';
  const home = capitalOf(cur, log.side);
  const gainTo = async (t) => {
    if (!t || !e.gain) return;
    const from = tileToHost(svg, null, t);
    const flights = Object.entries(e.gain).map(([k, v]) => fx.flyTokens(from, document.getElementById(`coin-${log.side}-${k}`), `i-${k}`, v));
    Object.entries(e.gain).forEach(([k, v], i) => fx.floatText(svg, t, `+${v} ${RESOURCE_NAME[k]}`, log.side === 'player' ? 'good' : 'bad', i * -22));
    await Promise.all(flights);
  };
  switch (e.kind) {
    case 'gain':
      fx.ring(svg, tile, color);
      await gainTo(tile);
      return fx.wait(150);
    case 'treasure':
      fx.sparks(tileToHost(svg, null, tile), 26);
      sfx.chime();
      await gainTo(tile);
      return fx.wait(200);
    case 'explore':
      fx.ring(svg, tile, '#f4efe4', true);
      fx.floatText(svg, tile, '안개가 걷혔다', 'info');
      sfx.whoosh();
      return fx.wait(900);
    case 'build':
      sfx.build();
      fx.rise(svg, tile, e.icon === '🏠' ? 's-village' : e.icon === '🧱' ? 's-mountain' : log.side === 'player' ? 's-temple' : 's-tower');
      fx.ring(svg, tile, color);
      return fx.wait(1050);
    case 'cathedral':
      sfx.holy();
      fx.rise(svg, tile, 's-temple');
      fx.flash('rgba(255,236,170,.8)', 1000);
      fx.sparks(tileToHost(svg, null, tile), 50);
      return fx.wait(1700);
    case 'blocked':
    case 'fail':
      sfx.fail();
      if (tile) fx.floatText(svg, tile, '✕', 'bad');
      return fx.wait(700);
    case 'preach':
    case 'attack': {
      const mine = log.side === 'player';
      const isAttack = e.kind === 'attack';
      const [l, r] = mine ? ['우리 신도', '율법파'] : ['율법파', '우리 신도'];
      const d = log.dice;
      let w = 0;
      for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + d.attackerBonus > y + d.defenderBonus) w++;
      const odds = w / 36;
      await fx.rollDice(frameEl(), log.dice, {
        leftLabel: `${l} · ${isAttack ? '공격' : '설교'} (승률 ${Math.round(odds * 100)}%)`, rightLabel: `${r} · ${isAttack ? '방어' : '버팀'}`,
        leftSide: log.side, rightSide: other(log.side),
        winText: isAttack ? (e.capital ? '수도를 쳤다' : e.capture ? '점령' : '승리') : '개종',
        loseText: isAttack ? '격퇴당했다' : '외면당했다',
      });
      // 30% 아래에서 이기면 기적
      if (mine && log.dice.win && odds < 0.3 && !fx.motion.skip) {
        sfx.holy();
        fx.flash('rgba(255,236,170,.6)', 700);
        fx.floatText(svg, tile, '기적!', 'good', -26);
      }
      if (isAttack && log.dice.win) {
        sfx.hit();
        fx.shake(frameEl(), 10);
        fx.flash('rgba(200,40,20,.45)', 500);
        fx.ring(svg, tile, '#ff4b3a', true);
        fx.sparks(tileToHost(svg, null, tile), 22, ['#ff6b4a', '#ffb070', '#ffe0b0']);
      } else if (isAttack) {
        sfx.shield();
        fx.floatText(svg, tile, '막혔다', 'bad');
      } else if (!isAttack && log.dice.win) {
        sfx.preach();
        fx.sparks(tileToHost(svg, null, tile), e.convert ? 40 : 18, ['#ffffff', '#cfe3ff', '#ffe9a8']);
        fx.floatText(svg, tile, e.convert ? '마을이 넘어왔다!' : '+1 신도', mine ? 'good' : 'bad');
        if (e.convert) { fx.ring(svg, tile, mine ? '#9cc0ff' : '#ff9f8e', true); sfx.holy(); }
      }
      return fx.wait(600);
    }
    case 'streak':
      sfx.holy();
      fx.flash('rgba(255,236,170,.45)', 700);
      if (tile) { fx.ring(svg, tile, '#ffe28a', true); fx.sparks(tileToHost(svg, null, tile), 40, ['#fff6d0', '#ffd98a', '#ffffff']); }
      if (e.gain && home) await gainTo(home);
      return fx.wait(900);
    case 'wrath':
      sfx.thunder?.();
      fx.flash('rgba(160,30,20,.35)', 600);
      if (home) fx.floatText(svg, home, '신의 분노', 'bad');
      return fx.wait(700);
    case 'bless':
      sfx.holy();
      if (tile) { fx.ring(svg, tile, '#ffe28a', true); fx.sparks(tileToHost(svg, null, tile), 24, ['#fff6d0', '#ffd98a']); fx.floatText(svg, tile, e.label ?? '기적', 'good'); }
      return fx.wait(800);
    case 'site':
      sfx.chime();
      if (tile) { fx.ring(svg, tile, '#f4efe4', true); fx.floatText(svg, tile, '무언가를 만났다', 'info'); }
      return fx.wait(700);
    case 'grace':
    case 'prophecy':
      sfx.chime();
      if (home) { fx.sparks(tileToHost(svg, null, home), e.kind === 'prophecy' ? 44 : 16, ['#fff6d0', '#ffd98a', '#ffffff']); await gainTo(home); }
      if (e.kind === 'prophecy') fx.flash('rgba(255,236,170,.5)', 700);
      return fx.wait(e.kind === 'prophecy' ? 900 : 400);
    case 'warn':
      if (home) fx.floatText(svg, home, '신도들이 흔들린다', 'bad');
      sfx.fail();
      return fx.wait(900);
    case 'loss':
      if (home) fx.floatText(svg, home, '-1 신도', 'bad');
      sfx.loss();
      return fx.wait(750);
    case 'birth':
      if (home) { fx.floatText(svg, home, '+1 신도', 'good'); fx.ring(svg, home, '#9be29b'); }
      sfx.birth();
      return fx.wait(750);
    case 'lightning':
      fx.lightning(svg, tile);
      return fx.wait(900);
    case 'rain':
      fx.rain(frameEl());
      if (home) await gainTo(home);
      return fx.wait(600);
    case 'bounty':
      sfx.chime();
      if (home) { fx.sparks(tileToHost(svg, null, home), 30); await gainTo(home); }
      return fx.wait(300);
    default:
      return fx.wait(400);
  }
}

// ---------- 기적 ----------
async function useMiracle(id) {
  sfx.click();
  if (id === 'lightning') {
    targeting = targeting ? null : 'lightning';
    notice = targeting ? '번개를 내릴 율법파의 땅을 보드에서 고르라.' : '';
    render();
    return;
  }
  // 기적 전 매트를 보여 주고, 토큰이 도착한 뒤에 숫자를 올린다
  const before = makeView(snapshot(state));
  const r = castMiracle(state, id);
  notice = r.ok ? '' : r.text;
  matView = r.ok ? before : null;
  render();
  if (r.ok) {
    matView = null;
    meta.saveGame(state, 'speak');
    await playFx(state.log[state.log.length - 1]);
    renderMats();
    checkOnboard();
    if (state.winner) endByMiracle();
  }
}

async function onTileClick(id) {
  if (targeting !== 'lightning' || phase !== 'speak') return;
  const r = castMiracle(state, 'lightning', id);
  notice = r.ok ? '' : r.text;
  targeting = null;
  render();
  if (r.ok) { meta.saveGame(state, 'speak'); await playFx(state.log[state.log.length - 1]); }
  if (state.winner) endByMiracle();
}

function endByMiracle() {
  phase = 'over';
  render();
  if (tutorial) { music.setMood('end'); tutorial.on('end', state.round); } else finishGame();
}

// ---------- 렌더링 ----------
function render() {
  renderTools();
  renderTrack();
  renderSeason();
  renderBoardView();
  renderMats();
  renderAltar();
}

const iconBtn = (id, on) => `<span class="${on ? '' : 'slash'}"><svg class="u" viewBox="0 0 24 24"><use href="#${id}"/></svg></span>`;

function renderTools() {
  const ai = $('ai');
  ai.querySelector('.dot').className = `dot${aiMode === 'llm' ? '' : ' off'}`;
  ai.querySelector('b').textContent = aiMode === 'llm' ? 'LLM' : '석판';
  ai.title = aiUsable ? `눌러서 LLM / 석판 전환 (모델: ${aiState})` : 'Prompt API를 쓸 수 없어 석판(키워드)으로만 해석한다';
  $('music').innerHTML = iconBtn('u-music', musicOn());
  $('music').classList.toggle('muted', !musicOn());
  $('music').title = musicOn() ? '배경음악 켜짐' : '배경음악 꺼짐';
  $('sound').innerHTML = iconBtn('u-speaker', soundOn());
  $('sound').classList.toggle('muted', !soundOn());
  $('sound').title = soundOn() ? '효과음 켜짐' : '효과음 꺼짐';
  $('motion').innerHTML = iconBtn('u-sparkle', !fx.motion.reduced);
  $('motion').classList.toggle('muted', fx.motion.reduced);
  $('motion').title = fx.motion.reduced ? '연출 줄임 (눌러서 화려하게)' : '연출 화려하게 (눌러서 줄이기)';
}

function renderTrack() {
  const nodes = [];
  for (let i = 1; i <= state.maxRounds; i++) {
    const cls = i < state.round ? 'done' : i === state.round ? 'now' : '';
    if (i > 1) nodes.push('<span class="link"></span>');
    nodes.push(`<span class="node ${cls}" title="제 ${i} 장">${i}</span>`);
  }
  nodes.push(`<span class="first" id="firstMark">선 · ${state.first === 'player' ? '우리 부족' : '율법파'}</span>`);
  $('track').innerHTML = nodes.join('');
  const now = $('track').querySelector('.now');
  if (now) $('firstMark').style.left = `${now.offsetLeft + now.offsetWidth / 2}px`;
}

function renderSeason() {
  const ev = state.event;
  $('season').innerHTML = `
    <div class="card card-parch${dealSeason ? ' deal' : ''}">
      <div class="face">
        <div class="kind">이번 계절</div>
        <div class="title">${svgUse(`e-${ev.id}`)}${esc(ev.name)}</div>
        <div class="body">${esc(ev.text)}</div>
        <div class="rule">${esc(ev.rule)}</div>
        ${state.eventChoice && phase === 'speak' ? seasonChoiceHTML() : ''}
      </div>
    </div>${nextEvent(state) && state.round < state.maxRounds ? `<div class="next-season" title="${esc(nextEvent(state).rule)}">다음 장 · ${svgUse(`e-${nextEvent(state).id}`)}${esc(nextEvent(state).name)}</div>` : ''}`;
  if (dealSeason) setTimeout(() => sfx.deal(), 250);
  dealSeason = false;
  $('season').querySelectorAll('.card').forEach((c) => fx.attachTilt(c, 8));
  $('season').querySelector('.season-swap')?.addEventListener('click', (e) => {
    chooseEvent(state, e.currentTarget.dataset.ev);
    sfx.deal();
    dealSeason = true;
    render();
  });
}

function seasonChoiceHTML() {
  const other = state.eventChoice.find((id) => id !== state.event.id);
  const ev = EVENTS.find((e) => e.id === other);
  if (!ev) return '';
  return `<button class="season-swap" type="button" data-ev="${other}" title="${esc(ev.rule)}">지혜의 눈 · 「${esc(ev.name)}」로 바꾸기</button>`;
}

function renderBoardView() {
  const cur = V();
  const markers = [];
  let highlight = [];
  if (phase === 'confirm' && pending) {
    pending.accepted.forEach((a, i) => markers.push({ tile: a.tile, side: 'player', label: String(i + 1), incoming: pending.incoming }));
    pending.auto.forEach((a) => markers.push({ tile: a.tile, side: 'player', dim: true, incoming: pending.incoming }));
    highlight = pending.accepted.map((a) => a.tile);
  }
  if (['playing', 'resolved', 'over'].includes(phase) && resolved) {
    resolved.playerPlan.forEach((a) => markers.push({ tile: a.tile, side: 'player', dim: a.auto }));
    resolved.enemyPlan.forEach((a) => markers.push({ tile: a.tile, side: 'enemy', incoming: resolved.incomingEnemy }));
  }
  const selectable = targeting === 'lightning' ? cur.tiles.filter((t) => t.owner === 'enemy' && t.revealed).map((t) => t.id) : [];
  const hints = phase === 'speak' && !targeting ? hintTiles : [];
  const intents = ['speak', 'thinking', 'confirm'].includes(phase) && state.round > 0 && !state.winner
    ? enemyIntent(state).filter((a) => a.shown).map((a) => ({ tile: a.tile, type: a.type === 'build' ? 'build' : a.type })) : [];
  renderBoard($('board'), cur, { markers, highlight, hints, intents, selectable, onTileClick, focus: focusId });
  frameEl().classList.toggle('thinking', phase === 'thinking');
}

// 숫자가 바뀌면 튀는 연출
function num(key, value) {
  const prev = prevNums[key];
  prevNums[key] = value;
  if (prev == null || prev === value) return `<span class="n">${value}</span>`;
  return `<span class="n ${value > prev ? 'bump-up' : 'bump-down'}" data-from="${prev}" data-to="${value}">${prev}</span>`;
}

// 떠난 미플 수: 판 위에 나가 있는 미플만큼 매트 자리가 빈다
function awayCount(side) {
  if (phase === 'confirm' && pending && side === 'player') return pending.accepted.length + pending.auto.length;
  if (['playing', 'resolved'].includes(phase) && resolved) return (side === 'player' ? resolved.playerPlan : resolved.enemyPlan).length;
  return 0;
}

function renderMats() {
  const cur = matView ?? V();
  $('matPlayer').innerHTML = matHTML(cur, 'player');
  $('matEnemy').innerHTML = matHTML(cur, 'enemy');
  const x = $('matPlayer').querySelector('.task-x');
  if (x) x.onclick = () => { meta.setOnboard({ ...meta.getOnboard(), off: true }); sfx.click(); renderMats(); };
  renderLaw(cur);
  document.querySelectorAll('.mat .n[data-from]').forEach((el) => fx.countUp(el, Number(el.dataset.from), Number(el.dataset.to)));
}

// 율법 카드: 공개 단계에 뒤집힌다
function renderLaw(cur) {
  const shown = ['playing', 'resolved', 'over'].includes(phase);
  $('law').innerHTML = shown ? `
    <div class="card card-stone${flipLaw ? ' flip' : ''}"><div class="face">
      <div class="kind">이번 율법</div>
      <div class="title">${svgUse('s-tablet')}${esc(state.lawCard.name)}</div>
      <div class="body">${esc(state.lawCard.text)}</div>
      <div class="rule">행동 ${actionLimit(cur, 'enemy')}회를 율법 순서대로</div>
    </div></div>` : lawBackHTML();
  if (shown) flipLaw = false;
  $('law').querySelectorAll('.card').forEach((c) => fx.attachTilt(c, 8));
}

// 판정 승률 (저주 말투면 공격 +1을 미리 반영)
function oddsTag(a) {
  const p = actionOdds(state, a, { curse: pending?.tone === 'curse' });
  return p == null ? '' : `<span class="why odds ${p >= 0.5 ? 'good' : 'low'}" title="주사위 두 개(각 1~6)에 보너스를 더해 공격 쪽이 커야 이긴다">${Math.round(p * 100)}%</span>`;
}

// 선공: 율법파가 노리는 칸에 먼저 가면 막는다 (율법파 선공이면 빼앗긴다)
function firstNote(tile) {
  if (!enemyIntent(state).some((x) => x.shown && x.tile === tile)) return '';
  return state.first === 'player' ? '<span class="why first">선공 — 율법파를 막는다</span>' : '<span class="why first bad">율법파 선공 — 빼앗긴다</span>';
}

function scoreTip(cur, side) {
  const b = scoreBreakdown(cur, side);
  const j = JUDGEMENTS[cur.judgement ?? 'classic'];
  return `심판의 기준 「${j.name}」\n${b.parts.map((p) => `${p.label} ${p.n}×${p.w}${p.note ? ` (${p.note})` : ''}`).join(' · ')} = ${b.total}`;
}

// 율법 카드 뒷면: 이번 장 율법파의 뜻(난이도만큼만 보인다)
function lawBackHTML() {
  if (!state.round || state.winner) return `<div class="law-back"><div>${svgUse('s-tablet')}율법 카드는 공개 단계에 뒤집힌다</div></div>`;
  const all = enemyIntent(state);
  const shown = all.filter((a) => a.shown);
  const hidden = all.length - shown.length;
  const lines = shown.map((a) => `<li class="it-${a.type}">${esc(enemyLabel(a))}</li>`).join('');
  return `<div class="law-back intent"><div class="kind">율법파의 뜻</div>
    <ul>${lines || '<li class="it-none">드러난 움직임이 없다</li>'}</ul>
    ${hidden ? `<div class="more">그 밖에 ${hidden}가지는 보이지 않는다</div>` : ''}
    <div class="more">율법 카드는 공개 단계에 뒤집힌다</div></div>`;
}

// 율법파 지도자의 말풍선 (적 매트 머리 위)
function leaderSay(text) { matSay('matEnemy', ENEMY_LEADERS[state.leader]?.name ?? '율법파', text); }
// 우리 대사제의 말풍선 (우리 매트 머리 위)
function priestSay(text) { matSay('matPlayer', `대사제 ${PRIESTS[state.priest]?.name ?? ''}`, text, 'priest'); }
function matSay(host, who, text, cls = '') {
  if (!text) return;
  document.querySelector(`#${host} .leader-say`)?.remove();
  const b = document.createElement('div');
  b.className = `leader-say ${cls}`;
  b.innerHTML = `<b>${esc(who)}</b>${esc(text)}`;
  $(host).append(b);
  sfx.page();
  setTimeout(() => b.classList.add('out'), 3800);
  setTimeout(() => b.remove(), 4400);
}

function matHTML(cur, side) {
  const s = cur.sides[side];
  const mine = side === 'player';
  const cap = popCap(cur, side);
  const income = faithIncome(cur, side);
  const lowFaith = mine && s.faith <= RULES.lowFaith;
  const res = RES_KEYS.map((k) => {
    const faith = k === 'faith';
    const tip = faith ? ` title="매 장 +${income} (기본 ${RULES.baseFaithIncome} · 신도 ${RULES.followersPerFaith}명마다 +1 · 신전)"` : '';
    const warn = faith && lowFaith ? ` low${s.faithless ? ' critical' : ''}` : '';
    const label = faith ? `${RESOURCE_NAME[k]} <em>+${income}</em>` : RESOURCE_NAME[k];
    return `
    <div class="res${warn}"${tip}><span class="coin" id="coin-${side}-${k}">${svgUse(`i-${k}`)}</span>
      <div>${num(`${side}.${k}`, s[k])}<div class="l">${label}</div></div></div>`;
  }).join('');
  const warnLine = !lowFaith ? '' : s.faithless
    ? '<div class="faith-warn critical">신앙이 바닥났다 — 한 장 더 비면 신도가 떠난다. 기도하라.</div>'
    : '<div class="faith-warn">신앙이 낮다 — 계시를 아끼고 기도를 명하라.</div>';
  const away = Math.min(awayCount(side), s.pop);
  const meeples = Array.from({ length: Math.max(cap, s.pop) }, (_, i) => meepleSvg(side, i < away ? 'away' : i < s.pop ? '' : 'empty')).join('');
  const hearts = Array.from({ length: CAPITAL_HP }, (_, i) => svgUse('i-shield', i < s.capitalHp ? '' : 'lost')).join('');
  const temple = `${s.templeLevel}<small style="font-size:11px;opacity:.6">/${MAX_TEMPLE}</small>`;
  let extra = '';
  if (mine) {
    const d = s.doctrine;
    extra = `<div class="section-label"><span>교리</span><span>계시가 쌓여 문명이 된다</span></div><div class="doctrine">${DOCTRINES.map((k) => {
      const info = DOCTRINE[k];
      const before = prevDoctrine[k] ?? d[k];
      const gems = Array.from({ length: DOCTRINE_MAX }, (_, i) =>
        `<span class="gem${i < d[k] ? ' on' : ''}${i >= before && i < d[k] ? ' new' : ''}${info.perks[i + 1] ? ' perk' : ''}${i + 1 === DOCTRINE_MAX ? ' ult' : ''}" title="${esc(info.perks[i + 1] ?? '')}"></span>`).join('');
      prevDoctrine[k] = d[k];
      const next = Object.entries(info.perks).find(([lv]) => d[k] < Number(lv));
      const got = Object.entries(info.perks).filter(([lv]) => d[k] >= Number(lv)).map(([, t]) => t);
      const perk = got.length ? `<b>✓ ${esc(got.join(', '))}</b>${next ? ` · ${next[0]}칸: ${esc(next[1])}` : ''}` : next ? `${next[0]}칸: ${esc(next[1])}` : '';
      const streak = cur.streak?.doctrine === k ? `<span class="streak" title="같은 교리 세 장 연속이면 기적">${'●'.repeat(cur.streak.n)}${'○'.repeat(3 - cur.streak.n)}</span>` : '';
      return `<div class="dtrack"><span class="medal">${svgUse(`d-${k}`)}</span><div class="row"><span class="nm">${info.name}</span>${gems}${streak}</div><div class="perk-text">${perk}</div></div>`;
    }).join('')}</div>`;
  }
  return `
    <div class="mat-head">
      <span class="crest">${mine ? svgUse('i-temple') : svgUse('s-tablet')}</span>
      <div><h2>${mine ? '우리 부족' : '율법파'}</h2><small${!mine && state.leader ? ` title="${esc(ENEMY_LEADERS[state.leader].desc)}"` : ''}>${mine ? '말씀을 따르는 자들' : state.leader ? `${esc(ENEMY_LEADERS[state.leader].name)} · ${esc(ENEMY_LEADERS[state.leader].title)}` : '새겨진 율법대로 움직인다'}</small></div>
      <div class="score" title="${esc(scoreTip(cur, side))}">${num(`${side}.score`, score(cur, side))}<small><br>승점</small></div>
    </div>
    ${mine && currentTask() ? `<div class="task-ribbon"><span>세라의 과제</span>${esc(currentTask().text)}<button class="task-x" type="button" title="과제 끄기">✕</button></div>` : ''}
    <div class="res-grid${mine ? '' : ' compact'}">${res}</div>${warnLine}
    <div class="section-label"><span>신도</span><span>${s.pop} / ${cap}</span></div>
    <div class="meeples">${meeples}</div>
    <div class="section-label"><span>세력</span></div>
    <div class="stats">
      <div class="stat" title="행동 = 2 + 신전 + 신도 ${RULES.followersPerAction}명마다 1 (최대 6)">${svgUse('i-hand')}행동<b>${num(`${side}.act`, actionLimit(cur, side))}</b></div>
      <div class="stat">${svgUse('i-temple')}신전<b>${temple}</b></div>
      <div class="stat">${svgUse('i-house')}마을<b>${num(`${side}.vil`, villageCount(cur, side))}</b></div>
      <div class="stat">수도<span class="hearts">${hearts}</span></div>
    </div>
    ${extra}`;
}

// ---------- 제단 ----------
function renderAltar() {
  const altar = $('altar');
  const p = state.sides.player;
  const canMiracle = phase === 'speak';
  const cards = [...state.miracleHand.map((id) => MIRACLES.find((m) => m.id === id)), ...(doomReady(state) ? [DOOM] : [])];
  const hand = `<div class="hand">${cards.map((m) => `
    <button class="mcard${targeting === m.id ? ' on' : ''}${m.hidden ? ' doom' : ''}" data-m="${m.id}" type="button" ${!canMiracle || state.miracleUsed || p.faith < miracleCost(state, m) ? 'disabled' : ''}>
      <span class="cost">${miracleCost(state, m) < m.cost ? `<s>${m.cost}</s>${miracleCost(state, m)}` : m.cost}</span>${svgUse(MIRACLE_ART[m.id], 'art', '0 0 48 48')}<div class="nm">${m.name}</div>
      <span class="tip"><b>${m.name}</b> · 신앙 ${miracleCost(state, m)}${state.wrath && !m.hidden ? ` (분노 ${state.wrath}로 -${m.cost - miracleCost(state, m)})` : ''}<br>${esc(m.text)}${state.miracleUsed ? '<br><i>이번 장에는 이미 기적을 썼다.</i>' : ''}</span>
    </button>`).join('')}</div>`;
  const noticeHTML = notice ? `<div class="notice">${esc(notice)}</div>` : '';
  let scroll = '';
  let act = '';

  if (phase === 'speak') {
    const cost = draft.trim() ? revelationCostFor(state, draft) : 0;
    const ban = state.bannedWords.length ? `<span class="ban-chip" title="율법파의 검열: 이 말을 쓰면 계시 비용 +1. 비유로 돌려 말하라.">봉인 · '${esc(state.bannedWords[0])}'</span>` : '';
    const pt = state.petition;
    const petition = pt ? `<div class="petition" title="${pt.need ? '이 청원에 답하는 계시를 내리면 은총(신앙 +1)' : ''}"><b>${esc(pt.from)}</b>“${esc(pt.text)}”${pt.need ? '<span>답하면 은총 +1</span>' : ''}</div>` : '';
    const prophecyNote = state.prophecy ? `<div class="petition prophecy"><b>봉인된 예언</b>“${esc(PROPHECY.kinds[state.prophecy.kind].name)}” — ${state.prophecy.due - state.round + 1}장 남음</div>` : '';
    scroll = `<div class="scroll">
      ${petition}${prophecyNote}<div class="suggest-row" id="suggestRow"></div>
      <div class="scroll-head"><h3>신의 말씀</h3>${ban}<small>제 ${state.round} 장 · 신도 행동 ${actionLimit(state, 'player')}회</small></div>
      <textarea maxlength="${REVELATION_MAX}" rows="2" placeholder="강물이 너희를 먹이리라…" aria-label="계시">${esc(draft)}</textarea>
      <div class="ink-meta"><span class="count">${draft.length} / ${REVELATION_MAX}</span>
        <span class="cost-pill${cost > p.faith ? ' over' : ''}">${svgUse('i-faith')}<span class="c">신앙 ${cost}</span></span></div>
      ${noticeHTML}</div>`;
    act = `<div class="act"><button class="seal-btn" type="button" title="계시 내리기 (Ctrl+Enter)">${svgUse('i-faith')}<span>계시</span></button>
      <button class="text-btn silence" type="button">침묵하기 — 신도들이 알아서 일한다</button></div>`;
  } else if (phase === 'thinking') {
    const pct = progress != null ? ` · 모델 내려받는 중 ${(progress * 100).toFixed(0)}%` : '';
    scroll = `<div class="scroll"><div class="stamp-mark static">${svgUse('i-faith')}<span>계시</span></div><div class="thinking-box">
      <svg class="flame-svg" viewBox="0 0 40 60"><rect x="15" y="34" width="10" height="24" rx="2" fill="#efe4cd" stroke="#8a6a3e"/>
        <g class="fl"><path d="M20 6c4 7 8 11 8 18a8 8 0 0 1-16 0c0-7 4-11 8-18z" fill="#ffb347"/><path d="M20 16c2 4 4 6 4 9a4 4 0 0 1-8 0c0-3 2-5 4-9z" fill="#fff3c4"/></g></svg>
      <div><div class="t">대사제가 제단 앞에 엎드렸다</div><div class="dots" style="font:15px var(--font-body);color:var(--ink-soft)">말씀의 뜻을 헤아리는 중${pct}</div></div>
    </div></div>`;
    act = `<div class="act"><button class="seal-btn" type="button" disabled>${svgUse('i-faith')}<span>계시</span></button></div>`;
  } else if (phase === 'confirm') {
    const { text, result, accepted, rejected, auto } = pending;
    const fresh = pending.fresh;
    const source = result.source;
    const src = { llm: 'LLM', tablet: '석판', silence: '침묵' }[result.source];
    const doc = result.doctrine ? ` · ${DOCTRINE[result.doctrine].name}` : '';
    const short = (a) => esc(a.text.replace(/ \(.*\)$/, ''));
    const links = pending.links ?? {};
    const chips = [
      ...accepted.map((a, i) => `<span class="order" data-key="${esc(a.key)}">${meepleSvg('player')}<span class="num">${i + 1}</span><span class="t">${esc(a.text)}</span>${links[a.key] ? `<span class="word">← '${esc(links[a.key])}'</span>` : ''}${oddsTag(a)}${firstNote(a.tile)}</span>`),
      ...auto.map((a) => `<span class="order auto">${meepleSvg('player')}<span class="t">${short(a)}</span><span class="why" style="background:rgba(124,89,27,.12)">알아서</span></span>`),
      ...[...pending.dropped].map((k) => result.orders.find((a) => a.key === k)).filter(Boolean).map((a) => `<span class="order dropped" data-key="${esc(a.key)}" title="눌러서 되살리기">${meepleSvg('player')}<span class="t">${short(a)}</span><span class="why">뺌</span></span>`),
      ...rejected.map((r) => `<span class="order bad"><span class="t">${short(r.action)}</span><span class="why">${esc(r.reason)}</span></span>`),
      ...result.forbidden.map((a) => `<span class="order forbid">⊘ <span class="t">${short(a)}</span><span class="why" style="background:rgba(40,20,10,.12)">${['attack', 'preach'].includes(a.type) ? '서원 · 지키면 은총' : '금지'}</span></span>`),
    ].join('');
    const legal = legalActions(state, 'player');
    const hint = result.doctrine === 'war' && !legal.some((a) => a.type === 'attack')
      ? '아직 신도들이 닿는 곳에 율법파가 없다. 마을을 세워 영토를 넓혀야 칠 수 있다.'
      : result.doctrine === 'peace' && !legal.some((a) => a.type === 'preach') && /이웃|율법|전하|설득/.test(text ?? '')
        ? '아직 말씀을 전할 율법파가 닿는 곳에 없다. 영토를 넓혀야 한다.' : null;
    const tags = [];
    if (text && pending.tone !== 'command') tags.push(`<span class="wtag tone-${pending.tone}" title="${esc(TONES[pending.tone].text)}">${TONES[pending.tone].name}의 말투 · ${esc(TONES[pending.tone].text)}</span>`);
    if (pending.answered) tags.push(`<span class="wtag ok">${esc(state.petition.from)}의 청원에 답함 · 은총</span>`);
    if (pending.naming) tags.push(`<span class="wtag name">이름 · ${esc(pending.naming.name)}</span>`);
    if (pending.odd) tags.push('<span class="wtag tone-metaphor">기이한 해석 · 은총</span>');
    if (pending.cited?.length) tags.push(`<span class="wtag">인용 · ${pending.cited.map((w) => `'${esc(w)}'`).join(' ')}</span>`);
    const opp = result.doctrine && state.config.veteran ? OPPOSED[result.doctrine] : null;
    if (opp && state.sides.player.doctrine[opp] > [6, 4, 2, 0].find((f) => state.sides.player.doctrine[opp] >= f)) tags.push(`<span class="wtag tone-curse">${DOCTRINE[opp].name} -1</span>`);
    const st = state.streak;
    if (result.doctrine && st?.doctrine === result.doctrine && st.n === 2) tags.push(`<span class="wtag ok">${DOCTRINE[result.doctrine].name} 세 장째 — 말씀이 이어지면 기적</span>`);
    const seal = pending.prophecy ? `<label class="seal-prophecy"><input type="checkbox" class="prophecy-box" ${pending.seal ? 'checked' : ''}>
      예언으로 봉인 — “${esc(PROPHECY.kinds[pending.prophecy.kind].name)}” ${pending.prophecy.rounds}장 안에 이루어지면 신앙 +${PROPHECY.reward[pending.prophecy.rounds]}, 빗나가면 -${PROPHECY.penalty}</label>` : '';
    const priest = source === 'silence' ? '' : `${esc(PRIESTS[state.priest]?.name ?? '대사제')}`;
    scroll = `<div class="scroll">
      <div class="scroll-head"><h3>대사제의 해석</h3><small>${priest ? `${priest} · ` : ''}${src}${result.ms ? ` · ${(result.ms / 1000).toFixed(1)}초` : ''}${doc}</small></div>
      ${text ? `<div class="rev-line">“${markWords(text, Object.values(links), pending.cited)}”</div>` : ''}
      ${tags.length ? `<div class="wtags">${tags.join('')}</div>` : ''}
      <div class="quote${voiceOf(state) ? ` voice-${voiceOf(state)}` : ''}">${fresh ? '' : esc(result.interpretation)}</div>
      <div class="orders">${chips}</div>${seal}
      ${hint ? `<div class="hint">⚠ ${hint}</div>` : ''}${noticeHTML}</div>`;
    act = `<div class="act">
      <button class="btn-primary big accept" type="button" ${fresh ? 'disabled' : ''}>수락하고 공개 <kbd>Enter</kbd></button>
      <button class="btn-ghost again" type="button" ${!text || state.reinterpretUsed || p.faith < 1 ? 'disabled' : ''}>다시 해석 · 신앙 1 <kbd>R</kbd></button></div>`;
  } else {
    const shown = phase === 'playing' ? resolved.shown : resolved.logs;
    const plan = resolved.enemyPlan.map(enemyLabel).join(' · ') || '없음';
    const v = phase !== 'playing' ? resolved.verdict : null;
    scroll = `<div class="scroll">
      <div class="scroll-head"><h3>공개와 해결</h3><small>율법 「${esc(state.lawCard.name)}」</small></div>
      <div class="law-line">율법파 배치 — ${esc(plan)}</div>
      <div class="chron">${shown.map((l, i) => logLine(l, phase === 'playing' && i === shown.length - 1)).join('')}</div>
      ${v ? `<div class="verdict v-${v.grade}"><span class="v-stamp">${v.stamp}</span><span class="v-text">${esc(v.text)}</span></div>` : ''}
      ${phase === 'playing' ? '' : ledgerHTML(resolved.ledger)}</div>`;
    act = phase === 'playing'
      ? '<div class="act"><button class="btn-ghost skip" type="button">⏩ 빨리 감기 <kbd>Space</kbd></button></div>'
      : phase === 'over'
        ? `<div class="act"><button class="btn-primary big again-game" type="button">다시 하기</button><div style="text-align:center;font:13px var(--font-body);color:var(--on-table-dim)">${esc(state.winReason)}</div></div>`
        : '<div class="act"><button class="btn-primary big next" type="button">다음 장으로 ▶ <kbd>Enter</kbd></button></div>';
  }

  altar.innerHTML = `${hand}<div class="scroll-wrap">${scroll}</div>${act}`;
  scheduleSuggest();
  const kind = phase === 'resolved' || phase === 'over' ? 'playing' : phase;
  altar.classList.toggle('phase-in', kind !== lastAltarPhase);
  lastAltarPhase = kind;
  altar.querySelectorAll('.mcard').forEach((c) => fx.attachTilt(c, 10));
  bindAltar();

  if (phase === 'confirm' && pending.fresh) {
    pending.fresh = false;
    const chips = [...altar.querySelectorAll('.order')];
    chips.forEach((c) => { c.style.visibility = 'hidden'; });
    fx.typewriter(altar.querySelector('.quote'), pending.result.interpretation, 75).then(async () => {
      for (const c of chips) { c.style.visibility = ''; c.classList.add('appear'); sfx.click(); await fx.wait(110); }
      const ok = altar.querySelector('.accept');
      if (ok) ok.disabled = false;
      drawLinks();
      tutorial?.on('confirm', state.round);
    });
  }
  const sc = altar.querySelector('.scroll');
  if (sc && altar.querySelector('.chron')) sc.scrollTop = sc.scrollHeight;
}

// 계시 원문에서 행동을 부른 낱말에 밑줄
function markWords(text, words, cited = []) {
  const list = [...new Set([...words, ...cited])].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return esc(text);
  const re = new RegExp(list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const done = new Set();
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    out += esc(text.slice(last, m.index));
    const cls = words.includes(m[0]) ? 'lw' : 'lw cite';
    out += done.has(m[0]) ? esc(m[0]) : `<u class="${cls}" data-w="${esc(m[0])}">${esc(m[0])}</u>`;
    done.add(m[0]);
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

// 밑줄 친 낱말에서 그 행동의 칸까지 빛줄기 (최대 3개, 차례로)
function drawLinks() {
  if (!pending?.links) return;
  const board = $('board');
  let i = 0;
  for (const a of pending.accepted) {
    const w = pending.links[a.key];
    const u = w && [...document.querySelectorAll('#altar u.lw')].find((x) => x.dataset.w === w);
    if (!u || i >= 3) continue;
    const r = u.getBoundingClientRect();
    fx.linkCurve({ x: r.left + r.width / 2, y: r.top }, markerToScreen(board, state.tileAt[a.tile], 'player'), i * 260);
    i += 1;
  }
}

function bindAltar() {
  const a = $('altar');
  a.querySelectorAll('.mcard').forEach((b) => { b.onclick = () => useMiracle(b.dataset.m); });
  const ta = a.querySelector('textarea');
  if (ta) {
    const count = a.querySelector('.count');
    const pill = a.querySelector('.cost-pill');
    ta.oninput = () => {
      draft = ta.value;
      const cost = draft.trim() ? revelationCostFor(state, draft) : 0;
      count.textContent = `${draft.length} / ${REVELATION_MAX}`;
      pill.querySelector('.c').textContent = `신앙 ${cost}`;
      const banned = state.bannedWords.some((w) => draft.includes(w));
      pill.classList.toggle('banned', banned);
      a.querySelector('.ban-chip')?.classList.toggle('hit', banned);
      pill.classList.toggle('over', cost > state.sides.player.faith);
      const cite = draft.trim().length > 30 && citedWords(state, draft).length;
      pill.classList.toggle('cite', !!cite);
      pill.querySelector('.c').textContent = cite ? `인용 · 신앙 ${cost}` : `신앙 ${cost}`;
      if (draft.trim()) { clearTimeout(suggestTimer); $('suggestRow')?.classList.remove('show'); } else scheduleSuggest();
      scheduleHints();
    };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !document.querySelector('.choice-modal')) { e.preventDefault(); speak(); } };
    if (!targeting) ta.focus({ preventScroll: true });
  }
  const on = (sel, fn) => { const b = a.querySelector(sel); if (b) b.onclick = fn; };
  on('.seal-btn', speak);
  on('.silence', silence);
  on('.accept', () => { sfx.click(); accept(); });
  // 확인 칩을 눌러 그 행동을 빼거나 되살린다 (장당 두 개까지, 빈 자리는 신도들이 알아서)
  if (phase === 'confirm' && pending) {
    a.querySelectorAll('.order[data-key]').forEach((c) => {
      c.onclick = () => {
        // 해석문이 다 나오고 수락 버튼이 켜진 뒤에만
        if (pending.incoming || a.querySelector('.accept')?.disabled) return;
        const k = c.dataset.key;
        if (pending.dropped.has(k)) pending.dropped.delete(k);
        else if (pending.dropped.size < 2) pending.dropped.add(k);
        else { notice = '한 장에 두 개까지만 뺄 수 있다.'; renderAltar(); return; }
        notice = '';
        sfx.lift();
        derivePending();
        renderBoardView();
        renderAltar();
      };
    });
  }
  const pbox = a.querySelector('.prophecy-box');
  if (pbox) pbox.onchange = () => { pending.seal = pbox.checked; sfx.seal?.(); pbox.blur(); };
  on('.again', () => { sfx.click(); reinterpret(); });
  on('.skip', () => { fx.motion.skip = true; });
  on('.next', () => { sfx.click(); newRound(); });
  on('.again-game', restart);
}

// ---------- 계시 제안 칩: 빈 두루마리가 8초 이어지면 두 가지를 넌지시 (처음 세 판, 끌 수 있음) ----------
let suggestTimer = null;
const suggestOn = () => !state.tutorial && meta.get('gsg.suggest', true) && meta.getHistory().length < 3;
function scheduleSuggest() {
  clearTimeout(suggestTimer);
  if (phase !== 'speak' || !suggestOn() || draft.trim()) return;
  suggestTimer = setTimeout(showSuggest, 8000);
}
function suggestions() {
  const out = [];
  const need = state.petition?.need;
  const byNeed = { food: '강과 들판에서 먹을 것을 거두어라', wood: '숲에서 나무를 베어라', wall: '성벽을 쌓아 이웃의 칼을 막아라', village: '땅을 넓혀 새 마을을 세워라', pray: '신전에 모여 기도하라', explore: '안개 너머를 찾아 나서라' };
  if (need) out.push(byNeed[need.gather ?? need.build ?? need.type]);
  if (enemyIntent(state).some((a) => a.shown && a.type === 'attack')) out.push(byNeed.wall);
  if (state.sides.player.faith <= RULES.lowFaith) out.push(byNeed.pray);
  out.push(byNeed.village, byNeed.explore, '이웃에게 나의 말씀을 전하라');
  return [...new Set(out.filter(Boolean))]
    .filter((t) => !state.bannedWords.some((w) => t.includes(w)) && interpretWithTablet(state, t).orders.length)
    .slice(0, 2);
}
function showSuggest() {
  const row = $('suggestRow');
  if (!row || phase !== 'speak' || draft.trim()) return;
  const list = suggestions();
  if (!list.length) return;
  row.innerHTML = `<span class="sg-label">이렇게 말씀해 보시겠습니까</span>${list.map((t) => `<button type="button" class="sg-chip">${esc(t)}</button>`).join('')}<button type="button" class="sg-off" title="제안 끄기">✕</button>`;
  row.classList.add('show');
  row.querySelectorAll('.sg-chip').forEach((b) => { b.onclick = () => typeInto(b.textContent); });
  row.querySelector('.sg-off').onclick = () => { meta.set('gsg.suggest', false); row.classList.remove('show'); row.innerHTML = ''; sfx.click(); };
}
async function typeInto(text) {
  const ta = document.querySelector('.scroll textarea');
  if (!ta) return;
  $('suggestRow')?.classList.remove('show');
  ta.value = '';
  for (const ch of text) {
    ta.value += ch;
    if (ch.trim()) sfx.type();
    await fx.wait(28);
  }
  ta.dispatchEvent(new Event('input'));
  ta.focus();
}

// 계시를 쓰는 동안 석판 해석으로 말씀이 닿을 칸을 미리 흐리게 비춘다 (LLM의 결정과는 다를 수 있는 '예감')
function scheduleHints() {
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    if (phase !== 'speak') return;
    const text = draft.trim();
    const next = text ? [...new Set(interpretWithTablet(state, text).orders.map((a) => a.tile))].slice(0, 6) : [];
    if (next.join() === hintTiles.join()) return;
    if (next.some((t) => !hintTiles.includes(t))) sfx.hover();
    hintTiles = next;
    renderBoardView();
  }, 250);
}

// ---------- 단축키 ----------
function onKey(e) {
  if (!$('mainScreen').hidden || document.querySelector('.endscreen, .npc-dialog.show, .choice-modal')) return;
  const typing = ['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName);
  const click = (sel) => { const b = $('altar').querySelector(sel); if (b && !b.disabled) { e.preventDefault(); b.click(); return true; } return false; };
  if (e.altKey && /^[1-4]$/.test(e.key) && phase === 'speak') {
    const c = $('altar').querySelectorAll('.mcard')[Number(e.key) - 1];
    if (c && !c.disabled) { e.preventDefault(); c.click(); }
    return;
  }
  if (typing) return;
  if (phase === 'confirm') {
    if (e.key === 'Enter' && Date.now() > acceptLock) { acceptLock = Date.now() + 300; click('.accept'); }
    else if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') click('.again');
  } else if (phase === 'playing') {
    if (e.key === ' ') { e.preventDefault(); fx.motion.skip = true; }
  } else if (phase === 'resolved') {
    if (e.key === 'Enter' || e.key === ' ') click('.next');
  } else if (phase === 'speak' && (e.key === 'l' || e.key === 'L')) {
    $('openChron').click();
  }
}

// 율법파 행동을 플레이어 시점으로 적는다 (안개 속 지형은 드러내지 않는다)
function enemyLabel(a) {
  const place = tileName(state, state.tileAt[a.tile], 'player');
  const what = {
    gather: `${RESOURCE_NAME[a.gather]} 채집`, pray: '기도', preach: '교화', attack: '공격', explore: '탐험',
    build: { village: '마을 건설', wall: '성벽 건설', temple: '신전 높이기', cathedral: '대성당' }[a.build],
  }[a.type];
  return `${what}(${place})`;
}

function logLine(l, fresh = false) {
  const dice = l.dice ? `<span class="dice">🎲 ${l.dice.attacker}${l.dice.attackerBonus ? `+${l.dice.attackerBonus}` : ''} 대 ${l.dice.defender}${l.dice.defenderBonus ? `+${l.dice.defenderBonus}` : ''}</span>` : '';
  return `<p class="${l.side}${fresh ? ' appear' : ''}">${esc(l.text)}${dice}</p>`;
}

function renderChron() {
  const byRound = new Map();
  for (const l of state.log) {
    if (!byRound.has(l.round)) byRound.set(l.round, []);
    byRound.get(l.round).push(l);
  }
  const notes = state.lessons.length ? `<div class="ch">대사제의 신학 노트</div>${state.lessons.map((l, i) => `<p class="note">'${esc(l.word)}' → ${esc(describeLesson(l))} <button class="text-btn forget" data-i="${i}" type="button">잊게 하기</button></p>`).join('')}` : '';
  $('chronBody').innerHTML = notes + [...byRound.entries()].reverse()
    .map(([round, lines]) => `<div class="ch">제 ${round} 장</div>${lines.map((l) => logLine(l)).join('')}`).join('')
    || '<p style="color:var(--ink-faint)">아직 기록이 없다.</p>';
  $('chronBody').querySelectorAll('.forget').forEach((b) => { b.onclick = () => { state.lessons.splice(Number(b.dataset.i), 1); sfx.page(); renderChron(); }; });
}

// ?debug 이면 콘솔에서 상태를 만질 수 있게 한다 (연출 시험용)
if (new URLSearchParams(location.search).has('debug')) {
  import('./sound.js').then((snd) => { window.__gsg.levels = snd.levels; window.__gsg.music = snd.music; });
  import('./engine.js').then((eng) => { window.__gsg.engine = eng; });
  window.__gsg = { get state() { return state; }, render: () => render(), showMiracleDraft: () => showMiracleDraft(), showSiteChoice: () => showSiteChoice(), finishGame: () => finishGame() };
}

init();
