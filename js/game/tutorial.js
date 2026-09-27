// 튜토리얼 안내자: 사관 세라. 게임 진행 단계(phase)와 장(round)에 맞춰 규칙을 설명한다.
// 각 대사는 { text, focus?, suggest? } — focus는 강조할 화면 요소, suggest는 두루마리에 넣어 줄 계시 예시.
import { sfx } from './sound.js';
import { t } from './i18n.js';

export const NPC = { name: t('tut.npc.name'), title: t('tut.npc.title') };

const SCRIPT = [
  { phase: 'speak', round: 1, lines: [
    { text: t('tut.speak1.0') },
    { text: t('tut.speak1.1'), focus: '#boardFrame' },
    { text: t('tut.speak1.2'), focus: '#matPlayer' },
    { text: t('tut.speak1.3'), focus: '.scroll-wrap' },
    { text: t('tut.speak1.4'), suggest: t('tut.speak1.4.suggest'), focus: '.seal-btn' },
  ] },
  { phase: 'confirm', round: 1, lines: [
    { text: t('tut.confirm1.0'), focus: '.orders' },
    { text: t('tut.confirm1.1'), focus: '.accept' },
  ] },
  { phase: 'resolved', round: 1, lines: [
    { text: t('tut.resolved1.0'), focus: '#law' },
    { text: t('tut.resolved1.1'), focus: '#season' },
    { text: t('tut.resolved1.2'), focus: '.next' },
  ] },
  { phase: 'speak', round: 2, lines: [
    { text: t('tut.speak2.0'), focus: '#coin-player-faith' },
    { text: t('tut.speak2.1'), suggest: t('tut.speak2.1.suggest'), focus: '.seal-btn' },
  ] },
  { phase: 'speak', round: 3, lines: [
    { text: t('tut.speak3.0'), focus: '#boardFrame' },
    { text: t('tut.speak3.1'), focus: '#matPlayer .stats' },
    { text: t('tut.speak3.2'), suggest: t('tut.speak3.2.suggest'), focus: '.seal-btn' },
  ] },
  { phase: 'speak', round: 4, lines: [
    { text: t('tut.speak4.0'), focus: '#boardFrame' },
    { text: t('tut.speak4.1'), suggest: t('tut.speak4.1.suggest'), focus: '.seal-btn' },
  ] },
  { phase: 'speak', round: 5, lines: [
    { text: t('tut.speak5.0'), focus: '.hand' },
    { text: t('tut.speak5.1'), focus: '.scroll-wrap' },
  ] },
  { phase: 'end', round: 5, lines: [
    { text: t('tut.end5.0') },
    { text: t('tut.end5.1') },
    { text: t('tut.end5.2') },
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
          <button class="text-btn npc-skip" type="button">${t('tut.skip')}</button>
          <span class="npc-spacer"></span>
          <button class="btn-ghost npc-suggest" type="button" hidden></button>
          <button class="btn-primary npc-next" type="button">${t('tut.next')}</button>
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
      sug.textContent = t('tut.suggestBtn', { text: line.suggest });
      sug.onclick = () => { sfx.click(); this.onSuggest?.(line.suggest); this.hide(); };
    }
    nextBtn.textContent = this.queue.length ? t('tut.next') : (this.phase === 'end' ? t('tut.finish') : t('tut.ok'));
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
