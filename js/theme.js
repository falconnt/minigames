// Licht/donker thema. Drie standen: 'system' (volgt het besturingssysteem),
// 'light' en 'dark'. De keuze wordt in de gedeelde instellingen bewaard en al
// vóór de eerste render toegepast (zie het inline-script in index.html).

import { storage } from './storage.js';

export function getTheme() {
  return storage.getSetting('theme') || 'system';
}

export function setTheme(mode) {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') {
    root.dataset.theme = mode;
    storage.setSetting('theme', mode);
  } else {
    delete root.dataset.theme; // terug naar systeemvoorkeur
    storage.setSetting('theme', '');
  }
}
