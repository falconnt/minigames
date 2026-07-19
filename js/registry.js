// Register van alle minigames. Een nieuwe game toevoegen = één entry hier
// plus één module in games/ (zie README.md).

import { BIRD_ICON } from './bird-icon.js';
import { ICON_2048 } from './icon-2048.js';
import { ICON_REACTIE } from './icon-reactie.js';
import { ICON_TETRIS } from './icon-tetris.js';
import { ICON_RUIMTE } from './icon-ruimteschieter.js';
import { ICON_PAARD } from './icon-paard.js';

export const categories = [
  { id: 'arcade', name: 'Arcade', icon: '🕹️' },
  { id: 'puzzel', name: 'Puzzel', icon: '🧩' },
  { id: 'reflex', name: 'Reflex', icon: '⚡' },
  { id: 'simulatie', name: 'Simulatie', icon: '🏇' },
];

export const games = [
  {
    id: 'vogelvlucht',
    title: 'Flappy Bird',
    icon: BIRD_ICON,
    category: 'arcade',
    description: 'Tik of druk op spatie om te fladderen en vlieg zo ver mogelijk tussen de buizen door.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/vogelvlucht.js'),
  },
  {
    id: '2048',
    title: '2048',
    icon: ICON_2048,
    category: 'puzzel',
    description: 'Schuif tegels samen tot 2048. Je spel wordt automatisch bewaard.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/2048.js'),
  },
  {
    id: 'reactie',
    title: 'Reactietest',
    icon: ICON_REACTIE,
    category: 'reflex',
    description: 'Klik zodra het scherm groen wordt. Vijf rondes, gemiddelde telt.',
    scoreMode: 'lower',
    formatScore: (s) => `${s} ms`,
    load: () => import('../games/reaction.js'),
  },
  {
    id: 'tetris',
    title: 'Blokjes',
    icon: ICON_TETRIS,
    category: 'puzzel',
    description: 'Tetris met Minecraft-blokken! Stapel gras, diamant en goud tot volle rijen. Speel met je vinger, de muis of het toetsenbord.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/tetris.js'),
  },
  {
    id: 'ruimteschieter',
    title: 'Ruimteschieter',
    icon: ICON_RUIMTE,
    category: 'arcade',
    description: 'Neon space-shooter: knal in je gloeiende ruimteschip de aanvallende vijanden uit de lucht en ontwijk hun schoten. Schermvullend, met de vinger of het toetsenbord.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/ruimteschieter.js'),
  },
  {
    id: 'racen',
    title: 'Racen',
    icon: `<svg viewBox="0 0 48 48" width="1.15em" height="1.15em" style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" aria-label="Racen">
      <defs>
        <linearGradient id="rc2-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2e36"/><stop offset="1" stop-color="#141519"/></linearGradient>
        <linearGradient id="rc2-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#45d6ff"/><stop offset="0.5" stop-color="#20a6ec"/><stop offset="1" stop-color="#1385d6"/></linearGradient>
        <radialGradient id="rc2-glow" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="#3ec6ff" stop-opacity="0.5"/><stop offset="1" stop-color="#3ec6ff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="11" fill="url(#rc2-bg)"/>
      <ellipse cx="24" cy="25" rx="15" ry="17" fill="url(#rc2-glow)"/>
      <g><rect x="2.2" y="5" width="2.4" height="38" fill="#d83b37"/><rect x="43.4" y="5" width="2.4" height="38" fill="#d83b37"/>
        <g fill="#eef0f2"><rect x="2.2" y="7" width="2.4" height="4"/><rect x="2.2" y="15" width="2.4" height="4"/><rect x="2.2" y="23" width="2.4" height="4"/><rect x="2.2" y="31" width="2.4" height="4"/><rect x="2.2" y="39" width="2.4" height="3"/><rect x="43.4" y="7" width="2.4" height="4"/><rect x="43.4" y="15" width="2.4" height="4"/><rect x="43.4" y="23" width="2.4" height="4"/><rect x="43.4" y="31" width="2.4" height="4"/><rect x="43.4" y="39" width="2.4" height="3"/></g></g>
      <g fill="#cfd3d8" opacity="0.45"><rect x="23.1" y="3.4" width="1.8" height="4.2" rx="0.9"/><rect x="23.1" y="41" width="1.8" height="4.2" rx="0.9"/></g>
      <g fill="#15161b"><rect x="18.4" y="37" width="2" height="3.6"/><rect x="27.6" y="37" width="2" height="3.6"/><rect x="12.9" y="39" width="22.2" height="2.7" rx="1.2"/><rect x="12.5" y="37.8" width="1.8" height="4.6" rx="0.6"/><rect x="33.7" y="37.8" width="1.8" height="4.6" rx="0.6"/></g>
      <g fill="#0e0f13"><rect x="12.8" y="14.4" width="3.6" height="6.5" rx="1.3"/><rect x="31.6" y="14.4" width="3.6" height="6.5" rx="1.3"/><rect x="12.3" y="28.6" width="3.8" height="6.9" rx="1.3"/><rect x="31.9" y="28.6" width="3.8" height="6.9" rx="1.3"/></g>
      <path d="M24 7.5 C18.8 8 15.4 12.6 15 18.6 L15 33 C15 37 18 39.6 24 39.6 C30 39.6 33 37 33 33 L32.6 18.6 C32.4 12.6 29.2 8 24 7.5 Z" fill="url(#rc2-body)" stroke="rgba(255,255,255,0.18)" stroke-width="0.5"/>
      <path d="M19.4 18 L28.6 18 L26.8 10.8 C25.9 10 22.1 10 21.2 10.8 Z" fill="#191b20"/>
      <g fill="#eef7ff"><rect x="16.1" y="12.3" width="2.7" height="1.6" rx="0.8"/><rect x="29.2" y="12.3" width="2.7" height="1.6" rx="0.8"/></g>
      <rect x="19.2" y="18.4" width="9.6" height="14.6" rx="4.2" fill="#0d141d"/>
      <rect x="20.2" y="19.4" width="7.6" height="4.3" rx="2" fill="#8fc0e6" opacity="0.28"/>
      <rect x="20.4" y="10.5" width="1.5" height="27" rx="0.75" fill="#ffffff" opacity="0.12"/>
      <rect x="18" y="35.6" width="12" height="1.5" rx="0.7" fill="#ff3b30"/>
    </svg>`,
    category: 'arcade',
    description: 'Scheur over de weg, ontwijk de tegenliggers en pak munten. Steeds sneller, met turbo! Schermvullend, met de vinger of het toetsenbord.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} m`,
    load: () => import('../games/racen.js'),
  },
  {
    id: 'schaduwbos',
    title: 'Schaduwbos',
    icon: `<svg viewBox="0 0 48 48" width="1.15em" height="1.15em" style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" aria-label="Schaduwbos">
      <defs>
        <linearGradient id="sb-ic-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12281c"/><stop offset="1" stop-color="#070d0b"/></linearGradient>
        <radialGradient id="sb-ic-moon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#eef6ee"/><stop offset="1" stop-color="#9fb8a4"/></radialGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="11" fill="url(#sb-ic-bg)"/>
      <circle cx="37" cy="12" r="6.5" fill="url(#sb-ic-moon)" opacity="0.92"/>
      <circle cx="34.6" cy="10.6" r="6" fill="#12281c" opacity="0.55"/>
      <g fill="#0b140e"><circle cx="8" cy="41" r="6"/><circle cx="14" cy="43" r="5"/><circle cx="41" cy="42" r="6"/></g>
      <g transform="rotate(-38 24 26)"><rect x="22.9" y="7" width="2.2" height="27" rx="1.1" fill="#e6edf5"/><rect x="22.2" y="33" width="3.6" height="2" rx="1" fill="#c9a24a"/><rect x="23.2" y="35" width="1.6" height="6" rx="0.8" fill="#5a3a22"/></g>
      <circle cx="22" cy="27" r="9" fill="#14181f"/>
      <circle cx="22" cy="25.6" r="6.6" fill="#1c2230"/>
      <rect x="14.6" y="22.6" width="14.8" height="3.4" rx="1.2" fill="#d21538"/>
      <g fill="#ff5170"><rect x="17.6" y="23.2" width="3" height="2" rx="0.6"/><rect x="23.6" y="23.2" width="3" height="2" rx="0.6"/></g>
      <path d="M15 30 q-4 3 -2.5 7 q3.2 -2 5 -4.2 z" fill="#c81438"/>
    </svg>`,
    category: 'arcade',
    description: 'Donker ninja-overlevingsspel: monsters en geesten komen van alle kanten, je katana vliegt om je heen. Golven, power-ups en 5 hartjes. Schermvullend, met de vinger of het toetsenbord.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/schaduwbos.js'),
  },
  {
    id: 'paardensport',
    title: 'Paardensport',
    icon: ICON_PAARD,
    category: 'simulatie',
    description: 'Beheer je eigen manege: verzorg en train paarden, koop stallen en tuig, en doe mee aan springen, dressuur en races.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/paardensport.js'),
  },
];

export function getGame(id) {
  return games.find((g) => g.id === id) ?? null;
}

export function getCategory(id) {
  return categories.find((c) => c.id === id) ?? null;
}
