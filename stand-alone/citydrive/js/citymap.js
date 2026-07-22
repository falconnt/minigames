// citymap.js — tekent de stadskaart, geschaald naar een vierkant van `size` px.
// Gedeeld door de kleine minimap (render.js) en de grote uitklapkaart (map.js),
// zodat beide er identiek uitzien. Alle maten schalen mee via k = size/236.

import { CELL, ROAD, N, WORLD } from './constants.js';
import { blocks } from './world.js';
import { roundRect } from './draw-car.js';

// night: 0..1 · view: {x0,y0,x1,y1} zichtbaar wereldgebied (of null)
// player: {x,y,ang} (of null)
export function drawCityMap(ctx, size, night, view, player) {
  const sc = size / WORLD, k = size / 236;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  roundRect(ctx, 0, 0, size, size, 30 * k); ctx.clip();        // afgeronde kaart
  const bgG = ctx.createLinearGradient(0, 0, 0, size);          // achtergrond = wegennet
  bgG.addColorStop(0, '#14171e'); bgG.addColorStop(1, '#0c0e13');
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, size, size);
  // wegen langs de rasterassen
  ctx.strokeStyle = 'rgba(120,132,150,.16)'; ctx.lineWidth = Math.max(1.5 * k, ROAD * sc * 0.6);
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const r = (i * CELL + ROAD / 2) * sc; ctx.moveTo(r, 0); ctx.lineTo(r, size); ctx.moveTo(0, r); ctx.lineTo(size, r); }
  ctx.stroke();
  // blokken als afgeronde cellen: parken groen, bebouwing blauwgrijs
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const b = blocks[i][j], bx = b.x * sc, by = b.y * sc, bw = b.w * sc, bh = b.h * sc;
    ctx.fillStyle = b.park ? '#356b45' : '#39414f';
    roundRect(ctx, bx, by, bw, bh, 2.5 * k); ctx.fill();
    if (!b.park) { ctx.fillStyle = 'rgba(255,255,255,.05)'; roundRect(ctx, bx, by, bw, bh * 0.5, 2.5 * k); ctx.fill(); }
  }
  // nacht-waas + stadslichtjes bovenop
  if (night > 0.02) {
    ctx.fillStyle = `rgba(8,12,32,${(0.45 * night).toFixed(3)})`; ctx.fillRect(0, 0, size, size);
    if (night > 0.15) {
      ctx.fillStyle = `rgba(255,205,130,${(0.65 * night).toFixed(3)})`;
      const d = Math.max(2, 2 * k);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (!blocks[i][j].park) {
        const b = blocks[i][j]; ctx.fillRect(b.x * sc + b.w * sc * 0.5 - d / 2, b.y * sc + b.h * sc * 0.5 - d / 2, d, d);
      }
    }
  }
  // zichtbaar gebied (viewport-kader)
  if (view) {
    ctx.strokeStyle = 'rgba(255,255,255,.20)'; ctx.lineWidth = Math.max(1, k);
    ctx.strokeRect(view.x0 * sc, view.y0 * sc, (view.x1 - view.x0) * sc, (view.y1 - view.y0) * sc);
  }
  // speler: halo + kijkkegel + kompas-driehoek
  if (player) {
    const px = player.x * sc, py = player.y * sc;
    ctx.fillStyle = 'rgba(126,226,168,.22)'; ctx.beginPath(); ctx.arc(px, py, 8 * k, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(px, py); ctx.rotate(player.ang);
    const cone = ctx.createLinearGradient(0, 0, 28 * k, 0);
    cone.addColorStop(0, 'rgba(126,226,168,.38)'); cone.addColorStop(1, 'rgba(126,226,168,0)');
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28 * k, -14 * k); ctx.lineTo(28 * k, 14 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7ee2a8'; ctx.beginPath(); ctx.moveTo(8 * k, 0); ctx.lineTo(-5 * k, -5 * k); ctx.lineTo(-5 * k, 5 * k); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1, k); ctx.stroke();
    ctx.restore();
  }
  // subtiele binnenrand
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 2 * k; roundRect(ctx, 1 * k, 1 * k, size - 2 * k, size - 2 * k, 29 * k); ctx.stroke();
  ctx.restore();
}
