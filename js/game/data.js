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
  cathedral: { stone: 11, wood: 11, faith: 11 },
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
};

export const DOCTRINES = ['peace', 'war', 'abundance', 'wisdom'];
export const DOCTRINE = {
  peace:     { name: '평화', perks: { 2: '선교 주사위 +1', 4: '선교 주사위 +1 (누적)' } },
  war:       { name: '전쟁', perks: { 2: '공격 주사위 +1', 4: '공격 주사위 +1 (누적)' } },
  abundance: { name: '풍요', perks: { 2: '식량 채집 +1', 4: '인구 증가 비용 -1' } },
  wisdom:    { name: '지혜', perks: { 2: '기도 신앙 +1', 4: '행동 수 +1' } },
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
];

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
