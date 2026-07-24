// audio.js — een simpele Web Audio motorsound: twee oscillatoren door een
// laagdoorlaatfilter, waarvan toonhoogte en volume met de snelheid meebewegen.
// Leest de mute-/garage-vlaggen uit `ui` en het gaspedaal uit `input`.

import { input } from './input.js';
import { ui } from './state.js';

let AC = null, osc, osc2, gain, filt;

export function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    osc = AC.createOscillator(); osc.type = 'sawtooth';
    osc2 = AC.createOscillator(); osc2.type = 'square';
    filt = AC.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420;
    gain = AC.createGain(); gain.gain.value = 0;
    const g2 = AC.createGain(); g2.gain.value = 0.35;
    osc.connect(filt); osc2.connect(g2); g2.connect(filt); filt.connect(gain); gain.connect(AC.destination);
    osc.start(); osc2.start();
  } catch (e) { AC = null; }
}

export function updAudio(spd) {
  if (!AC || !gain) return;
  const f = 55 + (spd / 900) * 185 + input.th * 12;
  osc.frequency.setTargetAtTime(f, AC.currentTime, 0.05);
  osc2.frequency.setTargetAtTime(f / 2, AC.currentTime, 0.05);
  const target = (ui.muted || ui.garageOpen) ? 0 : 0.028 + Math.min(0.05, (spd / 900) * 0.05) + (input.th > 0 ? 0.012 : 0);
  gain.gain.setTargetAtTime(target, AC.currentTime, 0.08);
}

// Audio start pas na de eerste aanraking (browserregel). De mute-schakelaar
// zelf zit in het instellingenmenu (settings.js) en zet ui.muted.
export function initAudioControls() {
  addEventListener('pointerdown', initAudio, { once: false });
}
