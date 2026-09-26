// 게임 데이터: 지형, 비용, 사건·율법·기적 카드, 교리, 난이도, 맵 크기, 튜토리얼 시나리오

// gather가 null인 지형(사막)에서는 아무것도 얻을 수 없다
export const TERRAIN = {
  plain:    { name: '평원', gather: 'food',  amount: 2 },
  forest:   { name: '숲',   gather: 'wood',  amount: 2 },
  mountain: { name: '산',   gather: 'stone', amount: 2 },
  river:    { name: '강',   gather: 'food',  amount: 1 },
  hill:     { name: '성스러운 언덕', gather: 'faith', amount: 1 },
  desert:   { name: '사막', gather: null,    amount: 0 },
};

export const RESOURCE_NAME = { food: '식량', wood: '목재', stone: '돌', faith: '신앙' };
export const GATHER_VERB = { food: '곡식을 거둔다', wood: '나무를 벤다', stone: '돌을 캔다', faith: '묵상한다' };

// 건물 비용. temple은 현재 단계에 따라 비용이 오른다 (1→2: 돌 2·목재 2, 2→3: 돌 4·목재 3)
export const COST = {
  village: { wood: 2, food: 1 },
  wall: { stone: 2 },
  temple: (level) => ({ stone: level * 2, wood: level + 1 }),
  cathedral: { stone: 11, wood: 11, faith: 13 },
};

export const MAX_TEMPLE = 3;
export const CAPITAL_HP = 3;
export const MAX_ROUNDS = 12;
export const MAX_ACTIONS = 6;
export const REVELATION_MAX = 100;
// 계시 비용: 30자 이하면 신앙 1, 더 길면 2
export const revelationCost = (text) => (text.trim().length > 30 ? 2 : 1);

// ---------- 규칙 수치 (한곳에서 조정) ----------
export const RULES = {
  followersPerAction: 4,     // 신도 4명마다 행동 +1
  followersPerFaith: 3,      // 신도 3명마다 신앙 수입 +1
  baseFaithIncome: 1,        // 매 장 기본 신앙 수입
  heresyGrace: 1,            // 신앙 0으로 버틸 수 있는 장 수 (그다음 장부터 이탈)
  superiority: 3,            // 신도가 이만큼 많으면 선교·공격 주사위 +1
  lowFaith: 2,               // 이하이면 경고하고 자동 노동이 기도를 우선한다
  gracePerRound: 1,          // 청원·말투·이름 붙이기로 받는 신앙(은총)은 장당 이만큼까지
  graceDoctrineBelow: 3,     // 비유·첫 이름의 교리 보너스는 그 교리가 이 값보다 낮을 때만
  maxNames: 3,               // 판당 붙일 수 있는 이름
};

// 말투: 계시의 문체가 효과가 된다 (정규식 판정 — 석판·LLM 공통)
export const TONES = {
  command:  { name: '명령', text: '' },
  blessing: { name: '축복', text: '첫 채집 +1' },
  curse:    { name: '저주', text: '이번 장 공격 +1, 신앙 -1' },
  metaphor: { name: '비유', text: '교리가 한 칸 더 오른다 (3칸 미만일 때)' },
};

// 예언: 확인 화면에서 봉인하면 기한 안에 이루어졌는지 본다. 짧을수록 보상이 크다
export const PROPHECY = {
  reward: { 1: 4, 2: 3, 3: 2 }, penalty: 2,
  kinds: {
    fall:    { name: '율법파의 마을이 무너지리라', short: '적 마을 함락' },
    capital: { name: '율법파의 탑이 흔들리리라', short: '적 수도 타격' },
    pop:     { name: '신도가 불어나리라', short: '신도 +2' },
    convert: { name: '이웃이 말씀으로 돌아오리라', short: '개종 1명' },
  },
};

// 대사제: 첫 판은 충직한 사제, 그 뒤로는 판마다 다른 성향 (수치 효과 없음, 해석 말투와 기울기만)
export const PRIESTS = {
  loyal:    { name: '충직한 사제 엘리', trait: '말씀을 곧이곧대로 받든다', prompt: '' },
  literal:  { name: '문자주의자 오르', trait: '말한 그대로만 한다', prompt: '대사제의 성향: 비유를 싫어하고 계시에 나온 낱말 그대로의 행동을 고른다.' },
  dreamer:  { name: '몽상가 이펜', trait: '말씀의 숨은 뜻을 찾는다', prompt: '대사제의 성향: 계시를 비유로 읽기를 좋아하고, 숨은 뜻에 맞는 행동을 고른다.' },
  zealot:   { name: '열혈 사제 테사', trait: '싸움과 선교에 앞장선다', prompt: '대사제의 성향: 뜻이 모호하면 율법파와 맞서는 행동(공격, 선교)을 먼저 떠올린다.' },
  cautious: { name: '신중한 사제 무트', trait: '부족을 먼저 지킨다', prompt: '대사제의 성향: 뜻이 모호하면 부족을 지키고 먹이는 행동(채집, 성벽, 기도)을 먼저 떠올린다.' },
};

// 청원자 이름 (직업 + 이름)
export const PETITIONERS = ['농부 엘리', '어부 도랑', '목수 하닌', '석공 브엘', '과부 나오미', '양치기 아벨', '대장장이 무트', '산파 시브라', '늙은 사관 갈렙', '소년 사무', '방직공 레아', '파수꾼 요압'];

export const DOCTRINES = ['peace', 'war', 'abundance', 'wisdom'];
export const DOCTRINE = {
  peace:     { name: '평화', perks: { 2: '선교 주사위 +1', 4: '선교 주사위 +1 (누적)', 6: '궁극(8장부터) — 장이 끝날 때마다 이웃 율법파에게 말씀이 스며든다' } },
  war:       { name: '전쟁', perks: { 2: '공격 주사위 +1', 4: '공격 주사위 +1 (누적)', 6: '궁극(8장부터) — 공격에 지면 신도 대신 신앙 2가 탄다' } },
  abundance: { name: '풍요', perks: { 2: '식량 채집 +1', 4: '인구 증가 비용 -1', 6: '궁극(8장부터) — 인구 한도 +2' } },
  wisdom:    { name: '지혜', perks: { 2: '기도 신앙 +1', 4: '행동 수 +1', 6: '궁극(8장부터) — 매 장 다가올 계절 두 장 중 하나를 고른다' } },
};
export const DOCTRINE_MAX = 6;

// 사건 카드: LLM에 '최근 사건'으로 전달되고 규칙에도 영향을 준다
export const EVENTS = [
  { id: 'calm',    name: '평온한 계절',   text: '평온한 계절이 이어진다.',                           rule: '특별한 효과 없음' },
  { id: 'drought', name: '가뭄',          text: '가뭄이 들어 곡식이 말라 가고 있다.',                rule: '평원·강 식량 채집 -1' },
  { id: 'harvest', name: '풍년',          text: '풍년의 기운이 들판에 가득하다.',                    rule: '평원 식량 채집 +1' },
  { id: 'plague',  name: '역병',          text: '역병이 돌아 양쪽 부족 모두 병자가 생겼다.',         rule: '장이 끝날 때 양쪽 인구 -1' },
  { id: 'threat',  name: '율법파 집결',   text: '율법파 신도들이 국경에 모여들고 있다.',             rule: '이번 장 율법파 공격 +1' },
  { id: 'prophet', name: '떠돌이 예언자', text: '떠돌이 예언자가 안개 속에 보물이 있다고 말했다.',   rule: '탐험하면 반드시 보물 (신앙 +3)' },
];

// 기적: 계시 전에 장마다 하나 쓸 수 있다
export const MIRACLES = [
  { id: 'lightning', name: '번개', cost: 4, text: '율법파의 칸 하나에 번개. 성벽이 있으면 무너뜨리고, 없으면 신도 1명이 쓰러진다.', target: 'enemy' },
  { id: 'rain',      name: '단비', cost: 3, text: '식량 +3. 이번 장의 가뭄을 없앤다.' },
  { id: 'bounty',    name: '풍요', cost: 5, text: '목재 +2, 돌 +2.' },
];

// 율법 카드: 율법파(오토마)는 매 장 한 장을 뽑아 위에서부터 행동한다.
// 규칙 항목: { type, gather?, build? }. 조건에 맞는 행동이 없으면 다음 항목으로 넘어간다.
export const LAW_CARDS = [
  { id: 'L1', name: '확장', text: '마을을 세우고, 나무를 모은다',
    rules: [{ type: 'build', build: 'village' }, { type: 'gather', gather: 'wood' }, { type: 'gather', gather: 'food' }] },
  { id: 'L2', name: '수확', text: '곡식을 거둔다',
    rules: [{ type: 'gather', gather: 'food' }, { type: 'gather', gather: 'food' }, { type: 'pray' }] },
  { id: 'L3', name: '채석', text: '돌을 캐고 성벽을 쌓는다',
    rules: [{ type: 'gather', gather: 'stone' }, { type: 'build', build: 'wall' }, { type: 'gather', gather: 'wood' }] },
  { id: 'L4', name: '요새', text: '성벽을 쌓는다',
    rules: [{ type: 'build', build: 'wall' }, { type: 'gather', gather: 'stone' }, { type: 'pray' }] },
  { id: 'L5', name: '성전', text: '신 없는 자들을 친다',
    rules: [{ type: 'attack' }, { type: 'attack' }, { type: 'gather', gather: 'food' }] },
  { id: 'L6', name: '경건', text: '율법을 외고 신전을 높인다',
    rules: [{ type: 'pray' }, { type: 'build', build: 'temple' }, { type: 'gather', gather: 'food' }] },
  { id: 'L7', name: '교화', text: '이웃에게 율법을 가르친다',
    rules: [{ type: 'preach' }, { type: 'preach' }, { type: 'pray' }] },
  { id: 'L8', name: '절제', text: '먹을 것을 모으고 신전을 높인다',
    rules: [{ type: 'gather', gather: 'food' }, { type: 'build', build: 'temple' }, { type: 'build', build: 'village' }] },
  { id: 'L9', name: '개척', text: '새 땅에 마을을 세운다',
    rules: [{ type: 'build', build: 'village' }, { type: 'build', build: 'village' }, { type: 'gather', gather: 'wood' }] },
  // 검열: 다음 장에 플레이어가 가장 자주 쓴 말을 봉인한다 (쓰면 계시 비용 +1). 두 번째 판부터, 보통 이상
  { id: 'L10', name: '검열', text: '신의 말 한마디를 봉인하고, 먹을 것을 모은다', ban: true,
    rules: [{ type: 'gather', gather: 'food' }, { type: 'gather', gather: 'wood' }, { type: 'pray' }] },
];

// 율법파 지도자: 판마다 한 명. 덱 구성만 바꾼다 (수치 보너스는 없다)
export const ENEMY_LEADERS = {
  elder: {
    name: '장로 하르쿤', title: '율법의 문지기', desc: '율법을 고르게 지킨다',
    deck: { add: [], remove: [] },
    lines: {
      intro: ['율법은 이미 새겨졌다. 신 따위의 말은 필요 없다.', '우리는 돌에 새긴 것만 믿는다.'],
      card: { any: ['율법이 명하니 따른다.', '새겨진 대로 할 뿐이다.', '돌판은 굽지 않는다.'] },
      rebuttal: {
        war: ["'{word}'라니. 칼을 부르는 신은 칼로 망한다.", '분노하는 신이라… 율법은 흔들리지 않는다.'],
        peace: ["'{word}'? 달콤한 말로 율법을 녹일 수는 없다.", '사랑을 말하는 자가 가장 먼저 배신한다.'],
        abundance: ["'{word}'를 바라는구나. 배부른 자는 율법을 잊는다.", '곡식 창고가 신을 대신하지는 못한다.'],
        wisdom: ["'{word}'라니, 율법은 그런 것을 모른다.", '안개 속을 헤매는 신이로군.'],
        any: ["'{word}'… 율법은 그런 말을 모른다."],
      },
      villageLost: ['마을 하나쯤이야. 율법은 사람보다 오래 간다.', '빼앗긴 땅은 다시 새기면 된다.'],
      capitalLow: ['탑이 흔들린다… 그래도 율법은 무너지지 않는다!', '돌판을 지켜라! 마지막 한 사람까지!'],
    },
  },
  iron: {
    name: '철의 대제사장 바락', title: '칼로 율법을 지키는 자', desc: '「성전」 카드를 한 장 더 든다 — 자주 쳐들어온다',
    deck: { add: ['L5'], remove: [] }, notOn: ['easy'],
    lines: {
      intro: ['칼이 곧 율법이다. 신도들을 지켜 보아라.', '말로 싸우는 신이라, 우습구나.'],
      card: { L5: ['쳐라. 율법을 모르는 자들을.', '칼끝이 곧 판결이다.'], any: ['칼을 갈며 기다린다.', '지금은 쉬되, 곧 친다.'] },
      rebuttal: {
        war: ["'{word}'? 좋다, 칼로 답해 주마.", '싸움을 원하는구나. 우리가 먼저 간다.'],
        peace: ["'{word}'라니, 약한 자의 기도다.", '평화는 이긴 자가 정한다.'],
        any: ["'{word}'… 칼 앞에서도 그 말을 하겠느냐."],
      },
      villageLost: ['피로 갚으리라.', '빼앗은 땅은 곧 무덤이 되리라.'],
      capitalLow: ['물러서지 마라! 탑이 무너지면 율법도 끝이다!'],
    },
  },
  preacher: {
    name: '설교자 아모스', title: '율법을 가르치는 자', desc: '「교화」 카드를 한 장 더 든다 — 너의 신도를 빼앗으려 한다',
    deck: { add: ['L7'], remove: ['L2'] },
    lines: {
      intro: ['너의 신도들도 결국 율법을 배우게 되리라.', '말에는 말로 답하겠다.'],
      card: { L7: ['이웃이여, 돌판의 말을 들으라.', '신 없는 평안을 가르쳐 주마.'], any: ['율법을 외며 때를 기다린다.'] },
      rebuttal: {
        peace: ["'{word}'라… 그 말, 우리 율법에도 있다.", '너의 사랑은 조건이 붙어 있지.'],
        war: ["'{word}'를 외치는 신이라니, 신도들이 두려워하겠구나."],
        any: ["'{word}'… 그 말을 돌판에 새길 수 있겠느냐?"],
      },
      villageLost: ['그 마을 사람들도 언젠가 돌아오리라.'],
      capitalLow: ['탑이 흔들려도 가르침은 남는다.'],
    },
  },
  builder: {
    name: '건축가 네훔', title: '돌판을 쌓는 자', desc: '「개척」과 「경건」을 더 들고 「성전」은 없다 — 땅과 탑을 넓힌다',
    deck: { add: ['L9', 'L6'], remove: ['L5'] },
    lines: {
      intro: ['땅은 먼저 새긴 자의 것이다.', '말은 흩어지지만 돌은 남는다.'],
      card: { L9: ['저 너머에도 돌판을 세워라.'], L6: ['탑을 한 층 더 올려라.'], any: ['돌을 나르고 또 나른다.'] },
      rebuttal: {
        abundance: ["'{word}'? 우리 곳간이 더 크다."],
        any: ["'{word}'라… 그 말로 벽 하나라도 쌓겠느냐."],
      },
      villageLost: ['다시 지으면 된다. 더 높이.'],
      capitalLow: ['탑의 돌 하나하나가 율법이다. 지켜라!'],
    },
  },
};

// 난이도: 율법파의 추가 행동과 시작 자원
export const DIFFICULTY = {
  easy:   { name: '쉬움',   enemyBonus: 0, enemyStart: { food: 3, wood: 1, stone: 0, faith: 2, pop: 3 } },
  normal: { name: '보통',   enemyBonus: 1, enemyStart: { food: 4, wood: 2, stone: 1, faith: 3, pop: 3 } },
  hard:   { name: '어려움', enemyBonus: 2, enemyStart: { food: 6, wood: 4, stone: 2, faith: 4, pop: 4 } },
};

export const MAP_SIZES = {
  5: { name: '작게', rounds: 12 },
  6: { name: '보통', rounds: 12 },
  7: { name: '크게', rounds: 14 },
};

export const PLAYER_START = { food: 4, wood: 2, stone: 0, faith: 4, pop: 3 };

// 튜토리얼: 3×3 고정 맵, 5장. 율법파는 공격하지 않는 온순한 율법만 쓴다.
// P: 우리 수도, E: 율법파 수도, V: 율법파 마을
export const TUTORIAL = {
  id: 'tutorial',
  title: '튜토리얼 · 첫 계시',
  seed: 7,
  rounds: 5,
  map: [
    ['forest',   'V',     'E'],
    ['mountain', 'plain', 'river'],
    ['P',        'plain', 'forest'],
  ],
  start: {
    player: { food: 5, wood: 3, stone: 1, faith: 6, pop: 3 },
    enemy:  { food: 3, wood: 1, stone: 0, faith: 2, pop: 3 },
  },
  enemyBonus: 0,
  events: ['calm', 'calm', 'harvest', 'calm', 'prophet'],
  lawCards: ['L2', 'L1', 'L6', 'L2', 'L8'],
};
