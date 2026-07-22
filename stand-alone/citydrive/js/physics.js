// physics.js — de rijsimulatie: gas/rem/sturen, drift en grip, botsingen met
// gebouwen en de wereldgrens, plus het verdienen van geld (afstand + drifts).
// Muteert de speler `P` en state.money; wordt elke frame aangeroepen als het
// spel niet gepauzeerd is (garage dicht).

import { CELL, N, WORLD } from './constants.js';
import { state, P } from './state.js';
import { eff, defById } from './cars.js';
import { blocks } from './world.js';
import { input } from './input.js';
import { skids, smoke, addPopup } from './fx.js';
import { updMoneyUI } from './economy.js';
import { updAudio } from './audio.js';

let distAcc = 0, driftAcc = 0, wasDrifting = false;

export function physics(dt) {
  const e = eff(state.current, state.cfg[state.current]), d = defById(state.current);
  const fx = Math.cos(P.ang), fy = Math.sin(P.ang);
  // decompose in voorwaartse (vf) en zijwaartse (vl) snelheid
  let vf = P.vx * fx + P.vy * fy;
  let vl = P.vx * (-fy) + P.vy * fx;
  const t = input.th;
  if (t > 0.02) { vf += e.acc * t * dt * Math.max(0.15, 1 - Math.max(0, vf) / e.top); }
  else if (t < -0.02) {
    if (vf > 15) vf += 1050 * t * dt;                 // remmen
    else { vf += e.acc * 0.55 * t * dt; if (vf < -170) vf = -170; } // achteruit
  }
  // drag + rolweerstand
  vf *= Math.exp(-0.32 * dt);
  if (Math.abs(vf) < 8 && Math.abs(t) < 0.02) vf *= Math.exp(-3 * dt);
  // sturen (schaalt met snelheid)
  const sSpd = Math.max(-1, Math.min(1, vf / 240));
  const sens = 1 - 0.32 * Math.min(1, Math.abs(vf) / e.top);
  P.ang += e.steer * (input.hb ? 1.25 : 1) * input.steer * sSpd * sens * dt;
  // laterale grip
  const grip = input.hb ? 2.1 : e.grip;
  vl *= Math.exp(-grip * dt);
  if (input.hb && Math.abs(vf) > 60) { const bleed = Math.sign(vf) * Math.min(Math.abs(vf), 260 * dt); vf -= bleed * 0.55; vl += P.ang; vl = vl; }
  // recompose
  P.vx = vf * fx + vl * (-fy); P.vy = vf * fy + vl * fx;
  P.x += P.vx * dt; P.y += P.vy * dt;
  P.vf = vf; P.vl = vl;
  P.steerVis += (input.steer - P.steerVis) * Math.min(1, 12 * dt);

  // wereldgrens
  const R = 16;
  if (P.x < R) { P.x = R; P.vx *= -0.3; } if (P.x > WORLD - R) { P.x = WORLD - R; P.vx *= -0.3; }
  if (P.y < R) { P.y = R; P.vy *= -0.3; } if (P.y > WORLD - R) { P.y = WORLD - R; P.vy *= -0.3; }

  // botsingen met gebouwen in de omliggende cellen
  const ci = Math.max(0, Math.min(N - 1, (P.x / CELL) | 0)), cj = Math.max(0, Math.min(N - 1, (P.y / CELL) | 0));
  for (let i = Math.max(0, ci - 1); i <= Math.min(N - 1, ci + 1); i++)
    for (let j = Math.max(0, cj - 1); j <= Math.min(N - 1, cj + 1); j++) {
      for (const b of blocks[i][j].builds) {
        const nx = Math.max(b.x, Math.min(P.x, b.x + b.w)), ny = Math.max(b.y, Math.min(P.y, b.y + b.h));
        let dx = P.x - nx, dy = P.y - ny, dd = dx * dx + dy * dy;
        if (dd < R * R) {
          let dist = Math.sqrt(dd);
          if (dist < 0.01) { dx = P.x < b.x + b.w / 2 ? -1 : 1; dy = 0; dist = 1; }
          const push = (R - dist); P.x += dx / dist * push; P.y += dy / dist * push;
          const nlen = Math.hypot(dx, dy) || 1, nX = dx / nlen, nY = dy / nlen;
          const vn = P.vx * nX + P.vy * nY;
          if (vn < 0) { P.vx -= 1.4 * vn * nX; P.vy -= 1.4 * vn * nY; P.vx *= 0.55; P.vy *= 0.55; }
        }
      }
    }

  const spd = Math.hypot(P.vx, P.vy);
  // drift & fx
  const drifting = Math.abs(vl) > 85 && spd > 150;
  if (drifting) {
    driftAcc += Math.abs(vl) * dt * 0.055;
    const bx = P.x - fx * d.l * 0.35, by = P.y - fy * d.l * 0.35;
    const px = -fy * d.w * 0.42, py = fx * d.w * 0.42;
    skids.push({ x1: bx + px, y1: by + py, x2: bx + px - P.vx * dt, y2: by + py - P.vy * dt });
    skids.push({ x1: bx - px, y1: by - py, x2: bx - px - P.vx * dt, y2: by - py - P.vy * dt });
    if (skids.length > 500) skids.splice(0, skids.length - 500);
    if (Math.random() < 0.6) smoke.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, r: 8 + Math.random() * 8, t: 0 });
  } else if (wasDrifting && driftAcc >= 6) {
    const b = Math.round(driftAcc); state.money += b; addPopup('+€' + b + '  DRIFT', '#7ee2a8'); driftAcc = 0; updMoneyUI();
  } else if (!drifting) { driftAcc = Math.max(0, driftAcc - 30 * dt); }
  wasDrifting = drifting;

  // verdienen per afgelegde afstand
  distAcc += spd * dt;
  if (distAcc >= 500) { state.money += 8; distAcc -= 500; updMoneyUI(); }

  updAudio(spd);
  return spd;
}
