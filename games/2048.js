// 2048 — schuifpuzzel. Demonstreert het save-mechanisme: elke zet wordt
// bewaard, dus je kunt de pagina sluiten en later verder spelen.

export function init(root, ctx) {
  root.innerHTML = `
    <div class="game-toolbar">
      <span class="stat">Score: <b id="g2048-score">0</b></span>
      <button id="g2048-new" class="btn">Nieuw spel</button>
    </div>
    <div class="game-stage">
      <div id="g2048-grid" class="g2048-grid"></div>
      <div id="g2048-overlay" class="overlay" hidden></div>
    </div>
    <p class="game-hint">Pijltjes, WASD of vegen om te schuiven.</p>
  `;

  const gridEl = root.querySelector('#g2048-grid');
  const scoreEl = root.querySelector('#g2048-score');
  const overlay = root.querySelector('#g2048-overlay');

  let grid, score, won;

  function freshGame() {
    grid = Array(16).fill(0);
    score = 0;
    won = false;
    spawn();
    spawn();
  }

  function loadOrStart() {
    const saved = ctx.load();
    if (saved && Array.isArray(saved.grid) && saved.grid.length === 16) {
      grid = saved.grid;
      score = saved.score ?? 0;
      won = saved.won ?? false;
    } else {
      freshGame();
    }
  }

  function persist() {
    ctx.save({ grid, score, won });
  }

  function spawn() {
    const empty = grid.map((v, i) => (v === 0 ? i : -1)).filter((i) => i !== -1);
    if (!empty.length) return;
    grid[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  }

  // Schuift en voegt één rij naar links samen; geeft de nieuwe rij terug.
  function slideRow(row) {
    const tiles = row.filter((v) => v !== 0);
    const out = [];
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === tiles[i + 1]) {
        const merged = tiles[i] * 2;
        out.push(merged);
        score += merged;
        if (merged === 2048) won = true;
        i++;
      } else {
        out.push(tiles[i]);
      }
    }
    while (out.length < 4) out.push(0);
    return out;
  }

  function move(dirKey) {
    // Lees per richting de vier rijen uit, schuif naar "links" en schrijf terug.
    const lines = {
      left: (r) => [0, 1, 2, 3].map((c) => r * 4 + c),
      right: (r) => [3, 2, 1, 0].map((c) => r * 4 + c),
      up: (c) => [0, 1, 2, 3].map((r) => r * 4 + c),
      down: (c) => [3, 2, 1, 0].map((r) => r * 4 + c),
    }[dirKey];

    let changed = false;
    for (let line = 0; line < 4; line++) {
      const idx = lines(line);
      const before = idx.map((i) => grid[i]);
      const after = slideRow(before);
      if (after.some((v, i) => v !== before[i])) {
        changed = true;
        idx.forEach((gi, i) => (grid[gi] = after[i]));
      }
    }
    if (!changed) return;

    spawn();
    persist();
    render();
    if (isGameOver()) endGame();
  }

  function isGameOver() {
    if (grid.includes(0)) return false;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = grid[r * 4 + c];
        if (c < 3 && grid[r * 4 + c + 1] === v) return false;
        if (r < 3 && grid[(r + 1) * 4 + c] === v) return false;
      }
    }
    return true;
  }

  function endGame() {
    const result = score > 0 ? ctx.submitScore(score) : null;
    ctx.clearSave();
    overlay.innerHTML = `
      <h3>${won ? '🎉 Je haalde 2048!' : 'Vast! Geen zetten meer.'}</h3>
      <p>Score: ${score}${result?.isRecord ? ' — 🥇 nieuw record!' : result?.rank ? ` — plek ${result.rank} in de top 10` : ''}</p>
      <button id="g2048-again" class="btn btn-primary">Nog een keer</button>
    `;
    overlay.hidden = false;
    overlay.querySelector('#g2048-again').addEventListener('click', () => {
      overlay.hidden = true;
      freshGame();
      persist();
      render();
    });
  }

  function render() {
    scoreEl.textContent = score;
    gridEl.innerHTML = grid
      .map((v) => {
        const cls = v === 0 ? '' : v <= 2048 ? `t${v}` : 'tbig';
        return `<div class="g2048-cell ${cls}">${v || ''}</div>`;
      })
      .join('');
  }

  function onKey(e) {
    const map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
    };
    const dirKey = map[e.key];
    if (!dirKey || !overlay.hidden) return;
    e.preventDefault();
    move(dirKey);
  }

  let touchStart = null;
  function onTouchStart(e) {
    touchStart = [e.touches[0].clientX, e.touches[0].clientY];
  }
  function onTouchEnd(e) {
    if (!touchStart || !overlay.hidden) return;
    const dx = e.changedTouches[0].clientX - touchStart[0];
    const dy = e.changedTouches[0].clientY - touchStart[1];
    touchStart = null;
    if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }

  root.querySelector('#g2048-new').addEventListener('click', () => {
    if (score > 0) ctx.submitScore(score);
    overlay.hidden = true;
    freshGame();
    persist();
    render();
  });

  window.addEventListener('keydown', onKey);
  gridEl.addEventListener('touchstart', onTouchStart, { passive: true });
  gridEl.addEventListener('touchend', onTouchEnd, { passive: true });

  loadOrStart();
  persist();
  render();

  return () => {
    window.removeEventListener('keydown', onKey);
  };
}
