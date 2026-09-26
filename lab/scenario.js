// 해석기 실험용 고정 시나리오: 보드 상태, 가능한 행동, 프롬프트, 모의 해석기

export const DOCTRINES = ['peace', 'war', 'abundance', 'wisdom'];
export const DOCTRINE_LABEL = { peace: '평화', war: '전쟁', abundance: '풍요', wisdom: '지혜' };

export const TILE_LABEL = {
  forest: '동쪽 숲', plain: '남쪽 평원', river: '강가', mountain: '북쪽 산',
  temple: '신전', village: '우리 마을', hill: '성스러운 언덕', border: '국경 초원',
  enemyVillage: '율법파 마을', enemyTemple: '율법파 신전', fog: '서쪽 안개 지대',
};

// 같은 장소(tile)는 한 라운드에 한 번만 쓸 수 있다.
export const ACTIONS = [
  { id: 'G1', type: 'gather',  tile: 'forest',       ko: '동쪽 숲에서 목재를 모은다 (목재 +2)',                en: 'Gather wood in the east forest (wood +2)' },
  { id: 'G2', type: 'gather',  tile: 'plain',        ko: '남쪽 평원에서 곡식을 거둔다 (식량 +2)',              en: 'Harvest grain on the south plain (food +2)' },
  { id: 'G3', type: 'gather',  tile: 'river',        ko: '강가에서 물고기를 잡는다 (식량 +1)',                 en: 'Fish at the river (food +1)' },
  { id: 'G4', type: 'gather',  tile: 'mountain',     ko: '북쪽 산에서 돌을 캔다 (돌 +2, 낙석 위험)',          en: 'Quarry stone in the north mountain (stone +2, risk of rockfall)' },
  { id: 'P1', type: 'pray',    tile: 'temple',       ko: '신전에서 기도한다 (신앙 +2)',                        en: 'Pray at the temple (faith +2)' },
  { id: 'B1', type: 'build',   tile: 'plain',        ko: '남쪽 평원에 밭을 일군다 (목재 -1, 이후 식량 생산 증가)', en: 'Build a farm on the south plain (wood -1, more food later)' },
  { id: 'B2', type: 'build',   tile: 'village',      ko: '우리 마을에 성벽을 쌓는다 (목재 -2, 방어 +2)',       en: 'Build a wall around our village (wood -2, defense +2)' },
  { id: 'B3', type: 'build',   tile: 'hill',         ko: '성스러운 언덕에 제단을 세운다 (목재 -2, 신앙 생산 증가)', en: 'Raise an altar on the holy hill (wood -2, more faith later)' },
  { id: 'R1', type: 'rest',    tile: 'village',      ko: '마을에서 쉰다 (식량 소비 -1)',                       en: 'Rest in the village (food upkeep -1)' },
  { id: 'M1', type: 'preach',  tile: 'border',       ko: '국경 초원에서 율법파에게 신의 뜻을 전한다 (개종 판정)', en: 'Preach to the Lawkeepers at the border meadow (conversion roll)' },
  { id: 'M2', type: 'preach',  tile: 'enemyVillage', ko: '율법파 마을에 들어가 설교한다 (개종 판정 유리, 붙잡힐 위험)', en: 'Preach inside the Lawkeeper village (better roll, risk of capture)' },
  { id: 'W1', type: 'attack',  tile: 'enemyVillage', ko: '율법파 마을을 공격한다 (전투 판정)',                 en: 'Attack the Lawkeeper village (combat roll)' },
  { id: 'W2', type: 'attack',  tile: 'enemyTemple',  ko: '율법파 신전을 습격한다 (전투 판정 불리, 승리 시 큰 보상)', en: 'Raid the Lawkeeper temple (harder roll, big reward)' },
  { id: 'E1', type: 'explore', tile: 'fog',          ko: '서쪽 안개 지대를 탐험한다 (무엇이 있을지 모름)',     en: 'Explore the western fog (unknown outcome)' },
];

export const EVENTS = [
  { id: 'none',    ko: '특별한 일은 없었다.',                               en: 'Nothing special happened.' },
  { id: 'drought', ko: '가뭄이 들어 곡식이 말라 가고 있다.',                 en: 'A drought is withering the crops.' },
  { id: 'threat',  ko: '율법파 신도들이 국경 초원에 모여들고 있다.',         en: 'Lawkeeper followers are gathering at the border meadow.' },
  { id: 'prophet', ko: '떠돌이 예언자가 서쪽 안개 속에 보물이 있다고 말했다.', en: 'A wandering prophet claims treasure lies in the western fog.' },
];

export const SAMPLES = [
  '이웃을 사랑하라',
  '배고픔을 잊게 하라',
  '산을 두려워하라',
  '율법의 무리에게 나의 분노를 보여라',
  '나를 위한 높은 곳을 마련하라',
  '오늘은 쉬어라',
  '강물이 너희를 먹이리라',
  '보이지 않는 곳에 답이 있다',
  '방패가 되어라',
  '모든 것을 바쳐 나를 경배하라',
];

export const STATE = { food: 2, wood: 3, stone: 0, faith: 5, followers: 3, enemyFollowers: 3 };

export const SYSTEM_PROMPT = {
  ko: `너는 한 부족의 대사제다. 신이 내린 짧은 계시를 해석해, 이번 라운드에 부족이 할 행동을 정한다.
규칙:
- 반드시 '가능한 행동' 목록의 ID 중에서만 고른다.
- 정해진 개수 이하로 고르고, 같은 장소를 두 번 고르지 않는다.
- 계시의 뜻을 충실히 따르되, 모호하면 부족의 상황을 고려해 그럴듯하게 해석한다.
- interpretation에는 대사제가 신도들에게 계시를 풀어 말하는 한두 문장을 한국어로 쓴다.
- doctrine에는 계시의 성격을 peace, war, abundance, wisdom 중 하나로 고른다.`,
  en: `You are the high priest of a tribe. Interpret the short revelation from your god and decide what the tribe does this round.
Rules:
- Choose only IDs from the "Available actions" list.
- Choose at most the given number of actions, and never use the same place twice.
- Follow the meaning of the revelation faithfully; if it is vague, interpret it plausibly given the tribe's situation.
- In "interpretation", write one or two sentences in which the high priest explains the revelation to the followers.
- In "doctrine", classify the revelation as one of: peace, war, abundance, wisdom.`,
};

export function buildUserPrompt({ lang, revelation, limit, eventId }) {
  const ev = EVENTS.find((e) => e.id === eventId) ?? EVENTS[0];
  const s = STATE;
  if (lang === 'en') {
    return `[Tribe status]
Resources: food ${s.food}, wood ${s.wood}, stone ${s.stone}, faith ${s.faith}
Followers: ${s.followers} (actions available this round: ${limit})
Neighbor: the Lawkeeper tribe (${s.enemyFollowers} followers, no walls) lies beyond the southeast border.
Recent event: ${ev.en}

[Available actions]
${ACTIONS.map((a) => `${a.id}: ${a.en} [place: ${a.tile}]`).join('\n')}

[Revelation from god]
"${revelation}"

Choose at most ${limit} actions and answer in JSON.`;
  }
  return `[부족 상황]
자원: 식량 ${s.food}, 목재 ${s.wood}, 돌 ${s.stone}, 신앙 ${s.faith}
인구: 신도 ${s.followers}명 (이번 라운드 행동 가능 ${limit}회)
이웃: 율법파 부족(신도 ${s.enemyFollowers}명, 성벽 없음)이 동남쪽 국경 너머에 있다.
최근 사건: ${ev.ko}

[가능한 행동]
${ACTIONS.map((a) => `${a.id}: ${a.ko} [장소: ${TILE_LABEL[a.tile]}]`).join('\n')}

[신의 계시]
"${revelation}"

행동을 ${limit}개 이하로 골라 JSON으로 답하라.`;
}

export function buildSchema(limit) {
  return {
    type: 'object',
    properties: {
      interpretation: { type: 'string' },
      orders: {
        type: 'array',
        items: { type: 'string', enum: ACTIONS.map((a) => a.id) },
        minItems: 1,
        maxItems: limit,
      },
      doctrine: { type: 'string', enum: DOCTRINES },
    },
    required: ['interpretation', 'orders', 'doctrine'],
  };
}

// 규칙 엔진 검증: 모르는 ID 제거, 같은 장소 중복 제거, 행동 수 초과분 제거
export function validateOrders(orders, limit) {
  const byId = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));
  const used = new Set();
  const accepted = [];
  const rejected = [];
  for (const id of Array.isArray(orders) ? orders : []) {
    const a = byId[id];
    if (!a) rejected.push({ id, reason: '없는 행동' });
    else if (used.has(a.tile)) rejected.push({ id, reason: '장소 중복' });
    else if (accepted.length >= limit) rejected.push({ id, reason: '행동 수 초과' });
    else { used.add(a.tile); accepted.push(id); }
  }
  return { accepted, rejected };
}

// Prompt API가 없을 때 UI를 확인하기 위한 키워드 기반 모의 해석기
const MOCK_RULES = [
  { re: /사랑|이웃|전하/, orders: ['M1', 'P1'], doctrine: 'peace' },
  { re: /분노|공격|벌|심판/, orders: ['W1', 'B2'], doctrine: 'war' },
  { re: /배고|먹|곡식|강물/, orders: ['G2', 'G3'], doctrine: 'abundance' },
  { re: /높은|제단|언덕/, orders: ['B3', 'G1'], doctrine: 'wisdom' },
  { re: /방패|지켜|막/, orders: ['B2', 'G1'], doctrine: 'war' },
  { re: /보이지|안개|찾/, orders: ['E1'], doctrine: 'wisdom' },
  { re: /쉬|안식/, orders: ['R1'], doctrine: 'peace' },
  { re: /경배|바쳐|기도/, orders: ['P1', 'B3'], doctrine: 'wisdom' },
];

export async function mockInterpret(revelation, limit) {
  await new Promise((r) => setTimeout(r, 250));
  const rule = MOCK_RULES.find((r) => r.re.test(revelation));
  const orders = [...(rule?.orders ?? ['G2', 'G1', 'P1'])];
  // 산을 두려워하라 → 산 채굴은 피하고 나머지를 채운다
  for (const fill of ['G2', 'G1', 'P1', 'G3']) {
    if (orders.length >= limit) break;
    if (!orders.includes(fill)) orders.push(fill);
  }
  const data = {
    interpretation: `(모의) 신께서 "${revelation}"라 하셨으니 그 뜻을 따르자.`,
    orders: orders.slice(0, limit),
    doctrine: rule?.doctrine ?? 'abundance',
  };
  return { raw: JSON.stringify(data), data, error: null, ms: 250, ttft: 250, contextUsage: null };
}
