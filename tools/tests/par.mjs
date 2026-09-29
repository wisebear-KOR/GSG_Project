// Parallel runner: node par.mjs <jobs.json> <out.jsonl> [workers]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs';

if (isMainThread) {
  const [jobsFile, outFile, nw = '15'] = process.argv.slice(2);
  const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
  const W = Math.min(Number(nw), jobs.length);
  const out = fs.createWriteStream(outFile);
  let done = 0; let next = 0; const t0 = Date.now();
  let alive = W;
  for (let w = 0; w < W; w++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: {} });
    const feed = () => { if (next < jobs.length) worker.postMessage({ i: next, job: jobs[next++] }); else worker.postMessage(null); };
    worker.on('message', (m) => {
      out.write(JSON.stringify({ ...m.job, res: m.res, err: m.err }) + '\n');
      done++;
      if (done % 200 === 0) process.stderr.write(`${done}/${jobs.length} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
      feed();
    });
    worker.on('exit', () => { if (--alive === 0) { out.end(); console.log(`done ${done} jobs in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outFile}`); } });
    worker.on('error', (e) => console.error('worker error', e));
    feed();
  }
} else {
  const { runGame } = await import('./sim.mjs');
  parentPort.on('message', (m) => {
    if (!m) { process.exit(0); }
    let res = null; let err = null;
    try { res = runGame(m.job.cfg, m.job.pol, m.job.botSeed, m.job.opts ?? {}); } catch (e) { err = String(e.stack).split('\n').slice(0, 3).join(' | '); }
    parentPort.postMessage({ job: m.job, res, err });
  });
}
