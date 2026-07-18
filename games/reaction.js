// Reactietest — klik zodra het vlak groen wordt. Vijf rondes; het gemiddelde
// in milliseconden is de score (lager is beter).

import { availableHeight } from '../js/fit.js';

const ROUNDS = 5;

export function init(root, ctx) {
  root.innerHTML = `
    <div class="game-toolbar">
      <span class="stat">Ronde: <b id="rt-round">–</b></span>
      <span class="stat">Gemiddelde: <b id="rt-avg">–</b></span>
    </div>
    <button id="rt-zone" class="reaction-zone">Klik om te starten</button>
    <p id="rt-results" class="game-hint"></p>
  `;

  const zone = root.querySelector('#rt-zone');
  const roundEl = root.querySelector('#rt-round');
  const avgEl = root.querySelector('#rt-avg');
  const resultsEl = root.querySelector('#rt-results');

  // Toestanden: idle → waiting (rood, wachten op groen) → go (klikken!) → tussenstand → ...
  let state = 'idle';
  let times = [];
  let goAt = 0;
  let timeout = null;

  function setZone(cls, text) {
    zone.className = `reaction-zone ${cls}`;
    zone.innerHTML = text;
  }

  function startRound() {
    state = 'waiting';
    roundEl.textContent = `${times.length + 1} / ${ROUNDS}`;
    setZone('waiting', 'Wacht op groen…');
    timeout = setTimeout(() => {
      state = 'go';
      goAt = performance.now();
      setZone('go', 'KLIK!');
    }, 1200 + Math.random() * 2300);
  }

  function updateStats() {
    resultsEl.textContent = times.length
      ? `Rondes: ${times.map((t) => `${t} ms`).join(' · ')}`
      : '';
    if (times.length) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      avgEl.textContent = `${avg} ms`;
      return avg;
    }
    avgEl.textContent = '–';
    return null;
  }

  function finish() {
    const avg = updateStats();
    const result = ctx.submitScore(avg);
    state = 'idle';
    roundEl.textContent = '–';
    setZone(
      '',
      `Klaar! Gemiddelde: ${avg} ms${result.isRecord ? ' — 🥇 nieuw record!' : result.rank ? ` — plek ${result.rank} in de top 10` : ''}<br><small>Klik om opnieuw te spelen</small>`
    );
    times = [];
  }

  function onClick() {
    if (state === 'idle') {
      times = [];
      updateStats();
      startRound();
    } else if (state === 'waiting') {
      // Te vroeg geklikt: ronde telt niet, opnieuw.
      clearTimeout(timeout);
      state = 'tooearly';
      setZone('', 'Te vroeg! 😅<br><small>Klik om verder te gaan</small>');
    } else if (state === 'tooearly') {
      startRound();
    } else if (state === 'go') {
      times.push(Math.round(performance.now() - goAt));
      updateStats();
      if (times.length >= ROUNDS) {
        finish();
      } else {
        state = 'between';
        setZone('', `${times[times.length - 1]} ms<br><small>Klik voor de volgende ronde</small>`);
      }
    } else if (state === 'between') {
      startRound();
    }
  }

  zone.addEventListener('click', onClick);

  // Het klikvlak vult de resterende schermhoogte (schermvullend-richtlijn),
  // met ruimte voor de resultatenregel eronder.
  function fitZone() {
    const below = Math.max(resultsEl.offsetHeight, 28) + 30; // + marge en paneelrand
    const h = Math.min(520, availableHeight(zone, below, 170));
    zone.style.minHeight = '0';
    zone.style.height = h + 'px';
  }
  fitZone();
  window.addEventListener('resize', fitZone);

  return () => {
    clearTimeout(timeout);
    window.removeEventListener('resize', fitZone);
  };
}
