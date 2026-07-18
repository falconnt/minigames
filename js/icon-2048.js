// Het 2048-icoon als inline SVG: een mini-bord in de klassieke 2048-kleuren
// met een goudglanzende 2048-tegel die er net iets uitspringt. Schaalt mee met
// de tekstgrootte van de plek waar hij staat.
export const ICON_2048 = `<svg viewBox="0 0 64 64" width="1.35em" height="1.35em" style="vertical-align:-0.22em" aria-hidden="true">
  <rect x="2" y="2" width="60" height="60" rx="10" fill="#bbada0"/>
  <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
    <rect x="5" y="5" width="26" height="26" rx="5" fill="#eee4da"/>
    <text x="18" y="24" font-size="17" fill="#776e65">2</text>
    <rect x="33" y="5" width="26" height="26" rx="5" fill="#ede0c8"/>
    <text x="46" y="24" font-size="17" fill="#776e65">4</text>
    <rect x="5" y="33" width="26" height="26" rx="5" fill="#f2b179"/>
    <text x="18" y="52" font-size="17" fill="#fff">8</text>
    <g transform="translate(46 46) rotate(-5) scale(1.12) translate(-46 -46)">
      <rect x="33" y="33" width="26" height="26" rx="5" fill="#edc22e" stroke="#ffe9a0" stroke-width="1.6"/>
      <text x="46" y="49.5" font-size="9.5" fill="#fff">2048</text>
    </g>
    <path d="M57 30 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill="#fff2b8"/>
  </g>
</svg>`;
