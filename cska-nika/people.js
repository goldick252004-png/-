// Original human characters, same soft 2D look as Ника. Origin = feet on the ground, y up negative.
import { TAU, blob, ell, curve, poly, rrect, limb, dark, light, clamp, lerp, star } from './lib.js';

export const CAST = {
  varya: { child: 1, skin: '#f6d3b8', hair: '#8a4b2a', style: 'pigtails', coat: '#f4f1ec', coat2: '#2a3cd6', pants: '#2a3cd6', boots: '#e8263a', scarf: ['#e8263a', '#2a3cd6'], hat: { type: 'pom', col: '#2a3cd6', pom: '#ffffff' }, eyes: 1.15 },
  grandpa: { skin: '#f1c9a8', hair: '#e9e7ee', style: 'bald', coat: '#6b4a3a', coat2: '#4d3328', pants: '#3b3f55', boots: '#2e2a2a', scarf: ['#e8263a', '#2a3cd6'], hat: { type: 'cap', col: '#4a4f66' }, beard: '#eceaf0', glasses: 1, h: .95 },
  timur: { skin: '#e3b48f', hair: '#2a1d18', style: 'short', coat: '#3f8f6a', coat2: '#2b6a4d', pants: '#2b2f45', boots: '#4a3a2c', scarf: null, hat: { type: 'beanie', col: '#f2b51e' }, bag: '#e07a2b' },
  liza: { skin: '#f6d3b8', hair: '#e2a94c', style: 'bob', coat: '#e86a8a', coat2: '#c24c6c', pants: '#2b2f45', boots: '#f4f1ec', scarf: ['#ffffff', '#e8263a'], hat: { type: 'earmuff', col: '#ffffff' }, bag: '#6f61d6', h: .96 },
  mom: { skin: '#f3cdb0', hair: '#5a2e22', style: 'bun', coat: '#c63a4f', coat2: '#9c2a3c', pants: '#2b2f45', boots: '#3a2a2a', scarf: null, hat: null, sweater: 1, h: .97 },
  dad: { skin: '#eac09e', hair: '#3a2a22', style: 'short', coat: '#2a3cd6', coat2: '#1d2a9e', pants: '#3a3a4a', boots: '#2e2a2a', scarf: null, hat: null, beard: '#3a2a22', stubble: 1, sweater: 1 },
  boy: { child: 1, skin: '#f3cdb0', hair: '#d68b3a', style: 'tuft', coat: '#2a3cd6', coat2: '#e8263a', pants: '#3a3a4a', boots: '#e8263a', scarf: null, hat: null, sweater: 1, eyes: 1.1, h: .92 }
};

export function ppose(o = {}) {
  return Object.assign({ x: 0, y: 0, s: 1, flip: 1, lean: 0, bob: 0, turn: 0, tilt: 0, armL: [.2, .2], armR: [.2, .2], legL: [.04, 0], legR: [.04, 0], liftL: 0, liftR: 0, mouth: .3, blink: 0, look: [0, 0], brows: 0, sit: 0, gloves: 0, coatOff: 0 }, o);
}

export function dims(c0) { const c = typeof c0 === "string" ? CAST[c0] : c0;
  const k = c.child ? { head: 64, body: 112, bw: 62, leg: 74, arm: 46 } : { head: 56, body: 160, bw: 62, leg: 126, arm: 70 };
  const h = c.h || 1; return { head: k.head, body: k.body * h, bw: k.bw, leg: k.leg * h, arm: k.arm * h };
}

function hairBack(ctx, c, d, t) {
  const r = d.head;
  if (c.style === 'pigtails') for (const s of [-1, 1]) {
    const sw = Math.sin(t * 5 + s) * .12;
    ctx.save(); ctx.translate(s * r * .95, -r * .1); ctx.rotate(s * (.5 + sw));
    blob(ctx, ell(0, r * .55, r * .32, r * .55), c.hair, { lw: 4 });
    blob(ctx, ell(0, 0, r * .16, r * .12), '#e8263a', { lw: 3, shade: false });
    ctx.restore();
  }
  if (c.style === 'bob') blob(ctx, curve([[-r * 1.1, -r * .3], [-r * 1.12, r * .55], [-r * .7, r * .75], [r * .7, r * .75], [r * 1.12, r * .55], [r * 1.1, -r * .3], [0, -r * 1.15]]), c.hair, { lw: 4 });
  if (c.style === 'bun') blob(ctx, ell(0, -r * 1.05, r * .42, r * .36), c.hair, { lw: 4 });
}
function hairFront(ctx, c, d, p) {
  const r = d.head, tx = p.turn * r * .25;
  if (c.style === 'bald') {
    blob(ctx, curve([[-r * 1.02, -r * .05], [-r * .9, -r * .5], [-r * .7, -r * .35], [-r * .8, r * .1]]), c.hair, { lw: 3, shade: false });
    blob(ctx, curve([[r * 1.02, -r * .05], [r * .9, -r * .5], [r * .7, -r * .35], [r * .8, r * .1]]), c.hair, { lw: 3, shade: false });
    return;
  }
  const cap = { pigtails: [[-r, -r * .1], [-r * .95, -r * .7], [-r * .3, -r * 1.05], [r * .5, -r * 1.0], [r, -r * .55], [r * 1.02, -r * .1], [r * .5, -r * .55], [tx, -r * .62], [-r * .5, -r * .45]],
    short: [[-r * 1.02, -r * .1], [-r * .95, -r * .75], [-r * .3, -r * 1.08], [r * .5, -r * 1.02], [r * 1.0, -r * .6], [r * 1.02, -r * .1], [r * .7, -r * .55], [r * .2 + tx, -r * .7], [-r * .5, -r * .62]],
    tuft: [[-r * 1.02, -r * .1], [-r * .95, -r * .75], [-r * .2, -r * 1.06], [r * .1, -r * 1.35], [r * .3, -r * 1.05], [r * 1.0, -r * .6], [r * 1.02, -r * .1], [r * .6, -r * .5], [r * .1 + tx, -r * .62], [-r * .5, -r * .5]],
    bob: [[-r * 1.05, r * .2], [-r, -r * .7], [-r * .3, -r * 1.1], [r * .5, -r * 1.05], [r * 1.0, -r * .6], [r * 1.05, r * .2], [r * .8, -r * .3], [r * .3 + tx, -r * .55], [-r * .6, -r * .5], [-r * .82, -r * .2]],
    bun: [[-r * 1.02, -r * .1], [-r * .95, -r * .75], [-r * .3, -r * 1.08], [r * .5, -r * 1.02], [r * 1.0, -r * .6], [r * 1.02, -r * .1], [r * .6, -r * .65], [tx - r * .1, -r * .7], [-r * .6, -r * .5]] }[c.style];
  if (cap) blob(ctx, curve(cap), c.hair, { lw: 4, sd: [-6, -6] });
}
function hat(ctx, c, d, t) {
  const r = d.head, h = c.hat; if (!h) return;
  if (h.type === 'pom' || h.type === 'beanie') {
    blob(ctx, curve([[-r * 1.05, -r * .35], [-r * .95, -r * .95], [0, -r * 1.3], [r * .95, -r * .95], [r * 1.05, -r * .35]]), h.col, { lw: 4 });
    blob(ctx, rrect(-r * 1.1, -r * .55, r * 2.2, r * .32, r * .14), light(h.col, .25), { lw: 4, shade: false });
    if (h.type === 'pom') blob(ctx, ell(Math.sin(t * 4) * 2, -r * 1.35, r * .26, r * .25), h.pom, { lw: 4, line: '#b9b9c6' });
  } else if (h.type === 'cap') {
    blob(ctx, curve([[-r * 1.02, -r * .4], [-r * .9, -r * .95], [0, -r * 1.12], [r * .9, -r * .95], [r * 1.02, -r * .4]]), h.col, { lw: 4 });
    blob(ctx, curve([[-r * .9, -r * .45], [0, -r * .3], [r * .9, -r * .45], [r * .7, -r * .62], [-r * .7, -r * .62]]), dark(h.col, .2), { lw: 4, shade: false });
  } else if (h.type === 'earmuff') {
    ctx.strokeStyle = '#e8263a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -r * .05, r * 1.03, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    for (const s of [-1, 1]) blob(ctx, ell(s * r * 1.0, -r * .02, r * .26, r * .3), h.col, { lw: 4, line: '#b9b9c6' });
  }
}
function face(ctx, c, d, p) {
  const r = d.head, tx = p.turn * r * .3, e = c.eyes || 1;
  blob(ctx, ell(0, 0, r, r * 1.02), c.skin, { lw: 4, sd: [-7 - p.turn * 6, -7], line: dark(c.skin, .5) });
  // ears
  for (const s of [-1, 1]) if (!(c.hat && c.hat.type === 'earmuff')) blob(ctx, ell(s * r * .98 + tx * .3, r * .05, r * .14, r * .2), c.skin, { lw: 3, shade: false, line: dark(c.skin, .5) });
  hairFront(ctx, c, d, p);
  // eyes
  const ey = -r * .02;
  for (const s of [-1, 1]) {
    const ex = s * r * .36 + tx;
    if (p.blink > .8) { ctx.strokeStyle = '#2a1d24'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(ex, ey + 4, r * .13 * e, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else {
      blob(ctx, ell(ex + p.look[0] * 3, ey + p.look[1] * 3, r * .11 * e, r * .15 * e), '#2a1d24', { lw: 0, shade: false });
      blob(ctx, ell(ex + p.look[0] * 3 - r * .035, ey + p.look[1] * 3 - r * .05, r * .045 * e, r * .05 * e), '#fff', { lw: 0, shade: false });
    }
    if (c.glasses) { ctx.strokeStyle = '#3a3340'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ex, ey, r * .25, 0, TAU); ctx.stroke(); }
    // brows
    ctx.strokeStyle = c.style === 'bald' ? '#c9c6d2' : dark(c.hair, .2); ctx.lineWidth = 5; ctx.lineCap = 'round';
    const by = ey - r * .3 - p.brows * r * .08;
    ctx.beginPath(); ctx.moveTo(ex - r * .13, by + s * p.brows * -3 + (p.sad ? s * 6 : 0)); ctx.lineTo(ex + r * .13, by - s * p.brows * -3 + (p.sad ? -s * 6 : 0)); ctx.stroke();
  }
  if (c.glasses) { ctx.beginPath(); ctx.moveTo(-r * .11 + tx, ey); ctx.lineTo(r * .11 + tx, ey); ctx.stroke(); }
  // cheeks + nose
  ctx.fillStyle = 'rgba(255,110,130,.32)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * .55 + tx, r * .28, r * .14, r * .09, 0, 0, TAU); ctx.fill(); }
  blob(ctx, ell(tx * 1.2, r * .16, r * .1, r * .08), dark(c.skin, .12), { lw: 0, shade: false });
  // beard
  if (c.beard && !c.stubble) blob(ctx, curve([[-r * .85, r * .1], [-r * .7, r * .75], [0, r * 1.15], [r * .7, r * .75], [r * .85, r * .1], [r * .4, r * .45], [tx, r * .35], [-r * .4, r * .45]]), c.beard, { lw: 4, line: '#b5b2c2' });
  if (c.stubble) { ctx.fillStyle = 'rgba(58,42,34,.25)'; ctx.beginPath(); ctx.ellipse(tx, r * .6, r * .62, r * .38, 0, 0, Math.PI); ctx.fill(); }
  // mouth
  const my = r * .45, m = p.mouth;
  if (m < 0) { ctx.strokeStyle = '#6b2430'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(tx - r * .18, my + 6); ctx.quadraticCurveTo(tx, my - 6, tx + r * .18, my + 6); ctx.stroke(); }
  else if (m < .15) { ctx.strokeStyle = '#6b2430'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(tx - r * .2, my - 3); ctx.quadraticCurveTo(tx, my + 9, tx + r * .2, my - 3); ctx.stroke(); }
  else {
    const w = r * (.2 + m * .1), hh = r * (.1 + m * .28);
    blob(ctx, c2 => { c2.moveTo(tx - w, my - 4); c2.quadraticCurveTo(tx, my, tx + w, my - 4); c2.quadraticCurveTo(tx + w * .8, my + hh, tx, my + hh); c2.quadraticCurveTo(tx - w * .8, my + hh, tx - w, my - 4); c2.closePath(); }, '#7a1f2e', { lw: 3, line: '#5a1420', shade: false });
    ctx.save(); ctx.beginPath(); ctx.moveTo(tx - w, my - 4); ctx.quadraticCurveTo(tx + w * .8, my + hh, tx + w, my - 4); ctx.clip();
    ctx.restore();
    blob(ctx, ell(tx, my + hh * .75, w * .55, hh * .3), '#e8607a', { lw: 0, shade: false });
  }
}
function arm(ctx, c, d, p, side) {
  const [a1, a2] = side < 0 ? p.armL : p.armR;
  const sx = side * d.bw * .78, sy = -d.leg - d.body + 22, L = d.arm;
  const ex = sx + side * Math.sin(a1) * L, ey = sy + Math.cos(a1) * L;
  const hx = ex + side * Math.sin(a1 + a2) * L * .92, hy = ey + Math.cos(a1 + a2) * L * .92;
  const sleeve = c.sweater ? c.coat : c.coat;
  limb(ctx, [[sx, sy], [ex, ey], [hx, hy]], c.child ? 26 : 28, sleeve, dark(sleeve, .45));
  if (p.gloves && side) { // goalkeeper gloves
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-Math.atan2(hx - ex, hy - ey));
    blob(ctx, rrect(-20, -8, 40, 44, 16), '#ffffff', { lw: 4, line: '#2a3cd6' });
    blob(ctx, rrect(-20, -8, 40, 14, 7), '#e8263a', { lw: 0, shade: false });
    blob(ctx, rrect(-20, 6, 40, 10, 5), '#2a3cd6', { lw: 0, shade: false });
    ctx.restore();
  } else blob(ctx, ell(hx, hy + 4, c.child ? 15 : 16, c.child ? 15 : 16), c.sweater ? c.skin : (c.mitt || c.coat2), { lw: 4 });
}
export function personHands(c0, p) {
  const c = typeof c0 === 'string' ? CAST[c0] : c0, d = dims(c), out = [];
  for (const side of [-1, 1]) {
    const [a1, a2] = side < 0 ? p.armL : p.armR;
    const sx = side * d.bw * .78, sy = -d.leg - d.body + 22 + p.sit * (d.leg - (p.seat ?? 100)), L = d.arm;
    const ex = sx + side * Math.sin(a1) * L, ey = sy + Math.cos(a1) * L;
    const hx = ex + side * Math.sin(a1 + a2) * L * .92, hy = ey + Math.cos(a1 + a2) * L * .92 + 6;
    const cs = Math.cos(p.lean), sn = Math.sin(p.lean);
    out.push([p.x + (hx * cs - hy * sn) * p.s * p.flip, p.y + (hx * sn + hy * cs - p.bob) * p.s]);
  }
  return out;
}
function leg(ctx, c, d, p, side) {
  const [a1, a2] = side < 0 ? p.legL : p.legR, lift = side < 0 ? p.liftL : p.liftR;
  const hx = side * d.bw * .42, hy = -d.leg, L = d.leg / 2;
  let kx, ky, fx, fy;
  if (p.sit) { // sitting: thighs forward (towards viewer), shins down
    kx = hx + side * 6; ky = hy + 10; fx = kx + side * 4; fy = -(d.leg - (p.seat ?? 100)) * p.sit - lift;
  } else {
    kx = hx + side * Math.sin(a1) * L; ky = hy + Math.cos(a1) * L - lift * .5;
    fx = kx + side * Math.sin(a1 + a2) * L; fy = ky + Math.cos(a1 + a2) * L - lift;
  }
  limb(ctx, [[hx, hy], [kx, ky], [fx, fy - 8]], c.child ? 24 : 28, c.pants);
  blob(ctx, curve([[fx - 18, fy + 2], [fx - 16, fy - 16], [fx + 14, fy - 16], [fx + 22 + side * 3, fy + 2], [fx + 6, fy + 8], [fx - 10, fy + 8]]), c.boots, { lw: 4 });
}
export function drawPerson(ctx, c0, p, t = 0) {
  const c = typeof c0 === 'string' ? CAST[c0] : c0, d = dims(c);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s * p.flip, p.s);
  if (!p.noShadow) { ctx.fillStyle = 'rgba(20,20,60,.18)'; ctx.beginPath(); ctx.ellipse(0, 4, d.bw * 1.1, 11, 0, 0, TAU); ctx.fill(); }
  if (p.sit) ctx.translate(0, (d.leg - (p.seat ?? 100)) * p.sit);
  if (!p.sit) { leg(ctx, c, d, p, -1); leg(ctx, c, d, p, 1); }
  ctx.translate(0, -p.bob); ctx.rotate(p.lean);
  const top = -d.leg - d.body, hy = top - d.head * .88;
  ctx.save(); ctx.translate(0, hy); ctx.rotate(p.tilt); hairBack(ctx, c, d, t); ctx.restore();
  arm(ctx, c, d, p, -1);
  // coat / sweater body
  const bw = d.bw, flare = c.sweater ? 4 : 14;
  const body = curve([[-bw * .78, top + 18], [-bw * .45, top], [bw * .45, top], [bw * .78, top + 18], [bw * .86 + flare * .3, top + d.body * .55], [bw + flare, -d.leg + 10], [0, -d.leg + 16], [-bw - flare, -d.leg + 10], [-bw * .86 - flare * .3, top + d.body * .55]]);
  blob(ctx, body, c.coat, { lw: 5, sd: [-12, -4] });
  ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
  if (c.sweater) { // a knitted band with snowflakes
    ctx.fillStyle = c.coat2; ctx.fillRect(-200, top + d.body * .32, 400, d.body * .2);
    ctx.fillStyle = '#ffffff'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); star(ctx, i * 26, top + d.body * .42, 6, 3, 6); ctx.fill(); }
  } else {
    ctx.fillStyle = c.coat2; ctx.fillRect(-4, top, 8, d.body); // zip
    ctx.fillRect(-200, -d.leg - 4, 400, 22); // hem
  }
  ctx.restore();
  if (c.bag) blob(ctx, rrect(-bw * 1.05, top + 20, 26, d.body * .62, 10), c.bag, { lw: 4 });
  if (p.sit) { // knees towards the viewer
    for (const s of [-1, 1]) blob(ctx, ell(s * bw * .42, -d.leg + 4, 26, 22), c.pants, { lw: 4 });
    leg(ctx, c, d, p, -1); leg(ctx, c, d, p, 1);
  }
  if (c.scarf) {
    blob(ctx, rrect(-bw * .72, top - 8, bw * 1.44, 30, 14), c.scarf[0], { lw: 4 });
    blob(ctx, rrect(bw * .1, top + 8, 26, d.body * .45, 8), c.scarf[0], { lw: 4 });
    ctx.fillStyle = c.scarf[1]; for (let k = 0; k < 3; k++) ctx.fillRect(bw * .1 + 2, top + 20 + k * 18, 22, 7);
  }
  ctx.save(); ctx.translate(0, hy); ctx.rotate(p.tilt); face(ctx, c, d, p); hat(ctx, c, d, t); ctx.restore();
  arm(ctx, c, d, p, 1);
  ctx.restore();
}
// convenience: size of a character in units (for placing props)
export const heightOf = c0 => { const c = typeof c0 === 'string' ? CAST[c0] : c0, d = dims(c); return d.leg + d.body + d.head * 1.9; };
