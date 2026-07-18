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
  { name: 'BMW M4',           col: '#f6f6f4', accent: '#0d0d11', stripe: null,      wing: 'big',   shape: 'coupe',   eng: 'i6', grille: 'kidney', quad: true, realistic: true, wheelCol: '#2b2d34', headlight: '#f4d01c', hoodVents: true, splitter: true },
  { name: 'Mercedes GT 63',   col: '#5cbf22', accent: '#141418', stripe: null,      wing: 'small', shape: 'coupe',   eng: 'v8', grille: 'amg', realistic: true, carbonHood: true, wheelCol: '#26282e', caliper: '#f2c40f', accentLine: '#f2c40f', splitter: true, sideStripe: true },
  { name: 'Ferrari Pista',    col: '#22c1e8', accent: '#111114', stripe: null,      wing: 'big',   shape: 'super',   eng: 'v8', realistic: true, carbonHood: true, splitter: true, sideStripe: true, sideScoops: true, wheelCol: '#26282e', caliper: '#e8d21a', dualExhaust: true },
  { name: 'Lamborghini SVJ',  col: '#1b8fe2', accent: '#101014', stripe: null,      wing: 'big',   shape: 'hyper',   eng: 'v12', realistic: true, carbonHood: 'full', splitter: true, sideScoops: true, wheelCol: '#26282e', caliper: '#2aa0e8', dualExhaust: true },
  { name: 'Porsche 911',      col: '#e9ecf0', accent: '#15151a', stripe: null,      wing: 'mid',   shape: 'classic', eng: 'flat6' },
  { name: 'Mustang',          col: '#1f57c8', accent: '#15151a', stripe: '#ffffff', wing: 'small', shape: 'muscle',  eng: 'v8' },
  { name: 'Audi R8',          col: '#9aa1a8', accent: '#15151a', stripe: null,      wing: 'small', shape: 'super',   eng: 'v10' },
  { name: 'Pagani',           col: '#c9b06a', accent: '#2a2320', stripe: null,      wing: 'mid',   shape: 'super',   eng: 'v12' },
  { name: 'Mazda RX500',      col: '#dfe4ea', accent: '#15151a', stripe: null,      wing: 'none',  shape: 'wedge',   eng: 'rotary' },
  { name: 'Koenigsegg Jesko', col: '#ff7a1a', accent: '#15151a', stripe: null,      wing: 'big',   shape: 'hyper',   eng: 'v8' },
];
const SHAPES = {
  super:   { wF: 1.0,  lF: 0.98, r: 0.26, cabF: 0.34 },
  hyper:   { wF: 1.0,  lF: 1.0,  r: 0.16, cabF: 0.30 },
  coupe:   { wF: 0.9,  lF: 0.98, r: 0.34, cabF: 0.42 },
  muscle:  { wF: 0.98, lF: 1.0,  r: 0.16, cabF: 0.44 },
  classic: { wF: 0.9,  lF: 0.92, r: 0.46, cabF: 0.42 },
  wedge:   { wF: 0.94, lF: 1.0,  r: 0.12, cabF: 0.32 },
};
// Motorprofielen: base/rev = ontstekingsfrequentie (Hz) van stationair tot rood;
// rumble = sub-octaaf (V8-lope), bright = felheid/formant, vol = volume.
const ENGINES = {
  v8:     { base: 75,  rev: 560,  rumble: 0.55, bright: 1.0,  vol: 0.08 },
  i6:     { base: 88,  rev: 720,  rumble: 0.14, bright: 1.12, vol: 0.075 },
  v10:    { base: 85,  rev: 680,  rumble: 0.28, bright: 1.15, vol: 0.075 },
  v12:    { base: 100, rev: 900,  rumble: 0.05, bright: 1.35, vol: 0.065 },
  w12:    { base: 90,  rev: 760,  rumble: 0.18, bright: 1.1,  vol: 0.07 },
  flat6:  { base: 95,  rev: 720,  rumble: 0.22, bright: 1.12, vol: 0.075 },
  rotary: { base: 120, rev: 1000, rumble: 0.05, bright: 1.5,  vol: 0.06 },
};
const ENG_LABEL = { v8: 'V8', i6: '6-in-lijn', v10: 'V10', v12: 'V12', w12: 'W12', flat6: 'Flat-6', rotary: 'Rotary' };
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
  let actx = null, muted = false, engine = null, engRev = 0;
  function ensureAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    startEngine();
  }
  // Zachte vervormingscurve (tanh) voor wat motor-"grit".
  function gritCurve(k) {
    const n = 256, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k); }
    return c;
  }
  // Race-motor-synth. De "toon" is de ontstekingsfrequentie (hoog en gierend bij
  // hoge toeren), door een resonant uitlaat-filter. Per motortype: sub-octaaf
  // (V8-lope), felheid (V12-wail) en volume verschillen.
  function startEngine() {
    if (!actx || engine) return;
    const master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
    // resonant "uitlaat"-formant: geeft de brul/gier
    const form = actx.createBiquadFilter(); form.type = 'lowpass'; form.frequency.value = 900; form.Q.value = 3.5;
    form.connect(master);
    // grit/vervorming voor motor-textuur
    const shaper = actx.createWaveShaper(); shaper.curve = gritCurve(3.2); shaper.oversample = '4x';
    shaper.connect(form);
    // amplitude-throb (lope) — sterk bij V8, bijna nul bij V12
    const throb = actx.createGain(); throb.gain.value = 1; throb.connect(shaper);
    const lfo = actx.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = 10;
    const lfoAmt = actx.createGain(); lfoAmt.gain.value = 0.2;
    lfo.connect(lfoAmt).connect(throb.gain);
    // oscillatoren: grondtoon (ontsteking) + octaaf lager (V8-gewicht) + hoger (wail)
    const oscMain = actx.createOscillator(); oscMain.type = 'sawtooth';
    const oscSub = actx.createOscillator(); oscSub.type = 'sawtooth';
    const oscHi = actx.createOscillator(); oscHi.type = 'sawtooth';
    const gMain = actx.createGain(); gMain.gain.value = 0.5;
    const gSub = actx.createGain(); gSub.gain.value = 0.4;
    const gHi = actx.createGain(); gHi.gain.value = 0.12;
    oscMain.connect(gMain).connect(throb);
    oscSub.connect(gSub).connect(throb);
    oscHi.connect(gHi).connect(throb);
    // uitlaat-ruis, gefilterd rond de ontstekingsfrequentie
    const nb = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = actx.createBufferSource(); noise.buffer = nb; noise.loop = true;
    const nBp = actx.createBiquadFilter(); nBp.type = 'bandpass'; nBp.frequency.value = 600; nBp.Q.value = 0.9;
    const nGain = actx.createGain(); nGain.gain.value = 0.25;
    noise.connect(nBp).connect(nGain).connect(throb);
    try { oscMain.start(); oscSub.start(); oscHi.start(); lfo.start(); noise.start(); } catch (e) { /* al gestart */ }
    engine = { master, form, lfo, lfoAmt, oscMain, oscSub, oscHi, gSub, gHi, nBp, nGain, nodes: [oscMain, oscSub, oscHi, lfo, noise] };
  }
  function engineUpdate(dt) {
    if (!engine || !actx) return;
    const t = actx.currentTime;
    if (!(dt > 0) || dt > 0.1) dt = 0.016;
    const prof = ENGINES[carEngine] || ENGINES.v8;
    const on = state === 'playing';
    const boost = (turboOn && turbo > 0) ? 1 : 0;

    // Toeren via een simpele automaat: RPM loopt op binnen een versnelling en
    // "schakelt" terug bij hogere snelheid, zodat de toon in een muzikale band
    // blijft i.p.v. eindeloos omhoog te pitchen. Basissnelheid (zonder de
    // turbo-×1.7) is vloeiend, dus de gearbox springt niet bij het gas geven.
    const base = speed / (boost ? 1.7 : 1);            // 0.42..0.97, vloeiend
    const NGEARS = 6;
    const sp = Math.min(1.1, Math.max(0, (base - 0.42) / 0.55));
    const span = 1 / NGEARS;
    const gear = Math.min(NGEARS - 1, Math.floor(sp / span));
    const local = Math.min(1, (sp - gear * span) / span);
    let targetRev = 0.32 + local * 0.60;               // stationair-cruise → rood
    targetRev = Math.min(1.08, targetRev + boost * 0.16); // gas = toeren omhoog (vloeiend)
    if (!on) targetRev = 0.16;                          // stationair in menu/pauze
    // Vloeiend naar de doeltoeren: snel terug bij schakelen, geleidelijk omhoog
    // bij optrekken — geen harde pitch-sprong meer bij de turbo.
    const half = targetRev < engRev ? 0.10 : 0.30;
    engRev += (targetRev - engRev) * (1 - Math.pow(0.5, dt / half));

    // Ontstekingsfrequentie = de toon, nu netjes begrensd; begrenzer-flutter
    // net onder rood met gas erop.
    let f = prof.base + engRev * prof.rev;
    if (boost && engRev > 0.98) f *= 1 + Math.sin(t * 78) * 0.012;

    const load = boost; // "throttle": harder werken hoor je als volume + felheid
    const vol = (muted || !on) ? 0 : prof.vol * (0.6 + engRev * 0.42 + load * 0.22);
    engine.master.gain.setTargetAtTime(vol, t, 0.09);
    engine.oscMain.frequency.setTargetAtTime(f, t, 0.05);
    engine.oscSub.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    engine.oscHi.frequency.setTargetAtTime(f * 2, t, 0.05);
    engine.gSub.gain.setTargetAtTime(prof.rumble, t, 0.12);           // V8-lope vs. gladde V12
    engine.gHi.gain.setTargetAtTime(0.06 + prof.bright * 0.10 + engRev * 0.05 + load * 0.12, t, 0.1);
    engine.lfoAmt.gain.setTargetAtTime(0.08 + prof.rumble * 0.35, t, 0.1);
    engine.lfo.frequency.setTargetAtTime(Math.min(30, Math.max(6, f * 0.11)), t, 0.1);
    // Uitlaat-formant opent flink onder gas → het "opendraaien" van de motor
    // i.p.v. simpelweg een hogere toon.
    const bright = Math.min(7000, f * (2.2 * prof.bright) + 300 + load * 2200 + engRev * 400);
    engine.form.frequency.setTargetAtTime(bright, t, 0.07);
    // Inductie/uitlaatruis werkt hoorbaar harder onder gas.
    engine.nGain.gain.setTargetAtTime(0.12 + engRev * 0.14 + load * 0.16, t, 0.09);
    engine.nBp.frequency.setTargetAtTime(f * 2, t, 0.07);
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
  // "ponk": een korte holle pop van de uitlaat (backfire)
  const sBackfire = (p) => { p = p || 1; tone(155, 0.15, 'triangle', 0.15 * p, 62); noiseBurst(0.13, 0.13 * p); };

  // Backfire: ponk + een vuurflits uit de twee uitlaten achter de auto.
  function spawnBackfire(power) {
    power = power || 1;
    sBackfire(power);
    const ry = 0.82 + (S.carH * 0.5) / H + 0.004;   // achterkant van de auto
    const dx = (S.carW * 0.18) / W;                  // afstand tot de twee uitlaten
    for (const side of [-1, 1]) {
      const ox = player.x + side * dx;
      const n = 5 + Math.floor(power * 5);
      for (let k = 0; k < n; k++) {
        flames.push({
          x: ox + (Math.random() - 0.5) * 0.008,
          y: ry + Math.random() * 0.008,
          vx: (Math.random() - 0.5) * 0.18,
          vy: 0.55 + Math.random() * 0.8,            // naar achteren (omlaag op het scherm)
          r: (0.5 + Math.random() * 0.7) * power,
          life: 1,
          max: 0.16 + Math.random() * 0.16,
        });
      }
    }
    shake = Math.max(shake, 0.12 * power);
  }

  // ---------- spelstatus ----------
  let player = { x: 0.5 };
  let enemies = [], coins = [], scenery = [], marks = [], particles = [], flames = [];
  let scroll = 0, speed = 0.42, dist = 0, lives = 3;
  let spawnCd = 1, coinCd = 2, turbo = 1, invuln = 0, shake = 0, flashT = 0;
  let state = 'select';
  let carColor = CARS[0].col, carEngine = CARS[0].eng, selected = 0, sel = null;
  let moveDir = 0, turboOn = false, dragging = false, dragX = 0;
  let engGear = -1, wasBoost = false;
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
    enemies = []; coins = []; particles = []; flames = [];
    engGear = -1; wasBoost = false;
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
      drawSuperCar(g2, 40, 48, 42, 68, car, -1);
      const nm = document.createElement('span'); nm.textContent = car.name;
      const eg = document.createElement('small'); eg.className = 'race-car-eng'; eg.textContent = ENG_LABEL[car.eng] || car.eng;
      card.appendChild(cv); card.appendChild(nm); card.appendChild(eg);
      card.addEventListener('click', () => selectCar(i));
      wrap.appendChild(card);
    });
    sel.querySelector('#rc-start').addEventListener('click', () => { ensureAudio(); startRace(); });
  }
  function selectCar(i) {
    selected = i; carColor = CARS[i].col; carEngine = CARS[i].eng;
    sel.querySelectorAll('.race-car').forEach((el, k) => el.classList.toggle('sel', k === i));
  }
  function goToSelect() {
    state = 'select';
    overlay.hidden = true;
    pauseBtn.textContent = 'Pauze';
    if (sel) sel.style.display = 'flex';
  }
  function startRace() {
    carColor = CARS[selected].col; carEngine = CARS[selected].eng;
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
    for (const fl of flames) { fl.x += fl.vx * dt; fl.y += fl.vy * dt; fl.vy *= 0.96; fl.life -= dt / fl.max; }
    flames = flames.filter((fl) => fl.life > 0);
    if (shake > 0) shake -= dt;
    if (flashT > 0) flashT -= dt;
    engineUpdate(dt);

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

    // Schakelen (versnelling omhoog) → backfire; ook bij het loslaten van de
    // turbo (overrun) ponkt de uitlaat met vuur.
    const gbBase = speed / (boosting ? 1.7 : 1);
    const gbGear = Math.min(5, Math.floor(Math.min(1.1, Math.max(0, (gbBase - 0.42) / 0.55)) * 6));
    if (engGear >= 0 && gbGear > engGear) spawnBackfire(1);
    if (wasBoost && !boosting) spawnBackfire(0.85);
    engGear = gbGear; wasBoost = boosting;

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

  // Echte supercar van bovenaf (voor de spelerauto + keuzescherm). Elke auto
  // krijgt zijn eigen silhouet (SHAPES), kleur, evt. streep, spiegels en
  // achtervleugel, zodat hij lijkt op de auto waar hij naar vernoemd is.
  // front = -1 (neus naar boven). ly = +1 is de neus, -1 de achterkant.
  function drawSuperCar(gg, cx, cy, w, h, car, front) {
    const S2 = SHAPES[car.shape] || SHAPES.coupe;
    const bw = w * S2.wF, bh = h * S2.lF;
    const px = (lx) => cx + lx * (bw / 2);
    const py = (ly) => cy + front * ly * (bh / 2);
    const noseW = { super: 0.58, hyper: 0.50, wedge: 0.46, coupe: 0.80, muscle: 0.86, classic: 0.78 }[car.shape] ?? 0.7;
    const tailW = { super: 0.92, hyper: 0.96, wedge: 1.0, coupe: 0.92, muscle: 0.98, classic: 0.86 }[car.shape] ?? 0.9;

    // ---- neon-underglow (helemaal onderop) ----
    if (car.underglow) {
      gg.save();
      gg.globalCompositeOperation = 'lighter';
      gg.globalAlpha = 0.5;
      gg.shadowColor = car.underglow; gg.shadowBlur = w * 0.6;
      gg.fillStyle = car.underglow;
      gg.beginPath(); gg.ellipse(cx, cy + h * 0.08, bw * 0.52, bh * 0.58, 0, 0, Math.PI * 2); gg.fill();
      gg.restore();
    }

    // ---- achtervleugel (achter de auto, dus eerst) ----
    if (car.wing && car.wing !== 'none') {
      const big = car.wing === 'big';
      const span = bw * (big ? 1.14 : car.wing === 'mid' ? 0.98 : 0.84);
      const wy0 = py(-0.9), wy1 = py(big ? -1.14 : -1.05);
      const top = Math.min(wy0, wy1), ht = Math.abs(wy1 - wy0);
      // steunen
      gg.fillStyle = 'rgba(0,0,0,0.5)';
      gg.fillRect(cx - span * 0.30, Math.min(py(-0.72), top), span * 0.05, Math.abs(py(-0.72) - top) + ht * 0.3);
      gg.fillRect(cx + span * 0.25, Math.min(py(-0.72), top), span * 0.05, Math.abs(py(-0.72) - top) + ht * 0.3);
      // hoofdvlak
      gg.fillStyle = '#141318';
      rrPath(gg, cx - span / 2, top, span, ht, ht * 0.35); gg.fill();
      gg.fillStyle = car.accent;
      gg.fillRect(cx - span / 2, top, span, Math.max(1, ht * 0.22));
      if (big) {
        // dubbel vlak + eindplaten
        const t2 = front < 0 ? top - ht * 0.9 : top + ht * 0.9;
        gg.fillStyle = '#141318';
        rrPath(gg, cx - span / 2, t2, span, ht * 0.7, ht * 0.3); gg.fill();
        gg.fillStyle = car.accent;
        gg.fillRect(cx - span / 2 - w * 0.03, Math.min(top, t2), w * 0.05, Math.abs(top - t2) + ht);
        gg.fillRect(cx + span / 2 - w * 0.02, Math.min(top, t2), w * 0.05, Math.abs(top - t2) + ht);
      }
    }

    // ---- wielen (met evt. velg + remklauw) ----
    const ww = w * 0.15, wh = h * 0.2, wx = bw / 2 - ww * 0.25;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const wxc = cx + sx * wx, wyc = cy + sy * h * 0.25;
      gg.fillStyle = '#0d0f14';
      rrPath(gg, wxc - ww / 2, wyc - wh / 2, ww, wh, ww * 0.35); gg.fill();
      if (car.wheelCol) { // velg (bv. brons) met naaf
        gg.fillStyle = car.wheelCol;
        rrPath(gg, wxc - ww * 0.28, wyc - wh * 0.34, ww * 0.56, wh * 0.68, ww * 0.26); gg.fill();
        gg.fillStyle = '#0d0f14';
        rrPath(gg, wxc - ww * 0.13, wyc - wh * 0.18, ww * 0.26, wh * 0.36, ww * 0.12); gg.fill();
      }
      if (car.caliper) { // remklauw aan de binnenkant
        gg.fillStyle = car.caliper;
        gg.fillRect(wxc - sx * ww * 0.4 - ww * 0.05, wyc - wh * 0.22, ww * 0.1, wh * 0.44);
      }
    }

    // ---- carrosserie (getaperd silhouet) ----
    const bodyPath = () => {
      gg.beginPath();
      gg.moveTo(px(-noseW), py(0.84));
      gg.quadraticCurveTo(px(0), py(1.02), px(noseW), py(0.84));
      gg.lineTo(px(1.0), py(0.16));
      gg.lineTo(px(tailW), py(-0.86));
      gg.quadraticCurveTo(px(0), py(-1.0), px(-tailW), py(-0.86));
      gg.lineTo(px(-1.0), py(0.16));
      gg.closePath();
    };
    gg.save();
    gg.shadowColor = car.col; gg.shadowBlur = w * 0.22;
    gg.fillStyle = car.col;
    bodyPath(); gg.fill();
    gg.shadowBlur = 0;
    // twee-tone: de achterhelft in een tweede kleur (bv. geel voor, wit achter)
    if (car.col2) {
      gg.save(); bodyPath(); gg.clip();
      const ry0 = py(0.05), ry1 = py(-1.1);
      gg.fillStyle = car.col2;
      gg.fillRect(cx - bw, Math.min(ry0, ry1), bw * 2, Math.abs(ry1 - ry0));
      gg.restore();
    }
    // glansstreep langs de rand
    gg.strokeStyle = 'rgba(255,255,255,0.18)'; gg.lineWidth = Math.max(1, w * 0.03); bodyPath(); gg.stroke();
    gg.restore();

    // ---- realistische lak: rondingen (donkere randen) + reflectie + naden ----
    if (car.realistic) {
      gg.save(); bodyPath(); gg.clip();
      // zijkanten donkerder → ronding van het plaatwerk
      const grd = gg.createLinearGradient(px(-1), 0, px(1), 0);
      grd.addColorStop(0, 'rgba(0,0,0,0.30)');
      grd.addColorStop(0.28, 'rgba(0,0,0,0)');
      grd.addColorStop(0.72, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.24)');
      gg.fillStyle = grd; gg.fillRect(cx - bw, cy - bh, bw * 2, bh * 2);
      // glansreflectie iets links van het midden
      gg.fillStyle = 'rgba(255,255,255,0.16)';
      gg.fillRect(cx - bw * 0.2, cy - bh, bw * 0.09, bh * 2);
      gg.fillStyle = 'rgba(255,255,255,0.08)';
      gg.fillRect(cx + bw * 0.14, cy - bh, bw * 0.05, bh * 2);
      // panelnaden (motorkap, portieren, kofferdeksel)
      gg.strokeStyle = 'rgba(0,0,0,0.26)'; gg.lineWidth = Math.max(0.6, w * 0.012);
      gg.beginPath();
      gg.moveTo(px(-0.5), py(0.52)); gg.lineTo(px(-0.4), py(0.88));
      gg.moveTo(px(0.5), py(0.52)); gg.lineTo(px(0.4), py(0.88));
      gg.moveTo(px(-0.64), py(0.2)); gg.lineTo(px(-0.66), py(-0.42));
      gg.moveTo(px(0.64), py(0.2)); gg.lineTo(px(0.66), py(-0.42));
      gg.moveTo(px(-0.6), py(-0.56)); gg.lineTo(px(0.6), py(-0.56));
      gg.stroke();
      gg.restore();
    }

    // ---- zwarte side-skirts / widebody-rand + voorsplitter + diffuser ----
    if (car.splitter) {
      gg.save(); bodyPath(); gg.clip();
      gg.strokeStyle = '#0b0b0e'; gg.lineWidth = Math.max(2, w * 0.07); bodyPath(); gg.stroke();
      gg.restore();
      gg.fillStyle = '#0b0b0e';
      gg.fillRect(cx - bw * 0.44, py(0.9) - h * 0.008, bw * 0.88, h * 0.02);   // voorsplitter
      gg.fillRect(cx - bw * 0.42, py(-0.86) - h * 0.006, bw * 0.84, h * 0.02); // achterdiffuser
      if (car.accentLine) { // gele lijn op splitter + diffuser (AMG-accent)
        gg.fillStyle = car.accentLine;
        gg.fillRect(cx - bw * 0.4, py(0.9) + h * 0.012, bw * 0.8, h * 0.006);
        gg.fillRect(cx - bw * 0.38, py(-0.86) - h * 0.014, bw * 0.76, h * 0.006);
      }
    }

    // ---- zwarte motorkap-vents (hoekige gleuven, zoals op de foto) ----
    if (car.hoodVents) {
      gg.save(); bodyPath(); gg.clip();
      gg.fillStyle = 'rgba(8,8,11,0.95)';
      const vent = (lx, lyTop, lyBot, wd, skew) => {
        gg.beginPath();
        gg.moveTo(px(lx - wd), py(lyTop)); gg.lineTo(px(lx + wd), py(lyTop));
        gg.lineTo(px(lx + wd + skew), py(lyBot)); gg.lineTo(px(lx - wd + skew), py(lyBot));
        gg.closePath(); gg.fill();
      };
      vent(-0.15, 0.52, 0.28, 0.055, -0.06); // centrale nostrils
      vent(0.15, 0.52, 0.28, 0.055, 0.06);
      vent(-0.36, 0.48, 0.3, 0.04, -0.05);   // zij-gills
      vent(0.36, 0.48, 0.3, 0.04, 0.05);
      gg.restore();
    }

    // ---- zwarte carbon motorkap ('full' = hele voorkant, anders centraal) ----
    if (car.carbonHood) {
      gg.save(); bodyPath(); gg.clip();
      gg.fillStyle = '#191b1f';
      if (car.carbonHood === 'full') {
        // hele voorkant carbon tot aan de voorruit, met pinstripe in autokleur
        const y0 = py(0.14), y1 = py(1.08), top = Math.min(y0, y1), hgt = Math.abs(y1 - y0);
        gg.fillRect(cx - bw, top, bw * 2, hgt);
        gg.strokeStyle = 'rgba(255,255,255,0.05)'; gg.lineWidth = Math.max(0.5, w * 0.008);
        gg.beginPath();
        for (let i = 0; i < 6; i++) { const yy = top + i * hgt / 5; gg.moveTo(cx - bw * 0.7, yy); gg.lineTo(cx + bw * 0.7, yy); }
        gg.stroke();
        gg.fillStyle = car.col;
        gg.fillRect(cx - bw * 0.03, py(0.16), bw * 0.06, py(0.92) - py(0.16));
      } else {
        gg.beginPath();
        gg.moveTo(px(-0.5), py(0.46)); gg.lineTo(px(0.5), py(0.46));
        gg.lineTo(px(0.3), py(0.93)); gg.lineTo(px(-0.3), py(0.93));
        gg.closePath(); gg.fill();
        gg.strokeStyle = 'rgba(255,255,255,0.05)'; gg.lineWidth = Math.max(0.5, w * 0.008);
        gg.beginPath();
        for (let i = 0; i < 5; i++) { const yy = py(0.5) + i * (py(0.9) - py(0.5)) / 4; gg.moveTo(px(-0.42), yy); gg.lineTo(px(0.42), yy); }
        gg.stroke();
        gg.fillStyle = '#0b0c0f';
        for (const sx of [-1, 1]) {
          gg.beginPath();
          gg.moveTo(px(sx * 0.06), py(0.74)); gg.lineTo(px(sx * 0.26), py(0.74));
          gg.lineTo(px(sx * 0.22), py(0.56)); gg.lineTo(px(sx * 0.1), py(0.56));
          gg.closePath(); gg.fill();
        }
      }
      gg.restore();
    }

    // ---- donkere side-stripe met accentlijn (langs de dorpels) ----
    if (car.sideStripe) {
      gg.save(); bodyPath(); gg.clip();
      const y0 = py(0.05), y1 = py(-0.6), top = Math.min(y0, y1), hgt = Math.abs(y1 - y0);
      for (const sx of [-1, 1]) {
        const x = sx < 0 ? px(-1.0) : px(1.0) - bw * 0.16;
        gg.fillStyle = 'rgba(22,22,26,0.9)'; gg.fillRect(x, top, bw * 0.16, hgt);
        if (car.accentLine) { gg.fillStyle = car.accentLine; gg.fillRect(x + (sx < 0 ? bw * 0.16 : -bw * 0.02), top, bw * 0.02, hgt); }
      }
      gg.restore();
    }

    // ---- zwarte zij-luchtinlaten (mid-engine scoops) ----
    if (car.sideScoops) {
      gg.save(); bodyPath(); gg.clip();
      gg.fillStyle = 'rgba(9,9,12,0.95)';
      for (const sx of [-1, 1]) {
        gg.beginPath();
        gg.moveTo(px(sx * 0.62), py(-0.02));
        gg.lineTo(px(sx * 0.92), py(-0.08));
        gg.lineTo(px(sx * 0.84), py(-0.42));
        gg.lineTo(px(sx * 0.6), py(-0.36));
        gg.closePath(); gg.fill();
      }
      gg.restore();
    }

    // ---- racestreep over het midden ----
    if (car.stripe) {
      gg.fillStyle = car.stripe;
      const sw = bw * 0.16;
      gg.fillRect(cx - sw / 2, py(0.84), sw, py(-0.86) - py(0.84));
    }
    // ---- BMW M-tricolor over motorkap en kofferdeksel (cabine dekt het midden) ----
    if (car.mstripes) {
      const cols = ['#2e79c2', '#0e1a52', '#e10600']; // licht blauw, donkerblauw, rood
      const sw = bw * 0.05, gap = sw * 1.2;
      const y0 = py(0.6), y1 = py(-0.82), top = Math.min(y0, y1), hgt = Math.abs(y1 - y0);
      for (let i = 0; i < 3; i++) { gg.fillStyle = cols[i]; gg.fillRect(cx + (i - 1) * gap - sw / 2, top, sw, hgt); }
    }

    // ---- cockpit ----
    if (car.realistic) {
      // Echte greenhouse: donker frame, voorruit, carbon dak en achterruit.
      const zone = (lyA, lyB, wFrac, color, r) => {
        const yTop = Math.min(py(lyA), py(lyB)), hgt = Math.abs(py(lyB) - py(lyA));
        const zw = bw * wFrac;
        gg.fillStyle = color; rrPath(gg, cx - zw / 2, yTop, zw, hgt, zw * (r ?? 0.26)); gg.fill();
      };
      zone(0.56, -0.54, 0.54, 'rgba(8,10,14,0.96)', 0.32); // frame
      zone(0.5, 0.18, 0.44, '#14273a');                    // voorruit (blauwig glas)
      zone(0.16, -0.16, 0.48, '#25272c', 0.22);            // carbon dak
      zone(-0.18, -0.5, 0.42, '#101b26');                  // achterruit
      // reflectie op de voorruit
      gg.fillStyle = 'rgba(150,195,235,0.22)';
      rrPath(gg, cx - bw * 0.17, py(0.48), bw * 0.34, py(0.24) - py(0.48), bw * 0.08); gg.fill();
      // carbon-dak: fijne weave-hint
      gg.strokeStyle = 'rgba(255,255,255,0.05)'; gg.lineWidth = Math.max(0.5, w * 0.008);
      gg.beginPath();
      for (let i = -2; i <= 2; i++) { const yy = cy + i * bh * 0.03; gg.moveTo(cx - bw * 0.22, yy); gg.lineTo(cx + bw * 0.22, yy); }
      gg.stroke();
    } else {
      const cpW = bw * 0.5, cpH = bh * S2.cabF * 1.15;
      const cpCy = cy + front * 0.04 * (bh / 2);
      gg.fillStyle = 'rgba(9,12,20,0.9)';
      rrPath(gg, cx - cpW / 2, cpCy - cpH / 2, cpW, cpH, cpW * 0.42); gg.fill();
      gg.fillStyle = 'rgba(130,180,230,0.28)';
      rrPath(gg, cx - cpW * 0.36, cpCy + front * cpH * 0.12, cpW * 0.72, cpH * 0.28, cpW * 0.2); gg.fill();
    }

    // ---- spiegels (accentkleur) ----
    gg.fillStyle = car.accent;
    const mw = w * 0.1, mh = h * 0.05, my = py(0.34);
    gg.fillRect(px(-1.0) - mw * 0.3, my - mh / 2, mw, mh);
    gg.fillRect(px(1.0) - mw * 0.7, my - mh / 2, mw, mh);

    // ---- koplampen (kleur per auto, met gloed) ----
    const hw = w * 0.15, hh = h * 0.045, hy = py(0.7);
    const hlc = car.headlight || (car.ledlights ? '#eaf6ff' : null);
    if (hlc) { gg.save(); gg.shadowColor = hlc; gg.shadowBlur = w * 0.14; }
    gg.fillStyle = hlc || '#fff7d0';
    rrPath(gg, cx - w * 0.38, hy - hh / 2, hw, hh, hh * 0.5); gg.fill();
    rrPath(gg, cx + w * 0.23, hy - hh / 2, hw, hh, hh * 0.5); gg.fill();
    if (hlc) {
      gg.shadowBlur = 0; gg.fillStyle = 'rgba(255,255,255,0.72)';
      rrPath(gg, cx - w * 0.38, hy - hh * 0.16, hw, hh * 0.32, hh * 0.3); gg.fill();
      rrPath(gg, cx + w * 0.23, hy - hh * 0.16, hw, hh * 0.32, hh * 0.3); gg.fill();
      gg.restore();
    }

    // ---- BMW niervormige grille (twee hoge sleuven, tussen de koplampen) ----
    if (car.grille === 'kidney') {
      const gtop = Math.min(py(0.92), py(0.6)), gh2 = Math.abs(py(0.92) - py(0.6));
      const gw = w * 0.15, gap = w * 0.015;
      for (const sx of [-1, 1]) {
        const gx = cx + sx * (gw / 2 + gap / 2) - gw / 2;
        gg.fillStyle = '#0b0b0d'; rrPath(gg, gx - w * 0.012, gtop - gh2 * 0.03, gw + w * 0.024, gh2 * 1.06, gw * 0.4); gg.fill();
        gg.fillStyle = '#1b1c22'; rrPath(gg, gx, gtop, gw, gh2, gw * 0.35); gg.fill();
        // verticale spijlen
        gg.fillStyle = '#33353c';
        for (let s = 0; s < 4; s++) { gg.fillRect(gx + gw * (0.14 + s * 0.24), gtop + gh2 * 0.12, gw * 0.06, gh2 * 0.76); }
      }
    }

    // ---- AMG-grille (brede grille met verticale spijlen + stervormig badge) ----
    if (car.grille === 'amg') {
      const gtop = Math.min(py(0.92), py(0.56)), gh2 = Math.abs(py(0.92) - py(0.56));
      const gw = w * 0.5;
      gg.fillStyle = '#0b0b0d'; rrPath(gg, cx - gw / 2, gtop, gw, gh2, gw * 0.12); gg.fill();
      gg.fillStyle = '#34363d';
      const n = 9;
      for (let i = 0; i < n; i++) { const sx = cx - gw * 0.42 + i * (gw * 0.84 / (n - 1)); gg.fillRect(sx - gw * 0.014, gtop + gh2 * 0.12, gw * 0.028, gh2 * 0.76); }
      // rond AMG-badge met Mercedes-ster
      const bcy = gtop + gh2 * 0.5, br = gw * 0.14;
      gg.fillStyle = '#0b0b0d'; gg.beginPath(); gg.arc(cx, bcy, br * 1.15, 0, Math.PI * 2); gg.fill();
      gg.fillStyle = '#cfcfd4'; gg.beginPath(); gg.arc(cx, bcy, br, 0, Math.PI * 2); gg.fill();
      gg.fillStyle = '#0b0b0d'; gg.beginPath(); gg.arc(cx, bcy, br * 0.68, 0, Math.PI * 2); gg.fill();
      gg.strokeStyle = '#cfcfd4'; gg.lineWidth = Math.max(0.8, w * 0.018);
      gg.beginPath();
      for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 3; gg.moveTo(cx, bcy); gg.lineTo(cx + Math.cos(a) * br * 0.62, bcy + Math.sin(a) * br * 0.62); }
      gg.stroke();
    }

    // ---- achterlichten (rode balk) ----
    gg.fillStyle = '#ff3b30';
    gg.fillRect(cx - bw * 0.4, py(-0.82) - h * 0.02, bw * 0.8, h * 0.04);

    // ---- uitlaten (quad of dubbel, midden) ----
    const exPos = car.quad ? [-0.27, -0.13, 0.13, 0.27] : car.dualExhaust ? [-0.09, 0.09] : null;
    if (exPos) {
      const ey = py(-0.92), er = w * 0.05;
      for (const f of exPos) {
        const ex = cx + f * bw;
        gg.fillStyle = '#20222a'; gg.beginPath(); gg.arc(ex, ey, er, 0, Math.PI * 2); gg.fill();
        gg.fillStyle = '#4a4e57'; gg.beginPath(); gg.arc(ex, ey, er * 0.58, 0, Math.PI * 2); gg.fill();
      }
    }
  }

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
    // backfire-vlammen uit de uitlaat (additief, achter de auto)
    if (flames.length) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const fl of flames) {
        const x = fl.x * W, y = fl.y * H, li = Math.max(0, fl.life);
        const rad = unit * 0.028 * fl.r * (0.55 + li * 0.9);
        g.globalAlpha = 0.45 * li;
        g.fillStyle = li > 0.5 ? '#ffd23d' : '#ff5a1a';
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 0.85 * li;
        g.fillStyle = li > 0.6 ? '#fffdf0' : '#ffab3a';
        g.beginPath(); g.arc(x, y, rad * 0.5, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1; g.restore();
    }
    // speler (knippert bij onkwetsbaarheid)
    if (!(invuln > 0 && Math.floor(invuln * 12) % 2 === 0)) drawSuperCar(g, player.x * W, 0.82 * H, S.carW, S.carH, CARS[selected], -1);

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
    if (engine) { try { engine.nodes.forEach((n) => n.stop()); } catch (e) { /* al gestopt */ } engine = null; }
    if (actx) { try { actx.close(); } catch (e) { /* al gesloten */ } }
    document.body.style.overflow = prevOverflow;
    fs.remove();
  };
}
