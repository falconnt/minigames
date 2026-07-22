// main.js — het beginpunt. Zet alle modules op, koppelt ze aan elkaar en draait
// de game-loop. Bevat bewust géén spellogica: die staat in de losse modules.
//
// Afhankelijkheden lopen één kant op:
//   constants → cars → state → (world, fx, input, audio, economy)
//   → physics / render / garage → main
// Zo pas je een onderdeel aan zonder de rest te raken.

import { initPersistence, P, cam } from './state.js';
import { initInput, onGarageToggle, readInput } from './input.js';
import { initAudioControls, updAudio } from './audio.js';
import { initRender, render } from './render.js';
import { physics } from './physics.js';
import { initGarage, toggleGarage, openGarage, isGarageOpen, renderPreview } from './garage.js';
import { initMap, isMapOpen, renderBigMap } from './map.js';
import { garageSpot } from './world.js';
import { updMoneyUI } from './economy.js';
import { tick } from './daynight.js';
import { initPWA } from './pwa.js';

// Touch-besturing tonen op apparaten met een grof aanwijsapparaat.
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

initPersistence();          // voortgang laden + opslaan-bij-verlaten
initRender();               // canvas + resize
initInput();                // toetsenbord + joysticks
onGarageToggle(toggleGarage); // 'G'-toets opent/sluit de garage
initAudioControls();        // motorsound + mute-knop
initGarage();               // garage-knoppen en tabbladen
initMap();                  // uitklapbare grote kaart
initPWA();                  // installatieknop + service worker
updMoneyUI();               // begingeld tonen

let wasInGarageZone = false;
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  tick(dt);                  // dag/nacht-klok laten doorlopen
  readInput();
  let spd = Math.hypot(P.vx, P.vy);
  // rijden pauzeert als de garage of de grote kaart open staat
  if (!isGarageOpen() && !isMapOpen()) { spd = physics(dt); }
  else updAudio(0);
  // garagegebouw: open het menu bij het binnenrijden van het pleintje ervoor
  const gz = garageSpot.trigger;
  const inGarageZone = P.x > gz.x && P.x < gz.x + gz.w && P.y > gz.y && P.y < gz.y + gz.h;
  if (inGarageZone && !wasInGarageZone && !isGarageOpen() && !isMapOpen()) openGarage();
  wasInGarageZone = inGarageZone;
  // camera: kijk vooruit, volg soepel, zoom licht uit bij snelheid
  const look = Math.min(130, spd * 0.22);
  const tx = P.x + Math.cos(P.ang) * look, ty = P.y + Math.sin(P.ang) * look;
  const k = 1 - Math.exp(-5 * dt);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  const tz = 1.06 - 0.28 * Math.min(1, spd / 850);
  cam.z += (tz - cam.z) * Math.min(1, 3 * dt);
  render(spd);
  if (isGarageOpen()) renderPreview();
  if (isMapOpen()) renderBigMap();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
