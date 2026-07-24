// input.js — verzamelt besturing van toetsenbord en touch (twee joysticks +
// driftknop) in één `input`-object dat physics elke frame leest. Weet niets van
// de rest van de game; de garage-toets wordt via een callback teruggemeld.

export const input = { steer: 0, th: 0, hb: false, boost: false };

const keys = {};
let stkSteer = 0, stkTh = 0, btnDrift = false, btnBoost = false;
let onGarage = () => {};

// main koppelt hier de garage-toggle aan de 'G'-toets.
export function onGarageToggle(fn) { onGarage = fn; }

function stick(elId, knobId, cb) {
  const el = document.getElementById(elId), knob = document.getElementById(knobId);
  let pid = null, cx = 0, cy = 0; const MAX = 42;
  el.addEventListener('pointerdown', (e) => {
    pid = e.pointerId; el.setPointerCapture(pid);
    const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; mv(e); e.preventDefault();
  });
  el.addEventListener('pointermove', mv);
  const end = (e) => { if (e.pointerId !== pid) return; pid = null; knob.style.transform = 'translate(-50%,-50%)'; cb(0, 0); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  function mv(e) {
    if (e.pointerId !== pid) return;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy);
    if (d > MAX) { dx *= MAX / d; dy *= MAX / d; }
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
    cb(dx / MAX, dy / MAX);
  }
}

// Alle luisteraars opzetten (aangeroepen vanuit main, DOM is dan klaar).
export function initInput() {
  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyG') onGarage();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });

  // Eén stick doet alles: links/rechts = sturen, omhoog = gas, omlaag = rem/achteruit.
  stick('stickL', 'knobL', (x, y) => { stkSteer = x; stkTh = -y; });

  const dBtn = document.getElementById('driftBtn');
  dBtn.addEventListener('pointerdown', (e) => { btnDrift = true; dBtn.classList.add('on'); e.preventDefault(); });
  const dEnd = () => { btnDrift = false; dBtn.classList.remove('on'); };
  dBtn.addEventListener('pointerup', dEnd); dBtn.addEventListener('pointercancel', dEnd);

  const bBtn = document.getElementById('boostBtn');
  bBtn.addEventListener('pointerdown', (e) => { btnBoost = true; bBtn.classList.add('on'); e.preventDefault(); });
  const bEnd = () => { btnBoost = false; bBtn.classList.remove('on'); };
  bBtn.addEventListener('pointerup', bEnd); bBtn.addEventListener('pointercancel', bEnd);
}

// Toetsenbord en touch samensmelten tot genormaliseerde stuur-/gaswaarden.
export function readInput() {
  let s = 0, t = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) s -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) s += 1;
  if (keys['ArrowUp'] || keys['KeyW']) t += 1;
  if (keys['ArrowDown'] || keys['KeyS']) t -= 1;
  if (Math.abs(stkSteer) > 0.06) s = stkSteer;
  if (Math.abs(stkTh) > 0.06) t = stkTh;
  input.steer = Math.max(-1, Math.min(1, s));
  input.th = Math.max(-1, Math.min(1, t));
  input.hb = !!keys['Space'] || btnDrift;
  input.boost = !!keys['ShiftLeft'] || !!keys['ShiftRight'] || btnBoost;
}
