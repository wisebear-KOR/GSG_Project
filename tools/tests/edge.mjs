import { E, D, L, I, doSpeak, doAccept, roundTrip, deepDiff } from './lib.mjs';
const out = (k, v) => console.log(k.padEnd(34), v);
// 1. faithless defection revives an extinct enemy
{
  const s = E.createState({ size: 5, difficulty: 'normal', seed: 1 });
  E.startRound(s);
  s.sides.enemy.pop = 0; s.sides.player.faith = 0; s.sides.player.faithless = 1; s.sides.player.pop = 3;
  E.resolveRound(s, [], []);
  out('1 extinct enemy + faithless', `winner=${s.winner} enemyPop=${s.sides.enemy.pop}`);
}
// 2. castMiracle in final round ends game before resolution
{
  const s = E.createState({ size: 5, difficulty: 'easy', seed: 3 });
  while (s.round < s.maxRounds - 1) { E.startRound(s); E.resolveRound(s, E.autoFill(s, 'player', []), E.planEnemy(s)); if (s.winner) break; }
  E.startRound(s); s.sides.player.faith = 10;
  const r = E.castMiracle(s, 'rain');
  out('2 rain at final round start', `ok=${r.ok} winner=${s.winner} reason=${s.winReason}`);
  const food = s.sides.player.food; const logN = s.log.length;
  E.resolveRound(s, E.autoFill(s, 'player', []), E.planEnemy(s));
  out('   then resolveRound', `food ${food}->${s.sides.player.food}, new logs ${s.log.length - logN} (actions voided)`);
}
// 3. silence wipes ark
{
  const s = E.createState({ size: 5, difficulty: 'normal', seed: 5, veteran: true });
  E.startRound(s); s.miracleHand.push('ark'); s.sides.player.faith = 10;
  E.castMiracle(s, 'ark');
  const pd = doSpeak(s, '');
  const before = { ...s.roundMods };
  doAccept(s, pd);
  out('3 ark then silence', `mods before accept ${JSON.stringify(before)}; ark active during resolve? ${'ark' in s.roundMods}`);
}
// 4. hydrate of state with prophecy/names/lessons/stats.turned
{
  const s = E.createState({ size: 6, difficulty: 'hard', seed: 9, veteran: true });
  E.startRound(s);
  doAccept(s, doSpeak(s, '이 강을 요단이라 부르라'));
  E.startRound(s);
  const pd = doSpeak(s, '두 장 안에 율법파의 마을이 무너지리라', { seal: true });
  doAccept(s, pd);
  s.stats.turned = 1; s.tiles[3].faithMarks = { side: 'player', n: 1, round: 2 };
  const h = roundTrip(s);
  out('4 hydrate diff', deepDiff(s, h) ?? 'none');
  out('   tileAt identity', h.tileAt[h.tiles[0].id] === h.tiles[0]);
}
// 5. tie score -> player
{
  const s = E.createState({ size: 5, difficulty: 'normal', seed: 11 });
  s.round = s.maxRounds; s.sides.player.pop = 5; s.sides.enemy.pop = 5; s.sides.enemy.capitalHp = 3; s.sides.player.capitalHp = 3;
  for (const t of s.tiles) if (t.building === 'village') { t.building = null; t.owner = null; }
  E.checkVictory(s);
  out('5 tie at max rounds', `${s.winner} ${s.winReason}`);
}
// 6. naming kinds that parseNaming accepts but can't be placed; name reuse
{
  const s = E.createState({ size: 5, difficulty: 'normal', seed: 2 });
  E.startRound(s);
  for (const t of ['이 강을 요단이라 부르라', '저 강을 요단이라 부르라', '이 사막을 광야라 부르라', '들을 들이라 부르라', '신전을 시온이라 부르라', '숲을 숲이라 부르라', '마을을 새벽이라 부르라'])
    out(`6 naming "${t}"`, JSON.stringify([L.parseNaming(t), E.nameTile(s, L.parseNaming(t))]));
}
// 7. parseProphecy variations
for (const t of ['두 장 안에 율법파의 마을이 무너지리라', '10장 안에 수도가 무너지리라', '마을이 무너지지 않으리라', '너희는 개종하지 마라, 그리하면 복되리라', '0장 안에 탑이 무너지리라', '세 번 안에 자손이 태어나리라'])
  out(`7 prophecy "${t}"`, JSON.stringify(L.parseProphecy(t)));
// 8. tone precedence
for (const t of ['축복하되 저들을 멸하라', '복을 받으라', '들을 거두듯이', '저주받은 강처럼']) out(`8 tone "${t}"`, L.detectTone(t));
// 9. negation: forbid overrides order in same clause set
{
  const s = E.createState({ size: 5, difficulty: 'normal', seed: 4 }); E.startRound(s);
  for (const t of ['숲을 베지 마라', '싸우지 마라, 평화를 지켜라', '두려워하지 말고 쳐라', '강에서 물고기를 잡아라'])
    { const r = I.interpretWithTablet(s, t); out(`9 tablet "${t}"`, `orders=${r.orders.map((a) => a.key)} forb=${r.forbidden.map((a) => a.key)} doc=${r.doctrine}`); }
}
