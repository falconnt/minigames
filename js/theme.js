// Licht/donker thema. Zonder keuze volgen we het systeem (prefers-color-scheme);
// na een klik op de schakelaar wordt de keuze bewaard in de gedeelde opslag.

import { storage } from './storage.js';

function currentTheme() {
  return (
    document.documentElement.dataset.theme ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

export function initTheme(toggleButton) {
  const saved = storage.getSetting('theme');
  if (saved) document.documentElement.dataset.theme = saved;

  toggleButton.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    storage.setSetting('theme', next);
  });
}
