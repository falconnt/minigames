// Het Reactietest-icoon als inline SVG: een stopwatch met een bliksemschicht
// op de groene "KLIK!"-wijzerplaat, met vaartstreepjes. Schaalt mee met de
// tekstgrootte van de plek waar hij staat.
export const ICON_REACTIE = `<svg viewBox="0 0 64 64" width="1.35em" height="1.35em" style="vertical-align:-0.22em" aria-hidden="true">
  <defs>
    <linearGradient id="rtg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2ecc71"/><stop offset="1" stop-color="#1f9e54"/>
    </linearGradient>
  </defs>
  <!-- vaartstreepjes -->
  <path d="M4 30 h9 M2 40 h9" stroke="#9fb8f5" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
  <!-- kroontje en zijknop -->
  <rect x="28.5" y="4.5" width="7" height="5" rx="1.6" fill="#5c6370"/>
  <rect x="30.2" y="8.5" width="3.6" height="5" fill="#5c6370"/>
  <g transform="rotate(40 46 13)"><rect x="42" y="10.5" width="7" height="4.5" rx="1.6" fill="#5c6370"/></g>
  <!-- kast + wijzerplaat -->
  <circle cx="32" cy="36" r="21" fill="#3a3f4a"/>
  <circle cx="32" cy="36" r="17" fill="url(#rtg)"/>
  <!-- streepjes op 12/3/6/9 -->
  <path d="M32 21.5 v3.5 M32 47 v3.5 M17.5 36 h3.5 M43 36 h3.5" stroke="#eafff0" stroke-width="2" stroke-linecap="round"/>
  <!-- bliksem -->
  <path d="M34.5 24.5 L24.5 39 h6 l-3.2 11.5 L40 33.5 h-6 l4.2 -9 Z" fill="#ffd43c" stroke="#e8a800" stroke-width="0.8"/>
  <!-- glans -->
  <path d="M19 30 a15 15 0 0 1 12 -9" stroke="rgba(255,255,255,0.55)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <!-- sparkle -->
  <path d="M55 22 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill="#fff2b8"/>
</svg>`;
