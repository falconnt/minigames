# 🐦 Flappy Bird

| | |
| --- | --- |
| **Categorie** | Arcade |
| **Module** | [`games/vogelvlucht.js`](../games/vogelvlucht.js) |
| **Score** | punten (gepasseerde buizen) — hoger is beter |
| **Opslag** | nee (alleen highscores) |

## Doel

Een Flappy Bird-spel: houd de vogel in de lucht en vlieg door zo veel
mogelijk openingen tussen de buizen. Elke buis die je passeert is één punt.

## Besturing

- **Tik / klik** op het speelveld — één keer fladderen (omhoog).
- **Spatie** of **pijl omhoog** — fladderen met het toetsenbord.

## Spelverloop

1. Druk op **Start** (of tik/spatie) om te beginnen.
2. **Zwaartekracht** trekt de vogel constant omlaag; elke fladder geeft een
   opwaartse impuls. Timing is alles.
3. Buizen komen van rechts aanvliegen met steeds een opening op wisselende
   hoogte. Vlieg door de opening.
4. Je scoort **+1 punt** voor elke buis die je volledig passeert, met een
   **ping-geluidje** (uit te zetten via Instellingen → Geluid).
5. De **snelheid loopt geleidelijk op** naarmate je langer vliegt, dus het wordt
   steeds pittiger.
6. De wereld doorloopt een **dag-nachtcyclus**: overdag zon, wolken en vogeltjes
   in de verte; via een zonsondergang wordt het nacht met sterren, een
   maansikkel en vuurvliegjes. De cyclus loopt door tussen potjes.

### Game over

Je botst tegen een buis, of raakt het **plafond** of de **grond** → einde. Het
paneel toont je score en je beste score.

## Score & highscore

- Je **score** is het aantal gepasseerde buizen.
- Bij game over wordt je score ingediend (alleen als die **boven 0** is) en
  verschijnt hij in de gedeelde **highscore-lijst** (top 10, hoger is beter).

## Opslag

Deze game bewaart geen tussenstand — elke poging begint vers. Alleen je
highscores worden onthouden via het gedeelde save-mechanisme.
