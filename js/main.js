// App-shell: hash-router, startscherm met categorieën, gamepagina met
// highscores, en de opslag/back-updialoog.

import { storage } from './storage.js';
import { getTheme, setTheme } from './theme.js';
import { games, categories, getGame, getCategory } from './registry.js';
import { cloudEnabled } from './cloud-config.js';
import * as cloud from './cloud.js';
import * as sync from './sync.js';
import { APP_VERSION } from './version.js';
import * as fx from './effects.js';
import * as sound from './sound.js';
import * as ach from './achievements.js';

const view = document.getElementById('view');
let destroyCurrentGame = null;
let activeCategory = 'alles';
let hsView = 'local'; // 'local' of 'online' — welke highscore-lijst getoond wordt
let scoresView = null; // idem voor de overzichtspagina (null = nog niet gekozen)

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
      return `<a class="card card-cat-${g.category} card-game-${g.id}" href="#/game/${g.id}">
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

  const streak = storage.getStat('streak');
  const streakChip = streak >= 2 ? `<span class="streak-chip" title="Dagen op rij gespeeld">🔥 ${streak} dagen op rij</span>` : '';

  view.innerHTML = `
    <div class="chips">${chips}${streakChip}</div>
    <div class="cards">${cards || '<p class="empty">Geen games in deze categorie.</p>'}</div>
  `;

  view.querySelectorAll('.chip').forEach((btn) =>
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderHome();
    })
  );
}

// ---------- highscore-overzicht ----------

function scoreCardBody(game, entries, online) {
  if (!entries.length) {
    return `<p class="empty">Nog geen scores. <a href="#/game/${game.id}">Speel ${game.title} →</a></p>`;
  }
  const champ = entries[0];
  const rest = entries.slice(1, 5);
  return `
    <div class="champ">
      <div class="champ-crown">👑</div>
      <div class="champ-main">
        <div class="champ-name">${online ? escapeHtml(champ.name) : 'Beste op dit apparaat'}</div>
        <div class="champ-score">${game.formatScore(champ.score)}</div>
      </div>
    </div>
    ${rest.length
      ? `<ol class="rank-list">${rest
          .map(
            (e, i) => `<li><span class="rk">${i + 2}</span>
              <span class="nm">${online ? escapeHtml(e.name) : new Date(e.date).toLocaleDateString('nl-NL')}</span>
              <span class="sc">${game.formatScore(e.score)}</span></li>`
          )
          .join('')}</ol>`
      : ''}`;
}

function renderScores() {
  if (scoresView === null) scoresView = cloudEnabled() ? 'online' : 'local';
  if (!cloudEnabled()) scoresView = 'local';
  const online = scoresView === 'online';

  const tabs = cloudEnabled()
    ? `<div class="hs-tabs scores-tabs">
        <button class="btn ${!online ? 'btn-primary' : ''}" data-sv="local">Dit apparaat</button>
        <button class="btn ${online ? 'btn-primary' : ''}" data-sv="online">Online</button>
      </div>`
    : '';

  view.innerHTML = `
    <div class="scores-head">
      <a class="btn btn-back" href="#/">← Terug</a>
      <h2>🏆 Highscores</h2>
    </div>
    ${tabs}
    <p class="scores-sub">${online ? 'Wereldwijde ranglijst — wie staat er nummer 1?' : 'Je beste scores op dit apparaat.'}</p>
    <div class="scores-grid">
      ${games
        .map((g) => {
          const cat = getCategory(g.category);
          const body = online
            ? '<p class="empty">Laden…</p>'
            : scoreCardBody(g, storage.getHighscores(g.id).map((s) => ({ score: s.score, date: s.date })), false);
          return `<div class="score-card">
            <div class="score-card-head">
              <span class="sc-icon">${g.icon}</span>
              <h3>${g.title}</h3>
              <span class="tag">${cat.icon} ${cat.name}</span>
            </div>
            <div class="score-card-body" data-body="${g.id}">${body}</div>
          </div>`;
        })
        .join('')}
    </div>
    <h3 class="badges-title">🏅 Badges</h3>
    <div class="badges-grid">
      ${ach.BADGES.map((b) => {
        const earned = ach.isEarned(b.id);
        return `<div class="badge ${earned ? 'badge-earned' : ''}">
          <span class="badge-ico">${earned ? b.icon : '🔒'}</span>
          <b>${b.title}</b>
          <span class="badge-desc">${b.desc}</span>
        </div>`;
      }).join('')}
    </div>`;

  view.querySelectorAll('[data-sv]').forEach((b) =>
    b.addEventListener('click', () => { scoresView = b.dataset.sv; renderScores(); })
  );

  if (online) {
    for (const g of games) {
      cloud
        .getLeaderboard(g.id, g.scoreMode, 5)
        .then((rows) => {
          const el = view.querySelector(`[data-body="${g.id}"]`);
          if (el) el.innerHTML = scoreCardBody(g, rows.map((r) => ({ name: r.username, score: r.score })), true);
        })
        .catch((e) => {
          const el = view.querySelector(`[data-body="${g.id}"]`);
          if (el) el.innerHTML = `<p class="empty">Online ranglijst niet beschikbaar.<br><span class="sc-err">${escapeHtml(e.message || 'onbekende fout')}</span></p>`;
        });
    }
  }
}

// ---------- record-feestje ----------

// Eén keer per game (per app-lading) de volle confetti; daarna alleen nog een
// toast — zo blijft het feestelijk zonder spam (bv. bij cumulatieve scores).
const celebrated = new Set();
function celebrate(game, result, score) {
  if (!result.isRecord || !(score > 0)) return;
  fx.toast(`🥇 Nieuw record: ${game.formatScore(score)}!`);
  if (navigator.vibrate) navigator.vibrate(80);
  if (!celebrated.has(game.id)) {
    celebrated.add(game.id);
    fx.confetti();
    sound.play('record');
  } else {
    sound.play('score');
  }
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
      celebrate(game, result, score);
      ach.onScore(game, score, result);
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
  if (location.hash === '#/scores') { renderScores(); return; }
  const match = location.hash.match(/^#\/game\/(.+)$/);
  if (match) renderGame(decodeURIComponent(match[1]));
  else renderHome();
}

window.addEventListener('hashchange', route);

// ---------- opslagdialoog ----------

function initDataDialog() {
  const dialog = document.getElementById('data-dialog');
  document.getElementById('data-btn').addEventListener('click', () => { renderSettings(); dialog.showModal(); });
}

function renderSettings() {
  const dialog = document.getElementById('data-dialog');
  const theme = getTheme();
  const opt = (val, label) =>
    `<button class="btn ${theme === val ? 'btn-primary' : ''}" data-theme="${val}">${label}</button>`;
  dialog.innerHTML = `
    <h2>Instellingen</h2>
    <div class="settings-row">
      <span class="settings-label">Thema</span>
      <div class="hs-tabs theme-tabs">
        ${opt('system', 'Systeem')}${opt('light', 'Licht')}${opt('dark', 'Donker')}
      </div>
    </div>
    <div class="settings-row">
      <span class="settings-label">Geluid</span>
      <div class="hs-tabs theme-tabs">
        <button class="btn ${sound.soundOn() ? 'btn-primary' : ''}" data-sound="on">Aan</button>
        <button class="btn ${!sound.soundOn() ? 'btn-primary' : ''}" data-sound="off">Uit</button>
      </div>
    </div>
    <div class="settings-row">
      <span class="settings-label">App-versie</span>
      <span class="muted-line">${APP_VERSION}</span>
    </div>
    <p class="muted-line">Zit je vast op een oude versie? Vernieuw de app om caches te wissen en de nieuwste versie te laden.</p>
    <div class="dialog-actions">
      <button id="app-refresh" class="btn btn-primary">App vernieuwen</button>
      <button id="reset-btn" class="btn btn-danger">Wis alle gegevens op dit apparaat</button>
    </div>
    <form method="dialog"><button class="btn">Sluiten</button></form>`;

  dialog.querySelectorAll('[data-theme]').forEach((b) =>
    b.addEventListener('click', () => { setTheme(b.dataset.theme); renderSettings(); })
  );
  dialog.querySelectorAll('[data-sound]').forEach((b) =>
    b.addEventListener('click', () => {
      sound.setSound(b.dataset.sound === 'on');
      if (b.dataset.sound === 'on') sound.play('score'); // hoorbaar voorbeeldje
      renderSettings();
    })
  );
  dialog.querySelector('#app-refresh').addEventListener('click', (e) => forceUpdate(e.currentTarget));
  dialog.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('Weet je zeker dat je ALLE saves en highscores op dit apparaat wilt wissen?')) {
      storage.resetAll();
      location.reload();
    }
  });
}

// Harde vernieuwing: caches wissen, service worker deregistreren en herladen met
// cache-omzeiling. Voor toestellen die op een oude versie blijven hangen.
async function forceUpdate(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Vernieuwen…'; }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (self.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* toch herladen */ }
  const url = new URL(location.href);
  url.searchParams.set('v', Date.now().toString());
  location.replace(url.toString());
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
    btn.textContent = '👤';
    btn.classList.toggle('logged-in', !!user);
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
        sync.refresh();
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

// ---------- synchronisatiestatus (zichtbaar + details bij aantikken) ----------

function renderSyncChip(s) {
  const chip = document.getElementById('sync-status');
  if (!chip) return;
  if (s.state === 'disabled') { chip.hidden = true; return; }
  chip.hidden = false;
  const map = {
    offline: { cls: 'sync-offline', icon: '⚡', label: 'Offline' },
    syncing: { cls: 'sync-syncing', icon: '↻', label: 'Synchroniseren…' },
    pending: { cls: 'sync-pending', icon: '↑', label: `${s.pending} te synchroniseren` },
    synced: { cls: 'sync-ok', icon: '✓', label: 'Gesynct' },
    error: { cls: 'sync-error', icon: '⚠', label: 'Sync-fout' },
  };
  const m = map[s.state] || map.synced;
  chip.className = 'sync-chip ' + m.cls;
  chip.innerHTML = `<span class="sync-ico ${s.state === 'syncing' ? 'spin' : ''}">${m.icon}</span><span class="sync-label">${m.label}</span>`;
}

function syncErrorHint(msg) {
  const m = (msg || '').toLowerCase();
  let tip = '';
  if (m.includes('does not exist') || m.includes('relation') || m.includes('(404)')) {
    tip = 'De tabel "scores" lijkt te ontbreken. Voer de SQL uit docs/online-highscores.md uit in de Supabase SQL Editor.';
  } else if (m.includes('row-level security') || m.includes('(403)') || m.includes('permission') || m.includes('policy')) {
    tip = 'Er ontbreekt waarschijnlijk een RLS-policy. Voer het SQL-blok (met de policies) uit docs/online-highscores.md uit.';
  } else if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
    tip = 'Geen verbinding met de server. Controleer je internet — je scores blijven in de wachtrij en gaan later vanzelf mee.';
  } else if ((m.includes('invalid') && m.includes('key')) || m.includes('(401)')) {
    tip = 'De Supabase-sleutel of inlog klopt mogelijk niet. Controleer de anon/publishable key en log eventueel opnieuw in.';
  }
  return tip ? `<p class="sync-hint">💡 ${tip}</p>` : '';
}

function openSyncDialog() {
  const dialog = document.getElementById('sync-dialog');
  const s = sync.getStatus();
  const stateText = {
    offline: 'Offline — wachten op verbinding',
    syncing: 'Bezig met synchroniseren…',
    pending: 'In de wachtrij',
    synced: 'Alles gesynchroniseerd',
    error: 'Synchronisatiefout',
    disabled: 'Uit',
  }[s.state] || s.state;

  dialog.innerHTML = `
    <h2>Synchronisatie</h2>
    <p>Status: <b>${stateText}</b></p>
    <p>Nog te synchroniseren: <b>${s.pending}</b> score(s)</p>
    ${s.lastSyncAt ? `<p class="muted-line">Laatst gesynct: ${new Date(s.lastSyncAt).toLocaleString('nl-NL')}${s.lastCount ? ` — ${s.lastCount} score(s)` : ''}</p>` : ''}
    ${s.lastError ? `<div class="sync-err-box"><b>Foutmelding</b><br>${escapeHtml(s.lastError)}</div>${syncErrorHint(s.lastError)}` : ''}
    <div class="dialog-actions">
      <button id="sync-retry" class="btn btn-primary">Opnieuw proberen</button>
    </div>
    <form method="dialog"><button class="btn">Sluiten</button></form>`;
  dialog.querySelector('#sync-retry').addEventListener('click', async () => {
    await sync.retry();
    openSyncDialog();
  });
  if (!dialog.open) dialog.showModal();
}

function initSyncStatus() {
  const chip = document.getElementById('sync-status');
  sync.subscribe(renderSyncChip);
  if (chip) chip.addEventListener('click', openSyncDialog);
}

// Opslag eerst laden/ontsleutelen (en oude opslag migreren), daarna renderen.
(async () => {
  await storage.init();
  initDataDialog();
  initAccount();
  initSyncStatus();
  sync.initSync();
  document.getElementById('scores-btn').addEventListener('click', () => { location.hash = '#/scores'; });
  const vEl = document.getElementById('app-version');
  if (vEl) vEl.textContent = 'v' + APP_VERSION;
  route();

  // Welkomstscherm bij het openen van de app — alleen op de startpagina
  // (deeplinks naar een game gaan er direct langs).
  const welcome = document.getElementById('welcome');
  if (welcome && (!location.hash || location.hash === '#' || location.hash === '#/')) {
    welcome.hidden = false;
    const playBtn = document.getElementById('welcome-play');
    playBtn.focus();
    playBtn.addEventListener('click', () => {
      sound.play('score');
      welcome.classList.add('welcome-hide');
      setTimeout(() => welcome.remove(), 500);
    }, { once: true });
  }
})();

// Service worker registreren: nodig om de app installeerbaar te maken (PWA)
// en offline te laten werken. Relatief pad, dus werkt ook onder /minigames/.
if ('serviceWorker' in navigator) {
  let reloaded = false;
  window.addEventListener('load', () => {
    // updateViaCache:'none' -> de browser haalt sw.js altijd vers op (geen HTTP-
    // cache), zodat een nieuwe versie betrouwbaar wordt gedetecteerd.
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      reg.update();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // Nieuwe versie klaar én er was al een actieve versie -> één keer herladen.
          if (nw.state === 'installed' && navigator.serviceWorker.controller && !reloaded) {
            reloaded = true;
            window.location.reload();
          }
        });
      });
    }).catch(() => { /* registratie mislukt (bijv. geen HTTPS); app werkt door */ });

    // Bij terugkomst in de app opnieuw op updates controleren.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
      }
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
