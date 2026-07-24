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

| Game             | Map                 | Omschrijving                                                                        |
| ---------------- | ------------------- | ----------------------------------------------------------------------------------- |
| City Drive       | `citydrive/`        | Top-down rijgame met garage, tuning, upgrades en drifts.                             |
| Wereldverovering | `wereldverovering/` | Beurten-strategie op de echte wereldkaart: verover landen, 2–6 spelers op één toestel. |

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

## Wereldverovering: modulaire opzet

Een beurten-strategiespel (Risk-achtig) op de **echte wereldkaart**. Spelers
starten met een klein thuisgebied; de rest van de wereld is neutraal en verover
je gaandeweg. Alles wordt in code op canvas getekend — geen kaartafbeeldingen.
De landgeometrie en buurrelaties komen uit een vooraf gegenereerde dataset
(Natural Earth 110m, publiek domein; zie `js/world-data.js`).

De afhankelijkheden lopen één kant op:

```
world-data → geo → state → (setup · combat)
constants  ↗            → view → render · input · ui → main
```

| Bestand             | Verantwoordelijkheid                                            |
| ------------------- | -------------------------------------------------------------- |
| `js/world-data.js`  | gegenereerde landen (vormen, labelpunten) + buurrelaties (`ADJ`) |
| `js/constants.js`   | balans: kleuren, eenheden, gebouwen, economie                  |
| `js/geo.js`         | projectie, bounding boxes en "welk land ligt onder deze tik"   |
| `js/state.js`       | spelstand, opslaan/laden en regels (inkomen, winst, buren)     |
| `js/setup.js`       | nieuw spel: startlanden gespreid verdelen, neutralen vullen    |
| `js/combat.js`      | gevechtsafwikkeling met steen-papier-schaar-eenheden           |
| `js/view.js`        | camera: zoom/pan en projectie graden ↔ scherm                  |
| `js/render.js`      | kaart, eigendomskleuren, markeringen en troepen-badges tekenen |
| `js/input.js`       | slepen/knijpen/scrollen + tik → landselectie                   |
| `js/ui.js`          | schermen en panelen (menu, doorgeven, dialogen, HUD)           |
| `js/pwa.js`         | installatieknop + service worker                               |
| `js/main.js`        | de besturing: fasen, beurten en alles aan elkaar knopen        |

Andere balans → `constants.js`. Andere kaart/landen → opnieuw `world-data.js`
genereren. Ander gevechtsgevoel → `combat.js`. Nieuwe fase of scherm → `main.js`
+ `ui.js`.

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
7. Voeg een entry toe aan `js/standalone.js` (in de repo-root) zodat de game als
   **losse app** op de Minigames-startpagina verschijnt. Deze link doet niet mee
   aan highscores, badges of sync.
8. Zet een "terug naar Minigames"-link in de game (naar `../../`), zodat spelers
   vanuit het spel weer terug kunnen naar de verzameling.
