# 🟩 Blokjes (Minecraft-editie)

| | |
| --- | --- |
| **Categorie** | Puzzel |
| **Module** | [`games/tetris.js`](../games/tetris.js) |
| **Score** | punten — hoger is beter |
| **Opslag** | ja, de stapel wordt automatisch bewaard |

## Doel

Een Tetris-variant waarin de vallende vormen zijn getekend als **Minecraft-blokken**
(gras, diamant, goud, amethist, redstone, lapis en eiken). Draai en schuif de
blokken zodat ze onderin een volledige rij vormen: volle rijen **verdwijnen** en
leveren punten op. Loopt de stapel tot bovenaan vol, dan is het spel voorbij.

Alle blokken worden per pixel op een canvas getekend — geen afbeeldingen. Het
speelveld is een donkere "steengroeve" zodat de gekleurde blokken goed opvallen.

## Besturing

Speelbaar met de **vinger**, de **muis** of het **toetsenbord**.

| Actie | Vinger | Toetsenbord |
| --- | --- | --- |
| Naar links / rechts | knop ◀ ▶ of veeg opzij | ← → (of A / D) |
| Draaien | knop ⟳ (tussen de pijltjes) of **tik** op het veld | ↑ (of W / X) |
| Zakken | knop **⬇ vallen** ingedrukt houden of veeg omlaag | ↓ (of S) |
| In één keer laten vallen | — | spatie |
| Pauze | knop **Pauze** | P |

De richtingsknoppen herhalen als je ze **ingedrukt houdt**. De **⬇ vallen**-knop
laat je blok zakken zolang je hem vasthoudt; laat je los, dan valt het blok verder
op eigen tempo — zo kun je het vlak voor de landing nog opzij schuiven om ergens
in te passen. Er verschijnt een doorzichtig **spookblok** dat laat zien waar het
blok terechtkomt, zodat mikken makkelijker is.

## Spelverloop

1. Steeds valt er één van de zeven blokvormen; rechts zie je onder **Volgende**
   welke daarna komt.
2. Een blok stopt zodra het op de bodem of op andere blokken landt en wordt dan
   vastgezet.
3. Een rij die helemaal vol is, **knippert** kort en verdwijnt; de blokken
   erboven zakken door.
4. Elke **10 gewiste rijen** ga je een **level** omhoog en vallen de blokken
   sneller. De start is rustig en wordt geleidelijk pittiger.
5. Kan een nieuw blok niet meer verschijnen omdat de stapel te hoog is, dan is
   het **game over**.

## Score & highscore

- **Rijen wissen:** 1 rij = 100, 2 = 300, 3 = 500, 4 (een "Tetris") = 800 punten,
  telkens vermenigvuldigd met je huidige level.
- **Zelf laten zakken:** +1 punt per cel bij zakken, +2 per cel bij laten vallen.
- Je eindscore wordt ingediend bij **game over** en wanneer je op **Nieuw spel**
  klikt terwijl je score boven 0 is.
- De **highscore-lijst** toont je top 10 hoogste scores.

## Opslag

Na elk vastgezet blok worden de stapel, score, rijen en het level bewaard via het
gedeelde save-mechanisme. Je kunt het tabblad sluiten en later verder spelen — op
het startscherm verschijnt dan een **💾 verder spelen**-badge. Bij game over of een
nieuw spel wordt de bewaarde partij gewist. Wissel je van tabblad, dan gaat het
spel automatisch op **pauze**.
