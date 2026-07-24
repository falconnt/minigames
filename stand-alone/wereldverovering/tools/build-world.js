// Bouwt een compacte wereld-dataset (landen + buurrelaties) uit Natural Earth 110m.
// Uitvoer: js/world-data.js  met  export const COUNTRIES  en  export const ADJ.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'ne110.geojson');
const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// ---- helpers ----------------------------------------------------------------
function ringArea(r) { // signed area (shoelace) in deg^2
  let a = 0;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
    a += (r[j][0] * r[i][1]) - (r[i][0] * r[j][1]);
  }
  return Math.abs(a) / 2;
}
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function simplify(ring, tol) { // Douglas-Peucker, ring is closed
  if (ring.length < 5) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(ring[i], ring[s], ring[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol && idx !== -1) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  const out = [];
  for (let i = 0; i < ring.length; i++) if (keep[i]) out.push(ring[i]);
  return out;
}
const r2 = (v) => Math.round(v * 100) / 100;

// ---- 1. verzamel landen -----------------------------------------------------
const SKIP = new Set(['Antarctica']);
const TOL = 0.45;          // vereenvoudigingstolerantie (graden)
const MIN_AREA = 1.2;      // minimale ring-oppervlakte om te behouden (deg^2)
const MAX_RINGS = 6;       // max aantal (grootste) ringen per land

const countries = [];
for (const f of raw.features) {
  const p = f.properties;
  if (SKIP.has(p.ADMIN) || p.CONTINENT === 'Antarctica') continue;
  const g = f.geometry;
  if (!g) continue;
  let polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  // pak per polygoon alleen de buitenring (index 0)
  let rings = polys.map((poly) => poly[0]).filter(Boolean);
  // sorteer op oppervlakte, behoud grootste
  rings = rings
    .map((r) => ({ r, a: ringArea(r) }))
    .sort((x, y) => y.a - x.a);
  const biggest = rings[0] ? rings[0].a : 0;
  rings = rings
    .filter((x, i) => i === 0 || (x.a >= MIN_AREA && x.a >= biggest * 0.006))
    .slice(0, MAX_RINGS)
    .map((x) => simplify(x.r, TOL).map((pt) => [r2(pt[0]), r2(pt[1])]))
    .filter((r) => r.length >= 4);

  if (!rings.length) continue;

  countries.push({
    id: p.ADM0_A3,
    name: p.NAME_NL || p.NAME || p.ADMIN,
    cont: p.CONTINENT,
    cx: r2(p.LABEL_X),
    cy: r2(p.LABEL_Y),
    rings,
  });
}

// unieke id's afdwingen
const seen = new Map();
for (const c of countries) {
  if (seen.has(c.id)) { let k = 2; while (seen.has(c.id + k)) k++; c.id = c.id + k; }
  seen.set(c.id, c);
}

console.error('landen:', countries.length);

// ---- 2. buurrelaties via grid-hash op verdichte grenspunten ------------------
const T = 1.5;             // afstand (graden) waaronder twee landen buren zijn
const STEP = 0.6;          // verdichtingsstap langs grenzen
const CELL = T;

function densify(ring) {
  const pts = [];
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    pts.push(a);
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d > STEP) {
      const steps = Math.floor(d / STEP);
      for (let s = 1; s <= steps; s++) {
        const t = s / (steps + 1);
        pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
  }
  return pts;
}

const grid = new Map();
const key = (gx, gy) => gx + ',' + gy;
countries.forEach((c, ci) => {
  for (const ring of c.rings) {
    for (const pt of densify(ring)) {
      const gx = Math.floor(pt[0] / CELL), gy = Math.floor(pt[1] / CELL);
      const k = key(gx, gy);
      let arr = grid.get(k);
      if (!arr) grid.set(k, (arr = []));
      arr.push([ci, pt[0], pt[1]]);
    }
  }
});

const edges = new Set();
function addEdge(a, b) { if (a !== b) edges.add(a < b ? a + '|' + b : b + '|' + a); }

for (const [k, arr] of grid) {
  const [gx, gy] = k.split(',').map(Number);
  const near = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const a2 = grid.get(key(gx + dx, gy + dy));
      if (a2) near.push(a2);
    }
  for (const [ci, x, y] of arr) {
    for (const a2 of near) {
      for (const [cj, x2, y2] of a2) {
        if (ci === cj) continue;
        if (Math.abs(x - x2) <= T && Math.abs(y - y2) <= T &&
            Math.hypot(x - x2, y - y2) <= T) addEdge(ci, cj);
      }
    }
  }
}

// adjacency-lijsten
const adj = countries.map(() => new Set());
for (const e of edges) {
  const [a, b] = e.split('|').map(Number);
  adj[a].add(b); adj[b].add(a);
}

// ---- 3. garandeer één samenhangend netwerk ----------------------------------
function centroidDist(a, b) {
  return Math.hypot(countries[a].cx - countries[b].cx, countries[a].cy - countries[b].cy);
}
function components() {
  const comp = new Array(countries.length).fill(-1);
  let c = 0;
  for (let i = 0; i < countries.length; i++) {
    if (comp[i] !== -1) continue;
    const stack = [i]; comp[i] = c;
    while (stack.length) {
      const u = stack.pop();
      for (const v of adj[u]) if (comp[v] === -1) { comp[v] = c; stack.push(v); }
    }
    c++;
  }
  return { comp, count: c };
}
// verbind losse eilanden/componenten met dichtstbijzijnde ander land tot alles verbonden is
let guard = 0;
while (true) {
  const { comp, count } = components();
  if (count <= 1 || guard++ > 500) break;
  // pak component met hoogste nummer, verbind dichtstbijzijnde land uit andere component
  const groups = {};
  comp.forEach((g, i) => (groups[g] = groups[g] || []).push(i));
  // vind het dichtstbijzijnde paar tussen twee verschillende componenten (greedy voor kleinste comp)
  const sizes = Object.entries(groups).map(([g, arr]) => [Number(g), arr.length]).sort((a, b) => a[1] - b[1]);
  const target = groups[sizes[0][0]];
  let best = null, bestD = Infinity;
  for (const a of target) {
    for (let b = 0; b < countries.length; b++) {
      if (comp[b] === comp[a]) continue;
      const d = centroidDist(a, b);
      if (d < bestD) { bestD = d; best = [a, b]; }
    }
  }
  if (!best) break;
  adj[best[0]].add(best[1]); adj[best[1]].add(best[0]);
}

const finalComp = components();
console.error('componenten na verbinden:', finalComp.count);
const degs = adj.map((s) => s.size);
console.error('buren: min', Math.min(...degs), 'max', Math.max(...degs),
  'gem', (degs.reduce((a, b) => a + b, 0) / degs.length).toFixed(1));
const isolated = degs.filter((d) => d === 0).length;
console.error('geïsoleerd:', isolated);

// ---- 4. schrijf world-data.js -----------------------------------------------
const outCountries = countries.map((c) => ({
  id: c.id, name: c.name, cont: c.cont, cx: c.cx, cy: c.cy, rings: c.rings,
}));
const adjArr = adj.map((s) => [...s].sort((a, b) => a - b));

const header = '// Automatisch gegenereerd uit Natural Earth 110m (public domain).\n' +
  '// Niet met de hand bewerken; zie scratchpad/build-world.js.\n' +
  '// COUNTRIES[i] = { id, name, cont, cx, cy, rings:[[ [lon,lat], ... ], ...] }\n' +
  '// ADJ[i] = [indexen van buurlanden]\n';

let body = 'export const COUNTRIES = [\n';
for (const c of outCountries) {
  const rings = c.rings.map((r) => '[' + r.map((p) => '[' + p[0] + ',' + p[1] + ']').join(',') + ']').join(',');
  body += `{id:${JSON.stringify(c.id)},name:${JSON.stringify(c.name)},cont:${JSON.stringify(c.cont)},cx:${c.cx},cy:${c.cy},rings:[${rings}]},\n`;
}
body += '];\n\nexport const ADJ = [\n';
for (const a of adjArr) body += '[' + a.join(',') + '],\n';
body += '];\n';

const OUT = path.join(__dirname, '..', 'js', 'world-data.js');
fs.writeFileSync(OUT, header + body);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.error('geschreven:', OUT, kb + ' KB');
