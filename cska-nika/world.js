// Backgrounds and props. World units: ground at y = 0, up is negative.
import { TAU, blob, ell, curve, poly, rrect, limb, dark, light, mix, rng, clamp, lerp, smooth, star } from './lib.js';

export const PAL = { red: '#e8263a', blue: '#2a3cd6', blueD: '#1d2a9e', gold: '#f6c445', green: '#2f8a5a', greenD: '#21693f', snow: '#f1f4ff', snowS: '#c8d2f2', win: '#ffd27a', night: '#10143d' };

// —— sky + ground (screen space sky, world ground) ——
export function sky(ctx, W, H, k = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#0f1446', '#2b3a9a', 1 - k)); g.addColorStop(.6, mix('#2a3184', '#5b6fd0', 1 - k)); g.addColorStop(1, mix('#6a5ca8', '#a9b4ea', 1 - k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const R = rng(11); ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * H * .55, r = R() * 1.6 + .5; ctx.globalAlpha = .25 + R() * .5; ctx.beginPath(); ctx.arc(x, y, r * (H > W ? 1.2 : 1), 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
}
export function ground(ctx, x0 = -6000, x1 = 6000, col = PAL.snow) {
  const g = ctx.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, PAL.snowS); g.addColorStop(.12, col); g.addColorStop(1, '#dfe6ff');
  ctx.fillStyle = g; ctx.fillRect(x0, -2, x1 - x0, 6000);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x0, -6, x1 - x0, 8);
}
// soft snow mounds along a line
export function mounds(ctx, x0, x1, y, seed = 1, h = 40) {
  const R = rng(seed);
  for (let x = x0; x < x1; x += 70 + R() * 60) blob(ctx, ell(x, y, 60 + R() * 70, h * (.5 + R() * .6)), PAL.snow, { lw: 0, sd: [0, 12], shadeCol: PAL.snowS, shadeA: .8 });
}

// —— handball (red & blue panels) ——
export function ball(ctx, x, y, r, rot = 0, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  blob(ctx, ell(0, 0, r, r), PAL.blue, { lw: Math.max(2, r * .09), line: '#141a5e', sd: [-r * .25, -r * .25] });
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  ctx.fillStyle = PAL.red; ctx.beginPath(); ctx.moveTo(-r, -r * .1); ctx.bezierCurveTo(-r * .3, -r * .9, r * .4, -r * .2, r, -r * .8); ctx.lineTo(r, r * .1); ctx.bezierCurveTo(r * .3, r * .7, -r * .4, r * .1, -r, r * .7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, r * .1);
  ctx.beginPath(); ctx.moveTo(-r, -r * .1); ctx.bezierCurveTo(-r * .3, -r * .9, r * .4, -r * .2, r, -r * .8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r, r * .7); ctx.bezierCurveTo(-r * .4, r * .1, r * .3, r * .7, r, r * .1); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(-r * .35, -r * .4, r * .28, r * .16, -.6, 0, TAU); ctx.fill();
  ctx.restore();
  if (o.glow) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, r, 0, 0, r * 3); g.addColorStop(0, `rgba(255,220,120,${.5 * o.glow})`); g.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g; ctx.fillRect(-r * 3, -r * 3, r * 6, r * 6); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
}

// —— the tree with handball ornaments ——
// slots: ornament positions relative to (x, y=ground); the last one is the top hook
export const TREE_SLOTS = (() => {
  const s = [];
  const tiers = [[-120, 250], [-250, 205], [-380, 160], [-500, 112]];
  tiers.forEach(([y, w], i) => { const n = 4 - (i >> 1); for (let j = 0; j < n; j++) s.push([(-w * .7) + (w * 1.4) * (n === 1 ? .5 : j / (n - 1)) + (i % 2 ? 18 : -10), y + 18]); });
  s.push([0, -612]);
  return s;
})();
export function tree(ctx, x, y, sc, o = {}) {
  const t = o.t || 0, lit = o.lit || 0, filled = o.filled ?? TREE_SLOTS.length - 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  blob(ctx, rrect(-26, -60, 52, 66, 8), '#7a4a32', { lw: 5 });
  blob(ctx, rrect(-74, -34, 148, 40, 12), PAL.red, { lw: 5 }); // tub
  ctx.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); star(ctx, i * 26, -14, 7); ctx.fill(); }
  const tiers = [[-40, 290, 230], [-190, 240, 210], [-330, 190, 190], [-460, 140, 170], [-560, 80, 120]];
  tiers.forEach(([ty, w, h], i) => {
    const sh = curve([[-w, ty], [-w * .55, ty - h * .45], [0, ty - h], [w * .55, ty - h * .45], [w, ty], [w * .5, ty + 18], [0, ty + 10], [-w * .5, ty + 18]]);
    blob(ctx, sh, PAL.green, { lw: 6, line: '#174a2c', sd: [-16, -10], shadeCol: PAL.greenD, shadeA: .8 });
    // snow on the tier edge
    blob(ctx, curve([[-w * .95, ty - 6], [-w * .5, ty + 4], [0, ty - 2], [w * .5, ty + 4], [w * .95, ty - 6], [w * .5, ty - 20], [0, ty - 14], [-w * .5, ty - 20]]), '#ffffff', { lw: 0, shade: false });
  });
  // garlands: gold bulbs on swags
  const swags = [[-90, 230], [-235, 190], [-372, 150], [-498, 105]];
  swags.forEach(([sy, w], i) => {
    ctx.strokeStyle = 'rgba(40,30,20,.5)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-w, sy - 40); ctx.quadraticCurveTo(0, sy + 30, w, sy - 40); ctx.stroke();
    for (let k = 0; k <= 10; k++) {
      const u = k / 10, bx = lerp(-w, w, u), by = (1 - u) * (1 - u) * (sy - 40) + 2 * u * (1 - u) * (sy + 30) + u * u * (sy - 40);
      const tw = .55 + .45 * Math.sin(t * 6 + k * 1.7 + i * 2.3), on = lit * tw;
      const col = ['#ffd24a', '#ff4a5e', '#5a8bff', '#ffffff'][(k + i) % 4];
      ctx.fillStyle = on > .05 ? mix('#6b6250', col, clamp(on * 1.4)) : '#6b6250';
      ctx.beginPath(); ctx.arc(bx, by + 4, 7, 0, TAU); ctx.fill();
      if (on > .05) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(bx, by + 4, 2, bx, by + 4, 34); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00'); ctx.globalAlpha = on; ctx.fillStyle = g; ctx.fillRect(bx - 34, by - 30, 68, 68); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    }
  });
  // ornaments
  TREE_SLOTS.forEach(([bx, by], i) => {
    const top = i === TREE_SLOTS.length - 1;
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by - 30); ctx.lineTo(bx, by - 18); ctx.stroke();
    if (o.has ? o.has(i) : (top ? o.topBall : i < filled)) {
      const r = top ? 30 : 24, sw = Math.sin(t * 2 + i) * .1;
      ball(ctx, bx + Math.sin(sw) * 4, by, r, sw + i, { glow: lit * (top ? 1 : .5) });
    } else if (top || o.showHooks) { // empty gold hook
      ctx.beginPath(); ctx.arc(bx, by - 12, 8, Math.PI * .1, Math.PI * 1.1); ctx.stroke();
    }
  });
  if (o.topBall === 'only') {} // reserved
  ctx.restore();
}

// —— arena facade (generic, no brand) ——
export function arena(ctx, x, y, o = {}) {
  const t = o.t || 0, k = o.lights ?? 1;
  ctx.save(); ctx.translate(x, y);
  // roof dome
  blob(ctx, curve([[-1100, -520], [-700, -760], [0, -830], [700, -760], [1100, -520]], false), '#b9c2e6', { lw: 6, line: '#4a5390', sd: [0, 26], shadeCol: '#7d87bf', shadeA: .9 });
  // body
  blob(ctx, rrect(-1050, -560, 2100, 560, 30), '#2b3a8f', { lw: 6, line: '#141a5e', sd: [0, -14] });
  // red & blue stripes
  ctx.fillStyle = PAL.red; ctx.fillRect(-1050, -540, 2100, 22); ctx.fillStyle = '#5b72ff'; ctx.fillRect(-1050, -510, 2100, 10);
  // glass panels with warm glow
  for (let i = -9; i <= 9; i++) {
    if (Math.abs(i) < 2) continue;
    const gx = i * 108 - 46, glow = mix('#3f55c8', '#ffcf7a', .35 * k + .1 * Math.sin(i * 1.3 + t));
    blob(ctx, rrect(gx, -470, 92, 380, 12), glow, { lw: 4, line: '#141a5e', shade: false });
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(gx + 10, -460, 14, 360);
  }
  // entrance
  blob(ctx, rrect(-170, -300, 340, 300, 20), mix('#3f55c8', '#ffd58a', .7 * k), { lw: 6, line: '#141a5e', shade: false });
  ctx.strokeStyle = '#141a5e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, 0); ctx.moveTo(-85, -300); ctx.lineTo(-85, 0); ctx.moveTo(85, -300); ctx.lineTo(85, 0); ctx.stroke();
  ctx.restore();
}
// LED screen above the entrance: draws text or a clock
export function screen(ctx, x, y, w, h, draw) {
  ctx.save(); ctx.translate(x, y);
  blob(ctx, rrect(-w / 2 - 16, -h / 2 - 16, w + 32, h + 32, 22), '#11153f', { lw: 6, line: '#0a0d2a', shade: false });
  ctx.fillStyle = '#0a0e33'; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); draw(ctx, w, h); ctx.restore();
  // LED dot mesh
  ctx.fillStyle = 'rgba(0,0,0,.28)'; for (let yy = -h / 2; yy < h / 2; yy += 7) ctx.fillRect(-w / 2, yy, w, 2);
  ctx.restore();
}
export function ledText(ctx, txt, size, col = '#ffd04a', y = 0) {
  ctx.font = `900 ${size}px Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = col; ctx.shadowBlur = size * .35; ctx.fillStyle = col; ctx.fillText(txt, 0, y); ctx.shadowBlur = 0;
}

// —— city ——
export function cityFar(ctx, x0, x1, y, seed = 5) {
  const R = rng(seed);
  for (let x = x0; x < x1;) {
    const w = 120 + R() * 160, h = 380 + R() * 420, col = mix('#232a78', '#2d3488', R());
    blob(ctx, rrect(x, y - h, w, h + 10, 6), col, { lw: 0, shade: false });
    if (R() < .18) { // a tiered tower with a spire (generic)
      blob(ctx, poly([[x + w * .2, y - h], [x + w * .5, y - h - 160], [x + w * .8, y - h]]), col, { lw: 0, shade: false });
      ctx.fillStyle = col; ctx.fillRect(x + w * .48, y - h - 230, 5, 80);
      ctx.fillStyle = '#ff5a6a'; ctx.beginPath(); ctx.arc(x + w * .5, y - h - 232, 6, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,214,120,.55)';
    for (let wy = y - h + 24; wy < y - 20; wy += 34) for (let wx = x + 14; wx < x + w - 14; wx += 26) if (R() < .28) ctx.fillRect(wx, wy, 10, 14);
    x += w + 10 + R() * 30;
  }
}
export function houses(ctx, x0, x1, y, seed = 9, o = {}) {
  const R = rng(seed), cols = ['#5a4a9a', '#4a5aa8', '#7a4f8f', '#3f6aa0', '#6a5aa8'];
  for (let x = x0; x < x1;) {
    const w = 300 + R() * 200, fl = 4 + Math.floor(R() * 3), h = fl * 78 + 40, col = cols[Math.floor(R() * cols.length)];
    blob(ctx, rrect(x, y - h, w, h + 10, 10), col, { lw: 5, line: dark(col, .5), sd: [-14, 0] });
    blob(ctx, rrect(x - 8, y - h - 14, w + 16, 26, 10), '#ffffff', { lw: 0, shade: false }); // snowy roof edge
    for (let f = 0; f < fl; f++) for (let wx = x + 30; wx < x + w - 50; wx += 64) {
      const on = R() < .62, wy = y - h + 40 + f * 78;
      blob(ctx, rrect(wx, wy, 40, 50, 6), on ? PAL.win : dark(col, .35), { lw: 3, line: dark(col, .55), shade: false });
      if (on && R() < .3) { ctx.fillStyle = ['#ff4a5e', '#5a8bff', '#2fbf6a'][Math.floor(R() * 3)]; for (let b = 0; b < 4; b++) { ctx.beginPath(); ctx.arc(wx + 6 + b * 10, wy + 6 + (b % 2) * 3, 3, 0, TAU); ctx.fill(); } }
    }
    x += w + 40 + R() * 80;
  }
}
export function lamp(ctx, x, y, h = 420, o = {}) {
  ctx.save(); ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, -h + 20, 10, 0, -h + 20, 260); g.addColorStop(0, 'rgba(255,200,110,.45)'); g.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = g; ctx.fillRect(-260, -h - 240, 520, 520); ctx.globalCompositeOperation = 'source-over';
  limb(ctx, [[0, 0], [0, -h + 20]], 14, '#2b2f55', '#141734');
  blob(ctx, curve([[-30, -h + 30], [-24, -h - 10], [0, -h - 30], [24, -h - 10], [30, -h + 30]], true), '#2b2f55', { lw: 4, line: '#141734', shade: false });
  blob(ctx, ell(0, -h + 20, 22, 14), '#ffe2a0', { lw: 0, shade: false });
  blob(ctx, ell(0, -h - 30, 34, 10), '#ffffff', { lw: 0, shade: false });
  ctx.restore();
}
export function garland(ctx, x0, y0, x1, y1, sag, t, seed = 0) {
  ctx.strokeStyle = 'rgba(20,20,50,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
  const n = Math.max(6, Math.round(Math.abs(x1 - x0) / 46));
  for (let k = 1; k < n; k++) {
    const u = k / n, bx = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * (x0 + x1) / 2 + u * u * x1, by = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * ((y0 + y1) / 2 + sag * 2) + u * u * y1;
    const col = ['#ffd24a', '#ff4a5e', '#5a8bff', '#ffffff'][(k + seed) % 4], tw = .6 + .4 * Math.sin(t * 5 + k * 2.1 + seed);
    ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(bx, by + 6, 1, bx, by + 6, 26); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00'); ctx.globalAlpha = tw; ctx.fillStyle = g; ctx.fillRect(bx - 26, by - 20, 52, 52); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(bx, by + 7, 5.5, 7.5, 0, 0, TAU); ctx.fill();
  }
}
export function pine(ctx, x, y, s = 1, seed = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  blob(ctx, rrect(-12, -40, 24, 44, 6), '#5a3a2a', { lw: 4 });
  [[-30, 120, 110], [-110, 95, 100], [-185, 66, 90]].forEach(([ty, w, h]) => {
    blob(ctx, poly([[-w, ty], [0, ty - h], [w, ty]]), '#2a6f52', { lw: 5, line: '#174a2c', sd: [-12, -4], shadeCol: '#1f5a40', shadeA: .8 });
    blob(ctx, curve([[-w * .9, ty - 4], [-w * .4, ty - h * .35], [0, ty - h * .95], [w * .4, ty - h * .35], [w * .9, ty - 4], [0, ty - h * .3]]), '#ffffff', { lw: 0, shade: false });
  });
  ctx.restore();
}
// handball goal (red & white posts, net)
export function goal(ctx, x, y, w = 330, h = 220) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  for (let gx = -w / 2; gx <= w / 2; gx += 22) { ctx.beginPath(); ctx.moveTo(gx, -h); ctx.lineTo(gx * .86, -14); ctx.stroke(); }
  for (let gy = -h; gy <= -10; gy += 22) { ctx.beginPath(); ctx.moveTo(-w / 2 * (1 - (gy + h) / h * .14), gy); ctx.lineTo(w / 2 * (1 - (gy + h) / h * .14), gy); ctx.stroke(); }
  const post = (pts) => { limb(ctx, pts, 16, '#ffffff', '#8a2030'); ctx.save(); ctx.setLineDash([22, 22]); ctx.strokeStyle = PAL.red; ctx.lineWidth = 16; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.stroke(); ctx.restore(); };
  post([[-w / 2, 0], [-w / 2, -h], [w / 2, -h], [w / 2, 0]]);
  ctx.restore();
  mounds(ctx, x - w / 2 - 20, x - w / 2 + 40, y + 6, 4, 22); mounds(ctx, x + w / 2 - 30, x + w / 2 + 30, y + 6, 6, 22);
}
export function bench(ctx, x, y, w = 300) {
  ctx.save(); ctx.translate(x, y);
  for (const s of [-1, 1]) limb(ctx, [[s * w * .4, 0], [s * w * .4, -90]], 12, '#2b2f55', '#141734');
  blob(ctx, rrect(-w / 2, -100, w, 22, 8), '#8a5a3a', { lw: 4 });
  blob(ctx, rrect(-w / 2, -170, w, 20, 8), '#8a5a3a', { lw: 4 });
  blob(ctx, rrect(-w / 2, -150, w, 20, 8), '#8a5a3a', { lw: 4 });
  blob(ctx, rrect(-w / 2 + 6, -114, w - 12, 16, 8), '#ffffff', { lw: 0, shade: false });
  blob(ctx, rrect(-w / 2 + 6, -184, w - 12, 14, 7), '#ffffff', { lw: 0, shade: false });
  ctx.restore();
}
export function ticket(ctx, x, y, a, s = 1, gold = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  blob(ctx, rrect(-32, -18, 64, 36, 6), gold ? '#ffd24a' : '#fff4dc', { lw: 3, line: gold ? '#b0801a' : '#a08a6a', shade: false });
  ctx.fillStyle = gold ? '#e8263a' : '#2a3cd6'; ctx.fillRect(-32, -18, 14, 36);
  ctx.strokeStyle = gold ? '#b0801a' : '#c9b89a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(24, -6); ctx.moveTo(-8, 6); ctx.lineTo(16, 6); ctx.stroke();
  if (gold) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 80); g.addColorStop(0, 'rgba(255,220,120,.6)'); g.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g; ctx.fillRect(-80, -80, 160, 160); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
}
export function present(ctx, x, y, r, open = 0, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (open < 1) {
    ctx.globalAlpha = 1 - open;
    blob(ctx, ell(0, 0, r, r * .95), '#e8263a', { lw: 4, line: '#8a1424' });
    ctx.fillStyle = PAL.gold; ctx.fillRect(-r, -6, r * 2, 12); ctx.fillRect(-6, -r, 12, r * 2);
    for (const s of [-1, 1]) blob(ctx, ell(s * 14, -r - 6, 14, 9, s * .5), PAL.gold, { lw: 3, line: '#a07a10', shade: false });
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
export function sled(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#c0c6dc'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-200, -6); ctx.lineTo(170, -6); ctx.quadraticCurveTo(230, -6, 220, -60); ctx.stroke();
  for (const sx of [-150, -40, 80]) { ctx.beginPath(); ctx.moveTo(sx, -6); ctx.lineTo(sx, -40); ctx.stroke(); }
  blob(ctx, rrect(-210, -64, 400, 30, 12), PAL.red, { lw: 5 });
  blob(ctx, rrect(-210, -48, 400, 12, 6), PAL.blue, { lw: 0, shade: false });
  ctx.restore();
}
// —— snowfall in screen space ——
export function snowfall(ctx, W, H, t, n = 140, wind = 0, k = 1) {
  const R = rng(77), sc = Math.max(W, H) / 1920;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < n; i++) {
    const z = R(), sp = 40 + z * 90, x0 = R() * (W + 200), y0 = R() * (H + 100), r = (1.5 + z * 4.5) * sc;
    const y = (y0 + t * sp * sc) % (H + 60) - 30, x = ((x0 + Math.sin(t * .8 + i) * 30 * sc + t * wind * (50 + z * 120) * sc) % (W + 200) + W + 200) % (W + 200) - 100;
    ctx.globalAlpha = (.45 + z * .5) * k; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
// —— fireworks ——
export function burst(ctx, x, y, age, col, R0 = 240, seed = 1) {
  if (age < 0 || age > 2.2) return;
  const R = rng(seed), n = 34, k = 1 - Math.pow(1 - Math.min(1, age / .9), 3), fade = 1 - smooth(1.0, 2.2, age);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + R() * .1, r = R0 * k * (.82 + R() * .25), dr = Math.min(r, 34);
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r + age * age * 26;
    ctx.strokeStyle = col; ctx.globalAlpha = fade; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - Math.cos(a) * dr, py - Math.sin(a) * dr); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = fade * (.5 + .5 * Math.sin(age * 30 + i)); ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill();
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, R0 * 1.2); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = .25 * fade * (1 - k * .6); ctx.fillStyle = g; ctx.fillRect(x - R0 * 1.2, y - R0 * 1.2, R0 * 2.4, R0 * 2.4);
  ctx.restore();
}
export function rocket(ctx, x0, y0, x1, y1, k, col) {
  if (k <= 0 || k >= 1) return;
  const e = 1 - Math.pow(1 - k, 2), x = lerp(x0, x1, e), y = lerp(y0, y1, e);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x, y, x, y + 140); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x0, x1, Math.max(0, e - .08)), y + 140); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); ctx.restore();
}
export function confetti(ctx, x0, x1, ytop, t, t0, n = 120, seed = 3) {
  if (t < t0) return;
  const R = rng(seed), cols = [PAL.red, PAL.blue, PAL.gold, '#ffffff'];
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, R()), d = (t - t0) * (120 + R() * 140), y = ytop - R() * 600 + d, a = t * (3 + R() * 6) + i;
    ctx.save(); ctx.translate(x + Math.sin(t * 2 + i) * 30, y); ctx.rotate(a); ctx.scale(1, Math.cos(a * 1.3));
    ctx.fillStyle = cols[i % 4]; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
  }
}
