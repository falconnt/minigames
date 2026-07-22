// boost.js — status van het nitro/boost-systeem, gedeeld tussen modules.
// physics.js schrijft (laden door drift, verbruik, schokken); render.js leest
// (vlammen, speed-lines, screen-shake, HUD-meter).
//
//   charge  0..1  — hoeveel boost er in de tank zit
//   active  bool  — of er nu geboost wordt
//   shake   0..1  — huidige screen-shake (boost/botsingen), dooft vanzelf uit
export const boostFx = { charge: 0, active: false, shake: 0 };
