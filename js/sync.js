// Synchronisatie tussen de lokale (versleutelde) opslag en de online ranglijst,
// mét een zichtbare status zodat de gebruiker ziet wat er gebeurt (synchroniseren,
// gesynct, offline of een fout — inclusief de foutmelding).

import { storage } from './storage.js';
import { cloudEnabled } from './cloud-config.js';
import * as cloud from './cloud.js';

let flushing = false;

// ---------- status + abonnees ----------
// state: 'disabled' | 'offline' | 'syncing' | 'pending' | 'synced' | 'error'
let status = { state: 'disabled', pending: 0, lastError: null, lastSyncAt: null, lastCount: 0 };
const listeners = new Set();

export function subscribe(fn) { listeners.add(fn); fn(status); return () => listeners.delete(fn); }
export function getStatus() { return status; }
function setStatus(patch) {
  status = { ...status, ...patch };
  for (const fn of listeners) { try { fn(status); } catch { /* negeer */ } }
}

// Herbereken de status zonder iets te versturen (bv. na in-/uitloggen).
export function refresh() {
  if (!cloudEnabled() || !cloud.isLoggedIn()) { setStatus({ state: 'disabled', pending: 0, lastError: null }); return; }
  const p = storage.getPending().length;
  const state = !navigator.onLine ? 'offline' : p > 0 ? 'pending' : status.lastError ? 'error' : 'synced';
  setStatus({ state, pending: p });
}

// ---------- synchroniseren ----------

export async function flushPending() {
  if (flushing) return;
  if (!cloudEnabled() || !cloud.isLoggedIn()) { setStatus({ state: 'disabled', pending: 0 }); return; }
  const pending = storage.getPending();
  if (!navigator.onLine) { setStatus({ state: 'offline', pending: pending.length }); return; }
  if (!pending.length) { setStatus({ state: 'synced', pending: 0, lastError: null }); return; }

  flushing = true;
  setStatus({ state: 'syncing', pending: pending.length, lastError: null });
  let sent = 0, err = null;
  try {
    for (const item of pending) {
      try {
        await cloud.submitScore(item.game, item.score);
        storage.removePending(item.id);
        sent++;
        setStatus({ pending: storage.getPending().length });
      } catch (e) {
        err = e && e.message ? e.message : String(e);
        break; // stop bij de eerste fout; resterende blijven in de wachtrij
      }
    }
  } finally {
    flushing = false;
  }
  const remaining = storage.getPending().length;
  if (err) setStatus({ state: 'error', pending: remaining, lastError: err });
  else setStatus({ state: 'synced', pending: 0, lastError: null, lastSyncAt: Date.now(), lastCount: sent });
}

export function enqueueScore(game, score) {
  if (!cloudEnabled() || !cloud.isLoggedIn()) return Promise.resolve();
  storage.addPending(game, score);
  setStatus({ state: 'pending', pending: storage.getPending().length });
  return flushPending();
}

// Koppelt bestaande lokale highscores één keer aan het account (eerste login).
export async function syncLocalHighscoresOnce() {
  if (!cloudEnabled() || !cloud.isLoggedIn()) return;
  if (!storage.getFlag('syncedLocal')) {
    for (const id of storage.gamesWithScores()) {
      const hs = storage.getHighscores(id);
      if (hs.length) storage.addPending(id, hs[0].score);
    }
    storage.setFlag('syncedLocal', true);
    setStatus({ pending: storage.getPending().length });
  }
  return flushPending();
}

// Handmatig opnieuw proberen (vanuit de status-dialoog).
export function retry() { setStatus({ lastError: null }); return flushPending(); }

export function initSync() {
  if (!cloudEnabled()) { setStatus({ state: 'disabled' }); return; }
  window.addEventListener('online', () => { flushPending(); });
  window.addEventListener('offline', () => { refresh(); });
  if (cloud.isLoggedIn()) syncLocalHighscoresOnce();
  else refresh();
}
