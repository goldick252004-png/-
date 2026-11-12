// Cut-paper art for «ЦСКА · С Новым годом!»: the three players, the fir tree and its star, props, the 2026→2027 board, fireworks, banner
import { mulberry, TAU, clamp, lerp } from './lib.js';
import { cv, finishCut, sh, blob, smoothClosed, smoothOpen, crescent, INK, rr } from './paper.js';

export const PPM = 5200;               // pixels per metre for static props
const LW = 9, LW2 = 5;
export const RED = '#e8243c', RED_S = '#b9142c', BLUE = '#1f3f9a', BLUE_S = '#152c70', GOLD = '#ffcf3f', GOLD_S = '#e0a81f';
const SNOW = '#f7f9ff', SNOW_S = '#c9d6ee';

export function cut(wm, hm, draw, o = {}) {
  const pad = o.pad ?? 30, w = Math.ceil(wm * PPM) + pad * 2, h = Math.ceil(hm * PPM) + pad * 2;
  const c = cv(w, h), x = c.getContext('2d'); x.translate(pad, pad);
  draw(x, w - pad * 2, h - pad * 2);
  const out = o.raw ? c : finishCut(c, o.border ?? 14, o);
  return { c: out, w: w / PPM, h: h / PPM, ax: o.ax ?? .5, ay: o.ay ?? 1 - pad / h, pad };
}

// ===================== The players =====================
export const PL_W = 640, PL_H = 940, PL_FOOT = 880;
const SKIN = '#ffdcb8', SKIN_S = '#f0bf92';
export const HAIRS = [['#4a2a1e', '#2f1a12'], ['#9a5a2c', '#74401c'], ['#e2b25a', '#c48f36']];
function eye(x, ex, ey, p) {
  const { eyes = 'open', look = [0, 0] } = p;
  x.strokeStyle = INK; x.lineCap = 'round';
  if (eyes === 'happy') { x.beginPath(); x.moveTo(ex - 22, ey + 6); x.quadraticCurveTo(ex, ey - 30, ex + 22, ey + 6); x.lineWidth = 10; x.stroke(); return; }
  if (eyes === 'closed') { x.beginPath(); x.moveTo(ex - 20, ey + 2); x.quadraticCurveTo(ex, ey + 14, ex + 20, ey + 2); x.lineWidth = 9; x.stroke(); return; }
  const k = eyes === 'wide' ? 1.15 : 1, rx = 21 * k, ry = 38 * k;
  x.beginPath(); x.ellipse(ex + look[0] * 8, ey + look[1] * 10, rx, ry, 0, 0, TAU); x.fillStyle = INK; x.fill();
  x.beginPath(); x.ellipse(ex + look[0] * 8 - 6, ey + look[1] * 10 - ry * .42, 7 * k, 11 * k, -.2, 0, TAU); x.fillStyle = '#fff'; x.fill();
  x.beginPath(); x.ellipse(ex + look[0] * 8 + 6, ey + look[1] * 10 + ry * .45, 3.5, 5, 0, 0, TAU); x.fill();
}
function arm(x, sx, sy, ang, side) {
  x.save(); x.translate(sx, sy); x.rotate(ang * side);
  rr(x, -20, -14, 40, 92, 18); sh(x, RED, LW2 + 1);                 // sleeve
  rr(x, -16, 70, 32, 70, 15); sh(x, SKIN, LW2 + 1);                 // forearm
  x.beginPath(); x.arc(0, 146, 24, 0, TAU); sh(x, SKIN, LW2 + 1);   // hand
  x.restore();
}
export function handPos(p, side) {   // hand centre in canvas px (for the ball), side −1 = left of picture, +1 = right
  const sx = side < 0 ? 228 : 412, sy = 520 + (p.crouch || 0) * 30, a = (side < 0 ? p.armL : p.armR) ?? .3;
  const s = side < 0 ? 1 : -1, ang = a * s;
  return [sx - Math.sin(ang) * 146, sy + Math.cos(ang) * 146];
}
// p: {armL, armR (0 = down, π = up), legs (0 stand … 1 jump spread), crouch 0..1, eyes, mouth, look, hair (0..2), tail (−1/1)}
export function drawPlayer(x, p = {}) {
  const { armL = .3, armR = .3, legs = 0, crouch = 0, mouth = 'smile', hair = 0, tail = 1 } = p;
  x.clearRect(0, 0, PL_W, PL_H);
  const C = cv(PL_W, PL_H), a = C.getContext('2d'), [HC, HS] = HAIRS[hair % 3];
  const cy = crouch * 30;
  // legs + socks + shoes
  for (const s of [-1, 1]) {
    a.save(); a.translate(320 + s * 42, 700 + cy); a.rotate(s * legs * .45);
    rr(a, -24, -10, 48, 150 - cy, 20); sh(a, SKIN, LW2 + 1);
    rr(a, -25, 92 - cy, 50, 60, 16); sh(a, '#ffffff', LW2 + 1);
    blob(a, s * 12, 160 - cy, 46, 26, .03, 3 + s); sh(a, BLUE, LW2 + 2);
    a.beginPath(); a.moveTo(s * 12 - 30, 156 - cy); a.lineTo(s * 12 + 30, 156 - cy); a.lineWidth = 5; a.strokeStyle = '#fff'; a.stroke();
    a.restore();
  }
  // shorts
  const shorts = () => { a.beginPath(); a.moveTo(240, 640 + cy); a.lineTo(400, 640 + cy); a.quadraticCurveTo(418, 700 + cy, 412, 742 + cy); a.lineTo(330, 742 + cy); a.lineTo(320, 712 + cy); a.lineTo(310, 742 + cy); a.lineTo(228, 742 + cy); a.quadraticCurveTo(222, 700 + cy, 240, 640 + cy); a.closePath(); };
  crescent(a, shorts, BLUE_S, 18, 0, BLUE); shorts(); sh(a, null, LW);
  // ponytail (behind the head, to one side)
  const tx = 320 + tail * 150;
  a.beginPath(); a.moveTo(320 + tail * 90, 250); a.bezierCurveTo(tx + tail * 70, 260, tx + tail * 60, 420, tx + tail * 10, 470); a.bezierCurveTo(tx - tail * 20, 420, tx - tail * 10, 330, 320 + tail * 70, 300); a.closePath(); sh(a, HC, LW);
  // jersey: red with blue side panels and a white collar
  const shirt = () => { a.beginPath(); a.moveTo(232, 480 + cy); a.quadraticCurveTo(320, 455 + cy, 408, 480 + cy); a.lineTo(420, 652 + cy); a.quadraticCurveTo(320, 668 + cy, 220, 652 + cy); a.closePath(); };
  crescent(a, shirt, RED_S, 22, 0, RED); a.save(); shirt(); a.clip();
  a.fillStyle = BLUE; a.fillRect(212, 470 + cy, 30, 200); a.fillRect(398, 470 + cy, 30, 200);
  a.fillStyle = '#fff'; a.fillRect(212, 600 + cy, 220, 10); a.restore(); shirt(); sh(a, null, LW);
  a.beginPath(); a.moveTo(288, 470 + cy); a.lineTo(320, 512 + cy); a.lineTo(352, 470 + cy); a.lineWidth = 12; a.strokeStyle = '#fff'; a.lineCap = 'round'; a.stroke();
  // arms
  arm(a, 228, 520 + cy, armL, 1); arm(a, 412, 520 + cy, -armR, 1);
  // head
  const head = () => { a.beginPath(); a.ellipse(320, 330 + cy, 158, 148, 0, 0, TAU); };
  crescent(a, head, SKIN_S, 26, 20, SKIN); head(); sh(a, null, LW + 1);
  // hair cap + fringe + tie
  const cap = () => { a.beginPath(); a.moveTo(166, 330 + cy); a.bezierCurveTo(160, 220 + cy, 230, 168 + cy, 320, 168 + cy); a.bezierCurveTo(412, 168 + cy, 482, 222 + cy, 476, 330 + cy); a.bezierCurveTo(440, 280 + cy, 400, 262 + cy, 360, 270 + cy); a.quadraticCurveTo(340, 300 + cy, 300, 262 + cy); a.quadraticCurveTo(250, 270 + cy, 230, 300 + cy); a.quadraticCurveTo(200, 300 + cy, 166, 330 + cy); a.closePath(); };
  crescent(a, cap, HS, 20, 16, HC); cap(); sh(a, null, LW);
  a.beginPath(); a.ellipse(320 + tail * 110, 230 + cy, 26, 18, tail * .6, 0, TAU); sh(a, RED, LW2);
  // face
  a.beginPath(); a.ellipse(232, 392 + cy, 30, 18, 0, 0, TAU); a.fillStyle = 'rgba(255,120,120,.45)'; a.fill();
  a.beginPath(); a.ellipse(408, 392 + cy, 30, 18, 0, 0, TAU); a.fill();
  eye(a, 268, 340 + cy, p); eye(a, 372, 340 + cy, p);
  const mx = 320, my = 410 + cy; a.lineCap = 'round'; a.strokeStyle = INK;
  if (mouth === 'smile') { a.beginPath(); a.moveTo(mx - 28, my - 4); a.quadraticCurveTo(mx, my + 24, mx + 28, my - 4); a.lineWidth = 8; a.stroke(); }
  else if (mouth === 'open') { a.beginPath(); a.moveTo(mx - 34, my - 8); a.quadraticCurveTo(mx, my + 60, mx + 34, my - 8); a.closePath(); sh(a, '#8a2a2a', 7); a.save(); a.clip(); a.beginPath(); a.ellipse(mx, my + 34, 20, 14, 0, 0, TAU); a.fillStyle = '#ef6f6f'; a.fill(); a.restore(); }
  else if (mouth === 'o') { a.beginPath(); a.ellipse(mx, my + 6, 13, 17, 0, 0, TAU); sh(a, '#8a2a2a', 6); }
  x.drawImage(finishCut(C, 16, { grainA: .7 }), 0, 0);
}

// ===================== The ball =====================
export function ballArt(rm = .0034) {
  return cut(rm * 2, rm * 2, (x, W, H) => {
    const r = W / 2, cx = W / 2, cy = H / 2;
    x.beginPath(); x.arc(cx, cy, r * .96, 0, TAU); sh(x, '#ffffff', LW2 + 1);
    const pent = (px, py, s, a0) => { x.beginPath(); for (let i = 0; i < 5; i++) { const a = a0 + i * TAU / 5; x.lineTo(px + Math.cos(a) * s, py + Math.sin(a) * s); } x.closePath(); };
    pent(cx + r * .05, cy - r * .05, r * .32, -Math.PI / 2); sh(x, BLUE, LW2 - 1);
    x.save(); x.beginPath(); x.arc(cx, cy, r * .94, 0, TAU); x.clip();
    pent(cx + r * .9, cy + r * .2, r * .32, Math.PI / 2); sh(x, RED, LW2 - 1);
    pent(cx - r * .75, cy + r * .6, r * .32, 0); sh(x, RED, LW2 - 1);
    x.strokeStyle = INK; x.lineWidth = LW2 - 1;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * .34, cy + Math.sin(a) * r * .34); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); }
    x.restore();
  }, { ay: .5, border: 8, pad: 16 });
}

// ===================== Winter set =====================
export function snowHill(wm, hm, seed, col = SNOW, shade = SNOW_S) {
  return cut(wm, hm, (x, W, H) => {
    const R = mulberry(seed), n = 3, pts = [];
    for (let i = 0; i <= n * 2; i++) pts.push([i / (n * 2) * W, H * (i % 2 ? .1 + R() * .25 : .4 + R() * .35) + (i === 0 || i === n * 2 ? H * .3 : 0)]);
    const path = () => { x.beginPath(); x.moveTo(0, H + 40); x.lineTo(pts[0][0], pts[0][1]); smoothOpen(x, pts, false); x.lineTo(W, H + 40); x.closePath(); };
    crescent(x, path, shade, 40, 30, col); path(); sh(x, null, LW);
    for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(W * (.08 + R() * .84), H * (.5 + R() * .4), 5 + R() * 5, 0, TAU); x.fillStyle = '#ffffff'; x.fill(); }
  });
}
export function snowPine(hm, seed, col = '#2f8a57', shade = '#226a42') {
  return cut(hm * .55, hm, (x, W, H) => {
    rr(x, W / 2 - 16, H * .8, 32, H * .2, 6); sh(x, '#7d5230', LW2 + 1);
    for (let k = 0; k < 3; k++) {
      const top = H * (.02 + k * .24), bot = H * (.42 + k * .2), hw = W * (.24 + k * .13);
      const p = () => { x.beginPath(); x.moveTo(W / 2, top); x.quadraticCurveTo(W / 2 + hw * .5, (top + bot) / 2, W / 2 + hw, bot); x.quadraticCurveTo(W / 2, bot + 24, W / 2 - hw, bot); x.quadraticCurveTo(W / 2 - hw * .5, (top + bot) / 2, W / 2, top); x.closePath(); };
      crescent(x, p, shade, 24, 0, col); p(); sh(x, null, LW);
      // snow along the hem of each tier: a wavy white band with drips
      x.beginPath(); x.moveTo(W / 2 - hw, bot);
      for (let j = 0; j <= 10; j++) { const u = j / 10, px = W / 2 - hw + u * 2 * hw, py = bot + 22 * Math.sin(u * Math.PI) - (j % 2 ? 26 : 12); x.lineTo(px, py); }
      x.quadraticCurveTo(W / 2, bot + 30, W / 2 - hw, bot); x.closePath(); sh(x, SNOW, LW2);
      x.beginPath(); x.ellipse(W / 2 - hw * .1, top + 34, 26, 14, 0, 0, TAU); sh(x, SNOW, LW2 - 1);
    }
  });
}
// The big fir: tall, with a bare tip (the star comes later)
export function bigTree(hm) { return snowPine(hm, 7, '#2a9a5a', '#1d7444'); }
// Garland layer for the tree (lies just in front of it): looping ribbons with red/blue/gold baubles
export const BAUBLES = [];
export function garland(hm) {
  BAUBLES.length = 0;
  return cut(hm * .55, hm, (x, W, H) => {
    const R = mulberry(41), cols = [RED, BLUE, GOLD];
    for (let k = 0; k < 3; k++) {
      const yb = H * (.36 + k * .2), hw = W * (.2 + k * .12);
      x.beginPath(); x.moveTo(W / 2 - hw, yb - 30); x.quadraticCurveTo(W / 2, yb + 30, W / 2 + hw, yb - 50); x.lineWidth = 12; x.strokeStyle = GOLD; x.lineCap = 'round'; x.stroke(); x.lineWidth = 4; x.strokeStyle = GOLD_S; x.stroke();
      for (let i = 0; i < 3 + k; i++) {
        const u = (i + .5) / (3 + k), bx = W / 2 - hw + u * 2 * hw, by = yb - 30 + (1 - Math.pow(2 * u - 1, 2)) * 26 - u * 20 + 26;
        x.beginPath(); x.arc(bx, by, 22 + k * 3, 0, TAU); const c = cols[(i + k) % 3]; sh(x, c, LW2);
        x.beginPath(); x.ellipse(bx - 7, by - 8, 7, 5, -.5, 0, TAU); x.fillStyle = 'rgba(255,255,255,.6)'; x.fill();
        BAUBLES.push([bx / W, by / H, c]);
      }
    }
  });
}
// Red five-pointed star (from the club's colours, drawn as a paper star with a gold rim and bevel)
export function bigStar(rm) {
  return cut(rm * 2, rm * 2, (x, W, H) => {
    const cx = W / 2, cy = H / 2 + H * .03, R1 = W * .48, R2 = R1 * .42;
    const p = (r1, r2) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); };
    p(R1, R2); sh(x, GOLD, LW);
    p(R1 * .82, R2 * .82); x.fillStyle = RED; x.fill();
    // bevel: alternate darker half-rays
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5, b = a + Math.PI / 5; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R1 * .82, cy + Math.sin(a) * R1 * .82); x.lineTo(cx + Math.cos(b) * R2 * .82, cy + Math.sin(b) * R2 * .82); x.closePath(); x.fillStyle = RED_S; x.fill(); }
    p(R1 * .82, R2 * .82); x.lineWidth = LW2; x.strokeStyle = INK; x.stroke();
  }, { ay: .5, border: 12 });
}
export function goal(wm) {
  const hm = wm * .66;
  return cut(wm, hm, (x, W, H) => {
    x.strokeStyle = 'rgba(58,42,36,.55)'; x.lineWidth = 3;
    for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(W * i / 10, 20); x.lineTo(W * i / 10, H); x.stroke(); }
    for (let i = 1; i < 7; i++) { x.beginPath(); x.moveTo(20, H * i / 7); x.lineTo(W - 20, H * i / 7); x.stroke(); }
    const post = (x0, y0, x1, y1) => { const n = 8; for (let i = 0; i < n; i++) { x.beginPath(); x.moveTo(lerp(x0, x1, i / n), lerp(y0, y1, i / n)); x.lineTo(lerp(x0, x1, (i + 1) / n), lerp(y0, y1, (i + 1) / n)); x.lineWidth = 30; x.strokeStyle = i % 2 ? '#ffffff' : RED; x.lineCap = 'butt'; x.stroke(); } };
    x.save(); x.lineJoin = 'round';
    x.beginPath(); x.moveTo(16, H); x.lineTo(16, 16); x.lineTo(W - 16, 16); x.lineTo(W - 16, H); x.lineWidth = 30 + LW * 2; x.strokeStyle = INK; x.stroke(); x.restore();
    post(16, H, 16, 16); post(16, 16, W - 16, 16); post(W - 16, 16, W - 16, H);
    // snow cap on the crossbar
    x.beginPath(); x.moveTo(0, 14); x.quadraticCurveTo(W * .25, -26, W * .5, 6); x.quadraticCurveTo(W * .75, -22, W, 12); x.quadraticCurveTo(W * .5, 34, 0, 14); x.closePath(); sh(x, SNOW, LW2);
  });
}
export function snowman(hm) {
  return cut(hm * .7, hm, (x, W, H) => {
    const b = (cy, r, s) => { const pth = () => blob(x, W / 2, cy, r, r * .92, .03, s); crescent(x, pth, SNOW_S, 16, 12, SNOW); pth(); sh(x, null, LW); };
    b(H * .74, W * .42, 1); b(H * .45, W * .32, 2); b(H * .2, W * .23, 3);
    // scarf in club colours
    rr(x, W * .22, H * .3, W * .56, H * .07, 12); sh(x, RED, LW2); x.fillStyle = BLUE; x.fillRect(W * .44, H * .3 + 4, W * .1, H * .07 - 8);
    rr(x, W * .58, H * .32, W * .1, H * .2, 10); sh(x, RED, LW2);
    for (const [ex, ey] of [[.43, .17], [.57, .17]]) { x.beginPath(); x.arc(W * ex, H * ey, 9, 0, TAU); x.fillStyle = INK; x.fill(); }
    x.beginPath(); x.moveTo(W * .5, H * .2); x.lineTo(W * .74, H * .23); x.lineTo(W * .5, H * .25); x.closePath(); sh(x, '#f08a2e', LW2 - 1);
    for (const ey of [.4, .48]) { x.beginPath(); x.arc(W / 2, H * ey, 8, 0, TAU); x.fillStyle = INK; x.fill(); }
  });
}
export function house(wm, seed) {
  return cut(wm, wm * .9, (x, W, H) => {
    rr(x, W * .12, H * .42, W * .76, H * .58, 6); sh(x, ['#d9b48a', '#c9876a', '#9fb3c9'][seed % 3], LW);
    x.beginPath(); x.moveTo(0, H * .46); x.lineTo(W / 2, H * .04); x.lineTo(W, H * .46); x.closePath(); sh(x, SNOW, LW);
    rr(x, W * .38, H * .56, W * .24, H * .2, 4); sh(x, '#ffd56a', LW2);
  });
}

// ===================== Spread 2: the year board, fireworks, banner =====================
export function boardFrame(wm, hm) {
  return cut(wm, hm, (x, W, H) => {
    rr(x, 0, 0, W, H, 40); sh(x, BLUE, LW);
    rr(x, 26, 26, W - 52, H - 52, 28); sh(x, BLUE_S, LW2);
    x.fillStyle = GOLD; for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(40 + i * (W - 80) / 13, 14, 8, 0, TAU); x.fill(); x.beginPath(); x.arc(40 + i * (W - 80) / 13, H - 14, 8, 0, TAU); x.fill(); }
  }, { border: 14 });
}
// One digit slat (raw canvas, mapped onto a plane): cream card, big digit; flipV draws it upside down (for the back side)
export function digitCanvas(d, flipV = false) {
  const c = cv(360, 520), x = c.getContext('2d');
  rr(x, 8, 8, 344, 504, 30); sh(x, '#fffaf0', 10);
  x.save(); if (flipV) { x.translate(0, 520); x.scale(1, -1); }
  x.fillStyle = RED; x.font = '900 420px Nunito'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(d, 180, 282);
  x.restore();
  x.strokeStyle = 'rgba(58,42,36,.35)'; x.lineWidth = 6; x.beginPath(); x.moveTo(20, 260); x.lineTo(340, 260); x.stroke();
  return c;
}
export function burst(rm, col, col2, seed) {
  return cut(rm * 2, rm * 2, (x, W, H) => {
    const R = mulberry(seed), cx = W / 2, cy = H / 2, n = 14;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + R() * .1, L = W * (.36 + R() * .12), w = 26;
      x.save(); x.translate(cx, cy); x.rotate(a);
      x.beginPath(); x.moveTo(W * .08, -w / 2); x.lineTo(L, -w * .2); x.arc(L, 0, w * .2, -Math.PI / 2, Math.PI / 2); x.lineTo(W * .08, w / 2); x.closePath(); sh(x, i % 2 ? col : col2, LW2);
      x.beginPath(); x.arc(L + 30, 0, 14, 0, TAU); sh(x, i % 3 ? GOLD : '#ffffff', 4);
      x.restore();
    }
    x.beginPath(); x.arc(cx, cy, W * .09, 0, TAU); sh(x, '#fff3c4', LW2);
  }, { ay: .5, border: 12 });
}
export function banner(wm, text) {
  const hm = wm * .26;
  return cut(wm, hm, (x, W, H) => {
    // ribbon tails
    for (const s of [-1, 1]) { const ex = s < 0 ? 0 : W; x.beginPath(); x.moveTo(W / 2 + s * W * .38, H * .3); x.lineTo(ex, H * .38); x.lineTo(ex - s * 50, H * .62); x.lineTo(ex, H * .86); x.lineTo(W / 2 + s * W * .38, H * .8); x.closePath(); sh(x, RED_S, LW); }
    const b = () => { x.beginPath(); x.moveTo(W * .1, H * .08); x.quadraticCurveTo(W / 2, H * .2, W * .9, H * .08); x.lineTo(W * .9, H * .74); x.quadraticCurveTo(W / 2, H * .86, W * .1, H * .74); x.closePath(); };
    crescent(x, b, RED_S, 0, 18, RED); b(); sh(x, null, LW);
    x.font = '900 150px Nunito'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = 150; while (x.measureText(text).width > W * .72 && fs > 40) { fs -= 6; x.font = `900 ${fs}px Nunito`; }
    x.lineWidth = 16; x.strokeStyle = INK; x.lineJoin = 'round'; x.strokeText(text, W / 2, H * .44); x.fillStyle = GOLD; x.fillText(text, W / 2, H * .44);
  }, { ay: 0, border: 14 });
}
export function pullTab(wm) {
  return cut(wm, wm * .45, (x, W, H) => {
    rr(x, 0, H * .2, W * .8, H * .6, 20); sh(x, GOLD, LW);
    x.beginPath(); x.moveTo(W * .78, H * .02); x.lineTo(W, H * .5); x.lineTo(W * .78, H * .98); x.closePath(); sh(x, GOLD, LW);
    x.font = '900 70px Nunito'; x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ТЯНИ', W * .42, H * .52);
  }, { ay: .5, ax: 0 });
}
