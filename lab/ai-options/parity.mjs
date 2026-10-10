// 판정기 JS 추론이 파이썬(train_judge.py)과 같은지: judge-parity.json의 확률과 견준다
//   node --no-warnings lab/ai-options/parity.mjs
import fs from 'node:fs';
const { judge } = await import(new URL('../../js/game/ai/judge.js', import.meta.url).href);
const ref = JSON.parse(fs.readFileSync(new URL('./judge-parity.json', import.meta.url), 'utf8'));
let maxd = 0; let flips = 0;
for (const r of ref) {
  const j = judge(r.text);
  for (const [k, p] of Object.entries(r.say)) {
    for (let c = 0; c < 3; c++) maxd = Math.max(maxd, Math.abs(p[c] - j.p[k][c]));
    if (p.indexOf(Math.max(...p)) !== j.p[k].indexOf(Math.max(...j.p[k]))) flips += 1;
  }
  const dref = Object.entries(r.doctrine).sort((a, b) => b[1] - a[1])[0];
  if (j.doctrine && Math.abs(dref[1] - j.doctrine.p) > maxd) maxd = Math.abs(dref[1] - j.doctrine.p);
}
console.log(`parity: ${ref.length} sentences, max prob diff ${maxd.toExponential(2)}, argmax flips ${flips}`);
process.exitCode = maxd < 1e-4 && !flips ? 0 : 1;
