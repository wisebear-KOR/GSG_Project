// 밸런스 벤치마크: 정해진 정책·맵·난이도 조합을 병렬로 돌리고 핵심 지표를 표로 낸다
//   node tools/tests/bench.mjs [quick|full] [출력 이름]
// 목표치(평가 2026-09-30): 한 줄 스크립트 승률 < 50%, 공격 0회 판 < 20%(보통), 대차(≥15) < 30%, 역전 25~35%
import { Worker } from 'node:worker_threads';
import fs from 'node:fs';
import os from 'node:os';

const mode = process.argv[2] ?? 'quick';
const name = process.argv[3] ?? mode;
const N_FIX = mode === 'full' ? 120 : 50;
const N_SMART = mode === 'full' ? 60 : 24;
const sizes = mode === 'full' ? [4, 5, 6, 7] : [5, 7];
const diffs = ['normal', 'hard'];
const vets = [false, true];
const fixed = ['fix:temple', 'fix:expand', 'fix:combo', 'fix:warcombo', 'fix:preach', 'fix:war', 'rotm:war3', 'rotm:war3b', 'rotm:mix4', 'rotm:preachwar', 'rotm:cmix', 'rotm:search', 'rotm:cpre', 'rotm:search2', 'cathbot'];

const jobs = [];
let seed = 1;
for (const size of sizes) for (const difficulty of diffs) for (const veteran of vets) {
  for (const pol of fixed) for (let i = 0; i < N_FIX; i++) jobs.push({ cfg: { mode: 'standard', size, difficulty, veteran, seed: 5000 + i * 7919 }, pol, botSeed: seed++ });
  for (const pol of ['smart', 'planner', 'smartcath', 'warplan']) for (let i = 0; i < N_SMART; i++) jobs.push({ cfg: { mode: 'standard', size, difficulty, veteran, seed: 9000 + i * 104729 }, pol, botSeed: seed++ });
  for (let i = 0; i < N_FIX; i++) jobs.push({ cfg: { mode: 'standard', size, difficulty, veteran, seed: 7000 + i * 31 }, pol: 'randcmd', botSeed: seed++ });
}

const W = Math.max(1, os.cpus().length - 1);
const results = [];
let next = 0; let alive = W; const t0 = Date.now();
await new Promise((done) => {
  for (let w = 0; w < W; w++) {
    const worker = new Worker(new URL('./bench-worker.mjs', import.meta.url));
    const feed = () => worker.postMessage(next < jobs.length ? { i: next, job: jobs[next++] } : null);
    worker.on('message', (m) => { results.push(m); if (results.length % 500 === 0) process.stderr.write(`${results.length}/${jobs.length} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); feed(); });
    worker.on('exit', () => { if (--alive === 0) done(); });
    worker.on('error', (e) => console.error(e));
    feed();
  }
});

fs.writeFileSync(new URL(`./bench-${name}.json`, import.meta.url), JSON.stringify(results));
const errs = results.filter((r) => r.err);
if (errs.length) console.log('ERRORS', errs.length, errs[0].err);
const ok = results.filter((r) => r.res);

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}` : '-');
const group = (f) => { const m = new Map(); for (const r of ok) { const k = f(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; };
const winRate = (rs) => pct(rs.filter((r) => r.res.w === 'player').length, rs.length);

console.log(`\n## 승률 % (${mode}, ${ok.length}판, ${((Date.now() - t0) / 1000).toFixed(0)}초)`);
const pols = [...new Set(ok.map((r) => r.job.pol))];
const cols = [];
for (const size of sizes) for (const d of diffs) for (const v of vets) cols.push([size, d, v]);
console.log(`| 정책 | ${cols.map(([s, d, v]) => `${s}${d[0]}${v ? 'V' : 'F'}`).join(' | ')} | 전체 |`);
console.log(`|---|${cols.map(() => '---').join('|')}|---|`);
for (const pol of pols) {
  const rs = ok.filter((r) => r.job.pol === pol);
  const cells = cols.map(([s, d, v]) => winRate(rs.filter((r) => r.job.cfg.size === s && r.job.cfg.difficulty === d && r.job.cfg.veteran === v)));
  console.log(`| ${pol} | ${cells.join(' | ')} | ${winRate(rs)} |`);
}

// smart 판의 긴장 지표
const sm = ok.filter((r) => r.job.pol === 'smart');
const margin = (r) => r.res.ps - r.res.es;
const mid = (r) => { const h = r.res.h; const m = h[Math.floor(h.length / 2) - 1]; return m ? m[0] - m[1] : 0; };
const bigLead = sm.filter((r) => Math.abs(mid(r)) >= 8);
const kept = bigLead.filter((r) => (mid(r) > 0) === (r.res.w === 'player'));
const comeback = sm.filter((r) => mid(r) !== 0 && (mid(r) > 0) !== (r.res.w === 'player'));
console.log('\n## smart 판 긴장 지표');
console.log(`- 대차(최종 |차| ≥ 15): ${pct(sm.filter((r) => Math.abs(margin(r)) >= 15).length, sm.length)}%  · 접전(≤3): ${pct(sm.filter((r) => Math.abs(margin(r)) <= 3).length, sm.length)}%`);
console.log(`- 역전(중반 선두가 짐): ${pct(comeback.length, sm.length)}%  · 중반 8점 이상 선두 유지: ${pct(kept.length, bigLead.length)}% (n=${bigLead.length})`);
console.log(`- 평균 길이: ${(sm.reduce((a, r) => a + r.res.r, 0) / sm.length).toFixed(1)}장`);
const kinds = {}; for (const r of sm) kinds[`${r.res.w}:${r.res.k}`] = (kinds[`${r.res.w}:${r.res.k}`] ?? 0) + 1;
console.log(`- 끝난 방식: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${pct(n, sm.length)}%`).join(' · ')}`);
console.log('\n## 계시가 정한 행동 비중 (정책별: 계시 / 교리를 따른 자동 / 그 밖의 자동)');
for (const [pol, rs] of group((r) => r.job.pol)) {
  const sum = (f) => rs.reduce((a, r) => a + (f(r) ?? 0), 0);
  const acc = sum((r) => r.res.pl.acc), auto = sum((r) => r.res.pl.auto), heed = sum((r) => r.res.pl.heeded), all = acc + auto || 1;
  console.log(`- ${pol}: ${pct(acc, all)}% / ${pct(heed, all)}% / ${pct(auto - heed, all)}%`);
}
console.log('\n## 율법파 교전 (smart 상대, 난이도별)');
for (const [d, rs] of group((r) => (r.job.pol === 'smart' ? r.job.cfg.difficulty : null))) {
  if (!d) continue;
  const n = rs.length;
  const noAtk = rs.filter((r) => r.res.en.atkN === 0).length;
  const avg = (f) => (rs.reduce((a, r) => a + f(r), 0) / n).toFixed(2);
  console.log(`- ${d}: 공격 0회 판 ${pct(noAtk, n)}% · 공격 ${avg((r) => r.res.en.atkN)}/판 · 수도 타격 ${avg((r) => r.res.en.capHit)} · 마을 빼앗음 ${avg((r) => r.res.en.capture)} · 선교로 넘겨받음 ${avg((r) => r.res.en.turn)}`);
}
