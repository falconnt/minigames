// setup.js — bouwt een nieuw spel: geeft elke speler een gelijkwaardig
// thuisgebied en vult de rest van de wereld met neutrale garnizoenen.
//
// Eerlijkheid staat hier voorop. Startplekken worden niet simpelweg "zo ver
// mogelijk uit elkaar" gekozen: het verste punt op een wereldkaart is meestal
// een afgelegen eiland zonder uitbreidingsruimte, waardoor die speler kansloos
// is. In plaats daarvan kiezen we plekken die (a) genoeg ruimte om zich heen
// hebben en (b) onderling vergelijkbaar veel ruimte hebben, en pas daarna zo
// ver mogelijk uit elkaar liggen.
import { N, GEO, neighbors } from './geo.js';
import {
  SEEDS_PER_PLAYER, SEED_TROOPS, NEUTRAL_MIN, NEUTRAL_MAX, START_GOLD, SEAT_BONUS,
} from './constants.js';

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const afstand = (a, b) => Math.hypot(GEO[a].cx - GEO[b].cx, GEO[a].cy - GEO[b].cy);

// Aantal landen dat je binnen `hops` stappen kunt bereiken = uitbreidingsruimte.
const ROOM_HOPS = 3;
function ruimte(start, hops = ROOM_HOPS) {
  const gezien = new Set([start]);
  let rand = [start];
  for (let d = 0; d < hops; d++) {
    const volgende = [];
    for (const u of rand) {
      for (const v of neighbors(u)) {
        if (gezien.has(v)) continue;
        gezien.add(v); volgende.push(v);
      }
    }
    rand = volgende;
  }
  return gezien.size;
}

// Kies één ankerland per speler: genoeg ruimte, onderling gelijkwaardig, en
// zo ver mogelijk uit elkaar.
function kiesAnkers(aantalSpelers) {
  const room = [];
  for (let i = 0; i < N; i++) room.push(ruimte(i));

  // Alleen plekken met bovengemiddelde uitbreidingsruimte komen in aanmerking.
  const gesorteerd = [...room].sort((a, b) => a - b);
  const drempel = gesorteerd[Math.floor(gesorteerd.length * 0.5)];
  const kandidaten = [];
  for (let i = 0; i < N; i++) if (room[i] >= drempel) kandidaten.push(i);

  // We bewaren meerdere góéde sets en kiezen daar willekeurig uit, zodat niet
  // elk potje op precies dezelfde plekken begint.
  const gevonden = [];
  const POGINGEN = 300;
  for (let poging = 0; poging < POGINGEN; poging++) {
    // groei een set vanaf een willekeurige kandidaat, telkens de verste erbij
    const set = [kandidaten[Math.floor(Math.random() * kandidaten.length)]];
    while (set.length < aantalSpelers) {
      let kandidaat = -1, besteMin = -1;
      for (const c of kandidaten) {
        if (set.includes(c)) continue;
        let dichtstbij = Infinity;
        for (const s of set) dichtstbij = Math.min(dichtstbij, afstand(c, s));
        if (dichtstbij > besteMin) { besteMin = dichtstbij; kandidaat = c; }
      }
      if (kandidaat < 0) break;
      set.push(kandidaat);
    }
    if (set.length < aantalSpelers) continue;

    // score: gelijke ruimte weegt het zwaarst, daarna onderlinge spreiding
    let minAfstand = Infinity;
    for (let a = 0; a < set.length; a++) {
      for (let b = a + 1; b < set.length; b++) minAfstand = Math.min(minAfstand, afstand(set[a], set[b]));
    }
    const ruimtes = set.map((i) => room[i]);
    const balans = Math.min(...ruimtes) / Math.max(...ruimtes);
    const score = balans * 2 + Math.min(minAfstand, 110) / 110;
    gevonden.push({ set, score });
  }

  // Kies willekeurig uit de beste sets: eerlijk én elke pot een andere wereld.
  gevonden.sort((a, b) => b.score - a.score);
  const top = gevonden.filter((g) => g.score >= gevonden[0].score * 0.93).slice(0, 12);
  const gekozen = (top[Math.floor(Math.random() * top.length)] || gevonden[0]).set;

  // Schud wie welk gebied krijgt, zodat stoel 1 niet altijd dezelfde regio pakt.
  const geschud = [...gekozen];
  for (let i = geschud.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [geschud[i], geschud[j]] = [geschud[j], geschud[i]];
  }
  return geschud;
}

// Laat de thuisgebieden om de beurt aangroeien langs de landsgrenzen, zodat
// niemand voorrang heeft en elk gebied aaneengesloten is.
function groeiThuisgebieden(ankers) {
  const genomen = new Set(ankers);
  const groepen = ankers.map((a) => [a]);
  const randen = ankers.map((a) => [a]);

  let klaar = false;
  while (!klaar) {
    klaar = true;
    for (let p = 0; p < groepen.length; p++) {
      if (groepen[p].length >= SEEDS_PER_PLAYER) continue;
      // pak het eerstvolgende vrije buurland van deze speler
      let toegevoegd = false;
      while (randen[p].length && !toegevoegd) {
        const u = randen[p][0];
        const vrij = neighbors(u).filter((v) => !genomen.has(v));
        if (!vrij.length) { randen[p].shift(); continue; }
        const v = vrij[0];
        genomen.add(v); groepen[p].push(v); randen[p].push(v);
        toegevoegd = true;
      }
      if (toegevoegd) klaar = false;
    }
  }
  return groepen;
}

// Verdeel de starttroepen (infanterie) over de thuisgebieden van een speler.
function verdeelSeedTroepen(groep, troops) {
  for (const i of groep) troops[i] = { inf: 1, cav: 0, art: 0 };
  let rest = Math.max(0, SEED_TROOPS - groep.length);
  let k = 0;
  while (rest-- > 0) { troops[groep[k % groep.length]].inf++; k++; }
}

export function nieuwSpel(spelerDefs) {
  const owner = new Array(N).fill(-1);
  const troops = new Array(N);
  const build = new Array(N);
  for (let i = 0; i < N; i++) {
    build[i] = { markt: 0, kazerne: 0, fort: 0 };
    troops[i] = { inf: rnd(NEUTRAL_MIN, NEUTRAL_MAX), cav: 0, art: 0 }; // neutraal garnizoen
  }

  const ankers = kiesAnkers(spelerDefs.length);
  const groepen = groeiThuisgebieden(ankers);
  groepen.forEach((groep, pi) => {
    groep.forEach((ci) => { owner[ci] = pi; });
    verdeelSeedTroepen(groep, troops);
  });

  // Wie later aan de beurt is, start met wat meer goud. Dat compenseert het
  // voordeel van de eerste zet (gemeten: zonder bonus wint stoel 1 vaker).
  const players = spelerDefs.map((pd, i) => ({
    naam: pd.naam, kleurIdx: pd.kleurIdx, goud: START_GOLD + i * SEAT_BONUS, alive: true,
  }));

  return {
    players, owner, troops, build,
    cur: 0, phase: 'inkomen', round: 1, winner: null,
  };
}
