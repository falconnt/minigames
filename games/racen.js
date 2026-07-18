// Racen — endless racer.
//
// Scheur met je raceauto over een scrollende weg, ontwijk de tegenliggers, pak
// munten en ga steeds sneller. Alles wordt in code op canvas getekend (geen
// afbeeldingen). Schermvullend, met de vinger of het toetsenbord.
//
// Coördinaten zijn genormaliseerd (0..1) zodat het op elk schermformaat werkt.

const PLAYER_COL = '#ffd23d';
const ENEMY_COLS = ['#ff5b5b', '#48ff8e', '#4fd0d6', '#c08ee8', '#ff9a3d', '#5f97ef'];
// 10 kiesbare auto's (naam + kleur).
const CARS = [
  { name: 'BMW M4', col: '#ffd23d' },
  { name: 'Mercedes GT 63', col: '#ff5b5b' },
  { name: 'Ferrari Pista', col: '#ff9a3d' },
  { name: 'Lamborghini SVJ', col: '#48ff8e' },
  { name: 'Porsche 911', col: '#4fd0d6' },
  { name: 'Mustang', col: '#5f97ef' },
  { name: 'Audi R8', col: '#c08ee8' },
  { name: 'Pagani', col: '#ff6ec7' },
  { name: 'Mazda RX500', col: '#cfd6df' },
  { name: 'Koenigsegg Jesko', col: '#a3e635' },
];
const ROAD = '#2c2f36', GRASS = '#1f3d24', CURB1 = '#e8433f', CURB2 = '#f5f5f5';

export function init(root, ctx) {
  // ---------- fullscreen-laag ----------
  root.innerHTML = '';
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const fs = document.createElement('div');
  fs.className = 'race-fs';
  fs.innerHTML = `
    <div class="race-top">
      <button id="rc-back" class="race-btn" aria-label="Terug naar menu">← Terug</button>
      <span class="race-stat">Afstand <b id="rc-dist">0</b> m</span>
      <span class="race-stat">Snelheid <b id="rc-speed">0</b></span>
      <span class="race-stat">Levens <b id="rc-lives">♥♥♥</b></span>
      <span class="race-actions">
        <button id="rc-mute" class="race-btn" aria-label="Geluid aan of uit">🔊</button>
        <button id="rc-pause" class="race-btn">Pauze</button>
        <button id="rc-help-btn" class="race-btn" aria-label="Uitleg">❔</button>
      </span>
    </div>
    <div class="race-area" id="rc-area">
      <canvas id="rc-canvas" class="race-canvas" aria-label="Weg"></canvas>
      <div id="rc-overlay" class="race-overlay" hidden></div>
    </div>
    <div class="race-controls" aria-label="Bediening">
      <button class="race-pad" data-act="left" aria-label="Naar links">◀</button>
      <button class="race-pad" data-act="right" aria-label="Naar rechts">▶</button>
      <button class="race-pad race-pad-turbo" data-act="turbo" aria-label="Turbo">🚀 turbo</button>
    </div>
    <dialog id="rc-help" class="race-help">
      <h2>Zo speel je Racen</h2>
      <ul class="race-help-list">
        <li><b>◀ ▶</b> — stuur naar links of rechts (of veeg met je vinger over de weg).</li>
        <li><b>🚀 turbo</b> — ingedrukt houden voor een boost (gebruikt je turbo-balk; die laadt weer op).</li>
        <li>Ontwijk de andere auto's! Pak gouden <b>munten</b> voor extra punten.</li>
        <li>Hoe verder je komt, hoe sneller het gaat. Bots je, dan verlies je een <b>leven</b> (je hebt er 3).</li>
        <li><b>Toetsenbord:</b> pijltjes sturen, spatie = turbo, P = pauze.</li>
      </ul>
      <form method="dialog"><button class="race-btn primary">Sluiten</button></form>
    </dialog>`;
  document.body.appendChild(fs);

  const canvas = fs.querySelector('#rc-canvas');
  const area = fs.querySelector('#rc-area');
  const g = canvas.getContext('2d');
  const overlay = fs.querySelector('#rc-overlay');
  const distEl = fs.querySelector('#rc-dist');
  const speedEl = fs.querySelector('#rc-speed');
  const livesEl = fs.querySelector('#rc-lives');
  const pauseBtn = fs.querySelector('#rc-pause');
  const muteBtn = fs.querySelector('#rc-mute');

  // ---------- afmetingen ----------
  let W = 320, H = 480, unit = 320, dpr = 1;
  const S = {};
  function sizes() {
    unit = Math.min(W, H);
    S.roadL = 0.09; S.roadR = 0.91; S.lanes = 3;
    S.laneW = (S.roadR - S.roadL) / S.lanes;
    S.carW = Math.min(unit * 0.14, S.laneW * W * 0.78);
    S.carH = S.carW * 1.7;
    S.coinR = unit * 0.032;
  }
  const laneX = (i) => S.roadL + (i + 0.5) * S.laneW;

  // ---------- geluid ----------
  let actx = null, muted = false;
  function ensureAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !actx) return;
    const t = actx.currentTime, o = actx.createOscillator(), gN = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gN.gain.setValueAtTime(vol, t); gN.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gN).connect(actx.destination); o.start(t); o.stop(t + dur);
  }
  function noiseBurst(dur, vol) {
    if (muted || !actx) return;
    const t = actx.currentTime;
    const buf = actx.createBuffer(1, Math.floor(actx.sampleRate * dur), actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource(); src.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
    const gN = actx.createGain(); gN.gain.setValueAtTime(vol, t); gN.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(gN).connect(actx.destination); src.start(t); src.stop(t + dur);
  }
  const sCoin = () => { tone(880, 0.08, 'square', 0.08, 1320); };
  const sCrash = () => { noiseBurst(0.35, 0.22); tone(150, 0.35, 'sawtooth', 0.12, 50); };

  // ---------- spelstatus ----------
  let player = { x: 0.5 };
  let enemies = [], coins = [], scenery = [], marks = [], particles = [];
  let scroll = 0, speed = 0.42, dist = 0, lives = 3;
  let spawnCd = 1, coinCd = 2, turbo = 1, invuln = 0, shake = 0, flashT = 0;
  let state = 'select';
  let carColor = CARS[0].col, selected = 0, sel = null;
  let moveDir = 0, turboOn = false, dragging = false, dragX = 0;
  let raf = 0, last = 0;

  function initScene() {
    // wegmarkeringen (stippellijnen tussen de rijstroken)
    marks = [];
    for (let i = 0; i < 14; i++) marks.push(i / 14);
    // bomen/struiken langs de weg
    scenery = [];
    for (let i = 0; i < 8; i++) scenery.push({ x: Math.random() < 0.5 ? S.roadL * 0.5 : (S.roadR + (1 - S.roadR) * 0.5), y: Math.random(), left: Math.random() < 0.5 });
  }

  function reset() {
    player = { x: 0.5 };
    enemies = []; coins = []; particles = [];
    scroll = 0; speed = 0.42; dist = 0; lives = 3;
    spawnCd = 1; coinCd = 2; turbo = 1; invuln = 0; shake = 0; flashT = 0;
    initScene();
    state = 'playing';
    overlay.hidden = true;
    pauseBtn.textContent = 'Pauze';
    updateHud();
  }

  // ---------- auto-keuze (startscherm) ----------
  function buildSelect() {
    sel = document.createElement('div');
    sel.className = 'race-select';
    sel.innerHTML = `<h2>Kies je auto</h2><div class="race-cars" id="rc-cars"></div><button id="rc-start" class="race-btn primary race-start">🏁 Start!</button>`;
    area.appendChild(sel);
    const wrap = sel.querySelector('#rc-cars');
    CARS.forEach((car, i) => {
      const card = document.createElement('button');
      card.className = 'race-car' + (i === selected ? ' sel' : '');
      const cv = document.createElement('canvas');
      cv.width = 160; cv.height = 200; cv.style.width = '80px'; cv.style.height = '100px';
      const g2 = cv.getContext('2d'); g2.setTransform(2, 0, 0, 2, 0, 0);
      drawCarShape(g2, 40, 54, 44, 78, car.col, -1);
      const nm = document.createElement('span'); nm.textContent = car.name;
      card.appendChild(cv); card.appendChild(nm);
      card.addEventListener('click', () => selectCar(i));
      wrap.appendChild(card);
    });
    sel.querySelector('#rc-start').addEventListener('click', () => { ensureAudio(); startRace(); });
  }
  function selectCar(i) {
    selected = i; carColor = CARS[i].col;
    sel.querySelectorAll('.race-car').forEach((el, k) => el.classList.toggle('sel', k === i));
  }
  function goToSelect() {
    state = 'select';
    overlay.hidden = true;
    pauseBtn.textContent = 'Pauze';
    if (sel) sel.style.display = 'flex';
  }
  function startRace() {
    carColor = CARS[selected].col;
    if (sel) sel.style.display = 'none';
    reset();
  }

  function updateHud() {
    distEl.textContent = Math.floor(dist);
    speedEl.textContent = Math.round(speed * 120 + 30);
    livesEl.textContent = lives > 0 ? '♥'.repeat(lives) : '—';
  }

  function boom(x, y, color) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * 0.5 + 0.1;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
    }
  }

  function crash(x, y) {
    if (invuln > 0) return;
    lives -= 1;
    invuln = 1.6;
    boom(x, y, '#ff6b6b');
    shake = 0.5; flashT = 0.35;
    speed = Math.max(0.42, speed * 0.6); // afremmen na een botsing
    sCrash();
    updateHud();
    if (lives <= 0) gameOver();
  }

  function gameOver() {
    state = 'over';
    const result = dist > 0 ? ctx.submitScore(Math.floor(dist)) : null;
    overlay.innerHTML = `
      <h2>🏁 Finish!</h2>
      <p>Afstand: ${Math.floor(dist)} m${result?.isRecord ? ' — 🥇 nieuw record!' : result?.rank ? ` — plek ${result.rank} in de top 10` : ''}</p>
      <button id="rc-again" class="race-btn primary">Nog een keer</button>
      <button id="rc-pick" class="race-btn">Andere auto</button>`;
    overlay.hidden = false;
    overlay.querySelector('#rc-again').addEventListener('click', reset);
    overlay.querySelector('#rc-pick').addEventListener('click', goToSelect);
  }

  function setPaused(on) {
    if (state === 'over') return;
    if (on && state === 'playing') {
      state = 'paused'; pauseBtn.textContent = 'Verder';
      overlay.innerHTML = `<h2>⏸️ Pauze</h2>
        <button id="rc-resume" class="race-btn primary">Verder spelen</button>
        <button id="rc-newp" class="race-btn">Andere auto</button>`;
      overlay.hidden = false;
      overlay.querySelector('#rc-resume').addEventListener('click', () => setPaused(false));
      overlay.querySelector('#rc-newp').addEventListener('click', goToSelect);
    } else if (!on && state === 'paused') {
      state = 'playing'; pauseBtn.textContent = 'Pauze'; overlay.hidden = true;
    }
  }

  function hit(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  function spawnEnemy() {
    // kies een rijstrook; laat af en toe een gat zodat het altijd te doen is
    const lane = Math.floor(Math.random() * S.lanes);
    const col = ENEMY_COLS[Math.floor(Math.random() * ENEMY_COLS.length)];
    enemies.push({ x: laneX(lane), y: -0.15, col, down: 0.45 + Math.random() * 0.3 });
  }
  function spawnCoin() {
    const lane = Math.floor(Math.random() * S.lanes);
    coins.push({ x: laneX(lane), y: -0.1 });
  }

  // ---------- update ----------
  function update(dt) {
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6; }
    particles = particles.filter((p) => p.life > 0);
    if (shake > 0) shake -= dt;
    if (flashT > 0) flashT -= dt;

    if (state === 'select') {
      // rustig scrollende weg als achtergrond bij het kiezen
      const amb = 0.25;
      scroll += amb * dt;
      for (let i = 0; i < marks.length; i++) { marks[i] += amb * dt; if (marks[i] > 1.05) marks[i] -= 1.1; }
      for (const s of scenery) { s.y += amb * dt; if (s.y > 1.1) s.y -= 1.2; }
      return;
    }
    if (state !== 'playing') return;
    if (invuln > 0) invuln -= dt;

    // turbo-balk
    if (turboOn && turbo > 0) turbo = Math.max(0, turbo - dt * 0.5);
    else if (!turboOn) turbo = Math.min(1, turbo + dt * 0.3);
    const boosting = turboOn && turbo > 0;

    // snelheid loopt op met de afstand; turbo geeft een boost
    const baseSpeed = 0.42 + Math.min(dist / 2500, 0.55);
    speed = baseSpeed * (boosting ? 1.7 : 1);
    dist += speed * dt * 55;

    // wereld scrollt
    scroll += speed * dt;
    for (let i = 0; i < marks.length; i++) { marks[i] += speed * dt; if (marks[i] > 1.05) marks[i] -= 1.1; }
    for (const s of scenery) { s.y += speed * dt; if (s.y > 1.1) { s.y -= 1.2; s.left = Math.random() < 0.5; s.x = s.left ? S.roadL * 0.5 : (S.roadR + (1 - S.roadR) * 0.5); } }

    // speler sturen
    const halfW = (S.carW / 2) / W;
    const minX = S.roadL + halfW, maxX = S.roadR - halfW;
    if (dragging) player.x = Math.min(maxX, Math.max(minX, dragX));
    else player.x = Math.min(maxX, Math.max(minX, player.x + moveDir * 0.9 * dt));
    const playerY = 0.82;

    // tegenliggers
    spawnCd -= dt;
    if (spawnCd <= 0) {
      spawnEnemy();
      spawnCd = Math.max(0.35, (0.9 / (speed + 0.3)) * (0.7 + Math.random() * 0.7));
    }
    for (const e of enemies) e.y += speed * e.down * dt;
    enemies = enemies.filter((e) => e.y < 1.2);

    // munten
    coinCd -= dt;
    if (coinCd <= 0) { spawnCoin(); coinCd = 1.2 + Math.random() * 1.8; }
    for (const co of coins) co.y += speed * dt;
    coins = coins.filter((co) => co.y < 1.15 && !co.taken);

    // botsingen
    const px = player.x * W, py = playerY * H;
    if (invuln <= 0) {
      for (const e of enemies) {
        if (hit(px, py, S.carW * 0.82, S.carH * 0.82, e.x * W, e.y * H, S.carW, S.carH)) {
          crash((player.x + e.x) / 2, (playerY + e.y) / 2);
          e.hit = true;
          break;
        }
      }
      enemies = enemies.filter((e) => !e.hit);
    }
    for (const co of coins) {
      if (!co.taken && hit(px, py, S.carW, S.carH, co.x * W, co.y * H, S.coinR * 2, S.coinR * 2)) {
        co.taken = true; dist += 25; updateHud();
        boom(co.x, co.y, '#ffd23d'); sCoin();
      }
    }

    updateHud();
  }

  // ---------- tekenen ----------
  function neon(color, blur) { g.shadowColor = color; g.shadowBlur = blur; }
  function noGlow() { g.shadowBlur = 0; }
  function rrPath(gg, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    gg.beginPath();
    gg.moveTo(x + r, y);
    gg.arcTo(x + w, y, x + w, y + h, r);
    gg.arcTo(x + w, y + h, x, y + h, r);
    gg.arcTo(x, y + h, x, y, r);
    gg.arcTo(x, y, x + w, y, r);
    gg.closePath();
  }
  function rrect(x, y, w, h, r) { rrPath(g, x, y, w, h, r); }

  function drawRoad() {
    g.fillStyle = GRASS; g.fillRect(0, 0, W, H);
    const rl = S.roadL * W, rr = S.roadR * W, rw = rr - rl;
    g.fillStyle = ROAD; g.fillRect(rl, 0, rw, H);
    // stoepranden (rood/wit, scrollend)
    const seg = unit * 0.09, off = (scroll * H) % (seg * 2);
    for (let y = -seg * 2 + off; y < H; y += seg * 2) {
      g.fillStyle = CURB1; g.fillRect(rl - unit * 0.02, y, unit * 0.02, seg);
      g.fillRect(rr, y, unit * 0.02, seg);
      g.fillStyle = CURB2; g.fillRect(rl - unit * 0.02, y + seg, unit * 0.02, seg);
      g.fillRect(rr, y + seg, unit * 0.02, seg);
    }
    // rijstrooklijnen (stippels)
    g.fillStyle = 'rgba(255,255,255,0.85)';
    const dashW = unit * 0.012, dashH = unit * 0.07;
    for (let l = 1; l < S.lanes; l++) {
      const x = (S.roadL + l * S.laneW) * W - dashW / 2;
      for (const m of marks) {
        const y = m * (H + dashH * 2) - dashH;
        g.fillRect(x, y, dashW, dashH);
      }
    }
  }

  function drawScenery() {
    for (const s of scenery) {
      const x = s.x * W, y = s.y * H, r = unit * 0.03;
      g.fillStyle = '#3b2a1a'; g.fillRect(x - r * 0.15, y, r * 0.3, r * 0.8); // stam
      g.fillStyle = '#2e7d3a';
      g.beginPath(); g.arc(x, y - r * 0.2, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#37974a';
      g.beginPath(); g.arc(x - r * 0.4, y, r * 0.7, 0, Math.PI * 2); g.fill();
    }
  }

  // Auto van bovenaf op een willekeurige context. front = -1 (naar boven,
  // speler) of +1 (naar beneden, tegenligger).
  function drawCarShape(gg, cx, cy, w, h, color, front) {
    // wielen
    gg.fillStyle = '#111318';
    const ww = w * 0.16, wh = h * 0.24;
    gg.fillRect(cx - w / 2 - ww * 0.3, cy - h * 0.28, ww, wh);
    gg.fillRect(cx + w / 2 - ww * 0.7, cy - h * 0.28, ww, wh);
    gg.fillRect(cx - w / 2 - ww * 0.3, cy + h * 0.05, ww, wh);
    gg.fillRect(cx + w / 2 - ww * 0.7, cy + h * 0.05, ww, wh);
    // body
    gg.shadowColor = color; gg.shadowBlur = w * 0.2;
    gg.fillStyle = color;
    rrPath(gg, cx - w / 2, cy - h / 2, w, h, w * 0.24); gg.fill();
    gg.shadowBlur = 0;
    // cabine / voorruit (donker, richting voorkant)
    gg.fillStyle = 'rgba(10,14,24,0.85)';
    rrPath(gg, cx - w * 0.34, cy + front * h * 0.02, w * 0.68, h * 0.34, w * 0.14); gg.fill();
    // spoiler achter
    gg.fillStyle = 'rgba(0,0,0,0.4)';
    gg.fillRect(cx - w * 0.42, cy - front * h * 0.45, w * 0.84, h * 0.07);
    // koplampen aan de voorkant
    gg.fillStyle = '#fff6c8';
    gg.fillRect(cx - w * 0.34, cy + front * h * 0.42, w * 0.16, h * 0.05);
    gg.fillRect(cx + w * 0.18, cy + front * h * 0.42, w * 0.16, h * 0.05);
  }
  function drawCar(cx, cy, color, front) { drawCarShape(g, cx, cy, S.carW, S.carH, color, front); }

  function draw() {
    drawRoad();
    drawScenery();

    g.save();
    if (shake > 0) { const m = shake * unit * 0.14; g.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }

    // munten
    for (const co of coins) {
      if (co.taken) continue;
      const x = co.x * W, y = co.y * H;
      neon('#ffd23d', unit * 0.03);
      g.fillStyle = '#ffd23d'; g.beginPath(); g.arc(x, y, S.coinR, 0, Math.PI * 2); g.fill();
      noGlow();
      g.fillStyle = '#b8860b'; g.beginPath(); g.arc(x, y, S.coinR * 0.55, 0, Math.PI * 2); g.fill();
    }
    // tegenliggers
    for (const e of enemies) drawCar(e.x * W, e.y * H, e.col, 1);
    // deeltjes
    for (const p of particles) {
      neon(p.color, unit * 0.025);
      g.globalAlpha = Math.max(0, p.life);
      g.fillStyle = p.color;
      const r = unit * 0.012;
      g.fillRect(p.x * W - r / 2, p.y * H - r / 2, r, r);
    }
    g.globalAlpha = 1; noGlow();
    // speler (knippert bij onkwetsbaarheid)
    if (!(invuln > 0 && Math.floor(invuln * 12) % 2 === 0)) drawCar(player.x * W, 0.82 * H, carColor, -1);

    g.restore();

    // turbo-balk (linksonder)
    const tbW = unit * 0.28, tbH = unit * 0.03, tbx = unit * 0.05, tby = H - unit * 0.06;
    g.fillStyle = 'rgba(0,0,0,0.45)'; rrect(tbx, tby, tbW, tbH, tbH / 2); g.fill();
    g.fillStyle = turbo > 0.25 ? '#ff9a3d' : '#ff5b5b'; rrect(tbx, tby, tbW * turbo, tbH, tbH / 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = 'bold ' + Math.floor(unit * 0.028) + 'px system-ui, sans-serif';
    g.textBaseline = 'middle'; g.fillText('🚀', tbx - unit * 0.005, tby + tbH / 2); g.textBaseline = 'alphabetic';

    if (flashT > 0) { g.fillStyle = `rgba(255,80,80,${Math.min(0.45, flashT * 1.4)})`; g.fillRect(0, 0, W, H); }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
    last = t;
    update(dt);
    draw();
  }

  // ---------- invoer ----------
  function onKey(e) {
    ensureAudio();
    if (e.key === 'p' || e.key === 'P') { setPaused(state !== 'paused'); return; }
    if (e.key === 'ArrowLeft' || e.key === 'a') { moveDir = -1; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd') { moveDir = 1; e.preventDefault(); }
    else if (e.key === ' ') { turboOn = true; e.preventDefault(); }
  }
  function onKeyUp(e) {
    if ((e.key === 'ArrowLeft' || e.key === 'a') && moveDir < 0) moveDir = 0;
    else if ((e.key === 'ArrowRight' || e.key === 'd') && moveDir > 0) moveDir = 0;
    else if (e.key === ' ') turboOn = false;
  }
  const holds = [];
  function bindPad(el) {
    const act = el.dataset.act;
    const down = (e) => {
      e.preventDefault(); ensureAudio();
      if (act === 'left') moveDir = -1;
      else if (act === 'right') moveDir = 1;
      else if (act === 'turbo') turboOn = true;
    };
    const up = () => {
      if (act === 'left' && moveDir < 0) moveDir = 0;
      else if (act === 'right' && moveDir > 0) moveDir = 0;
      else if (act === 'turbo') turboOn = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
    holds.push({ el, down, up });
  }
  fs.querySelectorAll('.race-pad').forEach(bindPad);

  function areaX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }
  function tStart(e) { ensureAudio(); dragging = true; dragX = areaX(e.touches[0].clientX); }
  function tMove(e) { if (dragging) dragX = areaX(e.touches[0].clientX); }
  function tEnd() { dragging = false; }

  // ---------- knoppen ----------
  pauseBtn.addEventListener('click', () => setPaused(state !== 'paused'));
  muteBtn.addEventListener('click', () => { muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; ensureAudio(); });
  function onBack() { if (dist > 0 && state !== 'over') ctx.submitScore(Math.floor(dist)); location.hash = '#/'; }
  fs.querySelector('#rc-back').addEventListener('click', onBack);
  const helpDlg = fs.querySelector('#rc-help');
  fs.querySelector('#rc-help-btn').addEventListener('click', () => {
    if (state === 'playing') setPaused(true);
    if (helpDlg.showModal) helpDlg.showModal();
  });
  function onVisibility() { if (document.hidden) setPaused(true); }

  // ---------- layout ----------
  function layout() {
    const aw = area.clientWidth, ah = area.clientHeight;
    if (!aw || !ah) return;
    W = aw; H = ah;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    sizes();
    draw();
  }
  function onResize() { layout(); }
  function onOrient() { setTimeout(layout, 150); }

  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrient);
  canvas.addEventListener('touchstart', tStart, { passive: true });
  canvas.addEventListener('touchmove', tMove, { passive: true });
  canvas.addEventListener('touchend', tEnd, { passive: true });
  canvas.addEventListener('touchcancel', tEnd, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  const ro = new ResizeObserver(() => layout());
  ro.observe(area);

  layout();
  initScene();
  buildSelect();
  goToSelect();
  requestAnimationFrame(layout);
  setTimeout(layout, 200);
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrient);
    canvas.removeEventListener('touchstart', tStart);
    canvas.removeEventListener('touchmove', tMove);
    canvas.removeEventListener('touchend', tEnd);
    canvas.removeEventListener('touchcancel', tEnd);
    document.removeEventListener('visibilitychange', onVisibility);
    holds.forEach(({ el, down, up }) => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', up);
      el.removeEventListener('pointercancel', up);
    });
    ro.disconnect();
    if (actx) { try { actx.close(); } catch (e) { /* al gesloten */ } }
    document.body.style.overflow = prevOverflow;
    fs.remove();
  };
}
