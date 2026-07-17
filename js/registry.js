// Register van alle minigames. Een nieuwe game toevoegen = één entry hier
// plus één module in games/ (zie README.md).

export const categories = [
  { id: 'puzzel', name: 'Puzzel', icon: '🧩' },
  { id: 'reflex', name: 'Reflex', icon: '⚡' },
  { id: 'simulatie', name: 'Simulatie', icon: '🏇' },
];

export const games = [
  {
    id: '2048',
    title: '2048',
    icon: '🔢',
    category: 'puzzel',
    description: 'Schuif tegels samen tot 2048. Je spel wordt automatisch bewaard.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/2048.js'),
  },
  {
    id: 'reactie',
    title: 'Reactietest',
    icon: '⚡',
    category: 'reflex',
    description: 'Klik zodra het scherm groen wordt. Vijf rondes, gemiddelde telt.',
    scoreMode: 'lower',
    formatScore: (s) => `${s} ms`,
    load: () => import('../games/reaction.js'),
  },
  {
    id: 'paardensport',
    title: 'Paardensport',
    icon: '🏇',
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
