import { sketch, cast } from './sketch.js';
import { SCENES, IRIS_AFTER, LOGO, title } from './scenes.js';
import { sky, snowfall } from './world.js';
import { clamp, smooth, back } from './lib.js';

const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const W = cv.width = innerWidth, H = cv.height = innerHeight, V = H > W;
const Q = new URLSearchParams(location.search);
window.DUR = 82;
const IR = .45;

function caption(txt, k) {
  if (!txt || k <= 0) return;
  const u = W / (V ? 1080 : 1920), size = (V ? 66 : 60) * u; let lines = txt.split('\n');
  ctx.font = `900 ${size}px Nunito`;
  lines = lines.flatMap(l => { if (ctx.measureText(l).width < W * .88) return [l]; const w = l.split(' '), h = Math.ceil(w.length / 2); return [w.slice(0, h).join(' '), w.slice(h).join(' ')]; });
  ctx.save(); ctx.font = `900 ${size}px Nunito`; ctx.letterSpacing = (size * .03).toFixed(1) + 'px';
  const fit = Math.min(1, W * .9 / Math.max(...lines.map(l => ctx.measureText(l).width)));
  const lh = size * 1.16, y0 = V ? H * .79 - (lines.length - 1) * lh / 2 : H - 92 * u - (lines.length - 1) * lh;
  const s = back(clamp(k * 2.2)) * fit, a = clamp(k * 4);
  ctx.globalAlpha = a; ctx.translate(W / 2, y0); ctx.scale(s, s); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.letterSpacing = (size * .03).toFixed(1) + 'px';
  lines.forEach((l, i) => {
    ctx.shadowColor = 'rgba(8,10,40,.55)'; ctx.shadowBlur = size * .3; ctx.shadowOffsetY = size * .06;
    ctx.lineWidth = size * .2; ctx.strokeStyle = '#1d2a9e'; ctx.strokeText(l, 0, i * lh);
    ctx.shadowColor = 'transparent'; ctx.fillStyle = '#ffffff'; ctx.fillText(l, 0, i * lh);
  });
  ctx.restore();
}

// soft snowdrifts in front of the action (vertical frames have room below the ground line)
function foreground(cx, w) {
  const R = [0.13, .71, .42, .9, .27, .58, .05, .84, .36, .66];
  for (let k = -1; k < 12; k++) { const x = Math.floor(cx / 260) * 260 + (k - 5) * 260, r = R[(Math.floor(x / 260) % 10 + 10) % 10];
    ctx.fillStyle = '#dfe6ff'; ctx.beginPath(); ctx.ellipse(x, 330 + r * 60, 220 + r * 120, 90 + r * 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7f9ff'; ctx.beginPath(); ctx.ellipse(x - 20, 315 + r * 60, 190 + r * 110, 70 + r * 30, 0, 0, Math.PI * 2); ctx.fill(); }
}
window.render = t => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  if (Q.get('view') === 'sketch') return sketch(ctx, W, H);
  if (Q.get('view') === 'cast') return cast(ctx, W, H);
  t = clamp(t, 0, window.DUR - 1e-3);
  const i = SCENES.findIndex(s => t >= s.a && t < s.b), S = SCENES[i], lt = t - S.a;
  const E = { t, W, H, V };
  let camT = null;
  if (S.screen) S.draw(ctx, lt, E);
  else {
    const [x, y, w0] = S.cam(lt)[V ? 'V' : 'H'], w = V ? w0 * .82 : w0, s = W / w, cy = V ? H * .47 : H * .5;
    E.cam = { x, y, s };
    camT = (wx, wy) => [W / 2 + (wx - x) * s, cy + (wy - y) * s];
    sky(ctx, W, H, 1);
    ctx.setTransform(s, 0, 0, s, W / 2 - x * s, cy - y * s);
    S.draw(ctx, lt, E);
    if (V) foreground(x, w);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  snowfall(ctx, W, H, t, V ? 110 : 140, .25, S.screen ? .8 : 1);
  // vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .45, W / 2, H / 2, Math.max(W, H) * .75);
  g.addColorStop(0, 'rgba(10,12,50,0)'); g.addColorStop(1, 'rgba(10,12,50,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // captions
  for (const [a, b, txt] of S.caps || []) if (t > a - .01 && t < b) caption(txt, Math.min(t - a, b - t) / .5);
  if (S.dyn) caption(S.dyn(lt), 1);
  // iris transitions
  let r = 1;
  if (IRIS_AFTER.has(i + 1) && t > S.b - IR) r = (S.b - t) / IR;
  if (IRIS_AFTER.has(i) && lt < IR) r = lt / IR;
  if (r < 1) {
    let c = [W / 2, H / 2];
    const ip = S.iris && S.iris(lt);
    if (ip && camT) c = camT(ip[0], ip[1]);
    if (S.screen) c = [V ? W * .5 : W * .29, H * .45];
    const R = Math.hypot(W, H) * smooth(0, 1, r);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(c[0], c[1], Math.max(0, R), 0, Math.PI * 2, true); ctx.fillStyle = '#10143d'; ctx.fill('evenodd');
  }
  if (t < .6) { ctx.fillStyle = `rgba(16,20,61,${1 - t / .6})`; ctx.fillRect(0, 0, W, H); }
  if (Q.get('logo')) { const L = V ? LOGO.V : LOGO.H, u = W / (V ? 1080 : 1920); ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3; ctx.strokeRect(L[0] * u, L[1] * u, L[2] * u, L[3] * u); }
};
document.fonts.load('900 40px Nunito').then(() => document.fonts.load('800 40px Nunito')).then(() => { window.READY = true; });
