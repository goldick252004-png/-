// The nine scenes. Each: a, b (global seconds), cam(lt) → {H:[x,y,w], V:[x,y,w]}, draw(ctx, lt, env), caps, iris point.
import { TAU, clamp, lerp, ease, eo, ei, smooth, win, rng, blob, ell, rrect, poly, curve, star, back, dark, mix } from './lib.js';
import { drawNika, pose, hands as nHands } from './nika.js';
import { drawPerson, ppose, personHands, dims } from './people.js';
import { kf, lin, gait, bounce, reachN, reachP, mixArm, blinkAt, talk } from './rig.js';
import * as Wd from './world.js';
const { PAL } = Wd;

const NS = .95; // Ника's scale next to people (s = 1)
const TREE_X = 420;
const slotW = i => [TREE_X + Wd.TREE_SLOTS[i][0], Wd.TREE_SLOTS[i][1]];
const TOP = Wd.TREE_SLOTS.length - 1;
const hump = (t, c, w) => { const k = (t - c) / w; return Math.abs(k) < 1 ? Math.cos(k * Math.PI / 2) ** 2 : 0; };
const par = (ctx, cam, f, fn) => { ctx.save(); ctx.translate(cam.x * (1 - f), cam.y * (1 - f) * .5); fn(); ctx.restore(); };
const sparkle = (ctx, x, y, k, r = 60, seed = 1) => {
  if (k <= 0 || k >= 1) return; const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU + R(), d = r * eo(k) * (.6 + R() * .6), s = (1 - k) * (10 + R() * 8);
    ctx.fillStyle = ['#ffe27a', '#ffffff', '#ff8aa0'][i % 3]; ctx.beginPath(); star(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, s, s * .4, 4); ctx.fill();
  }
  ctx.restore();
};
const puff = (ctx, x, y, k, r = 40) => { // snow poof
  if (k <= 0 || k >= 1) return; ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = r * eo(k); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .7, (1 - k) * 14 + 4, 0, TAU); ctx.fill(); }
  ctx.restore();
};
const snowball = (ctx, x, y, r = 16) => blob(ctx, ell(x, y, r, r), '#ffffff', { lw: 3, line: '#9fb0e0', sd: [-4, -4], shadeCol: '#d5ddf7', shadeA: 1 });
const gloveItem = (ctx, x, y, s = 1) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); for (const dx of [-14, 14]) { blob(ctx, rrect(dx - 15, -18, 30, 36, 12), '#ffffff', { lw: 3.5, line: '#2a3cd6' }); ctx.fillStyle = PAL.red; ctx.fillRect(dx - 14, -16, 28, 10); } ctx.restore(); };
const steam = (ctx, x, y, t, seed) => { const ph = (t * .8 + seed) % 1; ctx.fillStyle = `rgba(255,255,255,${.5 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x + ph * 30, y - ph * 50, 8 + ph * 16, 0, TAU); ctx.fill(); };
const bubble = (ctx, x, y, k, txt) => {
  if (k <= 0) return; const s = back(clamp(k)); ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  blob(ctx, ell(0, 0, 54, 48), '#ffffff', { lw: 5, line: '#1d2a9e', shade: false });
  blob(ctx, ell(-34, 52, 11, 10), '#ffffff', { lw: 4, line: '#1d2a9e', shade: false }); blob(ctx, ell(-48, 72, 6, 6), '#ffffff', { lw: 3, line: '#1d2a9e', shade: false });
  ctx.fillStyle = '#e8263a'; ctx.font = '900 64px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 4); ctx.restore();
};
const restA = [.22, .22];

// —— the plaza set: arena, tree, lamps (scenes 1, 2, 7, 8) ——
function plaza(ctx, t, cam, o = {}) {
  par(ctx, cam, .25, () => Wd.cityFar(ctx, -2600, 3200, -150, 5));
  par(ctx, cam, .6, () => Wd.houses(ctx, 1250, 5200, -60, 13));
  ctx.save(); ctx.translate(0, -40); ctx.scale(.72, .72); Wd.arena(ctx, 0, 0, { t }); ctx.restore();
  Wd.screen(ctx, 0, -520, 360, 140, (c, w, h) => (o.screen || defScreen)(c, w, h, t));
  Wd.ground(ctx);
  Wd.mounds(ctx, -1500, 1300, 30, 3, 30);
  Wd.lamp(ctx, -700, 10); Wd.lamp(ctx, 1150, 10);
  Wd.garland(ctx, -700, -400, -200, -560, 40, t, 1); Wd.garland(ctx, 1150, -400, 760, -520, 30, t, 2);
  if (o.lit) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(TREE_X, -330, 40, TREE_X, -330, 700); gl.addColorStop(0, `rgba(255,200,110,${.35 * o.lit})`); gl.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = gl; ctx.fillRect(TREE_X - 700, -1030, 1400, 1400); ctx.restore(); }
  Wd.tree(ctx, TREE_X, 10, 1, { t, lit: o.lit || 0, has: o.has || (i => i !== TOP), topBall: o.topBall });
}
function defScreen(c, w, h, t) { Wd.ledText(c, '31.12', 92, '#ffd04a', -4); c.fillStyle = '#5b72ff'; c.fillRect(-w / 2, h / 2 - 16, w, 6); c.fillStyle = '#e8263a'; c.fillRect(-w / 2, h / 2 - 10, w, 6); }

// ——————————————————— S1 · Ёлка без одного мяча ———————————————————
const S1 = {
  a: 0, b: 9,
  cam: lt => ({ H: kf(lt, [[0, [180, -340, 1750]], [4.6, [220, -360, 1650]], [6.0, [400, -470, 1150]], [7.2, [400, -470, 1150]], [8.3, [200, -340, 1450]]]),
    V: kf(lt, [[0, [230, -380, 1000]], [4.6, [250, -400, 950]], [6.0, [420, -520, 780]], [7.2, [420, -520, 780]], [8.3, [170, -340, 900]]]) }),
  caps: [[.6, 4.6, '31 декабря.\nДомашняя арена ЦСКА'], [5.4, 8.8, 'Одного мяча не хватает!']],
  draw(ctx, lt, E) {
    const s4 = slotW(4);
    plaza(ctx, E.t, E.cam, { has: i => i !== TOP && (i !== 4 || lt > 1.35) });
    const x = kf(lt, [[2.2, 175], [3.0, 40]]);
    const p = pose({ x, s: NS, turn: kf(lt, [[0, .45], [3, .2]]), blink: blinkAt(lt), mouth: .8 });
    if (lt > 2.2 && lt < 3.0) gait(p, x / 40, 1 - Math.abs(lt - 2.6) / .5 * .3);
    // hang the ball
    const k = kf(lt, [[0, 0], [.3, 0], [1.2, 1], [1.5, 1], [2.1, 0]]);
    if (lt < 2.2) { const r = reachN(pose({ ...p }), 1, s4[0], s4[1] + 10).armR; p.armR = mixArm(restA, r, k); p.look = [.6, -.6 * k]; }
    // counting: point along the branches
    if (lt > 3 && lt < 5.4) { const u = (lt - 3) / 2.4, sx = TREE_X + Math.sin(u * 9) * 150, sy = lerp(-150, -560, u); reachN(p, 1, lerp(x + 120, sx, smooth(3, 3.4, lt)), lerp(-300, sy, smooth(3, 3.4, lt))); p.mouth = talk(lt); p.look = [.5, -.5 - u * .5]; }
    if (lt >= 5.4) {
      const sad = smooth(6.0, 6.6, lt) * (1 - smooth(8.1, 8.4, lt));
      p.earDrop = sad; p.mouth = sad > .3 ? -1 : .8; p.look = [.6, -1 + sad * .6];
      p.armR = mixArm(reachN(pose({ ...p }), 1, TREE_X, -640).armR, restA, smooth(5.9, 6.4, lt));
      if (lt > 8.2) { p.brows = 1; p.mouth = 1; p.armR = mixArm(restA, [2.7, .25], smooth(8.25, 8.55, lt)); p.look = [0, -.3]; }
    }
    drawNika(ctx, p, E.t);
    if (lt < 1.4) { const h = nHands(p)[1]; Wd.ball(ctx, h[0], h[1] - 4, 24, lt); }
    sparkle(ctx, s4[0], s4[1], (lt - 1.35) / .6, 50, 4);
    const top = slotW(TOP);
    bubble(ctx, top[0] + 70, top[1] - 70, smooth(5.5, 5.9, lt) * (1 - smooth(8.3, 8.6, lt)), '?');
    sparkle(ctx, x + 50 * NS, -560 * NS, (lt - 8.3) / .7, 70, 9);
  },
  iris: () => null
};

// ——————————————————— S2 · В путь ———————————————————
const runX = lt => { const k = clamp((lt - 1.1) / 3.9); return 40 + 2900 * (k * k * .45 + k * .55); };
const S2 = {
  a: 9, b: 14,
  cam: lt => { const x = runX(lt); return { H: [lerp(150, x + 150, smooth(1.0, 2.0, lt)), -360, 1600 + smooth(1, 3, lt) * 200], V: [lerp(150, x + 60, smooth(1.0, 2.0, lt)), -380, 950] }; },
  caps: [[9.7, 13.6, 'Ника отправляется на поиски']],
  draw(ctx, lt, E) {
    plaza(ctx, E.t, E.cam);
    for (let i = 0; i < 6; i++) { const lx = 1600 + i * 520; Wd.lamp(ctx, lx, 10); if (i < 5) Wd.garland(ctx, lx, -400, lx + 520, -400, 50, E.t, i); }
    Wd.mounds(ctx, 1300, 4600, 30, 8, 30);
    const x = runX(lt), p = pose({ x, s: NS, turn: kf(lt, [[0, .2], [1, .7]]), hat: kf(lt, [[.2, 0], [.8, 1]]), mouth: 1, blink: blinkAt(lt, 2), look: [.8, 0] });
    if (lt < 1.0) { const k = win(lt, .05, .95, .25); for (const s of [-1, 1]) { const r = reachN(pose({ ...p }), s, x + s * 45 * NS, -470 * NS); if (s < 0) p.armL = mixArm(restA, r.armL, k); else p.armR = mixArm(restA, r.armR, k); } }
    else gait(p, (x - 40) / 70, smooth(1.1, 1.5, lt), 1);
    drawNika(ctx, p, E.t);
  },
  iris: lt => [runX(lt), -330]
};

// ——————————————————— S3 · Варя, будущий вратарь ———————————————————
const yard = (ctx, E) => {
  par(ctx, E.cam, .3, () => Wd.cityFar(ctx, -2400, 2400, -300, 21));
  Wd.houses(ctx, -1700, 1800, -80, 21);
  Wd.ground(ctx);
  Wd.pine(ctx, -1050, 20, 1.4); Wd.pine(ctx, 950, 20, 1.6); Wd.pine(ctx, 1250, 30, 1.2);
  Wd.lamp(ctx, -620, 10);
  Wd.mounds(ctx, -1600, 1600, 40, 12, 26);
  Wd.goal(ctx, 330, 0);
  snowball(ctx, 560, -14, 15); snowball(ctx, 590, -12, 14); snowball(ctx, 575, -36, 13);
};
const S3 = {
  a: 14, b: 25,
  cam: lt => ({ H: kf(lt, [[0, [330, -330, 1450]], [2.3, [250, -330, 1700]], [4.6, [180, -330, 1450]], [7.0, [220, -320, 1650]], [9, [260, -320, 1400]]]),
    V: kf(lt, [[0, [330, -300, 800]], [2.3, [160, -340, 1050]], [4.6, [150, -330, 880]], [7.0, [200, -330, 1000]], [9, [360, -320, 800]]]) }),
  caps: [[14.4, 18.4, 'Варя мечтает стоять в воротах'], [19.6, 24.6, 'Чудо № 1:\nнастоящие вратарские перчатки']],
  draw(ctx, lt, E) {
    yard(ctx, E);
    // —— Варя ——
    let vx = kf(lt, [[4.6, 330], [5.4, 235], [6.5, 235], [7.1, 330], [7.75, 330], [8.2, 425], [8.7, 410]]);
    const vy = -hump(lt, 8.1, .45) * 90;
    const v = ppose({ x: vx, y: vy, turn: -.2, blink: blinkAt(lt, 1), mouth: .3, gloves: lt > 6.0 ? 1 : 0 });
    let sbx = null, sby = null; // her own snowball (toss)
    if (lt < 2.3) {
      const up = kf(lt, [[.4, -210], [1.0, -560], [1.6, -300]], k => k < .5 ? eo(k * 2) / 2 : .5 + ei((k - .5) * 2) / 2);
      sbx = vx + 10; sby = lt < .4 ? -205 : up;
      if (lt < .55) { reachP('varya', v, -1, vx - 6, -205); reachP('varya', v, 1, vx + 6, -205); }
      else if (lt < 1.6) { const k = smooth(.9, 1.3, lt); v.armL = mixArm(restA, [2.5, .3], k); v.armR = mixArm(restA, [2.2, .4], k); v.look = [0, -1]; v.mouth = .7; v.turn = -.4; }
      if (lt >= 1.6) { sbx = null; v.blink = 1; v.mouth = -1; v.tilt = Math.sin(lt * 30) * .12 * (1 - smooth(1.8, 2.3, lt)); v.sad = 1; }
    }
    if (lt > 2.6 && lt < 6) { v.look = [-1, 0]; v.turn = -.5; v.mouth = lt < 4.8 ? .65 : .9; v.brows = 1; }
    if (lt > 4.6 && lt < 5.4) gait(v, vx / 25, 1);
    if (lt > 6.5 && lt < 7.1) gait(v, vx / 25, 1);
    if (lt > 6.0 && lt < 6.6) { bounce(v, lt, 3, 22); v.armL = v.armR = [2.6, .3]; v.mouth = 1; v.blink = 1; }
    const catchP = [430, -330];
    if (lt > 7.6 && lt < 8.2) { const k = smooth(7.6, 7.95, lt); v.lean = .45 * k; v.look = [1, -.4]; reachP('varya', v, 1, catchP[0], catchP[1]); reachP('varya', v, -1, catchP[0] - 10, catchP[1] + 18); v.mouth = .8; }
    if (lt >= 8.2) {
      v.lean = .45 * (1 - smooth(8.2, 8.6, lt)); v.mouth = 1;
      const hi = smooth(8.7, 9.1, lt), tx = lerp(catchP[0], vx, hi), ty = lerp(catchP[1], -440, hi);
      reachP('varya', v, 1, tx + 8, ty); reachP('varya', v, -1, tx - 8, ty + 6);
      if (lt > 9.1) { bounce(v, lt, 2.2, 20); v.blink = blinkAt(lt) || (lt > 9.6 ? 1 : 0); }
    }
    // —— Ника ——
    const nx = kf(lt, [[2.4, -900], [4.6, 60], [6.4, 60], [7.0, -60]]);
    const n = pose({ x: nx, s: NS, turn: .5, mouth: .9, blink: blinkAt(lt, 3), look: [.6, 0] });
    if (lt > 2.4 && lt < 4.6) gait(n, nx / 60, 1);
    if (lt > 6.4 && lt < 7.0) gait(n, -nx / 60, .7);
    if (lt > 3.9 && lt < 4.7) { n.armR = [2.6 + Math.sin(lt * 18) * .25, .4]; n.handR = 'open'; }
    let gloves = null;
    if (lt > 4.7 && lt < 6.0) {
      const k = smooth(4.7, 5.1, lt);
      n.armR = mixArm([-.4, .5], reachN(pose({ ...n }), 1, 175, -250).armR, k);
      const h = nHands(n)[1];
      gloves = lt < 5.6 ? h : [lerp(h[0], vx - 5, smooth(5.6, 5.95, lt)), lerp(h[1], -220, smooth(5.6, 5.95, lt))];
      if (lt > 5.6) { reachP('varya', v, -1, gloves[0] - 12, gloves[1]); reachP('varya', v, 1, gloves[0] + 12, gloves[1]); }
    }
    // the throw
    let sb2 = null;
    if (lt > 6.9 && lt < 7.7) {
      if (lt < 7.25) reachN(n, 1, nx + 60, -40); else if (lt < 7.5) n.armR = mixArm([.2, .4], [-1.0, -.2], smooth(7.25, 7.5, lt)); else n.armR = mixArm([-1.0, -.2], [2.2, .2], smooth(7.5, 7.65, lt));
      n.mouth = 1; n.brows = .6; sb2 = nHands(n)[1];
    }
    if (lt > 9.0) { const cl = Math.abs(Math.sin(lt * 9)); reachN(n, -1, nx - 10 - cl * 30, -300 * NS); reachN(n, 1, nx + 10 + cl * 30, -300 * NS); n.blink = 1; }
    drawNika(ctx, n, E.t);
    drawPerson(ctx, 'varya', v, E.t);
    if (sbx !== null) snowball(ctx, sbx, sby, 15);
    puff(ctx, vx, -320, (lt - 1.6) / .7, 50);
    if (gloves) gloveItem(ctx, gloves[0], gloves[1], 1);
    sparkle(ctx, gloves ? gloves[0] : 0, gloves ? gloves[1] : 0, (lt - 4.75) / .6, 60, 5);
    sparkle(ctx, vx, -200, (lt - 5.95) / .7, 110, 6);
    if (sb2) snowball(ctx, sb2[0], sb2[1], 14);
    if (lt >= 7.65 && lt < 8.2) { const k = (lt - 7.65) / .55; snowball(ctx, lerp(nx + 60, catchP[0], k), lerp(-420, catchP[1], k) - Math.sin(k * Math.PI) * 120, 14); }
    if (lt >= 8.2) { const h = personHands('varya', v); snowball(ctx, (h[0][0] + h[1][0]) / 2, (h[0][1] + h[1][1]) / 2 - 12, 15); }
    sparkle(ctx, catchP[0], catchP[1], (lt - 8.2) / .8, 120, 7);
  },
  iris: lt => [330, -300]
};

// ——————————————————— S4 · Михалыч и билеты ———————————————————
const CATCH = [[-60, -320], [60, -420], [180, -340], [300, -440], [420, -330], [520, -400]], CT0 = 3.3, CDT = .45;
const tixPos = (i, lt) => {
  const ts = 2.6 + i * .06, tc = CT0 + i * CDT, [cx, cy] = CATCH[i];
  if (lt < ts) return null;
  const u = clamp((lt - ts) / (tc - ts)), P0 = [150, -250], P1 = [150 + (cx - 150) * .2 + Math.sin(i * 2.3) * 260, -700 - (i % 3) * 60];
  const x = (1 - u) ** 2 * P0[0] + 2 * u * (1 - u) * P1[0] + u * u * cx, y = (1 - u) ** 2 * P0[1] + 2 * u * (1 - u) * P1[1] + u * u * cy;
  return [x, y, (lt - ts) * (5 + i), u >= 1];
};
const S4 = {
  a: 25, b: 36,
  cam: lt => ({ H: kf(lt, [[0, [-60, -330, 1900]], [2.4, [0, -330, 1800]], [3.2, [180, -360, 1600]], [6, [150, -330, 1500]], [8.6, [120, -320, 1300]], [11, [170, -300, 1200]]]),
    V: kf(lt, [[0, [-150, -360, 1000]], [2.4, [-60, -360, 950]], [3.2, [200, -380, 1000]], [6, [150, -340, 900]], [8.6, [80, -330, 850]], [11, [200, -300, 780]]]) }),
  caps: [[25.4, 28.4, 'Михалыч хранит билеты\nза 30 лет'], [28.6, 31.4, 'Варя спасает коллекцию'], [31.6, 34.2, 'Чудо № 2:\nприглашение на матч'], [34.4, 35.8, '…а Михалыч дарит Варе свёрток']],
  draw(ctx, lt, E) {
    par(ctx, E.cam, .3, () => Wd.cityFar(ctx, -2600, 2600, -200, 31));
    par(ctx, E.cam, .55, () => { ctx.save(); ctx.translate(0, -60); ctx.scale(.7, .7); Wd.houses(ctx, -2600, 2600, 0, 31); ctx.restore(); });
    Wd.ground(ctx);
    Wd.pine(ctx, -800, 10, 1.5); Wd.pine(ctx, -520, -10, 1.1); Wd.pine(ctx, 760, 10, 1.6); Wd.pine(ctx, 1050, 0, 1.2);
    Wd.lamp(ctx, -280, 0, 440);
    Wd.mounds(ctx, -1600, 1600, 50, 41, 26);
    Wd.bench(ctx, 150, 0, 330);
    // wind gust streaks
    const gust = win(lt, 2.5, 3.6, .2);
    if (gust > 0) { ctx.strokeStyle = `rgba(255,255,255,${.6 * gust})`; ctx.lineWidth = 5; ctx.lineCap = 'round'; const R = rng(5); for (let i = 0; i < 14; i++) { const y = -100 - R() * 600, x = -900 + ((lt - 2.5) * 2600 + R() * 1800) % 2200; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 120, y - 20, x + 240, y); ctx.stroke(); } }
    // —— Михалыч ——
    const g = ppose({ x: 150, sit: 1, seat: 100, turn: .1, mouth: .45, look: [0, .6], blink: blinkAt(lt, 4) });
    const fan = [150, -200];
    let gotTix = lt > 6.6, gold = null, gift = [40, -128], giftHeld = 0;
    if (lt < 2.6) { reachP('grandpa', g, -1, fan[0] - 18, fan[1]); reachP('grandpa', g, 1, fan[0] + 18, fan[1]); }
    else if (lt < 6.4) { g.mouth = .8; g.brows = 1; g.look = [.8, -.6]; g.armL = [1.2, .5]; g.armR = [1.5, .4]; }
    else { reachP('grandpa', g, -1, fan[0] - 18, fan[1] + 6); reachP('grandpa', g, 1, fan[0] + 18, fan[1] + 6); g.mouth = .5; }
    if (lt > 7.8 && lt < 8.7) { g.mouth = 1; g.blink = 1; g.brows = 1; bounce(g, lt, 2, 6); }
    if (lt > 8.6) {
      g.turn = .5; g.look = [1, 0]; g.mouth = .9;
      const k1 = smooth(8.6, 9.0, lt), k2 = smooth(9.3, 9.8, lt);
      gift = [lerp(lerp(40, 120, k1), 255, k2), lerp(lerp(-128, -250, k1), -175, k2)];
      reachP('grandpa', g, -1, ...(k2 < 1 ? gift : [130, -240]));
      giftHeld = k2;
    }
    // —— Варя ——
    const vxK = [[0, -850], [2.4, -260], [CT0, -60]];
    CATCH.forEach(([cx], i) => { if (i) vxK.push([CT0 + i * CDT, cx]); });
    vxK.push([6.0, 520], [6.5, 270], [9.0, 270]);
    const vx = kf(lt, vxK, lin);
    let vy = 0; CATCH.forEach(([, cy], i) => { vy -= hump(lt, CT0 + i * CDT, .22) * Math.max(0, -cy - 250); });
    const v = ppose({ x: vx, y: vy, gloves: 1, turn: .3, mouth: .7, blink: blinkAt(lt, 2) });
    if (lt < 2.4 || (lt > 6.0 && lt < 6.5)) { gait(v, vx / 25, 1); if (lt > 6) v.flip = -1; }
    let caught = 0, nextI = -1;
    CATCH.forEach((c, i) => { if (lt >= CT0 + i * CDT) caught = i + 1; else if (nextI < 0) nextI = i; });
    if (lt > 2.6 && lt < 5.7 && nextI >= 0) { const tp = tixPos(nextI, lt) || [150, -250]; reachP('varya', v, 1, tp[0], tp[1]); reachP('varya', v, -1, tp[0] - 14, tp[1] + 10); v.look = [.6, -1]; v.mouth = 1; v.lean = .15; }
    if (lt >= 6.4) { v.flip = -1; v.turn = .3; reachP('varya', v, 1, lt < 6.75 ? 175 : 230, lt < 6.75 ? -230 : -200); }
    if (lt > 9.4) { reachP('varya', v, -1, gift[0] - 24, gift[1] + 6); reachP('varya', v, 1, gift[0] + 24, gift[1] + 6); v.blink = lt > 10 ? 1 : 0; v.mouth = 1; if (lt > 10) bounce(v, lt, 1.5, 8); }
    // —— Ника ——
    const nx = kf(lt, [[0, -1050], [2.4, -420], [6.5, -420], [7.2, -70], [8.5, -70], [9.1, -230]]);
    const n = pose({ x: nx, s: NS, turn: .5, mouth: .9, blink: blinkAt(lt, 5), look: [.7, 0] });
    if (lt < 2.4 || (lt > 6.5 && lt < 7.2) || (lt > 8.5 && lt < 9.1)) gait(n, nx / 60, 1);
    if (lt > 2.8 && lt < 6) { n.look = [.7, -.8]; n.mouth = 1; n.brows = 1; n.armL = n.armR = [1.3, .4]; }
    if (lt > 7.1 && lt < 8.3) { const k = smooth(7.1, 7.5, lt); n.armR = mixArm(restA, reachN(pose({ ...n }), 1, 70, -300).armR, k); gold = lt < 7.8 ? nHands(n)[1] : null; }
    if (lt >= 7.8) { if (lt < 8.6) reachP('grandpa', g, 1, 120, -290); }
    // draw
    if (!giftHeld) Wd.present(ctx, gift[0], gift[1], 28);
    drawPerson(ctx, 'grandpa', g, E.t);
    const gh = personHands('grandpa', g);
    if (lt < 2.6) for (let i = 0; i < 6; i++) Wd.ticket(ctx, fan[0] - 25 + i * 10, fan[1] - 26, -.5 + i * .2, .9);
    if (gotTix) for (let i = 0; i < 3; i++) Wd.ticket(ctx, (gh[0][0] + gh[1][0]) / 2 + i * 4, gh[0][1] - 20 - i * 3, .1 * i, .9);
    if (lt >= 7.8) Wd.ticket(ctx, gh[1][0] + 8, gh[1][1] - 30, -.3, 1, 1);
    drawNika(ctx, n, E.t);
    drawPerson(ctx, 'varya', v, E.t);
    const vh = personHands('varya', v);
    if (caught && lt < 6.75) for (let i = 0; i < caught; i++) Wd.ticket(ctx, vh[1][0] + i * 3, vh[1][1] - 16 - i * 4, .2 - i * .08, .85);
    for (let i = 0; i < 6; i++) { const tp = tixPos(i, lt); if (tp && !tp[3]) Wd.ticket(ctx, tp[0], tp[1], Math.sin(tp[2]) * 1.2, .95); }
    CATCH.forEach((c, i) => sparkle(ctx, c[0], c[1], (lt - CT0 - i * CDT) / .5, 50, 20 + i));
    if (gold) Wd.ticket(ctx, gold[0], gold[1] - 20, -.2, 1.1, 1);
    sparkle(ctx, 100, -300, (lt - 7.2) / .7, 80, 31);
    if (giftHeld) Wd.present(ctx, gift[0], gift[1], 28);
    sparkle(ctx, gift[0], gift[1], (lt - 9.8) / .8, 90, 33);
  },
  iris: () => [270, -200]
};

// ——————————————————— S5 · Студенты на остановке ———————————————————
const rideX = lt => lt < 4.8 ? kf(lt, [[2.0, -1300], [3.4, 40]], eo) : 40 + 760 * ((lt - 4.8) - (1 - Math.exp(-(lt - 4.8) * 1.6)) / 1.6);
function busStop(ctx, x, t) {
  ctx.save(); ctx.translate(x, 0);
  blob(ctx, rrect(-210, -430, 420, 30, 10), '#2b3a8f', { lw: 5 });
  blob(ctx, rrect(-200, -400, 400, 330, 6), 'rgba(170,200,255,.25)', { lw: 4, line: '#2b3a8f', shade: false });
  for (const s of [-1, 1]) Wd.ground && blob(ctx, rrect(s * 200 - 8, -400, 16, 400, 6), '#2b3a8f', { lw: 4, shade: false });
  blob(ctx, rrect(-220, -446, 440, 22, 10), '#ffffff', { lw: 0, shade: false });
  blob(ctx, rrect(-160, -520, 320, 64, 10), '#11153f', { lw: 5, line: '#0a0d2a', shade: false });
  ctx.save(); ctx.translate(0, -488); ctx.font = '900 21px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#ff9a2a'; ctx.shadowBlur = 10; ctx.fillStyle = '#ffab3a'; ctx.fillText('АВТОБУСОВ БОЛЬШЕ НЕТ', 0, 2); ctx.restore();
  limb(ctx, [[-120, -460], [-120, -520]], 6, '#2b3a8f'); limb(ctx, [[120, -460], [120, -520]], 6, '#2b3a8f');
  blob(ctx, rrect(-150, -120, 300, 18, 8), '#8a5a3a', { lw: 4 });
  ctx.restore();
}
import { limb } from './lib.js';
function ropeAndBells(ctx, n, sx, t, dir = 1) {
  const a = [n.x - dir * 30 * NS, -190 * NS - n.bob * NS], b = [sx + dir * 215, -64];
  ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 30, ...b); ctx.stroke();
  for (let i = 1; i <= 3; i++) { const u = i / 4, bx = lerp(a[0], b[0], u), by = lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * 26 + Math.sin(t * 20 + i) * 3; blob(ctx, ell(bx, by + 10, 11, 11), PAL.gold, { lw: 3, line: '#a07a10' }); }
}
const sprays = (ctx, sx, t, k, dir = 1) => { if (k <= 0) return; const R = rng(9); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 16; i++) { const ph = (t * 2.2 + R()) % 1; ctx.globalAlpha = (1 - ph) * k; ctx.beginPath(); ctx.arc(sx - dir * (210 + ph * 160 + R() * 40), -10 - ph * 70 * R(), 6 + ph * 12, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; };
const S5 = {
  a: 36, b: 47,
  cam: lt => {
    const x = rideX(lt);
    if (lt < 4.8) return { H: kf(lt, [[0, [330, -330, 1450]], [2.0, [200, -330, 1700]], [3.4, [40, -330, 1800]], [4.8, [-120, -330, 1800]]]), V: kf(lt, [[0, [330, -330, 850]], [2.0, [200, -340, 1000]], [3.4, [0, -330, 1100]], [4.8, [-160, -330, 1100]]]) };
    const k = smooth(4.8, 5.8, lt);
    return { H: [lerp(-120, x - 200, k), -330, 1800], V: [lerp(-160, x - 180, k), -330, 1100] };
  },
  caps: [[36.4, 39.8, 'Последний автобус ушёл…'], [41.2, 46.4, 'Чудо № 3:\nновогодние сани!']],
  draw(ctx, lt, E) {
    par(ctx, E.cam, .25, () => Wd.cityFar(ctx, -2600, 11000, -200, 51));
    par(ctx, E.cam, .55, () => Wd.houses(ctx, -2600, 12000, -60, 52));
    Wd.ground(ctx);
    for (let i = -3; i < 16; i++) { const lx = -600 + i * 640; Wd.lamp(ctx, lx, 10); Wd.garland(ctx, lx, -400, lx + 640, -400, 55, E.t, i + 3); }
    Wd.mounds(ctx, -2000, 11000, 40, 53, 26);
    busStop(ctx, 330, E.t);
    const nx = rideX(lt), sxC = nx - 330;
    const ride = lt > 4.8;
    // students
    const lz = ppose({ x: 260, sit: 1, seat: 120, mouth: -1, sad: 1, look: [.3, .5], blink: blinkAt(lt, 6), turn: -.1 });
    const tm = ppose({ x: 420, mouth: -1, sad: 1, look: [-.2, .3], blink: blinkAt(lt, 7), turn: -.2 });
    reachP('timur', tm, -1, 380, -200);
    if (lt > 2.6) { lz.sad = tm.sad = 0; lz.mouth = tm.mouth = .8; lz.brows = tm.brows = 1; lz.look = tm.look = [-1, 0]; lz.turn = tm.turn = -.5; }
    if (lt > 3.5) {
      const k = smooth(3.6, 4.4, lt);
      lz.x = lerp(260, sxC - 110, k); tm.x = lerp(420, sxC + 50, k);
      lz.sit = k < 1 ? 0 : 1; lz.seat = 64; tm.seat = 64;
      if (k > 0 && k < 1) { gait(lz, lz.x / 25, 1); gait(tm, tm.x / 25, 1); }
      tm.sit = smooth(4.4, 4.7, lt); lz.sit = Math.max(lz.sit, tm.sit);
      if (lt < 4.45) lz.sit = 0;
    }
    if (ride) { lz.x = sxC - 110; tm.x = sxC + 50; const w = Math.sin(E.t * 9); lz.armL = [2.6 + w * .2, .3]; lz.armR = [2.5 - w * .2, .3]; tm.armR = [2.6 - w * .2, .3]; tm.armL = [1.6, .6]; lz.mouth = tm.mouth = 1; lz.look = tm.look = [.6, -.2]; lz.turn = tm.turn = .3; bounce(lz, E.t, 3, 5); bounce(tm, E.t + .2, 3, 5); }
    // Ника + sled
    const n = pose({ x: nx, s: NS, turn: .75, mouth: 1, blink: blinkAt(lt, 8), look: [1, 0] });
    if (lt > 2.0 && lt < 3.4) gait(n, nx / 80, 1, 1);
    if (lt >= 3.4 && lt < 4.8) { n.turn = -.2; n.look = [-.6, 0]; n.armR = [2.6 + Math.sin(lt * 16) * .25, .4]; n.handR = 'open'; }
    if (ride) gait(n, nx / 90, smooth(4.8, 5.2, lt), 1);
    Wd.sled(ctx, sxC, 0, 1);
    if (lt > 3.6 && !ride && lz.sit < 1 && lz.x > 0) {}
    if (lt < 3.6) { drawPerson(ctx, 'liza', lz, E.t); drawPerson(ctx, 'timur', tm, E.t); }
    else { drawPerson(ctx, 'liza', lz, E.t); drawPerson(ctx, 'timur', tm, E.t); }
    // tangerine net bag
    const th = personHands('timur', tm)[0];
    blob(ctx, ell(th[0], th[1] + 26, 26, 30), 'rgba(255,140,40,.25)', { lw: 3, line: '#ff8a2a', shade: false });
    for (let i = 0; i < 4; i++) blob(ctx, ell(th[0] - 10 + (i % 2) * 20, th[1] + 18 + (i >> 1) * 20, 11, 11), '#ff9a2a', { lw: 2, line: '#c2601a', shade: false });
    if (lt < 4.6) for (const [px, py, sd] of [[lz.x + 20, -255 + (lz.sit ? 0 : -60), 1], [tm.x + 20, -395, 2]]) if (lt < 2.6) steam(ctx, px, py, E.t, sd);
    ropeAndBells(ctx, n, sxC, E.t);
    drawNika(ctx, n, E.t);
    sprays(ctx, sxC, E.t, ride ? 1 : (lt > 2 && lt < 3.4 ? 1 : 0));
  },
  iris: lt => [rideX(lt) - 200, -280]
};

// ——————————————————— S6 · Семья у телевизора ———————————————————
const WIN = { x: -520, y: -640, w: 600, h: 360 };
function tvScreen(ctx, x, y, w, h, t, state) {
  blob(ctx, rrect(x - w / 2 - 10, y - h / 2 - 10, w + 20, h + 20, 10), '#2a2a36', { lw: 4, shade: false });
  ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip();
  if (state === 'on') {
    ctx.fillStyle = '#2a5ad6'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 12); ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x, y + h / 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i < 3 ? '#e8263a' : '#ffffff'; ctx.beginPath(); ctx.arc(x + Math.sin(t * 1.3 + i * 1.7) * w * .38, y + Math.cos(t * 1.1 + i * 2.1) * h * .3, 5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffd04a'; ctx.beginPath(); ctx.arc(x + Math.sin(t * 2.2) * w * .4, y + Math.sin(t * 3.1) * h * .3, 4, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(120,160,255,.15)'; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.globalCompositeOperation = 'source-over';
  } else if (state === 'static') {
    const R = rng(Math.floor(t * 30)); ctx.fillStyle = '#777'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    for (let i = 0; i < 300; i++) { ctx.fillStyle = R() < .5 ? '#ddd' : '#333'; ctx.fillRect(x - w / 2 + R() * w, y - h / 2 + R() * h, 4, 3); }
  } else { ctx.fillStyle = '#14141c'; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x - w / 2 + 8, y - h / 2 + 6, w * .3, h * .2); }
  ctx.restore();
}
const S6 = {
  a: 47, b: 57,
  cam: lt => ({ H: kf(lt, [[0, [-180, -520, 1450]], [2.3, [-160, -520, 1500]], [3.6, [60, -440, 1900]], [6.2, [120, -440, 1900]], [7.4, [40, -470, 1750]]]),
    V: kf(lt, [[0, [-220, -470, 780]], [2.3, [-170, -470, 850]], [3.6, [260, -440, 1150]], [6.2, [300, -440, 1050]], [7.4, [80, -440, 1200]]]) }),
  caps: [[48.9, 51.3, 'У Соколовых погас телевизор'], [51.5, 54.1, 'Студенты чинят антенну'], [54.3, 56.9, 'Все к арене,\nсмотреть салют!']],
  draw(ctx, lt, E) {
    // facade
    blob(ctx, rrect(-1400, -1500, 2800, 1520, 0), '#6c5aa6', { lw: 0, shade: false });
    ctx.fillStyle = 'rgba(0,0,0,.07)'; for (let y = -1500; y < 0; y += 34) ctx.fillRect(-1400, y, 2800, 3);
    const R = rng(61);
    for (let r = 0; r < 3; r++) for (let c = -4; c <= 4; c++) { const wx = c * 300 - 70, wy = -1380 + r * 330; if (r === 2 && c >= -2 && c <= 1) continue; blob(ctx, rrect(wx, wy, 150, 190, 10), R() < .6 ? PAL.win : '#3a2f6a', { lw: 5, line: '#2a2050', shade: false }); blob(ctx, rrect(wx - 10, wy + 186, 170, 16, 6), '#ffffff', { lw: 0, shade: false }); }
    // the family window
    const tvState = lt < 1.8 ? 'on' : lt < 2.3 ? 'static' : lt < 6.0 ? 'off' : 'on';
    ctx.save(); ctx.beginPath(); ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h); ctx.clip();
    ctx.fillStyle = '#f6c98a'; ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    ctx.fillStyle = 'rgba(200,120,60,.25)'; for (let x = WIN.x; x < WIN.x + WIN.w; x += 40) for (let y = WIN.y; y < WIN.y + WIN.h; y += 40) { ctx.beginPath(); star(ctx, x + 20, y + 20, 6, 3, 6); ctx.fill(); }
    // tiny tree in the corner
    ctx.save(); ctx.translate(WIN.x + 50, WIN.y + WIN.h); ctx.scale(.35, .35); Wd.pine(ctx, 0, 0, 1); ctx.restore();
    blob(ctx, rrect(WIN.x + 70, WIN.y + 220, 330, 130, 30), '#c63a4f', { lw: 5 }); // sofa
    const fam = [['mom', -360, 1], ['dad', -260, 3], ['boy', -165, 5]].map(([n, x, sd]) => {
      const p = ppose({ x, y: WIN.y + WIN.h + 20, s: .6, sit: 1, seat: 120, turn: .5, look: [1, 0], mouth: .7, blink: blinkAt(lt, sd), noShadow: 1 });
      const cheer = lt < 1.8 || (lt > 6.0);
      if (cheer) { bounce(p, E.t + sd * .3, 2.4, n === 'boy' ? 22 : 10); p.armL = [2.5, .3]; p.armR = [2.6 + Math.sin(E.t * 10 + sd) * .2, .3]; p.mouth = 1; }
      else if (lt > 2.0) { p.mouth = -1; p.sad = 1; if (n === 'dad') { reachP('dad', p, -1, x - 25, WIN.y + 130); reachP('dad', p, 1, x + 25, WIN.y + 130); } }
      if (lt > 7.4) { p.turn = -.3; p.look = [0, .2]; p.armR = [2.6 + Math.sin(E.t * 12 + sd) * .3, .3]; p.handR = 'open'; if (n === 'boy') p.armR = [1.7, 0]; }
      return [n, p];
    });
    fam.forEach(([n, p]) => drawPerson(ctx, n, p, E.t));
    tvScreen(ctx, WIN.x + WIN.w - 80, WIN.y + 230, 100, 70, E.t, tvState);
    blob(ctx, rrect(WIN.x + WIN.w - 110, WIN.y + 275, 60, 90, 6), '#7a4a32', { lw: 4, shade: false });
    if (tvState === 'on') { ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(WIN.x + WIN.w - 80, WIN.y + 230, 10, WIN.x + WIN.w - 80, WIN.y + 230, 300); gl.addColorStop(0, 'rgba(120,160,255,.35)'); gl.addColorStop(1, 'rgba(120,160,255,0)'); ctx.fillStyle = gl; ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    blob(ctx, rrect(WIN.x, WIN.y, WIN.w, WIN.h, 4), 'rgba(0,0,0,0)', { lw: 14, line: '#ffffff', shade: false });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(WIN.x + WIN.w / 2 - 6, WIN.y, 12, WIN.h);
    blob(ctx, rrect(WIN.x - 20, WIN.y + WIN.h, WIN.w + 40, 24, 8), '#ffffff', { lw: 3, line: '#c8d2f2' });
    // balcony + dish
    blob(ctx, rrect(170, -330, 420, 34, 6), '#d9dcef', { lw: 5, line: '#4a4f7a' });
    ctx.strokeStyle = '#2b2f55'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(176, -420); ctx.lineTo(584, -420); for (let x = 190; x <= 580; x += 34) { ctx.moveTo(x, -420); ctx.lineTo(x, -330); } ctx.stroke();
    blob(ctx, rrect(160, -432, 440, 16, 8), '#ffffff', { lw: 0, shade: false });
    const rot = lt < 1.75 ? 0 : lt < 5.4 ? 1.1 + Math.sin((lt - 1.75) * 18) * .2 * Math.exp(-(lt - 1.75) * 5) : kf(lt, [[5.4, 1.1], [6.0, 0]], back);
    ctx.save(); ctx.translate(470, -432); ctx.rotate(rot);
    limb(ctx, [[0, 0], [0, -40]], 8, '#9aa0c0');
    blob(ctx, ell(-8, -60, 22, 48, -.25), '#e8e9f3', { lw: 5, line: '#6a6f9a', sd: [8, 0] });
    limb(ctx, [[-8, -60], [26, -66]], 4, '#6a6f9a'); blob(ctx, ell(28, -66, 7, 7), '#4a4f7a', { lw: 0, shade: false });
    if (lt > 1.75 && lt < 5.4) blob(ctx, ell(-8, -98, 26, 14), '#ffffff', { lw: 3, line: '#c8d2f2', shade: false });
    ctx.restore();
    ctx.strokeStyle = '#2b2f55'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(470, -420); ctx.quadraticCurveTo(300, -380, WIN.x + WIN.w + 6, -500); ctx.stroke();
    // falling snow clump
    if (lt > 1.4 && lt < 1.75) { const k = (lt - 1.4) / .35; blob(ctx, ell(462, lerp(-1500, -500, k * k), 30, 22), '#ffffff', { lw: 3, line: '#c8d2f2' }); }
    puff(ctx, 462, -500, (lt - 1.75) / .6, 60);
    Wd.ground(ctx); Wd.mounds(ctx, -1500, 1500, 40, 63, 26);
    Wd.lamp(ctx, -820, 10);
    // sled arrives
    const nx = kf(lt, [[2.4, -1500], [4.2, 720]], eo), sxC = nx - 330;
    const lz = ppose({ x: sxC - 110, sit: 1, seat: 64, mouth: .8, look: [.6, -.6], blink: blinkAt(lt, 6), turn: .3 });
    const tm = ppose({ x: sxC + 50, sit: 1, seat: 64, mouth: .8, look: [.6, -.6], blink: blinkAt(lt, 7), turn: .3 });
    if (lt > 4.2) { tm.sit = 1 - smooth(4.2, 4.55, lt) + smooth(6.6, 7.0, lt); tm.y = -64 * (1 - tm.sit) ; tm.seat = 64 - 64 * 0; }
    if (lt > 4.55 && lt < 6.6) { const k = smooth(4.6, 5.1, lt); tm.armR = mixArm(restA, reachP('timur', ppose({ ...tm }), 1, 455 + Math.sin(rot) * 50, -470).armR, k); tm.armL = [.6, .4]; tm.look = [.4, -1]; tm.mouth = .5; }
    if (lt > 5.9) { lz.armL = lz.armR = [2.6, .3]; lz.mouth = 1; bounce(lz, E.t, 2.5, 6); }
    if (lt > 7.4) { lz.look = tm.look = [-.6, -.6]; }
    const n = pose({ x: nx, s: NS, turn: .7, mouth: 1, blink: blinkAt(lt, 8), look: [1, 0] });
    if (lt > 2.4 && lt < 4.2) gait(n, nx / 90, 1, 1);
    if (lt > 4.2) { n.turn = -.3; n.look = [-.6, -.8]; n.mouth = lt > 6 ? 1 : .6; if (lt > 6.0) { n.armL = n.armR = [2.5, .3]; bounce(n, E.t, 2, 10); } }
    Wd.sled(ctx, sxC, 0, 1);
    drawPerson(ctx, 'liza', lz, E.t); drawPerson(ctx, 'timur', tm, E.t);
    ropeAndBells(ctx, n, sxC, E.t);
    drawNika(ctx, n, E.t);
    sprays(ctx, sxC, E.t, lt > 2.4 && lt < 4.2 ? 1 : 0);
    sparkle(ctx, 455, -480, (lt - 6.0) / .7, 90, 62);
  },
  iris: () => [300, -300]
};

// ——————————————————— S7 · Все вместе ———————————————————
// positions shared with S8
const FIN = { nika: 640, liza: 1060, timur: 1190, mom: -700, dad: -590, boy: -470, grandpa: -250, varya: 120 };
const S7 = {
  a: 57, b: 68,
  cam: lt => ({ H: kf(lt, [[0, [150, -420, 2900]], [3.6, [150, -420, 2900]], [4.6, [380, -420, 1800]], [6.6, [330, -420, 1700]], [7.4, [430, -470, 1500]], [9.2, [250, -430, 2600]], [11, [250, -430, 2600]]]),
    V: kf(lt, [[0, [-900, -440, 1150]], [1.8, [-500, -440, 1150]], [3.0, [750, -440, 1150]], [3.6, [150, -480, 1750]], [4.6, [380, -470, 1050]], [6.6, [300, -460, 1000]], [7.4, [460, -520, 950]], [9.2, [330, -520, 1500]], [11, [330, -520, 1500]]]) }),
  caps: [[57.5, 61.2, 'Все случайно собрались\nу арены'], [62.4, 66.4, 'Тот самый мяч!']],
  draw(ctx, lt, E) {
    const lit = smooth(8.3, 9.4, lt);
    plaza(ctx, E.t, E.cam, { lit, topBall: lt > 8.05 });
    drawS7cast(ctx, lt, E);
  },
  iris: () => null
};
function drawS7cast(ctx, lt, E, s8 = null) {
  const T = E.t, cheer = s8 ? 0 : smooth(9.2, 9.5, lt);
  // family
  const fam = ['mom', 'dad', 'boy'].map((n, i) => {
    const x = s8 ? FIN[n] : kf(lt, [[.3, -1700 + i * 110], [3.0, FIN[n]]]);
    const p = ppose({ x, turn: .4, mouth: .7, blink: blinkAt(lt, i + 1), look: [1, 0] });
    if (!s8 && lt < 3.0) gait(p, x / 25 + i, 1);
    if (!s8 && lt > 3.2 && lt < 4.4) { p.armR = [2.6 + Math.sin(T * 12 + i) * .3, .3]; p.handR = 'open'; }
    if (!s8 && lt > 5.4 && lt < 9) { p.mouth = .9; p.brows = 1; p.look = [1, -.5]; }
    return [n, p];
  });
  // grandpa + Варя
  const gx = s8 ? FIN.grandpa : kf(lt, [[1.0, -1600], [3.6, FIN.grandpa]]);
  const g = ppose({ x: gx, turn: .4, mouth: .6, blink: blinkAt(lt, 4), look: [1, 0] });
  const vx = s8 ? FIN.varya : kf(lt, [[1.0, -1450], [3.6, -110], [4.4, -110], [5.0, FIN.varya]]);
  const v = ppose({ x: vx, gloves: 1, turn: .4, mouth: .8, blink: blinkAt(lt, 2), look: [1, 0] });
  if (!s8 && lt < 3.6) { gait(g, gx / 30, .8); gait(v, vx / 25, 1); }
  if (!s8 && lt > 4.4 && lt < 5.0) gait(v, vx / 25, 1);
  if (!s8 && lt > 3.6 && lt < 4.4) { g.armR = [2.5 + Math.sin(T * 10) * .3, .3]; }
  // students
  const lzx = s8 ? FIN.liza : kf(lt, [[0, 2050], [2.2, 1130], [2.6, 1130], [3.2, FIN.liza]]), tmx = s8 ? FIN.timur : kf(lt, [[0, 2210], [2.2, 1290], [2.6, 1290], [3.2, FIN.timur]]);
  const off = s8 ? 1 : smooth(2.5, 2.7, lt);
  const lz = ppose({ x: lzx, flip: -1, turn: .3, sit: 1 - off, seat: 64, mouth: .9, blink: blinkAt(lt, 6), look: [1, 0] });
  const tm = ppose({ x: tmx, flip: -1, turn: .3, sit: 1 - off, seat: 64, mouth: .9, blink: blinkAt(lt, 7), look: [1, 0] });
  if (!s8 && lt > 2.7 && lt < 3.2) { gait(lz, lzx / 25, 1); gait(tm, tmx / 25, 1); }
  if (!s8 && lt > 3.4 && lt < 4.4) { lz.armR = tm.armR = [2.6 + Math.sin(T * 12) * .3, .3]; lz.handR = 'open'; }
  // Ника
  let nx = s8 ? FIN.nika : kf(lt, [[0, 1700], [2.2, 900], [4.4, 900], [5.2, FIN.nika], [7.3, FIN.nika], [7.95, 585], [8.6, 610], [9.2, FIN.nika]], lin);
  let ny = (!s8 && lt > 7.3 && lt < 8.6) ? -Math.sin((lt - 7.3) / 1.3 * Math.PI) * 330 : 0;
  const n = pose({ x: nx, y: ny, s: NS, flip: -1, turn: .5, mouth: .9, blink: blinkAt(lt, 8), look: [1, 0] });
  if (!s8 && (lt < 2.2 || (lt > 4.4 && lt < 5.2))) gait(n, nx / 80, 1, lt < 2.2 ? 1 : 0);
  if (!s8 && lt > 3.4 && lt < 4.4) { n.armR = [2.6 + Math.sin(T * 14) * .3, .4]; n.handR = 'open'; }
  if (!s8 && lt > 5.2 && lt < 6.4) { reachN(n, 1, 470, -650); n.earDrop = smooth(5.2, 5.6, lt); n.mouth = -1; n.look = [1, -1]; }
  if (!s8 && lt > 6.4 && lt < 7.3) { n.earDrop = 1 - smooth(6.4, 6.8, lt); n.look = [1, 0]; n.mouth = 1; n.brows = 1; if (lt > 7.0) n.squash = smooth(7.0, 7.25, lt); }
  // the ball: unwrap → throw → catch → hook
  let ballP = null;
  const vh = personHands('varya', v);
  if (!s8 && lt > 4.4 && lt < 6.85) {
    const cx = (vh[0][0] + vh[1][0]) / 2;
    reachP('varya', v, -1, vx - 24, -175); reachP('varya', v, 1, vx + 24, -175);
    v.look = [0, .5]; v.mouth = lt > 5.6 ? 1 : .6; v.brows = lt > 5.6 ? 1 : 0;
    if (lt < 5.4) Wd.present && 0;
    ballP = [vx, -180];
  }
  if (!s8 && lt >= 6.85 && lt < 7.95) {
    const k = smooth(6.85, 7.2, lt);
    v.armR = mixArm([-.8, -.3], [2.5, .2], smooth(7.1, 7.3, lt)); v.look = [1, -.6]; v.mouth = 1;
    if (lt < 7.25) { const h = personHands('varya', v)[1]; ballP = [h[0], h[1] - 10]; }
    else { const u = (lt - 7.25) / .7; ballP = [lerp(vx + 40, 490, u), lerp(-330, -600, u) - Math.sin(u * Math.PI) * 220]; }
  }
  if (!s8 && lt >= 7.95 && lt < 8.05) { ballP = [430, -600]; }
  if (!s8 && lt > 7.3 && lt < 8.6) {
    n.squash = lt < 7.4 ? -.4 : 0; n.lean = -.1; n.mouth = 1;
    n.armL = [2.3, .3];
    if (lt < 8.15) reachN(n, 1, ...(ballP && lt < 7.95 ? ballP : [420, -612]), 1);
    else n.armR = [2.6, .3];
    if (lt > 8.4) n.squash = 1 - smooth(8.45, 8.7, lt);
  }
  if (cheer > 0) {
    for (const [, p] of fam) { p.armL = p.armR = [2.6, .3]; bounce(p, T + p.x * .01, 2, 14); p.mouth = 1; p.look = [.5, -.6]; }
    for (const p of [g, v, lz, tm]) { p.armL = [2.6, .3]; p.armR = [2.5 + Math.sin(T * 10 + p.x) * .2, .3]; p.mouth = 1; p.look = [.3, -.6]; }
    bounce(v, T, 2.2, 18); bounce(lz, T + .3, 2, 10); bounce(tm, T + .6, 2, 10);
    n.armL = n.armR = [2.6, .3]; bounce(n, T, 2, 20); n.blink = 1; n.mouth = 1;
  }
  if (s8) s8({ fam, g, v, lz, tm, n });
  // sled (empty) stays at the right
  const sxC = s8 ? 1300 : kf(lt, [[0, 2030], [2.2, 1230]]);
  ctx.save(); ctx.translate(sxC, 0); ctx.scale(-1, 1); Wd.sled(ctx, 0, 0, 1); ctx.restore();
  if (!s8 && lt < 2.6) { ropeAndBells(ctx, n, sxC, T, -1); }
  for (const [nn, p] of fam) drawPerson(ctx, nn, p, T);
  drawPerson(ctx, 'grandpa', g, T);
  drawPerson(ctx, 'liza', lz, T); drawPerson(ctx, 'timur', tm, T);
  drawNika(ctx, n, T);
  drawPerson(ctx, 'varya', v, T);
  if (!s8 && lt > 1 && lt < 5.6) { const vv = personHands('varya', v); const k = smooth(5.0, 5.6, lt); if (k < 1) Wd.present(ctx, lt < 4.4 ? (vv[0][0] + vv[1][0]) / 2 : vx, lt < 4.4 ? vv[0][1] - 4 : -180, 28, k); }
  if (!s8 && lt > 5.0 && lt < 6.2) { const k = (lt - 5.0) / 1.2; for (let i = 0; i < 4; i++) { const a = i * 1.6 + .5; blob(ctx, rrect(vx + Math.cos(a) * 160 * k - 14, -200 + Math.sin(a) * 90 * k - 120 * k + 260 * k * k - 10, 28, 20, 5), PAL.red, { lw: 3, line: '#8a1424', shade: false }); } }
  if (ballP) Wd.ball(ctx, ballP[0], ballP[1], 26, T * 3);
  if (!s8 && lt > 7.95 && lt < 8.05 && ballP) {}
  sparkle(ctx, vx, -190, (lt - 5.5) / .8, 120, 71);
  sparkle(ctx, 420, -612, (lt - 8.05) / .8, 160, 72);
  return { n };
}

// ——————————————————— S8 · Куранты ———————————————————
const NY = 3.8; // local time of midnight
export const BURSTS = (() => { const R = rng(88), out = []; for (let i = 0; i < 16; i++) out.push([NY + .05 + i * .26 + R() * .15, -900 + R() * 2200, -1000 - R() * 450, [PAL.red, '#5a7bff', PAL.gold, '#ffffff', PAL.red, '#3f5aff'][i % 6], 200 + R() * 140, i]); return out; })();
const S8 = {
  a: 68, b: 76,
  cam: lt => ({ H: kf(lt, [[0, [250, -430, 2600]], [.8, [60, -470, 1500]], [3.7, [60, -470, 1500]], [4.6, [250, -640, 2500]], [8, [250, -620, 2500]]]),
    V: kf(lt, [[0, [330, -520, 1500]], [.8, [60, -540, 950]], [3.7, [60, -540, 950]], [4.6, [260, -720, 1600]], [8, [260, -700, 1600]]]) }),
  caps: [[72.1, 75.9, 'С Новым годом!']],
  dyn: lt => { if (lt < .3 || lt > NY - .05) return null; const n = 10 - Math.floor((lt - .3) / ((NY - .3) / 10)); const a = []; for (let k = Math.min(10, n + 2); k >= n; k--) a.push(k + '…'); return a.join(' '); },
  draw(ctx, lt, E) {
    const T = E.t;
    // sky fireworks behind the arena
    BURSTS.forEach(([t0, x, y, c, r, i]) => { Wd.rocket(ctx, x + 40, -300, x, y, (lt - t0 + .7) / .7, c); Wd.burst(ctx, x, y, lt - t0, c, r, i + 3); });
    plaza(ctx, T, E.cam, { lit: 1, topBall: true, screen: (c, w, h) => {
      if (lt < .3) return defScreen(c, w, h, T);
      if (lt < NY) { const n = 10 - Math.floor((lt - .3) / ((NY - .3) / 10)), f = ((lt - .3) / ((NY - .3) / 10)) % 1; c.save(); c.scale(1 + (1 - f) * .25, 1 + (1 - f) * .25); Wd.ledText(c, String(Math.max(1, n)), 120, '#ffd04a', 0); c.restore(); return; }
      const fl = Math.sin(lt * 12) > 0; Wd.ledText(c, '2027', 112, fl ? '#ff4a5e' : '#7d9bff', 0);
    } });
    drawS7cast(ctx, lt, E, ({ fam, g, v, lz, tm, n }) => {
      const up = lt < NY;
      for (const [, p] of fam) { p.look = [up ? -.3 : 0, up ? -1 : 0]; }
      for (const p of [g, v, lz, tm]) p.look = [-.4, -1];
      n.look = [1, -1];
      if (up) { n.mouth = .7; return; }
      const k = smooth(NY, NY + .4, lt);
      // hugs
      const [mom, dad, boy] = fam.map(f => f[1]);
      reachP('mom', mom, 1, dad.x - 20, -300); reachP('dad', dad, -1, mom.x + 20, -300); reachP('dad', dad, 1, boy.x - 10, -230); mom.armL = [2.5, .3]; boy.armL = boy.armR = [2.6, .3];
      mom.lean = .12 * k; dad.lean = -.06 * k; bounce(boy, T, 2.2, 20);
      reachP('grandpa', g, 1, v.x - 20, -230); g.lean = .1 * k; reachP('varya', v, -1, g.x + 30, -240); v.armR = [2.6, .3];
      reachP('liza', lz, 1, tm.x + 25, -330); reachP('timur', tm, 1, lz.x - 25, -330); lz.lean = -.1 * k; tm.lean = .1 * k; tm.armL = lz.armL = [2.6, .3];
      for (const p of [mom, dad, g, v, lz, tm]) { p.mouth = 1; p.blink = 1; p.look = [0, 0]; }
      n.armL = n.armR = [2.6, .3]; bounce(n, T, 2, 24); n.mouth = 1; n.blink = blinkAt(lt); n.look = [0, 0]; n.turn = 0;
    });
    Wd.confetti(ctx, -1100, 1600, -1100, lt, NY, 160, 5);
  },
  iris: () => [FIN.nika, -330]
};

// ——————————————————— S9 · Финал (screen space) ———————————————————
// logo area kept empty (screen pixels), per format
export const S9B = (() => { const R = rng(91), o = []; for (let i = 0; i < 10; i++) o.push([-.6 + i * .55 + R() * .2, R(), R(), R()]); return o; })();
export const LOGO = { H: [1100, 560, 420, 420], V: [330, 210, 420, 420] };
const S9 = {
  a: 76, b: 82, screen: true,
  caps: [],
  draw(ctx, lt, E) {
    const { W, H, V } = E, T = E.t, u = W / (V ? 1080 : 1920);
    Wd.sky(ctx, W, H, 1);
    const L = V ? LOGO.V : LOGO.H;
    // fireworks outside the logo area
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(L[0] - 40, L[1] - 40, L[2] + 80, L[3] + 80); ctx.clip('evenodd');
    S9B.forEach(([t0, rx, ry, rr], i) => Wd.burst(ctx, rx * W, (.12 + ry * .35) * H, lt - t0, [PAL.red, '#5a7bff', PAL.gold, '#ffffff'][i % 4], (150 + rr * 120) * u, 40 + i));
    ctx.restore();
    // bokeh garland lights + glow behind Ника + snow drifts
    const RB = rng(93); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) { const x = RB() * W, y = (.55 + RB() * .35) * H, r = (18 + RB() * 40) * u, c = ['255,90,110', '90,130,255', '255,210,90'][i % 3];
      const L2 = V ? LOGO.V : LOGO.H; if (x > L2[0] * u - r && x < (L2[0] + L2[2]) * u + r && y > L2[1] * u - r && y < (L2[1] + L2[3]) * u + r) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${.35 + .2 * Math.sin(T * 2 + i)})`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    const gx = V ? W * .5 : W * .29, gg = ctx.createRadialGradient(gx, H * .55, 20 * u, gx, H * .55, 520 * u); gg.addColorStop(0, 'rgba(255,200,120,.28)'); gg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    ctx.fillStyle = '#dfe6ff'; ctx.beginPath(); ctx.ellipse(W * .2, H * 1.0, W * .55, H * .1, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(W * .85, H * 1.01, W * .5, H * .12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = PAL.snow; ctx.beginPath(); ctx.ellipse(W * .5, H * 1.03, W * .9, H * .09, 0, 0, TAU); ctx.fill();
    // Ника, big, waving
    const s = (V ? 1.95 : 1.75) * u, nxs = V ? W * .5 : W * .29, nys = V ? H * 1.06 : H * 1.12;
    const k = back(clamp(lt / .6));
    const n = pose({ x: nxs, y: nys + (1 - k) * 300 * u, s, turn: V ? 0 : .25, mouth: 1, blink: blinkAt(lt, 3), look: V ? [0, .1] : [.2, 0], tilt: Math.sin(T * 2) * .04 });
    n.armR = [1.95, 1.05 + Math.sin(T * 9) * .35]; n.handR = 'open'; n.armL = [.45, .6]; n.brows = .5;
    drawNika(ctx, n, T);
    // titles
    const pop = (t0) => back(clamp((lt - t0) / .45));
    const t1 = pop(.5), t2 = pop(.9);
    const tx = V ? W * .5 : L[0] + L[2] / 2, ty1 = V ? L[1] + L[3] + 150 * u : L[1] - 330 * u, ty2 = ty1 + (V ? 120 : 125) * u;
    title(ctx, 'С Новым годом!', tx, ty1, (V ? 104 : 112) * u, t1, '#ffffff', '#1d2a9e');
    title(ctx, 'Твой ЦСКА', tx, ty2, (V ? 92 : 96) * u, t2, '#ffffff', '#e8263a');
  }
};
function title(ctx, txt, x, y, size, k, fill, line) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.font = `900 ${size}px Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * .22; ctx.strokeStyle = line; ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); ctx.restore();
}
export { title };
export const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9];
// transitions: iris close at the end of these scenes / open at the start of the next
export const IRIS_AFTER = new Set([1, 2, 3, 4, 5, 7]);
