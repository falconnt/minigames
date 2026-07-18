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

Er is een realistisch **motorgeluid** dat als een echte race-motor optrekt. Het
is volledig in code gesynthetiseerd (er zitten geen audiobestanden in de game).
De aanpak volgt hoe echte games het doen: in plaats van de toon simpelweg omhoog
te "pitchen" bij het gas geven (dat klinkt onnatuurlijk), gebruikt de motor een
**gesimuleerde versnellingsbak** — de toeren lopen soepel op binnen een
versnelling en zakken bij het schakelen, zodat de toon in een muzikale band
blijft. **Extra gas (turbo)** laat de toeren *geleidelijk* oplopen en opent
vooral de uitlaat: harder, feller en met meer inductieruis — het geluid van een
motor die "opendraait", niet een chipmunk-sprong. **Elke auto heeft een eigen
motortype** (te zien op het keuzescherm) dat anders klinkt: een **V8** rommelt
zwaar (lope), een **V12** giert hoog en glad, en er zijn ook **W12, V10, Flat-6
en Rotary**. Met de **🔊/🔇-knop** zet je het geluid aan of uit.

Sleep je met je vinger over de weg, dan volgt je auto je vinger. **Turbo** geeft
een flinke snelheidsboost maar gebruikt je **turbo-balk** (linksonder); die laadt
vanzelf weer op als je 'm loslaat. Met **← Terug** ga je naar het menu; **Nieuw
spel** vind je in het pauzemenu (of de ❔-knop voor uitleg).

## Startscherm: kies je auto

Voor de race verschijnt een **keuzescherm** met **10 auto's** (elk een eigen kleur
en naam: Bliksem, Vuurbal, Turbo, Smaragd, Oceaan, Storm, Druif, Roze Raket,
Zilver en Limoen). Tik op een auto om hem te kiezen en druk op **🏁 Start!**. Je
gekozen kleur zie je terug op de weg. Via **Andere auto** (in het pauzemenu of na
game over) kun je opnieuw kiezen.

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
