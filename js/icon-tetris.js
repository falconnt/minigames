// Het Blokjes-icoon als inline SVG: een stapeltje Minecraft-blokken (gras,
// diamant, goud, lapis, eiken) met een vallend amethist-blokje erboven, in de
// pixelstijl van de game. Schaalt mee met de tekstgrootte.
export const ICON_TETRIS = `<svg viewBox="0 0 64 64" width="1.35em" height="1.35em" style="vertical-align:-0.22em" aria-hidden="true">
  <g shape-rendering="crispEdges">
    <!-- vallend amethist-blokje + vaartstreepjes -->
    <path d="M45 2 v5 M53 3 v4" stroke="#c08ee8" stroke-width="2"/>
    <g>
      <rect x="42" y="9" width="14" height="14" fill="#9b59d0"/>
      <rect x="42" y="9" width="14" height="3" fill="#c08ee8"/>
      <rect x="42" y="9" width="3" height="14" fill="#c08ee8"/>
      <rect x="42" y="20" width="14" height="3" fill="#7038a8"/>
      <rect x="53" y="9" width="3" height="14" fill="#7038a8"/>
      <rect x="47" y="14" width="3" height="3" fill="#7038a8"/>
    </g>
    <!-- middelste rij: diamant + lapis -->
    <g>
      <rect x="22" y="28" width="16" height="16" fill="#4fd0d6"/>
      <rect x="22" y="28" width="16" height="3" fill="#8fe9ec"/>
      <rect x="22" y="28" width="3" height="16" fill="#8fe9ec"/>
      <rect x="22" y="41" width="16" height="3" fill="#2f9aa0"/>
      <rect x="35" y="28" width="3" height="16" fill="#2f9aa0"/>
      <rect x="27" y="33" width="3" height="3" fill="#2f9aa0"/>
      <rect x="31" y="36" width="3" height="3" fill="#8fe9ec"/>
    </g>
    <g>
      <rect x="39" y="28" width="16" height="16" fill="#2f6fd6"/>
      <rect x="39" y="28" width="16" height="3" fill="#5f97ef"/>
      <rect x="39" y="28" width="3" height="16" fill="#5f97ef"/>
      <rect x="39" y="41" width="16" height="3" fill="#1d4aa0"/>
      <rect x="52" y="28" width="3" height="16" fill="#1d4aa0"/>
      <rect x="45" y="34" width="3" height="3" fill="#1d4aa0"/>
    </g>
    <!-- onderste rij: gras + goud + eiken -->
    <g>
      <rect x="5" y="45" width="16" height="16" fill="#7a5230"/>
      <rect x="5" y="45" width="16" height="6" fill="#7bc043"/>
      <rect x="5" y="45" width="16" height="2" fill="#93d152"/>
      <rect x="5" y="58" width="16" height="3" fill="#5f3f22"/>
      <rect x="18" y="51" width="3" height="10" fill="#5f3f22"/>
      <rect x="9" y="54" width="3" height="3" fill="#8a6038"/>
    </g>
    <g>
      <rect x="22" y="45" width="16" height="16" fill="#f4cf3a"/>
      <rect x="22" y="45" width="16" height="3" fill="#ffe98a"/>
      <rect x="22" y="45" width="3" height="16" fill="#ffe98a"/>
      <rect x="22" y="58" width="16" height="3" fill="#c9a021"/>
      <rect x="35" y="45" width="3" height="16" fill="#c9a021"/>
      <rect x="28" y="51" width="3" height="3" fill="#c9a021"/>
    </g>
    <g>
      <rect x="39" y="45" width="16" height="16" fill="#d07b3a"/>
      <rect x="39" y="45" width="16" height="3" fill="#eaa062"/>
      <rect x="39" y="45" width="3" height="16" fill="#eaa062"/>
      <rect x="39" y="58" width="16" height="3" fill="#9c5522"/>
      <rect x="52" y="45" width="3" height="16" fill="#9c5522"/>
      <rect x="44" y="50" width="8" height="2" fill="#9c5522"/>
      <rect x="44" y="55" width="8" height="2" fill="#9c5522"/>
    </g>
  </g>
  <path d="M10 12 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill="#fff2b8"/>
</svg>`;
