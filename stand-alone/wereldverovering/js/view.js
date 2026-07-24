// view.js — camera: schermgrootte, zoom/pan en projectie tussen de
// graden-ruimte (X:0..360, Y:0..180) en schermpixels.
import { WORLD_W, WORLD_H } from './geo.js';

export const cam = { scale: 3, viewX: 0, viewY: 0 };
export const view = { W: 0, H: 0, dpr: 1 };

let minScale = 1, maxScale = 40;

export function resize(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  view.W = w; view.H = h; view.dpr = dpr;
  // minScale = hele wereld past net in beeld; niet verder uitzoomen.
  minScale = Math.min(w / WORLD_W, h / WORLD_H);
  maxScale = minScale * 14;
  if (cam.scale < minScale) cam.scale = minScale;
  if (cam.scale > maxScale) cam.scale = maxScale;
  clamp();
}

// Zet de camera zo dat de hele wereld gecentreerd in beeld staat.
export function fitWorld() {
  cam.scale = minScale;
  clamp();
}

export function clamp() {
  const mapW = WORLD_W * cam.scale, mapH = WORLD_H * cam.scale;
  if (mapW <= view.W) cam.viewX = (mapW - view.W) / 2;
  else cam.viewX = Math.max(0, Math.min(cam.viewX, mapW - view.W));
  if (mapH <= view.H) cam.viewY = (mapH - view.H) / 2;
  else cam.viewY = Math.max(0, Math.min(cam.viewY, mapH - view.H));
}

export const project = (X, Y) => [X * cam.scale - cam.viewX, Y * cam.scale - cam.viewY];
export const unproject = (sx, sy) => [(sx + cam.viewX) / cam.scale, (sy + cam.viewY) / cam.scale];

export function zoomAt(sx, sy, factor) {
  const ns = Math.max(minScale, Math.min(maxScale, cam.scale * factor));
  if (ns === cam.scale) return;
  const [X, Y] = unproject(sx, sy);
  cam.scale = ns;
  cam.viewX = X * cam.scale - sx;
  cam.viewY = Y * cam.scale - sy;
  clamp();
}

export function panBy(dx, dy) {
  cam.viewX -= dx; cam.viewY -= dy;
  clamp();
}

export const getScaleRange = () => [minScale, maxScale];
