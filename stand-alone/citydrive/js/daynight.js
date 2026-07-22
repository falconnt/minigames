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

// Zon-gedreven slagschaduw voor gebouwen. De richting draait over de dag mee
// met de zon; de lengte is kort rond het middaguur en lang bij zonsopgang/
// -ondergang (gouden uur); 's nachts staat de zon onder en is er geen schaduw.
//   reach — lengtefactor (× gebouwhoogte) · alpha — dekking per smeer-kopie
//   dx,dy — genormaliseerde richting (van de zon af)
export function sunShadow() {
  const p = clock / CYCLE;
  const elev = Math.cos(p * 2 * Math.PI);       // 1 = middag, -1 = middernacht
  const up = Math.max(0, elev);                  // hoe hoog de zon staat
  if (up < 0.04) return { reach: 0, alpha: 0, dx: 0, dy: 0 };
  const az = p * 2 * Math.PI + Math.PI * 0.5;    // azimut draait over de dag
  return { reach: 0.6 + (1 - up) * 3.2, alpha: 0.05 + 0.055 * up, dx: -Math.cos(az), dy: -Math.sin(az) };
}

// Sfeer-waas over de scène, afhankelijk van het tijdstip:
//   warmA — warme "golden hour"-gloed, piekt bij zonsopgang/-ondergang
//   blueA — koele blauwe nachtwaas, diep in de nacht het sterkst
export function ambientOverlay() {
  const n = nightAmount();
  return {
    warmA: 0.18 * Math.sin(n * Math.PI),   // 0 bij volle dag/nacht, max bij schemering
    blueA: 0.62 * Math.pow(n, 2.2),        // vooral diep in de nacht
  };
}
