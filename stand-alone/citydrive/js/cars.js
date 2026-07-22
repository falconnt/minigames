// cars.js — de autodefinities en afgeleide statistieken.
// Zuiver: geen game-state, alleen data + pure helpers. Nieuwe auto's toevoegen
// doe je hier door een object aan DEFS te hangen.

export const DEFS = [
  { id: 'kei', name: 'Vireo Kei',  sub: 'STADSAUTO', price: 0,     top: 470, acc: 280, steer: 2.7, grip: 8.5, l: 42, w: 24, defCol: '#e8e8ec' },
  { id: 'gti', name: 'Pulse GTi',  sub: 'HOT HATCH', price: 4500,  top: 560, acc: 360, steer: 3.0, grip: 8.8, l: 44, w: 25, defCol: '#c62f39' },
  { id: 'v8',  name: 'Brutus V8',  sub: 'MUSCLE',    price: 12000, top: 660, acc: 470, steer: 2.5, grip: 7.6, l: 52, w: 28, defCol: '#1b1d22' },
  { id: 'rs',  name: 'Kitsune RS', sub: 'SPORT',     price: 25000, top: 730, acc: 540, steer: 3.3, grip: 9.4, l: 48, w: 26, defCol: '#2563c9' },
  { id: 'x',   name: 'Spectre X',  sub: 'HYPERCAR',  price: 60000, top: 850, acc: 660, steer: 3.5, grip: 9.8, l: 50, w: 27, defCol: '#8b5cf6' },
];

export const defById = (id) => DEFS.find((d) => d.id === id);

// Verse standaardconfig voor een auto (kleur, velgen, opties, upgradeniveaus).
export function mkCfg(id) {
  return { color: defById(id).defCol, rim: '#cfd6e4', spoiler: false, stripe: false, glow: null, up: { eng: 0, tur: 0, han: 0 } };
}

// Effectieve stats na upgrades. Pure functie: geef de def-id en de config mee.
export function eff(id, cfg) {
  const d = defById(id);
  return {
    top:   d.top   * (1 + 0.10 * cfg.up.eng),
    acc:   d.acc   * (1 + 0.13 * cfg.up.tur),
    steer: d.steer * (1 + 0.10 * cfg.up.han),
    grip:  d.grip  * (1 + 0.09 * cfg.up.han),
  };
}
