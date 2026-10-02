// 작은 벤치: 워크트리 엔진(GSG_V 변형)으로 몇 정책만
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import os from 'node:os';
const W = process.env.WTURL ?? `file:///C:/Users/dmswo/AppData/Local/Temp/claude/E--ClaudeCode-GSG-Project/90b28daf-5f3d-4d5a-94b3-78b25623212f/scratchpad/${process.env.WT ?? "wt"}/tools/tests/`;
if (!isMainThread) {
  const { runGame } = await import(W + 'sim.mjs');
  parentPort.on('message', (m) => {
    if (!m) process.exit(0);
    let r = null; try { const x = runGame(m.cfg, m.pol, m.bs, {}); r = { w: x.w, k: x.k, ps: x.ps, es: x.es, h: x.h }; } catch (e) { r = { err: String(e.stack).slice(0, 300) }; }
    parentPort.postMessage({ m, r });
  });
} else {
  const N = +(process.env.N ?? 40);
  const pols = (process.env.POLS ?? 'rotm:preachwar,rotm:war3,smart,planner,warplan,smartcath').split(',');
  const cfgs = (process.env.CFGS ?? '4nF,5nF,5hF,5nV,6nF,6hV,7nF').split(',');
  const jobs = []; let bs = 1;
  for (const c of cfgs) {
    const cfg = { mode: 'standard', size: +c[0], difficulty: { n: 'normal', h: 'hard', e: 'easy' }[c[1]], veteran: c[2] === 'V' };
    if (c[2] === 'F') cfg.unlock = 0;
    for (const pol of pols) for (let i = 0; i < N; i++) jobs.push({ cfg: { ...cfg, seed: 5000 + i * 7919 }, pol, bs: bs++, c });
  }
  const res = []; let next = 0; let alive = Math.max(1, os.cpus().length - 1);
  await new Promise((done) => { const n = alive; for (let w = 0; w < n; w++) { const wk = new Worker(new URL(import.meta.url)); const feed = () => wk.postMessage(next < jobs.length ? jobs[next++] : null); wk.on('message', (x) => { res.push(x); feed(); }); wk.on('exit', () => { if (--alive === 0) done(); }); feed(); } });
  const errs = res.filter((x) => x.r.err); if (errs.length) console.log('ERR', errs.length, errs[0].r.err);
  const ok = res.filter((x) => !x.r.err);
  console.log(`== ${process.env.WT ?? 'wt'} ${process.env.GSG_V || 'base'}  (N=${N})`);
  console.log('pol'.padEnd(16) + cfgs.map((c) => c.padStart(5)).join('') + '   all  | player win kinds');
  for (const pol of pols) {
    const rs = ok.filter((x) => x.m.pol === pol);
    const cell = (a) => (a.length ? Math.round(100 * a.filter((x) => x.r.w === 'player').length / a.length) : '-');
    const kinds = {}; for (const x of rs) if (x.r.w === 'player') kinds[x.r.k] = (kinds[x.r.k] ?? 0) + 1;
    console.log(pol.padEnd(16) + cfgs.map((c) => String(cell(rs.filter((x) => x.m.c === c))).padStart(5)).join('') + String(cell(rs)).padStart(6) + '  | ' + Object.entries(kinds).map(([k, n]) => `${k}:${n}`).join(' '));
  }
  const sm = ok.filter((x) => ['smart', 'planner', 'warplan'].includes(x.m.pol));
  const mg = (x) => x.r.ps - x.r.es;
  console.log(`skilled: blowout(|m|>=15) ${Math.round(100 * sm.filter((x) => Math.abs(mg(x)) >= 15).length / sm.length)}%  close(<=3) ${Math.round(100 * sm.filter((x) => Math.abs(mg(x)) <= 3).length / sm.length)}%`);
}
