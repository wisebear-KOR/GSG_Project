// 금지 합성 문장: 석판 시험 문장 가운데 일 하나만 시키는 짧은 문장 + "~는 하지 마라" 절. 정답은 석판이 붙인다(석판이 금지를 못 읽은 문장은 버린다).
//   node synth.mjs → synth.json
import fs from 'node:fs';
const W = new URL('../../', import.meta.url).href; // 저장소 루트
const E = await import(W + 'js/game/engine.js');
const I = await import(W + 'js/game/interpreter.js');
const { KINDS, kindOf } = await import(W + 'js/game/domain/index.js');
const cases = JSON.parse(fs.readFileSync(new URL('./cases.json', import.meta.url), 'utf8'));
const s = E.createState({ mode: 'tutorial' }); E.startRound(s);
const NEG = {
  'gather:food': ['곡식은 거두지 마라', '고기는 잡지 마라'], 'gather:wood': ['나무는 베지 마라', '숲은 건드리지 마라'], 'gather:stone': ['돌은 캐지 마라', '산은 파지 마라'],
  'build:village': ['마을은 세우지 마라', '집은 짓지 마라'], 'build:wall': ['성벽은 쌓지 마라', '담은 두르지 마라'], 'build:temple': ['신전은 올리지 마라'],
  pray: ['기도는 하지 마라', '제사는 드리지 마라'], explore: ['탐험은 하지 마라', '안개 너머로 가지 마라'], preach: ['설교는 하지 마라', '저들을 설득하지 마라'],
  attack: ['싸우지는 마라', '칼을 들지 마라', '공격은 하지 마라'],
};
// 이 합성 문장은 은유 세트·묶음 평가와 겹치지 않게 석판 문장 앞쪽 절반(인덱스 < 650)에서만 긍정 문장을 가져온다
const pos = cases.filter((c) => c.i < 650 && c.text.length <= 14 && Object.values(c.say).filter((v) => v === 'do').length === 1 && !Object.values(c.say).includes('dont'));
let rng = 7; const r = () => ((rng = (rng * 1103515245 + 12345) % 2147483648) / 2147483648);
const out = []; const seen = new Set();
for (let n = 0; n < 4000 && out.length < 400; n++) {
  const p = pos[Math.floor(r() * pos.length)];
  const k = KINDS[Math.floor(r() * KINDS.length)];
  if (!NEG[k] || p.say[k] === 'do') continue;
  const neg = NEG[k][Math.floor(r() * NEG[k].length)];
  const text = r() < 0.5 ? `${p.text.replace(/[.!]$/, '')}, ${neg}` : `${neg}, ${p.text}`;
  if (seen.has(text)) continue; seen.add(text);
  const res = I.interpretWithTablet(s, text);
  const say = Object.fromEntries(KINDS.map((x) => [x, 'none']));
  for (const a of res.orders) say[kindOf(a)] = 'do';
  for (const a of res.forbidden) say[kindOf(a)] = 'dont';
  if (say[k] !== 'dont') continue; // 석판이 금지를 못 읽은 것은 버린다
  out.push({ text, say, doctrine: res.doctrine ?? null, want: [], avoid: [] });
}
fs.writeFileSync(new URL('./synth.json', import.meta.url), JSON.stringify(out));
console.log('synth', out.length, 'from', pos.length, 'positives; e.g.', out.slice(0, 4).map((x) => x.text).join(' / '));
