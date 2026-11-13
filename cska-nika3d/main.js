import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildNika, buildPerson, defaultPose, TOPS } from './chars.js';
import { clamp, seg, ss, back } from './lib.js';

const W = innerWidth, H = innerHeight, V = H > W, Q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const OX = ov.getContext('2d');
const cam = new THREE.PerspectiveCamera(36, W / H, .05, 400);
const composer = new EffectComposer(renderer);
const rp = new RenderPass(new THREE.Scene(), cam); composer.addPass(rp);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .4, .5, .9); composer.addPass(bloom);
composer.addPass(new OutputPass());
await Promise.all(['800 40px Nunito', '900 40px Nunito', '700 40px Caveat'].map(f => document.fonts.load(f, 'Дедушка ЦСКА С Новым годом')));
window.DUR = 88;
export const LOGO = { H: [1100, 130, 420, 420], V: [330, 210, 420, 420] };
const u = W / (V ? 1080 : 1920);

function caption(txt, k) {
  if (!txt || k <= 0) return;
  const size = (V ? 66 : 60) * u; OX.save(); OX.font = `900 ${size}px Nunito`; OX.letterSpacing = (size * .03).toFixed(1) + 'px';
  let lines = txt.split('\n').flatMap(l => { if (OX.measureText(l).width < W * .88) return [l]; const w = l.split(' '), h = Math.ceil(w.length / 2); return [w.slice(0, h).join(' '), w.slice(h).join(' ')]; });
  const lh = size * 1.16, y0 = V ? H * .79 - (lines.length - 1) * lh / 2 : H - 92 * u - (lines.length - 1) * lh;
  const s = back(clamp(k * 2.2)), a = clamp(k * 4);
  OX.globalAlpha = a; OX.translate(W / 2, y0); OX.scale(s, s); OX.textAlign = 'center'; OX.textBaseline = 'middle'; OX.lineJoin = 'round';
  lines.forEach((l, i) => { OX.shadowColor = 'rgba(8,10,40,.6)'; OX.shadowBlur = size * .35; OX.shadowOffsetY = size * .06; OX.lineWidth = size * .2; OX.strokeStyle = '#1d2a9e'; OX.strokeText(l, 0, i * lh); OX.shadowColor = 'transparent'; OX.fillStyle = '#ffffff'; OX.fillText(l, 0, i * lh); });
  OX.restore();
}
function title(txt, x, y, size, k, line) {
  if (k <= 0) return; OX.save(); OX.translate(x, y); OX.scale(k, k); OX.font = `900 ${size}px Nunito`; OX.textAlign = 'center'; OX.textBaseline = 'middle'; OX.lineJoin = 'round';
  OX.shadowColor = 'rgba(8,10,40,.6)'; OX.shadowBlur = size * .4; OX.lineWidth = size * .22; OX.strokeStyle = line; OX.strokeText(txt, 0, 0); OX.shadowColor = 'transparent'; OX.fillStyle = '#ffffff'; OX.fillText(txt, 0, 0); OX.restore();
}
// dips to dark at cuts between locations
const DIPS = [[11, .3], [19, .3], [40, .3], [45.33, .14], [50.67, .14], [56, .3], [59.5, .25], [64, .3], [82, .3]];

let film = null, overlay = null;
if (Q.get('view') === 'sheet') {
  const { sheetScene } = await import('./sheet.js'); overlay = sheetScene(renderer, composer, rp, cam, OX, W, H);
} else {
  const { buildFilm } = await import('./film.js'); film = await buildFilm();
}
const vt = new THREE.Vector3();
window.render = t => {
  OX.clearRect(0, 0, W, H);
  if (overlay) { overlay(t); return; }
  t = clamp(t, 0, window.DUR - 1e-3);
  const S = film.S.find(s => t >= s.a && t < s.b), lt = t - S.a;
  const sh = S.shots.find(s => t >= s.a && t < s.b) || S.shots[S.shots.length - 1];
  let c = (V && sh.V ? sh.V : sh.H)(t);
  let fov = c[6]; if (V && !sh.V) fov *= 1.6;
  if (sh.dyn) { const d = sh.dyn(lt, V); c = [...d, fov]; }
  cam.fov = fov; cam.position.set(c[0], c[1], c[2]); cam.lookAt(c[3], c[4], c[5]); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const LR = (V ? LOGO.V : LOGO.H).map(x => x * u);
  S.update(t, lt, V, S.finale ? [cam, LR, W, H] : null);
  rp.scene = S.set.scene; composer.render();
  // overlay: vignette, captions, finale titles, dips
  const g = OX.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .78); g.addColorStop(0, 'rgba(8,10,40,0)'); g.addColorStop(1, 'rgba(8,10,40,.38)'); OX.fillStyle = g; OX.fillRect(0, 0, W, H);
  for (const [a, b, txt] of S.caps || []) if (t > a - .01 && t < b) caption(txt, Math.min(t - a, b - t) / .5);
  if (S.finale) {
    const L = V ? LOGO.V : LOGO.H, pop = t0 => back(clamp((lt - t0) / .45));
    const tx = (V ? W / 2 : (L[0] + L[2] / 2) * u), y1 = (L[1] + L[3] + (V ? 150 : 120)) * u, y2 = y1 + (V ? 120 : 125) * u;
    title('С Новым годом!', tx, y1, (V ? 104 : 112) * u, pop(.6), '#1d2a9e'); title('Твой ЦСКА', tx, y2, (V ? 92 : 96) * u, pop(1.0), '#e3243a');
    if (Q.get('logo')) { OX.strokeStyle = '#ff0'; OX.lineWidth = 3; OX.strokeRect(L[0] * u, L[1] * u, L[2] * u, L[3] * u); }
  }
  let dark = t < .5 ? 1 - t / .5 : 0;
  for (const [c0, d] of DIPS) { const k = 1 - Math.abs(t - c0) / d; if (k > dark) dark = k; }
  if (t > window.DUR - .5) dark = Math.max(dark, 0);
  if (dark > 0) { OX.fillStyle = `rgba(8,10,34,${ss(dark)})`; OX.fillRect(0, 0, W, H); }
};
window.READY = true;
