// Paardensport — een realistisch paardensimulatiespel.
//
// Je begint met een gratis stal en een beginnerspaard, verzorgt en traint het,
// koopt tuig, extra stallen en paarden, en neemt deel aan drie disciplines:
// springen (met eigen parcoursbouwer), dressuur en racen. Voortgang wordt via
// het gedeelde save-mechanisme bewaard; de highscore is je totaal aan
// wedstrijdpunten.
//
// Alle graphics worden in code op canvas getekend (geen emoji's): een top-down
// erf met stallen en buitenbak, en paarden in zijaanzicht met vachtkleuren,
// schaduw en dag/nacht-belichting.

import { availableHeight, heightBelow } from '../js/fit.js';

// ============================================================
//  Gegevens: rassen, vachtkleuren, tuig
// ============================================================

const BREEDS = {
  shetland: { name: 'Shetlandpony', price: 0, base: { speed: 30, jumping: 35, stamina: 45, dressage: 30 }, size: 0.72 },
  kwpn: { name: 'KWPN Warmbloed', price: 1200, base: { speed: 58, jumping: 62, stamina: 55, dressage: 60 }, size: 1.0 },
  fries: { name: 'Fries', price: 1500, base: { speed: 48, jumping: 50, stamina: 58, dressage: 74 }, size: 1.02 },
  volbloed: { name: 'Engels Volbloed', price: 1800, base: { speed: 80, jumping: 55, stamina: 78, dressage: 45 }, size: 0.98 },
  holsteiner: { name: 'Holsteiner', price: 2000, base: { speed: 60, jumping: 82, stamina: 60, dressage: 58 }, size: 1.03 },
};

const COATS = {
  vos: { name: 'Vos', body: '#9c4a24', shade: '#743314', mane: '#5f2c12', light: '#c06a3c' },
  bruin: { name: 'Bruin (bay)', body: '#6b4423', shade: '#4a2d15', mane: '#17110b', light: '#8a5c31' },
  zwart: { name: 'Zwart', body: '#2c2a2e', shade: '#1a181c', mane: '#121013', light: '#413e44' },
  schimmel: { name: 'Schimmel', body: '#c3c0c4', shade: '#9d9aa0', mane: '#e6e4e8', light: '#dedbe0' },
  palomino: { name: 'Palomino', body: '#cda85e', shade: '#a9853f', mane: '#f0e4c4', light: '#e6c987' },
};

const HORSE_NAMES = ['Bella', 'Storm', 'Luna', 'Rocky', 'Amber', 'Diamant', 'Spirit', 'Duke', 'Fleur', 'Thunder', 'Zafira', 'Nero'];

const TACK = {
  zadel: [
    { name: 'Basiszadel', price: 0, bonus: 0 },
    { name: 'Sportzadel', price: 400, bonus: 6 },
    { name: 'Wedstrijdzadel', price: 1200, bonus: 14 },
  ],
  hoofdstel: [
    { name: 'Basishoofdstel', price: 0, bonus: 0 },
    { name: 'Anatomisch hoofdstel', price: 300, bonus: 5 },
    { name: 'Wedstrijdhoofdstel', price: 900, bonus: 11 },
  ],
};

const START_MONEY = 600;
const STABLE_BASE_PRICE = 900; // prijs stijgt per extra stal
const DAILY_BONUS = 120;

// ============================================================
//  Hulpfuncties
// ============================================================

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const euro = (n) => '€' + Math.round(n).toLocaleString('nl-NL');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const todayKey = () => new Date().toISOString().slice(0, 10);

function stablePrice(owned) {
  return Math.round(STABLE_BASE_PRICE * Math.pow(1.6, owned - 1));
}

// Gemiddelde verzorgingsconditie 0..1 die prestaties beïnvloedt.
function careFactor(h) {
  const c = (h.cleanliness + h.energy + h.hunger + h.happiness) / 400;
  return 0.55 + 0.45 * c; // vies/moe paard presteert tot 45% minder
}

// ============================================================
//  Stijl (eenmalig injecteren zodat de game overal zelfstandig werkt)
// ============================================================

function injectStyles() {
  if (document.getElementById('paardensport-style')) return;
  const style = document.createElement('style');
  style.id = 'paardensport-style';
  style.textContent = `
    .ps { --sand:#d9c39a; --grass:#6f9a4d; color:var(--text); }
    .ps-hud { display:flex; flex-wrap:wrap; align-items:center; gap:.6rem; margin-bottom:1rem; }
    .ps-hud .stat { display:flex; align-items:center; gap:.35rem; }
    .ps-spacer { flex:1; }
    .ps-canvas-wrap { position:relative; }
    .ps canvas { width:100%; border-radius:.75rem; display:block; margin-inline:auto; touch-action:manipulation; }
    .ps-nav { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.85rem; }
    .ps-panel { background:var(--bg-inset); border:1px solid var(--border); border-radius:.85rem; padding:1rem 1.15rem; margin-top:1rem; }
    .ps-panel h3 { margin:.1rem 0 .8rem; }
    .ps-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(13rem,1fr)); gap:.8rem; }
    .ps-item { background:var(--bg-card); border:1px solid var(--border); border-radius:.7rem; padding:.8rem; display:flex; flex-direction:column; gap:.5rem; }
    .ps-item h4 { margin:0; }
    .ps-item .muted { color:var(--text-muted); font-size:.85rem; }
    .ps-item .price { color:var(--accent); font-weight:700; }
    .ps-bars { display:flex; flex-direction:column; gap:.45rem; }
    .ps-bar { display:grid; grid-template-columns:5.5rem 1fr auto; align-items:center; gap:.5rem; font-size:.85rem; }
    .ps-bar .track { height:.7rem; background:var(--bg-inset); border-radius:1rem; overflow:hidden; }
    .ps-bar .fill { height:100%; border-radius:1rem; transition:width .3s ease; }
    .ps-portrait { background:linear-gradient(180deg,#bcd6ec,#e7f0f5); border-radius:.7rem; }
    :root[data-theme='dark'] .ps-portrait, @media (prefers-color-scheme:dark){ .ps-portrait{ } }
    .ps-msg { min-height:1.2rem; color:var(--accent); font-weight:600; margin-top:.6rem; }
    .ps-row { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
    .ps-slider { display:flex; align-items:center; gap:.6rem; }
    .ps-slider input { flex:1; }
    .ps-badge { font-size:.75rem; background:var(--bg-inset); border:1px solid var(--border); border-radius:1rem; padding:.15rem .55rem; color:var(--text-muted); }
    .ps-choose { display:grid; grid-template-columns:repeat(auto-fill,minmax(14rem,1fr)); gap:1rem; }
    .ps-choose .ps-item { cursor:pointer; }
    .ps-choose .ps-item:hover, .ps-choose .ps-item.sel { border-color:var(--accent); }
    .ps-hint { color:var(--text-muted); font-size:.85rem; margin-top:.6rem; }
    .ps-jump-flag { color:var(--accent); }
    .ps-disc { display:grid; grid-template-columns:repeat(auto-fit,minmax(11rem,1fr)); gap:.8rem; }
  `;
  document.head.appendChild(style);
}

// ============================================================
//  Canvas-tekenwerk
// ============================================================

// --- kleur- en uiterlijk-helpers ---

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

// Vachtkleur "vervuilen": doffer en richting modderbruin bij lage netheid.
function muddyCoat(c, dirt) {
  if (!dirt) return c;
  const t = Math.min(0.45, dirt * 0.5);
  const mud = '#5c4a33';
  return {
    body: mixHex(c.body, mud, t),
    shade: mixHex(c.shade, mud, t),
    light: mixHex(c.light, mud, t * 0.8),
    mane: mixHex(c.mane, mud, t * 0.5),
  };
}

// Silhouet-parameters per ras.
function breedLook(breed) {
  switch (breed) {
    case 'shetland': return { legLen: 0.68, barrel: 1.12, neck: 0.82, head: 1.08, longMane: true, feather: true };
    case 'fries': return { legLen: 1.0, barrel: 1.06, neck: 1.06, head: 1.0, longMane: true, feather: true };
    case 'volbloed': return { legLen: 1.14, barrel: 0.9, neck: 1.06, head: 0.95, longMane: false, feather: false };
    case 'holsteiner': return { legLen: 1.06, barrel: 1.0, neck: 1.0, head: 1.0, longMane: false, feather: false };
    default: return { legLen: 1.0, barrel: 1.0, neck: 1.0, head: 1.0, longMane: false, feather: false };
  }
}

// Witte aftekeningen (bles/ster op hoofd, sokken). socks: [voorNaby, voorVer, achterNaby, achterVer].
function randomMarkings() {
  const r = Math.random();
  let socks = [false, false, false, false];
  if (r < 0.18) socks = [true, true, true, true];
  else if (r < 0.4) socks = [false, false, true, true];   // twee achter
  else if (r < 0.52) socks = [true, false, false, false]; // één voor
  const f = Math.random();
  const face = f < 0.45 ? 'geen' : f < 0.72 ? 'ster' : 'bles';
  return { face, socks };
}

// Paard in realistisch zijaanzicht (naar links kijkend). opts:
//   legPhase (loopanimatie), jump (0..1 sprong-tuck), dirt (0..1),
//   breed, markings {face, socks}, tack {zadel, hoofdstel}, flip.
function drawHorse(g, cx, cy, scale, coat, opts = {}) {
  const base = COATS[coat] || COATS.bruin;
  const c = muddyCoat(base, opts.dirt || 0);
  const look = breedLook(opts.breed);
  const markings = opts.markings || { face: 'geen', socks: [false, false, false, false] };
  const legPhase = opts.legPhase || 0;
  const jump = opts.jump || 0;

  g.save();
  g.translate(cx, cy);
  if (opts.flip) g.scale(-1, 1);
  g.scale(scale, scale);

  const groundY = 46;
  const lift = (look.legLen - 1) * 18 + jump * 22;      // langere benen / sprong tilt de romp op
  const cyB = 4 - lift;                                  // verticaal midden van de romp
  const bH = 22 * look.barrel;                           // halve barrel-hoogte
  const nk = look.neck, hd = look.head;

  // grondschaduw (kleiner tijdens sprong)
  g.save();
  g.globalAlpha = 0.2 - jump * 0.12;
  g.fillStyle = '#000';
  g.beginPath();
  g.ellipse(6, groundY + 2, 50 - jump * 16, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();

  const bodyGrad = g.createLinearGradient(0, cyB - bH, 0, cyB + bH);
  bodyGrad.addColorStop(0, c.light);
  bodyGrad.addColorStop(0.5, c.body);
  bodyGrad.addColorStop(1, c.shade);

  // --- één poot: bovenbeen -> knie/spron -> pijp -> hoef ---
  function drawLeg(hipX, topY, phase, far, sock) {
    const amp = jump ? 0 : 9;
    const fwd = Math.sin(phase) * amp;                   // hoef zwaait voor/achter
    const knee = jump ? -16 : 22 + Math.cos(phase) * 2;  // getrokken bij sprong
    const footY = jump ? cyB + bH - 4 : groundY;
    const kneeX = hipX + fwd * 0.35 + (jump ? 10 : 0);
    const footX = hipX + fwd + (jump ? 22 : 0);
    const main = far ? mixHex(c.body, c.shade, 0.5) : c.body;
    const shade = far ? mixHex(c.shade, '#000', 0.15) : c.shade;
    const wTop = far ? 6.5 : 7.5, wKnee = 5, wFoot = 4;

    g.beginPath();
    g.moveTo(hipX - wTop, topY);
    g.lineTo(hipX + wTop, topY);
    g.lineTo(kneeX + wKnee, cyB + knee);
    g.lineTo(footX + wFoot, footY - 5);
    g.lineTo(footX - wFoot, footY - 5);
    g.lineTo(kneeX - wKnee, cyB + knee);
    g.closePath();
    g.fillStyle = main;
    g.fill();

    // beharing (feather) onderaan bij o.a. Fries/Shetland
    if (look.feather && !jump) {
      g.fillStyle = mixHex(main, c.mane, 0.35);
      g.beginPath();
      g.moveTo(footX - wFoot - 2, footY - 12);
      g.quadraticCurveTo(footX, footY - 2, footX + wFoot + 2, footY - 12);
      g.lineTo(footX + wFoot, footY - 2);
      g.lineTo(footX - wFoot, footY - 2);
      g.closePath();
      g.fill();
    }
    // sok (witte onderbeen-aftekening)
    if (sock && coat !== 'schimmel') {
      g.fillStyle = '#efeae2';
      g.beginPath();
      g.moveTo(footX - wFoot - 0.5, footY - 16);
      g.lineTo(footX + wFoot + 0.5, footY - 16);
      g.lineTo(footX + wFoot, footY - 4);
      g.lineTo(footX - wFoot, footY - 4);
      g.closePath();
      g.fill();
    }
    // hoef
    g.fillStyle = sock && coat !== 'schimmel' ? '#7c6f63' : '#2b2320';
    g.beginPath();
    g.moveTo(footX - wFoot - 0.5, footY - 5);
    g.lineTo(footX + wFoot + 0.5, footY - 5);
    g.lineTo(footX + wFoot, footY);
    g.lineTo(footX - wFoot, footY);
    g.closePath();
    g.fill();
    // knieschaduw
    g.strokeStyle = shade; g.lineWidth = 1;
  }

  // verre benen eerst (donkerder, iets naar achteren)
  drawLeg(-18, cyB + bH * 0.5, legPhase + Math.PI, true, markings.socks[1]);      // voor-ver
  drawLeg(44, cyB + bH * 0.5, legPhase, true, markings.socks[3]);                 // achter-ver

  // --- staart (deels achter de romp) ---
  const tailBaseX = 60, tailBaseY = cyB - bH * 0.3;
  g.fillStyle = c.mane;
  g.beginPath();
  g.moveTo(tailBaseX - 4, tailBaseY);
  g.quadraticCurveTo(tailBaseX + 20, tailBaseY + 6, tailBaseX + 16 + Math.sin(legPhase) * 2, tailBaseY + 44);
  g.quadraticCurveTo(tailBaseX + 6, tailBaseY + 30, tailBaseX - 8, tailBaseY + 14);
  g.closePath();
  g.fill();

  // --- romp (barrel) ---
  g.fillStyle = bodyGrad;
  g.beginPath();
  g.moveTo(-22, cyB - bH * 0.85);                         // schoft
  g.bezierCurveTo(2, cyB - bH * 1.05, 30, cyB - bH * 1.02, 48, cyB - bH * 0.8); // rug
  g.bezierCurveTo(60, cyB - bH * 0.62, 66, cyB - bH * 0.2, 64, cyB + bH * 0.25); // croupe/bil
  g.bezierCurveTo(62, cyB + bH * 0.7, 48, cyB + bH, 30, cyB + bH * 1.02);        // achterbuik
  g.bezierCurveTo(6, cyB + bH * 1.08, -18, cyB + bH * 1.02, -30, cyB + bH * 0.6); // buik
  g.bezierCurveTo(-34, cyB + bH * 0.2, -34, cyB - bH * 0.35, -26, cyB - bH * 0.7); // borst/schouder
  g.closePath();
  g.fill();

  // spierschaduw achterhand + schouder
  g.save();
  g.globalAlpha = 0.16;
  g.fillStyle = base.shade;
  g.beginPath(); g.ellipse(46, cyB + bH * 0.15, 16, bH * 0.8, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(-18, cyB + bH * 0.15, 12, bH * 0.7, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  // --- hals + hoofd als één silhouet ---
  const pollX = -58 * nk * 0.5 - 30, pollY = cyB - bH - 30 * nk;
  g.fillStyle = bodyGrad;
  g.beginPath();
  g.moveTo(-24, cyB - bH * 0.78);                         // schoft/halsbasis achter
  g.quadraticCurveTo(pollX + 22, cyB - bH - 8 * nk, pollX + 6, pollY + 2); // kam naar nek
  g.lineTo(pollX - 4, pollY + 4);                         // over het genick
  g.quadraticCurveTo(pollX - 20 * hd, pollY + 12 * hd, pollX - 22 * hd, pollY + 30 * hd); // voorhoofd->neus
  g.quadraticCurveTo(pollX - 22 * hd, pollY + 40 * hd, pollX - 12 * hd, pollY + 40 * hd); // neus onder
  g.quadraticCurveTo(pollX - 2, pollY + 40 * hd, pollX + 4, pollY + 30);   // kaak
  g.quadraticCurveTo(pollX + 14, cyB - bH - 6 * nk, -28, cyB - bH * 0.1);  // keel naar borst
  g.quadraticCurveTo(-24, cyB - bH * 0.4, -24, cyB - bH * 0.78);
  g.closePath();
  g.fill();

  // --- manen langs de kam ---
  g.fillStyle = c.mane;
  const maneDrop = look.longMane ? 20 : 10;
  g.beginPath();
  g.moveTo(-24, cyB - bH * 0.82);
  g.quadraticCurveTo(pollX + 22, cyB - bH - 8 * nk, pollX + 4, pollY + 2);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const mx = pollX + 4 + t * (-24 - (pollX + 4));
    const my = (pollY + 2) + t * ((cyB - bH * 0.82) - (pollY + 2));
    g.lineTo(mx + 4, my + maneDrop * (0.6 + 0.4 * Math.sin(t * 6)));
  }
  g.closePath();
  g.fill();

  // voorlok tussen de oren
  g.beginPath();
  g.moveTo(pollX - 2, pollY + 2);
  g.quadraticCurveTo(pollX - 12, pollY + 6, pollX - 14 * hd, pollY + 16);
  g.lineTo(pollX - 6, pollY + 8);
  g.closePath();
  g.fill();

  // oor
  g.fillStyle = mixHex(c.body, c.shade, 0.3);
  g.beginPath();
  g.moveTo(pollX + 2, pollY + 2);
  g.lineTo(pollX - 2, pollY - 12);
  g.lineTo(pollX - 10, pollY + 2);
  g.closePath();
  g.fill();

  // gezichtsaftekening (ster/bles)
  if (markings.face !== 'geen' && coat !== 'schimmel') {
    g.fillStyle = '#efeae2';
    if (markings.face === 'bles') {
      g.beginPath();
      g.moveTo(pollX - 12 * hd, pollY + 8);
      g.quadraticCurveTo(pollX - 20 * hd, pollY + 22 * hd, pollX - 16 * hd, pollY + 36 * hd);
      g.lineTo(pollX - 11 * hd, pollY + 36 * hd);
      g.quadraticCurveTo(pollX - 13 * hd, pollY + 22 * hd, pollX - 8 * hd, pollY + 8);
      g.closePath();
      g.fill();
    } else {
      g.beginPath();
      g.ellipse(pollX - 15 * hd, pollY + 9, 3, 4.2, 0.2, 0, Math.PI * 2);
      g.fill();
    }
  }

  // oog + neusgat + mondlijn
  g.fillStyle = '#15100f';
  g.beginPath(); g.ellipse(pollX - 6 * hd, pollY + 16 * hd, 2.6, 3.2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)';
  g.beginPath(); g.arc(pollX - 6.8 * hd, pollY + 14.5 * hd, 0.9, 0, Math.PI * 2); g.fill();
  g.fillStyle = mixHex(c.shade, '#000', 0.3);
  g.beginPath(); g.ellipse(pollX - 18 * hd, pollY + 34 * hd, 2, 1.4, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = mixHex(c.shade, '#000', 0.2); g.lineWidth = 1;
  g.beginPath(); g.moveTo(pollX - 20 * hd, pollY + 38 * hd); g.lineTo(pollX - 12 * hd, pollY + 39 * hd); g.stroke();

  // --- tuig (zadel + hoofdstel) ---
  if (opts.tack) {
    const tier = (opts.tack.zadel || 0);
    const padColor = tier >= 2 ? '#26406e' : tier === 1 ? '#3a2f26' : '#4a3527';
    // zadeldekje
    g.fillStyle = padColor;
    g.beginPath();
    g.moveTo(-14, cyB - bH * 0.85);
    g.lineTo(24, cyB - bH * 0.85);
    g.lineTo(22, cyB - bH * 0.2);
    g.lineTo(-12, cyB - bH * 0.2);
    g.closePath();
    g.fill();
    if (tier >= 2) { g.strokeStyle = '#d9b25a'; g.lineWidth = 1.5; g.stroke(); }
    // zadel (leren zit met pommel/cantle)
    g.fillStyle = '#3c2415';
    g.beginPath();
    g.moveTo(-10, cyB - bH * 0.9);
    g.quadraticCurveTo(6, cyB - bH * 1.02, 20, cyB - bH * 0.9);
    g.quadraticCurveTo(16, cyB - bH * 0.66, 4, cyB - bH * 0.62);
    g.quadraticCurveTo(-8, cyB - bH * 0.66, -12, cyB - bH * 0.78);
    g.closePath();
    g.fill();
    // singel + stijgbeugel
    g.strokeStyle = '#2b1a0f'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(2, cyB - bH * 0.6); g.lineTo(0, cyB + bH * 0.5); g.stroke();
    g.fillStyle = '#c9ccd4';
    g.beginPath(); g.rect(-3, cyB + bH * 0.5, 6, 7); g.fill();
    // hoofdstel + teugel
    g.strokeStyle = '#2b1a0f'; g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(pollX - 4, pollY + 6); g.lineTo(pollX - 20 * hd, pollY + 30 * hd);   // neusriem-lijn
    g.moveTo(pollX - 16 * hd, pollY + 30 * hd); g.lineTo(pollX - 6, pollY + 30 * hd);
    g.stroke();
    g.beginPath();                                                                 // teugel naar schoft
    g.moveTo(pollX + 2, pollY + 24); g.quadraticCurveTo(-30, cyB - bH * 0.7, -12, cyB - bH * 0.85);
    g.stroke();
  }

  // nabije benen (bovenop de romp)
  drawLeg(-24, cyB + bH * 0.55, legPhase, false, markings.socks[0]);              // voor-naby
  drawLeg(40, cyB + bH * 0.55, legPhase + Math.PI, false, markings.socks[2]);     // achter-naby

  // --- modder bij lage netheid: onregelmatige vegen laag op benen/buik ---
  if (opts.dirt > 0.15) {
    g.save();
    g.fillStyle = '#4b3a24';
    const spots = [[-24, cyB + bH * 0.9], [-6, cyB + bH * 1.0], [16, cyB + bH * 0.95], [40, cyB + bH * 0.85], [-22, groundY - 10], [42, groundY - 10]];
    for (const [sx, sy] of spots) {
      g.globalAlpha = Math.min(0.55, opts.dirt) * (0.6 + Math.random() * 0.4);
      g.beginPath();
      const w = 6 + Math.random() * 5, h = 3 + Math.random() * 3;
      g.ellipse(sx + (Math.random() - 0.5) * 4, sy, w, h, Math.random(), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  g.restore();
}

// Top-down erf met stallen, buitenbak, hekken, bomen, zon/maan.
function drawFarm(g, w, h, night, stables) {
  // grasveld
  const grass = g.createLinearGradient(0, 0, 0, h);
  grass.addColorStop(0, night ? '#2c4a35' : '#79a552');
  grass.addColorStop(1, night ? '#22392a' : '#5f8a42');
  g.fillStyle = grass;
  g.fillRect(0, 0, w, h);

  // grastextuur
  g.strokeStyle = night ? 'rgba(255,255,255,.03)' : 'rgba(30,60,20,.10)';
  g.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const x = (i * 97) % w, y = (i * 53) % h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 2, y - 5);
    g.stroke();
  }

  // pad
  g.fillStyle = night ? '#4a4038' : '#b9a07a';
  g.fillRect(w * 0.45, 0, w * 0.1, h);
  g.fillRect(0, h * 0.62, w, h * 0.08);

  // buitenbak (zandbak met witte omheining) linksonder
  const bx = w * 0.06, by = h * 0.72, bw = w * 0.36, bh = h * 0.22;
  g.fillStyle = night ? '#8a7a56' : '#d9c39a';
  g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#f2f2f0';
  g.lineWidth = 3;
  g.strokeRect(bx, by, bw, bh);
  for (let x = bx; x <= bx + bw; x += bw / 8) {
    g.beginPath(); g.moveTo(x, by); g.lineTo(x, by - 6); g.stroke();
  }
  g.fillStyle = night ? 'rgba(255,255,255,.5)' : '#4a4038';
  g.font = '600 13px system-ui';
  g.fillText('Buitenbak', bx + 8, by + bh - 10);

  // stallen (rijtje) bovenaan; getekend als top-down gebouwen met dak
  const n = Math.max(1, stables);
  const sw = Math.min(120, (w - 40) / n - 12);
  for (let i = 0; i < n; i++) {
    const x = 24 + i * (sw + 14), y = h * 0.14, sh = h * 0.26;
    // muur
    g.fillStyle = night ? '#5c4633' : '#8f6b48';
    g.fillRect(x, y, sw, sh);
    // dak (top-down: driehoekige nok)
    g.fillStyle = night ? '#7a3f34' : '#a8503f';
    g.beginPath();
    g.moveTo(x - 4, y);
    g.lineTo(x + sw / 2, y - 14);
    g.lineTo(x + sw + 4, y);
    g.closePath();
    g.fill();
    // deur
    g.fillStyle = night ? '#2c2018' : '#5a3d26';
    g.fillRect(x + sw / 2 - 9, y + sh - 22, 18, 22);
    // verlicht raam 's nachts
    if (night) {
      g.fillStyle = 'rgba(255,214,120,.9)';
      g.fillRect(x + 8, y + 10, 12, 10);
      g.fillRect(x + sw - 20, y + 10, 12, 10);
    }
  }
  g.fillStyle = night ? 'rgba(255,255,255,.6)' : '#3a2c1c';
  g.font = '600 13px system-ui';
  g.fillText(n > 1 ? n + ' stallen' : 'Stal', 26, h * 0.14 - 20);

  // bomen rechts
  for (const [tx, ty, r] of [[w * 0.82, h * 0.78, 26], [w * 0.9, h * 0.86, 20], [w * 0.74, h * 0.9, 18]]) {
    g.fillStyle = night ? '#3a2a1e' : '#6b4a2c';
    g.fillRect(tx - 3, ty, 6, 16);
    g.fillStyle = night ? '#274031' : '#4f7a3a';
    g.beginPath(); g.arc(tx, ty, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = night ? '#2f4a39' : '#5c8a44';
    g.beginPath(); g.arc(tx - r * 0.4, ty - r * 0.3, r * 0.6, 0, Math.PI * 2); g.fill();
  }

  // lucht/hemellichaam: kleine zon of maan hoek rechtsboven
  if (night) {
    g.fillStyle = '#f2efe0';
    g.beginPath(); g.arc(w - 46, 40, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = night ? '#2c4a35' : '#79a552';
    g.beginPath(); g.arc(w - 40, 34, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    for (let i = 0; i < 20; i++) {
      g.globalAlpha = rand(0.3, 0.9);
      g.fillRect((i * 71) % w, (i * 37) % (h * 0.4), 2, 2);
    }
    g.globalAlpha = 1;
  } else {
    const sun = g.createRadialGradient(w - 44, 42, 4, w - 44, 42, 22);
    sun.addColorStop(0, '#fff3c4');
    sun.addColorStop(1, 'rgba(255,220,120,0)');
    g.fillStyle = sun;
    g.beginPath(); g.arc(w - 44, 42, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe27a';
    g.beginPath(); g.arc(w - 44, 42, 12, 0, Math.PI * 2); g.fill();
  }

  // nacht-overlay
  if (night) {
    g.fillStyle = 'rgba(20,30,70,.28)';
    g.fillRect(0, 0, w, h);
  }
}

function skyGradient(g, w, h, night) {
  const sky = g.createLinearGradient(0, 0, 0, h);
  if (night) { sky.addColorStop(0, '#1b2545'); sky.addColorStop(1, '#33406b'); }
  else { sky.addColorStop(0, '#8ec5ea'); sky.addColorStop(1, '#cfe6f2'); }
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
}

// ============================================================
//  Hoofd-init
// ============================================================

export function init(root, ctx) {
  injectStyles();

  const defaultSave = () => ({
    version: 1,
    onboarded: false,
    money: START_MONEY,
    night: false,
    stables: 1,
    horses: [],
    activeId: null,
    points: 0,
    lastBonus: null,
    careTs: Date.now(),
  });

  let save = ctx.load() || defaultSave();
  // veiligheidsnet voor oude/incomplete saves
  save = Object.assign(defaultSave(), save);
  for (const h of save.horses) {
    if (!h.markings) h.markings = randomMarkings();
    if (!h.tack) h.tack = { zadel: 0, hoofdstel: 0 };
  }

  let screen = save.onboarded ? 'erf' : 'onboarding';
  let raf = null;
  const listeners = [];
  function on(target, ev, fn, opts) { target.addEventListener(ev, fn, opts); listeners.push([target, ev, fn, opts]); }
  function stopRaf() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // Schermvullend-richtlijn: begrens de weergavebreedte van een canvas zó dat
  // hij (met alles wat er binnen het scherm nog onder staat) in beeld past.
  let refit = null;
  function fitCanvas(id, min = 160) {
    const cv = app.querySelector('#' + id);
    if (!cv) return;
    const wrap = cv.closest('.ps-canvas-wrap') || cv;
    const below = heightBelow(wrap) + 24;
    const h = availableHeight(cv, below, min);
    cv.style.maxWidth = Math.round(h * (cv.width / cv.height)) + 'px';
  }
  function setRefit(fn) { refit = fn; if (fn) requestAnimationFrame(fn); }
  on(window, 'resize', () => { if (refit) refit(); });

  root.className = 'ps';
  root.innerHTML = '<div id="ps-app"></div>';
  const app = root.querySelector('#ps-app');

  // ---------- opslag & economie ----------
  function persist() { save.careTs = Date.now(); ctx.save(save); }
  function activeHorse() { return save.horses.find((h) => h.id === save.activeId) || save.horses[0] || null; }
  function freeStables() { return save.stables - save.horses.length; }

  function applyDecay() {
    // Verzorging loopt langzaam terug met verstreken tijd (max ~ per 12 uur).
    const hours = Math.max(0, (Date.now() - (save.careTs || Date.now())) / 3600000);
    if (hours <= 0) return;
    for (const h of save.horses) {
      h.cleanliness = clamp(h.cleanliness - hours * 3);
      h.hunger = clamp(h.hunger - hours * 4);
      h.energy = clamp(h.energy + hours * 2); // rust in de stal geeft energie terug
      h.happiness = clamp((h.cleanliness + h.hunger) / 2);
    }
    save.careTs = Date.now();
  }

  function addPoints(p) {
    save.points += p;
    ctx.submitScore(save.points);
  }

  // ---------- herbruikbare UI ----------
  function hud() {
    const h = activeHorse();
    return `<div class="ps-hud">
      <span class="stat">Saldo <b>${euro(save.money)}</b></span>
      <span class="stat"><b>${save.points}</b> punten</span>
      ${h ? `<span class="ps-badge">${h.name} · ${BREEDS[h.breed].name}</span>` : ''}
      <span class="ps-spacer"></span>
      <button class="btn" id="ps-daynight">${save.night ? 'Nacht' : 'Dag'}</button>
    </div>`;
  }

  function bar(label, val, color) {
    return `<div class="ps-bar"><span>${label}</span>
      <span class="track"><span class="fill" style="width:${clamp(val)}%;background:${color}"></span></span>
      <b>${Math.round(val)}</b></div>`;
  }

  function nav(buttons) {
    return `<div class="ps-nav">${buttons.map((b) =>
      `<button class="btn ${b.primary ? 'btn-primary' : ''}" data-go="${b.go}">${b.label}</button>`).join('')}</div>`;
  }

  function bindCommon() {
    const dn = app.querySelector('#ps-daynight');
    if (dn) on(dn, 'click', () => { save.night = !save.night; persist(); render(); });
    app.querySelectorAll('[data-go]').forEach((b) =>
      on(b, 'click', () => { screen = b.dataset.go; render(); }));
  }

  // Voegt een uitslagpaneel toe als NIEUW element. Belangrijk: niet via
  // innerHTML += op een paneel dat een canvas bevat, want dan herbouwt de
  // browser het canvas en verdwijnt de getekende afbeelding.
  function appendResult(html) {
    const res = document.createElement('div');
    res.className = 'ps-panel';
    res.style.marginTop = '1rem';
    res.innerHTML = html;
    app.appendChild(res);
    bindCommon();
  }

  // Tekent een paardportret op een canvas-element (met lucht + grond).
  function paintPortrait(canvas, horse, opts = {}) {
    const g = canvas.getContext('2d');
    const w = canvas.width, hgt = canvas.height;
    skyGradient(g, w, hgt, save.night);
    // grond
    g.fillStyle = save.night ? '#3a5540' : '#7aa451';
    g.fillRect(0, hgt * 0.7, w, hgt * 0.3);
    const dirt = horse.cleanliness == null ? 0 : 1 - horse.cleanliness / 100;
    drawHorse(g, w / 2, hgt * 0.66, (BREEDS[horse.breed].size || 1) * (w / 320), horse.coat, {
      dirt,
      breed: horse.breed,
      markings: horse.markings,
      tack: opts.tack ? horse.tack : null,
      legPhase: opts.pose === 'run' ? performance.now() / 90 : 0,
    });
  }

  // ============================================================
  //  Scherm: onboarding (kies je eerste paard)
  // ============================================================
  function renderOnboarding() {
    stopRaf();
    const starters = [
      { breed: 'shetland', coat: 'bruin' },
      { breed: 'kwpn', coat: 'vos' },
      { breed: 'fries', coat: 'zwart' },
    ];
    app.innerHTML = `
      <h2 style="margin:.2rem 0">Welkom op je eigen manege</h2>
      <p class="ps-hint">Je krijgt één gratis stal en je eerste paard. Kies je beginnerspaard — je kunt er later meer kopen.</p>
      <div class="ps-choose" id="ps-starters">
        ${starters.map((s, i) => {
          const b = BREEDS[s.breed];
          return `<div class="ps-item" data-i="${i}">
            <canvas width="260" height="150" class="ps-portrait"></canvas>
            <h4>${b.name}</h4>
            <div class="muted">${COATS[s.coat].name}</div>
            <div class="muted">Snelheid ${b.base.speed} · Springen ${b.base.jumping} · Uithouding ${b.base.stamina} · Dressuur ${b.base.dressage}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="ps-row" style="margin-top:1rem">
        <label>Naam: <input id="ps-name" class="btn" style="min-width:9rem" value="${pick(HORSE_NAMES)}"></label>
        <button class="btn btn-primary" id="ps-confirm" disabled>Kies dit paard</button>
      </div>
      <div class="ps-msg" id="ps-msg"></div>`;

    let chosen = null;
    const items = [...app.querySelectorAll('#ps-starters .ps-item')];
    items.forEach((el, i) => {
      const b = starters[i];
      paintPortrait(el.querySelector('canvas'), { breed: b.breed, coat: b.coat, cleanliness: 100 });
      on(el, 'click', () => {
        chosen = i;
        items.forEach((x) => x.classList.remove('sel'));
        el.classList.add('sel');
        app.querySelector('#ps-confirm').disabled = false;
      });
    });
    on(app.querySelector('#ps-confirm'), 'click', () => {
      if (chosen == null) return;
      const s = starters[chosen];
      const name = (app.querySelector('#ps-name').value || pick(HORSE_NAMES)).slice(0, 16);
      save.horses.push(makeHorse(s.breed, s.coat, name));
      save.activeId = save.horses[0].id;
      save.onboarded = true;
      persist();
      screen = 'erf';
      render();
    });
  }

  let horseSeq = 1;
  function makeHorse(breed, coat, name) {
    const b = BREEDS[breed];
    return {
      id: 'h' + Date.now() + '_' + (horseSeq++),
      name: name || pick(HORSE_NAMES),
      breed, coat,
      speed: b.base.speed, jumping: b.base.jumping, stamina: b.base.stamina, dressage: b.base.dressage,
      cleanliness: 90, energy: 100, hunger: 90, happiness: 90,
      level: 1, xp: 0,
      tack: { zadel: 0, hoofdstel: 0 },
      markings: randomMarkings(),
    };
  }

  // ============================================================
  //  Scherm: erf (overzicht)
  // ============================================================
  function renderErf() {
    stopRaf();
    app.innerHTML = hud() + `
      <div class="ps-canvas-wrap"><canvas id="ps-farm" width="720" height="440"></canvas></div>
      ${nav([
        { go: 'stal', label: 'Stal & paarden', primary: true },
        { go: 'verzorgen', label: 'Verzorgen' },
        { go: 'buitenbak', label: 'Buitenbak' },
        { go: 'winkel', label: 'Winkel' },
      ])}
      <div class="ps-hint">Klik op een gebouw of gebruik de knoppen. Wissel met de dag/nacht-knop rechtsboven.</div>`;
    bindCommon();
    const canvas = app.querySelector('#ps-farm');
    const g = canvas.getContext('2d');
    drawFarm(g, canvas.width, canvas.height, save.night, save.stables);
    // klikbare hotspots
    on(canvas, 'click', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      if (y < 0.42) screen = 'stal';
      else if (x < 0.44 && y > 0.68) screen = 'buitenbak';
      else screen = 'verzorgen';
      render();
    });
    // dagelijkse bonus
    if (save.lastBonus !== todayKey()) {
      const msg = document.createElement('div');
      msg.className = 'ps-msg';
      msg.innerHTML = `Dagelijkse bonus beschikbaar! <button class="btn" id="ps-bonus">Claim ${euro(DAILY_BONUS)}</button>`;
      app.appendChild(msg);
      on(msg.querySelector('#ps-bonus'), 'click', () => {
        save.money += DAILY_BONUS; save.lastBonus = todayKey(); persist(); render();
      });
    }
    setRefit(() => fitCanvas('ps-farm'));
  }

  // ============================================================
  //  Scherm: stal & paarden
  // ============================================================
  function renderStal() {
    stopRaf();
    const cards = save.horses.map((h) => {
      const active = h.id === save.activeId;
      return `<div class="ps-item">
        <canvas width="240" height="130" class="ps-portrait" data-portrait="${h.id}"></canvas>
        <h4>${h.name} ${active ? '<span class="ps-badge">actief</span>' : ''}</h4>
        <div class="muted">${BREEDS[h.breed].name} · ${COATS[h.coat].name} · niv. ${h.level}</div>
        <div class="ps-bars">
          ${bar('Netheid', h.cleanliness, '#4b80e0')}
          ${bar('Energie', h.energy, '#e0a63b')}
        </div>
        ${active ? '' : `<button class="btn" data-activate="${h.id}">Maak actief</button>`}
      </div>`;
    }).join('');

    const canBuyHorse = freeStables() > 0;
    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>Jouw paarden (${save.horses.length})</h3>
        <div class="ps-grid">${cards}</div>
      </div>
      <div class="ps-panel">
        <h3>Uitbreiden</h3>
        <div class="ps-row">
          <span class="ps-badge">Stallen: ${save.stables} · vrij: ${freeStables()}</span>
          <button class="btn" id="ps-buy-stable">Koop stal (${euro(stablePrice(save.stables + 1))})</button>
          <button class="btn btn-primary" id="ps-goto-market" ${canBuyHorse ? '' : 'disabled'}>Koop nieuw paard</button>
        </div>
        <div class="ps-hint">Je hebt een vrije stal nodig voordat je een nieuw paard kunt kopen.</div>
        <div class="ps-msg" id="ps-msg"></div>
      </div>
      ${nav([{ go: 'erf', label: '← Terug naar erf' }])}`;
    bindCommon();

    save.horses.forEach((h) => {
      const cv = app.querySelector(`[data-portrait="${h.id}"]`);
      if (cv) paintPortrait(cv, h, { tack: true });
    });
    app.querySelectorAll('[data-activate]').forEach((b) =>
      on(b, 'click', () => { save.activeId = b.dataset.activate; persist(); render(); }));

    on(app.querySelector('#ps-buy-stable'), 'click', () => {
      const price = stablePrice(save.stables + 1);
      const msg = app.querySelector('#ps-msg');
      if (save.money < price) { msg.textContent = 'Niet genoeg geld voor een stal.'; return; }
      save.money -= price; save.stables += 1; persist(); render();
    });
    on(app.querySelector('#ps-goto-market'), 'click', () => { screen = 'markt'; render(); });
  }

  // ============================================================
  //  Scherm: paardenmarkt (nieuw paard kopen)
  // ============================================================
  function renderMarkt() {
    stopRaf();
    const coatKeys = Object.keys(COATS);
    const offers = Object.keys(BREEDS).filter((b) => b !== 'shetland').map((breed, i) => ({
      breed, coat: coatKeys[i % coatKeys.length],
    }));
    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>Paardenmarkt</h3>
        <div class="ps-hint">Vrije stallen: ${freeStables()}. Elk gekocht paard neemt een stal in beslag.</div>
        <div class="ps-choose" style="margin-top:.8rem">
          ${offers.map((o, i) => {
            const b = BREEDS[o.breed];
            return `<div class="ps-item">
              <canvas width="240" height="130" class="ps-portrait" data-offer="${i}"></canvas>
              <h4>${b.name}</h4>
              <div class="muted">${COATS[o.coat].name}</div>
              <div class="muted">Spd ${b.base.speed} · Spr ${b.base.jumping} · Uit ${b.base.stamina} · Dre ${b.base.dressage}</div>
              <span class="price">${euro(b.price)}</span>
              <button class="btn btn-primary" data-buy="${i}" ${freeStables() > 0 ? '' : 'disabled'}>Kopen</button>
            </div>`;
          }).join('')}
        </div>
        <div class="ps-msg" id="ps-msg"></div>
      </div>
      ${nav([{ go: 'stal', label: '← Terug naar stal' }])}`;
    bindCommon();

    offers.forEach((o, i) => {
      const cv = app.querySelector(`[data-offer="${i}"]`);
      if (cv) paintPortrait(cv, { breed: o.breed, coat: o.coat, cleanliness: 100 });
    });
    app.querySelectorAll('[data-buy]').forEach((btn) =>
      on(btn, 'click', () => {
        const o = offers[Number(btn.dataset.buy)];
        const price = BREEDS[o.breed].price;
        const msg = app.querySelector('#ps-msg');
        if (freeStables() <= 0) { msg.textContent = 'Geen vrije stal. Koop eerst een stal.'; return; }
        if (save.money < price) { msg.textContent = 'Niet genoeg geld voor dit paard.'; return; }
        save.money -= price;
        save.horses.push(makeHorse(o.breed, o.coat, pick(HORSE_NAMES)));
        persist(); render();
      }));
  }

  // ============================================================
  //  Scherm: verzorgen
  // ============================================================
  function renderVerzorgen() {
    stopRaf();
    const h = activeHorse();
    if (!h) { screen = 'stal'; return render(); }
    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>${h.name} verzorgen</h3>
        <div class="ps-row">
          <canvas id="ps-care-portrait" width="360" height="200" class="ps-portrait"></canvas>
          <div class="ps-bars" style="flex:1;min-width:12rem">
            ${bar('Netheid', h.cleanliness, '#4b80e0')}
            ${bar('Honger', h.hunger, '#7ac24b')}
            ${bar('Energie', h.energy, '#e0a63b')}
            ${bar('Geluk', h.happiness, '#e05ba0')}
          </div>
        </div>
        <div class="ps-row" style="margin-top:.8rem">
          <button class="btn" data-care="poets">Poetsen</button>
          <button class="btn" data-care="voer">Voeren</button>
          <button class="btn" data-care="water">Water geven</button>
          <button class="btn" data-care="rust">Laten rusten</button>
        </div>
        <div class="ps-hint">Een vies of moe paard presteert tot 45% slechter bij wedstrijden. Verzorging loopt langzaam terug.</div>
        <div class="ps-msg" id="ps-msg"></div>
      </div>
      ${nav([{ go: 'buitenbak', label: 'Naar buitenbak', primary: true }, { go: 'erf', label: '← Erf' }])}`;
    bindCommon();
    const cv = app.querySelector('#ps-care-portrait');
    const repaint = () => paintPortrait(cv, h);
    repaint();
    app.querySelectorAll('[data-care]').forEach((b) =>
      on(b, 'click', () => {
        const a = b.dataset.care;
        if (a === 'poets') h.cleanliness = clamp(h.cleanliness + 22);
        if (a === 'voer') h.hunger = clamp(h.hunger + 25);
        if (a === 'water') h.hunger = clamp(h.hunger + 10);
        if (a === 'rust') h.energy = clamp(h.energy + 30);
        h.happiness = clamp((h.cleanliness + h.hunger + h.energy) / 3);
        persist();
        // alleen de balken en het portret verversen
        renderVerzorgen();
      }));
  }

  // ============================================================
  //  Scherm: buitenbak (training + disciplines)
  // ============================================================
  function renderBuitenbak() {
    stopRaf();
    const h = activeHorse();
    if (!h) { screen = 'stal'; return render(); }
    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>Buitenbak — ${h.name}</h3>
        <div class="ps-bars">
          ${bar('Snelheid', h.speed, '#e05b5b')}
          ${bar('Springen', h.jumping, '#5b8ae0')}
          ${bar('Uithouding', h.stamina, '#5be0a0')}
          ${bar('Dressuur', h.dressage, '#c25be0')}
          ${bar('Energie', h.energy, '#e0a63b')}
        </div>
        <h3 style="margin-top:1rem">Trainen</h3>
        <div class="ps-hint">Training kost energie en maakt je paard wat vies, maar verhoogt een vaardigheid.</div>
        <div class="ps-row" style="margin-top:.5rem">
          <button class="btn" data-train="speed">Snelheid +</button>
          <button class="btn" data-train="jumping">Springen +</button>
          <button class="btn" data-train="stamina">Uithouding +</button>
          <button class="btn" data-train="dressage">Dressuur +</button>
        </div>
        <div class="ps-msg" id="ps-msg"></div>
      </div>
      <div class="ps-panel">
        <h3>Wedstrijden</h3>
        <div class="ps-disc">
          <button class="btn btn-primary" data-go="springen">Springen (parcours)</button>
          <button class="btn btn-primary" data-go="dressuur">Dressuur</button>
          <button class="btn btn-primary" data-go="race">Race</button>
        </div>
      </div>
      ${nav([{ go: 'verzorgen', label: 'Verzorgen' }, { go: 'erf', label: '← Erf' }])}`;
    bindCommon();
    app.querySelectorAll('[data-train]').forEach((b) =>
      on(b, 'click', () => {
        const stat = b.dataset.train;
        const msg = app.querySelector('#ps-msg');
        if (h.energy < 15) { msg.textContent = 'Te weinig energie. Laat je paard eerst rusten.'; return; }
        h[stat] = clamp(h[stat] + rand(2, 5));
        h.energy = clamp(h.energy - 14);
        h.cleanliness = clamp(h.cleanliness - 8);
        h.xp += 10;
        if (h.xp >= h.level * 100) { h.xp = 0; h.level += 1; }
        persist();
        renderBuitenbak();
      }));
  }

  // ============================================================
  //  Discipline: springen — parcoursbouwer + rit
  // ============================================================
  let course = null; // array van hoogtes (cm)

  function renderSpringen() {
    stopRaf();
    if (!course) course = [70, 85, 100];
    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>Parcoursbouwer</h3>
        <div class="ps-hint">Voeg hindernissen toe en stel per stuk de hoogte in (40–150 cm). Rijd daarna het parcours.</div>
        <div class="ps-canvas-wrap" style="margin-top:.6rem"><canvas id="ps-course" width="720" height="220"></canvas></div>
        <div id="ps-fences" style="margin-top:.7rem;display:flex;flex-direction:column;gap:.5rem"></div>
        <div class="ps-row" style="margin-top:.7rem">
          <button class="btn" id="ps-add-fence">+ Hindernis</button>
          <button class="btn btn-primary" id="ps-ride">Rijd parcours</button>
        </div>
        <div class="ps-msg" id="ps-msg"></div>
      </div>
      ${nav([{ go: 'buitenbak', label: '← Terug' }])}`;
    bindCommon();

    const drawCourse = () => {
      const cv = app.querySelector('#ps-course');
      const g = cv.getContext('2d');
      skyGradient(g, cv.width, cv.height, save.night);
      g.fillStyle = save.night ? '#8a7a56' : '#d9c39a';
      g.fillRect(0, cv.height * 0.7, cv.width, cv.height * 0.3);
      const gap = cv.width / (course.length + 1);
      course.forEach((ht, i) => {
        const x = gap * (i + 1);
        const px = (ht / 150) * 90;
        g.fillStyle = '#c0392b';
        g.fillRect(x - 3, cv.height * 0.7 - px, 6, px);
        g.fillStyle = '#eee';
        for (let b = 0; b < 3; b++) g.fillRect(x - 22, cv.height * 0.7 - px + b * (px / 3), 44, 4);
        g.fillStyle = save.night ? '#fff' : '#222';
        g.font = '600 12px system-ui';
        g.fillText(ht + ' cm', x - 18, cv.height * 0.7 - px - 6);
      });
      if (save.night) { g.fillStyle = 'rgba(20,30,70,.28)'; g.fillRect(0, 0, cv.width, cv.height); }
    };
    const drawFenceList = () => {
      const box = app.querySelector('#ps-fences');
      box.innerHTML = course.map((ht, i) =>
        `<div class="ps-slider"><span class="ps-badge">#${i + 1}</span>
          <input type="range" min="40" max="150" step="5" value="${ht}" data-f="${i}">
          <b style="width:4rem">${ht} cm</b>
          <button class="btn" data-del="${i}">✕</button></div>`).join('');
      box.querySelectorAll('input[data-f]').forEach((inp) =>
        on(inp, 'input', () => { course[Number(inp.dataset.f)] = Number(inp.value); drawFenceList(); drawCourse(); }));
      box.querySelectorAll('[data-del]').forEach((b) =>
        on(b, 'click', () => { if (course.length > 1) { course.splice(Number(b.dataset.del), 1); drawFenceList(); drawCourse(); } }));
    };
    drawCourse(); drawFenceList();
    on(app.querySelector('#ps-add-fence'), 'click', () => {
      if (course.length >= 8) return;
      course.push(80); drawFenceList(); drawCourse();
    });
    on(app.querySelector('#ps-ride'), 'click', () => rideCourse());
    setRefit(() => fitCanvas('ps-course', 120));
  }

  function rideCourse() {
    stopRaf();
    const h = activeHorse();
    const tack = h.tack.zadel != null ? (TACK.zadel[h.tack.zadel].bonus + TACK.hoofdstel[h.tack.hoofdstel].bonus) : 0;
    const skill = clamp(h.jumping * careFactor(h) + tack, 0, 130);
    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>Springrit</h3>
        <div class="ps-canvas-wrap"><canvas id="ps-ride" width="720" height="260"></canvas></div>
        <div class="ps-hint">Druk op <b>spatie</b> of <b>tik</b> vlak voor de hindernis om te springen. Timing + springkracht bepalen of je hem haalt.</div>
        <div class="ps-msg" id="ps-msg"></div>
      </div>`;
    const cv = app.querySelector('#ps-ride');
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height, ground = H * 0.78;
    const fences = course.map((ht, i) => ({ ht, x: 300 + i * 220, done: false, ok: false }));
    let scroll = 0, horseY = 0, vy = 0, jumping = false;
    let clears = 0, faults = 0, maxCleared = 0, finished = false;
    const speed = 2.4;

    const tryJump = () => {
      if (jumping || finished) return;
      // vind eerstvolgende ongedane hindernis
      const next = fences.find((f) => !f.done);
      if (!next) return;
      const dist = next.x - scroll - 150; // afstand van paard (x=150) tot hindernis
      if (dist < 130 && dist > -20) {
        jumping = true; vy = -7.5;
        // kans op afwerpen hangt af van timing en skill/hoogte
        const timing = 1 - Math.min(1, Math.abs(dist - 55) / 90);
        const chance = clamp(skill - next.ht * 0.6, 5, 95) / 100 * (0.5 + 0.5 * timing);
        next.result = Math.random() < chance;
      }
    };
    on(window, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); tryJump(); } });
    on(cv, 'pointerdown', tryJump);

    const loop = () => {
      scroll += speed;
      if (jumping) {
        horseY += vy; vy += 0.4;
        if (horseY >= 0) { horseY = 0; jumping = false; }
      }
      // hindernissen afhandelen
      for (const f of fences) {
        if (!f.done && (f.x - scroll - 150) < -20) {
          f.done = true;
          if (f.result && jumping) { f.ok = true; clears++; maxCleared = Math.max(maxCleared, f.ht); }
          else if (f.result) { f.ok = true; clears++; maxCleared = Math.max(maxCleared, f.ht); }
          else { faults++; }
        }
      }
      // render
      skyGradient(g, W, H, save.night);
      g.fillStyle = save.night ? '#8a7a56' : '#d9c39a';
      g.fillRect(0, ground, W, H - ground);
      for (const f of fences) {
        const x = f.x - scroll;
        if (x < -60 || x > W + 60) continue;
        const px = (f.ht / 150) * 100;
        g.fillStyle = f.done ? (f.ok ? '#2e7d32' : '#8a8a8a') : '#c0392b';
        g.fillRect(x - 3, ground - px, 6, px);
        g.fillStyle = '#eee';
        for (let b = 0; b < 3; b++) g.fillRect(x - 20, ground - px + b * (px / 3), 40, 4);
      }
      drawHorse(g, 150, ground - 6 + horseY, 0.9, h.coat, {
        legPhase: performance.now() / 70, dirt: 1 - h.cleanliness / 100,
        breed: h.breed, markings: h.markings, tack: h.tack,
        jump: Math.min(1, Math.max(0, -horseY / 16)),
      });
      if (save.night) { g.fillStyle = 'rgba(20,30,70,.28)'; g.fillRect(0, 0, W, H); }
      g.fillStyle = save.night ? '#fff' : '#1a1a1a';
      g.font = '600 14px system-ui';
      g.fillText(`Gesprongen: ${clears}   Fouten: ${faults}`, 12, 22);

      if (!finished && fences.every((f) => f.done) && (fences[fences.length - 1].x - scroll) < 120) {
        finished = true;
        stopRaf();
        finishSpringen(clears, faults, maxCleared, h);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    setRefit(() => fitCanvas('ps-ride'));
    raf = requestAnimationFrame(loop);
  }

  function finishSpringen(clears, faults, maxCleared, h) {
    const pts = Math.max(0, clears * 20 + maxCleared - faults * 15);
    const prize = clears * 40 + (faults === 0 ? 100 : 0);
    save.money += prize;
    h.energy = clamp(h.energy - 20);
    h.cleanliness = clamp(h.cleanliness - 15);
    if (pts > 0) addPoints(pts);
    persist();
    appendResult(`
      <h3>Uitslag springen</h3>
      <p>Gesprongen: <b>${clears}</b> · Fouten: <b>${faults}</b> · Hoogste: <b>${maxCleared} cm</b></p>
      <p>Wedstrijdpunten: <b>+${pts}</b> · Prijzengeld: <b>${euro(prize)}</b></p>
      <div class="ps-row">
        <button class="btn btn-primary" data-go="springen">Opnieuw bouwen</button>
        <button class="btn" data-go="buitenbak">Naar buitenbak</button>
      </div>`);
  }

  // ============================================================
  //  Discipline: dressuur (ritme/timing)
  // ============================================================
  function renderDressuur() {
    stopRaf();
    const h = activeHorse();
    const tack = TACK.zadel[h.tack.zadel].bonus + TACK.hoofdstel[h.tack.hoofdstel].bonus;
    const skill = clamp(h.dressage * careFactor(h) + tack, 0, 130);
    const zone = clamp(18 + skill * 0.22, 18, 46); // grotere trefzone bij betere dressuur
    const moves = ['Draf', 'Galop', 'Piaffe', 'Volte', 'Halt', 'Appuyement', 'Verzamelde draf', 'Uitstrekken'];
    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>Dressuurproef</h3>
        <div class="ps-canvas-wrap"><canvas id="ps-dress" width="720" height="220"></canvas></div>
        <div class="ps-hint">Druk op <b>spatie</b> of <b>tik</b> wanneer de wijzer in het groene vlak staat. Acht oefeningen bepalen je jurycijfer.</div>
        <div class="ps-msg" id="ps-msg"></div>
      </div>`;
    const cv = app.querySelector('#ps-dress');
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    let idx = 0, marker = 0, dir = 1, scores = [], locked = false, finished = false;
    const baseSpeed = 3.2;

    const hit = () => {
      if (locked || finished) return;
      const center = W / 2;
      const acc = 1 - Math.min(1, Math.abs(marker - center) / (zone * 2));
      scores.push(acc);
      locked = true;
      setTimeout(() => {
        idx++; locked = false; marker = 40; dir = 1;
        if (idx >= 8) finishDressuur();
      }, 350);
    };
    on(window, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); hit(); } });
    on(cv, 'pointerdown', hit);

    const finishDressuur = () => {
      finished = true; stopRaf();
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const cijfer = (4 + avg * 6).toFixed(1); // 4.0 - 10.0
      const pts = Math.round(avg * 100);
      const prize = Math.round(avg * 180);
      save.money += prize; h.energy = clamp(h.energy - 15); h.cleanliness = clamp(h.cleanliness - 6);
      if (pts > 0) addPoints(pts);
      persist();
      appendResult(`
        <h3>Jurycijfer: ${cijfer}</h3>
        <p>Wedstrijdpunten: <b>+${pts}</b> · Prijzengeld: <b>${euro(prize)}</b></p>
        <div class="ps-row">
          <button class="btn btn-primary" data-go="dressuur">Opnieuw</button>
          <button class="btn" data-go="buitenbak">Naar buitenbak</button>
        </div>`);
    };

    const loop = () => {
      marker += dir * baseSpeed;
      if (marker > W - 30 || marker < 30) dir *= -1;
      skyGradient(g, W, H, save.night);
      g.fillStyle = save.night ? '#3a5540' : '#7aa451';
      g.fillRect(0, H * 0.62, W, H * 0.38);
      // trefzone
      g.fillStyle = 'rgba(46,125,50,.35)';
      g.fillRect(W / 2 - zone, 40, zone * 2, H - 90);
      g.strokeStyle = '#2e7d32'; g.lineWidth = 2;
      g.strokeRect(W / 2 - zone, 40, zone * 2, H - 90);
      // wijzer
      g.fillStyle = '#c0392b';
      g.fillRect(marker - 2, 30, 4, H - 70);
      // paard + oefening
      drawHorse(g, W * 0.18, H * 0.7, 0.7, h.coat, { legPhase: performance.now() / 120, dirt: 1 - h.cleanliness / 100, breed: h.breed, markings: h.markings, tack: h.tack });
      g.fillStyle = save.night ? '#fff' : '#1a1a1a';
      g.font = '700 18px system-ui';
      g.fillText(`Oefening ${Math.min(idx + 1, 8)}/8: ${moves[idx % moves.length]}`, 16, 26);
      if (save.night) { g.fillStyle = 'rgba(20,30,70,.28)'; g.fillRect(0, 0, W, H); }
      if (!finished) raf = requestAnimationFrame(loop);
    };
    setRefit(() => fitCanvas('ps-dress'));
    raf = requestAnimationFrame(loop);
  }

  // ============================================================
  //  Discipline: race
  // ============================================================
  function renderRace() {
    stopRaf();
    const h = activeHorse();
    const tack = TACK.zadel[h.tack.zadel].bonus + TACK.hoofdstel[h.tack.hoofdstel].bonus;
    const cf = careFactor(h);
    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>Race</h3>
        <div class="ps-canvas-wrap"><canvas id="ps-race" width="720" height="300"></canvas></div>
        <div class="ps-hint">Houd <b>spatie</b> of <b>vinger</b> ingedrukt om te versnellen; loslaten laat je uithouding herstellen. Raak je uitgeput, dan val je stil.</div>
        <div class="ps-msg" id="ps-msg"></div>
      </div>`;
    const cv = app.querySelector('#ps-race');
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const TRACK = 2000;
    const lanes = 4;
    const runners = [];
    // speler
    runners.push({ player: true, name: h.name, coat: h.coat, breed: h.breed, markings: h.markings, tack: h.tack,
      dist: 0, v: 0, maxV: 2.2 + (h.speed / 100) * 2.4 + tack / 60, stam: h.stamina, energy: 100 });
    const rivalBreeds = ['volbloed', 'kwpn', 'holsteiner'];
    for (let i = 0; i < lanes - 1; i++) {
      runners.push({ player: false, name: 'Tegenstander', coat: pick(['bruin', 'vos', 'zwart', 'schimmel']),
        breed: rivalBreeds[i % rivalBreeds.length], markings: randomMarkings(),
        dist: 0, v: 0, maxV: 3.0 + rand(-0.3, 0.5), stam: rand(50, 80), energy: 100, ai: rand(0.6, 0.85) });
    }
    let holding = false, finished = false, startT = performance.now();
    const setHold = (v) => { holding = v; };
    on(window, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); setHold(true); } });
    on(window, 'keyup', (e) => { if (e.code === 'Space') setHold(false); });
    on(cv, 'pointerdown', () => setHold(true));
    on(cv, 'pointerup', () => setHold(false));
    on(cv, 'pointerleave', () => setHold(false));

    const loop = () => {
      for (const r of runners) {
        let want;
        if (r.player) want = holding && r.energy > 0;
        else want = Math.random() < r.ai && r.energy > 5;
        if (want) {
          r.v += 0.08; r.energy -= (0.25 + (r.maxV - 2) * 0.15) * (r.player ? (100 / (h.stamina + 40)) : (100 / (r.stam + 40)));
        } else {
          r.v -= 0.05; r.energy = Math.min(100, r.energy + 0.35);
        }
        r.v = Math.max(0.4, Math.min(r.maxV * (r.player ? cf : 1), r.v));
        if (r.energy <= 0) { r.energy = 0; r.v = Math.max(0.4, r.v - 0.15); }
        r.dist += r.v;
      }
      const leader = Math.max(...runners.map((r) => r.dist));
      // render
      skyGradient(g, W, H, save.night);
      for (let l = 0; l < lanes; l++) {
        g.fillStyle = l % 2 ? (save.night ? '#3a5540' : '#7aa451') : (save.night ? '#33503b' : '#6f9a4d');
        g.fillRect(0, 40 + l * ((H - 60) / lanes), W, (H - 60) / lanes);
      }
      // finishlijn
      const camera = Math.max(0, leader - (W - 200));
      const fx = TRACK - camera;
      if (fx < W + 20) { for (let y = 40; y < H - 20; y += 16) { g.fillStyle = ((y / 16) | 0) % 2 ? '#fff' : '#111'; g.fillRect(fx, y, 8, 16); } }
      runners.forEach((r, i) => {
        const x = 90 + (r.dist - camera);
        const y = 40 + i * ((H - 60) / lanes) + ((H - 60) / lanes) / 2 + 6;
        drawHorse(g, x, y, 0.52, r.coat, { legPhase: performance.now() / 60 + i, dirt: r.player ? 1 - h.cleanliness / 100 : 0, breed: r.breed, markings: r.markings, tack: r.tack });
        if (r.player) {
          g.fillStyle = save.night ? '#ffe27a' : '#1a3a6a';
          g.font = '700 12px system-ui';
          g.fillText('JIJ', x - 12, y - 34);
        }
      });
      // energiebalk speler
      const p = runners[0];
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(12, 12, 160, 14);
      g.fillStyle = p.energy > 25 ? '#5be0a0' : '#e05b5b'; g.fillRect(12, 12, 160 * p.energy / 100, 14);
      g.fillStyle = '#fff'; g.font = '600 11px system-ui'; g.fillText('Uithouding', 16, 23);
      if (save.night) { g.fillStyle = 'rgba(20,30,70,.28)'; g.fillRect(0, 0, W, H); }

      if (!finished && runners.some((r) => r.dist >= TRACK)) {
        finished = true; stopRaf();
        const order = [...runners].sort((a, b) => b.dist - a.dist);
        const place = order.indexOf(runners[0]) + 1;
        finishRace(place, lanes, h);
        return;
      }
      if (!finished) raf = requestAnimationFrame(loop);
    };
    setRefit(() => fitCanvas('ps-race'));
    raf = requestAnimationFrame(loop);
  }

  function finishRace(place, lanes, h) {
    const prizeTable = { 1: 250, 2: 120, 3: 50 };
    const ptsTable = { 1: 100, 2: 60, 3: 30 };
    const prize = prizeTable[place] || 0;
    const pts = ptsTable[place] || 10;
    save.money += prize; h.energy = clamp(h.energy - 25); h.cleanliness = clamp(h.cleanliness - 18);
    addPoints(pts);
    persist();
    const ord = ['', '1e', '2e', '3e', '4e'];
    appendResult(`
      <h3>Je werd ${ord[place] || place + 'e'}!</h3>
      <p>Wedstrijdpunten: <b>+${pts}</b> · Prijzengeld: <b>${euro(prize)}</b></p>
      <div class="ps-row">
        <button class="btn btn-primary" data-go="race">Opnieuw racen</button>
        <button class="btn" data-go="buitenbak">Naar buitenbak</button>
      </div>`);
  }

  // ============================================================
  //  Scherm: winkel (tuig + munten)
  // ============================================================
  function renderWinkel() {
    stopRaf();
    const h = activeHorse();
    const tackCards = (type) => TACK[type].map((t, i) => {
      const owned = h && h.tack[type] >= i;
      const current = h && h.tack[type] === i;
      return `<div class="ps-item">
        <h4>${t.name}</h4>
        <div class="muted">Prestatiebonus +${t.bonus}</div>
        <span class="price">${t.price === 0 ? 'Standaard' : euro(t.price)}</span>
        ${current ? '<span class="ps-badge">in gebruik</span>'
          : owned ? `<button class="btn" data-equip="${type}:${i}">Omdoen</button>`
          : `<button class="btn btn-primary" data-buytack="${type}:${i}">Kopen</button>`}
      </div>`;
    }).join('');

    app.innerHTML = hud() + `
      <div class="ps-panel">
        <h3>Zadels</h3><div class="ps-grid">${tackCards('zadel')}</div>
      </div>
      <div class="ps-panel">
        <h3>Hoofdstellen</h3><div class="ps-grid">${tackCards('hoofdstel')}</div>
      </div>
      <div class="ps-panel">
        <h3>Munten</h3>
        <div class="ps-hint">Gratis, gesimuleerde munten — geen echte betaling. Bedoeld om vlot te kunnen spelen.</div>
        <div class="ps-row" style="margin-top:.6rem">
          <button class="btn" data-coins="200">+ ${euro(200)}</button>
          <button class="btn" data-coins="1000">+ ${euro(1000)}</button>
        </div>
      </div>
      <div class="ps-msg" id="ps-msg"></div>
      ${nav([{ go: 'erf', label: '← Terug naar erf' }])}`;
    bindCommon();

    app.querySelectorAll('[data-buytack]').forEach((b) =>
      on(b, 'click', () => {
        const [type, i] = b.dataset.buytack.split(':'); const idx = Number(i);
        const price = TACK[type][idx].price; const msg = app.querySelector('#ps-msg');
        if (save.money < price) { msg.textContent = 'Niet genoeg geld.'; return; }
        save.money -= price; h.tack[type] = idx; persist(); render();
      }));
    app.querySelectorAll('[data-equip]').forEach((b) =>
      on(b, 'click', () => { const [type, i] = b.dataset.equip.split(':'); h.tack[type] = Number(i); persist(); render(); }));
    app.querySelectorAll('[data-coins]').forEach((b) =>
      on(b, 'click', () => { save.money += Number(b.dataset.coins); persist(); render(); }));
  }

  // ============================================================
  //  Router
  // ============================================================
  function render() {
    stopRaf();
    refit = null;
    applyDecay();
    const screens = {
      onboarding: renderOnboarding, erf: renderErf, stal: renderStal, markt: renderMarkt,
      verzorgen: renderVerzorgen, buitenbak: renderBuitenbak, winkel: renderWinkel,
      springen: renderSpringen, dressuur: renderDressuur, race: renderRace,
    };
    (screens[screen] || renderErf)();
  }

  render();

  // opruimen bij verlaten van de game
  return () => {
    stopRaf();
    for (const [t, ev, fn, opts] of listeners) t.removeEventListener(ev, fn, opts);
  };
}
