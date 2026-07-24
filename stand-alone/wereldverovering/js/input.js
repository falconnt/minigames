// input.js — aanraking/muis: slepen (pan), knijpen/scrollen (zoom) en tikken
// (land selecteren). Vertaalt een tik naar een landindex via de projectie.
import { resize, unproject, zoomAt, panBy } from './view.js';
import { countryAt } from './geo.js';

export function initInput(canvas, { onTap }) {
  const pointers = new Map();
  let moved = false, downT = 0, startX = 0, startY = 0;
  let lastPinch = 0;

  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    const [x, y] = local(e);
    pointers.set(e.pointerId, [x, y]);
    if (pointers.size === 1) { moved = false; downT = performance.now(); startX = x; startY = y; }
    if (pointers.size === 2) lastPinch = pinchDist();
  });

  function pinchDist() {
    const p = [...pointers.values()];
    return Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
  }
  function pinchMid() {
    const p = [...pointers.values()];
    return [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
  }

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const [x, y] = local(e);
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, [x, y]);

    if (pointers.size === 2) {
      const d = pinchDist();
      if (lastPinch > 0) {
        const [mx, my] = pinchMid();
        zoomAt(mx, my, d / lastPinch);
      }
      lastPinch = d;
      moved = true;
      return;
    }
    if (pointers.size === 1) {
      const dx = x - prev[0], dy = y - prev[1];
      panBy(dx, dy);
      if (Math.hypot(x - startX, y - startY) > 8) moved = true;
    }
  });

  function up(e) {
    if (!pointers.has(e.pointerId)) return;
    const [x, y] = local(e);
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinch = 0;
    if (wasSingle && !moved && performance.now() - downT < 500) {
      const [X, Y] = unproject(x, y);
      onTap(countryAt(X, Y));
    }
  }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) lastPinch = 0; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = local(e);
    zoomAt(x, y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  window.addEventListener('resize', () => resize(canvas));
}
