// geo.js — aardrijkskunde: projectie, landvormen, buurlanden en "welk land
// zit onder deze schermpositie". Werkt met de gegenereerde wereld-data.
import { COUNTRIES, ADJ } from './world-data.js';

export const N = COUNTRIES.length;
export { COUNTRIES, ADJ };

// Equirectangular "graden-ruimte": X = 0..360 (lon+180), Y = 0..180 (90-lat).
export const WORLD_W = 360;
export const WORLD_H = 180;
export const toX = (lon) => lon + 180;
export const toY = (lat) => 90 - lat;

// Voorbereide, geprojecteerde ringen + bounding boxes per land (in X/Y-ruimte).
export const GEO = COUNTRIES.map((c) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const rings = c.rings.map((r) => {
    const pts = new Array(r.length);
    for (let i = 0; i < r.length; i++) {
      const X = toX(r[i][0]), Y = toY(r[i][1]);
      pts[i] = [X, Y];
      if (X < x0) x0 = X; if (X > x1) x1 = X;
      if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
    return pts;
  });
  return {
    rings,
    bbox: [x0, y0, x1, y1],
    cx: toX(c.cx), cy: toY(c.cy),          // labelpunt in X/Y-ruimte
    name: c.name, cont: c.cont, id: c.id,
  };
});

// Landen per continent (voor continent-bonus).
export const CONTINENTS = (() => {
  const m = {};
  COUNTRIES.forEach((c, i) => { (m[c.cont] = m[c.cont] || []).push(i); });
  return m;
})();

// Buren van een land.
export const neighbors = (i) => ADJ[i];

// Punt-in-ring (ray casting).
function inRing(X, Y, r) {
  let inside = false;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (((yi > Y) !== (yj > Y)) && (X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Welk land ligt op (X,Y) in graden-ruimte? -1 = zee.
export function countryAt(X, Y) {
  for (let i = 0; i < GEO.length; i++) {
    const b = GEO[i].bbox;
    if (X < b[0] || X > b[2] || Y < b[1] || Y > b[3]) continue;
    for (const r of GEO[i].rings) if (inRing(X, Y, r)) return i;
  }
  return -1;
}
