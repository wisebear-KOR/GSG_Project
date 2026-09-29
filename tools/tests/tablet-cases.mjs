// 석판(키워드) 해석기 회귀 시험: 새 플레이어가 쓸 법한 문장과 기대하는 행동
//   node tools/tests/tablet-cases.mjs [--all]
// 판정: want의 행동 종류(gather:any는 아무 채집)가 모두 나오고(금지는 forbid), avoid에 적힌 종류는 나오지 않아야 "성공".
// 상태: 튜토리얼 3×3 1장 (율법파 마을이 바로 옆이라 선교·공격 대상이 있다)
import * as E from '../../js/game/engine.js';
import * as I from '../../js/game/interpreter.js';

// 행동 종류 표기: gather:food / gather:wood / gather:stone / build:village / build:wall / build:temple / pray / explore / preach / attack
const CASES = [
  ['강에서 물고기를 잡고 이웃에게 사랑을 전하라', ['preach'], []],
  ['식량을 모아라', ['gather:food'], []],
  ['배불리 먹고 번성하라', ['gather:food'], []],
  ['나무를 베어 집을 지어라', ['gather:wood', 'build:village'], []],
  ['집을 더 지어라', ['build:village'], []],
  ['적을 물리쳐라', ['attack'], []],
  ['율법파를 공격하라', ['attack'], []],
  ['싸워라', ['attack'], []],
  ['전쟁을 준비하라', ['attack'], []],
  ['적의 마을을 빼앗아라', ['attack'], ['build:village']],
  ['신전에서 기도하라', ['pray'], []],
  ['기도해라', ['pray'], []],
  ['안개 너머를 살펴보라', ['explore'], []],
  ['세상을 둘러보라', ['explore'], []],
  ['새 땅을 개척하라', ['build:village'], []],
  ['겨울이 온다', ['gather:food'], []],
  ['바람이 부는 쪽으로 가라', ['explore'], []],
  ['굶주린 자가 없게 하라', ['gather:food'], []],
  ['돌을 모아 성벽을 쌓아라', ['gather:stone'], []],
  ['너희는 강하고 담대하라', [], ['gather:food']],
  ['산에 올라 나를 경배하라', ['pray'], []],
  ['아이를 많이 낳아 번성하라', ['build:village'], []],
  ['돌아가서 기다려라', [], ['gather:stone']],
  ['숲을 베지 말고 산에서 돌을 캐라', ['gather:stone', 'forbid:gather:wood'], ['gather:wood']],
  ['서로 사랑하라', ['preach'], []],
  ['빛이 있으라', ['explore'], []],
  ['오늘은 푹 쉬어라', ['pray'], []],
  ['곡식을 거두고 나무를 베고 돌을 캐라', ['gather:food', 'gather:wood', 'gather:stone'], []],
  ['불로 심판하라', ['attack'], []],
  ['그들을 쳐부숴라', ['attack'], []],
  ['자원을 최대한 모아라', ['gather:any'], []],
  ['생산을 늘려라', ['gather:any'], []],
  ['가서 너의 동족을 설득하라', ['preach'], []],
  ['나를 믿으라', ['pray'], []],
  ['지켜보라, 내가 기적을 행하리라', [], ['build:wall']],
  ['사자처럼 용맹하게 싸우라', ['attack'], []],
  ['두려워하지 말고 쳐라', ['attack'], []],
  ['곡식을 많이 거두라', ['gather:food'], []],
  ['마을마다 성벽을 쌓아 지켜라', ['build:wall'], []],
  ['율법파의 땅에 말씀을 전하라', ['preach'], ['build:village']],
  // 새 문장 시험 묶음 1~3 (2026-09-30). 묶음 3의 첫 측정(튜닝 전)은 67%였다
  ['들판의 곡식을 거둬들여라', ['gather:food'], []],
  ['물가에서 고기를 낚아라', ['gather:food'], []],
  ['성을 쌓아 적을 막아라', ['build:wall'], []],
  ['적들을 몰아내라', ['attack'], []],
  ['이웃 부족과 화해하라', ['preach'], []],
  ['주님께 제물을 바쳐라', ['pray'], []],
  ['새로운 마을을 세워라', ['build:village'], []],
  ['높은 탑을 쌓아라', ['build:temple'], []],
  ['숲에서 땔감을 구하라', ['gather:wood'], []],
  ['돌을 깎아 신전을 높여라', ['build:temple'], []],
  ['모두 함께 밭을 갈아라', ['gather:food'], []],
  ['멀리 떨어진 땅을 알아보라', ['explore'], []],
  ['율법파에게 복음을 전하라', ['preach'], []],
  ['침략자를 쫓아내라', ['attack'], []],
  ['백성을 불려라', ['build:village'], []],
  ['곳간을 채워라', ['gather:food'], []],
  ['창을 들고 나아가라', ['attack'], []],
  ['신께 감사하라', ['pray'], []],
  ['저 산 너머에 무엇이 있는지 알아보라', ['explore'], []],
  ['배고픈 자에게 빵을 나눠라', ['gather:food'], []],
  ['나무를 심고 숲을 가꾸어라', ['gather:wood'], []],
  ['마을을 지키는 담을 쌓아라', ['build:wall'], []],
  ['율법의 탑을 무너뜨려라', ['attack'], []],
  ['평화롭게 지내라', ['pray'], []],
  ['땅을 넓혀 자손을 번성케 하라', ['build:village'], []],
  ['씨를 뿌리고 거두는 자가 되라', ['gather:food'], []],
  ['너희의 칼을 갈아라', ['attack'], []],
  ['모든 이에게 나의 뜻을 알려라', ['preach'], []],
  ['저들의 신전을 불살라라', ['attack'], ['build:temple']],
  ['들짐승을 사냥하라', ['gather:food'], []],
  ['강둑을 따라 마을을 세워라', ['build:village'], []],
  ['너희 신앙을 굳게 하라', ['pray'], []],
  ['나의 집을 크게 지어라', ['build:temple'], []],
  ['외지인을 받아들여라', ['preach'], []],
  ['곡간이 넘치게 하라', ['gather:food'], []],
  ['적의 성벽을 깨뜨려라', ['attack'], ['build:wall']],
  ['광야로 나가 길을 찾아라', ['explore'], []],
  ['나를 찬송하라', ['pray'], []],
  ['형제를 가르쳐라', ['preach'], []],
  ['바위를 깨어 돌을 모아라', ['gather:stone'], []],
  ['큰 나무를 베어 배를 만들어라', ['gather:wood'], []],
  ['이방인에게 나의 이름을 전파하라', ['preach'], []],
  ['밤이 오기 전에 창고를 채워라', ['gather:food'], []],
  ['적이 오면 맞서 싸워라', ['attack'], []],
  ['안식일을 지켜라', ['pray'], ['build:wall']],
  ['백성이 굶지 않게 하라', ['gather:food'], []],
  ['높은 곳에 제단을 쌓아라', ['build:temple'], []],
  ['먼 곳을 살피고 돌아오라', ['explore'], []],
  ['율법파의 마을로 진군하라', ['attack'], ['build:village']],
  ['새 터전을 마련하라', ['build:village'], []],
  ['성벽을 높이 쌓아라', ['build:wall'], ['build:temple']],
  ['함께 노래하며 기도하라', ['pray'], []],
  ['고기를 잡아 백성을 먹여라', ['gather:food'], []],
  ['어둠을 밝혀라', ['explore'], []],
  ['우리 땅을 굳게 지켜라', ['build:wall'], []],
  ['부지런히 일하여 먹을 것을 쌓아라', ['gather:food'], []],
  ['네 이웃을 네 몸같이 여겨라', ['preach'], []],
  ['원수를 갚아라', ['attack'], []],
  ['해가 뜨는 곳으로 떠나라', ['explore'], []],
  ['돌로 단을 쌓고 향을 피워라', ['pray'], []],
  ['숲속의 나무를 모두 베어라', ['gather:wood'], []],
  ['굳건한 성채를 세워라', ['build:wall'], []],
  ['나의 거룩한 집을 더 높여라', ['build:temple'], []],
  ['사람들이 모여 살 곳을 마련하라', ['build:village'], []],
  ['그들을 설득하여 우리 편으로 만들어라', ['preach'], []],
  ['가뭄이 오니 곡식을 아껴 거두라', ['gather:food'], []],
  ['하늘을 우러러 경배하라', ['pray'], []],
  ['모르는 땅을 밟아 보라', ['explore'], []],
  ['율법파를 벌하라', ['attack'], []],
  ['광산에서 돌을 캐내라', ['gather:stone'], []],
  ['울타리를 둘러 마을을 보호하라', ['build:wall'], []],
  ['후손이 많아지게 하라', ['build:village'], []],
  ['내게 무릎 꿇어라', ['pray'], []],
  ['물고기를 잡아 굶주림을 면하라', ['gather:food'], []],
  ['적진으로 쳐들어가라', ['attack'], []],
  ['나의 말을 온 세상에 퍼뜨려라', ['preach'], []],
  ['목재를 넉넉히 마련하라', ['gather:wood'], []],
  ['신전의 첨탑을 올려라', ['build:temple'], []],
  ['조용히 쉬며 나를 기억하라', ['pray'], []],
  ['낯선 곳의 비밀을 밝혀내라', ['explore'], []],
  ['그들의 마을을 불태워라', ['attack'], []],
  ['형제들을 불러 모아 함께 살게 하라', ['build:village'], []],
  ['열매를 따서 저장하라', ['gather:food'], []],
  ['의심하는 자들에게 가르침을 베풀라', ['preach'], []],
  ['방패를 들고 굳게 버텨라', ['build:wall'], []],
];

const kindOf = (a) => (a.type === 'gather' ? `gather:${a.gather}` : a.type === 'build' ? `build:${a.build}` : a.type);
function state() {
  const s = E.createState({ mode: 'tutorial', seed: 1 });
  E.startRound(s);
  // 돌·목재가 있어야 성벽·마을 명령이 가능하다
  Object.assign(s.sides.player, { wood: 6, stone: 6, food: 6 });
  return s;
}
let ok = 0;
const rows = [];
for (const [text, want, avoid] of CASES) {
  const s = state();
  const r = I.interpretWithTablet(s, text);
  const kinds = r.orders.map(kindOf);
  const forb = r.forbidden.map((a) => `forbid:${kindOf(a)}`);
  const all = [...kinds, ...forb];
  const has = (w) => (w === 'gather:any' ? kinds.some((k) => k.startsWith('gather:')) : all.includes(w));
  const pass = want.every(has) && avoid.every((w) => !kinds.includes(w));
  if (pass) ok += 1;
  rows.push([pass ? 'O' : 'X', text, all.join(' ') || '(없음)', r.interpretation]);
}
for (const row of rows) if (process.argv.includes('--all') || row[0] === 'X') console.log(row.join(' | '));
console.log(`\n석판 이해: ${ok}/${CASES.length} (${Math.round((100 * ok) / CASES.length)}%)`);
