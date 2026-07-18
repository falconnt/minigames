// Ruimteschieter — neon-editie.
//
// Een schermvullende space-shooter: bestuur je neon-ruimteschip onderin, schiet
// de aanvallende vijanden kapot en ontwijk hun schoten. Alles wordt in code op
// canvas getekend (geen afbeeldingen), met neon-gloed via schaduw-blur.
//
// Coördinaten zijn genormaliseerd (0..1) zodat de game op elk schermformaat en
// bij draaien/resizen goed blijft werken; pas bij het tekenen/botsen worden ze
// omgezet naar pixels.

const PLAYER_COL = '#39f6ff';
const PLAYER_BULLET = '#aef9ff';
const ENEMY_BULLET = '#ff9a3d';
const ROW_COLORS = ['#ff3df0', '#c04bff', '#48ff8e', '#ffd23d', '#ff6b6b'];

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
        <li>Schiet alle vijanden kapot om naar de <b>volgende golf</b> te gaan — die is sneller!</li>
        <li>Word je geraakt of bereikt een vijand de bodem, dan verlies je een <b>leven</b> (je hebt er 3).</li>
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

  // ---------- afmetingen ----------
  let W = 320, H = 480, unit = 320, dpr = 1;
  const S = {}; // afgeleide maten (per layout herberekend)
  function sizes() {
    unit = Math.min(W, H);
    S.playerW = unit * 0.11; S.playerH = unit * 0.085;
    S.enemyW = unit * 0.09;  S.enemyH = unit * 0.07;
    S.pBulletW = Math.max(3, unit * 0.02); S.pBulletH = unit * 0.06;
    S.eBulletW = Math.max(3, unit * 0.02); S.eBulletH = unit * 0.055;
    S.glow = unit * 0.04;
  }

  // ---------- spelstatus ----------
  let player = { x: 0.5, y: 0.9 };
  let pBullets = [];   // { x, y }  (y in genormaliseerde hoogte, beweegt omhoog)
  let eBullets = [];
  let enemies = [];    // { x, y, alive, color, points }
  let particles = [];
  let stars = [];
  let dir = 1;         // formatie-richting
  let enemySpeed = 0.14;
  let score = 0, wave = 1, lives = 3;
  let state = 'playing'; // 'playing' | 'wavebreak' | 'paused' | 'over'
  let breakT = 0;
  let fireCd = 0, enemyFireCd = 1.2, invuln = 0;
  let moveDir = 0, firing = false, dragging = false, dragX = 0;
  let raf = 0, last = 0;

  function makeStars() {
    stars = [];
    for (let i = 0; i < 70; i++) {
      stars.push({ x: Math.random(), y: Math.random(), s: Math.random() * 0.6 + 0.2, sp: Math.random() * 0.05 + 0.02 });
    }
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
        enemies.push({ x, y, alive: true, color: ROW_COLORS[r % ROW_COLORS.length], points: (rows - r) * 10 });
      }
    }
    dir = 1;
    enemySpeed = 0.13 + (n - 1) * 0.02;
    enemyFireCd = Math.max(0.35, 1.2 - (n - 1) * 0.08);
  }

  function newGame() {
    score = 0; wave = 1; lives = 3;
    player = { x: 0.5, y: 0.9 };
    pBullets = []; eBullets = []; particles = [];
    invuln = 0; fireCd = 0;
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

  function boom(nx, ny, color) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * 0.4 + 0.1;
      particles.push({ x: nx, y: ny, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
    }
  }

  function loseLife() {
    if (invuln > 0) return;
    lives -= 1;
    invuln = 1.6;
    boom(player.x, player.y, PLAYER_COL);
    eBullets = [];
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

  // ---------- botsing (in pixels) ----------
  function hit(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  // ---------- update ----------
  function update(dt) {
    // sterren bewegen altijd (ook tijdens golfpauze) voor sfeer
    for (const st of stars) { st.y += st.sp * dt; if (st.y > 1) { st.y = 0; st.x = Math.random(); } }
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6; }
    particles = particles.filter((p) => p.life > 0);

    if (state === 'wavebreak') {
      breakT -= dt;
      if (breakT <= 0) { state = 'playing'; overlay.hidden = true; }
      return;
    }
    if (state !== 'playing') return;

    if (invuln > 0) invuln -= dt;

    // speler bewegen
    const halfW = (S.playerW / 2) / W;
    if (dragging) player.x = Math.min(1 - halfW, Math.max(halfW, dragX));
    else player.x = Math.min(1 - halfW, Math.max(halfW, player.x + moveDir * 0.95 * dt));

    // schieten
    fireCd -= dt;
    if ((firing || dragging) && fireCd <= 0) {
      pBullets.push({ x: player.x, y: player.y - (S.playerH / 2) / H });
      fireCd = 0.18;
    }
    for (const b of pBullets) b.y -= 1.35 * dt;
    pBullets = pBullets.filter((b) => b.y > -0.05);

    // vijanden (formatie) bewegen
    const halfEW = (S.enemyW / 2) / W;
    let minX = 1, maxX = 0, lowest = 0, aliveCount = 0;
    for (const e of enemies) if (e.alive) { minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x); lowest = Math.max(lowest, e.y); aliveCount++; }
    if (aliveCount === 0) { // golf gehaald
      wave += 1; updateHud();
      spawnWave(wave);
      state = 'wavebreak'; breakT = 1.1;
      overlay.innerHTML = `<h2>Golf ${wave}</h2><p>Maak je klaar…</p>`;
      overlay.hidden = false;
      return;
    }
    let stepDown = 0;
    if (minX - halfEW < 0.02 && dir < 0) { dir = 1; stepDown = (S.enemyH * 0.5) / H; }
    else if (maxX + halfEW > 0.98 && dir > 0) { dir = -1; stepDown = (S.enemyH * 0.5) / H; }
    const spd = enemySpeed * (1 + (1 - aliveCount / enemies.length) * 0.8); // sneller als er minder over zijn
    for (const e of enemies) if (e.alive) { e.x += dir * spd * dt; e.y += stepDown; }

    // vijand bereikt de bodem
    if (lowest + (S.enemyH / 2) / H >= player.y - (S.playerH / 2) / H) { loseLife(); if (state === 'over') return; spawnWave(wave); }

    // vijanden schieten
    enemyFireCd -= dt;
    if (enemyFireCd <= 0) {
      const shooters = enemies.filter((e) => e.alive);
      const e = shooters[Math.floor(Math.random() * shooters.length)];
      if (e) eBullets.push({ x: e.x, y: e.y });
      enemyFireCd = Math.max(0.3, (1.1 - (wave - 1) * 0.07) * (0.6 + Math.random() * 0.8));
    }
    for (const b of eBullets) b.y += 0.6 * dt;
    eBullets = eBullets.filter((b) => b.y < 1.05);

    // botsingen: spelerkogels vs vijanden
    for (const b of pBullets) {
      if (b.dead) continue;
      const bx = b.x * W, by = b.y * H;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (hit(bx, by, S.pBulletW, S.pBulletH, e.x * W, e.y * H, S.enemyW, S.enemyH)) {
          e.alive = false; b.dead = true;
          score += e.points; updateHud();
          boom(e.x, e.y, e.color);
          break;
        }
      }
    }
    pBullets = pBullets.filter((b) => !b.dead);

    // vijandkogels vs speler
    if (invuln <= 0) {
      const px = player.x * W, py = player.y * H;
      for (const b of eBullets) {
        if (hit(px, py, S.playerW * 0.7, S.playerH * 0.7, b.x * W, b.y * H, S.eBulletW, S.eBulletH)) {
          eBullets = eBullets.filter((x) => x !== b);
          loseLife();
          break;
        }
      }
    }
  }

  // ---------- tekenen ----------
  function neon(color, blur) { g.shadowColor = color; g.shadowBlur = blur; }
  function noGlow() { g.shadowBlur = 0; }

  function draw() {
    // achtergrond
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a1030'); grad.addColorStop(1, '#05060f');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    // sterren
    noGlow();
    for (const st of stars) {
      g.globalAlpha = st.s;
      g.fillStyle = '#bcd8ff';
      const r = st.s * unit * 0.006 + 0.5;
      g.fillRect(st.x * W, st.y * H, r, r);
    }
    g.globalAlpha = 1;

    // vijanden
    for (const e of enemies) {
      if (!e.alive) continue;
      drawEnemy(e.x * W, e.y * H, e.color);
    }
    // spelerkogels
    neon(PLAYER_BULLET, S.glow);
    g.fillStyle = PLAYER_BULLET;
    for (const b of pBullets) g.fillRect(b.x * W - S.pBulletW / 2, b.y * H - S.pBulletH / 2, S.pBulletW, S.pBulletH);
    // vijandkogels
    neon(ENEMY_BULLET, S.glow);
    g.fillStyle = ENEMY_BULLET;
    for (const b of eBullets) g.fillRect(b.x * W - S.eBulletW / 2, b.y * H - S.eBulletH / 2, S.eBulletW, S.eBulletH);
    // deeltjes
    for (const p of particles) {
      neon(p.color, S.glow);
      g.globalAlpha = Math.max(0, p.life);
      g.fillStyle = p.color;
      const r = unit * 0.012;
      g.fillRect(p.x * W - r / 2, p.y * H - r / 2, r, r);
    }
    g.globalAlpha = 1;
    // speler (knippert tijdens onkwetsbaarheid)
    if (!(invuln > 0 && Math.floor(invuln * 12) % 2 === 0)) drawPlayer(player.x * W, player.y * H);
    noGlow();
  }

  // Afgeronde rechthoek (pad) — helper voor de cabine.
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

  // Speler = een neon-luchtschip: een ovale ballon met een cabine eronder.
  function drawPlayer(cx, cy) {
    const w = S.playerW, h = S.playerH;
    const bodyCy = cy - h * 0.08;
    const rx = w * 0.5, ry = h * 0.34;
    // romp (ballon)
    neon(PLAYER_COL, S.glow * 1.3);
    g.fillStyle = PLAYER_COL;
    g.beginPath();
    g.ellipse(cx, bodyCy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    noGlow();
    // panelen-lijn over de romp
    g.strokeStyle = 'rgba(5, 6, 15, 0.45)';
    g.lineWidth = Math.max(1, h * 0.03);
    g.beginPath(); g.moveTo(cx - rx * 0.9, bodyCy); g.lineTo(cx + rx * 0.9, bodyCy); g.stroke();
    // lichte glans bovenop
    g.fillStyle = 'rgba(234, 255, 255, 0.85)';
    g.beginPath(); g.ellipse(cx, bodyCy - ry * 0.45, rx * 0.5, ry * 0.26, 0, 0, Math.PI * 2); g.fill();
    // touwtjes naar de cabine
    const gW = w * 0.36, gH = h * 0.26, gy = cy + h * 0.26;
    g.strokeStyle = PLAYER_COL;
    g.lineWidth = Math.max(1, w * 0.02);
    g.beginPath();
    g.moveTo(cx - gW * 0.35, bodyCy + ry * 0.75); g.lineTo(cx - gW * 0.35, gy - gH / 2);
    g.moveTo(cx + gW * 0.35, bodyCy + ry * 0.75); g.lineTo(cx + gW * 0.35, gy - gH / 2);
    g.stroke();
    // cabine (gondel)
    g.fillStyle = '#eaffff';
    rrect(cx - gW / 2, gy - gH / 2, gW, gH, Math.min(gW, gH) * 0.32); g.fill();
    // raampjes
    g.fillStyle = '#0a1030';
    g.fillRect(cx - gW * 0.30, gy - gH * 0.16, gW * 0.18, gH * 0.4);
    g.fillRect(cx + gW * 0.12, gy - gH * 0.16, gW * 0.18, gH * 0.4);
  }

  function drawEnemy(cx, cy, color) {
    const w = S.enemyW, h = S.enemyH;
    neon(color, S.glow);
    g.fillStyle = color;
    // simpel "invader"-lijf: afgeronde romp + twee pootjes
    const x = cx - w / 2, y = cy - h / 2;
    g.beginPath();
    const rr = Math.min(w, h) * 0.28;
    g.moveTo(x + rr, y);
    g.arcTo(x + w, y, x + w, y + h, rr);
    g.arcTo(x + w, y + h, x, y + h, rr);
    g.arcTo(x, y + h, x, y, rr);
    g.arcTo(x, y, x + w, y, rr);
    g.closePath();
    g.fill();
    noGlow();
    // oogjes
    g.fillStyle = '#05060f';
    g.fillRect(cx - w * 0.22, cy - h * 0.08, w * 0.14, h * 0.16);
    g.fillRect(cx + w * 0.08, cy - h * 0.08, w * 0.14, h * 0.16);
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
      e.preventDefault();
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

  // vinger over het veld = schip volgt vinger + schiet vanzelf
  function areaX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }
  function tStart(e) { dragging = true; dragX = areaX(e.touches[0].clientX); }
  function tMove(e) { if (dragging) dragX = areaX(e.touches[0].clientX); }
  function tEnd() { dragging = false; }

  // ---------- knoppen ----------
  pauseBtn.addEventListener('click', () => setPaused(state !== 'paused'));
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
    document.body.style.overflow = prevOverflow;
    fs.remove();
  };
}
