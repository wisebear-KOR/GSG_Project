// 판정기와 함께 읽기(interpretWithJudge) 시험 — 게임의 기본 해석기
//   node tools/tests/judge.mjs [--all]
// 1) 석판 시험 문장(tablet-cases.mjs와 같은 상태·판정): 판정기가 끼어도 알던 말을 잃지 않는가
// 2) 은유 세트(lab/scenario.js 채점 20): 석판만 vs 판정기와 함께
// 3) 결정적인가: 같은 글은 늘 같은 판정
import fs from 'node:fs';
import * as E from '../../js/game/engine.js';
import * as I from '../../js/game/interpreter.js';
import { judge } from '../../js/game/ai/judge.js';
import { SAMPLE_SETS } from '../../lab/scenario.js';

const src = fs.readFileSync(new URL('./tablet-cases.mjs', import.meta.url), 'utf8');
const start = src.indexOf('const CASES = [');
let depth = 0; let end = -1;
for (let i = src.indexOf('[', start); i < src.length; i++) { if (src[i] === '[') depth++; else if (src[i] === ']') { depth--; if (!depth) { end = i + 1; break; } } }
const CASES = (0, eval)(src.slice(src.indexOf('[', start), end));

const kindOf = (a) => (a.type === 'gather' ? `gather:${a.gather}` : a.type === 'build' ? `build:${a.build}` : a.type);
function state() {
  const s = E.createState({ mode: 'tutorial', seed: 1 });
  E.startRound(s);
  Object.assign(s.sides.player, { wood: 6, stone: 6, food: 6 });
  return s;
}
const passOf = (r, want, avoid) => {
  const kinds = r.orders.map(kindOf);
  const all = [...kinds, ...r.forbidden.map((a) => `forbid:${kindOf(a)}`), ...(r.heard ?? []).map((h) => `heard:${h}`)];
  const has = (w) => (w === 'gather:any' ? kinds.some((k) => k.startsWith('gather:')) : all.includes(w));
  return want.every(has) && avoid.every((w) => !kinds.includes(w));
};

// 1) 석판 시험 문장
let tab = 0; let jud = 0; let took = 0; const lost = []; const won = [];
for (const [text, want, avoid] of CASES) {
  const rt = I.interpretWithTablet(state(), text);
  const rj = I.interpretWithJudge(state(), text);
  const a = passOf(rt, want, avoid); const b = passOf(rj, want, avoid);
  tab += a; jud += b; took += rj.judge?.took ? 1 : 0;
  if (a && !b) lost.push(`${text} → ${rj.orders.map(kindOf).join(',') || '-'}${rj.forbidden.length ? ` ⊘${[...new Set(rj.forbidden.map(kindOf))].join(',')}` : ''} (판정 ${rj.judge?.conf.toFixed(2)})`);
  if (!a && b) won.push(text);
}

// 2) 은유 세트 (시나리오 행동 → 일의 종류, lab/ai-options/data.mjs와 같은 대응)
const MAP = { G1: ['gather:wood'], G2: ['gather:food'], G3: ['gather:food'], G4: ['gather:stone'], P1: ['pray'], B1: ['gather:food'], B2: ['build:wall'],
  B3: ['build:temple', 'pray'], R1: ['pray'], M1: ['preach'], M2: ['preach'], W1: ['attack'], W2: ['attack'], E1: ['explore'] };
let ms = { tablet: 0, judge: 0, n: 0 };
const metaphor = [];
for (const s of Object.values(SAMPLE_SETS).flat().filter((x) => !x.observe)) {
  const expect = s.expect.flatMap((id) => MAP[id]); const avoid = s.avoid.flatMap((id) => MAP[id]);
  const ok = (r) => { const k = r.orders.map(kindOf); return (!expect.length || expect.some((x) => k.includes(x))) && !avoid.some((x) => k.includes(x)); };
  const rt = I.interpretWithTablet(state(), s.text); const rj = I.interpretWithJudge(state(), s.text);
  ms.n += 1; ms.tablet += ok(rt); ms.judge += ok(rj);
  metaphor.push(`${ok(rt) ? 'O' : 'X'}${ok(rj) ? 'O' : 'X'} ${s.text} → 석판 ${rt.orders.map(kindOf).join(',') || '-'} / 함께 ${rj.orders.map(kindOf).join(',') || '-'}`);
}

// 2b) 다른 작성자의 평가 세트 B (lab/ai-options/words-eval-b.json — 학습에 쓰지 않음): 엄격 정답률 (기록용, 판정 기준 아님)
let evalB = null;
try {
  const { rows } = JSON.parse(fs.readFileSync(new URL('../../lab/ai-options/words-eval-b.json', import.meta.url), 'utf8'));
  const strict = (r, want, dont) => { const k = r.orders.map(kindOf); const f = r.forbidden.map(kindOf); return want.every((w) => k.includes(w)) && dont.every((d) => f.includes(d)) && !dont.some((d) => k.includes(d)); };
  evalB = { n: rows.length, tablet: 0, judge: 0 };
  for (const [text, want, dont] of rows) { evalB.tablet += strict(I.interpretWithTablet(state(), text), want, dont); evalB.judge += strict(I.interpretWithJudge(state(), text), want, dont); }
} catch { /* 세트가 없으면 건너뛴다 */ }

// 3) 결정적인가
const det = CASES.slice(0, 200).every(([text]) => JSON.stringify(judge(text)) === JSON.stringify(judge(text)));

if (process.argv.includes('--all')) { console.log('은유 (석판·함께):'); for (const l of metaphor) console.log(' ', l); }
if (lost.length) { console.log('판정기가 끼어 잃은 문장:'); for (const l of lost) console.log('  -', l); }
console.log(`석판 시험 문장: 석판 ${tab}/${CASES.length} · 판정기와 함께 ${jud}/${CASES.length} (판정기가 정한 문장 ${took}, 잃음 ${lost.length}, 얻음 ${won.length})`);
console.log(`은유 세트: 석판 ${ms.tablet}/${ms.n} · 판정기와 함께 ${ms.judge}/${ms.n}`);
if (evalB) console.log(`다른 작성자의 평가 세트 B (엄격): 석판 ${evalB.tablet}/${evalB.n} · 판정기와 함께 ${evalB.judge}/${evalB.n}`);
console.log(`결정적: ${det}`);
process.exitCode = jud >= CASES.length - 5 && ms.judge >= ms.tablet && det ? 0 : 1;
