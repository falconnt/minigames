// main.js — de spelbesturing.
//
// Het spel draait op GELIJKTIJDIGE beurten: elke speler plant in het geheim
// zijn zetten en geeft de telefoon door. Pas als iedereen klaar is, gaat de
// telefoon in het midden en worden alle bevelen tegelijk uitgevoerd. Daardoor
// heeft niemand voordeel van "eerder aan de beurt zijn".
import {
  game, setGame, save, loadSave, hasSave, clearSave,
  inkomen, werkUitschakelingBij, spelKlaar, volgendeSpeler,
  rekruteerKost, orders, bevelenVan, voegBevelToe, annuleerBevel, beschikbaar,
  bouwNiveau,
} from './state.js';
import { neighbors, GEO } from './geo.js';
import { nieuwSpel } from './setup.js';
import { bereken } from './resolve.js';
import { UNIT_ORDER, BUILDINGS, PLAYER_COLORS } from './constants.js';
import { resize, fitWorld, clamp, view, project } from './view.js';
import { initInput } from './input.js';
import { draw } from './render.js';
import * as fx from './fx.js';
import * as ui from './ui.js';
import { initPWA } from './pwa.js';

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');

// transient selectie-state
const sel = { info: -1, source: -1, targets: new Set() };
function clearSel() { sel.info = -1; sel.source = -1; sel.targets.clear(); }

let bezigMetResolutie = false;

// ---- render-lus -------------------------------------------------------------
function loop(t) {
  if (game) {
    fx.werkCameraBij(clamp);
    // Tijdens het plannen tonen we alleen de bevelen van de speler zelf; bij de
    // resolutie kijkt iedereen mee en is niets meer geheim.
    const zichtbareBevelen = bezigMetResolutie ? [] : bevelenVan(game.cur);
    draw(ctx, t, sel, zichtbareBevelen, bezigMetResolutie ? null : game.cur);
  }
  requestAnimationFrame(loop);
}

const spelerHex = (p) => PLAYER_COLORS[game.players[p].kleurIdx].hex;
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- beurten (plannen) ------------------------------------------------------
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

  fx.clearFx();
  const eigen = [];
  for (let i = 0; i < GEO.length; i++) if (game.owner[i] === idx) eigen.push(i);
  if (eigen.length) {
    zorgDatZichtbaarIs(eigen[0]);
    eigen.slice(0, 6).forEach((i, k) =>
      fx.zweef(i, `+${Math.round(inc.totaal / Math.min(eigen.length, 6))}`, '#ffd85b', 120 + k * 90));
  }
}

// Klaar met plannen: door naar de volgende speler, of alles uitvoeren.
function klaarMetPlannen() {
  const prev = game.cur;
  const next = volgendeSpeler();
  clearSel();

  // Iedereen is langs geweest zodra we weer bij de eerste levende speler zijn.
  if (next <= prev) {
    save();
    // Vanaf hier kijkt iedereen mee: verberg de pijlen van de laatste planner
    // tot de uitvoering ze voor iedereen tegelijk laat zien.
    bezigMetResolutie = true;
    ui.showResolutieStart(orders().length, () => voerUit());
    return;
  }
  game.cur = next;
  game.phase = 'bouwen';
  save();
  ui.renderHUD();
  ui.showPass(next, () => beginTurn(next));
}

// ---- resolutie: alle bevelen tegelijk ---------------------------------------
function pasToe(ev) {
  if (ev.type === 'opbouw') {
    for (const it of ev.items) {
      if (it.soort === 'rekruteer') game.troops[it.dst][it.unit]++;
      else game.build[it.dst][it.gebouw]++;
    }
  } else if (ev.type === 'vertrek') {
    for (const it of ev.items) {
      for (const k of UNIT_ORDER) game.troops[it.src][k] -= it.troepen[k];
    }
  } else if (ev.type === 'versterking' || ev.type === 'aankomst') {
    game.troops[ev.dst] = { ...ev.naTroepen };
  } else if (ev.type === 'gevecht') {
    game.troops[ev.dst] = { ...ev.naTroepen };
    game.owner[ev.dst] = ev.naEigenaar;
    if (ev.gelukt) game.build[ev.dst].fort = 0;
  }
}

let snelDoor = false;

async function voerUit() {
  bezigMetResolutie = true;
  const { script } = bereken(game, orders());
  snelDoor = false;
  ui.startResolutieWeergave(() => { snelDoor = true; });

  const wacht = async (ms) => { await slaap(snelDoor ? Math.min(90, ms * 0.15) : ms); };

  for (const ev of script) {
    if (ev.type === 'opbouw') {
      ui.resolutieTekst('Rekruten melden zich en gebouwen komen gereed…');
      pasToe(ev);
      for (const it of ev.items) {
        fx.zweef(it.dst, it.soort === 'rekruteer' ? '+1' : '🏗', spelerHex(it.speler));
      }
      await wacht(750);
    } else if (ev.type === 'vertrek') {
      ui.resolutieTekst('Alle legers vertrekken tegelijk…');
      pasToe(ev);
      for (const it of ev.items) {
        const hex = spelerHex(it.speler);
        if (it.soort === 'aanval') fx.mars(it.src, it.dst, hex, false);
        else fx.verplaatsing(it.src, it.dst, hex);
      }
      await wacht(1150);
    } else if (ev.type === 'versterking' || ev.type === 'aankomst') {
      pasToe(ev);
      fx.zweef(ev.dst, `+${ev.troepen.inf + ev.troepen.cav + ev.troepen.art}`, spelerHex(ev.speler));
      await wacht(280);
    } else if (ev.type === 'dobbel') {
      zorgDatZichtbaarIs(ev.dst);
      ui.resolutieTekst(`Botsing om ${GEO[ev.dst].name}!`);
      await ui.toonDobbel(ev, GEO[ev.dst].name, game, snelDoor);
      await wacht(200);
    } else if (ev.type === 'gevecht') {
      const hex = spelerHex(ev.speler);
      zorgDatZichtbaarIs(ev.dst);
      ui.resolutieTekst(`${game.players[ev.speler].naam} valt ${GEO[ev.dst].name} aan`);
      fx.inslag(ev.dst, hex, ev.gelukt);
      await wacht(420);
      pasToe(ev);
      if (ev.gelukt) {
        fx.verovering(ev.dst, hex);
        ui.toast(`✅ ${game.players[ev.speler].naam} verovert ${GEO[ev.dst].name}`);
      } else {
        fx.schok(ev.dst, '#ff5a4d');
        fx.zweef(ev.dst, 'afgeslagen', '#ff9a8f');
        ui.toast(`🛡️ ${GEO[ev.dst].name} houdt stand tegen ${game.players[ev.speler].naam}`);
      }
      await wacht(700);
    }
  }

  // ronde afronden
  game.orders = [];
  werkUitschakelingBij();
  ui.stopResolutieWeergave();
  bezigMetResolutie = false;

  game.round++;
  const einde = spelKlaar(true);
  if (einde.klaar) { finish(einde); return; }

  // eerste levende speler begint de nieuwe ronde
  let eerste = game.players.findIndex((p) => p.alive);
  game.cur = eerste;
  game.phase = 'bouwen';
  clearSel();
  save();
  ui.renderHUD();
  ui.showPass(eerste, () => beginTurn(eerste));
}

function finish(res) {
  game.winner = res.winnaar;
  clearSave();
  ui.hideOverlay();
  fx.clearFx();
  ui.showVictory(res.winnaar, res.reden);
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
  if (bezigMetResolutie) return;      // tijdens de uitvoering kijkt iedereen mee
  if (idx < 0) {
    if (game.phase !== 'bouwen') { sel.source = -1; sel.targets.clear(); }
    sel.info = -1;
    ui.renderPanel(sel);
    return;
  }
  const cur = game.cur;
  sel.info = idx;

  if (game.phase === 'aanvallen') {
    if (sel.source >= 0 && sel.targets.has(idx)) { ui.attackDialog(sel.source, idx); return; }
    if (game.owner[idx] === cur && beschikbaar(cur, idx) >= 2) { sel.source = idx; nextTargets(); }
    else if (game.owner[idx] === cur) { sel.source = idx; sel.targets.clear(); }
    else { sel.source = -1; sel.targets.clear(); }
  } else if (game.phase === 'verschuiven') {
    if (sel.source >= 0 && sel.targets.has(idx)) { ui.moveDialog(sel.source, idx); return; }
    if (game.owner[idx] === cur && beschikbaar(cur, idx) >= 2) { sel.source = idx; nextTargets(); }
    else { sel.source = -1; sel.targets.clear(); }
  }
  ui.renderPanel(sel);
}

// Beweeg de camera alleen als het land bijna of helemaal buiten beeld valt.
function zorgDatZichtbaarIs(land) {
  const [x, y] = project(GEO[land].cx, GEO[land].cy);
  const marge = 0.18;
  const buiten = x < view.W * marge || x > view.W * (1 - marge)
    || y < view.H * marge || y > view.H * (1 - marge);
  if (buiten) fx.vliegNaar(land, view.W, view.H);
}

const naam = (i) => GEO[i].name;

// ---- controller (aangeroepen vanuit de UI) ----------------------------------
const controller = {
  startGame(defs) {
    setGame(nieuwSpel(defs));
    fitWorld();
    save();
    ui.showPass(game.cur, () => beginTurn(game.cur));
  },
  resume() {
    const s = loadSave();
    if (!s) { ui.showSetup(); return; }
    setGame(s);
    fitWorld();
    ui.renderHUD();
    ui.showPass(game.cur, () => {
      ui.hideOverlay(); ui.renderHUD(); ui.renderPanel(sel);
    });
  },
  playAgain() { ui.showSetup(); },
  closeHelp() { if (game) ui.hideOverlay(); else ui.showSetup(); },
  cancelDialog() { ui.hideOverlay(); ui.renderPanel(sel); },
  fit() { fitWorld(); },

  // Rekruteren en bouwen zijn óók bevelen: het goud gaat er meteen af (dat is
  // privé), maar op de kaart verschijnt het pas bij de gezamenlijke uitvoering.
  onRecruit(k) {
    const i = sel.info, cur = game.cur;
    if (i < 0 || game.owner[i] !== cur) return;
    const kost = rekruteerKost(k, i, cur);
    if (game.players[cur].goud < kost) return;
    game.players[cur].goud -= kost;
    voegBevelToe({ speler: cur, type: 'rekruteer', dst: i, unit: k, kost });
    save(); ui.renderHUD(); ui.renderPanel(sel);
  },
  onBuild(k) {
    const i = sel.info, cur = game.cur;
    if (i < 0 || game.owner[i] !== cur) return;
    const lvl = bouwNiveau(i, k, cur);
    if (lvl >= BUILDINGS[k].max) return;
    const kost = BUILDINGS[k].kost[lvl];
    if (game.players[cur].goud < kost) return;
    game.players[cur].goud -= kost;
    voegBevelToe({ speler: cur, type: 'bouw', dst: i, gebouw: k, kost });
    save(); ui.renderHUD(); ui.renderPanel(sel);
  },
  onEndPhase() {
    if (game.phase === 'bouwen') { game.phase = 'aanvallen'; clearSel(); }
    else if (game.phase === 'aanvallen') { game.phase = 'verschuiven'; clearSel(); }
    else { klaarMetPlannen(); return; }
    save(); ui.renderHUD(); ui.renderPanel(sel);
  },

  // Een aanval wordt nu GEPLAND, niet meteen uitgevoerd.
  confirmAttack(src, dst, commit) {
    const cur = game.cur;
    const n = commit.inf + commit.cav + commit.art;
    if (n < 1 || n > beschikbaar(cur, src) - 1) { ui.hideOverlay(); ui.renderPanel(sel); return; }
    voegBevelToe({ speler: cur, type: 'aanval', src, dst, troepen: { ...commit } });
    ui.toast(`⚔ Aanval op ${naam(dst)} ingepland <span class="tl">(${n} troepen)</span>`);
    if (beschikbaar(cur, src) >= 2) { sel.source = src; nextTargets(); }
    else { sel.source = -1; sel.targets.clear(); }
    sel.info = src;
    save(); ui.hideOverlay(); ui.renderHUD(); ui.renderPanel(sel);
  },

  confirmMove(src, dst, commit) {
    const cur = game.cur;
    const n = commit.inf + commit.cav + commit.art;
    if (n < 1 || n > beschikbaar(cur, src) - 1) { ui.hideOverlay(); ui.renderPanel(sel); return; }
    voegBevelToe({ speler: cur, type: 'verplaats', src, dst, troepen: { ...commit } });
    ui.toast(`➜ Verplaatsing naar ${naam(dst)} ingepland <span class="tl">(${n} troepen)</span>`);
    if (beschikbaar(cur, src) >= 2) { sel.source = src; nextTargets(); }
    else { sel.source = -1; sel.targets.clear(); }
    sel.info = src;
    save(); ui.hideOverlay(); ui.renderHUD(); ui.renderPanel(sel);
  },

  onCancelOrder(i) {
    const bevel = bevelenVan(game.cur)[i];
    if (bevel && bevel.kost) game.players[game.cur].goud += bevel.kost;  // geld terug
    annuleerBevel(i);
    if (sel.source >= 0) nextTargets();
    save(); ui.renderHUD(); ui.renderPanel(sel);
  },
};

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
