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
import { nightAmount, ambientOverlay } from './daynight.js';
import { drawCityMap } from './citymap.js';
import { boostFx } from './boost.js';
import { drawParticles } from './particles.js';

const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const miniCv = document.getElementById('mini'), mtx = miniCv.getContext('2d');
const speedEl = document.getElementById('speed');
const boostMeterEl = document.getElementById('boostMeter'), boostFillEl = document.getElementById('boostFill');

let DPR = Math.min(devicePixelRatio || 1, 2), VW = 0, VH = 0;
let animT = 0; // vrij lopende klok voor kleine animaties (water e.d.)

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
  animT += 0.016;
  // buiten de wereld: donkere rand ("out of bounds"), zodat de stad een duidelijke grens heeft
  ctx.fillStyle = '#191b20'; ctx.fillRect(0, 0, VW, VH);
  const z = cam.z;
  ctx.save();
  // screen-shake (nitro/botsingen)
  const shk = boostFx.shake;
  const sax = shk ? (Math.random() - 0.5) * shk * 16 : 0, say = shk ? (Math.random() - 0.5) * shk * 16 : 0;
  ctx.translate(VW / 2 + sax, VH / 2 + say); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
  const x0 = cam.x - VW / 2 / z - 60, x1 = cam.x + VW / 2 / z + 60, y0 = cam.y - VH / 2 / z - 60, y1 = cam.y + VH / 2 / z + 60;

  // wegdek: gevuld tot de wereldgrens; alles daarbuiten blijft de donkere rand
  ctx.fillStyle = '#2f3238'; ctx.fillRect(0, 0, WORLD, WORLD);
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 12; ctx.strokeRect(0, 0, WORLD, WORLD);

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

  // zebrapaden op de kruispunten (per arm een reeks strepen)
  ctx.fillStyle = 'rgba(228,231,236,.28)';
  const cwLen = 24, sw = 10, step = 20, half = ROAD / 2;
  for (let i = 0; i <= N; i++) {
    const xi = i * CELL + ROAD / 2; if (xi < x0 - ROAD || xi > x1 + ROAD) continue;
    for (let j = 0; j <= N; j++) {
      const yj = j * CELL + ROAD / 2; if (yj < y0 - ROAD || yj > y1 + ROAD) continue;
      // noord- en zuidarm: verticale strepen (armen buiten de wereld overslaan)
      for (let sx = xi - half + 6; sx < xi + half - 6; sx += step) {
        if (j > 0) ctx.fillRect(sx, yj - half - cwLen, sw, cwLen);
        if (j < N) ctx.fillRect(sx, yj + half, sw, cwLen);
      }
      // oost- en westarm: horizontale strepen
      for (let sy = yj - half + 6; sy < yj + half - 6; sy += step) {
        if (i < N) ctx.fillRect(xi + half, sy, cwLen, sw);
        if (i > 0) ctx.fillRect(xi - half - cwLen, sy, cwLen, sw);
      }
    }
  }

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
    // subtiele stoeprand
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2; roundRect(ctx, b.x + 3, b.y + 3, b.w - 6, b.h - 6, 18); ctx.stroke();
    // parkdetail: wandelpad, vijver, bloemen (bomen komen in de bomen-lus erna)
    if (b.park) {
      if (b.path) { ctx.strokeStyle = '#9a9179'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.path.x1, b.path.y1); ctx.lineTo(b.path.x2, b.path.y2); ctx.stroke(); }
      if (b.pond) {
        const pd = b.pond;
        ctx.fillStyle = '#2f6f86'; ctx.beginPath(); ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, 7); ctx.fill();
        const wg = ctx.createRadialGradient(pd.x - pd.rx * 0.3, pd.y - pd.ry * 0.35, 2, pd.x, pd.y, pd.rx);
        wg.addColorStop(0, 'rgba(150,215,230,.55)'); wg.addColorStop(1, 'rgba(150,215,230,0)');
        ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, 7); ctx.fill();
        // bewegende glinstering op het water
        ctx.save(); ctx.beginPath(); ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, 7); ctx.clip();
        ctx.strokeStyle = 'rgba(205,238,248,.28)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const yy = pd.y + Math.sin(animT * 1.2 + k * 2.1) * pd.ry * 0.28 + (k - 1) * pd.ry * 0.42;
          ctx.beginPath(); ctx.ellipse(pd.x, yy, pd.rx * 0.62, 1.6, 0, 0, 7); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(pd.x, pd.y, pd.rx, pd.ry, 0, 0, 7); ctx.stroke();
      }
      if (b.flowers) for (const f of b.flowers) { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, 2.6, 0, 7); ctx.fill(); }
    }
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
      // parapet / dakpaneel — soms een daktuin
      if (g.garden) {
        ctx.fillStyle = '#3f7a48'; roundRect(ctx, g.x + 6, g.y + 6, g.w - 12, g.h - 12, 5); ctx.fill();
        ctx.fillStyle = 'rgba(28,58,34,.5)';
        for (let hy = g.y + 11; hy < g.y + g.h - 8; hy += 9) ctx.fillRect(g.x + 10, hy, g.w - 20, 3);
      } else {
        ctx.fillStyle = shade(g.col, 1.12); roundRect(ctx, g.x + 6, g.y + 6, g.w - 12, g.h - 12, 5); ctx.fill();
        // dakunits (airco/opbouw) met lichtrandje
        for (const a of g.acs) {
          ctx.fillStyle = shade(g.col, 0.8); ctx.fillRect(a.x, a.y, a.s, a.s);
          ctx.fillStyle = shade(g.col, 1.28); ctx.fillRect(a.x, a.y, a.s, Math.max(1, a.s * 0.3));
        }
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

  // sfeerdeeltjes (blaadjes overdag, warme lichtjes 's nachts)
  drawParticles(ctx, { x0, y0, x1, y1 }, night);

  // auto
  const def = defById(state.current), cfg = state.cfg[state.current];
  // nitro-vlammen achter de auto
  if (boostFx.active) {
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.ang);
    ctx.globalCompositeOperation = 'lighter';
    const L = def.l, W = def.w;
    for (const side of [-0.32, 0.32]) {
      const fl = L * (0.5 + Math.random() * 0.55);
      const g = ctx.createLinearGradient(-L * 0.5, 0, -L * 0.5 - fl, 0);
      g.addColorStop(0, 'rgba(190,244,255,.9)'); g.addColorStop(0.45, 'rgba(70,150,255,.6)'); g.addColorStop(1, 'rgba(70,150,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-L * 0.5, side * W - W * 0.16); ctx.lineTo(-L * 0.5 - fl, side * W); ctx.lineTo(-L * 0.5, side * W + W * 0.16);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
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

  // ---------- sfeer: kleurgradatie over de dag/nachtcyclus ----------
  const amb = ambientOverlay();
  if (amb.warmA > 0.003) { ctx.fillStyle = `rgba(255,150,70,${amb.warmA.toFixed(3)})`; ctx.fillRect(0, 0, VW, VH); }
  if (amb.blueA > 0.003) { ctx.fillStyle = `rgba(6,10,30,${amb.blueA.toFixed(3)})`; ctx.fillRect(0, 0, VW, VH); }

  // ---------- nacht: kunstlicht ----------
  if (night > 0.02) {
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

  // speed-lines: radiale strepen bij hoge snelheid, extra fel tijdens nitro
  let slI = Math.max(0, (spd - 460) / 380);
  if (boostFx.active) slI = Math.min(1, Math.max(slI, 0.6) + 0.4);
  slI = Math.min(1, slI);
  if (slI > 0.03) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${(0.16 * slI).toFixed(3)})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const cxs = VW / 2, cys = VH / 2, r0 = Math.min(VW, VH) * 0.32, r1 = Math.max(VW, VH) * 0.78;
    for (let n = 0; n < 18; n++) {
      const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const rr0 = r0 * (0.85 + Math.random() * 0.3);
      ctx.beginPath(); ctx.moveTo(cxs + c * rr0, cys + s * rr0); ctx.lineTo(cxs + c * r1, cys + s * r1); ctx.stroke();
    }
    ctx.restore();
  }

  // minimap (gedeelde stadskaart-tekening; ook gebruikt door de uitklapkaart)
  drawCityMap(mtx, 236, night, { x0, y0, x1, y1 }, P);

  // HUD: boost-meter bijwerken
  if (boostFillEl) boostFillEl.style.width = (boostFx.charge * 100).toFixed(0) + '%';
  if (boostMeterEl) { boostMeterEl.classList.toggle('full', boostFx.charge > 0.98); boostMeterEl.classList.toggle('active', boostFx.active); }

  speedEl.innerHTML = Math.round(spd * 0.28) + '<small>KM/U</small>';
}
