// Het Flappy Bird-icoon als inline SVG: de klassieke "Flappy Bird"-look — een
// mollig geel vogeltje met oranje snavel en grote ronde oog, tussen de bekende
// groene buizen op een turquoise lucht. Schaalt mee met de tekstgrootte.
export const BIRD_ICON = `<svg viewBox="0 0 64 64" width="1.35em" height="1.35em" style="vertical-align:-0.22em" aria-hidden="true">
  <defs>
    <linearGradient id="vvsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5fcbd6"/><stop offset="1" stop-color="#4ec0ca"/>
    </linearGradient>
    <linearGradient id="vvbody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe154"/><stop offset="1" stop-color="#f6c518"/>
    </linearGradient>
    <linearGradient id="vvpipe" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9ee05a"/><stop offset="0.5" stop-color="#73bf2e"/><stop offset="1" stop-color="#4f9020"/>
    </linearGradient>
    <clipPath id="vvclip"><rect x="2" y="2" width="60" height="60" rx="11"/></clipPath>
  </defs>
  <g clip-path="url(#vvclip)">
    <!-- lucht -->
    <rect x="2" y="2" width="60" height="60" fill="url(#vvsky)"/>
    <!-- wolkjes -->
    <g fill="#eafcff" opacity="0.92">
      <ellipse cx="13" cy="13" rx="8" ry="3.4"/><ellipse cx="20" cy="14" rx="5.5" ry="2.7"/>
    </g>
    <!-- groene buis rechtsboven (met kraag) -->
    <g stroke="#356a12" stroke-width="1.3" stroke-linejoin="round">
      <rect x="49" y="2" width="12" height="20" fill="url(#vvpipe)"/>
      <rect x="46" y="20" width="18" height="8" rx="2" fill="url(#vvpipe)"/>
      <rect x="50.5" y="3" width="2.6" height="18" fill="#c6f08a" opacity="0.7" stroke="none"/>
    </g>
    <!-- grond -->
    <rect x="2" y="53" width="60" height="9" fill="#ded895"/>
    <rect x="2" y="53" width="60" height="3.2" fill="#7cc043"/>
    <g stroke="#c8bf72" stroke-width="1"><path d="M10 56 l3 3 M22 56 l3 3 M34 56 l3 3 M46 56 l3 3 M56 56 l3 3"/></g>
    <!-- FLAPPY BIRD (kijkt naar rechts) -->
    <g stroke="#4a3410" stroke-width="1.5" stroke-linejoin="round">
      <!-- staart -->
      <path d="M12 30 l-6 -3 l1 6 l5 1 Z" fill="#f2b400"/>
      <!-- lijf -->
      <rect x="12" y="20" width="27" height="24" rx="11" fill="url(#vvbody)"/>
      <!-- lichtere buik -->
      <path d="M14 34 a11 9 0 0 0 24 0 a12 8 0 0 1 -24 0 Z" fill="#f7f0c8" stroke="none"/>
      <!-- vleugel -->
      <path d="M15 30 q7 -5 12 -1 q-4 6 -12 3 Z" fill="#fff7dc"/>
      <!-- oog -->
      <circle cx="31" cy="27" r="6" fill="#ffffff"/>
      <circle cx="32.5" cy="27.5" r="2.7" fill="#26221f" stroke="none"/>
      <circle cx="33.5" cy="26.4" r="0.9" fill="#fff" stroke="none"/>
      <!-- snavel -->
      <path d="M37 29 l11 1 l-2 3 l-9 0 Z" fill="#ffb43c"/>
      <path d="M37 33 l9 0 l-2 3.4 l-7 -0.4 Z" fill="#e8760a"/>
    </g>
    <!-- sparkle (serie-handtekening) -->
    <path d="M8 44 l1.3 2.9 2.9 1.3 -2.9 1.3 -1.3 2.9 -1.3 -2.9 -2.9 -1.3 2.9 -1.3 Z" fill="#fff2b8"/>
  </g>
</svg>`;
