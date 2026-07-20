// Onthul! — Xonix-achtig: onder het donkere veld zit een plaatje verstopt.
// Beweeg vanaf veilig gebied het veld in om een lijn te trekken; haal je
// veilig de overkant, dan wordt het deel zonder bal onthuld. Raakt een bal je
// lijn: leven kwijt (3 per potje). 75% onthuld = level klaar, met bonus per
// procent extra en een tijdsbonus. Elk level: nieuw plaatje, een bal erbij.
//
// Schermvullend (eigen laag over de pagina), bestuurbaar met pijltjes/WASD of
// een virtuele thumbstick die verschijnt waar je duim ook neerkomt.

const GW = 90, GH = 60;          // rastergrootte (cellen)
const CELL = 10;                 // canvas-pixels per cel (900x600)
const DOEL = 75;                 // percentage om het level te halen
const OPEN = 0, VAST = 1, LIJN = 2;

const PLAATJES = [
  { src: 'assets/onthul/01-bergmeer.jpg', titel: 'Bergmeer bij zonsondergang' },
  { src: 'assets/onthul/02-noorderlicht.jpg', titel: 'Noorderlicht boven het bos' },
  { src: 'assets/onthul/03-strand.jpg', titel: 'Tropisch strand' },
  { src: 'assets/onthul/04-vlinder.jpg', titel: 'Vlinder in het bloemenveld' },
  { src: 'assets/onthul/05-onderwater.jpg', titel: 'Onderwaterwereld' },
  { src: 'assets/onthul/06-vos.jpg', titel: 'Vos in het herfstbos' },
];

export function init(root, ctx) {
  // ---------- fullscreen-laag ----------
  root.innerHTML = '';
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const fs = document.createElement('div');
  fs.className = 'ot-fs';
  fs.innerHTML = `
    <div class="ot-top">
      <button id="ot-back" class="ot-btn" aria-label="Terug naar menu">← Terug</button>
      <span class="ot-stat">Score <b id="ot-score">0</b></span>
      <span class="ot-stat">Level <b id="ot-level">1</b></span>
      <span class="ot-stat"><span class="ot-doel">Levens </span><b id="ot-lives">♥♥♥</b></span>
      <span class="ot-stat ot-pct"><b id="ot-pct">0%</b><span class="ot-doel"> / ${DOEL}%</span></span>
      <span class="ot-actions">
        ${ctx.testMode ? '<button id="ot-skip" class="ot-btn ot-test" title="Testtool: vul aan tot de leveldrempel">🧪 75%</button>' : ''}
        <button id="ot-mute" class="ot-btn" aria-label="Geluid aan of uit">🔊</button>
        <button id="ot-pause" class="ot-btn" aria-label="Pauze" title="Pauze (P)">⏸</button>
        <button id="ot-help-btn" class="ot-btn" aria-label="Uitleg">❔</button>
      </span>
    </div>
    <div class="ot-area" id="ot-area">
      <canvas id="ot-canvas" width="${GW * CELL}" height="${GH * CELL}" aria-label="Speelveld"></canvas>
      <div id="ot-overlay" class="ot-overlay"></div>
    </div>
    <div class="ot-stick-basis" hidden></div>
    <div class="ot-stick-knop" hidden></div>
    <dialog id="ot-help" class="ot-help">
      <h2>Zo speel je Onthul!</h2>
      <ul class="ot-help-list">
        <li>Onder het donkere veld zit een <b>plaatje verstopt</b>. Jij bent het roze blokje op de rand.</li>
        <li>Beweeg het veld in om een <b>lijn</b> te trekken; haal je veilig de overkant, dan wordt het stuk <b>zonder bal</b> onthuld.</li>
        <li>Raakt een bal je lijn (of jou) terwijl je tekent: <b>leven kwijt</b> — je hebt er 3.</li>
        <li>Onthul <b>${DOEL}%</b> voor het volgende level: elke % extra en snel spelen leveren <b>bonuspunten</b> op. Elk level komt er een bal bij!</li>
        <li><b>Besturing:</b> zet je duim waar dan ook neer en sleep (virtuele joystick), of houd pijltjes/WASD ingedrukt — loslaten = stoppen. P = pauze.</li>
      </ul>
      <form method="dialog"><button class="ot-btn primary">Sluiten</button></form>
    </dialog>`;
  document.body.appendChild(fs);

  const canvas = fs.querySelector('#ot-canvas');
  const g = canvas.getContext('2d');
  const area = fs.querySelector('#ot-area');
  const overlay = fs.querySelector('#ot-overlay');
  const hScore = fs.querySelector('#ot-score');
  const hLevel = fs.querySelector('#ot-level');
  const hLives = fs.querySelector('#ot-lives');
  const hPct = fs.querySelector('#ot-pct');
  const pauseBtn = fs.querySelector('#ot-pause');
  const muteBtn = fs.querySelector('#ot-mute');
  const stickBasis = fs.querySelector('.ot-stick-basis');
  const stickKnop = fs.querySelector('.ot-stick-knop');

  // ---------- geluid (WebAudio, geen bestanden) ----------
  let actx = null, muted = false;
  function ensureAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function toon(freq, dur, type, vol, slideTo, at) {
    if (muted || !actx) return;
    const t = actx.currentTime + (at || 0);
    const o = actx.createOscillator(), gn = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + dur);
  }
  const sPak = () => { toon(420, 0.1, 'triangle', 0.14, 640); toon(640, 0.12, 'triangle', 0.12, 900, 0.07); };
  const sAu = () => { toon(220, 0.25, 'sawtooth', 0.16, 70); };
  const sLevel = () => { toon(520, 0.12, 'square', 0.1, 660); toon(660, 0.12, 'square', 0.1, 880, 0.1); toon(880, 0.2, 'square', 0.1, 1100, 0.2); };
  const sStap = () => { toon(900, 0.03, 'square', 0.02, 700); };

  // ---------- spelstatus ----------
  const grid = new Uint8Array(GW * GH);
  let ballen = [];                 // {x, y, vx, vy} in celcoördinaten (floats)
  let speler = { x: 0, y: 0 };     // celpositie
  let richting = null, gewenst = null;
  let lijnCellen = [];
  let score = 0, level = 1, levens = 3, pct = 0;
  let status = 'spel';             // spel | tussen | dood | over | pauze
  let levelStart = 0, stapT = 0;
  let flits = 0, schud = 0;
  let beeld = null, beeldKlaar = false;
  let raf = 0, vorige = 0;

  const idx = (x, y) => y * GW + x;
  const binnen = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH;
  const totaalInterieur = (GW - 2) * (GH - 2);

  function laadBeeld(n) {
    beeldKlaar = false;
    const img = new Image();
    img.src = PLAATJES[(n - 1) % PLAATJES.length].src;
    img.onload = () => { beeld = img; beeldKlaar = true; };
    img.onerror = () => { beeld = null; beeldKlaar = true; }; // valt terug op kleurvlak
  }

  function nieuwLevel(n) {
    grid.fill(OPEN);
    for (let x = 0; x < GW; x++) { grid[idx(x, 0)] = VAST; grid[idx(x, GH - 1)] = VAST; }
    for (let y = 0; y < GH; y++) { grid[idx(0, y)] = VAST; grid[idx(GW - 1, y)] = VAST; }
    lijnCellen = [];
    speler = { x: Math.floor(GW / 2), y: GH - 1 };
    richting = null; gewenst = null; stapT = 0;
    pct = 0;

    // Ballen: level 1 -> 1 bal, elk level een erbij (max 6), en iets sneller.
    const aantal = Math.min(6, n);
    const snelheid = 13 + (n - 1) * 1.6;
    ballen = [];
    for (let i = 0; i < aantal; i++) {
      const a = (Math.PI / 4) + (Math.PI / 2) * (i % 4) + (Math.random() - 0.5) * 0.5;
      ballen.push({
        x: GW * (0.3 + 0.4 * Math.random()),
        y: GH * (0.25 + 0.4 * Math.random()),
        vx: Math.cos(a) * snelheid,
        vy: Math.sin(a) * snelheid,
      });
    }
    laadBeeld(n);
    levelStart = performance.now();
    hud();
  }

  function hud() {
    hScore.textContent = score;
    hLevel.textContent = level;
    hLives.textContent = levens > 0 ? '♥'.repeat(levens) : '—';
    hPct.textContent = Math.floor(pct) + '%';
  }

  function paneel(html) { overlay.innerHTML = html ? `<div class="ot-paneel">${html}</div>` : ''; }

  function nieuwSpel() {
    score = 0; level = 1; levens = 3;
    nieuwLevel(1);
    status = 'spel';
    paneel('');
    pauseBtn.textContent = '⏸';
    hud();
  }

  function levelKlaar() {
    status = 'tussen';
    const secs = (performance.now() - levelStart) / 1000;
    const extra = Math.max(0, Math.round(pct - DOEL));
    const bonusPct = extra * 40;
    const bonusTijd = Math.max(0, Math.round(240 - secs) * 2);
    score += bonusPct + bonusTijd;
    hud();
    sLevel();
    // Het hele plaatje even laten zien als beloning.
    grid.fill(VAST); lijnCellen = [];
    const t = PLAATJES[(level - 1) % PLAATJES.length].titel;
    paneel(`<h1>✨ Level ${level} klaar!</h1>
      <p class="groot">"${t}" — <b>${Math.floor(pct)}%</b> onthuld</p>
      <p>Bonus: +${bonusPct} (extra %) &nbsp;·&nbsp; +${bonusTijd} (snelheid)</p>
      <button id="ot-verder" class="ot-btn primary">Volgende level ▶</button>`);
    overlay.querySelector('#ot-verder').addEventListener('click', () => {
      level += 1;
      nieuwLevel(level);
      status = 'spel';
      paneel('');
    });
  }

  function dood() {
    sAu();
    flits = 0.35; schud = 0.3;
    levens -= 1;
    for (const c of lijnCellen) grid[c] = OPEN;
    lijnCellen = [];
    speler = { x: Math.floor(GW / 2), y: GH - 1 };
    richting = null; gewenst = null;
    if (navigator.vibrate) navigator.vibrate(60);
    hud();
    if (levens <= 0) { gameOver(); return; }
    status = 'dood';
    paneel(`<h1>💥 Au!</h1><p class="groot">De bal raakte je lijn. Nog ${levens} ${levens === 1 ? 'leven' : 'levens'}.</p>
      <button id="ot-door" class="ot-btn primary">Verder ▶</button>`);
    overlay.querySelector('#ot-door').addEventListener('click', () => { status = 'spel'; paneel(''); });
  }

  function gameOver() {
    status = 'over';
    const result = score > 0 ? ctx.submitScore(score) : null;
    paneel(`<h1>Game over</h1>
      <p class="groot">Score: <b>${score}</b> · level ${level}${result?.isRecord ? ' — 🥇 nieuw record!' : result?.rank ? ` — plek ${result.rank} in de top 10` : ''}</p>
      <button id="ot-again" class="ot-btn primary">Nog een keer</button>`);
    overlay.querySelector('#ot-again').addEventListener('click', nieuwSpel);
  }

  // ---------- veroveren ----------
  function verover() {
    // Vloedvulling vanaf elke bal door open cellen; wat geen bal bereikt, wordt vast.
    const bereikt = new Uint8Array(GW * GH);
    const stapel = [];
    for (const b of ballen) {
      const bx = Math.floor(b.x), by = Math.floor(b.y);
      if (binnen(bx, by) && grid[idx(bx, by)] === OPEN && !bereikt[idx(bx, by)]) {
        bereikt[idx(bx, by)] = 1; stapel.push(bx, by);
      }
    }
    while (stapel.length) {
      const y = stapel.pop(), x = stapel.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (binnen(nx, ny) && grid[idx(nx, ny)] === OPEN && !bereikt[idx(nx, ny)]) {
          bereikt[idx(nx, ny)] = 1; stapel.push(nx, ny);
        }
      }
    }
    let gepakt = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === LIJN || (grid[i] === OPEN && !bereikt[i])) { grid[i] = VAST; gepakt++; }
    }
    lijnCellen = [];
    if (gepakt > 0) {
      score += gepakt;
      sPak();
      herbereken();
      hud();
      if (pct >= DOEL) levelKlaar();
    }
  }

  function herbereken() {
    let vast = 0;
    for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) if (grid[idx(x, y)] === VAST) vast++;
    pct = (vast / totaalInterieur) * 100;
  }

  // ---------- update ----------
  const DXY = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function stapSpeler() {
    richting = gewenst;                // loslaten = stoppen (gewenst is dan null)
    if (!richting) return;
    const [dx, dy] = DXY[richting];
    const nx = speler.x + dx, ny = speler.y + dy;
    if (!binnen(nx, ny)) { richting = null; return; }
    const cel = grid[idx(nx, ny)];
    if (cel === LIJN) { dood(); return; }        // eigen lijn raken = af
    speler.x = nx; speler.y = ny;
    if (cel === OPEN) {
      grid[idx(nx, ny)] = LIJN;
      lijnCellen.push(idx(nx, ny));
      sStap();
    } else if (cel === VAST && lijnCellen.length) {
      verover();                                  // lijn afgemaakt: gebied pakken
    }
  }

  function update(dt) {
    if (flits > 0) flits -= dt;
    if (schud > 0) schud -= dt;
    if (status !== 'spel') return;

    // speler stapt op vast tempo over het raster
    const tempo = 24; // cellen per seconde
    stapT += dt * tempo;
    while (stapT >= 1) { stapT -= 1; stapSpeler(); if (status !== 'spel') return; }

    // ballen bewegen en stuiteren tegen vaste cellen; lijn raken = dood
    for (const b of ballen) {
      let nx = b.x + b.vx * dt;
      if (grid[idx(Math.floor(nx), Math.floor(b.y))] === VAST) { b.vx = -b.vx; nx = b.x; }
      let ny = b.y + b.vy * dt;
      if (grid[idx(Math.floor(nx), Math.floor(ny))] === VAST) { b.vy = -b.vy; ny = b.y; }
      b.x = nx; b.y = ny;
      const celV = grid[idx(Math.floor(b.x), Math.floor(b.y))];
      if (celV === LIJN) { dood(); return; }
      if (Math.floor(b.x) === speler.x && Math.floor(b.y) === speler.y) { dood(); return; }
    }
  }

  // ---------- tekenen ----------
  function draw() {
    g.save();
    if (schud > 0) g.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);

    // Basis: het plaatje (of een kleurverloop als het niet laadde).
    if (beeld && beeldKlaar) {
      g.drawImage(beeld, 0, 0, GW * CELL, GH * CELL);
    } else {
      const gr = g.createLinearGradient(0, 0, 0, GH * CELL);
      gr.addColorStop(0, '#2a6fdb'); gr.addColorStop(1, '#7db8e8');
      g.fillStyle = gr; g.fillRect(0, 0, GW * CELL, GH * CELL);
    }

    // Bedekking: open cellen donker, lijncellen geel.
    g.fillStyle = '#10142a';
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        if (grid[idx(x, y)] === OPEN) g.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
    // subtiel raster op het bedekte deel
    g.fillStyle = 'rgba(70,90,160,0.12)';
    for (let y = 0; y < GH; y += 2) for (let x = (y / 2) % 2; x < GW; x += 2) {
      if (grid[idx(x, y)] === OPEN) g.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
    // lijn
    g.fillStyle = '#ffd23d';
    g.shadowColor = '#ffd23d'; g.shadowBlur = 8;
    for (const c of lijnCellen) {
      const x = c % GW, y = (c - x) / GW;
      g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    }
    g.shadowBlur = 0;

    // randje tussen onthuld en bedekt voor leesbaarheid
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 1;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (grid[idx(x, y)] !== OPEN) continue;
      const px = x * CELL, py = y * CELL;
      if (binnen(x + 1, y) && grid[idx(x + 1, y)] === VAST) { g.beginPath(); g.moveTo(px + CELL, py); g.lineTo(px + CELL, py + CELL); g.stroke(); }
      if (x > 0 && grid[idx(x - 1, y)] === VAST) { g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + CELL); g.stroke(); }
      if (binnen(x, y + 1) && grid[idx(x, y + 1)] === VAST) { g.beginPath(); g.moveTo(px, py + CELL); g.lineTo(px + CELL, py + CELL); g.stroke(); }
      if (y > 0 && grid[idx(x, y - 1)] === VAST) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + CELL, py); g.stroke(); }
    }

    // ballen (niet op het level-klaar/game-over-scherm — daar geniet je van het plaatje)
    for (const b of (status === 'tussen' || status === 'over' ? [] : ballen)) {
      const bx = b.x * CELL, by = b.y * CELL;
      g.shadowColor = '#9fd4ff'; g.shadowBlur = 14;
      g.fillStyle = '#eaf6ff';
      g.beginPath(); g.arc(bx, by, CELL * 0.62, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#7fb8e8';
      g.beginPath(); g.arc(bx + CELL * 0.14, by + CELL * 0.14, CELL * 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(bx - CELL * 0.18, by - CELL * 0.18, CELL * 0.16, 0, Math.PI * 2); g.fill();
    }

    // speler
    if (status !== 'tussen' && status !== 'over') {
      const px = speler.x * CELL, py = speler.y * CELL;
      g.shadowColor = '#ff5b8d'; g.shadowBlur = 12;
      g.fillStyle = '#ff5b8d';
      g.fillRect(px - 1, py - 1, CELL + 2, CELL + 2);
      g.shadowBlur = 0;
      g.fillStyle = '#ffffff';
      g.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
    }

    if (flits > 0) { g.fillStyle = `rgba(255,70,70,${Math.min(0.45, flits * 1.4)})`; g.fillRect(0, 0, GW * CELL, GH * CELL); }
    g.restore();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = vorige ? Math.min((t - vorige) / 1000, 0.05) : 0.016;
    vorige = t;
    update(dt);
    draw();
  }

  // ---------- invoer ----------
  // Houd ingedrukt om te bewegen; loslaten = stoppen. Meerdere toetsen tegelijk:
  // de laatst ingedrukte wint, bij loslaten val je terug op wat nog vast zit.
  const ingedrukt = [];
  function drukt(r) {
    const i = ingedrukt.indexOf(r);
    if (i >= 0) ingedrukt.splice(i, 1);
    ingedrukt.push(r);
    gewenst = r;
  }
  function laat(r) {
    const i = ingedrukt.indexOf(r);
    if (i >= 0) ingedrukt.splice(i, 1);
    gewenst = ingedrukt.length ? ingedrukt[ingedrukt.length - 1] : null;
  }

  const TOETS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  function onKeyDown(e) {
    ensureAudio();
    if (e.key === 'p' || e.key === 'P') { wisselPauze(); return; }
    const r = TOETS[e.key];
    if (r) { if (!e.repeat) drukt(r); e.preventDefault(); }
  }
  function onKeyUp(e) {
    const r = TOETS[e.key];
    if (r) laat(r);
  }
  function onBlur() { ingedrukt.length = 0; gewenst = null; }

  // Virtuele thumbstick, overal op de laag: waar je duim neerkomt is het
  // middelpunt; slepen = richting, dode zone = stilstaan, loslaten = stoppen.
  const STICK_DODE = 14, STICK_MAX = 48;
  let stick = null;      // {id, cx, cy, x, y, richting}

  function stickTeken() {
    if (!stick) { stickBasis.hidden = true; stickKnop.hidden = true; return; }
    let dx = stick.x - stick.cx, dy = stick.y - stick.cy;
    const len = Math.hypot(dx, dy);
    if (len > STICK_MAX) { dx = (dx / len) * STICK_MAX; dy = (dy / len) * STICK_MAX; }
    stickBasis.hidden = false; stickKnop.hidden = false;
    stickBasis.style.left = stick.cx + 'px'; stickBasis.style.top = stick.cy + 'px';
    stickKnop.style.left = (stick.cx + dx) + 'px'; stickKnop.style.top = (stick.cy + dy) + 'px';
  }
  function onPointerDown(e) {
    // alleen binnen deze game-laag, en niet bovenop knoppen of panelen
    if (!fs.contains(e.target) || e.target.closest('button, .ot-paneel, .ot-top, dialog')) return;
    ensureAudio();
    if (stick) return;   // één vinger tegelijk bestuurt de stick
    stick = { id: e.pointerId, cx: e.clientX, cy: e.clientY, x: e.clientX, y: e.clientY, richting: null };
    stickTeken();
  }
  function onPointerMove(e) {
    if (!stick || e.pointerId !== stick.id) return;
    stick.x = e.clientX; stick.y = e.clientY;
    const dx = stick.x - stick.cx, dy = stick.y - stick.cy;
    const r = Math.hypot(dx, dy) < STICK_DODE ? null
      : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (r !== stick.richting) {
      if (stick.richting) laat(stick.richting);
      if (r) drukt(r);
      stick.richting = r;
    }
    stickTeken();
  }
  function onPointerUp(e) {
    if (!stick || (e && e.pointerId !== stick.id)) return;
    if (stick.richting) laat(stick.richting);
    stick = null;
    stickTeken();
  }

  function wisselPauze() {
    if (status === 'spel') {
      status = 'pauze';
      pauseBtn.textContent = '▶';
      paneel(`<h1>⏸️ Pauze</h1>
        <button id="ot-hervat" class="ot-btn primary">Verder spelen</button>
        <button id="ot-nieuw" class="ot-btn">Nieuw spel</button>`);
      overlay.querySelector('#ot-hervat').addEventListener('click', wisselPauze);
      overlay.querySelector('#ot-nieuw').addEventListener('click', nieuwSpel);
    } else if (status === 'pauze') {
      status = 'spel';
      pauseBtn.textContent = '⏸';
      paneel('');
    }
  }
  function onVisibility() { if (document.hidden && status === 'spel') wisselPauze(); }

  // ---------- knoppen ----------
  pauseBtn.addEventListener('click', wisselPauze);
  muteBtn.addEventListener('click', () => { muted = !muted; muteBtn.textContent = muted ? '🔇' : '🔊'; ensureAudio(); });
  function onBack() {
    if (score > 0 && status !== 'over') ctx.submitScore(score);
    location.hash = '#/';
  }
  fs.querySelector('#ot-back').addEventListener('click', onBack);
  const helpDlg = fs.querySelector('#ot-help');
  fs.querySelector('#ot-help-btn').addEventListener('click', () => {
    if (status === 'spel') wisselPauze();
    if (helpDlg.showModal) helpDlg.showModal();
  });

  // Testtool (alleen in testmodus): vul het veld aan tot net boven de drempel,
  // zodat je de level-overgang en bonussen direct kunt testen.
  const skipBtn = fs.querySelector('#ot-skip');
  if (skipBtn) skipBtn.addEventListener('click', () => {
    if (status !== 'spel') return;
    const doelCellen = Math.ceil(totaalInterieur * (DOEL + 1) / 100);
    let vast = 0;
    for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) if (grid[idx(x, y)] === VAST) vast++;
    buiten:
    for (let y = 1; y < GH - 1 && vast < doelCellen; y++) {
      for (let x = 1; x < GW - 1; x++) {
        const i = idx(x, y);
        if (grid[i] === OPEN) {
          grid[i] = VAST;
          if (++vast >= doelCellen) break buiten;
        }
      }
    }
    // ballen die nu in vast gebied staan naar open ruimte verplaatsen is niet
    // nodig: dit is een testpad, de levelovergang volgt direct.
    herbereken();
    hud();
    levelKlaar();
  });

  // ---------- layout ----------
  function layout() {
    const aw = area.clientWidth - 8, ah = area.clientHeight - 8;
    if (aw <= 0 || ah <= 0) return;
    const s = Math.min(aw / (GW * CELL), ah / (GH * CELL));
    canvas.style.width = Math.floor(GW * CELL * s) + 'px';
    canvas.style.height = Math.floor(GH * CELL * s) + 'px';
  }
  const ro = new ResizeObserver(layout);
  ro.observe(area);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('visibilitychange', onVisibility);

  // Testhaakje (alleen in testmodus): status uitlezen en deterministische
  // situaties opzetten voor geautomatiseerde tests.
  if (ctx.testMode) {
    window.__onthul = {
      get status() { return status; },
      get pct() { return pct; },
      get score() { return score; },
      get levens() { return levens; },
      get level() { return level; },
      get speler() { return { ...speler }; },
      get ballen() { return ballen.map((b) => ({ ...b })); },
      zetBal(i, x, y, vx, vy) { Object.assign(ballen[i], { x, y, vx, vy }); },
      zetRichting(r) { drukt(r); },
      losRichting(r) { laat(r); },
    };
  }

  nieuwSpel();
  layout();
  requestAnimationFrame(layout);
  setTimeout(layout, 200);
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    document.removeEventListener('visibilitychange', onVisibility);
    ro.disconnect();
    if (window.__onthul) delete window.__onthul;
    if (actx) { try { actx.close(); } catch (e) { /* al gesloten */ } }
    document.body.style.overflow = prevOverflow;
    fs.remove();
  };
}
