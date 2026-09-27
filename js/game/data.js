// 게임 데이터: 지형, 비용, 사건·율법·기적 카드, 교리, 난이도, 맵 크기, 튜토리얼 시나리오
import { t } from './i18n.js';

// gather가 null인 지형(사막)에서는 아무것도 얻을 수 없다
export const TERRAIN = {
  plain:    { name: t('data.terrain.plain.name'), gather: 'food',  amount: 2 },
  forest:   { name: t('data.terrain.forest.name'), gather: 'wood',  amount: 2 },
  mountain: { name: t('data.terrain.mountain.name'), gather: 'stone', amount: 2 },
  river:    { name: t('data.terrain.river.name'), gather: 'food',  amount: 1 },
  hill:     { name: t('data.terrain.hill.name'), gather: 'faith', amount: 1 },
  desert:   { name: t('data.terrain.desert.name'), gather: null,    amount: 0 },
};

export const RESOURCE_NAME = { food: t('data.resource.food'), wood: t('data.resource.wood'), stone: t('data.resource.stone'), faith: t('data.resource.faith') };
export const GATHER_VERB = { food: t('data.gatherVerb.food'), wood: t('data.gatherVerb.wood'), stone: t('data.gatherVerb.stone'), faith: t('data.gatherVerb.faith') };

// 건물 비용. temple은 현재 단계에 따라 비용이 오른다 (1→2: 돌 2·목재 2, 2→3: 돌 4·목재 3)
export const COST = {
  village: { wood: 2, food: 1 },
  wall: { stone: 2 },
  temple: (level) => ({ stone: level * 2, wood: level + 1 }),
  cathedral: { stone: 11, wood: 11, faith: 13 },
};
// 대성당은 세 단계로 올린다 (합계는 한 번에 짓던 비용과 같다)
export const CATHEDRAL = [
  { name: t('data.cathedral.0.name'), cost: { stone: 4, wood: 4, faith: 4 } },
  { name: t('data.cathedral.1.name'), cost: { stone: 4, wood: 4, faith: 4 } },
  { name: t('data.cathedral.2.name'), cost: { stone: 3, wood: 3, faith: 5 } },
];
export const EDICT_MAX = 12;         // 율법 석판이 이만큼 차면 율법파가 이긴다

// 소명: 두 번째 판부터 판 시작에 셋 중 하나를 고른다. 이루면 승점 +5
export const DESTINIES = {
  villages: { name: t('data.destiny.villages.name'), text: t('data.destiny.villages.text'), test: (st, v) => st.round <= 8 && v.villages >= 4 },
  convert:  { name: t('data.destiny.convert.name'), text: t('data.destiny.convert.text'), test: (st) => st.stats.converted >= 3 },
  ultimate: { name: t('data.destiny.ultimate.name'), text: t('data.destiny.ultimate.text'), test: (st) => Object.values(st.sides.player.doctrine).some((x) => x >= 6) },
  temple:   { name: t('data.destiny.temple.name'), text: t('data.destiny.temple.text'), test: (st) => st.round <= 6 && st.sides.player.templeLevel >= 3 },
  feeder:   { name: t('data.destiny.feeder.name'), text: t('data.destiny.feeder.text'), test: (st) => st.round >= st.maxRounds && !st.stats.starved },
  fortress: { name: t('data.destiny.fortress.name'), text: t('data.destiny.fortress.text'), test: (st) => st.round >= st.maxRounds && st.sides.player.capitalHp >= 3 },
  sword:    { name: t('data.destiny.sword.name'), text: t('data.destiny.sword.text'), test: (st) => st.stats.captured >= 2 },
  namer:    { name: t('data.destiny.namer.name'), text: t('data.destiny.namer.text'), test: (st) => Object.keys(st.names ?? {}).length >= 3 },
};
export const DESTINY_POINTS = 5;

// 세 막: 막이 바뀌면 규칙이 조금 바뀐다 (두 번째 판부터)
export const ACTS = [
  { name: t('data.act.0.name') },
  { name: t('data.act.1.name'), text: t('data.act.1.text') },
  { name: t('data.act.2.name'), text: t('data.act.2.text') },
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
  command:  { name: t('data.tone.command.name'), text: '' },
  blessing: { name: t('data.tone.blessing.name'), text: t('data.tone.blessing.text') },
  curse:    { name: t('data.tone.curse.name'), text: t('data.tone.curse.text') },
  metaphor: { name: t('data.tone.metaphor.name'), text: t('data.tone.metaphor.text') },
};

// 예언: 확인 화면에서 봉인하면 기한 안에 이루어졌는지 본다. 짧을수록 보상이 크다
export const PROPHECY = {
  reward: { 1: 4, 2: 3, 3: 2 }, penalty: 2,
  kinds: {
    fall:    { name: t('data.prophecy.fall.name'), short: t('data.prophecy.fall.short') },
    capital: { name: t('data.prophecy.capital.name'), short: t('data.prophecy.capital.short') },
    pop:     { name: t('data.prophecy.pop.name'), short: t('data.prophecy.pop.short') },
    convert: { name: t('data.prophecy.convert.name'), short: t('data.prophecy.convert.short') },
  },
};

// 대사제: 첫 판은 충직한 사제, 그 뒤로는 판마다 다른 성향 (수치 효과 없음, 해석 말투와 기울기만)
export const PRIESTS = {
  loyal:    { name: t('data.priest.loyal.name'), trait: t('data.priest.loyal.trait'), prompt: '' },
  literal:  { name: t('data.priest.literal.name'), trait: t('data.priest.literal.trait'), prompt: t('data.priest.literal.prompt') },
  dreamer:  { name: t('data.priest.dreamer.name'), trait: t('data.priest.dreamer.trait'), prompt: t('data.priest.dreamer.prompt') },
  zealot:   { name: t('data.priest.zealot.name'), trait: t('data.priest.zealot.trait'), prompt: t('data.priest.zealot.prompt') },
  cautious: { name: t('data.priest.cautious.name'), trait: t('data.priest.cautious.trait'), prompt: t('data.priest.cautious.prompt') },
};

// 청원자 이름 (직업 + 이름)
export const PETITIONERS = t('data.petitioners');

export const DOCTRINES = ['peace', 'war', 'abundance', 'wisdom'];
export const DOCTRINE = {
  peace:     { name: t('data.doctrine.peace.name'), perks: { 2: t('data.doctrine.peace.perk.2'), 4: t('data.doctrine.peace.perk.4'), 6: t('data.doctrine.peace.perk.6') } },
  war:       { name: t('data.doctrine.war.name'), perks: { 2: t('data.doctrine.war.perk.2'), 4: t('data.doctrine.war.perk.4'), 6: t('data.doctrine.war.perk.6') } },
  abundance: { name: t('data.doctrine.abundance.name'), perks: { 2: t('data.doctrine.abundance.perk.2'), 4: t('data.doctrine.abundance.perk.4'), 6: t('data.doctrine.abundance.perk.6') } },
  wisdom:    { name: t('data.doctrine.wisdom.name'), perks: { 2: t('data.doctrine.wisdom.perk.2'), 4: t('data.doctrine.wisdom.perk.4'), 6: t('data.doctrine.wisdom.perk.6') } },
};
export const DOCTRINE_MAX = 6;

// 사건 카드: LLM에 '최근 사건'으로 전달되고 규칙에도 영향을 준다
export const EVENTS = [
  { id: 'calm',    name: t('data.event.calm.name'), text: t('data.event.calm.text'), rule: t('data.event.calm.rule') },
  { id: 'drought', name: t('data.event.drought.name'), text: t('data.event.drought.text'), rule: t('data.event.drought.rule') },
  { id: 'harvest', name: t('data.event.harvest.name'), text: t('data.event.harvest.text'), rule: t('data.event.harvest.rule') },
  { id: 'plague',  name: t('data.event.plague.name'), text: t('data.event.plague.text'), rule: t('data.event.plague.rule') },
  { id: 'threat',  name: t('data.event.threat.name'), text: t('data.event.threat.text'), rule: t('data.event.threat.rule') },
  { id: 'prophet', name: t('data.event.prophet.name'), text: t('data.event.prophet.text'), rule: t('data.event.prophet.rule') },
];

// 기적: 계시 전에 장마다 하나 쓸 수 있다. 첫 판은 앞의 셋, 그 뒤로는 판마다 셋을 받고 5장에 하나를 더 고른다
export const MIRACLES = [
  { id: 'lightning', name: t('data.miracle.lightning.name'), cost: 4, text: t('data.miracle.lightning.text'), target: 'enemy' },
  { id: 'rain',      name: t('data.miracle.rain.name'), cost: 3, text: t('data.miracle.rain.text') },
  { id: 'bounty',    name: t('data.miracle.bounty.name'), cost: 5, text: t('data.miracle.bounty.text') },
  { id: 'manna',     name: t('data.miracle.manna.name'), cost: 3, text: t('data.miracle.manna.text') },
  { id: 'ark',       name: t('data.miracle.ark.name'), cost: 3, text: t('data.miracle.ark.text') },
  { id: 'tongues',   name: t('data.miracle.tongues.name'), cost: 3, text: t('data.miracle.tongues.text') },
  { id: 'pillar',    name: t('data.miracle.pillar.name'), cost: 3, text: t('data.miracle.pillar.text') },
  { id: 'revive',    name: t('data.miracle.revive.name'), cost: 5, text: t('data.miracle.revive.text') },
];
export const FIRST_HAND = ['lightning', 'rain', 'bounty'];
// 신의 분노가 가득 차면 손에 들어오는 숨은 기적 (드래프트에 나오지 않는다)
export const DOOM = { id: 'doom', name: t('data.miracle.doom.name'), cost: 0, hidden: true, text: t('data.miracle.doom.text') };

// 교리가 깊어지면 대사제의 말투가 바뀐다 (최고 교리 3칸: 먹빛, 4칸: 프롬프트 한 줄)
export const DOCTRINE_VOICE = {
  war:       { prompt: t('data.voice.war.prompt'), prefix: t('data.voice.war.prefix') },
  peace:     { prompt: t('data.voice.peace.prompt'), prefix: t('data.voice.peace.prefix') },
  abundance: { prompt: t('data.voice.abundance.prompt'), prefix: t('data.voice.abundance.prefix') },
  wisdom:    { prompt: t('data.voice.wisdom.prompt'), prefix: t('data.voice.wisdom.prefix') },
};

// 교리 대립: 한쪽이 오르면 반대쪽이 한 칸 흔들린다 (이미 얻은 특전 칸 아래로는 내려가지 않는다)
export const OPPOSED = { peace: 'war', war: 'peace', abundance: 'wisdom', wisdom: 'abundance' };
// 율법파가 지난 장의 말씀을 듣고 고르는 율법 카드
export const REACT = {
  war:       { cards: ['L4', 'L3'], line: t('data.react.war.line') },
  peace:     { cards: ['L7'], line: t('data.react.peace.line') },
  abundance: { cards: ['L2', 'L9'], line: t('data.react.abundance.line') },
  wisdom:    { cards: ['L6'], line: t('data.react.wisdom.line') },
  vow:       { cards: ['L5'], line: t('data.react.vow.line') },
};

// 심판의 기준: 마지막 장의 승점 공식 (두 번째 판부터 판마다 하나). 합계가 기본과 비슷하도록 맞췄다
export const JUDGEMENTS = {
  classic:   { name: t('data.judgement.classic.name'), text: t('data.judgement.classic.text'), w: { pop: 2, village: 3, temple: 2, hp: 1 } },
  wide:      { name: t('data.judgement.wide.name'), text: t('data.judgement.wide.text'), w: { pop: 1, village: 5, temple: 2, hp: 1 } },
  fertile:   { name: t('data.judgement.fertile.name'), text: t('data.judgement.fertile.text'), w: { pop: 3, village: 2, temple: 1, hp: 1 } },
  pious:     { name: t('data.judgement.pious.name'), text: t('data.judgement.pious.text'), w: { pop: 2, village: 2, temple: 3, hp: 1, faith: 3 } },
  steadfast: { name: t('data.judgement.steadfast.name'), text: t('data.judgement.steadfast.text'), w: { pop: 2, village: 2, temple: 2, hp: 3, wall: 1 } },
};

// 두 갈래 사건 (두 번째 판부터 사건 덱에 섞인다). 버튼으로 고르거나, 계시 속 말로 답한다 (tags)
export const DILEMMAS = [
  { id: 'refugees', name: t('data.event.refugees.name'), text: t('data.event.refugees.text'), rule: t('data.event.refugees.rule'), choice: [
    { id: 'take', label: t('data.event.refugees.choice.take.label'), text: t('data.event.refugees.choice.take.text'), tags: t('kw.data.event.refugees.choice.take.tags'), gain: { food: -2 }, pop: 1 },
    { id: 'send', label: t('data.event.refugees.choice.send.label'), text: t('data.event.refugees.choice.send.text'), tags: t('kw.data.event.refugees.choice.send.tags'), gain: { faith: -1 } }] },
  { id: 'pilgrims', name: t('data.event.pilgrims.name'), text: t('data.event.pilgrims.text'), rule: t('data.event.pilgrims.rule'), choice: [
    { id: 'host', label: t('data.event.pilgrims.choice.host.label'), text: t('data.event.pilgrims.choice.host.text'), tags: t('kw.data.event.pilgrims.choice.host.tags'), gain: { faith: 2, food: -1 } },
    { id: 'ignore', label: t('data.event.pilgrims.choice.ignore.label'), text: t('data.event.pilgrims.choice.ignore.text'), tags: t('kw.data.event.pilgrims.choice.ignore.tags'), gain: {} }] },
  { id: 'inquisitor', name: t('data.event.inquisitor.name'), text: t('data.event.inquisitor.text'), rule: t('data.event.inquisitor.rule'), choice: [
    { id: 'expel', label: t('data.event.inquisitor.choice.expel.label'), text: t('data.event.inquisitor.choice.expel.text'), tags: t('kw.data.event.inquisitor.choice.expel.tags'), gain: { faith: 1 }, provoke: true },
    { id: 'soothe', label: t('data.event.inquisitor.choice.soothe.label'), text: t('data.event.inquisitor.choice.soothe.text'), tags: t('kw.data.event.inquisitor.choice.soothe.tags'), gain: { food: -2 } }] },
  { id: 'schism', name: t('data.event.schism.name'), text: t('data.event.schism.text'), rule: t('data.event.schism.rule'), choice: [
    { id: 'side', label: t('data.event.schism.choice.side.label'), text: t('data.event.schism.choice.side.text'), tags: t('kw.data.event.schism.choice.side.tags'), doctrine: 1, pop: -1 },
    { id: 'reconcile', label: t('data.event.schism.choice.reconcile.label'), text: t('data.event.schism.choice.reconcile.text'), tags: t('kw.data.event.schism.choice.reconcile.tags'), gain: { faith: -2 } }] },
  { id: 'merchant', name: t('data.event.merchant.name'), text: t('data.event.merchant.text'), rule: t('data.event.merchant.rule'), choice: [
    { id: 'trade', label: t('data.event.merchant.choice.trade.label'), text: t('data.event.merchant.choice.trade.text'), tags: t('kw.data.event.merchant.choice.trade.tags'), gain: { food: -3, stone: 2, wood: 2 } },
    { id: 'pass', label: t('data.event.merchant.choice.pass.label'), text: t('data.event.merchant.choice.pass.text'), tags: t('kw.data.event.merchant.choice.pass.tags'), gain: {} }] },
  { id: 'healer', name: t('data.event.healer.name'), text: t('data.event.healer.text'), rule: t('data.event.healer.rule'), choice: [
    { id: 'pay', label: t('data.event.healer.choice.pay.label'), text: t('data.event.healer.choice.pay.text'), tags: t('kw.data.event.healer.choice.pay.tags'), gain: { faith: -2 }, ark: true },
    { id: 'refuse', label: t('data.event.healer.choice.refuse.label'), text: t('data.event.healer.choice.refuse.text'), tags: t('kw.data.event.healer.choice.refuse.tags'), gain: {} }] },
];

// 분열의 예언자 미라: 교리가 둘로 갈라지거나 신앙이 바닥났을 때 한 번 나타나는 갈림길 (덱에는 없다)
export const MIRA = { id: 'mira', name: t('data.event.mira.name'), text: t('data.event.mira.text'), rule: t('data.event.mira.rule'), special: true, choice: [
  { id: 'punish', label: t('data.event.mira.choice.punish.label'), text: t('data.event.mira.choice.punish.text'), tags: t('kw.data.event.mira.choice.punish.tags'), gain: { faith: 2 }, pop: -1 },
  { id: 'embrace', label: t('data.event.mira.choice.embrace.label'), text: t('data.event.mira.choice.embrace.text'), tags: t('kw.data.event.mira.choice.embrace.tags'), gain: { faith: 1 }, edict: 1 },
  { id: 'reconcile', label: t('data.event.mira.choice.reconcile.label'), text: t('data.event.mira.choice.reconcile.text'), tags: t('kw.data.event.mira.choice.reconcile.tags'), gain: { faith: -2 }, calm: true }] };
export const MIRA_TWIST = { war: t('data.miraTwist.war'), peace: t('data.miraTwist.peace'), abundance: t('data.miraTwist.abundance'), wisdom: t('data.miraTwist.wisdom') };

// 달 이름 (판 길이에 맞춰 한 해를 나눈다)과 막이 바뀔 때의 절기
export const MONTHS = t('data.months');
export const FESTIVALS = { 2: t('data.festival.2'), 3: t('data.festival.3'), last: t('data.festival.last') };

// 안개 속 발견지: 처음 드러날 때 한 번 일어난다
export const SITES = {
  nomads: { name: t('data.site.nomads.name'), text: t('data.site.nomads.text'), choice: [
    { id: 'take', label: t('data.site.nomads.choice.take.label'), text: t('data.site.nomads.choice.take.text') },
    { id: 'send', label: t('data.site.nomads.choice.send.label'), text: t('data.site.nomads.choice.send.text') },
  ] },
  altar:  { name: t('data.site.altar.name'), text: t('data.site.altar.text'), gain: { faith: 3 } },
  spring: { name: t('data.site.spring.name'), text: t('data.site.spring.text'), gain: { wood: 2, stone: 1 } },
  bones:  { name: t('data.site.bones.name'), text: t('data.site.bones.text'), gain: { stone: 3 } },
  legacy: { name: t('data.site.legacy.name'), text: t('data.site.legacy.text'), gain: { faith: 2 } },
};
// 영구 지형: 사막 속 오아시스는 식량 3, 산의 채석장은 돌 3
export const FEATURES = {
  oasis:  { name: t('data.feature.oasis.name'), on: 'desert', gather: 'food', amount: 3 },
  quarry: { name: t('data.feature.quarry.name'), on: 'mountain', gather: 'stone', amount: 3 },
};

// 영원한 계명: "영원히 …"로 새긴다. 두 번째 판·3장부터, 판당 둘까지. 엔진이 끝까지 지킨다
export const COMMANDMENTS = {
  noSword:  { name: t('data.commandment.noSword.name'), text: t('data.commandment.noSword.text'), re: t('kw.data.commandment.noSword.re') },
  noExpand: { name: t('data.commandment.noExpand.name'), text: t('data.commandment.noExpand.text'), re: t('kw.data.commandment.noExpand.re') },
  sabbath:  { name: t('data.commandment.sabbath.name'), text: t('data.commandment.sabbath.text'), re: t('kw.data.commandment.sabbath.re') },
  noFamine: { name: t('data.commandment.noFamine.name'), text: t('data.commandment.noFamine.text'), re: t('kw.data.commandment.noFamine.re') },
};
export const MAX_COMMANDMENTS = 2;

// 오늘의 계시에 숨은 말 (단서를 보고 계시에 그 말을 쓰면 성서에 새겨진다)
export const SACRED_WORDS = [
  { word: t('kw.data.sacred.0.word'), clue: t('data.sacred.0.clue') },
  { word: t('kw.data.sacred.1.word'), clue: t('data.sacred.1.clue') },
  { word: t('kw.data.sacred.2.word'), clue: t('data.sacred.2.clue') },
  { word: t('kw.data.sacred.3.word'), clue: t('data.sacred.3.clue') },
  { word: t('kw.data.sacred.4.word'), clue: t('data.sacred.4.clue') },
  { word: t('kw.data.sacred.5.word'), clue: t('data.sacred.5.clue') },
  { word: t('kw.data.sacred.6.word'), clue: t('data.sacred.6.clue') },
];

// 경외와 은사: 판이 끝날 때마다 경외가 쌓이고, 레벨마다 은사 하나가 열린다 (힘이 아니라 시작의 모양을 바꾼다)
export const AWE_LEVELS = [20, 50, 100, 160, 240];
export const BLESSINGS = {
  preacher: { level: 1, name: t('data.blessing.preacher.name'), text: t('data.blessing.preacher.text') },
  mason:    { level: 2, name: t('data.blessing.mason.name'), text: t('data.blessing.mason.text') },
  granary:  { level: 3, name: t('data.blessing.granary.name'), text: t('data.blessing.granary.text') },
  seer:     { level: 4, name: t('data.blessing.seer.name'), text: t('data.blessing.seer.text') },
};
export const AWE_TITLES = t('data.aweTitles');

// 규칙 판: 규칙이 바뀌면 올린다 (같은 시드의 기록끼리만 비교한다)
export const RULESET = 4;

// 시련: 고정된 맵과 한 가지 비틀린 규칙. 별 셋 (승리 / 10점 차 / 20점 차 또는 일찍 끝냄)
export const TRIALS = {
  storm:   { name: t('data.trial.storm.name'), desc: t('data.trial.storm.desc'), size: 5, difficulty: 'normal', seed: 11101,
    intro: t('data.trial.storm.intro') },
  earth:   { name: t('data.trial.earth.name'), desc: t('data.trial.earth.desc'), size: 6, difficulty: 'normal', seed: 22202,
    intro: t('data.trial.earth.intro') },
  sword:   { name: t('data.trial.sword.name'), desc: t('data.trial.sword.desc'), size: 5, difficulty: 'normal', seed: 33303,
    intro: t('data.trial.sword.intro') },
  cloister:{ name: t('data.trial.cloister.name'), desc: t('data.trial.cloister.desc'), size: 5, difficulty: 'normal', seed: 44404,
    intro: t('data.trial.cloister.intro') },
  last:    { name: t('data.trial.last.name'), desc: t('data.trial.last.desc'), size: 5, difficulty: 'hard', seed: 55505, rounds: 8,
    intro: t('data.trial.last.intro') },
};

// 승천: 어려움에서 이기면 한 단계씩 열린다 (누적)
export const ASCENSION = t('data.ascension');

// 신의 상징 (인장에 찍힌다)
export const SIGILS = { light: 'i-faith', sword: 'd-war', dove: 'd-peace', grain: 'i-food', eye: 'e-prophet', storm: 'm-lightning' };

// 율법 카드: 율법파(오토마)는 매 장 한 장을 뽑아 위에서부터 행동한다.
// 규칙 항목: { type, gather?, build? }. 조건에 맞는 행동이 없으면 다음 항목으로 넘어간다.
export const LAW_CARDS = [
  { id: 'L1', name: t('data.law.L1.name'), text: t('data.law.L1.text'),
    rules: [{ type: 'build', build: 'village' }, { type: 'gather', gather: 'wood' }, { type: 'gather', gather: 'food' }] },
  { id: 'L2', name: t('data.law.L2.name'), text: t('data.law.L2.text'),
    rules: [{ type: 'gather', gather: 'food' }, { type: 'gather', gather: 'food' }, { type: 'pray' }] },
  { id: 'L3', name: t('data.law.L3.name'), text: t('data.law.L3.text'),
    rules: [{ type: 'gather', gather: 'stone' }, { type: 'build', build: 'wall' }, { type: 'gather', gather: 'wood' }] },
  { id: 'L4', name: t('data.law.L4.name'), text: t('data.law.L4.text'),
    rules: [{ type: 'build', build: 'wall' }, { type: 'gather', gather: 'stone' }, { type: 'pray' }] },
  { id: 'L5', name: t('data.law.L5.name'), text: t('data.law.L5.text'),
    rules: [{ type: 'attack' }, { type: 'attack' }, { type: 'gather', gather: 'food' }] },
  { id: 'L6', name: t('data.law.L6.name'), text: t('data.law.L6.text'),
    rules: [{ type: 'pray' }, { type: 'build', build: 'temple' }, { type: 'gather', gather: 'food' }] },
  { id: 'L7', name: t('data.law.L7.name'), text: t('data.law.L7.text'),
    rules: [{ type: 'preach' }, { type: 'preach' }, { type: 'pray' }] },
  { id: 'L8', name: t('data.law.L8.name'), text: t('data.law.L8.text'),
    rules: [{ type: 'gather', gather: 'food' }, { type: 'build', build: 'temple' }, { type: 'build', build: 'village' }] },
  { id: 'L9', name: t('data.law.L9.name'), text: t('data.law.L9.text'),
    rules: [{ type: 'build', build: 'village' }, { type: 'build', build: 'village' }, { type: 'gather', gather: 'wood' }] },
  // 검열: 다음 장에 플레이어가 가장 자주 쓴 말을 봉인한다 (쓰면 계시 비용 +1). 두 번째 판부터, 보통 이상
  { id: 'L10', name: t('data.law.L10.name'), text: t('data.law.L10.text'), ban: true,
    rules: [{ type: 'gather', gather: 'food' }, { type: 'gather', gather: 'wood' }, { type: 'pray' }] },
];

// 율법파 지도자: 판마다 한 명. 덱 구성만 바꾼다 (수치 보너스는 없다)
export const ENEMY_LEADERS = {
  elder: {
    name: t('data.leader.elder.name'), title: t('data.leader.elder.title'), desc: t('data.leader.elder.desc'),
    deck: { add: [], remove: [] },
    lines: {
      intro: t('data.leader.elder.line.intro'),
      card: { any: t('data.leader.elder.line.card.any') },
      rebuttal: {
        war: t('data.leader.elder.line.rebuttal.war'),
        peace: t('data.leader.elder.line.rebuttal.peace'),
        abundance: t('data.leader.elder.line.rebuttal.abundance'),
        wisdom: t('data.leader.elder.line.rebuttal.wisdom'),
        any: t('data.leader.elder.line.rebuttal.any'),
      },
      villageLost: t('data.leader.elder.line.villageLost'),
      capitalLow: t('data.leader.elder.line.capitalLow'),
    },
  },
  iron: {
    name: t('data.leader.iron.name'), title: t('data.leader.iron.title'), desc: t('data.leader.iron.desc'),
    deck: { add: ['L5'], remove: [] }, notOn: ['easy'],
    lines: {
      intro: t('data.leader.iron.line.intro'),
      card: { L5: t('data.leader.iron.line.card.L5'), any: t('data.leader.iron.line.card.any') },
      rebuttal: {
        war: t('data.leader.iron.line.rebuttal.war'),
        peace: t('data.leader.iron.line.rebuttal.peace'),
        any: t('data.leader.iron.line.rebuttal.any'),
      },
      villageLost: t('data.leader.iron.line.villageLost'),
      capitalLow: t('data.leader.iron.line.capitalLow'),
    },
  },
  preacher: {
    name: t('data.leader.preacher.name'), title: t('data.leader.preacher.title'), desc: t('data.leader.preacher.desc'),
    deck: { add: ['L7'], remove: ['L2'] },
    lines: {
      intro: t('data.leader.preacher.line.intro'),
      card: { L7: t('data.leader.preacher.line.card.L7'), any: t('data.leader.preacher.line.card.any') },
      rebuttal: {
        peace: t('data.leader.preacher.line.rebuttal.peace'),
        war: t('data.leader.preacher.line.rebuttal.war'),
        any: t('data.leader.preacher.line.rebuttal.any'),
      },
      villageLost: t('data.leader.preacher.line.villageLost'),
      capitalLow: t('data.leader.preacher.line.capitalLow'),
    },
  },
  builder: {
    name: t('data.leader.builder.name'), title: t('data.leader.builder.title'), desc: t('data.leader.builder.desc'),
    deck: { add: ['L9', 'L6'], remove: ['L5'] },
    lines: {
      intro: t('data.leader.builder.line.intro'),
      card: { L9: t('data.leader.builder.line.card.L9'), L6: t('data.leader.builder.line.card.L6'), any: t('data.leader.builder.line.card.any') },
      rebuttal: {
        abundance: t('data.leader.builder.line.rebuttal.abundance'),
        any: t('data.leader.builder.line.rebuttal.any'),
      },
      villageLost: t('data.leader.builder.line.villageLost'),
      capitalLow: t('data.leader.builder.line.capitalLow'),
    },
  },
};

// 난이도: 율법파의 추가 행동과 시작 자원
export const DIFFICULTY = {
  easy:   { name: t('data.difficulty.easy.name'), enemyBonus: 0, enemyStart: { food: 3, wood: 1, stone: 0, faith: 2, pop: 3 } },
  normal: { name: t('data.difficulty.normal.name'), enemyBonus: 1, enemyStart: { food: 5, wood: 3, stone: 1, faith: 3, pop: 4 } },
  hard:   { name: t('data.difficulty.hard.name'), enemyBonus: 2, enemyStart: { food: 6, wood: 4, stone: 2, faith: 4, pop: 4 } },
};

export const MAP_SIZES = {
  4: { name: t('data.mapSize.4.name'), rounds: 8 },
  5: { name: t('data.mapSize.5.name'), rounds: 12 },
  6: { name: t('data.mapSize.6.name'), rounds: 12 },
  7: { name: t('data.mapSize.7.name'), rounds: 14 },
};

export const PLAYER_START = { food: 4, wood: 2, stone: 0, faith: 4, pop: 3 };

// 튜토리얼: 3×3 고정 맵, 5장. 율법파는 공격하지 않는 온순한 율법만 쓴다.
// P: 우리 수도, E: 율법파 수도, V: 율법파 마을
export const TUTORIAL = {
  id: 'tutorial',
  title: t('data.tutorial.title'),
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
