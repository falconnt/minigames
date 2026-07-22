# Stand-alone games

Deze map bevat **losstaande games** die _niet_ deel uitmaken van de Minigames-app.
Ze staan bewust buiten de gedeelde `js/`-registry, hebben geen highscores of
account-sync, en verschijnen niet op de Minigames-startpagina.

Elke game hier is een eigen, op zichzelf staande webapp:

- **eigen pagina** — een losse `index.html` met alle code erin;
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

## Een nieuwe stand-alone game toevoegen

1. Maak een nieuwe submap: `stand-alone/<naam>/`.
2. Zet daarin een `index.html` met de volledige game.
3. Voeg een `manifest.webmanifest` toe met `"start_url": "./"` en
   `"scope": "./"` (relatief — houdt de scope binnen de eigen map).
4. Voeg een `sw.js` toe met een eigen cachenaam (`<naam>-v1`) en verhoog de
   versie bij elke inhoudelijke wijziging.
5. Zet de PWA-tags en de installatieknop-logica in `index.html`
   (zie `citydrive/index.html` als voorbeeld).
6. Maak iconen (192, 512 en een maskable 512) in `icons/`.
