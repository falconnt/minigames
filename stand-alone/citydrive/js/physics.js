// physics.js — de rijsimulatie: gas/rem/sturen, drift en grip, botsingen met
// gebouwen en de wereldgrens, plus het verdienen van geld (afstand + drifts).
// Muteert de speler `P` en state.money; wordt elke frame aangeroepen als het
// spel niet gepauzeerd is (garage dicht).

import { CELL, N, WORLD } from './constants.js';
import { state, P } from './state.js';
import { eff, defById } from './cars.js';
import { blocks, speedbumps } from './world.js';
import { input } from './input.js';
import { skids, smoke, addPopup } from './fx.js';
import { updMoneyUI } from './economy.js';
import { updAudio } from './audio.js';
import { boostFx } from './boost.js';
import { combo, resetCombo } from './combo.js';

let distAcc = 0, driftAcc = 0, wasDrifting = false;

export function physics(dt) {
  const e = eff(state.current, state.cfg[state.current]), d = defById(state.current);
  const fx = Math.cos(P.ang), fy = Math.sin(P.ang);
  // nitro: actief zolang de knop ingedrukt is én er lading is; verbruikt lading
  const boosting = input.boost && boostFx.charge > 0.02;
  boostFx.active = boosting;
  if (boosting) boostFx.charge = Math.max(0, boostFx.charge - dt * 0.5);
  // decompose in voorwaartse (vf) en zijwaartse (vl) snelheid
  let vf = P.vx * fx + P.vy * fy;
  let vl = P.vx * (-fy) + P.vy * fx;
  const t = input.th;
  if (t > 0.02) { vf += e.acc * t * dt * Math.max(0.15, 1 - Math.max(0, vf) / e.top); }
  else if (t < -0.02) {
    if (vf > 15) vf += 1050 * t * dt;                 // remmen
    else { vf += e.acc * 0.55 * t * dt; if (vf < -170) vf = -170; } // achteruit
  }
  // nitro: sterke versnelling richting ~1,65x de topsnelheid (kapt daar af)
  if (boosting) { vf += e.acc * 2.4 * dt * Math.max(0.12, 1 - vf / (e.top * 1.65)); boostFx.shake = Math.min(1, boostFx.shake + dt * 2.2); }
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

  // gedeelde botsingsreactie: eruit duwen + snelheid weerkaatsen + schok/combo-breuk
  const collide = (nX, nY, push) => {
    P.x += nX * push; P.y += nY * push;
    const vn = P.vx * nX + P.vy * nY;
    if (vn < 0) {
      P.vx -= 1.4 * vn * nX; P.vy -= 1.4 * vn * nY; P.vx *= 0.55; P.vy *= 0.55;
      boostFx.shake = Math.min(1, boostFx.shake + Math.min(0.5, -vn / 800));
      if (vn < -140) { if (combo.mult > 1) addPopup('COMBO x' + combo.mult + ' KWIJT!', '#ff6a6a'); driftAcc = 0; resetCombo(); }
    }
  };
  // botsingen met gebouwen én bomen/bosjes in de omliggende cellen
  const ci = Math.max(0, Math.min(N - 1, (P.x / CELL) | 0)), cj = Math.max(0, Math.min(N - 1, (P.y / CELL) | 0));
  for (let i = Math.max(0, ci - 1); i <= Math.min(N - 1, ci + 1); i++)
    for (let j = Math.max(0, cj - 1); j <= Math.min(N - 1, cj + 1); j++) {
      for (const b of blocks[i][j].builds) {
        const nx = Math.max(b.x, Math.min(P.x, b.x + b.w)), ny = Math.max(b.y, Math.min(P.y, b.y + b.h));
        let dx = P.x - nx, dy = P.y - ny, dd = dx * dx + dy * dy;
        if (dd < R * R) {
          let dist = Math.sqrt(dd);
          if (dist < 0.01) { dx = P.x < b.x + b.w / 2 ? -1 : 1; dy = 0; dist = 1; }
          collide(dx / dist, dy / dist, R - dist);
        }
      }
      // bomen en bosjes zijn nu ook vaste obstakels (cirkelvormig)
      for (const t of blocks[i][j].trees) {
        const tr = R + t.r * 0.66;
        let dx = P.x - t.x, dy = P.y - t.y, dd = dx * dx + dy * dy;
        if (dd < tr * tr) { const dist = Math.sqrt(dd) || 0.001; collide(dx / dist, dy / dist, tr - dist); }
      }
    }

  const spd = Math.hypot(P.vx, P.vy);
  // verkeersdrempels: afremmen + schok bij het eroverheen rijden
  for (const sb of speedbumps) {
    if (P.x > sb.x && P.x < sb.x + sb.w && P.y > sb.y && P.y < sb.y + sb.h) {
      if (spd > 110) { P.vx *= 0.9; P.vy *= 0.9; }
      boostFx.shake = Math.min(1, boostFx.shake + Math.min(0.45, spd / 1300));
      break;
    }
  }
  // drift & fx
  const drifting = Math.abs(vl) > 85 && spd > 150;
  if (drifting) {
    driftAcc += Math.abs(vl) * dt * 0.055;
    combo.driftTime += dt;
    combo.mult = Math.min(5, 1 + Math.floor(combo.driftTime / 1.2)); // elke ~1,2s drift +1
    combo.pending = driftAcc * combo.mult;
    combo.active = true;
    boostFx.charge = Math.min(1, boostFx.charge + dt * 0.3); // driften laadt de nitro op

    const bx = P.x - fx * d.l * 0.35, by = P.y - fy * d.l * 0.35;
    const px = -fy * d.w * 0.42, py = fx * d.w * 0.42;
    skids.push({ x1: bx + px, y1: by + py, x2: bx + px - P.vx * dt, y2: by + py - P.vy * dt });
    skids.push({ x1: bx - px, y1: by - py, x2: bx - px - P.vx * dt, y2: by - py - P.vy * dt });
    if (skids.length > 500) skids.splice(0, skids.length - 500);
    if (Math.random() < 0.6) smoke.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, r: 8 + Math.random() * 8, t: 0 });
  } else if (wasDrifting && driftAcc >= 6) {
    const b = Math.round(driftAcc * combo.mult); state.money += b;
    addPopup('+€' + b + (combo.mult > 1 ? '  x' + combo.mult : '') + '  DRIFT', combo.mult >= 4 ? '#ffd34d' : '#7ee2a8');
    if (combo.mult >= 3) boostFx.shake = Math.min(1, boostFx.shake + 0.3);
    driftAcc = 0; resetCombo(); updMoneyUI();
  } else if (!drifting) { driftAcc = Math.max(0, driftAcc - 30 * dt); if (driftAcc <= 0.01) resetCombo(); }
  wasDrifting = drifting;

  // verdienen per afgelegde afstand
  distAcc += spd * dt;
  if (distAcc >= 500) { state.money += 8; distAcc -= 500; updMoneyUI(); }

  if (spd > 250 && !boosting) boostFx.charge = Math.min(1, boostFx.charge + dt * 0.04); // langzaam bijladen bij snel rijden
  boostFx.shake = Math.max(0, boostFx.shake - dt * 2.6); // schok dooft uit
  updAudio(spd);
  return spd;
}
