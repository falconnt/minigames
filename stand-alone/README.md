# Stand-alone games

Deze map bevat **losstaande games** die _niet_ deel uitmaken van de Minigames-app.
Ze staan bewust buiten de gedeelde `js/`-registry, hebben geen highscores of
account-sync, en verschijnen niet op de Minigames-startpagina.

Elke game hier is een eigen, op zichzelf staande webapp:

- **eigen pagina** — een `index.html` als schil, met de code in losse
  CSS-bestanden (`css/`) en ES-modules (`js/`);
- **eigen PWA** — een eigen `manifest.webmanifest`, `sw.js` en `icons/`, met een
  scope die beperkt is tot de eigen map. Daardoor is elke game apart
  installeerbaar op Android (via Chrome's "Toevoegen aan startscherm" of de
  eigen **installatieknop** in de game).

Omdat de deploy-workflow de hele repo naar GitHub Pages publiceert, is elke game
hier meteen bereikbaar op een eigen URL, bijvoorbeeld:

```
https://<gebruiker>.github.io/minigames/stand-alone/citydrive/
```

## Games

| Game       | Map          | Omschrijving                                              |
| ---------- | ------------ | -------------------------------------------------------- |
| City Drive | `citydrive/` | Top-down rijgame met garage, tuning, upgrades en drifts. |

## City Drive: modulaire opzet

City Drive is opgeknipt zodat je één ding kunt aanpassen zonder de hele game te
herschrijven. De afhankelijkheden lopen één kant op:

```
constants → cars → state → (world · fx · input · audio · economy)
          → physics · render · garage → main
```

| Bestand           | Verantwoordelijkheid                                     |
| ----------------- | -------------------------------------------------------- |
| `js/constants.js` | wereldmaten, opslagsleutel en kleurenpaletten            |
| `js/cars.js`      | autodefinities (`DEFS`) + afgeleide stats                |
| `js/state.js`     | gedeelde state, speler/camera en opslaan/laden           |
| `js/world.js`     | genereert de stad (blokken, gebouwen, parken)            |
| `js/draw-car.js`  | het tekenen van een auto (gedeeld)                       |
| `js/fx.js`        | remsporen, rook en score-popups                          |
| `js/input.js`     | toetsenbord + touch-joysticks → één `input`              |
| `js/audio.js`     | motorsound (Web Audio)                                    |
| `js/economy.js`   | geldweergave en formattering                             |
| `js/physics.js`   | rijsimulatie, botsingen en verdienen                     |
| `js/render.js`    | wereld + minimap tekenen                                 |
| `js/garage.js`    | garage-UI (auto's, tuning, upgrades)                     |
| `js/pwa.js`       | installatieknop + service worker                         |
| `js/main.js`      | koppelt alles en draait de game-loop                     |

Nieuwe auto → `cars.js`. Ander stadsontwerp → `world.js`. Rijgevoel → `physics.js`.
Nieuw tuning-onderdeel → `garage.js` (+ evt. `constants.js`).

## Een nieuwe stand-alone game toevoegen

1. Maak een nieuwe submap: `stand-alone/<naam>/`.
2. Zet daarin een `index.html` als schil die naar `css/` en een
   `js/main.js`-module verwijst (zie `citydrive/` als voorbeeld).
3. Voeg een `manifest.webmanifest` toe met `"start_url": "./"` en
   `"scope": "./"` (relatief — houdt de scope binnen de eigen map).
4. Voeg een `sw.js` toe met een eigen cachenaam (`<naam>-v1`) en verhoog de
   versie bij elke inhoudelijke wijziging (en houd de app-shell-lijst gelijk aan
   je bestanden).
5. Zet de PWA-tags en de installatieknop-logica in `index.html` / `js/pwa.js`.
6. Maak iconen (192, 512 en een maskable 512) in `icons/`.
