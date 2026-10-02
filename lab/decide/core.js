// 결정형 모델 실험: 계시를 "질문 + 선택지"로 바꾸고, 확률로 행동을 고르고, lab/scenario.js 기준으로 채점한다.
// 브라우저(decide.html)와 Node(run-kev.mjs, report.mjs)가 함께 쓴다.

import { ACTIONS, EVENTS, STATE, SAMPLE_SETS, DOCTRINES, DOCTRINE_LABEL, validateOrders, scoreIntent } from '../scenario.js';

export const LIMIT = 3;

// 실험 세트: 기본 10 + 심화 14 (관찰용 4개는 채점하지 않는다)
export const CASES = Object.entries(SAMPLE_SETS).flatMap(([set, list]) => list.map((s, i) => ({ key: `${set}-${i}`, set, ...s })));

export function buildState(sample, lang) {
  const ev = EVENTS.find((e) => e.id === sample.event) ?? EVENTS[0];
  const s = STATE;
  if (lang === 'en') {
    return `[Tribe status] food ${s.food}, wood ${s.wood}, stone ${s.stone}, faith ${s.faith}. ${s.followers} followers.
Neighbor: the Lawkeeper tribe (${s.enemyFollowers} followers, no walls) lies beyond the southeast border.
[Recent event] ${ev.en}
[Revelation from the god (may be in Korean)] "${sample.text}"`;
  }
  return `[부족 상황] 식량 ${s.food}, 목재 ${s.wood}, 돌 ${s.stone}, 신앙 ${s.faith}. 신도 ${s.followers}명.
이웃: 율법파 부족(신도 ${s.enemyFollowers}명, 성벽 없음)이 동남쪽 국경 너머에 있다.
[최근 사건] ${ev.ko}
[신의 계시] "${sample.text}"`;
}

const DOCTRINE_DESC = {
  ko: { peace: '사랑, 화합, 휴식, 설득', war: '분노, 싸움, 정복, 방어', abundance: '먹을 것, 수확, 재물, 건설', wisdom: '신앙, 경배, 탐구, 숨겨진 것' },
  en: { peace: 'love, harmony, rest, persuasion', war: 'anger, fighting, conquest, defense', abundance: 'food, harvest, wealth, building', wisdom: 'faith, worship, seeking, hidden things' },
};

// Kev(TypeSafe) 형식의 질문 묶음. choice: criteria = {선택지: 설명}, noul: 예/아니오
// 두 가지 고르는 법을 한 번에 재려고 choice 질문(order/forbid)과 행동마다의 noul 질문(do_*/ban_*)을 같이 묻는다
export function buildQuestions(lang) {
  const text = (a) => (lang === 'en' ? a.en : a.ko);
  const acts = Object.fromEntries(ACTIONS.map((a) => [a.id, text(a)]));
  const L = lang === 'en' ? {
    order: 'Following the revelation, which action should the high priest command first?',
    forbid: 'Which action does the revelation forbid or warn against? Pick "none" if it forbids nothing.',
    none: 'The revelation forbids nothing',
    doctrine: 'What is the nature of the revelation?',
    do: (t) => `Does the revelation call for this action: "${t}"?`,
    ban: (t) => `Does the revelation forbid or warn against this action: "${t}"?`,
  } : {
    order: '대사제는 이 계시를 따라 어떤 행동을 가장 먼저 명해야 하는가?',
    forbid: '계시가 하지 말라고 금하거나 경고하는 행동은 무엇인가? 없으면 none을 고른다.',
    none: '금하는 행동이 없다',
    doctrine: '계시의 성격은 무엇인가?',
    do: (t) => `계시가 이 행동을 하라는 뜻인가? "${t}"`,
    ban: (t) => `계시가 이 행동을 하지 말라는 뜻인가? "${t}"`,
  };
  const doctrine = Object.fromEntries(DOCTRINES.map((d) => [d, lang === 'en' ? DOCTRINE_DESC.en[d] : `${DOCTRINE_LABEL[d]}: ${DOCTRINE_DESC.ko[d]}`]));
  const q = {
    order: { type: 'choice', instructions: L.order, criteria: acts },
    forbid: { type: 'choice', instructions: L.forbid, criteria: { ...acts, none: L.none } },
    doctrine: { type: 'choice', instructions: L.doctrine, criteria: doctrine },
  };
  for (const a of ACTIONS) q[`do_${a.id}`] = { type: 'noul', instructions: L.do(text(a)) };
  for (const a of ACTIONS) q[`ban_${a.id}`] = { type: 'noul', instructions: L.ban(text(a)) };
  return q;
}

// choice·noul은 실험 전에 정한 규칙, contrast·orderOnly는 결과를 보고 덧붙인 사후 규칙
export const STRATEGIES = ['choice', 'noul', 'contrast', 'orderOnly'];

// 고르는 기준 (실험 전에 정한 값 — 20개 표본에 맞춰 고치지 않는다)
export const RULE = { extra: 0.2, forbidNone: 0.5, forbidMin: 0.2, yes: 0.5 };

const ranked = (probs) => Object.entries(probs).sort((a, b) => b[1] - a[1]);

// answers: { order: {probabilities}, forbid: {probabilities}, doctrine: {probabilities}, do_G1: {noul}, ... }
export function decide(answers, strategy) {
  const doctrine = ranked(answers.doctrine.probabilities)[0][0];
  let forbidden;
  let candidates;
  if (strategy === 'choice' || strategy === 'contrast' || strategy === 'orderOnly') {
    const f = answers.forbid.probabilities;
    const o = answers.order.probabilities;
    if (strategy === 'choice') {
      forbidden = (f.none ?? 0) < RULE.forbidNone
        ? ranked(f).filter(([id, p], i) => id !== 'none' && (i === 0 || p >= RULE.forbidMin)).map(([id]) => id) : [];
    } else if (strategy === 'contrast') {
      // 사후 규칙 (결과를 보고 만들었다): 금지 질문이 "관련 있는 행동"을 꼽는 경향이 있어서,
      // 금지 1순위가 none이 아니고 그 행동이 명령 질문보다 금지 질문에서 더 높을 때만 금한다
      const top = ranked(f)[0][0];
      forbidden = top === 'none' ? [] : ranked(f).filter(([id, p], i) => id !== 'none' && (i === 0 || p >= RULE.forbidMin) && p > (o[id] ?? 0)).map(([id]) => id);
    } else forbidden = [];
    const order = ranked(answers.order.probabilities).filter(([id]) => !forbidden.includes(id));
    candidates = order.filter(([, p], i) => i === 0 || p >= RULE.extra).map(([id]) => id);
  } else {
    forbidden = ACTIONS.filter((a) => answers[`ban_${a.id}`].noul >= RULE.yes).map((a) => a.id);
    const yes = ACTIONS.map((a) => [a.id, answers[`do_${a.id}`].noul]).filter(([id]) => !forbidden.includes(id)).sort((a, b) => b[1] - a[1]);
    candidates = yes.filter(([, p], i) => i === 0 || p >= RULE.yes).map(([id]) => id);
  }
  const { accepted } = validateOrders(candidates, LIMIT, forbidden);
  return { orders: accepted, forbidden, doctrine };
}

// 한 사례의 채점: 의도 적중(scoreIntent 그대로), 교리 적중, 1순위 행동만 봤을 때의 적중
export function grade(sample, answers, strategy) {
  const d = decide(answers, strategy);
  const s = scoreIntent(sample, d.orders, d.doctrine);
  const top = d.orders.slice(0, 1);
  const s1 = scoreIntent(sample, top, d.doctrine);
  // 엄격: 기대 행동이 정해진 사례만, 1순위 행동이 그 안에 있어야 한다 ("피하기만 하면 통과"인 사례를 뺀다)
  const strict = sample.observe || !sample.expect.length ? null : sample.expect.includes(top[0]) && !sample.avoid.some((id) => d.orders.includes(id));
  return { ...d, intent: s?.intent ?? null, doctrineHit: s?.doctrine ?? null, top1: s1?.intent ?? null, strict, conf: (strategy === 'noul' ? answers[`do_${top[0]}`]?.noul : answers.order.probabilities[top[0]]) ?? null };
}

// results: { "basic-0.ko": { "Kev-4B": { answers, latencyMs }, ... }, ... } → 모델·언어·고르는 법마다 한 줄
export function summarize(results) {
  const rows = [];
  const models = [...new Set(Object.values(results).flatMap((r) => Object.keys(r).filter((k) => r[k]?.answers)))];
  const pct = (xs) => (xs.length ? `${Math.round((100 * xs.filter(Boolean).length) / xs.length)}% (${xs.filter(Boolean).length}/${xs.length})` : '-');
  for (const model of models) {
    for (const lang of ['ko', 'en']) {
      for (const strategy of STRATEGIES) {
        const by = { basic: { intent: [], doctrine: [], top1: [], strict: [] }, hard: { intent: [], doctrine: [], top1: [], strict: [] } };
        const ms = [];
        let n = 0;
        for (const c of CASES) {
          const r = results[`${c.key}.${lang}`]?.[model];
          if (!r?.answers || (strategy === 'noul' && !r.answers.do_G1)) continue; // 선택형만 물은 사례는 noul로 채점하지 않는다
          n += 1;
          if (r.latencyMs != null) ms.push(r.latencyMs);
          const g = grade(c, r.answers, strategy);
          if (g.intent != null) by[c.set].intent.push(g.intent);
          if (g.top1 != null) by[c.set].top1.push(g.top1);
          if (g.strict != null) by[c.set].strict.push(g.strict);
          if (g.doctrineHit != null) by[c.set].doctrine.push(g.doctrineHit);
        }
        if (!n) continue;
        rows.push({
          model, lang, strategy, n,
          basicIntent: pct(by.basic.intent), hardIntent: pct(by.hard.intent),
          basicStrict: pct(by.basic.strict), hardStrict: pct(by.hard.strict),
          basicDoctrine: pct(by.basic.doctrine), hardDoctrine: pct(by.hard.doctrine),
          ms: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : null,
        });
      }
    }
  }
  return rows;
}

// 사례별 결정 (관찰용 포함) — 무엇을 골랐는지 눈으로 보려고
export function details(results, model, lang, strategy) {
  return CASES.map((c) => {
    const r = results[`${c.key}.${lang}`]?.[model];
    if (!r?.answers || (strategy === 'noul' && !r.answers.do_G1)) return null;
    const g = grade(c, r.answers, strategy);
    const top = (p) => Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ');
    return { key: c.key, text: c.text, event: c.event ?? '', orders: g.orders.join(' '), forbidden: g.forbidden.join(' '), doctrine: g.doctrine, intent: g.intent, strict: g.strict, conf: g.conf?.toFixed(2), orderTop: top(r.answers.order.probabilities), forbidTop: top(r.answers.forbid.probabilities) };
  }).filter(Boolean);
}
