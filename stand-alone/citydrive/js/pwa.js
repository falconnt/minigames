// pwa.js — installeerbaarheid + service worker. De installatie-actie zit in het
// instellingenmenu (settings.js); dit bestand vangt het install-aanbod van de
// browser op en biedt het aan via canInstall()/promptInstall().

let onChange = () => {};

// Het install-aanbod wordt al vroeg opgevangen in de <head> van index.html
// (window.__installPrompt), zodat we het niet missen.
export function canInstall() { return !!window.__installPrompt; }
export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
export function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
export function onInstallChange(cb) { onChange = cb; }

export async function promptInstall() {
  const e = window.__installPrompt;
  if (!e) return false;
  e.prompt();
  const res = await e.userChoice;
  window.__installPrompt = null; onChange();
  return res.outcome === 'accepted';
}

export function initPWA() {
  // De head-luisteraar meldt nieuwe beschikbaarheid via dit event.
  addEventListener('install-available', () => onChange());

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
