// Blokjes (Tetris) — Minecraft-editie.
//
// Vallende tetromino's die zijn getekend als Minecraft-blokken (gras, diamant,
// goud, amethist, redstone, lapis en eiken), allemaal in code op canvas — geen
// afbeeldingen. Bespeelbaar met de vinger (grote knoppen + vegen), met de muis
// of met het toetsenbord. De stapel wordt bewaard, zodat je later verder speelt.

const COLS = 10;
const ROWS = 20;

// De zeven tetromino's, elk gekoppeld aan een Minecraft-bloktype.
const SHAPES = {
  I: { block: 'diamond',  cells: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { block: 'gold',     cells: [[1, 1], [1, 1]] },
  T: { block: 'amethyst', cells: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { block: 'grass',    cells: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { block: 'redstone', cells: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { block: 'lapis',    cells: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { block: 'oak',      cells: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};
const TYPES = Object.keys(SHAPES);

// Kleurpaletten per Minecraft-blok: [basis, licht, donker].
const PALETTES = {
  grass:    ['#7bc043', '#93d152', '#5a9e2e'], // apart getekend (gras + aarde)
  diamond:  ['#4fd0d6', '#8fe9ec', '#2f9aa0'],
  gold:     ['#f4cf3a', '#ffe98a', '#c9a021'],
  amethyst: ['#9b59d0', '#c08ee8', '#7038a8'],
  redstone: ['#d24b3e', '#ef7d6f', '#9e2f26'],
  lapis:    ['#2f6fd6', '#5f97ef', '#1d4aa0'],
  oak:      ['#d07b3a', '#eaa062', '#9c5522'],
};
const DIRT = ['#7a5230', '#8a6038', '#5f3f22']; // aarde onder de graszode

// Snelheid per niveau (ms tussen twee stappen omlaag). "Gewoon goed": een
// rustige start die geleidelijk pittiger wordt.
const DROP_MS = [800, 720, 630, 550, 470, 380, 300, 230, 170, 130, 100, 80];
const dropDelay = (lvl) => DROP_MS[Math.min(lvl, DROP_MS.length - 1)];
const LINE_POINTS = [0, 100, 300, 500, 800]; // punten per aantal tegelijk gewiste rijen

// Stabiele "ruis" per positie, zodat de bloktextuur niet flikkert.
function noise(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function rotateCW(cells) {
  const n = cells.length;
  const out = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = cells[r][c];
  return out;
}

export function init(root, ctx) {
  root.innerHTML = `
    <div class="game-toolbar">
      <span class="stat">Score: <b id="tet-score">0</b></span>
      <span class="stat">Rijen: <b id="tet-lines">0</b></span>
      <span class="stat">Level: <b id="tet-level">1</b></span>
    </div>
    <div class="tetris-stage">
      <div class="game-stage tetris-boardwrap">
        <canvas id="tet-board" class="tetris-board" aria-label="Speelveld"></canvas>
        <div id="tet-overlay" class="overlay" hidden></div>
      </div>
      <aside class="tetris-side">
        <span class="tetris-side-label">Volgende</span>
        <canvas id="tet-next" class="tetris-next" aria-label="Volgend blok"></canvas>
        <button id="tet-pause" class="btn tetris-side-btn">Pauze</button>
        <button id="tet-new" class="btn tetris-side-btn">Nieuw</button>
      </aside>
    </div>
    <div class="tetris-controls" aria-label="Bediening">
      <button class="tet-pad" data-act="left"  aria-label="Naar links">◀</button>
      <button class="tet-pad" data-act="rotate" aria-label="Draaien">⟳</button>
      <button class="tet-pad" data-act="right" aria-label="Naar rechts">▶</button>
      <button class="tet-pad tet-pad-wide tet-pad-drop" data-act="soft" aria-label="Vallen (ingedrukt houden)">⬇ vallen</button>
    </div>
    <p class="game-hint">Houd <b>⬇ vallen</b> ingedrukt om te zakken; laat los om op eigen tempo verder te gaan. Of veeg over het veld (tik = draaien). Toetsenbord: pijltjes, ↑ draaien, ↓ zakken, spatie ineens vallen, P pauze.</p>`;

  const boardCanvas = root.querySelector('#tet-board');
  const nextCanvas = root.querySelector('#tet-next');
  const bctx = boardCanvas.getContext('2d');
  const nctx = nextCanvas.getContext('2d');
  const overlay = root.querySelector('#tet-overlay');
  const scoreEl = root.querySelector('#tet-score');
  const linesEl = root.querySelector('#tet-lines');
  const levelEl = root.querySelector('#tet-level');
  const pauseBtn = root.querySelector('#tet-pause');

  // ---------- spelstatus ----------
  let board = emptyBoard();
  let piece = null;         // { block, cells, x, y }
  let nextType = randType();
  let score = 0, lines = 0, level = 0;
  let state = 'playing';    // 'playing' | 'clearing' | 'paused' | 'over'
  let cell = 24;            // pixelgrootte van een cel (in layout berekend)
  let dropTimer = 0;        // opgetelde tijd sinds de laatste stap omlaag
  let lastFrame = 0;
  let raf = 0;
  let clearing = null;      // { rows:[...], t:0 } tijdens de wis-animatie

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  }
  function randType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }

  function spawn(type) {
    const shape = SHAPES[type];
    const cells = shape.cells.map((row) => row.slice());
    const x = Math.floor((COLS - cells.length) / 2);
    piece = { block: shape.block, cells, x, y: 0 };
    // Net-niet-passen bij de start = game over.
    if (collides(piece.cells, piece.x, piece.y)) { gameOver(); return; }
  }

  function collides(cells, px, py) {
    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        if (!cells[r][c]) continue;
        const x = px + c, y = py + r;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }

  // ---------- acties ----------
  function moveH(dx) {
    if (state !== 'playing' || !piece) return;
    if (!collides(piece.cells, piece.x + dx, piece.y)) { piece.x += dx; draw(); }
  }

  function rotate() {
    if (state !== 'playing' || !piece) return;
    const rotated = rotateCW(piece.cells);
    // Kleine "wall kick": schuif een paar plekken op als draaien botst.
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!collides(rotated, piece.x + dx, piece.y)) {
        piece.cells = rotated; piece.x += dx; draw(); return;
      }
    }
  }

  // Zacht zakken: één cel omlaag als het kan. NIET hier vastzetten — dat doet de
  // zwaartekracht na de normale vertraging, zodat je na loslaten nog even opzij
  // kunt schuiven voordat het blok landt.
  function softDrop() {
    if (state !== 'playing' || !piece) return;
    if (!collides(piece.cells, piece.x, piece.y + 1)) {
      piece.y += 1; score += 1; dropTimer = 0; updateStats(); draw();
    }
  }

  function hardDrop() {
    if (state !== 'playing' || !piece) return;
    let dist = 0;
    while (!collides(piece.cells, piece.x, piece.y + 1)) { piece.y += 1; dist++; }
    score += dist * 2;
    lock();
  }

  function ghostY() {
    let y = piece.y;
    while (!collides(piece.cells, piece.x, y + 1)) y++;
    return y;
  }

  function lock() {
    for (let r = 0; r < piece.cells.length; r++) {
      for (let c = 0; c < piece.cells[r].length; c++) {
        if (!piece.cells[r][c]) continue;
        const y = piece.y + r, x = piece.x + c;
        if (y >= 0) board[y][x] = piece.block;
      }
    }
    piece = null;
    const full = [];
    for (let r = 0; r < ROWS; r++) if (board[r].every((v) => v)) full.push(r);
    if (full.length) {
      clearing = { rows: full, t: 0 };
      state = 'clearing';
    } else {
      afterLock();
    }
  }

  function afterLock() {
    spawn(nextType);
    nextType = randType();
    drawNext();
    persist();
    updateStats();
    draw();
  }

  function finishClear() {
    const rows = clearing.rows;
    for (const r of rows) { board.splice(r, 1); board.unshift(new Array(COLS).fill(null)); }
    lines += rows.length;
    score += (LINE_POINTS[rows.length] || 1000) * (level + 1);
    level = Math.floor(lines / 10);
    clearing = null;
    state = 'playing';
    afterLock();
  }

  // ---------- lus ----------
  function tick(dt) {
    if (state === 'clearing') {
      clearing.t += dt;
      if (clearing.t >= 260) finishClear();
      return;
    }
    if (state !== 'playing' || !piece) return;
    dropTimer += dt;
    if (dropTimer >= dropDelay(level)) {
      dropTimer = 0;
      if (!collides(piece.cells, piece.x, piece.y + 1)) piece.y += 1;
      else lock();
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = lastFrame ? Math.min(t - lastFrame, 100) : 16;
    lastFrame = t;
    tick(dt);
    draw();
  }

  // ---------- tekenen ----------
  function paletteFor(block) { return PALETTES[block] || PALETTES.grass; }

  // Eén Minecraft-blok op (px,py) met celgrootte s. (gx,gy) zijn de wereldcoords
  // voor stabiele textuurruis; alpha maakt het spookblok doorzichtig.
  function drawBlock(g, px, py, s, block, gx, gy, alpha) {
    g.save();
    if (alpha != null) g.globalAlpha = alpha;
    const N = 4;                 // 4×4 textuur-subcellen
    const sub = s / N;
    if (block === 'grass') {
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const top = i === 0;     // bovenste rij = graszode, rest = aarde
        const pal = top ? [PALETTES.grass[0], PALETTES.grass[1], PALETTES.grass[2]] : DIRT;
        const n = noise(gx * N + j, gy * N + i);
        g.fillStyle = n < 0.28 ? pal[2] : n > 0.72 ? pal[1] : pal[0];
        g.fillRect(px + j * sub, py + i * sub, sub + 1, sub + 1);
      }
    } else {
      const pal = paletteFor(block);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const n = noise(gx * N + j, gy * N + i);
        g.fillStyle = n < 0.24 ? pal[2] : n > 0.78 ? pal[1] : pal[0];
        g.fillRect(px + j * sub, py + i * sub, sub + 1, sub + 1);
      }
    }
    // 3D-randje: lichte bovenrand/linkerrand, donkere onder-/rechterrand.
    const pal = block === 'grass' ? PALETTES.grass : paletteFor(block);
    const b = Math.max(1, Math.round(s * 0.09));
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(px, py, s, b); g.fillRect(px, py, b, s);
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.fillRect(px, py + s - b, s, b); g.fillRect(px + s - b, py, b, s);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1;
    g.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
    g.restore();
  }

  function draw() {
    const w = COLS * cell, h = ROWS * cell;
    // Achtergrond: donkere steengroeve met een fijn raster.
    bctx.fillStyle = '#24262d';
    bctx.fillRect(0, 0, w, h);
    bctx.strokeStyle = 'rgba(255,255,255,0.04)';
    bctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) { bctx.beginPath(); bctx.moveTo(c * cell + 0.5, 0); bctx.lineTo(c * cell + 0.5, h); bctx.stroke(); }
    for (let r = 1; r < ROWS; r++) { bctx.beginPath(); bctx.moveTo(0, r * cell + 0.5); bctx.lineTo(w, r * cell + 0.5); bctx.stroke(); }

    // Gelegde blokken.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) drawBlock(bctx, c * cell, r * cell, cell, board[r][c], c, r);
      }
    }

    // Wis-animatie: knipperende volle rijen.
    if (state === 'clearing' && clearing) {
      const on = Math.floor(clearing.t / 65) % 2 === 0;
      bctx.fillStyle = on ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)';
      for (const r of clearing.rows) bctx.fillRect(0, r * cell, w, cell);
    }

    // Spookblok (waar het blok terechtkomt) + het vallende blok.
    if (piece && state === 'playing') {
      const gy = ghostY();
      for (let r = 0; r < piece.cells.length; r++) {
        for (let c = 0; c < piece.cells[r].length; c++) {
          if (!piece.cells[r][c]) continue;
          if (gy !== piece.y) drawBlock(bctx, (piece.x + c) * cell, (gy + r) * cell, cell, piece.block, piece.x + c, gy + r, 0.28);
        }
      }
      for (let r = 0; r < piece.cells.length; r++) {
        for (let c = 0; c < piece.cells[r].length; c++) {
          if (!piece.cells[r][c]) continue;
          const y = piece.y + r;
          if (y >= 0) drawBlock(bctx, (piece.x + c) * cell, y * cell, cell, piece.block, piece.x + c, y);
        }
      }
    }
  }

  function drawNext() {
    const size = nextCanvas.clientWidth || 96;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    nextCanvas.width = size * dpr; nextCanvas.height = size * dpr;
    nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nctx.clearRect(0, 0, size, size);
    const shape = SHAPES[nextType];
    const cells = shape.cells;
    // Trim tot de gevulde grenzen zodat het blok netjes gecentreerd staat.
    let minR = 9, maxR = -1, minC = 9, maxC = -1;
    for (let r = 0; r < cells.length; r++) for (let c = 0; c < cells[r].length; c++) if (cells[r][c]) {
      minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    }
    const wCells = maxC - minC + 1, hCells = maxR - minR + 1;
    const s = Math.floor(Math.min(size / (wCells + 1), size / (hCells + 1)));
    const offX = (size - wCells * s) / 2, offY = (size - hCells * s) / 2;
    for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) if (cells[r][c]) {
      drawBlock(nctx, offX + (c - minC) * s, offY + (r - minR) * s, s, shape.block, c, r);
    }
  }

  function updateStats() {
    scoreEl.textContent = score;
    linesEl.textContent = lines;
    levelEl.textContent = level + 1;
  }

  // ---------- opslaan / laden ----------
  function persist() {
    if (state === 'over') return;
    ctx.save({ board, score, lines, level, nextType });
  }
  function loadOrStart() {
    const s = ctx.load();
    if (s && Array.isArray(s.board) && s.board.length === ROWS) {
      board = s.board.map((row) => row.slice());
      score = s.score || 0; lines = s.lines || 0; level = s.level || 0;
      nextType = TYPES.includes(s.nextType) ? s.nextType : randType();
    } else {
      board = emptyBoard(); score = 0; lines = 0; level = 0; nextType = randType();
    }
    state = 'playing';
    spawn(nextType);
    nextType = randType();
  }

  // ---------- einde / pauze ----------
  function gameOver() {
    state = 'over';
    piece = null;
    const result = score > 0 ? ctx.submitScore(score) : null;
    ctx.clearSave();
    overlay.innerHTML = `
      <h3>⛏️ Game over</h3>
      <p>Score: ${score} · ${lines} rijen${result?.isRecord ? ' — 🥇 nieuw record!' : result?.rank ? ` — plek ${result.rank} in de top 10` : ''}</p>
      <button id="tet-again" class="btn btn-primary">Nog een keer</button>`;
    overlay.hidden = false;
    overlay.querySelector('#tet-again').addEventListener('click', newGame);
    draw();
  }

  function newGame() {
    board = emptyBoard(); score = 0; lines = 0; level = 0;
    clearing = null; nextType = randType();
    overlay.hidden = true;
    state = 'playing';
    spawn(nextType);
    nextType = randType();
    dropTimer = 0;
    drawNext(); updateStats(); persist(); draw();
  }

  function setPaused(on) {
    if (state === 'over') return;
    if (on && state === 'playing') {
      state = 'paused';
      pauseBtn.textContent = 'Verder';
      overlay.innerHTML = `<h3>⏸️ Pauze</h3><button id="tet-resume" class="btn btn-primary">Verder spelen</button>`;
      overlay.hidden = false;
      overlay.querySelector('#tet-resume').addEventListener('click', () => setPaused(false));
    } else if (!on && state === 'paused') {
      state = 'playing';
      pauseBtn.textContent = 'Pauze';
      overlay.hidden = true;
      dropTimer = 0;
    }
    draw();
  }

  // ---------- invoer: toetsenbord ----------
  function onKey(e) {
    if (e.key === 'p' || e.key === 'P') { setPaused(state !== 'paused'); return; }
    if (state !== 'playing') return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a') { e.preventDefault(); moveH(-1); }
    else if (k === 'ArrowRight' || k === 'd') { e.preventDefault(); moveH(1); }
    else if (k === 'ArrowDown' || k === 's') { e.preventDefault(); softDrop(); }
    else if (k === 'ArrowUp' || k === 'w' || k === 'x') { e.preventDefault(); rotate(); }
    else if (k === ' ') { e.preventDefault(); hardDrop(); }
  }

  // ---------- invoer: knoppen met vasthouden ----------
  const holds = [];
  function bindPad(el) {
    const act = el.dataset.act;
    const once = () => {
      if (act === 'left') moveH(-1);
      else if (act === 'right') moveH(1);
      else if (act === 'soft') softDrop();
      else if (act === 'rotate') rotate();
      else if (act === 'hard') hardDrop();
    };
    let delayTimer = 0, repeatTimer = 0;
    const repeats = act === 'left' || act === 'right' || act === 'soft';
    const firstDelay = act === 'soft' ? 60 : 170; // vallen zakt meteen door
    const interval = act === 'soft' ? 45 : 55;    // vallen iets sneller
    const stop = () => { clearTimeout(delayTimer); clearInterval(repeatTimer); delayTimer = repeatTimer = 0; };
    const start = (e) => {
      e.preventDefault();
      once();
      if (repeats) {
        delayTimer = setTimeout(() => { repeatTimer = setInterval(once, interval); }, firstDelay);
      }
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointerleave', stop);
    el.addEventListener('pointercancel', stop);
    holds.push({ el, start, stop });
  }
  root.querySelectorAll('.tet-pad').forEach(bindPad);

  // ---------- invoer: vegen over het veld ----------
  let sw = null;
  function onTouchStart(e) {
    const t = e.touches[0];
    sw = { x: t.clientX, y: t.clientY, ox: t.clientX, oy: t.clientY, moved: false };
  }
  function onTouchMove(e) {
    if (!sw || state !== 'playing') return;
    const t = e.touches[0];
    const dx = t.clientX - sw.x, dy = t.clientY - sw.y;
    const step = Math.max(28, cell * 1.1);
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > step) {
      moveH(dx > 0 ? 1 : -1); sw.x = t.clientX; sw.moved = true;
    } else if (dy > step) {
      softDrop(); sw.y = t.clientY; sw.moved = true;
    }
  }
  function onTouchEnd(e) {
    if (!sw) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sw.ox, dy = t.clientY - sw.oy;
    if (!sw.moved && Math.abs(dx) < 14 && Math.abs(dy) < 14) rotate();            // tik = draaien
    sw = null;
  }

  // ---------- knoppen ----------
  pauseBtn.addEventListener('click', () => setPaused(state !== 'paused'));
  root.querySelector('#tet-new').addEventListener('click', () => {
    if (score > 0 && state !== 'over') ctx.submitScore(score);
    newGame();
  });
  function onVisibility() { if (document.hidden) setPaused(true); }

  // ---------- layout ----------
  function layout() {
    const stage = root.querySelector('.tetris-stage');
    const controls = root.querySelector('.tetris-controls');
    const hint = root.querySelector('.game-hint');
    const avail = stage.clientWidth || root.clientWidth || 320;
    // Het "volgende"-paneel staat er altijd naast; reserveer die breedte + de
    // flex-gap zodat het paneel nooit onder het bord wegvalt (dat zou de pagina
    // hoger maken en de knoppen uit beeld duwen).
    const gap = 12, sidePanel = 120;
    const boardW = Math.max(120, avail - sidePanel - gap - 6);

    // Verticale ruimte: van de bovenkant van het speelveld tot onder in het
    // scherm, min wat de knoppen + hint eronder nodig hebben. Zo passen bord én
    // bediening samen in beeld en hoef je tijdens het spelen niet te scrollen.
    const stageTop = stage.getBoundingClientRect().top;
    const below = (controls ? controls.offsetHeight : 140) + (hint ? hint.offsetHeight : 40) + 24;
    const vAvail = (window.innerHeight || 700) - stageTop - below;
    const maxH = Math.max(220, vAvail);

    cell = Math.max(12, Math.floor(Math.min(boardW / COLS, maxH / ROWS)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = COLS * cell, h = ROWS * cell;
    boardCanvas.style.width = w + 'px';
    boardCanvas.style.height = h + 'px';
    boardCanvas.width = w * dpr; boardCanvas.height = h * dpr;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
    drawNext();
  }

  window.addEventListener('keydown', onKey);
  boardCanvas.addEventListener('touchstart', onTouchStart, { passive: true });
  boardCanvas.addEventListener('touchmove', onTouchMove, { passive: true });
  boardCanvas.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  const ro = new ResizeObserver(() => layout());
  ro.observe(root);

  loadOrStart();
  layout();
  // Mobiele browsers stellen hoogtes soms pas na de eerste render goed in.
  requestAnimationFrame(layout);
  setTimeout(layout, 200);
  updateStats();
  drawNext();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    boardCanvas.removeEventListener('touchstart', onTouchStart);
    boardCanvas.removeEventListener('touchmove', onTouchMove);
    boardCanvas.removeEventListener('touchend', onTouchEnd);
    holds.forEach(({ el, start, stop }) => {
      el.removeEventListener('pointerdown', start);
      el.removeEventListener('pointerup', stop);
      el.removeEventListener('pointerleave', stop);
      el.removeEventListener('pointercancel', stop);
    });
    ro.disconnect();
  };
}
