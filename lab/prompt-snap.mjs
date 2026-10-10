// 해석기 프롬프트 대조 도구: 여러 판의 장마다 buildPrompt(state, 계시)의 글·스키마·행동 목록을 한 줄씩 찍는다.
// 리팩터링이 대사제(LLM)에게 가는 글을 한 글자도 바꾸지 않았는지 볼 때 쓴다 (lab/ui-snap.js의 프롬프트판).
//
//   node --no-warnings lab/prompt-snap.mjs > before.jsonl     (고치기 전)
//   node --no-warnings lab/prompt-snap.mjs > after.jsonl      (고친 뒤)  → 두 파일이 같아야 한다
// 다른 사본(워크트리)을 찍으려면 그 루트를 file:/// URL로 넘긴다: node lab/prompt-snap.mjs file:///E:/wt/

const root = process.argv[2] ?? new URL('..', import.meta.url).href;
const { E, mulberry32, pick, REVELATIONS, doSpeak, doAccept } = await import(new URL('tools/tests/lib.mjs', root).href);
const { buildPrompt } = await import(new URL('js/game/interpreter.js', root).href);
const out = [];
const CFGS = [{ mode: 'tutorial' }, { size: 4, difficulty: 'easy', veteran: true }, { size: 5, difficulty: 'normal', veteran: true }, { size: 6, difficulty: 'hard', veteran: true }, { size: 5, difficulty: 'normal' }];
for (let g = 0; g < 40; g++) {
  const cfg = { ...CFGS[g % CFGS.length], seed: 500 + g * 31 };
  const s = E.createState(cfg); const rng = mulberry32(g + 9);
  for (let r = 0; r < s.maxRounds && !s.winner; r++) {
    E.startRound(s);
    const text = pick(rng, REVELATIONS.slice(2, 48));
    const p = buildPrompt(s, text);
    out.push(JSON.stringify({ g, r: s.round, text: p.text, schema: p.schema, actions: p.actions.map((a) => a.key) }));
    doAccept(s, doSpeak(s, text));
  }
}
process.stdout.write(out.join('\n'));
