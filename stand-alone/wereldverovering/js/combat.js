// combat.js — gevechtsafwikkeling met steen/papier/schaar-eenheden.
// inf > art > cav > inf. De verdediger krijgt een fortbonus.
import { UNIT_ORDER, UNITS, TYPE_BONUS, FORT_DEFENSE } from './constants.js';

const totaal = (s) => s.inf + s.cav + s.art;

// Slagkracht van `side` tegen `opp`: elk type dat het meest voorkomende
// tegentype verslaat, telt zwaarder mee.
function kracht(side, opp) {
  const oppTot = totaal(opp) || 1;
  let s = 0;
  for (const k of UNIT_ORDER) {
    const cnt = side[k];
    if (!cnt) continue;
    const frac = opp[UNITS[k].verslaat] / oppTot;
    s += cnt * (1 + TYPE_BONUS * frac);
  }
  return s;
}

// Verwijder één eenheid bij de verliezer; bij voorkeur het type dat de winnaar
// het sterkst countert, anders de grootste groep.
function verwijderEen(loser, winner) {
  let bestKey = null, bestScore = -1;
  for (const k of UNIT_ORDER) {
    if (!loser[k]) continue;
    // hoeveel winnaar-eenheden verslaan dit type?
    let counter = 0;
    for (const w of UNIT_ORDER) if (UNITS[w].verslaat === k) counter += winner[w];
    const score = counter * 100 + loser[k]; // eerst counteren, dan grootste groep
    if (score > bestScore) { bestScore = score; bestKey = k; }
  }
  if (bestKey) loser[bestKey]--;
}

// Los een gevecht op. att/def zijn {inf,cav,art}; def verdedigt met fortLevel.
// Geeft terug: winnaar ('att'/'def'), overlevende stapels en aantal rondes.
export function verwerkGevecht(att, def, fortLevel = 0) {
  const a = { ...att }, d = { ...def };
  const fort = 1 + FORT_DEFENSE * (fortLevel || 0);
  let rondes = 0;
  const MAX = 5000;
  while (totaal(a) > 0 && totaal(d) > 0 && rondes < MAX) {
    rondes++;
    const sa = kracht(a, d);
    const sd = kracht(d, a) * fort;
    const pAtt = sa / (sa + sd);
    if (Math.random() < pAtt) verwijderEen(d, a); // verdediger verliest
    else verwijderEen(a, d);                       // aanvaller verliest
  }
  return {
    winnaar: totaal(d) === 0 ? 'att' : 'def',
    att: a, def: d, rondes,
    verliesAtt: { inf: att.inf - a.inf, cav: att.cav - a.cav, art: att.art - a.art },
    verliesDef: { inf: def.inf - d.inf, cav: def.cav - d.cav, art: def.art - d.art },
  };
}
