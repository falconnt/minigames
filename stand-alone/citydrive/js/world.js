// world.js — genereert de stad éénmalig: een raster van blokken met gebouwen,
// parken en bomen. Wordt bij het importeren opgebouwd en daarna alleen gelezen
// door de renderer en de botsingsdetectie in physics.

import { CELL, ROAD, N, WORLD, bPal } from './constants.js';

function generate() {
  const blocks = [];
  for (let i = 0; i < N; i++) {
    blocks[i] = [];
    for (let j = 0; j < N; j++) {
      const x = i * CELL + ROAD, y = j * CELL + ROAD, w = CELL - ROAD, h = CELL - ROAD;
      const park = Math.random() < 0.13;
      const b = { x, y, w, h, park, builds: [], trees: [] };
      if (park) {
        // vijver in het midden(ish)
        if (Math.random() < 0.65) b.pond = { x: x + w * (0.34 + Math.random() * 0.3), y: y + h * (0.4 + Math.random() * 0.22), rx: 42 + Math.random() * 44, ry: 30 + Math.random() * 30 };
        const inPond = (px, py) => b.pond && ((px - b.pond.x) ** 2) / (b.pond.rx ** 2) + ((py - b.pond.y) ** 2) / (b.pond.ry ** 2) < 1.25;
        // slingerpad dwars door het park
        b.path = Math.random() < 0.5
          ? { x1: x + 18, y1: y + h * (0.28 + Math.random() * 0.44), x2: x + w - 18, y2: y + h * (0.28 + Math.random() * 0.44) }
          : { x1: x + w * (0.28 + Math.random() * 0.44), y1: y + 18, x2: x + w * (0.28 + Math.random() * 0.44), y2: y + h - 18 };
        // bloemen (niet in de vijver)
        b.flowers = [];
        const fcols = ['#e6607a', '#e9c14b', '#7db5ff', '#c98bff', '#ff9a5c'];
        for (let f = 0; f < 12; f++) { const fx = x + 24 + Math.random() * (w - 48), fy = y + 24 + Math.random() * (h - 48); if (!inPond(fx, fy)) b.flowers.push({ x: fx, y: fy, col: fcols[(Math.random() * fcols.length) | 0] }); }
        // bomen (niet in de vijver)
        for (let t = 0; t < 10; t++) { const tx = x + 30 + Math.random() * (w - 60), ty = y + 30 + Math.random() * (h - 60); if (!inPond(tx, ty)) b.trees.push({ x: tx, y: ty, r: 13 + Math.random() * 12 }); }
      } else {
        const m = 30, cols = 1 + ((Math.random() * 2) | 0), rows = 1 + ((Math.random() * 2) | 0), gap = 20;
        const cw = (w - 2 * m - (cols - 1) * gap) / cols, ch = (h - 2 * m - (rows - 1) * gap) / rows;
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
          if (cols * rows > 1 && Math.random() < 0.12) continue;
          const ix = 6 + Math.random() * 18, iy = 6 + Math.random() * 18;
          const bx = x + m + c * (cw + gap) + ix / 2, by = y + m + r * (ch + gap) + iy / 2, bw = cw - ix, bh = ch - iy;
          const acs = []; const na = 1 + ((Math.random() * 3) | 0);
          for (let a = 0; a < na; a++) acs.push({ x: bx + 14 + Math.random() * (bw - 38), y: by + 14 + Math.random() * (bh - 38), s: 9 + Math.random() * 8 });
          // elev = visuele hoogte voor de 3D-extrusie (muren + verlichte ramen)
          b.builds.push({ x: bx, y: by, w: bw, h: bh, col: bPal[(Math.random() * bPal.length) | 0], elev: 7 + Math.random() * 14, acs, garden: Math.random() < 0.22 });
        }
        // Van boven naar onder tekenen zodat lagere gebouwen netjes over
        // hogere heen vallen (correcte overlap bij de extrusie).
        b.builds.sort((p, q) => p.y - q.y);
        // trottoirbomen
        for (let t = 0; t < 3; t++) if (Math.random() < 0.7) b.trees.push({ x: x + 14 + Math.random() * (w - 28), y: (Math.random() < 0.5 ? y + 13 : y + h - 13), r: 9 + Math.random() * 4 });
      }
      blocks[i][j] = b;
    }
  }
  return blocks;
}

export const blocks = generate();

// Wegdecoratie: reflecterende plassen en putdeksels, verspreid over de wegen.
// Eénmalig opgebouwd; render.js tekent ze (plassen met tijd-afhankelijke reflectie).
export const puddles = [];
export const manholes = [];
(function decorateRoads() {
  for (let n = 0; n < 32; n++) {
    if (Math.random() < 0.5) { const xi = ((Math.random() * (N + 1)) | 0) * CELL + ROAD / 2;
      puddles.push({ x: xi + (Math.random() - 0.5) * ROAD * 0.55, y: ROAD + Math.random() * (WORLD - 2 * ROAD), rx: 26 + Math.random() * 30, ry: 13 + Math.random() * 15, ph: Math.random() * 6.28 });
    } else { const yj = ((Math.random() * (N + 1)) | 0) * CELL + ROAD / 2;
      puddles.push({ x: ROAD + Math.random() * (WORLD - 2 * ROAD), y: yj + (Math.random() - 0.5) * ROAD * 0.55, rx: 26 + Math.random() * 30, ry: 13 + Math.random() * 15, ph: Math.random() * 6.28 });
    }
  }
  for (let n = 0; n < 42; n++) {
    if (Math.random() < 0.5) manholes.push({ x: ((Math.random() * (N + 1)) | 0) * CELL + ROAD / 2 + (Math.random() - 0.5) * ROAD * 0.5, y: ROAD + Math.random() * (WORLD - 2 * ROAD) });
    else manholes.push({ x: ROAD + Math.random() * (WORLD - 2 * ROAD), y: ((Math.random() * (N + 1)) | 0) * CELL + ROAD / 2 + (Math.random() - 0.5) * ROAD * 0.5 });
  }
})();

// Twee gebouwen dicht bij de startplek zijn winkels: de GARAGE (tunen/upgraden)
// en de AUTODEALER (auto's kopen). Je rijdt voor de deur en het menu opent vanzelf.
// De deur/pui staat op de noordkant; de trigger is het pleintje daarvoor.
function makeShop(gi, gj, col, flag) {
  const gx = gi * CELL + ROAD, gy = gj * CELL + ROAD, gw = CELL - ROAD, gh = CELL - ROAD;
  const bx = gx + 50, by = gy + 140, bw = gw - 100, bh = gh - 190;
  const b = blocks[gi][gj];
  b.park = false; b.trees = []; b.pond = null; b.path = null; b.flowers = null;
  const bld = { x: bx, y: by, w: bw, h: bh, col, elev: 18, acs: [], garden: false };
  bld[flag] = true;
  b.builds = [bld];
  return { x: bx, y: by, w: bw, h: bh, trigger: { x: bx + bw * 0.16, y: by - 108, w: bw * 0.68, h: 116 } };
}
export const garageSpot = makeShop(3, 3, '#586273', 'isGarage');
export const dealerSpot = makeShop(2, 3, '#3a5566', 'isDealer');
