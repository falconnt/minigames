# 🎮 Minigames

Een minigame-framework dat volledig statisch draait op **GitHub Pages** — geen build-stap, geen server, geen database. Puur HTML, CSS en JavaScript (ES modules).

## Functies

- **Gedeeld save-mechanisme** — elke game kan voortgang opslaan via een simpele API; alles staat in één localStorage-sleutel (`minigames.v1`).
- **Highscores** — top 10 per game, met datum. Ondersteunt zowel "hoger is beter" (punten) als "lager is beter" (reactietijd).
- **Back-up** — via ⚙️ in de header kun je alle saves en highscores exporteren/importeren als JSON-bestand, zodat je ze meeneemt naar een ander apparaat.
- **Licht & donker thema** — volgt standaard je systeemvoorkeur; de 🌓-knop overschrijft dat en onthoudt je keuze.
- **Categorieën** — games zijn ingedeeld in categorieën met filterknoppen op het startscherm.
- **Hash-routing** — `#/game/<id>` werkt zonder serverconfiguratie, dus ook op een GitHub Pages-projectpagina.

## Meegeleverde games

| Game | Categorie | Score |
| --- | --- | --- |
| 🔢 2048 | Puzzel | punten (hoger is beter) — spel wordt automatisch bewaard |
| ⚡ Reactietest | Reflex | milliseconden (lager is beter) |

## Structuur

```
index.html            app-shell (header, thema-knop, opslagdialoog)
css/style.css         stijlen + licht/donker thema via CSS-variabelen
js/main.js            router, startscherm, gamepagina, back-updialoog
js/registry.js        register van games en categorieën
js/storage.js         gedeelde opslag: saves, highscores, instellingen, export/import
js/theme.js           licht/donker thema
games/<id>.js         één module per game
```

## Een nieuwe game toevoegen

1. **Maak `games/mijngame.js`** met een `init`-functie:

   ```js
   export function init(root, ctx) {
     root.innerHTML = `<button id="win">Win!</button>`;
     root.querySelector('#win').addEventListener('click', () => {
       ctx.submitScore(100); // komt automatisch in de highscore-lijst
     });
     // Optioneel: return een opruimfunctie (timers/listeners stoppen).
     return () => {};
   }
   ```

   De `ctx` (context) biedt:

   | Functie | Doel |
   | --- | --- |
   | `ctx.save(data)` | voortgang opslaan (elk JSON-serialiseerbaar object) |
   | `ctx.load()` | opgeslagen voortgang ophalen (`null` als er niets is) |
   | `ctx.clearSave()` | save verwijderen (bijv. na game over) |
   | `ctx.submitScore(score)` | score indienen; geeft `{ rank, isRecord }` terug |
   | `ctx.getHighscores()` | top 10 van deze game |

2. **Registreer de game** in `js/registry.js`:

   ```js
   {
     id: 'mijngame',
     title: 'Mijn game',
     icon: '🎯',
     category: 'puzzel',            // bestaande of nieuwe categorie
     description: 'Korte omschrijving.',
     scoreMode: 'higher',           // of 'lower' als lager beter is
     formatScore: (s) => `${s} punten`,
     load: () => import('../games/mijngame.js'),
   }
   ```

3. Klaar — de game verschijnt op het startscherm, inclusief highscores en (als je `ctx.save` gebruikt) een "verder spelen"-badge.

Een nieuwe categorie toevoegen kan in dezelfde file, in de `categories`-lijst.

## Deployen op GitHub Pages

1. Merge naar `main`.
2. Ga in GitHub naar **Settings → Pages** en zet **Source** op **GitHub Actions**.
3. De workflow `.github/workflows/deploy.yml` publiceert de site bij elke push naar `main`.

## Lokaal draaien

ES modules vereisen een webserver (geen `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Opslag: hoe en waarom lokaal?

GitHub Pages is statische hosting zonder server of database, dus saves en highscores staan in **localStorage van de browser** (per apparaat). Het exporteren/importeren via de ⚙️-dialoog dient als back-up en overdracht tussen apparaten. Wil je later wereldwijde online leaderboards, dan kan `js/storage.js` uitgebreid worden met een adapter naar een externe dienst (bijv. Firebase of Supabase) zonder dat de games zelf hoeven te veranderen.
