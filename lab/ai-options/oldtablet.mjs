// 그때의 석판: node oldtablet.mjs <풀어 둔 js 폴더의 file:/// URL> <시작> <끝> → stdout JSON [{i, do, dont}]
import fs from 'node:fs';
const [root, s, e] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
const E = await import(new URL('js/game/engine.js', root).href);
const I = await import(new URL('js/game/interpreter.js', root).href);
const cases = JSON.parse(fs.readFileSync(new URL('./cases.json', import.meta.url), 'utf8'));
const kindOf = (a) => (a.type === 'gather' ? `gather:${a.gather}` : a.type === 'build' ? `build:${a.build}` : a.type);
// tablet-cases.mjs와 같은 상태: 튜토리얼 1장, 성벽·마을이 가능하게 돌·목재·식량 6
const st = E.createState({ mode: 'tutorial', seed: 1 }); if (E.startRound) E.startRound(st); Object.assign(st.sides.player, { wood: 6, stone: 6, food: 6 });
const out = [];
for (let i = s; i < e; i++) {
  const r = I.interpretWithTablet(st, cases[i].text);
  out.push({ i, do: [...new Set(r.orders.map(kindOf))], dont: [...new Set((r.forbidden ?? []).map(kindOf))] });
}
process.stdout.write(JSON.stringify(out));
