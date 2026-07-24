// resolve.js — voert alle geplande bevelen van álle spelers tegelijk uit.
//
// Waarom gelijktijdig? Omdat niemand dan voordeel heeft van "eerder aan de
// beurt zijn". Iedereen plant in het geheim; hier vallen de beslissingen.
//
// Volgorde binnen één resolutie:
//   0. OPBOUW       — verse rekruten en gebouwen komen erbij. Ze doen dus
//                     gewoon mee in deze ronde, zowel aanvallend als
//                     verdedigend (een fort dat je nu bouwt, beschermt nu al).
//   1. VERTREK      — alle ingezette troepen verlaten hun land tegelijk. Wie
//                     aanvalt, laat zijn eigen land dus zwakker achter.
//   2. VERSTERKING  — verplaatsingen naar eigen land landen vóór de gevechten,
//                     zodat je met een verplaatsing echt kunt verdedigen.
//   3. GEVECHTEN    — per aangevallen land. Vallen meerdere spelers hetzelfde
//                     land aan, dan bepaalt een DOBBELWORP wie het eerst mag;
//                     de volgende vecht dan tegen de nieuwe eigenaar.
//
// De functie wijzigt de spelstand NIET. Ze levert een draaiboek van gebeurte-
// nissen op; main.js speelt dat stap voor stap af (met animatie) en past de
// stand per stap toe. Zo blijft rekenen en tonen netjes gescheiden.
import { verwerkGevecht } from './combat.js';
import { UNIT_ORDER, DOBBEL_ZIJDEN } from './constants.js';

const totaal = (t) => t.inf + t.cav + t.art;
const kopie = (t) => ({ inf: t.inf, cav: t.cav, art: t.art });
const worp = () => 1 + Math.floor(Math.random() * DOBBEL_ZIJDEN);

// Berekent het volledige verloop van deze ronde.
// `stand` = { owner, troops, build } (wordt niet gewijzigd).
export function bereken(stand, bevelen) {
  const owner = [...stand.owner];
  const troops = stand.troops.map(kopie);
  const build = stand.build.map((b) => ({ ...b }));
  const script = [];

  // --- 0. opbouw: rekruten en gebouwen van iedereen tegelijk ------------------
  const opbouw = bevelen.filter((o) => o.type === 'rekruteer' || o.type === 'bouw');
  if (opbouw.length) {
    for (const o of opbouw) {
      if (o.type === 'rekruteer') troops[o.dst][o.unit]++;
      else build[o.dst][o.gebouw]++;
    }
    script.push({
      type: 'opbouw',
      items: opbouw.map((o) => ({
        speler: o.speler, dst: o.dst, soort: o.type,
        unit: o.unit, gebouw: o.gebouw,
      })),
    });
  }

  const geldig = bevelen.filter(
    (o) => (o.type === 'aanval' || o.type === 'verplaats') && totaal(o.troepen) > 0);

  // --- 1. vertrek: alles verlaat tegelijk zijn land ---------------------------
  if (geldig.length) {
    for (const o of geldig) {
      for (const k of UNIT_ORDER) troops[o.src][k] -= o.troepen[k];
    }
    script.push({
      type: 'vertrek',
      items: geldig.map((o) => ({
        speler: o.speler, src: o.src, dst: o.dst,
        troepen: kopie(o.troepen), soort: o.type,
      })),
    });
  }

  // --- 2. versterkingen (eigen verplaatsingen) landen -------------------------
  for (const o of geldig.filter((x) => x.type === 'verplaats')) {
    for (const k of UNIT_ORDER) troops[o.dst][k] += o.troepen[k];
    script.push({
      type: 'versterking', speler: o.speler, src: o.src, dst: o.dst,
      troepen: kopie(o.troepen), naTroepen: kopie(troops[o.dst]),
    });
  }

  // --- 3. gevechten, gegroepeerd per aangevallen land -------------------------
  const perDoel = new Map();
  for (const o of geldig.filter((x) => x.type === 'aanval')) {
    if (!perDoel.has(o.dst)) perDoel.set(o.dst, []);
    perDoel.get(o.dst).push(o);
  }

  for (const [dst, lijst] of perDoel) {
    // Botsing? Dan beslist de dobbelsteen wie het eerst aanvalt.
    if (lijst.length > 1) {
      for (const o of lijst) o.worp = worp();
      // gelijke worp: opnieuw gooien tot er een volgorde is
      lijst.sort((a, b) => b.worp - a.worp || Math.random() - 0.5);
      script.push({
        type: 'dobbel', dst,
        worpen: lijst.map((o) => ({ speler: o.speler, worp: o.worp, src: o.src })),
      });
    }

    for (const o of lijst) {
      // Inmiddels zelf eigenaar (een eerdere aanvaller was jij): troepen voegen
      // zich gewoon bij de bezetting.
      if (owner[dst] === o.speler) {
        for (const k of UNIT_ORDER) troops[dst][k] += o.troepen[k];
        script.push({
          type: 'aankomst', speler: o.speler, src: o.src, dst,
          troepen: kopie(o.troepen), naTroepen: kopie(troops[dst]),
        });
        continue;
      }

      const verdedigerVoor = kopie(troops[dst]);
      const eigenaarVoor = owner[dst];
      const uitkomst = verwerkGevecht(o.troepen, verdedigerVoor, build[dst].fort);
      const gelukt = uitkomst.winnaar === 'att';

      if (gelukt) {
        owner[dst] = o.speler;
        troops[dst] = kopie(uitkomst.att);
        build[dst].fort = 0;                 // fort sneuvelt bij verovering
      } else {
        troops[dst] = kopie(uitkomst.def);
      }

      script.push({
        type: 'gevecht', speler: o.speler, src: o.src, dst,
        commit: kopie(o.troepen), fort: build[dst].fort,
        eigenaarVoor, verdedigerVoor, gelukt,
        naTroepen: kopie(troops[dst]), naEigenaar: owner[dst],
        verliesAtt: uitkomst.verliesAtt, verliesDef: uitkomst.verliesDef,
        worp: o.worp,
      });
    }
  }

  return { script, eind: { owner, troops, build } };
}
