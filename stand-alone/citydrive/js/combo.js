// combo.js — drift-combo. Hoe langer je aaneengesloten drift, hoe hoger de
// vermenigvuldiger (x1..x5). physics.js werkt hem bij en betaalt uit; render.js
// toont de teller in de HUD. Een stevige botsing breekt de combo.
//
//   mult      1..5  — huidige vermenigvuldiger
//   pending   het openstaande drift-geld × mult (wordt bij het einde uitbetaald)
//   driftTime seconden aaneengesloten drift
//   active    of er nu een combo loopt
export const combo = { mult: 1, pending: 0, driftTime: 0, active: false };

export function resetCombo() {
  combo.mult = 1; combo.pending = 0; combo.driftTime = 0; combo.active = false;
}
