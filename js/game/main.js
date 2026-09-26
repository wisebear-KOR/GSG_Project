// 게임 진행과 화면: 사건 → 계시 → 해석 확인 → 동시 공개·해결(한 단계씩 연출) → 다음 장
import {
  createState, startRound, legalActions, validateOrders, autoFill, planEnemy, resolveRound,
  recordRevelation, castMiracle, actionLimit, popCap, villageCount, score, tileName, snapshot, capitalOf, other,
} from './engine.js';
import {
  DOCTRINES, DOCTRINE, DOCTRINE_MAX, MIRACLES, REVELATION_MAX, revelationCost, RESOURCE_NAME, MAX_ROUNDS, CAPITAL_HP, MAX_TEMPLE, TERRAIN,
} from './data.js';
import { renderBoard, tileToHost, markerToScreen } from './board.js';
import { installArt } from './art.js';
import { llmStatus, prepareLLM, interpretWithLLM, interpretWithTablet } from './interpreter.js';
import * as fx from './fx.js';
import { sfx, soundOn, setSound, musicOn, setMusic, music, unlockAudio } from './sound.js';

installArt();
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const svgUse = (id, cls = '', vb = '0 0 24 24') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true"><use href="#${id}"/></svg>`;
// 미플 심볼은 원점이 (0,0)이 아니므로 위치와 크기를 명시해야 잘리지 않는다
const meepleSvg = (side, cls = '') => `<svg class="${cls}" viewBox="-14 -16 28 30" aria-hidden="true"><use href="#s-meeple" x="-14" y="-16" width="28" height="30" fill="url(#g-meeple-${side})" stroke="rgba(0,0,0,.55)" stroke-width="1.1"/></svg>`;
const RES_KEYS = ['food', 'wood', 'stone', 'faith'];
const MIRACLE_ART = { lightning: 'm-lightning', rain: 'm-rain', bounty: 'm-bounty' };

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
let lastAltarPhase = null;  // 제단 전환 연출용

const V = () => view ?? state;
const frameEl = () => $('boardFrame');

// ---------- 시작 ----------
async function init() {
  fx.ambient($('ambient'));
  state = createState(1);
  bindTools();
  aiState = await llmStatus();
  aiUsable = ['available', 'readily-available', 'downloadable', 'downloading', 'after-download'].includes(aiState);
  aiMode = aiUsable && new URLSearchParams(location.search).get('ai') !== 'tablet' ? 'llm' : 'tablet';
  renderMainStatus();
  // 메인 화면 뒤로 흐릿하게 비치도록 보드와 매트를 먼저 그린다
  renderTools();
  renderBoardView();
  renderMats();
  // ?play 이면 메인 화면을 건너뛴다 (시험용)
  if (new URLSearchParams(location.search).has('play')) { $('mainScreen').hidden = true; newRound(); }
}

// ---------- 메인 화면 ----------
const inProgress = () => state.round > 0 && !state.winner;

function showMain() {
  const ms = $('mainScreen');
  ms.classList.remove('leaving');
  ms.hidden = false;
  $('startGame').innerHTML = inProgress()
    ? `제 ${state.round} 장으로 돌아가기 <kbd>Enter</kbd>` : '제1권 · 이웃의 불신자 시작 <kbd>Enter</kbd>';
  renderMainStatus();
  $('startGame').focus({ preventScroll: true });
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

function startFromMain() {
  const ms = $('mainScreen');
  if (ms.hidden || ms.classList.contains('leaving')) return;
  // 사용자 입력 안에서 오디오를 연다 (이 전에는 AudioContext를 만들지 않는다)
  unlockAudio();
  sfx.holy();
  ms.classList.add('leaving');
  setTimeout(() => {
    ms.hidden = true;
    ms.classList.remove('leaving');
    if (!inProgress()) { if (state.winner) restart(); else newRound(); }
  }, fx.motion.reduced ? 150 : 850);
}

function bindMain() {
  $('startGame').onclick = startFromMain;
  $('msSound').onclick = () => { setSound(!soundOn()); renderMainStatus(); renderTools(); sfx.click(); };
  $('msMusic').onclick = () => { setMusic(!musicOn()); renderMainStatus(); renderTools(); sfx.click(); };
  $('msMotion').onclick = () => { fx.setReduced(!fx.motion.reduced); renderMainStatus(); renderTools(); sfx.click(); };
  addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('mainScreen').hidden) { e.preventDefault(); startFromMain(); }
    if (e.key === 'Escape' && $('mainScreen').hidden && phase !== 'thinking' && phase !== 'playing') showMain();
  });
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
  const gather = t.building === 'capital' ? '' : `${RESOURCE_NAME[terr.gather]} 채집 +${terr.amount}`;
  return `<b>${esc(tileName(cur, t, 'player'))}</b><span>${[owner, bld, gather, t.wall ? '성벽 — 방어 +2' : ''].filter(Boolean).map(esc).join('<br>')}</span>`;
}

function bindTools() {
  bindMain();
  bindTileTips();
  $('home').onclick = () => { sfx.click(); showMain(); };
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
  fx.chapter(frameEl(), `제 ${state.round} 장`, state.event.name);
}

function restart() {
  state = createState(1);
  prevNums = {};
  prevDoctrine = {};
  newRound();
}

// ---------- 계시 ----------
async function speak() {
  const ta = document.querySelector('.scroll textarea');
  const text = (ta?.value ?? '').trim();
  if (!text) { ta?.focus(); return; }
  const cost = revelationCost(text);
  const p = state.sides.player;
  if (p.faith < cost) { notice = `신앙이 모자라다 (필요 ${cost}, 보유 ${p.faith}). 계시를 줄이거나 침묵하라.`; sfx.fail(); renderAltar(); return; }
  p.faith -= cost;
  draft = '';
  lockAltar();
  await fx.castRevelation(document.querySelector('.scroll'), document.querySelector('.seal-btn'), frameEl(), text);
  await interpret(text);
}

function lockAltar() { document.querySelectorAll('#altar button, #altar textarea').forEach((b) => { b.disabled = true; }); }

async function interpret(text) {
  phase = 'thinking';
  notice = '';
  render();
  let result;
  if (aiMode === 'llm') {
    try {
      await prepareLLM((p) => { progress = p; renderAltar(); });
      progress = null;
      result = await interpretWithLLM(state, text);
    } catch (e) {
      notice = `대사제가 말씀을 알아듣지 못해 석판으로 해석했다 (${e.name}).`;
      result = interpretWithTablet(state, text);
    }
  } else {
    await fx.wait(900);
    result = interpretWithTablet(state, text);
  }
  const forbiddenKeys = result.forbidden.map((a) => a.key);
  const { accepted, rejected } = validateOrders(state, 'player', result.orders, forbiddenKeys, result.doctrine);
  const auto = autoFill(state, 'player', accepted, forbiddenKeys);
  pending = { text, result, accepted, rejected, auto, fresh: true };
  await enterConfirm();
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
  const auto = autoFill(state, 'player', []);
  pending = {
    text: null,
    result: { interpretation: '신께서 침묵하셨다. 신도들은 각자 일터로 향한다.', orders: [], forbidden: [], doctrine: null, source: 'silence' },
    accepted: [], rejected: [], auto, fresh: true,
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
  if (text) {
    recordRevelation(state, text, result.doctrine);
    state.log.push({ round: state.round, side: 'god', text: `“${text}”` });
    state.log.push({ round: state.round, side: 'priest', text: result.interpretation });
  }
  const before = snapshot(state);
  const enemyPlan = planEnemy(state);
  const from = state.log.length;
  resolveRound(state, [...accepted, ...auto], enemyPlan);
  resolved = { enemyPlan, playerPlan: [...accepted, ...auto], logs: state.log.slice(from), shown: [] };
  await playback(before);
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
  for (const log of resolved.logs) {
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
  render();
  if (phase === 'over') {
    music.setMood('end');
    const won = state.winner === 'player';
    const title = state.winner === 'draw' ? '무승부' : won ? '승리' : '패배';
    await fx.wait(700);
    const sub = state.winReason.includes('승점') ? state.winReason : `${state.winReason} · 승점 ${score(state, 'player')} : ${score(state, 'enemy')}`;
    fx.endScreen(won, title, sub, restart);
  }
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
    birth: ['i-house', '새 생명'], loss: ['i-shield', '잃음'], lightning: ['m-lightning', '번개'], rain: ['m-rain', '단비'], bounty: ['m-bounty', '풍요'],
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
      await fx.rollDice(frameEl(), log.dice, {
        leftLabel: `${l} · ${isAttack ? '공격' : '설교'}`, rightLabel: `${r} · ${isAttack ? '방어' : '버팀'}`,
        leftSide: log.side, rightSide: other(log.side),
        winText: isAttack ? (e.capital ? '수도를 쳤다' : e.capture ? '점령' : '승리') : '개종',
        loseText: isAttack ? '격퇴당했다' : '외면당했다',
      });
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
        fx.sparks(tileToHost(svg, null, tile), 18, ['#ffffff', '#cfe3ff', '#ffe9a8']);
        fx.floatText(svg, tile, '+1 신도', mine ? 'good' : 'bad');
      }
      return fx.wait(600);
    }
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
    await playFx(state.log[state.log.length - 1]);
    renderMats();
  }
}

async function onTileClick(id) {
  if (targeting !== 'lightning') return;
  const r = castMiracle(state, 'lightning', id);
  notice = r.ok ? '' : r.text;
  targeting = null;
  render();
  if (r.ok) await playFx(state.log[state.log.length - 1]);
  if (state.winner) { phase = 'over'; render(); fx.endScreen(true, '승리', state.winReason, restart); }
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
  for (let i = 1; i <= MAX_ROUNDS; i++) {
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
      </div>
    </div>`;
  if (dealSeason) setTimeout(() => sfx.deal(), 250);
  dealSeason = false;
  $('season').querySelectorAll('.card').forEach((c) => fx.attachTilt(c, 8));
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
  renderBoard($('board'), cur, { markers, highlight, selectable, onTileClick, focus: focusId });
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
    </div></div>` : `<div class="law-back"><div>${svgUse('s-tablet')}율법 카드는 공개 단계에 뒤집힌다</div></div>`;
  if (shown) flipLaw = false;
  $('law').querySelectorAll('.card').forEach((c) => fx.attachTilt(c, 8));
}

function matHTML(cur, side) {
  const s = cur.sides[side];
  const mine = side === 'player';
  const cap = popCap(cur, side);
  const res = RES_KEYS.map((k) => `
    <div class="res"><span class="coin" id="coin-${side}-${k}">${svgUse(`i-${k}`)}</span>
      <div>${num(`${side}.${k}`, s[k])}<div class="l">${RESOURCE_NAME[k]}</div></div></div>`).join('');
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
        `<span class="gem${i < d[k] ? ' on' : ''}${i >= before && i < d[k] ? ' new' : ''}${info.perks[i + 1] ? ' perk' : ''}" title="${esc(info.perks[i + 1] ?? '')}"></span>`).join('');
      prevDoctrine[k] = d[k];
      const next = Object.entries(info.perks).find(([lv]) => d[k] < Number(lv));
      const got = Object.entries(info.perks).filter(([lv]) => d[k] >= Number(lv)).map(([, t]) => t);
      const perk = got.length ? `<b>✓ ${esc(got.join(', '))}</b>${next ? ` · ${next[0]}칸: ${esc(next[1])}` : ''}` : next ? `${next[0]}칸: ${esc(next[1])}` : '';
      return `<div class="dtrack"><span class="medal">${svgUse(`d-${k}`)}</span><div class="row"><span class="nm">${info.name}</span>${gems}</div><div class="perk-text">${perk}</div></div>`;
    }).join('')}</div>`;
  }
  return `
    <div class="mat-head">
      <span class="crest">${mine ? svgUse('i-temple') : svgUse('s-tablet')}</span>
      <div><h2>${mine ? '우리 부족' : '율법파'}</h2><small>${mine ? '말씀을 따르는 자들' : '새겨진 율법대로 움직인다'}</small></div>
      <div class="score">${num(`${side}.score`, score(cur, side))}<small><br>승점</small></div>
    </div>
    <div class="res-grid${mine ? '' : ' compact'}">${res}</div>
    <div class="section-label"><span>신도</span><span>${s.pop} / ${cap}</span></div>
    <div class="meeples">${meeples}</div>
    <div class="section-label"><span>세력</span></div>
    <div class="stats">
      <div class="stat">${svgUse('i-hand')}행동<b>${num(`${side}.act`, actionLimit(cur, side))}</b></div>
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
  const hand = `<div class="hand">${MIRACLES.map((m) => `
    <button class="mcard${targeting === m.id ? ' on' : ''}" data-m="${m.id}" type="button" ${!canMiracle || state.miracleUsed || p.faith < m.cost ? 'disabled' : ''}>
      <span class="cost">${m.cost}</span>${svgUse(MIRACLE_ART[m.id], 'art', '0 0 48 48')}<div class="nm">${m.name}</div>
      <span class="tip"><b>${m.name}</b> · 신앙 ${m.cost}<br>${esc(m.text)}${state.miracleUsed ? '<br><i>이번 장에는 이미 기적을 썼다.</i>' : ''}</span>
    </button>`).join('')}</div>`;
  const noticeHTML = notice ? `<div class="notice">${esc(notice)}</div>` : '';
  let scroll = '';
  let act = '';

  if (phase === 'speak') {
    const cost = draft.trim() ? revelationCost(draft) : 0;
    scroll = `<div class="scroll">
      <div class="scroll-head"><h3>신의 말씀</h3><small>제 ${state.round} 장 · 신도 행동 ${actionLimit(state, 'player')}회</small></div>
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
    const src = { llm: '대사제', tablet: '석판', silence: '침묵' }[result.source];
    const doc = result.doctrine ? ` · ${DOCTRINE[result.doctrine].name}` : '';
    const short = (a) => esc(a.text.replace(/ \(.*\)$/, ''));
    const chips = [
      ...accepted.map((a, i) => `<span class="order">${meepleSvg('player')}<span class="num">${i + 1}</span><span class="t">${esc(a.text)}</span></span>`),
      ...auto.map((a) => `<span class="order auto">${meepleSvg('player')}<span class="t">${short(a)}</span><span class="why" style="background:rgba(124,89,27,.12)">알아서</span></span>`),
      ...rejected.map((r) => `<span class="order bad"><span class="t">${short(r.action)}</span><span class="why">${esc(r.reason)}</span></span>`),
      ...result.forbidden.map((a) => `<span class="order forbid">⊘ <span class="t">${short(a)}</span><span class="why" style="background:rgba(40,20,10,.12)">금지</span></span>`),
    ].join('');
    const legal = legalActions(state, 'player');
    const hint = result.doctrine === 'war' && !legal.some((a) => a.type === 'attack')
      ? '아직 신도들이 닿는 곳에 율법파가 없다. 마을을 세워 영토를 넓혀야 칠 수 있다.'
      : result.doctrine === 'peace' && !legal.some((a) => a.type === 'preach') && /이웃|율법|전하|설득/.test(text ?? '')
        ? '아직 말씀을 전할 율법파가 닿는 곳에 없다. 영토를 넓혀야 한다.' : null;
    scroll = `<div class="scroll">
      <div class="scroll-head"><h3>대사제의 해석</h3><small>${src}${result.ms ? ` · ${(result.ms / 1000).toFixed(1)}초` : ''}${doc}${text ? ` · “${esc(text)}”` : ''}</small></div>
      <div class="quote">${fresh ? '' : esc(result.interpretation)}</div>
      <div class="orders">${chips}</div>
      ${hint ? `<div class="hint">⚠ ${hint}</div>` : ''}${noticeHTML}</div>`;
    act = `<div class="act">
      <button class="btn-primary big accept" type="button" ${fresh ? 'disabled' : ''}>수락하고 공개</button>
      <button class="btn-ghost again" type="button" ${!text || state.reinterpretUsed || p.faith < 1 ? 'disabled' : ''}>다시 해석 · 신앙 1</button></div>`;
  } else {
    const shown = phase === 'playing' ? resolved.shown : resolved.logs;
    const plan = resolved.enemyPlan.map(enemyLabel).join(' · ') || '없음';
    scroll = `<div class="scroll">
      <div class="scroll-head"><h3>공개와 해결</h3><small>율법 「${esc(state.lawCard.name)}」</small></div>
      <div class="law-line">율법파 배치 — ${esc(plan)}</div>
      <div class="chron">${shown.map((l, i) => logLine(l, phase === 'playing' && i === shown.length - 1)).join('')}</div></div>`;
    act = phase === 'playing'
      ? '<div class="act"><button class="btn-ghost skip" type="button">⏩ 빨리 감기</button></div>'
      : phase === 'over'
        ? `<div class="act"><button class="btn-primary big again-game" type="button">다시 하기</button><div style="text-align:center;font:13px var(--font-body);color:var(--on-table-dim)">${esc(state.winReason)}</div></div>`
        : '<div class="act"><button class="btn-primary big next" type="button">다음 장으로 ▶</button></div>';
  }

  altar.innerHTML = `${hand}<div class="scroll-wrap">${scroll}</div>${act}`;
  const kind = phase === 'resolved' || phase === 'over' ? 'playing' : phase;
  altar.classList.toggle('phase-in', kind !== lastAltarPhase);
  lastAltarPhase = kind;
  altar.querySelectorAll('.mcard').forEach((c) => fx.attachTilt(c, 10));
  bindAltar();

  if (phase === 'confirm' && pending.fresh) {
    pending.fresh = false;
    const chips = [...altar.querySelectorAll('.order')];
    chips.forEach((c) => { c.style.visibility = 'hidden'; });
    fx.typewriter(altar.querySelector('.quote'), pending.result.interpretation).then(async () => {
      for (const c of chips) { c.style.visibility = ''; c.classList.add('appear'); sfx.click(); await fx.wait(110); }
      const ok = altar.querySelector('.accept');
      if (ok) ok.disabled = false;
    });
  }
  const sc = altar.querySelector('.scroll');
  if (sc && altar.querySelector('.chron')) sc.scrollTop = sc.scrollHeight;
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
      const cost = draft.trim() ? revelationCost(draft) : 0;
      count.textContent = `${draft.length} / ${REVELATION_MAX}`;
      pill.querySelector('.c').textContent = `신앙 ${cost}`;
      pill.classList.toggle('over', cost > state.sides.player.faith);
    };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); speak(); } };
    if (!targeting) ta.focus({ preventScroll: true });
  }
  const on = (sel, fn) => { const b = a.querySelector(sel); if (b) b.onclick = fn; };
  on('.seal-btn', speak);
  on('.silence', silence);
  on('.accept', () => { sfx.click(); accept(); });
  on('.again', () => { sfx.click(); reinterpret(); });
  on('.skip', () => { fx.motion.skip = true; });
  on('.next', () => { sfx.click(); newRound(); });
  on('.again-game', restart);
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
  $('chronBody').innerHTML = [...byRound.entries()].reverse()
    .map(([round, lines]) => `<div class="ch">제 ${round} 장</div>${lines.map((l) => logLine(l)).join('')}`).join('')
    || '<p style="color:var(--ink-faint)">아직 기록이 없다.</p>';
}

// ?debug 이면 콘솔에서 상태를 만질 수 있게 한다 (연출 시험용)
if (new URLSearchParams(location.search).has('debug')) {
  import('./sound.js').then((snd) => { window.__gsg.levels = snd.levels; window.__gsg.music = snd.music; });
  import('./engine.js').then((eng) => { window.__gsg.engine = eng; });
  window.__gsg = { get state() { return state; }, render: () => render() };
}

init();
