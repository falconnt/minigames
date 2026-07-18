# 🚀 Ruimteschieter (neon-editie)

| | |
| --- | --- |
| **Categorie** | Arcade |
| **Module** | [`games/ruimteschieter.js`](../games/ruimteschieter.js) |
| **Score** | punten — hoger is beter |
| **Opslag** | nee (alleen je highscore wordt bewaard) |

## Doel

Een schermvullende space-shooter in neon-stijl. Bestuur je gloeiende ruimteschip
onderin, schiet de aanvallende vijanden kapot en ontwijk hun schoten. Maak een
hele golf op, dan komt de volgende — steeds sneller. Alles wordt per pixel op een
canvas getekend (geen afbeeldingen), met neon-gloed via schaduw-blur.

De game speelt **fullscreen**: een eigen laag over de hele schermhoogte, zodat het
speelveld zo groot mogelijk is en alles zonder scrollen in beeld staat.

## Besturing

Speelbaar met de **vinger** of het **toetsenbord**.

| Actie | Vinger | Toetsenbord |
| --- | --- | --- |
| Naar links / rechts | knop ◀ ▶ of **sleep** over het veld | ← → (of A / D) |
| Schieten | knop **🔥 vuur** ingedrukt houden | spatie |
| Pauze | knop **Pauze** | P |

Sleep je met je vinger over het speelveld, dan volgt het schip je vinger én
**schiet het vanzelf** — zo speel je makkelijk met één hand. Met **← Terug** ga je
naar het menu; **Nieuw spel** vind je in het pauzemenu (of de ❔-knop voor uitleg).

## Spelverloop

1. Je start met **3 levens** (♥♥♥) in **golf 1**.
2. De vijanden bewegen als formatie heen en weer en zakken langzaam. Hoe minder er
   over zijn, hoe sneller ze gaan.
3. Af en toe schiet een vijand een kogel omlaag — ontwijk die.
4. Raakt een kogel je schip, of bereikt een vijand de bodem, dan verlies je een
   **leven** (je schip knippert dan even en is heel kort onkwetsbaar).
5. Schiet je alle vijanden kapot, dan begin je aan de **volgende golf**, met meer
   en snellere vijanden.
6. Elke **10e golf** verschijnt een **eindbaas** met een health-balk: hij zweeft
   heen en weer en vuurt waaiers kogels af. Sloop hem helemaal leeg voor een
   flinke bonus en ga door naar de volgende golf.
7. Bij **0 levens** is het game over.

## Power-ups, combo's & geluid

- **Combo:** schiet je snel achter elkaar vijanden kapot, dan loopt je combo op en
  tellen je punten met een **×-vermenigvuldiger** (tot ×5). Zwevende "+punten"
  laten zien hoeveel je pakt.
- **Power-ups** vallen soms uit een vernietigde vijand — vang ze op met je schip:
  - 🔫 **driedubbel schot** — je schiet drie kogels tegelijk (waaier);
  - ⚡ **snelvuur** — je schiet veel sneller;
  - 🛡️ **schild** — een ring om je schip die schoten een tijdje tegenhoudt.
- **Geluid:** laserschoten, ontploffingen en power-up-geluidjes (WebAudio, geen
  bestanden). Met de **🔊/🔇-knop** zet je het geluid aan of uit. Er is ook
  **screenshake** bij explosies voor extra kracht.

## Testmodus: 🧪 Eindbaas

Zet je **testmodus** aan in Instellingen, dan verschijnt linksboven in de
speelbalk een **🧪 Eindbaas**-knop. Die springt direct naar de eerstvolgende
baasgolf (elke 10e golf), zodat je de eindbaas kunt testen zonder eerst tien
golven te spelen. In testmodus worden er **geen highscores opgeslagen**, dus
je beïnvloedt de ranglijst niet.

## Score & highscore

- Elke vernietigde vijand levert punten op; vijanden in de **bovenste rijen** zijn
  meer waard.
- Je eindscore wordt ingediend bij **game over** en wanneer je via **← Terug** het
  spel verlaat terwijl je score boven 0 is.
- De **highscore-lijst** toont je top 10 hoogste scores.
