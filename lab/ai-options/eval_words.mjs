// 평가 전용 세트(words-eval.json — 학습에 쓰지 않은 은유·간접 명령·부정)에서 석판 / 판정기 / 석판 + 판정기를 잰다
//   node --no-warnings lab/ai-options/eval_words.mjs [--all]
// 맞음(엄격): 시킨 일이 모두 나오고, 금한 일은 금지로 읽고, 금한 일을 시키지 않음
// 맞음(느슨): 시킨 일 가운데 하나라도 나오고(시킨 일이 없으면 통과) 금한 일을 시키지 않음 — 은유 세트(scoreIntent)와 같은 기준
import fs from 'node:fs';
const W = new URL('../../', import.meta.url).href;
const E = await import(W + 'js/game/engine.js');
const I = await import(W + 'js/game/interpreter.js');
const { judge } = await import(W + 'js/game/ai/judge.js');
const { kindOf } = await import(W + 'js/game/domain/index.js');
const { rows } = JSON.parse(fs.readFileSync(new URL('./words-eval.json', import.meta.url), 'utf8'));
const state = () => { const s = E.createState({ mode: 'tutorial', seed: 1 }); E.startRound(s); Object.assign(s.sides.player, { wood: 6, stone: 6, food: 6 }); return s; };

const score = { tablet: [0, 0, 0], judge: [0, 0, 0], both: [0, 0, 0] };
const lines = [];
for (const [text, want, dont, doctrine] of rows) {
  const rt = I.interpretWithTablet(state(), text);
  const rb = I.interpretWithJudge(state(), text);
  const j = judge(text);
  const views = {
    tablet: { do: rt.orders.map(kindOf), dont: rt.forbidden.map(kindOf), doc: rt.doctrine },
    judge: { do: j.do, dont: j.dont, doc: j.doctrine?.id ?? null },
    both: { do: rb.orders.map(kindOf), dont: rb.forbidden.map(kindOf), doc: rb.doctrine },
  };
  const marks = [];
  for (const [k, v] of Object.entries(views)) {
    const strict = want.every((w) => v.do.includes(w)) && dont.every((d) => v.dont.includes(d)) && !dont.some((d) => v.do.includes(d));
    const loose = (!want.length || want.some((w) => v.do.includes(w))) && !dont.some((d) => v.do.includes(d));
    score[k][0] += strict; score[k][1] += loose; score[k][2] += v.doc === doctrine;
    marks.push(strict ? 'O' : loose ? 'o' : 'X');
  }
  lines.push(`${marks.join('')} ${text} | 석판 ${views.tablet.do.join(',') || '-'}${views.tablet.dont.length ? ` ⊘${[...new Set(views.tablet.dont)]}` : ''} | 판정기 ${views.judge.do.join(',') || '-'}${views.judge.dont.length ? ` ⊘${views.judge.dont}` : ''} | 정답 ${want.join(',') || '-'}${dont.length ? ` ⊘${dont}` : ''}`);
}
if (process.argv.includes('--all')) for (const l of lines) console.log(l);
const n = rows.length;
for (const [k, [s, l, d]] of Object.entries(score)) console.log(`${{ tablet: '석판', judge: '판정기', both: '석판 + 판정기' }[k].padEnd(8)} 엄격 ${s}/${n} (${Math.round((100 * s) / n)}%) · 느슨 ${l}/${n} (${Math.round((100 * l) / n)}%) · 교리 ${d}/${n}`);
