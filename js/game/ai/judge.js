// @ts-check
// 판정기: 계시 글을 글자 1~3 조각으로 읽어 일의 종류 12가지마다 하라 / 하지 마라 / 말하지 않음과 교리를 정한다.
// 언어 모델 없이, 어느 기기에서나 같은 답(결정적)을 낸다 — 키 입력마다 돌려도 될 만큼 가볍다.
// 가중치는 lab/ai-options/train_judge.py가 석판 시험 문장(석판 출력 = 정답)과 합성 금지 문장으로 배워 만든다.
// 왜 이 꼴인가: docs/redesign/AI-OPTIONS.md (처음 보는 말투를 석판보다 잘 푼다, 228 KB, 즉시)

import W from './judge-weights.js';

/** @typedef {import('../domain/types').ActionKind} ActionKind */
/** @typedef {'do' | 'dont' | 'none'} Say */
/**
 * @typedef {object} Judgement
 * @property {Record<ActionKind, Say>} say 일마다 판정
 * @property {Record<ActionKind, [number, number, number]>} p 일마다 [말 없음, 하라, 하지 마라] 확률
 * @property {ActionKind[]} do 하라 — 하라 확률이 높은 것부터
 * @property {ActionKind[]} dont 하지 마라
 * @property {number} conf 하라 확률의 최댓값 (해석기가 판정기를 믿을지 정하는 데 쓴다)
 * @property {{ id: string, p: number } | null} doctrine 교리와 그 확률
 */

/** @type {{ vocab: Map<string, number>, idf: Float32Array, heads: any[], doctrine: any } | null} */
let model = null;
const bytes = (/** @type {string} */ b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
function load() {
  if (model) return model;
  const vocab = new Map(W.vocab.split('\u0001').map((t, i) => [t, i]));
  const idf = new Float32Array(bytes(W.idf).buffer);
  const head = (/** @type {any} */ h) => (h.const !== undefined ? h : { ...h, w: new Int8Array(bytes(h.w).buffer) });
  model = { vocab, idf, heads: W.heads.map(head), doctrine: head(W.doctrine) };
  return model;
}

// scikit-learn TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), sublinear_tf=True)와 같은 특징:
// 낱말마다 앞뒤에 빈칸을 붙여 글자 조각을 세고, 1 + ln(횟수) × idf, 길이 1로 맞춘다
/** @param {string} text @returns {Map<number, number>} 특징 번호 → 값 */
function features(text) {
  const m = load();
  const [lo, hi] = W.ngram;
  /** @type {Map<number, number>} */
  const tf = new Map();
  for (const word of text.toLowerCase().split(/\s+/).filter(Boolean)) {
    const w = [' ', ...Array.from(word), ' '];
    for (let n = lo; n <= hi; n++) {
      let off = 0;
      const add = () => { const i = m.vocab.get(w.slice(off, off + n).join('')); if (i !== undefined) tf.set(i, (tf.get(i) ?? 0) + 1); };
      add();
      while (off + n < w.length) { off += 1; add(); }
      if (off === 0) break;
    }
  }
  let norm = 0;
  for (const [i, c] of tf) { const v = (1 + Math.log(c)) * m.idf[i]; tf.set(i, v); norm += v * v; }
  norm = Math.sqrt(norm) || 1;
  for (const [i, v] of tf) tf.set(i, v / norm);
  return tf;
}

/** @param {any} h @param {Map<number, number>} x @returns {number[]} 클래스 순서대로 확률 */
function probs(h, x) {
  const F = W.features;
  /** @type {number[]} */
  const z = h.b.map((/** @type {number} */ b, /** @type {number} */ c) => {
    let s = 0;
    for (const [i, v] of x) s += v * h.w[c * F + i];
    return s * h.scale + b;
  });
  const mx = Math.max(...z);
  const e = z.map((v) => Math.exp(v - mx));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

/**
 * 계시 하나를 판정한다
 * @param {string} text
 * @returns {Judgement}
 */
export function judge(text) {
  const m = load();
  const x = features(text ?? '');
  /** @type {any} */ const say = {};
  /** @type {any} */ const p = {};
  for (const h of m.heads) {
    /** @type {[number, number, number]} */
    const full = [0, 0, 0];
    if (h.const !== undefined) full[h.const] = 1;
    else probs(h, x).forEach((v, ci) => { full[h.classes[ci]] = v; });
    p[h.kind] = full;
    const best = full.indexOf(Math.max(...full));
    say[h.kind] = best === 1 ? 'do' : best === 2 ? 'dont' : 'none';
  }
  const kinds = /** @type {ActionKind[]} */ (W.kinds);
  const byDo = [...kinds].sort((a, b) => p[b][1] - p[a][1]);
  const dont = kinds.filter((k) => say[k] === 'dont');
  let dos = byDo.filter((k) => say[k] === 'do');
  // 하라가 하나도 없으면 하라 확률 1위가 0.25 이상일 때 그 하나 (실험과 같은 규칙 — AI-OPTIONS §3)
  if (!dos.length && p[byDo[0]][1] >= 0.25 && !dont.includes(byDo[0])) dos = [byDo[0]];
  const dp = x.size ? probs(m.doctrine, x) : null;
  const di = dp ? dp.indexOf(Math.max(...dp)) : -1;
  return { say, p, do: dos, dont, conf: p[byDo[0]][1], doctrine: dp ? { id: m.doctrine.classes[di], p: dp[di] } : null };
}
