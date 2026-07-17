// Gedeeld opslagmechanisme voor alle minigames.
// Alles staat in één localStorage-sleutel zodat export/import triviaal is:
// { settings: {...}, games: { [gameId]: { save: any, highscores: [{score, date}] } } }

const KEY = 'minigames.v1';
const MAX_HIGHSCORES = 10;

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function gameEntry(data, gameId) {
  data.games ??= {};
  data.games[gameId] ??= {};
  return data.games[gameId];
}

export const storage = {
  // --- instellingen (thema, enz.) ---
  getSetting(name, fallback = null) {
    return readAll().settings?.[name] ?? fallback;
  },

  setSetting(name, value) {
    const data = readAll();
    data.settings ??= {};
    data.settings[name] = value;
    writeAll(data);
  },

  // --- saves per game ---
  getSave(gameId) {
    return readAll().games?.[gameId]?.save ?? null;
  },

  setSave(gameId, save) {
    const data = readAll();
    gameEntry(data, gameId).save = save;
    writeAll(data);
  },

  clearSave(gameId) {
    const data = readAll();
    if (data.games?.[gameId]) {
      delete data.games[gameId].save;
      writeAll(data);
    }
  },

  // --- highscores per game ---
  getHighscores(gameId) {
    return readAll().games?.[gameId]?.highscores ?? [];
  },

  getBest(gameId, mode = 'higher') {
    const scores = this.getHighscores(gameId);
    if (!scores.length) return null;
    // De lijst is gesorteerd opgeslagen, dus de beste staat vooraan.
    return scores[0].score;
  },

  // mode: 'higher' = hoger is beter, 'lower' = lager is beter (bijv. reactietijd).
  // Geeft { rank, isRecord } terug; rank is null als de score buiten de top valt.
  submitScore(gameId, score, mode = 'higher') {
    const data = readAll();
    const entry = gameEntry(data, gameId);
    const record = { score, date: new Date().toISOString() };
    const scores = [...(entry.highscores ?? []), record];
    scores.sort((a, b) => (mode === 'lower' ? a.score - b.score : b.score - a.score));
    entry.highscores = scores.slice(0, MAX_HIGHSCORES);
    writeAll(data);
    const index = entry.highscores.indexOf(record);
    return { rank: index === -1 ? null : index + 1, isRecord: index === 0 };
  },

  // --- back-up ---
  exportJson() {
    return JSON.stringify(readAll(), null, 2);
  },

  importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Ongeldig back-upbestand');
    }
    writeAll(parsed);
  },

  resetAll() {
    localStorage.removeItem(KEY);
  },
};
