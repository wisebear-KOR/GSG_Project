// bench.mjs의 작업자: 판 하나를 돌려 지표를 돌려준다
import { parentPort } from 'node:worker_threads';
const { runGame } = await import('./sim.mjs');
parentPort.on('message', (m) => {
  if (!m) process.exit(0);
  let res = null; let err = null;
  try { res = runGame(m.job.cfg, m.job.pol, m.job.botSeed, {}); } catch (e) { err = String(e.stack).split('\n').slice(0, 3).join(' | '); }
  if (res) { delete res.legal; delete res.lim; delete res.plans; delete res.tiles; delete res.types; delete res.elimLim; delete res.pop; delete res.enPop; }
  parentPort.postMessage({ job: m.job, res, err });
});
