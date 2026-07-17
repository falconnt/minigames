# 🏇 Paardensport

| | |
| --- | --- |
| **Categorie** | Simulatie |
| **Module** | [`games/paardensport.js`](../games/paardensport.js) |
| **Score** | wedstrijdpunten (opgeteld) — hoger is beter |
| **Opslag** | ja, volledige voortgang wordt bewaard |

## Doel

Beheer je eigen manege: kies een beginnerspaard, verzorg en train het, koop
extra stallen, paarden en tuig, en neem deel aan drie disciplines — **springen**,
**dressuur** en **racen**. Je verzamelt **wedstrijdpunten** (de highscore) en
**prijzengeld** waarmee je je manege uitbreidt.

Alle graphics worden in code op canvas getekend (geen afbeeldingen of emoji's):
een top-down erf met stallen en buitenbak, en paarden in zijaanzicht met
vachtkleuren, tuig, aftekeningen en dag/nacht-belichting.

## Besturing

- **Navigatie** — knoppen onder in beeld, of klik op een gebouw op het erf.
- **Dag/nacht** — knop rechtsboven.
- **Springen & dressuur** — **spatie** of **tik** op het juiste moment.
- **Racen** — **spatie** of vinger **ingedrukt houden** om te versnellen.

## Startkeuze (onboarding)

Je krijgt gratis **één stal en één beginnerspaard**. Je kiest uit drie rassen en
geeft je paard een naam.

## De manege (erf)

Het erf is het beginscherm met snelkoppelingen naar:

- **Stal & paarden** — je paarden bekijken, activeren, en stallen/paarden kopen.
- **Verzorgen** — poetsen, voeren, water en rust.
- **Buitenbak** — trainen en wedstrijden.
- **Winkel** — zadels, hoofdstellen en munten.

## Economie

| Bron | Bedrag |
| --- | --- |
| Startgeld | € 600 |
| Dagelijkse bonus | € 120 (één keer per dag te claimen op het erf) |
| Muntenknop (winkel) | + € 200 of + € 1.000 (gratis, gesimuleerd — geen echte betaling) |
| Prijzengeld | per discipline, zie hieronder |

### Stallen & paarden kopen

- Een **extra stal** kost `900 × 1,6^(aantal stallen − 1)` — dus de 2e stal
  € 1.440, de 3e € 2.304, enzovoort.
- Je hebt **altijd een vrije stal nodig** voordat je een nieuw paard kunt kopen.
- Paardenprijzen per ras staan hieronder.

## Rassen

Elk ras heeft eigen basisstats en een eigen silhouet in beeld.

| Ras | Prijs | Snelheid | Springen | Uithouding | Dressuur | Kenmerk |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Shetlandpony | € 0 | 30 | 35 | 45 | 30 | klein, stevig, beharing |
| KWPN Warmbloed | € 1.200 | 58 | 62 | 55 | 60 | allround |
| Fries | € 1.500 | 48 | 50 | 58 | 74 | dressuur, volle manen |
| Engels Volbloed | € 1.800 | 80 | 55 | 78 | 45 | snel, slank |
| Holsteiner | € 2.000 | 60 | 82 | 60 | 58 | springkracht |

## Verzorging

Elk paard heeft vier verzorgingswaarden (0–100): **netheid**, **honger**,
**energie** en **geluk**.

| Actie | Effect |
| --- | --- |
| Poetsen | netheid +22 |
| Voeren | honger +25 |
| Water geven | honger +10 |
| Laten rusten | energie +30 |

De waarden **lopen langzaam terug** met de tijd (terwijl je weg bent): netheid
−3/uur, honger −4/uur; energie loopt juist op (+2/uur, rust in de stal).

> **Belangrijk:** een vies of moe paard presteert **tot 45 % slechter** bij
> wedstrijden. De verzorgingsfactor loopt van 0,55 (alles leeg) tot 1,0 (alles
> vol) en vermenigvuldigt je vaardigheid in elke discipline. Een vies paard
> krijgt bovendien een doffere vacht en moddervegen in beeld.

## Trainen

In de buitenbak train je één vaardigheid tegelijk (snelheid, springen,
uithouding of dressuur):

- Elke training geeft **+2 tot +5** op die vaardigheid en **+10 ervaring**.
- Kost **14 energie** en **8 netheid**.
- **Geblokkeerd bij minder dan 15 energie** — laat je paard eerst rusten.
- Bij genoeg ervaring (`niveau × 100`) stijgt je paard een **niveau**.

## Tuig (winkel)

Tuig geeft een **prestatiebonus** die bij je vaardigheid wordt opgeteld in
wedstrijden. Duurder tuig is ook zichtbaar op het paard (ander zadeldekje).

| Zadel | Prijs | Bonus | | Hoofdstel | Prijs | Bonus |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| Basiszadel | € 0 | +0 | | Basishoofdstel | € 0 | +0 |
| Sportzadel | € 400 | +6 | | Anatomisch hoofdstel | € 300 | +5 |
| Wedstrijdzadel | € 1.200 | +14 | | Wedstrijdhoofdstel | € 900 | +11 |

## Disciplines

In elke discipline geldt: **effectieve vaardigheid = basisvaardigheid ×
verzorgingsfactor + tuigbonus**.

### 🚧 Springen (met parcoursbouwer)

1. Bouw je eigen parcours: **1 tot 8 hindernissen**, elk met een instelbare
   **hoogte van 40 tot 150 cm**.
2. Rijd het parcours: druk **spatie/tik** vlak voor elke hindernis. Timing én je
   springkracht bepalen of je hem haalt; een hogere hindernis is moeilijker.

- **Punten** = `gesprongen × 20 + hoogste gesprongen hindernis − fouten × 15`.
- **Prijzengeld** = `gesprongen × 40` (+ € 100 bonus bij een foutloze ronde).
- Kost 20 energie en 15 netheid.

### 🎼 Dressuur

Voer **8 oefeningen** uit: druk **spatie/tik** als de wijzer in het groene vlak
staat. Een betere dressuurvaardigheid maakt het groene vlak groter.

- **Jurycijfer** = `4,0 + gemiddelde nauwkeurigheid × 6` (dus 4,0 – 10,0).
- **Punten** = `nauwkeurigheid × 100`.
- **Prijzengeld** = `nauwkeurigheid × 180`.
- Kost 15 energie en 6 netheid.

### 🏁 Race

Race tegen **3 tegenstanders**. Houd **spatie/vinger ingedrukt** om te
versnellen; loslaten laat je **uithouding** herstellen. Raak je uitgeput, dan
val je stil. Je topsnelheid hangt af van snelheid + tuig, je volhouden van
uithouding.

| Plaats | Punten | Prijzengeld |
| --- | ---: | ---: |
| 1e | 100 | € 250 |
| 2e | 60 | € 120 |
| 3e | 30 | € 50 |
| 4e | 10 | € 0 |

Kost 25 energie en 18 netheid.

## Score & highscore

De highscore is je **totaal aan opgetelde wedstrijdpunten** over alle
disciplines samen. Na elke wedstrijd worden de verdiende punten bij je totaal
opgeteld en ingediend; de **top 10** verschijnt naast de game.

## Opslag

Alles wordt bewaard via het gedeelde save-mechanisme: geld, stallen, al je
paarden (met stats, verzorging, tuig en aftekeningen), het actieve paard, je
puntentotaal en de dag/nacht-stand. Je kunt op elk moment stoppen en later
verder — en via de ⚙️-knop in de header een back-up exporteren/importeren.
