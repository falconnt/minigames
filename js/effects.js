// Feest-effecten: confetti en toasts bij records. Volledig in code getekend,
// geen assets; respecteert prefers-reduced-motion.

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Kleine zwevende melding onderin beeld.
export function toast(text) {
  const el = document.createElement('div');
  el.className = 'fx-toast';
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 2400);
}

// Confetti-regen over het hele scherm (~1,8 s), daarna ruimt hij zichzelf op.
export function confetti() {
  if (reducedMotion()) return;
  const cv = document.createElement('canvas');
  cv.className = 'fx-confetti';
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  const W = (cv.width = window.innerWidth);
  const H = (cv.height = window.innerHeight);
  const colors = ['#3b6ef5', '#f2b400', '#e05b5b', '#2e9e4f', '#c25be0', '#4fd0d6'];
  const parts = Array.from({ length: 140 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.3,
    vx: (Math.random() - 0.5) * 160,
    vy: 220 + Math.random() * 260,
    s: 5 + Math.random() * 6,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 10,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let last = performance.now();
  const t0 = last;
  (function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      p.vy += 300 * dt;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      g.restore();
    }
    if (now - t0 < 1800 && parts.some((p) => p.y < H + 20)) requestAnimationFrame(frame);
    else cv.remove();
  })(last);
}
