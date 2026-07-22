// fx.js — kortlevende visuele effecten: remsporen, rookpluimen en drijvende
// tekst-popups (bijv. "+€12 DRIFT"). Physics vult ze, de renderer tekent ze.

import { P } from './state.js';

export const skids = [];
export const smoke = [];
export const popups = [];

export function addPopup(txt, col) {
  popups.push({ x: P.x, y: P.y - 40, txt, col, t: 0 });
}
