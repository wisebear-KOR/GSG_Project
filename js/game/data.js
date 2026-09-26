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
// 대성당은 세 단계로 올린다 (합계는 한 번에 짓던 비용과 같다)
export const CATHEDRAL = [
  { name: '기초', cost: { stone: 4, wood: 4, faith: 4 } },
  { name: '벽', cost: { stone: 4, wood: 4, faith: 4 } },
  { name: '첨탑', cost: { stone: 3, wood: 3, faith: 5 } },
];
export const EDICT_MAX = 10;         // 율법 석판이 이만큼 차면 율법파가 이긴다

// 소명: 두 번째 판부터 판 시작에 셋 중 하나를 고른다. 이루면 승점 +5
export const DESTINIES = {
  villages: { name: '넓히는 자', text: '8장까지 마을 넷', test: (st, v) => st.round <= 8 && v.villages >= 4 },
  convert:  { name: '부르는 자', text: '선교로 셋을 개종', test: (st) => st.stats.converted >= 3 },
  ultimate: { name: '한길의 자', text: '교리 하나를 여섯 칸까지', test: (st) => Object.values(st.sides.player.doctrine).some((x) => x >= 6) },
  temple:   { name: '쌓는 자', text: '6장까지 신전 3단계', test: (st) => st.round <= 6 && st.sides.player.templeLevel >= 3 },
  feeder:   { name: '먹이는 자', text: '끝까지 아무도 굶기지 않기', test: (st) => st.round >= st.maxRounds && !st.stats.starved },
  fortress: { name: '지키는 자', text: '끝까지 수도 내구도 3 지키기', test: (st) => st.round >= st.maxRounds && st.sides.player.capitalHp >= 3 },
  sword:    { name: '치는 자', text: '율법파의 땅 둘을 빼앗기', test: (st) => st.stats.captured >= 2 },
  namer:    { name: '부르는 이름', text: '땅 셋에 이름 붙이기', test: (st) => Object.keys(st.names ?? {}).length >= 3 },
};
export const DESTINY_POINTS = 5;

// 세 막: 막이 바뀌면 규칙이 조금 바뀐다 (두 번째 판부터)
export const ACTS = [
  { name: '제1막 · 개척' },
  { name: '제2막 · 경쟁', text: '율법파가 칼을 갈기 시작한다 (성전 카드 한 장)' },
  { name: '제3막 · 심판', text: '평온한 계절은 더 오지 않는다' },
];

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

// 기적: 계시 전에 장마다 하나 쓸 수 있다. 첫 판은 앞의 셋, 그 뒤로는 판마다 셋을 받고 5장에 하나를 더 고른다
export const MIRACLES = [
  { id: 'lightning', name: '번개', cost: 4, text: '율법파의 칸 하나에 번개. 성벽이 있으면 무너뜨리고, 없으면 신도 1명이 쓰러진다.', target: 'enemy' },
  { id: 'rain',      name: '단비', cost: 3, text: '식량 +3. 이번 장의 가뭄을 없앤다.' },
  { id: 'bounty',    name: '풍요', cost: 5, text: '목재 +2, 돌 +2.' },
  { id: 'manna',     name: '만나', cost: 3, text: '하늘에서 양식이 내린다. 식량 +4.' },
  { id: 'ark',       name: '방주', cost: 3, text: '이번 장에는 굶주림·역병·전투로 신도를 잃지 않는다.' },
  { id: 'tongues',   name: '방언', cost: 3, text: '이번 장 선교 주사위 +1.' },
  { id: 'pillar',    name: '불기둥', cost: 3, text: '이번 장 공격 주사위 +1. 우리 땅 둘레 3칸의 안개가 걷힌다.' },
  { id: 'revive',    name: '부활', cost: 5, text: '쓰러진 신도 1명이 돌아온다 (인구 한도 안에서).' },
];
export const FIRST_HAND = ['lightning', 'rain', 'bounty'];
// 신의 분노가 가득 차면 손에 들어오는 숨은 기적 (드래프트에 나오지 않는다)
export const DOOM = { id: 'doom', name: '심판의 날', cost: 0, hidden: true, text: '율법파의 탑이 흔들리고(수도 -1) 한 사람이 쓰러진다. 분노가 가라앉는다.' };

// 교리가 깊어지면 대사제의 말투가 바뀐다 (최고 교리 3칸: 먹빛, 4칸: 프롬프트 한 줄)
export const DOCTRINE_VOICE = {
  war:       { prompt: '말투: 짧고 거칠게, 불과 칼의 비유로.', prefix: '불이 말하노니,' },
  peace:     { prompt: '말투: 부드럽고 따뜻하게, 빛과 물의 비유로.', prefix: '빛이 속삭이노니,' },
  abundance: { prompt: '말투: 넉넉하고 흥겹게, 곡식과 잔치의 비유로.', prefix: '곳간이 노래하노니,' },
  wisdom:    { prompt: '말투: 수수께끼처럼, 별과 안개의 비유로.', prefix: '수수께끼로 이르노니,' },
};

// 교리 대립: 한쪽이 오르면 반대쪽이 한 칸 흔들린다 (이미 얻은 특전 칸 아래로는 내려가지 않는다)
export const OPPOSED = { peace: 'war', war: 'peace', abundance: 'wisdom', wisdom: 'abundance' };
// 율법파가 지난 장의 말씀을 듣고 고르는 율법 카드
export const REACT = {
  war:       { cards: ['L4', 'L3'], line: '전쟁을 말하더니… 성벽부터 쌓아라.' },
  peace:     { cards: ['L7'], line: '사랑을 말한다고? 우리에게도 가르칠 것이 있다.' },
  abundance: { cards: ['L2', 'L9'], line: '곳간을 자랑하더니. 우리도 거두고 넓히리라.' },
  wisdom:    { cards: ['L6'], line: '신을 부르는 소리가 크구나. 율법을 더 높이 쌓아라.' },
  vow:       { cards: ['L5'], line: '칼을 거두었다고? 그 틈을 친다.' },
};

// 심판의 기준: 마지막 장의 승점 공식 (두 번째 판부터 판마다 하나). 합계가 기본과 비슷하도록 맞췄다
export const JUDGEMENTS = {
  classic:   { name: '기본', text: '신도 2 · 마을 3 · 신전 2 · 수도 1', w: { pop: 2, village: 3, temple: 2, hp: 1 } },
  wide:      { name: '넓은 자', text: '마을 하나가 5점, 신도는 1점', w: { pop: 1, village: 5, temple: 2, hp: 1 } },
  fertile:   { name: '번성한 자', text: '신도 하나가 3점, 마을은 2점', w: { pop: 3, village: 2, temple: 1, hp: 1 } },
  pious:     { name: '경건한 자', text: '신전 단계가 3점, 신앙 3마다 1점', w: { pop: 2, village: 2, temple: 3, hp: 1, faith: 3 } },
  steadfast: { name: '굳센 자', text: '수도 내구도가 3점, 성벽마다 1점', w: { pop: 2, village: 2, temple: 2, hp: 3, wall: 1 } },
};

// 두 갈래 사건 (두 번째 판부터 사건 덱에 섞인다). 버튼으로 고르거나, 계시 속 말로 답한다 (tags)
export const DILEMMAS = [
  { id: 'refugees', name: '난민 행렬', text: '전쟁을 피한 난민이 문 앞에 섰다.', rule: '갈림길 — 버튼이나 계시로 답한다', choice: [
    { id: 'take', label: '받아들인다', text: '신도 +1, 식량 -2', tags: '받아|맞아|품어|들여|환영|받으라', gain: { food: -2 }, pop: 1 },
    { id: 'send', label: '돌려보낸다', text: '신앙 -1', tags: '돌려|내쫓|쫓아|거절|막아', gain: { faith: -1 } }] },
  { id: 'pilgrims', name: '순례자', text: '먼 곳의 순례자들이 우리 신전을 찾아왔다.', rule: '갈림길 — 버튼이나 계시로 답한다', choice: [
    { id: 'host', label: '맞아들인다', text: '신앙 +2, 식량 -1', tags: '맞아|대접|먹이|환영|품어', gain: { faith: 2, food: -1 } },
    { id: 'ignore', label: '지나보낸다', text: '아무 일도 없다', tags: '지나|보내|모른|돌려', gain: {} }] },
  { id: 'inquisitor', name: '율법 심문관', text: '율법파 심문관이 우리 마을을 캐묻고 다닌다.', rule: '갈림길 — 버튼이나 계시로 답한다', choice: [
    { id: 'expel', label: '쫓아낸다', text: '신앙 +1, 다음 장 율법파가 칼을 든다', tags: '쫓아|내쫓|몰아|꾸짖|벌하', gain: { faith: 1 }, provoke: true },
    { id: 'soothe', label: '달랜다', text: '식량 -2', tags: '달래|대접|먹이|평화|참아', gain: { food: -2 } }] },
  { id: 'schism', name: '신도들의 다툼', text: '신도들 사이에 말씀의 뜻을 두고 다툼이 났다.', rule: '갈림길 — 버튼이나 계시로 답한다', choice: [
    { id: 'side', label: '한쪽 편을 든다', text: '가장 깊은 교리 +1, 신도 -1', tags: '옳다|편을|따르라|벌하|내쫓', doctrine: 1, pop: -1 },
    { id: 'reconcile', label: '둘 다 달랜다', text: '신앙 -2', tags: '화해|달래|하나|함께|사랑', gain: { faith: -2 } }] },
  { id: 'merchant', name: '떠돌이 상인', text: '상인이 곡식을 받고 돌과 목재를 내놓는다.', rule: '갈림길 — 버튼이나 계시로 답한다', choice: [
    { id: 'trade', label: '곡식을 내준다', text: '식량 -3, 돌 +2, 목재 +2', tags: '바꾸|사고|팔|내주|거래', gain: { food: -3, stone: 2, wood: 2 } },
    { id: 'pass', label: '보낸다', text: '아무 일도 없다', tags: '보내|거절|돌려', gain: {} }] },
  { id: 'healer', name: '역병 치료사', text: '약초를 든 치료사가 대가를 청한다.', rule: '갈림길 — 버튼이나 계시로 답한다', choice: [
    { id: 'pay', label: '대가를 치른다', text: '신앙 -2, 이번 장 아무도 잃지 않는다', tags: '치료|고치|낫|살리|치르', gain: { faith: -2 }, ark: true },
    { id: 'refuse', label: '거절한다', text: '아무 일도 없다', tags: '거절|돌려|보내', gain: {} }] },
];

// 안개 속 발견지: 처음 드러날 때 한 번 일어난다
export const SITES = {
  nomads: { name: '떠도는 유목민', text: '안개 속에서 떠도는 유목민 무리를 만났다.', choice: [
    { id: 'take', label: '받아들인다', text: '신도 +1 (한도가 차 있으면 식량 +2)' },
    { id: 'send', label: '축복해 보낸다', text: '신앙 +2' },
  ] },
  altar:  { name: '잊힌 제단', text: '이름 모를 신의 제단이 이끼에 덮여 있다.', gain: { faith: 3 } },
  spring: { name: '말하는 샘', text: '샘물이 속삭이며 길을 알려 준다.', gain: { wood: 2, stone: 1 } },
  bones:  { name: '거인의 뼈', text: '거대한 뼈가 땅에 박혀 있다. 좋은 돌감이다.', gain: { stone: 3 } },
  legacy: { name: '전생의 유적', text: '이름 잊힌 신의 제단이 무너져 있다.', gain: { faith: 2 } },
};
// 영구 지형: 사막 속 오아시스는 식량 3, 산의 채석장은 돌 3
export const FEATURES = {
  oasis:  { name: '오아시스', on: 'desert', gather: 'food', amount: 3 },
  quarry: { name: '채석장', on: 'mountain', gather: 'stone', amount: 3 },
};

// 신의 상징 (인장에 찍힌다)
export const SIGILS = { light: 'i-faith', sword: 'd-war', dove: 'd-peace', grain: 'i-food', eye: 'e-prophet', storm: 'm-lightning' };

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
  normal: { name: '보통',   enemyBonus: 1, enemyStart: { food: 5, wood: 3, stone: 1, faith: 3, pop: 4 } },
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
