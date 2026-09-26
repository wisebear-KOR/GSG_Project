// 판이 끝난 뒤의 이야기: 판 요약(서고), 후대 역사가의 에필로그, 성서(업적), 회고
// 모두 상태를 읽기만 하는 순수 함수다.
import { DOCTRINES, DOCTRINE, DIFFICULTY, ENEMY_LEADERS } from './data.js';
import { score } from './engine.js';
import { hashPick } from './lore.js';

// 승리·패배 유형
export function outcomeKind(state) {
  const r = state.winReason;
  if (state.winner === 'draw') return 'draw';
  const mine = state.winner === 'player';
  if (/수도 점령/.test(r)) return mine ? 'conquest' : 'conquered';
  if (/대성당/.test(r)) return mine ? 'cathedral' : 'lost';
  if (/신앙 승리|전원 개종/.test(r)) return mine ? 'faith' : 'lost';
  if (/모두 사라짐/.test(r)) return 'extinct';
  return mine ? 'score' : 'outscored';
}

// 가장 많이 쌓은 교리
export function topDoctrine(state) {
  const d = state.sides.player.doctrine;
  return DOCTRINES.reduce((best, k) => (d[k] > d[best] ? k : best), 'wisdom');
}

// 장별 승점 변화가 가장 컸던 계시들
export function topRevelations(state, n = 3) {
  const h = state.history;
  return h.map((x, i) => {
    const prev = h[i - 1] ?? { ps: h[0]?.ps ?? 0, es: h[0]?.es ?? 0 };
    return { round: x.round, text: x.text, gain: x.ps - prev.ps - (x.es - prev.es), verdict: x.verdict };
  }).filter((x) => x.text).sort((a, b) => b.gain - a.gain).slice(0, n);
}

// 결정적 장면: 수도 타격 5, 점령·마을 개종 3, 개종 2, 기적 2
export function decisiveScene(state) {
  let best = null;
  for (const l of state.log) {
    const f = l.fx;
    if (!f || (l.side !== 'player' && l.side !== 'enemy')) continue;
    const w = f.capital ? 5 : f.capture || f.convert ? 3 : f.kind === 'preach' && l.dice?.win ? 2 : ['lightning', 'rain', 'bounty', 'bless'].includes(f.kind) ? 2 : 0;
    if (w && (!best || w >= best.w)) best = { w, round: l.round, text: l.text, side: l.side };
  }
  if (!best) return null;
  const rev = state.revelations.find((r) => r.round === best.round);
  return { ...best, revelation: rev?.text ?? null };
}

// 주사위 운: 우리 쪽 판정의 기대 승률 합과 실제 승리 수의 차이
const P_WIN = (() => {
  const t = {};
  for (let d = -8; d <= 8; d++) {
    let w = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + d > b) w++;
    t[d] = w / 36;
  }
  return t;
})();
export function diceLuck(state) {
  let exp = 0; let act = 0; let n = 0;
  for (const l of state.log) {
    if (!l.dice || l.side !== 'player') continue;
    exp += P_WIN[Math.max(-8, Math.min(8, l.dice.attackerBonus - l.dice.defenderBonus))];
    act += l.dice.win ? 1 : 0; n += 1;
  }
  return { n, luck: act - exp };
}

// ---------- 에필로그: 후대 역사가의 기록 ----------
const EPITHET = { peace: '말씀으로 이긴 자', war: '칼을 든 신', abundance: '곳간을 채운 신', wisdom: '안개를 걷은 신' };
const WIN_TEXT = {
  conquest: {
    peace: '평화를 말하던 신의 백성이 끝내 율법의 탑을 무너뜨렸다. 역사가들은 그 모순을 두고 오래 다투었다.',
    war: '칼의 계시가 이어지자 율법의 탑은 불길 속에 무너졌다. 그 뒤 백 년 동안 이 땅의 아이들은 칼끝의 신에게 맹세했다.',
    abundance: '배부른 백성은 거침이 없었다. 곳간에서 나온 힘이 율법의 탑을 넘어뜨렸다.',
    wisdom: '안개 너머를 먼저 본 신이 먼저 쳤다. 율법의 탑은 무엇이 오는지도 모른 채 무너졌다.',
  },
  faith: {
    peace: '칼 한 번 들지 않고 이웃이 모두 돌아왔다. 율법의 돌판은 그 뒤 우물가의 빨래판이 되었다고 한다.',
    war: '두려움이 믿음이 되었다. 율법파는 싸우기보다 무릎 꿇기를 택했다.',
    abundance: '빵을 나누는 신에게 사람들이 모여들었다. 굶주린 율법은 배부른 말씀을 이기지 못했다.',
    wisdom: '수수께끼 같은 계시가 입에서 입으로 퍼졌고, 사람들은 답을 찾으려 이 신을 섬겼다.',
  },
  cathedral: {
    peace: '돌 하나하나에 평화의 말씀이 새겨진 대성당이 섰다. 순례자의 발길은 삼백 년 동안 끊이지 않았다.',
    war: '대성당의 첫 종소리는 전쟁의 끝을 알렸다. 그 벽에는 지금도 칼자국이 남아 있다.',
    abundance: '넘치는 곳간이 대성당이 되었다. 그 첨탑은 풍년마다 금빛으로 칠해졌다.',
    wisdom: '대성당의 천장에는 신이 내린 계시가 별자리처럼 그려졌다. 아무도 그 뜻을 다 풀지 못했다.',
  },
  score: {
    peace: '누구도 완전히 이기지 못한 시대였다. 그러나 사람들은 더 부드러운 말을 한 신을 기억했다.',
    war: '끝나지 않은 전쟁의 시대. 그래도 역사가들은 더 많은 땅을 지킨 쪽을 승자로 적었다.',
    abundance: '승부는 곳간에서 갈렸다. 더 많은 사람을 먹인 신이 더 오래 기억되었다.',
    wisdom: '긴 계절 끝에 남은 것은 몇 줄의 계시였다. 그 계시를 더 많이 읽은 쪽이 이겼다.',
  },
};
const LOSE_TEXT = {
  conquered: '율법의 칼이 신전에 닿았다. 신의 이름은 돌판 아래 묻혔고, 사람들은 그 말씀을 조용히 잊었다.',
  lost: '율법이 이겼다. 신의 계시는 몇몇 노인의 자장가로만 남았다.',
  outscored: '마지막 계절이 저물 때, 율법파의 곳간이 더 컸다. 신의 말씀은 반쯤만 기억되었다.',
  extinct: '마지막 신도가 쓰러지자 말씀도 멈췄다. 바람만이 두루마리를 넘겼다.',
  draw: '양쪽 모두 사라진 땅에 두루마리 하나가 남았다. 읽는 이는 없었다.',
};
export function epilogue(state) {
  const kind = outcomeKind(state);
  const top = topDoctrine(state);
  const won = state.winner === 'player';
  const body = won ? WIN_TEXT[kind]?.[top] ?? WIN_TEXT.score[top] : LOSE_TEXT[kind] ?? LOSE_TEXT.lost;
  const best = topRevelations(state, 1)[0];
  const epithet = won ? EPITHET[top] : hashPick(['잊힌 신', '돌판 아래 잠든 신', '반쯤 기억된 신'], state.config.seed, kind);
  return {
    title: won ? `${epithetTitle(kind)}` : '말씀이 저물다',
    body, epithet,
    quote: best?.text ? `“${best.text}” — 제 ${best.round} 장` : null,
  };
}
const epithetTitle = (kind) => ({ conquest: '탑이 무너진 날', faith: '모두가 돌아온 날', cathedral: '종이 울린 날', score: '마지막 계절' }[kind] ?? '승리');

// ---------- 판 요약 (서고에 남는다) ----------
export function summarizeGame(state, extra = {}) {
  const ep = epilogue(state);
  return {
    date: new Date().toISOString(), seed: state.config.seed, size: state.rows, difficulty: state.config.difficulty,
    leader: state.leader ? ENEMY_LEADERS[state.leader].name : null, daily: state.config.daily ?? null,
    winner: state.winner, kind: outcomeKind(state), reason: state.winReason,
    score: [score(state, 'player'), score(state, 'enemy')], rounds: state.round,
    doctrine: { ...state.sides.player.doctrine }, top: topDoctrine(state), epithet: ep.epithet,
    revelations: state.revelations.map((r) => ({ round: r.round, text: r.text, doctrine: r.doctrine })),
    stats: { ...state.stats }, names: Object.values(state.names ?? {}), god: state.config.god?.name ?? null,
    saints: state.saints?.length ?? 0, commandments: state.commandments?.length ?? 0, ...extra,
  };
}

// ---------- 성서 (업적) ----------
const won = (st) => st.winner === 'player';
export const ACHIEVEMENTS = [
  { id: 'first_win', name: '첫 번째 기적', desc: '처음으로 이긴다', check: (s) => won(s) },
  { id: 'faith_win', name: '모두가 돌아오다', desc: '신앙 승리 (인구의 3/4)', check: (s) => won(s) && s.kind === 'faith' },
  { id: 'conquest', name: '무너진 탑', desc: '율법파의 수도를 점령해 이긴다', check: (s) => won(s) && s.kind === 'conquest' },
  { id: 'cathedral', name: '종이 울리다', desc: '대성당을 완공한다', check: (s) => won(s) && s.kind === 'cathedral' },
  { id: 'pacifist', name: '피 없는 승리', desc: '전쟁 교리 0으로 이긴다', check: (s) => won(s) && s.doctrine.war === 0 },
  { id: 'no_miracle', name: '말씀만으로', desc: '기적을 한 번도 쓰지 않고 이긴다', check: (s) => won(s) && s.stats.miracles === 0 },
  { id: 'hard', name: '굽지 않는 율법을 넘어', desc: '어려움에서 이긴다', check: (s) => won(s) && s.difficulty === 'hard' },
  { id: 'big', name: '넓은 세상', desc: '7×7 맵에서 이긴다', check: (s) => won(s) && s.size === 7 },
  { id: 'prophet', name: '예언자', desc: '예언을 이룬다', check: (s) => s.stats.prophecies >= 1, progress: (s) => s.stats.prophecies },
  { id: 'seer', name: '세 번 맞힌 입', desc: '한 판에 예언을 세 번 이룬다', check: (s) => s.stats.prophecies >= 3, progress: (s) => s.stats.prophecies / 3 },
  { id: 'namer', name: '이름을 주는 자', desc: '한 판에 땅 세 곳에 이름을 붙인다', check: (s) => s.names.length >= 3, progress: (s) => s.names.length / 3 },
  { id: 'shepherd', name: '목자', desc: '한 판에 청원 여섯에 답한다', check: (s) => s.stats.petitions >= 6, progress: (s) => s.stats.petitions / 6 },
  { id: 'turned', name: '물든 마을', desc: '선교로 마을 하나를 넘겨받는다', check: (s) => (s.stats.turned ?? 0) >= 1 },
  { id: 'ultimate', name: '궁극의 계시', desc: '교리 하나를 여섯 칸까지 채운다', check: (s) => DOCTRINES.some((k) => s.doctrine[k] >= 6), progress: (s) => Math.max(...DOCTRINES.map((k) => s.doctrine[k])) / 6 },
  { id: 'terse', name: '짧은 말씀', desc: '모든 계시를 열 자 이하로 하고 이긴다', check: (s) => won(s) && s.revelations.length >= 6 && s.revelations.every((r) => r.text.replace(/\s/g, '').length <= 10) },
  { id: 'comeback', name: '되찾은 계절', desc: '승점이 6점 이상 뒤지다가 이긴다', check: (s) => won(s) && s.comeback },
  { id: 'fortress', name: '흔들림 없는 신전', desc: '수도 내구도를 하나도 잃지 않고 이긴다', check: (s) => won(s) && s.capitalFull },
  { id: 'daily', name: '오늘의 계시', desc: '오늘의 계시를 끝까지 치른다', check: (s) => !!s.daily },
  { id: 'all_doctrines', name: '네 갈래 길', desc: '네 교리를 모두 두 칸 이상 쌓는다', check: (s) => DOCTRINES.every((k) => s.doctrine[k] >= 2), progress: (s) => DOCTRINES.filter((k) => s.doctrine[k] >= 2).length / 4 },
  { id: 'tutorial', name: '사관의 제자', desc: '튜토리얼을 마친다', check: (s) => s.tutorial === true },
  { id: 'sacred', name: '숨은 말', desc: '오늘의 계시에 숨은 말을 찾는다', check: (s) => !!s.stats.sacred },
  { id: 'saint', name: '성인의 시대', desc: '신도 하나가 성인으로 추앙받는다', check: (s) => (s.saints ?? 0) >= 1 },
  { id: 'lawgiver', name: '돌에 새긴 말', desc: '영원한 계명을 새기고 이긴다', check: (s) => s.winner === 'player' && (s.commandments ?? 0) >= 1 },
];
export function evaluateAchievements(summary) {
  return ACHIEVEMENTS.filter((a) => { try { return a.check(summary); } catch { return false; } }).map((a) => a.id);
}
// 아직 못 딴 것 중 이번 판에 가장 가까웠던 것
export function closestAchievement(summary, have) {
  let best = null;
  for (const a of ACHIEVEMENTS) {
    if (have[a.id] || !a.progress) continue;
    const p = Math.min(0.99, a.progress(summary) || 0);
    if (p > 0 && (!best || p > best.p)) best = { a, p };
  }
  return best;
}

export const difficultyName = (d) => DIFFICULTY[d]?.name ?? d;
export const doctrineName = (d) => DOCTRINE[d]?.name ?? '';
