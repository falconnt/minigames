// Het Vogel Vlucht-vogeltje als inline SVG-icoon, passend bij de in-game
// graphics (geel verenkleed, rood sjaaltje, kuifje). Schaalt mee met de
// tekstgrootte van de plek waar hij staat.
export const BIRD_ICON = `<svg viewBox="0 0 64 64" width="1.35em" height="1.35em" style="vertical-align:-0.22em" aria-hidden="true">
  <defs>
    <linearGradient id="vvb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#f0ad00"/>
    </linearGradient>
  </defs>
  <path d="M14 30 L2 24 L6 34 Z" fill="#d18f00"/>
  <path d="M14 32 L1 30 L7 39 Z" fill="#f2c200"/>
  <path d="M15 34 L4 38 L12 43 Z" fill="#ffdf6b"/>
  <path d="M20 34 C14 38 10 44 12 48 C16 46 20 42 24 39 Z" fill="#e05b4b"/>
  <ellipse cx="30" cy="36" rx="17" ry="14" fill="url(#vvb)"/>
  <ellipse cx="27" cy="41" rx="10" ry="8" fill="#fff4cc"/>
  <ellipse cx="24" cy="34" rx="11" ry="5.5" fill="#f2b400" transform="rotate(18 24 34)"/>
  <ellipse cx="25" cy="32" rx="10" ry="5" fill="#ffd43c" transform="rotate(8 25 32)"/>
  <ellipse cx="26" cy="30" rx="9" ry="4.5" fill="#ffe27a" transform="rotate(-4 26 30)"/>
  <path d="M34 26 a8 8 0 0 1 6 10" stroke="#e05b4b" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="42" cy="22" r="11" fill="#ffe884"/>
  <path d="M36 12 L38 5 L41 11 Z" fill="#e8a800"/>
  <path d="M40 11 L44 4 L46 11 Z" fill="#f2c200"/>
  <path d="M45 12 L49 6 L50 13 Z" fill="#e8a800"/>
  <path d="M52 20 L62 23 L52 27 Z" fill="#f59f00"/>
  <path d="M52 27 L59 28 L52 31 Z" fill="#e08a00"/>
  <ellipse cx="45" cy="20" rx="3.4" ry="3.8" fill="#fff"/>
  <circle cx="46" cy="20.5" r="1.9" fill="#26221f"/>
  <circle cx="46.8" cy="19.6" r="0.7" fill="#fff"/>
  <ellipse cx="49" cy="27" rx="2.6" ry="1.6" fill="rgba(255,120,90,.4)"/>
</svg>`;
