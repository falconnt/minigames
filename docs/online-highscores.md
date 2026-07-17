# ☁️ Online highscores (Supabase)

De app werkt standaard volledig lokaal (highscores per apparaat). Wil je een
**online ranglijst** met **accounts**, dan koppel je een gratis
[Supabase](https://supabase.com)-project. Dit is optioneel: zolang je niets
instelt, blijft alles werken zoals voorheen en zijn de account-/online-functies
verborgen.

## Hoe het werkt

- Spelers maken een account met **alleen een gebruikersnaam en wachtwoord** (geen
  e-mail, geen bevestiging). Intern koppelen we de gebruikersnaam aan een
  nep-e-mail (`naam@minigames.local`) zodat we de veilige auth van Supabase
  kunnen gebruiken — **wachtwoorden worden door Supabase versleuteld**, wij slaan
  ze nooit zelf op.
- Ben je ingelogd, dan wordt elke highscore **ook online** opgeslagen. Naast elke
  game verschijnt een schakelaar **Dit apparaat / Online**.
- Je login wordt onthouden in `localStorage`, dus je blijft ingelogd na herladen.

### Lokale opslag, offline en synchronisatie

- Saves en highscores staan lokaal **versleuteld** (AES-GCM) in de sleutel
  `minigames.v2`. Zo kun je in de browser-opslag niet zomaar met je scores
  knoeien: geknoei maakt de blob ongeldig en wordt genegeerd. (De sleutel zit in
  de app, dus dit stopt sleutelen-in-de-browser, niet iemand die de broncode
  leest — de **online ranglijst is de echte waarheid**.)
- Ben je **offline**, dan wordt je score gewoon lokaal bewaard én in een
  wachtrij gezet. Zodra er weer verbinding is (en je bent ingelogd), gaat de
  wachtrij vanzelf naar Supabase.
- Bij het **eerste account** dat je aanmaakt, worden je bestaande lokale
  highscores één keer gekoppeld en online gezet — ze "verhuizen" naar je account.
- Een oudere opslag (`minigames.v1`, onversleuteld) wordt bij de eerste keer
  automatisch gemigreerd naar de nieuwe versleutelde versie.

> **Beveiliging:** open registratie + een simpel wachtwoord = bewust lage
> beveiliging (prima voor een hobbyproject). Gebruik geen belangrijk wachtwoord.
> Scores komen van de browser, dus een handige speler kan in theorie een score
> vervalsen — acceptabel voor een vriendenranglijst, niet voor een prijzenpot.

## Setup

Het project `sapaexufrcenzzevemxg` is al aangemaakt en aan de repo gekoppeld, en
de **project-URL staat al ingevuld** in [`js/cloud-config.js`](../js/cloud-config.js).
Er zijn nog drie dingen nodig:

### 1. Zet e-mailbevestiging uit
Omdat we zonder echte e-mail werken, mag Supabase niet om bevestiging vragen:
**Authentication → Sign In / Providers → Email** → zet **"Confirm email"** (of
"Enable email confirmations") **uit** en sla op.

### 2. Maak de scores-tabel
Twee manieren:

- **Automatisch** — de migratie [`supabase/migrations/20260717120000_init_scores.sql`](../supabase/migrations/20260717120000_init_scores.sql)
  staat in de repo; via de Supabase↔GitHub-koppeling wordt die toegepast. Zet in
  de integratie de "Supabase directory" op `supabase/` als dat nog niet zo is.
- **Handmatig (zekerste weg)** — open **SQL Editor → New query** in Supabase, plak
  de inhoud van dat migratiebestand en klik **Run**. Dit maakt de tabel + de
  beveiliging (Row Level Security) aan.

### 3. Vul de anon-sleutel in
Ga naar **Project Settings → API**, kopieer de **anon public** sleutel (in
nieuwere projecten heet die **publishable key**) en zet die in
[`js/cloud-config.js`](../js/cloud-config.js):

```js
export const CLOUD = {
  url: 'https://sapaexufrcenzzevemxg.supabase.co', // al ingevuld
  anonKey: 'JOUW_ANON_PUBLIC_KEY',                 // ← plak hier je sleutel
  emailDomain: 'minigames.local',
};
```

De sleutel is **publiek** en mag in de repo — de database is beveiligd met de
Row Level Security-policies uit stap 2.

Commit, push naar `main`, en klaar: op de site verschijnt rechtsboven de
account-knop (👤). Maak een account aan, speel een potje, en zet de
highscore-schakelaar op **Online**.

## Onderhoud

- De tabel bewaart elke inzending; de ranglijst toont de **beste score per
  gebruiker** (top 10). Voor een hobbyproject groeit dit verwaarloosbaar. Wil je
  later opruimen, dan kun je in de SQL Editor oude rijen verwijderen.
- Wil je de online functies tijdelijk uitzetten? Maak `url` of `anonKey` in
  `js/cloud-config.js` weer leeg — de app valt dan terug op alleen lokale
  highscores.
