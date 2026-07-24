// Genereert PWA-iconen: een wereldkaart (echte landvormen) in een donkere tegel.
// Dependency-vrij: eigen mini PNG-encoder via zlib.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES } from '../js/world-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.join(__dirname, '..', 'icons');

// bbox per land voor snelheid
const boxes = COUNTRIES.map((c) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of c.rings) for (const [x, y] of r) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
});
function inRing(px, py, r) {
  let inside = false;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function isLand(lon, lat) {
  for (let i = 0; i < COUNTRIES.length; i++) {
    const b = boxes[i];
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    for (const r of COUNTRIES[i].rings) if (inRing(lon, lat, r)) return true;
  }
  return false;
}

// ---- PNG-encoder ----
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

// tekent één icoon
function drawIcon(size, maskable) {
  const w = size, h = size;
  const buf = Buffer.alloc(w * h * 4);
  const R = size * (maskable ? 0.5 : 0.235);   // hoekradius (maskable ~ vol vierkant)
  const inset = maskable ? size * 0.14 : size * 0.10; // veilige marge voor de kaart
  const mapX0 = inset, mapY0 = size * (maskable ? 0.30 : 0.26);
  const mapW = size - inset * 2, mapH = mapW / 2;      // equirectangular 2:1
  const bgTop = [18, 26, 42], bgBot = [9, 14, 26];
  const ocean = [22, 58, 96], oceanDeep = [15, 40, 74];
  const land = [46, 176, 96], landHi = [86, 208, 128];

  function rounded(x, y) { // afstand-veld voor afgeronde tegel
    const cx = Math.min(Math.max(x, R), size - R), cy = Math.min(Math.max(y, R), size - R);
    return Math.hypot(x - cx, y - cy) <= R + 0.5;
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let col, a = 255;
      if (!maskable && !rounded(x, y)) { buf[i + 3] = 0; continue; }
      // achtergrond-verloop
      col = mix(bgTop, bgBot, y / h);
      // kaartgebied
      if (x >= mapX0 && x < mapX0 + mapW && y >= mapY0 && y < mapY0 + mapH) {
        const lon = ((x - mapX0) / mapW) * 360 - 180;
        const lat = 90 - ((y - mapY0) / mapH) * 180;
        const vign = 1 - 0.5 * Math.hypot((x - (mapX0 + mapW / 2)) / (mapW / 2), (y - (mapY0 + mapH / 2)) / (mapH / 2));
        if (isLand(lon, lat)) {
          col = mix(land, landHi, Math.max(0, Math.min(1, (lat + 60) / 180)));
        } else {
          col = mix(oceanDeep, ocean, Math.max(0, Math.min(1, vign)));
        }
      }
      buf[i] = Math.round(col[0]); buf[i + 1] = Math.round(col[1]); buf[i + 2] = Math.round(col[2]); buf[i + 3] = a;
    }
  }
  return encodePNG(w, h, buf);
}

fs.mkdirSync(ICONS, { recursive: true });
fs.writeFileSync(path.join(ICONS, 'icon-512.png'), drawIcon(512, false));
fs.writeFileSync(path.join(ICONS, 'icon-192.png'), drawIcon(192, false));
fs.writeFileSync(path.join(ICONS, 'icon-maskable-512.png'), drawIcon(512, true));
console.log('iconen geschreven naar', ICONS);
