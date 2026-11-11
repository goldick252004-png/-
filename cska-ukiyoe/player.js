// Flat woodblock figure rig: a handball player in profile, facing +x (flip for −x).
// Local units: soles at y = 0, standing height ≈ 100. Angles: dir(θ) = (sin θ, cos θ) → 0 down, π/2 forward, π up, −π/2 back.
import { clamp, lerp, TAU } from '/core/lib.js';
import { PAL, smooth, poly } from './print.js';

const dir = a => [Math.sin(a), Math.cos(a)];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const lp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

export const KITS = {
  cska: { shirt: PAL.red, stripe: PAL.blue, trim: '#f6efdc', shorts: PAL.blue, sock: '#f6efdc', shoe: PAL.blue, band: PAL.red },
  opp: { shirt: '#7d8a78', stripe: '#4f5c4b', trim: '#e3d9bd', shorts: '#c9a05a', sock: '#e3d9bd', shoe: '#4f5c4b', band: '#4f5c4b' },
  keep: { shirt: '#d39b3a', stripe: '#8a5a1e', trim: '#efe4cc', shorts: '#2b2826', sock: '#2b2826', shoe: '#2b2826', band: '#2b2826' },
};

// Variable-width limb (polyline + per-point width) → polygon
function limbPoly(pts, ws) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    L.push([pts[i][0] - dy * ws[i] / 2, pts[i][1] + dx * ws[i] / 2]); R.push([pts[i][0] + dy * ws[i] / 2, pts[i][1] - dx * ws[i] / 2]);
  }
  return L.concat(R.reverse());
}

export function lerpPose(a, b, u) {
  const o = {};
  for (const k in a) {
    const A = a[k], B = b[k] ?? A;
    o[k] = Array.isArray(A) ? A.map((v, i) => lerp(v, B[i], u)) : typeof A === 'number' ? lerp(A, B, u) : (u < .5 ? A : B);
  }
  return o;
}
// keyframes [[t, pose], ...] → pose at t (smoothstep between keys)
export function posetrack(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, p0] = keys[i], [t1, p1] = keys[i + 1];
    if (t <= t1) { let u = (t - t0) / (t1 - t0); u = u * u * (3 - 2 * u); return lerpPose(p0, p1, u); }
  }
  return keys[keys.length - 1][1];
}

// —— Pose library ——
const P = (hip, tor, aN, aF, lN, lF, head = 0) => ({ hip, tor, aN, aF, lN, lF, head });
export const POSE = {
  stand: P([0, -49], .05, [.25, .1], [-.15, -.1], [.05, 0], [-.05, 0]),
  runA: P([0, -46.5], .28, [-.75, -.05], [.85, 1.95], [.6, .15], [-.5, -1.35]),
  runM1: P([0, -50], .25, [.1, .9], [.1, .9], [.05, -.05], [1.05, -.5]),
  runB: P([0, -46.5], .28, [.85, 1.95], [-.75, -.05], [-.5, -1.35], [.6, .15]),
  runM2: P([0, -50], .25, [.1, .9], [.1, .9], [1.05, -.5], [.05, -.05]),
  gather: P([0, -44], .32, [1.15, 2.45], [1.0, 2.55], [.75, -.15], [-.35, -.7]),
  cock: P([10, -60], -.12, [3.75, 3.6], [1.7, 2.2], [1.4, .3], [-.25, -.85], -.05),
  peak: P([22, -70], -.2, [3.95, 4.0], [1.75, 2.1], [1.5, .45], [-.35, -1.0], -.08),
  release: P([30, -68], .38, [2.5, 1.95], [.35, .15], [1.0, .3], [-.2, -1.15], .05),
  follow: P([40, -56], .45, [1.15, .95], [-.45, -.1], [.6, .2], [-.1, -.75]),
  land: P([44, -46], .3, [.55, .45], [-.3, 0], [.4, .05], [-.35, -.45]),
  defReady: P([0, -47], .12, [2.35, 2.9], [2.2, 2.8], [.35, -.1], [-.25, -.15]),
  block: P([0, -57], -.05, [3.05, 3.12], [2.92, 3.05], [.25, -.2], [-.12, -.45]),
  keepReady: P([0, -45], .18, [1.95, 2.55], [2.3, 2.85], [.45, -.15], [-.45, .12]),
  keepStar: P([0, -60], -.15, [2.75, 2.85], [3.6, 3.5], [.75, .35], [-.7, -.3]),
  keepLate: P([-12, -58], -.55, [3.35, 3.3], [2.4, 2.3], [.6, .25], [-.8, -.4], -.2),
};

// run cycle, ph ∈ [0,1)
export function runPose(ph) {
  const seq = [POSE.runA, POSE.runM1, POSE.runB, POSE.runM2, POSE.runA], f = (((ph % 1) + 1) % 1) * 4, i = Math.floor(f);
  return lerpPose(seq[i], seq[i + 1], f - i);
}

// —— Skeleton ——
export function skeleton(pose) {
  const { hip, tor, aN, aF, lN, lF, head } = pose;
  const up = [Math.sin(tor), -Math.cos(tor)], nrm = [Math.cos(tor), Math.sin(tor)];
  const S = add(hip, up, 26), N = add(hip, up, 30), Hc = add(N, [Math.sin(tor + head), -Math.cos(tor + head)], 7.6);
  const arm = (a, sh) => { const e = add(sh, dir(a[0]), 15), w = add(e, dir(a[1]), 13); return { s: sh, e, w, h: add(w, dir(a[1]), 3.4) }; };
  const leg = (l, hp) => { const k = add(hp, dir(l[0]), 23), an = add(k, dir(l[1]), 22); return { h: hp, k, a: an, toe: add(an, dir(l[1] + Math.PI / 2), 7.4) }; };
  return {
    up, nrm, hip, S, N, Hc, tor, head,
    armN: arm(aN, add(S, nrm, 1.2)), armF: arm(aF, add(S, nrm, -1.5)),
    legN: leg(lN, add(hip, nrm, 1.2)), legF: leg(lF, add(hip, nrm, -1.2)),
  };
}

// —— Ball (a handball: unprinted paper with carved panel seams; a blue centre panel, red panels at the rim) ——
const PENT = (cx, cy, r, a0) => Array.from({ length: 5 }, (_, i) => { const a = a0 + i * TAU / 5; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
export function ball(x, cx, cy, r, rot = 0, { lw = 2.4, ink = PAL.sumi, line = false } = {}) {
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fillStyle = line ? '#efe4cc' : '#f6efdc'; x.fill();
  x.save(); x.clip();
  const c = [r * .1, -r * .08], pr = r * .34, a0 = -Math.PI / 2, P0 = PENT(c[0], c[1], pr, a0);
  // outer pentagons (cut by the rim): between each pair of spokes
  const outer = Array.from({ length: 5 }, (_, i) => { const a = a0 + (i + .5) * TAU / 5; return PENT(c[0] + Math.cos(a) * r * .98, c[1] + Math.sin(a) * r * .98, pr * 1.05, a + Math.PI); });
  if (!line) {
    x.fillStyle = PAL.blue; x.beginPath(); poly(x, P0); x.fill();
    x.fillStyle = PAL.red; [0, 2].forEach(i => { x.beginPath(); poly(x, outer[i]); x.fill(); });
    x.fillStyle = PAL.blue; x.beginPath(); poly(x, outer[4]); x.fill();
  }
  x.strokeStyle = ink; x.lineWidth = lw * .75; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); poly(x, P0); x.stroke();
  outer.forEach(o => { x.beginPath(); poly(x, o); x.stroke(); });
  // spokes: centre pentagon vertex → hexagon edge between two outer pentagons
  P0.forEach((p, i) => { const a = a0 + i * TAU / 5, q = [c[0] + Math.cos(a) * r * .66, c[1] + Math.sin(a) * r * .66]; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]);
    const o1 = outer[(i + 4) % 5], o2 = outer[i]; let b1 = o1[0], b2 = o2[0], d1 = 1e9, d2 = 1e9; o1.forEach(v => { const d = Math.hypot(v[0] - q[0], v[1] - q[1]); if (d < d1) { d1 = d; b1 = v; } }); o2.forEach(v => { const d = Math.hypot(v[0] - q[0], v[1] - q[1]); if (d < d2) { d2 = d; b2 = v; } });
    x.moveTo(q[0], q[1]); x.lineTo(b1[0], b1[1]); x.moveTo(q[0], q[1]); x.lineTo(b2[0], b2[1]); x.stroke(); });
  x.restore();
  x.beginPath(); x.arc(0, 0, r, 0, TAU); x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  x.restore();
}

// —— Figure ——
// opts: kit, flip (face −x), lineOnly (key block only), ink, ballIn ('N' | null), ballR, sway (hair), shade
export function figure(x, cx, cy, h, pose, opts = {}) {
  const k = KITS[opts.kit || 'cska'], s = h / 100, lw = (opts.lw || 2.6) / s, ink = opts.ink || PAL.sumi, LO = !!opts.lineOnly;
  const B = skeleton(pose);
  x.save(); x.translate(cx, cy); x.scale(opts.flip ? -s : s, s);
  x.lineJoin = 'round'; x.lineCap = 'round';
  const shape = (pts, fill, w = lw, closed = true, sm = false) => {
    x.beginPath(); sm ? smooth(x, pts, closed) : poly(x, pts);
    if (fill && !LO) { x.fillStyle = fill; x.fill(); }
    else if (LO && fill) { x.fillStyle = '#efe4cc'; x.fill(); }
    if (w) { x.lineWidth = w; x.strokeStyle = ink; x.stroke(); }
  };
  const skin = PAL.skin, skinF = '#d6ab82';
  const drawArm = (A, far) => {
    shape(limbPoly([A.s, A.e, A.w], [5.6, 4.4, 3.3]), far ? skinF : skin);
    // hand: a mitten with a thumb
    const d = [A.w[0] - A.e[0], A.w[1] - A.e[1]], L = Math.hypot(...d) || 1, u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
    const c = add(A.w, u, 2.2);
    shape([add(add(c, n, 2.2), u, -1.8), add(add(c, n, 2.4), u, 2.2), add(c, u, 3.6), add(add(c, n, -2.4), u, 2.0), add(add(c, n, -2.0), u, -1.8)], far ? skinF : skin, lw * .85, true, true);
    // cap sleeve
    shape(limbPoly([A.s, lp(A.s, A.e, .36)], [7.2, 6.2]), k.shirt, lw * .9);
  };
  const drawLeg = (G, far) => {
    shape(limbPoly([G.h, G.k, G.a], [9, 6.4, 4.2]), far ? skinF : skin);
    const s0 = lp(G.k, G.a, .45);
    shape(limbPoly([s0, G.a], [5.4, 4.6]), k.sock, lw * .8);
    shape([add(G.a, [G.toe[0] - G.a[0], G.toe[1] - G.a[1]], -.25), add(G.a, B.up, -0.2), G.toe, add(G.toe, [0, 2.2]), add(G.a, [0, 2.6])].map(p => p), k.shoe, lw * .85, true, true);
  };
  // far side
  drawArm(B.armF, true); drawLeg(B.legF, true);
  // shorts (over the tops of both thighs)
  const sh = (G) => limbPoly([lp(G.h, G.k, -.15), lp(G.h, G.k, .42)], [12.5, 11]);
  shape(sh(B.legF), k.shorts); drawLeg(B.legN, false); shape(sh(B.legN), k.shorts);
  // torso (sleeveless shirt with side stripe and collar trim)
  const nr = B.nrm, up = B.up, H0 = B.hip, S = B.S;
  const torso = [add(add(S, nr, -8.2), up, 1.2), add(add(S, nr, 7.8), up, 1.6), add(add(H0, nr, 6.6), up, 12), add(add(H0, nr, 7.4), up, -2), add(add(H0, nr, -7.6), up, -2), add(add(H0, nr, -6.8), up, 12)];
  shape(torso, k.shirt, lw, true, true);
  if (!LO) { x.save(); x.beginPath(); smooth(x, torso, true); x.clip(); shape([add(add(S, nr, -8.6), up, 2), add(add(S, nr, -4.6), up, 2), add(add(H0, nr, -4), up, -3), add(add(H0, nr, -8.6), up, -3)], k.stripe, 0); x.restore(); shape(torso, null, lw, true, true); }
  // neck + head (profile)
  shape(limbPoly([add(B.N, up, -3), add(B.N, up, 2.5)], [4.6, 4.2]), skin, lw * .8);
  x.save(); x.translate(B.Hc[0], B.Hc[1]); x.rotate(B.tor + B.head); x.scale(.9, .9);
  const face = [[-6, -1], [-5.2, -5], [-1.5, -7.2], [3, -6.6], [5.6, -4], [6.2, -1.4], [7.5, .7], [6.3, 1.5], [6.5, 2.6], [6.1, 3.4], [5.9, 4.3], [4.2, 5.7], [1, 6.2], [-2, 5.3], [-4.6, 3.2]];
  shape(face, skin, lw * .85, true, true);
  // hair: cap + bun + flying ponytail (ink black even in the key-only print)
  const hair = '#1f1b19', sway = opts.sway || 0;
  x.fillStyle = hair; x.beginPath(); smooth(x, [[-6.5, -.4], [-5.9, -5.6], [-1.5, -7.9], [3.4, -7.2], [5.4, -5.1], [2.6, -4.6], [.2, -4.0], [-1.1, -1.6], [-2.3, .9], [-3.4, 3.7], [-6.2, 3.2]], true); x.fill();
  x.beginPath(); x.arc(-6.6, -4.2, 2.8, 0, TAU); x.fill();
  x.lineCap = 'round';
  for (let i = 0; i < 4; i++) { x.lineWidth = 2.4 - i * .4; x.strokeStyle = hair; x.beginPath(); smooth(x, [[-7, -4.2 + i * .5], [-11, -2.5 + sway * .5 + i * .6], [-14.5, .8 + sway + i * .9], [-16 - i * .4, 4.5 + sway * 1.3 + i * 1.1]]); x.stroke(); }
  // headband
  x.strokeStyle = LO ? ink : k.band; x.lineWidth = 1.5; x.beginPath(); smooth(x, [[-5.4, -4.8], [-1, -6.1], [4.2, -5.6]]); x.stroke();
  // eye, brow, mouth, ear
  x.strokeStyle = ink; x.lineWidth = lw * .75; x.beginPath(); x.moveTo(3.2, -1.7); x.quadraticCurveTo(4, -2.3, 4.9, -1.8); x.stroke();
  x.lineWidth = lw * .6; x.beginPath(); x.moveTo(2.8, -3.3); x.quadraticCurveTo(4.1, -3.9, 5.3, -3.4); x.stroke();
  x.beginPath(); x.moveTo(5.4, 2.7); x.lineTo(6.2, 2.6); x.stroke();
  x.beginPath(); x.arc(-.6, .6, 1.4, -1.2, 1.5); x.stroke();
  x.restore();
  // near arm on top (with the ball between palm and fingers)
  if (opts.ballIn === 'N') {
    const A = B.armN, d = [A.w[0] - A.e[0], A.w[1] - A.e[1]], L = Math.hypot(...d) || 1, u = [d[0] / L, d[1] / L];
    const r = opts.ballR || 5.3, c = add(A.w, u, r * .95 + 1.5);
    drawArm(A, false);
    ball(x, c[0], c[1], r, opts.ballRot || 0, { lw: lw, ink, line: LO });
    // fingers over the ball
    x.strokeStyle = ink; x.fillStyle = LO ? '#efe4cc' : skin; x.lineWidth = lw * .8;
    const n = [-u[1], u[0]];
    for (const sgn of [1, -1]) { const f = [add(add(A.w, u, 2.6), n, 2.4 * sgn), add(add(c, n, r * .85 * sgn), u, -r * .2), add(add(c, n, r * .95 * sgn), u, r * .35)]; shape(limbPoly(f, [2.6, 2.3, 1.8]), LO ? null : skin, lw * .7); }
  } else drawArm(B.armN, false);
  x.restore();
  // world position of the near hand (for ball hand-off)
  const hw = B.armN.h, sx = opts.flip ? -s : s;
  return { hand: [cx + hw[0] * sx, cy + hw[1] * s], head: [cx + B.Hc[0] * sx, cy + B.Hc[1] * s] };
}
// where the ball centre sits when held in the near hand
export function ballInHand(cx, cy, h, pose, flip = false, r = 5.3) {
  const B = skeleton(pose), A = B.armN, s = h / 100, d = [A.w[0] - A.e[0], A.w[1] - A.e[1]], L = Math.hypot(...d) || 1, u = [d[0] / L, d[1] / L];
  const c = add(A.w, u, r * .95 + 1.5); return [cx + c[0] * (flip ? -s : s), cy + c[1] * s];
}
