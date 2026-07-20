// Het Onthul!-icoon als inline SVG: een half onthuld zonsondergang-plaatje —
// links zichtbaar, rechts nog bedekt met het donkere raster — met de gele
// verover-lijn, een stuiterende bal en het roze spelersblokje op de grens.
export const ICON_ONTHUL = `<svg viewBox="0 0 64 64" width="1.35em" height="1.35em" style="vertical-align:-0.22em" aria-hidden="true">
  <defs>
    <linearGradient id="oti-lucht" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b2a56"/><stop offset="0.45" stop-color="#b2467a"/>
      <stop offset="0.7" stop-color="#ff8c5a"/><stop offset="1" stop-color="#ffd98a"/>
    </linearGradient>
    <clipPath id="oti-clip"><rect x="2" y="2" width="60" height="60" rx="10"/></clipPath>
  </defs>
  <g clip-path="url(#oti-clip)">
    <!-- onthuld deel: zonsondergang met bergen -->
    <rect x="2" y="2" width="60" height="60" fill="url(#oti-lucht)"/>
    <circle cx="24" cy="30" r="9" fill="#fff0b8"/>
    <circle cx="24" cy="30" r="14" fill="#ffe9a0" opacity="0.35"/>
    <path d="M2 46 L14 32 L24 42 L34 30 L46 44 L62 36 L62 62 L2 62 Z" fill="#4a2d5e"/>
    <path d="M2 52 L12 44 L22 52 L36 42 L50 54 L62 48 L62 62 L2 62 Z" fill="#38224e"/>
    <!-- bedekt deel rechts: donker met rasterpuntjes -->
    <path d="M38 2 L62 2 L62 34 L50 34 L50 62 L38 62 Z" fill="#10142a"/>
    <g fill="rgba(90,110,180,0.35)">
      <rect x="42" y="6" width="3" height="3"/><rect x="50" y="6" width="3" height="3"/><rect x="58" y="6" width="3" height="3"/>
      <rect x="46" y="12" width="3" height="3"/><rect x="54" y="12" width="3" height="3"/>
      <rect x="42" y="18" width="3" height="3"/><rect x="50" y="18" width="3" height="3"/><rect x="58" y="18" width="3" height="3"/>
      <rect x="46" y="24" width="3" height="3"/><rect x="54" y="24" width="3" height="3"/>
      <rect x="42" y="30" width="3" height="3"/><rect x="58" y="30" width="3" height="3"/>
      <rect x="42" y="38" width="3" height="3"/><rect x="42" y="46" width="3" height="3"/><rect x="42" y="54" width="3" height="3"/>
      <rect x="46" y="42" width="3" height="3"/><rect x="46" y="50" width="3" height="3"/><rect x="46" y="58" width="3" height="3"/>
    </g>
    <!-- grens onthuld/bedekt -->
    <path d="M38 2 L38 62 M38 34 L50 34 L50 62" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" fill="none"/>
    <!-- de gele verover-lijn in wording -->
    <path d="M38 20 L46 20 L46 27" stroke="#ffd23d" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- stuiterende bal in het bedekte deel -->
    <circle cx="55" cy="46" r="4.2" fill="#eaf6ff"/>
    <circle cx="56.2" cy="47.2" r="1.9" fill="#7fb8e8"/>
    <circle cx="53.6" cy="44.6" r="1.1" fill="#ffffff"/>
    <!-- het roze spelersblokje op de kop van de lijn -->
    <rect x="43" y="24.6" width="6" height="6" rx="1.2" fill="#ff5b8d"/>
    <rect x="44.4" y="26" width="3.2" height="3.2" fill="#ffffff"/>
    <!-- sparkle (serie-handtekening) -->
    <path d="M10 10 l1.3 2.9 2.9 1.3 -2.9 1.3 -1.3 2.9 -1.3 -2.9 -2.9 -1.3 2.9 -1.3 Z" fill="#fff2b8"/>
  </g>
</svg>`;
