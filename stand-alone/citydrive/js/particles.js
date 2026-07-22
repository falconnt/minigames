// particles.js — sfeerdeeltjes die over de scène zweven: overdag zacht
// dwarrelende blaadjes, 's nachts warme lichtjes (fireflies). Puur decoratief.
// Deeltjes die uit beeld drijven worden elders in het zichtbare gebied hergebruikt.

const COUNT = 46;
const pool = [];
let inited = false;

function spawn(p, view) {
  p.x = view.x0 + Math.random() * (view.x1 - view.x0);
  p.y = view.y0 + Math.random() * (view.y1 - view.y0);
  p.vx = (Math.random() - 0.5) * 18;
  p.vy = 8 + Math.random() * 16;
  p.r = 1.5 + Math.random() * 2.4;
  p.ph = Math.random() * 6.28;
}

// view: {x0,y0,x1,y1} zichtbaar wereldgebied · night: 0..1
export function drawParticles(ctx, view, night) {
  if (!inited) { for (let i = 0; i < COUNT; i++) { const p = {}; spawn(p, view); pool.push(p); } inited = true; }

  // posities bijwerken + blaadjes (overdag) tekenen
  const leafA = 0.16 * Math.max(0, 1 - night * 1.3);
  for (const p of pool) {
    p.ph += 0.03;
    p.x += (p.vx + Math.cos(p.ph) * 8) * 0.016;
    p.y += p.vy * 0.016;
    if (p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) spawn(p, view);
    if (leafA > 0.01) { ctx.fillStyle = `rgba(120,150,90,${leafA.toFixed(3)})`; ctx.fillRect(p.x, p.y, p.r * 1.6, p.r); }
  }

  // warme lichtjes 's nachts, additief
  if (night > 0.15) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const moteA = 0.5 * night;
    for (const p of pool) {
      const a = moteA * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(p.ph * 2)));
      ctx.fillStyle = `rgba(255,206,130,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.1, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}
