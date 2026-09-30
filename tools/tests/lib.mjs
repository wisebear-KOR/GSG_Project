// Headless game driver mirroring js/game/main.js speak/interpret/accept/wordsAfter.
// 저장소의 js/game/ 을 상대 경로로 가져온다
const imp = (f) => import(new URL(`../../js/game/${f}`, import.meta.url).href);
export const E = await imp('engine.js');
export const I = await imp('interpreter.js');
export const L = await imp('lore.js');
export const C = await imp('chronicle.js');
export const D = await imp('data.js');

export function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (rng, list) => list[Math.floor(rng() * list.length)];

export const REVELATIONS = [
  '', '   ',
  '강에서 물고기를 잡아라', '숲의 나무를 베어라', '산에서 돌을 캐라', '들판에서 곡식을 거두라',
  '마을을 넓혀 번성하라', '땅을 넓혀라', '이웃에게 사랑을 전하라', '율법파를 설득하여 개종시켜라',
  '분노하라, 율법파를 쳐라', '칼을 들고 싸워라', '성벽을 쌓아 지켜라', '신전을 높이 세우라', '대성당을 지어라',
  '기도하고 경배하라', '안개 너머를 탐험하라', '숨겨진 것을 찾아라', '쉬어라, 평화가 있으리라',
  '숲을 베지 마라', '싸우지 마라, 평화를 지켜라', '강을 지키고 숲을 베지 마라',
  '이 강을 요단이라 부르라', '저 숲을 검은 숲이라 하라', "이 산을 '시온'이라 칭하라", '우리 마을을 새벽이라 부르라',
  '신전을 빛의 집이라 부르라', '이 들판을 에덴이라 부르라', '저 언덕을 골고다라 부르라', '이 사막을 광야라 부르라',
  '요단에서 물고기를 잡아라', '시온에서 돌을 캐라', '에덴에서 곡식을 거두라',
  '두 장 안에 율법파의 마을이 무너지리라', '한 장 안에 율법의 탑이 흔들리리라', '세 계절 안에 이웃이 말씀으로 돌아오리라',
  '너희 자손이 불어나리라', '율법파의 땅이 불타리라', '3장 안에 수도가 무너지리라',
  '너희에게 축복을 내리노라, 들판에서 곡식을 거두라', '복을 받으라, 강에서 물고기를 잡아라',
  '율법파에게 저주를, 멸하라', '재앙이 저들에게 임하리라, 쳐라',
  '바람처럼 달려 안개를 걷어라', '사자같이 싸워라', '물 흐르듯 이웃에게 전하라',
  '신이 말하노니 너희는 강에서 물고기를 잡고 숲에서 나무를 베며 산에서 돌을 캐어 마을을 넓히고 성벽을 쌓아 율법파의 공격을 막아라',
  '!!!', '[?]', '🔥🔥🔥', 'attack the enemy', '((((', '가'.repeat(120), '사랑 사랑 사랑 사랑',
];
// Candidate list for the reasonable bot's one-step lookahead
export const SMART_REVS = [
  null, '강에서 물고기를 잡아라', '들판에서 곡식을 거두라', '숲의 나무를 베어라', '산에서 돌을 캐라',
  '마을을 넓혀라', '이웃에게 사랑을 전하라', '분노하라, 쳐라', '성벽을 쌓아 지켜라', '신전을 높이 세우라',
  '대성당을 지어라', '기도하라', '안개 너머를 탐험하라', '사자같이 싸워라', '복을 받으라, 곡식을 거두라',
  '마을을 넓히고, 돌을 캐라', '쳐라, 그리고 이웃에게 전하라', '두 장 안에 율법파의 마을이 무너지리라, 쳐라',
  '너희 자손이 불어나리라, 곡식을 거두라',
];

// ---- speak/interpret (mirrors main.js speak + interpret) ----
export function doSpeak(state, text, { reinterpret = false, seal = false } = {}) {
  const t = (text ?? '').trim();
  if (!t) return silence(state);
  const cost = E.revelationCostFor(state, t);
  const p = state.sides.player;
  if (p.faith < cost) return silence(state); // UI refuses; player then stays silent
  const spoken = E.spokenOf(state, t);
  p.faith -= cost;
  const naming = E.nameTile(state, L.parseNaming(t));
  if (naming) naming.name = state.names[naming.tile];
  let pending = interpret(state, t, naming);
  if (reinterpret && !state.reinterpretUsed && p.faith >= 1) { p.faith -= 1; state.reinterpretUsed = true; pending = interpret(state, t, naming); }
  pending.seal = seal;
  pending.spoken = spoken;
  return pending;
}
function interpret(state, text, naming) {
  const result = I.interpretWithTablet(state, text);
  const forbiddenKeys = result.forbidden.map((a) => a.key);
  const { accepted, rejected } = E.validateOrders(state, 'player', result.orders, forbiddenKeys, result.doctrine);
  const auto = E.autoFill(state, 'player', accepted, forbiddenKeys, result.doctrine);
  return {
    text, result, accepted, rejected, auto, naming, forbiddenKeys,
    tone: L.detectTone(text), links: I.linkWords(state, text, accepted), answered: E.petitionAnswered(state, text, accepted),
    prophecy: state.prophecy ? null : L.parseProphecy(text), seal: false,
  };
}
function silence(state) {
  const auto = E.autoFill(state, 'player', []);
  return { text: null, result: { interpretation: '신께서 침묵하셨다.', orders: [], forbidden: [], doctrine: null, source: 'silence' }, accepted: [], rejected: [], auto, forbiddenKeys: [] };
}

// ---- accept (mirrors main.js accept + wordsAfter) ----
export function doAccept(state, pending) {
  const { text, result, accepted, auto } = pending;
  if (text) {
    state.log.push({ round: state.round, side: 'god', text: `“${text}”` });
    state.log.push({ round: state.round, side: 'priest', text: result.interpretation });
  }
  const enemyPlan = E.planEnemy(state);
  if (text) E.applyTone(state, pending.tone); else E.applyTone(state, null);
  if (pending.seal && pending.prophecy) E.sealProphecy(state, pending.prophecy);
  E.resolveRound(state, [...accepted, ...auto], enemyPlan);
  if (!state.winner) wordsAfter(state, pending);
  if (text) E.recordRevelation(state, text, result.doctrine, pending.tone === 'metaphor' ? 1 : 0, pending.spoken);
  if (pending.naming?.first && state.sides.player.doctrine.wisdom < D.RULES.graceDoctrineBelow) state.sides.player.doctrine.wisdom += 1;
  const last = state.history.at(-1);
  if (last) last.text = text;
  if (text && state.leader) {
    const line = L.leaderLine(state, 'rebuttal', { doctrine: result.doctrine, word: L.nouns(text)[0] });
    if (line) state.log.push({ round: state.round, side: 'leader', text: `${D.ENEMY_LEADERS[state.leader].name}: “${line}”` });
  }
  return enemyPlan;
}
const hasBatchim = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
function wordsAfter(state, pd) {
  const pt = state.petition;
  const TERRAIN_NAME = (id) => D.TERRAIN[state.tileAt[id].terrain]?.name ?? '땅';
  if (pt?.need) {
    if (pd.answered) { state.stats.petitions += 1; state.petitionIgnored = 0; E.grantGrace(state, 1, `${pt.from}의 청원에 응답했다`); }
    else if (!state.tutorial && ++state.petitionIgnored >= 2) {
      state.petitionIgnored = 0;
      state.sides.player.faith = Math.max(0, state.sides.player.faith - 1);
      state.log.push({ round: state.round, side: 'player', text: '청원이 거듭 외면당해 신도들이 서운해한다. 신앙 -1.', fx: { kind: 'warn' }, snap: E.snapshot(state) });
    }
  }
  if (pd.naming) E.grantGrace(state, 1, `${TERRAIN_NAME(pd.naming.tile)}${hasBatchim(TERRAIN_NAME(pd.naming.tile)) ? '을' : '를'} '${pd.naming.name}'${hasBatchim(pd.naming.name) ? '이라' : '라'} 부르게 했다`);
}

export function siteStep(state, choice) {
  const msg = E.resolveSite(state, choice);
  if (msg != null) state.log.push({ round: state.round, side: 'player', text: msg });
  return msg;
}

export const roundTrip = (s) => E.hydrateState(JSON.parse(JSON.stringify(E.serializeState(s))));

// deep compare, ignoring tileAt and log[].snap. Returns first differing path or null.
export function deepDiff(a, b, path = '') {
  if (a === b) return null;
  if (typeof a !== typeof b) return `${path}: type ${typeof a} vs ${typeof b} (${short(a)} vs ${short(b)})`;
  if (a === null || b === null || typeof a !== 'object') {
    if (Number.isNaN(a) && Number.isNaN(b)) return null;
    return `${path}: ${short(a)} vs ${short(b)}`;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array mismatch`;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return `${path}: length ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i++) { const d = deepDiff(a[i], b[i], `${path}[${i}]`); if (d) return d; }
    return null;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (k === 'tileAt' || k === 'snap') continue;
    if (!(k in a) && b[k] === undefined) continue;
    if (!(k in b) && a[k] === undefined) { continue; }
    if (!(k in b)) return `${path}.${k}: missing after hydrate (was ${short(a[k])})`;
    if (!(k in a)) return `${path}.${k}: extra after hydrate (${short(b[k])})`;
    const d = deepDiff(a[k], b[k], `${path}.${k}`); if (d) return d;
  }
  return null;
}
const short = (x) => { try { const s = JSON.stringify(x); return s && s.length > 80 ? s.slice(0, 80) + '…' : s; } catch { return String(x); } };
