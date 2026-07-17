// Synchronisatie tussen de lokale (versleutelde) opslag en de online ranglijst.
//
// - Elke score wordt lokaal opgeslagen én in een wachtrij gezet. De wachtrij
//   wordt naar Supabase geschreven zodra er verbinding is en je bent ingelogd.
// - Ben je offline, dan blijft de score in de wachtrij (versleuteld bewaard) en
//   gaat hij vanzelf mee zodra je weer online bent.
// - Bij het eerste account dat je aanmaakt worden je bestaande lokale
//   highscores één keer gekoppeld en online gezet (ze "verhuizen" naar je account).

import { storage } from './storage.js';
import { cloudEnabled } from './cloud-config.js';
import * as cloud from './cloud.js';

let flushing = false;

// Probeert de wachtrij leeg te maken. Stopt bij de eerste fout (bv. weer offline)
// zodat resterende scores bewaard blijven voor de volgende poging.
export async function flushPending() {
  if (flushing) return;
  if (!cloudEnabled() || !cloud.isLoggedIn() || !navigator.onLine) return;
  flushing = true;
  try {
    for (const item of storage.getPending()) {
      try {
        await cloud.submitScore(item.game, item.score);
        storage.removePending(item.id);
      } catch {
        break; // netwerk-/serverfout -> later opnieuw proberen
      }
    }
  } finally {
    flushing = false;
  }
}

// Score inschieten: altijd lokaal in de wachtrij, daarna proberen te versturen.
// Geeft de flush-belofte terug zodat de UI daarna kan verversen.
export function enqueueScore(game, score) {
  if (!cloudEnabled() || !cloud.isLoggedIn()) return Promise.resolve();
  storage.addPending(game, score);
  return flushPending();
}

// Koppelt bestaande lokale highscores één keer aan het account (eerste login).
export async function syncLocalHighscoresOnce() {
  if (!cloudEnabled() || !cloud.isLoggedIn()) return;
  if (!storage.getFlag('syncedLocal')) {
    for (const id of storage.gamesWithScores()) {
      const hs = storage.getHighscores(id);
      if (hs.length) storage.addPending(id, hs[0].score); // beste lokale score per game
    }
    storage.setFlag('syncedLocal', true);
  }
  return flushPending();
}

// Reageer op terugkerende verbinding.
export function initSync() {
  if (!cloudEnabled()) return;
  window.addEventListener('online', () => { flushPending(); });
  if (cloud.isLoggedIn()) {
    syncLocalHighscoresOnce();
  }
}
