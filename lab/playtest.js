// 자동 플레이테스트: 게임 페이지(?debug&play)에 주입해 한 판을 끝까지 두고 라운드별 기록을 남긴다.
// 사용: import('/lab/playtest.js').then(m => m.playGame('adaptive'))  → window.__reports 에 결과가 쌓인다.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);
async function waitFor(fn, ms = 60000, step = 150) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(step); }
  return null;
}

const pick = (arr, i) => arr[i % arr.length];

// 계시를 고르는 플레이어 성격. (state, legal, round) → { text, miracle?, target? }
export const PERSONAS = {
  // 상황을 보고 가장 급한 일을 말하는 신
  adaptive(s, legal) {
    const p = s.sides.player;
    const has = (f) => legal.some(f);
    if (has((a) => a.type === 'attack') && p.pop >= 3) return { text: '율법파의 마을을 쳐서 빼앗아라' };
    if (has((a) => a.type === 'preach')) return { text: '이웃에게 나의 말씀을 전하라' };
    if (p.food < p.pop + 1) return { text: '굶주림을 잊도록 들판과 강에서 먹을 것을 거두어라', miracle: p.faith >= 7 ? 'rain' : null };
    if (has((a) => a.build === 'cathedral')) return { text: '나를 위한 대성당을 지어라' };
    if (has((a) => a.build === 'temple')) return { text: '나를 위해 신전을 더 높이 쌓아라' };
    if (has((a) => a.build === 'village')) return { text: '땅을 넓혀 새 마을을 세워라' };
    if (p.stone < 4) return { text: '산에서 돌을 캐어 오라' };
    return { text: '안개 너머를 살펴라' };
  },
  // 싸움을 좋아하는 신
  war(s, legal, round) {
    const p = s.sides.player;
    const lightningTarget = s.tiles.find((t) => t.owner === 'enemy' && t.revealed);
    const miracle = p.faith >= 8 && lightningTarget ? 'lightning' : null;
    if (legal.some((a) => a.type === 'attack')) return { text: pick(['칼을 들고 율법파를 치라', '나의 분노를 율법의 무리에게 보여라', '적의 마을을 불태워라'], round), miracle, target: lightningTarget?.id };
    return { text: pick(['땅을 넓혀 적에게 다가가라', '성벽을 쌓고 창을 벼려라', '돌을 모아 전쟁을 준비하라', '마을을 세워 국경을 밀어라'], round) };
  },
  // 사랑과 믿음의 신
  peace(s, legal, round) {
    if (legal.some((a) => a.type === 'preach')) return { text: pick(['이웃을 사랑하라', '율법의 무리에게 나의 말씀을 전하라', '피를 흘리지 말고 그들의 마음을 얻어라'], round) };
    return { text: pick(['기도하고 경배하라', '마을을 넓혀 형제를 맞이하라', '굶주린 자가 없게 하라', '높은 곳에 나의 제단을 세워라', '이웃에게 다가가라'], round) };
  },
  // 모호한 은유로만 말하는 신
  poet(s, legal, round) {
    return { text: pick([
      '새벽이 오기 전에 씨앗을 뿌려라', '돌 위에 나의 이름을 새겨라', '바람이 부는 쪽으로 가라', '굶주린 자에게 빵을',
      '침묵하는 자가 이기리라', '불', '나의 적은 너의 적이 아니다', '강은 기억한다', '높이 오르는 자가 멀리 본다',
      '손을 펴라', '겨울이 온다', '빛이 있으라',
    ], round) };
  },
};

function snap(s) {
  const side = (k) => { const x = s.sides[k]; return { food: x.food, wood: x.wood, stone: x.stone, faith: x.faith, pop: x.pop, temple: x.templeLevel, hp: x.capitalHp }; };
  const E = window.__gsg.engine;
  return {
    player: { ...side('player'), villages: E.villageCount(s, 'player'), score: E.score(s, 'player'), actions: E.actionLimit(s, 'player') },
    enemy: { ...side('enemy'), villages: E.villageCount(s, 'enemy'), score: E.score(s, 'enemy'), actions: E.actionLimit(s, 'enemy') },
    doctrine: { ...s.sides.player.doctrine },
    revealed: s.tiles.filter((t) => t.revealed).length,
  };
}

export async function playGame(personaName, { maxRounds = 14 } = {}) {
  const persona = PERSONAS[personaName];
  const E = await waitFor(() => window.__gsg?.engine, 10000);
  const report = { persona: personaName, rounds: [], errors: [], startedAt: new Date().toISOString(), done: false };
  (window.__reports ??= []).push(report);
  const onErr = (e) => report.errors.push(String(e.message ?? e.reason ?? e));
  addEventListener('error', onErr);
  addEventListener('unhandledrejection', onErr);
  try {
    for (let r = 0; r < maxRounds; r++) {
      const ready = await waitFor(() => $('.scroll textarea') || $('.endscreen'), 30000);
      if (!ready || $('.endscreen')) break;
      await sleep(400);
      const s = window.__gsg.state;
      const legal = E.legalActions(s, 'player');
      const rec = {
        round: s.round, event: s.event.id, first: s.first, before: snap(s),
        legalTypes: [...new Set(legal.map((a) => a.type + (a.build ? `:${a.build}` : '')))],
      };
      const choice = persona(s, legal, s.round);
      rec.revelation = choice.text;
      // 기적
      if (choice.miracle) {
        const card = [...document.querySelectorAll('.mcard')].find((b) => b.dataset.m === choice.miracle);
        if (card && !card.disabled) {
          card.click();
          await sleep(300);
          if (choice.miracle === 'lightning' && choice.target) {
            document.querySelector(`#board g.tile[data-id="${choice.target}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
          await sleep(1500);
          rec.miracle = choice.miracle;
        }
      }
      const ta = await waitFor(() => $('.scroll textarea'), 5000);
      ta.value = choice.text;
      ta.dispatchEvent(new Event('input'));
      $('.seal-btn').click();
      await sleep(250);
      if ($('.notice') && $('.scroll textarea')) { rec.silenced = $('.notice').textContent; $('.silence').click(); }
      const t0 = performance.now();
      const acc = await waitFor(() => { const b = $('.accept'); return b && !b.disabled ? b : null; }, 90000);
      rec.interpretMs = Math.round(performance.now() - t0);
      if (!acc) { rec.stuck = 'accept button never enabled'; report.rounds.push(rec); break; }
      rec.head = $('.scroll-head small')?.textContent;
      rec.quote = $('.quote')?.textContent;
      rec.chips = [...document.querySelectorAll('.order')].map((o) => ({ kind: o.className.replace('order', '').trim() || 'order', text: o.textContent.replace(/\s+/g, ' ').trim() }));
      rec.hint = $('.hint')?.textContent ?? null;
      rec.notice = $('.notice')?.textContent ?? null;
      acc.click();
      await sleep(500);
      $('.skip')?.click();
      await waitFor(() => $('.next') || $('.again-game') || $('.endscreen'), 60000);
      const s2 = window.__gsg.state;
      rec.law = s2.lawCard?.name;
      rec.after = snap(s2);
      rec.log = s2.log.filter((l) => l.round === rec.round && l.side !== 'god' && l.side !== 'priest').map((l) => `${l.side === 'player' ? 'P' : 'E'}| ${l.text}${l.dice ? ` [${l.dice.attacker}+${l.dice.attackerBonus} vs ${l.dice.defender}+${l.dice.defenderBonus}]` : ''}`);
      report.rounds.push(rec);
      if (s2.winner) break;
      $('.next')?.click();
    }
    const s = window.__gsg.state;
    report.result = { winner: s.winner, reason: s.winReason, score: [E.score(s, 'player'), E.score(s, 'enemy')], rounds: s.round };
  } catch (e) {
    report.errors.push(`harness: ${e.message}`);
  } finally {
    report.done = true;
    removeEventListener('error', onErr);
    removeEventListener('unhandledrejection', onErr);
  }
  return report;
}
