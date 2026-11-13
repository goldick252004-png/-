// The film's locations. Each builder returns a THREE.Scene plus handles the choreography needs.
import * as THREE from 'three';
import { M, buildNika, buildPerson, TOPS } from './chars.js';
import * as K from './kit.js';
import { mulberry } from './lib.js';
const { mesh, ctex, glow, RED, BLUE, GOLD } = K;
const TAU = Math.PI * 2;
const AS = '/core/assets/polyhaven/';
let ENV = null, WOOD = null;
export async function loadAssets() {
  const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
  ENV = await new RGBELoader().loadAsync(AS + 'lythwood_lounge_2k.hdr'); ENV.mapping = THREE.EquirectangularReflectionMapping;
  const tl = new THREE.TextureLoader(), ld = n => tl.loadAsync(AS + `walnut_${n}.jpg`);
  const [d, n, r] = await Promise.all([ld('diff'), ld('nor'), ld('rough')]);
  for (const t of [d, n, r]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 8; }
  d.colorSpace = THREE.SRGBColorSpace; WOOD = { d, n, r };
}
function base(envK = .3) { const s = new THREE.Scene(); s.environment = ENV; s.environmentIntensity = envK; return s; }
function shadowLight(l, size = 4, res = 2048) { l.castShadow = true; l.shadow.mapSize.set(res, res); const c = l.shadow.camera; if (c.isOrthographicCamera) Object.assign(c, { left: -size, right: size, top: size, bottom: -size, near: .5, far: 30 }); l.shadow.bias = -.0004; l.shadow.normalBias = .02; l.shadow.radius = 5; return l; }

// —— cast ——
export const PLAYERS = [
  { hair: '#2a1a14', style: 'ponytail', skin: '#f1c7a6', num: 7, h: 1.0 },
  { hair: '#d9a54a', style: 'braid', skin: '#f6d6bd', num: 10, h: 1.04 },
  { hair: '#5a2e1c', style: 'bob', skin: '#e8b48e', num: 13, h: .96 },
  { hair: '#1c1416', style: 'grey-bun', skin: '#d9a07a', num: 21, h: 1.06 },
  { hair: '#8a3a1e', style: 'ponytail', skin: '#f3cfb4', num: 3, h: .98, tie: BLUE },
  { hair: '#3a2418', style: 'long', skin: '#eec1a0', num: 25, h: 1.02 },
  { hair: '#e8c27a', style: 'bob', skin: '#f6dcc6', num: 9, h: .95 }
];
export function player(i) { const d = PLAYERS[i]; return buildPerson({ ...d, female: 1, lashes: 1, iris: ['#5a3a20', '#3a6ab0', '#4a7a3a'][i % 3], top: TOPS.kit(d.num), bottom: BLUE, sock: RED, shoe: '#ffffff', trim: '#ffffff' }); }
export const girl = () => buildPerson({ child: 1, skin: '#f6d2b8', hair: '#7a4426', style: 'pigtails', bangs: 1, iris: '#6b3d22', top: TOPS.tee, bottom: '#3a4fd8', long: 1, shoe: '#ffffff', lashes: 1, female: 1 });

// —— night skyline backdrop (canvas) used behind windows ——
function skylineTex(dawn = false) {
  return ctex(2048, 1024, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    if (dawn) { g.addColorStop(0, '#3a4a9a'); g.addColorStop(.55, '#c98ab0'); g.addColorStop(.8, '#ffc7a0'); g.addColorStop(1, '#ffe1b8'); }
    else { g.addColorStop(0, '#070b2e'); g.addColorStop(.6, '#1b2470'); g.addColorStop(1, '#3a3f8f'); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const R = mulberry(dawn ? 8 : 7);
    if (!dawn) { c.fillStyle = '#fff'; for (let i = 0; i < 160; i++) { c.globalAlpha = .3 + R() * .7; c.beginPath(); c.arc(R() * w, R() * h * .55, R() * 2.2 + .5, 0, TAU); c.fill(); } c.globalAlpha = 1; const mg = c.createRadialGradient(w * .78, h * .2, 10, w * .78, h * .2, 140); mg.addColorStop(0, 'rgba(255,248,220,1)'); mg.addColorStop(.3, 'rgba(255,248,220,.9)'); mg.addColorStop(.32, 'rgba(255,240,200,.25)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = mg; c.fillRect(w * .78 - 140, h * .2 - 140, 280, 280); }
    for (let layer = 0; layer < 2; layer++) {
      let x = -20; while (x < w) {
        const bw = 60 + R() * 140, bh = (layer ? 160 : 260) + R() * (layer ? 200 : 300), y = h - bh;
        c.fillStyle = dawn ? (layer ? '#6a5a8a' : '#8a7aa6') : (layer ? '#0e1240' : '#1a1f5c'); c.fillRect(x, y, bw, bh);
        if (R() < .15 && !layer) { c.beginPath(); c.moveTo(x + bw * .3, y); c.lineTo(x + bw * .5, y - 120); c.lineTo(x + bw * .7, y); c.fill(); c.fillRect(x + bw * .49, y - 180, 4, 70); }
        for (let yy = y + 14; yy < h - 10; yy += 26) for (let xx = x + 8; xx < x + bw - 10; xx += 20) if (R() < (dawn ? .12 : .35)) { c.fillStyle = R() < .2 ? '#ffb0c0' : '#ffd38a'; c.fillRect(xx, yy, 9, 13); }
        x += bw + 6;
      }
    }
  });
}

// ————————————————————————— ROOM (scenes 1, 7, 8) —————————————————————————
export function buildRoom(o = {}) {
  const s = base(.28), R = mulberry(31);
  s.background = new THREE.Color('#0a0c24');
  const wallT = ctex(512, 512, (c, w, h) => { c.fillStyle = '#f2dfc2'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(190,140,90,.16)'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 22, h); c.fillStyle = 'rgba(36,56,208,.18)'; for (let y = 32; y < h; y += 128) for (let x = 43; x < w; x += 64) { c.beginPath(); c.arc(x, y + (x % 128 ? 64 : 0), 5, 0, TAU); c.fill(); } });
  wallT.wrapS = wallT.wrapT = THREE.RepeatWrapping; wallT.repeat.set(4, 2);
  const wallM = M('#ffffff', { map: wallT, roughness: .9 });
  const floor = mesh(new THREE.PlaneGeometry(14, 12), M('#d6b08a', { map: WOOD.d, normalMap: WOOD.n, roughnessMap: WOOD.r, roughness: .7 }), false); floor.rotation.x = -Math.PI / 2; floor.position.set(1, 0, 1); s.add(floor);
  const W0 = -3, W1 = 3, ZB = -2.5, HH = 2.8, wx0 = 0, wx1 = 1.4, wy0 = 1.0, wy1 = 2.3;
  const wall = (w, h, x, y, z, ry = 0) => { const m = mesh(new THREE.BoxGeometry(w, h, .12), wallM, false); m.position.set(x, y, z); m.rotation.y = ry; s.add(m); return m; };
  wall(wx0 - W0, HH, (W0 + wx0) / 2, HH / 2, ZB); wall(W1 - wx1, HH, (wx1 + W1) / 2, HH / 2, ZB);
  wall(wx1 - wx0, wy0, (wx0 + wx1) / 2, wy0 / 2, ZB); wall(wx1 - wx0, HH - wy1, (wx0 + wx1) / 2, (HH + wy1) / 2, ZB);
  wall(6, HH, W0, HH / 2, .5, Math.PI / 2);
  // right wall with a door hole z ∈ [.6, 1.5]
  const dz0 = .6, dz1 = 1.5, dh = 2.1;
  wall(dz0 - ZB, HH, W1, HH / 2, (ZB + dz0) / 2, Math.PI / 2); wall(3.6 - dz1, HH, W1, HH / 2, (dz1 + 3.6) / 2, Math.PI / 2); wall(dz1 - dz0, HH - dh, W1, (HH + dh) / 2, (dz0 + dz1) / 2, Math.PI / 2);
  const ceil = mesh(new THREE.PlaneGeometry(8, 8), M('#e9dcc8', { roughness: 1 }), false); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HH, .5); s.add(ceil);
  const skirting = M('#ffffff', { roughness: .5 }); for (const [w, x, z, ry] of [[6, 0, ZB + .07, 0], [6, W0 + .07, .5, Math.PI / 2]]) { const b = mesh(new THREE.BoxGeometry(w, .12, .03), skirting, false); b.position.set(x, .06, z); b.rotation.y = ry; s.add(b); }
  // window: frame, sill, glass, opening vent, curtains, backdrop
  const frameM = M('#ffffff', { roughness: .4, clearcoat: .4 });
  const fr = (w, h, x, y) => { const b = mesh(new THREE.BoxGeometry(w, h, .1), frameM); b.position.set(x, y, ZB + .02); s.add(b); };
  fr(1.5, .07, .7, wy0); fr(1.5, .07, .7, wy1); fr(.07, 1.37, wx0, (wy0 + wy1) / 2); fr(.07, 1.37, wx1, (wy0 + wy1) / 2); fr(.05, 1.3, .7, (wy0 + wy1) / 2); fr(1.4, .05, .7, 1.7);
  const sill = mesh(K.roundBox(1.7, .06, .34, .02), M('#f4f4f6', { roughness: .7 })); sill.position.set(.7, wy0 - .02, ZB + .14); s.add(sill);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe0ff', transparent: true, opacity: .12, roughness: .05, metalness: 0, depthWrite: false });
  const g1 = mesh(new THREE.PlaneGeometry(.7, .7), glass, false, false); g1.position.set(.35, 1.35, ZB); s.add(g1);
  const g2 = mesh(new THREE.PlaneGeometry(.7, .7), glass, false, false); g2.position.set(1.05, 1.35, ZB); s.add(g2);
  const g3 = mesh(new THREE.PlaneGeometry(.7, .6), glass, false, false); g3.position.set(.35, 2.0, ZB); s.add(g3);
  const vent = new THREE.Group(); vent.position.set(.7, 2.0, ZB + .03); s.add(vent); // hinged on its left edge (x = .7)
  const vg = mesh(new THREE.PlaneGeometry(.68, .58), glass, false, false); vg.position.x = .35; vent.add(vg);
  for (const [w, h, x, y] of [[.7, .04, .35, .29], [.7, .04, .35, -.29], [.04, .6, .01, 0], [.04, .6, .69, 0]]) { const b = mesh(new THREE.BoxGeometry(w, h, .04), frameM); b.position.set(x, y, 0); vent.add(b); }
  const curtains = [];
  for (const sd of [-1, 1]) {
    const cg = new THREE.PlaneGeometry(.55, 2.2, 12, 20); const cm = mesh(cg, M('#b8304a', { roughness: .9, sheen: 1, sheenColor: new THREE.Color('#ff9ab0'), side: THREE.DoubleSide }));
    cm.position.set(sd < 0 ? -.25 : 1.65, 1.6, ZB + .12); s.add(cm); cm.userData.base = Float32Array.from(cg.attributes.position.array); curtains.push(cm);
  }
  const night = skylineTex(false), dawn = skylineTex(true);
  const backdrop = mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: night, fog: false }), false, false); backdrop.position.set(.7, 2.0, -7); s.add(backdrop);
  const outSnow = new K.Snow(500, { x0: -1.5, x1: 3, y0: .3, y1: 3.5, z0: -6, z1: -2.8 }, .035, 11, .9); s.add(outSnow.obj);
  const fireworks = [RED, '#5a7bff', GOLD, '#ffffff', RED, '#4a6aff'].map((c, i) => { const f = new K.Firework(c, 160, i + 2); s.add(f.obj); return f; });
  // tree, presents
  const tree = K.xmasTree(2.3, 4); tree.root.position.set(-2.05, 0, -1.7); s.add(tree.root);
  [[RED, -1.6, -1.2], [BLUE, -2.4, -1.15], [GOLD, -1.9, -1.0]].forEach(([c, x, z], i) => { const p = K.present(.3 + i * .05, .22, .3, c, i === 2 ? RED : GOLD); p.position.set(x, 0, z); p.rotation.y = i; s.add(p); });
  // wall scarf
  const sc = K.scarf(1.5); sc.position.set(-1.05, 2.05, ZB + .08); s.add(sc);
  // wall clock (right of the window)
  const clock = new THREE.Group(); clock.position.set(2.1, 2.0, ZB + .08); s.add(clock);
  const face = ctex(256, 256, (c, w) => { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(128, 128, 128, 0, TAU); c.fill(); c.translate(128, 128); c.rotate(-Math.PI / 2); c.translate(-128, -128); c.fillStyle = '#1d2a9e'; c.font = '900 34px Nunito'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU - Math.PI / 2; c.fillText(String(i), 128 + Math.cos(a) * 98, 128 + Math.sin(a) * 98); } });
  const cf = mesh(new THREE.CylinderGeometry(.24, .24, .05, 48), [M(RED, { roughness: .3, clearcoat: .7 }), M('#ffffff', { map: face, roughness: .5 }), M(RED)]); cf.rotation.x = Math.PI / 2; clock.add(cf);
  const hand = (l, w) => { const g = new THREE.Group(); const m = mesh(new THREE.BoxGeometry(w, l, .01), M('#1d1d2a', { roughness: .4 })); m.position.y = l / 2 - .02; g.add(m); g.position.z = .035; clock.add(g); return g; };
  const hHour = hand(.13, .022), hMin = hand(.19, .014);
  // desk, chair, lamp, letter
  const wood = M('#a4703f', { roughness: .55, clearcoat: .2 });
  const desk = new THREE.Group(); desk.position.set(.7, 0, -1.3); s.add(desk);
  const top = mesh(K.roundBox(1.2, .05, .6, .015), wood); top.position.y = .62; desk.add(top);
  for (const [x, z] of [[-.55, -.25], [.55, -.25], [-.55, .25], [.55, .25]]) { const l = mesh(new THREE.CylinderGeometry(.025, .02, .6, 10), wood); l.position.set(x, .3, z); desk.add(l); }
  const chair = new THREE.Group(); chair.position.set(.7, 0, -1.78); s.add(chair);
  const cushion = mesh(K.roundBox(.34, .05, .32, .035), M(RED, { roughness: .9, sheen: .8, sheenColor: new THREE.Color('#ffb0b8') })); cushion.position.y = .42; chair.add(cushion);
  const seat = mesh(K.roundBox(.4, .04, .38, .015), M(BLUE, { roughness: .5 })); seat.position.y = .36; chair.add(seat);
  const backR = mesh(K.roundBox(.4, .4, .04, .015), M(BLUE, { roughness: .5 })); backR.position.set(0, .6, -.18); chair.add(backR);
  for (const [x, z] of [[-.17, -.16], [.17, -.16], [-.17, .16], [.17, .16]]) { const l = mesh(new THREE.CylinderGeometry(.018, .018, .36, 8), wood); l.position.set(x, .18, z); chair.add(l); }
  const lamp = new THREE.Group(); lamp.position.set(1.15, .645, -1.42); s.add(lamp);
  lamp.add(Object.assign(mesh(new THREE.CylinderGeometry(.07, .08, .02, 24), M(RED, { roughness: .3, clearcoat: .8 })), {}));
  const arm = mesh(new THREE.CylinderGeometry(.012, .012, .32, 8), M(RED, { roughness: .3 })); arm.position.set(0, .16, 0); arm.rotation.z = .25; lamp.add(arm);
  const shade = mesh(new THREE.ConeGeometry(.09, .12, 24, 1, true), M(RED, { roughness: .3, side: THREE.DoubleSide, clearcoat: .8 })); shade.position.set(-.07, .33, 0); shade.rotation.z = .9; lamp.add(shade);
  const bulb = mesh(new THREE.SphereGeometry(.03, 12, 8), glow('#fff1c8', 1.5)); bulb.position.set(-.1, .3, 0); lamp.add(bulb);
  const lampL = new THREE.PointLight('#ffcf8a', 1.0, 2.6, 1.8); lampL.position.set(1.0, .9, -1.3); s.add(lampL);
  const L = K.letter(); L.mesh.rotation.x = -Math.PI / 2; L.mesh.position.set(.62, .648, -1.22); s.add(L.mesh);
  // pencil: origin at the graphite tip, axis +y — blue hex body, red eraser, sharpened wood cone
  const pencil = new THREE.Group();
  { const body = mesh(new THREE.CylinderGeometry(.0065, .0065, .12, 6), M(BLUE, { roughness: .35, clearcoat: .6 })); body.position.y = .022 + .06; pencil.add(body);
    const cone = mesh(new THREE.ConeGeometry(.0065, .02, 6, 1, true), M('#e8c79a', { roughness: .8 })); cone.rotation.x = Math.PI; cone.position.y = .012; pencil.add(cone);
    const lead = mesh(new THREE.ConeGeometry(.0024, .006, 8), M('#2a2a30', { roughness: .4 })); lead.rotation.x = Math.PI; lead.position.y = .003; pencil.add(lead);
    const fer = mesh(new THREE.CylinderGeometry(.0068, .0068, .01, 12), M('#d9d9e0', { metalness: .8, roughness: .3 })); fer.position.y = .147; pencil.add(fer);
    const er = mesh(new THREE.CylinderGeometry(.0064, .0064, .012, 12), M(RED, { roughness: .7 })); er.position.y = .158; pencil.add(er); }
  s.add(pencil);
  // cocoa mug with marshmallows and steam; a candy cane
  const mug = new THREE.Group(); mug.position.set(.24, .645, -1.22); s.add(mug);
  { const cup = mesh(new THREE.CylinderGeometry(.045, .04, .1, 32, 1, true), M('#ffffff', { roughness: .25, clearcoat: 1, side: THREE.DoubleSide })); cup.position.y = .05; mug.add(cup);
    const bot = mesh(new THREE.CircleGeometry(.04, 24), M('#ffffff', { roughness: .3 })); bot.rotation.x = -Math.PI / 2; bot.position.y = .002; mug.add(bot);
    const band = mesh(new THREE.CylinderGeometry(.0455, .0445, .02, 32, 1, true), M(RED, { roughness: .4, clearcoat: .8 })); band.position.y = .06; mug.add(band);
    const coc = mesh(new THREE.CircleGeometry(.043, 24), M('#5a2e1c', { roughness: .2, clearcoat: 1 })); coc.rotation.x = -Math.PI / 2; coc.position.y = .085; mug.add(coc);
    for (let i = 0; i < 4; i++) { const mm = mesh(new THREE.BoxGeometry(.016, .012, .016), M('#fff6f0', { roughness: .9 })); mm.position.set(Math.cos(i * 1.7) * .02, .09, Math.sin(i * 1.7) * .02); mm.rotation.y = i; mug.add(mm); }
    const h = mesh(new THREE.TorusGeometry(.025, .007, 10, 20, Math.PI), M('#ffffff', { roughness: .25, clearcoat: 1 })); h.position.set(-.045, .05, 0); h.rotation.z = Math.PI / 2; mug.add(h); }
  const steamP = new Float32Array(24 * 3), steam = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(steamP, 3)), new THREE.PointsMaterial({ map: K.dotTex(), size: .1, transparent: true, opacity: .08, depthWrite: false, color: '#fff4e8' }));
  steam.position.copy(mug.position); s.add(steam);
  const cane = new THREE.Group(); cane.position.set(.36, .652, -1.08); cane.rotation.set(Math.PI / 2, 0, .5); s.add(cane);
  { const ct = K.ctex(64, 16, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = RED; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(i * 8, 0); c.lineTo(i * 8 + 4, 0); c.lineTo(i * 8 + 8, h); c.lineTo(i * 8 + 4, h); c.fill(); } }); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(1, 6);
    const cm = M('#ffffff', { map: ct, roughness: .25, clearcoat: 1 }); const st = mesh(new THREE.CylinderGeometry(.007, .007, .12, 10), cm); st.position.y = -.06; cane.add(st);
    const hk = mesh(new THREE.TorusGeometry(.02, .007, 10, 16, Math.PI), cm); hk.position.x = .02; cane.add(hk); }
  // warm light cone under the lamp shade + dust motes drifting in it
  const coneT = K.ctex(8, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,214,150,0)'); g.addColorStop(.25, 'rgba(255,214,150,.55)'); g.addColorStop(1, 'rgba(255,214,150,.0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(.2, .42, 32, 1, true), new THREE.MeshBasicMaterial({ map: coneT, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  { const a = new THREE.Vector3(1.04, .97, -1.42), b = new THREE.Vector3(.86, .645, -1.36), d = b.clone().sub(a); beam.position.copy(a).addScaledVector(d, .5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize()); beam.scale.y = a.distanceTo(b) / .42; }
  s.add(beam);
  const motes = new K.Snow(70, { x0: .55, x1: 1.2, y0: .66, y1: 1.15, z0: -1.65, z1: -1.1 }, .012, 33, .06); motes.obj.material.color = new THREE.Color('#ffd89a'); motes.obj.material.opacity = .7; s.add(motes.obj);
  // rug
  const rugT = ctex(512, 512, (c, w, h) => { c.fillStyle = BLUE; c.beginPath(); c.arc(256, 256, 256, 0, TAU); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 14; c.beginPath(); c.arc(256, 256, 200, 0, TAU); c.stroke(); c.fillStyle = RED; c.beginPath(); c.arc(256, 256, 150, 0, TAU); c.fill(); });
  const rug = mesh(new THREE.CircleGeometry(1.1, 48), M('#ffffff', { map: rugT, roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffffff') }), false); rug.rotation.x = -Math.PI / 2; rug.position.set(-.3, .005, .2); s.add(rug);
  // shelf with photos and a ball
  const shelf = mesh(K.roundBox(.9, .04, .22, .01), wood); shelf.position.set(2.15, 1.45, ZB + .12); s.add(shelf);
  const sb = K.ball(.09); sb.position.set(1.9, 1.56, ZB + .14); s.add(sb);
  for (let i = 0; i < 2; i++) { const pf = mesh(K.roundBox(.18, .22, .02, .005), M(i ? BLUE : RED, { roughness: .4 })); pf.position.set(2.2 + i * .22, 1.58, ZB + .1); pf.rotation.x = -.1; s.add(pf); const ph = mesh(new THREE.PlaneGeometry(.14, .18), M(i ? '#ffd38a' : '#9ad0ff', { roughness: .6 }), false); ph.position.set(2.2 + i * .22, 1.58, ZB + .113); ph.rotation.x = -.1; s.add(ph); }
  // door + porch outside
  const doorG = new THREE.Group(); doorG.position.set(W1, 0, dz0); s.add(doorG);
  const doorM = M('#7a3a2a', { roughness: .45, clearcoat: .4 });
  const door = mesh(K.roundBox(.06, 2.08, .9, .015), doorM); door.position.set(0, 1.04, .45); doorG.add(door);
  const knob = mesh(new THREE.SphereGeometry(.035, 16, 12), M(GOLD, { metalness: .9, roughness: .2 })); knob.position.set(-.05, 1.0, .8); doorG.add(knob);
  const knob2 = knob.clone(); knob2.position.x = .05; doorG.add(knob2);
  const wreath = mesh(new THREE.TorusGeometry(.18, .06, 12, 32), M('#1f6b45', { roughness: .8 })); wreath.position.set(.06, 1.55, .45); wreath.rotation.y = Math.PI / 2; doorG.add(wreath);
  const porch = mesh(new THREE.PlaneGeometry(12, 12), M('#eef2ff', { roughness: .95 }), false); porch.rotation.x = -Math.PI / 2; porch.position.set(9, -.02, 1); s.add(porch);
  const out = mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ map: night, fog: false }), false, false); out.position.set(12, 3, 1); out.rotation.y = -Math.PI / 2; s.add(out);
  const porchL = new THREE.PointLight('#ffc27a', 3, 5, 1.4); porchL.position.set(3.6, 2.3, 1.05); s.add(porchL);
  const gPts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; gPts.push([3.12, 2.15 + Math.sin(u * Math.PI) * .12, .45 + u * 1.2]); }
  const doorBulbs = new K.Bulbs(gPts, .028, 21); s.add(doorBulbs.obj);
  const porchSnow = new K.Snow(400, { x0: 3.3, x1: 9, y0: 0, y1: 3.5, z0: -1.5, z1: 3.5 }, .04, 12); s.add(porchSnow.obj);
  // lights
  s.add(new THREE.HemisphereLight('#ffe9cf', '#5a4030', .18));
  const key = shadowLight(new THREE.SpotLight('#ffe2b8', 6, 9, .9, .8, 1.6)); key.position.set(.5, 2.75, .8); key.target.position.set(0, 0, -1); s.add(key, key.target);
  const moon = new THREE.DirectionalLight('#8aa0ff', .6); moon.position.set(1, 3, -6); s.add(moon);
  const flash = new THREE.PointLight('#ff3050', 0, 8, 1); flash.position.set(.7, 2, -3.2); s.add(flash);
  const snowIn = new K.Snow(120, { x0: .5, x1: 1.6, y0: 1.0, y1: 2.4, z0: -2.45, z1: -1.4 }, .025, 13, .9); snowIn.obj.visible = false; s.add(snowIn.obj);
  return {
    scene: s, tree, vent, curtains, L, pencil, chair, cushion, beam, motes, steam, mug, clock: { hHour, hMin }, doorG, doorBulbs, porchSnow, outSnow, fireworks, flash, lampL, bulb, snowIn, backdrop, night, dawn,
    update(t, wind = 0) {
      tree.bulbs.update(t); doorBulbs.update(t + 1); outSnow.update(t, wind * 2); porchSnow.update(t + 3); snowIn.update(t, wind * 2);
      tree.light.intensity = 2.3 + Math.sin(t * 3) * .3; motes.update(t * .1); beam.visible = motes.obj.visible = lampL.intensity > .1;
      for (let i = 0; i < 24; i++) { const u = ((t * .35 + i / 24) % 1); steamP[i * 3] = Math.sin(t * 1.3 + i * 2.1) * .015 * (1 + u * 2); steamP[i * 3 + 1] = .1 + u * .22; steamP[i * 3 + 2] = Math.cos(t * 1.1 + i * 1.7) * .012 * (1 + u * 2); }
      steam.geometry.attributes.position.needsUpdate = true;
      curtains.forEach((cm, j) => { const p = cm.geometry.attributes.position, b = cm.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], k = (1.1 - y) / 2.2; p.setZ(i, Math.sin(x * 18 + j) * .03 + Math.sin(t * 3 + y * 3 + j) * wind * .12 * k + wind * .2 * k * k); } p.needsUpdate = true; cm.geometry.computeVertexNormals(); });
    }
  };
}

// ————————————————————————— CITY (scene 2) —————————————————————————
export function buildCity() {
  const s = base(.15); s.background = new THREE.Color('#0b1040'); s.fog = new THREE.FogExp2('#1a2266', .028);
  s.add(K.skyDome('#060a2a', '#1a2470', '#4a4a9a')); s.add(K.stars(500, 100, 9));
  const moon = mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d8').multiplyScalar(1.8), toneMapped: false, fog: false }), false, false); moon.position.set(25, 30, -80); s.add(moon);
  const R = mulberry(41), cols = ['#3a3f8a', '#4a3f7a', '#2f4a8a', '#5a4a8a', '#3a5a9a'];
  const ground = mesh(new THREE.PlaneGeometry(400, 400), M('#dfe6ff', { roughness: 1 }), false); ground.rotation.x = -Math.PI / 2; s.add(ground);
  const garlandPts = [];
  for (let gx = -14; gx <= 14; gx++) for (let gz = -2; gz >= -40; gz--) {
    if (Math.abs(gx) < 1 && gz > -36) continue; // the avenue the letter flies along
    if (R() < .25) continue;
    const w = 1.6 + R() * 1.6, d = 1.6 + R() * 1.6, h = 2 + R() * (Math.abs(gx) < 4 ? 5 : 9) + (gz < -25 ? R() * 6 : 0);
    const b = K.building(w, h, d, cols[Math.floor(R() * cols.length)], Math.floor(R() * 1e6)); b.position.set(gx * 3.2 + (R() - .5), 0, gz * 3.2 + (R() - .5)); s.add(b);
    if (R() < .3) for (let k = 0; k < 10; k++) garlandPts.push([b.position.x - w / 2 + k * w / 9, h + .25 + Math.sin(k / 9 * Math.PI) * -.15, b.position.z + d / 2 + .05]);
    if (R() < .06 && Math.abs(gx) > 5) { const sp = mesh(new THREE.ConeGeometry(.5, 3.5, 4), M(cols[0], { roughness: .8 })); sp.position.set(b.position.x, h + 1.75, b.position.z); s.add(sp); const tip = mesh(new THREE.SphereGeometry(.18, 8, 6), glow('#ff4a5e', 3)); tip.position.set(b.position.x, h + 3.6, b.position.z); s.add(tip); }
  }
  // avenue lamps with garlands
  for (let z = -2; z > -110; z -= 3.2) for (const sx of [-1.6, 1.6]) { const l = mesh(new THREE.SphereGeometry(.12, 10, 8), glow('#ffd59a', 2.5)); l.position.set(sx, 2.4, z); s.add(l); }
  for (let z = -2; z > -110; z -= 3.2) for (let k = 0; k <= 8; k++) garlandPts.push([-1.6 + k * .4, 2.7 - Math.sin(k / 8 * Math.PI) * .35, z]);
  const bulbs = new K.Bulbs(garlandPts, .06, 33); s.add(bulbs.obj);
  // the arena at the end of the avenue (generic dome, glowing windows, club colours)
  const arena = new THREE.Group(); arena.position.set(0, 0, -132); s.add(arena);
  const dome = mesh(new THREE.SphereGeometry(14, 64, 24, 0, TAU, 0, Math.PI / 2), M('#c9d2f2', { roughness: .35, metalness: .3 })); dome.scale.set(1, .45, 1); dome.position.y = 6; arena.add(dome);
  const drum = mesh(new THREE.CylinderGeometry(14, 14, 6, 64, 1, true), M('#2b3a8f', { roughness: .6, emissiveMap: K.winTex(48, 3, 5, .9), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.8 })); drum.position.y = 3; arena.add(drum);
  const band1 = mesh(new THREE.TorusGeometry(14.05, .18, 8, 96), glow(RED, 2.2)); band1.rotation.x = Math.PI / 2; band1.position.y = 5.8; arena.add(band1);
  const band2 = mesh(new THREE.TorusGeometry(14.05, .12, 8, 96), glow('#4a6aff', 2.2)); band2.rotation.x = Math.PI / 2; band2.position.y = 5.4; arena.add(band2);
  const win = mesh(new THREE.PlaneGeometry(3.5, 2.2), glow('#ffd59a', 2.2)); win.position.set(0, 7.2, 12.4); win.rotation.x = -.35; arena.add(win);
  s.add(new THREE.HemisphereLight('#7a8aff', '#2a2050', .5));
  const moonL = new THREE.DirectionalLight('#aab8ff', .8); moonL.position.set(10, 20, 10); s.add(moonL);
  const snow = new K.Snow(1500, { x0: -12, x1: 12, y0: 0, y1: 14, z0: -60, z1: 4 }, .09, 41); s.add(snow.obj);
  const L = K.letter(); L.draw(1); L.mesh.scale.setScalar(2.2); s.add(L.mesh);
  const path = new THREE.CatmullRomCurve3([[1.5, 2.6, 2], [0.8, 4.5, -4], [-.6, 7.5, -16], [.8, 9.5, -40], [-.5, 10.5, -70], [.3, 9.6, -100], [0, 7.6, -118]].map(p => new THREE.Vector3(...p)));
  return { scene: s, bulbs, snow, L, path, update(t) { bulbs.update(t); snow.update(t, .4); } };
}

// ————————————————————————— ARENA (scenes 3, 4) —————————————————————————
export function buildArena() {
  const s = base(.18); s.background = new THREE.Color('#05071c'); s.fog = new THREE.FogExp2('#0c1240', .035);
  const courtT = ctex(1024, 2048, (c, w, h) => { c.fillStyle = '#1f3fae'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a52d0'; c.fillRect(w * .08, h * .05, w * .84, h * .9); c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.strokeRect(w * .08, h * .05, w * .84, h * .9); c.beginPath(); c.moveTo(w * .08, h / 2); c.lineTo(w * .92, h / 2); c.stroke(); c.fillStyle = '#e3243a'; for (const y of [h * .05, h * .95]) { c.beginPath(); c.ellipse(w / 2, y, w * .3, h * .14, 0, 0, TAU); c.fill(); } c.strokeStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, h / 2, 90, 0, TAU); c.stroke(); });
  const court = mesh(new THREE.PlaneGeometry(20, 40), M('#ffffff', { map: courtT, roughness: .35, clearcoat: .6, clearcoatRoughness: .2 }), false); court.rotation.x = -Math.PI / 2; s.add(court);
  const surround = mesh(new THREE.PlaneGeometry(80, 80), M('#141a40', { roughness: .8 }), false); surround.rotation.x = -Math.PI / 2; surround.position.y = -.01; s.add(surround);
  // stands: stepped tiers on three sides with instanced blue seats
  const tierM = M('#1a1f4a', { roughness: .8 });
  const seatsPos = [];
  const tiers = (cx, cz, len, ry) => { const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; s.add(g); g.updateMatrixWorld(true); for (let i = 0; i < 12; i++) { const b = mesh(new THREE.BoxGeometry(len, .5, .9), tierM, false); b.position.set(0, .25 + i * .5, -i * .9); g.add(b); for (let x = -len / 2 + .4; x < len / 2; x += .55) { const v = new THREE.Vector3(x, .7 + i * .5, -i * .9 + .1); g.localToWorld(v); seatsPos.push([v.x, v.y, v.z, ry]); } } };
  s.updateMatrixWorld(); tiers(0, -14, 26, 0); tiers(-12, 0, 30, Math.PI / 2); tiers(12, 0, 30, -Math.PI / 2);
  s.children.forEach(c => c.updateMatrixWorld(true));
  const seats = new THREE.InstancedMesh(K.roundBox(.42, .38, .36, .06, 2), M(BLUE, { roughness: .4, clearcoat: .5 }), seatsPos.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); seatsPos.forEach(([x, y, z, ry], i) => { q.setFromEuler(new THREE.Euler(0, ry, 0)); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); seats.setMatrixAt(i, m4); }); s.add(seats);
  // LED ribbons
  for (const [x, z, w, ry] of [[0, -13.45, 26, 0], [-11.45, 0, 30, Math.PI / 2], [11.45, 0, 30, -Math.PI / 2]]) { for (const [y, c] of [[.95, RED], [.82, '#3f5cff']]) { const r = mesh(new THREE.BoxGeometry(w, .09, .03), glow(c, 2.2), false, false); r.position.set(x, y, z); r.rotation.y = ry; s.add(r); } }
  // back wall with a tall arched window
  const backW = mesh(new THREE.PlaneGeometry(60, 20), M('#141a4a', { roughness: .9 }), false); backW.position.set(0, 10, -25); s.add(backW);
  const archT = ctex(512, 768, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a1450'); g.addColorStop(1, '#3a4aa8'); c.fillStyle = g; c.beginPath(); c.moveTo(0, h); c.lineTo(0, w / 2); c.arc(w / 2, w / 2, w / 2, Math.PI, 0); c.lineTo(w, h); c.fill(); c.strokeStyle = '#d0d8ff'; c.lineWidth = 12; c.stroke(); c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(0, h * .55); c.lineTo(w, h * .55); c.stroke(); });
  const arch = mesh(new THREE.PlaneGeometry(5, 7.5), new THREE.MeshBasicMaterial({ map: archT, transparent: true, fog: false }), false, false); arch.position.set(0, 9.5, -24.9); s.add(arch);
  // scoreboard
  const sbT = ctex(1024, 512, (c, w, h) => { c.fillStyle = '#05061a'; c.fillRect(0, 0, w, h); c.font = '900 150px Nunito'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ffcf4a'; c.shadowBlur = 30; c.fillStyle = '#ffcf4a'; c.fillText('30.12', w / 2, h * .36); c.shadowColor = '#ff4a5e'; c.fillStyle = '#ff6a7a'; c.font = '900 110px Nunito'; c.fillText('23:47', w / 2, h * .75); });
  const sb = new THREE.Group(); sb.position.set(0, 8.5, -4); s.add(sb);
  for (let i = 0; i < 4; i++) { const f = mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: sbT, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }), false, false); f.position.set(Math.sin(i * Math.PI / 2) * 1.62, 0, Math.cos(i * Math.PI / 2) * 1.62); f.rotation.y = i * Math.PI / 2; sb.add(f); }
  const sbb = mesh(new THREE.BoxGeometry(3.3, 1.7, 3.3), M('#0a0b20', { roughness: .5 }), false); sb.add(sbb);
  // gate to the snowy night (scene 4 exit)
  const gate = mesh(new THREE.PlaneGeometry(4, 3.4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#3f5ad8').multiplyScalar(1.2), fog: false }), false, false); gate.position.set(9.99, 1.7, 3); gate.rotation.y = -Math.PI / 2; s.add(gate);
  const gateDoors = [-1, 1].map(sd => { const g = new THREE.Group(); g.position.set(9.95, 0, 3 + sd * 2); s.add(g); const d = mesh(new THREE.BoxGeometry(.08, 3.4, 2), M('#2a2f5a', { roughness: .5, metalness: .3 })); d.position.set(0, 1.7, -sd * 1); g.add(d); return g; });
  const gateWall = mesh(new THREE.PlaneGeometry(40, 8), M('#141a4a', { roughness: .9 }), false); gateWall.position.set(10, 4, 0); gateWall.rotation.y = -Math.PI / 2; s.add(gateWall);
  // lights
  s.add(new THREE.HemisphereLight('#5a6aff', '#10122a', .35));
  const spot = shadowLight(new THREE.SpotLight('#ffe7c4', 160, 26, .42, .55, 1.4)); spot.position.set(0, 13, 5); spot.target.position.set(0, 0, 0); s.add(spot, spot.target);
  const spot2 = new THREE.SpotLight('#9fb4ff', 60, 30, .35, .6, 1.4); spot2.position.set(-6, 12, -6); spot2.target.position.set(1, 0, 1); s.add(spot2, spot2.target);
  const fill = new THREE.PointLight('#ff6a7a', 4, 12, 1.5); fill.position.set(4, 2, 4); s.add(fill);
  const snowOut = new K.Snow(300, { x0: -2.5, x1: 2.5, y0: 5.5, y1: 13, z0: -24.6, z1: -24.2 }, .08, 51); s.add(snowOut.obj);
  const dust = new K.Snow(250, { x0: -6, x1: 6, y0: 0, y1: 8, z0: -6, z1: 6 }, .03, 52, .35); s.add(dust.obj);
  const L = K.letter(); L.draw(1); s.add(L.mesh);
  const b = K.ball(.095); s.add(b);
  const sl = K.sled(1, true); s.add(sl.root);
  return { scene: s, L, ball: b, sled: sl, gateDoors, snowOut, dust, update(t) { snowOut.update(t); dust.update(t * .3); } };
}

// ————————————————————————— DOORWAYS (scene 5) & SONYA'S HOUSE (scene 6) —————————————————————————
export function buildStreet(o = {}) {
  const s = base(.18), dawn = !!o.dawn;
  s.background = new THREE.Color(dawn ? '#6a6ab0' : '#0b1040'); s.fog = new THREE.FogExp2(dawn ? '#c9a8c8' : '#1a2266', .04);
  s.add(dawn ? K.skyDome('#3a4a9a', '#b98ab8', '#ffd2a8', 80) : K.skyDome('#060a2a', '#1a2470', '#4a4a9a', 80)); if (!dawn) s.add(K.stars(300, 70, 3));
  const ground = mesh(new THREE.PlaneGeometry(200, 200), M('#eef2ff', { roughness: .95 }), false); ground.rotation.x = -Math.PI / 2; s.add(ground);
  const R = mulberry(o.seed || 61);
  // background houses
  for (let i = -6; i <= 6; i++) { const b = K.building(3 + R() * 2, 4 + R() * 6, 3, ['#3a3f8a', '#4a3f7a', '#5a4a8a'][i & 1 ? 1 : 0], 100 + i, { lit: dawn ? .15 : .5, ei: dawn ? .6 : 1.6 }); b.position.set(i * 5.2, 0, -14 - R() * 6); s.add(b); }
  // the facades with doors: x positions
  const doors = (o.doors || [{ x: 0, wall: '#c96a4a', door: '#2438d0' }]).map((d, i) => {
    const g = new THREE.Group(); g.position.set(d.x, 0, 0); s.add(g);
    const wallM = M(d.wall, { roughness: .85 });
    const piece = (w, h, x, y) => { const m = mesh(new THREE.BoxGeometry(w, h, .3), wallM); m.position.set(x, y, -.15); g.add(m); };
    piece(1.6, 4.2, -1.3, 2.1); piece(1.6, 4.2, 1.3, 2.1); piece(1.0, 2.1, 0, 3.15);
    const roofSnow = mesh(K.roundBox(4.4, .25, .9, .1), M('#ffffff', { roughness: .9 })); roofSnow.position.set(0, 4.3, 0); g.add(roofSnow);
    const interior = mesh(new THREE.BoxGeometry(1.0, 2.1, 1.6), M('#ffcf9a', { roughness: .9, side: THREE.BackSide, emissive: new THREE.Color('#ffb060'), emissiveIntensity: .35 }), false); interior.position.set(0, 1.05, -1.1); g.add(interior);
    const inL = new THREE.PointLight('#ffb870', 2.5, 4, 1.5); inL.position.set(0, 1.6, -1.2); g.add(inL);
    const hinge = new THREE.Group(); hinge.position.set(-.5, 0, -.05); g.add(hinge);
    const dm = mesh(K.roundBox(1.0, 2.08, .07, .02), M(d.door, { roughness: .4, clearcoat: .5 })); dm.position.set(.5, 1.04, 0); hinge.add(dm);
    const kn = mesh(new THREE.SphereGeometry(.04, 12, 8), M(GOLD, { metalness: .9, roughness: .2 })); kn.position.set(.88, 1.0, .06); hinge.add(kn);
    const wr = mesh(new THREE.TorusGeometry(.2, .07, 12, 32), M('#1f6b45', { roughness: .8 })); wr.position.set(.5, 1.55, .07); hinge.add(wr);
    const bow = mesh(new THREE.SphereGeometry(.06, 12, 8), M(RED, { roughness: .4 })); bow.position.set(.5, 1.38, .1); hinge.add(bow);
    const step = mesh(K.roundBox(1.6, .14, .6, .03), M('#d8dcef', { roughness: .8 })); step.position.set(0, .07, .3); g.add(step);
    const lampL = new THREE.PointLight('#ffc27a', 3, 4, 1.6); lampL.position.set(.85, 2.4, .5); g.add(lampL);
    const lampB = mesh(new THREE.SphereGeometry(.09, 12, 8), glow('#ffd8a0', 2.5)); lampB.position.set(.85, 2.4, .12); g.add(lampB);
    for (const wx of [-1.3, 1.3]) { const w = mesh(new THREE.PlaneGeometry(.8, 1.0), glow(dawn && !d.lit ? '#6a6a9a' : '#ffcf8a', dawn && !d.lit ? .6 : 1.4), false, false); w.position.set(wx, 2.3, .01); g.add(w); const sill = mesh(K.roundBox(.95, .08, .2, .02), M('#ffffff', { roughness: .9 })); sill.position.set(wx, 1.76, .08); g.add(sill); }
    const gPts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; gPts.push([-.6 + u * 1.2, 2.3 - Math.sin(u * Math.PI) * .12, .06]); }
    const bl = new K.Bulbs(gPts, .03, 70 + i); g.add(bl.obj);
    return { g, hinge, interior, bl };
  });
  s.add(new THREE.HemisphereLight(dawn ? '#ffd8e8' : '#6a7aff', dawn ? '#8a7aa0' : '#20183a', dawn ? .9 : .45));
  const key = shadowLight(new THREE.DirectionalLight(dawn ? '#ffd2b0' : '#9fb0ff', dawn ? 1.6 : .7), 6); key.position.set(4, 8, 6); s.add(key);
  const snow = new K.Snow(900, { x0: -10, x1: 10, y0: 0, y1: 8, z0: -8, z1: 8 }, .05, 62); s.add(snow.obj);
  const spark = new K.Sparkles(90, '#ffd36a', 7, .08); s.add(spark.obj);
  const sl = K.sled(.85, !o.empty); s.add(sl.root);
  return { scene: s, doors, snow, spark, sled: sl, update(t) { snow.update(t, .2); doors.forEach(d => d.bl.update(t)); } };
}

// ————————————————————————— FINALE (scene 9) —————————————————————————
export function buildFinale() {
  const s = base(.35); s.background = new THREE.Color('#0b1040');
  s.add(K.skyDome('#0a1040', '#1d2a8a', '#4a3f9a', 60));
  s.add(new THREE.HemisphereLight('#ffe9cf', '#2a2050', .5));
  const key = shadowLight(new THREE.DirectionalLight('#ffe2c0', 2.2), 3); key.position.set(2, 4, 5); s.add(key);
  const rim = new THREE.DirectionalLight('#7a9aff', 2.2); rim.position.set(-3, 3, -4); s.add(rim);
  const R = mulberry(5), bp = []; for (let i = 0; i < 70; i++) bp.push([(R() - .5) * 14, R() * 3 - .5, -4 - R() * 6]);
  const bok = new K.Bulbs(bp, .12, 9); s.add(bok.obj);
  const ground = mesh(new THREE.CircleGeometry(30, 48), M('#e6ebff', { roughness: .95 }), false); ground.rotation.x = -Math.PI / 2; s.add(ground);
  const snow = new K.Snow(700, { x0: -6, x1: 6, y0: 0, y1: 5, z0: -6, z1: 3 }, .045, 91); s.add(snow.obj);
  const fws = [RED, '#5a7bff', GOLD, '#ffffff', RED, '#5a7bff'].map((c, i) => { const f = new K.Firework(c, 140, 30 + i); s.add(f.obj); return f; });
  return { scene: s, bok, snow, fws, update(t) { bok.update(t); snow.update(t, .1); } };
}
