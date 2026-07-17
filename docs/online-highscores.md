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

> **Beveiliging:** open registratie + een simpel wachtwoord = bewust lage
> beveiliging (prima voor een hobbyproject). Gebruik geen belangrijk wachtwoord.
> Scores komen van de browser, dus een handige speler kan in theorie een score
> vervalsen — acceptabel voor een vriendenranglijst, niet voor een prijzenpot.

## Setup in 5 stappen

### 1. Maak een gratis Supabase-project
Ga naar [supabase.com](https://supabase.com), maak een account (geen creditcard
nodig) en klik **New project**. Kies een naam en een databasewachtwoord (dat heb
je verder niet nodig voor deze app). Wacht tot het project klaar is.

### 2. Zet e-mailbevestiging uit
Omdat we zonder echte e-mail werken, mag Supabase niet om bevestiging vragen:

**Authentication → Sign In / Providers → Email** → zet **"Confirm email"** (of
"Enable email confirmations") **uit** en sla op.

### 3. Maak de scores-tabel
Open **SQL Editor → New query**, plak onderstaande SQL en klik **Run**:

```sql
-- Tabel met ingezonden scores
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null,
  game text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

-- Iedereen mag de ranglijst lezen
drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all"
  on public.scores for select
  using (true);

-- Alleen de ingelogde gebruiker mag zijn eigen score toevoegen
drop policy if exists "scores_insert_own" on public.scores;
create policy "scores_insert_own"
  on public.scores for insert
  with check (auth.uid() = user_id);

-- Sneller sorteren van de ranglijst
create index if not exists scores_game_score_idx
  on public.scores (game, score desc);
```

### 4. Kopieer je sleutels
Ga naar **Project Settings → API** en noteer:

- **Project URL** — bijv. `https://abcdefgh.supabase.co`
- de **anon public** sleutel (in nieuwere projecten heet die **publishable key**)

Beide zijn **publiek** en mogen in de repo — de database is beveiligd met de
Row Level Security-policies uit stap 3.

### 5. Vul ze in
Zet ze in [`js/cloud-config.js`](../js/cloud-config.js):

```js
export const CLOUD = {
  url: 'https://abcdefgh.supabase.co',
  anonKey: 'JOUW_ANON_PUBLIC_KEY',
  emailDomain: 'minigames.local',
};
```

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
