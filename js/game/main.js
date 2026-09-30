// 게임 진행과 화면: 사건 → 계시 → 해석 확인 → 동시 공개·해결(한 단계씩 연출) → 다음 장
import {
  createState, startRound, legalActions, validateOrders, autoFill, planEnemy, resolveRound,
  recordRevelation, castMiracle, actionLimit, popCap, villageCount, score, tileName, snapshot, capitalOf, other,
  faithIncome, DEFAULT_CONFIG, enemyIntent, revelationCostFor, chooseEvent,
  grantGrace, petitionAnswered, nameTile, applyTone, sealProphecy, takeMiracle, resolveSite,
  scoreBreakdown, miracleCost, doomReady, nextEvent, keepVows, hasUlt, ULT_ROUND, actionOdds,
  holyOwner, edictMax, chooseDestiny, actOf, actStart, dilemmaByText, resolveDilemma, yieldOf,
  canCarve, carveCommandment, findSacred, distance, previewGains, ultRound, draftRound,
  applySilence, markLegends, serializeState, hydrateState, monthOf, payDilemma, carvable,
  isEcho, spokenOf, marchRange, unlocked, MODULES,
} from './engine.js';
import {
  DOCTRINES, DOCTRINE, DOCTRINE_MAX, MIRACLES, REVELATION_MAX, RESOURCE_NAME, ENEMY_LEADERS, EVENTS, TONES, PROPHECY, PRIESTS, SITES, DOOM, JUDGEMENTS, OPPOSED, REACT, DILEMMAS, FESTIVALS, DESTINIES, DESTINY_POINTS, ACTS, SIGILS, FEATURES, COMMANDMENTS, AWE_LEVELS, BLESSINGS, AWE_TITLES, TRIALS, ASCENSION, RULESET, LAW_CARDS, CAPITAL_HP, MAX_TEMPLE, TERRAIN, RULES, DIFFICULTY, MAP_SIZES,
} from './data.js';
import { renderBoard, tileToHost, markerToScreen, tileCenter } from './board.js';
import { installArt } from './art.js';
import { Tutorial } from './tutorial.js';
import * as meta from './meta.js';
import { leaderLine, nouns, detectTone, parseNaming, parseProphecy, parseMiracle, parseCommandment } from './lore.js';
import {
  summarizeGame, epilogue, topRevelations, decisiveScene, diceLuck, evaluateAchievements, closestAchievement, ACHIEVEMENTS, difficultyName, doctrineName,
} from './chronicle.js';
import { llmStatus, prepareLLM, interpretWithLLM, interpretWithTablet, linkWords, extractLesson, describeLesson, voiceOf } from './interpreter.js';
import * as fx from './fx.js';
import { t, lang, LOCALES, setLang } from './i18n.js';
import { sfx, soundOn, setSound, musicOn, setMusic, music, unlockAudio, volume, setVolume } from './sound.js';

installArt();
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const svgUse = (id, cls = '', vb = '0 0 24 24') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true"><use href="#${id}"/></svg>`;
// 미플 심볼은 원점이 (0,0)이 아니므로 위치와 크기를 명시해야 잘리지 않는다
const meepleSvg = (side, cls = '') => `<svg class="${cls}" viewBox="-14 -16 28 30" aria-hidden="true"><use href="#s-meeple" x="-14" y="-16" width="28" height="30" fill="url(#g-meeple-${side})" stroke="rgba(0,0,0,.55)" stroke-width="1.1"/></svg>`;
const RES_KEYS = ['food', 'wood', 'stone', 'faith'];
const MIRACLE_ART = { doom: 'm-pillar', lightning: 'm-lightning', rain: 'm-rain', bounty: 'm-bounty', manna: 'm-manna', ark: 'm-ark', tongues: 'm-tongues', pillar: 'm-pillar', revive: 'm-revive' };
// 계시 원문 탐지 정규식 (언어마다 새로 쓰는 kw.* 원본)
const KW_SPEECH = new RegExp(t('kw.ui.speech'));
const KW_PREACH = new RegExp(t('kw.ui.preach'));

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
let challenge = (() => {
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get('seed'));
  if (!(seed > 0)) return null;
  const size = MAP_SIZES[Number(q.get('size'))] ? Number(q.get('size')) : 5;
  const difficulty = DIFFICULTY[q.get('diff')] ? q.get('diff') : 'normal';
  const target = Math.max(0, Number(q.get('target')) || 0);
  return { seed: Math.min(999999, Math.floor(seed)), size, difficulty, target, veteran: q.get('v') !== '0' };
})();
if (challenge) setup = { ...setup, size: challenge.size, difficulty: challenge.difficulty, seed: challenge.seed };
let loadedPhase = null;     // 저장에서 불러온 판이면 그 판의 단계 ('speak' | 'resolved')
let hintTiles = [];         // 계시를 쓰는 동안 말씀이 닿을 것 같은 칸 (석판 해석 예감)
let hintTimer = null;
let acceptLock = 0;         // Enter 연타 방지
let speed = meta.get('gsg.speed', '1'); // 재생 속도 '1' | '2' | 'instant'
fx.motion.speed = speed === '2' ? 2 : 1;
let resolved_rebuttal = null; // 이번 장 지도자의 반박 (율법 카드가 뒤집힌 뒤 말한다)
let speakSnap = null;       // 계시를 내리기 직전의 판 (말을 거두기용)
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
// index.html의 정적 글을 언어팩으로 채운다: data-i18n(글) · -html(마크업) · -title · -aria · -placeholder
function applyStaticText() {
  document.documentElement.lang = lang;
  document.title = t('ui.doc.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('ui.doc.description'));
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
}

async function init() {
  applyStaticText();
  fx.installTips();
  fx.ambient($('ambient'));
  applyA11y();
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
    resume.innerHTML = `${t('ui.main.resume', { n: state.round + (loadedPhase === 'resolved' ? 1 : 0) })} <small>${state.rows}×${state.cols} · ${DIFFICULTY[state.config.difficulty].name}</small> <kbd>Enter</kbd>`;
    $('startGame').className = 'btn-ghost ms-start';
    $('startGame').innerHTML = t('ui.main.newGame');
  } else {
    resume?.remove();
    $('startGame').className = 'btn-primary ms-start';
    $('startGame').innerHTML = challenge ? `${t('ui.main.challengeStart')} <small>${challenge.target ? t('ui.challengeTarget', { n: challenge.target }) : t('ui.seedN', { n: challenge.seed })}</small> <kbd>Enter</kbd>` : `${t('ui.main.newGame')} <kbd>Enter</kbd>`;
  }
  renderMainStatus();
  renderSetup();
  renderMetaLinks();
  renderWelcome();
  ($('resumeGame') ?? $('startGame')).focus({ preventScroll: true });
}

// ---------- 새 게임 설정 ----------
const DIFF_HINT = {
  easy: t('ui.diffHint.easy'),
  normal: t('ui.diffHint.normal'),
  hard: t('ui.diffHint.hard'),
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
  $('optBless').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; meta.set('gsg.blessing', b.dataset.v || null); sfx.click(); renderSetup(); };
  $('optGod').oninput = () => { meta.set('gsg.god', { ...godOf(), name: $('optGod').value.trim().slice(0, 8) }); };
  $('optSigil').innerHTML = Object.entries(SIGILS).map(([k, icon]) => `<button type="button" data-v="${k}" title="${t('ui.sigil', { k })}" aria-label="${t('ui.sigil', { k })}">${svgUse(icon)}</button>`).join('');
  $('optSigil').querySelectorAll('button').forEach((b) => { b.onclick = () => { meta.set('gsg.god', { ...godOf(), sigil: b.dataset.v }); sfx.click(); renderSetup(); }; });
  $('startDaily').onclick = () => startFromMain('daily');
  $('openTrials').onclick = () => { sfx.page(); showTrials(); };
  $('optAsc').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; setup.ascension = Number(b.dataset.v); saveSetup(); sfx.click(); renderSetup(); };
  $('msLibrary').onclick = () => { sfx.page(); showLibrary(); };
  $('msSettings').onclick = () => { sfx.page(); showSettings(); };
  $('msRules').onclick = () => { sfx.page(); showRules(); };
  $('msBible').onclick = () => { sfx.page(); showBible(); };
}

const godOf = () => meta.get('gsg.god', { name: '', sigil: 'light' });
const aweLevel = () => AWE_LEVELS.filter((x) => meta.getAwe().awe >= x).length;
const blessingPick = () => { const b = meta.get('gsg.blessing', null); return b && BLESSINGS[b] && BLESSINGS[b].level <= aweLevel() ? b : null; };
// 새 판에 들고 갈 것: 신의 이름, 지난 판의 유적(서고 최근 세 판에서 하나)
function legacyFor(seed) {
  const past = meta.getHistory().filter((g) => g.revelations?.length).slice(0, 3);
  if (!past.length) return null;
  const g = past[seed % past.length];
  const quote = g.revelations[Math.floor(g.revelations.length / 2)]?.text;
  return quote ? { quote, epithet: g.epithet, god: g.god, doctrine: g.top } : null;
}
const godConfig = () => { const g = godOf(); return g.name || g.sigil !== 'light' ? { name: g.name, sigil: g.sigil } : null; };

function renderSetup() {
  $('optSize').querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === setup.size));
  $('optDiff').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === setup.difficulty));
  $('optSeed').value = setup.seed;
  if (document.activeElement !== $('optGod')) $('optGod').value = godOf().name ?? '';
  $('optSigil').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === (godOf().sigil ?? 'light')));
  const lv = aweLevel();
  $('blessField').hidden = lv === 0;
  const open = Object.entries(BLESSINGS).filter(([, b]) => b.level <= lv);
  $('optBless').innerHTML = `<button type="button" data-v="" class="${blessingPick() ? '' : 'on'}">${t('ui.bless.none')}</button>${open.map(([k, b]) => `<button type="button" data-v="${k}" class="${blessingPick() === k ? 'on' : ''}" title="${esc(b.text)}">${esc(t('ui.bless.short', { name: b.name }))}</button>`).join('')}`;
  $('blessHint').textContent = blessingPick() ? BLESSINGS[blessingPick()].text : t('ui.bless.hintNone');
  const awe = meta.getAwe().awe;
  const next = AWE_LEVELS.find((x) => x > awe);
  $('msAwe').hidden = awe === 0;
  $('msAwe').innerHTML = `<b>${AWE_TITLES[lv]}</b> · ${t('ui.awe.line', { awe, left: next ? next - awe : null, blessing: next ? Object.values(BLESSINGS).some((b) => b.level === lv + 1) : false })}<i style="width:${next ? Math.round(((awe - (AWE_LEVELS[lv - 1] ?? 0)) / (next - (AWE_LEVELS[lv - 1] ?? 0))) * 100) : 100}%"></i>`;
  const ascOpen = meta.ascensionOpen();
  $('optAsc').hidden = setup.difficulty !== 'hard' || ascOpen === 0;
  if (setup.difficulty !== 'hard') setup.ascension = 0;
  setup.ascension = Math.min(setup.ascension ?? 0, ascOpen);
  $('optAsc').innerHTML = Array.from({ length: ascOpen + 1 }, (_, i) => `<button type="button" data-v="${i}" class="${(setup.ascension ?? 0) === i ? 'on' : ''}">${i ? t('ui.asc.n', { n: i }) : t('ui.asc.base')}</button>`).join('');
  $('diffHint').textContent = setup.ascension ? t('ui.asc.hint', { n: setup.ascension, list: ASCENSION.slice(0, setup.ascension).join(' · ') }) : DIFF_HINT[setup.difficulty];
  // 미리보기: 같은 설정으로 맵을 만들어 전부 드러낸다
  const preview = createState({ ...setup, mode: 'standard' });
  for (const tl of preview.tiles) tl.revealed = true;
  renderBoard($('mapPreview'), preview, {});
  const st = {};
  for (const tl of preview.tiles) st[tl.terrain] = (st[tl.terrain] ?? 0) + 1;
  const best = meta.getBest({ ...setup, unlock: Math.min(MODULES, meta.getHistory().length) });
  $('mapHint').textContent = t('ui.mapHint', { size: setup.size, rounds: MAP_SIZES[setup.size].rounds, desert: st.desert ?? 0, hill: st.hill ?? 0, best });
}

function renderMainStatus() {
  const [cls, text] = aiMode === 'llm'
    ? aiState === 'available' || aiState === 'readily-available'
      ? ['', t('ui.status.ready')]
      : ['warn', t('ui.status.download')]
    : ['off', aiUsable ? t('ui.status.tablet') : t('ui.status.noAI')];
  $('msStatus').innerHTML = `<span class="dot ${cls}"></span><span>${text}</span>`;
  $('msMusic').textContent = musicOn() ? t('ui.ms.musicOn') : t('ui.ms.musicOff');
  $('msSound').textContent = soundOn() ? t('ui.ms.soundOn') : t('ui.ms.soundOff');
  $('msMotion').textContent = fx.motion.reduced ? t('ui.ms.motionLow') : t('ui.ms.motionFull');
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
    else if (mode === 'daily') beginGame({ ...meta.dailyConfig(), veteran: true, god: godConfig() });
    else if (challenge && mode === 'new') {
      const ch = challenge;
      // 도전은 한 번만: 주소창의 도전 파라미터를 지우고 원래 설정으로 돌아간다
      challenge = null;
      try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])(seed|size|diff|target|v)=[^&]*/g, '$1').replace(/[?&]+$/, '').replace(/\?&+/, '?')); } catch { /* 무시 */ }
      setup = loadSetup();
      beginGame({ mode: 'standard', size: ch.size, difficulty: ch.difficulty, seed: ch.seed, veteran: ch.veteran, canon: null, challenge: { target: ch.target } });
    }
    else beginGame({ ...setup, mode: 'standard', veteran, unlock: Math.min(MODULES, meta.getHistory().length), canon: veteran ? meta.getCanon()[0] ?? null : null, god: godConfig(), legacy: veteran ? legacyFor(setup.seed) : null, blessing: (setup.ascension ?? 0) >= 5 ? null : blessingPick(), ascension: setup.difficulty === 'hard' ? setup.ascension ?? 0 : 0 });
  }, fx.motion.reduced ? 150 : 850);
}

// 저장에서 불러온 판을 이어 간다
async function resumeLoaded() {
  const at = loadedPhase;
  loadedPhase = null;
  resolved = null;
  renderSubtitle();
  music.start();
  if (at === 'resolved') {
    // 해결 뒤에 저장된 판: 풀리지 않은 유목민 선택이 있으면 먼저 묻는다
    if (state.pendingSite) { phase = 'speak'; pending = null; render(); await showSiteChoice(); }
    newRound();
    return;
  }
  phase = 'speak';
  pending = null;
  dealSeason = true;
  music.setMood('calm');
  render();
  fx.chapter(frameEl(), t('ui.roundTitle', { n: state.round }), t('ui.resumeSub'));
  meta.markSeen('events', state.event.id);
  if (state.miracleOffer) setTimeout(showMiracleDraft, fx.motion.reduced ? 300 : 2500);
  if (state.destinyOffer && state.round === 1) setTimeout(showDestinyChoice, fx.motion.reduced ? 300 : 2500);
}

function beginGame(config) {
  loadedPhase = null;
  setTimeout(() => showUnlockNote(), 400);
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
  if (state.config.trial) { $('subtitle').textContent = t('ui.sub.trial', { name: TRIALS[state.config.trial].name, rows: state.rows, cols: state.cols, n: state.maxRounds }); return; }
  if (state.config.challenge) { $('subtitle').textContent = t('ui.sub.challenge', { rows: state.rows, cols: state.cols, diff: DIFFICULTY[state.config.difficulty].name, seed: state.config.seed, target: state.config.challenge.target }); return; }
  if (state.config.daily) { $('subtitle').textContent = t('ui.sub.daily', { day: state.config.daily, leader: state.leader ? ENEMY_LEADERS[state.leader].name : null }); return; }
  $('subtitle').textContent = state.tutorial ? t('ui.sub.tutorial')
    : t('ui.sub.standard', { rows: state.rows, cols: state.cols, diff: DIFFICULTY[state.config.difficulty].name, judge: state.judgement !== 'classic' ? JUDGEMENTS[state.judgement].name : null });
  // 전체 정보는 툴팁으로 (지도자 이름은 율법파 판에 이미 있다)
  $('subtitle').title = state.tutorial ? '' : t('ui.sub.tip', { rows: state.rows, cols: state.cols, diff: DIFFICULTY[state.config.difficulty].name, seed: state.config.seed, leader: state.leader ? ENEMY_LEADERS[state.leader].name : null });
}

function suggestRevelation(text) {
  const ta = document.querySelector('.scroll textarea');
  if (!ta) return;
  ta.value = text.slice(0, revMax());
  ta.dispatchEvent(new Event('input'));
  ta.focus();
}

function endTutorial({ skipped }) {
  if (!skipped) meta.unlockAchievements(['tutorial']);
  const title = skipped ? t('ui.tut.skippedTitle') : t('ui.tut.doneTitle');
  const sub = skipped ? t('ui.tut.skippedSub') : state.winReason;
  fx.endScreen(true, title, sub, () => showMain(), { againLabel: t('ui.tut.toGame'), closeLabel: t('ui.viewBoard') });
}

function bindMain() {
  $('startGame').onclick = () => startFromMain('new');
  $('msSound').onclick = () => { setSound(!soundOn()); renderMainStatus(); renderTools(); sfx.click(); };
  $('msMusic').onclick = () => { setMusic(!musicOn()); renderMainStatus(); renderTools(); sfx.click(); };
  $('msMotion').onclick = () => { fx.setReduced(!fx.motion.reduced); renderMainStatus(); renderTools(); sfx.click(); };
  addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('mainScreen').hidden && !document.querySelector('.choice-modal') && !e.target.closest?.('button, input, textarea, select')) {
      e.preventDefault();
      startFromMain($('resumeGame') ? 'resume' : 'new');
    }
    // 목록 모달(규칙서·설정·서고…)은 Esc로 닫는다 — 그 아래로 메인 화면을 열지 않는다
    const listM = document.querySelector('.list-modal');
    if (e.key === 'Escape' && listM) { e.preventDefault(); (listM.querySelector('.list-head button') ?? listM.querySelector('button'))?.click(); return; }
    if (e.key === 'Escape' && document.getElementById('chronicle')?.classList.contains('open')) { e.preventDefault(); $('closeChron')?.click(); return; }
    if (e.key === 'Escape' && targeting?.move) { e.preventDefault(); targeting = null; notice = ''; renderBoardView(); renderAltar(); return; }
    if (e.key === 'Escape' && phase === 'confirm' && document.querySelector('#altar .retract') && !document.querySelector('.choice-modal')) { e.preventDefault(); retract(); return; }
    if (e.key === 'Escape' && $('mainScreen').hidden && phase !== 'thinking' && phase !== 'playing' && !document.querySelector('.choice-modal:not(.list-modal)')) showMain();
  });
  addEventListener('keydown', onKey);
}

function bindTileTips() {
  const tip = $('tileTip');
  const board = $('board');
  board.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
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
  board.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') tip.classList.remove('show'); });
  // 터치: 길게 누르면 칸 설명, 다음 탭에 닫힌다 (짧은 탭은 그대로 칸 누르기)
  let press = null;
  let swallow = false;
  board.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    swallow = false;
    tip.classList.remove('show');
    const g = e.target.closest?.('.tile');
    if (!g) return;
    const x0 = e.clientX; const y0 = e.clientY;
    press = setTimeout(() => {
      const cur = V();
      tip.innerHTML = tileTipHTML(cur, cur.tileAt[g.dataset.id]);
      tip.classList.add('show');
      tip.style.left = `${Math.max(8, Math.min(x0 - tip.offsetWidth / 2, innerWidth - tip.offsetWidth - 8))}px`;
      tip.style.top = `${Math.max(8, y0 - tip.offsetHeight - 24)}px`;
      swallow = true;
    }, 450);
    const move = (ev) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) end(); };
    const end = () => { clearTimeout(press); press = null; board.removeEventListener('pointermove', move); board.removeEventListener('pointerup', end); board.removeEventListener('pointercancel', end); };
    board.addEventListener('pointermove', move);
    board.addEventListener('pointerup', end);
    board.addEventListener('pointercancel', end);
  });
  board.addEventListener('click', (e) => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } }, true);
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !e.target.closest?.('#board')) tip.classList.remove('show'); });
  board.addEventListener('contextmenu', (e) => e.preventDefault());
}

function tileTipHTML(cur, tile) {
  if (!tile.revealed) return `<b>${t('ui.tip.fogTitle', { id: tile.id })}</b><span>${t('ui.tip.fogBody')}</span>`;
  const terr = TERRAIN[tile.terrain];
  const owner = tile.owner === 'player' ? t('ui.tip.ownPlayer') : tile.owner === 'enemy' ? t('ui.tip.ownEnemy') : t('ui.tip.ownNone');
  const bld = tile.building === 'capital' ? (tile.owner === 'player' ? t('ui.tip.temple') : t('ui.tip.tower')) : tile.building === 'village' ? t('ui.tip.village') : '';
  const y = yieldOf(tile);
  const gather = tile.building === 'capital' ? '' : y.gather ? t('ui.tip.gather', { feature: tile.feature ? FEATURES[tile.feature].name : null, res: RESOURCE_NAME[y.gather], n: y.amount }) : t('ui.tip.barren');
  const legend = cur.legends?.[tile.id] ? t('ui.tip.legend', { name: cur.legends[tile.id].name, quote: cur.legends[tile.id].quote, round: cur.legends[tile.id].round }) : '';
  const holy = tile.id === state.holyId ? t('ui.tip.holy', { edict: state.edictOn }) : '';
  const marks = tile.faithMarks ? t('ui.tip.marks', { n: tile.faithMarks.n, side: tile.faithMarks.side }) : '';
  const intent = ['speak', 'thinking', 'confirm'].includes(phase) ? enemyIntent(state).find((a) => a.shown && a.tile === tile.id) : null;
  const threat = intent ? t('ui.tip.threat', { what: enemyLabel(intent, 'what'), first: state.first }) : '';
  const cath = tile.building === 'capital' && tile.owner === 'player' && cur.sides.player.cathedral ? t('ui.tip.cathedral', { n: cur.sides.player.cathedral }) : '';
  return `<b>${esc(tileName(cur, tile, 'player'))}</b><span>${[legend, owner, bld, gather, tile.wall ? t('ui.tip.wall') : '', holy, cath, marks, threat].filter(Boolean).map(esc).join('<br>')}</span>`;
}

function bindTools() {
  bindMain();
  bindTileTips();
  $('settings').onclick = () => { sfx.click(); showSettings(); };
  $('rules').onclick = () => { sfx.page(); showRules(); };
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
  speakSnap = null;
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
  announce(t('ui.announce.round', { n: state.round, event: state.event.name }));
  if (!state.tutorial) { meta.markSeen('events', state.event.id); if (state.leader) meta.markSeen('leaders', state.leader); }
  if (state.miracleOffer) setTimeout(showMiracleDraft, fx.motion.reduced ? 300 : 2500);
  const judge = state.judgement !== 'classic' ? JUDGEMENTS[state.judgement].name : null;
  const hasFest = !state.tutorial && (state.round === state.maxRounds || !!actStart(state));
  const fest = !hasFest ? null : state.round === state.maxRounds ? FESTIVALS.last : FESTIVALS[actOf(state)];
  const last = !state.tutorial && state.round === state.maxRounds;
  const hasAct = !state.tutorial && !last && (state.round === 1 || !!actStart(state));
  const act = hasAct ? ACTS[actOf(state) - 1].name : null;
  fx.chapter(frameEl(), t('ui.chapter.title', { n: state.round, month: state.tutorial ? null : monthOf(state) }), t('ui.chapter.sub', { first: state.round === 1, hasFest, fest, last, hasAct, act, event: state.event.name, judge }));
  if (state.event.id === 'mira') setTimeout(() => leaderSay(t('ui.miraSay', { quote: state.miraQuote })), fx.motion.reduced ? 300 : 2500);
  if (actStart(state) && unlocked(state, 3) && ACTS[actOf(state) - 1].text) setTimeout(() => leaderSay(ACTS[actOf(state) - 1].text), fx.motion.reduced ? 300 : 2600);
  if (state.round === 1 && state.destinyOffer) setTimeout(showDestinyChoice, fx.motion.reduced ? 400 : 2600);
  if (state.round === 1 && state.leader) setTimeout(() => leaderSay(leaderLine(state, 'intro')), fx.motion.reduced ? 300 : 2400);
  else if (state.reacted && REACT[state.reacted]) setTimeout(() => leaderSay(REACT[state.reacted].line), fx.motion.reduced ? 300 : 2400);
  // 대사제의 성향이 열린 판이면 첫 장에 사제가 자기 버릇을 말한다 (뜻을 헤아리는 손이 달라진다)
  if (state.round === 1 && state.priest && state.priest !== 'loyal') setTimeout(() => priestSay(t('ui.priestIntro', { trait: PRIESTS[state.priest].trait })), fx.motion.reduced ? 500 : 3600);
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
  if (text.length > revMax()) { notice = t('ui.notice.tooLong', { n: revMax() }); renderAltar(); rejectFx(); return; }
  // 말줄임만 있는 계시는 침묵이다 (대사제를 부르지 않는다)
  if (!KW_SPEECH.test(text)) { silence(); return; }
  const cost = revelationCostFor(state, text);
  const p = state.sides.player;
  if (p.faith < cost) { notice = t('ui.notice.noFaith', { cost, have: p.faith }); sfx.fail(); renderAltar(); rejectFx(); return; }
  speakSnap = { state: JSON.stringify(serializeState(state)), text, cost, spoken: spokenOf(state, text) };
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

// 안 되는 입력: 인장이 튕기고 비용 알약이 붉게 번쩍인다
function rejectFx() {
  for (const sel of ['.seal-btn', '.cost-pill']) {
    const el = document.querySelector(`#altar ${sel}`);
    if (!el) continue;
    el.classList.remove('reject'); void el.offsetWidth; el.classList.add('reject');
  }
}

function lockAltar() { document.querySelectorAll('#altar button, #altar textarea').forEach((b) => { b.disabled = true; }); }

// 해석만 한다 (화면은 건드리지 않는다). 실패하면 석판으로 대신한다
async function runInterpretation(text) {
  if (aiMode === 'llm') {
    try {
      await prepareLLM((p) => { progress = p; if (phase === 'thinking') renderAltar(); });
      progress = null;
      // 모델이 멈추면 해석 화면에 갇히지 않게 30초 뒤 석판으로 넘긴다 (모델 내려받기는 위에서 끝난 뒤)
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 30000);
      try { return { result: await interpretWithLLM(state, text, ctl.signal) }; } finally { clearTimeout(timer); }
    } catch (e) {
      return { result: interpretWithTablet(state, text), notice: t('ui.notice.llmFailed', { err: e.name }) };
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
  if (aiMode === 'llm' && document.querySelector('.omen-reel')) sfx.coin(4);
  notice = done.notice ?? '';
  pending = {
    text, result, fresh: true, naming, dropped: new Set(),
    tone: detectTone(text),
    prophecy: state.prophecy ? null : parseProphecy(text), seal: false,
  };
  derivePending();
  await enterConfirm();
}

// 확인 화면의 파생값: 뺀 칩을 제외하고 다시 검증하고, 연결·청원을 다시 계산한다
function derivePending() {
  const { text, result } = pending;
  const forbiddenKeys = result.forbidden.map((a) => a.key);
  const orders = result.orders.filter((a) => !pending.dropped.has(a.key));
  const { accepted, rejected } = validateOrders(state, 'player', orders, forbiddenKeys, result.doctrine);
  pending.accepted = accepted;
  pending.rejected = rejected;
  pending.auto = autoFill(state, 'player', accepted, [...forbiddenKeys, ...pending.dropped], result.doctrine);
  pending.links = text ? linkWords(state, text, accepted) : {};
  pending.answered = text ? petitionAnswered(state, text, accepted) : false;
  pending.dilemma = text ? dilemmaByText(state, text) : null;
  pending.miracle = text ? spokenMiracle(text) : null;
  pending.command = text && canCarve(state) ? parseCommandment(text, COMMANDMENTS) : null;
  if (pending.command && !carvable(state, pending.command)) pending.command = null;
  if (pending.command && state.commandments.includes(pending.command)) pending.command = null;
}

// 말한 대로 내리는 기적: 손에 있고, 이번 장에 아직 안 썼고, 신앙이 되면
function spokenMiracle(text) {
  const id = parseMiracle(text, state.miracleHand);
  if (!id || state.miracleUsed) return null;
  const m = MIRACLES.find((x) => x.id === id);
  const cost = miracleCost(state, m);
  if (state.sides.player.faith < cost) return null;
  let target = null;
  if (id === 'lightning') {
    const home = capitalOf(state, 'player');
    const named = Object.entries(state.names).find(([tid, n]) => text.includes(n) && state.tileAt[tid].owner === 'enemy');
    const enemies = state.tiles.filter((t) => t.owner === 'enemy' && t.revealed).sort((a, b) => (a.building === 'village' ? 0 : 1) - (b.building === 'village' ? 0 : 1) || distance(a, home) - distance(b, home));
    // "번개로 적의 수도를"이면 율법파 수도를 친다
    const cap = capitalOf(state, 'enemy');
    const atCap = cap?.revealed && new RegExp(t('kw.place.capital')).test(text) && !new RegExp(t('kw.place.ours')).test(text) ? cap.id : null;
    target = named?.[0] ?? atCap ?? enemies[0]?.id ?? null;
    if (!target) return null;
  }
  return { id, target, cost, key: `miracle:${id}` };
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
  draft = '';
  // 고요 속에 신도들은 먼저 기도한다
  const pray = legalActions(state, 'player').find((a) => a.type === 'pray');
  const auto = pray ? [{ ...pray, auto: true }, ...autoFill(state, 'player', [pray])] : autoFill(state, 'player', []);
  pending = {
    text: null,
    result: { interpretation: state.silentRun >= 1 ? t('ui.silence.again') : t('ui.silence.first'), orders: [], forbidden: [], doctrine: null, source: 'silence' },
    accepted: [], rejected: [], auto, fresh: true, dropped: new Set(), links: {},
  };
  enterConfirm();
}

async function reinterpret() {
  const p = state.sides.player;
  if (state.reinterpretUsed || p.faith < 1 || !pending?.text) return;
  p.faith -= 1;
  state.reinterpretUsed = true;
  const before = pending;
  await interpret(pending.text);
  // 두 갈래: 이전 해석도 남겨 두고 고를 수 있게
  before.prev = null;
  pending.prev = before;
  renderAltar();
}

// 이전 해석과 지금 해석을 바꾼다
function swapReading() {
  if (!pending?.prev || pending.incoming) return;
  const other = pending.prev;
  pending.prev = null;
  other.prev = pending;
  other.fresh = false;
  pending = other;
  derivePending();
  sfx.page();
  renderBoardView();
  renderAltar();
}

// 말을 거두기: 계시 전으로 돌아가 원문을 고친다. 다시 해석과 같은 장당 한 번, 순비용 신앙 1 (첫 판은 무료)
function retract() {
  if (phase !== 'confirm' || !speakSnap || state.reinterpretUsed || pending?.incoming) return;
  const snap = speakSnap;
  speakSnap = null;
  const text = snap.text;
  state = hydrateState(JSON.parse(snap.state));
  state.reinterpretUsed = true;
  if (state.config.veteran) state.sides.player.faith = Math.max(0, state.sides.player.faith - 1);
  pending = null;
  phase = 'speak';
  draft = text;
  notice = state.config.veteran ? t('ui.notice.retractPaid') : t('ui.notice.retractFree');
  sfx.page();
  render();
}

async function accept() {
  lockAltar();
  targeting = null;
  const { text, result, accepted, auto } = pending;
  tutorial?.hide();
  if (text) {
    state.log.push({ round: state.round, side: 'god', text: t('ui.log.godSaid', { text }) });
    state.log.push({ round: state.round, side: 'priest', text: result.interpretation });
  }
  const before = snapshot(state);
  const enemyPlan = planEnemy(state);
  const from = state.log.length;
  // 말한 기적을 먼저 (말투·갈림길 비용에 밀려 실패하지 않게)
  if (pending.miracle && !pending.dropped.has(pending.miracle.key)) {
    const r = castMiracle(state, pending.miracle.id, pending.miracle.target);
    if (!r.ok) state.log.push({ round: state.round, side: 'player', text: t('ui.log.miracleFailed', { why: r.text }) });
  }
  applyTone(state, text ? pending.tone : null);
  if (!text) state.streak = null;
  // 갈림길: 비용은 먼저 치르고 결과는 유지 단계 전에 (엔진)
  const pick = state.event.choice ? pending.dilemma ?? state.dilemmaPick ?? state.event.choice[0].id : null;
  if (pick) payDilemma(state, pick);
  let plan = [...accepted, ...auto];
  if (pending.command && pending.carve && carveCommandment(state, pending.command)) {
    // 새긴 계명은 이번 장부터 지킨다. 빠진 자리는 신도들이 알아서 채운다
    const banned = { noSword: 'attack', noExpand: 'village' }[pending.command];
    const kept = accepted.filter((a) => !banned || (a.type !== banned && a.build !== banned));
    const fk = [...result.forbidden.map((a) => a.key), ...pending.dropped];
    plan = [...kept, ...autoFill(state, 'player', kept, fk, result.doctrine)];
  }
  const ordered = plan.filter((a) => !a.auto);
  if (text) findSacred(state, text);
  if (pending.seal && pending.prophecy) sealProphecy(state, pending.prophecy);
  resolveRound(state, plan, enemyPlan);
  if (!state.winner) applySilence(state, !!text);
  if (!state.winner && text) markLegends(state, text, result.doctrine, ordered, state.log.slice(from));
  if (!state.winner && text) keepVows(state, result.forbidden, plan);
  if (!state.winner) wordsAfter(pending);
  // 교리는 해결이 끝난 뒤에 오른다: 확인 화면에 보인 수치 그대로 해결되도록
  if (text) recordRevelation(state, text, result.doctrine, pending.tone === 'metaphor' ? 1 : 0, speakSnap?.spoken ?? spokenOf(state, text));
  if (pending.naming?.first && state.sides.player.doctrine.wisdom < RULES.graceDoctrineBelow) state.sides.player.doctrine.wisdom += 1;
  // 신학 노트: LLM이 석판 규칙에 없는 말버릇을 행동으로 읽었으면 배운다
  const lesson = text && result.source === 'llm' ? extractLesson(state, text, accepted) : null;
  if (lesson) { state.lessons.push(lesson); if (state.lessons.length > 3) state.lessons.shift(); pendingLesson = lesson; }
  const last = state.history.at(-1);
  if (last) last.text = text;
  resolved = { enemyPlan, playerPlan: plan, logs: state.log.slice(from), shown: [], words: pending };
  if (!state.tutorial) {
    meta.markSeen('laws', state.lawCard.id);
    for (const c of state.commandments) meta.markSeen('commandments', c);
    for (const t of state.tiles) if (t.site?.found) meta.markSeen('sites', t.site.id);
    if (pending.miracle && !pending.dropped.has(pending.miracle.key)) meta.markSeen('miracles', pending.miracle.id);
    if (text) {
      for (const a of ordered) meta.noteWords(a.type === 'gather' ? `gather:${a.gather}` : a.type === 'build' ? `build:${a.build}` : a.type, text);
      if (pending.tone !== 'command') meta.noteWords(`tone:${pending.tone}`, text);
    }
  }
  // 지도자의 반박은 연대기에만 남는다 (재생할 보드 장면이 없다)
  if (text && state.leader) {
    const line = leaderLine(state, 'rebuttal', { doctrine: result.doctrine, word: nouns(text)[0] });
    if (line) { state.log.push({ round: state.round, side: 'leader', text: t('ui.log.leaderSaid', { name: ENEMY_LEADERS[state.leader].name, line }) }); resolved_rebuttal = line; }
  }
  await playback(before);
}

// 해결 뒤: 청원 응답·이름 붙이기의 은총, 외면당한 청원 (로그에 남아 재생된다)
function wordsAfter(pd) {
  const pt = state.petition;
  if (pt?.need) {
    if (pd.answered) { state.stats.petitions += 1; state.petitionIgnored = 0; grantGrace(state, 1, t('ui.grace.petition', { from: pt.from })); }
    else if (!state.tutorial && ++state.petitionIgnored >= 2) {
      state.petitionIgnored = 0;
      state.sides.player.faith = Math.max(0, state.sides.player.faith - 1);
      state.log.push({ round: state.round, side: 'player', text: t('ui.log.petitionIgnored'), fx: { kind: 'warn' }, snap: snapshot(state) });
    }
  }
  if (pd.naming) grantGrace(state, 1, t('ui.grace.naming', { place: TERRAIN_NAME(pd.naming.tile), name: pd.naming.name }));
}
const TERRAIN_NAME = (id) => { const tl = state.tileAt[id]; return tl.building === 'village' ? t('ui.terrain.village') : tl.building === 'capital' ? t('ui.terrain.temple') : TERRAIN[tl.terrain]?.name ?? t('ui.terrain.land'); };

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
  if (state.config.trial) { summary.stars = trialStars(summary); summary.newStars = meta.recordTrial(state.config.trial, summary.stars); }
  if (state.winner === 'player' && state.config.difficulty === 'hard' && !state.config.trial && !state.config.daily && !state.config.challenge) meta.openAscension((state.config.ascension ?? 0) + 1);
  const aweGain = summary.score[0] + (state.winner === 'player' ? 10 : 0) + fresh.length * 3;
  summary.awe = meta.addAwe(aweGain, AWE_LEVELS);
  const standard = !state.tutorial && !state.config.daily && !state.config.challenge && !state.config.trial && state.config.veteran;
  summary.newBest = standard && state.winner === 'player' && meta.setBest(state.config, summary.score[0]);
  checkOnboard(true);
  showEnd(summary, fresh, had);
}

function showEnd(summary, fresh, had) {
  const won = state.winner === 'player';
  const title = state.winner === 'draw' ? t('ui.result.draw') : won ? t('ui.result.win') : t('ui.result.lose');
  const ch = state.config.challenge;
  const chText = ch ? (ch.target ? (won && summary.score[0] > ch.target ? t('ui.end.chWin', { s: summary.score[0], target: ch.target }) : t('ui.end.chLose', { s: summary.score[0], target: ch.target })) : '') : '';
  const sub = t('ui.end.sub', { reason: t('ui.reasonShort', { reason: state.winReason }), a: summary.score[0], b: summary.score[1], ch: chText });
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
    <div class="end-tabs" role="tablist"><button class="on" data-tab="story">${t('ui.end.tabStory')}</button><button data-tab="record">${t('ui.end.tabRecord')}</button><button data-tab="book">${t('ui.end.tabBook')}</button></div>
    <div class="end-page" data-page="story">
      <div class="ep-title">${esc(ep.title)}</div>
      <p class="ep-body">${esc(ep.body)}</p>
      ${ep.quote ? `<p class="ep-quote">${esc(ep.quote)}</p>` : ''}
      <div class="ep-epithet">${t('ui.end.remembered', { god: state.config.god?.name ? esc(state.config.god.name) : null, epithet: esc(ep.epithet) })}</div>
      ${fresh.length ? `<div class="ep-ach">${t('ui.end.newVerses', { names: fresh.map((id) => esc(achName(id))) })}</div>` : ''}
      ${summary.awe ? `<div class="ep-ach awe">${t('ui.end.awe', { gained: summary.awe.gained, awe: summary.awe.awe, levelUp: summary.awe.level > summary.awe.levelBefore, title: AWE_TITLES[summary.awe.level], blessing: Object.values(BLESSINGS).find((b) => b.level === summary.awe.level) ? esc(Object.values(BLESSINGS).find((b) => b.level === summary.awe.level).name) : null })}</div>` : ''}
      ${state.config.trial ? `<div class="ep-ach">${t('ui.end.trial', { name: esc(TRIALS[state.config.trial].name), stars: `${'★'.repeat(summary.stars)}${'☆'.repeat(3 - summary.stars)}`, newStars: summary.newStars })}</div>` : ''}
      ${summary.newBest ? `<div class="ep-ach best">${t('ui.end.newBest', { seed: state.config.seed, score: summary.score[0] })}</div>` : ''}
    </div>
    <div class="end-page" data-page="record" hidden>
      ${graph}
      ${scene ? `<p class="rec-line"><b>${t('ui.rec.scene')}</b> ${t('ui.rec.sceneBody', { n: scene.round, rev: scene.revelation ? esc(scene.revelation) : null, text: esc(scene.text) })}</p>` : ''}
      ${top.length ? `<div class="rec-top"><b>${t('ui.rec.top')}</b>${top.map((r) => `<span>${t('ui.rec.topItem', { n: r.round, text: esc(r.text) })} <i>${r.gain >= 0 ? '+' : ''}${r.gain}</i></span>`).join('')}</div>` : ''}
      <p class="rec-line"><b>${t('ui.rec.luck')}</b> ${t('ui.rec.luckBody', { n: luck.n, d: luck.n ? `${luck.luck >= 0 ? '+' : ''}${luck.luck.toFixed(1)}` : null })}</p>
      ${near ? `<p class="rec-line"><b>${t('ui.rec.near')}</b> ${t('ui.rec.nearBody', { name: esc(near.a.name), desc: esc(near.a.desc), p: Math.round(near.p * 100) })}</p>` : ''}
    </div>
    <div class="end-page" data-page="book" hidden>
      ${canCanon ? `<p class="book-help">${t('ui.book.canonHelp')}</p>` : `<p class="book-help">${t('ui.book.canonLater')}</p>`}
      ${Object.keys(state.legends ?? {}).length ? `<p class="book-help">${t('ui.book.legends', { names: Object.values(state.legends).map((l) => esc(l.name)) })}</p>` : ''}
      ${state.fallen?.length ? `<p class="book-help">${t('ui.book.fallen', { names: state.fallen.map(esc) })}</p>` : ''}
      <ol class="book">${state.revelations.map((r) => `<li><span class="bk-r">${t('ui.roundTitle', { n: r.round })}</span><span class="bk-t">${t('ui.quoted', { text: esc(r.text) })}</span><span class="bk-d">${esc(doctrineName(r.doctrine))}</span>
        ${canCanon ? `<button class="text-btn canon" data-text="${esc(r.text)}" data-doc="${r.doctrine ?? 'wisdom'}" type="button">${canon.some((c) => c.text === r.text) ? t('ui.canon.done') : t('ui.canon.do')}</button>` : ''}</li>`).join('') || `<li>${t('ui.book.empty')}</li>`}</ol>
    </div>`;
  const o = fx.endScreen(won, title, sub, restart, {
    bodyHTML: body,
    buttons: [
      { label: t('ui.end.psalm'), title: t('ui.end.psalmTip'), cls: 'btn-ghost psalm', keep: true, onClick: () => copyPsalm(summary) },
      { label: t('ui.end.again'), title: t('ui.end.againTip'), cls: 'btn-primary', onClick: restart },
      { label: t('ui.end.newMap'), title: t('ui.end.newMapTip'), onClick: () => { setup.seed = randomSeed(); saveSetup(); const asc = setup.difficulty === 'hard' ? Math.min(setup.ascension ?? 0, meta.ascensionOpen()) : 0; beginGame({ ...setup, ascension: asc, mode: 'standard', veteran: true, unlock: Math.min(MODULES, meta.getHistory().length), canon: meta.getCanon()[0] ?? null, god: godConfig(), legacy: legacyFor(setup.seed), blessing: asc >= 5 ? null : blessingPick() }); } },
      { label: t('ui.end.main'), onClick: () => showMain() },
      { label: t('ui.viewBoard'), title: t('ui.end.viewBoardTip') },
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
    b.onclick = () => { meta.addCanon({ text: b.dataset.text, doctrine: b.dataset.doc }); sfx.seal(); host.querySelectorAll('.canon').forEach((x) => { x.textContent = meta.getCanon().some((c) => c.text === x.dataset.text) ? t('ui.canon.done') : t('ui.canon.do'); }); };
  });
  return o;
}

// 시편 카드: 결정적 장면의 계시·대사제의 외침·결과·도전 링크를 텍스트로 복사한다
async function copyPsalm(summary) {
  const scene = decisiveScene(state);
  const round = scene?.round ?? state.revelations.at(-1)?.round;
  const rev = state.revelations.find((r) => r.round === round)?.text;
  const cry = state.log.find((l) => l.round === round && l.side === 'priest')?.text;
  const url = `${location.origin}${location.pathname}?seed=${state.config.seed}&size=${state.rows}&diff=${state.config.difficulty}&target=${summary.score[0]}&v=${state.config.veteran ? 1 : 0}`;
  const won = state.winner === 'player' ? t('ui.result.win') : state.winner === 'draw' ? t('ui.result.draw') : t('ui.result.lose');
  const text = [
    t('ui.psalm.head', { n: round }),
    rev ? t('ui.psalm.god', { text: rev }) : null,
    cry ? t('ui.psalm.priest', { text: cry }) : null,
    scene ? `→ ${scene.text}` : null,
    t('ui.psalm.result', { won, reason: t('ui.reasonShort', { reason: state.winReason }), a: summary.score[0], b: summary.score[1], rows: state.rows, cols: state.cols, diff: DIFFICULTY[state.config.difficulty].name }),
    t('ui.end.remembered', { god: state.config.god?.name ? state.config.god.name : null, epithet: summary.epithet }),
    t('ui.psalm.link', { url }),
  ].filter(Boolean).join('\n');
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.append(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch { /* 무시 */ }
    ta.remove();
  }
  const b = document.querySelector('.end-actions .psalm');
  if (b) { b.textContent = ok ? t('ui.psalm.copied') : t('ui.psalm.copyFailed'); setTimeout(() => { b.textContent = t('ui.end.psalm'); }, 1800); }
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
    <text x="${W - P}" y="${y(h.at(-1).ps) - 8}" class="g-lbl p">${t('ui.graph.player', { n: h.at(-1).ps })}</text><text x="${W - P}" y="${y(h.at(-1).es) + 16}" class="g-lbl e">${t('ui.graph.enemy', { n: h.at(-1).es })}</text></svg>`;
}

// ---------- 메인 화면: 서고·성서·오늘의 계시 ----------
function renderMetaLinks() {
  const n = meta.getHistory().length;
  $('msLibrary').hidden = n === 0;
  $('msBible').hidden = n === 0 && !Object.keys(meta.getAchievements()).length;
  $('startDaily').hidden = n === 0;
  $('openTrials').hidden = n === 0;
  const tr = meta.getTrials();
  $('trialHint').textContent = t('ui.trials.hint', { got: Object.values(tr).reduce((a, b) => a + b, 0), total: Object.keys(TRIALS).length * 3, name: TRIALS[Object.keys(TRIALS)[meta.weeklyIndex(Object.keys(TRIALS).length)]].name });
  const today = meta.dayKey();
  const done = meta.getDaily()[today];
  $('dailyHint').textContent = done ? t('ui.daily.done', { won: done.winner === 'player', days: meta.dailyDaysThisMonth() }) : t('ui.daily.today', { month: Number(today.slice(5, 7)), day: Number(today.slice(8)), days: meta.dailyDaysThisMonth() });
  $('msLibrary').textContent = t('ui.ms.library', { n });
  $('msBible').textContent = t('ui.ms.bible', { a: Object.keys(meta.getAchievements()).length, b: ACHIEVEMENTS.length });
}

// 오랜만에 돌아오면 지난 판을 한 줄로
function renderWelcome() {
  const last = meta.get('gsg.lastVisit', 0);
  meta.set('gsg.lastVisit', Date.now());
  document.querySelector('.ms-welcome')?.remove();
  const g = meta.getHistory()[0];
  if (!g || !last || Date.now() - last < 3 * 86400000) return;
  const el = document.createElement('div');
  el.className = 'ms-welcome';
  el.textContent = t('ui.welcome', { size: g.size, won: g.winner === 'player', rounds: g.rounds, a: g.score[0], b: g.score[1], epithet: g.epithet, resume: !!loadedPhase });
  $('msAwe').before(el);
}

// ---------- 시련 ----------
function showTrials() {
  const tr = meta.getTrials();
  const ids = Object.keys(TRIALS);
  const weekly = ids[meta.weeklyIndex(ids.length)];
  const html = `<div class="trials">${ids.map((id) => {
    const trial = TRIALS[id];
    const stars = tr[id] ?? 0;
    return `<button type="button" class="trial${id === weekly ? ' weekly' : ''}" data-trial="${id}">
      <b>${esc(trial.name)}${id === weekly ? ` <em>${t('ui.trials.weekly')}</em>` : ''}</b><span>${esc(trial.desc)}</span>
      <i>${t('ui.trials.meta', { stars: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, size: trial.size, n: trial.rounds ?? MAP_SIZES[trial.size].rounds })}</i></button>`;
  }).join('')}</div><p class="set-note">${t('ui.trials.note')}</p>`;
  const o = listModal(t('ui.trials.title'), html);
  o.querySelectorAll('[data-trial]').forEach((b) => {
    b.onclick = () => {
      const trial = TRIALS[b.dataset.trial];
      o.remove();
      startTrial(b.dataset.trial, trial);
    };
  });
}
function startTrial(id, trial) {
  const ms = $('mainScreen');
  unlockAudio();
  sfx.holy();
  if (aiMode === 'llm') prepareLLM().catch(() => {});
  ms.classList.add('leaving');
  setTimeout(() => {
    ms.hidden = true; ms.classList.remove('leaving');
    beginGame({ mode: 'standard', size: trial.size, difficulty: trial.difficulty, seed: trial.seed, veteran: true, trial: id, god: godConfig() });
    setTimeout(() => leaderSay(t('ui.trials.intro', { name: trial.name, intro: trial.intro })), fx.motion.reduced ? 300 : 2600);
  }, fx.motion.reduced ? 150 : 850);
}
const trialStars = (summary) => {
  if (summary.winner !== 'player') return 0;
  const gap = summary.score[0] - summary.score[1];
  return gap >= 20 || summary.rounds < state.maxRounds ? 3 : gap >= 10 ? 2 : 1;
};

function listModal(title, html) {
  const o = document.createElement('div');
  o.className = 'choice-modal list-modal';
  o.innerHTML = `<div class="list-box"><div class="list-head"><h3>${esc(title)}</h3><button class="btn-ghost list-close" type="button">${t('ui.close')}</button></div><div class="list-body">${html}</div></div>`;
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
  const kindName = { conquest: t('ui.lib.kind.conquest'), faith: t('ui.lib.kind.faith'), cathedral: t('ui.lib.kind.cathedral'), score: t('ui.lib.kind.score') };
  const byDiff = ['easy', 'normal', 'hard'].map((d) => {
    const g = hist.filter((x) => x.difficulty === d);
    return g.length ? `<span>${difficultyName(d)} <b>${g.filter((x) => x.winner === 'player').length}</b>/${g.length}</span>` : '';
  }).join('');
  const avgRounds = hist.length ? (hist.reduce((a, g) => a + g.rounds, 0) / hist.length).toFixed(1) : 0;
  const best = hist.filter((g) => g.winner === 'player').sort((a, b) => b.score[0] - a.score[0])[0];
  const maxKind = Math.max(1, ...Object.values(kinds));
  const bars = Object.entries(kindName).map(([k, n]) => `<div class="kbar"><span>${n}</span><i style="width:${((kinds[k] ?? 0) / maxKind) * 100}%"></i><b>${kinds[k] ?? 0}</b></div>`).join('');
  const stats = `<div class="lib-stats"><span>${t('ui.lib.games', { n: hist.length })}</span><span>${t('ui.lib.wins', { n: wins })}</span><span>${t('ui.lib.rate', { p: hist.length ? Math.round((wins / hist.length) * 100) : 0 })}</span>
    ${byDiff}<span>${t('ui.lib.avg', { n: avgRounds })}</span>${best ? `<span>${t('ui.lib.best', { n: best.score[0] })}</span>` : ''}</div>
    ${wins ? `<div class="kbars">${bars}</div>` : ''}`;
  const rows = hist.map((g, i) => `<details class="lib-row"><summary><span class="lr-date">${esc(g.date.slice(5, 10).replace('-', '/'))}</span>
      <span class="lr-res ${g.winner === 'player' ? 'win' : 'lose'}">${g.winner === 'player' ? t('ui.result.win') : g.winner === 'draw' ? t('ui.result.draw') : t('ui.result.lose')}</span>
      <span class="lr-meta">${t('ui.lib.meta', { size: g.size, diff: esc(difficultyName(g.difficulty)), daily: g.daily, rounds: g.rounds, a: g.score[0], b: g.score[1] })}</span>
      <span class="lr-ep">${t('ui.lib.epithet', { epithet: esc(g.epithet) })}</span></summary>
      <ol class="book">${g.revelations.map((r) => `<li><span class="bk-r">${t('ui.roundTitle', { n: r.round })}</span><span class="bk-t">${t('ui.quoted', { text: esc(r.text) })}</span></li>`).join('') || `<li>${t('ui.lib.noRevelation')}</li>`}</ol>
      <div class="lr-foot">${t('ui.lib.foot', { seed: g.seed, leader: g.leader ? esc(g.leader) : null, reason: esc(g.reason) })}</div></details>`).join('');
  listModal(t('ui.lib.title'), stats + codexHTML() + (rows || `<p>${t('ui.noRecords')}</p>`));
}

// 도감과 어휘집
function codexHTML() {
  const seen = meta.getSeen();
  const lex = meta.getLexicon();
  const cat = (label, kind, all, name) => {
    const got = seen[kind] ?? [];
    return `<div class="codex-row"><b>${label} ${got.length}/${all.length}</b>${all.map((id) => `<span class="${got.includes(id) ? 'got' : ''}" title="${got.includes(id) ? esc(name(id)) : t('ui.codex.unseen')}">${got.includes(id) ? esc(name(id)) : '?'}</span>`).join('')}</div>`;
  };
  const LEX = {
    'gather:food': t('ui.lex.gatherFood'), 'gather:wood': t('ui.lex.gatherWood'), 'gather:stone': t('ui.lex.gatherStone'), 'gather:faith': t('ui.lex.gatherFaith'),
    pray: t('ui.lex.pray'), explore: t('ui.lex.explore'), preach: t('ui.lex.preach'), attack: t('ui.lex.attack'),
    'build:village': t('ui.lex.buildVillage'), 'build:wall': t('ui.lex.buildWall'), 'build:temple': t('ui.lex.buildTemple'), 'build:cathedral': t('ui.lex.buildCathedral'),
    'tone:blessing': t('ui.lex.toneBlessing'), 'tone:curse': t('ui.lex.toneCurse'), 'tone:metaphor': t('ui.lex.toneMetaphor'),
  };
  return `<details class="codex"><summary>${t('ui.codex.title')}</summary>
    ${cat(t('ui.codex.events'), 'events', [...EVENTS.map((e) => e.id), ...DILEMMAS.map((e) => e.id), 'mira'], (id) => (EVENTS.find((e) => e.id === id) ?? DILEMMAS.find((e) => e.id === id))?.name ?? t('ui.codex.mira'))}
    ${cat(t('ui.codex.laws'), 'laws', LAW_CARDS.map((c) => c.id), (id) => LAW_CARDS.find((c) => c.id === id)?.name ?? id)}
    ${cat(t('ui.codex.leaders'), 'leaders', Object.keys(ENEMY_LEADERS), (id) => ENEMY_LEADERS[id].name)}
    ${cat(t('ui.codex.sites'), 'sites', Object.keys(SITES), (id) => SITES[id].name)}
    ${cat(t('ui.codex.miracles'), 'miracles', MIRACLES.map((m) => m.id), (id) => MIRACLES.find((m) => m.id === id).name)}
    ${cat(t('ui.codex.commandments'), 'commandments', Object.keys(COMMANDMENTS), (id) => COMMANDMENTS[id].name)}
    <div class="codex-row lex"><b>${t('ui.codex.lexicon', { a: Object.keys(lex).length, b: Object.keys(LEX).length })}</b>${Object.entries(LEX).map(([k, n]) => `<span class="${lex[k] ? 'got' : ''}">${esc(n)} — ${lex[k] ? `“${esc(lex[k].first)}” ×${lex[k].n}` : '?'}</span>`).join('')}</div>
  </details>`;
}

function showBible() {
  const have = meta.getAchievements();
  const html = `<div class="bible">${ACHIEVEMENTS.map((a) => `<div class="verse ${have[a.id] ? 'got' : ''}"><b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${have[a.id] ? `<i>${esc(have[a.id])}</i>` : ''}</div>`).join('')}</div>`;
  listModal(t('ui.bible.title', { a: Object.keys(have).length, b: ACHIEVEMENTS.length }), html);
}

// ---------- 설정 ----------
function applyA11y() {
  document.body.classList.toggle('cb', !!meta.get('gsg.a11y.cb', false));
  const z = String(meta.get('gsg.a11y.zoom', 1));
  document.body.style.zoom = '';
  for (const el of document.querySelectorAll('.app, .ms-inner')) el.style.zoom = z;
}
function showSettings() {
  const o = listModal(t('ui.set.title'), settingsHTML());
  bindSettings(o);
}
function settingsHTML() {
  const seg = (name, cur, opts) => `<div class="seg set-seg" data-set="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  return `<div class="settings">
    <section><h4>${t('ui.set.sound')}</h4>
      <label>${t('ui.set.music')} <input type="range" min="0" max="100" value="${Math.round(volume('music') * 100)}" data-vol="music"> <button type="button" class="chip" data-toggle="music">${musicOn() ? t('ui.on') : t('ui.off')}</button></label>
      <label>${t('ui.set.sfx')} <input type="range" min="0" max="100" value="${Math.round(volume('sfx') * 100)}" data-vol="sfx"> <button type="button" class="chip" data-toggle="sound">${soundOn() ? t('ui.on') : t('ui.off')}</button></label>
    </section>
    <section><h4>${t('ui.set.staging')}</h4>
      <label>${t('ui.set.motion')} ${seg('motion', fx.motion.reduced ? 'low' : 'full', [['full', t('ui.set.motionFull')], ['low', t('ui.set.motionLow')]])}</label>
      <label>${t('ui.set.speed')} ${seg('speed', speed, [['1', '1×'], ['2', '2×'], ['instant', t('ui.speed.instant')]])}</label>
      <label>${t('ui.set.suggest')} ${seg('suggest', meta.get('gsg.suggest', true) ? 'on' : 'off', [['on', t('ui.set.suggestOn')], ['off', t('ui.set.suggestOff')]])}</label>
    </section>
    <section><h4>${t('ui.set.view')}</h4>
      <label>${t('ui.set.cb')} ${seg('cb', meta.get('gsg.a11y.cb', false) ? 'on' : 'off', [['off', t('ui.set.cbOff')], ['on', t('ui.set.cbOn')]])}</label>
      <label>${t('ui.set.zoom')} ${seg('zoom', meta.get('gsg.a11y.zoom', 1), [[1, t('ui.set.zoom1')], [1.1, t('ui.set.zoom2')], [1.2, t('ui.set.zoom3')]])}</label>
      ${Object.keys(LOCALES).length > 1 ? `<label>${t('ui.set.lang')} ${seg('lang', lang, Object.entries(LOCALES))}</label>` : ''}
    </section>
    <section><h4>${t('ui.set.priest')}</h4>
      <p class="set-note">${aiUsable ? t('ui.set.aiState', { state: esc(aiState), llm: aiMode === 'llm' }) : t('ui.set.noAI')}</p>
    </section>
    <section><h4>${t('ui.set.about')}</h4>
      <p class="set-note">${t('ui.set.aboutText', { ruleset: RULESET })} <a href="https://github.com/wisebear-KOR/GSG_Project" target="_blank" rel="noopener">GitHub</a></p>
    </section>
    <section><h4>${t('ui.set.records')}</h4>
      <div class="set-row"><button type="button" class="btn-ghost" data-act="export">${t('ui.set.export')}</button><button type="button" class="btn-ghost" data-act="import">${t('ui.set.import')}</button><button type="button" class="btn-ghost danger" data-act="reset">${t('ui.set.reset')}</button></div>
      <p class="set-note">${t('ui.set.recordsNote')}</p>
      <input type="file" accept="application/json" hidden data-file>
    </section>
  </div>`;
}
function bindSettings(o) {
  o.querySelectorAll('[data-vol]').forEach((r) => { r.oninput = () => setVolume(r.dataset.vol, Number(r.value) / 100); r.onchange = () => sfx.click(); });
  o.querySelectorAll('[data-toggle]').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.toggle === 'music') setMusic(!musicOn()); else setSound(!soundOn());
      b.textContent = (b.dataset.toggle === 'music' ? musicOn() : soundOn()) ? t('ui.on') : t('ui.off');
      renderTools(); renderMainStatus(); sfx.click();
    };
  });
  o.querySelectorAll('.set-seg').forEach((g) => g.querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      const v = b.dataset.v;
      const k = g.dataset.set;
      if (k === 'motion') fx.setReduced(v === 'low');
      if (k === 'speed') { speed = v; meta.set('gsg.speed', v); fx.motion.speed = v === '2' ? 2 : 1; }
      if (k === 'suggest') meta.set('gsg.suggest', v === 'on');
      if (k === 'cb') meta.set('gsg.a11y.cb', v === 'on');
      if (k === 'zoom') meta.set('gsg.a11y.zoom', Number(v));
      // 언어는 모듈을 읽을 때 정해지므로 저장하고 다시 읽는다 (진행 중인 판은 저장돼 있다)
      if (k === 'lang') { if (v !== lang) { setLang(v); location.reload(); } return; }
      applyA11y();
      g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      renderTools(); renderMainStatus(); sfx.click();
      if (!$('mainScreen').hidden) return;
      render();
    };
  }));
  const file = o.querySelector('[data-file]');
  o.querySelector('[data-act="export"]').onclick = () => {
    const blob = new Blob([JSON.stringify({ app: 'gsg', exported: new Date().toISOString(), data: meta.exportAll() }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `revelation-${meta.dayKey()}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    sfx.page();
  };
  o.querySelector('[data-act="import"]').onclick = () => file.click();
  file.onchange = async () => {
    try {
      const obj = JSON.parse(await file.files[0].text());
      if (obj.app !== 'gsg' || typeof obj.data !== 'object') throw new Error('format');
      if (!confirm(t('ui.set.importConfirm'))) return;
      meta.importAll(obj.data);
      location.reload();
    } catch { alert(t('ui.set.importFailed')); }
  };
  o.querySelector('[data-act="reset"]').onclick = () => {
    if (!confirm(t('ui.set.resetConfirm'))) return;
    for (const k of Object.keys(meta.exportAll())) { try { localStorage.removeItem(k); } catch { /* 무시 */ } }
    location.reload();
  };
}

// 선수를 빼앗긴 줄 여럿은 한 줄로 (리플레이는 칸마다 따로 보여준다)
function mergeBlocked(logs) {
  const out = [];
  for (const l of logs) {
    const m = l.fx?.kind === 'blocked' && l.fx.tile != null;
    const prev = out[out.length - 1];
    if (m && prev?.merged && prev.side === l.side) {
      prev.names.push(blockedName(l));
      prev.text = t('ui.log.blockedMerged', { side: l.side, names: prev.names });
    } else if (m) out.push({ ...l, merged: true, names: [blockedName(l)] });
    else out.push(l);
  }
  return out;
}
// 빼앗긴 칸의 이름: 그 로그가 남은 순간의 보드로 (엔진이 로그에 쓴 이름과 같다)
function blockedName(l) {
  const v = l.snap ? makeView(l.snap) : state;
  return tileName(v, v.tileAt[l.fx.tile], 'player');
}

// ---------- 규칙서 ----------
function showRules() {
  const sec = (title, items, open = false) => `<details class="rule-sec"${open ? ' open' : ''}><summary>${title}</summary><ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul></details>`;
  const html = `<div class="rules">
    ${sec(t('ui.rules.core'), [t('ui.rules.core1'), t('ui.rules.core2'), t('ui.rules.core3'), t('ui.rules.core4'), t('ui.rules.core6'), t('ui.rules.core5')], true)}
    ${sec(t('ui.rules.flow'), [t('ui.rules.flow1'), t('ui.rules.flow2'), t('ui.rules.flow3'), t('ui.rules.flow4')])}
    ${sec(t('ui.rules.win'), [t('ui.rules.win1'), t('ui.rules.win2'), t('ui.rules.win3'), t('ui.rules.win4'), t('ui.rules.win5')])}
    ${sec(t('ui.rules.faith'), [
      t('ui.rules.faith1', { perAction: RULES.followersPerAction, perFaith: RULES.followersPerFaith }),
      t('ui.rules.faith2'),
      t('ui.rules.faith3'),
    ])}
    ${sec(t('ui.rules.doctrine'), [t('ui.rules.doctrine1'), t('ui.rules.doctrine2')])}
    ${sec(t('ui.rules.words'), [t('ui.rules.words1'), t('ui.rules.words2'), t('ui.rules.words3'), t('ui.rules.words4'), t('ui.rules.words5'), t('ui.rules.words6'), t('ui.rules.words7')])}
    ${sec(t('ui.rules.enemy'), [t('ui.rules.enemy1'), t('ui.rules.enemy2'), t('ui.rules.enemy3'), t('ui.rules.enemy4')])}
    ${sec(t('ui.rules.miracle'), [t('ui.rules.miracle1'), t('ui.rules.miracle2')])}
    ${sec(t('ui.rules.keys'), [t('ui.rules.keys1')])}
  </div>`;
  listModal(t('ui.rules.title'), html);
}

// 판을 끝낼 때마다 모듈이 한 묶음씩 열린다: 새 판을 시작할 때 한 번, 이번에 열린 것과 다음에 열릴 것
function showUnlockNote() {
  const level = state.config.unlock;
  if (state.tutorial || !level || level > MODULES) return;
  const seen = Number(meta.get('gsg.unlockNote', 0)) || 0;
  if (seen >= level) return;
  meta.set('gsg.unlockNote', level);
  const now = [t(`ui.unlock.${level}`), ...(level === 1 ? [t('ui.unlock.5')] : [])];
  const next = level < MODULES ? `<p class="set-note">${t('ui.unlock.next', { what: t(`ui.unlock.${level + 1}`) })}</p>` : '';
  listModal(t('ui.unlock.title'), `<ul class="unlock-list">${now.map((x) => `<li>${x}</li>`).join('')}</ul>${next}<p class="set-note">${t('ui.unlock.note')}</p>`);
}

// ---------- 음성 해설 (화면 읽기 프로그램) ----------
function announce(text) {
  const box = $('sr');
  if (!box || !text) return;
  const p = document.createElement('p');
  p.textContent = text;
  box.append(p);
  while (box.children.length > 4) box.firstChild.remove();
}

// ---------- 사관 세라의 과제 (튜토리얼 뒤 첫 판들) ----------
const TASKS = [
  { text: t('ui.task.village'), done: () => villageCount(state, 'player') >= 1 },
  { text: t('ui.task.miracle'), done: () => state.stats.miracles >= 1 },
  { text: t('ui.task.doctrine'), done: () => DOCTRINES.some((k) => state.sides.player.doctrine[k] >= 2) },
  { text: t('ui.task.win'), done: (end) => end && state.winner === 'player' },
];
const CHEER = [t('ui.task.cheer1'), t('ui.task.cheer2'), t('ui.task.cheer3'), t('ui.task.cheer4')];
function currentTask() {
  if (state.tutorial) return null;
  const ob = meta.getOnboard();
  return ob.off || ob.step >= TASKS.length ? null : { ...TASKS[ob.step], step: ob.step };
}
function checkOnboard(end = false) {
  const task = currentTask();
  if (!task || !task.done(end)) return;
  meta.setOnboard({ ...meta.getOnboard(), step: task.step + 1 });
  if (!end) matSay('matPlayer', t('ui.task.sera'), CHEER[task.step], 'priest');
  renderMats();
}

// ---------- 선택 카드 (기적 드래프트, 발견지) ----------
function choiceModal({ kind, title, text, options }) {
  return new Promise((resolve) => {
    const o = document.createElement('div');
    o.className = 'choice-modal';
    o.innerHTML = `<div class="choice-box"><div class="kind">${esc(kind)}</div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}
      <div class="choice-row">${options.map((op, i) => `<button type="button" class="choice-card" data-i="${i}">${op.art ? svgUse(op.art, 'art', '0 0 48 48') : ''}<b>${esc(op.label)}</b><span>${esc(op.text)}</span>${op.cost != null ? `<i>${t('ui.faithCost', { n: op.cost })}</i>` : ''}</button>`).join('')}</div></div>`;
    document.body.append(o);
    document.activeElement?.blur?.();
    sfx.deal();
    o.querySelectorAll('.choice-card').forEach((b) => fx.attachTilt(b, 8));
    o.querySelectorAll('.choice-card').forEach((b) => {
      b.onclick = () => { sfx.holy(); o.classList.add('out'); setTimeout(() => o.remove(), 350); resolve(options[Number(b.dataset.i)].id); };
    });
  });
}

async function showDestinyChoice() {
  if (!state.destinyOffer || phase !== 'speak') return;
  const id = await choiceModal({
    kind: t('ui.destiny.kind'), title: t('ui.destiny.title'), text: t('ui.destiny.text', { n: DESTINY_POINTS }),
    options: state.destinyOffer.map((d) => ({ id: d, label: DESTINIES[d].name, text: DESTINIES[d].text })),
  });
  chooseDestiny(state, id);
  if (phase === 'speak') meta.saveGame(state, 'speak');
  render();
}

async function showMiracleDraft() {
  if (!state.miracleOffer || phase !== 'speak') return;
  const id = await choiceModal({
    kind: t('ui.draft.kind', { n: draftRound(state) }), title: t('ui.draft.title'), text: t('ui.draft.text'),
    options: state.miracleOffer.map((mid) => { const m = MIRACLES.find((x) => x.id === mid); return { id: mid, label: m.name, text: m.text, cost: miracleCost(state, m), art: MIRACLE_ART[mid] }; }),
  });
  takeMiracle(state, id);
  if (phase === 'speak') meta.saveGame(state, 'speak');
  renderAltar();
}

async function showSiteChoice() {
  const tile = state.tileAt[state.pendingSite];
  const site = SITES[tile.site.id];
  const id = await choiceModal({ kind: t('ui.site.kind', { place: tileName(state, tile) }), title: site.name, text: site.text, options: site.choice.map((c) => ({ id: c.id, label: c.label, text: c.text })) });
  const msg = resolveSite(state, id);
  if (!msg) return;
  state.log.push({ round: state.round, side: 'player', text: msg });
  fx.floatText($('board'), tile, msg.split('.')[0], 'good');
  renderMats();
  renderAltar();
  markScrollHints();
}

// 안에서 스크롤되는 기둥(부족 판·오른쪽 기둥)에 아래로 더 있으면 흐려지는 끝을 단다
function markScrollHints() {
  for (const el of document.querySelectorAll('.table > .mat, .table > .side-col')) {
    if (!el.dataset.hint) { el.dataset.hint = '1'; el.addEventListener('scroll', () => markScrollHints(), { passive: true }); }
    el.classList.toggle('more-below', el.scrollHeight > el.clientHeight + 4 && el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }
}
window.addEventListener('resize', () => markScrollHints());

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
  const grade = rate >= 0.7 ? 'full' : rate >= 0.3 ? 'half' : 'miss';
  const word = Object.values(pd.links ?? {})[0] ?? pd.text.slice(0, 12);
  const deed = best ? t('ui.verdict.deed', { text: best.text }) : '';
  const stamp = { full: t('ui.verdict.full'), half: t('ui.verdict.half'), miss: t('ui.verdict.miss') }[grade];
  return { grade, text: t('ui.verdict.text', { grade, word, deed }), stamp };
}

// ---------- 해결 재생 ----------
const makeView = (snap) => ({
  ...state, tiles: snap.tiles, sides: snap.sides, tileAt: Object.fromEntries(snap.tiles.map((t) => [t.id, t])),
});

async function playback(before) {
  const enemySlots = [...document.querySelectorAll('#matEnemy .meeples svg')];
  const enemyFrom = resolved.enemyPlan.map((_, i) => enemySlots[i] ? center(enemySlots[i]) : null);
  phase = 'playing';
  if (speed === 'instant') fx.motion.skip = true;
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
    if (banner && speed === '1' && !fx.motion.skip) announce(`${banner.title}. ${log.text}`);
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
  if (resolved.ledger) announce(t('ui.announce.ledger', { rows: resolved.ledger.rows, score: resolved.ledger.score }));
  if (phase !== 'over') revealPerk(before);
  if (resolved.verdict) setTimeout(() => (resolved.verdict.grade === 'miss' ? sfx.fail() : sfx.seal?.()), 200);
  if (pendingLesson) { const l = pendingLesson; pendingLesson = null; setTimeout(() => priestSay(t('ui.lesson.learned', { word: l.word, meaning: describeLesson(l) })), 900); }
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
        const early = lv === 6 && state.round < ultRound(state);
        setTimeout(() => fx.perkReveal(frameEl(), { title: t('ui.perk.title', { name: DOCTRINE[k].name, lv, kind: early ? 'dormant' : lv === 6 ? 'ult' : 'perk' }), text: early ? t('ui.perk.dormant', { n: ultRound(state), text: t('ui.perk.bare', { text: DOCTRINE[k].perks[lv] }) }) : t('ui.perk.bare', { text: DOCTRINE[k].perks[lv] }), icon: `d-${k}` }), 900);
        return;
      }
    }
  }
  if (state.round === ultRound(state) - 1) {
    const k = DOCTRINES.find((x) => d[x] >= DOCTRINE_MAX);
    if (k) setTimeout(() => fx.perkReveal(frameEl(), { title: t('ui.perk.wakeTitle', { name: DOCTRINE[k].name }), text: t('ui.perk.wakeText', { text: t('ui.perk.bare', { text: DOCTRINE[k].perks[6] }) }), icon: `d-${k}` }), 900);
  }
}

// ---------- 장 결산: 이번 장에 무엇이 늘고 줄었나 ----------
function ledgerOf(before) {
  const b = before.sides.player;
  const a = state.sides.player;
  const bv = makeView(before);
  const rows = [];
  for (const k of RES_KEYS) if (a[k] !== b[k]) rows.push({ key: k, label: RESOURCE_NAME[k], d: a[k] - b[k] });
  if (a.pop !== b.pop) rows.push({ key: 'pop', label: t('ui.ledger.pop'), d: a.pop - b.pop });
  const vd = villageCount(state, 'player') - villageCount(bv, 'player');
  if (vd) rows.push({ key: 'village', label: t('ui.ledger.village'), d: vd });
  const gap = score(state, 'enemy') - score(state, 'player');
  let hint = null;
  if (!state.winner && gap >= 0 && state.round >= state.maxRounds - 3) {
    const w = JUDGEMENTS[state.judgement ?? 'classic'].w;
    const need = gap; // 동점이면 우리가 이긴다
    hint = need === 0 ? t('ui.ledger.tie') : t('ui.ledger.behind', { need, villages: Math.ceil(need / w.village), pop: Math.ceil(need / w.pop) });
  }
  return { rows, score: score(state, 'player') - score(bv, 'player'), enemyScore: score(state, 'enemy') - score(bv, 'enemy'), hint };
}

function ledgerHTML(l) {
  if (!l) return '';
  const sign = (d) => (d > 0 ? `+${d}` : `${d}`);
  const items = l.rows.map((r, i) => `<span class="lg-item ${r.d > 0 ? 'up' : 'down'}" style="--i:${i}">${esc(r.label)} <b>${sign(r.d)}</b></span>`).join('');
  return `<div class="ledger"><span class="lg-head">${t('ui.ledger.head')}</span>${items || `<span class="lg-item" style="--i:0">${t('ui.ledger.none')}</span>`}
    <span class="lg-score ${l.score >= 0 ? 'up' : 'down'}" style="--i:${l.rows.length}">${t('ui.ledger.score', { s: sign(l.score) })}</span>
    <span class="lg-enemy">${t('ui.ledger.enemy', { s: sign(l.enemyScore) })}</span>${l.hint ? `<span class="lg-hint">${esc(l.hint)}</span>` : ''}</div>`;
}

// 항목이 하나씩 쌓이며 음이 오른다
function playLedger() {
  const l = resolved?.ledger;
  if (!l || fx.motion.reduced) return;
  l.rows.forEach((r, i) => setTimeout(() => sfx.coin(i), 120 + i * 130));
  setTimeout(() => { if (l.score > 0) sfx.chime(); }, 160 + l.rows.length * 130);
}

// 우리 수도에서 본 8방위: 0 동, 1 북동, 2 북 … 7 남동 (수도나 칸이 없으면 -1)
function directionOf(tileId) {
  const home = capitalOf(state, 'player');
  const tile = state.tileAt[tileId];
  if (!home || !tile) return -1;
  const a = tileCenter(home); const b = tileCenter(tile);
  const deg = (Math.atan2(a.y - b.y, b.x - a.x) * 180) / Math.PI;
  return ((Math.round(deg / 45) % 8) + 8) % 8;
}

// 해결 단계마다 보드 위에 띄우는 띠
function bannerFor(log, seen) {
  const e = log.fx;
  if (!e) return null;
  if (log.side !== 'player' && log.side !== 'enemy') return null;
  const who = log.side === 'player' ? t('ui.who.player') : t('ui.who.enemy');
  if (e.tile && !seen) return { side: log.side, icon: 's-tablet', title: t('ui.banner.fog', { who, dir: directionOf(e.tile) }), detail: t('ui.banner.fogDetail') };
  const res = e.gain ? Object.keys(e.gain)[0] : null;
  const isPray = e.kind === 'gain' && res === 'faith' && log.fx.tile && view?.tileAt[log.fx.tile]?.building === 'capital';
  const map = {
    gain: [isPray ? 'i-temple' : `i-${res}`, isPray ? t('ui.banner.pray') : t('ui.banner.gather')],
    treasure: ['i-faith', t('ui.banner.treasure')], explore: ['e-prophet', t('ui.banner.explore')], build: ['i-house', t('ui.banner.build')], cathedral: ['i-temple', t('ui.banner.cathedral')],
    preach: ['d-peace', t('ui.banner.preach')], attack: ['d-war', t('ui.banner.attack')], blocked: ['i-shield', t('ui.banner.blocked')], fail: ['i-shield', t('ui.banner.fail')],
    birth: ['i-house', t('ui.banner.birth')], loss: ['i-shield', t('ui.banner.loss')], warn: ['i-faith', t('ui.banner.warn')], ban: ['s-tablet', t('ui.banner.ban')], grace: ['i-faith', t('ui.banner.grace')], prophecy: ['i-faith', t('ui.banner.prophecy')], bless: ['i-faith', t('ui.banner.bless')], wrath: ['d-war', t('ui.banner.wrath')], streak: ['i-faith', t('ui.banner.streak')], edict: ['s-tablet', t('ui.banner.edict')], dilemma: ['e-prophet', t('ui.banner.dilemma')], saint: ['i-faith', t('ui.banner.saint')], legend: ['i-faith', t('ui.banner.legend')], commandment: ['s-tablet', t('ui.banner.commandment')], site: ['e-prophet', t('ui.banner.site')], lightning: ['m-lightning', t('ui.banner.lightning')], rain: ['m-rain', t('ui.banner.rain')], bounty: ['m-bounty', t('ui.banner.bounty')],
  }[e.kind];
  if (!map) return null;
  const [icon, verb] = map;
  return { side: log.side, icon, title: t('ui.banner.title', { who, verb }), detail: log.text };
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
      fx.floatText(svg, tile, t('ui.fx.fogLifted'), 'info');
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
      const [l, r] = mine ? [t('ui.who.player'), t('ui.who.enemy')] : [t('ui.who.enemy'), t('ui.who.player')];
      const d = log.dice;
      let w = 0;
      for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + d.attackerBonus > y + d.defenderBonus) w++;
      const odds = w / 36;
      await fx.rollDice(frameEl(), log.dice, {
        leftLabel: t('ui.dice.left', { who: l, attack: isAttack, p: Math.round(odds * 100) }), rightLabel: t('ui.dice.right', { who: r, attack: isAttack }),
        leftSide: log.side, rightSide: other(log.side),
        winText: isAttack ? (e.capital ? t('ui.dice.winCapital') : e.capture ? t('ui.dice.winCapture') : t('ui.dice.winAttack')) : t('ui.dice.winPreach'),
        loseText: isAttack ? t('ui.dice.loseAttack') : t('ui.dice.losePreach'),
      });
      // 30% 아래에서 이기면 기적
      if (mine && log.dice.win && odds < 0.3 && !fx.motion.skip) {
        sfx.holy();
        fx.flash('rgba(255,236,170,.6)', 700);
        fx.floatText(svg, tile, t('ui.fx.miracle'), 'good', -26);
      }
      if (isAttack && log.dice.win) {
        sfx.hit();
        fx.shake(frameEl(), 10);
        fx.flash('rgba(200,40,20,.45)', 500);
        fx.ring(svg, tile, '#ff4b3a', true);
        fx.sparks(tileToHost(svg, null, tile), 22, ['#ff6b4a', '#ffb070', '#ffe0b0']);
      } else if (isAttack) {
        sfx.shield();
        fx.floatText(svg, tile, t('ui.fx.blocked'), 'bad');
      } else if (!isAttack && log.dice.win) {
        sfx.preach();
        fx.sparks(tileToHost(svg, null, tile), e.convert ? 40 : 18, ['#ffffff', '#cfe3ff', '#ffe9a8']);
        fx.floatText(svg, tile, e.convert ? t('ui.fx.converted') : t('ui.fx.popUp'), mine ? 'good' : 'bad');
        if (e.convert) { fx.ring(svg, tile, mine ? '#9cc0ff' : '#ff9f8e', true); sfx.holy(); sfx.page(); }
      }
      return fx.wait(600);
    }
    case 'edict': {
      const up = log.fx.up ?? /\+/.test(log.text.split('—')[0]); // 옛 저장본의 기록에는 fx.up이 없다
      if (tile) fx.floatText(svg, tile, up ? t('ui.fx.edictUp') : t('ui.fx.edictDown'), up ? 'bad' : 'good');
      (up ? sfx.fail : sfx.chime)();
      return fx.wait(600);
    }
    case 'legend':
      sfx.chime();
      if (tile) { fx.ring(svg, tile, '#ffe28a', true); fx.floatText(svg, tile, state.legends[tile.id]?.name ?? t('ui.fx.legend'), 'good'); }
      return fx.wait(800);
    case 'saint':
    case 'commandment':
      sfx.holy();
      if (home) { fx.ring(svg, home, '#ffe28a', true); fx.sparks(tileToHost(svg, null, home), 24, ['#fff6d0', '#ffd98a']); }
      return fx.wait(800);
    case 'dilemma':
      sfx.page();
      if (home) fx.ring(svg, home, '#f4efe4', true);
      return fx.wait(700);
    case 'streak':
      sfx.holy();
      fx.flash('rgba(255,236,170,.45)', 700);
      if (tile) { fx.ring(svg, tile, '#ffe28a', true); fx.sparks(tileToHost(svg, null, tile), 40, ['#fff6d0', '#ffd98a', '#ffffff']); }
      if (e.gain && home) await gainTo(home);
      return fx.wait(900);
    case 'wrath':
      sfx.thunder?.();
      fx.flash('rgba(160,30,20,.35)', 600);
      if (home) fx.floatText(svg, home, t('ui.fx.wrath'), 'bad');
      return fx.wait(700);
    case 'rally':
    case 'guard':
      sfx.fail();
      if (tile) { fx.ring(svg, tile, '#ff9f8e', true); fx.floatText(svg, tile, t(e.kind === 'rally' ? 'ui.fx.rally' : 'ui.fx.guard'), 'bad'); }
      return fx.wait(700);
    case 'bless':
      sfx.holy();
      if (tile) { fx.ring(svg, tile, '#ffe28a', true); fx.sparks(tileToHost(svg, null, tile), 24, ['#fff6d0', '#ffd98a']); fx.floatText(svg, tile, e.label ?? t('ui.fx.bless'), 'good'); }
      return fx.wait(800);
    case 'site':
      sfx.chime();
      if (tile) { fx.ring(svg, tile, '#f4efe4', true); fx.floatText(svg, tile, t('ui.fx.site'), 'info'); }
      return fx.wait(700);
    case 'grace':
    case 'prophecy':
      sfx.chime();
      if (home) { fx.sparks(tileToHost(svg, null, home), e.kind === 'prophecy' ? 44 : 16, ['#fff6d0', '#ffd98a', '#ffffff']); await gainTo(home); }
      if (e.kind === 'prophecy') fx.flash('rgba(255,236,170,.5)', 700);
      return fx.wait(e.kind === 'prophecy' ? 900 : 400);
    case 'warn':
      if (home) fx.floatText(svg, home, t('ui.fx.warn'), 'bad');
      sfx.fail();
      return fx.wait(900);
    case 'loss':
      if (home) fx.floatText(svg, home, t('ui.fx.popDown'), 'bad');
      sfx.loss();
      return fx.wait(750);
    case 'birth':
      if (home) { fx.floatText(svg, home, t('ui.fx.popUp'), 'good'); fx.ring(svg, home, '#9be29b'); }
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
    notice = targeting ? t('ui.notice.pickLightning') : '';
    render();
    return;
  }
  // 기적 전 매트를 보여 주고, 토큰이 도착한 뒤에 숫자를 올린다
  const before = makeView(snapshot(state));
  const r = castMiracle(state, id);
  if (r.ok && !state.tutorial) meta.markSeen('miracles', id);
  notice = r.ok ? '' : r.text;
  if (!r.ok) { sfx.fail(); setTimeout(() => document.querySelector(`.mcard[data-m="${id}"]`)?.classList.add('reject'), 30); }
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

// 확인 칩 옮기기: 같은 일을 다른 칸에서 한다 (계시의 뜻은 그대로, 칸만 고른다)
const sameKind = (a, b) => a.type === b.type && a.build === b.build && a.gather === b.gather;
function moveChoices(key) {
  const a = pending?.accepted?.find((x) => x.key === key);
  if (!a) return [];
  const taken = new Set(pending.accepted.filter((x) => x.key !== key).map((x) => x.tile));
  const banned = new Set(pending.result.forbidden.map((x) => x.key));
  return legalActions(state, 'player').filter((b) => sameKind(a, b) && b.key !== key && !taken.has(b.tile) && !banned.has(b.key));
}
function moveChip(id) {
  const b = moveChoices(targeting.move).find((x) => x.tile === id);
  const from = targeting.move;
  targeting = null;
  notice = '';
  if (b) {
    pending.result = { ...pending.result, orders: pending.result.orders.map((x) => (x.key === from ? b : x)) };
    sfx.lift();
    derivePending();
  }
  renderBoardView();
  renderAltar();
}

async function onTileClick(id) {
  if (targeting?.move && phase === 'confirm') return moveChip(id);
  if (targeting !== 'lightning' || phase !== 'speak') return;
  const r = castMiracle(state, 'lightning', id);
  if (r.ok && !state.tutorial) meta.markSeen('miracles', 'lightning');
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
  ai.querySelector('b').textContent = aiMode === 'llm' ? 'LLM' : t('ui.ai.tablet');
  ai.title = aiUsable ? t('ui.ai.toggleTip', { state: aiState }) : t('ui.ai.unavailableTip');
  $('music').innerHTML = iconBtn('u-music', musicOn());
  $('music').classList.toggle('muted', !musicOn());
  $('music').title = musicOn() ? t('ui.tools.musicOn') : t('ui.tools.musicOff');
  $('sound').innerHTML = iconBtn('u-speaker', soundOn());
  $('sound').classList.toggle('muted', !soundOn());
  $('sound').title = soundOn() ? t('ui.tools.soundOn') : t('ui.tools.soundOff');
  $('motion').innerHTML = iconBtn('u-sparkle', !fx.motion.reduced);
  $('motion').classList.toggle('muted', fx.motion.reduced);
  $('motion').title = fx.motion.reduced ? t('ui.tools.motionLow') : t('ui.tools.motionFull');
}

function renderTrack() {
  const nodes = [];
  for (let i = 1; i <= state.maxRounds; i++) {
    const cls = i < state.round ? 'done' : i === state.round ? 'now' : '';
    if (i > 1) nodes.push('<span class="link"></span>');
    nodes.push(`<span class="node ${cls}" title="${t('ui.chapter.title', { n: i, month: state.tutorial ? null : monthOf(state, i) })}">${i}</span>`);
  }
  nodes.push(`<span class="first" id="firstMark">${t('ui.track.first', { first: state.first })}</span>`);
  $('track').innerHTML = nodes.join('');
  fitTopbar();
  const now = $('track').querySelector('.now');
  if (now) {
    // 가운데 맞춤이 트랙 끝을 넘으면 안쪽으로 당긴다 (첫 장·마지막 장에서 글자가 잘리지 않게)
    const fm = $('firstMark'), half = fm.offsetWidth / 2, track = $('track');
    const c = now.offsetLeft + now.offsetWidth / 2;
    fm.style.left = `${Math.max(half, Math.min(track.scrollWidth - half, c))}px`;
  }
}

// 상단바가 한 줄에 안 들어가면(긴 제목·14장 트랙·긴 번역) 장 트랙을 아랫줄로 내린다
function fitTopbar() {
  const bar = document.querySelector('.topbar');
  if (!bar) return;
  bar.classList.remove('two-row', 'compact');
  if (window.innerWidth <= 720) return;
  const r = (el) => el.getBoundingClientRect();
  const brand = bar.querySelector('.brand'), tools = bar.querySelector('.tools'), track = $('track');
  const over = () => bar.scrollWidth > bar.clientWidth + 1 || r(tools).right > r(bar).right + 1
    || r(track).left < r(brand).right + 8 || r(track).right > r(tools).left - 8;
  // 먼저 버튼 글자를 줄여 보고, 그래도 넘치면 장 트랙을 아랫줄로
  if (over()) bar.classList.add('compact');
  if (over()) bar.classList.add('two-row');
}
let topbarTimer = 0;
window.addEventListener('resize', () => { clearTimeout(topbarTimer); topbarTimer = setTimeout(() => { if (state) renderTrack(); }, 120); });

function renderSeason() {
  const ev = state.event;
  $('season').innerHTML = `
    <div class="card card-parch${dealSeason ? ' deal' : ''}">
      <div class="face">
        <div class="kind">${t('ui.season.kind')}</div>
        <div class="title">${svgUse(ev.choice ? 'e-prophet' : `e-${ev.id}`)}${esc(ev.name)}</div>
        <div class="body" title="${esc(ev.text)}">${esc(ev.text)}${ev.id === 'mira' && state.miraQuote ? `<br><i>“${esc(state.miraQuote)}”</i>` : ''}</div>
        <div class="rule">${esc(ev.rule)}</div>
        ${state.eventChoice && phase === 'speak' ? seasonChoiceHTML() : ''}
      </div>
    </div>${nextEvent(state) && state.round < state.maxRounds ? `<div class="next-season" title="${esc(nextEvent(state).rule)}">${t('ui.season.next')}${svgUse(nextEvent(state).choice ? 'e-prophet' : `e-${nextEvent(state).id}`)}${esc(nextEvent(state).name)}</div>` : ''}${destinyHTML()}`;
  if (dealSeason) setTimeout(() => sfx.deal(), 250);
  dealSeason = false;
  $('season').querySelectorAll('.card').forEach((c) => fx.attachTilt(c, 8));
  $('season').querySelector('.season-swap')?.addEventListener('click', (e) => {
    chooseEvent(state, e.currentTarget.dataset.ev);
    meta.markSeen('events', state.event.id);
    sfx.deal();
    dealSeason = true;
    render();
  });
}

function destinyHTML() {
  const d = state.destiny;
  if (!d || state.destinyOffer) return '';
  const info = DESTINIES[d.id];
  return `<div class="destiny${d.done ? ' done' : ''}" title="${t('ui.destiny.tip', { n: DESTINY_POINTS })}">${d.done ? '✓ ' : ''}${t('ui.destiny.line', { name: esc(info.name), text: esc(info.text) })}</div>`;
}

function seasonChoiceHTML() {
  const other = state.eventChoice.find((id) => id !== state.event.id);
  const ev = EVENTS.find((e) => e.id === other) ?? DILEMMAS.find((e) => e.id === other);
  if (!ev) return '';
  return `<button class="season-swap" type="button" data-ev="${other}" title="${esc(ev.rule)}">${t('ui.season.swap', { name: esc(ev.name), raw: ev.name })}</button>`;
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
  const selectable = targeting === 'lightning' ? cur.tiles.filter((t) => t.owner === 'enemy' && t.revealed).map((t) => t.id)
    : targeting?.move && phase === 'confirm' ? moveChoices(targeting.move).map((b) => b.tile) : [];
  const hints = phase === 'speak' && !targeting ? hintTiles : [];
  const intents = ['speak', 'thinking', 'confirm'].includes(phase) && state.round > 0 && !state.winner
    ? enemyIntent(state).filter((a) => a.shown).map((a) => ({ tile: a.tile, type: a.type === 'build' ? 'build' : a.type })) : [];
  renderBoard($('board'), cur, { markers, highlight, hints, intents, selectable, onTileClick, focus: focusId });
  $('board').setAttribute('aria-label', t('ui.board.aria', { n: state.round, mine: cur.tiles.filter((tl) => tl.owner === 'player').length, theirs: cur.tiles.filter((tl) => tl.owner === 'enemy' && tl.revealed).length, a: score(cur, 'player'), b: score(cur, 'enemy') }));
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

let inCrisis = false;
function renderMats() {
  const cur = matView ?? V();
  // 신앙 위기(바닥난 채로 한 장을 버팀): 화면 가장자리가 붉게, 들어설 때 심장이 두 번 뛴다
  const crisis = !state.tutorial && state.sides.player.faithless > 0 && !state.winner;
  document.body.classList.toggle('faith-crisis', crisis);
  if (crisis && !inCrisis && !fx.motion.reduced) sfx.heartbeat();
  inCrisis = crisis;
  $('matPlayer').innerHTML = matHTML(cur, 'player');
  $('matEnemy').innerHTML = matHTML(cur, 'enemy');
  const x = $('matPlayer').querySelector('.task-x');
  if (x) x.onclick = () => { meta.setOnboard({ ...meta.getOnboard(), off: true }); sfx.click(); renderMats(); };
  renderLaw(cur);
  document.querySelectorAll('.mat .n[data-from]').forEach((el) => fx.countUp(el, Number(el.dataset.from), Number(el.dataset.to)));
  markScrollHints();
}

// 율법 카드: 공개 단계에 뒤집힌다
function renderLaw(cur) {
  const shown = ['playing', 'resolved', 'over'].includes(phase);
  $('law').innerHTML = shown ? `
    <div class="card card-stone${flipLaw ? ' flip' : ''}"><div class="face">
      <div class="kind">${t('ui.law.kind')}</div>
      <div class="title">${svgUse('s-tablet')}${esc(state.lawCard.name)}</div>
      <div class="body">${esc(state.lawCard.text)}</div>
      <div class="rule">${t('ui.law.rule', { n: actionLimit(cur, 'enemy') })}</div>
    </div></div>` : lawBackHTML();
  if (shown) flipLaw = false;
  $('law').querySelectorAll('.card').forEach((c) => fx.attachTilt(c, 8));
}

const speedHTML = () => `<div class="speed" role="group" aria-label="${t('ui.set.speed')}" title="${t('ui.set.speed')}">${[['1', '1×'], ['2', '2×'], ['instant', t('ui.speed.instant')]].map(([v, l]) => `<button type="button" class="${speed === v ? 'on' : ''}" data-speed="${v}">${l}</button>`).join('')}</div>`;

const revMax = () => (state.config.trial === 'cloister' ? 20 : REVELATION_MAX);

// 점괘 릴: 대사제가 헤아리는 동안 가능한 행동의 아이콘이 돈다 (0.7초 뒤에 나타난다)
const REEL_ICON = { food: 'i-food', wood: 'i-wood', stone: 'i-stone', faith: 'i-faith', pray: 'i-temple', build: 'i-house', explore: 'e-prophet', preach: 'd-peace', attack: 'd-war' };
function omenReel() {
  const kinds = [...new Set(legalActions(state, 'player').map((a) => (a.type === 'gather' ? a.gather : a.type)))].slice(0, 8);
  if (kinds.length < 2) return '';
  const icons = [...kinds, kinds[0]].map((k) => `<span>${svgUse(REEL_ICON[k] ?? 'i-faith')}</span>`).join('');
  return `<div class="omen-reel" style="--n:${kinds.length}"><div class="reel-strip">${icons}</div></div>`;
}

// 판정 승률 (저주 말투면 공격 +1을 미리 반영)
function oddsTag(a) {
  // 율법파가 이번 장에 그 칸에 성벽을 두른다고 예고했으면 그 성벽까지 셈한다 (건설이 공격보다 먼저 풀린다)
  const wallAhead = enemyIntent(state).some((x) => x.shown && x.build === 'wall' && x.tile === a.tile);
  const p = actionOdds(state, a, { curse: pending?.tone === 'curse', wallAhead });
  return p == null ? '' : `<span class="why odds ${p >= 0.5 ? 'good' : 'low'}" title="${t('ui.odds.tip')}">${Math.round(p * 100)}%</span>`;
}

// 선공: 율법파가 노리는 칸에 먼저 가면 막는다 (율법파 선공이면 빼앗긴다). 집 안 일(기도·신전·대성당·성벽)은 막지도 막히지도 않는다
const homeAct = (a) => a.type === 'pray' || (a.type === 'build' && ['temple', 'cathedral', 'wall'].includes(a.build));
function firstNote(a) {
  if (homeAct(a) || !enemyIntent(state).some((x) => x.shown && x.tile === a.tile && !homeAct(x))) return '';
  return state.first === 'player' ? `<span class="why first" title="${t('ui.first.blockTip')}">${t('ui.first.block')}</span>` : `<span class="why first bad" title="${t('ui.first.lostTip')}">${t('ui.first.lost')}</span>`;
}

function scoreTip(cur, side) {
  const b = scoreBreakdown(cur, side);
  const j = JUDGEMENTS[cur.judgement ?? 'classic'];
  return t('ui.scoreTip', { name: j.name, parts: b.parts.map((p) => `${p.label} ${p.n}×${p.w}${p.note ? ` (${p.note})` : ''}`).join(' · '), total: b.total });
}

// 율법 카드 뒷면: 이번 장 율법파의 뜻(난이도만큼만 보인다)
function lawBackHTML() {
  if (!state.round || state.winner) return `<div class="law-back"><div>${svgUse('s-tablet')}${t('ui.law.back')}</div></div>`;
  const all = enemyIntent(state);
  const shown = all.filter((a) => a.shown);
  const hidden = all.length - shown.length;
  const lines = shown.map((a) => `<li class="it-${a.type}">${esc(enemyLabel(a))}</li>`).join('');
  const notes = [
    state.lawGuard ? t('ui.law.guard', { n: Math.min(2, state.lawGuard) }) : '',
    state.rally ? t('ui.law.rally') : '',
    marchRange(state, 'enemy') ? t('ui.law.march', { n: marchRange(state, 'enemy') }) : '',
  ].filter(Boolean);
  return `<div class="law-back intent"><div class="kind">${t('ui.law.intent')}</div>
    <ul>${lines || `<li class="it-none">${t('ui.law.none')}</li>`}</ul>
    ${hidden ? `<div class="more">${t('ui.law.hidden', { n: hidden })}</div>` : ''}
    ${notes.length ? `<div class="law-notes">${notes.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}</div>`;
}

// 율법파 지도자의 말풍선 (적 매트 머리 위)
function leaderSay(text) { matSay('matEnemy', ENEMY_LEADERS[state.leader]?.name ?? t('ui.who.enemy'), text); }
// 우리 대사제의 말풍선 (우리 매트 머리 위)
function priestSay(text) { matSay('matPlayer', t('ui.priestName', { name: PRIESTS[state.priest]?.name ?? '' }), text, 'priest'); }
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

// 궁극 특전은 판 크기에 따라 깨어나는 장이 다르다
const perkText = (text) => t('ui.perk.withRound', { text, n: ultRound(state) });

function matHTML(cur, side) {
  const s = cur.sides[side];
  const mine = side === 'player';
  const cap = popCap(cur, side);
  const income = faithIncome(cur, side);
  const lowFaith = mine && s.faith <= RULES.lowFaith;
  const res = RES_KEYS.map((k) => {
    const faith = k === 'faith';
    const tip = faith ? ` title="${t('ui.mat.faithTip', { income, base: RULES.baseFaithIncome, per: RULES.followersPerFaith })}"` : '';
    const warn = faith && lowFaith ? ` low${s.faithless ? ' critical' : ''}` : '';
    const label = faith ? `${RESOURCE_NAME[k]} <em>+${income}</em>` : RESOURCE_NAME[k];
    return `
    <div class="res${warn}"${tip}><span class="coin" id="coin-${side}-${k}">${svgUse(`i-${k}`)}</span>
      <div>${num(`${side}.${k}`, s[k])}<div class="l">${label}</div></div></div>`;
  }).join('');
  const warnLine = !lowFaith ? '' : s.faithless
    ? `<div class="faith-warn critical">${t('ui.mat.faithCritical')}</div>`
    : `<div class="faith-warn">${t('ui.mat.faithLow')}</div>`;
  const away = Math.min(awayCount(side), s.pop);
  const meeples = Array.from({ length: Math.max(cap, s.pop) }, (_, i) => meepleSvg(side, i < away ? 'away' : i < s.pop ? '' : 'empty')).join('');
  const hearts = Array.from({ length: CAPITAL_HP }, (_, i) => svgUse('i-shield', i < s.capitalHp ? '' : 'lost')).join('');
  const temple = `${s.templeLevel}<small style="font-size:11px;opacity:.6">/${MAX_TEMPLE}</small>`;
  let extra = '';
  if (mine) {
    const d = s.doctrine;
    extra = `<div class="section-label"><span>${t('ui.mat.doctrine')}</span><span>${t('ui.mat.doctrineSub')}</span></div><div class="doctrine">${DOCTRINES.map((k) => {
      const info = DOCTRINE[k];
      const before = prevDoctrine[k] ?? d[k];
      const gems = Array.from({ length: DOCTRINE_MAX }, (_, i) =>
        `<span class="gem${i < d[k] ? ' on' : ''}${i >= before && i < d[k] ? ' new' : ''}${info.perks[i + 1] ? ' perk' : ''}${i + 1 === DOCTRINE_MAX ? ' ult' : ''}" title="${esc(perkText(info.perks[i + 1] ?? ''))}"></span>`).join('');
      prevDoctrine[k] = d[k];
      const next = Object.entries(info.perks).find(([lv]) => d[k] < Number(lv));
      const got = Object.entries(info.perks).filter(([lv]) => d[k] >= Number(lv)).map(([, t]) => t);
      const perk = got.length ? `<b>✓ ${esc(got.map(perkText).join(', '))}</b>${next ? ` · ${t('ui.mat.nextPerk', { lv: next[0], text: esc(perkText(next[1])) })}` : ''}` : next ? t('ui.mat.nextPerk', { lv: next[0], text: esc(perkText(next[1])) }) : '';
      const streak = cur.streak?.doctrine === k ? `<span class="streak" title="${t('ui.mat.streakTip')}">${t('ui.mat.streak', { dots: `${'●'.repeat(cur.streak.n)}${'○'.repeat(3 - cur.streak.n)}` })}</span>` : '';
      return `<div class="dtrack"><span class="medal">${svgUse(`d-${k}`)}</span><div class="row"><span class="nm">${info.name}</span>${gems}</div><div class="perk-text">${streak}${perk}</div></div>`;
    }).join('')}</div>`;
  }
  return `
    <div class="mat-head">
      <span class="crest">${mine ? svgUse('i-temple') : svgUse('s-tablet')}</span>
      <div><h2>${mine ? t('ui.tribe.player') : t('ui.tribe.enemy')}</h2><small${!mine && state.leader ? ` title="${esc(ENEMY_LEADERS[state.leader].desc)}"` : ''}>${mine ? t('ui.mat.playerSub') : state.leader ? `${esc(ENEMY_LEADERS[state.leader].name)} · ${esc(ENEMY_LEADERS[state.leader].title)}` : t('ui.mat.enemySub')}</small></div>
      <div class="score" title="${esc(scoreTip(cur, side))}">${num(`${side}.score`, score(cur, side))}<small><br>${t('ui.mat.score')}</small></div>
    </div>
    ${mine && (cur.commandments?.length || cur.saints?.length) ? `<div class="vows-row">${(cur.commandments ?? []).map((c) => `<span class="cmd" title="${esc(COMMANDMENTS[c].text)}">「${esc(COMMANDMENTS[c].name)}」</span>`).join('')}${(cur.saints ?? []).map((x) => `<span class="saint" title="${x.kind === 'preacher' ? t('ui.mat.saintPreacher') : t('ui.mat.saintGuard')}">✦ ${esc(x.name)}</span>`).join('')}</div>` : ''}
    ${mine && currentTask() ? `<div class="task-ribbon"><span>${t('ui.mat.task')}</span>${esc(currentTask().text)}<button class="task-x" type="button" title="${t('ui.mat.taskOff')}">✕</button></div>` : ''}
    <div class="res-grid${mine ? ' row4' : ' compact'}">${res}</div>${warnLine}
    ${!mine && cur.edictOn ? `<div class="edict-bar${s.edict >= edictMax(cur) - 2 ? ' danger' : ''}" title="${t('ui.mat.edictTip', { max: edictMax(cur) })}"><span>${t('ui.mat.edict')}</span><i><em style="width:${(s.edict / edictMax(cur)) * 100}%"></em></i><b>${s.edict}/${edictMax(cur)}</b></div>` : ''}
    <div class="section-label"><span>${t('ui.mat.pop')}</span><span title="${t('ui.mat.popTip', { over: s.pop > cap })}">${s.pop} <small class="cap">${t('ui.mat.cap', { cap })}</small></span></div>
    <div class="meeples">${meeples}</div>
    <div class="section-label"><span>${t('ui.mat.power')}</span></div>
    <div class="stats">
      <div class="stat" title="${t('ui.mat.actTip', { per: RULES.followersPerAction })}">${svgUse('i-hand')}<b>${num(`${side}.act`, actionLimit(cur, side))}</b><span class="sl">${t('ui.mat.act')}</span></div>
      <div class="stat">${svgUse('i-temple')}<b>${temple}</b><span class="sl">${t('ui.mat.temple')}</span></div>
      <div class="stat">${svgUse('i-house')}<b>${num(`${side}.vil`, villageCount(cur, side))}</b><span class="sl">${t('ui.mat.village')}</span></div>
      <div class="stat cap"><span class="hearts">${hearts}</span><span class="sl">${t('ui.mat.capital')}</span></div>
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
      <span class="cost${miracleCost(state, m) < m.cost ? ' cut' : ''}">${miracleCost(state, m)}</span>${miracleCost(state, m) < m.cost ? `<s class="was">${m.cost}</s>` : ''}${svgUse(MIRACLE_ART[m.id], 'art', '0 0 48 48')}<div class="nm">${m.name}</div>
      <span class="tip"><b>${m.name}</b> · ${t('ui.faithCost', { n: miracleCost(state, m) })}${state.wrath && !m.hidden && m.cost > miracleCost(state, m) - (state.miracleUses?.[m.id] ?? 0) ? t('ui.hand.wrath', { n: state.wrath, off: m.cost - (miracleCost(state, m) - (state.miracleUses?.[m.id] ?? 0)) }) : ''}${state.miracleUses?.[m.id] && !m.hidden ? t('ui.hand.reuse', { n: state.miracleUses[m.id] }) : ''}<br>${esc(m.text)}${state.miracleUsed ? `<br><i>${t('ui.hand.used')}</i>` : ''}</span>
    </button>`).join('')}</div>`;
  const noticeHTML = notice ? `<div class="notice">${esc(notice)}</div>` : '';
  let scroll = '';
  let act = '';

  if (phase === 'speak') {
    const cp = costPill(draft);
    const ban = state.bannedWords.length ? `<span class="ban-chip${cp.cls.banned ? ' hit' : ''}" title="${t('ui.ban.tip')}">${t('ui.ban.chip', { word: esc(state.bannedWords[0]) })}</span>` : '';
    const pt = state.petition;
    const petition = pt ? `<div class="petition" title="${pt.need ? t('ui.petition.tip') : ''}"><b>${esc(pt.from)}</b>${t('ui.quoted', { text: esc(pt.text) })}${pt.need ? `<span>${t('ui.petition.reward')}</span>` : ''}</div>` : '';
    const sacredNote = state.sacred && !state.stats.sacred ? `<div class="petition prophecy"><b>${t('ui.sacred.title')}</b>${t('ui.sacred.clue', { clue: esc(state.sacred.clue), n: state.sacred.word.length })}</div>` : '';
    const prophecyNote = state.prophecy ? `<div class="petition prophecy"><b>${t('ui.prophecy.title')}</b>${t('ui.prophecy.left', { name: esc(PROPHECY.kinds[state.prophecy.kind].name), n: state.prophecy.due - state.round + 1 })}</div>` : '';
    const ev = state.event;
    const dilemma = ev.choice ? `<div class="dilemma"><span class="dl-head">${t('ui.dilemma.head', { name: esc(ev.name) })}</span>${ev.choice.map((o) => `<button type="button" class="dl-opt${(state.dilemmaPick ?? ev.choice[0].id) === o.id ? ' on' : ''}" data-opt="${o.id}" title="${esc(o.text)}"><b>${esc(o.label)}</b><small>${esc(o.text)}</small></button>`).join('')}<span class="dl-note">${t('ui.dilemma.note')}</span></div>` : '';
    scroll = `<div class="scroll">
      ${petition}${prophecyNote}${sacredNote}${dilemma}<div class="suggest-row" id="suggestRow"></div>${noticeHTML}
      <div class="compose"><div class="scroll-head"><h3>${t('ui.compose.title')}</h3>${ban}<small>${t('ui.compose.sub', { n: state.round, acts: actionLimit(state, 'player') })}</small></div>
      <textarea maxlength="${revMax()}" rows="2" placeholder="${t('ui.compose.placeholder')}" aria-label="${t('ui.seal.label')}">${esc(draft)}</textarea>
      <div class="heard-line" id="heardLine" aria-live="polite">${heardHTML(draft)}</div>
      <div class="ink-meta"><span class="count">${draft.length} / ${revMax()}</span>
        <span class="cost-pill${Object.entries(cp.cls).filter(([, on]) => on).map(([k]) => ` ${k}`).join('')}" title="${cp.title}">${svgUse('i-faith')}<span class="c">${cp.label}</span></span></div></div></div>`;
    act = `<div class="act"><button class="seal-btn" type="button" title="${t('ui.seal.tip')}">${svgUse(SIGILS[state.config.god?.sigil] ?? 'i-faith')}<span>${t('ui.seal.label')}</span></button>
      <button class="text-btn silence" type="button">${t('ui.silence.btn')}</button></div>`;
  } else if (phase === 'thinking') {
    const pct = progress != null ? t('ui.thinking.download', { p: (progress * 100).toFixed(0) }) : '';
    scroll = `<div class="scroll"><div class="stamp-mark static">${svgUse('i-faith')}<span>${t('ui.seal.label')}</span></div><div class="thinking-box">
      <svg class="flame-svg" viewBox="0 0 40 60"><rect x="15" y="34" width="10" height="24" rx="2" fill="#efe4cd" stroke="#8a6a3e"/>
        <g class="fl"><path d="M20 6c4 7 8 11 8 18a8 8 0 0 1-16 0c0-7 4-11 8-18z" fill="#ffb347"/><path d="M20 16c2 4 4 6 4 9a4 4 0 0 1-8 0c0-3 2-5 4-9z" fill="#fff3c4"/></g></svg>
      <div><div class="t">${t('ui.thinking.title')}</div><div class="dots" style="font:15px var(--font-body);color:var(--ink-soft)">${t('ui.thinking.sub')}${pct}</div></div>
      ${aiMode === 'llm' && !fx.motion.reduced && speed !== 'instant' ? omenReel() : ''}
    </div></div>`;
    act = `<div class="act"><button class="seal-btn" type="button" disabled>${svgUse('i-faith')}<span>${t('ui.seal.label')}</span></button></div>`;
  } else if (phase === 'confirm') {
    const { text, result, accepted, rejected, auto } = pending;
    const fresh = pending.fresh;
    const source = result.source;
    const src = { llm: 'LLM', tablet: t('ui.ai.tablet'), silence: t('ui.src.silence') }[result.source];
    const doc = result.doctrine ? ` · ${DOCTRINE[result.doctrine].name}` : '';
    const short = (a) => esc(actionLabel(a));
    const links = pending.links ?? {};
    const prev = previewGains(state, [...accepted, ...auto]);
    {
      const extra = { food: 0, wood: 0, stone: 0, faith: 0 };
      if (text && pending.tone === 'blessing' && [...accepted, ...auto].some((a) => a.type === 'gather')) extra[[...accepted, ...auto].find((a) => a.type === 'gather').gather] += 1;
      if (text && pending.tone === 'curse') extra.faith -= 1;
      const mi = pending.miracle && !pending.dropped.has(pending.miracle.key) ? pending.miracle : null;
      if (mi) {
        extra.faith -= mi.cost;
        const g = { rain: { food: 3 }, manna: { food: 4 }, bounty: { wood: 2, stone: 2 } }[mi.id] ?? {};
        for (const [k, v] of Object.entries(g)) extra[k] += v;
      }
      const dl = state.event.choice?.find((o) => o.id === (pending.dilemma ?? state.dilemmaPick ?? state.event.choice[0].id));
      for (const [k, v] of Object.entries(dl?.gain ?? {})) extra[k] += v;
      for (const k of Object.keys(extra)) prev.after[k] = Math.max(0, prev.after[k] + extra[k]);
    }
    const chips = [
      ...accepted.map((a, i) => `<span class="order" data-key="${esc(a.key)}" title="${esc(a.text)}">${meepleSvg('player')}<span class="num">${i + 1}</span><span class="t">${short(a)}</span>${links[a.key] ? `<span class="word">← '${esc(links[a.key])}'</span>` : ''}${prev.per[a.key] ? `<span class="why gain">${prev.per[a.key]}</span>` : ''}${oddsTag(a)}${firstNote(a)}${moveChoices(a.key).length ? `<button class="chip-move${targeting?.move === a.key ? ' on' : ''}" type="button" data-move="${esc(a.key)}" title="${t('ui.move.tip')}" aria-label="${t('ui.move.tip')}">⇄</button>` : ''}</span>`),
      ...auto.map((a) => `<span class="order auto${a.heeded ? ' heeded' : ''}" title="${esc(a.heeded ? t('ui.chip.heededTip', { text: a.text }) : a.text)}">${meepleSvg('player')}<span class="t">${short(a)}</span>${prev.per[a.key] ? `<span class="why gain">${prev.per[a.key]}</span>` : ''}<span class="why" style="background:rgba(124,89,27,.12)">${a.heeded ? t('ui.chip.heeded') : t('ui.chip.auto')}</span></span>`),
      ...(pending.miracle ? [`<span class="order miracle${pending.dropped.has(pending.miracle.key) ? ' dropped' : ''}" data-key="${pending.miracle.key}" title="${t('ui.chip.toggleTip')}">${svgUse(MIRACLE_ART[pending.miracle.id], 'mi', '0 0 48 48')}<span class="t">${esc(MIRACLES.find((m) => m.id === pending.miracle.id).name)}${pending.miracle.target ? ` → ${esc(tileName(state, state.tileAt[pending.miracle.target]))}` : ''}</span><span class="why">${t('ui.chip.miracle', { n: pending.miracle.cost })}</span></span>`] : []),
      ...[...pending.dropped].map((k) => result.orders.find((a) => a.key === k)).filter(Boolean).map((a) => `<span class="order dropped" data-key="${esc(a.key)}" title="${t('ui.chip.restoreTip')}">${meepleSvg('player')}<span class="t">${short(a)}</span><span class="why">${t('ui.chip.dropped')}</span></span>`),
      ...rejected.map((r) => `<span class="order bad"><span class="t">${short(r.action)}</span><span class="why">${esc(r.reason)}</span></span>`),
      ...result.forbidden.map((a) => `<span class="order forbid">⊘ <span class="t">${short(a)}</span><span class="why" style="background:rgba(40,20,10,.12)">${['attack', 'preach'].includes(a.type) ? t('ui.chip.vow') : t('ui.chip.forbidden')}</span></span>`),
    ].join('');
    const legal = legalActions(state, 'player');
    const hint = result.doctrine === 'war' && !legal.some((a) => a.type === 'attack')
      ? t('ui.hint.noWarTarget')
      : result.doctrine === 'peace' && !legal.some((a) => a.type === 'preach') && KW_PREACH.test(text ?? '')
        ? t('ui.hint.noPreachTarget') : null;
    const tags = [];
    // 은총은 장당 하나: 서원 > 청원 > 이름 순으로 첫 하나만 '은총'이라 적는다
    let graceShown = result.forbidden.some((a) => ['attack', 'preach'].includes(a.type));
    const grace = () => { if (graceShown) return ''; graceShown = true; return t('ui.tag.grace'); };
    if (text && pending.tone !== 'command') tags.push(`<span class="wtag tone-${pending.tone}" title="${esc(TONES[pending.tone].text)}">${t('ui.tag.tone', { name: TONES[pending.tone].name, text: esc(TONES[pending.tone].text) })}</span>`);
    if (pending.answered) tags.push(`<span class="wtag ok">${t('ui.tag.answered', { from: esc(state.petition.from), grace: grace() })}</span>`);
    if (pending.naming) tags.push(`<span class="wtag name">${t('ui.tag.naming', { name: esc(pending.naming.name) })}</span>`);
    if (pending.dilemma) tags.push(`<span class="wtag ok">${t('ui.tag.dilemma', { label: esc(state.event.choice.find((o) => o.id === pending.dilemma).label) })}</span>`);

    const opp = result.doctrine && unlocked(state, 4) ? OPPOSED[result.doctrine] : null;
    if (opp && state.sides.player.doctrine[opp] > [6, 4, 2, 0].find((f) => state.sides.player.doctrine[opp] >= f)) tags.push(`<span class="wtag tone-curse">${DOCTRINE[opp].name} -1</span>`);
    const st = state.streak;
    if (result.doctrine && st?.doctrine === result.doctrine && st.n === 2) tags.push(`<span class="wtag ok">${t('ui.tag.streak', { name: DOCTRINE[result.doctrine].name })}</span>`);
    const carve = pending.command ? `<label class="seal-prophecy carve"><input type="checkbox" class="carve-box" ${pending.carve ? 'checked' : ''}>
      ${t('ui.carve', { name: esc(COMMANDMENTS[pending.command].name), text: esc(COMMANDMENTS[pending.command].text) })}</label>` : '';
    const seal = pending.prophecy ? `<label class="seal-prophecy"><input type="checkbox" class="prophecy-box" ${pending.seal ? 'checked' : ''}>
      ${t('ui.sealProphecy', { name: esc(PROPHECY.kinds[pending.prophecy.kind].name), n: pending.prophecy.rounds, reward: PROPHECY.reward[pending.prophecy.rounds], penalty: PROPHECY.penalty })}</label>` : '';
    const priest = source === 'silence' ? '' : `${esc(PRIESTS[state.priest]?.name ?? t('ui.priest'))}`;
    scroll = `<div class="scroll">
      <div class="scroll-head"><h3>${t('ui.confirm.title')}</h3><small>${priest ? `${priest} · ` : ''}${src}${result.ms ? ` · ${t('ui.secs', { s: (result.ms / 1000).toFixed(1) })}` : ''}${doc}</small></div>
      ${text ? `<div class="rev-line">${t('ui.quoted', { text: markWords(text, Object.values(links)) })}</div>` : ''}
      ${tags.length ? `<div class="wtags">${tags.join('')}</div>` : ''}
      <div class="quote${voiceOf(state) ? ` voice-${voiceOf(state)}` : ''}" title="${esc(result.interpretation)}">${fresh ? '' : esc(result.interpretation)}</div>
      <div class="orders">${chips}</div>
      ${text || auto.length ? `<div class="preview" title="${t('ui.preview.tip')}">${t('ui.preview.head')}${['food', 'wood', 'stone', 'faith'].map((k) => `${RESOURCE_NAME[k]} ${p[k]}→<b class="${prev.after[k] > p[k] ? 'up' : prev.after[k] < p[k] ? 'down' : ''}">${prev.after[k]}</b>`).join(' · ')}</div>` : ''}${seal}${carve}
      ${hint ? `<div class="hint">⚠ ${hint}</div>` : ''}${noticeHTML}</div>`;
    act = `<div class="act">
      <button class="btn-primary big accept" type="button" ${fresh ? 'disabled' : ''}>${t('ui.btn.accept')} <kbd>Enter</kbd></button>
      ${aiMode !== 'llm' ? '' : `<button class="btn-ghost again" type="button" ${!text || state.reinterpretUsed || p.faith < 1 ? 'disabled' : ''}>${t('ui.btn.again')} <kbd>R</kbd></button>`}
      ${pending.prev ? `<button class="text-btn swap-reading" type="button">${t('ui.btn.swap')}</button>` : ''}
      ${text && speakSnap && !state.reinterpretUsed && !state.tutorial ? `<button class="text-btn retract" type="button">${t('ui.btn.retract')} <kbd>Esc</kbd></button>` : ''}</div>`;
  } else {
    const shown = phase === 'playing' ? resolved.shown : resolved.logs;
    const plan = resolved.enemyPlan.map((a) => enemyLabel(a)).join(', ') || t('ui.resolve.noPlan');
    const v = phase !== 'playing' ? resolved.verdict : null;
    scroll = `<div class="scroll">
      <div class="scroll-head"><h3>${t('ui.resolve.title')}</h3><small>${t('ui.resolve.law', { name: esc(state.lawCard.name) })}</small></div>
      <div class="law-line">${t('ui.resolve.plan', { plan: esc(plan) })}</div>
      <div class="chron">${mergeBlocked(shown).map((l, i, arr) => logLine(l, phase === 'playing' && i === arr.length - 1)).join('')}</div>
      ${v ? `<div class="verdict v-${v.grade}"><span class="v-stamp">${v.stamp}</span><span class="v-text">${esc(v.text)}</span></div>` : ''}
      ${phase === 'playing' ? '' : ledgerHTML(resolved.ledger)}</div>`;
    act = phase === 'playing'
      ? `<div class="act">${speedHTML()}<button class="btn-ghost skip" type="button">${t('ui.btn.skip')} <kbd>Space</kbd></button></div>`
      : phase === 'over'
        ? `<div class="act"><button class="btn-primary big again-game" type="button">${t('ui.btn.againGame')}</button><div style="text-align:center;font:13px var(--font-body);color:var(--on-table-dim)">${esc(state.winReason)}</div></div>`
        : `<div class="act">${speedHTML()}<button class="btn-primary big next" type="button">${t('ui.btn.next')} <kbd>Enter</kbd></button></div>`;
  }

  altar.innerHTML = `${hand}<div class="scroll-wrap">${scroll}</div>${act}`;
  altar.dataset.phase = phase;
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
function markWords(text, words) {
  const list = [...new Set(words)].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return esc(text);
  const re = new RegExp(list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const done = new Set();
  let out = '';
  let last = 0;
  for (const m of text.matchAll(re)) {
    out += esc(text.slice(last, m.index));
    out += done.has(m[0]) ? esc(m[0]) : `<u class="lw" data-w="${esc(m[0])}">${esc(m[0])}</u>`;
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

// 계시 비용 알약: 되풀이면 되풀이를, 아니면 비용만 적는다 (그리기와 입력 갱신이 같은 값을 쓴다)
function costPill(text) {
  const d = text.trim();
  const cost = d ? revelationCostFor(state, text) : 0;
  const echo = isEcho(state, d);
  const banned = state.bannedWords.some((w) => text.includes(w));
  const cls = { over: cost > state.sides.player.faith, echo, banned };
  const label = echo ? t('ui.faithCostEcho', { n: cost }) : t('ui.faithCost', { n: cost });
  return { cost, cls, label, title: echo ? t('ui.echo.tip') : '' };
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
      count.textContent = `${draft.length} / ${revMax()}`;
      const cp = costPill(draft);
      for (const [k, on] of Object.entries(cp.cls)) pill.classList.toggle(k, on);
      a.querySelector('.ban-chip')?.classList.toggle('hit', cp.cls.banned);
      pill.title = cp.title;
      pill.querySelector('.c').textContent = cp.label;
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
  a.querySelectorAll('.dl-opt').forEach((b) => {
    b.onclick = () => { if (phase !== 'speak') return; state.dilemmaPick = b.dataset.opt; meta.saveGame(state, 'speak'); sfx.click(); a.querySelectorAll('.dl-opt').forEach((x) => x.classList.toggle('on', x === b)); };
  });
  // 확인 칩을 눌러 그 행동을 빼거나 되살린다 (장당 두 개까지, 빈 자리는 신도들이 알아서). ⇄는 같은 일을 다른 칸으로 옮긴다
  if (phase === 'confirm' && pending) {
    a.querySelectorAll('.chip-move').forEach((b) => {
      b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); b.click(); } };
      b.onclick = (e) => {
        e.stopPropagation();
        if (pending.incoming || a.querySelector('.accept')?.disabled) return;
        targeting = targeting?.move === b.dataset.move ? null : { move: b.dataset.move };
        notice = targeting ? t('ui.notice.pickMove') : '';
        sfx.click();
        renderBoardView();
        renderAltar();
      };
    });
    a.querySelectorAll('.order[data-key]').forEach((c) => {
      // 키보드로도 칩을 빼고 되살린다 (Tab으로 옮겨 Enter·Space)
      c.setAttribute('role', 'button');
      c.tabIndex = 0;
      c.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); e.stopPropagation(); c.click(); } };
      c.onclick = () => {
        // 해석문이 다 나오고 수락 버튼이 켜진 뒤에만
        if (pending.incoming || a.querySelector('.accept')?.disabled) return;
        const k = c.dataset.key;
        if (pending.dropped.has(k)) pending.dropped.delete(k);
        else if (pending.dropped.size < 2) pending.dropped.add(k);
        else { notice = t('ui.notice.dropLimit'); renderAltar(); return; }
        notice = '';
        sfx.lift();
        derivePending();
        renderBoardView();
        renderAltar();
      };
    });
  }
  const cbox = a.querySelector('.carve-box');
  if (cbox) cbox.onchange = () => { pending.carve = cbox.checked; sfx.seal?.(); cbox.blur(); };
  const pbox = a.querySelector('.prophecy-box');
  if (pbox) pbox.onchange = () => { pending.seal = pbox.checked; sfx.seal?.(); pbox.blur(); };
  on('.again', () => { sfx.click(); reinterpret(); });
  on('.swap-reading', swapReading);
  on('.retract', retract);
  on('.skip', () => { fx.motion.skip = true; });
  a.querySelectorAll('[data-speed]').forEach((b) => {
    b.onclick = () => {
      speed = b.dataset.speed;
      meta.set('gsg.speed', speed);
      fx.motion.speed = speed === '2' ? 2 : 1;
      if (speed === 'instant') fx.motion.skip = true;
      a.querySelectorAll('[data-speed]').forEach((x) => x.classList.toggle('on', x === b));
      sfx.click();
    };
  });
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
  const byNeed = { food: t('ui.suggest.food'), wood: t('ui.suggest.wood'), wall: t('ui.suggest.wall'), village: t('ui.suggest.village'), pray: t('ui.suggest.pray'), explore: t('ui.suggest.explore') };
  if (need) out.push(byNeed[need.gather ?? need.build ?? need.type]);
  if (enemyIntent(state).some((a) => a.shown && a.type === 'attack')) out.push(byNeed.wall);
  if (state.sides.player.faith <= RULES.lowFaith) out.push(byNeed.pray);
  out.push(byNeed.village, byNeed.explore, t('ui.suggest.preach'));
  return [...new Set(out.filter(Boolean))]
    .filter((s) => !state.bannedWords.some((w) => s.includes(w)) && interpretWithTablet(state, s).orders.length)
    .slice(0, 2);
}
function showSuggest() {
  const row = $('suggestRow');
  if (!row || phase !== 'speak' || draft.trim()) return;
  const list = suggestions();
  if (!list.length) return;
  row.innerHTML = `<span class="sg-label">${t('ui.suggest.label')}</span>${list.map((s) => `<button type="button" class="sg-chip">${esc(s)}</button>`).join('')}<button type="button" class="sg-off" title="${t('ui.suggest.off')}">✕</button>`;
  row.classList.add('show');
  row.querySelectorAll('.sg-chip').forEach((b) => { b.onclick = () => typeInto(b.textContent); });
  row.querySelector('.sg-off').onclick = () => { meta.set('gsg.suggest', false); row.classList.remove('show'); row.innerHTML = ''; sfx.click(); };
}
let typeToken = null;
async function typeInto(text) {
  const token = (typeToken = Symbol('type'));
  $('suggestRow')?.classList.remove('show');
  draft = '';
  for (const ch of text) {
    const ta = document.querySelector('.scroll textarea');
    if (typeToken !== token || !ta || phase !== 'speak') return;
    draft += ch;
    ta.value = draft;
    if (ch.trim()) sfx.type();
    await fx.wait(28);
  }
  const ta = document.querySelector('.scroll textarea');
  if (typeToken !== token || !ta) return;
  ta.dispatchEvent(new Event('input'));
  ta.focus();
}

// 알아들은 말: 계시를 쓰는 동안 석판이 알아들은 낱말과 그 일을 보여 준다 (LLM 모드에서는 '예감')
function heardHTML(text) {
  if (!text?.trim()) return '';
  const r = interpretWithTablet(state, text.trim());
  const links = linkWords(state, text, r.orders);
  // 금한 일·못 한 일도 함께 보인다 (금지만 있는 계시도 알아들은 것이다)
  const fk = r.forbidden.length ? [...new Set(r.forbidden.map(kindName))] : (r.banned ?? []).map((k) => t('ui.heard.kindWord', { k }));
  const forbid = fk.length ? ` <span class="heard-no">${t('ui.heard.forbid', { kinds: fk })}</span>` : '';
  if (r.orders.length) {
    const parts = r.orders.map((a) => (links[a.key] ? t('ui.heard.pair', { word: esc(links[a.key]), kind: kindName(a) }) : kindName(a)));
    const also = r.heard?.length ? ` <span class="heard-no">${t('ui.heard.also', { kinds: r.heard })}</span>` : '';
    return `${t(aiMode === 'llm' ? 'ui.heard.guess' : 'ui.heard.label')} ${parts.join(' · ')}${also}${forbid}`;
  }
  if (r.heard?.length) return t('ui.heard.cannot', { kinds: r.heard }) + forbid;
  if (forbid) return `${t(aiMode === 'llm' ? 'ui.heard.guess' : 'ui.heard.label')}${forbid}`;
  return t('ui.heard.none');
}
const kindName = (a) => t('ui.heard.kind', { type: a.type, build: a.build, res: a.gather ? RESOURCE_NAME[a.gather] : '' });

// 계시를 쓰는 동안 석판 해석으로 말씀이 닿을 칸을 미리 흐리게 비춘다 (LLM의 결정과는 다를 수 있는 '예감')
function scheduleHints() {
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    if (phase !== 'speak') return;
    const text = draft.trim();
    const line = $('heardLine');
    if (line) line.innerHTML = heardHTML(text);
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
  if (e.altKey && /^[1-5]$/.test(e.key) && phase === 'speak') {
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
// 우리 신도의 행동을 짧게: "선교 · 율법파 마을 A2" (자세한 문장은 칩의 툴팁)
function actionLabel(a) {
  const place = tileName(state, state.tileAt[a.tile], 'player').replace(/\(([A-I]\d+)\)$/, ' $1');
  const what = {
    gather: t('ui.act.gather', { res: RESOURCE_NAME[a.gather] }), pray: t('ui.act.pray'), preach: t('ui.act.preach'), attack: t('ui.act.attack'), explore: t('ui.act.explore'),
    build: { village: t('ui.act.village'), wall: t('ui.act.wall'), temple: t('ui.act.temple'), cathedral: t('ui.act.cathedral') }[a.build],
  }[a.type];
  return a.type === 'pray' || a.build === 'temple' || a.build === 'cathedral' ? what : `${what} · ${place}`;
}

// "식량 채집 · 율법파 마을 A2" (괄호를 겹치지 않는다). placeOnly/whatOnly로 반쪽만
function enemyLabel(a, part = 'both') {
  const place = tileName(state, state.tileAt[a.tile], 'player').replace(/\(([A-I]\d+)\)$/, ' $1');
  const what = {
    gather: t('ui.enemyAct.gather', { res: RESOURCE_NAME[a.gather] }), pray: t('ui.enemyAct.pray'), preach: t('ui.enemyAct.preach'), attack: t('ui.enemyAct.attack'), explore: t('ui.enemyAct.explore'),
    build: { village: t('ui.enemyAct.village'), wall: t('ui.enemyAct.wall'), temple: t('ui.enemyAct.temple'), cathedral: t('ui.enemyAct.cathedral') }[a.build],
  }[a.type];
  return part === 'what' ? what : part === 'place' ? place : `${what} · ${place}`;
}

function logLine(l, fresh = false) {
  const dice = l.dice ? `<span class="dice">🎲 ${t('ui.dice.vs', { a: `${l.dice.attacker}${l.dice.attackerBonus ? `+${l.dice.attackerBonus}` : ''}`, d: `${l.dice.defender}${l.dice.defenderBonus ? `+${l.dice.defenderBonus}` : ''}` })}</span>` : '';
  return `<p class="${l.side}${fresh ? ' appear' : ''}">${esc(l.text)}${dice}</p>`;
}

function renderChron() {
  const byRound = new Map();
  for (const l of state.log) {
    if (!byRound.has(l.round)) byRound.set(l.round, []);
    byRound.get(l.round).push(l);
  }
  const notes = state.lessons.length ? `<div class="ch">${t('ui.chron.notes')}</div>${state.lessons.map((l, i) => `<p class="note">'${esc(l.word)}' → ${esc(describeLesson(l))} <button class="text-btn forget" data-i="${i}" type="button">${t('ui.chron.forget')}</button></p>`).join('')}` : '';
  $('chronBody').innerHTML = notes + [...byRound.entries()].reverse()
    .map(([round, lines]) => `<div class="ch">${t('ui.roundTitle', { n: round })}</div>${lines.map((l) => logLine(l)).join('')}`).join('')
    || `<p style="color:var(--ink-faint)">${t('ui.noRecords')}</p>`;
  $('chronBody').querySelectorAll('.forget').forEach((b) => { b.onclick = () => { state.lessons.splice(Number(b.dataset.i), 1); sfx.page(); renderChron(); }; });
}

// ?debug 이면 콘솔에서 상태를 만질 수 있게 한다 (연출 시험용)
if (new URLSearchParams(location.search).has('debug')) {
  import('./sound.js').then((snd) => { window.__gsg.levels = snd.levels; window.__gsg.music = snd.music; });
  import('./engine.js').then((eng) => { window.__gsg.engine = eng; });
  window.__gsg = { get state() { return state; }, render: () => render(), showMiracleDraft: () => showMiracleDraft(), showSiteChoice: () => showSiteChoice(), finishGame: () => finishGame() };
}

init();
