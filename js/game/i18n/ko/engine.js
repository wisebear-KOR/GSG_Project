// 한국어 언어팩 — engine: 진행 기록(log.*)과 판정·행동·칸 이름 문구(eng.*)
// who: 'player' | 'enemy' (문장의 주어가 어느 쪽인가)
import { josa, batchim } from './grammar.js';

const subj = (who) => (who === 'player' ? '신도들이' : '율법파가');
const topic = (who) => (who === 'player' ? '신도들은' : '율법파는');
const poss = (who) => (who === 'player' ? '신도들의' : '율법파의');
const tribe = (who) => (who === 'player' ? '우리 부족' : '율법파');
const ours = (owner) => (owner === 'player' ? '우리' : '율법파');
const ga = (w) => (batchim(w) ? '이' : '가');
// 전설이 된 땅의 별칭 (교리별)
const LEGEND_ADJ = { war: '분노의', peace: '빛의', abundance: '넘치는', wisdom: '별의' };

export default {
  'log.rally': '율법파가 결집한다 — 우리가 크게 앞서자 율법파의 행동이 하나 늘고 칼을 먼저 든다.',
  'log.remnant': (v) => `${tribe(v.who)}의 마지막 신도가 쓰러졌다 — ${v.hp > 0 ? `수도가 흔들리고(내구도 ${v.hp}) 한 명이 수도로 돌아온다.` : '수도가 무너졌다.'}`,
  'log.echo': '같은 말씀이 되풀이되어 무뎌졌다 — 교리가 오르지 않는다.',
  'log.attackRetreat': (v) => `율법파 원정대가 ${josa(v.place, '을', '를')} 넘지 못하고 물러났다 (율법파 식량 -1).`,
  'log.lawGuard': (v) => `율법파가 우리의 말씀을 읽고 대비한다 — 이번 장 우리의 선교·공격에 방어 +${v.n}.`,
  // ---------- 칸 이름 (항상 플레이어 시점: "우리" = 플레이어) ----------
  'eng.tile.fog': '안개 지대({id})',
  'eng.tile.named': '{name}({id})',
  'eng.tile.capital': (v) => `${ours(v.owner)} 수도(${v.id})`,
  'eng.tile.village': (v) => `${ours(v.owner)} 마을(${v.id})`,
  'eng.tile.land': '{name}({id})',

  // ---------- 비용·수익 표기 ----------
  'eng.cost.item': '{res} -{n}',
  'eng.gain.item': '{res} +{n}',
  'eng.preview.gain': '+{n} {res}',
  'eng.preview.faith': '+{n} 신앙',

  // ---------- 행동 설명 (가능한 행동 목록) ----------
  'eng.act.gather': (v) => `${v.place}에서 ${v.river ? '물고기를 잡는다' : v.verb} (${v.res} +${v.n})`,
  'eng.act.pray': '신전에서 기도한다 (신앙 +{n})',
  'eng.act.village': '{place}에 마을을 세운다 ({cost}, 영토 확장)',
  'eng.act.wall': '{place}에 성벽을 쌓는다 ({cost}, 방어 +2)',
  'eng.act.temple': '신전을 높인다 ({cost}, 행동 수 +1)',
  'eng.act.cathedral': (v) => `대성당의 ${josa(v.part, '을', '를')} 올린다 (${v.cost}, ${v.stage}/3단계${v.stage === 2 ? ' — 완공하면 승리' : ''})`,
  'eng.act.preach': '{place}의 율법파에게 신의 뜻을 전한다 (개종 판정)',
  'eng.act.attack': (v) => `${josa(v.place, '을', '를')} 공격한다 (전투 판정${v.wall ? ', 성벽 있음' : ''})`,
  'eng.act.explore': '{place} 속을 탐험한다 (무엇이 있을지 모름)',

  // ---------- 명령 검증: 거부 사유 ----------
  'eng.reject.forbidden': '계시가 금지',
  'eng.reject.cost': '자원 부족',
  'eng.reject.clashPref': '같은 장소 (교리에 맞는 행동 우선)',
  'eng.reject.clash': '같은 장소',
  'eng.reject.limit': '행동 수 초과',

  // ---------- 교리 이름 ----------
  'eng.doctrine.peace': '평화',
  'eng.doctrine.war': '전쟁',
  'eng.doctrine.abundance': '풍요',
  'eng.doctrine.wisdom': '지혜',

  // ---------- 분열의 예언자 미라의 외침 ----------
  'eng.miraQuote': (v) => `신께서 “${v.text}”라 하셨으니, 곧 ${v.twist}는 뜻이다!`,
  'eng.miraQuoteNone': '신은 이미 우리를 떠났다!',

  // ---------- 신도들의 청원 (keys: 계시에서 그 뜻을 알아듣는 정규식 원본 — 번역이 아니라 그 언어로 새로 쓴다) ----------
  'eng.petition.food': '먹을 것이 모자라옵니다. 어디서 거두리까?',
  'kw.petition.food': '강|물|곡식|들|먹|거두|수확',
  'eng.petition.threat': (v) => `율법파가 ${josa(v.place, '을', '를')} 노리옵니다. 어찌 지키리까?`,
  'kw.petition.threat': '지키|막|성벽|방패|쳐|싸우',
  'eng.petition.faith': '신이시여, 저희 믿음이 흔들리옵니다.',
  'kw.petition.faith': '기도|경배|믿|섬기|찬양',
  'eng.petition.plague': '역병이 돕니다. 저희를 버리지 마소서.',
  'kw.petition.plague': '기도|치유|살리|낫|지키',
  'eng.petition.prophet': '예언자가 안개 속 보물을 말하옵니다. 가 보리까?',
  'kw.petition.prophet': '안개|찾|탐험|너머|보물',
  'eng.petition.crowded': '집이 비좁사옵니다. 새 터를 주소서.',
  'kw.petition.crowded': '마을|터|넓|세우',
  'eng.petition.wood': '땔감이 떨어졌사옵니다.',
  'kw.petition.wood': '숲|나무|목재|베',
  'eng.petition.idle': '신이시여, 이번 계절엔 무엇을 하리까?',

  // ---------- 기적을 쓸 수 없을 때 ----------
  'eng.miracle.notInHand': '손에 없는 기적이다.',
  'eng.miracle.cannot': '신앙이 부족하거나 이미 기적을 썼다.',
  'eng.miracle.needTarget': '보이는 율법파 칸을 골라야 한다.',
  // 연출 꼬리표
  'eng.fx.ark': '방주',
  'eng.fx.tongues': '방언',
  'eng.fx.pillar': '불기둥',
  'eng.fx.revive': '부활',

  // ---------- 율법 석판이 움직인 까닭 (log.edict의 {why}) ----------
  'eng.edict.lightning': '번개가 율법파 수도의 돌판을 쪼갰다',
  'eng.edict.doom': '심판의 날이 돌판을 갈랐다',
  'eng.edict.holyEnemy': '율법파가 성지에서 율법을 외웠다',
  'eng.edict.holyPlayer': '성지의 말씀이 율법을 지웠다',
  'eng.edict.mira': '미라의 소문이 율법파에 닿았다',
  'eng.edict.temple': '율법파가 신전을 높였다',

  // ---------- 은총의 까닭 (log.grace의 {why}) ----------
  // types: 금한 행동 종류 ['attack' | 'preach', ...]
  'eng.why.vow': (v) => `${josa(v.types.map((x) => (x === 'attack' ? '칼' : '설교')).join('과 '), '을', '를')} 거두는 서원을 지켰다`,

  // ---------- 승패 사유 ----------
  'eng.win.doom': '적 수도 점령 (심판의 날)',
  'eng.win.cathedral': '대성당 완공',
  'eng.win.capital': (v) => (v?.who === 'enemy' ? '우리 수도 함락' : '적 수도 점령'),
  'eng.win.draw': '양쪽 부족이 모두 사라짐',
  'eng.win.convertAll': '율법파 전원 개종·소멸',
  'eng.win.edict': '율법 석판 완성',
  'eng.win.extinct': '신도가 모두 사라짐',
  'eng.win.faith': '신앙 승리 (인구의 3/4이 신도, 선교로 데려온 이들과 함께)',
  'eng.win.tutorial': '튜토리얼 완료 — 승점 {ps} : {es}',
  'eng.win.rounds': '{n}장 종료 — 승점 {ps} : {es}',

  // ---------- 승점 항목 ----------
  'eng.score.pop': '신도',
  'eng.score.village': '마을',
  'eng.score.temple': '신전',
  'eng.score.hp': '수도',
  'eng.score.wall': '성벽',
  'eng.score.holy': '성지',
  'eng.score.cathedral': '대성당',
  'eng.score.destiny': '소명',
  'eng.score.faith': '신앙',
  'eng.score.faithNote': '신앙 {n}마다',

  // ---------- 전설이 된 땅 ----------
  // doctrine: 교리 id (없으면 "N장의"), base: 아래 칸 종류 이름이나 지형 이름
  'eng.legend.name': (v) => `${LEGEND_ADJ[v.doctrine] ?? `${v.round}장의`} ${v.base}`,
  'eng.legend.capital': '신전',
  'eng.legend.village': '마을',
  'eng.legend.land': '땅',

  // 검열 카드가 봉인할 말 (계시에 명사가 없을 때 시드로 하나)
  'eng.banWords': ['분노', '사랑', '번개', '전쟁', '풍요'],

  'eng.unknownCard': '알 수 없는 카드',

  // ================= 진행 기록 =================
  // 성인
  'log.saint': (v) => `${v.name}${ga(v.name)} 성인으로 추앙받는다 — ${v.kind === 'preacher' ? '설교자 성인' : '수호자 성인'}.`,
  'log.saintFallen': (v) => `성인 ${v.name}${ga(v.name)} 쓰러져 순교했다.`,

  // 은총·예언
  'log.grace': '은총 — {why}. 신앙 +{n}.',
  'log.prophecyDone': '예언이 이루어졌다 — “{name}”. 신앙 +{n}.',
  'log.prophecyFailed': '예언이 빗나갔다 — “{name}”. 신도들이 수군거린다. 신앙 -{n}.',

  // 기적
  'log.lightningWall': '⚡ 번개가 {place}의 성벽을 무너뜨렸다.',
  'log.lightningHit': '⚡ 번개가 {place}에 떨어져 율법파 1명이 쓰러졌다.',
  'log.rain': '🌧️ 단비가 내렸다. 식량 +3.',
  'log.bounty': '🎁 풍요의 기적. 목재 +2, 돌 +2.',
  'log.doom': '심판의 날 — 하늘이 갈라져 율법파 수도가 흔들리고(내구도 {hp}) 한 사람이 쓰러졌다. 신의 분노가 가라앉는다.',
  'log.manna': '만나가 내렸다. 식량 +4.',
  'log.ark': '방주의 기적 — 이번 장에는 아무도 잃지 않으리라.',
  'log.tongues': '방언의 은사 — 이번 장 선교에 힘이 실린다.',
  'log.pillar': '불기둥이 앞서간다 — 안개가 걷히고 이번 장 공격에 힘이 실린다.',
  'log.revive': '쓰러진 자가 일어났다. 신도 +1.',
  'log.reviveFull': '부활의 기적 — 그러나 자리가 없어 빛만 남았다. 신앙 +2.',

  // 발견지
  'log.siteMeet': (v) => `${v.place}에서 ${josa(v.site, '을', '를')} 만났다.`,
  // god: 지난 신의 이름 (없을 수 있다), epithet: 별칭, doc: 오른 교리 이름 (없으면 신앙 +2)
  'log.legacy': (v) => {
    const who = v.god ? `「${v.epithet}」 ${v.god}` : `「${v.epithet}」`;
    return `전생의 유적 — 여기 ${who}${ga(v.god || v.epithet)} “${v.quote}”라 말씀하셨다. ${v.doc ? `${v.doc} +1` : '신앙 +2'}.`;
  },
  'log.site': '{name} — {text} {gains}.',
  'log.nomadJoin': '유목민이 신도가 되었다. 신도 +1.',
  'log.nomadLeave': '자리가 없어 유목민은 양식을 두고 떠났다. 식량 +2.',
  'log.nomadBless': '유목민이 축복을 받고 떠났다. 신앙 +2.',

  // 동시 공개: 같은 칸
  'log.blocked': (v) => `${topic(v.who)} ${josa(v.place, '을', '를')} 상대에게 먼저 빼앗겨 행동하지 못했다.`,

  // 신의 분노
  'log.wrathFull': (v) => (v?.doom === false ? '신의 분노가 가득 찼다 — 기적이 가장 싸다.' : '신의 분노가 가득 찼다. 「심판의 날」을 내릴 수 있다 (판에 한 번).'),
  'log.wrath': '신의 분노가 차오른다 ({n}/3) — 기적이 {n}만큼 싸진다.',

  // 율법 석판 (plus: 올랐는가, d: 실제 변화량)
  'log.edict': (v) => `율법 석판 ${v.plus ? '+' : ''}${v.d} — ${v.why} (${v.edict}/${v.max}).`,
  'log.edictNear': '율법 석판이 거의 완성되었다! 성지를 쥐거나 번개로 율법파 수도를 쳐서 막아야 한다.',

  // 소명·계명·성언·숨은 말
  'log.destiny': '소명을 이루었다 — 「{name}」 {text}. 승점 +{n}.',
  'log.commandment': '영원한 계명을 새겼다 — 「{name}」. {text}.',
  'log.sacred': (v) => `숨은 말 「${v.word}」${batchim(v.word) ? '을' : '를'} 찾았다! 성서에 새겨진다.`,

  // 침묵
  'log.silence': '신의 침묵이 길어진다. 신도들이 하늘을 올려다본다.',
  'log.silence2': '신의 침묵이 길어진다. 믿음이 흔들린다 (신앙 -1).',
  'log.silence3': '신이 떠났다고 수군댄다. 한 사람이 율법파로 갔다.',

  // 전설
  'log.legend': '이 땅은 이제 「{name}」이라 불린다 — “{quote}”.',

  // 두 갈래 사건 (noRoom: 손님을 받을 자리가 없어 양식만 나눴다)
  'log.dilemmaFallback': '{ev} — {label}에 드는 것을 감당할 수 없어 「{free}」 쪽을 따랐다.',
  'log.dilemma': (v) => `${v.ev} — ${v.label}. ${v.text}.${v.noRoom ? ' 머물 자리가 없어 양식만 나누고 떠났다 (식량 +2).' : ''}`,

  // 행동 해결
  'log.gatherFoe': (v) => `${topic(v.who)} ${josa(v.place, '이', '가')} 이미 적의 땅이라 채집하지 못했다.`,
  'log.gather': (v) => `${subj(v.who)} ${v.place}에서 ${josa(v.res, '을', '를')} ${v.n} 얻었다.`,
  'log.pray': (v) => `${subj(v.who)} 기도해 신앙을 ${v.n} 얻었다.`,
  'log.buildNoRes': (v) => `${topic(v.who)} 자원이 모자라 ${v.place}에 짓지 못했다.`,
  'log.villageTaken': (v) => `${josa(v.place, '은', '는')} 이미 주인이 있어 마을을 세우지 못했다.`,
  'log.village': (v) => `${subj(v.who)} ${josa(v.place, '을', '를')} 세웠다.`,
  'log.villageFog': (v) => `${subj(v.who)} 안개 속(${v.id})에 마을을 세웠다.`,
  'log.wall': (v) => `${subj(v.who)} ${v.place}에 성벽을 쌓았다.`,
  'log.temple': (v) => `${poss(v.who)} 신전이 ${v.level}단계로 높아졌다.`,
  'log.cathedralDone': (v) => `${subj(v.who)} 대성당의 첨탑을 올려 완공했다!`,
  'log.cathedral': (v) => `${subj(v.who)} 대성당의 ${josa(v.part, '을', '를')} 올렸다 (${v.stage}/3). 율법파가 이를 알아챘다.`,
  'log.prophetTreasure': '{place}에서 예언자가 말한 보물을 찾았다! 신앙 +3.',
  'log.exploreFind': (v) => `${josa(v.place, '을', '를')} 탐험해 ${josa(v.res, '을', '를')} 2 찾았다.`,
  'log.explore': (v) => `${josa(v.place, '을', '를')} 탐험했다. 안개가 걷혔다.`,
  'log.preachNone': '{place}에는 설교할 상대가 없었다.',
  'log.preachTurn': (v) => `${poss(v.who)} 설교가 통했다! ${v.place} 전체가 ${v.who === 'player' ? '말씀' : '율법'}에 물들어 넘어왔다.`,
  'log.preachMark': (v) => `${poss(v.who)} 설교가 통했다! ${v.place}에서 1명이 개종했다. 믿음의 표식 1/2.`,
  'log.preach': (v) => `${poss(v.who)} 설교가 통했다! ${v.place}에서 1명이 개종했다.`,
  'log.preachFail': (v) => `${poss(v.who)} 설교가 ${v.place}에서 외면당했다.`,
  'log.attackNotFoe': (v) => `${josa(v.place, '은', '는')} 이미 적의 땅이 아니었다.`,
  'log.attackWarSave': (v) => `${poss(v.who)} 공격이 ${v.place}에서 막혔다. 전쟁의 가호가 신앙 2를 태워 쓰러질 자를 살렸다.`,
  'log.attackArk': (v) => `${poss(v.who)} 공격이 ${v.place}에서 막혔다. 방주의 가호로 아무도 쓰러지지 않았다.`,
  'log.attackFail': (v) => `${poss(v.who)} 공격이 ${v.place}에서 막혔다. 공격자 1명이 쓰러졌다.`,
  'log.cathedralFall': '대성당의 {part}이 무너졌다 ({stage}/3).',
  'log.attackCapital': (v) => `${subj(v.who)} ${josa(v.place, '을', '를')} 쳤다! 수도 내구도 ${v.hp}.`,
  'log.capture': (v) => `${subj(v.who)} ${josa(v.place, '을', '를')} 빼앗았다!`,

  // 유지 단계
  'log.starve': (v) => `${josa(tribe(v.who), '이', '가')} 굶주려 1명을 잃었다.`,
  'log.birth': (v) => `${tribe(v.who)}에 새 ${v.who === 'player' ? '신도가' : '구성원이'} 태어났다.`,
  'log.plague': (v) => `역병으로 ${tribe(v.who)} 1명을 잃었다.`,
  'log.peaceUlt': '평화의 말씀이 {place}에 스며들어 1명이 개종했다.',
  'log.peaceUltFail': '평화의 말씀이 {place}에 닿았으나 스며들지 못했다.',
  'log.ban': (v) => `율법파가 검열을 선포했다. 다음 장에는 '${v.word}'${batchim(v.word) ? '이라는' : '라는'} 말을 쓰지 못한다.`,
  'log.heresy': '신앙이 바닥나 신도 1명이 율법파로 떠났다.',
  'log.faithless': '신앙이 바닥나 신도들이 흔들린다. 이대로면 다음 장에 떠나는 자가 생긴다.',

  // 교리 대립 (doc: 교리 이름)
  'log.doctrineShaken': '{doc}의 서약이 흔들린다 ({doc} -1).',
};
