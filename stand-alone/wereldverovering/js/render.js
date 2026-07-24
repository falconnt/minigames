// render.js — tekent de wereldkaart, eigendomskleuren, markeringen en de
// troepen-badges op canvas. Puur tekenen; kent geen spelregels.
import { GEO, WORLD_W, WORLD_H } from './geo.js';
import { cam, view, project } from './view.js';
import { game, weergaveTroepen } from './state.js';
import { PLAYER_COLORS, NEUTRAL } from './constants.js';
import { drawFx } from './fx.js';

// Onthouden hoeveel troepen een land had, zodat de badge kan "poppen" bij
// verandering (puur cosmetisch).
const vorigeTroepen = new Map();
const popTijd = new Map();

const OCEAN = '#123152';
const OCEAN2 = '#0d2743';
const BORDER = 'rgba(6,12,22,0.85)';
const GRID = 'rgba(120,170,220,0.06)';

export function kleurVan(i) {
  const o = game.owner[i];
  if (o < 0) return NEUTRAL;
  return PLAYER_COLORS[game.players[o].kleurIdx].hex;
}

function pad(ctx, rings) {
  ctx.beginPath();
  for (const r of rings) {
    const p0 = project(r[0][0], r[0][1]);
    ctx.moveTo(p0[0], p0[1]);
    for (let i = 1; i < r.length; i++) {
      const p = project(r[i][0], r[i][1]);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
  }
}

// bbox van een land in schermpixels (voor culling + badge-plaatsing)
function screenBox(i) {
  const b = GEO[i].bbox;
  const a = project(b[0], b[1]), c = project(b[2], b[3]);
  return [a[0], a[1], c[0], c[1]];
}

// Tekent de bevelen die de huidige speler heeft ingepland: een gestippelde
// pijl met het aantal meegestuurde troepen. Alleen zichtbaar voor die speler.
function tekenBevelen(ctx, bevelen, t) {
  if (!bevelen || !bevelen.length) return;
  const stroom = (t / 55) % 22;
  for (const o of bevelen) {
    if (o.type !== 'aanval' && o.type !== 'verplaats') continue;   // rekruut/bouw heeft geen route
    const a = project(GEO[o.src].cx, GEO[o.src].cy);
    const b = project(GEO[o.dst].cx, GEO[o.dst].cy);
    const aanval = o.type === 'aanval';
    const kleur = aanval ? '#ffd85b' : '#8fd6ff';
    const n = o.troepen.inf + o.troepen.cav + o.troepen.art;

    ctx.save();
    ctx.setLineDash([9, 8]);
    ctx.lineDashOffset = -stroom;
    ctx.strokeStyle = kleur;
    ctx.lineWidth = 2.4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]);

    // pijlpunt
    const hoek = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const px = b[0] - Math.cos(hoek) * 13, py = b[1] - Math.sin(hoek) * 13;
    ctx.translate(px, py); ctx.rotate(hoek);
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-6, 5); ctx.lineTo(-6, -5); ctx.closePath();
    ctx.fillStyle = kleur; ctx.fill();
    ctx.restore();

    // aantal troepen halverwege
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,12,20,0.9)'; ctx.fill();
    ctx.strokeStyle = kleur; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = kleur;
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), mx, my + 0.5);
    ctx.restore();
  }
}

export function draw(ctx, t, sel, bevelen, kijker) {
  const { W, H, dpr } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // oceaan over het hele scherm (geen kale zwarte randen)
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, OCEAN2); grad.addColorStop(0.5, OCEAN); grad.addColorStop(1, OCEAN2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // graticule
  ctx.strokeStyle = GRID; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let lon = 0; lon <= 360; lon += 30) {
    const a = project(lon, 0), b = project(lon, WORLD_H);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  for (let lat = 0; lat <= 180; lat += 30) {
    const a = project(0, lat), b = project(WORLD_W, lat);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();

  // landen
  const visible = [];
  ctx.lineJoin = 'round';
  const eigenPuls = 0.5 + 0.5 * Math.sin(t / 620);
  for (let i = 0; i < GEO.length; i++) {
    const sb = screenBox(i);
    if (sb[2] < -4 || sb[0] > W + 4 || sb[3] < -4 || sb[1] > H + 4) continue;
    visible.push(i);
    pad(ctx, GEO[i].rings);

    // lichte diepte: landen krijgen een zachte schaduw op de oceaan
    ctx.save();
    ctx.shadowColor = 'rgba(2,8,18,0.55)';
    ctx.shadowBlur = 6; ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = kleurVan(i);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = Math.max(0.5, Math.min(1.4, cam.scale * 0.12));
    ctx.strokeStyle = BORDER;
    ctx.stroke();

    // eigen gebied van de speler die aan de beurt is, subtiel laten ademen
    if (game.owner[i] === game.cur) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.16 * eigenPuls;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, cam.scale * 0.16);
      ctx.stroke();
      ctx.restore();
    }
  }

  // markeringen: bronland + geldige doelen
  const pulse = 0.55 + 0.45 * Math.sin(t / 260);
  if (sel) {
    if (sel.targets && sel.targets.size) {
      ctx.save();
      ctx.lineWidth = Math.max(2, cam.scale * 0.5);
      ctx.strokeStyle = `rgba(255,235,120,${0.5 + 0.5 * pulse})`;
      ctx.shadowColor = 'rgba(255,220,80,0.8)'; ctx.shadowBlur = 12;
      for (const i of sel.targets) { pad(ctx, GEO[i].rings); ctx.stroke(); }
      ctx.restore();
    }
    if (sel.source >= 0) {
      ctx.save();
      ctx.lineWidth = Math.max(2.5, cam.scale * 0.6);
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 14;
      pad(ctx, GEO[sel.source].rings); ctx.stroke();
      ctx.restore();
    } else if (sel.info >= 0) {
      ctx.save();
      ctx.lineWidth = Math.max(2, cam.scale * 0.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      pad(ctx, GEO[sel.info].rings); ctx.stroke();
      ctx.restore();
    }
  }

  // troepen-badges
  const showBuild = cam.scale > 5;
  const rBase = Math.max(7, Math.min(15, cam.scale * 1.1));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const i of visible) {
    const tt = weergaveTroepen(i, kijker);
    if (tt <= 0) { vorigeTroepen.delete(i); continue; }
    const [x, y] = project(GEO[i].cx, GEO[i].cy);
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const sourceSel = sel && (sel.source === i || sel.info === i);

    // korte "pop" zodra het aantal troepen verandert
    if (vorigeTroepen.get(i) !== tt) { vorigeTroepen.set(i, tt); popTijd.set(i, t); }
    const sindsPop = t - (popTijd.get(i) ?? -1e9);
    const pop = sindsPop < 280 ? 1 + 0.35 * Math.pow(1 - sindsPop / 280, 2) : 1;

    const r = (sourceSel ? rBase * 1.25 : rBase) * pop;
    // badge
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,12,20,0.82)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = kleurVan(i); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(r * 1.05)}px system-ui, sans-serif`;
    ctx.fillText(String(tt), x, y + 0.5);

    // gebouwen als kleine stippen onder de badge
    if (showBuild) {
      const b = game.build[i];
      const marks = [];
      for (let k = 0; k < b.markt; k++) marks.push('#4ade80');
      for (let k = 0; k < b.kazerne; k++) marks.push('#f59e0b');
      for (let k = 0; k < b.fort; k++) marks.push('#cbd5e1');
      const dw = 5, total = marks.length;
      marks.forEach((col, k) => {
        ctx.beginPath();
        ctx.arc(x + (k - (total - 1) / 2) * dw, y + r + 5, 2, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
      });
    }
  }

  // naam van het geselecteerde/bekeken land
  const nameIdx = sel ? (sel.source >= 0 ? sel.source : sel.info) : -1;
  if (nameIdx >= 0) {
    const [px, y] = project(GEO[nameIdx].cx, GEO[nameIdx].cy);
    const label = GEO[nameIdx].name;
    ctx.font = '700 13px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 14;
    const x = Math.min(Math.max(px, w / 2 + 4), W - w / 2 - 4); // binnen beeld houden
    const ly = y - rBase - 16;
    ctx.fillStyle = 'rgba(8,12,20,0.9)';
    roundRect(ctx, x - w / 2, ly - 11, w, 22, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(label, x, ly);
  }

  // geplande bevelen van de speler zelf, daarna de effectenlaag
  tekenBevelen(ctx, bevelen, t);
  drawFx(ctx, W, H);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
