// Gedeeld opslagmechanisme voor alle minigames.
//
// Twee stores:
//  - Instellingen (thema): plat in `minigames.settings`, zodat het thema al vóór
//    de eerste render (synchroon) toegepast kan worden.
//  - Saves + highscores + online-wachtrij: versleuteld met AES-GCM in
//    `minigames.v2`. Zo kun je in localStorage niet zomaar met je scores knoeien
//    (geknoei maakt de blob ongeldig en wordt genegeerd). De sleutel zit in de
//    app, dus dit beschermt tegen sleutelen-in-de-browser, niet tegen iemand die
//    de broncode leest — de échte waarheid is de online ranglijst.
//
// De publieke API blijft synchroon (games werken op een in-memory kopie); het
// wegschrijven (versleutelen) gebeurt async op de achtergrond. Roep vóór gebruik
// eenmalig `await storage.init()` aan.

const SETTINGS_KEY = 'minigames.settings';
const SECURE_KEY = 'minigames.v2';
const OLD_KEY = 'minigames.v1';
const MAX_HIGHSCORES = 10;

const subtleOk = typeof crypto !== 'undefined' && crypto.subtle && isSecureContext;

let secure = emptySecure();
function emptySecure() {
  return { games: {}, pending: [], flags: {}, stats: {} };
}

// ---------- instellingen (plat, synchroon) ----------

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}
function writeSettings(o) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(o));
}

// ---------- versleuteling ----------

const SECRET = 'minigames::secure-store::v2';
let aesKey = null;
async function getKey() {
  if (aesKey) return aesKey;
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', enc.encode(SECRET), 'PBKDF2', false, ['deriveKey']);
  aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('minigames-static-salt'), iterations: 100000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return aesKey;
}
function toB64(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
function fromB64(str) {
  const s = atob(str);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}
async function encrypt(text) {
  if (!subtleOk) return 'plain:' + text;
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return 'gcm:' + toB64(out);
}
async function decrypt(blob) {
  if (blob.startsWith('plain:')) return blob.slice(6);
  if (!blob.startsWith('gcm:')) throw new Error('onbekend formaat');
  const raw = fromB64(blob.slice(4));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const key = await getKey();
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ---------- persistentie (async, geserialiseerd) ----------

let chain = Promise.resolve();
async function persistNow() {
  try {
    localStorage.setItem(SECURE_KEY, await encrypt(JSON.stringify(secure)));
  } catch { /* opslag vol/geblokkeerd */ }
}
function persist() {
  chain = chain.then(persistNow, persistNow);
  return chain;
}

function gameEntry(gameId) {
  secure.games[gameId] ??= {};
  return secure.games[gameId];
}

export const storage = {
  // Eenmalig laden/ontsleutelen; migreert de oude plaintext-opslag (v1) mee.
  async init() {
    const raw = localStorage.getItem(SECURE_KEY);
    if (raw) {
      try {
        secure = JSON.parse(await decrypt(raw));
      } catch {
        secure = emptySecure(); // corrupt of mee geknoeid -> negeren
      }
    } else {
      const old = localStorage.getItem(OLD_KEY);
      secure = emptySecure();
      if (old) {
        try {
          const v1 = JSON.parse(old) || {};
          if (v1.settings?.theme && !readSettings().theme) writeSettings({ theme: v1.settings.theme });
          secure.games = v1.games || {};
          secure.flags.migratedFromV1 = true;
        } catch { /* onleesbaar -> leeg beginnen */ }
      }
      await persistNow();
    }
    secure.games ??= {};
    secure.pending ??= [];
    secure.flags ??= {};
    secure.stats ??= {};
  },

  // --- instellingen (thema) ---
  getSetting(name, fallback = null) {
    const v = readSettings()[name];
    return v == null ? fallback : v;
  },
  setSetting(name, value) {
    const s = readSettings();
    s[name] = value;
    writeSettings(s);
  },

  // --- saves per game ---
  getSave(gameId) {
    return secure.games?.[gameId]?.save ?? null;
  },
  setSave(gameId, save) {
    gameEntry(gameId).save = save;
    persist();
  },
  clearSave(gameId) {
    if (secure.games[gameId]) { delete secure.games[gameId].save; persist(); }
  },

  // --- highscores per game ---
  getHighscores(gameId) {
    return secure.games?.[gameId]?.highscores ?? [];
  },
  getBest(gameId) {
    const scores = this.getHighscores(gameId);
    return scores.length ? scores[0].score : null;
  },
  submitScore(gameId, score, mode = 'higher') {
    const entry = gameEntry(gameId);
    const record = { score, date: new Date().toISOString() };
    const scores = [...(entry.highscores ?? []), record];
    scores.sort((a, b) => (mode === 'lower' ? a.score - b.score : b.score - a.score));
    entry.highscores = scores.slice(0, MAX_HIGHSCORES);
    persist();
    const index = entry.highscores.indexOf(record);
    return { rank: index === -1 ? null : index + 1, isRecord: index === 0 };
  },
  gamesWithScores() {
    return Object.keys(secure.games).filter((id) => (secure.games[id].highscores || []).length > 0);
  },

  // --- online-wachtrij (offline scores die nog gesynct moeten worden) ---
  addPending(game, score) {
    secure.pending.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, game, score });
    persist();
  },
  getPending() {
    return [...(secure.pending || [])];
  },
  removePending(id) {
    secure.pending = (secure.pending || []).filter((p) => p.id !== id);
    persist();
  },

  // --- statistieken (voor badges en streaks) ---
  getStat(name) {
    return secure.stats?.[name] ?? 0;
  },
  setStat(name, value) {
    secure.stats[name] = value;
    persist();
  },
  bumpStat(name, by = 1) {
    secure.stats[name] = (secure.stats[name] || 0) + by;
    persist();
    return secure.stats[name];
  },
  getStats() {
    return { ...(secure.stats || {}) };
  },

  // --- vlaggen (bv. of lokale scores al één keer online gesynct zijn) ---
  getFlag(name) {
    return Boolean(secure.flags?.[name]);
  },
  setFlag(name, value = true) {
    secure.flags[name] = value;
    persist();
  },

  // --- back-up (platte JSON) ---
  exportJson() {
    return JSON.stringify({ settings: readSettings(), games: secure.games }, null, 2);
  },
  importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Ongeldig back-upbestand');
    }
    if (parsed.settings) writeSettings(parsed.settings);
    secure.games = parsed.games || {};
    persist();
  },

  resetAll() {
    localStorage.removeItem(SECURE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(OLD_KEY);
    secure = emptySecure();
  },
};
