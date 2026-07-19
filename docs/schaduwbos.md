# 🥷 Schaduwbos

| | |
| --- | --- |
| **Categorie** | Arcade |
| **Module** | [`games/schaduwbos.js`](../games/schaduwbos.js) |
| **Score** | punten (overleefde tijd + kills) — hoger is beter |
| **Opslag** | nee (alleen je highscore wordt bewaard) |

## Doel

Een schermvullend, donker **ninja-overlevingsspel** van bovenaf. Je bent een
ninja in een spookbos; **monsters en geesten komen van alle kanten** op je af.
Je **katana vliegt automatisch om je heen** en maait alles weg wat het raakt —
jij zorgt dat je de monsters langs je zwaard laat lopen en niet geraakt wordt.
Overleef zo lang mogelijk! Alles wordt per pixel op een canvas getekend (geen
afbeeldingen): mistlagen, kromme boom-silhouetten, vuurvliegjes, gloeiende ogen
en zacht maanlicht rond de ninja.

## Besturing

Speelbaar met de **vinger** of het **toetsenbord**.

| Actie | Vinger | Toetsenbord |
| --- | --- | --- |
| Lopen | **joystick** (verschijnt waar je de linkerhelft aanraakt) | ← ↑ → ↓ (of W A S D) |
| Snelle draai-boost | knop **🌀** | spatie of J |
| Dash (wegduiken) | knop **💨** | K of Shift |
| Terug naar menu | knop **← Terug** | — |

De joystick is analoog: zachtjes duwen = rustig sturen, vol duwen = topsnelheid.
Met de **🌀-boost** whirlt je zwaard heel even veel sneller en verder (handig als
je omsingeld bent). Met de **💨-dash** schiet je snel weg en ben je heel even
onkwetsbaar. Met de **🔊/🔇-knop** zet je het geluid aan of uit.

## Spelverloop

1. Je start met **5 hartjes** (❤️). Word je geraakt, dan verlies je een hartje en
   ben je heel even onkwetsbaar (je knippert). Bij **0 hartjes** is het game over.
2. Er zijn drie soorten vijanden: **schaduwen** (traag), **geesten** (snel, met
   een golvende beweging) en af en toe een grote taaie **grom**.
3. **Elke 10 seconden** komt er een **golf** met een lading extra monsters en
   geesten tegelijk (met een "Golf X!"-melding); het spawntempo stapt daarna ook
   omhoog. Zo wordt het steeds spannender.
4. **Elke 20 seconden** verschijnt een **gouden geest** (met een zwaard-markering
   en gouden gloed). Versla 'm en je krijgt er een **extra rondvliegend zwaard**
   bij — de zwaarden verdelen zich rondom je (maximaal 6). Zie de **⚔️-teller**.
5. De **map is groter dan het scherm**; de camera volgt je, dus je kunt over een
   groot speelveld rondrennen en vluchten. De rode rand is de grens van de map.

## Score & highscore

- Je **score** = **overleefde tijd × 10 + kills × 5** punten (hoger is beter).
- Je eindscore wordt ingediend bij **game over** en wanneer je via **← Terug**
  stopt terwijl je score boven 0 is.
- De **highscore-lijst** toont je top 10.
