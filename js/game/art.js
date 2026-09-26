// 직접 그린 SVG 아트: 그라디언트, 무늬, 필터, 심볼(지형·건물·미플·자원 아이콘)
// 문서에 한 번 주입하면 모든 SVG가 url(#id)와 <use href="#id">로 가져다 쓴다.

const TERRAIN_GRAD = {
  plain: ['#f6e7a6', '#d9b45a', '#b98f36'],
  forest: ['#a6c77d', '#5e8a42', '#3d6230'],
  mountain: ['#ddd2bf', '#a2927a', '#76654f'],
  river: ['#a9d9ec', '#5aa0c6', '#34729b'],
  hill: ['#f1dcef', '#bf9dbd', '#8f6d8c'],
  fog: ['#efe4c9', '#e1d1ab', '#c9b388'],
  desert: ['#f6dfa6', '#e2b86a', '#b8843e'],
};

const grads = Object.entries(TERRAIN_GRAD).map(([k, [a, b, c]]) => `
  <radialGradient id="g-${k}" cx="42%" cy="34%" r="75%">
    <stop offset="0" stop-color="${a}"/><stop offset=".62" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>
  </radialGradient>`).join('');

export const ART = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
  ${grads}
  <linearGradient id="g-bevel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/>
  </linearGradient>
  <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f7e3a1"/><stop offset=".45" stop-color="#c99a3b"/><stop offset=".7" stop-color="#8a6420"/><stop offset="1" stop-color="#e9cd7c"/>
  </linearGradient>
  <linearGradient id="g-wood" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5a3a22"/><stop offset="1" stop-color="#2e1c0f"/>
  </linearGradient>
  <radialGradient id="g-meeple-player" cx="35%" cy="25%" r="80%">
    <stop offset="0" stop-color="#9cc0ff"/><stop offset=".55" stop-color="#3d6fb6"/><stop offset="1" stop-color="#1f3f73"/>
  </radialGradient>
  <radialGradient id="g-meeple-enemy" cx="35%" cy="25%" r="80%">
    <stop offset="0" stop-color="#ff9f8e"/><stop offset=".55" stop-color="#b3392a"/><stop offset="1" stop-color="#651a11"/>
  </radialGradient>
  <radialGradient id="g-own-player" cx="50%" cy="50%" r="50%">
    <stop offset=".65" stop-color="#3d6fb6" stop-opacity="0"/><stop offset="1" stop-color="#3d6fb6" stop-opacity=".55"/>
  </radialGradient>
  <radialGradient id="g-own-enemy" cx="50%" cy="50%" r="50%">
    <stop offset=".65" stop-color="#b3392a" stop-opacity="0"/><stop offset="1" stop-color="#b3392a" stop-opacity=".55"/>
  </radialGradient>

  <pattern id="p-plain" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
    <path d="M0 4h5" stroke="#7a5a18" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>
  </pattern>
  <pattern id="p-forest" width="9" height="9" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1.1" fill="#23401a" fill-opacity=".35"/><circle cx="6.5" cy="6.5" r=".9" fill="#dfeec0" fill-opacity=".3"/>
  </pattern>
  <pattern id="p-mountain" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
    <path d="M0 0v7" stroke="#3d3022" stroke-opacity=".22" stroke-width="1"/>
  </pattern>
  <pattern id="p-hill" width="12" height="12" patternUnits="userSpaceOnUse">
    <circle cx="6" cy="6" r=".9" fill="#fff6d8" fill-opacity=".55"/>
  </pattern>
  <pattern id="p-desert" width="16" height="8" patternUnits="userSpaceOnUse">
    <path d="M0 6q4-4 8 0t8 0" fill="none" stroke="#8a5a1c" stroke-opacity=".28" stroke-width="1"/>
  </pattern>
  <pattern id="p-fog" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <path d="M0 0v6" stroke="#7c591b" stroke-opacity=".16" stroke-width="1"/>
  </pattern>

  <filter id="f-shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#1a0e03" flood-opacity=".55"/>
  </filter>
  <filter id="f-soft" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#1a0e03" flood-opacity=".45"/>
  </filter>
  <filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="f-paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .12  0 0 0 .09 0" result="c"/>
    <feComposite in="c" in2="SourceGraphic" operator="in"/>
  </filter>

  <!-- 지형 장식 (viewBox -30 -30 60 60) -->
  <symbol id="s-plain" viewBox="-30 -30 60 60">
    <g stroke="#8b6414" stroke-width="1.6" stroke-linecap="round" fill="#e8c35a">
      <path d="M-9 14V-2M0 14V-6M9 14V-1" fill="none"/>
      <g><ellipse cx="-9" cy="-5" rx="2.2" ry="4"/><ellipse cx="-12" cy="0" rx="1.8" ry="3.4" transform="rotate(-30 -12 0)"/><ellipse cx="-6" cy="0" rx="1.8" ry="3.4" transform="rotate(30 -6 0)"/></g>
      <g><ellipse cx="0" cy="-10" rx="2.4" ry="4.4"/><ellipse cx="-3.2" cy="-4.5" rx="1.9" ry="3.6" transform="rotate(-30 -3.2 -4.5)"/><ellipse cx="3.2" cy="-4.5" rx="1.9" ry="3.6" transform="rotate(30 3.2 -4.5)"/></g>
      <g><ellipse cx="9" cy="-4" rx="2.2" ry="4"/><ellipse cx="6" cy="1" rx="1.8" ry="3.4" transform="rotate(-30 6 1)"/><ellipse cx="12" cy="1" rx="1.8" ry="3.4" transform="rotate(30 12 1)"/></g>
    </g>
  </symbol>
  <symbol id="s-forest" viewBox="-30 -30 60 60">
    <g filter="url(#f-soft)">
      <g transform="translate(-10 3)"><rect x="-1.4" y="8" width="2.8" height="5" fill="#5a3b1e"/><path d="M0-14 9 0H4l7 9H-11l7-9h-5z" fill="#2f5a2a" stroke="#1d3a19" stroke-width="1"/></g>
      <g transform="translate(10 5)"><rect x="-1.2" y="7" width="2.4" height="4.5" fill="#5a3b1e"/><path d="M0-12 8 0H3.6l6 8H-9.6l6-8H-8z" fill="#3b6b31" stroke="#1d3a19" stroke-width="1"/></g>
      <g transform="translate(0 -4)"><rect x="-1.5" y="9" width="3" height="5.5" fill="#5a3b1e"/><path d="M0-16 10 0H4.5l8 10H-12.5l8-10H-10z" fill="#27502a" stroke="#16311a" stroke-width="1"/></g>
    </g>
  </symbol>
  <symbol id="s-mountain" viewBox="-30 -30 60 60">
    <g filter="url(#f-soft)" stroke="#3f3225" stroke-width="1.2" stroke-linejoin="round">
      <path d="M-20 13-6-11 8 13z" fill="#8c7b66"/><path d="M-6-11-1.5-3-4-1-6.5-4-9-1.5z" fill="#fbf6ea" stroke-width=".8"/>
      <path d="M-4 13 9-5 21 13z" fill="#a39079"/><path d="M9-5 12.6 .4 10.5 2 9 .2 7 2.2 5.8 .3z" fill="#fbf6ea" stroke-width=".8"/>
    </g>
  </symbol>
  <symbol id="s-river" viewBox="-30 -30 60 60">
    <g fill="none" stroke="#e8f7ff" stroke-width="2.2" stroke-linecap="round" class="waves">
      <path d="M-20-7q5-5 10 0t10 0 10 0 10 0" opacity=".85"/>
      <path d="M-22 2q5-5 10 0t10 0 10 0 10 0 10 0" opacity=".7"/>
      <path d="M-18 11q5-5 10 0t10 0 10 0 10 0" opacity=".55"/>
    </g>
  </symbol>
  <symbol id="s-hill" viewBox="-30 -30 60 60">
    <ellipse cx="0" cy="10" rx="17" ry="5" fill="#7c5f79" opacity=".45"/>
    <g filter="url(#f-soft)" stroke="#4a3647" stroke-width="1.1">
      <path d="M-4 10-5-9q0-4 5-5 5 1 5 5l-1 19z" fill="#d9ccb8"/>
      <path d="M-13 10-13-2q0-3 3-3t3 3l0 12z" fill="#c7b9a3"/>
      <path d="M8 10 8 0q0-3 3-3t3 3l0 10z" fill="#c7b9a3"/>
    </g>
    <circle cx="0" cy="-16" r="3" fill="#fff4c4" class="holy-spark"/>
  </symbol>
  <symbol id="s-desert" viewBox="-30 -30 60 60">
    <g stroke="#7a4f1c" stroke-width="1.1" stroke-linejoin="round">
      <path d="M-22 12q10-14 22-6t22 2v4h-44z" fill="#e9c47c"/>
      <path d="M-16 13q8-9 16-3t14 1" fill="none" stroke-opacity=".5"/>
      <path d="M4 -2l5-9 5 9z" fill="#c9a36a" opacity=".8"/>
      <circle cx="-12" cy="-10" r="4.5" fill="#ffd36b" stroke="#c98a1c"/>
      <path d="M-9 4h3M-4 6h2" stroke="#a37a3e" stroke-linecap="round"/>
    </g>
  </symbol>
  <symbol id="s-fog" viewBox="-30 -30 60 60">
    <g fill="none" stroke="#7c591b" stroke-opacity=".38" stroke-width="1.3" stroke-linecap="round" class="fog-cloud">
      <path d="M-16 4c-5 0-6-7-1-8 0-6 8-8 11-3 3-5 12-3 11 3 5 0 6 7 0 8z"/>
      <path d="M-4-1c1-2 4-2 5 0M5 1c1-1.5 3-1.5 4 0"/>
    </g>
  </symbol>

  <!-- 건물 -->
  <symbol id="s-temple" viewBox="-30 -30 60 60">
    <g filter="url(#f-shadow)" stroke="#2a1d10" stroke-width="1.1" stroke-linejoin="round">
      <path d="M-18 14h36v4h-36z" fill="#d9cbb0"/><path d="M-16 11h32v3h-32z" fill="#efe4cd"/>
      <path d="M-13 11V-4h4v15zM-2 11V-4h4v15zM9 11V-4h4v15z" fill="#f8f0de"/>
      <path d="M-17-4h34v-3h-34z" fill="#efe4cd"/><path d="M-19-7 0-19l19 12z" fill="#f8f0de"/>
      <path d="M0-19v-9" stroke-width="1.4"/><path class="flag" d="M0-28l9 3-9 3z" fill="#3d6fb6"/>
      <circle cx="0" cy="-11" r="2.4" fill="url(#g-gold)"/>
    </g>
  </symbol>
  <symbol id="s-tower" viewBox="-30 -30 60 60">
    <g filter="url(#f-shadow)" stroke="#1e130a" stroke-width="1.1" stroke-linejoin="round">
      <path d="M-14 18h28v-4h-28z" fill="#6b6259"/>
      <path d="M-10 14 -8-12h16l2 26z" fill="#8a8178"/>
      <path d="M-11-12v-6h4v3h3v-3h8v3h3v-3h4v6z" fill="#9c938a"/>
      <rect x="-4.5" y="-5" width="9" height="12" rx="4.5" fill="#2b1f15"/>
      <path d="M-3 -2h6M-3 1h6M-3 4h6" stroke="#d9b36a" stroke-width=".9"/>
      <path d="M0-18v-10" stroke-width="1.4"/><path class="flag" d="M0-28l9 3-9 3z" fill="#b3392a"/>
    </g>
  </symbol>
  <symbol id="s-village" viewBox="-30 -30 60 60">
    <g filter="url(#f-shadow)" stroke="#2a1d10" stroke-width="1" stroke-linejoin="round">
      <path d="M-15 12V1h11v11z" fill="#e9dcc0"/><path d="M-17 2-9.5-6-2 2z" fill="#9c4a2a"/><rect x="-11.5" y="6" width="3" height="6" fill="#5a3b1e"/>
      <path d="M1 12V-2h13v14z" fill="#f2e6cc"/><path d="M-1-1 7.5-10 16-1z" fill="#b25a33"/><rect x="5.5" y="3" width="4" height="4" fill="#ffd97a"/>
    </g>
  </symbol>

  <!-- 미플 (클래식 실루엣) -->
  <symbol id="s-meeple" viewBox="-14 -16 28 30">
    <path d="M0-15a5.4 5.4 0 1 1 0 10.8A5.4 5.4 0 1 1 0-15zM-3.6-4.4h7.2c3 0 9.8 1 9.8 4.2 0 2.2-3.8 2.8-5.8 3.2L11.8 12h-8L0 6.6-3.8 12h-8L-8.4 3C-10.4 2.6-13.4 2-13.4-.2c0-3.2 6.8-4.2 9.8-4.2z"/>
  </symbol>

  <!-- 자원·상태 아이콘 (viewBox 0 0 24 24) -->
  <symbol id="i-food" viewBox="0 0 24 24"><g stroke="#6b4a0e" stroke-width="1.3" stroke-linecap="round" fill="#e8c35a">
    <path d="M12 22V9M7 22c0-5 2-8 5-10M17 22c0-5-2-8-5-10" fill="none"/><ellipse cx="12" cy="5.5" rx="2.4" ry="4"/><ellipse cx="8.4" cy="9.5" rx="1.9" ry="3.3" transform="rotate(-35 8.4 9.5)"/><ellipse cx="15.6" cy="9.5" rx="1.9" ry="3.3" transform="rotate(35 15.6 9.5)"/></g></symbol>
  <symbol id="i-wood" viewBox="0 0 24 24"><g stroke="#3b2410" stroke-width="1.2">
    <rect x="2.5" y="8" width="17" height="8" rx="4" fill="#9a6a3a"/><ellipse cx="19.5" cy="12" rx="2.8" ry="4" fill="#e3c08c"/><path d="M19.5 10.3a1.7 1.7 0 1 1 0 3.4" fill="none"/><path d="M6 10.5h7M5 13.5h8" stroke="#6b4522"/></g></symbol>
  <symbol id="i-stone" viewBox="0 0 24 24"><g stroke="#3a342e" stroke-width="1.2" stroke-linejoin="round">
    <path d="M3 17l3-8 7-3 7 4 1 7-6 3H8z" fill="#9d958b"/><path d="M6 9l6 3 8-2M12 12l2 8" fill="none" stroke="#6f675e"/><path d="M8 8.5l4-1.6" stroke="#d8d2ca"/></g></symbol>
  <symbol id="i-faith" viewBox="0 0 24 24"><g stroke="#7a4a05" stroke-width="1.1" stroke-linejoin="round">
    <path d="M12 2c1.5 4 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0C6.5 9 9 8 9 5c2 1.4 2.4 3 2.2 4.6C12.8 8 13 5 12 2z" fill="#ffcf5a"/><path d="M12 12c1 2 2.6 2.6 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.8 1.4-2.8 2.6-5z" fill="#fff3c4" stroke-width=".8"/></g></symbol>
  <symbol id="i-hand" viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7V5.5a1.5 1.5 0 0 1 3 0V12v-3a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7h-1c-3 0-4.5-1.5-6-4l-2.6-4.4a1.4 1.4 0 0 1 2.3-1.6z" fill="#f0dcc0" stroke="#5a3b1e" stroke-width="1.2" stroke-linejoin="round"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#c9a24a" stroke="#5a3b10" stroke-width="1.2"/><path d="M12 4.5v15.3c3-1.6 5.6-4.6 5.6-8.8V6.6z" fill="#e9cd7c"/></symbol>
  <symbol id="i-trophy" viewBox="0 0 24 24"><g stroke="#5a3b10" stroke-width="1.2" stroke-linejoin="round"><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="url(#g-gold)"/><path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" fill="none"/><path d="M12 13v4M8 21h8l-1-4H9z" fill="#c99a3b"/></g></symbol>
  <symbol id="i-house" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v10H4z" fill="#e9dcc0" stroke="#3b2410" stroke-width="1.2" stroke-linejoin="round"/><path d="M2.5 12 12 3.5 21.5 12" fill="none" stroke="#9c4a2a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="15" width="4" height="6" fill="#5a3b1e"/></symbol>
  <symbol id="i-temple" viewBox="0 0 24 24"><g stroke="#2a1d10" stroke-width="1.1" stroke-linejoin="round"><path d="M3 21h18v-2H3zM5 19V10M9.5 19V10M14.5 19V10M19 19V10" fill="#efe4cd"/><path d="M4 10h16V8.5H4zM2.5 8.5 12 3l9.5 5.5z" fill="#f8f0de"/></g></symbol>

  <!-- 교리 문장 -->
  <symbol id="d-peace" viewBox="0 0 24 24"><path d="M4 14c3 0 5-2 7-5 1.5-2.2 4-3.5 7-3-1 1-1.5 2-1.5 3.5 2 .5 3.5 1.5 4 3-2.5-.5-4.5 0-6 1.5-2 2.2-5 3.5-9 3.5z" fill="#f4f1e8" stroke="#3b3a36" stroke-width="1.1" stroke-linejoin="round"/><path d="M15 9.5l3 .3" stroke="#3b3a36"/><path d="M5 18c2 1 4 1 6 0" stroke="#6a8f4a" stroke-width="1.6" fill="none" stroke-linecap="round"/></symbol>
  <symbol id="d-war" viewBox="0 0 24 24"><g stroke="#2a1d10" stroke-width="1.1" stroke-linejoin="round"><path d="M5 3l11 11-2 2L3 5V3z" fill="#d9dde3"/><path d="M19 3 8 14l2 2L21 5V3z" fill="#c4c9d1"/><path d="M13 16l-2 2 3 3 2-2zM11 16l2 2-3 3-2-2z" fill="#8a5a2a"/></g></symbol>
  <symbol id="d-abundance" viewBox="0 0 24 24"><use href="#i-food"/></symbol>
  <!-- 사건 문장 -->
  <symbol id="e-calm" viewBox="0 0 24 24"><g stroke="#8a5a10" stroke-width="1.2"><circle cx="12" cy="12" r="5" fill="#ffd45a"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke-linecap="round"/></g></symbol>
  <symbol id="e-drought" viewBox="0 0 24 24"><g stroke="#6b3a0e" stroke-width="1.2" stroke-linejoin="round"><circle cx="12" cy="8" r="4.5" fill="#ff9d3a"/><path d="M2 17h20v5H2z" fill="#c9955a"/><path d="M6 17l2 2-1 3M13 17l-1 2.5 2 2.5M18 17l-1.5 2 1 3" fill="none"/></g></symbol>
  <symbol id="e-harvest" viewBox="0 0 24 24"><use href="#i-food"/></symbol>
  <symbol id="e-plague" viewBox="0 0 24 24"><g stroke="#2c3a1c" stroke-width="1.2" stroke-linejoin="round"><path d="M12 3C8 3 5 6 5 10c0 2.5 1 4 2.5 5v3h9v-3c1.5-1 2.5-2.5 2.5-5 0-4-3-7-7-7z" fill="#cfd8b0"/><circle cx="9.3" cy="10.5" r="1.8" fill="#2c3a1c"/><circle cx="14.7" cy="10.5" r="1.8" fill="#2c3a1c"/><path d="M10 18v3M14 18v3M12 14l-1 2h2z" fill="#2c3a1c"/></g></symbol>
  <symbol id="e-threat" viewBox="0 0 24 24"><g stroke="#3b0e08" stroke-width="1.2" stroke-linejoin="round"><path d="M5 2v20" stroke-width="1.8"/><path d="M5 3h14l-3 4.5 3 4.5H5z" fill="#b3392a"/><path d="M9 6.5h5M9 9h4" stroke="#ffd9cf"/></g></symbol>
  <symbol id="e-prophet" viewBox="0 0 24 24"><g stroke="#3b2410" stroke-width="1.2" stroke-linejoin="round"><path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z" fill="#f4ead4"/><circle cx="12" cy="12" r="3.6" fill="#5a86cf"/><circle cx="12" cy="12" r="1.5" fill="#1a1208"/><path d="M12 1.5v2M5 3.5l1.3 1.6M19 3.5l-1.3 1.6" stroke="#c9a24a" stroke-linecap="round"/></g></symbol>

  <!-- 율법 석판 -->
  <symbol id="s-tablet" viewBox="0 0 24 24"><g stroke="#1e130a" stroke-width="1.1" stroke-linejoin="round"><path d="M3 21V7a4.5 4.5 0 0 1 9 0v14z" fill="#9c938a"/><path d="M12 21V7a4.5 4.5 0 0 1 9 0v14z" fill="#8a8178"/><path d="M5 9h5M5 12h5M5 15h4M14 9h5M14 12h5M14 15h4" stroke="#3a3029"/></g></symbol>

  <!-- 기적 카드 그림 -->
  <symbol id="m-lightning" viewBox="0 0 48 48"><path d="M8 18c0-6 5-10 11-9 2-4 7-6 11-4 5-2 11 2 11 8 4 1 6 5 5 8H6c-2-1-1-3 2-3z" fill="#5a6b8c" stroke="#1c2436" stroke-width="1.2"/><path d="M26 20 16 34h8l-4 12 14-17h-8l5-9z" fill="#ffe86b" stroke="#8a6a00" stroke-width="1.2" stroke-linejoin="round"/></symbol>
  <symbol id="m-rain" viewBox="0 0 48 48"><path d="M8 20c0-6 5-10 11-9 2-4 7-6 11-4 5-2 11 2 11 8 4 1 6 5 5 8H6c-2-1-1-3 2-3z" fill="#c9d8ea" stroke="#3b4a60" stroke-width="1.2"/><g stroke="#7ec3ff" stroke-width="2.4" stroke-linecap="round"><path d="M14 30l-2 6M22 30l-2 6M30 30l-2 6M38 30l-2 6M18 39l-2 6M26 39l-2 6M34 39l-2 6"/></g></symbol>
  <symbol id="m-bounty" viewBox="0 0 48 48"><path d="M6 14c10-2 22 2 30 14l6 10c-8 4-18 3-26-3S5 22 6 14z" fill="#c9954a" stroke="#4a2c10" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 16c3 8 10 16 20 19" fill="none" stroke="#7a4f22"/><circle cx="38" cy="30" r="5" fill="#d9483a" stroke="#4a1208"/><circle cx="31" cy="36" r="4.5" fill="#f2c14e" stroke="#6b4a0e"/><circle cx="40" cy="38" r="4" fill="#7fb34d" stroke="#2c4a14"/><use href="#i-food" x="26" y="18" width="14" height="14"/></symbol>

  <!-- 문장 (게임 로고) -->
  <symbol id="sigil" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="url(#g-gold)" stroke="#5a3b10" stroke-width="1.5"/><circle cx="24" cy="24" r="17.5" fill="#2a1c0f" stroke="#f4dc92" stroke-width="1"/><path d="M27 8 16 26h7l-3 14 12-19h-7l4-13z" fill="url(#g-gold)" stroke="#f7e3a1" stroke-width=".8" stroke-linejoin="round"/></symbol>

  <!-- 튜토리얼 안내자: 사관 세라 -->
  <symbol id="npc-sera" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="31.5" fill="url(#g-gold)"/>
    <circle cx="32" cy="32" r="28.5" fill="#2b1c10"/>
    <circle cx="32" cy="26" r="22" fill="#4a3220" opacity=".7"/>
    <path d="M9 61c2-14 10-22 23-22s21 8 23 22z" fill="#6b2a1e" stroke="#2a0e08" stroke-width="1"/>
    <path d="M22 50c3 4 7 6 10 6s7-2 10-6" fill="none" stroke="#d9b36a" stroke-width="1.2"/>
    <path d="M18 35c-1.5-15 6-25 14-25s15.5 10 14 25c-3 6-8 9-14 9s-11-3-14-9z" fill="#7d3324" stroke="#2a0e08" stroke-width="1"/>
    <ellipse cx="32" cy="31" rx="8.5" ry="10" fill="#f0d2b0" stroke="#5a3b1e" stroke-width=".8"/>
    <path d="M23.8 26c2.5-6 13.9-6 16.4 0-3.5-2.4-12.9-2.4-16.4 0z" fill="#e3ddd4" stroke="#8a8378" stroke-width=".5"/>
    <path d="M27.4 30q1.6 1.3 3.2 0M33.4 30q1.6 1.3 3.2 0" stroke="#3b2410" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <path d="M29.6 35.6q2.4 1.7 4.8 0" stroke="#8a4a3a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <circle cx="26.5" cy="33" r="1.6" fill="#e8a88c" opacity=".55"/><circle cx="37.5" cy="33" r="1.6" fill="#e8a88c" opacity=".55"/>
    <rect x="19" y="48" width="24" height="7.5" rx="3.7" fill="#efe2c4" stroke="#8a6420" stroke-width=".9"/>
    <path d="M23 51.8h14" stroke="#8a6420" stroke-width=".7" stroke-dasharray="2 1.5"/>
    <path d="M45 57 52.5 34.5c1.2-3.2 4.4-4 5.2-1.8-1 5.4-5.2 12.6-11.2 24.6z" fill="#f4ead4" stroke="#5a4a38" stroke-width=".8"/>
    <path d="M47 55 55.5 33.5" stroke="#8a7a66" stroke-width=".5"/>
  </symbol>

  <!-- 헤더 선 아이콘 (currentColor) -->
  <symbol id="u-music" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/></g></symbol>
  <symbol id="u-speaker" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" fill-opacity=".25"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></g></symbol>
  <symbol id="u-off" viewBox="0 0 24 24"><path d="M4 4l16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="u-sparkle" viewBox="0 0 24 24"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" fill="currentColor"/></symbol>
  <symbol id="u-scroll" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h11a2 2 0 0 1 2 2v1h-4M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7"/><path d="M9 9h6M9 12h6M9 15h4"/></g></symbol>
  <symbol id="u-home" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></g></symbol>

  <symbol id="d-wisdom" viewBox="0 0 24 24"><g stroke="#3b2410" stroke-width="1.1" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" fill="#efe2c4"/><path d="M5 17a3 3 0 0 1 3-3h11" fill="none"/><path d="M8 7h8M8 10h6" stroke="#8a6420"/></g></symbol>
  <symbol id="m-manna" viewBox="0 0 48 48"><path d="M8 16c0-6 5-10 11-9 2-4 7-6 11-4 5-2 11 2 11 8 4 1 6 5 5 8H6c-2-1-1-3 2-3z" fill="#f3ead2" stroke="#6b5a3a" stroke-width="1.2"/><g fill="#fff8e0" stroke="#b08a3a" stroke-width="1"><circle cx="14" cy="30" r="3"/><circle cx="24" cy="34" r="3.4"/><circle cx="34" cy="29" r="3"/><circle cx="19" cy="41" r="2.6"/><circle cx="30" cy="42" r="3"/><circle cx="40" cy="38" r="2.4"/></g></symbol>
  <symbol id="m-ark" viewBox="0 0 48 48"><path d="M4 30h40l-6 10H10z" fill="#8a5a2a" stroke="#3a220c" stroke-width="1.3" stroke-linejoin="round"/><path d="M12 30V20h24v10" fill="#c9954a" stroke="#3a220c" stroke-width="1.2"/><path d="M10 18h28l-4-6H14z" fill="#6e4520" stroke="#3a220c" stroke-width="1.2"/><path d="M2 42c6 3 10-3 16 0s10-3 16 0 10-3 14 0" fill="none" stroke="#6fb3e6" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="24" r="2.4" fill="#ffe28a"/></symbol>
  <symbol id="m-tongues" viewBox="0 0 48 48"><path d="M24 6c5 7 10 11 10 19a10 10 0 0 1-20 0c0-8 5-12 10-19z" fill="#ffb347" stroke="#8a4a00" stroke-width="1.2"/><path d="M24 16c3 4 5 7 5 11a5 5 0 0 1-10 0c0-4 2-7 5-11z" fill="#fff3c4"/><path d="M6 40c6-4 12-4 18 0M24 40c6-4 12-4 18 0" fill="none" stroke="#f4f1e8" stroke-width="2.6" stroke-linecap="round"/></symbol>
  <symbol id="m-pillar" viewBox="0 0 48 48"><defs><linearGradient id="g-pillar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffb347"/><stop offset="1" stop-color="#d9483a"/></linearGradient></defs><path d="M18 44c-2-10 2-16 0-26-1-6 3-10 6-14 3 4 7 8 6 14-2 10 2 16 0 26z" fill="url(#g-pillar)" stroke="#8a2a10" stroke-width="1.2"/><path d="M22 42c-1-8 2-12 1-20 0-3 1-5 1-7 1 2 2 4 1 7-1 8 2 12 1 20z" fill="#fff8e0"/></symbol>
  <symbol id="m-revive" viewBox="0 0 48 48"><circle cx="24" cy="22" r="16" fill="#fff4c8" opacity=".55"/><use href="#s-meeple" x="12" y="10" width="24" height="26" fill="#f4efe4" stroke="#6b5a3a" stroke-width="1"/><path d="M8 42h32" stroke="#6b4a2a" stroke-width="2.4" stroke-linecap="round"/><path d="M24 2v6M10 8l4 4M38 8l-4 4" stroke="#ffd98a" stroke-width="2" stroke-linecap="round"/></symbol>
  <pattern id="pat-own-player" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" fill="rgba(31,63,115,.35)"/></pattern>
  <pattern id="pat-own-enemy" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.8" fill="rgba(101,26,17,.4)"/></pattern>
</defs>
</svg>`;

export function installArt() {
  if (document.getElementById('g-plain')) return;
  document.body.insertAdjacentHTML('afterbegin', ART);
}

// HTML 안에서 아이콘을 쓰는 도우미
export const icon = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
