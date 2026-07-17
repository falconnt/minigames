// 2048 — schuifpuzzel met geanimeerde tegels.
//
// Elke tegel is een los, absoluut gepositioneerd element met een eigen id.
// Bij een zet schuiven de tegels vloeiend naar hun nieuwe plek (CSS-transitie op
// left/top); samenvoegen geeft een "pop" en nieuwe tegels verschijnen met een
// kleine schaal-animatie. Voortgang wordt automatisch bewaard.

const PAD = 10;   // binnenmarge van het bord (px)
const GAP = 10;   // ruimte tussen tegels (px)
const ANIM = 130; // duur van de schuifanimatie (ms) — iets langer dan de CSS-transitie

export function init(root, ctx) {
  root.innerHTML = `
    <div class="game-toolbar">
      <span class="stat">Score: <b id="g2048-score">0</b></span>
      <button id="g2048-new" class="btn">Nieuw spel</button>
    </div>
    <div class="game-stage">
      <div id="g2048-grid" class="g2048-grid">
        <div id="g2048-bg"></div>
        <div id="g2048-tiles"></div>
      </div>
      <div id="g2048-overlay" class="overlay" hidden></div>
    </div>
    <p class="game-hint">Pijltjes, WASD of vegen om te schuiven.</p>`;

  const grid = root.querySelector('#g2048-grid');
  const bgEl = root.querySelector('#g2048-bg');
  const tilesEl = root.querySelector('#g2048-tiles');
  const scoreEl = root.querySelector('#g2048-score');
  const overlay = root.querySelector('#g2048-overlay');

  let tiles = [];       // [{ id, value, r, c }]
  let score = 0, won = false, seq = 1;
  let cell = 70;        // pixelgrootte van een tegel (berekend in layout)
  let busy = false;     // blokkeert invoer tijdens de animatie
  let pending = null;   // openstaande setTimeout

  // achtergrondcellen
  const bgCells = [];
  for (let i = 0; i < 16; i++) {
    const d = document.createElement('div');
    d.className = 'g2048-cell-bg';
    bgEl.appendChild(d);
    bgCells.push(d);
  }

  // ---------- geometrie ----------
  function layout() {
    const size = grid.clientWidth;
    if (!size) return;
    cell = Math.max(20, Math.floor((size - 2 * PAD - 3 * GAP) / 4));
    grid.style.height = size + 'px';
    bgCells.forEach((d, i) => {
      const r = Math.floor(i / 4), c = i % 4;
      d.style.width = d.style.height = cell + 'px';
      d.style.left = PAD + c * (cell + GAP) + 'px';
      d.style.top = PAD + r * (cell + GAP) + 'px';
    });
    tilesEl.classList.add('g2048-nt'); // geen animatie tijdens herpositioneren
    for (const t of tiles) {
      const el = elById(t.id);
      if (el) { sizeTile(el, t.value); placeTile(el, t); }
    }
    void grid.offsetWidth; // forceer reflow
    tilesEl.classList.remove('g2048-nt');
  }

  const elById = (id) => tilesEl.querySelector(`[data-id="${id}"]`);
  const colorClass = (v) => (v <= 2048 ? 't' + v : 'tbig');

  function sizeTile(el, value) {
    el.style.width = el.style.height = cell + 'px';
    const digits = String(value).length;
    const factor = digits >= 4 ? 0.30 : digits === 3 ? 0.36 : 0.44;
    el.style.fontSize = Math.round(cell * factor) + 'px';
  }
  function placeTile(el, t) {
    el.style.left = PAD + t.c * (cell + GAP) + 'px';
    el.style.top = PAD + t.r * (cell + GAP) + 'px';
  }
  function makeTileEl(t) {
    const el = document.createElement('div');
    el.className = 'g2048-tile ' + colorClass(t.value);
    el.dataset.id = t.id;
    el.textContent = t.value;
    sizeTile(el, t.value);
    placeTile(el, t);
    return el;
  }

  // ---------- spel ----------
  function occupied() {
    const s = new Set();
    for (const t of tiles) s.add(t.r * 4 + t.c);
    return s;
  }
  function spawnTile(animate) {
    const occ = occupied();
    const empty = [];
    for (let i = 0; i < 16; i++) if (!occ.has(i)) empty.push(i);
    if (!empty.length) return;
    const idx = empty[Math.floor(Math.random() * empty.length)];
    const t = { id: seq++, value: Math.random() < 0.9 ? 2 : 4, r: Math.floor(idx / 4), c: idx % 4 };
    tiles.push(t);
    const el = makeTileEl(t);
    tilesEl.appendChild(el);
    if (animate) {
      el.classList.add('g2048-appear');
      el.addEventListener('animationend', () => el.classList.remove('g2048-appear'), { once: true });
    }
  }

  function freshGame() {
    tiles = []; score = 0; won = false;
    tilesEl.innerHTML = '';
    spawnTile(false); spawnTile(false);
  }

  function loadOrStart() {
    const saved = ctx.load();
    if (saved && Array.isArray(saved.tiles)) {
      tiles = saved.tiles.map((t) => ({ ...t }));
      score = saved.score || 0;
      won = saved.won || false;
      seq = saved.seq || (tiles.reduce((m, t) => Math.max(m, t.id), 0) + 1);
    } else if (saved && Array.isArray(saved.grid) && saved.grid.length === 16) {
      // migratie van het oude opslagformaat (platte grid) naar losse tegels
      tiles = [];
      saved.grid.forEach((v, i) => { if (v) tiles.push({ id: seq++, value: v, r: Math.floor(i / 4), c: i % 4 }); });
      score = saved.score || 0;
      won = saved.won || false;
    } else {
      freshGame();
    }
  }

  function persist() {
    ctx.save({ tiles: tiles.map((t) => ({ id: t.id, value: t.value, r: t.r, c: t.c })), score, won, seq });
  }

  function renderAll() {
    tilesEl.innerHTML = '';
    for (const t of tiles) tilesEl.appendChild(makeTileEl(t));
    scoreEl.textContent = score;
    layout();
  }

  // Berekent per tegel de doelpositie (tr, tc) en welke tegels samenvoegen.
  function computeMove(dir) {
    for (const t of tiles) { t.tr = t.r; t.tc = t.c; t.mergedThisMove = false; }
    const lineTiles = (i) => {
      let arr = (dir === 'left' || dir === 'right') ? tiles.filter((t) => t.r === i) : tiles.filter((t) => t.c === i);
      const key = { left: (t) => t.c, right: (t) => -t.c, up: (t) => t.r, down: (t) => -t.r }[dir];
      return arr.sort((a, b) => key(a) - key(b));
    };
    const cellAt = (i, k) => (
      dir === 'left' ? [i, k] : dir === 'right' ? [i, 3 - k] : dir === 'up' ? [k, i] : [3 - k, i]
    );
    const merges = [];
    let gained = 0;
    for (let i = 0; i < 4; i++) {
      let k = 0, prev = null;
      for (const t of lineTiles(i)) {
        if (prev && !prev.mergedThisMove && prev.value === t.value) {
          t.tr = prev.tr; t.tc = prev.tc;
          prev.mergedThisMove = true;
          merges.push({ keep: prev, gone: t });
          gained += prev.value * 2;
        } else {
          const [r, c] = cellAt(i, k); t.tr = r; t.tc = c; k++; prev = t;
        }
      }
    }
    const moved = tiles.some((t) => t.tr !== t.r || t.tc !== t.c);
    return { moved, merges, gained };
  }

  function move(dir) {
    if (busy || !overlay.hidden) return;
    const { moved, merges, gained } = computeMove(dir);
    if (!moved) return;
    busy = true;

    // 1) schuif alle tegels naar hun doelpositie (CSS-transitie animeert dit)
    for (const t of tiles) {
      t.r = t.tr; t.c = t.tc;
      const el = elById(t.id);
      if (el) placeTile(el, t);
    }
    if (gained) { score += gained; scoreEl.textContent = score; }

    // 2) na de schuifanimatie: samenvoegen afronden + nieuwe tegel
    pending = setTimeout(() => {
      pending = null;
      for (const m of merges) {
        m.keep.value *= 2;
        const el = elById(m.keep.id);
        if (el) {
          el.textContent = m.keep.value;
          el.className = 'g2048-tile ' + colorClass(m.keep.value);
          sizeTile(el, m.keep.value);
          el.classList.add('g2048-pop');
          el.addEventListener('animationend', () => el.classList.remove('g2048-pop'), { once: true });
        }
        if (m.keep.value === 2048) won = true;
        const goneEl = elById(m.gone.id);
        if (goneEl) goneEl.remove();
        tiles = tiles.filter((t) => t !== m.gone);
      }
      spawnTile(true);
      persist();
      busy = false;
      if (isGameOver()) endGame();
    }, ANIM);
  }

  function isGameOver() {
    if (tiles.length < 16) return false;
    const g = new Array(16).fill(0);
    for (const t of tiles) g[t.r * 4 + t.c] = t.value;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = g[r * 4 + c];
      if (c < 3 && g[r * 4 + c + 1] === v) return false;
      if (r < 3 && g[(r + 1) * 4 + c] === v) return false;
    }
    return true;
  }

  function endGame() {
    const result = score > 0 ? ctx.submitScore(score) : null;
    ctx.clearSave();
    overlay.innerHTML = `
      <h3>${won ? '🎉 Je haalde 2048!' : 'Vast! Geen zetten meer.'}</h3>
      <p>Score: ${score}${result?.isRecord ? ' — 🥇 nieuw record!' : result?.rank ? ` — plek ${result.rank} in de top 10` : ''}</p>
      <button id="g2048-again" class="btn btn-primary">Nog een keer</button>`;
    overlay.hidden = false;
    overlay.querySelector('#g2048-again').addEventListener('click', () => {
      overlay.hidden = true;
      freshGame(); persist(); layout();
    });
  }

  // ---------- invoer ----------
  function onKey(e) {
    const map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
    };
    const dir = map[e.key];
    if (!dir) return;
    e.preventDefault();
    move(dir);
  }

  let touchStart = null;
  function onTouchStart(e) { touchStart = [e.touches[0].clientX, e.touches[0].clientY]; }
  function onTouchEnd(e) {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart[0];
    const dy = e.changedTouches[0].clientY - touchStart[1];
    touchStart = null;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }

  root.querySelector('#g2048-new').addEventListener('click', () => {
    if (score > 0) ctx.submitScore(score);
    overlay.hidden = true;
    freshGame(); persist(); layout();
  });

  window.addEventListener('keydown', onKey);
  grid.addEventListener('touchstart', onTouchStart, { passive: true });
  grid.addEventListener('touchend', onTouchEnd, { passive: true });

  const ro = new ResizeObserver(() => layout());
  ro.observe(grid);

  loadOrStart();
  persist();
  renderAll();

  return () => {
    window.removeEventListener('keydown', onKey);
    if (pending) clearTimeout(pending);
    ro.disconnect();
  };
}
