// state.js — de gedeelde, muteerbare game-state en het bewaren daarvan.
// Andere modules importeren `state`, `P`, `cam` en `ui` als levende referenties
// en muteren die direct. Persistente opslag zit hier gebundeld.

import { CELL, ROAD, SAVE_KEY } from './constants.js';
import { defById, mkCfg } from './cars.js';

// Voortgang: geld, bezit, geselecteerde auto en per-auto configuraties.
export const state = {
  money: 3800,
  owned: new Set(['kei']),
  current: 'kei',
  cfg: { kei: mkCfg('kei') },
};

// Speler (positie + snelheid) en camera.
export const P = { x: 3 * CELL + ROAD / 2, y: 3 * CELL + ROAD / 2, ang: 0, vx: 0, vy: 0, vf: 0, vl: 0, steerVis: 0 };
export const cam = { x: P.x, y: P.y, z: 1 };

// Vluchtige UI-vlaggen die meerdere modules delen (audio, garage, loop).
export const ui = { garageOpen: false, muted: false, dealerOpen: false, settingsOpen: false };

export function resetPos() {
  P.x = 3 * CELL + ROAD / 2;
  P.y = 3 * CELL + ROAD / 2;
  P.ang = 0;
  P.vx = P.vy = P.vf = P.vl = 0;
}

/* ---------- opslaan / laden ---------- */

export function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money,
      owned: [...state.owned],
      current: state.current,
      cfg: state.cfg,
    }));
  } catch (e) { /* opslag vol of geblokkeerd: spel draait door zonder opslaan */ }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.money === 'number') state.money = s.money;
    if (Array.isArray(s.owned)) state.owned = new Set(s.owned.filter(defById));
    if (!state.owned.has('kei')) state.owned.add('kei');
    // configs samenvoegen met verse defaults zodat nieuwe velden niet ontbreken
    if (s.cfg && typeof s.cfg === 'object') {
      for (const id of state.owned) {
        const base = mkCfg(id), saved = s.cfg[id];
        if (saved) { Object.assign(base, saved); base.up = Object.assign({ eng: 0, tur: 0, han: 0 }, saved.up || {}); }
        state.cfg[id] = base;
      }
    }
    if (s.current && state.owned.has(s.current)) state.current = s.current;
    if (!state.cfg[state.current]) state.cfg[state.current] = mkCfg(state.current);
  } catch (e) { /* corrupte save: begin met verse staat */ }
}

// Ontdubbelde, uitgestelde save zodat snelle mutaties niet elke frame schrijven.
let saveTimer = null;
export function queueSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveState(); }, 600);
}

// Laden + opslaan-bij-verlaten in één keer opzetten (aangeroepen vanuit main).
export function initPersistence() {
  loadState();
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveState(); });
  addEventListener('pagehide', saveState);
}
