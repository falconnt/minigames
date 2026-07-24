// main.js — de spelbesturing: koppelt kaart, invoer, fasen en UI aan elkaar.
import {
  game, setGame, save, loadSave, hasSave, clearSave,
  troepen, inkomen, werkUitschakelingBij, winnaar, volgendeSpeler,
  rekruteerKost,
} from './state.js';
import { neighbors, GEO } from './geo.js';
import { nieuwSpel } from './setup.js';
import { verwerkGevecht } from './combat.js';
import { UNIT_ORDER, UNITS, BUILDINGS } from './constants.js';
import { resize, fitWorld } from './view.js';
import { initInput } from './input.js';
import { draw } from './render.js';
import * as ui from './ui.js';
import { initPWA } from './pwa.js';

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');

// transient selectie-state
const sel = { info: -1, source: -1, targets: new Set() };
function clearSel() { sel.info = -1; sel.source = -1; sel.targets.clear(); }

// ---- render-lus -------------------------------------------------------------
function loop(t) {
  if (game) draw(ctx, t, sel);
  requestAnimationFrame(loop);
}

// ---- beurt / fasen ----------------------------------------------------------
function beginTurn(idx) {
  game.cur = idx;
  const inc = inkomen(idx);
  game.players[idx].goud += inc.totaal;
  game.lastIncome = inc;
  game.phase = 'bouwen';
  clearSel();
  save();
  ui.hideOverlay();
  ui.renderHUD();
  ui.renderPanel(sel);
}

function endTurn() {
  werkUitschakelingBij();
  const w = winnaar();
  save();
  if (w >= 0) { clearSave(); ui.showVictory(w); return; }
  const prev = game.cur;
  const next = volgendeSpeler();
  if (next <= prev) game.round++;
  game.cur = next;
  game.phase = 'bouwen';
  clearSel();
  save();
  ui.renderHUD();
  ui.showPass(next, () => beginTurn(next));
}

function nextTargets() {
  sel.targets.clear();
  if (sel.source < 0) return;
  const cur = game.cur;
  for (const j of neighbors(sel.source)) {
    if (game.phase === 'aanvallen' && game.owner[j] !== cur) sel.targets.add(j);
    if (game.phase === 'verschuiven' && game.owner[j] === cur) sel.targets.add(j);
  }
}

// ---- tik op de kaart --------------------------------------------------------
function handlePick(idx) {
  if (idx < 0) { // in zee getikt: alleen deselecteren in actiefasen
    if (game.phase !== 'bouwen') { sel.source = -1; sel.targets.clear(); }
    sel.info = -1;
    ui.renderPanel(sel);
    return;
  }
  const cur = game.cur;
  sel.info = idx;

  if (game.phase === 'bouwen') {
    // niets extra's; paneel toont bouw/rekruteer als het eigen land is
  } else if (game.phase === 'aanvallen') {
    if (sel.source >= 0 && sel.targets.has(idx)) {
      ui.attackDialog(sel.source, idx);
      return;
    }
    if (game.owner[idx] === cur && troepen(idx) >= 2) {
      sel.source = idx; nextTargets();
    } else if (game.owner[idx] === cur) {
      sel.source = idx; sel.targets.clear(); // eigen land zonder troepen om aan te vallen
    } else {
      sel.source = -1; sel.targets.clear();
    }
  } else if (game.phase === 'verschuiven') {
    if (sel.source >= 0 && sel.targets.has(idx)) {
      ui.moveDialog(sel.source, idx);
      return;
    }
    if (game.owner[idx] === cur && troepen(idx) >= 2) {
      sel.source = idx; nextTargets();
    } else {
      sel.source = -1; sel.targets.clear();
    }
  }
  ui.renderPanel(sel);
}

// ---- controller (aangeroepen vanuit de UI) ----------------------------------
const controller = {
  startGame(defs) {
    setGame(nieuwSpel(defs));
    fitWorld();
    save();
    // eerste beurt via pass-scherm zodat speler 1 ook "overneemt"
    ui.showPass(game.cur, () => beginTurn(game.cur));
  },
  resume() {
    const s = loadSave();
    if (!s) { ui.showSetup(); return; }
    setGame(s);
    fitWorld();
    ui.renderHUD();
    ui.showPass(game.cur, () => {
      ui.hideOverlay();
      ui.renderHUD();
      ui.renderPanel(sel);
    });
  },
  playAgain() { ui.showSetup(); },
  closeHelp() { if (game) ui.hideOverlay(); else ui.showSetup(); },
  cancelDialog() { ui.hideOverlay(); ui.renderPanel(sel); },
  fit() { fitWorld(); },

  onRecruit(k) {
    const i = sel.info, cur = game.cur;
    if (i < 0 || game.owner[i] !== cur) return;
    const kost = rekruteerKost(k, i);
    if (game.players[cur].goud < kost) return;
    game.players[cur].goud -= kost;
    game.troops[i][k]++;
    save(); ui.renderHUD(); ui.renderPanel(sel);
  },
  onBuild(k) {
    const i = sel.info, cur = game.cur;
    if (i < 0 || game.owner[i] !== cur) return;
    const b = game.build[i], lvl = b[k];
    if (lvl >= BUILDINGS[k].max) return;
    const kost = BUILDINGS[k].kost[lvl];
    if (game.players[cur].goud < kost) return;
    game.players[cur].goud -= kost;
    b[k]++;
    save(); ui.renderHUD(); ui.renderPanel(sel);
  },
  onEndPhase() {
    if (game.phase === 'bouwen') { game.phase = 'aanvallen'; clearSel(); }
    else if (game.phase === 'aanvallen') { game.phase = 'verschuiven'; clearSel(); }
    else { endTurn(); return; }
    save(); ui.renderHUD(); ui.renderPanel(sel);
  },

  confirmAttack(src, dst, commit) {
    const cur = game.cur;
    const totalCommit = commit.inf + commit.cav + commit.art;
    if (totalCommit < 1 || totalCommit > troepen(src) - 1) { ui.hideOverlay(); ui.renderPanel(sel); return; }
    for (const k of UNIT_ORDER) game.troops[src][k] -= commit[k];

    const def = { ...game.troops[dst] };
    const fort = game.build[dst].fort;
    const res = verwerkGevecht(commit, def, fort);

    if (res.winnaar === 'att') {
      game.owner[dst] = cur;
      game.troops[dst] = { ...res.att };
      game.build[dst].fort = 0; // fort verwoest bij verovering
      ui.toast(`✅ ${naam(dst)} veroverd! <span class="tl">Verlies: ${verliesTekst(res.verliesAtt)}</span>`);
    } else {
      game.troops[dst] = { ...res.def };
      ui.toast(`❌ Aanval op ${naam(dst)} afgeslagen. <span class="tl">Verdediger over: ${troepen(dst)}</span>`);
    }

    werkUitschakelingBij();
    save();
    const w = winnaar();
    if (w >= 0) { clearSave(); ui.hideOverlay(); ui.showVictory(w); return; }

    // bron behouden als er nog aanvalskracht is
    if (troepen(src) >= 2) { sel.source = src; nextTargets(); }
    else { sel.source = -1; sel.targets.clear(); }
    sel.info = sel.source >= 0 ? src : dst;
    ui.hideOverlay(); ui.renderHUD(); ui.renderPanel(sel);
  },

  confirmMove(src, dst, commit) {
    const total = commit.inf + commit.cav + commit.art;
    if (total < 1 || total > troepen(src) - 1) { ui.hideOverlay(); ui.renderPanel(sel); return; }
    for (const k of UNIT_ORDER) { game.troops[src][k] -= commit[k]; game.troops[dst][k] += commit[k]; }
    ui.toast(`➜ ${total} troepen verplaatst naar ${naam(dst)}.`);
    if (troepen(src) >= 2) { sel.source = src; nextTargets(); }
    else { sel.source = -1; sel.targets.clear(); }
    sel.info = sel.source >= 0 ? src : dst;
    save(); ui.hideOverlay(); ui.renderHUD(); ui.renderPanel(sel);
  },
};

function naam(i) { return GEO[i].name; }
function verliesTekst(v) {
  const p = UNIT_ORDER.filter((k) => v[k] > 0).map((k) => `${v[k]} ${UNITS[k].kort}`);
  return p.length ? p.join(', ') : 'geen';
}

// ---- opstart ----------------------------------------------------------------
function boot() {
  resize(canvas);
  initInput(canvas, { onTap: handlePick });
  ui.bindUI(controller);
  initPWA();
  requestAnimationFrame(loop);
  if (hasSave()) controller.resume();
  else ui.showSetup();
}
boot();
