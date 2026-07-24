// state.js — de levende spelstand + opslaan/laden + spelregels-helpers.
import { N, CONTINENTS } from './geo.js';
import {
  STORAGE_KEY, BASE_INCOME, MARKET_INCOME, CONTINENT_BONUS,
  UNITS, KAZERNE_KORTING, DOMINATION_SHARE,
} from './constants.js';

// Live binding: importeurs zien altijd de actuele stand.
export let game = null;
export function setGame(g) { game = g; }

// ---- opslaan / laden --------------------------------------------------------
export function save() {
  if (!game) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); } catch (e) { /* vol/afgeschermd */ }
}
export function loadSave() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; }
  catch (e) { return null; }
}
export function hasSave() { return !!loadSave(); }
export function clearSave() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* negeer */ }
}

// ---- helpers ----------------------------------------------------------------
export const totaal = (t) => t.inf + t.cav + t.art;
export const troepen = (i) => totaal(game.troops[i]);

export function landenVan(p) {
  const a = [];
  for (let i = 0; i < N; i++) if (game.owner[i] === p) a.push(i);
  return a;
}
export function aantalLanden(p) {
  let n = 0;
  for (let i = 0; i < N; i++) if (game.owner[i] === p) n++;
  return n;
}
export function bezitContinent(p, cont) {
  const list = CONTINENTS[cont];
  return list && list.length > 0 && list.every((i) => game.owner[i] === p);
}

// Inkomen voor speler p, met uitsplitsing voor de UI.
export function inkomen(p) {
  let base = 0, markt = 0;
  for (let i = 0; i < N; i++) {
    if (game.owner[i] !== p) continue;
    base += BASE_INCOME;
    markt += game.build[i].markt * MARKET_INCOME;
  }
  let cont = 0; const conts = [];
  for (const c in CONTINENT_BONUS) {
    if (bezitContinent(p, c)) { cont += CONTINENT_BONUS[c]; conts.push(c); }
  }
  return { base, markt, cont, conts, totaal: base + markt + cont };
}

// Rekruteerkosten van een eenheid in land i (kazerne geeft korting).
export function rekruteerKost(unitKey, i) {
  const basis = UNITS[unitKey].kost;
  const k = game.build[i].kazerne;
  return Math.max(1, Math.round(basis * (1 - k * KAZERNE_KORTING)));
}

// Markeer spelers zonder land als uitgeschakeld.
export function werkUitschakelingBij() {
  game.players.forEach((pl, i) => { if (pl.alive && aantalLanden(i) === 0) pl.alive = false; });
}

// Winnaar? -1 = nog geen. Laatste speler over, of overheersing (aandeel landen).
export function winnaar() {
  const levend = game.players.map((pl, i) => ({ pl, i })).filter((x) => x.pl.alive);
  if (levend.length <= 1) return levend.length === 1 ? levend[0].i : -1;
  for (const { i } of levend) if (aantalLanden(i) / N >= DOMINATION_SHARE) return i;
  return -1;
}

// Volgende levende speler na huidige (voor beurtwissel).
export function volgendeSpeler() {
  const n = game.players.length;
  for (let s = 1; s <= n; s++) {
    const idx = (game.cur + s) % n;
    if (game.players[idx].alive) return idx;
  }
  return game.cur;
}
