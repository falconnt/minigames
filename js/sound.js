// Kleine synth-geluidjes via Web Audio — geen audiobestanden nodig.
// Staat standaard aan; uit te zetten in Instellingen ('sound'-instelling).

import { storage } from './storage.js';

let audio = null;
function ac() {
  if (!audio) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  return audio;
}

export const soundOn = () => storage.getSetting('sound', true) !== false;
export function setSound(on) { storage.setSetting('sound', !!on); }

function tone(freq, t0, dur, type = 'triangle', vol = 0.12) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const gn = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + t0;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function play(name) {
  if (!soundOn()) return;
  try {
    if (name === 'score') {
      tone(660, 0, 0.09);
      tone(880, 0.07, 0.12);
    } else if (name === 'ping') {
      // helder belletje, bv. bij het passeren van een buis in Vogel Vlucht
      tone(1046, 0, 0.09, 'sine', 0.11);
      tone(1568, 0.02, 0.07, 'sine', 0.05);
    } else if (name === 'plop') {
      // zachte plop, bv. bij het samenvoegen van tegels in 2048
      tone(320, 0, 0.07, 'sine', 0.12);
      tone(215, 0.045, 0.09, 'sine', 0.08);
    } else if (name === 'record') {
      // klein fanfare-arpeggio (C-E-G-C)
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.16, 'triangle', 0.14));
    }
  } catch { /* geluid is nooit kritiek */ }
}
