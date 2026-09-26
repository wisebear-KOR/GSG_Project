// 게임 진행: 사건 → 계시 → 해석 확인 → 동시 공개·해결(한 줄씩 연출) → 다음 라운드
import {
  createState, startRound, legalActions, validateOrders, autoFill, planEnemy, resolveRound,
  recordRevelation, castMiracle, actionLimit, popCap, villageCount, score, tileName, snapshot, capitalOf, other,
} from './engine.js';
import {
  DOCTRINES, DOCTRINE, DOCTRINE_MAX, MIRACLES, REVELATION_MAX, revelationCost, RESOURCE_NAME,
} from './data.js';
import { renderBoard, tileToHost } from './board.js';
import { llmStatus, prepareLLM, interpretWithLLM, interpretWithTablet } from './interpreter.js';
import * as fx from './fx.js';

const $ = (id) => document.getElementById(id);
const h = (tag, props = {}, ...children) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children.filter((c) => c != null && c !== false));
  return e;
};
const RES_ICON = { food: '🌾', wood: '🪵', stone: '🪨', faith: '✨' };

let state;
let phase = 'speak';        // speak | thinking | confirm | playing | resolved | over
let aiMode = 'tablet';      // llm | tablet
let aiState = '';
let pending = null;         // 해석 결과와 계획
let resolved = null;        // 해결된 라운드 정보
let view = null;            // 재생 중이면 그 시점의 보드 스냅숏
let targeting = null;       // 번개 대상 고르는 중
let draft = '';
let notice = '';
let progress = null;
let flipEvent = false;      // 이번 렌더에서 사건 카드를 뒤집을지
let flipLaw = false;
let prevNums = {};          // 자원 숫자 변화 연출용
let prevDoctrine = {};

const V = () => view ?? state;
const boardHost = () => document.querySelector('.board-wrap');

// ---------- 시작 ----------
async function init() {
  state = createState(1);
  aiState = await llmStatus();
  const usable = ['available', 'readily-available', 'downloadable', 'downloading', 'after-download'].includes(aiState);
  // ?ai=tablet 으로 LLM 없이 석판 해석기만 쓸 수 있다
  aiMode = usable && new URLSearchParams(location.search).get('ai') !== 'tablet' ? 'llm' : 'tablet';
  $('ai').onclick = () => {
    if (!usable || phase === 'thinking') return;
    aiMode = aiMode === 'llm' ? 'tablet' : 'llm';
    renderHeader();
  };
  $('ai').title = usable ? '눌러서 LLM / 석판 전환' : 'Prompt API를 쓸 수 없어 석판으로만 해석한다';
  $('motion').title = '눌러서 연출 화려하게 / 줄이기 전환';
  $('motion').onclick = () => { fx.setReduced(!fx.motion.reduced); renderHeader(); };
  newRound();
}

function newRound() {
  startRound(state);
  phase = 'speak';
  pending = null;
  resolved = null;
  targeting = null;
  notice = '';
  flipEvent = true;
  render();
  fx.chapter(boardHost(), `제 ${state.round} 장`, `${state.event.icon} ${state.event.name}`);
}

function restart() {
  state = createState(1);
  prevNums = {};
  prevDoctrine = {};
  newRound();
}

// ---------- 계시 ----------
async function speak(text, fromEl) {
  text = text.trim();
  if (!text) return;
  const cost = revelationCost(text);
  const p = state.sides.player;
  if (p.faith < cost) { notice = `신앙이 모자라다 (필요 ${cost}, 보유 ${p.faith}). 계시를 줄이거나 침묵하라.`; render(); return; }
  p.faith -= cost;
  draft = '';
  if (fromEl) await fx.castRevelation(fromEl, boardHost(), text);
  await interpret(text);
}

async function interpret(text) {
  phase = 'thinking';
  notice = '';
  render();
  let result;
  if (aiMode === 'llm') {
    try {
      await prepareLLM((p) => { progress = p; render(); });
      progress = null;
      result = await interpretWithLLM(state, text);
    } catch (e) {
      notice = `대사제가 말씀을 알아듣지 못해 석판으로 해석했다 (${e.name}).`;
      result = interpretWithTablet(state, text);
    }
  } else {
    await fx.wait(700); // 석판도 잠깐 뜸을 들인다
    result = interpretWithTablet(state, text);
  }
  const forbiddenKeys = result.forbidden.map((a) => a.key);
  const { accepted, rejected } = validateOrders(state, 'player', result.orders, forbiddenKeys, result.doctrine);
  const auto = autoFill(state, 'player', accepted, forbiddenKeys);
  pending = { text, result, accepted, rejected, auto, fresh: true };
  phase = 'confirm';
  render();
}

function silence() {
  const auto = autoFill(state, 'player', []);
  pending = {
    text: null,
    result: { interpretation: '신께서 침묵하셨다. 신도들은 각자 일터로 향한다.', orders: [], forbidden: [], doctrine: null, source: 'silence' },
    accepted: [], rejected: [], auto, fresh: true,
  };
  phase = 'confirm';
  render();
}

async function reinterpret() {
  const p = state.sides.player;
  if (state.reinterpretUsed || p.faith < 1 || !pending?.text) return;
  p.faith -= 1;
  state.reinterpretUsed = true;
  await interpret(pending.text);
}

async function accept() {
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
  phase = 'playing';
  view = makeView(before);
  flipLaw = true;
  resolved.dropEnemy = true;
  render();
  await fx.wait(1300);
  resolved.dropEnemy = false;
  for (const log of resolved.logs) {
    view = makeView(log.snap);
    resolved.shown.push(log);
    render();
    await playFx(log);
  }
  view = null;
  fx.motion.skip = false;
  phase = state.winner ? 'over' : 'resolved';
  render();
  if (phase === 'over') {
    const won = state.winner === 'player';
    const title = state.winner === 'draw' ? '무승부' : won ? '승리!' : '패배';
    await fx.wait(600);
    fx.endScreen(won, title, `${state.winReason} · 승점 ${score(state, 'player')} : ${score(state, 'enemy')}`, restart);
  }
}

async function playFx(log) {
  const e = log.fx;
  const svg = $('board');
  const host = boardHost();
  const cur = V();
  const tile = e?.tile ? cur.tileAt[e.tile] : null;
  // 안개 속 율법파의 일은 보이지 않는다
  if (!e || (tile && !tile.revealed && log.side === 'enemy')) return fx.wait(350);
  const good = log.side === 'player' ? 'good' : 'bad';
  const color = log.side === 'player' ? '#7ea6ff' : '#ff7f6f';
  const home = capitalOf(cur, log.side);
  const gains = (t) => Object.entries(e.gain ?? {}).forEach(([k, v], i) => fx.floatText(svg, t, `+${v} ${RES_ICON[k]}`, good, i * -22));
  switch (e.kind) {
    case 'gain':
      fx.ring(svg, tile, color);
      gains(tile);
      return fx.wait(750);
    case 'treasure':
      fx.sparkles(host, '💎', 14, tileToHost(svg, host, tile));
      gains(tile);
      return fx.wait(1000);
    case 'explore':
      fx.ring(svg, tile, '#e8e1d0', true);
      fx.floatText(svg, tile, '안개가 걷혔다', 'info');
      return fx.wait(900);
    case 'build':
      fx.rise(svg, tile, e.icon);
      fx.ring(svg, tile, color);
      return fx.wait(1000);
    case 'cathedral':
      fx.rise(svg, tile, '⛪');
      fx.flash(host, '#ffe9a8', 900);
      fx.sparkles(host, '✨', 30, tileToHost(svg, host, tile));
      return fx.wait(1600);
    case 'blocked':
    case 'fail':
      if (tile) fx.floatText(svg, tile, '✖', 'bad');
      return fx.wait(650);
    case 'preach':
    case 'attack': {
      const mine = log.side === 'player';
      const labels = mine ? ['신도들', '율법파'] : ['율법파', '신도들'];
      const isAttack = e.kind === 'attack';
      await fx.rollDice(host, log.dice, {
        leftLabel: `${labels[0]} (${isAttack ? '공격' : '선교'})`, rightLabel: `${labels[1]} (${isAttack ? '방어' : '버팀'})`,
        leftSide: log.side, rightSide: other(log.side),
        winText: isAttack ? (e.capital ? '수도 타격!' : e.capture ? '점령!' : '승리!') : '개종!',
        loseText: isAttack ? '격퇴당했다' : '외면당했다',
      });
      if (isAttack && log.dice.win) {
        fx.shake(svg, 9);
        fx.flash(host, 'rgba(255,60,40,.55)', 450);
        fx.ring(svg, tile, '#ff4b3a', true);
        fx.floatText(svg, tile, e.capital ? '💥 -1 🛡️' : '⚔️', 'bad');
      } else if (!isAttack && log.dice.win) {
        fx.sparkles(host, '🕊️', 8, tileToHost(svg, host, tile));
        fx.floatText(svg, tile, '+1 🧍', good);
      } else {
        fx.floatText(svg, tile, '✖', 'bad');
      }
      return fx.wait(700);
    }
    case 'loss':
      if (home) fx.floatText(svg, home, '-1 🧍', 'bad');
      return fx.wait(700);
    case 'birth':
      if (home) { fx.floatText(svg, home, '+1 🧍', 'good'); fx.ring(svg, home, '#9be29b'); }
      return fx.wait(700);
    case 'lightning':
      fx.lightning(svg, host, tile);
      return fx.wait(800);
    case 'rain':
      fx.rain(host);
      if (home) gains(home);
      return fx.wait(1200);
    case 'bounty':
      fx.sparkles(host, '🎁', 18, home ? tileToHost(svg, host, home) : null);
      if (home) gains(home);
      return fx.wait(1000);
    default:
      return fx.wait(400);
  }
}

// ---------- 기적 ----------
async function useMiracle(id) {
  if (id === 'lightning') {
    targeting = targeting ? null : 'lightning';
    notice = targeting ? '번개를 내릴 율법파 칸을 보드에서 고르라.' : '';
    render();
    return;
  }
  const r = castMiracle(state, id);
  notice = r.ok ? '' : r.text;
  render();
  if (r.ok) await playFx(state.log[state.log.length - 1]);
}

async function onTileClick(id) {
  if (targeting !== 'lightning') return;
  const r = castMiracle(state, 'lightning', id);
  notice = r.ok ? '' : r.text;
  targeting = null;
  render();
  if (r.ok) await playFx(state.log[state.log.length - 1]);
  if (state.winner) { phase = 'over'; render(); fx.endScreen(true, '승리!', state.winReason, restart); }
}

// ---------- 렌더링 ----------
function render() {
  renderHeader();
  renderBoardView();
  renderCards();
  renderResources();
  renderDoctrine();
  renderPhase();
  renderLog();
}

function renderHeader() {
  $('round').textContent = `${state.round} / ${state.maxRounds}`;
  $('first').textContent = state.first === 'player' ? '우리 부족' : '율법파';
  $('ai').textContent = aiMode === 'llm' ? `LLM (${aiState})` : aiState === 'no-api' ? '석판 (Prompt API 없음)' : '석판';
  $('motion').textContent = fx.motion.reduced ? '줄임' : '화려하게';
}

function renderBoardView() {
  const cur = V();
  const markers = [];
  let highlight = [];
  if (phase === 'confirm' && pending) {
    pending.accepted.forEach((a, i) => markers.push({ tile: a.tile, side: 'player', label: String(i + 1), drop: pending.fresh, delay: i }));
    pending.auto.forEach((a, i) => markers.push({ tile: a.tile, side: 'player', label: '·', dim: true, drop: pending.fresh, delay: pending.accepted.length + i }));
    highlight = pending.accepted.map((a) => a.tile);
  }
  if (['playing', 'resolved', 'over'].includes(phase) && resolved) {
    resolved.playerPlan.forEach((a) => markers.push({ tile: a.tile, side: 'player', dim: a.auto }));
    resolved.enemyPlan.forEach((a, i) => markers.push({ tile: a.tile, side: 'enemy', drop: resolved.dropEnemy, delay: i }));
  }
  const selectable = targeting === 'lightning'
    ? cur.tiles.filter((t) => t.owner === 'enemy' && t.revealed).map((t) => t.id) : [];
  const tileTitle = (t) => tileName(cur, t, 'player');
  const svg = $('board');
  renderBoard(svg, cur, { markers, highlight, selectable, onTileClick, tileTitle });
  svg.classList.toggle('thinking-board', phase === 'thinking');
}

function renderCards() {
  const ev = state.event;
  const evCard = $('eventCard');
  evCard.className = `card${flipEvent ? ' flip-in' : ''}`;
  flipEvent = false;
  evCard.replaceChildren(
    h('div', { className: 'kind', textContent: '사건 카드' }),
    h('div', { className: 'title', textContent: `${ev.icon} ${ev.name}` }),
    h('div', { textContent: ev.text }),
    h('div', { className: 'rule', textContent: ev.rule }),
  );
  const law = $('lawCard');
  if (['playing', 'resolved', 'over'].includes(phase)) {
    law.className = `card enemy${flipLaw ? ' flip-in' : ''}`;
    flipLaw = false;
    law.replaceChildren(
      h('div', { className: 'kind', textContent: '율법 카드' }),
      h('div', { className: 'title', textContent: `📜 ${state.lawCard.name}` }),
      h('div', { className: 'rule', textContent: state.lawCard.text }),
    );
  } else {
    law.className = 'card back';
    law.replaceChildren(h('div', {}, h('div', { className: 'title', textContent: '📜' }), h('div', { className: 'small', textContent: '율법 카드는 공개 단계에 뒤집힌다' })));
  }
}

// 숫자가 바뀌면 튀는 연출을 붙인다
function num(key, value) {
  const s = h('span', { className: 'num', textContent: value });
  const prev = prevNums[key];
  if (prev != null && typeof value === 'number' && prev !== value) s.className = `num ${value > prev ? 'bump-up' : 'bump-down'}`;
  prevNums[key] = value;
  return s;
}

function renderResources() {
  const cur = V();
  const p = cur.sides.player;
  const e = cur.sides.enemy;
  const row = (key, label, a, b) => h('tr', {},
    h('td', { textContent: label }),
    h('td', { className: 'c-player' }, num(`p.${key}`, a)),
    h('td', { className: 'c-enemy' }, num(`e.${key}`, b)));
  $('res').replaceChildren(
    h('thead', {}, h('tr', {}, h('th'), h('th', { textContent: '우리 부족' }), h('th', { textContent: '율법파' }))),
    h('tbody', {},
      row('food', '🌾 식량', p.food, e.food),
      row('wood', '🪵 목재', p.wood, e.wood),
      row('stone', '🪨 돌', p.stone, e.stone),
      row('faith', '✨ 신앙', p.faith, e.faith),
      row('pop', '🧍 신도', p.pop, e.pop),
      row('cap', '🏘️ 인구 한도', popCap(cur, 'player'), popCap(cur, 'enemy')),
      row('act', '✋ 이번 행동 수', actionLimit(cur, 'player'), actionLimit(cur, 'enemy')),
      row('temple', '⛪ 신전 단계', p.templeLevel, e.templeLevel),
      row('village', '🏠 마을', villageCount(cur, 'player'), villageCount(cur, 'enemy')),
      row('hp', '🛡️ 수도 내구도', p.capitalHp, e.capitalHp),
      row('score', '🏆 승점', score(cur, 'player'), score(cur, 'enemy')),
    ),
  );
}

function renderDoctrine() {
  const d = state.sides.player.doctrine;
  $('doctrine').replaceChildren(...DOCTRINES.map((k) => {
    const info = DOCTRINE[k];
    const before = prevDoctrine[k] ?? d[k];
    const pips = Array.from({ length: DOCTRINE_MAX }, (_, i) => h('span', {
      className: `pip${i < d[k] ? ' on' : ''}${i >= before && i < d[k] ? ' new' : ''}${info.perks[i + 1] ? ' perk' : ''}`,
      textContent: info.perks[i + 1] ? '★' : '', title: info.perks[i + 1] ?? '',
    }));
    prevDoctrine[k] = d[k];
    const perks = Object.entries(info.perks).map(([lv, txt]) => `${lv}칸: ${txt}${d[k] >= Number(lv) ? ' ✓' : ''}`).join(' · ');
    return h('div', { className: 'track' },
      h('div', { textContent: `${info.icon} ${info.name}` }),
      h('div', { className: 'pips' }, ...pips),
      h('div', { className: 'perks', textContent: perks }));
  }));
}

function renderPhase() {
  const el = $('phase');
  // null 자식은 건너뛴다 (replaceChildren은 null을 "null" 글자로 넣는다)
  const box = { replaceChildren: (...kids) => el.replaceChildren(...kids.filter((k) => k != null)) };
  const p = state.sides.player;
  const noticeEl = notice ? h('p', { className: 'small', style: 'color:var(--bad)', textContent: notice }) : null;

  if (phase === 'speak') {
    const ta = h('textarea', { maxLength: REVELATION_MAX, placeholder: '예: 강물이 너희를 먹이리라', value: draft });
    const counter = h('span', { className: 'small muted' });
    const updateCounter = () => {
      draft = ta.value;
      const cost = ta.value.trim() ? revelationCost(ta.value) : 0;
      counter.textContent = `${ta.value.length} / ${REVELATION_MAX}자 · 신앙 ${cost} 소모`;
    };
    ta.addEventListener('input', updateCounter);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) speak(ta.value, ta); });
    updateCounter();
    const miracles = h('div', { className: 'miracles' }, ...MIRACLES.map((m) => {
      const b = h('button', {
        className: `miracle${targeting === m.id ? ' on' : ''}`, title: m.text,
        textContent: `${m.icon} ${m.name} (신앙 ${m.cost})`,
        disabled: state.miracleUsed || p.faith < m.cost,
      });
      b.onclick = () => useMiracle(m.id);
      return b;
    }));
    const send = h('button', { textContent: '⚡ 계시 내리기' });
    send.onclick = () => speak(ta.value, ta);
    const quiet = h('button', { className: 'ghost', textContent: '침묵하기' });
    quiet.onclick = silence;
    box.replaceChildren(
      h('h2', {}, '신의 말씀', h('small', { textContent: `라운드 ${state.round} · 행동 ${actionLimit(state, 'player')}회` })),
      h('p', { className: 'small muted', textContent: '기적은 라운드당 하나. 계시는 25자마다 신앙 1을 쓴다. 신도들은 계시를 해석해 움직이고, 남은 신도는 알아서 일한다.' }),
      miracles, ta,
      h('div', { className: 'row' }, counter, h('span', { className: 'spacer' }), quiet, send),
      noticeEl,
    );
    ta.focus();
    return;
  }

  if (phase === 'thinking') {
    const pct = progress != null ? ` (모델 내려받는 중 ${(progress * 100).toFixed(0)}%)` : '';
    box.replaceChildren(
      h('h2', {}, '대사제가 제단 앞에 엎드렸다'),
      h('p', {}, h('span', { className: 'candle', textContent: '🕯️' }), ` 말씀의 뜻을 헤아리는 중…${pct}`),
    );
    return;
  }

  if (phase === 'confirm') {
    const { text, result, accepted, rejected, auto } = pending;
    const fresh = pending.fresh;
    pending.fresh = false;
    const src = { llm: '대사제(LLM)', tablet: '석판', silence: '침묵' }[result.source];
    const items = [
      ...accepted.map((a, i) => h('li', { textContent: `${a.text} — ${i + 1}번 신도` })),
      ...auto.map((a) => h('li', { className: 'auto', textContent: `${a.text} — 알아서 (자동)` })),
      ...rejected.map((r) => h('li', { className: 'bad', textContent: `${r.action.text} — ${r.reason}` })),
    ];
    // 계시의 뜻을 따를 행동이 아예 없으면 알려 준다 (작은 모델은 이 사정을 잘 말하지 못한다)
    const legal = legalActions(state, 'player');
    const hint = result.doctrine === 'war' && !legal.some((a) => a.type === 'attack')
      ? '⚠️ 아직 신도들이 닿는 곳에 율법파가 없다. 마을을 세워 영토를 넓혀야 칠 수 있다.'
      : result.doctrine === 'peace' && !legal.some((a) => a.type === 'preach') && /이웃|율법|전하|설득/.test(text ?? '')
        ? '⚠️ 아직 말씀을 전할 율법파가 닿는 곳에 없다. 영토를 넓혀야 한다.' : null;
    const hintEl = hint ? h('p', { className: 'small', textContent: hint }) : null;
    const forb = result.forbidden.length
      ? h('p', { className: 'small muted', textContent: `🚫 금지된 행동: ${result.forbidden.map((a) => a.text.replace(/ \(.*\)$/, '')).join(', ')}` }) : null;
    const ok = h('button', { textContent: '수락하고 공개' });
    ok.onclick = accept;
    const again = h('button', { className: 'ghost', textContent: '다시 해석 (신앙 1)', disabled: !text || state.reinterpretUsed || p.faith < 1 });
    again.onclick = reinterpret;
    const quote = h('blockquote', { textContent: fresh ? '' : result.interpretation });
    const list = h('ul', { className: 'plan' }, ...items);
    const tail = [hintEl, forb, noticeEl, h('div', { className: 'row' }, h('span', { className: 'spacer' }), again, ok)].filter(Boolean);
    box.replaceChildren(
      h('h2', {}, '대사제의 해석', h('small', { textContent: `${src}${result.ms ? ` · ${(result.ms / 1000).toFixed(1)}초` : ''}${result.doctrine ? ` · ${DOCTRINE[result.doctrine].icon} ${DOCTRINE[result.doctrine].name}` : ''}` })),
      text ? h('p', { className: 'small muted', textContent: `계시: “${text}”` }) : null,
      quote, list, ...tail,
    );
    if (fresh) {
      // 해석문을 한 글자씩 쓰고, 그다음 계획이 한 줄씩 나타난다
      [...list.children, ...tail].forEach((x) => { x.style.visibility = 'hidden'; });
      ok.disabled = true;
      fx.typewriter(quote, result.interpretation).then(async () => {
        for (const x of [...list.children, ...tail]) {
          x.style.visibility = '';
          x.classList.add('appear');
          await fx.wait(120);
        }
        ok.disabled = false;
      });
    }
    return;
  }

  if (['playing', 'resolved', 'over'].includes(phase)) {
    const shown = phase === 'playing' ? resolved.shown : resolved.logs;
    const lines = shown.map((l, i) => {
      const line = logLine(l);
      if (phase === 'playing' && i === shown.length - 1) line.classList.add('appear');
      return line;
    });
    const head = h('h2', {}, '공개와 해결', h('small', { textContent: `율법 카드: ${state.lawCard.name}` }));
    const enemyLine = h('p', { className: 'small muted', textContent: `율법파 배치: ${resolved.enemyPlan.map(enemyLabel).join(' / ') || '없음'}` });
    const children = [head, enemyLine, h('div', { className: 'log' }, ...lines)];
    if (phase === 'playing') {
      const skip = h('button', { className: 'ghost skip', textContent: '⏩ 빨리 감기' });
      skip.onclick = () => { fx.motion.skip = true; };
      children.push(h('div', { className: 'row' }, h('span', { className: 'spacer' }), skip));
    } else if (phase === 'over') {
      const again = h('button', { textContent: '다시 하기' });
      again.onclick = restart;
      const won = state.winner === 'player';
      children.push(h('div', { className: 'banner' },
        h('div', { className: 'big', textContent: state.winner === 'draw' ? '무승부' : won ? '승리!' : '패배' }),
        h('p', { textContent: state.winReason }),
        again));
    } else {
      const next = h('button', { textContent: '다음 라운드 ▶' });
      next.onclick = newRound;
      children.push(h('div', { className: 'row' }, h('span', { className: 'spacer' }), next));
    }
    box.replaceChildren(...children);
    const logBox = el.querySelector('.log');
    if (logBox) logBox.scrollTop = logBox.scrollHeight;
  }
}

// 율법파 행동을 플레이어 시점으로 적는다 (안개 속 지형은 드러내지 않는다)
function enemyLabel(a) {
  const place = tileName(state, state.tileAt[a.tile], 'player');
  const what = {
    gather: `${RESOURCE_NAME[a.gather]} 채집`, pray: '기도', preach: '선교', attack: '공격', explore: '탐험',
    build: { village: '마을 건설', wall: '성벽 건설', temple: '신전 높이기', cathedral: '대성당' }[a.build],
  }[a.type];
  return `${what} @ ${place}`;
}

function logLine(l) {
  const dice = l.dice
    ? h('span', { className: 'dice', textContent: `🎲 ${l.dice.attacker}${l.dice.attackerBonus ? `+${l.dice.attackerBonus}` : ''} vs ${l.dice.defender}${l.dice.defenderBonus ? `+${l.dice.defenderBonus}` : ''}` })
    : null;
  return h('p', { className: l.side }, l.text, dice);
}

function renderLog() {
  const byRound = new Map();
  // 재생 중인 라운드는 아직 드러나지 않은 줄을 숨긴다
  const hidden = phase === 'playing' ? new Set(resolved.logs.filter((l) => !resolved.shown.includes(l))) : new Set();
  for (const l of state.log) {
    if (hidden.has(l)) continue;
    if (!byRound.has(l.round)) byRound.set(l.round, []);
    byRound.get(l.round).push(l);
  }
  const blocks = [...byRound.entries()].reverse().flatMap(([round, lines]) => [
    h('div', { className: 'round', textContent: `제${round}장` }),
    ...lines.map(logLine),
  ]);
  $('log').replaceChildren(...(blocks.length ? blocks : [h('p', { className: 'muted', textContent: '아직 기록이 없다.' })]));
}

// ?debug 이면 콘솔에서 상태를 만질 수 있게 한다 (연출 시험용)
if (new URLSearchParams(location.search).has('debug')) {
  window.__gsg = { get state() { return state; }, render: () => render() };
}

init();
