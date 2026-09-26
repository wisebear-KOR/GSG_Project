// 판 밖에 남는 것들: 이어하기 저장, 판 기록(서고), 업적, 오늘의 계시, 정경, 세라의 과제.
// 브라우저 저장소(localStorage)만 쓴다. 저장소가 막혀 있어도 게임은 돌아가야 하므로 모든 접근을 감싼다.
import { serializeState, hydrateState, SAVE_VERSION } from './engine.js';
import { RULESET } from './data.js';

export function get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
export function set(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장소가 가득 찼거나 막혔다 */ }
}
function remove(key) { try { localStorage.removeItem(key); } catch { /* 무시 */ } }

// ---------- 이어하기 ----------
const SAVE_KEY = 'gsg.save.v1';
// uiPhase: 'speak'(장이 막 시작됨) | 'resolved'(해결이 끝남 — 불러오면 다음 장으로)
export function saveGame(state, uiPhase) {
  if (state.tutorial || state.winner) return;
  set(SAVE_KEY, { v: SAVE_VERSION, savedAt: Date.now(), uiPhase, s: serializeState(state) });
}
export function loadGame() {
  const d = get(SAVE_KEY, null);
  if (!d || d.v !== SAVE_VERSION) return null;
  try { return { state: hydrateState(d.s), uiPhase: d.uiPhase, savedAt: d.savedAt }; } catch { clearSave(); return null; }
}
export function clearSave() { remove(SAVE_KEY); }

// ---------- 서고 (판 기록) ----------
export function pushHistory(summary) {
  const list = get('gsg.history', []);
  list.unshift(summary);
  set('gsg.history', list.slice(0, 50));
}
export const getHistory = () => get('gsg.history', []);

// ---------- 업적 ----------
export const getAchievements = () => get('gsg.ach', {});
export function unlockAchievements(ids) {
  const have = getAchievements();
  const fresh = ids.filter((id) => !have[id]);
  if (!fresh.length) return [];
  const today = dayKey();
  for (const id of fresh) have[id] = today;
  set('gsg.ach', have);
  return fresh;
}

// ---------- 오늘의 계시 ----------
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
// FNV-1a: 같은 날짜면 누구나 같은 시드
function hash(text) {
  let h = 0x811c9dc5;
  for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function dailyConfig(date = new Date()) {
  const day = dayKey(date);
  return { mode: 'standard', size: 5, difficulty: 'normal', seed: 1 + (hash(`gsg:${day}`) % 999998), daily: day };
}
export const getDaily = () => get('gsg.daily', {});
// 첫 시도만 기록한다
export function recordDaily(day, result) {
  const all = getDaily();
  if (all[day]) return false;
  all[day] = result;
  set('gsg.daily', all);
  return true;
}
export const dailyDaysThisMonth = (date = new Date()) => Object.keys(getDaily()).filter((d) => d.startsWith(dayKey(date).slice(0, 7))).length;

// ---------- 정경 (다음 판으로 이어지는 구절) ----------
export const getCanon = () => get('gsg.canon', []);
export function addCanon(entry) {
  const list = getCanon().filter((c) => c.text !== entry.text);
  list.unshift(entry);
  set('gsg.canon', list.slice(0, 3));
}
export function removeCanon(text) { set('gsg.canon', getCanon().filter((c) => c.text !== text)); }

// ---------- 세라의 과제 ----------
export const getOnboard = () => get('gsg.onboard', { step: 0, off: false });
export const setOnboard = (v) => set('gsg.onboard', v);

// ---------- 기록 내보내기 / 가져오기 ----------
export function exportAll() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('gsg.')) out[k] = localStorage.getItem(k);
    }
  } catch { /* 무시 */ }
  return out;
}
export function importAll(obj) {
  for (const [k, v] of Object.entries(obj)) if (k.startsWith('gsg.') && typeof v === 'string') { try { localStorage.setItem(k, v); } catch { /* 무시 */ } }
}

// ---------- 시드별 개인 최고 기록 (승리한 판의 승점) ----------
export const bestKey = (c) => `${c.size}-${c.difficulty}-${c.seed}${c.ascension ? `-a${c.ascension}` : ''}-r${RULESET}`;
export const getBest = (c) => get('gsg.best', {})[bestKey(c)] ?? null;
export function setBest(c, score) {
  const all = get('gsg.best', {});
  const k = bestKey(c);
  if (all[k] != null && all[k] >= score) return false;
  all[k] = score;
  set('gsg.best', all);
  return true;
}

// ---------- 경외와 은사 ----------
export const getAwe = () => get('gsg.awe', { awe: 0 });
export function addAwe(n, levels) {
  const cur = getAwe();
  const before = levels.filter((x) => cur.awe >= x).length;
  const awe = cur.awe + Math.max(0, n);
  set('gsg.awe', { awe });
  return { awe, gained: n, levelBefore: before, level: levels.filter((x) => awe >= x).length };
}

// ---------- 도감 (본 것들) ----------
export function markSeen(kind, id) {
  if (!id) return false;
  const all = get('gsg.seen', {});
  const list = (all[kind] ??= []);
  if (list.includes(id)) return false;
  list.push(id);
  set('gsg.seen', all);
  return true;
}
export const getSeen = () => get('gsg.seen', {});

// ---------- 어휘집: 어떤 말이 처음으로 그 일을 불렀나 ----------
export function noteWords(key, text) {
  if (!key || !text) return;
  const all = get('gsg.lexicon', {});
  const e = (all[key] ??= { first: text.slice(0, 20), n: 0 });
  e.n += 1;
  set('gsg.lexicon', all);
}
export const getLexicon = () => get('gsg.lexicon', {});

// ---------- 시련과 승천 ----------
export const getTrials = () => get('gsg.trials', {});
export function recordTrial(id, stars) {
  const all = getTrials();
  if ((all[id] ?? 0) >= stars) return false;
  all[id] = stars;
  set('gsg.trials', all);
  return true;
}
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${Math.ceil(((d - y) / 86400000 + 1) / 7)}`;
}
export const weeklyIndex = (n, date = new Date()) => hash(`gsg:week:${isoWeek(date)}`) % n;
export const ascensionOpen = () => get('gsg.ascension', 0);
export function openAscension(level) { if (level > ascensionOpen()) set('gsg.ascension', Math.min(5, level)); }
