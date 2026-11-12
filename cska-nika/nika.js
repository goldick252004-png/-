// Ника — талисман ЖГК ЦСКА. 2D rig after the club's costume photos:
// grey fur, white blaze, blue eyes with lashes, long black curly mane, open smile with a light lip rim,
// red→blue striped jersey with blue sleeves, blue scarf with red fringe, blue pleated skirt with a white stripe,
// dark grey gloves (yellow bracelet on the right wrist), grey furry legs, dark grey boots with fluffy cuffs.
// Origin = between the feet on the ground; y up is negative; ~520 units tall.
import { TAU, blob, ell, curve, poly, limb, dark, light, mix, rng, lerp, clamp, star } from './lib.js';

export const NK = {
  fur: '#9a9aa3', furD: '#7d7d88', muzzle: '#b4b4bc', blaze: '#f7f6f8', nostril: '#3b3842',
  mane: '#221d26', maneHi: '#4a4150', iris: '#2f6fe0', irisD: '#1b3f99', lash: '#1c1820',
  mouth: '#5a0f1e', tongue: '#e8506a', lip: '#ecebef', ear: '#8c8c96', earIn: '#6e6b78',
  red: '#e8263a', blue: '#2a3cd6', blueD: '#1d2a9e', skirt: '#2c40d8', white: '#ffffff',
  glove: '#5b5b63', bracelet: '#f2b51e', boot: '#5f5f67', cuff: '#c4c4cb', scarf: '#2638c8', scarfRed: '#e0203a'
};

// pose defaults; all angles in radians
export function pose(o = {}) {
  return Object.assign({
    x: 0, y: 0, s: 1, flip: 1, lean: 0, bob: 0, turn: 0, tilt: 0,
    armL: [0.25, 0.25], armR: [0.25, 0.25], handL: 'fist', handR: 'fist',
    legL: [0.05, 0], legR: [0.05, 0], liftL: 0, liftR: 0,
    mouth: 1, blink: 0, look: [0, 0], hat: 0, squash: 0, brows: 0, held: null
  }, o);
}

const C = NK;
// —— mane: clusters of curls ——
function curl(ctx, x, y, r, seed) {
  const R = rng(seed);
  blob(ctx, ell(x, y, r, r * 1.05), C.mane, { lw: 3, line: '#0e0b10', shade: false });
  ctx.strokeStyle = C.maneHi; ctx.lineWidth = Math.max(2, r * .16); ctx.lineCap = 'round';
  ctx.beginPath(); const a0 = R() * TAU;
  for (let i = 0; i <= 14; i++) { const a = a0 + i * .5, rr = r * (.75 - i * .045); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
}
function maneBack(ctx, p, t) {
  const R = rng(7), sway = Math.sin(t * 2.1) * 3;
  // big soft mass behind the head and down to the shoulders
  blob(ctx, curve([[-96, -170], [-118, -60], [-112, 30], [-84, 70], [-40, 40], [0, -10], [40, 40], [84, 70], [112, 30], [118, -60], [96, -170], [60, -222], [0, -240], [-60, -222]]), C.mane, { lw: 4, line: '#0e0b10', shade: false });
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1, k = (i >> 1) / 12;
    const x = side * (92 + Math.sin(k * 6) * 14 + R() * 10) + sway * k, y = -176 + k * 240;
    curl(ctx, x, y, 19 + R() * 8, 100 + i);
  }
}
function maneFront(ctx, p) {
  // locks framing the face and the curly bangs between the ears
  const R = rng(3);
  const pts = [[-60, -206], [-40, -224], [-18, -232], [18, -232], [40, -224], [60, -206], [-80, -184], [80, -184]];
  pts.forEach(([x, y], i) => curl(ctx, x + p.turn * 6, y, 16 + R() * 6, 300 + i));
}
function ear(ctx, side, p, t) {
  const tw = Math.sin(t * 3 + side) * .04;
  ctx.save(); ctx.translate(side * 46 + p.turn * 6, -222); ctx.rotate(side * (.42 + (p.earDrop || 0) * 1.25) + tw);
  blob(ctx, curve([[-17, 6], [-15, -24], [0, -58], [15, -24], [17, 6]], false), C.ear, { lw: 4 });
  blob(ctx, curve([[-8, 2], [-7, -20], [0, -42], [7, -20], [8, 2]], false), C.earIn, { lw: 0, shade: false });
  ctx.restore();
}
function eye(ctx, side, p) {
  const tx = p.turn * 16, far = (side * p.turn < 0) ? 1 - Math.abs(p.turn) * .18 : 1;
  const x = side * 37 + tx, y = -146, rx = 22 * far, ry = 26;
  const bl = clamp(p.blink);
  ctx.save(); ctx.translate(x, y); ctx.rotate(side * -.08);
  if (bl > .85) { // closed: a happy arc
    ctx.strokeStyle = C.lash; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 4, rx * .9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else {
    blob(ctx, ell(0, 0, rx, ry), '#ffffff', { lw: 4, line: '#2a2530', shade: false });
    ctx.save(); ctx.beginPath(); ell(0, 0, rx, ry)(ctx); ctx.clip();
    const lx = p.look[0] * 7, ly = p.look[1] * 6;
    blob(ctx, ell(lx + side * 2, ly + 3, 16 * far, 18), C.iris, { lw: 0, sd: [0, -6], shadeCol: C.irisD, shadeA: .9 });
    blob(ctx, ell(lx + side * 2, ly + 4, 8.5 * far, 10), '#0b0a14', { lw: 0, shade: false });
    blob(ctx, ell(lx + side * 2 - 5, ly - 4, 4.5, 5.5), '#ffffff', { lw: 0, shade: false });
    blob(ctx, ell(lx + side * 2 + 5, ly + 9, 2.2, 2.2), '#ffffff', { lw: 0, shade: false });
    // upper lid
    const lid = -ry + bl * ry * 2 + 6;
    ctx.fillStyle = C.fur; ctx.fillRect(-rx - 2, -ry - 4, rx * 2 + 4, lid + ry + 4 - 6 + 4 * (1 - bl));
    ctx.restore();
    ctx.strokeStyle = '#2a2530'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  }
  // lashes on the outer upper corner
  ctx.strokeStyle = C.lash; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + side * (.55 + i * .32), bx = Math.cos(a) * rx * .98, by = Math.sin(a) * ry * .98 + (bl > .85 ? 10 : 0);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + side * 8, by - 6, bx + side * 14, by - 8 - i * 2); ctx.stroke();
  }
  ctx.restore();
  // brow tuft (expressive)
  if (p.brows) {
    ctx.strokeStyle = dark(C.fur, .4); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 36 - p.brows * 6 + side * p.brows * 3); ctx.quadraticCurveTo(x, y - 42 - p.brows * 8, x + 14, y - 36 - p.brows * 6 - side * p.brows * 3); ctx.stroke();
  }
}
function head(ctx, p, t) {
  const tm = p.turn * 12;
  ear(ctx, -1, p, t); ear(ctx, 1, p, t);
  // skull + long face as one rounded silhouette
  const face = curve([[-64, -180], [-70, -142], [-60, -106], [-62 + tm * .5, -66], [-66 + tm, -26], [-44 + tm, 8], [44 + tm, 8], [66 + tm, -26], [62 + tm * .5, -66], [60, -106], [70, -142], [64, -180], [44, -222], [0, -236], [-44, -222]]);
  blob(ctx, face, C.fur, { lw: 5, sd: [-8 - p.turn * 6, -10], hi: .25 });
  // soft lighter muzzle
  blob(ctx, ell(tm, -38, 60, 44), C.muzzle, { lw: 0, sd: [-6, -8], shadeA: .35 });
  // white blaze from the forehead down the nose
  blob(ctx, curve([[-22 + tm * .4, -226], [22 + tm * .4, -226], [11 + tm * .6, -176], [7 + tm * .8, -120], [0 + tm, -98], [-7 + tm * .8, -120], [-11 + tm * .6, -176]]), C.blaze, { lw: 0, shade: false });
  maneFront(ctx, p);
  eye(ctx, -1, p); eye(ctx, 1, p);
  // nostrils
  for (const s of [-1, 1]) blob(ctx, ell(s * 27 + tm, -62, 7, 10, s * .5), C.nostril, { lw: 0, shade: false });
  // open smile with the costume's light lip rim
  const m = clamp(p.mouth), mx = tm;
  if (p.mouth < 0) { // sad
    ctx.strokeStyle = C.mouth; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mx - 30, -24); ctx.quadraticCurveTo(mx, -44 + p.mouth * 6, mx + 30, -24); ctx.stroke();
  } else if (m < .08) {
    ctx.strokeStyle = C.mouth; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(mx - 40, -36); ctx.quadraticCurveTo(mx, -12, mx + 40, -36); ctx.stroke();
  } else {
    const top = -40, bot = -40 + 12 + 34 * m, w = 46 + 6 * m;
    const mp = curve([[mx - w, top - 4], [mx - w * .5, top + 4], [mx, top + 5], [mx + w * .5, top + 4], [mx + w, top - 4], [mx + w * .6, (top + bot) / 2 + 8], [mx, bot], [mx - w * .6, (top + bot) / 2 + 8]]);
    blob(ctx, mp, C.lip, { lw: 0, shade: false });
    ctx.save(); ctx.translate(mx, top + 3); ctx.scale(.84, .8); ctx.translate(-mx, -top - 3);
    blob(ctx, mp, C.mouth, { lw: 0, shade: false });
    ctx.save(); ctx.beginPath(); mp(ctx); ctx.clip();
    blob(ctx, ell(mx, bot + 2, w * .5, 20 * m + 6), C.tongue, { lw: 0, shade: false });
    ctx.restore(); ctx.restore();
    ctx.beginPath(); mp(ctx); ctx.strokeStyle = dark(C.fur, .5); ctx.lineWidth = 3; ctx.stroke();
  }
  // cheeks
  ctx.fillStyle = 'rgba(255,120,150,.18)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 50 + tm, -100, 13, 8, 0, 0, TAU); ctx.fill(); }
  if (p.hat) hat(ctx, p, t);
}
function hat(ctx, p, t) {
  // knitted hat in club colours, ears poke through
  const k = p.hat; ctx.save(); ctx.globalAlpha = clamp(k * 3);
  ctx.translate(p.turn * 6, -34 - (1 - k) * 60);
  blob(ctx, curve([[-84, -170], [-70, -222], [-30, -246], [30, -246], [70, -222], [84, -170]], false), C.red, { lw: 5 });
  blob(ctx, poly([[-88, -186], [88, -186], [86, -160], [-86, -160]]), C.blue, { lw: 4, shade: false });
  ctx.fillStyle = '#fff'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); star(ctx, i * 24, -173, 6.5); ctx.fill(); }
  blob(ctx, ell(0, -250 + Math.sin(t * 4) * 2, 18, 17), '#ffffff', { lw: 4, line: '#b9b9c6' });
  ctx.restore();
}
// —— body ——
function jersey(ctx, p) {
  const shape = curve([[-64, -264], [-24, -272], [24, -272], [64, -264], [66, -224], [56, -188], [52, -146], [-52, -146], [-56, -188], [-66, -224]]);
  ctx.save(); ctx.beginPath(); shape(ctx); ctx.clip();
  ctx.fillStyle = C.blue; ctx.fillRect(-90, -290, 180, 160);
  // red pin-stripes that thin out downwards (red top → blue bottom)
  for (let y = -276; y < -140; y += 8) { const k = (y + 276) / 136, h = 7 * (1 - k) ** 1.4; if (h > .4) { ctx.fillStyle = C.red; ctx.fillRect(-90, y, 180, h); } }
  ctx.restore();
  blob(ctx, shape, 'rgba(0,0,0,0)', { lw: 5, line: '#1a1a52', sd: [-10, -6], shadeCol: '#140f3a', shadeA: .35 });
  // collar
  blob(ctx, curve([[-28, -270], [0, -246], [28, -270]], false), C.blue, { lw: 4, shade: false, line: '#1a1a52' });
}
function scarf(ctx, p, t) {
  const sw = Math.sin(t * 2.4) * 4 + p.lean * 40;
  blob(ctx, curve([[-60, -268], [-30, -252], [30, -252], [60, -268], [52, -286], [0, -276], [-52, -286]]), C.scarf, { lw: 4, line: '#141c6a' });
  // hanging end
  const end = curve([[-20, -262], [6, -262], [10 + sw * .4, -210], [12 + sw, -164], [-16 + sw, -164], [-18 + sw * .4, -210]]);
  blob(ctx, end, C.scarf, { lw: 4, line: '#141c6a' });
  ctx.fillStyle = '#ffffff'; for (const y of [-238, -206]) { ctx.beginPath(); star(ctx, -4 + sw * (y + 262) / 100 * .6, y, 7); ctx.fill(); }
  blob(ctx, poly([[-17 + sw, -180], [12 + sw, -180], [12 + sw, -164], [-16 + sw, -164]]), C.scarfRed, { lw: 0, shade: false });
  ctx.strokeStyle = C.scarfRed; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const x = -14 + sw + i * 5; ctx.beginPath(); ctx.moveTo(x, -164); ctx.lineTo(x + sw * .08, -150 + (i % 2) * 3); ctx.stroke(); }
}
function skirt(ctx, p, t) {
  const fl = Math.sin(t * 3) * 2 + p.lean * 20;
  const sk = curve([[-52, -150], [52, -150], [74 + fl, -88], [40 + fl, -80], [0 + fl, -84], [-40 + fl, -80], [-74 + fl, -88]]);
  blob(ctx, sk, C.skirt, { lw: 5, line: '#141c6a', sd: [-12, 0] });
  ctx.save(); ctx.beginPath(); sk(ctx); ctx.clip();
  ctx.strokeStyle = 'rgba(10,15,80,.35)'; ctx.lineWidth = 3;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 14, -148); ctx.lineTo(i * 22 + fl, -80); ctx.stroke(); }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-80 + fl, -100); ctx.quadraticCurveTo(fl, -94, 80 + fl, -100); ctx.stroke();
  ctx.restore();
}
function leg(ctx, side, p) {
  const [a1, a2] = side < 0 ? p.legL : p.legR, lift = side < 0 ? p.liftL : p.liftR;
  const hx = side * 26, hy = -112, L = 52;
  const kx = hx + side * Math.sin(a1) * L, ky = hy + Math.cos(a1) * L - lift * .5;
  const fx = kx + side * Math.sin(a1 + a2) * L, fy = ky + Math.cos(a1 + a2) * L - lift;
  limb(ctx, [[hx, hy], [kx, ky], [fx, fy - 10]], 34, C.fur, '#5c5c68');
  // fluffy cuff + boot
  for (let i = -2; i <= 2; i++) blob(ctx, ell(fx + i * 9, fy - 18 + Math.abs(i) * 2, 10, 9), C.cuff, { lw: 3, line: '#8e8e9c', shade: false });
  blob(ctx, curve([[fx - 26 + side * 4, fy + 2], [fx - 22, fy - 16], [fx + 22, fy - 16], [fx + 28 + side * 4, fy + 2], [fx + 10, fy + 10], [fx - 14, fy + 10]]), C.boot, { lw: 4, line: '#2f2f36' });
}
function hand(ctx, x, y, a, kind, side) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  if (kind === 'open') {
    for (let i = 0; i < 4; i++) { const fa = (-.66 + i * .44) * side; blob(ctx, ell(-Math.sin(fa) * 33, Math.cos(fa) * 33 + 6, 9, 15, -fa), C.glove, { lw: 3.5, line: '#bfbfca', shade: false }); }
    blob(ctx, ell(-side * 20, 14, 7, 12, side * 1.1), C.glove, { lw: 3.5, line: '#bfbfca', shade: false });
    blob(ctx, ell(0, 12, 17, 16), C.glove, { lw: 0, sd: [-4, -5] });
  } else blob(ctx, ell(0, 8, 19, 19), C.glove, { lw: 3.5, line: '#2c2c33', sd: [-4, -5] });
  ctx.restore();
}
function arm(ctx, side, p) {
  const [a1, a2] = side < 0 ? p.armL : p.armR;
  const sx = side * 58, sy = -250, L1 = 62, L2 = 56;
  const ex = sx + side * Math.sin(a1) * L1, ey = sy + Math.cos(a1) * L1;
  const hx = ex + side * Math.sin(a1 + a2) * L2, hy = ey + Math.cos(a1 + a2) * L2;
  limb(ctx, [[sx, sy], [ex, ey], [hx, hy]], 28, C.fur, '#5c5c68');
  // sleeve: blue with a red trim
  const mx = lerp(sx, ex, .55), my = lerp(sy, ey, .55);
  limb(ctx, [[sx - side * 4, sy - 4], [mx, my]], 34, C.blue, '#1a1a52');
  ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.lineCap = 'butt';
  const dx = ex - sx, dy = ey - sy, n = Math.hypot(dx, dy), nx = -dy / n, ny = dx / n;
  ctx.beginPath(); ctx.moveTo(mx + nx * 17, my + ny * 17); ctx.lineTo(mx - nx * 17, my - ny * 17); ctx.stroke();
  const ang = Math.atan2(hx - ex, hy - ey);
  if (side > 0) { // yellow bracelet on the right wrist
    ctx.strokeStyle = C.bracelet; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const bx = lerp(ex, hx, .8), by = lerp(ey, hy, .8), ux = (hx - ex) / L2, uy = (hy - ey) / L2;
    ctx.beginPath(); ctx.moveTo(bx - uy * 15, by + ux * 15); ctx.lineTo(bx + uy * 15, by - ux * 15); ctx.stroke();
  }
  hand(ctx, hx, hy, -ang * (side > 0 ? 1 : 1) , side < 0 ? p.handL : p.handR, side);
  return [hx, hy];
}
export function hands(p) { // world positions of both hands (for holding things)
  const out = [];
  for (const side of [-1, 1]) {
    const [a1, a2] = side < 0 ? p.armL : p.armR; const sx = side * 58, sy = -250;
    const ex = sx + side * Math.sin(a1) * 62, ey = sy + Math.cos(a1) * 62;
    const hx = ex + side * Math.sin(a1 + a2) * 56, hy = ey + Math.cos(a1 + a2) * 56;
    const c = Math.cos(p.lean), sn = Math.sin(p.lean), y0 = hy + 10;
    out.push(local2world(p, hx * c - y0 * sn, hx * sn + y0 * c - p.bob));
  }
  return out;
}
function local2world(p, x, y) { return [p.x + x * p.s * p.flip, p.y + y * p.s]; }

export function drawNika(ctx, p, t = 0) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s * p.flip, p.s);
  // ground shadow
  ctx.fillStyle = 'rgba(20,20,60,.18)'; ctx.beginPath(); ctx.ellipse(0, 4, 82, 13, 0, 0, TAU); ctx.fill();
  const sq = p.squash; ctx.scale(1 + sq * .08, 1 - sq * .08);
  leg(ctx, -1, p); leg(ctx, 1, p);
  ctx.translate(0, -p.bob); ctx.rotate(p.lean);
  ctx.save(); ctx.translate(0, -290); ctx.rotate(p.tilt); maneBack(ctx, p, t); ctx.restore();
  arm(ctx, -1, p);
  skirt(ctx, p, t); jersey(ctx, p); scarf(ctx, p, t);
  ctx.save(); ctx.translate(0, -290); ctx.rotate(p.tilt); head(ctx, p, t); ctx.restore();
  arm(ctx, 1, p);
  if (p.held) p.held(ctx);
  ctx.restore();
}
