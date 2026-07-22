// economy.js — geldweergave en formattering. Houdt de HUD en de garage in sync
// met state.money en zet een uitgestelde save in de wachtrij bij elke wijziging.

import { state, queueSave } from './state.js';

export const fmt = (n) => '€ ' + Math.floor(n).toLocaleString('nl-NL');

const moneyEl = document.getElementById('money');

export function updMoneyUI() {
  if (moneyEl) moneyEl.textContent = fmt(state.money);
  const gm = document.getElementById('gMoney');
  if (gm) gm.textContent = fmt(state.money);
  queueSave();
}
