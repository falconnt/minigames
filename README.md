# 🎮 Minigames

Een minigame-framework dat volledig statisch draait op **GitHub Pages** — geen build-stap, geen server, geen database. Puur HTML, CSS en JavaScript (ES modules).

## Functies

- **Gedeeld save-mechanisme** — elke game kan voortgang opslaan via een simpele API; alles staat in één localStorage-sleutel (`minigames.v1`).
- **Highscores** — top 10 per game, met datum. Ondersteunt zowel "hoger is beter" (punten) als "lager is beter" (reactietijd).
- **Online highscores (optioneel)** — koppel een gratis Supabase-project voor accounts en een online ranglijst per game, met een schakelaar "Dit apparaat / Online". Zie [docs/online-highscores.md](docs/online-highscores.md). Zonder configuratie blijft alles lokaal werken.
- **Highscore-overzicht** — via 🏆 in de header een aparte pagina met per game de kampioen (👑) en de top, met een schakelaar "Dit apparaat / Online".
- **Versleutelde lokale opslag** — saves en highscores staan versleuteld (AES-GCM) op het apparaat; knoeien maakt de data ongeldig.
- **Licht & donker thema** — volgt standaard je systeemvoorkeur; de 🌓-knop overschrijft dat en onthoudt je keuze.
- **Categorieën** — games zijn ingedeeld in categorieën met filterknoppen op het startscherm.
- **Schermvullend spelen** — elke game past zijn speelveld aan de schermgrootte aan, zodat speelveld, knoppen en score zonder scrollen in beeld staan; uitleg zit achter een ❔-knop. Zie de richtlijn hieronder.
- **Record-feestje & geluid** — confetti, een melding, trilfeedback (mobiel) en een klein fanfaretje bij elk nieuw record (in elke game, via het framework). Games hebben eigen geluidjes (ping, plop); alles is in code gesynthetiseerd en uit te zetten in Instellingen.
- **Badges & streak** — verdien badges (eerste potje, alle games gespeeld, records, game-prestaties) met een melding bij het verdienen; te bekijken op de 🏆-pagina. Speel meerdere dagen op rij voor een 🔥-streak op het startscherm.
- **Testmodus** — aan te zetten in **Instellingen**. In testmodus wordt er **niets** opgeslagen: geen highscores, badges, stats of online sync — zo blijft de ranglijst eerlijk terwijl je games test. Een 🧪-badge in de header maakt duidelijk dat testmodus actief is. Games kunnen bovendien eigen testtools tonen (bijv. de level-skipper naar de eindbaas in Ruimteschieter). Zie de richtlijn hieronder.
- **Hash-routing** — `#/game/<id>` werkt zonder serverconfiguratie, dus ook op een GitHub Pages-projectpagina.

## Meegeleverde games

Elke game heeft een eigen documentatiepagina in [`docs/`](docs/) met het doel,
de besturing, de mechanics en de manier van scoren.

| Game | Categorie | Score | Documentatie |
| --- | --- | --- | --- |
| 🐦 Flappy Bird | Arcade | punten (hoger is beter) | [docs/vogelvlucht.md](docs/vogelvlucht.md) |
| 🔢 2048 | Puzzel | punten (hoger is beter) — spel wordt automatisch bewaard | [docs/2048.md](docs/2048.md) |
| 🟩 Blokjes (Tetris) | Puzzel | punten (hoger is beter) — stapel wordt automatisch bewaard | [docs/tetris.md](docs/tetris.md) |
| 🚀 Ruimteschieter | Arcade | punten (hoger is beter) | [docs/ruimteschieter.md](docs/ruimteschieter.md) |
| 🏎️ Racen | Arcade | afstand in meters (hoger is beter) | [docs/racen.md](docs/racen.md) |
| 🥷 Schaduwbos | Arcade | punten (hoger is beter) — ninja-overlevingsspel | [docs/schaduwbos.md](docs/schaduwbos.md) |
| ⚡ Reactietest | Reflex | milliseconden (lager is beter) | [docs/reactietest.md](docs/reactietest.md) |
| 🏇 Paardensport | Simulatie | wedstrijdpunten (hoger is beter) — voortgang wordt bewaard | [docs/paardensport.md](docs/paardensport.md) |

### Paardensport

Een uitgebreide paardensimulatie die het save-mechanisme ten volle benut. Je
beheert een eigen manege met een top-down erf (stallen + buitenbak) en paarden
in zijaanzicht, allemaal in code op canvas getekend — geen afbeeldingen of
emoji's — met een dag/nacht-schakelaar.

- Kies een gratis beginnerspaard; koop later extra stallen en paarden (je hebt
  altijd eerst een vrije stal nodig voordat je een paard koopt).
- Verzorg je paard (poetsen, voeren, water, rust). Een vies of moe paard
  presteert tot 45% slechter bij wedstrijden.
- Train vaardigheden in de buitenbak en koop zadels/hoofdstellen voor een
  prestatiebonus.
- Drie disciplines: **springen** met een eigen parcoursbouwer en instelbare
  hindernishoogtes, **dressuur** op ritme/timing, en **racen** tegen
  tegenstanders.
- Verdien prijzengeld en wedstrijdpunten; een gratis dagelijkse bonus en een
  gesimuleerde muntenknop houden de economie soepel (geen echte betalingen).

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
   | `ctx.submitScore(score)` | score indienen; geeft `{ rank, isRecord }` terug (slaat niets op in testmodus) |
   | `ctx.getHighscores()` | top 10 van deze game |
   | `ctx.testMode` | `true` als testmodus aan staat — toon dan optioneel testtools/cheats |

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

4. **Documenteer de game** — maak `docs/<id>.md` met het doel, de besturing, de
   mechanics en de manier van scoren, en voeg hem toe aan de tabel in
   [`docs/README.md`](docs/README.md). Gebruik een bestaande pagina als sjabloon.

Een nieuwe categorie toevoegen kan in dezelfde file, in de `categories`-lijst.

### Richtlijn: schermvullend spelen

Games horen zonder scrollen speelbaar te zijn: speelveld, knoppen en score
passen samen in beeld, op elke schermgrootte. Concreet:

- Meet in een `layout()`-functie de resterende hoogte met `availableHeight(el,
  reserve)` uit [`js/fit.js`](js/fit.js) (en `heightBelow(el)` voor de ruimte
  die knoppen/tekst eronder nodig hebben) en maak het speelveld zo groot als in
  breedte **én** hoogte past. Herbereken bij `resize` (of met een
  `ResizeObserver`).
- Voor canvas-games met een vaste beeldverhouding: begrens de weergavebreedte
  (`style.maxWidth = beschikbareHoogte × breedte/hoogte`), dan schaalt de
  hoogte vanzelf mee.
- Zet uitleg/instructies achter een **❔-knop** met een `<dialog
  class="game-help">` in plaats van een vaste teksttegel onder het spel.
- Test op een smal en laag scherm (bijv. 360×640) dat het spel inclusief
  bediening boven de vouw blijft. Blokjes (Tetris) en 2048 zijn
  referentie-implementaties.

### Richtlijn: testmodus en testtools

Testmodus staat in **Instellingen** (`storage.getSetting('testMode')`). Het
framework regelt het belangrijkste al: in testmodus doet `ctx.submitScore()`
**niets** — geen highscore, badge, stat of online sync — en geeft het
`{ rank: null, isRecord: false, testMode: true }` terug. Je hoeft in je game
dus niets extra's te doen om de ranglijst eerlijk te houden.

Wil je een game testbaar maken met eigen cheats/tools (bijv. een level-skipper),
lees dan `ctx.testMode` en toon die knoppen alleen als die `true` is:

```js
export function init(root, ctx) {
  if (ctx.testMode) {
    // Alleen zichtbaar in testmodus: sla door naar de eindbaas o.i.d.
    const btn = document.createElement('button');
    btn.textContent = '🧪 Eindbaas';
    btn.addEventListener('click', skipToBoss);
    toolbar.appendChild(btn);
  }
}
```

Ruimteschieter is de referentie-implementatie: in testmodus verschijnt een
**🧪 Eindbaas**-knop die direct naar de eerstvolgende baasgolf springt, zodat je
die functionaliteit kunt testen zonder eerst tien golven te spelen.

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
