// Flappy Bird — tik/spatie om te fladderen en vlieg
// tussen de buizen door. Geïntegreerd in het framework: highscores lopen via
// het gedeelde save-mechanisme (ctx.submitScore) en de game rendert binnen het
// spelpaneel in plaats van fullscreen.

import { availableHeight } from '../js/fit.js';
import { BIRD_ICON } from '../js/bird-icon.js';
import * as sound from '../js/sound.js';

// ---- dag-nachtcyclus ----
// De wereld doorloopt continu dag → zonsondergang → nacht → zonsopkomst,
// gebaseerd op de wandkloktijd sinds het openen van de game (loopt dus ook
// door tussen potjes). Paletten zijn de vijf gradient-stops van de lucht.
const CYCLE = 48; // seconden per volledige dag
const DAY = ['#3f7fe0', '#5b9fee', '#8ec9f5', '#ffd9a0', '#ffb677'];
const SUNSET = ['#3a4fae', '#8a5fc9', '#e08fb0', '#ffb070', '#ff8e55'];
const NIGHT = ['#0c1533', '#16224e', '#2a3260', '#3a3a68', '#4a3f66'];

function hx(c) { const v = parseInt(c.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function mixc(a, b, t) {
  const A = hx(a), B = hx(b);
  return '#' + [0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0')).join('');
}
const lerpPal = (a, b, t) => a.map((c, i) => mixc(c, b[i], t));

function injectStyles() {
  if (document.getElementById('vogelvlucht-style')) return;
  const style = document.createElement('style');
  style.id = 'vogelvlucht-style';
  style.textContent = `
    .vv-wrap { position:relative; width:100%; border-radius:.75rem; overflow:hidden; touch-action:none; }
    .vv-canvas { display:block; width:100%; }
    .vv-score {
      position:absolute; top:12px; left:0; right:0; text-align:center;
      font-size:42px; font-weight:900; color:#fff; pointer-events:none;
      font-family:'Trebuchet MS',sans-serif;
      text-shadow:2px 2px 0 #ff7a5c,-1px -1px 0 #ff7a5c,1px -1px 0 #ff7a5c,-1px 1px 0 #ff7a5c;
    }
    .vv-score.pop { animation:vv-pop .25s ease-out; }
    @keyframes vv-pop { 0%{transform:scale(1)} 40%{transform:scale(1.4)} 100%{transform:scale(1)} }
    .vv-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:20px; text-align:center; }
    .vv-panel {
      background:#fff; border-radius:28px; padding:28px 24px; max-width:340px;
      border:4px solid #ffd35c; box-shadow:0 12px 0 #e8b923,0 12px 30px rgba(0,0,0,.25);
      font-family:'Trebuchet MS',sans-serif;
    }
    .vv-panel h1 { font-size:28px; color:#ff7a5c; margin:0 0 8px; text-shadow:2px 2px 0 #ffd35c; }
    .vv-panel p { font-size:15px; color:#666; margin:0 0 18px; line-height:1.4; }
    .vv-scoreline { font-size:20px; color:#444; margin-bottom:6px; font-weight:700; }
    .vv-bestline { font-size:15px; color:#888; margin-bottom:16px; font-weight:700; }
    .vv-play {
      background:linear-gradient(180deg,#7ed957,#4caf3a); color:#fff; border:none;
      border-radius:20px; padding:14px 38px; font-size:21px; font-weight:900;
      box-shadow:0 6px 0 #379128; cursor:pointer; font-family:inherit;
    }
    .vv-play:active { box-shadow:0 2px 0 #379128; transform:translateY(4px); }
    .vv-hidden { display:none !important; }
  `;
  document.head.appendChild(style);
}

export function init(root, ctx) {
  injectStyles();

  root.innerHTML = `
    <div class="vv-wrap">
      <canvas class="vv-canvas"></canvas>
      <div class="vv-score">0</div>
      <div class="vv-overlay">
        <div class="vv-panel">
          <h1>Flappy Bird! ${BIRD_ICON}</h1>
          <p class="vv-intro">Tik of druk op spatie om te fladderen en vlieg tussen de buizen door!</p>
          <div class="vv-scoreline vv-hidden"></div>
          <div class="vv-bestline vv-hidden"></div>
          <button class="vv-play">Start</button>
        </div>
      </div>
    </div>`;

  const wrap = root.querySelector('.vv-wrap');
  const canvas = root.querySelector('.vv-canvas');
  const g = canvas.getContext('2d');
  const scoreEl = root.querySelector('.vv-score');
  const overlay = root.querySelector('.vv-overlay');
  const playBtn = root.querySelector('.vv-play');
  const introText = root.querySelector('.vv-intro');
  const scoreLine = root.querySelector('.vv-scoreline');
  const bestLine = root.querySelector('.vv-bestline');

  const listeners = [];
  const on = (t, e, fn, o) => { t.addEventListener(e, fn, o); listeners.push([t, e, fn, o]); };

  let W, H, DPR, raf = null;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || wrap.clientWidth || 320;
    // Vul de resterende schermhoogte (schermvullend-richtlijn), met een
    // bovengrens zodat het speelveld op grote schermen niet absurd hoog wordt.
    H = Math.min(660, availableHeight(wrap, 14, 280));
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.height = H + 'px';
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  const bestScore = () => {
    const hs = ctx.getHighscores();
    return hs.length ? hs[0].score : 0;
  };

  // --- vogel & wereld ---
  const bird = { x: 0, y: 0, w: 0, h: 0, vy: 0, rot: 0 };
  function resetBird() {
    bird.w = Math.min(56, W * 0.13);
    bird.h = bird.w * 0.8;
    bird.x = W * 0.28;
    bird.y = H * 0.45;
    bird.vy = 0;
    bird.rot = 0;
  }

  const GRAVITY = 1900, FLAP_V = -560, MAX_FALL = 900;
  const BASE_SPEED = 190, PIPE_INTERVAL = 1.7;
  const GAP = () => Math.max(H * 0.28, 200);
  const PIPE_W = () => Math.min(80, W * 0.18);

  let pipes = [], clouds = [], mountains = [], particles = [];
  let stars = [], sparkles = [], farBirds = [];
  let env = { pal: DAY, night: 0 };
  const worldStart = performance.now() / 1000; // start van de dag-nachtklok
  let shake = 0, speed = 0, score = 0;
  let running = false, spawnTimer = 0, elapsed = 0, lastTime = 0;

  function initClouds() {
    clouds = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({ x: Math.random() * W, y: H * 0.08 + Math.random() * H * 0.35, s: 0.5 + Math.random() * 0.9, speedMul: 0.15 + Math.random() * 0.15 });
    }
  }
  function initMountains() {
    mountains = [
      { offset: 0, speedMul: 0.07, colorTop: '#e0b3e8', colorBottom: '#c497dc', yBase: 0.58, amp: 0.04, period: 320 },
      { offset: 0, speedMul: 0.12, colorTop: '#c98fdc', colorBottom: '#a86fd0', yBase: 0.64, amp: 0.05, period: 260 },
      { offset: 0, speedMul: 0.22, colorTop: '#8f6fd0', colorBottom: '#7856c2', yBase: 0.72, amp: 0.06, period: 200 },
    ];
  }
  function initAmbient() {
    stars = Array.from({ length: 42 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.55, s: 0.6 + Math.random() * 1.5, tw: Math.random() * 6,
    }));
    sparkles = Array.from({ length: 14 }, () => ({
      x: Math.random() * W, y: Math.random() * H, sp: 0.05 + Math.random() * 0.12, ph: Math.random() * 6, s: 1 + Math.random() * 2,
    }));
    farBirds = Array.from({ length: 3 }, (_, i) => ({
      x: Math.random() * W, y: H * (0.1 + i * 0.09), sp: 0.18 + Math.random() * 0.12, s: 4 + Math.random() * 3,
    }));
  }

  function startGame() {
    resize();
    resetBird();
    pipes = []; particles = [];
    initClouds(); initMountains(); initAmbient();
    shake = 0; speed = BASE_SPEED; score = 0; elapsed = 0; spawnTimer = 0;
    scoreEl.textContent = '0';
    running = true;
    overlay.classList.add('vv-hidden');
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function doFlap() {
    if (!running) { startGame(); return; }
    bird.vy = FLAP_V;
    for (let i = 0; i < 7; i++) {
      particles.push({
        x: bird.x - bird.w * 0.2, y: bird.y + (Math.random() - 0.5) * bird.h * 0.4,
        vx: -80 - Math.random() * 100, vy: (Math.random() - 0.5) * 140,
        life: 0.5 + Math.random() * 0.3, maxLife: 0.5 + Math.random() * 0.3, size: 2 + Math.random() * 3,
      });
    }
  }

  function spawnPipe() {
    const gap = GAP();
    const margin = H * 0.08;
    const gapY = margin + Math.random() * (H - margin * 2 - gap);
    pipes.push({ x: W + PIPE_W(), gapY, gapH: gap, passed: false });
  }

  function update(dt) {
    elapsed += dt;
    speed = BASE_SPEED + Math.min(elapsed * 4, 90);

    bird.vy += GRAVITY * dt;
    if (bird.vy > MAX_FALL) bird.vy = MAX_FALL;
    bird.y += bird.vy * dt;
    bird.rot = Math.max(-0.5, Math.min(1.2, bird.vy / 700));

    if (bird.y + bird.h / 2 > H || bird.y - bird.h / 2 < 0) return endGame();

    spawnTimer += dt;
    if (spawnTimer > PIPE_INTERVAL) { spawnTimer = 0; spawnPipe(); }
    const pw = PIPE_W();
    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= speed * dt;
      if (!p.passed && p.x + pw < bird.x - bird.w / 2) {
        p.passed = true;
        score++;
        sound.play('ping');
        scoreEl.textContent = score;
        scoreEl.classList.remove('pop');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('pop');
      }
      if (p.x + pw < -20) pipes.splice(i, 1);
    }

    const bx0 = bird.x - bird.w * 0.32, bx1 = bird.x + bird.w * 0.32;
    const by0 = bird.y - bird.h * 0.32, by1 = bird.y + bird.h * 0.32;
    for (const p of pipes) {
      const px0 = p.x, px1 = p.x + pw;
      if (bx1 > px0 && bx0 < px1) {
        if (by0 < p.gapY || by1 > p.gapY + p.gapH) return endGame();
      }
    }

    for (const c of clouds) { c.x -= speed * dt * c.speedMul * 0.3; if (c.x < -100) c.x = W + 100; }
    for (const m of mountains) m.offset -= speed * dt * m.speedMul;
    for (const s of sparkles) {
      s.x -= speed * dt * s.sp; s.ph += dt * 2;
      if (s.x < -10) { s.x = W + 10; s.y = Math.random() * H; }
    }
    for (const b of farBirds) { b.x -= speed * dt * b.sp; if (b.x < -30) b.x = W + 30; }
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.94;
      if (pt.life <= 0) particles.splice(i, 1);
    }
    if (shake > 0) { shake -= dt * 3.5; if (shake < 0) shake = 0; }
  }

  function endGame() {
    running = false;
    shake = 1;
    // Alleen echte scores in de gedeelde highscore-lijst (geen nullen).
    const result = score > 0 ? ctx.submitScore(score) : { isRecord: false };
    introText.textContent = 'Au! Je botste tegen een buis.';
    scoreLine.classList.remove('vv-hidden');
    bestLine.classList.remove('vv-hidden');
    scoreLine.textContent = 'Score: ' + score;
    bestLine.textContent = 'Beste: ' + bestScore() + (result.isRecord ? ' — nieuw record!' : '');
    playBtn.textContent = 'Nog een keer!';
    overlay.classList.remove('vv-hidden');
    startPreview(); // achtergrond blijft leven achter het game-over-paneel
  }

  // --- tekenwerk ---
  function skyState() {
    const p = ((performance.now() / 1000 - worldStart) % CYCLE) / CYCLE;
    const seg = (a, b) => (p - a) / (b - a);
    if (p < 0.40) return { pal: DAY, night: 0 };
    if (p < 0.50) return { pal: lerpPal(DAY, SUNSET, seg(0.40, 0.50)), night: 0 };
    if (p < 0.60) return { pal: lerpPal(SUNSET, NIGHT, seg(0.50, 0.60)), night: seg(0.50, 0.60) };
    if (p < 0.85) return { pal: NIGHT, night: 1 };
    if (p < 0.93) return { pal: lerpPal(NIGHT, SUNSET, seg(0.85, 0.93)), night: 1 - seg(0.85, 0.93) };
    return { pal: lerpPal(SUNSET, DAY, seg(0.93, 1)), night: 0 };
  }
  function drawSky() {
    env = skyState();
    const wt = performance.now() / 1000;
    const sky = g.createLinearGradient(0, 0, 0, H);
    [0, 0.3, 0.55, 0.8, 1].forEach((stop, i) => sky.addColorStop(stop, env.pal[i]));
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // sterren, twinkelen 's nachts
    if (env.night > 0.05) {
      for (const st of stars) {
        g.globalAlpha = env.night * (0.45 + 0.55 * Math.abs(Math.sin(wt * 2 + st.tw)));
        g.fillStyle = '#fff';
        g.fillRect(st.x, st.y, st.s, st.s);
      }
      g.globalAlpha = 1;
    }
  }
  function drawSun() {
    const sx = W * 0.8, sy = H * 0.16, r = Math.min(W, H) * 0.09;
    if (env.night < 1) { // zon
      g.save(); g.globalAlpha = 1 - env.night;
      const glow = g.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
      glow.addColorStop(0, 'rgba(255,240,180,0.55)'); glow.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = glow; g.beginPath(); g.arc(sx, sy, r * 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff3c2'; g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    if (env.night > 0) { // maansikkel
      g.save(); g.globalAlpha = env.night;
      g.fillStyle = '#f2efe0'; g.beginPath(); g.arc(sx, sy, r * 0.8, 0, Math.PI * 2); g.fill();
      g.fillStyle = env.pal[0]; g.beginPath(); g.arc(sx + r * 0.3, sy - r * 0.18, r * 0.68, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  function drawMountainLayer(m) {
    const baseY = H * m.yBase, amp = H * m.amp;
    const grad = g.createLinearGradient(0, baseY - amp, 0, H);
    grad.addColorStop(0, mixc(m.colorTop, '#141a30', env.night * 0.6));
    grad.addColorStop(1, mixc(m.colorBottom, '#101528', env.night * 0.6));
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) g.lineTo(x, baseY + Math.sin((x + m.offset) / m.period * Math.PI * 2) * amp);
    g.lineTo(W, H); g.closePath(); g.fill();
  }
  function drawCloud(c) {
    g.save(); g.translate(c.x, c.y); g.scale(c.s, c.s);
    // onderkant-schaduw voor wat volume
    g.fillStyle = `rgba(120,140,190,${0.22 - env.night * 0.1})`;
    g.beginPath(); g.arc(2, 8, 21, 0, Math.PI * 2); g.arc(-16, 4, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(255,255,255,${0.9 - env.night * 0.6})`;
    g.beginPath();
    g.arc(0, 0, 22, 0, Math.PI * 2); g.arc(22, -8, 18, 0, Math.PI * 2);
    g.arc(-20, -4, 16, 0, Math.PI * 2); g.arc(10, 6, 20, 0, Math.PI * 2);
    g.fill(); g.restore();
  }
  function drawAmbient() {
    const wt = performance.now() / 1000;
    // glinsters overdag, vuurvliegjes 's nachts
    for (const s of sparkles) {
      const bob = Math.sin(wt * 1.6 + s.ph) * 6;
      if (env.night > 0.5) {
        const a = (0.3 + 0.5 * Math.abs(Math.sin(wt * 2.4 + s.ph))) * env.night;
        g.fillStyle = `rgba(214,255,138,${a})`;
        g.beginPath(); g.arc(s.x, s.y + bob, s.s + 0.8, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = `rgba(255,255,255,${(0.2 + 0.3 * Math.abs(Math.sin(wt * 2 + s.ph))) * (1 - env.night)})`;
        g.beginPath(); g.arc(s.x, s.y + bob, s.s * 0.7, 0, Math.PI * 2); g.fill();
      }
    }
    // vogeltjes in de verte (alleen overdag zichtbaar)
    if (env.night < 0.5) {
      g.strokeStyle = `rgba(30,45,70,${0.5 * (1 - env.night * 2)})`;
      g.lineWidth = 1.5;
      for (const b of farBirds) {
        const flapY = b.s * (0.7 + 0.3 * Math.sin(wt * 8 + b.x));
        g.beginPath();
        g.moveTo(b.x - b.s, b.y);
        g.quadraticCurveTo(b.x - b.s * 0.4, b.y - flapY, b.x, b.y);
        g.quadraticCurveTo(b.x + b.s * 0.4, b.y - flapY, b.x + b.s, b.y);
        g.stroke();
      }
    }
  }
  function drawParticle(pt) {
    g.save(); g.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); g.fill(); g.restore();
  }
  function drawPipeSegment(x, top, height, pw, flip) {
    g.save(); g.translate(x, top);
    const w = pw, h = height, capH = Math.min(28, h * 0.5);
    // buizen kleuren mee met het licht (donkerder 's nachts)
    const dk = (c) => mixc(c, '#0d1f12', env.night * 0.5);
    const bodyGrad = g.createLinearGradient(0, 0, w, 0);
    bodyGrad.addColorStop(0, dk('#2e9e3f')); bodyGrad.addColorStop(0.15, dk('#3fc451'));
    bodyGrad.addColorStop(0.5, dk('#4fdb63')); bodyGrad.addColorStop(0.85, dk('#2e9e3f')); bodyGrad.addColorStop(1, dk('#1f7a30'));
    g.fillStyle = bodyGrad; g.strokeStyle = dk('#1a5e26'); g.lineWidth = Math.max(2, w * 0.03);
    if (!flip) {
      g.fillRect(0, 0, w, h - capH); g.strokeRect(0, 0, w, h - capH);
      g.fillRect(-w * 0.08, h - capH, w * 1.16, capH); g.strokeRect(-w * 0.08, h - capH, w * 1.16, capH);
    } else {
      g.fillRect(0, capH, w, h - capH); g.strokeRect(0, capH, w, h - capH);
      g.fillRect(-w * 0.08, 0, w * 1.16, capH); g.strokeRect(-w * 0.08, 0, w * 1.16, capH);
    }
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(w * 0.15, 0, w * 0.16, h);
    g.restore();
  }
  function drawPipe(p) {
    const pw = PIPE_W();
    drawPipeSegment(p.x, 0, p.gapY, pw, false);
    drawPipeSegment(p.x, p.gapY + p.gapH, H - (p.gapY + p.gapH), pw, true);
  }
  function drawBird() {
    g.save(); g.translate(bird.x, bird.y);
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, bird.w * 1.1);
    glow.addColorStop(0, 'rgba(255,230,150,0.55)'); glow.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, 0, bird.w * 1.1, 0, Math.PI * 2); g.fill();
    g.rotate(bird.rot);
    const w = bird.w, h = bird.h, flap = Math.sin(elapsed * 22) * 0.6;
    const wave = Math.sin(elapsed * 13) * 0.3;                 // sjaaltje wappert
    const blink = elapsed % 3.2 > 3.05 ? 0.2 : 1;              // af en toe knipperen
    const beakOpen = 0.06 + Math.max(0, -bird.vy / 900) * 0.5; // snavel open bij fladderen

    // sjaaltje: wapperend uiteinde achter de vogel
    g.save();
    g.translate(-w * 0.16, -h * 0.06);
    g.rotate(0.35 + wave);
    g.fillStyle = '#e05b4b';
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-w * 0.3, h * 0.02 + wave * 6, -w * 0.44, h * 0.2);
    g.lineTo(-w * 0.32, h * 0.3);
    g.quadraticCurveTo(-w * 0.14, h * 0.14, 0, h * 0.12);
    g.closePath(); g.fill();
    g.restore();

    // staart: drie gelaagde veren in oplopende tinten
    const tailCols = ['#d18f00', '#f2c200', '#ffdf6b'];
    for (let i = 0; i < 3; i++) {
      g.save();
      g.rotate((i - 1) * 0.16 + flap * 0.06);
      g.fillStyle = tailCols[i];
      g.beginPath();
      g.moveTo(-w * 0.28, h * 0.02);
      g.quadraticCurveTo(-w * 0.5, -h * 0.06 + i * h * 0.05, -w * 0.58, h * 0.02 + i * h * 0.05);
      g.lineTo(-w * 0.3, h * 0.12);
      g.closePath(); g.fill();
      g.restore();
    }

    // achtervleugel (donkerder, tegenfase)
    g.save(); g.translate(-w * 0.04, h * 0.02); g.rotate(0.5 - flap * 0.4);
    g.fillStyle = '#d8a51a';
    g.beginPath(); g.ellipse(-w * 0.06, 0, w * 0.22, h * 0.12, 0, 0, Math.PI * 2); g.fill();
    g.restore();

    // romp met verloop (licht bovenop, warm eronder)
    const bodyGrad = g.createLinearGradient(0, -h * 0.35, 0, h * 0.42);
    bodyGrad.addColorStop(0, '#ffe066');
    bodyGrad.addColorStop(0.55, '#ffd43c');
    bodyGrad.addColorStop(1, '#f0ad00');
    g.fillStyle = bodyGrad;
    g.beginPath(); g.ellipse(0, h * 0.08, w * 0.32, h * 0.3, 0, 0, Math.PI * 2); g.fill();

    // buik
    g.fillStyle = '#fff4cc';
    g.beginPath(); g.ellipse(-w * 0.02, h * 0.18, w * 0.2, h * 0.17, 0, 0, Math.PI * 2); g.fill();

    // sjaaltje: kraag om de hals
    g.strokeStyle = '#e05b4b'; g.lineWidth = Math.max(3, w * 0.09); g.lineCap = 'round';
    g.beginPath(); g.arc(w * 0.1, -h * 0.08, w * 0.19, 0.4, 2.4); g.stroke();

    // kop met verloop
    const headGrad = g.createLinearGradient(0, -h * 0.42, 0, -h * 0.02);
    headGrad.addColorStop(0, '#ffe884');
    headGrad.addColorStop(1, '#ffd43c');
    g.fillStyle = headGrad;
    g.beginPath(); g.ellipse(w * 0.2, -h * 0.2, w * 0.24, h * 0.22, 0, 0, Math.PI * 2); g.fill();

    // kuifje: drie kleine veertjes
    for (let i = 0; i < 3; i++) {
      g.save();
      g.translate(w * (0.1 + i * 0.05), -h * 0.4);
      g.rotate(-0.5 + i * 0.3 + flap * 0.08);
      g.fillStyle = i === 1 ? '#f2c200' : '#e8a800';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.035, -h * 0.15); g.lineTo(w * 0.07, 0); g.closePath(); g.fill();
      g.restore();
    }

    // snavel: boven- en onderdeel, opent bij het fladderen
    g.fillStyle = '#f59f00';
    g.beginPath(); g.moveTo(w * 0.4, -h * 0.2); g.lineTo(w * 0.58, -h * 0.15); g.lineTo(w * 0.4, -h * 0.11); g.closePath(); g.fill();
    g.save();
    g.translate(w * 0.4, -h * 0.1);
    g.rotate(beakOpen);
    g.fillStyle = '#e08a00';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.15, 0.02); g.lineTo(0, h * 0.06); g.closePath(); g.fill();
    g.restore();

    // oog: wit oogwit, pupil met lichtpuntje, en af en toe een knipper
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(w * 0.25, -h * 0.24, w * 0.055, h * 0.06 * blink, 0, 0, Math.PI * 2); g.fill();
    if (blink > 0.5) {
      g.fillStyle = '#26221f';
      g.beginPath(); g.arc(w * 0.27, -h * 0.235, w * 0.03, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(w * 0.283, -h * 0.25, w * 0.011, 0, Math.PI * 2); g.fill();
    }
    // blosje
    g.fillStyle = 'rgba(255,120,90,0.35)';
    g.beginPath(); g.ellipse(w * 0.33, -h * 0.12, w * 0.045, h * 0.03, 0, 0, Math.PI * 2); g.fill();

    // voorvleugel: drie gespreide veren die meebewegen
    g.save(); g.translate(w * 0.02, 0); g.rotate(0.15 + flap * 0.55);
    const wingCols = ['#f2b400', '#ffd43c', '#ffe27a'];
    for (let i = 0; i < 3; i++) {
      g.save();
      g.rotate((i - 1) * 0.22);
      g.fillStyle = wingCols[i];
      g.beginPath();
      g.ellipse(-w * 0.1, 0, w * 0.26 - i * w * 0.03, h * 0.11, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.restore();

    g.restore();
  }

  function draw() {
    g.save();
    if (shake > 0) { const mag = shake * 10; g.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag); }
    drawSky();
    drawSun();
    for (const c of clouds) drawCloud(c);
    for (const m of mountains) drawMountainLayer(m);
    drawAmbient();
    for (const p of pipes) drawPipe(p);
    for (const pt of particles) drawParticle(pt);
    drawBird();
    g.restore();
  }

  function loop(now) {
    if (!running) return;
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    dt = Math.max(0, Math.min(dt, 0.033));
    update(dt);
    if (!running) return;   // update kan het spel beëindigen
    draw();
    raf = requestAnimationFrame(loop);
  }

  // besturing
  on(wrap, 'pointerdown', (e) => { if (e.target === playBtn) return; e.preventDefault(); doFlap(); });
  on(window, 'keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); doFlap(); } });
  on(playBtn, 'click', startGame);
  on(window, 'resize', () => { if (!running) { resize(); resetBird(); initClouds(); initMountains(); initAmbient(); draw(); } });

  // voorvertoning achter het start-/game-over-paneel: rustig levend
  // (dag-nachtklok en twinkelende sterren lopen door, ook zonder te spelen)
  let previewRaf = null;
  function startPreview() {
    if (previewRaf) return;
    (function previewLoop() {
      if (running) { previewRaf = null; return; }
      draw();
      previewRaf = requestAnimationFrame(previewLoop);
    })();
  }
  resize();
  resetBird();
  initClouds();
  initMountains();
  initAmbient();
  startPreview();

  return () => {
    running = true; // stopt de preview-lus bij de eerstvolgende frame
    if (previewRaf) cancelAnimationFrame(previewRaf);
    running = false;
    if (raf) cancelAnimationFrame(raf);
    for (const [t, e, fn, o] of listeners) t.removeEventListener(e, fn, o);
  };
}
