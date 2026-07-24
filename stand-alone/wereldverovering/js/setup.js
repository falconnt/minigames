// setup.js — bouwt een nieuw spel: verdeelt startlanden (seeds) gespreid over de
// spelers en vult de rest van de wereld met neutrale garnizoenen.
import { N, GEO } from './geo.js';
import {
  SEEDS_PER_PLAYER, SEED_TROOPS, NEUTRAL_MIN, NEUTRAL_MAX, START_GOLD,
} from './constants.js';

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const dist2 = (a, b) => {
  const dx = GEO[a].cx - GEO[b].cx, dy = GEO[a].cy - GEO[b].cy;
  return dx * dx + dy * dy;
};

// Kies per speler een groepje startlanden dat ver van de andere spelers ligt.
function kiesSeeds(aantalSpelers) {
  // 1) ankers: farthest-point sampling zodat spelers ver uit elkaar starten.
  const ankers = [rnd(0, N - 1)];
  while (ankers.length < aantalSpelers) {
    let best = -1, bestD = -1;
    for (let i = 0; i < N; i++) {
      if (ankers.includes(i)) continue;
      let dmin = Infinity;
      for (const a of ankers) dmin = Math.min(dmin, dist2(i, a));
      if (dmin > bestD) { bestD = dmin; best = i; }
    }
    ankers.push(best);
  }
  // 2) elke speler krijgt zijn anker + dichtstbijzijnde vrije landen erbij.
  const genomen = new Set();
  const seeds = ankers.map((anker) => {
    genomen.add(anker);
    const groep = [anker];
    while (groep.length < SEEDS_PER_PLAYER) {
      let best = -1, bestD = Infinity;
      for (let i = 0; i < N; i++) {
        if (genomen.has(i)) continue;
        const d = dist2(i, anker);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best < 0) break;
      genomen.add(best);
      groep.push(best);
    }
    return groep;
  });
  return seeds;
}

// Verdeel de starttroepen (infanterie) over de seeds van een speler.
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

  const seeds = kiesSeeds(spelerDefs.length);
  spelerDefs.forEach((pd, pi) => {
    seeds[pi].forEach((ci) => { owner[ci] = pi; troops[ci] = { inf: 1, cav: 0, art: 0 }; });
    verdeelSeedTroepen(seeds[pi], troops);
  });

  const players = spelerDefs.map((pd) => ({
    naam: pd.naam, kleurIdx: pd.kleurIdx, goud: START_GOLD, alive: true,
  }));

  return {
    players, owner, troops, build,
    cur: 0, phase: 'inkomen', round: 1, winner: null,
  };
}
