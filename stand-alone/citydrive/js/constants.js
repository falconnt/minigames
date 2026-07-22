// constants.js — vaste waarden en kleurenpaletten voor de hele game.
// Dit is een "blad"-module: hij importeert niets, zodat elke andere module
// hier veilig van kan afhangen zonder kringverwijzingen.

// Wereldraster: N x N stadsblokken van CELL groot, gescheiden door wegen (ROAD).
export const CELL = 560;
export const ROAD = 150;
export const N = 7;
export const WORLD = N * CELL + ROAD;

// Sleutel waaronder de voortgang lokaal wordt bewaard.
export const SAVE_KEY = 'citydrive.save.v1';

// Kleuren voor gebouwen.
export const bPal = ['#7d8aa0', '#8a93a6', '#98a2b4', '#6f7d95', '#a4abb9', '#8d99ad'];

// Tuning-paletten voor de garage.
export const bodyCols = ['#eef0f3', '#1b1d22', '#c62f39', '#2563c9', '#26a35c', '#e9a13b', '#8b5cf6', '#e0559a', '#7d8496', '#f5f0e6'];
export const rimCols = ['#cfd6e4', '#1a1c20', '#e3b341', '#c62f39', '#7dd3fc'];
export const glowCols = [null, '#22d3ee', '#a855f7', '#39ff88', '#ff3b5c', '#ffb020'];
