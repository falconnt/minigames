// daynight.js — de dag/nacht-cyclus. Eén volledige cyclus duurt 10 minuten:
// vanaf volle dag duurt het 5 minuten tot volle nacht, en weer 5 minuten terug.
// De overgang is een soepele cosinus (zonsopgang/-ondergang).

const CYCLE = 600; // seconden voor een volledige dag+nacht (5 min dag → 5 min nacht)
let clock = 0;     // verstreken tijd binnen de cyclus, 0..CYCLE

// Elke frame vanuit de loop aangeroepen; laat de klok doorlopen.
export function tick(dt) { clock = (clock + dt) % CYCLE; }

// 0 = volle dag, 1 = volle nacht. Volle dag op clock=0, volle nacht op clock=300s.
export function nightAmount() {
  return (1 - Math.cos(clock / CYCLE * Math.PI * 2)) / 2;
}
