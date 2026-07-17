// Dunne cloud-laag rond Supabase (Auth + database) via directe REST-calls —
// geen externe SDK nodig, dus de app blijft zelfstandig en offline-vriendelijk.
//
// - Auth: GoTrue-endpoints onder /auth/v1 (signup, token, logout).
// - Data: PostgREST onder /rest/v1/scores.
// De sessie (tokens + gebruikersnaam) wordt in localStorage bewaard, zodat je
// ingelogd blijft na herladen.

import { CLOUD, cloudEnabled } from './cloud-config.js';

const SESSION_KEY = 'minigames.cloud.session';

// ---------- sessieopslag ----------

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}
function writeSession(s) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

export function currentUser() {
  const s = readSession();
  return s && s.username ? { id: s.user_id, username: s.username } : null;
}
export function isLoggedIn() {
  return currentUser() !== null;
}

// ---------- helpers ----------

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${CLOUD.emailDomain}`;
}

function validName(username) {
  return /^[a-z0-9_-]{3,20}$/i.test(username.trim());
}

async function authFetch(path, body) {
  const res = await fetch(`${CLOUD.url}/auth/v1/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: CLOUD.anonKey },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.error || data.message || 'Onbekende fout';
    throw new Error(msg);
  }
  return data;
}

function storeSessionFrom(tokenResponse, username) {
  // GoTrue geeft access_token, refresh_token, expires_in en user terug.
  const uname = username || tokenResponse.user?.user_metadata?.username || null;
  writeSession({
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    expires_at: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
    user_id: tokenResponse.user?.id || readSession()?.user_id || null,
    username: uname,
  });
}

// Zorgt voor een geldig access_token; ververst zo nodig via de refresh_token.
async function validToken() {
  const s = readSession();
  if (!s) throw new Error('Niet ingelogd');
  if (Date.now() < s.expires_at - 30000) return s.access_token;
  // verlopen -> verversen
  const data = await authFetch('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
  storeSessionFrom(data, s.username);
  return data.access_token;
}

// ---------- publieke auth-API ----------

export async function signUp(username, password) {
  if (!cloudEnabled()) throw new Error('Online opslag is niet geconfigureerd');
  if (!validName(username)) throw new Error('Gebruikersnaam: 3–20 tekens (letters, cijfers, _ of -)');
  if (!password || password.length < 6) throw new Error('Wachtwoord: minimaal 6 tekens');

  const data = await authFetch('signup', {
    email: usernameToEmail(username),
    password,
    data: { username: username.trim() },
  });
  // Met e-mailbevestiging UIT geeft signup meteen een sessie terug.
  if (data.access_token) {
    storeSessionFrom(data, username.trim());
    return currentUser();
  }
  // Anders proberen we direct in te loggen (lukt alleen als bevestiging uit staat).
  return signIn(username, password);
}

export async function signIn(username, password) {
  if (!cloudEnabled()) throw new Error('Online opslag is niet geconfigureerd');
  const data = await authFetch('token?grant_type=password', {
    email: usernameToEmail(username),
    password,
  });
  storeSessionFrom(data, data.user?.user_metadata?.username || username.trim());
  return currentUser();
}

export async function signOut() {
  const s = readSession();
  writeSession(null);
  if (s && cloudEnabled()) {
    // Best effort; sessie is lokaal al gewist.
    try {
      await fetch(`${CLOUD.url}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: CLOUD.anonKey, Authorization: `Bearer ${s.access_token}` },
      });
    } catch { /* niets aan te doen */ }
  }
}

// ---------- scores ----------

export async function submitScore(game, score) {
  if (!cloudEnabled() || !isLoggedIn()) return;
  const token = await validToken();
  const user = currentUser();
  const res = await fetch(`${CLOUD.url}/rest/v1/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CLOUD.anonKey,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ user_id: user.id, username: user.username, game, score }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Score opslaan mislukt (${res.status}): ${t || res.statusText}`);
  }
}

// Haalt de online ranglijst op: beste score per gebruiker, top `limit`.
// mode 'higher' = hoger beter (aflopend), 'lower' = lager beter (oplopend).
export async function getLeaderboard(game, mode = 'higher', limit = 10) {
  if (!cloudEnabled()) return [];
  const asc = mode === 'lower';
  const order = `score.${asc ? 'asc' : 'desc'}`;
  const url = `${CLOUD.url}/rest/v1/scores?game=eq.${encodeURIComponent(game)}&select=username,score,created_at&order=${order}&limit=200`;
  const res = await fetch(url, { headers: { apikey: CLOUD.anonKey } });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Ranglijst ophalen mislukt (${res.status}): ${t || res.statusText}`);
  }
  const rows = await res.json();
  // beste per gebruiker (de lijst is al gesorteerd, dus eerste voorkomen wint)
  const best = new Map();
  for (const r of rows) {
    if (!best.has(r.username)) best.set(r.username, r);
  }
  return [...best.values()].slice(0, limit);
}
