// world.js — genereert de stad éénmalig: een raster van blokken met gebouwen,
// parken en bomen. Wordt bij het importeren opgebouwd en daarna alleen gelezen
// door de renderer en de botsingsdetectie in physics.

import { CELL, ROAD, N, bPal } from './constants.js';

function generate() {
  const blocks = [];
  for (let i = 0; i < N; i++) {
    blocks[i] = [];
    for (let j = 0; j < N; j++) {
      const x = i * CELL + ROAD, y = j * CELL + ROAD, w = CELL - ROAD, h = CELL - ROAD;
      const park = Math.random() < 0.13;
      const b = { x, y, w, h, park, builds: [], trees: [] };
      if (park) {
        for (let t = 0; t < 7; t++) b.trees.push({ x: x + 40 + Math.random() * (w - 80), y: y + 40 + Math.random() * (h - 80), r: 16 + Math.random() * 10 });
      } else {
        const m = 30, cols = 1 + ((Math.random() * 2) | 0), rows = 1 + ((Math.random() * 2) | 0), gap = 20;
        const cw = (w - 2 * m - (cols - 1) * gap) / cols, ch = (h - 2 * m - (rows - 1) * gap) / rows;
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
          if (cols * rows > 1 && Math.random() < 0.12) continue;
          const ix = 6 + Math.random() * 18, iy = 6 + Math.random() * 18;
          const bx = x + m + c * (cw + gap) + ix / 2, by = y + m + r * (ch + gap) + iy / 2, bw = cw - ix, bh = ch - iy;
          const acs = []; const na = 1 + ((Math.random() * 3) | 0);
          for (let a = 0; a < na; a++) acs.push({ x: bx + 14 + Math.random() * (bw - 38), y: by + 14 + Math.random() * (bh - 38), s: 9 + Math.random() * 8 });
          b.builds.push({ x: bx, y: by, w: bw, h: bh, col: bPal[(Math.random() * bPal.length) | 0], sh: 9 + Math.random() * 7, acs });
        }
        // trottoirbomen
        for (let t = 0; t < 3; t++) if (Math.random() < 0.7) b.trees.push({ x: x + 14 + Math.random() * (w - 28), y: (Math.random() < 0.5 ? y + 13 : y + h - 13), r: 9 + Math.random() * 4 });
      }
      blocks[i][j] = b;
    }
  }
  return blocks;
}

export const blocks = generate();
