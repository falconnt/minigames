// pwa.js — maakt City Drive installeerbaar als losse app: toont de eigen
// installatieknop zodra Chrome installeren aanbiedt en registreert de service
// worker (offline spelen + installatie). Kent verder niets van de game.

export function initPWA() {
  const btn = document.getElementById('installBtn');
  let deferred = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (btn) btn.hidden = false;
  });

  if (btn) btn.addEventListener('click', async () => {
    if (!deferred) return;
    btn.hidden = true;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    if (btn) btn.hidden = true;
  });

  // Service worker: relatief pad -> scope is deze map, los van de Minigames-app.
  if ('serviceWorker' in navigator) {
    let reloaded = false;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
        reg.update();
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller && !reloaded) {
              reloaded = true;
              window.location.reload();
            }
          });
        });
      }).catch(() => { /* registratie mislukt (bijv. geen HTTPS); spel werkt door */ });
    });
  }
}
