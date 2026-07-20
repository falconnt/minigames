// Badges (prestaties) en de dag-streak. Voortgang wordt bijgehouden in de
// versleutelde statistieken; verdiende badges als vlaggen. Bij het verdienen
// verschijnt een toast (gestaffeld als er meerdere tegelijk vallen).

import { storage } from './storage.js';
import * as fx from './effects.js';
import * as sound from './sound.js';
import { games } from './registry.js';

export const BADGES = [
  { id: 'eerste', icon: '🎈', title: 'Eerste potje', desc: 'Speel je allereerste potje.', test: (s) => (s.totalPlays || 0) >= 1 },
  { id: 'doorzetter', icon: '🎯', title: 'Doorzetter', desc: 'Speel 10 potjes.', test: (s) => (s.totalPlays || 0) >= 10 },
  { id: 'ontdekker', icon: '🧭', title: 'Ontdekker', desc: 'Speel elke game minstens één keer.', test: (s, ids) => ids.every((id) => (s['plays_' + id] || 0) > 0) },
  { id: 'recordbreker', icon: '🥇', title: 'Recordbreker', desc: 'Verbeter 3 keer je eigen record.', test: (s) => (s.records || 0) >= 3 },
  { id: 'vlammetje', icon: '🔥', title: 'Vlammetje', desc: 'Speel 3 dagen op rij.', test: (s) => (s.streak || 0) >= 3 },
  { id: 'vliegaas', icon: '🐦', title: 'Vlieg-aas', desc: 'Haal 10 punten in Flappy Bird.', test: (s) => (s.best_vogelvlucht || 0) >= 10 },
  { id: 'tegeltovenaar', icon: '🔢', title: 'Tegel-tovenaar', desc: 'Haal 2048 punten in 2048.', test: (s) => (s.best_2048 || 0) >= 2048 },
  { id: 'bliksemreflex', icon: '⚡', title: 'Bliksemreflex', desc: 'Gemiddelde reactietijd van 250 ms of sneller.', test: (s) => (s.best_reactie || 0) > 0 && s.best_reactie <= 250 },
  { id: 'plaatjesmeester', icon: '🖼️', title: 'Plaatjesmeester', desc: 'Haal 5000 punten in Onthul!.', test: (s) => (s.best_onthul || 0) >= 5000 },
];

const todayKey = () => new Date().toISOString().slice(0, 10);

export function isEarned(id) {
  return storage.getFlag('badge_' + id);
}

// Aanroepen bij elke ingediende score; werkt statistieken bij en kent badges toe.
export function onScore(game, score, result) {
  storage.bumpStat('totalPlays');
  storage.bumpStat('plays_' + game.id);

  const bestKey = 'best_' + game.id;
  const prev = storage.getStat(bestKey);
  const better = game.scoreMode === 'lower' ? (!prev || score < prev) : score > prev;
  if (better) storage.setStat(bestKey, score);

  if (result.isRecord) storage.bumpStat('records');

  // dag-streak: elke dag dat je speelt telt; een dag overslaan reset naar 1
  const today = todayKey();
  const last = storage.getStat('lastPlayDay') || null;
  if (last !== today) {
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    storage.setStat('streak', last === yesterday ? storage.getStat('streak') + 1 : 1);
    storage.setStat('lastPlayDay', today);
  }

  checkBadges();
}

export function checkBadges() {
  const s = storage.getStats();
  const ids = games.map((g) => g.id);
  let delay = 800; // ná de eventuele record-toast
  for (const b of BADGES) {
    if (isEarned(b.id) || !b.test(s, ids)) continue;
    storage.setFlag('badge_' + b.id, true);
    setTimeout(() => {
      fx.toast(`🏅 Badge verdiend: ${b.title}!`);
      sound.play('score');
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    }, delay);
    delay += 2700;
  }
}
