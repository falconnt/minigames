// draw-car.js — het tekenen van een auto op een canvas, plus twee kleine
// tekenhelpers. Zuiver: geen game-state. Gebruikt door de renderer (auto in de
// wereld), de garage-thumbnails en de grote preview.

export function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// Maak een hex-kleur lichter (f>1) of donkerder (f<1).
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r * f)) | 0;
  g = Math.max(0, Math.min(255, g * f)) | 0;
  b = Math.max(0, Math.min(255, b * f)) | 0;
  return `rgb(${r},${g},${b})`;
}

// Teken een auto op (x,y) onder hoek `ang`. `def` bevat afmetingen, `cfg` de
// tuning (kleur/velgen/spoiler/stripe/glow). `brake` licht de remlichten op.
export function drawCar(c, x, y, ang, steer, def, cfg, brake, scale) {
  const s = scale || 1, L = def.l * s, W = def.w * s;
  c.save(); c.translate(x, y); c.rotate(ang);
  // underglow
  if (cfg.glow) {
    const g = c.createRadialGradient(0, 0, 4, 0, 0, L * 0.75);
    g.addColorStop(0, cfg.glow + 'aa'); g.addColorStop(1, cfg.glow + '00');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, L * 0.75, W * 1.05, 0, 0, Math.PI * 2); c.fill();
  }
  // schaduw
  c.fillStyle = 'rgba(0,0,0,.3)'; roundRect(c, -L / 2 + 2 * s, -W / 2 + 3 * s, L, W, 6 * s); c.fill();
  // wielen
  c.fillStyle = '#141518';
  const wl = L * 0.26, ww = W * 0.24;
  [[-1, -1], [-1, 1]].forEach(([sx, sy]) => { roundRect(c, sx * L * 0.32 - wl / 2, sy * (W / 2 + ww * 0.18) - ww / 2, wl, ww, 2 * s); c.fill(); });
  [[1, -1], [1, 1]].forEach(([sx, sy]) => {
    c.save(); c.translate(sx * L * 0.30, sy * (W / 2 + ww * 0.18)); c.rotate(steer * 0.45);
    roundRect(c, -wl / 2, -ww / 2, wl, ww, 2 * s); c.fill();
    c.strokeStyle = cfg.rim; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(-wl * 0.28, 0); c.lineTo(wl * 0.28, 0); c.stroke(); c.restore();
  });
  [[-1, -1], [-1, 1]].forEach(([sx, sy]) => {
    c.strokeStyle = cfg.rim; c.lineWidth = 1.6 * s;
    c.beginPath(); c.moveTo(sx * L * 0.32 - wl * 0.28, sy * (W / 2 + ww * 0.18)); c.lineTo(sx * L * 0.32 + wl * 0.28, sy * (W / 2 + ww * 0.18)); c.stroke();
  });
  // body
  const grad = c.createLinearGradient(0, -W / 2, 0, W / 2);
  grad.addColorStop(0, shade(cfg.color, 1.18)); grad.addColorStop(0.5, cfg.color); grad.addColorStop(1, shade(cfg.color, 0.72));
  c.fillStyle = grad; roundRect(c, -L / 2, -W / 2, L, W, 7 * s); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1 * s; roundRect(c, -L / 2, -W / 2, L, W, 7 * s); c.stroke();
  // striping
  if (cfg.stripe) {
    c.fillStyle = 'rgba(255,255,255,.85)';
    c.fillRect(-L / 2 + 3 * s, -W * 0.14, L - 6 * s, W * 0.10); c.fillRect(-L / 2 + 3 * s, W * 0.05, L - 6 * s, W * 0.10);
  }
  // motorkap-lijn
  c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1 * s;
  c.beginPath(); c.moveTo(L * 0.16, -W / 2 + 2 * s); c.lineTo(L * 0.16, W / 2 - 2 * s); c.stroke();
  // cabine / ramen
  c.fillStyle = 'rgba(18,22,30,.92)'; roundRect(c, -L * 0.24, -W * 0.34, L * 0.40, W * 0.68, 4 * s); c.fill();
  c.fillStyle = 'rgba(120,160,210,.28)'; roundRect(c, L * 0.09, -W * 0.30, L * 0.06, W * 0.60, 2 * s); c.fill();
  // spoiler
  if (cfg.spoiler) {
    c.fillStyle = shade(cfg.color, 0.55);
    roundRect(c, -L / 2 - 2 * s, -W * 0.46, L * 0.10, W * 0.92, 2.5 * s); c.fill();
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-L / 2 + 2 * s, -W * 0.30, 3 * s, W * 0.60);
  }
  // koplampen
  c.fillStyle = '#fff7d6';
  c.fillRect(L / 2 - 3 * s, -W * 0.40, 2.6 * s, W * 0.20); c.fillRect(L / 2 - 3 * s, W * 0.20, 2.6 * s, W * 0.20);
  // achterlichten
  c.fillStyle = brake ? '#ff3b4d' : '#8f1d26';
  c.fillRect(-L / 2 + 0.5 * s, -W * 0.42, 2.6 * s, W * 0.22); c.fillRect(-L / 2 + 0.5 * s, W * 0.20, 2.6 * s, W * 0.22);
  c.restore();
}
