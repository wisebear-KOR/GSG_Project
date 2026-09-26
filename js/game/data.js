// 게임 데이터: 지형, 사건 카드, 율법 카드, 기적, 교리, 시나리오 맵

export const TERRAIN = {
  plain:    { name: '평원', icon: '🌾', gather: 'food',  amount: 2 },
  forest:   { name: '숲',   icon: '🌲', gather: 'wood',  amount: 2 },
  mountain: { name: '산',   icon: '⛰️', gather: 'stone', amount: 2 },
  river:    { name: '강',   icon: '🌊', gather: 'food',  amount: 1 },
  hill:     { name: '성스러운 언덕', icon: '✨', gather: 'faith', amount: 1 },
};

export const RESOURCE_NAME = { food: '식량', wood: '목재', stone: '돌', faith: '신앙' };
export const GATHER_VERB = { food: '곡식을 거둔다', wood: '나무를 벤다', stone: '돌을 캔다', faith: '묵상한다' };

// 건물 비용. temple은 현재 레벨에 따라 비용이 오른다
export const COST = {
  village: { wood: 2, food: 1 },
  wall: { stone: 2 },
  temple: (level) => ({ stone: level + 2, wood: level + 1 }),
  cathedral: { stone: 11, wood: 11, faith: 11 },
};

export const MAX_TEMPLE = 3;
export const CAPITAL_HP = 3;
export const MAX_ROUNDS = 12;
export const MAX_ACTIONS = 5;
export const REVELATION_MAX = 100;
// 계시 글자 수 25자마다 신앙 1
export const revelationCost = (text) => Math.max(1, Math.ceil(text.trim().length / 25));

export const DOCTRINES = ['peace', 'war', 'abundance', 'wisdom'];
export const DOCTRINE = {
  peace:     { name: '평화', icon: '🕊️', perks: { 2: '선교 주사위 +1', 4: '선교 주사위 +1 (누적)' } },
  war:       { name: '전쟁', icon: '⚔️', perks: { 2: '공격 주사위 +1', 4: '공격 주사위 +1 (누적)' } },
  abundance: { name: '풍요', icon: '🌾', perks: { 2: '식량 채집 +1', 4: '인구 증가 비용 -1' } },
  wisdom:    { name: '지혜', icon: '📜', perks: { 2: '기도 신앙 +1', 4: '행동 수 +1' } },
};
export const DOCTRINE_MAX = 6;

// 사건 카드: LLM에 '최근 사건'으로 전달되고 규칙에도 영향을 준다
export const EVENTS = [
  { id: 'calm',    name: '평온한 계절',   icon: '☀️', text: '평온한 계절이 이어진다.',                           rule: '특별한 효과 없음' },
  { id: 'drought', name: '가뭄',          icon: '🏜️', text: '가뭄이 들어 곡식이 말라 가고 있다.',                rule: '평원·강 식량 채집 -1' },
  { id: 'harvest', name: '풍년',          icon: '🌽', text: '풍년의 기운이 들판에 가득하다.',                    rule: '평원 식량 채집 +1' },
  { id: 'plague',  name: '역병',          icon: '🦠', text: '역병이 돌아 양쪽 부족 모두 병자가 생겼다.',         rule: '라운드 끝에 양쪽 인구 -1' },
  { id: 'threat',  name: '율법파 집결',   icon: '🚩', text: '율법파 신도들이 국경에 모여들고 있다.',             rule: '이번 라운드 율법파 공격 +1' },
  { id: 'prophet', name: '떠돌이 예언자', icon: '🧙', text: '떠돌이 예언자가 안개 속에 보물이 있다고 말했다.',   rule: '탐험하면 반드시 보물 (신앙 +3)' },
];

// 기적: 계시 전에 라운드당 하나 쓸 수 있다
export const MIRACLES = [
  { id: 'lightning', name: '번개', icon: '⚡', cost: 4, text: '율법파의 칸 하나에 번개. 성벽이 있으면 무너뜨리고, 없으면 신도 1명이 쓰러진다.', target: 'enemy' },
  { id: 'rain',      name: '단비', icon: '🌧️', cost: 3, text: '식량 +3. 이번 라운드 가뭄을 없앤다.' },
  { id: 'bounty',    name: '풍요', icon: '🎁', cost: 5, text: '목재 +2, 돌 +2.' },
];

// 율법 카드: 율법파(오토마)는 매 라운드 한 장을 뽑아 위에서부터 행동한다.
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
];

// 시나리오 1 맵 (5×5, 홀수 행이 오른쪽으로 반 칸 밀린 육각 배치)
// P: 플레이어 수도(평원), E: 율법파 수도(평원)
export const SCENARIOS = {
  1: {
    id: 1,
    title: '이웃의 불신자',
    intro: '동쪽 너머에 신을 믿지 않는 율법파가 산다. 그들은 새겨진 율법대로만 움직인다. 말씀으로 너의 부족을 이끌어라.',
    seed: 2026,
    map: [
      ['forest',   'mountain', 'forest', 'plain', 'E'],
      ['plain',    'hill',     'plain',  'river', 'forest'],
      ['mountain', 'plain',    'river',  'plain', 'mountain'],
      ['forest',   'river',    'plain',  'hill',  'plain'],
      ['P',        'plain',    'forest', 'mountain', 'forest'],
    ],
    start: {
      player: { food: 4, wood: 2, stone: 0, faith: 6, pop: 3 },
      enemy:  { food: 4, wood: 2, stone: 1, faith: 3, pop: 3 },
    },
  },
};
