// constants.js — vaste spelwaarden: kleuren, eenheden, gebouwen, economie.
// Alle balans staat hier bij elkaar zodat je één ding kunt bijstellen.

export const STORAGE_KEY = 'wereldverovering.v1';

// Spelerskleuren (tot 6 spelers). Duidelijk onderscheidend op de kaart.
export const PLAYER_COLORS = [
  { id: 'rood', naam: 'Rood', hex: '#e6483d' },
  { id: 'blauw', naam: 'Blauw', hex: '#3b82f6' },
  { id: 'groen', naam: 'Groen', hex: '#22b661' },
  { id: 'geel', naam: 'Geel', hex: '#f0b429' },
  { id: 'paars', naam: 'Paars', hex: '#b061f0' },
  { id: 'cyaan', naam: 'Cyaan', hex: '#18b6c4' },
];

export const NEUTRAL = '#59626f';   // niemandsland

// Eenheidstypes — steen/papier/schaar. Elk type is 60% sterker tegen het type
// dat het "verslaat":  infanterie > artillerie > cavalerie > infanterie.
export const UNITS = {
  inf: { key: 'inf', naam: 'Infanterie', kort: 'Inf', kost: 5, verslaat: 'art' },
  cav: { key: 'cav', naam: 'Cavalerie', kort: 'Cav', kost: 8, verslaat: 'inf' },
  art: { key: 'art', naam: 'Artillerie', kort: 'Art', kost: 12, verslaat: 'cav' },
};
export const UNIT_ORDER = ['inf', 'cav', 'art'];
export const TYPE_BONUS = 0.6;      // extra slagkracht tegen het verslagen type

// Gebouwen — per land, niveau 0..max. Kosten per op te waarderen niveau.
export const BUILDINGS = {
  markt: { key: 'markt', naam: 'Markt', max: 3, kost: [18, 34, 60], info: '+3 goud inkomen per niveau' },
  kazerne: { key: 'kazerne', naam: 'Kazerne', max: 3, kost: [22, 40, 70], info: 'goedkoper rekruteren hier: −15% per niveau' },
  fort: { key: 'fort', naam: 'Fort', max: 3, kost: [26, 48, 84], info: '+35% verdediging per niveau' },
};
export const BUILDING_ORDER = ['markt', 'kazerne', 'fort'];

// Economie
export const BASE_INCOME = 2;       // goud per eigen land per beurt
export const MARKET_INCOME = 3;     // extra goud per marktniveau
export const FORT_DEFENSE = 0.35;   // verdedigingsbonus per fortniveau
export const KAZERNE_KORTING = 0.15;// rekruteerkorting per kazerneniveau
export const START_GOLD = 24;       // startgoud per speler

// Continent-bonus: krijg je alléén als je het hele continent bezit.
export const CONTINENT_BONUS = {
  Europe: 6, Asia: 7, Africa: 7, 'North America': 5, 'South America': 4, Oceania: 3,
};
export const CONTINENT_NL = {
  Europe: 'Europa', Asia: 'Azië', Africa: 'Afrika',
  'North America': 'Noord-Amerika', 'South America': 'Zuid-Amerika', Oceania: 'Oceanië',
};

// Startopstelling
export const SEEDS_PER_PLAYER = 3;  // eigen startlanden per speler
export const SEED_TROOPS = 6;       // totaal starttroepen verdeeld over je seeds
export const NEUTRAL_MIN = 1;       // troepen in een neutraal land (min)
export const NEUTRAL_MAX = 3;       // troepen in een neutraal land (max)

// Overwinning door overheersing: aandeel van alle landen dat je moet bezitten.
export const DOMINATION_SHARE = 0.6;

// Beurtfasen
export const PHASES = ['inkomen', 'bouwen', 'aanvallen', 'verschuiven'];
export const PHASE_NL = {
  inkomen: 'Inkomen', bouwen: 'Bouwen & rekruteren',
  aanvallen: 'Veroveren', verschuiven: 'Verschuiven',
};
