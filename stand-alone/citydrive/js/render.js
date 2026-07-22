// render.js — tekent één frame van de wereld: wegmarkering, remsporen, blokken
// (stoep, gebouwen, bomen, parken), rook, de auto en score-popups. Verzorgt ook
// de minimap en de snelheidsmeter. Bezit het hoofd-canvas en de resize-logica.

import { CELL, ROAD, N, WORLD } from './constants.js';
import { blocks } from './world.js';
import { state, P, cam } from './state.js';
import { skids, smoke, popups } from './fx.js';
import { drawCar, roundRect, shade } from './draw-car.js';
import { defById } from './cars.js';
import { input } from './input.js';
import { nightAmount } from './daynight.js';

const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const miniCv = document.getElementById('mini'), mtx = miniCv.getContext('2d');
const speedEl = document.getElementById('speed');

let DPR = Math.min(devicePixelRatio || 1, 2), VW = 0, VH = 0;

function resize() {
  VW = innerWidth; VH = innerHeight;
  cv.width = VW * DPR; cv.height = VH * DPR;
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

export function initRender() {
  resize();
  addEventListener('resize', resize);
}

export function render(spd) {
  const night = nightAmount();
  ctx.fillStyle = '#2f3238'; ctx.fillRect(0, 0, VW, VH);
  const z = cam.z;
  ctx.save();
  ctx.translate(VW / 2, VH / 2); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
  const x0 = cam.x - VW / 2 / z - 60, x1 = cam.x + VW / 2 / z + 60, y0 = cam.y - VH / 2 / z - 60, y1 = cam.y + VH / 2 / z + 60;

  // wegmarkering
  ctx.strokeStyle = 'rgba(255,255,255,.30)'; ctx.lineWidth = 3; ctx.setLineDash([26, 34]);
  for (let i = 0; i <= N; i++) {
    const rx = i * CELL + ROAD / 2;
    if (rx > x0 && rx < x1) { ctx.beginPath(); ctx.moveTo(rx, Math.max(0, y0)); ctx.lineTo(rx, Math.min(WORLD, y1)); ctx.stroke(); }
  }
  for (let j = 0; j <= N; j++) {
    const ry = j * CELL + ROAD / 2;
    if (ry > y0 && ry < y1) { ctx.beginPath(); ctx.moveTo(Math.max(0, x0), ry); ctx.lineTo(Math.min(WORLD, x1), ry); ctx.stroke(); }
  }
  ctx.setLineDash([]);

  // remsporen
  ctx.strokeStyle = 'rgba(15,15,18,.30)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const s of skids) { if (s.x1 > x0 && s.x1 < x1 && s.y1 > y0 && s.y1 < y1) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); } }
  ctx.stroke();

  // blokken (alleen de zichtbare)
  const i0 = Math.max(0, ((x0) / CELL | 0)), i1 = Math.min(N - 1, ((x1) / CELL | 0));
  const j0 = Math.max(0, ((y0) / CELL | 0)), j1 = Math.min(N - 1, ((y1) / CELL | 0));
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const b = blocks[i][j];
    if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
    // stoep
    ctx.fillStyle = '#8f959d'; roundRect(ctx, b.x, b.y, b.w, b.h, 20); ctx.fill();
    // binnenterrein
    ctx.fillStyle = b.park ? '#4a7d52' : '#4a4e56';
    roundRect(ctx, b.x + 22, b.y + 22, b.w - 44, b.h - 44, 14); ctx.fill();
    // gebouwen — lichte 3D-extrusie (muren + dak) met verlichte ramen
    for (const g of b.builds) {
      const ox = g.elev * 0.5, oy = g.elev * 0.72;
      // grondschaduw
      ctx.fillStyle = 'rgba(0,0,0,.30)';
      roundRect(ctx, g.x + ox + 2, g.y + oy + 3, g.w, g.h, 8); ctx.fill();
      // ondervlak (muur)
      ctx.fillStyle = shade(g.col, 0.66);
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + g.h); ctx.lineTo(g.x + g.w, g.y + g.h);
      ctx.lineTo(g.x + g.w + ox, g.y + g.h + oy); ctx.lineTo(g.x + ox, g.y + g.h + oy); ctx.closePath(); ctx.fill();
      // rechtervlak (muur)
      ctx.fillStyle = shade(g.col, 0.52);
      ctx.beginPath();
      ctx.moveTo(g.x + g.w, g.y); ctx.lineTo(g.x + g.w + ox, g.y + oy);
      ctx.lineTo(g.x + g.w + ox, g.y + g.h + oy); ctx.lineTo(g.x + g.w, g.y + g.h); ctx.closePath(); ctx.fill();
      // verlichte ramen op de muren (deterministisch patroon, geen geflikker)
      if (g.elev > 8) {
        const wh = Math.max(2, oy * 0.34), ww = Math.max(2, ox * 0.34);
        // Ramen lichten 's nachts op (warm) en zijn overdag vrijwel uit.
        const litWin = `rgba(255,214,138,${(0.1 + 0.85 * night).toFixed(3)})`;
        const darkWin = 'rgba(18,20,26,.5)';
        for (let wx = g.x + 5; wx < g.x + g.w - 3; wx += 7) {
          ctx.fillStyle = ((Math.round(wx) + Math.round(g.y)) % 3) !== 0 ? litWin : darkWin;
          ctx.fillRect(wx + ox * 0.35, g.y + g.h + oy * 0.3, 3, wh);
        }
        for (let wy = g.y + 5; wy < g.y + g.h - 3; wy += 7) {
          ctx.fillStyle = ((Math.round(wy) + Math.round(g.x)) % 3) === 0 ? litWin : darkWin;
          ctx.fillRect(g.x + g.w + ox * 0.3, wy + oy * 0.35, ww, 3);
        }
      }
      // dak
      ctx.fillStyle = g.col; roundRect(ctx, g.x, g.y, g.w, g.h, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.5; roundRect(ctx, g.x, g.y, g.w, g.h, 7); ctx.stroke();
      // parapet / dakpaneel
      ctx.fillStyle = shade(g.col, 1.12); roundRect(ctx, g.x + 6, g.y + 6, g.w - 12, g.h - 12, 5); ctx.fill();
      // dakunits (airco/opbouw) met lichtrandje
      for (const a of g.acs) {
        ctx.fillStyle = shade(g.col, 0.8); ctx.fillRect(a.x, a.y, a.s, a.s);
        ctx.fillStyle = shade(g.col, 1.28); ctx.fillRect(a.x, a.y, a.s, Math.max(1, a.s * 0.3));
      }
    }
    // bomen — zachte schaduw + bladerdek met gradient en highlight
    for (const t of b.trees) {
      ctx.fillStyle = 'rgba(0,0,0,.24)';
      ctx.beginPath(); ctx.ellipse(t.x + t.r * 0.3, t.y + t.r * 0.42, t.r * 0.98, t.r * 0.82, 0, 0, 7); ctx.fill();
      const tg = ctx.createRadialGradient(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.2, t.x, t.y, t.r);
      tg.addColorStop(0, '#4f9058'); tg.addColorStop(1, '#244f31');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(160,214,160,.22)'; ctx.beginPath(); ctx.arc(t.x - t.r * 0.28, t.y - t.r * 0.28, t.r * 0.42, 0, 7); ctx.fill();
    }
  }

  // rook
  for (let k = smoke.length - 1; k >= 0; k--) {
    const p = smoke[k]; p.t += 0.016; p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.r += 14 * 0.016;
    if (p.t > 0.8) { smoke.splice(k, 1); continue; }
    ctx.fillStyle = `rgba(210,212,218,${0.28 * (1 - p.t / 0.8)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }

  // auto
  const def = defById(state.current), cfg = state.cfg[state.current];
  drawCar(ctx, P.x, P.y, P.ang, P.steerVis, def, cfg, input.th < -0.05 || input.hb, 1);

  // popups
  ctx.textAlign = 'center'; ctx.font = '700 15px -apple-system,system-ui,sans-serif';
  for (let k = popups.length - 1; k >= 0; k--) {
    const p = popups[k]; p.t += 0.016;
    if (p.t > 1.4) { popups.splice(k, 1); continue; }
    ctx.globalAlpha = Math.min(1, 2 * (1.4 - p.t));
    ctx.fillStyle = p.col; ctx.fillText(p.txt, p.x, p.y - p.t * 34); ctx.globalAlpha = 1;
  }
  ctx.restore();

  // sfeer: zacht vignet naar de schermranden
  const vg = ctx.createRadialGradient(VW / 2, VH * 0.44, Math.min(VW, VH) * 0.30, VW / 2, VH * 0.52, Math.max(VW, VH) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.40)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);

  // ---------- nacht ----------
  if (night > 0.02) {
    // donkerblauwe waas over de hele scène
    ctx.fillStyle = `rgba(6,10,30,${(0.6 * night).toFixed(3)})`;
    ctx.fillRect(0, 0, VW, VH);

    // additief licht: straatlantaarns op kruispunten + koplampen van de speler
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i <= N; i++) {
      const wx = i * CELL + ROAD / 2; if (wx < x0 || wx > x1) continue;
      for (let j = 0; j <= N; j++) {
        const wy = j * CELL + ROAD / 2; if (wy < y0 || wy > y1) continue;
        const lx = VW / 2 + (wx - cam.x) * z, ly = VH / 2 + (wy - cam.y) * z, lr = 92 * z;
        const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
        lg.addColorStop(0, `rgba(255,206,128,${(0.22 * night).toFixed(3)})`);
        lg.addColorStop(1, 'rgba(255,206,128,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 7); ctx.fill();
      }
    }
    // koplampstralen van de speler (schermruimte, additief)
    const pdef = defById(state.current);
    const psx = VW / 2 + (P.x - cam.x) * z, psy = VH / 2 + (P.y - cam.y) * z;
    ctx.translate(psx, psy); ctx.rotate(P.ang); ctx.scale(z, z);
    const L = pdef.l, W = pdef.w;
    for (const side of [-1, 1]) {
      const oyb = side * W * 0.30;
      const bg = ctx.createLinearGradient(L * 0.5, 0, L * 3.6, 0);
      bg.addColorStop(0, `rgba(255,244,198,${(0.26 * night).toFixed(3)})`);
      bg.addColorStop(1, 'rgba(255,244,198,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(L * 0.48, oyb - W * 0.12); ctx.lineTo(L * 3.6, oyb - W * 1.15);
      ctx.lineTo(L * 3.6, oyb + W * 1.15); ctx.lineTo(L * 0.48, oyb + W * 0.12);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- minimap (stadskaart) ----------
  const sc = 236 / WORLD;
  mtx.clearRect(0, 0, 236, 236);
  mtx.save();
  roundRect(mtx, 0, 0, 236, 236, 30); mtx.clip();               // afgeronde kaart
  const bgG = mtx.createLinearGradient(0, 0, 0, 236);            // achtergrond = wegennet
  bgG.addColorStop(0, '#14171e'); bgG.addColorStop(1, '#0c0e13');
  mtx.fillStyle = bgG; mtx.fillRect(0, 0, 236, 236);
  // wegen: subtiele lijnen langs de rasterassen
  mtx.strokeStyle = 'rgba(120,132,150,.16)'; mtx.lineWidth = Math.max(1.5, ROAD * sc * 0.6);
  mtx.beginPath();
  for (let i = 0; i <= N; i++) { const r = (i * CELL + ROAD / 2) * sc; mtx.moveTo(r, 0); mtx.lineTo(r, 236); mtx.moveTo(0, r); mtx.lineTo(236, r); }
  mtx.stroke();
  // blokken als afgeronde cellen: parken groen, bebouwing blauwgrijs
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const b = blocks[i][j], bx = b.x * sc, by = b.y * sc, bw = b.w * sc, bh = b.h * sc;
    mtx.fillStyle = b.park ? '#356b45' : '#39414f';
    roundRect(mtx, bx, by, bw, bh, 2.5); mtx.fill();
    if (!b.park) { mtx.fillStyle = 'rgba(255,255,255,.05)'; roundRect(mtx, bx, by, bw, bh * 0.5, 2.5); mtx.fill(); }
  }
  // nacht-waas + stadslichtjes bovenop
  if (night > 0.02) {
    mtx.fillStyle = `rgba(8,12,32,${(0.45 * night).toFixed(3)})`; mtx.fillRect(0, 0, 236, 236);
    if (night > 0.15) {
      mtx.fillStyle = `rgba(255,205,130,${(0.65 * night).toFixed(3)})`;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (!blocks[i][j].park) {
        const b = blocks[i][j]; mtx.fillRect(b.x * sc + b.w * sc * 0.5 - 1, b.y * sc + b.h * sc * 0.5 - 1, 2, 2);
      }
    }
  }
  // zichtbaar gebied (viewport-kader)
  mtx.strokeStyle = 'rgba(255,255,255,.20)'; mtx.lineWidth = 1;
  mtx.strokeRect(x0 * sc, y0 * sc, (x1 - x0) * sc, (y1 - y0) * sc);
  // speler: halo + kijkkegel + kompas-driehoek
  const px = P.x * sc, py = P.y * sc;
  mtx.fillStyle = 'rgba(126,226,168,.22)'; mtx.beginPath(); mtx.arc(px, py, 8, 0, 7); mtx.fill();
  mtx.save(); mtx.translate(px, py); mtx.rotate(P.ang);
  const cone = mtx.createLinearGradient(0, 0, 28, 0);
  cone.addColorStop(0, 'rgba(126,226,168,.38)'); cone.addColorStop(1, 'rgba(126,226,168,0)');
  mtx.fillStyle = cone; mtx.beginPath(); mtx.moveTo(0, 0); mtx.lineTo(28, -14); mtx.lineTo(28, 14); mtx.closePath(); mtx.fill();
  mtx.fillStyle = '#7ee2a8'; mtx.beginPath(); mtx.moveTo(8, 0); mtx.lineTo(-5, -5); mtx.lineTo(-5, 5); mtx.closePath(); mtx.fill();
  mtx.strokeStyle = 'rgba(255,255,255,.7)'; mtx.lineWidth = 1; mtx.stroke();
  mtx.restore();
  // subtiele binnenrand
  mtx.strokeStyle = 'rgba(255,255,255,.06)'; mtx.lineWidth = 2; roundRect(mtx, 1, 1, 234, 234, 29); mtx.stroke();
  mtx.restore();

  speedEl.innerHTML = Math.round(spd * 0.28) + '<small>KM/U</small>';
}
