# ⚡ Reactietest

| | |
| --- | --- |
| **Categorie** | Reflex |
| **Module** | [`games/reaction.js`](../games/reaction.js) |
| **Score** | milliseconden — **lager** is beter |
| **Opslag** | nee (alleen highscores) |

## Doel

Test hoe snel je reageert: klik zodra het vlak **groen** wordt. Je speelt vijf
rondes en het **gemiddelde** van je reactietijden is je score.

## Besturing

- **Klik / tik** op het grote vlak. Meer heb je niet nodig.

## Spelverloop

1. Klik op het vlak om te starten. Het vlak wordt **rood** ("Wacht op groen…").
2. Na een **willekeurige tijd tussen 1,2 en 3,5 seconde** springt het vlak op
   **groen** met de tekst "KLIK!".
3. Klik zo snel mogelijk. Je reactietijd (in milliseconden) wordt bewaard en je
   gaat door naar de volgende ronde.
4. Na **5 rondes** wordt je gemiddelde berekend en als score ingediend.

### Te vroeg geklikt

Klik je terwijl het vlak nog **rood** is, dan verschijnt "Te vroeg!". Die ronde
telt niet mee; je klikt om verder te gaan en de ronde begint opnieuw.

## Score & highscore

- Je **score** is de gemiddelde reactietijd over de vijf rondes, in
  milliseconden.
- Omdat **sneller beter** is, staat de **laagste** tijd bovenaan de
  highscore-lijst (top 10).

## Opslag

Deze game bewaart geen tussenstand — elke sessie begint vers. Alleen je
highscores worden onthouden via het gedeelde save-mechanisme.
