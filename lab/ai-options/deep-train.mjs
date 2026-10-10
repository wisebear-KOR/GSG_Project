// 깊은 해석 층 학습 (브라우저에서): 얼린 Kev-0.8B(ONNX q8, WebGPU)의 마지막 은닉 상태 위에 선형 머리를 배운다.
// 특징이 커서(문장 2천 × 1024) 밖으로 꺼내지 않고 여기서 배우고, 가중치만 문자열로 돌려준다.
// 브라우저 콘솔(정적 서버, 모델은 lab/kev-web/model/):
//   const D = await import('/lab/ai-options/deep-train.mjs'); await D.load(); await D.extract(0, 600); ... await D.train(); D.evaluate(); D.exportWeights()
// 정답은 판정기와 같다: 석판 시험 문장(석판 출력) + 합성 금지 + words-train. 평가: words-eval(학습에 안 씀)·은유 세트
const KINDS = ['gather:food', 'gather:wood', 'gather:stone', 'gather:faith', 'build:village', 'build:wall', 'build:temple', 'build:cathedral', 'pray', 'explore', 'preach', 'attack'];
const DOCS = ['peace', 'war', 'abundance', 'wisdom'];
const CLS = { none: 0, do: 1, dont: 2 };
export const frame = (text) => `신의 계시: "${text}"\n대사제가 해석한다:`;
const S = (globalThis.__deep ??= {});

export async function load(base = '/lab/kev-web/model/', file = 'kev08_q8f16.onnx') {
  const { Kev } = await import('/lab/kev-web/kev.js');
  S.kev ??= await Kev.load(base, { file });
  const j = async (p) => (await fetch(p)).json();
  const cases = await j('/lab/ai-options/cases.json');
  const syn = await j('/lab/ai-options/synth.json');
  const wtr = (await j('/lab/ai-options/words-train.json')).rows;
  const wev = (await j('/lab/ai-options/words-eval.json')).rows;
  const scen = await j('/lab/ai-options/scenario.json');
  let wevb = null; try { wevb = (await j('/lab/ai-options/words-eval-b.json')).rows; } catch {}
  const said = (d, n) => KINDS.map((k) => (d.includes(k) ? 1 : n.includes(k) ? 2 : 0));
  S.train = [
    ...cases.map((c) => ({ text: c.text, y: KINDS.map((k) => CLS[c.say[k]]), d: DOCS.indexOf(c.doctrine) })),
    ...syn.map((c) => ({ text: c.text, y: KINDS.map((k) => CLS[c.say[k]]), d: DOCS.indexOf(c.doctrine) })),
    ...wtr.map((w) => ({ text: w[0], y: said(w[1], w[2]), d: DOCS.indexOf(w[3]) })),
  ];
  S.evalSets = { words: wev, scenario: scen, ...(wevb ? { wordsB: wevb } : {}) };
  S.feat ??= new Map();
  return { train: S.train.length, eval: Object.fromEntries(Object.entries(S.evalSets).map(([k, v]) => [k, v.length])), loadMs: Math.round(S.kev.loadMs) };
}

export async function feature(text) {
  if (S.feat.has(text)) return S.feat.get(text);
  const k = S.kev;
  const ids = k.userTokens(frame(text));
  const o = await k.run(ids, k.emptyPast(1));
  const [h] = k.hiddenRows(o, [ids.length - 1]);
  k.release(o);
  S.feat.set(text, h);
  return h;
}
// 학습·평가 문장의 특징을 [from, to) 만큼 뽑는다 (도구 호출 한 번에 다 하지 않게)
export async function extract(from, to) {
  const all = [...S.train.map((r) => r.text), ...S.evalSets.words.map((w) => w[0]), ...S.evalSets.scenario.map((s) => (s.eventText ? `${s.eventText} ${s.text}` : s.text)), ...(S.evalSets.wordsB ?? []).map((w) => w[0])];
  const t0 = performance.now();
  for (const t of all.slice(from, to)) await feature(t);
  return { done: Math.min(to, all.length), total: all.length, ms: Math.round(performance.now() - t0) };
}

// 선형 머리: 표준화 → 일마다 3지선다 + 교리 4지선다, 한 행렬(39 + 4)로 함께 배운다. 균형 가중(드문 하라·하지 마라), L2
export function train({ epochs = 300, lr = 0.02, l2 = 0.01 } = {}) {
  const n = S.train.length; const d = S.feat.get(S.train[0].text).length;
  const X = new Float32Array(n * d);
  S.train.forEach((r, i) => X.set(S.feat.get(r.text), i * d));
  const mean = new Float32Array(d); const std = new Float32Array(d);
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) mean[j] += X[i * d + j] / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) std[j] += (X[i * d + j] - mean[j]) ** 2 / n;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1;
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) X[i * d + j] = (X[i * d + j] - mean[j]) / std[j];
  const H = KINDS.length + 1; const C = (h) => (h < KINDS.length ? 3 : 4);
  const outs = KINDS.length * 3 + 4;
  const W = new Float32Array(outs * d); const b = new Float32Array(outs);
  const off = (h) => (h < KINDS.length ? h * 3 : KINDS.length * 3);
  // 균형 가중: 클래스마다 n / (클래스 수 × 그 클래스의 수)
  const cw = [];
  for (let h = 0; h < H; h++) {
    const ys = S.train.map((r) => (h < KINDS.length ? r.y[h] : r.d));
    const cnt = new Array(C(h)).fill(0); for (const y of ys) if (y >= 0) cnt[y] += 1;
    const present = cnt.filter((x) => x > 0).length;
    cw.push(cnt.map((c) => (c ? ys.filter((y) => y >= 0).length / (present * c) : 0)));
  }
  const mW = new Float32Array(W.length); const vW = new Float32Array(W.length); const mb = new Float32Array(b.length); const vb = new Float32Array(b.length);
  const gW = new Float32Array(W.length); const gb = new Float32Array(b.length);
  const z = new Float32Array(outs);
  for (let ep = 1; ep <= epochs; ep++) {
    gW.fill(0); gb.fill(0);
    for (let i = 0; i < n; i++) {
      const x = X.subarray(i * d, (i + 1) * d);
      for (let o = 0; o < outs; o++) { let s = b[o]; const w = W.subarray(o * d, (o + 1) * d); for (let j = 0; j < d; j++) s += w[j] * x[j]; z[o] = s; }
      for (let h = 0; h < H; h++) {
        const y = h < KINDS.length ? S.train[i].y[h] : S.train[i].d;
        if (y < 0) continue;
        const o0 = off(h); const c = C(h);
        let mx = -Infinity; for (let k = 0; k < c; k++) mx = Math.max(mx, z[o0 + k]);
        let sum = 0; const p = []; for (let k = 0; k < c; k++) { p.push(Math.exp(z[o0 + k] - mx)); sum += p[k]; }
        const wgt = cw[h][y] / n;
        for (let k = 0; k < c; k++) {
          const g = (p[k] / sum - (k === y ? 1 : 0)) * wgt;
          gb[o0 + k] += g;
          const gw = gW.subarray((o0 + k) * d, (o0 + k + 1) * d);
          for (let j = 0; j < d; j++) gw[j] += g * x[j];
        }
      }
    }
    for (let q = 0; q < W.length; q++) { const g = gW[q] + l2 * W[q]; mW[q] = 0.9 * mW[q] + 0.1 * g; vW[q] = 0.999 * vW[q] + 0.001 * g * g; W[q] -= (lr * (mW[q] / (1 - 0.9 ** ep))) / (Math.sqrt(vW[q] / (1 - 0.999 ** ep)) + 1e-8); }
    for (let q = 0; q < b.length; q++) { const g = gb[q]; mb[q] = 0.9 * mb[q] + 0.1 * g; vb[q] = 0.999 * vb[q] + 0.001 * g * g; b[q] -= (lr * (mb[q] / (1 - 0.9 ** ep))) / (Math.sqrt(vb[q] / (1 - 0.999 ** ep)) + 1e-8); }
  }
  S.model = { d, mean, std, W, b };
  return { n, d, epochs };
}

// 같은 학습을 GPU에서 (TensorFlow.js, WebGL 백엔드): 표준화 → 한 행렬 X·W + b (43 = 일 12 × 3 + 교리 4),
// 머리마다 균형 가중 교차 엔트로피, L2, Adam. CPU 반복(train)과 같은 목적 함수
export async function trainGPU({ epochs = 300, lr = 0.02, l2 = 0.01, backend = 'webgl', hidden = 0 } = {}) {
  const tf = (S.tf ??= await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm'));
  await tf.setBackend(backend); await tf.ready();
  const n = S.train.length; const d = S.feat.get(S.train[0].text).length;
  const X = new Float32Array(n * d);
  S.train.forEach((r, i) => X.set(S.feat.get(r.text), i * d));
  const mean = new Float32Array(d); const std = new Float32Array(d);
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) mean[j] += X[i * d + j] / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) std[j] += (X[i * d + j] - mean[j]) ** 2 / n;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1;
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) X[i * d + j] = (X[i * d + j] - mean[j]) / std[j];
  const H = KINDS.length + 1; const outs = KINDS.length * 3 + 4;
  const off = (h) => (h < KINDS.length ? h * 3 : KINDS.length * 3); const C = (h) => (h < KINDS.length ? 3 : 4);
  const Y = new Float32Array(n * outs); const Wt = new Float32Array(n * H);
  for (let h = 0; h < H; h++) {
    const ys = S.train.map((r) => (h < KINDS.length ? r.y[h] : r.d));
    const cnt = new Array(C(h)).fill(0); for (const y of ys) if (y >= 0) cnt[y] += 1;
    const valid = ys.filter((y) => y >= 0).length; const present = cnt.filter((x) => x > 0).length;
    ys.forEach((y, i) => { if (y < 0) return; Y[i * outs + off(h) + y] = 1; Wt[i * H + h] = valid / (present * cnt[y]); });
  }
  const t0 = performance.now();
  const Xt = tf.tensor2d(X, [n, d]); const Yt = tf.tensor2d(Y, [n, outs]); const Wtt = tf.tensor2d(Wt, [n, H]);
  const W = tf.variable(tf.zeros([hidden || d, outs])); const b = tf.variable(tf.zeros([outs]));
  // hidden > 0이면 은닉층 하나(ReLU, 드롭아웃 없음)를 두는 비선형 머리 — 견주기용 (게임에 싣는 꼴은 선형)
  const W1 = hidden ? tf.variable(tf.randomNormal([d, hidden], 0, Math.sqrt(2 / d))) : null;
  const b1 = hidden ? tf.variable(tf.zeros([hidden])) : null;
  const opt = tf.train.adam(lr);
  let last = 0;
  for (let ep = 0; ep < epochs; ep++) {
    const l = opt.minimize(() => {
      const z = (hidden ? tf.relu(Xt.matMul(W1).add(b1)) : Xt).matMul(W).add(b);
      let loss = tf.scalar(0);
      for (let h = 0; h < H; h++) {
        const lp = tf.logSoftmax(z.slice([0, off(h)], [n, C(h)]));
        const ce = lp.mul(Yt.slice([0, off(h)], [n, C(h)])).sum(1).neg();
        loss = loss.add(ce.mul(Wtt.slice([0, h], [n, 1]).reshape([n])).sum());
      }
      return loss.div(n).add(W.square().sum().mul(l2 / 2)).add(hidden ? W1.square().sum().mul(l2 / 2) : tf.scalar(0));
    }, ep === epochs - 1);
    if (l) { last = (await l.data())[0]; l.dispose(); }
  }
  if (hidden) {
    // 비선형 머리는 평가만 한다: 특징 → 판정 함수를 바꿔 끼운다
    const W1d = await W1.data(); const b1d = await b1.data(); const W2 = await W.data(); const b2 = await b.data();
    S.mlp = { d, hidden, mean, std, W1d, b1d, W2, b2, outs };
    tf.dispose([Xt, Yt, Wtt, W, b, W1, b1]);
    return { n, d, hidden, epochs, loss: last, backend: tf.getBackend(), ms: Math.round(performance.now() - t0) };
  }
  S.mlp = null;
  const Wd = await W.data(); const bd = await b.data();
  const Wo = new Float32Array(outs * d);
  for (let j = 0; j < d; j++) for (let o = 0; o < outs; o++) Wo[o * d + j] = Wd[j * outs + o];
  S.model = { d, mean, std, W: Wo, b: Float32Array.from(bd) };
  tf.dispose([Xt, Yt, Wtt, W, b]);
  return { n, d, epochs, loss: last, backend: tf.getBackend(), ms: Math.round(performance.now() - t0) };
}

// 판정기(js/game/ai/judge.js)와 같은 꼴의 판정
export function judgeVec(h) {
  let zo;
  if (S.mlp) {
    const { d, hidden, mean, std, W1d, b1d, W2, b2, outs } = S.mlp;
    const x = new Float32Array(d); for (let j = 0; j < d; j++) x[j] = (h[j] - mean[j]) / std[j];
    const a = new Float32Array(hidden);
    for (let k = 0; k < hidden; k++) { let s = b1d[k]; for (let j = 0; j < d; j++) s += x[j] * W1d[j * hidden + k]; a[k] = Math.max(0, s); }
    zo = (o) => { let s = b2[o]; for (let k = 0; k < hidden; k++) s += a[k] * W2[k * outs + o]; return s; };
  } else {
    const { d, mean, std, W, b } = S.model;
    const x = new Float32Array(d); for (let j = 0; j < d; j++) x[j] = (h[j] - mean[j]) / std[j];
    zo = (o) => { let s = b[o]; for (let j = 0; j < d; j++) s += W[o * d + j] * x[j]; return s; };
  }
  const soft = (zs) => { const m = Math.max(...zs); const e = zs.map((v) => Math.exp(v - m)); const t = e.reduce((a, c) => a + c, 0); return e.map((v) => v / t); };
  const p = {}; const say = {};
  KINDS.forEach((k, i) => { p[k] = soft([zo(i * 3), zo(i * 3 + 1), zo(i * 3 + 2)]); const best = p[k].indexOf(Math.max(...p[k])); say[k] = best === 1 ? 'do' : best === 2 ? 'dont' : 'none'; });
  const byDo = [...KINDS].sort((a, c) => p[c][1] - p[a][1]);
  const dont = KINDS.filter((k) => say[k] === 'dont');
  let dos = byDo.filter((k) => say[k] === 'do');
  if (!dos.length && p[byDo[0]][1] >= 0.25 && !dont.includes(byDo[0])) dos = [byDo[0]];
  const dp = soft([0, 1, 2, 3].map((k) => zo(KINDS.length * 3 + k)));
  const di = dp.indexOf(Math.max(...dp));
  return { say, p, do: dos, dont, conf: p[byDo[0]][1], doctrine: { id: DOCS[di], p: dp[di] } };
}

export function evaluate() {
  const out = {};
  const run = (rows, textOf, wantOf, dontOf, docOf) => {
    let strict = 0; let loose = 0; let doc = 0;
    for (const r of rows) {
      const j = judgeVec(S.feat.get(textOf(r)));
      const want = wantOf(r); const dont = dontOf(r);
      strict += want.every((k) => j.do.includes(k)) && dont.every((k) => j.dont.includes(k)) && !dont.some((k) => j.do.includes(k));
      loose += (!want.length || want.some((k) => j.do.includes(k))) && !dont.some((k) => j.do.includes(k));
      const dd = docOf(r); doc += dd ? [dd].flat().includes(j.doctrine.id) : 0;
    }
    return { n: rows.length, strict, loose, doc };
  };
  out.words = run(S.evalSets.words, (w) => w[0], (w) => w[1], (w) => w[2], (w) => w[3]);
  if (S.evalSets.wordsB) out.wordsB = run(S.evalSets.wordsB, (w) => w[0], (w) => w[1], (w) => w[2], (w) => w[3]);
  out.scenario = run(S.evalSets.scenario, (s) => (s.eventText ? `${s.eventText} ${s.text}` : s.text), (s) => [], (s) => s.avoid, (s) => s.doctrine);
  // 은유 세트는 "기대 하나 이상 + 회피 없음" (scoreIntent)으로 다시 센다
  let sc = 0; for (const s of S.evalSets.scenario) { const j = judgeVec(S.feat.get(s.eventText ? `${s.eventText} ${s.text}` : s.text)); sc += (!s.expect.length || s.expect.some((k) => j.do.includes(k))) && !s.avoid.some((k) => j.do.includes(k)); }
  out.scenario.intent = sc;
  // 배운 문장 안에서 석판과 같은가 (게임의 문지기가 석판을 지키는지 볼 때)
  let same = 0; for (const r of S.train.slice(0, 1372)) { const j = judgeVec(S.feat.get(r.text)); same += KINDS.every((k, i) => ['none', 'do', 'dont'][r.y[i]] === j.say[k]); }
  out.inSampleSame = same;
  return out;
}

// 게임이 싣는 꼴 (js/game/ai/deep-weights.js): 평균·표준편차 float32, 가중치 int8 + 배율, 절편
export function exportWeights() {
  const { d, mean, std, W, b } = S.model;
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  let mx = 0; for (const v of W) mx = Math.max(mx, Math.abs(v));
  const scale = mx / 127 || 1;
  const q = new Int8Array(W.length); for (let i = 0; i < W.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round(W[i] / scale)));
  return JSON.stringify({ version: 1, kinds: KINDS, doctrines: DOCS, d, frame: frame('{text}'), mean: b64(new Uint8Array(mean.buffer)), std: b64(new Uint8Array(std.buffer)), w: b64(new Uint8Array(q.buffer)), scale, b: Array.from(b) });
}
