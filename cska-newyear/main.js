// «ЦСКА · С Новым годом!» — a paper pop-up book on a desk at night
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clamp, lerp, seg, ss, eio, eo, ei, back, spring, TAU, mulberry, hash, track } from './lib.js';
import * as A from './art.js';
import { cv, paperFill, GRAIN, INK } from './paper.js';
import { makeBook, texOf, BW, BD, PG } from './book.js';
import { cutMesh, particles, blobShadow, thread } from './cutmesh.js';
import { makePost } from './post.js';

const W = 1920, H = 1080, QS = new URLSearchParams(location.search);
export const DUR = 41.0;
// —— timeline ——
const T = {
  lamp: .3, open: [2.4, 4.6], rise0: 3.7,
  passes: [[8.0, 8.7, 'A', 'B'], [9.4, 10.1, 'B', 'C'], [10.8, 11.75, 'C', 'A'], [12.4, 13.1, 'A', 'B']],
  look: [14.9, 17.3], crouch: 17.35, jump: [17.7, 18.55], release: 17.95, top: 19.9, star: 20.0, garland: 20.35,
  turn: [22.5, 24.8], fold0: 22.2, rise1: 24.2,
  tab: [25.6, 29.6], flip: 30.0, fireworks: [30.15, 30.55, 30.95, 31.35, 31.75], banner: 31.6,
  fold1: 35.0, card: 37.4,
};

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const ov = document.getElementById('ov'), OX = ov.getContext('2d');
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, .004, 30);
const post = makePost(renderer, scene, cam, W, H);

// —— assets ——
await Promise.all(['800 40px Nunito', '900 40px Nunito', '700 40px Inter'].map(f => document.fonts.load(f, 'ЦСКА С Новым годом 2027')));
const AS = '/core/assets/polyhaven/';
const hdr = await new RGBELoader().loadAsync(AS + 'lythwood_lounge_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr; scene.background = hdr; scene.backgroundBlurriness = .25;
scene.backgroundRotation.set(0, 2.3, 0); scene.environmentRotation.set(0, 2.3, 0);
const tl = new THREE.TextureLoader();
const wt = n => { const t = tl.load(AS + `walnut_${n}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 1.4); t.anisotropy = 12; return t; };
const wdiff = wt('diff'); wdiff.colorSpace = THREE.SRGBColorSpace;
const deskMat = new THREE.MeshStandardMaterial({ map: wdiff, normalMap: wt('nor'), roughnessMap: wt('rough'), color: '#c9a88a', envMapIntensity: .8 });
const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, .04, 1.7), deskMat); desk.position.set(0, -.02, .25); desk.receiveShadow = true; scene.add(desk);
const gl = new GLTFLoader();
async function prop(name, x, z, s, ry) {
  const m = (await gl.loadAsync(AS + `${name}/${name}.gltf`)).scene; m.position.set(x, 0, z); m.scale.setScalar(s); m.rotation.y = ry;
  m.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); scene.add(m); return m;
}
const lampMats = [];
const lamp = await prop('desk_lamp_arm_01', -.347, .51, .55, -.76);
lamp.traverse(o => { if (o.isMesh && o.material.name.includes('light')) { o.material = o.material.clone(); o.material.emissive = new THREE.Color('#ffd9a0'); lampMats.push(o.material); } });
const LOGO = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = 'assets/logo-main.png'; });

// —— the book: blue cloth cover with a gold-foil star and title ——
function cover() {
  const w = 2048, h = Math.round(2048 * BD / BW), c = cv(w, h), x = c.getContext('2d'), m = cv(w, h), y = m.getContext('2d');
  x.fillStyle = '#16337f'; x.fillRect(0, 0, w, h);
  const R = mulberry(3);
  for (let i = 0; i < h; i += 3) { x.fillStyle = `rgba(0,0,0,${.05 + R() * .07})`; x.fillRect(0, i, w, 1.2); }
  for (let i = 0; i < w; i += 3) { x.fillStyle = `rgba(255,255,255,${.02 + R() * .04})`; x.fillRect(i, 0, 1.2, h); }
  y.fillStyle = 'rgb(0,235,0)'; y.fillRect(0, 0, w, h);
  const both = fn => { x.save(); fn(x, '#e0b456'); x.restore(); y.save(); fn(y, 'rgb(0,90,255)'); y.restore(); };
  both((k, col) => { k.strokeStyle = col; k.lineWidth = 10; k.strokeRect(90, 90, w - 180, h - 180); k.lineWidth = 4; k.strokeRect(120, 120, w - 240, h - 240); });
  both((k, col) => { k.fillStyle = col; k.beginPath(); const cx = w * .25, cy = h * .5; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 130 : 320; k.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } k.closePath(); k.fill(); });
  both((k, col) => { k.fillStyle = col; k.textAlign = 'center'; k.font = '900 260px Nunito'; k.fillText('ЦСКА', w * .64, h * .46); k.font = '800 110px Nunito'; k.fillText('Новогодняя книжка', w * .64, h * .66); });
  return { c, m };
}
const book = makeBook(cover()); scene.add(book.root);

// —— page art ——
const PW = 2048, PH = Math.round(2048 * BD / BW);
function page(fn, seed) { const c = cv(PW, PH), x = c.getContext('2d'); fn(x, mulberry(seed)); x.save(); x.globalAlpha = .6; x.fillStyle = x.createPattern(GRAIN, 'repeat'); x.fillRect(0, 0, PW, PH); x.restore(); return c; }
function grad(x, stops) { const g = x.createLinearGradient(0, 0, 0, PH); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, PW, PH); }
const PT = {
  sky0: texOf(page((x, R) => {
    grad(x, [[0, '#06163f'], [.55, '#0d2f7d'], [1, '#4a6fc0']]);
    for (let i = 0; i < 300; i++) { x.beginPath(); x.arc(R() * PW, R() * PH * .7, .8 + R() * 2.8, 0, TAU); x.fillStyle = `rgba(255,246,214,${.35 + R() * .6})`; x.fill(); }
    x.beginPath(); x.arc(PW * .8, PH * .22, 110, 0, TAU); x.fillStyle = '#fff3c9'; x.fill(); x.beginPath(); x.arc(PW * .8 + 46, PH * .22 - 26, 104, 0, TAU); x.fillStyle = '#0d2a6e'; x.fill();
    for (let k = 0; k < 2; k++) { x.beginPath(); x.moveTo(0, PH); for (let i = 0; i <= 20; i++) x.lineTo(i / 20 * PW, PH * (.72 + k * .08) - Math.sin(i * .9 + k * 2) * 40 - R() * 20); x.lineTo(PW, PH); x.closePath(); x.fillStyle = k ? '#a9bde6' : '#7e98d0'; x.fill(); }
    for (let i = 0; i < 26; i++) { x.fillStyle = '#ffd56a'; x.fillRect(R() * PW, PH * (.8 + R() * .12), 10, 12); }
  }, 1)),
  ground0: texOf(page((x, R) => {
    grad(x, [[0, '#dfe7f7'], [1, '#f4f7fd']]);
    for (let i = 0; i < 40; i++) { const px = R() * PW, py = R() * PH, r = 80 + R() * 220, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(150,170,215,.18)'); g.addColorStop(1, 'rgba(150,170,215,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, 2 * r, 2 * r); }
    for (let i = 0; i < 260; i++) { x.beginPath(); x.arc(R() * PW, R() * PH, 2 + R() * 4, 0, TAU); x.fillStyle = R() < .5 ? '#ffffff' : 'rgba(170,190,230,.6)'; x.fill(); }
  }, 2)),
  sky1: texOf(page((x, R) => {
    grad(x, [[0, '#0a1a4a'], [.6, '#16337f'], [1, '#2c4fa6']]);
    for (let i = 0; i < 220; i++) { x.beginPath(); x.arc(R() * PW, R() * PH, 1 + R() * 3.5, 0, TAU); x.fillStyle = `rgba(255,214,110,${.35 + R() * .6})`; x.fill(); }
    // bunting along the top
    const cols = [A.RED, '#ffffff', A.BLUE, A.GOLD];
    x.strokeStyle = INK; x.lineWidth = 5; x.beginPath(); x.moveTo(0, 60); x.quadraticCurveTo(PW / 2, 200, PW, 60); x.stroke();
    for (let i = 0; i < 18; i++) { const u = (i + .5) / 18, px = u * PW, py = 60 + 4 * u * (1 - u) * 140; x.beginPath(); x.moveTo(px - 44, py); x.lineTo(px + 44, py); x.lineTo(px, py + 90); x.closePath(); x.fillStyle = cols[i % 4]; x.fill(); x.lineWidth = 4; x.stroke(); }
  }, 3)),
  ground1: texOf(page((x, R) => {
    grad(x, [[0, '#e6ecf8'], [1, '#f7f9fd']]);
    const cols = [A.RED, A.BLUE, A.GOLD, '#ffffff', '#58b06a'];
    for (let i = 0; i < 420; i++) { x.save(); x.translate(R() * PW, R() * PH); x.rotate(R() * TAU); x.fillStyle = cols[(R() * 5) | 0]; x.fillRect(-9, -5, 18, 10); x.restore(); }
  }, 4)),
};
book.groundMat.map = PT.ground0; book.backMat.map = PT.sky0;

// —— pop-up pieces ——
const POPS = [];
const RISE = [T.rise0, T.rise1], FOLD = [T.fold0, T.fold1];
const dz = z => (.3 - z) * 1.2;
function popper(spread, parent, item, x, y, z, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const m = cutMesh(item, o); g.add(m); parent.add(g);
  const r = { g, m, spread, d: o.d ?? dz(z), dir: o.dir ?? (z > .15 ? -1 : 1), sway: o.sway || 0, ph: x * 40, t0: o.t0 };
  POPS.push(r); return r;
}
function riseOf(r, t) {
  const t0 = (r.t0 ?? RISE[r.spread]) + r.d, tf = FOLD[r.spread] + (.3 - r.g.position.z) * .6;
  return Math.min(back(seg(t, t0, t0 + .55), 1.7), 1 - ss(seg(t, tf, tf + .4)));
}
const S = book.stage, K = book.sky;
// spread 0: winter evening
popper(0, S, A.snowHill(.24, .05, 11), -.12, 0, .012); popper(0, S, A.snowHill(.26, .06, 12), .11, 0, .016);
for (let i = 0; i < 7; i++) popper(0, S, A.snowPine(.07 + (i % 3) * .015, 20 + i), -.21 + i * .07, 0, .03 + (i % 2) * .006, { sway: .012 });
popper(0, S, A.house(.045, 0), -.16, 0, .045); popper(0, S, A.house(.038, 1), .19, 0, .05);
const TREE_H = .17, TREE = [.1, 0, .075];
const tree = popper(0, S, A.bigTree(TREE_H), ...TREE, { sway: .006 });
const garl = popper(0, S, A.garland(TREE_H), TREE[0], 0, TREE[2] + .004, { t0: T.garland, d: 0, dir: -1 });
popper(0, S, A.goal(.07), -.15, 0, .085);
popper(0, S, A.snowman(.05), .19, 0, .17, { dir: -1 });
popper(0, S, A.snowHill(.12, .018, 31), -.19, 0, .275, { dir: -1 }); popper(0, S, A.snowHill(.1, .016, 32), .19, 0, .28, { dir: -1 });
// the star at the tree top
const STAR_P = [TREE[0], TREE_H * .965, TREE[2] + .006];
const star = cutMesh(A.bigStar(.017)); star.position.set(...STAR_P); S.add(star);
// spread 1: the year board, the tab
const boardP = [0, 0, .07];
const board = popper(1, S, A.boardFrame(.22, .1), ...boardP, { d: 0 });
const slats = [], digits = ['2', '0', '2', '6'];
for (let i = 0; i < 4; i++) {
  const g = new THREE.Group(); g.position.set(-.075 + i * .05, .05, .0035); board.m.add(g);
  const geo = new THREE.PlaneGeometry(.042, .06);
  const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texOf(A.digitCanvas(digits[i])), roughness: .9, side: THREE.FrontSide }));
  const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texOf(A.digitCanvas(i === 3 ? '7' : digits[i], true)), roughness: .9, side: THREE.BackSide }));
  f.castShadow = true; f.receiveShadow = b.receiveShadow = true; g.add(f, b); slats.push(g);
}
const tab = cutMesh(A.pullTab(.04)); tab.position.set(.115, .05, .004); board.m.add(tab);
// fireworks on the backdrop and the banner on strings
const FW = [[-.16, .14, .04, A.RED, A.GOLD], [.16, .15, .038, A.BLUE, '#ffffff'], [-.2, .245, .028, A.GOLD, A.RED], [.2, .25, .028, A.RED, '#ffffff'], [.07, .175, .025, A.BLUE, A.GOLD]].map(([x, y, r, c1, c2], i) => {
  const m = cutMesh(A.burst(r, c1, c2, 70 + i)); m.position.set(x, y, .02 + i * .003); m.visible = false; K.add(m); return { m, t0: T.fireworks[i] };
});
const banner = new THREE.Group(); { const it = A.banner(.24, 'С Новым годом!'); banner.add(cutMesh(it)); for (const sx of [-.07, .07]) { const th = thread(.3); th.position.set(sx, it.h * .2, -.0004); banner.add(th); } }
banner.position.set(0, .5, .05); banner.visible = false; K.add(banner);

// —— the players and the ball ——
const PH_ = .05, PAY = 1 - A.PL_FOOT / A.PL_H;
function makePlayer(hair, tail) {
  const c = cv(A.PL_W, A.PL_H); A.drawPlayer(c.getContext('2d'), { hair, tail });
  const t = texOf(c), w = PH_ * A.PL_W / A.PL_H, g = new THREE.PlaneGeometry(w, PH_); g.translate(0, PAY * PH_ * -1 + PH_ / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ map: t, alphaTest: .5, alphaToCoverage: true, roughness: .85, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: .5, side: THREE.DoubleSide });
  const root = new THREE.Group(), body = new THREE.Group(); body.add(mesh); root.add(body); S.add(root);
  const shadow = blobShadow(.012, .4); S.add(shadow);
  let key = '';
  return { root, body, shadow, hair, tail, pose(p) { const k = JSON.stringify(p, (kk, v) => typeof v === 'number' ? Math.round(v * 8) / 8 : v); if (k === key) return; key = k; A.drawPlayer(c.getContext('2d'), { hair, tail, ...p }); t.needsUpdate = true; },
    hand(p, side) { const [hx, hy] = A.handPos(p, side); return new THREE.Vector3((hx - 320) / A.PL_H * PH_, (A.PL_H - hy) / A.PL_H * PH_ - PAY * PH_, .002); } };
}
const PL = { A: makePlayer(0, -1), B: makePlayer(1, 1), C: makePlayer(2, 1) };
const SPOT0 = { A: [-.1, .165], B: [.0, .2], C: [.085, .16] }, SPOT1 = { A: [-.13, .2], B: [0, .225], C: [.13, .2] };
const ballM = cutMesh(A.ballArt(.0034)); S.add(ballM);

// —— particles: snow, confetti, sparkles, bauble lights ——
function spriteTex(fn, n = 64) { const c = cv(n, n), x = c.getContext('2d'); fn(x, n); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const glowTex = spriteTex((x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); });
const starTex = spriteTex((x, n) => { x.translate(n / 2, n / 2); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? n * .1 : n * .48; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); }, 128);
const quad = new THREE.PlaneGeometry(1, 1), camQ = new THREE.Quaternion();
const addMat = (map, col) => new THREE.MeshBasicMaterial({ map, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
function billboard(fn) { return (i, t) => { const p = fn(i, t); if (p) { const e = new THREE.Euler().setFromQuaternion(camQ); p.rx = e.x; p.ry = e.y; p.rz = e.z + (p.spin || 0); } return p; }; }
const PS = [];
const flakeTex = spriteTex((x, n) => { x.beginPath(); x.arc(n / 2, n / 2, n * .42, 0, TAU); x.fillStyle = '#fff'; x.fill(); x.lineWidth = n * .06; x.strokeStyle = 'rgba(160,175,210,.9)'; x.stroke(); });
const snow = particles(quad, new THREE.MeshStandardMaterial({ map: flakeTex, alphaTest: .5, roughness: .9, side: THREE.DoubleSide }), 160, billboard((i, t) => {
  const on = seg(t, T.rise0, T.rise0 + 1) * (1 - .6 * seg(t, T.turn[0], T.turn[1])) * (1 - seg(t, T.fold1, T.fold1 + .6)); if (on <= 0) return null;
  const R = mulberry(i * 7 + 3), sp = .012 + R() * .01, y = .26 - ((R() * .26 + t * sp) % .26);
  return { x: lerp(-.21, .21, R()) + Math.sin(t * .8 + i) * .006, y, z: lerp(.02, .29, R()), s: (.0018 + R() * .0016) * on, spin: t * (R() - .5) * 2 };
}));
S.add(snow); PS.push(snow);
const confCols = [A.RED, A.BLUE, A.GOLD, '#ffffff', '#58b06a'].map(c => new THREE.Color(c));
const conf = particles(quad, new THREE.MeshStandardMaterial({ roughness: .8, side: THREE.DoubleSide }), 220, (i, t) => {
  const R = mulberry(i * 11 + 5), t0 = T.flip + .1 + R() * 3.5, k = t - t0; if (k < 0 || t > T.fold1 + .8) return null;
  const x0 = lerp(-.2, .2, R()), z0 = lerp(.04, .28, R()), vy = .08 + R() * .06, y = Math.max(.0006, .05 + vy * k - .09 * k * k);
  return { x: x0 + Math.sin(k * 3 + i) * .01, y, z: z0, rx: k * 6 * R(), ry: k * 5, rz: k * 4, s: .003 };
});
conf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(220 * 3), 3);
for (let i = 0; i < 220; i++) conf.setColorAt(i, confCols[i % 5]);
S.add(conf); PS.push(conf);
const sparkle = particles(quad, addMat(starTex, new THREE.Color(2.4, 1.9, .9)), 60, billboard((i, t) => {
  const R = mulberry(i * 13 + 5), t0 = T.star + R() * .8, life = .7 + R() * .8, k = (t - t0) / life; if (k < 0 || k > 1) return null;
  const a = R() * TAU, d = .01 + k * (.02 + R() * .03);
  return { x: STAR_P[0] + Math.cos(a) * d, y: STAR_P[1] + Math.sin(a) * d, z: STAR_P[2] + .004, s: .005 * Math.sin(k * Math.PI), spin: t * 3 + i };
}));
S.add(sparkle); PS.push(sparkle);
const garlItem = { h: TREE_H, w: TREE_H * .55 };
const lights = particles(quad, addMat(glowTex, new THREE.Color(2.2, 1.6, .8)), 40, billboard((i, t) => {
  if (i >= A.BAUBLES.length) return null; const on = seg(t, T.garland + .2, T.garland + .6) * (1 - seg(t, T.fold0, T.fold0 + .3)); if (on <= 0) return null;
  const [fx, fy] = A.BAUBLES[i];
  return { x: TREE[0] + (fx - .5) * garlItem.w, y: (1 - fy) * garlItem.h, z: TREE[2] + .008, s: .009 * on * (.6 + .4 * Math.sin(t * 5 + i * 1.7)) };
}));
S.add(lights); PS.push(lights);
const starGlow = new THREE.Mesh(quad, addMat(glowTex, new THREE.Color(2.5, 1.3, .7))); starGlow.position.set(STAR_P[0], STAR_P[1], STAR_P[2] - .001); S.add(starGlow);

// —— lights ——
const lampHead = new THREE.Vector3(-.28, .375, .44);
const spot = new THREE.SpotLight('#fff0dc', 0, 3, .8, .55, 2); spot.position.copy(lampHead); spot.target.position.set(.02, 0, .2);
spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -.00006; spot.shadow.normalBias = .0004; spot.shadow.radius = 5; spot.shadow.camera.near = .05; spot.shadow.camera.far = 2;
scene.add(spot, spot.target);
const bulb = new THREE.PointLight('#ffcf94', 0, .6, 2); bulb.position.copy(lampHead); scene.add(bulb);
const moon = new THREE.DirectionalLight('#b8c8ff', 0); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -.00008; moon.shadow.normalBias = .0003; moon.shadow.radius = 4;
Object.assign(moon.shadow.camera, { left: -.3, right: .3, top: .3, bottom: -.3, near: .1, far: 3 }); moon.position.set(.3, .6, .7); moon.target.position.set(0, .05, .12); scene.add(moon, moon.target);
const hemi = new THREE.HemisphereLight('#cfdcff', '#b08a6a', 0); scene.add(hemi);
const party = new THREE.PointLight('#ffb36a', 0, .7, 2); party.position.set(0, .2, .25); scene.add(party);

// —— camera ——
const SH = [
  [0.0, .3, .3, .95, 0, .02, .15, 32, 3.0], [2.4, .22, .33, .86, 0, .03, .15, 32, 3.0], [5.0, .02, .25, .74, 0, .08, .1, 30, 2.6],
  [7.5, -.04, .075, .5, -.03, .045, .15, 30, 2.3], [11.0, .0, .072, .49, .0, .045, .15, 30, 2.3], [13.6, .01, .07, .44, .01, .04, .17, 30, 2.4],
  [15.4, .005, .055, .35, .002, .038, .19, 30, 2.6], [16.6, .03, .075, .47, .05, .085, .12, 30, 2.2], [18.2, .04, .1, .55, .06, .11, .1, 30, 2.0],
  [21.0, .02, .12, .54, .05, .11, .09, 30, 2.0], [22.6, .0, .31, .72, 0, .05, .12, 30, 1.8], [24.8, .0, .26, .66, 0, .06, .1, 30, 1.9],
  [27.0, .0, .14, .52, .0, .065, .08, 30, 2.1], [29.8, .0, .12, .46, .0, .06, .08, 30, 2.2], [31.2, .0, .17, .66, 0, .12, .07, 30, 1.9],
  [34.6, .0, .2, .74, 0, .12, .07, 30, 1.9], [37.4, .08, .55, 1.0, 0, .05, .1, 32, 3.0], [41, .1, .62, 1.05, 0, .05, .1, 32, 3.0],
];
const camF = track(SH.map(k => [k[0], k.slice(1)]));

// —— choreography ——
const held = { at: 'A' };
function ballState(t) {
  // returns {pos, holder|null}
  let holder = 'A', from = null;
  for (const [t0, t1, a, b] of T.passes) { if (t >= t1) holder = b; else if (t >= t0) { from = [t0, t1, a, b]; holder = null; break; } }
  if (t >= T.release) { holder = null; from = null; }
  return { holder, from };
}
function poseOf(id, t) {
  const p = { armL: .3, armR: .3, legs: 0, crouch: 0, eyes: 'open', mouth: 'smile', look: [0, 0] };
  const blink = (t * 1.3 + id.charCodeAt(0)) % 3.7 < .12; if (blink) p.eyes = 'closed';
  const inS1 = t >= T.turn[1];
  if (!inS1) {
    for (const [t0, t1, a, b] of T.passes) {
      if (id === a && t > t0 - .35 && t < t0 + .25) { const k = seg(t, t0 - .35, t0); p.armR = lerp(.3, 2.7, k); p.armL = .6; p.look = [.6, -.3]; }
      if (id === b && t > t0 && t < t1 + .2) { p.armL = p.armR = 1.4; p.mouth = 'o'; p.eyes = 'wide'; }
    }
    const hb = ballState(t).holder;
    if (hb === id && t < T.look[0]) { p.armL = p.armR = 1.1; }
    if (id === 'B') {
      if (t >= T.look[0] && t < T.crouch) { p.armL = p.armR = 1.1; p.look = [.3, -1]; p.eyes = 'wide'; p.mouth = 'o'; }
      if (t >= T.crouch && t < T.jump[0]) { p.crouch = 1; p.armL = p.armR = 1.3; p.look = [.3, -1]; p.mouth = 'smile'; }
      if (t >= T.jump[0] && t < T.jump[1]) { p.armL = p.armR = 3.0; p.legs = .8; p.look = [.3, -1]; p.mouth = 'open'; }
      if (t >= T.jump[1] && t < T.jump[1] + .2) { p.crouch = .7; }
    }
    if (t > T.star - .1 && t < T.fold0) { p.eyes = 'happy'; p.mouth = 'open'; p.armL = p.armR = 2.7 + .25 * Math.sin(t * 9 + id.charCodeAt(0)); }
  } else {
    p.look = [0, -.4];
    if (t > T.tab[0] && t < T.flip) { p.eyes = 'wide'; p.mouth = 'o'; p.armL = p.armR = .9; }
    if (t >= T.flip) { p.eyes = 'happy'; p.mouth = 'open'; const h = Math.sin((t - T.flip) * 10 + id.charCodeAt(0)); p.armL = p.armR = 2.6 + .3 * h; p.legs = Math.max(0, h) * .6; }
  }
  return p;
}
function hopY(id, t) {
  if (id === 'B' && t >= T.jump[0] && t < T.jump[1]) { const u = seg(t, ...T.jump); return .03 * 4 * u * (1 - u); }
  if (t > T.star && t < T.fold0) { const ph = ((t - T.star) * 2.2 + id.charCodeAt(0) * .37) % 1; return .008 * 4 * ph * (1 - ph); }
  if (t >= T.flip && t < T.fold1) { const ph = ((t - T.flip) * 1.8 + id.charCodeAt(0) * .37) % 1; return .012 * 4 * ph * (1 - ph); }
  return 0;
}
function playersAt(t) {
  const inS1 = t >= T.turn[1] - .4;
  const vis = t < T.turn[0] + .2 ? back(seg(t, T.rise0 + .7, T.rise0 + 1.25), 1.7) * (1 - ss(seg(t, T.fold0, T.fold0 + .4))) : back(seg(t, T.rise1 + .3, T.rise1 + .85), 1.7) * (1 - ss(seg(t, T.fold1 + .1, T.fold1 + .5)));
  for (const id of ['A', 'B', 'C']) {
    const P = PL[id], [x, z] = (inS1 ? SPOT1 : SPOT0)[id], y = hopY(id, t);
    P.root.position.set(x, y, z); P.root.visible = vis > .01; P.root.rotation.x = -(Math.PI / 2) * (1 - vis);
    P.shadow.position.set(x, .0005, z); P.shadow.visible = vis > .5; P.shadow.scale.setScalar(1 - y * 12);
    const p = poseOf(id, t); P.pose(p); P._p = p;
    const sq = id === 'B' && t >= T.crouch && t < T.jump[0] ? 1 - .1 * ss(seg(t, T.crouch, T.crouch + .15)) : 1;
    P.body.scale.set(2 - sq, sq, 1);
  }
}
function arcPos(a, b, u, h) { return a.clone().lerp(b, u).add(new THREE.Vector3(0, h * 4 * u * (1 - u), 0)); }
function ballAt(t) {
  const st = ballState(t);
  ballM.visible = t > T.rise0 + 1.2 && t < T.star + .12;
  const hand = (id, side) => { const P = PL[id]; return P.root.position.clone().add(P.hand(P._p || {}, side)); };
  if (t >= T.release) {
    const a = hand('B', 1), top = new THREE.Vector3(...STAR_P);
    if (t < T.top) { const u = seg(t, T.release, T.top); ballM.position.copy(arcPos(PL.B.root.position.clone().add(new THREE.Vector3(0, .056, .002)), top, eo(u), .07)); }
    else { ballM.position.copy(top).add(new THREE.Vector3(0, .002, .003)); }
    ballM.scale.setScalar(t > T.star ? 1 - ss(seg(t, T.star, T.star + .12)) : 1); ballM.rotation.z = -t * 6;
    return;
  }
  ballM.scale.setScalar(1);
  if (st.holder) { const P = PL[st.holder]; ballM.position.copy(P.root.position).add(new THREE.Vector3(0, .017 + (st.holder === 'B' && t > T.crouch ? -.002 : 0), .005)); ballM.rotation.z = 0; return; }
  const [t0, t1, a, b] = st.from, u = seg(t, t0, t1);
  const pa = PL[a].root.position.clone().add(new THREE.Vector3(0, .045, .004)), pb = PL[b].root.position.clone().add(new THREE.Vector3(0, .03, .004));
  ballM.position.copy(arcPos(pa, pb, u, .035)); ballM.rotation.z = -u * 8;
}

// —— lighting over time ——
function lightsAt(t) {
  const lampOn = ss(seg(t, T.lamp, T.lamp + .35));
  const inBook = seg(t, T.open[0], T.open[1]) * (1 - seg(t, T.card - .4, T.card + .4));
  const fest = seg(t, T.flip, T.flip + .4) * (1 - seg(t, T.fold1, T.fold1 + 1));
  return { lamp: .05 + lampOn * 1.0, moon: inBook * .9, hemi: .06 + inBook * .25, env: .08 + lampOn * .18, party: fest * .25 + seg(t, T.star, T.star + .3) * (1 - seg(t, T.fold0, T.fold0 + .5)) * .12 };
}

// —— 2D end card (club identity: flat, the emblem untouched) ——
const LD = [Math.cos(-0.96), Math.sin(-0.96)], LN = [-LD[1], LD[0]], SP = 30;
function lineW(X, Y) { const edge = 820 + 95 * Math.sin(X / 640 + 1.2) + 40 * Math.sin(X / 230); return SP * .86 * ss(clamp((edge - Y) / 520)) * (.82 + .18 * Math.sin(X / 900 + Y / 1100)); }
function brandLines(x, r) {
  x.fillStyle = '#ff0030';
  for (let k = -80; k <= 80; k++) {
    const bx = W / 2 + LN[0] * k * SP, by = H / 2 + LN[1] * k * SP, L = [], Rt = []; let any = false;
    for (let i = 0; i <= 75; i++) { const s = -1500 + i * 40, X = bx + LD[0] * s, Y = by + LD[1] * s, w = lineW(X, Y) * r / 2; if (w > .3) any = true; L.push([X + LN[0] * w, Y + LN[1] * w]); Rt.push([X - LN[0] * w, Y - LN[1] * w]); }
    if (!any) continue; x.beginPath(); x.moveTo(...L[0]); L.forEach(p => x.lineTo(...p)); for (let i = Rt.length - 1; i >= 0; i--) x.lineTo(...Rt[i]); x.closePath(); x.fill();
  }
}
function endCard(t) {
  OX.clearRect(0, 0, W, H);
  const a = ss(seg(t, T.card, T.card + .5)); if (a <= 0) return;
  OX.globalAlpha = a; OX.fillStyle = '#003080'; OX.fillRect(0, 0, W, H);
  brandLines(OX, ss(seg(t, T.card + .1, T.card + .9)));
  const pe = seg(t, T.card + .7, T.card + .92);
  if (LOGO && pe > 0) { const h = 640, w = h * LOGO.width / LOGO.height, s = lerp(1.3, 1, ss(pe)); OX.save(); OX.globalAlpha = a * clamp(pe * 3); OX.translate(560, 500); OX.scale(s, s); OX.drawImage(LOGO, -w / 2, -h / 2, w, h); OX.restore(); }
  const pt = seg(t, T.card + 1.0, T.card + 1.4);
  if (pt > 0) {
    OX.save(); OX.globalAlpha = a * ss(pt); OX.fillStyle = '#fff'; OX.textAlign = 'left'; OX.textBaseline = 'alphabetic';
    OX.font = '700 104px Inter'; OX.fillText('С Новым', 930, 430 + 16 * (1 - ss(pt))); OX.fillText('2027 годом!', 930, 550 + 16 * (1 - ss(pt)));
    OX.font = '700 40px Inter'; OX.fillText('Женский гандбольный клуб ЦСКА', 934, 640);
    OX.restore();
  }
  OX.globalAlpha = 1;
}
window.TEXTS = t => {
  const o = [];
  if (t > T.card + 1.0) o.push({ id: 'greet', text: 'С Новым 2027 годом! Женский гандбольный клуб ЦСКА', x0: 930, y0: 330, x1: 1800, y1: 650 });
  return o;
};

// —— render ——
window.render = function (t) {
  if (QS.has('card')) t = Math.max(t, T.card + 2);
  // book
  book.setOpen(Math.PI / 2 * eio(seg(t, ...T.open)) + Math.sin(seg(t, T.open[1] - .2, T.open[1] + .5) * Math.PI) * -.03);
  const u = seg(t, ...T.turn);
  if (u > 0 && u < 1) { book.leafFront.material.map = PT.ground0; book.leafBack.material.map = PT.sky1; book.leafFront.material.emissiveMap = PT.ground0; book.leafBack.material.emissiveMap = PT.sky1; book.leafFront.material.needsUpdate = book.leafBack.material.needsUpdate = true; }
  book.setLeaf(u > 0 && u < 1 ? eio(u) : (u >= 1 ? 1 : 0));
  book.groundMat.map = t >= T.turn[0] ? PT.ground1 : PT.ground0; book.backMat.map = t >= T.turn[1] ? PT.sky1 : PT.sky0;
  // pop-ups
  for (const r of POPS) { const k = riseOf(r, t); r.g.visible = k > .002; if (!r.g.visible) continue; r.g.rotation.x = r.dir * (Math.PI / 2) * (1 - k); if (r.sway) r.m.rotation.z = Math.sin(t * 1.6 + r.ph) * r.sway * k; }
  // star
  const ks = back(seg(t, T.star, T.star + .45), 2.2) * (1 - ss(seg(t, T.fold0, T.fold0 + .3)));
  star.visible = ks > .01; star.scale.setScalar(Math.max(.001, ks)); star.rotation.z = Math.sin(t * 1.4) * .05 + (1 - clamp(ks)) * 1.2;
  starGlow.visible = ks > .01; starGlow.scale.setScalar(.05 * ks * (1 + .1 * Math.sin(t * 4))); starGlow.quaternion.copy(cam.quaternion);
  // board: tab slides, last digit flips
  const tk = seg(t, ...T.tab), steps = Math.floor(tk * 8) / 8, back_ = seg(t, T.tab[1] + .2, T.tab[1] + .32);
  tab.position.x = .115 + .035 * lerp(steps, 0, ss(back_));
  slats[3].rotation.x = Math.PI * back(seg(t, T.flip, T.flip + .4), 1.4);
  // fireworks and banner
  for (const f of FW) { const k = back(seg(t, f.t0, f.t0 + .45), 2) * (1 - ss(seg(t, T.fold1 - .2, T.fold1 + .3))); f.m.visible = k > .01; f.m.scale.setScalar(Math.max(.001, k)); f.m.rotation.z = (t - f.t0) * .25; }
  const kb = seg(t, T.banner, T.banner + 1.6); banner.visible = t > T.banner;
  banner.position.y = lerp(.55, .285, spring(kb * 1.6, 6, .3)); banner.rotation.z = Math.sin((t - T.banner) * 4) * .06 * Math.exp(-(t - T.banner) * .8);
  // players, ball
  playersAt(t); ballAt(t);
  // camera
  const c = camF(t), pos = new THREE.Vector3(c[0], c[1], c[2]), tgt = new THREE.Vector3(c[3], c[4], c[5]);
  cam.position.copy(pos); cam.lookAt(tgt); cam.fov = c[6]; cam.updateProjectionMatrix(); camQ.copy(cam.quaternion);
  for (const p of PS) p.userData.update(t);
  // lights
  const L = lightsAt(t);
  spot.intensity = L.lamp * 1.1; bulb.intensity = L.lamp * .2; lampMats.forEach(m => m.emissiveIntensity = L.lamp * 6);
  moon.intensity = L.moon; hemi.intensity = L.hemi; scene.environmentIntensity = L.env; scene.backgroundIntensity = .08 + L.env * .5;
  party.intensity = L.party * .8; party.color.set('#ffc890');
  post.dof.focus = pos.distanceTo(tgt); post.dof.aper = c[7]; post.dof.maxCoc = 14;
  post.vig.uniforms.fade.value = ss(seg(t, 0, .25)); post.vig.uniforms.warm.value = .12;
  post.bloom.strength = .14 + .08 * seg(t, T.star, T.star + .3) * (1 - seg(t, T.fold0, T.fold0 + .5)) + .1 * seg(t, T.flip, T.flip + .3);
  scene.updateMatrixWorld(true); post.composer.render();
  endCard(t);
};

// —— sound events ——
function events() {
  const ev = [], add = (type, t, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
  add('room', 0, { d: DUR }); add('clock', 0, { d: T.card });
  add('switch', T.lamp); add('creak', T.open[0], { d: T.open[1] - T.open[0] }); add('thump', T.open[1] - .05);
  const pops = POPS.map(r => (r.t0 ?? RISE[r.spread]) + r.d).filter(x => x < DUR).sort((a, b) => a - b);
  let last = -1; for (const p of pops) if (p - last > .07) { add('pop', p + .05, { v: .6 }); last = p; }
  for (const [t0, t1] of T.passes) { add('toss', t0); add('catch', t1); }
  add('crouch', T.crouch); add('hop', T.jump[0]); add('toss', T.release, { v: 1.2 }); add('land', T.jump[1]);
  add('whoosh', T.release + .1, { d: T.top - T.release });
  add('starpop', T.star); add('sparkle', T.star + .05, { d: 1.4 }); add('pop', T.garland, { v: 1 }); add('twinkle', T.garland + .3, { d: T.fold0 - T.garland });
  add('fold', T.fold0, { d: .6 }); add('swish', T.turn[0], { d: T.turn[1] - T.turn[0] });
  for (let i = 0; i < 8; i++) add('tick', 25.6 + i * .5);
  add('snap', T.tab[1] + .2); add('flip', T.flip); add('bell', T.flip, { v: 1 });
  T.fireworks.forEach((t, i) => add('burst', t, { v: .8 + .05 * i }));
  add('drop', T.banner, { d: 1.2 });
  for (let t = T.flip + .2; t < T.fold1; t += .55) add('hop', t, { v: .35 });
  add('fold', T.fold1, { d: .8 }); add('card', T.card + .7);
  return ev.sort((a, b) => a.t - b.t);
}
window.DUR = DUR; window.EV = events();
window.render(parseFloat(QS.get('t') ?? '12'));
window.READY = true;
