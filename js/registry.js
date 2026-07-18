// Register van alle minigames. Een nieuwe game toevoegen = één entry hier
// plus één module in games/ (zie README.md).

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
    icon: '🐦',
    category: 'arcade',
    description: 'Tik of druk op spatie om te fladderen en vlieg zo ver mogelijk tussen de buizen door.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/vogelvlucht.js'),
  },
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
    id: 'tetris',
    title: 'Blokjes',
    icon: '🟩',
    category: 'puzzel',
    description: 'Tetris met Minecraft-blokken! Stapel gras, diamant en goud tot volle rijen. Speel met je vinger, de muis of het toetsenbord.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/tetris.js'),
  },
  {
    id: 'ruimteschieter',
    title: 'Ruimteschieter',
    icon: '🚀',
    category: 'arcade',
    description: 'Neon space-shooter: knal in je gloeiende ruimteschip de aanvallende vijanden uit de lucht en ontwijk hun schoten. Schermvullend, met de vinger of het toetsenbord.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} punten`,
    load: () => import('../games/ruimteschieter.js'),
  },
  {
    id: 'racen',
    title: 'Racen',
    icon: '🏎️',
    category: 'arcade',
    description: 'Scheur over de weg, ontwijk de tegenliggers en pak munten. Steeds sneller, met turbo! Schermvullend, met de vinger of het toetsenbord.',
    scoreMode: 'higher',
    formatScore: (s) => `${s} m`,
    load: () => import('../games/racen.js'),
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
