# Tools — kaartdata & iconen genereren

Deze scripts genereren de statische assets van Wereldverovering. Je hoeft ze
alleen te draaien als je de kaart wilt herzien; de uitvoer (`js/world-data.js`
en `icons/*.png`) staat al in de repo.

## 1. Landen + buurrelaties (`js/world-data.js`)

```bash
cd tools
# eenmalig de brondata ophalen (Natural Earth 110m, publiek domein)
curl -sSL -o ne110.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
node build-world.js
```

`build-world.js` vereenvoudigt de landvormen (Douglas-Peucker), dropt piepkleine
eilanden, berekent buurrelaties via nabijheid van verdichte grenspunten en
verbindt losse eilanden zodat de hele wereld één samenhangend netwerk vormt.
Antarctica wordt weggelaten.

## 2. Iconen (`icons/icon-*.png`)

```bash
cd tools
node build-icons.mjs
```

Tekent een wereldkaart (met de echte landvormen uit `world-data.js`) in een
donkere tegel en schrijft `icon-192.png`, `icon-512.png` en
`icon-maskable-512.png`. Dependency-vrij: eigen PNG-encoder via `zlib`.
