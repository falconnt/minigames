# 🏎️ Racen

| | |
| --- | --- |
| **Categorie** | Arcade |
| **Module** | [`games/racen.js`](../games/racen.js) |
| **Score** | afstand in meters — hoger is beter |
| **Opslag** | nee (alleen je highscore wordt bewaard) |

## Doel

Een schermvullende endless racer: scheur met je raceauto over een scrollende weg
met drie rijstroken, ontwijk de tegenliggers en pak gouden munten. Hoe verder je
komt, hoe sneller het gaat. Alles wordt per pixel op een canvas getekend (geen
afbeeldingen): asfalt met stoepranden, stippellijnen, bomen langs de weg en
auto's van bovenaf.

## Besturing

Speelbaar met de **vinger** of het **toetsenbord**.

| Actie | Vinger | Toetsenbord |
| --- | --- | --- |
| Naar links / rechts sturen | knop ◀ ▶ of **veeg** over de weg | ← → (of A / D) |
| Turbo (boost) | knop **🚀 turbo** ingedrukt houden | spatie |
| Pauze | knop **Pauze** | P |

Sleep je met je vinger over de weg, dan volgt je auto je vinger. **Turbo** geeft
een flinke snelheidsboost maar gebruikt je **turbo-balk** (linksonder); die laadt
vanzelf weer op als je 'm loslaat. Met **← Terug** ga je naar het menu; **Nieuw
spel** vind je in het pauzemenu (of de ❔-knop voor uitleg).

## Spelverloop

1. Je start met **3 levens** (♥♥♥). Je auto rijdt vanzelf vooruit; jij stuurt.
2. Er komen steeds **tegenliggers** naar beneden. Ontwijk ze!
3. **Gouden munten** leveren extra afstand-punten op.
4. Hoe verder je komt, hoe **sneller** de weg gaat. Met **turbo** ga je nog
   sneller (meer punten, meer risico).
5. Bots je tegen een auto, dan verlies je een **leven** (je auto knippert dan
   even en is heel kort onkwetsbaar, en je remt wat af).
6. Bij **0 levens** is het game over.

## Score & highscore

- Je **score** is de gereden **afstand in meters**; munten geven een bonus.
- Je eindscore wordt ingediend bij **game over** en wanneer je via **← Terug**
  stopt terwijl je afstand boven 0 is.
- De **highscore-lijst** toont je top 10 verste ritten.
