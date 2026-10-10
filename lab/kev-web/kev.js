// Kev(결정형 모델)를 브라우저에서: onnxruntime-web(WebGPU)로 바탕 모델을 돌리고, 판정 헤드는 JS로 셈한다.
// 입력 꼴은 Kev의 kev/api.py(render, option_text, to_record)와 kev/model.py(encode, rows_of)를 그대로 옮겼다.

import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.webgpu.min.mjs';
import { Qwen2Tokenizer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

// Kev가 빌려 쓰는 특수 토큰: <state> <q> <opt> </opt> <decide>
const SPECIAL = ['<|fim_prefix|>', '<|fim_middle|>', '<|box_start|>', '<|box_end|>', '<|fim_suffix|>'];
const LAYERS = 24;
const FULL = new Set([3, 7, 11, 15, 19, 23]); // full_attention_interval 4 — 나머지는 Gated DeltaNet

// ---------- 입력 꼴 (kev/api.py) ----------
const pyStr = (v) => (typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v));
export function render(v, indent = 0) {
  const pad = '  '.repeat(indent);
  if (v === null || v === undefined) return '';
  if (typeof v !== 'object') return pyStr(v);
  if (Array.isArray(v)) return v.map((x) => `${pad}- ${render(x, indent + 1).trimStart()}`).join('\n');
  return Object.entries(v).map(([k, x]) => (x !== null && typeof x === 'object' ? `${pad}${k}:\n${render(x, indent + 1)}` : `${pad}${k}: ${render(x)}`)).join('\n');
}
const optionText = (name, desc) => (desc === null || desc === undefined || desc === '' ? name : `${name}: ${render(desc)}`);

// questions → [{ id, type, keys, options, instr }]
export function toRecord(questions) {
  return Object.entries(questions).map(([id, q]) => {
    if (q.type === 'noul') {
      const c = q.criteria ?? {};
      return { id, type: 'noul', keys: ['false', 'true'], options: [optionText('no', c.false), optionText('yes', c.true)], instr: render(q.instructions) };
    }
    if (q.type === 'choice') return { id, type: 'choice', keys: Object.keys(q.criteria), options: Object.entries(q.criteria).map(([k, v]) => optionText(k, v)), instr: render(q.instructions) };
    return { id, type: 'score', keys: q.criteria.map((_, i) => String(i)), options: q.criteria.map((x) => render(x)), instr: render(q.instructions) };
  });
}

// ---------- Kev ----------
export class Kev {
  static async load(base, { device = 'webgpu', file = 'kev08_fp16.onnx', fp16, onProgress } = {}) {
    const k = new Kev();
    const t0 = performance.now();
    // 토크나이저는 파일 둘로 직접 만든다 (from_pretrained의 로컬 경로 처리를 거치지 않게)
    const json = async (n) => (await fetch(`${base}${n}`)).json();
    k.tok = new Qwen2Tokenizer(await json('tokenizer.json'), await json('tokenizer_config.json'));
    k.special = SPECIAL.map((t) => {
      const ids = Array.from(k.tok.encode(t, { add_special_tokens: false }));
      if (ids.length !== 1) throw new Error(`특수 토큰 ${t}이 한 토큰이 아니다: ${ids}`);
      return ids[0];
    });
    const head = await (await fetch(`${base}head.json`)).json();
    const bin = async (n) => new Float32Array(await (await fetch(`${base}head_${n}.bin`)).arrayBuffer());
    k.head = { ...head, qw: await bin('q_w'), qb: await bin('q_b'), kw: await bin('k_w'), kb: await bin('k_b') };
    onProgress?.('model');
    const data = `${file}_data`;
    // 내부 상태(present_*)는 GPU에 남긴다 — 다음 단계의 past로 바로 넘기고, CPU로 내려받지 않는다
    const presents = {};
    for (let l = 0; l < LAYERS; l++) {
      for (const n of FULL.has(l) ? [`present.${l}.key`, `present.${l}.value`] : [`present_conv.${l}`, `present_recurrent.${l}`]) presents[n] = 'gpu-buffer';
    }
    k.session = await ort.InferenceSession.create(`${base}${file}`, {
      executionProviders: [device], graphOptimizationLevel: 'all',
      externalData: [{ path: data, data: `${base}${data}` }],
      preferredOutputLocation: device === 'webgpu' ? presents : undefined,
    });
    // 내부 상태와 은닉 상태의 자료형: 모두 fp16 그래프에서 나온 판이면 float16 (fp32 그래프만 float32)
    k.fp16 = fp16 ?? !/^kev08\.onnx$/.test(file);
    k.hiddenName = k.session.outputNames.find((n) => n.includes('final_norm'));
    k.loadMs = performance.now() - t0;
    return k;
  }

  userTokens(text) {
    return Array.from(this.tok.encode(text.replace(/<\|([A-Za-z0-9_]+)\|>/g, '<¦$1¦>'), { add_special_tokens: false }));
  }

  // kev/model.py encode() + rows_of(): 상태 한 줄, 질문마다 가지 한 줄
  encode(state, questions, maxState = 8192) {
    const [S, Q, O, C, D] = this.special;
    const stateIds = [S, ...this.userTokens(typeof state === 'string' ? state : render(state))].slice(0, maxState);
    const meta = toRecord(questions);
    const rows = meta.map((q) => {
      const ids = [Q, ...this.userTokens(q.instr)];
      const opts = [];
      for (const o of q.options) { ids.push(O, ...this.userTokens(o), C); opts.push(ids.length - 1); }
      ids.push(D);
      return { ids, decide: ids.length - 1, opts };
    });
    return { stateIds, rows, meta };
  }

  // 텐서 만들기
  f(arr, dims) { return this.fp16 ? new ort.Tensor('float16', arr instanceof Uint16Array ? arr : new Uint16Array(arr.length), dims) : new ort.Tensor('float32', arr, dims); }
  zeros(n) { return this.fp16 ? new Uint16Array(n) : new Float32Array(n); }
  emptyPast(B) {
    const feeds = {};
    for (let l = 0; l < LAYERS; l++) {
      if (FULL.has(l)) {
        feeds[`past_key_values.${l}.key`] = this.f(this.zeros(0), [B, 2, 0, 256]);
        feeds[`past_key_values.${l}.value`] = this.f(this.zeros(0), [B, 2, 0, 256]);
      } else {
        feeds[`past_conv.${l}`] = this.f(this.zeros(B * 6144 * 3), [B, 6144, 3]);
        feeds[`past_recurrent.${l}`] = this.f(this.zeros(B * 16 * 128 * 128), [B, 16, 128, 128]);
      }
    }
    return feeds;
  }
  // 앞 단계의 present → 다음 단계의 past (state를 한 번만 돌리고 질문 가지마다 이어 쓴다)
  pastFrom(out) {
    const feeds = {};
    for (let l = 0; l < LAYERS; l++) {
      if (FULL.has(l)) { feeds[`past_key_values.${l}.key`] = out[`present.${l}.key`]; feeds[`past_key_values.${l}.value`] = out[`present.${l}.value`]; }
      else { feeds[`past_conv.${l}`] = out[`present_conv.${l}`]; feeds[`past_recurrent.${l}`] = out[`present_recurrent.${l}`]; }
    }
    return feeds;
  }

  async run(ids, past, pastLen = 0) {
    const L = ids.length;
    const feeds = {
      input_ids: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, L]),
      attention_mask: new ort.Tensor('int64', new BigInt64Array(pastLen + L).fill(1n), [1, pastLen + L]),
      ...past,
    };
    return this.session.run(feeds);
  }

  // 여러 줄을 한 번에: 오른쪽을 채워 [B, Lmax]로 (채운 자리는 attention_mask 0)
  async runBatch(seqs) {
    const B = seqs.length; const L = Math.max(...seqs.map((s) => s.length));
    const ids = new BigInt64Array(B * L).fill(248044n); const mask = new BigInt64Array(B * L);
    seqs.forEach((s, b) => s.forEach((x, j) => { ids[b * L + j] = BigInt(x); mask[b * L + j] = 1n; }));
    return this.session.run({ input_ids: new ort.Tensor('int64', ids, [B, L]), attention_mask: new ort.Tensor('int64', mask, [B, L]), ...this.emptyPast(B) });
  }

  release(out) { for (const [n, t] of Object.entries(out)) if (n !== this.hiddenName && t.location === 'gpu-buffer') t.dispose(); }

  // 은닉 상태에서 몇 자리만 꺼낸다 (batch b의 자리 i → b * L + i)
  hiddenRows(out, idxs, b = 0) {
    const t = out[this.hiddenName];
    const d = this.head.d; const L = t.dims[1];
    const data = t.data;
    const toF = this.fp16 && !(typeof Float16Array !== 'undefined' && data instanceof Float16Array) ? f16 : Number;
    return idxs.map((i) => { const v = new Float32Array(d); const off = (b * L + i) * d; for (let j = 0; j < d; j++) v[j] = toF(data[off + j]); return v; });
  }

  // 판정 헤드: z_i = (Wk h_i + bk)·(Wq h_d + bq) · scale / T
  probsOf(hd, hos) {
    const { qw, qb, kw, kb, dp, d, scale, temperature } = this.head;
    const proj = (W, b, h) => { const o = new Float32Array(dp); for (let r = 0; r < dp; r++) { let s = b[r]; const off = r * d; for (let j = 0; j < d; j++) s += W[off + j] * h[j]; o[r] = s; } return o; };
    const q = proj(qw, qb, hd);
    const z = hos.map((h) => { const k = proj(kw, kb, h); let s = 0; for (let r = 0; r < dp; r++) s += k[r] * q[r]; return (s * scale) / temperature; });
    const m = Math.max(...z); const e = z.map((x) => Math.exp(x - m)); const sum = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / sum);
  }

  // mode 'rows': 질문마다 상태+가지를 통째로, 한 줄씩 / 'batch': 모든 줄을 한 번에 / 'prefix': 상태를 한 번 돌리고 가지만 이어서
  async score({ stateIds, rows }, mode = 'batch') {
    const out = [];
    const Ls = stateIds.length;
    if (mode === 'rows') {
      for (const r of rows) {
        const o = await this.run([...stateIds, ...r.ids], this.emptyPast(1));
        const [hd, ...hos] = this.hiddenRows(o, [Ls + r.decide, ...r.opts.map((x) => Ls + x)]);
        this.release(o);
        out.push(this.probsOf(hd, hos));
      }
      return out;
    }
    if (mode === 'batch') {
      const o = await this.runBatch(rows.map((r) => [...stateIds, ...r.ids]));
      rows.forEach((r, b) => {
        const [hd, ...hos] = this.hiddenRows(o, [Ls + r.decide, ...r.opts.map((x) => Ls + x)], b);
        out.push(this.probsOf(hd, hos));
      });
      this.release(o);
      return out;
    }
    const so = await this.run(stateIds, this.emptyPast(1));
    const past = this.pastFrom(so);
    for (const r of rows) {
      const o = await this.run(r.ids, past, Ls);
      const [hd, ...hos] = this.hiddenRows(o, [r.decide, ...r.opts]);
      this.release(o);
      out.push(this.probsOf(hd, hos));
    }
    this.release(so);
    return out;
  }

  // Kev API 모양의 답
  async ask(state, questions, mode = 'prefix') {
    const enc = this.encode(state, questions);
    const t0 = performance.now();
    const probs = await this.score(enc, mode);
    const ms = performance.now() - t0;
    const answers = {};
    enc.meta.forEach((q, i) => {
      const p = probs[i];
      if (q.type === 'noul') answers[q.id] = { type: 'noul', noul: p[1] };
      else if (q.type === 'choice') answers[q.id] = { type: 'choice', choice: q.keys[p.indexOf(Math.max(...p))], probabilities: Object.fromEntries(q.keys.map((k, j) => [k, p[j]])) };
      else answers[q.id] = { type: 'score', score: p.reduce((a, x, j) => a + j * x, 0), probabilities: Object.fromEntries(q.keys.map((k, j) => [k, p[j]])) };
    });
    return { answers, ms, tokens: enc.stateIds.length + enc.rows.reduce((a, r) => a + r.ids.length, 0) };
  }
}

function f16(h) {
  const s = h & 0x8000 ? -1 : 1; const e = (h >> 10) & 0x1f; const f = h & 0x3ff;
  if (e === 0) return s * 2 ** -14 * (f / 1024);
  if (e === 31) return f ? NaN : s * Infinity;
  return s * 2 ** (e - 15) * (1 + f / 1024);
}
