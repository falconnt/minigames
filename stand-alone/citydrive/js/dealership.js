// dealership.js — de autodealer-showroom: koop of selecteer elke auto met een
// grote draaiende preview, statbalken en een koopknop. Opent vanuit het
// dealergebouw in de wereld (main.js) of blijft los van de garage (tunen/upgraden).

import { state, ui, saveState } from './state.js';
import { DEFS, defById, mkCfg, eff } from './cars.js';
import { drawCar } from './draw-car.js';
import { fmt, updMoneyUI } from './economy.js';

const dealerEl = document.getElementById('dealer');
const prevCv = document.getElementById('dPrev'), ptx = prevCv.getContext('2d');
let viewIdx = 0, prevAng = -0.6;

const cfgOf = (id) => state.cfg[id] || mkCfg(id);

export function isDealerOpen() { return ui.dealerOpen; }

export function openDealer() {
  if (ui.dealerOpen) return;
  ui.dealerOpen = true;
  dealerEl.classList.add('open');
  viewIdx = Math.max(0, DEFS.findIndex((d) => d.id === state.current));
  updMoneyUI(); renderDealer();
}

export function closeDealer() {
  ui.dealerOpen = false;
  dealerEl.classList.remove('open');
  saveState();
}

function onBuy() {
  const d = DEFS[viewIdx];
  if (state.current === d.id) return;                 // al in gebruik
  if (state.owned.has(d.id)) { state.current = d.id; } // bezit: alleen selecteren
  else {
    if (state.money < d.price) return;                // kopen
    state.money -= d.price; state.owned.add(d.id); state.cfg[d.id] = mkCfg(d.id); state.current = d.id;
  }
  updMoneyUI(); renderDealer(); saveState();
}

function thumb(def) {
  const c = document.createElement('canvas'); c.width = 100; c.height = 64;
  c.style.width = '50px'; c.style.height = '32px';
  const t = c.getContext('2d'); t.scale(2, 2);
  drawCar(t, 25, 16, -0.5, 0, def, cfgOf(def.id), false, 0.9);
  return c;
}

function renderDealer() {
  const d = DEFS[viewIdx];
  document.getElementById('dPrevName').textContent = d.name;
  document.getElementById('dPrevSub').textContent = d.sub + ' · ' + Math.round(d.top * 0.28) + ' km/u';
  // statbalken
  const e = eff(d.id, cfgOf(d.id));
  const mk = (lbl, v, max) => `<div class="stat"><div class="sl"><span>${lbl}</span></div>
    <div class="bar"><i style="width:${Math.min(100, v / max * 100)}%"></i></div></div>`;
  document.getElementById('dStats').innerHTML =
    mk('TOPSNELHEID', e.top, 1000) + mk('ACCELERATIE', e.acc, 780) + mk('WEGLIGGING', e.steer * e.grip, 38);
  // koopknop
  const btn = document.getElementById('dBuy');
  if (state.current === d.id) { btn.textContent = 'IN GEBRUIK'; btn.disabled = true; btn.className = 'd-buy cur'; }
  else if (state.owned.has(d.id)) { btn.textContent = 'SELECTEER'; btn.disabled = false; btn.className = 'd-buy own'; }
  else { btn.textContent = 'KOOP · ' + fmt(d.price); btn.disabled = state.money < d.price; btn.className = 'd-buy'; }
  // lijst met alle auto's
  const list = document.getElementById('dList'); list.innerHTML = '';
  DEFS.forEach((dd, i) => {
    const owned = state.owned.has(dd.id), cur = state.current === dd.id;
    const card = document.createElement('button'); card.className = 'dCard' + (i === viewIdx ? ' sel' : '');
    card.appendChild(thumb(dd));
    const info = document.createElement('div'); info.className = 'cc-info';
    info.innerHTML = `<div class="cc-name">${dd.name}</div>
      <div class="cc-spec">${cur ? 'In gebruik' : owned ? 'In bezit' : fmt(dd.price)}</div>`;
    card.appendChild(info);
    card.onclick = () => { viewIdx = i; renderDealer(); };
    list.appendChild(card);
  });
}

// Draaiende preview; vanuit de loop aangeroepen zolang de dealer open is.
export function renderDealerPreview() {
  const w = prevCv.clientWidth || 400, h = 190;
  if (prevCv.width !== w * 2) { prevCv.width = w * 2; prevCv.height = h * 2; }
  ptx.setTransform(2, 0, 0, 2, 0, 0); ptx.clearRect(0, 0, w, h);
  prevAng += 0.008;
  ptx.fillStyle = 'rgba(0,0,0,.25)'; ptx.beginPath(); ptx.ellipse(w / 2, h / 2 + 34, 120, 34, 0, 0, 7); ptx.fill();
  const d = DEFS[viewIdx];
  drawCar(ptx, w / 2, h / 2 + 8, prevAng, 0, d, cfgOf(d.id), false, 2.6);
}

export function initDealer() {
  document.getElementById('dealerClose').addEventListener('click', closeDealer);
  document.getElementById('dBuy').addEventListener('click', onBuy);
}
