// state.js — de levende spelstand + opslaan/laden + spelregels-helpers.
import { N, CONTINENTS } from './geo.js';
import {
  STORAGE_KEY, BASE_INCOME, MARKET_INCOME, CONTINENT_BONUS,
  UNITS, KAZERNE_KORTING, DOMINATION_SHARE, ROUND_LIMIT,
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

// Rekruteerkosten van een eenheid in land i (kazerne geeft korting). Een
// kazerne die je deze ronde zelf plant, telt alvast mee.
export function rekruteerKost(unitKey, i, kijker = null) {
  const basis = UNITS[unitKey].kost;
  const k = kijker == null ? game.build[i].kazerne : bouwNiveau(i, 'kazerne', kijker);
  return Math.max(1, Math.round(basis * (1 - k * KAZERNE_KORTING)));
}

// ---- geplande bevelen -------------------------------------------------------
// ALLES wat een speler doet is geheim tot de resolutie: rekruteren, bouwen,
// aanvallen en verplaatsen worden als bevel opgeslagen en pas aan het eind van
// de ronde tegelijk uitgevoerd.
//
// Dat is bewust. Zou je een rekruut of fort meteen op de kaart zetten, dan zien
// de spelers die later plannen precies hoe sterk je staat — óók een voordeel
// van later aan de beurt zijn. Nu ziet iedereen dezelfde wereld.

export const orders = () => (game.orders ||= []);

// Wat speler p in land i heeft klaarstaan: eigen troepen + eigen verse
// rekruten − wat hij al op pad heeft gestuurd.
export function beschikbaarPerSoort(p, i) {
  const vrij = { ...game.troops[i] };
  for (const o of orders()) {
    if (o.speler !== p) continue;
    if (o.type === 'rekruteer' && o.dst === i) vrij[o.unit]++;
    else if ((o.type === 'aanval' || o.type === 'verplaats') && o.src === i) {
      for (const k in o.troepen) vrij[k] -= o.troepen[k];
    }
  }
  return vrij;
}
export const beschikbaar = (p, i) => totaal(beschikbaarPerSoort(p, i));

// Wat er op de kaart getoond wordt. Een speler ziet zijn eigen verse rekruten
// al staan; anderen (en de wereld) zien de stand van vóór deze ronde.
export function weergaveTroepen(i, kijker) {
  let n = troepen(i);
  if (kijker == null) return n;
  for (const o of orders()) {
    if (o.speler === kijker && o.type === 'rekruteer' && o.dst === i) n++;
  }
  return n;
}

// Gebouwniveau inclusief wat deze speler zelf nog in de steigers heeft staan.
export function bouwNiveau(i, k, kijker) {
  let lvl = game.build[i][k];
  if (kijker == null) return lvl;
  for (const o of orders()) {
    if (o.speler === kijker && o.type === 'bouw' && o.dst === i && o.gebouw === k) lvl++;
  }
  return lvl;
}

export function bevelenVan(p) { return orders().filter((o) => o.speler === p); }

export function voegBevelToe(bevel) { orders().push(bevel); }

export function annuleerBevel(index) {
  const eigen = bevelenVan(game.cur);
  const doel = eigen[index];
  const i = orders().indexOf(doel);
  if (i >= 0) orders().splice(i, 1);
}

// Markeer spelers zonder land als uitgeschakeld.
export function werkUitschakelingBij() {
  game.players.forEach((pl, i) => { if (pl.alive && aantalLanden(i) === 0) pl.alive = false; });
}

// Alle troepen van een speler bij elkaar (tiebreak in de ranglijst).
export function totaalTroepen(p) {
  let n = 0;
  for (let i = 0; i < N; i++) if (game.owner[i] === p) n += totaal(game.troops[i]);
  return n;
}

// Spelers gerangschikt op veroverd gebied; gelijk = meeste troepen, dan goud.
export function ranglijst() {
  return game.players
    .map((pl, i) => ({ i, pl, landen: aantalLanden(i), troepen: totaalTroepen(i), goud: pl.goud }))
    .sort((a, b) => b.landen - a.landen || b.troepen - a.troepen || b.goud - a.goud);
}

// Is het spel afgelopen? Alleen aanroepen aan het EIND van een ronde (of bij
// uitschakeling), zodat iedereen precies even veel beurten heeft gehad — dat
// houdt het eerlijk ongeacht wie als eerste aan de beurt was.
// Geeft { klaar, reden, winnaar } met reden 'laatste' | 'overheersing' | 'rondes'.
export function spelKlaar(eindeVanRonde = false) {
  const levend = game.players.filter((p) => p.alive);
  if (levend.length <= 1) {
    const w = game.players.findIndex((p) => p.alive);
    return { klaar: true, reden: 'laatste', winnaar: w >= 0 ? w : ranglijst()[0].i };
  }
  if (!eindeVanRonde) return { klaar: false };

  const r = ranglijst();
  if (r[0].landen / N >= DOMINATION_SHARE) return { klaar: true, reden: 'overheersing', winnaar: r[0].i };
  // game.round is hier al opgehoogd naar de vólgende ronde; > betekent dus dat
  // ronde ROUND_LIMIT zojuist door iedereen is uitgespeeld.
  if (game.round > ROUND_LIMIT) return { klaar: true, reden: 'rondes', winnaar: r[0].i };
  return { klaar: false };
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
