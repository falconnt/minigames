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
    title: 'Vogel Vlucht',
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
    icon: `<svg viewBox="0 0 48 48" width="1.1em" height="1.1em" style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" aria-label="Racen">
      <defs>
        <linearGradient id="rc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#182a52"/><stop offset="1" stop-color="#5a1f5e"/></linearGradient>
        <linearGradient id="rc-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe14d"/><stop offset="1" stop-color="#ff8a1e"/></linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="11" fill="url(#rc-bg)"/>
      <g fill="#7fe9ff" opacity="0.85"><rect x="3" y="19" width="12" height="2.4" rx="1.2"/><rect x="2" y="25" width="9" height="2.4" rx="1.2"/><rect x="4" y="31" width="11" height="2.4" rx="1.2"/></g>
      <g><rect x="33" y="4" width="10" height="7" rx="1" fill="#fff"/><g fill="#151515"><rect x="33" y="4" width="2.5" height="1.75"/><rect x="38" y="4" width="2.5" height="1.75"/><rect x="35.5" y="5.75" width="2.5" height="1.75"/><rect x="40.5" y="5.75" width="2.5" height="1.75"/><rect x="33" y="7.5" width="2.5" height="1.75"/><rect x="38" y="7.5" width="2.5" height="1.75"/><rect x="35.5" y="9.25" width="2.5" height="1.75"/><rect x="40.5" y="9.25" width="2.5" height="1.75"/></g></g>
      <path d="M8 32 C8 27 13 24 19 23 C23 18 29 16 34 17 C39 18 43 22 44 27 C44 30 43 32 41 33 L10 33 C8.5 33 8 32.6 8 32 Z" fill="url(#rc-body)" stroke="#7a3d00" stroke-width="0.8"/>
      <path d="M22 22.5 C25 19.5 30 18.5 33 19.5 L35 23 L21.5 23 Z" fill="#0c1830" opacity="0.9"/>
      <rect x="12" y="28.4" width="27" height="2" rx="1" fill="#e63946"/>
      <circle cx="42.5" cy="26" r="1.5" fill="#fffbe0"/>
      <g><circle cx="17" cy="33" r="5.2" fill="#15171c"/><circle cx="17" cy="33" r="2" fill="#9aa3b0"/><circle cx="35" cy="33" r="5.2" fill="#15171c"/><circle cx="35" cy="33" r="2" fill="#9aa3b0"/></g>
    </svg>`,
    category: 'arcade',
    description: 'Scheur over de weg, ontwijk de tegenliggers en pak munten. Steeds sneller, met turbo! Schermvullend, met de vinger of het toetsenbord.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} m`,
    load: () => import('../games/racen.js'),
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
