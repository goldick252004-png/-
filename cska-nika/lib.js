// Small Canvas2D helpers shared by the characters and scenes.
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
export const eo = k => 1 - Math.pow(1 - k, 3);
export const ei = k => k * k * k;
export const back = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
export const smooth = (a, b, x) => { const k = inv(a, b, x); return k * k * (3 - 2 * k); };
export const win = (t, a, b, f = .4) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ s >>> 15, 1 | s) + 0x6D2B79F5 | 0, s = s + Math.imul(s ^ s >>> 7, 61 | s) ^ s, (s ^ s >>> 14) >>> 0) / 4294967296); }

// hex colour helpers
const hx = c => { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
const toHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => lerp(v, B[i], k))); };
export const dark = (c, k = .3) => mix(c, '#1a1030', k);
export const light = (c, k = .3) => mix(c, '#ffffff', k);

// draw a filled shape with a soft darker outline and an inner rim shade
export function blob(ctx, path, fill, o = {}) {
  const lw = o.lw ?? 5, line = o.line ?? dark(fill, .45);
  ctx.beginPath(); path(ctx);
  ctx.fillStyle = fill; ctx.fill(o.rule || 'nonzero');
  if (o.shade !== false) {
    const [dx, dy] = o.sd || [-9, -11];
    ctx.save(); ctx.beginPath(); path(ctx); ctx.clip(o.rule || 'nonzero');
    ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000);
    ctx.save(); ctx.translate(dx, dy); path(ctx); ctx.restore();
    ctx.fillStyle = o.shadeCol || dark(fill, .22); ctx.globalAlpha = o.shadeA ?? .55; ctx.fill('evenodd');
    if (o.hi) { // a soft highlight on the opposite side
      ctx.beginPath(); ctx.rect(-5000, -5000, 10000, 10000);
      ctx.save(); ctx.translate(-dx * .7, -dy * .7); path(ctx); ctx.restore();
      ctx.fillStyle = light(fill, .35); ctx.globalAlpha = o.hi; ctx.fill('evenodd');
    }
    ctx.restore();
  }
  if (lw > 0) { ctx.beginPath(); path(ctx); ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
export const ell = (x, y, rx, ry, r = 0) => c => { c.moveTo(x + rx * Math.cos(r), y + rx * Math.sin(r)); c.ellipse(x, y, rx, ry, r, 0, TAU); };
export const rrect = (x, y, w, h, r) => c => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
export const poly = (pts, closed = true) => c => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (closed) c.closePath(); };
// smooth closed curve through points (Catmull-Rom → Bézier)
export const curve = (pts, closed = true, ten = 1) => c => {
  const n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6 * ten, p1[1] + (p2[1] - p0[1]) / 6 * ten, p2[0] - (p3[0] - p1[0]) / 6 * ten, p2[1] - (p3[1] - p1[1]) / 6 * ten, p2[0], p2[1]);
  }
  if (closed) c.closePath();
};
// a thick limb from a to b to c: stroke with outline
export function limb(ctx, pts, w, fill, line) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.strokeStyle = line || dark(fill, .45); ctx.lineWidth = w + 10; ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke();
}
export function star(c, x, y, r, r2 = r * .45, n = 5, rot = -Math.PI / 2) {
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r2 : r; i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}
