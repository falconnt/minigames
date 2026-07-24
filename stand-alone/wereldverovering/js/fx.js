// fx.js — visuele effecten op de kaart: marcherende troepen, inslagen,
// veroveringsgolven met vlag en zwevende meldingen. Puur cosmetisch; de
// spelregels draaien onafhankelijk door, dus een effect blokkeert nooit een zet.
//
// Alles is tijdgebaseerd (ms) en tekent zichzelf; afgelopen effecten worden
// automatisch opgeruimd.
import { GEO } from './geo.js';
import { project, cam } from './view.js';

const fx = [];
export const nu = () => performance.now();

// Versoepelingen voor natuurlijke beweging.
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function clearFx() { fx.length = 0; }

// ---- effecten toevoegen -----------------------------------------------------

// Marcherende troepen van bron naar doel. Bij de gelijktijdige resolutie
// vertrekken alle legers tegelijk, dus mars en inslag staan los van elkaar.
export function mars(src, dst, kleur, vreedzaam = false, duur = 1000) {
  fx.push({ type: 'mars', src, dst, kleur, vreedzaam, t0: nu(), duur });
}

// Inslag op een land (gevecht barst los).
export function inslag(land, kleur, gelukt, vertraging = 0) {
  fx.push({ type: 'inslag', land, kleur, gelukt, t0: nu() + vertraging, duur: 620 });
}

// Uitdijende ring in de kleur van de veroveraar.
export function verovering(land, kleur, vertraging = 0) {
  fx.push({ type: 'golf', land, kleur, t0: nu() + vertraging, duur: 900 });
  fx.push({ type: 'vlag', land, kleur, t0: nu() + vertraging + 120, duur: 900 });
}

// Kort oplichten van een land (bijv. bij verdediging die standhoudt).
export function schok(land, kleur, vertraging = 0) {
  fx.push({ type: 'schok', land, kleur, t0: nu() + vertraging, duur: 520 });
}

// Zwevende tekst boven een land (+goud, verliezen, ...).
export function zweef(land, tekst, kleur, vertraging = 0) {
  fx.push({ type: 'zweef', land, tekst, kleur, t0: nu() + vertraging, duur: 1300 });
}

// Troepen die van het ene naar het andere eigen land schuiven.
export function verplaatsing(src, dst, kleur) { mars(src, dst, kleur, true, 900); }

export const drukBezig = () => fx.length > 0;

// ---- tekenen ----------------------------------------------------------------

function landPunt(i) { return project(GEO[i].cx, GEO[i].cy); }

export function drawFx(ctx, W, H) {
  const t = nu();
  for (let k = fx.length - 1; k >= 0; k--) {
    const e = fx[k];
    const p = (t - e.t0) / e.duur;
    if (p >= 1) { fx.splice(k, 1); continue; }
    if (p < 0) continue;                       // wacht nog op zijn beurt
    ctx.save();
    switch (e.type) {
      case 'mars': tekenMars(ctx, e, p); break;
      case 'inslag': tekenInslag(ctx, e, p); break;
      case 'golf': tekenGolf(ctx, e, p); break;
      case 'vlag': tekenVlag(ctx, e, p); break;
      case 'schok': tekenSchok(ctx, e, p); break;
      case 'zweef': tekenZweef(ctx, e, p); break;
    }
    ctx.restore();
  }
}

// Gebogen route tussen twee landen (mooier dan een rechte lijn).
function boog(a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const bocht = Math.min(len * 0.22, 46);
  return [mx - (dy / len) * bocht, my + (dx / len) * bocht];
}
function opBoog(a, c, b, t) {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
          u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

function tekenMars(ctx, e, p) {
  const a = landPunt(e.src), b = landPunt(e.dst);
  const c = boog(a, b);
  const vervaag = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;

  // route
  ctx.globalAlpha = 0.5 * vervaag;
  ctx.strokeStyle = e.kleur;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -p * 40;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  ctx.stroke();
  ctx.setLineDash([]);

  // marcherende troepen
  ctx.globalAlpha = vervaag;
  const n = 3;
  for (let i = 0; i < n; i++) {
    const tt = Math.min(1, easeInOut(Math.max(0, p - i * 0.09)) * 1.05);
    const [x, y] = opBoog(a, c, b, tt);
    const r = 5 - i * 0.9;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = e.kleur; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
  }

  // pijlpunt bij aankomst
  if (p > 0.55 && !e.vreedzaam) {
    const [x1, y1] = opBoog(a, c, b, 0.97);
    const [x0, y0] = opBoog(a, c, b, 0.9);
    const hoek = Math.atan2(y1 - y0, x1 - x0);
    ctx.globalAlpha = vervaag;
    ctx.translate(x1, y1); ctx.rotate(hoek);
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-5, 4.5); ctx.lineTo(-5, -4.5); ctx.closePath();
    ctx.fillStyle = e.kleur; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
  }
}

function tekenInslag(ctx, e, p) {
  const [x, y] = landPunt(e.land);
  const q = easeOut(p);
  // schokring
  ctx.globalAlpha = (1 - p) * 0.9;
  ctx.strokeStyle = e.gelukt ? e.kleur : '#ff5a4d';
  ctx.lineWidth = 3 * (1 - p) + 0.6;
  ctx.beginPath(); ctx.arc(x, y, 6 + q * 34, 0, Math.PI * 2); ctx.stroke();
  // vonken
  const vonken = 8;
  ctx.globalAlpha = (1 - p) * 0.95;
  for (let i = 0; i < vonken; i++) {
    const hoek = (i / vonken) * Math.PI * 2 + p * 0.7;
    const r0 = 5 + q * 16, r1 = r0 + 7 * (1 - p);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(hoek) * r0, y + Math.sin(hoek) * r0);
    ctx.lineTo(x + Math.cos(hoek) * r1, y + Math.sin(hoek) * r1);
    ctx.strokeStyle = e.gelukt ? '#ffe27a' : '#ff8a7a';
    ctx.lineWidth = 2; ctx.stroke();
  }
}

function tekenGolf(ctx, e, p) {
  const [x, y] = landPunt(e.land);
  const q = easeOut(p);
  for (let i = 0; i < 2; i++) {
    const pp = Math.max(0, p - i * 0.18);
    if (pp <= 0) continue;
    ctx.globalAlpha = (1 - pp) * 0.55;
    ctx.strokeStyle = e.kleur;
    ctx.lineWidth = 3.5 * (1 - pp) + 0.7;
    ctx.beginPath(); ctx.arc(x, y, 8 + easeOut(pp) * 52, 0, Math.PI * 2); ctx.stroke();
  }
  // korte gloed
  ctx.globalAlpha = (1 - p) * 0.35;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 40 * q + 10);
  g.addColorStop(0, e.kleur); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, 40 * q + 10, 0, Math.PI * 2); ctx.fill();
}

// Vlaggetje dat plant bij verovering.
function tekenVlag(ctx, e, p) {
  const [x, y] = landPunt(e.land);
  const opkomst = Math.min(1, p / 0.35);
  const vervaag = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
  const h = 17 * easeOut(opkomst);
  const baseY = y - 9;
  ctx.globalAlpha = vervaag;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - h); ctx.stroke();
  // wapperend doek
  const w = 12 * easeOut(opkomst);
  const golf = Math.sin(p * 12) * 1.6;
  ctx.beginPath();
  ctx.moveTo(x, baseY - h);
  ctx.quadraticCurveTo(x + w * 0.5, baseY - h + 2 + golf, x + w, baseY - h + 1);
  ctx.lineTo(x + w, baseY - h + 8);
  ctx.quadraticCurveTo(x + w * 0.5, baseY - h + 9 + golf, x, baseY - h + 8);
  ctx.closePath();
  ctx.fillStyle = e.kleur; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
}

function tekenSchok(ctx, e, p) {
  const [x, y] = landPunt(e.land);
  const beef = Math.sin(p * 34) * 3 * (1 - p);
  ctx.globalAlpha = (1 - p) * 0.8;
  ctx.strokeStyle = e.kleur;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x + beef, y, 13, 0, Math.PI * 2); ctx.stroke();
}

function tekenZweef(ctx, e, p) {
  const [x, y] = landPunt(e.land);
  const stijg = easeOut(Math.min(1, p * 1.4)) * 34;
  ctx.globalAlpha = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(6,10,18,0.9)';
  ctx.strokeText(e.tekst, x, y - 20 - stijg);
  ctx.fillStyle = e.kleur;
  ctx.fillText(e.tekst, x, y - 20 - stijg);
}


// ---- vloeiende camera -------------------------------------------------------
// Beweegt de camera zacht naar een land toe (bijv. het aangevallen gebied),
// zonder de speler de controle af te pakken: een sleep onderbreekt het.
let camAnim = null;
export function vliegNaar(land, W, H, ms = 520) {
  const g = GEO[land];
  camAnim = {
    t0: nu(), duur: ms,
    van: { x: cam.viewX, y: cam.viewY },
    naar: { x: g.cx * cam.scale - W / 2, y: g.cy * cam.scale - H / 2 },
  };
}
export function stopVlucht() { camAnim = null; }
export function werkCameraBij(clampFn) {
  if (!camAnim) return;
  const p = (nu() - camAnim.t0) / camAnim.duur;
  if (p >= 1) { camAnim = null; return; }
  const q = easeInOut(p);
  cam.viewX = camAnim.van.x + (camAnim.naar.x - camAnim.van.x) * q;
  cam.viewY = camAnim.van.y + (camAnim.naar.y - camAnim.van.y) * q;
  clampFn();
}
