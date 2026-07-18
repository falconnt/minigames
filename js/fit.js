// Hulpjes voor schermvullende games (zie de richtlijn in README.md):
// speelveld + bediening horen samen in beeld te passen, zonder scrollen.

// Beschikbare hoogte vanaf de bovenkant van `el` tot de onderkant van het
// scherm, minus `reserve` px voor wat er (binnen het spel) nog onder komt.
export function availableHeight(el, reserve = 0, min = 180) {
  const top = el.getBoundingClientRect().top;
  const vh = window.innerHeight || document.documentElement.clientHeight || 700;
  return Math.max(min, Math.floor(vh - top - reserve));
}

// Som van de hoogtes van de elementen die binnen hetzelfde scherm nog onder
// `el` staan (bv. knoppenrij + hinttekst), voor gebruik als `reserve`.
export function heightBelow(el) {
  let h = 0;
  for (let sib = el.nextElementSibling; sib; sib = sib.nextElementSibling) {
    h += sib.offsetHeight;
  }
  return h;
}
