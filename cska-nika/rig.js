// Animation helpers: keyframes, gaits, arm IK for both rigs.
import { clamp, ease, lerp } from './lib.js';
import { dims } from './people.js';

// keys: [[t, v], ...] where v is a number or an array; eased between keys
export function kf(t, keys, ez = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1], k = ez((t - t0) / (t1 - t0 || 1));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}
export const lin = k => k;
// step-ish value: holds v until t
export function at(t, keys) { let v = keys[0][1]; for (const [tt, vv] of keys) if (t >= tt) v = vv; return v; }

// walking / running cycle; ph advances with distance
export function gait(p, ph, amt = 1, run = 0) {
  const s = Math.sin(ph), c = Math.cos(ph), A = amt;
  p.liftL = Math.max(0, s) * (16 + run * 26) * A; p.liftR = Math.max(0, -s) * (16 + run * 26) * A;
  p.legL = [.04 + s * .12 * A, Math.max(0, s) * .4 * A]; p.legR = [.04 - s * .12 * A, Math.max(0, -s) * .4 * A];
  const sw = (.35 + run * .35) * A;
  p.armL = [.22 - s * sw, .25 + run * .7]; p.armR = [.22 + s * sw, .25 + run * .7];
  p.bob = Math.abs(c) * (5 + run * 12) * A; p.lean = run * .1 * A;
  return p;
}
export function bounce(p, t, f = 2, h = 18) { const s = Math.abs(Math.sin(t * Math.PI * f)); p.bob = s * h; p.liftL = p.liftR = s * h * .6; return p; }

function ik2(sx, sy, L1, L2, tx, ty, side, bend = 1) {
  const dx = tx - sx, dy = ty - sy, d = Math.max(1, Math.min(Math.hypot(dx, dy), L1 + L2 - .5));
  const th = Math.atan2(side * dx, dy);
  const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const a1 = th + bend * al;
  const ex = sx + side * Math.sin(a1) * L1, ey = sy + Math.cos(a1) * L1;
  return [a1, Math.atan2(side * (tx - ex), ty - ey) - a1];
}
const toLocal = (p, wx, wy) => [(wx - p.x) / (p.s * p.flip), (wy - p.y) / p.s + p.bob];
// Ника: point a hand at a world position
export function reachN(p, side, wx, wy, bend = 1) {
  const [lx, ly] = toLocal(p, wx, wy);
  const a = ik2(side * 58, -250, 62, 66, lx, ly, side, bend);
  if (side < 0) p.armL = a; else p.armR = a; return p;
}
export function reachP(c, p, side, wx, wy, bend = 1) {
  const d = dims(c); let [lx, ly] = toLocal(p, wx, wy); ly -= p.sit * (d.leg - (p.seat ?? 100));
  const a = ik2(side * d.bw * .78, -d.leg - d.body + 22, d.arm, d.arm * .92 + 8, lx, ly, side, bend);
  if (side < 0) p.armL = a; else p.armR = a; return p;
}
// blend two arm poses
export const mixArm = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
export const blinkAt = (t, seed = 0) => { const ph = (t + seed * 1.7) % 3.3; return ph < .12 ? 1 : 0; };
export const talk = (t, on = 1) => on ? .35 + .45 * Math.abs(Math.sin(t * 11)) : .3;
