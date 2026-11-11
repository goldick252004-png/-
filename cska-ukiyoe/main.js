// ЦСКА · Оттиски — a woodblock-print film
import { clamp, lerp, seg, ss, eio, eo, ei, hash, mulberry, TAU } from '/core/lib.js';
import { W, H, FR, PAL, TX, mk, buildTextures, inkify, stampLayer, stampFn, drawSeal, cartouche, sealCanvas, rgba, mix } from './print.js';
import { HOOK, Y21, Y22, TRIPTYCH, triBall, triTrail, rain, TW } from './views.js';
import { ball, figure, POSE, runPose } from './player.js';
import { DUR, T, VO, SHEETS, GAP, TRI, XH, X21, X22, REVEAL, q8 } from './story.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const QS = new URLSearchParams(location.search);
const NOSUB = QS.has('nosub');
const J = async f => { try { const r = await fetch(f); if (r.ok) return await r.json(); } catch (e) { } return null; };
const LINES = (await J('lines.json')) || [], DURS = (await J('voices/dur.json')) || {};
const LINE = Object.fromEntries(LINES.map(l => [l.id, l]));
const img = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
const LOGO = await img('assets/brand/logo-main.png'), LOGOTXT = await img('assets/brand/logo-text-white.png');
await Promise.all(['500 40px Serif', '700 40px Serif', '900 40px Serif', '700 40px Inter'].map(f => document.fonts.load(f, 'ЦСКА Оттиски 2021')));
buildTextures();

// —— Subtitles ——
export const SUBS = Object.entries(VO).map(([id, t0]) => { const d = DURS[id] ?? (LINE[id]?.text.length || 30) * .07; return { id, t0, t1: t0 + Math.max(1.8, d + .7), text: LINE[id]?.sub || LINE[id]?.text || '' }; });
SUBS.forEach((s, i) => { if (SUBS[i + 1] && s.t1 > SUBS[i + 1].t0 - .1) s.t1 = SUBS[i + 1].t0 - .1; });

// —— Colour block cache (per layer object) ——
const REG = [[0, 0], [2.2, -1.3], [-1.8, 1.9], [1.5, 2.2]];
const SHIFT = [[4, -5], [-6, 4], [5, 5], [-5, -4]];
const cache = new Map();
function layer(d, key) {
  if (cache.has(d)) return cache.get(d);
  const c = mk(); d.draw(c.getContext('2d'));
  const hk = hash(key.length * 7.3 + key.charCodeAt(0) + key.charCodeAt(key.length - 1));
  inkify(c, { speck: d.speck ?? .3, grain: (d.grain || 0) * 1.7, gx: hk * 400 - 200, baren: d.baren ?? (d.g ? .38 : .12), bx: (hk - .5) * 300, by: (hash(hk) - .5) * 200 });
  cache.set(d, c); return c;
}
const rev = (id, g, t) => QS.has('full') ? 1 : clamp((t - T.print[id][g]) / REVEAL);

// —— Sheet table ——
const VIEW = { hook: HOOK, y21: Y21, y22: Y22, t23: TRIPTYCH[0], t24: TRIPTYCH[1], t25: TRIPTYCH[2] };
const CART = {
  y21: { x: 1270, y: 110, year: '2021', seal: '21', tIn: 6.2, tSeal: T.goal21 },
  y22: { x: 1270, y: 110, year: '2022', seal: '22', tIn: 19.1, tSeal: 19.55, grey: true },
  t23: { x: 1800, y: 560, year: '2023', seal: '23', tIn: 25.7, tSeal: 27.5 },
  t24: { x: 1800, y: 560, year: '2024', seal: '24', tIn: 28.9, tSeal: 30.0 },
  t25: { x: 120, y: 560, year: '2025', seal: '25', tIn: 31.4, tSeal: T.net },
};
function yearCart(x, C, p, sp, i) {
  const grey = !!C.grey, ink = grey ? '#6d6c68' : PAL.sumi;
  let b;
  stampFn(x, y => {
    y.save(); if (grey) { y.globalAlpha = .9; }
    b = cartouche(y, C.x, C.y, C.year, { series: 'ЦСКА', w: 86, size: 52, ssize: 25, fill: '#f3e7c6', tab: grey ? '#cfccc2' : '#efb3a6' });
    if (grey) { y.globalCompositeOperation = 'source-atop'; y.fillStyle = 'rgba(120,118,112,.18)'; y.fillRect(b.x0, b.y0, b.w, b.h); }
    y.restore();
  }, p, [0, -14]);
  if (!b) b = { x0: C.x - 43, y0: C.y, w: 86, h: 300 };
  drawSeal(x, C.seal, C.x, b.y0 + b.h + 50, 64, sp, { seed: i + 3, rot: (hash(i) - .5) * .06, col: grey ? '#7a7872' : PAL.beni });
}

function drawSheet(id, t, M) {
  const v = VIEW[id];
  ctx.save(); ctx.setTransform(...M);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.drawImage(TX.paper, 0, 0);
  const g0 = T.print[id][0];
  if (t >= g0 || QS.has('full')) {
    ctx.save(); ctx.beginPath(); ctx.rect(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0); ctx.clip();
    const R = {
      L: name => { const d = v.layers[name]; stampLayer(ctx, layer(d, id + name), rev(id, d.g, t), REG[d.g], SHIFT[d.g]); },
      D: (g, fn) => { const r = rev(id, g, t); if (r >= 1) { ctx.save(); ctx.translate(REG[g][0], REG[g][1]); fn(ctx); ctx.restore(); } else stampFn(ctx, fn, r, SHIFT[g]); },
    };
    v.paint(ctx, t, R);
    ctx.restore();
    const r0 = rev(id, 0, t), grey = id === 'y22';
    stampFn(ctx, x => { x.strokeStyle = grey ? '#6d6c68' : PAL.sumi; x.lineWidth = 3.4; x.strokeRect(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0); x.lineWidth = 1.3; x.strokeRect(FR.x0 - 9, FR.y0 - 9, FR.x1 - FR.x0 + 18, FR.y1 - FR.y0 + 18); }, r0, SHIFT[0]);
    const C = CART[id];
    if (C && (t > C.tIn || QS.has('full'))) yearCart(ctx, C, QS.has('full') ? 1 : clamp((t - C.tIn) / .35), QS.has('full') ? 1 : clamp((t - C.tSeal) / .3), SHEETS.findIndex(s => s.id === id));
    if (id === 'hook') titleSlip(t);
  }
  ctx.drawImage(TX.fiber, 0, 0);
  ctx.restore(); ctx.restore();
}

// —— Film title: a slip laid on the first print ——
function titleSlip(t) {
  if (!QS.has('title') && t < T.title[0]) return;
  const a = QS.has('title') ? 1 : clamp((t - T.title[0]) / .3);
  stampFn(ctx, x => {
    const x0 = 200, y0 = 110, w = 600, h = 168;
    x.fillStyle = '#f3e7c6'; x.fillRect(x0, y0, w, h); x.fillStyle = '#efb3a6'; x.fillRect(x0, y0 + h - 46, w, 46);
    x.strokeStyle = PAL.sumi; x.lineWidth = 3; x.strokeRect(x0, y0, w, h); x.lineWidth = 1.2; x.strokeRect(x0 + 6, y0 + 6, w - 12, h - 12);
    x.lineWidth = 1.5; x.beginPath(); x.moveTo(x0 + 6, y0 + h - 46); x.lineTo(x0 + w - 6, y0 + h - 46); x.stroke();
    x.fillStyle = PAL.sumi; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 76px Serif'; x.fillText('Оттиски', x0 + w / 2, y0 + 64);
    x.font = '500 25px Serif'; x.fillText('ж е н с к и й   г а н д б о л', x0 + w / 2, y0 + h - 23);
    cartouche(x, 862, 110, 'ЦСКА', { series: '', w: 92, size: 54 });
  }, a, [0, -12]);
  drawSeal(ctx, 'ЦСКА', 270, 352, 86, QS.has('title') ? 1 : clamp((t - T.title[0] - .45) / .3), { seed: 9, rot: .03 });
}

// —— Camera (world = scroll coordinates) ——
const CEN = id => [SHEETS.find(s => s.id === id).x + 960, 540];
const TRI_C = [TW / 2, 540], ZTRI = (W * .93) / TW;
function camera(t) {
  const pan = (a, b, t0, t1, f = eio) => { const u = f(seg(t, t0, t1)); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]; };
  let c, z = 1;
  if (t < T.slide21[0]) {
    c = CEN('hook'); const u = eio(seg(t, ...T.pullHook)); z = lerp(1.12, .8, u);
    c = [c[0] + lerp(40, 0, u) + 10 * ss(seg(t, 0, 2.2)), c[1] + lerp(10, 0, u)];
  } else if (t < T.slide21[1]) { c = pan(CEN('hook'), CEN('y21'), ...T.slide21); z = lerp(.8, 1, eio(seg(t, ...T.slide21))); }
  else if (t < T.slide22[0]) { c = CEN('y21'); const u = eio(seg(t, ...T.push21)); z = lerp(1, 1.13, u); c = [c[0] + 112 * u, c[1] + 36 * u]; }
  else if (t < T.slide22[1]) { const a = [CEN('y21')[0] + 112, 576]; c = pan(a, CEN('y22'), ...T.slide22); z = lerp(1.13, 1, eio(seg(t, ...T.slide22))); }
  else if (t < T.slideT[0]) c = CEN('y22');
  else if (t < T.slideT[1]) { c = pan(CEN('y22'), CEN('t23'), ...T.slideT); z = 1 - .12 * Math.sin(Math.PI * seg(t, ...T.slideT)); }
  else if (t < T.panT2[0]) c = CEN('t23');
  else if (t < T.panT2[1]) c = pan(CEN('t23'), CEN('t24'), ...T.panT2);
  else if (t < T.panT3[0]) c = CEN('t24');
  else if (t < T.panT3[1]) c = pan(CEN('t24'), CEN('t25'), ...T.panT3);
  else if (t < T.pullT[0]) c = CEN('t25');
  else { const u = eio(seg(t, ...T.pullT)); c = [lerp(CEN('t25')[0], TRI_C[0], u), lerp(540, 520, u)]; z = Math.exp(lerp(0, Math.log(ZTRI), u)); }
  if (QS.has('cam')) { const [cx, cy, zz] = QS.get('cam').split(',').map(Number); return { cx, cy, z: zz }; }
  return { cx: c[0], cy: c[1], z };
}
const camMatrix = c => [c.z, 0, 0, c.z, W / 2 - c.z * c.cx, H / 2 - c.z * c.cy];

// —— Scroll mount ——
const BAND = [-2600, 3700], TOT = XH + W;
function drawScroll(M) {
  ctx.save(); ctx.setTransform(...M);
  ctx.fillStyle = PAL.mount; ctx.fillRect(-300, BAND[0], TOT + 600, BAND[1] - BAND[0]);
  ctx.globalAlpha = .55; ctx.globalCompositeOperation = 'multiply';
  for (let X = -300; X < TOT + 300; X += W) for (let Y = BAND[0]; Y < BAND[1]; Y += H) ctx.drawImage(TX.paper, X, Y);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAL.mountD; ctx.fillRect(-300, BAND[0], TOT + 600, 40); ctx.fillRect(-300, BAND[1] - 40, TOT + 600, 40);
  // the triptych sits on its own darker brocade strip
  ctx.fillStyle = 'rgba(70,50,30,.18)'; ctx.fillRect(-40, -40, TW + 80, H + 80);
  ctx.restore();
}

// —— Subtitles (screen space cartouche) ——
function subtitle(t) {
  const s = SUBS.find(s => t >= s.t0 - .05 && t < s.t1); if (!s || !s.text) return;
  const a = clamp((t - s.t0 + .05) / .22), fo = 1 - clamp((t - (s.t1 - .25)) / .25);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '500 42px Serif'; const tw = ctx.measureText(s.text).width, w = tw + 150, h = 76, x0 = (W - w) / 2, y0 = H - 70 - h;
  ctx.globalAlpha = fo;
  stampFn(ctx, x => {
    x.fillStyle = 'rgba(243,231,198,.96)'; x.fillRect(x0, y0, w, h);
    x.strokeStyle = PAL.sumi; x.lineWidth = 2.6; x.strokeRect(x0, y0, w, h); x.lineWidth = 1; x.strokeRect(x0 + 5, y0 + 5, w - 10, h - 10);
    x.fillStyle = PAL.sumi; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = '500 42px Serif'; x.fillText(s.text, x0 + 96, y0 + h / 2 + 1);
  }, a, [0, 0]);
  const sc = sealCanvas('Ц', 40, { seed: 17 }); ctx.globalAlpha = fo * a * .92; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(sc, x0 + 30, y0 + h / 2 - sc.height / 2);
  ctx.restore();
}

// —— The club's line graphic: red lines of variable width over blue (brand book, "Фоновая графика") ——
const LD = [Math.cos(-0.96), Math.sin(-0.96)], LN = [-LD[1], LD[0]];   // line direction ≈ 55° rising to the right
const SP = 30;
function lineWidthAt(X, Y) {
  const edge = 820 + 95 * Math.sin(X / 640 + 1.2) + 40 * Math.sin(X / 230);           // wavy lower edge of the red field
  const v = ss(clamp((edge - Y) / 520));
  const lift = .82 + .18 * Math.sin(X / 900 + Y / 1100);
  return SP * .86 * v * lift;
}
function brandLines(x, r, ruled) {      // r: 0 = rain dashes → 1 = continuous lines; ruled: red vs rain ink
  const col = ruled ? PAL.redB : PAL.sumi;
  x.save(); x.fillStyle = col;
  const ox = W / 2, oy = H / 2, K = 80, Ls = 1500, R = mulberry(5 + Math.floor(q8(r * 3) * 8));
  for (let k = -K; k <= K; k++) {
    const bx = ox + LN[0] * k * SP, by = oy + LN[1] * k * SP;
    const dash = lerp(70, 3200, r * r), gap = lerp(380, 0, ss(r)), phase = hash(k * 3.1) * (dash + gap);
    for (let s0 = -Ls - phase; s0 < Ls; s0 += dash + gap) {
      const s1 = Math.min(Ls, s0 + dash), n = Math.max(2, Math.ceil((s1 - s0) / 40)), L = [], Rt = [];
      let any = false;
      for (let i = 0; i <= n; i++) {
        const s = lerp(s0, s1, i / n), X = bx + LD[0] * s, Y = by + LD[1] * s;
        const w = Math.max(r < 1 ? 1.4 * (1 - r) : 0, lineWidthAt(X, Y) * ss(r)) / 2; if (w > .3) any = true;
        L.push([X + LN[0] * w, Y + LN[1] * w]); Rt.push([X - LN[0] * w, Y - LN[1] * w]);
      }
      if (!any) continue;
      x.beginPath(); x.moveTo(L[0][0], L[0][1]); for (const p of L) x.lineTo(p[0], p[1]); for (let i = Rt.length - 1; i >= 0; i--) x.lineTo(Rt[i][0], Rt[i][1]); x.closePath(); x.fill();
    }
  }
  x.restore();
}
let BLUE = null;
function finale(t) {
  if (t < T.rain[0] && !QS.has('card')) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const tc = QS.has('card') ? 44 : t;
  // 1. wind-driven rain over the triptych (sumi, 12 fps), at the angle of the club's lines
  const rr = seg(tc, T.rain[0], T.rain[0] + .6) * (1 - seg(tc, T.blue[1] - .2, T.blue[1] + .3));
  if (rr > 0) { ctx.globalAlpha = rr; rain(ctx, tc, { n: 520, ang: -(Math.PI / 2 - .96), col: '#2b2622', a: .45, len: [40, 120], lw: 1.6, seed: 9 }); ctx.globalAlpha = 1; }
  // 2. the blue block prints over everything
  if (!BLUE) { BLUE = mk(); const b = BLUE.getContext('2d'); b.fillStyle = PAL.blue; b.fillRect(0, 0, W, H); }
  const rb = seg(tc, ...T.blue);
  if (rb > 0) stampLayer(ctx, BLUE, rb >= 1 ? 1 : rb, [0, 0], [0, 0]);
  // 3. rain lines turn red, lengthen and thicken into the line graphic — only where the blue block has printed
  const r = ss(seg(tc, T.redden[0], T.redden[1]));
  if (r > 0 && rb > 0) {
    const L = TX.tmp2, lx = L.getContext('2d'); lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, W, H); brandLines(lx, r, true);
    if (rb < 1) { lx.globalCompositeOperation = 'destination-in'; lx.drawImage(TX.reveal[Math.min(12, Math.floor(rb * 12.999))], 0, 0, W, H); lx.globalCompositeOperation = 'source-over'; }
    ctx.drawImage(L, 0, 0);
  }
  // 4. emblem lands like a seal, the text logo beside it
  const pe = seg(tc, T.card, T.card + .22), pt = seg(tc, T.card + .3, T.card + .6);
  if (LOGO && pe > 0) { const h = 700, w = h * LOGO.width / LOGO.height, s = lerp(1.35, 1, ss(pe)); ctx.save(); ctx.globalAlpha = clamp(pe * 3); ctx.translate(600, 520); ctx.scale(s, s); ctx.drawImage(LOGO, -w / 2, -h / 2, w, h); ctx.restore(); }
  if (LOGOTXT && pt > 0) { const w = 760, h = w * LOGOTXT.height / LOGOTXT.width; ctx.save(); ctx.globalAlpha = ss(pt); ctx.drawImage(LOGOTXT, 1340 - w / 2, 470 - h / 2 + 18 * (1 - ss(pt)), w, h); ctx.restore(); }
  if (pt > 0) { ctx.save(); ctx.globalAlpha = ss(pt); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 40px Inter'; ctx.fillText('Женский гандбольный клуб', 1340, 650); ctx.restore(); }
  ctx.restore();
}

// —— Live world-space overlay: the triptych ball and its flight line ——
function triOverlay(t, M) {
  if (t < T.release - .01 || t > T.blue[1]) return;
  ctx.save(); ctx.setTransform(...M);
  triTrail(ctx, t);
  const b = triBall(t); if (b) ball(ctx, b[0], b[1], 5.3 * 6.4, t * 6, { lw: 3.4 });
  ctx.restore();
}

// —— Render ——
function render(t) {
  if (QS.get('test') === 'fig') return testFig();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#161a22'; ctx.fillRect(0, 0, W, H);
  if (QS.has('card') || t >= T.blue[1] + .05) { ctx.fillStyle = PAL.blue; ctx.fillRect(0, 0, W, H); finale(t); if (!NOSUB) subtitle(t); return; }
  const cam = camera(t), M = camMatrix(cam);
  drawScroll(M);
  const half = (W / 2) / cam.z + 40;
  for (const s of SHEETS) {
    if (s.x + W < cam.cx - half || s.x > cam.cx + half) continue;
    const Mi = [M[0], 0, 0, M[3], M[4] + M[0] * s.x, M[5]];
    drawSheet(s.id, t, Mi);
  }
  triOverlay(t, M);
  finale(t);
  if (!NOSUB) subtitle(t);
}
function testFig() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(TX.paper, 0, 0);
  ['stand', 'gather', 'cock', 'peak', 'release', 'follow', 'land'].forEach((n, i) => figure(ctx, 140 + i * 260, 600, 420, POSE[n], { ballIn: ['gather', 'cock', 'peak'].includes(n) ? 'N' : null, sway: 2 }));
}

// —— Readable texts (for readcheck) ——
window.TEXTS = t => {
  const out = [];
  if (t >= T.title[0] && t < T.slide21[0] + .1) out.push({ id: 'title', text: 'Оттиски · женский гандбол', x0: 200, y0: 110, x1: 954, y1: 380 });
  return out;
};

// —— Events (foley / music cues) ——
function events() {
  const ev = [], add = (type, t, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
  for (const [id, t0] of Object.entries(VO)) add('vo', t0, { id });
  for (const [id, ts] of Object.entries(T.print)) ts.forEach((t, g) => { if (t < 90) { add('block', t - .1, { v: .55 + g * .08 }); add('baren', t, { d: .34, v: .75 }); } });
  add('slip', T.title[0], { v: .6 }); add('seal', T.title[0] + .45, { v: .8 });
  for (const [id, C] of Object.entries(CART)) { add('slip', C.tIn, { v: .45 }); add('seal', C.tSeal, { v: id === 't25' ? 1.1 : .85, grey: !!C.grey }); }
  add('scroll', T.slide21[0], { d: T.slide21[1] - T.slide21[0], v: .7 }); add('scroll', T.slide22[0], { d: T.slide22[1] - T.slide22[0], v: .6 });
  add('scroll', T.slideT[0], { d: T.slideT[1] - T.slideT[0], v: 1 }); add('scroll', T.panT2[0], { d: T.panT2[1] - T.panT2[0], v: .5 }); add('scroll', T.panT3[0], { d: T.panT3[1] - T.panT3[0], v: .5 });
  add('scroll', T.pullT[0], { d: T.pullT[1] - T.pullT[0], v: .4 });
  // hall action
  for (let t = 10.4; t < 13.0; t += .36) add('step', t, { v: .55 });
  add('jump', 13.0); add('throw', 14.0); add('net', T.goal21, { v: 1 });
  for (let t = 18.0; t < 20.6; t += .36) add('step', t, { v: .45, wet: 1 });
  add('jump', 20.6, { v: .7 }); add('throw', 21.6, { v: .7 }); add('save', T.save22); add('bounce', 23.5, { v: .6 }); add('bounce', 24.0, { v: .35 });
  add('jump', T.throwT + .2); add('throw', T.release, { v: 1.1 }); add('whoosh', 28.4, { d: 1.2 }); add('whoosh', 30.6, { d: 1.4 }); add('net', T.net, { v: 1.2 });
  add('amb', .2, { w: 'room', d: 4.2 }); add('amb', 4.2, { w: 'hall', d: 13.5 }); add('amb', 17.0, { w: 'rain', d: 8.0 }); add('amb', 25.0, { w: 'hall', d: 12.5, v: 1.2 }); add('amb', T.rain[0] - .4, { w: 'rain', d: DUR - T.rain[0] + .4, v: .7 });
  add('card', T.card); add('brand', T.blue[0], { d: T.blue[1] - T.blue[0] });
  return ev.sort((a, b) => a.t - b.t);
}

window.render = render; window.DUR = DUR; window.EV = events(); window.SUBS = SUBS;
render(parseFloat(QS.get('t') ?? '8'));
window.READY = true;
