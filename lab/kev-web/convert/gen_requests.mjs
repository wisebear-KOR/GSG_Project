// 시험용 요청: lab/decide 실험 세트(선택형 질문 3개)와, 1단계 크기의 요청 하나 → 작업 폴더의 requests.json
import { writeFileSync, readFileSync } from 'node:fs';
const W = new URL('../../decide/', import.meta.url).href;
const { CASES, buildState, buildQuestions } = await import(W + 'core.js');
const kev = JSON.parse(readFileSync(new URL('results/kev.json', W), 'utf8'));
const reqs = [];
for (const lang of ['ko', 'en']) {
  const all = buildQuestions(lang);
  const questions = { order: all.order, forbid: all.forbid, doctrine: all.doctrine };
  for (const c of CASES) {
    const key = `${c.key}.${lang}`;
    reqs.push({ key, state: buildState(c, lang), questions, torch: kev[key]?.['Kev-0.8B (CPU)']?.answers ?? null });
  }
}
// 1단계 크기: JSON 상태 + 일 12가지 셋 중 하나 + 성격 (13개)
const kinds = ['식량 거두기', '나무 거두기', '돌 거두기', '신앙 거두기', '마을 짓기', '성벽 쌓기', '신전 올리기', '대성당 짓기', '기도', '탐험', '선교', '공격'];
const state = {
  사건: '율법파 신도들이 국경에 모여들고 있다',
  율법파: { '율법 카드': '확장 — 마을을 짓고, 식량을 거둔다', 뜻: ['빈 땅에 마을을 지으려 한다', '우리 마을을 공격하려 한다'], 신도: 5, 마을: 1, '성벽 두른 마을': 1, '수도 내구도': 2, 대비: '우리 선교·공격에 방어 +1' },
  '지난 계시': ['강물이 너희를 먹이리라', '방패가 되어라'],
  행동: 3,
  '지금 할 수 있는 일': ['식량 거두기', '나무 거두기', '돌 거두기', '마을 짓기', '성벽 쌓기', '기도', '탐험', '선교', '공격'],
  '모자란 것': '식량',
};
const rev = '율법파가 노리는 곳에 마을을 세우고, 숲은 베지 마라';
const q = {};
kinds.forEach((k, i) => { q[`k${i}`] = { type: 'choice', instructions: `계시: "${rev}"\n이 계시는 [${k}]에 대해 무엇을 바라는가?`, criteria: { 하라: null, '하지 마라': null, '말하지 않음': null } }; });
q.doctrine = { type: 'choice', instructions: `계시: "${rev}"\n이 계시의 성격은?`, criteria: { 평화: '사랑, 화합, 휴식, 설득', 전쟁: '분노, 싸움, 정복, 방어', 풍요: '먹을 것, 수확, 재물, 건설', 지혜: '신앙, 경배, 탐구, 숨겨진 것' } };
reqs.push({ key: 'stage1', state, questions: q, torch: null });
writeFileSync('requests.json', JSON.stringify(reqs, null, 1));
console.log(reqs.length, 'requests;', reqs.filter((r) => r.torch).length, 'with torch answers');
