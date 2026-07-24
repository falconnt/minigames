// ui.js — alle schermen en panelen (DOM). Leest de spelstand en roept de
// besturing (controller) aan voor acties. Bevat geen spelregels.
import {
  game, troepen, aantalLanden, rekruteerKost, hasSave,
} from './state.js';
import { GEO } from './geo.js';
import {
  PLAYER_COLORS, NEUTRAL, UNITS, UNIT_ORDER, BUILDINGS, BUILDING_ORDER,
  CONTINENT_NL,
} from './constants.js';

let C = null;
const el = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[<>&]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[m]));

export function bindUI(controller) {
  C = controller;
  el('helpBtn').addEventListener('click', showHelp);
  el('menuBtn').addEventListener('click', showMenu);
}

// ---- kleuren & namen --------------------------------------------------------
export const spelerKleur = (p) => PLAYER_COLORS[game.players[p].kleurIdx].hex;
const eigenaarKleur = (i) => (game.owner[i] < 0 ? NEUTRAL : spelerKleur(game.owner[i]));
const eigenaarNaam = (i) => (game.owner[i] < 0 ? 'Neutraal' : game.players[game.owner[i]].naam);

// ---- HUD --------------------------------------------------------------------
export function renderHUD() {
  const p = game.players[game.cur];
  const hex = spelerKleur(game.cur);
  el('turnPill').style.background = hex;
  el('turnPill').textContent = p.naam;
  el('goldVal').textContent = '⬤ ' + p.goud;
  el('goldVal').style.color = '#ffd85b';
  el('roundVal').textContent = 'R' + game.round + ' · ' + aantalLanden(game.cur) + ' 🚩';
  const kort = { bouwen: 'Bouwen', aanvallen: 'Veroveren', verschuiven: 'Verschuiven' };
  const phases = ['bouwen', 'aanvallen', 'verschuiven'];
  el('phaseBar').innerHTML = phases.map((ph) =>
    `<span class="ph ${ph === game.phase ? 'on' : ''}">${kort[ph]}</span>`).join('<span class="sep">▸</span>');
}

// ---- landinfo-regel ---------------------------------------------------------
function troepLabel(t) {
  return UNIT_ORDER.filter((k) => t[k] > 0).map((k) => `${t[k]} ${UNITS[k].kort}`).join(' · ') || '0';
}
function bouwLabel(b) {
  const parts = BUILDING_ORDER.filter((k) => b[k] > 0).map((k) => `${BUILDINGS[k].naam} ${b[k]}`);
  return parts.length ? parts.join(' · ') : '—';
}
function landInfoHTML(i) {
  if (i < 0) return '';
  const t = game.troops[i], b = game.build[i];
  return `<div class="land">
    <div class="landkop"><span class="dot" style="background:${eigenaarKleur(i)}"></span>
      <b>${esc(GEO[i].name)}</b> <span class="muted">· ${CONTINENT_NL[GEO[i].cont] || GEO[i].cont}</span></div>
    <div class="landsub"><span>${eigenaarNaam(i)}</span> · ${troepen(i)} troepen (${troepLabel(t)}) · Gebouwen: ${bouwLabel(b)}</div>
  </div>`;
}

// ---- onderpaneel per fase ---------------------------------------------------
export function renderPanel(sel) {
  const box = el('panel');
  const cur = game.cur;
  let html = '';

  if (game.phase === 'bouwen') {
    const inc = game.lastIncome;
    if (inc) {
      const extra = [];
      if (inc.markt) extra.push(`markten +${inc.markt}`);
      if (inc.cont) extra.push(`continenten +${inc.cont}`);
      html += `<div class="hint">💰 Inkomen ontvangen: <b>+${inc.totaal} goud</b>${extra.length ? ' (' + extra.join(', ') + ')' : ''}.</div>`;
    }
    const i = sel.info;
    if (i >= 0 && game.owner[i] === cur) {
      html += landInfoHTML(i);
      html += `<div class="grp"><div class="grptitel">Rekruteren <span class="muted">(in ${esc(GEO[i].name)})</span></div><div class="btns">`;
      for (const k of UNIT_ORDER) {
        const kost = rekruteerKost(k, i);
        const kan = game.players[cur].goud >= kost;
        html += `<button class="act" data-recruit="${k}" ${kan ? '' : 'disabled'}>
          <b>${UNITS[k].naam}</b><span>⬤ ${kost}</span></button>`;
      }
      html += `</div></div>`;
      html += `<div class="grp"><div class="grptitel">Bouwen</div><div class="btns">`;
      for (const k of BUILDING_ORDER) {
        const lvl = game.build[i][k], max = BUILDINGS[k].max;
        const done = lvl >= max;
        const kost = done ? 0 : BUILDINGS[k].kost[lvl];
        const kan = !done && game.players[cur].goud >= kost;
        html += `<button class="act" data-build="${k}" ${kan ? '' : 'disabled'} title="${BUILDINGS[k].info}">
          <b>${BUILDINGS[k].naam} ${done ? 'MAX' : '→' + (lvl + 1)}</b><span>${done ? '—' : '⬤ ' + kost}</span></button>`;
      }
      html += `</div></div>`;
    } else {
      html += `<div class="hint">Tik op <b>je eigen land</b> om daar te rekruteren of te bouwen.</div>`;
      if (i >= 0) html += landInfoHTML(i);
    }
    html += footer('Klaar met bouwen ▸');
  } else if (game.phase === 'aanvallen') {
    if (sel.source >= 0) {
      html += `<div class="hint">Tik een <b style="color:#ffe06e">geel gemarkeerd</b> buurland om aan te vallen vanuit ${esc(GEO[sel.source].name)} (${troepen(sel.source)} troepen).</div>`;
      html += landInfoHTML(sel.source);
    } else {
      html += `<div class="hint">Tik op <b>je eigen land met ≥2 troepen</b> om vandaar aan te vallen.</div>`;
      if (sel.info >= 0) html += landInfoHTML(sel.info);
    }
    html += footer('Klaar met veroveren ▸');
  } else if (game.phase === 'verschuiven') {
    if (sel.source >= 0) {
      html += `<div class="hint">Tik een <b style="color:#ffe06e">gemarkeerd eigen buurland</b> om troepen te verplaatsen vanuit ${esc(GEO[sel.source].name)}.</div>`;
      html += landInfoHTML(sel.source);
    } else {
      html += `<div class="hint">Verplaats troepen: tik je eigen land (≥2 troepen), daarna een aangrenzend eigen land. Of beëindig je beurt.</div>`;
      if (sel.info >= 0) html += landInfoHTML(sel.info);
    }
    html += footer('Beurt beëindigen ▸');
  }

  box.innerHTML = html;
  box.querySelectorAll('[data-recruit]').forEach((b) =>
    b.addEventListener('click', () => C.onRecruit(b.dataset.recruit)));
  box.querySelectorAll('[data-build]').forEach((b) =>
    b.addEventListener('click', () => C.onBuild(b.dataset.build)));
  const f = box.querySelector('[data-end]');
  if (f) f.addEventListener('click', () => C.onEndPhase());
}
const footer = (label) => `<div class="foot"><button class="prim" data-end>${label}</button></div>`;

// ---- overlays ---------------------------------------------------------------
function overlay(html, cls = '') {
  const o = el('overlay');
  o.className = 'show ' + cls;
  o.innerHTML = `<div class="sheet">${html}</div>`;
  return o;
}
export function hideOverlay() { el('overlay').className = ''; el('overlay').innerHTML = ''; }

// In-game menu (of het startscherm als er nog geen spel loopt)
export function showMenu() {
  if (!game) { showSetup(); return; }
  overlay(`
    <h2>Menu</h2>
    <div class="menucol">
      <button class="prim" id="mResume">▸ Verder spelen</button>
      <button class="ghost" id="mFit">🌍 Hele wereld tonen</button>
      <button class="ghost" id="mHelp">❔ Hoe werkt het?</button>
      <button class="ghost" id="mNew">🔄 Nieuw spel</button>
    </div>`, 'menu');
  el('mResume').addEventListener('click', () => hideOverlay());
  el('mFit').addEventListener('click', () => { hideOverlay(); C.fit(); });
  el('mHelp').addEventListener('click', showHelp);
  el('mNew').addEventListener('click', () => showSetup());
}

export function showSetup() {
  const defs = window.__setupDefs || (window.__setupDefs = [
    { naam: 'Speler 1', kleurIdx: 0 }, { naam: 'Speler 2', kleurIdx: 1 },
  ]);
  function render() {
    let rows = defs.map((d, i) => {
      const sw = PLAYER_COLORS.map((c, ci) =>
        `<button class="sw ${d.kleurIdx === ci ? 'on' : ''}" style="background:${c.hex}" data-p="${i}" data-c="${ci}"></button>`).join('');
      return `<div class="prow">
        <input class="pname" data-p="${i}" value="${esc(d.naam)}" maxlength="14"/>
        <div class="sws">${sw}</div>
        ${defs.length > 2 ? `<button class="rm" data-rm="${i}">✕</button>` : ''}
      </div>`;
    }).join('');
    const canAdd = defs.length < 6;
    const o = overlay(`
      <h1>🌍 Wereldverovering</h1>
      <p class="sub">Verover de wereld — speel om de beurt op één telefoon.</p>
      ${hasSave() ? `<button class="prim big" id="resumeG">▸ Verder met opgeslagen spel</button>` : ''}
      <div class="players">${rows}</div>
      ${canAdd ? `<button class="ghost" id="addP">+ Speler toevoegen</button>` : ''}
      <button class="prim big" id="startG">Start nieuw spel</button>
      <button class="ghost" id="helpG">Hoe werkt het?</button>
    `, 'menu');
    const res = el('resumeG');
    if (res) res.addEventListener('click', () => C.resume());
    o.querySelectorAll('.pname').forEach((inp) =>
      inp.addEventListener('input', () => { defs[+inp.dataset.p].naam = inp.value; }));
    o.querySelectorAll('.sw').forEach((b) => b.addEventListener('click', () => {
      const pi = +b.dataset.p, ci = +b.dataset.c;
      const other = defs.findIndex((d) => d.kleurIdx === ci);
      if (other >= 0 && other !== pi) defs[other].kleurIdx = defs[pi].kleurIdx; // wissel
      defs[pi].kleurIdx = ci; render();
    }));
    o.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => {
      defs.splice(+b.dataset.rm, 1); render();
    }));
    const add = el('addP');
    if (add) add.addEventListener('click', () => {
      const used = new Set(defs.map((d) => d.kleurIdx));
      let ci = 0; while (used.has(ci)) ci++;
      defs.push({ naam: 'Speler ' + (defs.length + 1), kleurIdx: ci }); render();
    });
    el('startG').addEventListener('click', () => {
      defs.forEach((d, i) => { if (!d.naam.trim()) d.naam = 'Speler ' + (i + 1); });
      C.startGame(defs.map((d) => ({ ...d })));
    });
    el('helpG').addEventListener('click', showHelp);
  }
  render();
}

export function showPass(idx, onReady) {
  const p = game.players[idx];
  const hex = spelerKleur(idx);
  overlay(`
    <div class="passcard" style="--c:${hex}">
      <div class="passdot" style="background:${hex}"></div>
      <h2>Geef de telefoon aan</h2>
      <div class="passnaam" style="color:${hex}">${esc(p.naam)}</div>
      <p class="sub">Ronde ${game.round} · ${aantalLanden(idx)} landen · ⬤ ${p.goud} goud</p>
      <button class="prim big" id="passGo">Ik ben er klaar voor</button>
    </div>`, 'pass');
  el('passGo').addEventListener('click', onReady);
}

export function showVictory(idx) {
  const p = game.players[idx];
  const hex = spelerKleur(idx);
  overlay(`
    <h1>🏆 ${esc(p.naam)} wint!</h1>
    <p class="sub" style="color:${hex}">De wereld is veroverd na ${game.round} ronden.</p>
    <div class="passdot" style="background:${hex};margin:14px auto"></div>
    <button class="prim big" id="againG">Nieuw spel</button>
  `, 'menu');
  el('againG').addEventListener('click', () => C.playAgain());
}

export function showHelp() {
  overlay(`
    <h2>Hoe werkt Wereldverovering?</h2>
    <div class="help">
      <p><b>Doel:</b> verover de wereld. Je wint als je alle tegenstanders uitschakelt of ${Math.round(0.6 * 100)}% van alle landen bezit.</p>
      <p><b>Elke beurt (3 fasen):</b></p>
      <ol>
        <li><b>Bouwen &amp; rekruteren</b> — je krijgt goud van je landen. Koop eenheden (in een eigen land) en bouw <b>markt</b> (goud), <b>kazerne</b> (goedkoper rekruteren) of <b>fort</b> (verdediging).</li>
        <li><b>Veroveren</b> — tik je eigen land (≥2 troepen), dan een geel buurland om aan te vallen. Kies hoeveel troepen je meestuurt.</li>
        <li><b>Verschuiven</b> — verplaats troepen tussen aangrenzende eigen landen. Daarna eindigt je beurt.</li>
      </ol>
      <p><b>Eenheden (steen-papier-schaar):</b> Infanterie ▸ Artillerie ▸ Cavalerie ▸ Infanterie. Elke soort is sterker tegen de soort die hij verslaat.</p>
      <p><b>Kaart:</b> sleep om te bewegen, knijp of scroll om te zoomen. Cijfers zijn het aantal troepen; stippen onder een land zijn gebouwen.</p>
    </div>
    <button class="prim" id="closeHelp">Sluiten</button>
  `, 'menu');
  el('closeHelp').addEventListener('click', () => C.closeHelp());
}

// ---- aanval-dialoog ---------------------------------------------------------
function stepperDialog({ title, src, dst, kleurBron, actie, actieLabel, defenderInfo }) {
  const t = game.troops[src];
  const totaal = troepen(src);
  // standaard: stuur alles behalve 1 mee
  const commit = { inf: t.inf, cav: t.cav, art: t.art };
  let over = 1;
  for (const k of UNIT_ORDER) { while (over > 0 && commit[k] > 0) { commit[k]--; over--; } if (over === 0) break; }

  function sum(o) { return o.inf + o.cav + o.art; }
  function render() {
    const rows = UNIT_ORDER.filter((k) => t[k] > 0).map((k) => `
      <div class="srow">
        <span class="sname">${UNITS[k].naam}</span>
        <span class="smax">van ${t[k]}</span>
        <div class="sctl">
          <button class="sbtn" data-d="${k}">−</button>
          <span class="sval" data-v="${k}">${commit[k]}</span>
          <button class="sbtn" data-i="${k}">+</button>
        </div>
      </div>`).join('');
    overlay(`
      <h2>${title}</h2>
      <div class="dinfo">
        <div><span class="dot" style="background:${kleurBron}"></span> ${esc(GEO[src].name)} · ${totaal} troepen</div>
        <div class="muted">${defenderInfo}</div>
      </div>
      ${rows}
      <div class="dsum">Meesturen: <b data-total>${sum(commit)}</b> troepen <span class="muted">(minstens 1 blijft achter)</span></div>
      <div class="drow">
        <button class="ghost" id="dCancel">Annuleren</button>
        <button class="prim" id="dGo">${actieLabel}</button>
      </div>
    `, 'dialog');
    const o = el('overlay');
    const refresh = () => {
      UNIT_ORDER.forEach((k) => { const v = o.querySelector(`[data-v="${k}"]`); if (v) v.textContent = commit[k]; });
      o.querySelector('[data-total]').textContent = sum(commit);
    };
    o.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.i; if (commit[k] < t[k] && sum(commit) < totaal - 1) { commit[k]++; refresh(); }
    }));
    o.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.d; if (commit[k] > 0) { commit[k]--; refresh(); }
    }));
    o.querySelector('#dCancel').addEventListener('click', () => C.cancelDialog());
    o.querySelector('#dGo').addEventListener('click', () => {
      if (sum(commit) < 1) return;
      actie({ ...commit });
    });
  }
  render();
}

export function attackDialog(src, dst) {
  const d = game.troops[dst], b = game.build[dst];
  const dinfo = `Verdediger: <b>${eigenaarNaam(dst)}</b> · ${troepen(dst)} troepen${b.fort ? ` · Fort ${b.fort}` : ''}`;
  stepperDialog({
    title: '⚔ Aanval op ' + esc(GEO[dst].name),
    src, dst, kleurBron: eigenaarKleur(src),
    defenderInfo: dinfo,
    actieLabel: 'Aanvallen!',
    actie: (commit) => C.confirmAttack(src, dst, commit),
  });
}

export function moveDialog(src, dst) {
  stepperDialog({
    title: '➜ Verplaats naar ' + esc(GEO[dst].name),
    src, dst, kleurBron: eigenaarKleur(src),
    defenderInfo: `Naar eigen land · nu ${troepen(dst)} troepen`,
    actieLabel: 'Verplaatsen',
    actie: (commit) => C.confirmMove(src, dst, commit),
  });
}

// ---- resultaat-toast --------------------------------------------------------
let toastT = 0;
export function toast(msg, ms = 2600) {
  const t = el('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), ms);
}
