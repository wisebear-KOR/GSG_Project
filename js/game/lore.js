// 글과 이야기: 계시에서 낱말 뽑기, 지도자 대사 고르기 등 순수한 텍스트 처리.
// 대사·이야기 선택은 주사위 난수를 쓰지 않고 해시로 고른다 (글을 늘려도 판의 결과가 바뀌지 않게).
import { ENEMY_LEADERS } from './data.js';
import { t } from './i18n.js';

// 언어팩의 정규식 원본으로 만든다 (kw.*)
const kw = (key, flags) => new RegExp(t(key), flags);

// 문자열 해시로 목록에서 하나를 고른다
export function hashPick(list, ...salts) {
  if (!list?.length) return null;
  let h = 0x811c9dc5;
  for (const ch of salts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return list[(h >>> 0) % list.length];
}

// 조사를 떼어 낸 명사 후보 (두 글자 이상). 동사·대명사는 뺀다
const PARTICLE = kw('kw.particle');
const VERBISH = kw('kw.verbish');
const NOUN_SPLIT = kw('kw.nounSplit');
const STOP = new Set(t('kw.stop'));
export function nouns(text) {
  const out = [];
  for (const raw of String(text).split(NOUN_SPLIT)) {
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
const CITE_STOP = new Set(t('kw.citeStop'));
export function citedWords(state, text) {
  const past = new Set(state.revelations.filter((r) => r.round >= state.round - 3 && r.round < state.round).flatMap((r) => nouns(r.text)));
  return [...new Set(nouns(text))].filter((w) => past.has(w) && !CITE_STOP.has(w) && !state.bannedWords?.includes(w));
}

// 말한 대로 내리는 기적: 계시 속 말이 손에 든 기적을 부른다
const MIRACLE_WORDS = Object.fromEntries(['lightning', 'rain', 'bounty', 'manna', 'ark', 'tongues', 'pillar', 'revive'].map((id) => [id, kw(`kw.miracle.${id}`)]));
export function parseMiracle(text, hand) {
  for (const id of hand) if (MIRACLE_WORDS[id]?.test(text)) return id;
  return null;
}

// 영원한 계명: "영원히"가 있어야 한다
const ETERNAL = kw('kw.eternal');
export function parseCommandment(text, table) {
  if (!ETERNAL.test(text)) return null;
  for (const [id, c] of Object.entries(table)) if (new RegExp(c.re).test(text)) return id;
  return null;
}

// 말투: 저주 > 축복 > 비유 > 명령
const TONE = { curse: kw('kw.tone.curse'), blessing: kw('kw.tone.blessing'), metaphor: kw('kw.tone.metaphor') };
export function detectTone(text) {
  if (TONE.curse.test(text)) return 'curse';
  if (TONE.blessing.test(text)) return 'blessing';
  if (TONE.metaphor.test(text)) return 'metaphor';
  return 'command';
}

// 이름 붙이기: "이 강을 요단이라 부르라", "저 숲을 검은 숲이라 하라"
const NAMEABLE = t('kw.nameable');
const NAMING = kw('kw.naming');
const NAMING_TAIL = kw('kw.namingTail');
export function parseNaming(text) {
  const m = text.match(NAMING);
  if (!m) return null;
  const name = m[2].replace(NAMING_TAIL, '').trim();
  if (name.length < 2 || name.length > 8) return null; // 한 글자 이름은 다른 말과 너무 쉽게 겹친다
  return { kind: NAMEABLE[m[1]], name };
}

// 예언: "~하리라"만으로는 걸지 않는다. 유형이 잡히는 문장만 확인 화면에서 봉인할 수 있다
const PROPHECY = Object.fromEntries(['capital', 'fall', 'convert', 'pop', 'future', 'negated', 'big', 'count'].map((k) => [k, kw(`kw.prophecy.${k}`)]));
export function parseProphecy(text) {
  let kind = null;
  if (PROPHECY.capital.test(text)) kind = 'capital';
  else if (PROPHECY.fall.test(text)) kind = 'fall';
  else if (PROPHECY.convert.test(text)) kind = 'convert';
  else if (PROPHECY.pop.test(text)) kind = 'pop';
  if (!kind || !PROPHECY.future.test(text)) return null;
  if (PROPHECY.negated.test(text)) return null; // 부정하는 예언은 봉인하지 않는다
  const big = text.match(PROPHECY.big);
  if (big && Number(big[1]) > 3) return null;
  const n = text.match(PROPHECY.count);
  const rounds = n ? (t('kw.prophecy.numbers')[n[1]] ?? Number(n[1])) : 2;
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
  return t('interp.leaderLine', { line, word: ctx.word });
}
