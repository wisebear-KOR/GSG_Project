// 글과 이야기: 계시에서 낱말 뽑기, 지도자 대사 고르기 등 순수한 텍스트 처리.
// 대사·이야기 선택은 주사위 난수를 쓰지 않고 해시로 고른다 (글을 늘려도 판의 결과가 바뀌지 않게).
import { ENEMY_LEADERS } from './data.js';

// 문자열 해시로 목록에서 하나를 고른다
export function hashPick(list, ...salts) {
  if (!list?.length) return null;
  let h = 0x811c9dc5;
  for (const ch of salts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return list[(h >>> 0) % list.length];
}

// 조사를 떼어 낸 명사 후보 (두 글자 이상). 동사·대명사는 뺀다
const PARTICLE = /(에게서|에게|에서|으로|이여|이시여|께서|까지|부터|처럼|같이|을|를|이|가|은|는|에|로|와|과|의|도|만|여|아|야)$/;
const VERBISH = /(라|다|오|자|니|며|고|면|서|리라|하라|마라|지어다|노라|도다|소서|하리|되리|이리|어라|아라|거라|느냐)$/;
const STOP = new Set(['너희', '우리', '나의', '너의', '그들', '저들', '이제', '모두', '함께', '그리고', '그러나', '오늘', '다시', '반드시', '결코', '영원히']);
export function nouns(text) {
  const out = [];
  for (const raw of String(text).split(/[^가-힣]+/)) {
    if (raw.length < 2 || VERBISH.test(raw)) continue;
    const w = raw.replace(PARTICLE, '');
    if (w.length >= 2 && !STOP.has(w) && !VERBISH.test(w)) out.push(w);
  }
  return out;
}

// 지금까지 계시에서 가장 자주 쓴 명사 (검열 카드가 봉인할 말)
export function frequentNoun(revelations) {
  const count = new Map();
  for (const r of revelations) for (const w of new Set(nouns(r.text))) count.set(w, (count.get(w) ?? 0) + 1);
  let best = null;
  for (const [w, n] of count) if (!best || n > best[1]) best = [w, n];
  return best?.[0] ?? null;
}

// 율법파 지도자의 대사. kind: intro | card | rebuttal | villageLost | capitalLow | win | lose
export function leaderLine(state, kind, ctx = {}) {
  const leader = ENEMY_LEADERS[state.leader] ?? ENEMY_LEADERS.elder;
  let pool = leader.lines[kind];
  if (kind === 'card') pool = leader.lines.card[ctx.card?.id] ?? leader.lines.card.any;
  if (kind === 'rebuttal') pool = leader.lines.rebuttal[ctx.doctrine] ?? leader.lines.rebuttal.any;
  const line = hashPick(pool, state.config.seed, state.round, kind, ctx.card?.id ?? '', ctx.word ?? '');
  return line ? line.replaceAll('{word}', ctx.word ?? '그 말') : '';
}
