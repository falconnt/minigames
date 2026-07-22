// map.js — de uitklapbare grote kaart. Klik op de minimap om te openen; de
// ✕-knop, een klik naast de kaart, of Esc sluit weer. Terwijl de kaart open is
// staat het rijden gepauzeerd (afgehandeld in main.js via isMapOpen()).

import { drawCityMap } from './citymap.js';
import { P, cam } from './state.js';
import { nightAmount } from './daynight.js';

let open = false;
let cv, ctx, overlayEl;
let DPR = Math.min(devicePixelRatio || 1, 2), size = 0;

function fit() {
  size = Math.min(Math.min(innerWidth, innerHeight) - 40, 760);
  if (size < 200) size = Math.max(160, Math.min(innerWidth, innerHeight) - 24);
  cv.width = size * DPR; cv.height = size * DPR;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

export function isMapOpen() { return open; }

export function openMap() {
  if (open) return;
  open = true;
  overlayEl.classList.add('open');
  fit();
}

export function closeMap() {
  open = false;
  overlayEl.classList.remove('open');
}

// Elke frame vanuit de loop aangeroepen zolang de kaart open is.
export function renderBigMap() {
  const z = cam.z;
  const view = { x0: cam.x - innerWidth / 2 / z, x1: cam.x + innerWidth / 2 / z, y0: cam.y - innerHeight / 2 / z, y1: cam.y + innerHeight / 2 / z };
  drawCityMap(ctx, size, nightAmount(), view, P);
}

export function initMap() {
  cv = document.getElementById('bigmap'); ctx = cv.getContext('2d');
  overlayEl = document.getElementById('mapOverlay');
  document.getElementById('mini').addEventListener('click', openMap);
  document.getElementById('mapClose').addEventListener('click', closeMap);
  // klik op de achtergrond (buiten de kaart) sluit ook
  overlayEl.addEventListener('pointerdown', (e) => { if (e.target === overlayEl) closeMap(); });
  addEventListener('resize', () => { if (open) fit(); });
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && open) closeMap(); });
}
