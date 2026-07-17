// Configuratie voor online accounts + highscores via Supabase.
//
// Vul hieronder je eigen Supabase-gegevens in. Beide waarden zijn PUBLIEK en
// mogen gewoon in de repo staan — de anon-sleutel is bedoeld voor gebruik in de
// browser en de database is beveiligd met Row Level Security (zie docs/online-highscores.md).
//
// Zolang deze leeg zijn, werkt de app precies als voorheen (alleen lokale
// highscores per apparaat); de account- en online-functies zijn dan verborgen.

export const CLOUD = {
  url: '',      // bijv. 'https://abcdefgh.supabase.co'
  anonKey: '',  // de publieke "anon"/"publishable" sleutel uit je Supabase-project
  // Gebruikers loggen in met alleen een gebruikersnaam; intern koppelen we die
  // aan een nep-e-mail (naam@<emailDomain>) zodat Supabase-auth kan worden gebruikt.
  emailDomain: 'minigames.local',
};

export function cloudEnabled() {
  return Boolean(CLOUD.url && CLOUD.anonKey);
}
