// Ruimteschieter — neon-editie (met geluid, power-ups, combo's en screenshake).
//
// Een schermvullende space-shooter: bestuur je neon-luchtschip onderin, schiet de
// aanvallende vijanden kapot, pak power-ups en ontwijk hun schoten. Alles wordt in
// code op canvas getekend (geen afbeeldingen), met neon-gloed via schaduw-blur en
// geluid via de WebAudio-API (geen geluidsbestanden).
//
// Coördinaten zijn genormaliseerd (0..1) zodat de game op elk schermformaat en bij
// draaien/resizen goed blijft werken; pas bij tekenen/botsen worden ze pixels.

const PLAYER_COL = '#39f6ff';
const PLAYER_BULLET = '#aef9ff';
const ENEMY_BULLET = '#ff9a3d';
const ROW_COLORS = ['#ff3df0', '#c04bff', '#48ff8e', '#ffd23d', '#ff6b6b'];
const POWERS = ['triple', 'rapid', 'shield'];
const POWER_COL = { triple: '#48ff8e', rapid: '#ffd23d', shield: '#39f6ff' };

export function init(root, ctx) {
  // ---------- fullscreen-laag ----------
  root.innerHTML = '';
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const fs = document.createElement('div');
  fs.className = 'rs-fs';
  fs.innerHTML = `
    <div class="rs-top">
      <button id="rs-back" class="rs-btn rs-back" aria-label="Terug naar menu">← Terug</button>
      <span class="rs-stat">Score <b id="rs-score">0</b></span>
      <span class="rs-stat">Golf <b id="rs-wave">1</b></span>
      <span class="rs-stat">Levens <b id="rs-lives">♥♥♥</b></span>
      <span class="rs-actions">
        <button id="rs-mute" class="rs-btn" aria-label="Geluid aan of uit">🔊</button>
        <button id="rs-pause" class="rs-btn">Pauze</button>
        <button id="rs-help-btn" class="rs-btn" aria-label="Uitleg">❔</button>
      </span>
    </div>
    <div class="rs-area" id="rs-area">
      <canvas id="rs-canvas" class="rs-canvas" aria-label="Speelveld"></canvas>
      <div id="rs-overlay" class="rs-overlay" hidden></div>
    </div>
    <div class="rs-controls" aria-label="Bediening">
      <button class="rs-pad" data-act="left" aria-label="Naar links">◀</button>
      <button class="rs-pad" data-act="right" aria-label="Naar rechts">▶</button>
      <button class="rs-pad rs-pad-fire" data-act="fire" aria-label="Schieten">🔥 vuur</button>
    </div>
    <dialog id="rs-help" class="rs-help">
      <h2>Zo speel je Ruimteschieter</h2>
      <ul class="rs-help-list">
        <li><b>◀ ▶</b> — vlieg naar links of rechts (of veeg met je vinger over het veld).</li>
        <li><b>🔥 vuur</b> — ingedrukt houden om te schieten. Sleep je met je vinger, dan schiet je vanzelf.</li>
        <li>Schiet snel achter elkaar voor een <b>combo</b> — dan tellen je punten dubbel!</li>
        <li>Pak vallende <b>power-ups</b>: 🔫 driedubbel schot, ⚡ snelvuur, 🛡️ schild.</li>
        <li>Maak een golf op voor de <b>volgende</b> (sneller!). Word je geraakt of bereikt een vijand de bodem, dan verlies je een leven (je hebt er 3).</li>
        <li><b>Toetsenbord:</b> pijltjes bewegen, spatie = schieten, P = pauze.</li>
      </ul>
      <form method="dialog"><button class="rs-btn primary">Sluiten</button></form>
    </dialog>`;
  document.body.appendChild(fs);

  const canvas = fs.querySelector('#rs-canvas');
  const area = fs.querySelector('#rs-area');
  const g = canvas.getContext('2d');
  const overlay = fs.querySelector('#rs-overlay');
  const scoreEl = fs.querySelector('#rs-score');
  const waveEl = fs.querySelector('#rs-wave');
  const livesEl = fs.querySelector('#rs-lives');
  const pauseBtn = fs.querySelector('#rs-pause');
  const muteBtn = fs.querySelector('#rs-mute');

  // ---------- afmetingen ----------
  let W = 320, H = 480, unit = 320, dpr = 1;
  const S = {};
  function sizes() {
    unit = Math.min(W, H);
    S.playerW = unit * 0.12; S.playerH = unit * 0.10;
    S.enemyW = unit * 0.09;  S.enemyH = unit * 0.07;
    S.pBulletW = Math.max(3, unit * 0.02); S.pBulletH = unit * 0.06;
    S.eBulletW = Math.max(3, unit * 0.02); S.eBulletH = unit * 0.055;
    S.glow = unit * 0.04;
  }

  // ---------- geluid (WebAudio, geen bestanden) ----------
  let actx = null, muted = false;
  function ensureAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function tone(freq, dur, type, vol, slideTo, at) {
    if (muted || !actx) return;
    const t = actx.currentTime + (at || 0);
    const o = actx.createOscillator(), gN = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gN.gain.setValueAtTime(vol, t);
    gN.gain.exponentialRampToValueAtTime(0.0001, t + dur);
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
    f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
    const gN = actx.createGain(); gN.gain.setValueAtTime(vol, t); gN.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(gN).connect(actx.destination); src.start(t); src.stop(t + dur);
  }
  const sShoot = () => tone(880, 0.08, 'square', 0.05, 480);
  const sExplode = () => { noiseBurst(0.28, 0.15); tone(180, 0.25, 'sawtooth', 0.07, 60); };
  const sHit = () => { noiseBurst(0.32, 0.2); tone(120, 0.35, 'square', 0.16, 50); };
  const sPower = () => { tone(520, 0.09, 'triangle', 0.12, 660); tone(780, 0.12, 'triangle', 0.12, 1040, 0.09); };
  const sWave = () => { tone(440, 0.1, 'square', 0.09, 660); tone(660, 0.14, 'square', 0.09, 900, 0.1); };

  // ---------- spelstatus ----------
  let player = { x: 0.5, y: 0.9 };
  let pBullets = [], eBullets = [], enemies = [], particles = [], powerups = [], popups = [], stars = [];
  let bgFar = null, bgStars = null, clock = 0, bgScroll = 0;
  let comets = [], cometT = 3;
  let muzzleT = 0, bank = 0, introClock = 0, flashT = 0, flashCol = '255,255,255';
  let dir = 1, enemySpeed = 0.14;
  let score = 0, wave = 1, lives = 3;
  let state = 'playing';
  let breakT = 0, fireCd = 0, enemyFireCd = 1.2, invuln = 0;
  let pTriple = 0, pRapid = 0, pShield = 0, powerDropsLeft = 1;
  let shake = 0, killStreak = 0, streakT = 0;
  let moveDir = 0, firing = false, dragging = false, dragX = 0;
  let raf = 0, last = 0;

  // Zacht driftende voorgrond-sterren (rond, met kleur en twinkeling).
  function makeStars() {
    stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.1 + 0.4,
        b: Math.random() * 0.5 + 0.4,
        sp: Math.random() * 0.02 + 0.006,
        tw: Math.random() * 6.28, ts: Math.random() * 2 + 1,
        col: Math.random() < 0.75 ? '#ffffff' : (Math.random() < 0.5 ? '#bcd0ff' : '#ffe9c0'),
      });
    }
  }

  // Bouwt de achtergrond in twee lagen: een statische "verre" laag (diepe ruimte
  // + nevels + Melkweg + planeet) en een transparante sterren-laag die langzaam
  // scrollt voor het gevoel dat je door de ruimte vliegt.
  function buildBackground() {
    const bw = Math.max(1, Math.round(W * dpr)), bh = Math.max(1, Math.round(H * dpr));
    const U = Math.min(bw, bh);

    if (!bgFar) bgFar = document.createElement('canvas');
    bgFar.width = bw; bgFar.height = bh;
    const c = bgFar.getContext('2d');
    const base = c.createLinearGradient(0, 0, 0, bh);
    base.addColorStop(0, '#070912'); base.addColorStop(0.6, '#04050d'); base.addColorStop(1, '#02030a');
    c.fillStyle = base; c.fillRect(0, 0, bw, bh);

    c.globalCompositeOperation = 'lighter';
    const clouds = [
      { x: 0.25, y: 0.26, col: '138,60,220' },
      { x: 0.74, y: 0.16, col: '40,120,220' },
      { x: 0.60, y: 0.48, col: '210,50,150' },
      { x: 0.16, y: 0.62, col: '40,180,160' },
    ];
    for (const cl of clouds) {
      for (let k = 0; k < 5; k++) {
        const cx = (cl.x + (Math.random() - 0.5) * 0.22) * bw;
        const cy = (cl.y + (Math.random() - 0.5) * 0.22) * bh;
        const rad = U * (0.18 + Math.random() * 0.22);
        const gr = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
        gr.addColorStop(0, `rgba(${cl.col},${0.05 + Math.random() * 0.05})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill();
      }
    }
    c.save();
    c.translate(bw * 0.5, bh * 0.42); c.rotate(-0.5);
    const L = Math.hypot(bw, bh);
    const band = c.createLinearGradient(0, -L * 0.14, 0, L * 0.14);
    band.addColorStop(0, 'rgba(120,140,200,0)');
    band.addColorStop(0.5, 'rgba(150,160,210,0.05)');
    band.addColorStop(1, 'rgba(120,140,200,0)');
    c.fillStyle = band; c.fillRect(-L, -L * 0.14, L * 2, L * 0.28);
    c.fillStyle = '#dfe6ff';
    for (let i = 0; i < 220; i++) {
      c.globalAlpha = Math.random() * 0.5 + 0.1;
      const r = Math.random() * 0.9 * dpr + 0.3;
      c.beginPath(); c.arc((Math.random() - 0.5) * L * 1.6, (Math.random() - 0.5) * L * 0.16, r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1; c.restore();
    c.globalCompositeOperation = 'source-over';
    // heel vage verre sterren (statisch)
    for (let i = 0; i < Math.round(bw * bh / 22000); i++) {
      const x = Math.random() * bw, y = Math.random() * bh, r = (Math.random() * 0.9 + 0.2) * dpr, a = Math.random() * 0.35 + 0.08;
      c.fillStyle = `rgba(210,220,255,${a})`;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    const px = bw * 0.8, py = bh * 0.15, pr = U * 0.12;
    const pg = c.createRadialGradient(px - pr * 0.35, py - pr * 0.35, pr * 0.1, px, py, pr);
    pg.addColorStop(0, 'rgba(95,125,185,0.55)');
    pg.addColorStop(0.7, 'rgba(38,52,92,0.4)');
    pg.addColorStop(1, 'rgba(8,12,30,0.12)');
    c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();

    // scrollende sterren-laag (transparant, tegelt naadloos)
    if (!bgStars) bgStars = document.createElement('canvas');
    bgStars.width = bw; bgStars.height = bh;
    const s = bgStars.getContext('2d');
    s.clearRect(0, 0, bw, bh);
    const N = Math.round(bw * bh / 11000);
    for (let i = 0; i < N; i++) {
      const x = Math.random() * bw, y = Math.random() * bh;
      const r = (Math.random() * Math.random() * 1.4 + 0.3) * dpr;
      const a = Math.random() * 0.7 + 0.15;
      const t = Math.random();
      s.fillStyle = t < 0.72 ? `rgba(255,255,255,${a})` : t < 0.86 ? `rgba(190,210,255,${a})` : `rgba(255,225,180,${a})`;
      s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.fill();
    }
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * bw, y = Math.random() * bh;
      const gr = s.createRadialGradient(x, y, 0, x, y, 6 * dpr);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      s.fillStyle = gr; s.beginPath(); s.arc(x, y, 6 * dpr, 0, Math.PI * 2); s.fill();
    }
  }

  function spawnComet() {
    const fromLeft = Math.random() < 0.5;
    let dx = (fromLeft ? 1 : -1) * (0.6 + Math.random() * 0.3);
    let dy = 0.6 + Math.random() * 0.3;
    const m = Math.hypot(dx, dy); dx /= m; dy /= m;
    comets.push({ x: fromLeft ? -0.05 : 1.05, y: Math.random() * 0.3, dx, dy, sp: 0.5 + Math.random() * 0.4 });
  }
  function drawComet(cm) {
    const hx = cm.x * W, hy = cm.y * H;
    const tx = (cm.x - cm.dx * 0.12) * W, ty = (cm.y - cm.dy * 0.12) * H;
    const grad = g.createLinearGradient(hx, hy, tx, ty);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(150,210,255,0)');
    neon('#bfe6ff', S.glow);
    g.strokeStyle = grad; g.lineWidth = Math.max(1.5, unit * 0.01); g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(hx, hy, Math.max(1.5, unit * 0.008), 0, Math.PI * 2); g.fill();
    noGlow();
  }

  function spawnWave(n) {
    enemies = [];
    const cols = 6;
    const rows = Math.min(3 + Math.floor((n - 1) / 2), 5);
    const marginX = 0.10, top = 0.10, gapY = 0.085;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = marginX + (c + 0.5) * ((1 - 2 * marginX) / cols);
        const y = top + r * gapY;
        enemies.push({ x, y, alive: true, color: ROW_COLORS[r % ROW_COLORS.length], points: (rows - r) * 10, delay: r * 0.06 + c * 0.015 });
      }
    }
    dir = 1;
    introClock = 0;
    enemySpeed = 0.13 + (n - 1) * 0.02;
    enemyFireCd = Math.max(0.35, 1.0 - (n - 1) * 0.08);
    // Hooguit 1 power-up per golf in het begin, later 2. Ze vervallen per golf.
    powerDropsLeft = n <= 2 ? 1 : 2;
  }

  function newGame() {
    score = 0; wave = 1; lives = 3;
    player = { x: 0.5, y: 0.9 };
    pBullets = []; eBullets = []; particles = []; powerups = []; popups = [];
    invuln = 0; fireCd = 0; pTriple = 0; pRapid = 0; pShield = 0;
    shake = 0; killStreak = 0; streakT = 0;
    comets = []; cometT = 3; muzzleT = 0; bank = 0; flashT = 0; bgScroll = 0;
    makeStars();
    spawnWave(1);
    state = 'playing';
    overlay.hidden = true;
    pauseBtn.textContent = 'Pauze';
    updateHud();
  }

  function updateHud() {
    scoreEl.textContent = score;
    waveEl.textContent = wave;
    livesEl.textContent = lives > 0 ? '♥'.repeat(lives) : '—';
  }

  function boom(nx, ny, color, big) {
    const n = big ? 22 : 12;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * (big ? 0.6 : 0.4) + 0.1;
      particles.push({ x: nx, y: ny, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
    }
    particles.push({ x: nx, y: ny, ring: 1, color });
  }
  function maybeDrop(x, y) {
    // Beperkt aantal per golf + lagere kans, zodat power-ups bijzonder blijven.
    if (powerDropsLeft > 0 && Math.random() < 0.10) {
      powerups.push({ x, y, type: POWERS[Math.floor(Math.random() * POWERS.length)] });
      powerDropsLeft -= 1;
    }
  }

  function loseLife() {
    if (invuln > 0 || pShield > 0) return;
    lives -= 1;
    invuln = 1.6;
    boom(player.x, player.y, PLAYER_COL, true);
    eBullets = [];
    shake = 0.4;
    flashT = 0.3; flashCol = '255,60,60';
    sHit();
    updateHud();
    if (lives <= 0) gameOver();
  }

  function gameOver() {
    state = 'over';
    const result = score > 0 ? ctx.submitScore(score) : null;
    overlay.innerHTML = `
      <h2>💥 Game over</h2>
      <p>Score: ${score} · golf ${wave}${result?.isRecord ? ' — 🥇 nieuw record!' : result?.rank ? ` — plek ${result.rank} in de top 10` : ''}</p>
      <button id="rs-again" class="rs-btn primary">Nog een keer</button>`;
    overlay.hidden = false;
    overlay.querySelector('#rs-again').addEventListener('click', newGame);
  }

  function setPaused(on) {
    if (state === 'over') return;
    if (on && (state === 'playing' || state === 'wavebreak')) {
      state = 'paused';
      pauseBtn.textContent = 'Verder';
      overlay.innerHTML = `<h2>⏸️ Pauze</h2>
        <button id="rs-resume" class="rs-btn primary">Verder spelen</button>
        <button id="rs-newp" class="rs-btn">Nieuw spel</button>`;
      overlay.hidden = false;
      overlay.querySelector('#rs-resume').addEventListener('click', () => setPaused(false));
      overlay.querySelector('#rs-newp').addEventListener('click', newGame);
    } else if (!on && state === 'paused') {
      state = 'playing';
      pauseBtn.textContent = 'Pauze';
      overlay.hidden = true;
    }
  }

  function hit(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  // ---------- update ----------
  function update(dt) {
    // sfeer + visuele effecten lopen altijd
    clock += dt;
    bgScroll += dt * H * 0.03;
    if (muzzleT > 0) muzzleT -= dt;
    if (flashT > 0) flashT -= dt;
    for (const st of stars) { st.y += st.sp * dt; if (st.y > 1.02) { st.y = -0.02; st.x = Math.random(); } }
    cometT -= dt;
    if (cometT <= 0) { spawnComet(); cometT = 5 + Math.random() * 6; }
    for (const cm of comets) { cm.x += cm.dx * cm.sp * dt; cm.y += cm.dy * cm.sp * dt; }
    comets = comets.filter((cm) => cm.x > -0.25 && cm.x < 1.25 && cm.y < 1.25);
    for (const p of particles) { if (p.ring != null) { p.ring += dt * 4; } else { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6; } }
    particles = particles.filter((p) => (p.ring != null ? p.ring < 1.6 : p.life > 0));
    for (const pp of popups) { pp.y -= 0.12 * dt; pp.life -= dt * 0.9; }
    popups = popups.filter((pp) => pp.life > 0);
    if (shake > 0) shake -= dt;

    if (state === 'wavebreak') { breakT -= dt; if (breakT <= 0) { state = 'playing'; overlay.hidden = true; } return; }
    if (state !== 'playing') return;

    if (invuln > 0) invuln -= dt;
    if (pTriple > 0) pTriple -= dt;
    if (pRapid > 0) pRapid -= dt;
    if (pShield > 0) pShield -= dt;
    if (streakT > 0) { streakT -= dt; if (streakT <= 0) killStreak = 0; }
    introClock += dt;
    const targetBank = Math.max(-0.22, Math.min(0.22, (dragging ? (dragX - player.x) * 6 : moveDir) * 0.22));
    bank += (targetBank - bank) * Math.min(1, dt * 10);
    // motor-spoor achter het schip
    particles.push({ x: player.x + (Math.random() - 0.5) * 0.012, y: player.y + (S.playerH * 0.45) / H, vx: (Math.random() - 0.5) * 0.05, vy: 0.22 + Math.random() * 0.15, life: 0.5, color: Math.random() < 0.5 ? '#39f6ff' : '#ffd23d' });

    // speler bewegen
    const halfW = (S.playerW / 2) / W;
    if (dragging) player.x = Math.min(1 - halfW, Math.max(halfW, dragX));
    else player.x = Math.min(1 - halfW, Math.max(halfW, player.x + moveDir * 0.95 * dt));

    // schieten
    fireCd -= dt;
    if ((firing || dragging) && fireCd <= 0) {
      const topY = player.y - (S.playerH / 2) / H;
      if (pTriple > 0) {
        pBullets.push({ x: player.x, y: topY, vx: 0 });
        pBullets.push({ x: player.x, y: topY, vx: -0.35 });
        pBullets.push({ x: player.x, y: topY, vx: 0.35 });
      } else {
        pBullets.push({ x: player.x, y: topY, vx: 0 });
      }
      fireCd = pRapid > 0 ? 0.09 : 0.18;
      muzzleT = 0.06;
      sShoot();
    }
    for (const b of pBullets) { b.y -= 1.35 * dt; b.x += (b.vx || 0) * dt; }
    pBullets = pBullets.filter((b) => b.y > -0.05 && b.x > -0.05 && b.x < 1.05);

    // vijanden (formatie) bewegen
    const halfEW = (S.enemyW / 2) / W;
    let minX = 1, maxX = 0, lowest = 0, aliveCount = 0;
    for (const e of enemies) if (e.alive) { minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x); lowest = Math.max(lowest, e.y); aliveCount++; }
    if (aliveCount === 0) {
      wave += 1; updateHud();
      pTriple = 0; pRapid = 0; pShield = 0;   // power-ups gaan niet mee naar de volgende golf
      powerups = []; eBullets = [];           // openstaande power-ups/kogels opruimen
      spawnWave(wave);
      state = 'wavebreak'; breakT = 1.1;
      flashT = 0.25; flashCol = '255,255,255';
      overlay.innerHTML = `<h2>Golf ${wave}</h2><p>Maak je klaar…</p>`;
      overlay.hidden = false;
      sWave();
      return;
    }
    let stepDown = 0;
    if (minX - halfEW < 0.02 && dir < 0) { dir = 1; stepDown = (S.enemyH * 0.5) / H; }
    else if (maxX + halfEW > 0.98 && dir > 0) { dir = -1; stepDown = (S.enemyH * 0.5) / H; }
    const spd = enemySpeed * (1 + (1 - aliveCount / enemies.length) * 0.8);
    for (const e of enemies) if (e.alive) { e.x += dir * spd * dt; e.y += stepDown; }

    if (lowest + (S.enemyH / 2) / H >= player.y - (S.playerH / 2) / H) { loseLife(); if (state === 'over') return; spawnWave(wave); }

    // vijanden schieten
    enemyFireCd -= dt;
    if (enemyFireCd <= 0) {
      const shooters = enemies.filter((e) => e.alive);
      const e = shooters[Math.floor(Math.random() * shooters.length)];
      if (e) eBullets.push({ x: e.x, y: e.y });
      enemyFireCd = Math.max(0.28, (0.95 - (wave - 1) * 0.06) * (0.6 + Math.random() * 0.8));
    }
    for (const b of eBullets) b.y += 0.6 * dt;
    eBullets = eBullets.filter((b) => b.y < 1.05);

    // spelerkogels vs vijanden
    for (const b of pBullets) {
      if (b.dead) continue;
      const bx = b.x * W, by = b.y * H;
      for (const e of enemies) {
        if (!e.alive || (introClock - e.delay) < 0.28) continue;
        if (hit(bx, by, S.pBulletW, S.pBulletH, e.x * W, e.y * H, S.enemyW, S.enemyH)) {
          e.alive = false; b.dead = true;
          killStreak += 1; streakT = 1.2;
          const mult = 1 + Math.min(Math.floor(killStreak / 4), 2);
          const gained = e.points * mult;
          score += gained; updateHud();
          boom(e.x, e.y, e.color);
          popups.push({ x: e.x, y: e.y, text: '+' + gained + (mult > 1 ? ' ×' + mult : ''), life: 1, color: mult > 1 ? '#ffd23d' : '#eaffff' });
          shake = Math.max(shake, 0.12);
          sExplode();
          maybeDrop(e.x, e.y);
          break;
        }
      }
    }
    pBullets = pBullets.filter((b) => !b.dead);

    // vijandkogels vs speler
    if (invuln <= 0 && pShield <= 0) {
      const px = player.x * W, py = player.y * H;
      for (const b of eBullets) {
        if (hit(px, py, S.playerW * 0.7, S.playerH * 0.7, b.x * W, b.y * H, S.eBulletW, S.eBulletH)) {
          eBullets = eBullets.filter((x) => x !== b);
          loseLife();
          break;
        }
      }
    }

    // power-ups zakken + oppakken
    for (const pu of powerups) pu.y += 0.28 * dt;
    powerups = powerups.filter((pu) => pu.y < 1.08);
    const px2 = player.x * W, py2 = player.y * H;
    for (const pu of powerups) {
      if (hit(px2, py2, S.playerW, S.playerH, pu.x * W, pu.y * H, S.enemyW, S.enemyH)) {
        pu.taken = true;
        if (pu.type === 'triple') pTriple = 6;
        else if (pu.type === 'rapid') pRapid = 6;
        else pShield = 6;
        popups.push({ x: pu.x, y: Math.min(pu.y, 0.9), text: pu.type === 'triple' ? 'DRIEDUBBEL!' : pu.type === 'rapid' ? 'SNELVUUR!' : 'SCHILD!', life: 1.3, color: POWER_COL[pu.type] });
        sPower();
      }
    }
    powerups = powerups.filter((pu) => !pu.taken);
  }

  // ---------- tekenen ----------
  function neon(color, blur) { g.shadowColor = color; g.shadowBlur = blur; }
  function noGlow() { g.shadowBlur = 0; }
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function draw() {
    // realistische ruimte: statische verre laag + langzaam scrollende sterren
    if (bgFar) g.drawImage(bgFar, 0, 0, W, H);
    else { g.fillStyle = '#04050d'; g.fillRect(0, 0, W, H); }
    if (bgStars) { const y = ((bgScroll % H) + H) % H; g.drawImage(bgStars, 0, y - H, W, H); g.drawImage(bgStars, 0, y, W, H); }
    noGlow();
    for (const st of stars) {
      const a = st.b * (0.55 + 0.45 * Math.sin(clock * st.ts + st.tw));
      if (a <= 0) continue;
      g.globalAlpha = Math.min(1, a);
      g.fillStyle = st.col;
      g.beginPath(); g.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    for (const cm of comets) drawComet(cm);

    // wereld (beweegt mee met de shake)
    g.save();
    if (shake > 0) { const m = shake * unit * 0.16; g.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }

    for (const e of enemies) {
      if (!e.alive) continue;
      const p = Math.max(0, Math.min(1, (introClock - e.delay) / 0.28));
      if (p <= 0) continue;
      drawEnemy(e.x * W, e.y * H, e.color, p);
    }

    neon(PLAYER_BULLET, S.glow);
    g.fillStyle = PLAYER_BULLET;
    for (const b of pBullets) g.fillRect(b.x * W - S.pBulletW / 2, b.y * H - S.pBulletH / 2, S.pBulletW, S.pBulletH);
    neon(ENEMY_BULLET, S.glow);
    g.fillStyle = ENEMY_BULLET;
    for (const b of eBullets) g.fillRect(b.x * W - S.eBulletW / 2, b.y * H - S.eBulletH / 2, S.eBulletW, S.eBulletH);

    // power-ups (gekleurde tegel met een getekend pictogram — werkt op elk toestel)
    for (const pu of powerups) {
      const x = pu.x * W, y = pu.y * H, s = S.enemyW;
      neon(POWER_COL[pu.type], S.glow);
      g.fillStyle = POWER_COL[pu.type];
      rrect(x - s / 2, y - s / 2, s, s, s * 0.28); g.fill();
      noGlow();
      g.fillStyle = '#05060f';
      if (pu.type === 'triple') {
        for (const dx of [-0.26, 0, 0.26]) g.fillRect(x + dx * s - s * 0.05, y - s * 0.18, s * 0.10, s * 0.36);
      } else if (pu.type === 'rapid') {
        g.beginPath();
        g.moveTo(x + s * 0.14, y - s * 0.26);
        g.lineTo(x - s * 0.12, y + s * 0.04);
        g.lineTo(x + s * 0.02, y + s * 0.04);
        g.lineTo(x - s * 0.14, y + s * 0.28);
        g.lineTo(x + s * 0.18, y - s * 0.04);
        g.lineTo(x + s * 0.02, y - s * 0.04);
        g.closePath(); g.fill();
      } else {
        g.beginPath();
        g.moveTo(x, y - s * 0.28);
        g.lineTo(x + s * 0.24, y - s * 0.15);
        g.lineTo(x + s * 0.24, y + s * 0.06);
        g.quadraticCurveTo(x + s * 0.24, y + s * 0.26, x, y + s * 0.30);
        g.quadraticCurveTo(x - s * 0.24, y + s * 0.26, x - s * 0.24, y + s * 0.06);
        g.lineTo(x - s * 0.24, y - s * 0.15);
        g.closePath(); g.fill();
      }
    }

    // deeltjes + ringen
    for (const p of particles) {
      if (p.ring != null) {
        g.globalAlpha = Math.max(0, 1 - p.ring / 1.6);
        neon(p.color, S.glow);
        g.strokeStyle = p.color; g.lineWidth = Math.max(1, unit * 0.008);
        g.beginPath(); g.arc(p.x * W, p.y * H, p.ring * unit * 0.09, 0, Math.PI * 2); g.stroke();
      } else {
        neon(p.color, S.glow * 0.7);
        g.globalAlpha = Math.max(0, p.life);
        g.fillStyle = p.color;
        const r = unit * 0.012;
        g.fillRect(p.x * W - r / 2, p.y * H - r / 2, r, r);
      }
    }
    g.globalAlpha = 1; noGlow();

    // speler (met lichte kanteling bij bewegen) + mondingsflits
    if (!(invuln > 0 && Math.floor(invuln * 12) % 2 === 0)) {
      g.save();
      g.translate(player.x * W, player.y * H);
      g.rotate(bank);
      drawPlayer(0, 0);
      g.restore();
      if (muzzleT > 0) {
        neon('#aef9ff', S.glow * 1.5);
        g.globalAlpha = Math.min(1, muzzleT / 0.06);
        g.fillStyle = '#eaffff';
        g.beginPath(); g.arc(player.x * W, player.y * H - S.playerH * 0.5, S.playerW * 0.22, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1; noGlow();
      }
    }

    // zwevende punten-popups
    for (const pp of popups) {
      g.globalAlpha = Math.max(0, Math.min(1, pp.life));
      neon(pp.color, S.glow * 0.6);
      g.fillStyle = pp.color;
      g.font = 'bold ' + Math.floor(unit * 0.032) + 'px system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(pp.text, pp.x * W, pp.y * H);
    }
    g.globalAlpha = 1; noGlow();
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';

    g.restore();

    // scherm-flits (rood bij hit, wit bij nieuwe golf)
    if (flashT > 0) { g.fillStyle = `rgba(${flashCol},${Math.min(0.5, flashT * 1.6)})`; g.fillRect(0, 0, W, H); }
  }

  // Speler = een neon-luchtschip met motorvlam (en schild-ring bij power-up).
  function drawPlayer(cx, cy) {
    const w = S.playerW, h = S.playerH;
    const bodyCy = cy - h * 0.10;
    const rx = w * 0.5, ry = h * 0.30;
    const gW = w * 0.34, gH = h * 0.22, gy = cy + h * 0.22;

    // motorvlam
    const fl = h * (0.14 + Math.random() * 0.14);
    neon('#ff9a3d', S.glow);
    g.fillStyle = '#ffd23d';
    g.beginPath();
    g.moveTo(cx - w * 0.10, gy + gH / 2);
    g.lineTo(cx + w * 0.10, gy + gH / 2);
    g.lineTo(cx, gy + gH / 2 + fl);
    g.closePath(); g.fill();
    noGlow();

    // romp (ballon)
    neon(PLAYER_COL, S.glow * 1.3);
    g.fillStyle = PLAYER_COL;
    g.beginPath();
    g.ellipse(cx, bodyCy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    noGlow();
    g.strokeStyle = 'rgba(5, 6, 15, 0.45)';
    g.lineWidth = Math.max(1, h * 0.03);
    g.beginPath(); g.moveTo(cx - rx * 0.9, bodyCy); g.lineTo(cx + rx * 0.9, bodyCy); g.stroke();
    g.fillStyle = 'rgba(234, 255, 255, 0.85)';
    g.beginPath(); g.ellipse(cx, bodyCy - ry * 0.45, rx * 0.5, ry * 0.26, 0, 0, Math.PI * 2); g.fill();

    // touwtjes + cabine
    g.strokeStyle = PLAYER_COL; g.lineWidth = Math.max(1, w * 0.02);
    g.beginPath();
    g.moveTo(cx - gW * 0.35, bodyCy + ry * 0.8); g.lineTo(cx - gW * 0.35, gy - gH / 2);
    g.moveTo(cx + gW * 0.35, bodyCy + ry * 0.8); g.lineTo(cx + gW * 0.35, gy - gH / 2);
    g.stroke();
    g.fillStyle = '#eaffff';
    rrect(cx - gW / 2, gy - gH / 2, gW, gH, Math.min(gW, gH) * 0.32); g.fill();
    g.fillStyle = '#0a1030';
    g.fillRect(cx - gW * 0.30, gy - gH * 0.16, gW * 0.18, gH * 0.4);
    g.fillRect(cx + gW * 0.12, gy - gH * 0.16, gW * 0.18, gH * 0.4);

    // schild-ring (knippert als hij bijna op is)
    if (pShield > 0 && (pShield > 1.6 || Math.floor(pShield * 8) % 2 === 0)) {
      neon('#39f6ff', S.glow * 1.2);
      g.strokeStyle = 'rgba(57, 246, 255, 0.85)';
      g.lineWidth = Math.max(1.5, w * 0.06);
      g.beginPath(); g.ellipse(cx, cy, w * 0.8, h * 0.72, 0, 0, Math.PI * 2); g.stroke();
      noGlow();
    }
  }

  function drawEnemy(cx, cy, color, p) {
    p = p == null ? 1 : p;
    const sc = 0.4 + 0.6 * (1 - Math.pow(1 - p, 3)); // easeOutCubic pop-in
    g.save();
    g.globalAlpha = p;
    g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
    const w = S.enemyW, h = S.enemyH;
    neon(color, S.glow);
    g.fillStyle = color;
    const x = cx - w / 2, y = cy - h / 2;
    const rr = Math.min(w, h) * 0.28;
    g.beginPath();
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath(); g.fill();
    noGlow();
    g.fillStyle = '#05060f';
    g.fillRect(cx - w * 0.22, cy - h * 0.08, w * 0.14, h * 0.16);
    g.fillRect(cx + w * 0.08, cy - h * 0.08, w * 0.14, h * 0.16);
    g.restore();
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
    else if (e.key === ' ') { firing = true; e.preventDefault(); }
  }
  function onKeyUp(e) {
    if ((e.key === 'ArrowLeft' || e.key === 'a') && moveDir < 0) moveDir = 0;
    else if ((e.key === 'ArrowRight' || e.key === 'd') && moveDir > 0) moveDir = 0;
    else if (e.key === ' ') firing = false;
  }

  const holds = [];
  function bindPad(el) {
    const act = el.dataset.act;
    const down = (e) => {
      e.preventDefault(); ensureAudio();
      if (act === 'left') moveDir = -1;
      else if (act === 'right') moveDir = 1;
      else if (act === 'fire') firing = true;
    };
    const up = () => {
      if (act === 'left' && moveDir < 0) moveDir = 0;
      else if (act === 'right' && moveDir > 0) moveDir = 0;
      else if (act === 'fire') firing = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
    holds.push({ el, down, up });
  }
  fs.querySelectorAll('.rs-pad').forEach(bindPad);

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
  function onBack() {
    if (score > 0 && state !== 'over') ctx.submitScore(score);
    location.hash = '#/';
  }
  fs.querySelector('#rs-back').addEventListener('click', onBack);
  const helpDlg = fs.querySelector('#rs-help');
  fs.querySelector('#rs-help-btn').addEventListener('click', () => {
    if (state === 'playing' || state === 'wavebreak') setPaused(true);
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
    buildBackground();
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
  newGame();
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
