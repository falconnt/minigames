// Losse, op zichzelf staande games onder /stand-alone/. Dit zijn puur links
// vanaf de startpagina; ze doen NIET mee aan highscores, badges of online sync
// en hebben elk hun eigen scherm en (PWA-)opzet.
//
// Een nieuwe losse game toevoegen = één entry hier (folder relatief aan de
// app-root; icon hergebruikt het PWA-icoon van die game).
export const standaloneGames = [
  {
    id: 'citydrive',
    title: 'City Drive',
    folder: 'stand-alone/citydrive/',
    icon: 'stand-alone/citydrive/icons/icon-192.png',
    description: 'Top-down rijgame: cruise door de stad, drift voor geld en tune je auto in de garage.',
  },
  {
    id: 'wereldverovering',
    title: 'Wereldverovering',
    folder: 'stand-alone/wereldverovering/',
    icon: 'stand-alone/wereldverovering/icons/icon-192.png',
    description: 'Verover de echte wereldkaart. Iedereen plant in het geheim, daarna wordt alles tegelijk uitgevoerd. Voor 2–6 spelers.',
  },
];
