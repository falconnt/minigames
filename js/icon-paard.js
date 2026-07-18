// Het Paardensport-icoon als inline SVG: ons paard (vos-vachtkleur uit de
// game) in sprongpose over een rood-witte hindernis, met zadel, bles en witte
// sok. Schaalt mee met de tekstgrootte van de plek waar hij staat.
export const ICON_PAARD = `<svg viewBox="0 0 64 64" width="1.35em" height="1.35em" style="vertical-align:-0.22em" aria-hidden="true">
  <defs>
    <linearGradient id="psg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c06a3c"/><stop offset="0.55" stop-color="#9c4a24"/><stop offset="1" stop-color="#743314"/>
    </linearGradient>
  </defs>
  <!-- hindernis -->
  <rect x="23" y="43" width="3" height="17" fill="#c0392b"/>
  <rect x="41" y="43" width="3" height="17" fill="#c0392b"/>
  <rect x="20" y="45" width="27" height="2.6" rx="1" fill="#f2f2f0"/>
  <rect x="20" y="50" width="27" height="2.6" rx="1" fill="#f2f2f0"/>
  <rect x="20" y="55" width="27" height="2.6" rx="1" fill="#f2f2f0"/>
  <!-- graspollen -->
  <path d="M7 61 q1.5 -5 3 0 M11 61 q1.5 -4 3 0 M52 61 q1.5 -5 3 0 M56 61 q1.5 -4 3 0" stroke="#4f7a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <!-- paard in sprong -->
  <g transform="rotate(-8 30 26)">
    <path d="M45 20 Q53 24 50 35 Q46 29 43 26 Z" fill="#5f2c12"/>
    <g stroke="#743314" stroke-width="3.6" stroke-linecap="round" fill="none">
      <path d="M28 33 L23 37 L26 41"/>
      <path d="M41 32 L46 36 L44 41"/>
      <path d="M44 30 L49 32 L48.5 37"/>
    </g>
    <path d="M25 32 L20 36 L23 40" stroke="#743314" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <path d="M21.5 37.2 L23 40" stroke="#efeae2" stroke-width="3.6" stroke-linecap="round"/>
    <g fill="#2b2320">
      <circle cx="23.2" cy="40.2" r="2"/><circle cx="26.2" cy="41" r="2"/>
      <circle cx="44" cy="41.2" r="2"/><circle cx="48.6" cy="37.2" r="2"/>
    </g>
    <ellipse cx="33" cy="27" rx="13.5" ry="8.5" fill="url(#psg)"/>
    <path d="M24 22 C21 18 19.5 14.5 18.5 10.5 L24.5 9 C25.5 14 27.5 18 31 21.5 Z" fill="url(#psg)"/>
    <path d="M18.5 9.5 C14 8.8 9.5 11 9 14.5 C8.8 16.6 10.6 17.8 12.8 17.2 L19 15 Z" fill="#9c4a24"/>
    <path d="M16.5 9.5 L15 5 L12.8 9.8 Z" fill="#9c4a24"/>
    <path d="M18 8.8 C21 12.8 23.5 16.5 26.5 19.8 L23.5 21.5 C20 17.8 17.5 14 14.8 10 Z" fill="#5f2c12"/>
    <path d="M14.5 9.2 L11.8 14.2 L13.4 14.8 L16 9.8 Z" fill="#efeae2" opacity="0.92"/>
    <circle cx="12.7" cy="12.6" r="1.15" fill="#15100f"/>
    <circle cx="12.3" cy="12.2" r="0.4" fill="#ffffff"/>
    <circle cx="10" cy="14.9" r="0.7" fill="#4a2210"/>
    <path d="M28 20.5 Q33 18.3 37.5 20.5 Q36.5 24.2 32.5 24.8 Q29.3 24.2 28 20.5 Z" fill="#3c2415"/>
    <path d="M32.5 24.8 L31.5 32.5" stroke="#2b1a0f" stroke-width="1.8"/>
  </g>
  <!-- sparkle (serie-handtekening) -->
  <path d="M53 7 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill="#fff2b8"/>
</svg>`;
