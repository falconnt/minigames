// Het Ruimteschieter-icoon als inline SVG: een gloeiend neon-ruimteschip met
// magenta vinnen en uitlaatvlam, vurend op een groen alien-schip, op een
// sterrenveld — in het neonpalet van de game. Schaalt mee met de tekstgrootte.
export const ICON_RUIMTE = `<svg viewBox="0 0 64 64" width="1.35em" height="1.35em" style="vertical-align:-0.22em" aria-hidden="true">
  <defs>
    <filter id="rsglow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- sterren -->
  <g fill="#eaffff">
    <circle cx="7" cy="10" r="1.2" opacity="0.9"/>
    <circle cx="16" cy="24" r="0.9" opacity="0.6"/>
    <circle cx="5" cy="36" r="1" opacity="0.7"/>
    <circle cx="58" cy="28" r="1.1" opacity="0.8"/>
    <circle cx="55" cy="46" r="0.9" opacity="0.55"/>
    <circle cx="24" cy="6" r="0.9" opacity="0.7"/>
    <circle cx="44" cy="52" r="1" opacity="0.6"/>
  </g>
  <!-- alien-schip rechtsboven + zijn magenta schot -->
  <g filter="url(#rsglow)">
    <rect x="46" y="8" width="12" height="7" rx="3" fill="#48ff8e"/>
    <path d="M48 6.5 l-2 -3 M56 6.5 l2 -3" stroke="#48ff8e" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M48 17 v2.4 M52 17 v3.4 M56 17 v2.4" stroke="#48ff8e" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="49.5" cy="11.5" r="1.1" fill="#04050d"/>
    <circle cx="54.5" cy="11.5" r="1.1" fill="#04050d"/>
    <rect x="51.2" y="22" width="1.7" height="6" fill="#ff3df0"/>
  </g>
  <!-- laserschot van het schip -->
  <rect x="31.1" y="1" width="1.8" height="6" fill="#39f6ff" filter="url(#rsglow)"/>
  <!-- het schip -->
  <g filter="url(#rsglow)">
    <path d="M24 30 L13 43 L24 41 Z" fill="#ff3df0"/>
    <path d="M40 30 L51 43 L40 41 Z" fill="#ff3df0"/>
    <path d="M32 7 C36 14 40 26 40 39 L32 34 L24 39 C24 26 28 14 32 7 Z"
          fill="#0b2836" stroke="#39f6ff" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="32" cy="21" rx="3.4" ry="5" fill="#aef9ff"/>
    <circle cx="31" cy="19" r="1" fill="#ffffff"/>
  </g>
  <!-- uitlaatvlam -->
  <g filter="url(#rsglow)">
    <path d="M27.5 41 Q32 56 36.5 41 Q34 45 32 45.5 Q30 45 27.5 41 Z" fill="#ff9a3d"/>
    <path d="M29.8 42 Q32 51 34.2 42 Q32 44.5 29.8 42 Z" fill="#ffd23d"/>
  </g>
  <!-- sparkle (serie-handtekening) -->
  <path d="M9 50 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill="#fff2b8"/>
</svg>`;
