// garage.js — het garage-overlay met drie tabbladen: auto's kopen/selecteren,
// tuning (kleuren, velgen, underglow, spoiler, stripe) en upgrades (motor,
// turbo, ophanging). Tekent ook de statbalken, thumbnails en de draaiende
// preview. Elke wijziging slaat direct op via saveState.

import { state, ui, saveState, resetPos } from './state.js';
import { DEFS, defById, mkCfg, eff } from './cars.js';
import { bodyCols, rimCols, glowCols } from './constants.js';
import { drawCar } from './draw-car.js';
import { fmt, updMoneyUI } from './economy.js';

const garageEl = document.getElementById('garage');
const prevCv = document.getElementById('prev'), ptx = prevCv.getContext('2d');
let curTab = 'cars', prevAng = -0.6;

export function isGarageOpen() { return ui.garageOpen; }

export function toggleGarage() {
  ui.garageOpen = !ui.garageOpen;
  garageEl.classList.toggle('open', ui.garageOpen);
  if (ui.garageOpen) { updMoneyUI(); renderGarage(); } else { saveState(); }
}

export function initGarage() {
  document.getElementById('garageBtn').addEventListener('click', toggleGarage);
  document.getElementById('gClose').addEventListener('click', toggleGarage);
  document.getElementById('rstBtn').addEventListener('click', resetPos);
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    curTab = b.dataset.t;
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tabpage').forEach((x) => x.classList.toggle('on', x.id === 'tab-' + curTab));
    renderGarage();
  }));
}

function statBars() {
  const e = eff(state.current, state.cfg[state.current]);
  const mk = (lbl, v, max) => `<div class="stat"><div class="sl"><span>${lbl}</span></div>
    <div class="bar"><i style="width:${Math.min(100, v / max * 100)}%"></i></div></div>`;
  document.getElementById('gStats').innerHTML =
    mk('TOPSNELHEID', e.top, 1000) + mk('ACCELERATIE', e.acc, 780) + mk('WEGLIGGING', e.steer * e.grip, 38);
  const d = defById(state.current);
  document.getElementById('prevName').textContent = d.name;
  document.getElementById('prevSub').textContent = d.sub;
}

function carThumb(def, cfg) {
  const c = document.createElement('canvas'); c.width = 100; c.height = 64;
  c.style.width = '50px'; c.style.height = '32px';
  const t = c.getContext('2d'); t.scale(2, 2);
  drawCar(t, 25, 16, -0.5, 0, def, cfg || { color: def.defCol, rim: '#cfd6e4', spoiler: false, stripe: false, glow: null }, false, 0.9);
  return c;
}

function renderGarage() {
  statBars();
  if (curTab === 'cars') {
    const el = document.getElementById('tab-cars'); el.innerHTML = '';
    for (const d of DEFS) {
      const owned = state.owned.has(d.id), cur = state.current === d.id;
      const card = document.createElement('div'); card.className = 'carCard' + (cur ? ' sel' : '');
      card.appendChild(carThumb(d, state.cfg[d.id]));
      const info = document.createElement('div'); info.className = 'cc-info';
      info.innerHTML = `<div class="cc-name">${d.name}</div>
        <div class="cc-spec">${d.sub} · ${Math.round(d.top * 0.28)} km/u</div>`;
      card.appendChild(info);
      const btn = document.createElement('button');
      if (cur) { btn.className = 'cc-btn cur'; btn.textContent = 'In gebruik'; }
      else if (owned) {
        btn.className = 'cc-btn'; btn.textContent = 'Selecteer';
        btn.onclick = () => { state.current = d.id; renderGarage(); saveState(); };
      } else {
        btn.className = 'cc-btn buy'; btn.textContent = fmt(d.price);
        btn.disabled = state.money < d.price;
        btn.onclick = () => {
          if (state.money < d.price) return;
          state.money -= d.price; state.owned.add(d.id); state.cfg[d.id] = mkCfg(d.id);
          state.current = d.id; updMoneyUI(); renderGarage(); saveState();
        };
      }
      card.appendChild(btn); el.appendChild(card);
    }
  }
  if (curTab === 'tune') {
    const el = document.getElementById('tab-tune'); el.innerHTML = '';
    const cfg = state.cfg[state.current];
    const swRow = (title, cols, cur, set) => {
      const h = document.createElement('div'); h.className = 'sect'; h.textContent = title; el.appendChild(h);
      const row = document.createElement('div'); row.className = 'swrow';
      for (const c of cols) {
        const s = document.createElement('div');
        s.className = 'sw' + (c === null ? ' none' : '') + ((c === cur) ? ' sel' : '');
        if (c) s.style.background = c;
        s.onclick = () => { set(c); renderGarage(); saveState(); };
        row.appendChild(s);
      }
      el.appendChild(row);
    };
    swRow('CARROSSERIEKLEUR', bodyCols, cfg.color, (v) => cfg.color = v);
    swRow('VELGEN', rimCols, cfg.rim, (v) => cfg.rim = v);
    swRow('UNDERGLOW', glowCols, cfg.glow, (v) => cfg.glow = v);
    const sp = document.createElement('div'); sp.className = 'sect'; sp.textContent = 'ONDERDELEN'; el.appendChild(sp);
    const tog = (lbl, get, set) => {
      const r = document.createElement('div'); r.className = 'togRow';
      r.innerHTML = `<div class="tl">${lbl}</div>`;
      const t = document.createElement('div'); t.className = 'tog' + (get() ? ' on' : '');
      t.onclick = () => { set(!get()); renderGarage(); saveState(); };
      r.appendChild(t); el.appendChild(r);
    };
    tog('Spoiler', () => cfg.spoiler, (v) => cfg.spoiler = v);
    tog('Racestriping', () => cfg.stripe, (v) => cfg.stripe = v);
  }
  if (curTab === 'up') {
    const el = document.getElementById('tab-up'); el.innerHTML = '';
    const d = defById(state.current), cfg = state.cfg[state.current];
    const base = Math.max(800, Math.round(d.price * 0.16 / 100) * 100);
    const row = (key, name, desc) => {
      const lvl = cfg.up[key];
      const r = document.createElement('div'); r.className = 'upRow';
      const dots = [0, 1, 2].map((i) => `<div class="dot${i < lvl ? ' f' : ''}"></div>`).join('');
      r.innerHTML = `<div class="up-info"><div class="up-name">${name}</div>
        <div class="cc-spec">${desc}</div><div class="dots">${dots}</div></div>`;
      const btn = document.createElement('button');
      if (lvl >= 3) { btn.className = 'up-btn max'; btn.textContent = 'MAX'; btn.disabled = true; }
      else {
        const cost = (lvl + 1) * base; btn.className = 'up-btn'; btn.textContent = fmt(cost);
        btn.disabled = state.money < cost;
        btn.onclick = () => { if (state.money < cost) return; state.money -= cost; cfg.up[key]++; updMoneyUI(); renderGarage(); saveState(); };
      }
      r.appendChild(btn); el.appendChild(r);
    };
    row('eng', 'Motor', '+ topsnelheid');
    row('tur', 'Turbo', '+ acceleratie');
    row('han', 'Ophanging', '+ wegligging & grip');
  }
}

// Draaiende 3/4-preview boven in de garage; wordt vanuit de loop aangeroepen
// zolang de garage open is.
export function renderPreview() {
  const w = prevCv.clientWidth || 400, h = 190;
  if (prevCv.width !== w * 2) { prevCv.width = w * 2; prevCv.height = h * 2; }
  ptx.setTransform(2, 0, 0, 2, 0, 0); ptx.clearRect(0, 0, w, h);
  prevAng += 0.008;
  // vloer
  ptx.fillStyle = 'rgba(0,0,0,.25)'; ptx.beginPath(); ptx.ellipse(w / 2, h / 2 + 34, 120, 34, 0, 0, 7); ptx.fill();
  const d = defById(state.current), cfg = state.cfg[state.current];
  drawCar(ptx, w / 2, h / 2 + 8, prevAng, 0, d, cfg, false, 2.6);
}
