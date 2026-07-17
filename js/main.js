// App-shell: hash-router, startscherm met categorieën, gamepagina met
// highscores, en de opslag/back-updialoog.

import { storage } from './storage.js';
import { initTheme } from './theme.js';
import { games, categories, getGame, getCategory } from './registry.js';
import { cloudEnabled } from './cloud-config.js';
import * as cloud from './cloud.js';
import * as sync from './sync.js';

const view = document.getElementById('view');
let destroyCurrentGame = null;
let activeCategory = 'alles';
let hsView = 'local'; // 'local' of 'online' — welke highscore-lijst getoond wordt

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

  // Tabbladen alleen tonen als online opslag is geconfigureerd.
  const tabs = cloudEnabled()
    ? `<div class="hs-tabs">
        <button class="btn ${hsView === 'local' ? 'btn-primary' : ''}" data-hs="local">Dit apparaat</button>
        <button class="btn ${hsView === 'online' ? 'btn-primary' : ''}" data-hs="online">Online</button>
      </div>`
    : '';

  const localList = () => {
    const scores = storage.getHighscores(game.id);
    return scores.length
      ? `<ol class="score-list">${scores
          .map(
            (s) => `<li><span>${game.formatScore(s.score)}</span>
              <span class="score-date">${new Date(s.date).toLocaleDateString('nl-NL')}</span></li>`
          )
          .join('')}</ol>`
      : '<p class="empty">Nog geen scores — speel een potje!</p>';
  };

  box.innerHTML = `<h3>🏆 Highscores</h3>${tabs}<div id="hs-body">${
    hsView === 'online' ? '<p class="empty">Laden…</p>' : localList()
  }</div>`;

  box.querySelectorAll('[data-hs]').forEach((btn) =>
    btn.addEventListener('click', () => { hsView = btn.dataset.hs; renderHighscores(game); })
  );

  if (hsView === 'online') {
    const bodyEl = box.querySelector('#hs-body');
    cloud
      .getLeaderboard(game.id, game.scoreMode)
      .then((rows) => {
        if (!document.getElementById('hs-body')) return; // scherm verlaten
        bodyEl.innerHTML = rows.length
          ? `<ol class="score-list">${rows
              .map(
                (r) => `<li><span class="hs-name">${escapeHtml(r.username)}</span>
                  <span>${game.formatScore(r.score)}</span></li>`
              )
              .join('')}</ol>`
          : '<p class="empty">Nog geen online scores. Wees de eerste!</p>';
      })
      .catch(() => {
        if (document.getElementById('hs-body')) {
          bodyEl.innerHTML = '<p class="empty">Online ranglijst niet beschikbaar.</p>';
        }
      });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
      // Online: lokaal in de wachtrij + versturen zodra er verbinding is.
      sync.enqueueScore(game.id, score).then(() => {
        if (hsView === 'online') renderHighscores(game);
      });
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

// ---------- account (online in-/uitloggen) ----------

function initAccount() {
  const btn = document.getElementById('account-btn');
  const dialog = document.getElementById('account-dialog');
  if (!btn || !dialog) return;

  // Zonder cloud-config bestaan er geen accounts: knop verbergen.
  if (!cloudEnabled()) { btn.hidden = true; return; }
  btn.hidden = false;

  function refreshButton() {
    const user = cloud.currentUser();
    btn.textContent = user ? `👤 ${user.username}` : '👤';
    btn.title = user ? `Ingelogd als ${user.username}` : 'Inloggen / account aanmaken';
  }

  function renderDialog(message = '') {
    const user = cloud.currentUser();
    if (user) {
      dialog.innerHTML = `
        <h2>Account</h2>
        <p>Je bent ingelogd als <b>${escapeHtml(user.username)}</b>. Je highscores
           worden nu ook online opgeslagen en verschijnen in de online ranglijst.</p>
        <div class="dialog-actions">
          <button class="btn btn-danger" id="acc-logout">Uitloggen</button>
        </div>
        <form method="dialog"><button class="btn btn-primary">Sluiten</button></form>`;
      dialog.querySelector('#acc-logout').addEventListener('click', async () => {
        await cloud.signOut();
        refreshButton();
        renderDialog('Je bent uitgelogd.');
        if (hsView === 'online') { const g = currentGame(); if (g) renderHighscores(g); }
      });
    } else {
      dialog.innerHTML = `
        <h2>Inloggen</h2>
        <p>Maak een account met alleen een gebruikersnaam en wachtwoord — geen
           e-mail nodig. Nog geen account? Vul iets in en kies "Account aanmaken".</p>
        <div class="acc-form">
          <input id="acc-user" class="acc-input" placeholder="Gebruikersnaam" autocomplete="username">
          <input id="acc-pass" class="acc-input" type="password" placeholder="Wachtwoord" autocomplete="current-password">
          <div class="acc-msg">${escapeHtml(message)}</div>
          <div class="dialog-actions">
            <button class="btn btn-primary" id="acc-login">Inloggen</button>
            <button class="btn" id="acc-signup">Account aanmaken</button>
          </div>
        </div>
        <form method="dialog"><button class="btn">Sluiten</button></form>`;

      const userEl = dialog.querySelector('#acc-user');
      const passEl = dialog.querySelector('#acc-pass');
      const msgEl = dialog.querySelector('.acc-msg');

      const run = async (fn) => {
        msgEl.textContent = 'Bezig…';
        try {
          await fn(userEl.value, passEl.value);
          refreshButton();
          dialog.close();
          // Bestaande lokale highscores koppelen aan (het eerste) account, en
          // eventuele offline scores versturen.
          await sync.syncLocalHighscoresOnce();
          const g = currentGame();
          if (g) { hsView = 'online'; renderHighscores(g); }
        } catch (err) {
          msgEl.textContent = err.message || 'Er ging iets mis.';
        }
      };
      dialog.querySelector('#acc-login').addEventListener('click', () => run(cloud.signIn));
      dialog.querySelector('#acc-signup').addEventListener('click', () => run(cloud.signUp));
    }
  }

  btn.addEventListener('click', () => { renderDialog(); dialog.showModal(); });
  refreshButton();
}

// Actieve game (of null) op basis van de huidige route — voor het verversen
// van de highscore-lijst na in-/uitloggen.
function currentGame() {
  const m = location.hash.match(/^#\/game\/(.+)$/);
  return m ? getGame(decodeURIComponent(m[1])) : null;
}

// Opslag eerst laden/ontsleutelen (en oude opslag migreren), daarna renderen.
(async () => {
  await storage.init();
  initTheme(document.getElementById('theme-toggle'));
  initDataDialog();
  initAccount();
  sync.initSync();
  route();
})();

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
