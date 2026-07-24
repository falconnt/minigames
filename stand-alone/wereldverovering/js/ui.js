// ui.js — alle schermen en panelen (DOM). Leest de spelstand en roept de
// besturing (controller) aan voor acties. Bevat geen spelregels.
import {
  game, troepen, aantalLanden, rekruteerKost, hasSave, ranglijst,
  bevelenVan, beschikbaar, beschikbaarPerSoort, weergaveTroepen, bouwNiveau,
} from './state.js';
import { GEO, N } from './geo.js';
import {
  PLAYER_COLORS, NEUTRAL, UNITS, UNIT_ORDER, BUILDINGS, BUILDING_ORDER,
  CONTINENT_NL, ROUND_LIMIT, DOMINATION_SHARE,
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
  const laatste = game.round >= ROUND_LIMIT;
  el('roundVal').textContent = `R${game.round}/${ROUND_LIMIT} · ${aantalLanden(game.cur)} 🚩`;
  el('roundVal').classList.toggle('final', laatste);
  el('roundVal').title = laatste ? 'Laatste ronde! Wie de meeste landen heeft, wint.' : '';
  const kort = { bouwen: 'Bouwen', aanvallen: 'Aanvallen', verschuiven: 'Verplaatsen' };
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
  const eigen = game.owner[i] === game.cur;
  const t = eigen ? beschikbaarPerSoort(game.cur, i) : game.troops[i];
  const b = eigen
    ? Object.fromEntries(BUILDING_ORDER.map((k) => [k, bouwNiveau(i, k, game.cur)]))
    : game.build[i];
  return `<div class="land">
    <div class="landkop"><span class="dot" style="background:${eigenaarKleur(i)}"></span>
      <b>${esc(GEO[i].name)}</b> <span class="muted">· ${CONTINENT_NL[GEO[i].cont] || GEO[i].cont}</span></div>
    <div class="landsub"><span>${eigenaarNaam(i)}</span> · ${eigen ? beschikbaar(game.cur, i) + ' vrij' : troepen(i) + ' troepen'} (${troepLabel(t)}) · Gebouwen: ${bouwLabel(b)}</div>
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
        const kost = rekruteerKost(k, i, cur);
        const kan = game.players[cur].goud >= kost;
        html += `<button class="act" data-recruit="${k}" ${kan ? '' : 'disabled'}>
          <b>${UNITS[k].naam}</b><span>⬤ ${kost}</span></button>`;
      }
      html += `</div></div>`;
      html += `<div class="grp"><div class="grptitel">Bouwen</div><div class="btns">`;
      for (const k of BUILDING_ORDER) {
        const lvl = bouwNiveau(i, k, cur), max = BUILDINGS[k].max;
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
    html += bevelenHTML();
    html += footer('Klaar met bouwen ▸');
  } else if (game.phase === 'aanvallen') {
    if (sel.source >= 0) {
      html += `<div class="hint">Tik een <b style="color:#ffe06e">geel gemarkeerd</b> buurland om een aanval te plannen vanuit ${esc(GEO[sel.source].name)} <span class="muted">(${beschikbaar(cur, sel.source)} vrij)</span>.</div>`;
      html += landInfoHTML(sel.source);
    } else {
      html += `<div class="hint">Plan je aanvallen: tik <b>je eigen land met ≥2 vrije troepen</b>, daarna een buurland. Alles wordt straks <b>tegelijk</b> uitgevoerd.</div>`;
      if (sel.info >= 0) html += landInfoHTML(sel.info);
    }
    html += bevelenHTML();
    html += footer('Klaar met aanvallen ▸');
  } else if (game.phase === 'verschuiven') {
    if (sel.source >= 0) {
      html += `<div class="hint">Tik een <b style="color:#ffe06e">gemarkeerd eigen buurland</b> om troepen te verplaatsen vanuit ${esc(GEO[sel.source].name)} <span class="muted">(${beschikbaar(cur, sel.source)} vrij)</span>.</div>`;
      html += landInfoHTML(sel.source);
    } else {
      html += `<div class="hint">Verplaats troepen tussen eigen landen. Versterkingen komen aan <b>vóór</b> de gevechten, dus hiermee kun je verdedigen.</div>`;
      if (sel.info >= 0) html += landInfoHTML(sel.info);
    }
    html += bevelenHTML();
    html += footer('Klaar — geef door ▸');
  }

  box.innerHTML = html;
  box.querySelectorAll('[data-cancel]').forEach((b) =>
    b.addEventListener('click', () => C.onCancelOrder(+b.dataset.cancel)));
  box.querySelectorAll('[data-recruit]').forEach((b) =>
    b.addEventListener('click', () => C.onRecruit(b.dataset.recruit)));
  box.querySelectorAll('[data-build]').forEach((b) =>
    b.addEventListener('click', () => C.onBuild(b.dataset.build)));
  const f = box.querySelector('[data-end]');
  if (f) f.addEventListener('click', () => C.onEndPhase());
}
const footer = (label) => `<div class="foot"><button class="prim" data-end>${label}</button></div>`;

// Lijstje met wat de speler tot nu toe heeft ingepland (met ✕ om te annuleren).
function bevelenHTML() {
  const lijst = bevelenVan(game.cur);
  if (!lijst.length) return '';
  const rijen = lijst.map((o, i) => {
    let icoon, tekst, badge;
    if (o.type === 'aanval' || o.type === 'verplaats') {
      icoon = o.type === 'aanval' ? '⚔' : '➜';
      tekst = `${esc(GEO[o.src].name)} → <b>${esc(GEO[o.dst].name)}</b>`;
      badge = o.troepen.inf + o.troepen.cav + o.troepen.art;
    } else if (o.type === 'rekruteer') {
      icoon = '🛡';
      tekst = `${UNITS[o.unit].naam} in <b>${esc(GEO[o.dst].name)}</b>`;
      badge = `⬤${o.kost}`;
    } else {
      icoon = '🏗';
      tekst = `${BUILDINGS[o.gebouw].naam} in <b>${esc(GEO[o.dst].name)}</b>`;
      badge = `⬤${o.kost}`;
    }
    return `<div class="bevel ${o.type}">
      <span class="bi">${icoon}</span>
      <span class="bt">${tekst}</span>
      <span class="bn">${badge}</span>
      <button class="bx" data-cancel="${i}" title="Annuleren">✕</button>
    </div>`;
  }).join('');
  return `<div class="grp"><div class="grptitel">Ingepland (${lijst.length})</div>${rijen}</div>`;
}

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
      <a class="ghost" href="../../">← Terug naar Minigames</a>
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
      <a class="ghost" href="../../">← Terug naar Minigames</a>
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
  // Paneel leegmaken: anders leest de volgende speler door de vervaging heen
  // nog wat de vorige had ingepland.
  el('panel').innerHTML = '';
  overlay(`
    <div class="passcard" style="--c:${hex}">
      <div class="passdot" style="background:${hex}"></div>
      <h2>Geef de telefoon aan</h2>
      <div class="passnaam" style="color:${hex}">${esc(p.naam)}</div>
      <p class="sub">Ronde ${game.round} van ${ROUND_LIMIT} · ${aantalLanden(idx)} landen · ⬤ ${p.goud} goud</p>
      ${game.round >= ROUND_LIMIT ? '<p class="laatsteronde">⏳ Laatste ronde — nu telt elk land!</p>' : ''}
      <button class="prim big" id="passGo">Ik ben er klaar voor</button>
    </div>`, 'pass');
  el('passGo').addEventListener('click', onReady);
}

// ---- gelijktijdige resolutie ------------------------------------------------

// "Iedereen heeft gepland" — telefoon in het midden leggen.
export function showResolutieStart(aantal, onGo) {
  el('panel').innerHTML = '';        // niemands plan mag nog leesbaar zijn
  overlay(`
    <div class="midden">📱</div>
    <h2>Iedereen heeft gepland</h2>
    <p class="sub">Leg de telefoon in het midden zodat iedereen kan meekijken.
      Alle ${aantal} bevelen worden nu <b>tegelijk</b> uitgevoerd.</p>
    <button class="prim big" id="goRes">Uitvoeren!</button>
  `, 'menu resolutie');
  el('goRes').addEventListener('click', () => { hideOverlay(); onGo(); });
}

// Balk bovenin tijdens het afspelen, met een knop om door te spoelen.
export function startResolutieWeergave(onSkip) {
  let bar = el('resbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'resbar';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `<span id="restekst">Uitvoeren…</span><button id="resskip">⏩ Sneller</button>`;
  bar.classList.add('show');
  // HUD wegblenden: tijdens de uitvoering is niemand "aan de beurt".
  document.body.classList.add('resolutie');
  el('resskip').addEventListener('click', () => { onSkip(); el('resskip').disabled = true; });
}
export function resolutieTekst(t) {
  const e = el('restekst');
  if (e) e.textContent = t;
}
export function stopResolutieWeergave() {
  const bar = el('resbar');
  if (bar) bar.classList.remove('show');
  document.body.classList.remove('resolutie');
}

// Dobbelworp bij botsende aanvallen: zichtbaar en voor iedereen gelijk.
export function toonDobbel(ev, landnaam, g, snel) {
  return new Promise((klaar) => {
    const rijen = ev.worpen.map((w, i) => `
      <div class="dobbelrij" style="animation-delay:${i * 0.12}s">
        <span class="dot" style="background:${spelerKleur(w.speler)}"></span>
        <span class="dn">${esc(g.players[w.speler].naam)}</span>
        <span class="dw" data-worp="${w.worp}">?</span>
      </div>`).join('');
    const kaart = document.createElement('div');
    kaart.className = 'dobbelkaart';
    kaart.innerHTML = `<div class="dk-titel">⚄ Botsing om ${esc(landnaam)}</div>
      ${rijen}
      <div class="dk-uitleg">Hoogste worp valt als eerste aan</div>`;
    document.body.appendChild(kaart);

    const duur = snel ? 250 : 1100;
    const t0 = performance.now();
    const tik = () => {
      const p = (performance.now() - t0) / duur;
      kaart.querySelectorAll('.dw').forEach((e) => {
        if (p < 0.75) e.textContent = 1 + Math.floor(Math.random() * 20);
        else { e.textContent = e.dataset.worp; e.classList.add('vast'); }
      });
      if (p < 1) requestAnimationFrame(tik);
      else {
        const winnaar = kaart.querySelector('.dobbelrij');
        if (winnaar) winnaar.classList.add('eerst');
        setTimeout(() => { kaart.remove(); klaar(); }, snel ? 150 : 650);
      }
    };
    requestAnimationFrame(tik);
  });
}

export function showVictory(idx, reden) {
  const p = game.players[idx];
  const hex = spelerKleur(idx);
  const lijst = ranglijst();
  const uitleg = {
    laatste: 'Alle tegenstanders zijn uitgeschakeld.',
    overheersing: `Meer dan ${Math.round(DOMINATION_SHARE * 100)}% van de wereld veroverd.`,
    rondes: `Na ${ROUND_LIMIT} ronden de meeste landen.`,
  }[reden] || '';

  const medaille = ['🥇', '🥈', '🥉'];
  const rijen = lijst.map((r, k) => `
    <div class="scorerij ${r.i === idx ? 'winnaar' : ''}">
      <span class="pos">${medaille[k] || k + 1}</span>
      <span class="dot" style="background:${spelerKleur(r.i)}"></span>
      <span class="nm">${esc(r.pl.naam)}${r.pl.alive ? '' : ' <span class="muted">(uit)</span>'}</span>
      <span class="sc">${r.landen} <span class="muted">landen</span></span>
      <span class="pct">${Math.round(r.landen / N * 100)}%</span>
    </div>`).join('');

  overlay(`
    <div class="winkroon">🏆</div>
    <h1 style="color:${hex}">${esc(p.naam)} wint!</h1>
    <p class="sub">${uitleg}</p>
    <div class="scorelijst">${rijen}</div>
    <button class="prim big" id="againG">Nieuw spel</button>
    <a class="ghost" href="../../">← Terug naar Minigames</a>
  `, 'menu victory');
  strooiConfetti([hex, '#ffd85b', '#ffffff', '#7ee2a8', '#ff8fb1']);
  el('againG').addEventListener('click', () => C.playAgain());
}

// Confetti als losse elementen bovenop de overlay (CSS-animatie).
function strooiConfetti(kleuren) {
  const laag = document.createElement('div');
  laag.className = 'confetti';
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.background = kleuren[i % kleuren.length];
    s.style.animationDelay = (Math.random() * 1.6).toFixed(2) + 's';
    s.style.animationDuration = (2.4 + Math.random() * 2).toFixed(2) + 's';
    s.style.transform = `rotate(${Math.random() * 360}deg)`;
    s.style.width = (5 + Math.random() * 6).toFixed(1) + 'px';
    laag.appendChild(s);
  }
  el('overlay').appendChild(laag);
  setTimeout(() => laag.remove(), 6000);
}

export function showHelp() {
  overlay(`
    <h2>Hoe werkt Wereldverovering?</h2>
    <div class="help">
      <p><b>Doel:</b> bezit na <b>${ROUND_LIMIT} ronden</b> de meeste landen. Je wint eerder als je alle tegenstanders uitschakelt of ${Math.round(DOMINATION_SHARE * 100)}% van de wereld verovert.</p>
      <p class="fairness">🤝 <b>Iedereen speelt tegelijk.</b> Je plant je zetten in het geheim en geeft de telefoon door. Pas als iedereen klaar is, worden álle bevelen tegelijkertijd uitgevoerd — niemand heeft dus voordeel van eerder aan de beurt zijn.</p>
      <p><b>Je beurt (plannen, 3 stappen):</b></p>
      <ol>
        <li><b>Bouwen &amp; rekruteren</b> — je krijgt goud van je landen. Koop eenheden en bouw <b>markt</b> (goud), <b>kazerne</b> (goedkoper rekruteren) of <b>fort</b> (verdediging). Dit gebeurt meteen.</li>
        <li><b>Aanvallen plannen</b> — tik je eigen land, dan een geel buurland. Je geeft alleen het <i>bevel</i>; het gevecht volgt straks.</li>
        <li><b>Verplaatsen plannen</b> — schuif troepen naar een eigen buurland. Versterkingen komen aan <b>vóór</b> de gevechten, dus zo verdedig je.</li>
      </ol>
      <p><b>De uitvoering:</b> alle legers vertrekken tegelijk — val je aan, dan staat je eigen land dus zwakker. Vallen twee spelers hetzelfde land aan, dan bepaalt een <b>dobbelworp</b> wie het eerst mag; de tweede vecht daarna tegen de nieuwe eigenaar.</p>
      <p><b>Eenheden (steen-papier-schaar):</b> Infanterie ▸ Artillerie ▸ Cavalerie ▸ Infanterie. Elke soort is sterker tegen de soort die hij verslaat.</p>
      <p><b>Kaart:</b> sleep om te bewegen, knijp of scroll om te zoomen. Cijfers zijn het aantal troepen; stippen onder een land zijn gebouwen.</p>
    </div>
    <button class="prim" id="closeHelp">Sluiten</button>
  `, 'menu');
  el('closeHelp').addEventListener('click', () => C.closeHelp());
}

// ---- aanval-dialoog ---------------------------------------------------------
function stepperDialog({ title, src, dst, kleurBron, actie, actieLabel, defenderInfo }) {
  // Alleen troepen die nog niet aan een ander bevel zijn toegewezen.
  const t = beschikbaarPerSoort(game.cur, src);
  const totaal = beschikbaar(game.cur, src);
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
  const b = game.build[dst];
  const dinfo = `Verdediger: <b>${eigenaarNaam(dst)}</b> · ${troepen(dst)} troepen${b.fort ? ` · Fort ${b.fort}` : ''}
    <br><span class="waarschuwing">Let op: de verdediger kan dit nog versterken — jullie plannen tegelijk.</span>`;
  stepperDialog({
    title: '⚔ Aanval plannen op ' + esc(GEO[dst].name),
    src, dst, kleurBron: eigenaarKleur(src),
    defenderInfo: dinfo,
    actieLabel: 'Aanval inplannen',
    actie: (commit) => C.confirmAttack(src, dst, commit),
  });
}

export function moveDialog(src, dst) {
  stepperDialog({
    title: '➜ Verplaatsing plannen naar ' + esc(GEO[dst].name),
    src, dst, kleurBron: eigenaarKleur(src),
    defenderInfo: `Naar eigen land · nu ${troepen(dst)} troepen`,
    actieLabel: 'Verplaatsing inplannen',
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
