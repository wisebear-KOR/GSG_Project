// 튜토리얼 안내자: 사관 세라. 게임 진행 단계(phase)와 장(round)에 맞춰 규칙을 설명한다.
// 각 대사는 { text, focus?, suggest? } — focus는 강조할 화면 요소, suggest는 두루마리에 넣어 줄 계시 예시.
import { sfx } from './sound.js';

export const NPC = { name: '사관 세라', title: '부족의 기록자' };

const SCRIPT = [
  { phase: 'speak', round: 1, lines: [
    { text: '어서 오시게, 새로 깨어난 신이여. 나는 이 부족의 사관 세라일세. 다섯 장 동안 곁에서 도와드리지.' },
    { text: '가운데가 세상일세. 파란 테두리가 우리 땅, 붉은 테두리가 율법파의 땅이지. 바로 위의 붉은 마을이 보이시는가?', focus: '#boardFrame' },
    { text: '왼쪽은 우리 부족의 살림일세. 식량·목재·돌·신앙, 그리고 신도들. 신도는 매 장 식량을 하나씩 먹는다네.', focus: '#matPlayer' },
    { text: '신께서는 손을 쓰실 수 없네. 오직 말씀, 계시로만 우리를 움직이시지. 아래 두루마리에 한 줄 적고 붉은 인장을 누르시게.', focus: '.scroll-wrap' },
    { text: '처음이니 이렇게 말씀해 보시지.', suggest: '강물이 너희를 먹이리라', focus: '.seal-btn' },
  ] },
  { phase: 'confirm', round: 1, lines: [
    { text: '대사제가 말씀을 헤아렸네. 번호가 붙은 신도는 계시를 따르는 자, "알아서"는 남은 신도가 스스로 하는 일이지.', focus: '.orders' },
    { text: '해석이 마음에 들지 않으면 신앙 1을 내고 다시 해석시킬 수 있네. 이번엔 수락하고 공개하시게.', focus: '.accept' },
  ] },
  { phase: 'resolved', round: 1, lines: [
    { text: '율법파도 같은 때에 움직였네. 오른쪽 율법 카드에 적힌 순서대로만 행동하는 자들이지.', focus: '#law' },
    { text: '매 장의 사건은 이 계절 카드에 나온다네. 대사제도 사건을 보고 말씀을 헤아리지.', focus: '#season' },
    { text: '다음 장으로 넘어가 보세.', focus: '.next' },
  ] },
  { phase: 'speak', round: 2, lines: [
    { text: '계시에는 신앙이 드네. 서른 자 이하면 1, 더 길면 2. 신앙은 매 장 조금씩 들어오고, 기도하면 더 들어오지.', focus: '#coin-player-faith' },
    { text: '신앙이 바닥난 채로 두 장을 보내면 신도가 율법파로 떠나 버린다네. 기도를 시켜 보시게.', suggest: '신전에서 기도하라', focus: '.seal-btn' },
  ] },
  { phase: 'speak', round: 3, lines: [
    { text: '이제 땅을 넓힐 때일세. 마을을 세우면 영토와 시야가 넓어지고, 신도를 둘 자리도 늘지.', focus: '#boardFrame' },
    { text: '신도 넷마다 한 장에 할 수 있는 일이 하나 늘어난다네. 많을수록 강해지지.', focus: '#matPlayer .stats' },
    { text: '마을을 세우라 해 보시게.', suggest: '땅을 넓혀 새 마을을 세워라', focus: '.seal-btn' },
  ] },
  { phase: 'speak', round: 4, lines: [
    { text: '율법파의 마을이 우리 곁에 있네. 말씀을 전해 개종시키거나, 칼로 빼앗을 수 있지.', focus: '#boardFrame' },
    { text: '선교와 공격은 주사위로 판가름 나네. 율법에 매인 자들은 설득하기 어렵지만, 개종하면 우리 신도가 되지.', suggest: '이웃에게 나의 말씀을 전하라', focus: '.seal-btn' },
  ] },
  { phase: 'speak', round: 5, lines: [
    { text: '아래 카드는 기적일세. 신앙을 들여 번개·단비·풍요를 직접 내릴 수 있지. 한 장에 하나씩.', focus: '.hand' },
    { text: '마지막 장일세. 이번엔 마음 가는 대로 말씀해 보시게. 은유로 말해도 대사제가 헤아린다네.', focus: '.scroll-wrap' },
  ] },
  { phase: 'end', round: 5, lines: [
    { text: '훌륭하셨네! 이것이 신의 일일세. 말씀하시고, 헤아리게 하고, 결과를 받아들이는 것.' },
    { text: '본 게임은 맵 크기에 따라 열두에서 열네 장일세. 적 수도 점령, 인구의 4분의 3 개종, 대성당 완공, 그리고 마지막 장의 승점. 네 가지 승리의 길이 있지.' },
    { text: '맵의 크기와 율법파의 난이도는 메인 화면에서 고를 수 있네. 그럼, 세상으로 나가시게.' },
  ] },
];

export class Tutorial {
  constructor({ onSuggest, onEnd }) {
    this.onSuggest = onSuggest;
    this.onEnd = onEnd;
    this.seen = new Set();
    this.queue = [];
    this.el = null;
    this.ring = null;
    this.active = true;
    this.relayout = () => this.placeRing();
    addEventListener('resize', this.relayout);
    addEventListener('scroll', this.relayout, true);
  }

  // 진행 단계가 바뀔 때 main.js가 부른다
  on(phase, round) {
    if (!this.active) return;
    const step = SCRIPT.find((s) => s.phase === phase && s.round === round);
    const key = `${phase}:${round}`;
    if (!step || this.seen.has(key)) {
      if (phase === 'end') this.finish();
      return;
    }
    this.seen.add(key);
    this.queue = [...step.lines];
    this.phase = phase;
    this.show();
  }

  build() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.className = 'npc-dialog';
    this.el.innerHTML = `
      <div class="npc-portrait"><svg viewBox="0 0 64 64"><use href="#npc-sera"/></svg></div>
      <div class="npc-body">
        <div class="npc-name">${NPC.name}<small>${NPC.title}</small></div>
        <div class="npc-text"></div>
        <div class="npc-actions">
          <button class="text-btn npc-skip" type="button">튜토리얼 건너뛰기</button>
          <span class="npc-spacer"></span>
          <button class="btn-ghost npc-suggest" type="button" hidden></button>
          <button class="btn-primary npc-next" type="button">다음 ▶</button>
        </div>
      </div>`;
    document.body.append(this.el);
    this.ring = document.createElement('div');
    this.ring.className = 'tut-ring';
    document.body.append(this.ring);
    this.el.querySelector('.npc-next').onclick = () => { sfx.click(); this.next(); };
    this.el.querySelector('.npc-skip').onclick = () => { sfx.click(); this.skip(); };
  }

  async show() {
    this.build();
    const line = this.queue.shift();
    if (!line) { this.hide(); if (this.phase === 'end') this.finish(); return; }
    this.el.classList.add('show');
    this.focus = line.focus ?? null;
    this.placeRing();
    const text = this.el.querySelector('.npc-text');
    const nextBtn = this.el.querySelector('.npc-next');
    const sug = this.el.querySelector('.npc-suggest');
    sug.hidden = !line.suggest;
    if (line.suggest) {
      sug.textContent = `“${line.suggest}” 적어 넣기`;
      sug.onclick = () => { sfx.click(); this.onSuggest?.(line.suggest); this.hide(); };
    }
    nextBtn.textContent = this.queue.length ? '다음 ▶' : (this.phase === 'end' ? '마치기' : '알겠네');
    sfx.page();
    this.el.querySelector('.npc-portrait').animate([{ transform: 'translateY(4px) scale(.96)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    // 한 글자씩
    const token = (this.token = Symbol('line'));
    text.textContent = '';
    for (const ch of line.text) {
      if (this.token !== token) return;
      text.textContent += ch;
      if (ch.trim()) sfx.type();
      await new Promise((r) => setTimeout(r, ch === '.' || ch === ',' || ch === '?' ? 160 : 22));
    }
  }

  next() {
    // 글자가 아직 나오는 중이면 한 번에 다 보여 준다
    const text = this.el.querySelector('.npc-text');
    this.token = null;
    if (this.queue.length === 0) { this.hide(); if (this.phase === 'end') this.finish(); return; }
    text.textContent = '';
    this.show();
  }

  placeRing() {
    if (!this.ring) return;
    const target = this.focus && document.querySelector(this.focus);
    if (!target || !this.el?.classList.contains('show')) { this.ring.classList.remove('show'); this.el?.classList.remove('top'); return; }
    const r = target.getBoundingClientRect();
    // 가리키는 곳이 화면 아래쪽이면 대화창을 위로 올린다
    this.el.classList.toggle('top', r.top + r.height / 2 > innerHeight * 0.55);
    Object.assign(this.ring.style, { left: `${r.left - 8}px`, top: `${r.top - 8}px`, width: `${r.width + 16}px`, height: `${r.height + 16}px` });
    this.ring.classList.add('show');
  }

  hide() {
    this.token = null;
    this.el?.classList.remove('show');
    this.ring?.classList.remove('show');
  }

  skip() {
    this.active = false;
    this.hide();
    this.onEnd?.({ skipped: true });
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    this.hide();
    this.onEnd?.({ skipped: false });
  }

  destroy() {
    this.active = false;
    this.el?.remove();
    this.ring?.remove();
    removeEventListener('resize', this.relayout);
    removeEventListener('scroll', this.relayout, true);
  }
}
