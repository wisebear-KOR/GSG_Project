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

// 성구 인용: 최근 세 장의 계시와 겹치는 명사 (봉인된 말은 인용이 아니다)
const CITE_STOP = new Set(['신도', '말씀', '백성', '부족', '율법파', '율법', '마을', '우리', '너희']);
export function citedWords(state, text) {
  const past = new Set(state.revelations.filter((r) => r.round >= state.round - 3 && r.round < state.round).flatMap((r) => nouns(r.text)));
  return [...new Set(nouns(text))].filter((w) => past.has(w) && !CITE_STOP.has(w) && !state.bannedWords?.includes(w));
}

// 말투: 저주 > 축복 > 비유 > 명령
export function detectTone(text) {
  if (/저주|멸하|망하리|벌하리|재앙/.test(text)) return 'curse';
  if (/축복|복을|복되|복이|번성하라|은혜/.test(text)) return 'blessing';
  if (/처럼|같이|듯|마냥/.test(text)) return 'metaphor';
  return 'command';
}

// 이름 붙이기: "이 강을 요단이라 부르라", "저 숲을 검은 숲이라 하라"
const NAMEABLE = { 강: 'river', 강물: 'river', 숲: 'forest', 산: 'mountain', 평원: 'plain', 들판: 'plain', 들: 'plain', 언덕: 'hill', 사막: 'desert', 마을: 'village', 신전: 'capital' };
export function parseNaming(text) {
  const m = text.match(/(강물|강|숲|산|평원|들판|들|언덕|사막|마을|신전)(?:을|를)\s*['"“‘]?([가-힣]{1,6}(?:\s[가-힣]{1,4})?)['"”’]?\s*(?:이)?라\s*(?:부르|칭하|하라|이름)/);
  if (!m) return null;
  const name = m[2].replace(/(이)$/, '').trim();
  if (name.length < 2 || name.length > 8) return null; // 한 글자 이름은 다른 말과 너무 쉽게 겹친다
  return { kind: NAMEABLE[m[1]], name };
}

// 예언: "~하리라"만으로는 걸지 않는다. 유형이 잡히는 문장만 확인 화면에서 봉인할 수 있다
export function parseProphecy(text) {
  let kind = null;
  if (/(탑|수도|성채).*(무너|흔들|부서|쓰러)/.test(text)) kind = 'capital';
  else if (/(마을|땅|성벽).*(무너|함락|빼앗|불타|부서)|(무너|함락).*(마을|땅)/.test(text)) kind = 'fall';
  else if (/(개종|돌아오|돌아서|품으|말씀을 받)/.test(text)) kind = 'convert';
  else if (/(불어나|번성|늘어나|자손|태어나)/.test(text)) kind = 'pop';
  if (!kind || !/리라|리니|것이다|되리|지리/.test(text)) return null;
  if (/지\s*않|지\s*못|아니하|마라|말라|지\s*마/.test(text)) return null; // 부정하는 예언은 봉인하지 않는다
  const big = text.match(/(\d+)\s*(장|계절|번)/);
  if (big && Number(big[1]) > 3) return null;
  const n = text.match(/(한|두|세|1|2|3)\s*(장|계절|번)/);
  const rounds = n ? ({ 한: 1, 두: 2, 세: 3 }[n[1]] ?? Number(n[1])) : 2;
  return { kind, rounds: Math.min(3, Math.max(1, rounds)) };
}

// 율법파 지도자의 대사. kind: intro | card | rebuttal | villageLost | capitalLow | win | lose
export function leaderLine(state, kind, ctx = {}) {
  const leader = ENEMY_LEADERS[state.leader] ?? ENEMY_LEADERS.elder;
  let pool = leader.lines[kind];
  if (kind === 'card') pool = leader.lines.card[ctx.card?.id] ?? leader.lines.card.any;
  if (kind === 'rebuttal') pool = leader.lines.rebuttal[ctx.doctrine] ?? leader.lines.rebuttal.any;
  const line = hashPick(pool, state.config.seed, state.round, kind, ctx.card?.id ?? '', ctx.word ?? '');
  if (!line) return '';
  const w = ctx.word ?? '그 말';
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  const b = c >= 0 && c <= 11171 && c % 28 !== 0;
  return line.replaceAll("'{word}'라", `'${w}'${b ? '이라' : '라'}`).replaceAll("'{word}'를", `'${w}'${b ? '을' : '를'}`)
    .replaceAll("'{word}'?", `'${w}'?`).replaceAll('{word}', w);
}
