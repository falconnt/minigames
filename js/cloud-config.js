// Configuratie voor online accounts + highscores via Supabase.
//
// De project-URL is publiek en mag in de repo. De publishable/anon-sleutel houden
// we bewust UIT de broncode: die komt uit de GitHub Actions-secret
// `SUPABASE_ANON_KEY` en wordt bij het deployen in js/cloud-key.js geschreven
// (zie .github/workflows/deploy.yml en docs/online-highscores.md).
//
// Zolang er geen sleutel is (lokaal, of secret niet ingesteld), werkt de app
// precies als voorheen: alleen lokale highscores per apparaat, account- en
// online-functies verborgen.

import { RUNTIME_ANON_KEY } from './cloud-key.js';

export const CLOUD = {
  url: 'https://sapaexufrcenzzevemxg.supabase.co',
  anonKey: RUNTIME_ANON_KEY,
  // Gebruikers loggen in met alleen een gebruikersnaam; intern koppelen we die
  // aan een nep-e-mail (naam@<emailDomain>) zodat Supabase-auth gebruikt kan worden.
  emailDomain: 'minigames.local',
};

export function cloudEnabled() {
  return Boolean(CLOUD.url && CLOUD.anonKey);
}
