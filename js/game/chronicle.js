// 판이 끝난 뒤의 이야기: 판 요약(서고), 후대 역사가의 에필로그, 성서(업적), 회고
// 모두 상태를 읽기만 하는 순수 함수다.
import { DOCTRINES, DOCTRINE, DIFFICULTY, ENEMY_LEADERS, RULESET } from './data.js';
import { score } from './engine.js';
import { hashPick } from './lore.js';
import { t } from './i18n.js';

// 승리·패배 유형
// state.winKind(엔진이 정한 원인)으로 가른다 — 표시 문구는 읽지 않는다
export function outcomeKind(state) {
  if (state.winner === 'draw') return 'draw';
  const mine = state.winner === 'player';
  switch (state.winKind) {
    case 'doom': case 'capital': // 'doom'은 옛 기록(심판의 날) return mine ? 'conquest' : 'conquered';
    case 'cathedral': return mine ? 'cathedral' : 'lost';
    case 'faith': case 'convertAll': return mine ? 'faith' : 'lost';
    case 'extinct': return 'extinct';
    case 'edict': return mine ? 'score' : 'edict';
    default: return mine ? 'score' : 'outscored';
  }
}

// 가장 많이 쌓은 교리
export function topDoctrine(state) {
  const d = state.sides.player.doctrine;
  return DOCTRINES.reduce((best, k) => (d[k] > d[best] ? k : best), 'wisdom');
}

// 장별 승점 변화가 가장 컸던 계시들
export function topRevelations(state, n = 3) {
  const h = state.history;
  return h.map((x, i) => {
    const prev = h[i - 1] ?? { ps: h[0]?.ps ?? 0, es: h[0]?.es ?? 0 };
    return { round: x.round, text: x.text, gain: x.ps - prev.ps - (x.es - prev.es), verdict: x.verdict };
  }).filter((x) => x.text).sort((a, b) => b.gain - a.gain).slice(0, n);
}

// 결정적 장면: 수도 타격 5, 점령·마을 개종 3, 개종 2, 기적 2
export function decisiveScene(state) {
  let best = null;
  for (const l of state.log) {
    const f = l.fx;
    if (!f || (l.side !== 'player' && l.side !== 'enemy')) continue;
    const w = f.capital ? 5 : f.capture || f.convert ? 3 : f.kind === 'preach' && l.dice?.win ? 2 : ['lightning', 'rain', 'bounty', 'bless'].includes(f.kind) ? 2 : 0;
    if (w && (!best || w >= best.w)) best = { w, round: l.round, text: l.text, side: l.side };
  }
  if (!best) return null;
  const rev = state.revelations.find((r) => r.round === best.round);
  return { ...best, revelation: rev?.text ?? null };
}

// 주사위 운: 우리 쪽 판정의 기대 승률 합과 실제 승리 수의 차이
const P_WIN = (() => {
  const t = {};
  for (let d = -8; d <= 8; d++) {
    let w = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + d > b) w++;
    t[d] = w / 36;
  }
  return t;
})();
export function diceLuck(state) {
  let exp = 0; let act = 0; let n = 0;
  for (const l of state.log) {
    if (!l.dice || l.side !== 'player') continue;
    exp += P_WIN[Math.max(-8, Math.min(8, l.dice.attackerBonus - l.dice.defenderBonus))];
    act += l.dice.win ? 1 : 0; n += 1;
  }
  return { n, luck: act - exp };
}

// ---------- 에필로그: 후대 역사가의 기록 ----------
const EPITHET = Object.fromEntries(DOCTRINES.map((d) => [d, t(`story.epithet.${d}`)]));
const WIN_TEXT = Object.fromEntries(['conquest', 'faith', 'cathedral', 'score'].map((k) => [k, Object.fromEntries(DOCTRINES.map((d) => [d, t(`story.win.${k}.${d}`)]))]));
const LOSE_TEXT = Object.fromEntries(['conquered', 'lost', 'outscored', 'extinct', 'draw', 'edict'].map((k) => [k, t(`story.lose.${k}`)]));
export function epilogue(state) {
  const kind = outcomeKind(state);
  const top = topDoctrine(state);
  const won = state.winner === 'player';
  const body = won ? WIN_TEXT[kind]?.[top] ?? WIN_TEXT.score[top] : LOSE_TEXT[kind] ?? LOSE_TEXT.lost;
  const best = topRevelations(state, 1)[0];
  const epithet = won ? EPITHET[top] : hashPick(t('story.forgottenEpithets'), state.config.seed, kind);
  return {
    title: won ? `${epithetTitle(kind)}` : t('story.title.lost'),
    body, epithet,
    quote: best?.text ? t('story.quote', { text: best.text, round: best.round }) : null,
  };
}
const epithetTitle = (kind) => t(['conquest', 'faith', 'cathedral', 'score'].includes(kind) ? `story.title.${kind}` : 'story.title.win');

// ---------- 판 요약 (서고에 남는다) ----------
export function summarizeGame(state, extra = {}) {
  const ep = epilogue(state);
  return {
    date: new Date().toISOString(), seed: state.config.seed, size: state.rows, difficulty: state.config.difficulty,
    leader: state.leader ? ENEMY_LEADERS[state.leader].name : null, daily: state.config.daily ?? null,
    winner: state.winner, kind: outcomeKind(state), reason: state.winReason,
    score: [score(state, 'player'), score(state, 'enemy')], rounds: state.round,
    doctrine: { ...state.sides.player.doctrine }, top: topDoctrine(state), epithet: ep.epithet,
    revelations: state.revelations.map((r) => ({ round: r.round, text: r.text, doctrine: r.doctrine })),
    stats: { ...state.stats }, names: Object.values(state.names ?? {}), god: state.config.god?.name ?? null,
    saints: state.saints?.length ?? 0, commandments: state.commandments?.length ?? 0,
    ruleset: RULESET, trial: state.config.trial ?? null, ascension: state.config.ascension ?? 0, ...extra,
  };
}

// ---------- 성서 (업적) ----------
const won = (st) => st.winner === 'player';
export const ACHIEVEMENTS = [
  { id: 'first_win', name: t('story.ach.first_win.name'), desc: t('story.ach.first_win.desc'), check: (s) => won(s) },
  { id: 'faith_win', name: t('story.ach.faith_win.name'), desc: t('story.ach.faith_win.desc'), check: (s) => won(s) && s.kind === 'faith' },
  { id: 'conquest', name: t('story.ach.conquest.name'), desc: t('story.ach.conquest.desc'), check: (s) => won(s) && s.kind === 'conquest' },
  { id: 'cathedral', name: t('story.ach.cathedral.name'), desc: t('story.ach.cathedral.desc'), check: (s) => won(s) && s.kind === 'cathedral' },
  { id: 'pacifist', name: t('story.ach.pacifist.name'), desc: t('story.ach.pacifist.desc'), check: (s) => won(s) && s.doctrine.war === 0 },
  { id: 'no_miracle', name: t('story.ach.no_miracle.name'), desc: t('story.ach.no_miracle.desc'), check: (s) => won(s) && s.stats.miracles === 0 },
  { id: 'hard', name: t('story.ach.hard.name'), desc: t('story.ach.hard.desc'), check: (s) => won(s) && s.difficulty === 'hard' },
  { id: 'big', name: t('story.ach.big.name'), desc: t('story.ach.big.desc'), check: (s) => won(s) && s.size === 7 },
  { id: 'prophet', name: t('story.ach.prophet.name'), desc: t('story.ach.prophet.desc'), check: (s) => s.stats.prophecies >= 1, progress: (s) => s.stats.prophecies },
  { id: 'seer', name: t('story.ach.seer.name'), desc: t('story.ach.seer.desc'), check: (s) => s.stats.prophecies >= 3, progress: (s) => s.stats.prophecies / 3 },
  { id: 'namer', name: t('story.ach.namer.name'), desc: t('story.ach.namer.desc'), check: (s) => s.names.length >= 3, progress: (s) => s.names.length / 3 },
  { id: 'shepherd', name: t('story.ach.shepherd.name'), desc: t('story.ach.shepherd.desc'), check: (s) => s.stats.petitions >= 6, progress: (s) => s.stats.petitions / 6 },
  { id: 'turned', name: t('story.ach.turned.name'), desc: t('story.ach.turned.desc'), check: (s) => (s.stats.turned ?? 0) >= 1 },
  { id: 'ultimate', name: t('story.ach.ultimate.name'), desc: t('story.ach.ultimate.desc'), check: (s) => DOCTRINES.some((k) => s.doctrine[k] >= 6), progress: (s) => Math.max(...DOCTRINES.map((k) => s.doctrine[k])) / 6 },
  { id: 'terse', name: t('story.ach.terse.name'), desc: t('story.ach.terse.desc'), check: (s) => won(s) && s.revelations.length >= 6 && s.revelations.every((r) => r.text.replace(/\s/g, '').length <= 10) },
  { id: 'comeback', name: t('story.ach.comeback.name'), desc: t('story.ach.comeback.desc'), check: (s) => won(s) && s.comeback },
  { id: 'fortress', name: t('story.ach.fortress.name'), desc: t('story.ach.fortress.desc'), check: (s) => won(s) && s.capitalFull },
  { id: 'daily', name: t('story.ach.daily.name'), desc: t('story.ach.daily.desc'), check: (s) => !!s.daily },
  { id: 'all_doctrines', name: t('story.ach.all_doctrines.name'), desc: t('story.ach.all_doctrines.desc'), check: (s) => DOCTRINES.every((k) => s.doctrine[k] >= 2), progress: (s) => DOCTRINES.filter((k) => s.doctrine[k] >= 2).length / 4 },
  { id: 'tutorial', name: t('story.ach.tutorial.name'), desc: t('story.ach.tutorial.desc'), check: (s) => s.tutorial === true },
  { id: 'trial', name: t('story.ach.trial.name'), desc: t('story.ach.trial.desc'), check: (s) => s.winner === 'player' && !!s.trial },
  { id: 'ascend', name: t('story.ach.ascend.name'), desc: t('story.ach.ascend.desc'), check: (s) => s.winner === 'player' && s.ascension >= 1 },
  { id: 'sacred', name: t('story.ach.sacred.name'), desc: t('story.ach.sacred.desc'), check: (s) => !!s.stats.sacred },
  { id: 'saint', name: t('story.ach.saint.name'), desc: t('story.ach.saint.desc'), check: (s) => (s.saints ?? 0) >= 1 },
  { id: 'lawgiver', name: t('story.ach.lawgiver.name'), desc: t('story.ach.lawgiver.desc'), check: (s) => s.winner === 'player' && (s.commandments ?? 0) >= 1 },
];
export function evaluateAchievements(summary) {
  return ACHIEVEMENTS.filter((a) => { try { return a.check(summary); } catch { return false; } }).map((a) => a.id);
}
// 아직 못 딴 것 중 이번 판에 가장 가까웠던 것
export function closestAchievement(summary, have) {
  let best = null;
  for (const a of ACHIEVEMENTS) {
    if (have[a.id] || !a.progress) continue;
    const p = Math.min(0.99, a.progress(summary) || 0);
    if (p > 0 && (!best || p > best.p)) best = { a, p };
  }
  return best;
}

export const difficultyName = (d) => DIFFICULTY[d]?.name ?? d;
export const doctrineName = (d) => DOCTRINE[d]?.name ?? '';
