// Sets and props for the 3D film: room, city, arena, doorways, sled, presents, tree, snow, sparkles.
import * as THREE from 'three';
import { M } from './chars.js';
import { mulberry, clamp, lerp } from './lib.js';

const TAU = Math.PI * 2;
export const RED = '#e3243a', BLUE = '#2438d0', GOLD = '#f5c04a';
export const mesh = (g, m, cast = true, recv = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = recv; return o; };
export function ctex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.canvas = c; return t; }
export const glow = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
const box = (w, h, d, m, r = 0) => mesh(r ? roundBox(w, h, d, r) : new THREE.BoxGeometry(w, h, d), m);
export function roundBox(w, h, d, r, s = 4) {
  const sh = new THREE.Shape(), x = -w / 2, y = -h / 2;
  sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * .9, bevelSegments: s, curveSegments: s }); g.translate(0, 0, -(d - r * 2) / 2); return g;
}

// —— soft round sprite for snow / sparkles / bokeh ——
let _dot;
export function dotTex() { return _dot || (_dot = ctex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); })); }

// —— snow: falling flakes in a box, deterministic in t ——
export class Snow {
  constructor(n, b, size = .05, seed = 1, opacity = .9) {
    this.b = b; const R = mulberry(seed); this.base = []; const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.base.push([R(), R(), R(), .3 + R() * .7, R() * TAU]);
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.obj = new THREE.Points(this.geo, new THREE.PointsMaterial({ map: dotTex(), size, transparent: true, opacity, depthWrite: false, color: '#ffffff', sizeAttenuation: true }));
    this.obj.frustumCulled = false; this.wind = 0;
  }
  update(t, wind = this.wind) {
    const { x0, x1, y0, y1, z0, z1 } = this.b, H = y1 - y0, Wd = x1 - x0, p = this.geo.attributes.position.array;
    this.base.forEach(([u, v, w, sp, ph], i) => {
      const y = y0 + ((v * H - t * sp * .55) % H + H) % H;
      const x = x0 + (((u * Wd + Math.sin(t * .7 + ph) * .3 + t * wind * sp) % Wd) + Wd) % Wd;
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z0 + w * (z1 - z0) + Math.cos(t * .5 + ph) * .2;
    });
    this.geo.attributes.position.needsUpdate = true;
  }
}
// —— a burst of golden sparkles ——
export class Sparkles {
  constructor(n = 70, color = '#ffd36a', seed = 3, size = .06) {
    const R = mulberry(seed); this.d = []; for (let i = 0; i < n; i++) { const a = R() * TAU, e = Math.acos(1 - 2 * R()); this.d.push([Math.sin(e) * Math.cos(a), Math.cos(e) * .8 + .3, Math.sin(e) * Math.sin(a), .5 + R() * .8, R()]); }
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.mat = new THREE.PointsMaterial({ map: dotTex(), size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(color).multiplyScalar(2.2), toneMapped: false });
    this.obj = new THREE.Points(this.geo, this.mat); this.obj.frustumCulled = false; this.obj.visible = false;
  }
  update(t, t0, at, r = .8, dur = 1.4) {
    const a = t - t0; this.obj.visible = a > 0 && a < dur; if (!this.obj.visible) return;
    const k = 1 - Math.pow(1 - clamp(a / dur), 3), p = this.geo.attributes.position.array;
    this.d.forEach(([x, y, z, s, tw], i) => { p[i * 3] = at.x + x * r * k * s; p[i * 3 + 1] = at.y + y * r * k * s - a * a * .35; p[i * 3 + 2] = at.z + z * r * k * s; });
    this.geo.attributes.position.needsUpdate = true; this.mat.opacity = 1 - clamp((a - dur * .5) / (dur * .5)); this.mat.size = this.mat.userData.s0 || (this.mat.userData.s0 = this.mat.size);
  }
}
// —— twinkling bulbs (instanced) ——
export class Bulbs {
  constructor(points, r = .025, seed = 5, cols = ['#ffcf5a', '#ff4a5e', '#5a8bff', '#fff3d0']) {
    this.n = points.length; this.R = mulberry(seed); this.ph = points.map(() => this.R() * TAU); this.cols = points.map((_, i) => new THREE.Color(cols[i % cols.length]));
    this.obj = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), this.n);
    const m = new THREE.Matrix4(); points.forEach((p, i) => { m.makeTranslation(p[0], p[1], p[2]); this.obj.setMatrixAt(i, m); this.obj.setColorAt(i, this.cols[i]); });
    this.c = new THREE.Color();
  }
  update(t, on = 1) { for (let i = 0; i < this.n; i++) { const k = on * (.55 + .45 * Math.sin(t * 3 + this.ph[i])) * 2.4 + .08; this.c.copy(this.cols[i]).multiplyScalar(k); this.obj.setColorAt(i, this.c); } this.obj.instanceColor.needsUpdate = true; }
}

// —— handball with red/blue panels ——
let _ballTex;
export function ball(r = .1) {
  _ballTex = _ballTex || ctex(512, 256, (c, w, h) => { c.fillStyle = BLUE; c.fillRect(0, 0, w, h); c.fillStyle = RED; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(i * 128 + 64, h / 2 + (i % 2 ? 40 : -40), 52, 70, 0, 0, TAU); c.fill(); } c.strokeStyle = '#ffffff'; c.lineWidth = 6; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(i * 128 + 64, h / 2 + (i % 2 ? 40 : -40), 52, 70, 0, 0, TAU); c.stroke(); } });
  return mesh(new THREE.SphereGeometry(r, 32, 24), M('#ffffff', { map: _ballTex, roughness: .45, clearcoat: .5 }));
}
// —— present box with ribbon ——
export function present(w = .3, h = .25, d = .3, col = RED, rib = GOLD) {
  const g = new THREE.Group();
  g.add(box(w, h, d, M(col, { roughness: .35, clearcoat: .6, sheen: .3 }), Math.min(w, h, d) * .06));
  const rm = M(rib, { roughness: .25, metalness: .6 });
  const r1 = box(w * 1.01, h * 1.01, d * .14, rm); const r2 = box(w * .14, h * 1.01, d * 1.01, rm); g.add(r1, r2);
  for (const s of [-1, 1]) { const b = mesh(new THREE.TorusGeometry(Math.min(w, d) * .14, Math.min(w, d) * .04, 10, 24), rm); b.position.set(s * w * .1, h / 2 + .02, 0); b.rotation.set(0, Math.PI / 2, s * .5); b.scale.set(1, 1, .6); g.add(b); }
  g.children.forEach(o => o.position.y += h / 2 * (o.geometry.type === 'TorusGeometry' ? 0 : 1)); g.children.forEach(o => { if (o.geometry.type === 'TorusGeometry') o.position.y = h + .02; });
  return g;
}
// —— the big sled ——
export function sled(scale = 1, loaded = true) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const red = M(RED, { roughness: .35, clearcoat: .8 }), gold = M(GOLD, { roughness: .25, metalness: .8 }), wood = M('#7a4a2c', { roughness: .6 });
  // runners
  for (const s of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.1, .05, 0), new THREE.Vector3(.9, .05, 0), new THREE.Vector3(1.25, .2, 0), new THREE.Vector3(1.3, .55, 0), new THREE.Vector3(1.12, .7, 0)]);
    const r = mesh(new THREE.TubeGeometry(c, 40, .035, 10), gold); r.position.z = s * .45; g.add(r);
    for (const x of [-.8, -.2, .4]) { const p = mesh(new THREE.CylinderGeometry(.025, .025, .3, 8), gold); p.position.set(x, .2, s * .45); g.add(p); }
  }
  const tub = mesh(roundBox(2.0, .45, 1.05, .12), red); tub.position.set(-.1, .55, 0); body.add(tub);
  const back = mesh(roundBox(.18, .55, 1.05, .08), red); back.position.set(-1.05, .95, 0); body.add(back);
  const trim = mesh(new THREE.BoxGeometry(2.02, .06, 1.07), gold); trim.position.set(-.1, .78, 0); body.add(trim);
  // shafts for pulling
  const shafts = new THREE.Group(); g.add(shafts);
  for (const s of [-1, 1]) { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(.85, .62, s * .42), new THREE.Vector3(1.6, .72, s * .4), new THREE.Vector3(2.3, .8, s * .36)]); shafts.add(mesh(new THREE.TubeGeometry(c, 20, .03, 8), wood)); }
  const bells = []; for (let i = 0; i < 5; i++) { const b = mesh(new THREE.SphereGeometry(.045, 14, 10), gold); b.position.set(1.0 + i * .1, .74, (i % 2 ? 1 : -1) * .43); g.add(b); bells.push(b); }
  // load of presents
  const load = new THREE.Group(); body.add(load);
  if (loaded) {
    const R = mulberry(9), cols = [RED, BLUE, '#ffffff', BLUE, RED, GOLD];
    for (let i = 0; i < 14; i++) { const w = .28 + R() * .2, h = .22 + R() * .22, p = present(w, h, w, cols[i % 6], i % 3 ? GOLD : '#ffffff'); const lay = i < 7 ? 0 : 1; p.position.set(-.8 + (i % 7) * .26 + R() * .05, .75 + lay * .3, (R() - .5) * .55); p.rotation.y = R() * 1.5; load.add(p); }
    const sack = mesh(new THREE.SphereGeometry(.45, 32, 24), M('#c43048', { roughness: .9, sheen: .5 })); sack.scale.set(1.1, .9, .9); sack.position.set(-.55, 1.2, 0); load.add(sack);
  }
  g.scale.setScalar(scale);
  return { root: g, load, bells, shafts };
}

// —— christmas tree with bulbs & ornaments ——
export function xmasTree(h = 2.2, seed = 2) {
  const g = new THREE.Group(), R = mulberry(seed);
  const needle = M('#1f6b45', { roughness: .8, sheen: .6, sheenColor: new THREE.Color('#5fbf8a') });
  const tiers = 5; const pts = [];
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers, r = (1 - k) * h * .38 + .08, hh = h * .3, y = .25 + k * h * .72;
    const c = mesh(new THREE.ConeGeometry(r, hh, 40, 1, true), needle); c.position.y = y + hh / 2; c.material.side = THREE.DoubleSide; g.add(c);
    const cap = mesh(new THREE.ConeGeometry(r * 1.02, .04, 40, 1, true), needle); cap.position.y = y + .02; g.add(cap);
    for (let j = 0; j < 14; j++) { const a = j / 14 * TAU + i, rr = r * .92; pts.push([Math.cos(a) * rr, y + .06 + (j % 2) * .05, Math.sin(a) * rr]); }
    for (let j = 0; j < 5; j++) { const a = R() * TAU, rr = r * .8, b = mesh(new THREE.SphereGeometry(.05, 16, 12), M(j % 2 ? RED : BLUE, { roughness: .15, clearcoat: 1, metalness: .3 })); b.position.set(Math.cos(a) * rr, y + .12, Math.sin(a) * rr); g.add(b); }
  }
  const trunk = mesh(new THREE.CylinderGeometry(.07, .09, .3, 12), M('#5a3a22', { roughness: .8 })); trunk.position.y = .15; g.add(trunk);
  const pot = mesh(new THREE.CylinderGeometry(.22, .18, .25, 24), M(RED, { roughness: .4, clearcoat: .6 })); pot.position.y = .12; g.add(pot);
  const starS = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? .045 : .11; i ? starS.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : starS.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const star = mesh(new THREE.ExtrudeGeometry(starS, { depth: .03, bevelEnabled: true, bevelThickness: .01, bevelSize: .01 }), glow(GOLD, 1.6)); star.position.y = .25 + h * .98; g.add(star);
  const bulbs = new Bulbs(pts, .022, seed); g.add(bulbs.obj);
  const light = new THREE.PointLight('#ffb35a', 2.5, 5, 1.6); light.position.set(0, h * .55, .3); g.add(light);
  return { root: g, bulbs, light, star };
}

// —— wall scarf in club colours (text, not the emblem) ——
export function scarf(len = 1.4) {
  const t = ctex(1024, 128, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? RED : BLUE; c.fillRect(i * w / 16, 0, w / 16 + 1, h); } c.fillStyle = BLUE; c.fillRect(w * .3, 0, w * .4, h); c.fillStyle = '#ffffff'; c.font = '900 92px Nunito'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ЦСКА', w / 2, h / 2 + 4); });
  const g = new THREE.Group();
  const s = mesh(new THREE.BoxGeometry(len, .2, .02, 24, 1, 1), M('#ffffff', { map: t, roughness: .9, sheen: .6 }));
  const pa = s.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setY(i, pa.getY(i) - Math.cos(x / len * Math.PI) * .08 + .08); } s.geometry.computeVertexNormals(); g.add(s);
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) { const f = mesh(new THREE.CylinderGeometry(.006, .006, .08, 5), M(RED, { roughness: .9 })); f.rotation.z = Math.PI / 2; f.position.set(sx * (len / 2 + .04), -.07 + i * .023, 0); g.add(f); }
  return g;
}

// —— building facade with lit windows (city + doorways) ——
export function winTex(cols, rows, seed, litP = .6, warm = '#ffd38a') {
  const R = mulberry(seed);
  return ctex(cols * 32, rows * 40, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const on = R() < litP; c.fillStyle = on ? (R() < .15 ? '#ffb0b8' : R() < .2 ? '#b9c8ff' : warm) : '#0b0d1c'; c.fillRect(x * 32 + 7, y * 40 + 8, 18, 24); } });
}
export function building(w, h, d, col, seed, o = {}) {
  const g = new THREE.Group();
  const cols = Math.max(2, Math.round(w / .9)), rows = Math.max(2, Math.round(h / 1.1));
  const em = winTex(cols, rows, seed, o.lit ?? .55);
  const wall = M(col, { roughness: .85, emissiveMap: em, emissive: new THREE.Color('#ffffff'), emissiveIntensity: o.ei ?? 1.6 });
  const b = mesh(new THREE.BoxGeometry(w, h, d), wall, false, true); b.position.y = h / 2; g.add(b);
  const roof = mesh(new THREE.BoxGeometry(w * 1.04, .18, d * 1.04), M('#f2f5ff', { roughness: .9 }), false, true); roof.position.y = h + .09; g.add(roof);
  return g;
}

// —— letter (paper) with handwriting revealed by `k` ——
const clamp01 = k => Math.min(1, Math.max(0, k));
export const LETTER = ['Дедушка Мороз,', 'хочу, чтобы ЦСКА', 'встретил Новый год', 'со мной!'];
export function letter() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 1024; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const m = mesh(new THREE.PlaneGeometry(.21, .28, 8, 8), M('#ffffff', { map: tex, roughness: .9, side: THREE.DoubleSide }), true);
  let last = -1;
  const draw = k => {
    k = Math.round(k * 200) / 200; if (k === last) return; last = k;
    x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, 768, 1024);
    x.strokeStyle = 'rgba(90,120,200,.25)'; x.lineWidth = 3; for (let y = 160; y < 1000; y += 92) { x.beginPath(); x.moveTo(40, y); x.lineTo(728, y); x.stroke(); }
    x.font = '700 96px Caveat'; x.fillStyle = '#0f1a7a'; x.textBaseline = 'alphabetic';
    const total = LETTER.join('').length; let n = Math.floor(k * total);
    LETTER.forEach((l, i) => { const s = l.slice(0, Math.max(0, n)); n -= l.length; const words = s; if (words) { x.fillStyle = i === 1 && s.includes('ЦСКА') ? '#1d2a9e' : '#1d2a9e'; x.fillText(words, 60, 230 + i * 184); } });
    if (k > .97) { x.fillStyle = RED; x.font = '700 120px Caveat'; x.fillText('♥', 560, 950); x.fillStyle = BLUE; x.fillText('★', 420, 960); }
    x.fillStyle = '#e3243a'; x.fillRect(0, 0, 768, 18); x.fillStyle = '#2438d0'; x.fillRect(0, 18, 768, 10);
    tex.needsUpdate = true;
  };
  draw(0);
  // where the pen is for progress k, in the plane's local coords (for the pencil tip)
  const cursor = k => {
    x.font = '700 96px Caveat'; const total = LETTER.join('').length; let n = Math.floor(clamp01(k) * total), li = 0;
    while (li < LETTER.length - 1 && n > LETTER[li].length) { n -= LETTER[li].length; li++; }
    n = Math.min(n, LETTER[li].length); const px = 60 + x.measureText(LETTER[li].slice(0, n)).width, py = 230 + li * 184 - 22;
    return new THREE.Vector3((px / 768 - .5) * .21, (.5 - py / 1024) * .28, .002);
  };
  return { mesh: m, draw, cursor };
}

// —— sky dome gradient ——
export function skyDome(top, mid, bot, r = 120) {
  const t = ctex(16, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(.55, mid); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const m = mesh(new THREE.SphereGeometry(r, 32, 16, 0, TAU, 0, Math.PI / 2 + .2), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }), false, false);
  return m;
}
export function stars(n = 400, r = 100, seed = 4) { const R = mulberry(seed), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = R() * TAU, e = .15 + R() * 1.2; p[i * 3] = Math.cos(a) * Math.cos(e) * r; p[i * 3 + 1] = Math.sin(e) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const o = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex(), size: .9, transparent: true, depthWrite: false, fog: false, color: '#cfd8ff' })); o.frustumCulled = false; return o; }

// —— a firework burst made of points (additive) ——
export class Firework {
  constructor(col, n = 140, seed = 1) {
    const R = mulberry(seed); this.d = []; for (let i = 0; i < n; i++) { const a = R() * TAU, e = Math.acos(1 - 2 * R()); this.d.push([Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a), .8 + R() * .3]); }
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.mat = new THREE.PointsMaterial({ map: dotTex(), size: .35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(col).multiplyScalar(3), toneMapped: false, fog: false });
    this.obj = new THREE.Points(this.geo, this.mat); this.obj.frustumCulled = false; this.obj.visible = false;
  }
  update(age, at, r = 4) {
    this.obj.visible = age > 0 && age < 2.4; if (!this.obj.visible) return;
    const k = 1 - Math.pow(1 - Math.min(1, age / 1.0), 3), p = this.geo.attributes.position.array;
    this.d.forEach(([x, y, z, s], i) => { p[i * 3] = at.x + x * r * k * s; p[i * 3 + 1] = at.y + y * r * k * s - age * age * .6; p[i * 3 + 2] = at.z + z * r * k * s; });
    this.geo.attributes.position.needsUpdate = true; this.mat.opacity = 1 - clamp((age - 1.2) / 1.2);
  }
}

// hide points / instances whose screen position falls inside a rectangle (keeps the logo area clean)
const _v = new THREE.Vector3();
export function clipPoints(points, cam, rect, W, H) {
  const p = points.geometry.attributes.position, a = p.array; points.updateMatrixWorld();
  for (let i = 0; i < p.count; i++) { _v.set(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]).applyMatrix4(points.matrixWorld).project(cam); const x = (_v.x + 1) / 2 * W, y = (1 - _v.y) / 2 * H; if (x > rect[0] && x < rect[0] + rect[2] && y > rect[1] && y < rect[1] + rect[3]) { a[i * 3 + 1] = -999; } }
  p.needsUpdate = true;
}
export function clipInstances(im, cam, rect, W, H) {
  const m = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m); m.decompose(pos, q, sc); _v.copy(pos).project(cam); const x = (_v.x + 1) / 2 * W, y = (1 - _v.y) / 2 * H, r = 60; if (x > rect[0] - r && x < rect[0] + rect[2] + r && y > rect[1] - r && y < rect[1] + rect[3] + r) { m.compose(pos, q, sc.set(0, 0, 0)); im.setMatrixAt(i, m); } }
  im.instanceMatrix.needsUpdate = true;
}
