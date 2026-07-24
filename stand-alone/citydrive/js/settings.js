// settings.js — het instellingenmenu (geopend met het ⚙-icoon rechtsboven).
// Bevat: app installeren, geluid aan/uit en reset positie.

import { ui, resetPos } from './state.js';
import { canInstall, promptInstall, isStandalone, isIOS, onInstallChange } from './pwa.js';

const el = document.getElementById('settings');

export function isSettingsOpen() { return ui.settingsOpen; }

export function openSettings() { ui.settingsOpen = true; el.classList.add('open'); refresh(); }
export function closeSettings() { ui.settingsOpen = false; el.classList.remove('open'); }

function refresh() {
  // installatie-rij + uitleg passen zich aan de situatie aan
  const inst = document.getElementById('setInstall'), hint = document.getElementById('setInstallHint');
  if (isStandalone()) {
    inst.textContent = 'App is geïnstalleerd ✓'; inst.disabled = true; hint.textContent = '';
  } else if (canInstall()) {
    inst.textContent = '📲  App installeren'; inst.disabled = false;
    hint.textContent = 'Werkt de knop niet? Gebruik dan het browsermenu (⋮) → "App installeren".';
  } else if (isIOS()) {
    inst.textContent = 'Toevoegen aan beginscherm'; inst.disabled = true;
    hint.textContent = "Open in Safari, tik op de Deel-knop en kies 'Zet op beginscherm'.";
  } else {
    inst.textContent = 'Installeren via browsermenu'; inst.disabled = true;
    hint.textContent = 'Open deze pagina in Chrome (niet in een app-browser) en tik op ⋮ → "App installeren" of "Toevoegen aan startscherm". Verschijnt dat niet? Rijd even rond en probeer opnieuw.';
  }
  // geluid-toggle
  document.getElementById('setSoundTog').classList.toggle('on', !ui.muted);
}

export function initSettings() {
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('setClose').addEventListener('click', closeSettings);
  el.addEventListener('pointerdown', (e) => { if (e.target === el) closeSettings(); });
  document.getElementById('setInstall').addEventListener('click', async () => { if (canInstall()) { await promptInstall(); refresh(); } });
  document.getElementById('setSound').addEventListener('click', () => { ui.muted = !ui.muted; refresh(); });
  document.getElementById('setReset').addEventListener('click', () => { resetPos(); closeSettings(); });
  onInstallChange(() => { if (ui.settingsOpen) refresh(); });
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && ui.settingsOpen) closeSettings(); });
}
