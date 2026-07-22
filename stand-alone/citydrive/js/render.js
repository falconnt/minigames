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
  ctx.fillStyle = '#33363c'; ctx.fillRect(0, 0, VW, VH);
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
    // gebouwen
    for (const g of b.builds) {
      ctx.fillStyle = 'rgba(0,0,0,.28)'; roundRect(ctx, g.x + g.sh * 0.7, g.y + g.sh, g.w, g.h, 8); ctx.fill();
      ctx.fillStyle = g.col; roundRect(ctx, g.x, g.y, g.w, g.h, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 2; roundRect(ctx, g.x, g.y, g.w, g.h, 8); ctx.stroke();
      ctx.fillStyle = shade(g.col, 1.14); roundRect(ctx, g.x + 8, g.y + 8, g.w - 16, g.h - 16, 5); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.20)';
      for (const a of g.acs) ctx.fillRect(a.x, a.y, a.s, a.s);
    }
    // bomen
    for (const t of b.trees) {
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.arc(t.x + 3, t.y + 4, t.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#2f5d38'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#3e7a49'; ctx.beginPath(); ctx.arc(t.x - t.r * 0.22, t.y - t.r * 0.22, t.r * 0.62, 0, 7); ctx.fill();
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

  // minimap
  mtx.clearRect(0, 0, 236, 236);
  mtx.fillStyle = 'rgba(20,22,26,.9)'; mtx.fillRect(0, 0, 236, 236);
  const sc = 236 / WORLD;
  mtx.strokeStyle = '#454b55'; mtx.lineWidth = Math.max(2, ROAD * sc);
  mtx.beginPath();
  for (let i = 0; i <= N; i++) {
    const r = (i * CELL + ROAD / 2) * sc;
    mtx.moveTo(r, 0); mtx.lineTo(r, 236); mtx.moveTo(0, r); mtx.lineTo(236, r);
  }
  mtx.stroke();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (blocks[i][j].park) {
    const b = blocks[i][j]; mtx.fillStyle = '#3d6845'; mtx.fillRect(b.x * sc, b.y * sc, b.w * sc, b.h * sc);
  }
  mtx.fillStyle = '#7ee2a8'; mtx.beginPath(); mtx.arc(P.x * sc, P.y * sc, 5, 0, 7); mtx.fill();

  speedEl.innerHTML = Math.round(spd * 0.28) + '<small>KM/U</small>';
}
