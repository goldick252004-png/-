// The prints. Each = cached colour blocks (g0 key · g1 blue · g2 ochre/secondary · g3 red/figures) + live paint(t).
import { clamp, lerp, seg, ss, eio, eo, ei, mulberry, hash, vnoise, monotone, TAU } from '/core/lib.js';
import { W, H, FR, PAL, smooth, poly, carve, wob, line, fillPath, bokashi, kasumi, rgba, mix } from './print.js';
import { figure, POSE, runPose, posetrack, ball, ballInHand, lerpPose } from './player.js';
import { T, q8, q12, TRI, TG } from './story.js';

const S = PAL.sumi, OCHRE = '#c9a05a', OCHRE_L = '#dcbc7e', WALL = '#6f86ad', WALL_D = '#3d5482';
const D = [-.3, -1];                                   // depth axis of the flat oblique (parallel, never converging)

// ————————————————— shared hall pieces (drawn in "world" x so the triptych joins) —————————————————
function vault(x, x0, x1, col, a = .95) { bokashi(x, x0, FR.y0, x1, 300, col, a, 0, { rough: 26, seed: 2 + x0 * .001 }); }
function lamps(x, x0, x1, ink = S) {
  for (let X = Math.ceil((x0 - 150) / 320) * 320 + 150; X < x1; X += 320) {
    x.strokeStyle = ink; x.lineWidth = 1.6; x.beginPath(); x.moveTo(X, FR.y0); x.lineTo(X, 112); x.stroke();
    x.beginPath(); x.ellipse(X, 128, 26, 17, 0, 0, TAU); x.lineWidth = 2.4; x.stroke();
    x.beginPath(); x.moveTo(X - 26, 128); x.lineTo(X + 26, 128); x.lineWidth = 1.4; x.stroke();
  }
}
function lampGlow(x, x0, x1, col) { for (let X = Math.ceil((x0 - 150) / 320) * 320 + 150; X < x1; X += 320) { x.fillStyle = col; x.beginPath(); x.ellipse(X, 128, 25, 16, 0, 0, TAU); x.fill(); } }
const TIERS = [[292, 372], [372, 448], [448, 520]];
function standWall(x, x0, x1) { TIERS.forEach(([a, b], i) => { x.fillStyle = i % 2 ? WALL : mix(WALL, WALL_D, .35); x.fillRect(x0, a, x1 - x0, b - a); }); }
// crowd: heads (key) + shirts (blue / ochre / red, by block)
function crowd(x, x0, x1, part) {
  const R = mulberry(77);
  TIERS.forEach(([a, b], ti) => {
    for (let row = 0; row < 2; row++) {
      const y = a + 22 + row * 30, sp = 19 - ti;
      for (let X = -200; X < 6400; X += sp * (.8 + R() * .5)) {
        const r = R(), c = r < .14 ? 'red' : r < .3 ? 'blue' : 'pale', jy = (R() - .5) * 5;
        if (X < x0 - 20 || X > x1 + 20) continue;
        if (part === 'key') { x.fillStyle = S; x.beginPath(); x.arc(X, y + jy, 6.2 - ti * .4, 0, TAU); x.fill(); }
        else if (part === c) { x.fillStyle = c === 'red' ? PAL.red : c === 'blue' ? PAL.blue : '#e9d9b4'; x.beginPath(); x.ellipse(X, y + jy + 11, 8, 6, 0, Math.PI, TAU); x.fill(); }
      }
    }
  });
}
function tierLines(x, x0, x1, ink = S) { x.strokeStyle = ink; [372, 448, 520].forEach(y => { x.lineWidth = 2.2; x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke(); }); x.lineWidth = 3; x.beginPath(); x.moveTo(x0, 556); x.lineTo(x1, 556); x.stroke(); }
function barrier(x, x0, x1) { x.fillStyle = PAL.blue; x.fillRect(x0, 520, x1 - x0, 36); }
function floor(x, x0, x1) { x.fillStyle = OCHRE; x.fillRect(x0, 556, x1 - x0, FR.y1 - 556 + 20); }
function planks(x, x0, x1, ink = S) {
  x.strokeStyle = rgba(ink, .32); x.lineWidth = 1.3;
  for (let X = Math.floor(x0 / 74) * 74 - 400; X < x1 + 400; X += 74) { x.beginPath(); x.moveTo(X, FR.y1 + 10); x.lineTo(X + .3 * (FR.y1 + 10 - 556), 556); x.stroke(); }
  x.strokeStyle = rgba(ink, .18); for (let y = 600; y < FR.y1; y += 88) { x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke(); }
}
// oblique arc around a goal centre G: horizontal radius rx (toward −x), depth radius rd (along D)
function arcPts(G, rx, rd, n = 48) { const p = []; for (let i = 0; i <= n; i++) { const f = -Math.PI / 2 + i / n * Math.PI, u = Math.cos(f), v = Math.sin(f); p.push([G[0] - u * rx + D[0] * v * rd, G[1] + D[1] * v * rd]); } return p; }
function courtLines(x, G, rx6, rd6, rx9, rd9, lw) {
  x.save(); x.globalCompositeOperation = 'destination-out'; x.strokeStyle = '#000'; x.lineCap = 'butt';
  x.lineWidth = lw; x.beginPath(); smooth(x, arcPts(G, rx6, rd6)); x.stroke();
  x.setLineDash([lw * 5, lw * 3.5]); x.beginPath(); smooth(x, arcPts(G, rx9, rd9)); x.stroke(); x.setLineDash([]);
  const a = [G[0] + D[0] * -700, G[1] + D[1] * -700], b = [G[0] + D[0] * 700, G[1] + D[1] * 700]; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
  x.restore();
}
// goal: front post foot F, height h, depth vector dv (to back post), net depth nd (+x)
function goalKey(x, F, h, dv, nd, lw, ink = S) {
  const Bk = [F[0] + dv[0], F[1] + dv[1]], Ft = [F[0], F[1] - h], Bt = [Bk[0], Bk[1] - h];
  // net (thin grid on the side panel, top and back)
  x.strokeStyle = rgba(ink, .5); x.lineWidth = lw * .45;
  const nb = [F[0] + nd, F[1] - h * .05], nbt = [F[0] + nd * .9, F[1] - h * .82], nbk = [Bk[0] + nd, Bk[1] - h * .05], nbkt = [Bk[0] + nd * .9, Bk[1] - h * .82];
  for (let i = 0; i <= 10; i++) { const u = i / 10; const a = [lerp(F[0], Bk[0], u), lerp(F[1], Bk[1], u)], b = [lerp(nb[0], nbk[0], u), lerp(nb[1], nbk[1], u)], c = [lerp(nbt[0], nbkt[0], u), lerp(nbt[1], nbkt[1], u)], d = [lerp(Ft[0], Bt[0], u), lerp(Ft[1], Bt[1], u)];
    x.beginPath(); x.moveTo(d[0], d[1]); x.lineTo(c[0], c[1]); x.lineTo(b[0], b[1]); x.stroke(); }
  for (let i = 0; i <= 12; i++) { const u = i / 12; x.beginPath(); x.moveTo(lerp(Ft[0], F[0], u), lerp(Ft[1], F[1], u) ); x.lineTo(lerp(nbt[0], nb[0], u), lerp(nbt[1], nb[1], u)); x.lineTo(lerp(nbkt[0], nbk[0], u), lerp(nbkt[1], nbk[1], u)); x.stroke(); }
  // frame
  x.strokeStyle = ink; x.lineWidth = lw; x.lineJoin = 'round';
  const pw = lw * 4.4;
  for (const [a, b] of [[F, Ft], [Bk, Bt], [Ft, Bt]]) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), n = [-dy / L * pw / 2, dx / L * pw / 2];
    x.beginPath(); poly(x, [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]]); x.stroke();
  }
  return { F, Bk, Ft, Bt };
}
function goalRed(x, F, h, dv, lw, col = PAL.red) {
  const Bk = [F[0] + dv[0], F[1] + dv[1]], Ft = [F[0], F[1] - h], Bt = [Bk[0], Bk[1] - h], pw = lw * 4.4;
  x.fillStyle = col;
  for (const [a, b] of [[F, Ft], [Bk, Bt], [Ft, Bt]]) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), n = [-dy / L * pw / 2, dx / L * pw / 2], k = Math.floor(L / (pw * 3.2));
    for (let i = 0; i < k; i += 2) { const u0 = i / k, u1 = (i + 1) / k; x.beginPath(); poly(x, [[a[0] + dx * u0 + n[0], a[1] + dy * u0 + n[1]], [a[0] + dx * u1 + n[0], a[1] + dy * u1 + n[1]], [a[0] + dx * u1 - n[0], a[1] + dy * u1 - n[1]], [a[0] + dx * u0 - n[0], a[1] + dy * u0 - n[1]]]); x.fill(); }
  }
}

// ————————————————— rain: two sets of fine straight lines, 12 fps —————————————————
export function rain(x, t, { x0 = 0, y0 = 0, x1 = W, y1 = H, n = 260, ang = .1, col = '#5c5b57', a = .55, len = [50, 130], lw = 1.4, seed = 1 } = {}) {
  const f = Math.floor(q12(t) * 12), R = mulberry(seed * 1000 + f);
  x.save(); x.strokeStyle = rgba(col, a); x.lineCap = 'round';
  for (let set = 0; set < 2; set++) {
    const an = ang + set * .06, dx = Math.sin(an), dy = Math.cos(an);
    x.lineWidth = lw * (set ? .8 : 1); x.beginPath();
    for (let i = 0; i < n / 2; i++) { const px = x0 + R() * (x1 - x0 + 200) - 100, py = y0 + R() * (y1 - y0), L = len[0] + R() * (len[1] - len[0]); x.moveTo(px, py); x.lineTo(px + dx * L, py + dy * L); }
    x.stroke();
  }
  x.restore();
}

// ————————————————— HOOK: the hand and the ball —————————————————
const HB = { c: [1185, 450], r: 300 };
const deg = d => d * Math.PI / 180;
function arcLimb(a0, a1, k0, k1, w0, w1, n = 14) { const L = [], R = []; for (let i = 0; i <= n; i++) { const u = i / n, a = lerp(a0, a1, u), k = lerp(k0, k1, u), w = lerp(w0, w1, u), c = [Math.cos(a), Math.sin(a)]; L.push([HB.c[0] + c[0] * (HB.r * k - w / 2), HB.c[1] + c[1] * (HB.r * k - w / 2)]); R.push([HB.c[0] + c[0] * (HB.r * k + w / 2), HB.c[1] + c[1] * (HB.r * k + w / 2)]); } const e = L[L.length - 1], f = R[R.length - 1], a = lerp(a0, a1, 1.06), k = lerp(k0, k1, 1.06), tip = [HB.c[0] + Math.cos(a) * HB.r * k, HB.c[1] + Math.sin(a) * HB.r * k]; return L.concat([tip], R.reverse()); }
// a hand holding the ball up from below: palm under the ball, fingers fanned up its front, thumb to the left
const HSKIN = '#e8bd94';
const PC = [1185, 772];
const ARM = [[1062, 870], [1305, 872], [1336, 1110], [1012, 1110]];
const PALM = [[1012, 842], [1046, 728], [1180, 694], [1322, 724], [1362, 836], [1292, 906], [1080, 906]];
function ray(base, ang, len, w0, w1, bend = 0) {     // ang from vertical (+ = right); a tapered finger with a rounded tip
  const n = 10, pts = [], ws = [];
  for (let i = 0; i <= n; i++) { const u = i / n, a = ang + bend * u * u; pts.push([base[0] + Math.sin(a) * len * u, base[1] - Math.cos(a) * len * u]); ws.push(lerp(w0, w1, u)); }
  const L = [], R = [];
  for (let i = 0; i <= n; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)]; let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const d = Math.hypot(dx, dy); dx /= d; dy /= d; L.push([pts[i][0] - dy * ws[i] / 2, pts[i][1] + dx * ws[i] / 2]); R.push([pts[i][0] + dy * ws[i] / 2, pts[i][1] - dx * ws[i] / 2]); }
  const e = pts[n], a = ang + bend, tip = [e[0] + Math.sin(a) * w1 * .5, e[1] - Math.cos(a) * w1 * .5];
  return L.concat([tip], R.reverse());
}
const FING = [[-34, 214, 72, 58, -.18], [-11, 246, 76, 60, -.06], [12, 236, 74, 58, .08], [33, 190, 64, 50, .2]].map(([d, len, w0, w1, bend]) => { const t = d * Math.PI / 180; return ray([PC[0] + Math.sin(t) * 128, PC[1] - Math.cos(t) * 58], t * 1.15, len, w0, w1, bend); });
const THUMBP = ray([PC[0] - 150, PC[1] + 14], -72 * Math.PI / 180, 186, 86, 64, -.35);
function handShape(x, mode) {
  const parts = [ARM, PALM, THUMBP, ...FING];
  if (mode === 'fill') { x.fillStyle = HSKIN; parts.forEach(p => { x.beginPath(); smooth(x, p, true); x.fill(); }); return; }
  const kk = (p, seed, w = 6) => carve(x, p.concat([p[0]]), w, { taper: [0, 0], seed, jit: .25, per: 4 });
  kk(ARM, 1); kk(PALM, 2); kk(THUMBP, 9); FING.forEach((f, i) => kk(f, 3 + i));
  x.strokeStyle = S; x.lineCap = 'round'; x.lineWidth = 3.2;
  // one crease per finger, palm line
  FING.forEach(f => { const n = (f.length - 1) / 2, a = f[Math.round(n * .55)], b = f[f.length - 1 - Math.round(n * .55)]; x.beginPath(); x.moveTo(lerp(a[0], b[0], .2), lerp(a[1], b[1], .2)); x.lineTo(lerp(a[0], b[0], .65), lerp(a[1], b[1], .65)); x.stroke(); });
  x.beginPath(); smooth(x, [[1070, 850], [1170, 826], [1290, 846]]); x.stroke();
}
const BAND_Q = [[1048, 936], [1312, 940], [1320, 1000], [1040, 996]];
function wristband(x, mode) {
  if (mode === 'red') { x.fillStyle = PAL.red; x.beginPath(); poly(x, BAND_Q); x.fill(); }
  else if (mode === 'blue') { x.fillStyle = PAL.blue; x.beginPath(); poly(x, [[1044, 961], [1316, 965], [1317, 977], [1042, 973]]); x.fill(); }
  else carve(x, BAND_Q.concat([BAND_Q[0]]), 5, { taper: [0, 0], seed: 21, per: 2 });
}
export const HOOK = {
  id: 'hook',
  layers: {
    key: { g: 0, speck: .12, draw(x) {
      handShape(x, 'key'); wristband(x, 'key');
    } },
    blue: { g: 1, grain: .14, draw(x) {
      bokashi(x, 0, FR.y0, W, 520, PAL.blue, .96, 0, { rough: 28, seed: 4 });
      bokashi(x, 0, 760, W, FR.y1, PAL.blueL, 0, .35, { rough: 20, seed: 7 });
      ball(x, HB.c[0], HB.c[1], HB.r, -.25, { lw: 6 });
      wristband(x, 'blue');
    } },
    ochre: { g: 2, grain: .05, baren: .1, speck: .12, draw(x) {
      kasumi(x, 470, 560, 900, 60, '#f1dfc0', .95); kasumi(x, 1560, 930, 820, 54, '#f1dfc0', .9);
      handShape(x, 'fill');
    } },
    red: { g: 3, grain: .03, draw(x) { wristband(x, 'red'); } },
  },
  paint(ctx, t, R) { R.L('blue'); R.L('ochre'); R.L('red'); R.L('key'); },
};

// ————————————————— THE HALL (2021 / 2022: one key block, two impressions) —————————————————
const G21 = [1678, 862], GF21 = [1700, 935], GH21 = 430, GD21 = [-46, -152], GN21 = 130;
const hallKey = (x, ink = S) => {
  lamps(x, 0, W, ink); tierLines(x, 0, W, ink); crowd(x, 0, W, 'key'); planks(x, 0, W, ink);
  goalKey(x, GF21, GH21, GD21, GN21, 3, ink);
};
export const HALL = {
  layers: {
    key: { g: 0, speck: .12, draw(x) { hallKey(x); } },
    blue: { g: 1, grain: .14, draw(x) { vault(x, 0, W, PAL.blue); standWall(x, 0, W); barrier(x, 0, W); crowd(x, 0, W, 'blue'); } },
    ochre: { g: 2, grain: .06, draw(x) {
      floor(x, 0, W); courtLines(x, G21, 420, 120, 700, 210, 9); crowd(x, 0, W, 'pale'); lampGlow(x, 0, W, '#f0d9a2');
      kasumi(x, 560, 300, 1180, 46, '#f3e3c4', .92); kasumi(x, 1420, 500, 1050, 42, '#f3e3c4', .88);
    } },
    red: { g: 3, grain: .02, draw(x) { crowd(x, 0, W, 'red'); goalRed(x, GF21, GH21, GD21, 3); } },
    keyGrey: { g: 0, speck: .2, draw(x) { hallKey(x, '#6d6c68'); x.save(); x.globalAlpha = .9; courtLinesInk(x); x.restore(); } },
  },
};
function courtLinesInk(x) { x.strokeStyle = 'rgba(109,108,104,.55)'; x.lineWidth = 2; x.beginPath(); smooth(x, arcPts(G21, 420, 120)); x.stroke(); x.setLineDash([24, 18]); x.beginPath(); smooth(x, arcPts(G21, 700, 210)); x.stroke(); x.setLineDash([]); }

// shooter / defenders / keeper choreography for one hall impression
function hallAction(x, t, o) {
  const { t0, lineOnly, ink, save } = o;      // t0 = time of the jump (cock)
  const tq = q8(t), h = 380, gy = 912, opts = { kit: 'cska', lineOnly, ink, sway: 0 };
  // shooter: ready → run → jump-shot
  const run0 = t0 - 2.6, x0 = 520, xr = 880;
  let pose, px;
  if (tq < run0) { pose = lerpPose(POSE.gather, POSE.stand, .35 + .1 * Math.sin(tq * 3)); px = x0; }
  else if (tq < t0) { const u = (tq - run0) / (t0 - run0); pose = runPose(u * 3.6); px = lerp(x0, xr, u); }
  else { pose = posetrack([[t0, POSE.gather], [t0 + .35, POSE.cock], [t0 + .8, POSE.peak], [t0 + 1.0, POSE.release], [t0 + 1.3, POSE.follow], [t0 + 1.8, POSE.land]], tq); px = xr; }
  const rel = t0 + 1.0, holding = tq < rel;
  const sway = Math.sin(tq * 9) * 1.5 + (tq > run0 ? 2 : 0);
  // defenders (opponents, facing −x) and keeper
  const dpose = posetrack([[t0 + .2, POSE.defReady], [t0 + .7, POSE.block], [t0 + 1.3, POSE.block], [t0 + 1.9, POSE.defReady]], tq);
  const kpose = save ? posetrack([[t0 + .6, POSE.keepReady], [t0 + 1.05, POSE.keepStar], [t0 + 1.8, POSE.keepStar], [t0 + 2.4, POSE.keepReady]], tq)
    : posetrack([[t0 + .7, POSE.keepReady], [t0 + 1.15, POSE.keepLate], [t0 + 2.2, POSE.keepLate]], tq);
  figure(x, 1395, 806, h * .9, dpose, { ...opts, kit: 'opp', flip: true, sway: -1 });
  figure(x, 1622, 858, h * .96, kpose, { ...opts, kit: 'keep', flip: true });
  figure(x, 1265, 896, h, lerpPose(dpose, POSE.defReady, .25), { ...opts, kit: 'opp', flip: true, sway: -1.5 });
  const ballR = 5.3 * h / 100;
  const sh = figure(x, px, gy, h, pose, { ...opts, ballIn: holding ? 'N' : null, sway, ballRot: tq * 2 });
  if (!holding) {
    // ball flight (on ones: the subject the camera watches)
    const p0 = ballInHand(xr, gy, h, POSE.release, false);
    let bp;
    if (!save) {
      const end = [1668, 395], inNet = [1742, 470], floorN = [1760, 820];
      const u = seg(t, rel, T.goal21);
      if (t < T.goal21) bp = [lerp(p0[0], end[0], u), lerp(p0[1], end[1], u) - 150 * Math.sin(Math.PI * u)];
      else { const v = seg(t, T.goal21, T.goal21 + .22), w = ei(seg(t, T.goal21 + .22, T.goal21 + .9)); bp = v < 1 ? [lerp(end[0], inNet[0], v), lerp(end[1], inNet[1], v)] : [lerp(inNet[0], floorN[0], w), lerp(inNet[1], floorN[1], w)]; }
    } else {
      const hit = [1545, 452], up = [1280, 210], fl = [1060, 905], ts = T.save22;
      if (t < ts) { const u = seg(t, rel, ts); bp = [lerp(p0[0], hit[0], u), lerp(p0[1], hit[1], u) - 120 * Math.sin(Math.PI * u)]; }
      else { const u = seg(t, ts, ts + 1.1); bp = [lerp(hit[0], fl[0], u), lerp(hit[1], up[1], eo(Math.min(1, u * 2))) + (u > .5 ? (fl[1] - up[1]) * ei((u - .5) * 2) : 0)]; }
    }
    ball(x, bp[0], bp[1], ballR, t * 7, { lw: 2.6, ink: ink || S, line: lineOnly });
  }
}
export const Y21 = {
  id: 'y21', layers: HALL.layers,
  paint(ctx, t, R) {
    R.L('blue'); R.L('ochre'); R.L('red'); R.L('key');
    R.D(3, x => hallAction(x, t, { t0: T.throw21[0] + 2.0 }));
  },
};
export const Y22 = {
  id: 'y22', layers: HALL.layers,
  paint(ctx, t, R) {
    R.L('keyGrey');
    R.D(0, x => { hallAction(x, t, { t0: 20.6, lineOnly: true, ink: '#5f5e5a', save: true }); });
    R.D(0, x => { x.save(); x.globalAlpha = .1; x.fillStyle = '#6d6c68'; x.fillRect(0, 0, W, H); x.restore(); rain(x, t, { n: 420, ang: .1, col: '#55544f', a: .5, len: [60, 150], seed: 3 }); });
  },
};

// ————————————————— TRIPTYCH 2023 · 2024 · 2025: one throw across three sheets —————————————————
export const TW = 3 * 1920 + 2 * TG;
const TS = 640;                              // figure height
const SHX = 520, SHY = 930;                  // shooter takeoff (world)
const GOAL = { F: [TRI[2] + 1585, 930], h: 610, dv: [-60, -196], nd: 170 };
const NET = [TRI[2] + 1555, 268], NETIN = [TRI[2] + 1665, 400], NETFLOOR = [TRI[2] + 1690, 840];
const throwKeys = t0 => [[t0, POSE.gather], [t0 + .35, POSE.cock], [t0 + .55, POSE.peak], [t0 + .7, POSE.release], [t0 + 1.0, POSE.follow], [t0 + 1.5, POSE.land]];
export const REL_P = ballInHand(SHX, SHY, TS, POSE.release, false);
// ball x(t) on ones, y(x) a long arc with its apex over the 2024 sheet
const BX = monotone([[T.release, REL_P[0]], [28.0, 1720], [29.1, TRI[1] + 420], [30.5, TRI[1] + 1520], [31.6, TRI[2] + 560], [T.net, NET[0]]]);
const BY = X => { const x0 = REL_P[0], x1 = NET[0], xm = TRI[1] + 960, y0 = REL_P[1], y1 = NET[1], ym = 128; const u = (X - x0) / (x1 - x0), um = (xm - x0) / (x1 - x0);
  // quadratic through three points (Lagrange)
  return y0 * ((u - um) * (u - 1)) / ((0 - um) * (0 - 1)) + ym * ((u - 0) * (u - 1)) / ((um - 0) * (um - 1)) + y1 * ((u - 0) * (u - um)) / ((1 - 0) * (1 - um)); };
export function triBall(t) {
  if (t < T.release) return null;
  if (t < T.net) { const X = BX(t); return [X, BY(X)]; }
  const v = seg(t, T.net, T.net + .25), w = ei(seg(t, T.net + .25, T.net + 1.0));
  return v < 1 ? [lerp(NET[0], NETIN[0], v), lerp(NET[1], NETIN[1], v)] : [lerp(NETIN[0], NETFLOOR[0], w), lerp(NETIN[1], NETFLOOR[1], w)];
}
function triBg(i) {
  const ox = TRI[i], x0 = ox, x1 = ox + 1920;
  const w = (fn) => x => { x.save(); x.translate(-ox, 0); fn(x); x.restore(); };
  return {
    key: { g: 0, speck: .12, draw: w(x => { lamps(x, x0, x1); tierLines(x, x0, x1); crowd(x, x0, x1, 'key'); planks(x, x0, x1); if (i === 2) goalKey(x, GOAL.F, GOAL.h, GOAL.dv, GOAL.nd, 4.4); }) },
    blue: { g: 1, grain: .14, draw: x => { vault(x, 0, W, PAL.blue); w(x2 => { standWall(x, x0, x1); barrier(x, x0, x1); crowd(x2, x0, x1, 'blue'); })(x); } },
    ochre: { g: 2, grain: .06, draw: w(x => {
      floor(x, x0, x1); crowd(x, x0, x1, 'pale'); lampGlow(x, x0, x1, '#f0d9a2');
      x.save(); x.globalCompositeOperation = 'destination-out'; x.strokeStyle = '#000'; x.lineWidth = 12; x.setLineDash([60, 42]); x.beginPath(); smooth(x, [[0, 960], [2400, 900], [4200, 870], [TRI[2] + 900, 835]]); x.stroke(); x.setLineDash([]);
      x.beginPath(); smooth(x, [[TRI[2] + 520, 1060], [TRI[2] + 900, 740], [TRI[2] + 1300, 600], [TRI[2] + 1700, 570]]); x.stroke(); x.restore();
      kasumi(x, 1500, 300, 3600, 48, '#f3e3c4', .92); kasumi(x, 4300, 505, 3000, 44, '#f3e3c4', .88);
    }) },
    red: { g: 3, grain: .02, draw: w(x => { crowd(x, x0, x1, 'red'); if (i === 2) goalRed(x, GOAL.F, GOAL.h, GOAL.dv, 4.4); }) },
  };
}
function triAction(x, t, i) {
  const ox = TRI[i], tq = q8(t);
  x.save(); x.translate(-ox, 0);
  if (i === 0) {
    const pose = posetrack(throwKeys(T.throwT), tq), holding = tq < T.release;
    figure(x, SHX, SHY, TS, pose, { kit: 'cska', ballIn: holding ? 'N' : null, sway: 2 + Math.sin(tq * 8), ballRot: tq });
  }
  if (i === 1) {
    const d = posetrack([[29.0, POSE.defReady], [29.5, POSE.block], [30.6, POSE.block], [31.2, POSE.defReady]], tq);
    figure(x, TRI[1] + 1300, 905, TS * .95, d, { kit: 'opp', flip: true, sway: -2 });
    figure(x, TRI[1] + 640, 930, TS, posetrack([[28.7, POSE.defReady], [29.2, POSE.block], [30.2, POSE.block], [30.8, POSE.defReady]], tq), { kit: 'opp', flip: true, sway: -1 });
  }
  if (i === 2) {
    const k = posetrack([[31.9, POSE.keepReady], [32.3, POSE.keepLate], [33.6, POSE.keepLate], [34.2, POSE.keepReady]], tq);
    figure(x, TRI[2] + 1260, 930, TS * .97, k, { kit: 'keep', flip: true });
  }
  x.restore();
}
// dashed flight line (key ink), drawn up to the ball
export function triTrail(x, t, upto = null) {
  if (t < T.release) return;
  const tEnd = Math.min(t, T.net), pts = [];
  for (let s = T.release; s <= tEnd; s += .02) { const X = BX(s); pts.push([X, BY(X)]); }
  if (pts.length < 2) return;
  x.save(); x.strokeStyle = rgba(S, .62); x.lineWidth = 3; x.setLineDash([16, 14]); x.lineCap = 'round'; x.beginPath(); smooth(x, pts); x.stroke(); x.restore();
}
export const TRIPTYCH = [0, 1, 2].map(i => ({
  id: ['t23', 't24', 't25'][i], layers: triBg(i), panel: i,
  paint(ctx, t, R) {
    R.L('blue'); R.L('ochre'); R.L('red'); R.L('key');
    R.D(3, x => triAction(x, t, i));
  },
}));
