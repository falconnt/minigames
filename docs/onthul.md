# 🖼️ Onthul!

| | |
| --- | --- |
| **Categorie** | Arcade |
| **Module** | [`games/onthul.js`](../games/onthul.js) |
| **Score** | punten — hoger is beter |
| **Opslag** | nee (alleen je highscore wordt bewaard) |

## Doel

Een klassieker in de stijl van **Xonix/Qix** (MS-DOS): onder het donkere veld
zit een plaatje verstopt. Trek lijnen door het veld om stukken af te snijden —
elk afgesloten stuk **zonder bal** wordt onthuld. Onthul **75%** van het
plaatje om het level te halen; elk procent extra levert bonuspunten op.

De game speelt **fullscreen**: een eigen laag over de hele schermhoogte, zodat
het speelveld zo groot mogelijk is en alles zonder scrollen in beeld staat.

## Besturing

Ingedrukt houden = bewegen, **loslaten = stoppen**.

| Actie | Vinger | Toetsenbord |
| --- | --- | --- |
| Bewegen | zet je duim **waar dan ook** neer en sleep (virtuele joystick) | pijltjes of WASD (ingedrukt houden) |
| Pauze | knop **⏸** | P |

De virtuele joystick verschijnt op de plek waar je duim neerkomt — op of naast
het speelveld — zodat je vingers nooit het spel afdekken. Slepen bepaalt de
richting; terug naar het midden (dode zone) of loslaten stopt de speler.

## Spelverloop

1. Je bent het **roze blokje** op de rand van het veld en hebt **3 levens**.
2. Beweeg vanaf veilig (onthuld) gebied het donkere veld in: je trekt dan
   automatisch een **gele lijn**.
3. Bereik je veilig de overkant, dan wordt het afgesneden stuk **zonder bal**
   onthuld — dat deel van het plaatje verschijnt, en je krijgt punten per
   onthulde cel.
4. Raakt een bal je lijn (of jou) terwijl de lijn nog open is, of loop je je
   **eigen lijn** in: **leven kwijt**. De lijn verdwijnt en je start weer op de
   onderrand.
5. Bij **75% onthuld** is het level klaar: je ziet even het volledige plaatje,
   plus bonus per extra procent (+40/%) en een tijdsbonus (sneller = meer).
6. Elk volgend level: een **nieuw plaatje**, een **bal erbij** (max 6) en iets
   meer snelheid.
7. Bij **0 levens** is het game over en wordt je score ingediend.

## De plaatjes

Zes natuur- en dierenscènes (bergmeer, noorderlicht, strand, vlinder,
onderwaterwereld, vos) staan in [`assets/onthul/`](../assets/onthul/). Ze zijn
in code gegenereerd en dus rechtenvrij; wil je eigen (bijv. CC0-)foto's
gebruiken, vervang dan gewoon de JPG-bestanden (900×600) en/of breid de
`PLAATJES`-lijst in de module uit.

## Score & highscore

- **+1 punt per onthulde cel** (een level volledig pakken is ± 4500 cellen).
- Levelbonus: **+40 per procent boven de 75%** en **+2 per seconde** die je
  sneller bent dan 4 minuten.
- Je eindscore wordt ingediend bij **game over** en wanneer je via **← Terug**
  het spel verlaat terwijl je score boven 0 is.

## Testmodus: 🧪 75%

Zet je **testmodus** aan in Instellingen, dan verschijnt in de speelbalk een
**🧪 75%**-knop die het veld direct tot de leveldrempel vult — handig om de
levelovergang en bonussen te testen zonder een heel level te spelen. In
testmodus worden er geen highscores opgeslagen.
