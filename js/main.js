// App-shell: hash-router, startscherm met categorieën, gamepagina met
// highscores, en de opslag/back-updialoog.

import { storage } from './storage.js';
import { initTheme } from './theme.js';
import { games, categories, getGame, getCategory } from './registry.js';

const view = document.getElementById('view');
let destroyCurrentGame = null;
let activeCategory = 'alles';

// ---------- startscherm ----------

function renderHome() {
  const chips = [{ id: 'alles', name: 'Alles', icon: '✨' }, ...categories]
    .map(
      (c) => `<button class="chip ${c.id === activeCategory ? 'chip-active' : ''}" data-cat="${c.id}">
        ${c.icon} ${c.name}</button>`
    )
    .join('');

  const visible = games.filter((g) => activeCategory === 'alles' || g.category === activeCategory);

  const cards = visible
    .map((g) => {
      const best = storage.getBest(g.id, g.scoreMode);
      const cat = getCategory(g.category);
      const hasSave = storage.getSave(g.id) !== null;
      return `<a class="card" href="#/game/${g.id}">
        <div class="card-icon">${g.icon}</div>
        <div class="card-body">
          <h3>${g.title}</h3>
          <p>${g.description}</p>
          <div class="card-meta">
            <span class="tag">${cat.icon} ${cat.name}</span>
            ${best !== null ? `<span class="tag tag-score">🏆 ${g.formatScore(best)}</span>` : ''}
            ${hasSave ? '<span class="tag tag-save">💾 verder spelen</span>' : ''}
          </div>
        </div>
      </a>`;
    })
    .join('');

  view.innerHTML = `
    <div class="chips">${chips}</div>
    <div class="cards">${cards || '<p class="empty">Geen games in deze categorie.</p>'}</div>
  `;

  view.querySelectorAll('.chip').forEach((btn) =>
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderHome();
    })
  );
}

// ---------- gamepagina ----------

function renderHighscores(game) {
  const box = document.getElementById('highscores');
  if (!box) return;
  const scores = storage.getHighscores(game.id);
  box.innerHTML = `
    <h3>🏆 Highscores</h3>
    ${
      scores.length
        ? `<ol class="score-list">${scores
            .map(
              (s) => `<li><span>${game.formatScore(s.score)}</span>
                <span class="score-date">${new Date(s.date).toLocaleDateString('nl-NL')}</span></li>`
            )
            .join('')}</ol>`
        : '<p class="empty">Nog geen scores — speel een potje!</p>'
    }`;
}

async function renderGame(id) {
  const game = getGame(id);
  if (!game) {
    location.hash = '#/';
    return;
  }

  view.innerHTML = `
    <div class="game-header">
      <a class="btn btn-back" href="#/">← Terug</a>
      <h2>${game.icon} ${game.title}</h2>
    </div>
    <div class="game-layout">
      <div id="game-root" class="game-root"></div>
      <aside id="highscores" class="highscores"></aside>
    </div>
  `;
  renderHighscores(game);

  // Context die elke game krijgt: opslag + scores, zonder dat de game
  // iets van localStorage of andere games hoeft te weten.
  const ctx = {
    load: () => storage.getSave(game.id),
    save: (data) => storage.setSave(game.id, data),
    clearSave: () => storage.clearSave(game.id),
    getHighscores: () => storage.getHighscores(game.id),
    submitScore(score) {
      const result = storage.submitScore(game.id, score, game.scoreMode);
      renderHighscores(game);
      return result;
    },
  };

  const root = document.getElementById('game-root');
  try {
    const module = await game.load();
    destroyCurrentGame = module.init(root, ctx) ?? null;
  } catch (err) {
    root.innerHTML = `<p class="empty">De game kon niet geladen worden: ${err.message}</p>`;
  }
}

// ---------- router ----------

function route() {
  if (typeof destroyCurrentGame === 'function') {
    destroyCurrentGame();
    destroyCurrentGame = null;
  }
  const match = location.hash.match(/^#\/game\/(.+)$/);
  if (match) renderGame(decodeURIComponent(match[1]));
  else renderHome();
}

window.addEventListener('hashchange', route);

// ---------- opslagdialoog ----------

function initDataDialog() {
  const dialog = document.getElementById('data-dialog');
  document.getElementById('data-btn').addEventListener('click', () => dialog.showModal());

  document.getElementById('export-btn').addEventListener('click', () => {
    const blob = new Blob([storage.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'minigames-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      storage.importJson(await file.text());
      alert('Back-up geïmporteerd!');
      location.reload();
    } catch {
      alert('Dit bestand is geen geldige back-up.');
    }
    e.target.value = '';
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Weet je zeker dat je ALLE saves en highscores wilt wissen?')) {
      storage.resetAll();
      location.reload();
    }
  });
}

initTheme(document.getElementById('theme-toggle'));
initDataDialog();
route();

// Service worker registreren: nodig om de app installeerbaar te maken (PWA)
// en offline te laten werken. Relatief pad, dus werkt ook onder /minigames/.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* registratie mislukt (bijv. geen HTTPS); app werkt gewoon door */
    });
  });
}

// Eigen installatieknop: verschijnt zodra Chrome installeren aanbiedt, zodat
// de gebruiker niet in het browsermenu hoeft te zoeken.
(function initInstallPrompt() {
  const btn = document.getElementById('install-btn');
  if (!btn) return;
  let deferred = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });

  btn.addEventListener('click', async () => {
    if (!deferred) return;
    btn.hidden = true;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    btn.hidden = true;
  });
})();
