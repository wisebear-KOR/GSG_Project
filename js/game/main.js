// 게임 진행: 사건 → 계시 → 해석 확인 → 동시 공개·해결 → 다음 라운드
import {
  createState, startRound, legalActions, validateOrders, autoFill, planEnemy, resolveRound,
  recordRevelation, castMiracle, actionLimit, popCap, villageCount, score, tileName,
} from './engine.js';
import {
  DOCTRINES, DOCTRINE, DOCTRINE_MAX, MIRACLES, REVELATION_MAX, revelationCost, RESOURCE_NAME,
} from './data.js';
import { renderBoard } from './board.js';
import { llmStatus, prepareLLM, interpretWithLLM, interpretWithTablet } from './interpreter.js';

const $ = (id) => document.getElementById(id);
const h = (tag, props = {}, ...children) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children.filter((c) => c != null && c !== false));
  return e;
};

let state;
let phase = 'speak';        // speak | thinking | confirm | resolved | over
let aiMode = 'tablet';      // llm | tablet
let aiState = '';
let pending = null;         // 해석 결과와 계획
let resolved = null;        // 해결된 라운드 정보
let targeting = null;       // 번개 대상 고르는 중
let draft = '';
let notice = '';
let progress = null;

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
  newRound();
}

function newRound() {
  startRound(state);
  phase = 'speak';
  pending = null;
  resolved = null;
  targeting = null;
  notice = '';
  render();
}

// ---------- 계시 ----------
async function speak(text) {
  text = text.trim();
  if (!text) return;
  const cost = revelationCost(text);
  const p = state.sides.player;
  if (p.faith < cost) { notice = `신앙이 모자라다 (필요 ${cost}, 보유 ${p.faith}). 계시를 줄이거나 침묵하라.`; render(); return; }
  p.faith -= cost;
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
    result = interpretWithTablet(state, text);
  }
  const forbiddenKeys = result.forbidden.map((a) => a.key);
  const { accepted, rejected } = validateOrders(state, 'player', result.orders, forbiddenKeys, result.doctrine);
  const auto = autoFill(state, 'player', accepted, forbiddenKeys);
  pending = { text, result, accepted, rejected, auto };
  phase = 'confirm';
  render();
}

function silence() {
  const auto = autoFill(state, 'player', []);
  pending = {
    text: null,
    result: { interpretation: '신께서 침묵하셨다. 신도들은 각자 일터로 향한다.', orders: [], forbidden: [], doctrine: null, source: 'silence' },
    accepted: [], rejected: [], auto,
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

function accept() {
  const { text, result, accepted, auto } = pending;
  if (text) {
    recordRevelation(state, text, result.doctrine);
    state.log.push({ round: state.round, side: 'god', text: `“${text}”` });
    state.log.push({ round: state.round, side: 'priest', text: result.interpretation });
  }
  const enemyPlan = planEnemy(state);
  const from = state.log.length;
  resolveRound(state, [...accepted, ...auto], enemyPlan);
  resolved = { enemyPlan, playerPlan: [...accepted, ...auto], logs: state.log.slice(from) };
  phase = state.winner ? 'over' : 'resolved';
  render();
}

// ---------- 기적 ----------
function useMiracle(id) {
  if (id === 'lightning') {
    targeting = targeting ? null : 'lightning';
    notice = targeting ? '번개를 내릴 율법파 칸을 보드에서 고르라.' : '';
    render();
    return;
  }
  const r = castMiracle(state, id);
  notice = r.ok ? '' : r.text;
  render();
}

function onTileClick(id) {
  if (targeting !== 'lightning') return;
  const r = castMiracle(state, 'lightning', id);
  notice = r.ok ? '' : r.text;
  targeting = null;
  if (state.winner) phase = 'over';
  render();
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
}

function renderBoardView() {
  const markers = [];
  let highlight = [];
  if (phase === 'confirm' && pending) {
    pending.accepted.forEach((a, i) => markers.push({ tile: a.tile, side: 'player', label: String(i + 1) }));
    pending.auto.forEach((a) => markers.push({ tile: a.tile, side: 'player', label: '·', dim: true }));
    highlight = pending.accepted.map((a) => a.tile);
  }
  if ((phase === 'resolved' || phase === 'over') && resolved) {
    resolved.playerPlan.forEach((a) => markers.push({ tile: a.tile, side: 'player', dim: a.auto }));
    resolved.enemyPlan.forEach((a) => markers.push({ tile: a.tile, side: 'enemy' }));
  }
  const selectable = targeting === 'lightning'
    ? state.tiles.filter((t) => t.owner === 'enemy' && t.revealed).map((t) => t.id) : [];
  renderBoard($('board'), state, { markers, highlight, selectable, onTileClick });
}

function renderCards() {
  const ev = state.event;
  $('eventCard').replaceChildren(
    h('div', { className: 'kind', textContent: '사건 카드' }),
    h('div', { className: 'title', textContent: `${ev.icon} ${ev.name}` }),
    h('div', { textContent: ev.text }),
    h('div', { className: 'rule', textContent: ev.rule }),
  );
  const law = $('lawCard');
  if (phase === 'resolved' || phase === 'over') {
    law.className = 'card enemy';
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

function renderResources() {
  const p = state.sides.player;
  const e = state.sides.enemy;
  const row = (label, a, b) => h('tr', {}, h('td', { textContent: label }), h('td', { className: 'c-player', textContent: a }), h('td', { className: 'c-enemy', textContent: b }));
  $('res').replaceChildren(
    h('thead', {}, h('tr', {}, h('th'), h('th', { textContent: '우리 부족' }), h('th', { textContent: '율법파' }))),
    h('tbody', {},
      row('🌾 식량', p.food, e.food),
      row('🪵 목재', p.wood, e.wood),
      row('🪨 돌', p.stone, e.stone),
      row('✨ 신앙', p.faith, e.faith),
      row('🧍 신도 / 한도', `${p.pop} / ${popCap(state, 'player')}`, `${e.pop} / ${popCap(state, 'enemy')}`),
      row('✋ 이번 행동 수', actionLimit(state, 'player'), actionLimit(state, 'enemy')),
      row('⛪ 신전 단계', p.templeLevel, e.templeLevel),
      row('🏠 마을', villageCount(state, 'player'), villageCount(state, 'enemy')),
      row('🛡️ 수도 내구도', p.capitalHp, e.capitalHp),
      row('🏆 승점', score(state, 'player'), score(state, 'enemy')),
    ),
  );
}

function renderDoctrine() {
  const d = state.sides.player.doctrine;
  $('doctrine').replaceChildren(...DOCTRINES.map((k) => {
    const info = DOCTRINE[k];
    const pips = Array.from({ length: DOCTRINE_MAX }, (_, i) => h('span', {
      className: `pip${i < d[k] ? ' on' : ''}${info.perks[i + 1] ? ' perk' : ''}`,
      textContent: info.perks[i + 1] ? '★' : '', title: info.perks[i + 1] ?? '',
    }));
    const perks = Object.entries(info.perks).map(([lv, txt]) => `${lv}칸: ${txt}${d[k] >= Number(lv) ? ' ✓' : ''}`).join(' · ');
    return h('div', { className: 'track' },
      h('div', { textContent: `${info.icon} ${info.name}` }),
      h('div', { className: 'pips' }, ...pips),
      h('div', { className: 'perks', textContent: perks }));
  }));
}

function actionItem(a, cls, suffix = '') {
  return h('li', { className: cls, textContent: `${a.text}${suffix}` });
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
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) speak(ta.value).then(() => { draft = ''; }); });
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
    const send = h('button', { textContent: '계시 내리기' });
    send.onclick = () => { const t = ta.value; draft = ''; speak(t); };
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
    box.replaceChildren(h('h2', {}, '대사제가 계시를 해석하는 중'), h('p', {}, h('span', { className: 'spinner' }), `잠시 기다려라…${pct}`));
    return;
  }

  if (phase === 'confirm') {
    const { text, result, accepted, rejected, auto } = pending;
    const src = { llm: '대사제(LLM)', tablet: '석판', silence: '침묵' }[result.source];
    const items = [
      ...accepted.map((a, i) => actionItem(a, '', ` — ${i + 1}번 신도`)),
      ...auto.map((a) => actionItem(a, 'auto', ' — 알아서 (자동)')),
      ...rejected.map((r) => actionItem(r.action, 'bad', ` — ${r.reason}`)),
    ];
    // 계시의 뜻을 따를 행동이 아예 없으면 알려 준다 (작은 모델은 이 사정을 잘 말하지 못한다)
    const legal = legalActions(state, 'player');
    const hint = result.doctrine === 'war' && !legal.some((a) => a.type === 'attack')
      ? '⚠️ 아직 신도들이 닿는 곳에 율법파가 없다. 마을을 세워 영토를 넓혀야 칠 수 있다.'
      : result.doctrine === 'peace' && !legal.some((a) => a.type === 'preach') && /이웃|율법|전하|설득/.test(text ?? '')
        ? '⚠️ 아직 말씀을 전할 율법파가 닿는 곳에 없다. 영토를 넓혀야 한다.' : null;
    const hintEl = hint ? h('p', { className: 'small', textContent: hint }) : null;
    const forb = result.forbidden.length
      ? h('p', { className: 'small muted', textContent: `금지된 행동: ${result.forbidden.map((a) => a.text.replace(/ \(.*\)$/, '')).join(', ')}` }) : null;
    const ok = h('button', { textContent: '수락하고 공개' });
    ok.onclick = accept;
    const again = h('button', { className: 'ghost', textContent: '다시 해석 (신앙 1)', disabled: !text || state.reinterpretUsed || p.faith < 1 });
    again.onclick = reinterpret;
    box.replaceChildren(
      h('h2', {}, '대사제의 해석', h('small', { textContent: `${src}${result.ms ? ` · ${(result.ms / 1000).toFixed(1)}초` : ''}${result.doctrine ? ` · ${DOCTRINE[result.doctrine].icon} ${DOCTRINE[result.doctrine].name}` : ''}` })),
      text ? h('p', { className: 'small muted', textContent: `계시: “${text}”` }) : null,
      h('blockquote', { textContent: result.interpretation }),
      h('ul', { className: 'plan' }, ...items),
      hintEl, forb, noticeEl,
      h('div', { className: 'row' }, h('span', { className: 'spacer' }), again, ok),
    );
    return;
  }

  if (phase === 'resolved' || phase === 'over') {
    const logs = resolved.logs.map((l) => logLine(l));
    const children = [
      h('h2', {}, '공개와 해결', h('small', { textContent: `율법 카드: ${state.lawCard.name}` })),
      h('p', { className: 'small muted', textContent: `율법파 배치: ${resolved.enemyPlan.map(enemyLabel).join(' / ') || '없음'}` }),
      h('div', { className: 'log' }, ...logs),
    ];
    if (phase === 'over') {
      const won = state.winner === 'player';
      const title = state.winner === 'draw' ? '무승부' : won ? '승리!' : '패배';
      const again = h('button', { textContent: '다시 하기' });
      again.onclick = () => { state = createState(1); newRound(); };
      children.push(h('div', { className: 'banner' },
        h('div', { className: 'big', textContent: title }),
        h('p', { textContent: state.winReason }),
        h('p', { className: 'small muted', textContent: `최종 승점 ${score(state, 'player')} : ${score(state, 'enemy')}` }),
        again));
    } else {
      const next = h('button', { textContent: '다음 라운드' });
      next.onclick = newRound;
      children.push(h('div', { className: 'row' }, h('span', { className: 'spacer' }), next));
    }
    box.replaceChildren(...children);
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
  for (const l of state.log) {
    if (!byRound.has(l.round)) byRound.set(l.round, []);
    byRound.get(l.round).push(l);
  }
  const blocks = [...byRound.entries()].reverse().flatMap(([round, lines]) => [
    h('div', { className: 'round', textContent: `제${round}장` }),
    ...lines.map(logLine),
  ]);
  $('log').replaceChildren(...(blocks.length ? blocks : [h('p', { className: 'muted', textContent: '아직 기록이 없다.' })]));
}

init();
