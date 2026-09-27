import fs from 'node:fs';
const f = process.argv[2];
const { games, POLICY, N } = JSON.parse(fs.readFileSync(f));
const g = games.filter((x) => x.winner);
const pct = (a, b) => b ? (100 * a / b).toFixed(0) + '%' : '-';
const avg = (xs) => xs.length ? (xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(1) : '-';
console.log(`## ${POLICY} bot, ${N} games`);
console.log('\nWin rate (player) by difficulty x size  [n]');
const diffs = ['easy', 'normal', 'hard'];
console.log('diff   | 5x5 | 6x6 | 7x7 | all');
for (const d of diffs) {
  const row = [5, 6, 7].map((s) => { const xs = g.filter((x) => x.cfg.difficulty === d && x.cfg.size === s); return `${pct(xs.filter((x) => x.winner === 'player').length, xs.length)} [${xs.length}]`; });
  const all = g.filter((x) => x.cfg.difficulty === d);
  console.log(`${d.padEnd(6)} | ${row.join(' | ')} | ${pct(all.filter((x) => x.winner === 'player').length, all.length)}`);
}
const tut = g.filter((x) => x.cfg.mode === 'tutorial');
console.log(`tutorial: ${pct(tut.filter((x) => x.winner === 'player').length, tut.length)} [${tut.length}]`);
console.log('\nAvg final score player:enemy, avg length (rounds / max), early-end rate');
for (const d of diffs) for (const s of [5, 6, 7]) {
  const xs = g.filter((x) => x.cfg.difficulty === d && x.cfg.size === s);
  console.log(`${d} ${s}x${s}: ${avg(xs.map((x) => x.score[0]))} : ${avg(xs.map((x) => x.score[1]))}, len ${avg(xs.map((x) => x.rounds))}/${xs[0]?.maxRounds}, ended early ${pct(xs.filter((x) => x.rounds < x.maxRounds).length, xs.length)}`);
}
console.log('\nOutcome kinds');
const kinds = {};
for (const x of g) kinds[x.kind] = (kinds[x.kind] ?? 0) + 1;
for (const [k, v] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v} (${pct(v, g.length)})`);
console.log(`ties decided for player (score equal): ${g.filter((x) => x.kind === 'score' && x.score[0] === x.score[1]).length}`);
const S = (k) => g.reduce((s, x) => s + (x.stat?.[k] ?? 0), 0);
console.log('\nEvents per game');
console.log(`  prophecies sealed ${S('propSealed')}, fulfilled ${S('propWon')} (${pct(S('propWon'), S('propSealed'))}), failed ${S('propFailed')}`);
const vet = g.filter((x) => x.cfg.veteran && x.cfg.mode !== 'tutorial');
console.log(`  miracle offers: ${S('miracleOffers')} in ${g.length} games; veteran games reaching r5: ${vet.filter((x) => x.rounds >= 5).length}/${vet.length}`);
console.log(`  site discoveries (auto+nomad): ${S('sites')} → ${avg(g.map((x) => x.stat.sites))}/game; nomad choices ${S('siteChoices')}; games with >=1 site ${pct(g.filter((x) => x.stat.sites > 0).length, g.length)}`);
console.log(`  wisdom event choices: ${S('eventChoices')}, miracles cast ${S('miraclesCast')}, hydrates ${S('hydrates')}`);
console.log(`  rounds with player pop > popCap: ${S('pOverCap')}; enemy intent changed by a miracle: ${S('intentDriftAfterMiracle')}`);
const ps = (k) => avg(g.map((x) => x.pstats?.[k] ?? 0));
console.log(`  per game: converted ${ps('converted')}, captured ${ps('captured')}, petitions ${ps('petitions')}, turned ${ps('turned')}`);
const ach = {};
for (const x of g) for (const a of x.ach ?? []) ach[a] = (ach[a] ?? 0) + 1;
console.log('  achievements: ' + Object.entries(ach).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, g.length)}`).join(', '));
