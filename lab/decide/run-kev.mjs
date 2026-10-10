// Kev에 실험 세트를 묻는다. 결과는 lab/decide/results/kev.json에 모은다 (이미 받은 사례는 건너뛴다).
//   node lab/decide/run-kev.mjs space            Hugging Face 데모 Space(jaredpalmer/kev, ZeroGPU)의 Kev-4B·Kev-0.8B
//                                                (익명 사용 한도가 작다 — 몇 번 부르면 막힌다)
//   node lab/decide/run-kev.mjs local "이름"     로컬 kev.serve (http://127.0.0.1:8008)를 "이름"으로 기록
//     kev 저장소에서: python -m kev.serve --run jaredpalmer/kev-0.8b --port 8008

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { CASES, buildState, buildQuestions } from './core.js';

const [mode = 'space', localName = 'Kev (local)'] = process.argv.slice(2);
const OUT = new URL('./results/kev.json', import.meta.url);
const SPACE = 'https://jaredpalmer-kev.hf.space/gradio_api/call/decide';
const LOCAL = 'http://127.0.0.1:8008/v1/systemone';
const LANGS = ['ko', 'en'];

mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const results = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

// → { 모델 이름: { answers, latencyMs, tokens } }
async function callSpace(state, questions) {
  const res = await fetch(SPACE, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    // state, questions, 모델, 보정(T=2), date_facts, check_stability, n_perm
    body: JSON.stringify({ data: [state, JSON.stringify(questions), 'Both', true, false, false, 4] }),
  });
  const { event_id: id } = await res.json();
  const text = await (await fetch(`${SPACE}/${id}`)).text();
  const event = text.match(/^event: (\w+)/m)?.[1];
  const data = JSON.parse(text.match(/^data: (.*)$/m)?.[1] ?? 'null');
  if (event !== 'complete') throw new Error(`${event}: ${JSON.stringify(data)}`);
  return Object.fromEntries(Object.entries(data[1]).map(([m, r]) => [m, { answers: r.answers, latencyMs: r.latency_ms, tokens: r.usage?.input_tokens }]));
}

async function callLocal(state, questions) {
  const res = await fetch(LOCAL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state, questions }) });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const r = await res.json();
  return { [localName]: { answers: r.answers, latencyMs: r.latency_ms, tokens: r.usage?.input_tokens } };
}

const call = mode === 'local' ? callLocal : callSpace;
// QUESTIONS=choice: 선택형 질문(order·forbid·doctrine)만 묻는다 — CPU에서 큰 모델을 빨리 돌릴 때 (noul 고르는 법은 빠진다)
const only = process.env.QUESTIONS === 'choice' ? ['order', 'forbid', 'doctrine'] : null;
const want = mode === 'local' ? [localName] : ['Kev-4B', 'Kev-0.8B'];

for (const lang of LANGS) {
  const all = buildQuestions(lang);
  const questions = only ? Object.fromEntries(only.map((k) => [k, all[k]])) : all;
  for (const c of CASES) {
    const key = `${c.key}.${lang}`;
    if (want.every((m) => results[key]?.[m])) continue;
    const t0 = Date.now();
    try {
      results[key] = { ...results[key], ...await call(buildState(c, lang), questions) };
      writeFileSync(OUT, JSON.stringify(results, null, 1));
      console.log(key, `${Date.now() - t0}ms`, c.text);
    } catch (e) {
      console.log(key, 'FAIL', e.message.slice(0, 200));
      if (/quota|exceeded|ECONNREFUSED/i.test(e.message + e.cause)) process.exit(1);
    }
  }
}
console.log('done');
