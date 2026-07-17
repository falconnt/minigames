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

### 3. Zet de publishable key in een GitHub Actions-secret
De sleutel staat bewust **niet** in de broncode. In plaats daarvan bewaren we hem
in een repo-secret; de deploy-workflow schrijft hem tijdens het publiceren in
`js/cloud-key.js`.

1. Kopieer in Supabase de **publishable key** (Project Settings → API; oudere
   projecten noemen dit de "anon public" sleutel).
2. Ga in GitHub naar **Settings → Secrets and variables → Actions → New
   repository secret**.
3. Naam: **`SUPABASE_ANON_KEY`** · Waarde: je publishable key. Opslaan.
4. Start een nieuwe deploy (push naar `main`, of **Actions → Deploy naar GitHub
   Pages → Run workflow**). De workflow injecteert de sleutel in de gepubliceerde
   site.

> **Let op:** een publishable key is bedoeld om publiek te zijn en is op de
> gepubliceerde site (in de JavaScript) zichtbaar — dat kan niet anders, de
> browser heeft hem nodig. De secret houdt hem alleen uit je **git-broncode/
> historie**. De database blijft beveiligd met de Row Level Security uit stap 2.

Klaar: op de site verschijnt rechtsboven de account-knop (👤). Maak een account
aan, speel een potje, en zet de highscore-schakelaar op **Online**.

> Draai je lokaal (zonder de secret), dan blijft `js/cloud-key.js` leeg en staan
> de online functies simpelweg uit — de app werkt dan met lokale highscores.

## Onderhoud

- De tabel bewaart elke inzending; de ranglijst toont de **beste score per
  gebruiker** (top 10). Voor een hobbyproject groeit dit verwaarloosbaar. Wil je
  later opruimen, dan kun je in de SQL Editor oude rijen verwijderen.
- Wil je de online functies tijdelijk uitzetten? Maak `url` of `anonKey` in
  `js/cloud-config.js` weer leeg — de app valt dan terug op alleen lokale
  highscores.
