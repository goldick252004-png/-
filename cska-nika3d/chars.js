// 3D characters built from soft primitives: Ника (after the club's costume photos), the girl, team players.
// Every builder returns { root, pose(p) }; p fields are documented in defaultPose().
import * as THREE from 'three';

const TAU = Math.PI * 2;
export const COL = {
  fur: '#9c9ca6', furD: '#7e7e8a', muzzle: '#b3b3bb', blaze: '#f6f5f8', mane: '#1c181f', nostril: '#3a3640',
  red: '#e3243a', blue: '#2438d0', blueD: '#18268f', glove: '#55555e', bracelet: '#f2b51e', boot: '#55555e', cuff: '#c9c9d2',
  mouth: '#5a0f1e', tongue: '#ea5a72', lip: '#ecebef', iris: '#2f6fe0'
};
const mats = new Map();
export function M(color, o = {}) {
  const k = color + JSON.stringify(o); if (mats.has(k)) return mats.get(k);
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: .55, ...o }); mats.set(k, m); return m;
}
const FUR = () => M(COL.fur, { roughness: .85, sheen: .45, sheenColor: new THREE.Color('#d6d6e4'), sheenRoughness: .5 });
const mesh = (g, m, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; };
const sph = (r, ws = 32, hs = 24) => new THREE.SphereGeometry(r, ws, hs);
const limbGeo = (r, len, r2 = r) => { const g = new THREE.CapsuleGeometry((r + r2) / 2, len, 8, 20); g.translate(0, -len / 2, 0); return g; };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function defaultPose() {
  return {
    x: 0, y: 0, z: 0, rotY: 0, lean: 0, side: 0, bob: 0, breath: 0,
    head: [0, 0, 0],            // yaw, pitch (+ looks down), roll
    look: [0, 0],               // eye direction (−1..1)
    blink: 0, mouth: .8, earDrop: 0, brows: 0, smile: 1,
    armL: [.15, .1, .25], armR: [.15, .1, .25],   // raise (out to the side), forward swing, elbow bend
    handL: 0, handR: 0,         // 0 = soft fist, 1 = open hand
    legL: [0, 0], legR: [0, 0], // forward swing, knee bend
    squash: 0
  };
}

// —— eyes with painted iris; lids made of the skin/fur material ——
function eyeTex(iris) {
  return canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    const cx = w * .25, cy = h * .5;
    const g = c.createRadialGradient(cx, cy, 4, cx, cy, 46); g.addColorStop(0, '#0d1a40'); g.addColorStop(.38, '#0d1a40'); g.addColorStop(.42, iris); g.addColorStop(.85, iris); g.addColorStop(1, '#111a3a');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, 44, 50, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(cx + 8, cy + 18, 16, 10, 0, 0, TAU); c.fill();
  });
}
function makeEye(r, iris, lidMat, lashes) {
  const g = new THREE.Group();
  const ball = mesh(sph(r, 40, 28), new THREE.MeshPhysicalMaterial({ map: eyeTex(iris), roughness: .15, clearcoat: 1, clearcoatRoughness: .05 }), false);
  ball.rotation.y = 0; g.add(ball);
  // highlight sparkle (always facing forward-up)
  const hl = mesh(sph(r * .16, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), false); hl.position.set(-r * .28, r * .32, r * .93); g.add(hl);
  const lid = new THREE.Group(); g.add(lid);
  const lidMesh = mesh(new THREE.SphereGeometry(r * 1.07, 32, 16, 0, TAU, 0, Math.PI / 2), lidMat, false); lid.add(lidMesh);
  if (lashes) {
    const lm = M('#141018', { roughness: .4 });
    for (let i = 0; i < 3; i++) {
      const l = mesh(new THREE.ConeGeometry(r * .07, r * .55, 6), lm, false);
      const a = (lashes > 0 ? 1 : -1) * (.55 + i * .35);
      l.position.set(Math.sin(a) * r * 1.02, r * .25, Math.cos(a) * r * .95);
      l.rotation.set(-.9, 0, -(lashes > 0 ? 1 : -1) * (.6 + i * .3)); lid.add(l);
    }
  }
  return { g, ball, lid, hl, set(lookX, lookY, blink) { ball.rotation.set(-lookY * .35, lookX * .45, 0); lid.rotation.x = -.62 + blink * 2.25; } };
}

// —— a limb chain: shoulder → elbow → hand ——
function makeArm(side, o) {
  const sh = new THREE.Group(); sh.position.set(side * o.shX, o.shY, 0);
  sh.add(mesh(limbGeo(o.r, o.L1, o.r * .92), o.skin));
  if (o.sleeve) { const s = mesh(new THREE.CylinderGeometry(o.r * 1.45, o.r * 1.6, o.sleeveLen, 24, 1, true), o.sleeve); s.position.y = -o.sleeveLen / 2 + o.r * .3; s.material.side = THREE.DoubleSide; sh.add(s); s.add(sphereCap(o.r * 1.45, o.sleeve, o.sleeveLen / 2)); if (o.trim) { const tr = mesh(new THREE.TorusGeometry(o.r * 1.58, o.r * .2, 8, 24), o.trim); tr.rotation.x = Math.PI / 2; tr.position.y = -o.sleeveLen / 2; s.add(tr); } }
  const el = new THREE.Group(); el.position.y = -o.L1; sh.add(el);
  el.add(mesh(limbGeo(o.r * .92, o.L2, o.r * .85), o.skin));
  const hand = new THREE.Group(); hand.position.y = -o.L2 - o.hand * .55; el.add(hand);
  const palm = mesh(sph(o.hand, 24, 18), o.glove); palm.scale.set(1, 1.05, .8); hand.add(palm);
  const fingers = [];
  for (let i = 0; i < 4; i++) { const f = new THREE.Group(); f.position.set((i - 1.5) * o.hand * .45, -o.hand * .55, 0); const fm = mesh(limbGeo(o.hand * .24, o.hand * .55), o.glove); f.add(fm); hand.add(f); fingers.push(f); }
  const th = new THREE.Group(); th.position.set(-side * o.hand * .75, -o.hand * .1, o.hand * .3); th.add(mesh(limbGeo(o.hand * .26, o.hand * .5), o.glove)); th.rotation.z = -side * .9; hand.add(th);
  if (o.bracelet) { const b = mesh(new THREE.TorusGeometry(o.r * .95, o.r * .16, 8, 24), o.bracelet); b.rotation.x = Math.PI / 2; b.position.y = -o.L2 + o.r * .3; el.add(b); }
  return {
    root: sh, el, hand,
    set([raise, fwd, bend], open) {
      sh.rotation.set(-fwd, 0, side * raise, 'ZXY');
      el.rotation.set(-bend, 0, 0);
      fingers.forEach((f, i) => { f.rotation.x = (1 - open) * -1.6; f.rotation.z = open * (i - 1.5) * .22 * side; });
      hand.rotation.set(0, 0, side * open * -.1);
    }
  };
}
function sphereCap(r, m, y) { const c = mesh(new THREE.SphereGeometry(r, 24, 10, 0, TAU, 0, Math.PI / 2), m); c.position.y = y - .001; return c; }
function makeLeg(side, o) {
  const hip = new THREE.Group(); hip.position.set(side * o.hipX, o.hipY, 0);
  hip.add(mesh(limbGeo(o.r, o.L1, o.r * .95), o.skin));
  const kn = new THREE.Group(); kn.position.y = -o.L1; hip.add(kn);
  kn.add(mesh(limbGeo(o.r * .95, o.L2, o.r * .85), o.sock || o.skin));
  const foot = new THREE.Group(); foot.position.y = -o.L2 - o.r * .4; kn.add(foot);
  const shoe = mesh(sph(o.r * 1.5, 24, 16), o.shoe); shoe.scale.set(1.05, .62, 1.5); shoe.position.set(0, -o.r * .25, o.r * .55); foot.add(shoe);
  if (o.cuff) { for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, b = mesh(sph(o.r * .42, 10, 8), o.cuff); b.position.set(Math.cos(a) * o.r * 1.05, o.r * .55 + (i % 2) * o.r * .1, Math.sin(a) * o.r * 1.05); foot.add(b); } }
  if (o.sole) { const s = mesh(sph(o.r * 1.5, 24, 8), o.sole); s.scale.set(1.08, .2, 1.55); s.position.set(0, -o.r * .62, o.r * .55); foot.add(s); }
  return { root: hip, set([fwd, bend]) { hip.rotation.set(-fwd, 0, side * .03); kn.rotation.x = bend; foot.rotation.x = -bend * .4 + fwd * .3; } };
}

// —— shared body driver ——
function driver(root, body, neck, headG, parts) {
  return p => {
    root.position.set(p.x, p.y, p.z); root.rotation.y = p.rotY;
    const br = 1 + Math.sin(p.breath) * .012;
    body.position.y = -p.bob; body.rotation.set(p.lean, 0, p.side);
    body.scale.set(1 + p.squash * .1, (1 - p.squash * .1) * br, 1 + p.squash * .1);
    headG.rotation.set(p.head[1], p.head[0], p.head[2], 'YXZ');
    parts.arms[0].set(p.armL, p.handL); parts.arms[1].set(p.armR, p.handR);
    parts.legs[0].set(p.legL); parts.legs[1].set(p.legR);
    parts.eyes.forEach(e => e.set(p.look[0], p.look[1], p.blink));
    parts.face && parts.face(p);
  };
}
function lathe(profile, seg = 48) { return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg); }

// ————————————————————————— Ника —————————————————————————
export function buildNika() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const fur = FUR(), furD = M(COL.furD, { roughness: .9, sheen: 1, sheenColor: new THREE.Color('#ddddea') });
  const glove = M(COL.glove, { roughness: .8, sheen: .6, sheenColor: new THREE.Color('#aaaab8') });
  const blue = M(COL.blue, { roughness: .6, sheen: .15, sheenColor: new THREE.Color('#8090ff') }), red = M(COL.red, { roughness: .6 });
  // jersey: red pin-stripes thinning to blue
  const jt = canvasTex(64, 512, (c, w, h) => { c.fillStyle = COL.blue; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 14) { const k = y / h, hh = 12 * Math.pow(k, 1.3); if (hh > .6) { c.fillStyle = COL.red; c.fillRect(0, y, w, hh); } } });
  const torso = mesh(lathe([[.001, .7], [.19, .7], [.215, .78], [.235, .92], [.245, 1.0], [.22, 1.06], [.12, 1.12], [.001, 1.13]]), M('#ffffff', { map: jt, roughness: .62 }));
  body.add(torso);
  // skirt with pleats and a white stripe
  const st = canvasTex(32, 256, (c, w, h) => { c.fillStyle = COL.blue; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.fillRect(0, h * .1, w, h * .07); });
  const sg = lathe([[.2, .76], [.24, .7], [.3, .6], [.34, .5]], 96); const pa = sg.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), y = pa.getY(i), a = Math.atan2(z, x), k = (.76 - y) / .26, d = 1 + Math.sin(a * 18) * .05 * k; pa.setX(i, x * d); pa.setZ(i, z * d); }
  sg.computeVertexNormals();
  const skirt = mesh(sg, M('#ffffff', { map: st, roughness: .5, side: THREE.DoubleSide })); body.add(skirt);
  // scarf
  const scarfM = M('#2338c6', { roughness: .8, sheen: .3, sheenColor: new THREE.Color('#7f8cff') });
  const sc = mesh(new THREE.TorusGeometry(.135, .05, 16, 40), scarfM); sc.rotation.x = Math.PI / 2 - .15; sc.position.set(0, 1.1, .01); body.add(sc);
  const tail = new THREE.Group(); tail.position.set(-.07, 1.08, .235); tail.rotation.set(-.12, 0, .1); body.add(tail);
  const tb = mesh(new THREE.BoxGeometry(.1, .3, .03, 2, 6, 1), scarfM); tb.position.y = -.15; tail.add(tb);
  const tr = mesh(new THREE.BoxGeometry(.102, .05, .034), M(COL.red, { roughness: .8 })); tr.position.y = -.28; tail.add(tr);
  for (let i = 0; i < 6; i++) { const f = mesh(new THREE.CylinderGeometry(.006, .006, .06, 6), M(COL.red, { roughness: .8 })); f.position.set(-.042 + i * .017, -.33, 0); tail.add(f); }
  for (const y of [-.07, -.17]) { const s = mesh(starGeo(.022, .009, .006), M('#ffffff', { roughness: .5 })); s.position.set(0, y, .017); tail.add(s); }
  // limbs
  const arms = [-1, 1].map(s => makeArm(s, { shX: .245, shY: 1.0, r: .055, L1: .25, L2: .23, hand: .068, skin: fur, glove, sleeve: blue, sleeveLen: .14, trim: red, bracelet: s > 0 ? M(COL.bracelet, { roughness: .3, metalness: .2 }) : null }));
  arms.forEach(a => body.add(a.root));
  const legs = [-1, 1].map(s => makeLeg(s, { hipX: .1, hipY: .62, r: .07, L1: .26, L2: .25, skin: fur, shoe: M(COL.boot, { roughness: .7 }), cuff: M(COL.cuff, { roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffffff') }) }));
  legs.forEach(l => root.add(l.root));
  // —— head ——
  const neck = new THREE.Group(); neck.position.set(0, 1.13, 0); body.add(neck);
  const headG = new THREE.Group(); headG.position.set(0, .03, 0); neck.add(headG);
  const H0 = new THREE.Vector3(0, .27, .0); // head centre
  const skullT = canvasTex(1024, 512, (c, w, h) => { c.fillStyle = COL.fur; c.fillRect(0, 0, w, h); const cx = w * .25; c.fillStyle = COL.blaze; c.beginPath(); c.moveTo(cx - 42, h * .06); c.quadraticCurveTo(cx - 58, h * .2, cx - 20, h * .38); c.lineTo(cx, h * .46); c.lineTo(cx + 20, h * .38); c.quadraticCurveTo(cx + 58, h * .2, cx + 42, h * .06); c.closePath(); c.fill(); });
  const furHead = M('#ffffff', { map: skullT, roughness: .85, sheen: .45, sheenColor: new THREE.Color('#d6d6e4'), sheenRoughness: .5 });
  const skull = mesh(sph(.24, 48, 36), furHead); skull.scale.set(1, 1.1, .95); skull.position.set(0, .3, 0); headG.add(skull);
  const muzT = canvasTex(1024, 512, (c, w, h) => { c.fillStyle = COL.muzzle; c.fillRect(0, 0, w, h); const cx = w * .25; const g = c.createLinearGradient(0, 0, 0, h * .4); g.addColorStop(0, COL.blaze); g.addColorStop(1, COL.muzzle); c.fillStyle = g; c.beginPath(); c.ellipse(cx, 0, 22, h * .3, 0, 0, TAU); c.fill(); });
  const muzzle = mesh(sph(.18, 48, 36), M('#ffffff', { map: muzT, roughness: .85, sheen: .4, sheenColor: new THREE.Color('#e6e6ee'), sheenRoughness: .5 }));
  muzzle.scale.set(1.02, .9, 1.3); muzzle.position.set(0, .13, .15); headG.add(muzzle);
  // nostrils
  for (const s of [-1, 1]) { const n = mesh(sph(.028, 16, 12), M(COL.nostril, { roughness: .6 }), false); n.scale.set(.75, 1.1, .5); n.position.set(s * .068, .19, .365); n.rotation.set(-.5, 0, s * .5); headG.add(n); }
  // mouth: lower half-sphere = open smile; light lip rim; tongue
  const mouthG = new THREE.Group(); mouthG.position.set(0, .09, .33); mouthG.rotation.x = .15; headG.add(mouthG);
  const lipM = M(COL.lip, { roughness: .6 }), mouthM = M(COL.mouth, { roughness: .5 });
  const lip = mesh(new THREE.SphereGeometry(.12, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2), lipM, false); lip.scale.set(1.2, 1, .5); mouthG.add(lip);
  const cav = mesh(new THREE.SphereGeometry(.104, 32, 16, 0, TAU, Math.PI / 2, Math.PI / 2), mouthM, false); cav.scale.set(1.18, .92, .5); cav.position.set(0, -.004, .014); mouthG.add(cav);
  const tongue = mesh(sph(.055, 20, 14), M(COL.tongue, { roughness: .4 }), false); tongue.scale.set(1.3, .45, .5); tongue.position.set(0, -.07, .045); mouthG.add(tongue);
  for (const s of [-1, 1]) { const c = mesh(sph(.045, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#ff8aa0', transparent: true, opacity: .3, roughness: .8 }), false); c.scale.set(1, .6, .3); c.position.set(s * .175, .24, .2); c.rotation.y = s * .6; headG.add(c); }
  // eyes
  const lidM = M(COL.fur, { roughness: .9, sheen: 1, sheenColor: new THREE.Color('#f2f2ff') });
  const eyes = [-1, 1].map(s => { const e = makeEye(.072, COL.iris, lidM, s); e.g.position.set(s * .108, .35, .16); e.g.rotation.set(0, s * .3, s * -.05); headG.add(e.g); return e; });
  // brows (tufts) for expressions
  const brows = [-1, 1].map(s => { const b = mesh(limbGeo(.012, .07), M(COL.furD, { roughness: .9 }), false); b.rotation.z = Math.PI / 2; b.position.set(s * .12, .45, .2); headG.add(b); return b; });
  // ears
  const ears = [-1, 1].map(s => {
    const eg = new THREE.Group(); eg.position.set(s * .14, .56, -.02); headG.add(eg);
    const e = mesh(lathe([[.001, -.02], [.06, .01], [.07, .07], [.05, .14], [.02, .19], [.001, .2]], 24), fur); e.scale.set(1, 1, .5); eg.add(e);
    const ei = mesh(lathe([[.001, .0], [.04, .03], [.042, .08], [.025, .14], [.001, .155]], 16), M(COL.furD, { roughness: .9 }), false); ei.scale.set(1, 1, .3); ei.position.set(0, .01, .02); eg.add(ei);
    return eg;
  });
  // mane: dark mass + glossy curls (instanced tori + spheres)
  const maneM = M(COL.mane, { roughness: .32, clearcoat: .4, clearcoatRoughness: .3, sheen: .6, sheenColor: new THREE.Color('#5a4a66') });
  const back = mesh(sph(.27, 32, 24), maneM); back.scale.set(1.08, 1.0, .9); back.position.set(0, .3, -.1); headG.add(back);
  const R = mulberry(5), tor = new THREE.TorusGeometry(.04, .02, 10, 20), ball = sph(.045, 14, 10);
  const pts = [];
  // cap around top/back/sides of the head
  for (let i = 0; i < 260; i++) {
    const u = R() * TAU, v = Math.acos(1 - 2 * R()); let x = Math.sin(v) * Math.cos(u), y = Math.cos(v), z = Math.sin(v) * Math.sin(u);
    if (z > .1 && y < .62 && Math.abs(x) < .8) continue; if (y < -.35) continue; if (z > .45 && y < .85) continue; if (y > .55 && Math.abs(Math.abs(x) - .45) < .2 && z > -.2) continue;
    pts.push([x * .29, .31 + y * .28, -.06 + z * .26, x, y, z]);
  }
  // side curtains down to the shoulders
  for (let i = 0; i < 100; i++) { const s = i % 2 ? 1 : -1, k = R(); pts.push([s * (.25 + R() * .06 + k * .03), .22 - k * .55, -.14 + R() * .14, s, 0, -.1]); }
  const curlT = new THREE.InstancedMesh(tor, maneM, pts.length), curlB = new THREE.InstancedMesh(ball, maneM, pts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc3 = new THREE.Vector3(), nrm = new THREE.Vector3(), zz = new THREE.Vector3(0, 0, 1);
  pts.forEach(([x, y, z, nx, ny, nz], i) => {
    nrm.set(nx, ny, nz).normalize(); q.setFromUnitVectors(zz, nrm); const s = .85 + R() * .5;
    sc3.set(s, s, s); m4.compose(new THREE.Vector3(x, y, z), q, sc3); curlT.setMatrixAt(i, m4);
    sc3.set(s * .9, s * .9, s * .9); m4.compose(new THREE.Vector3(x - nx * .01, y - ny * .01, z - nz * .01), q, sc3); curlB.setMatrixAt(i, m4);
  });
  curlT.castShadow = curlB.castShadow = true; headG.add(curlT, curlB);
  const face = p => {
    mouthG.scale.set(1, .25 + Math.max(0, p.mouth) * .85, 1); mouthG.visible = p.mouth > -.5;
    ears.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.set(-.1, 0, -s * (.35 + p.earDrop * 1.0)); });
    brows.forEach((b, i) => { const s = i ? 1 : -1; b.visible = false; b.position.y = .45 + p.brows * .025; b.rotation.z = Math.PI / 2 + s * (p.brows * .25 - (p.sad || 0) * .35); });
  };
  const pose = driver(root, body, neck, headG, { arms, legs, eyes, face });
  return { root, pose, hands: () => arms.map(a => a.hand), head: headG };
}
function starGeo(r, r2, d) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r2 : r; i ? s.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr); } return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ————————————————————————— people (the girl, team players, fans) —————————————————————————
// o: { h (height scale), skin, hair, style: 'buns'|'ponytail'|'bob'|'braid'|'short'|'grey-bun', iris, top: canvas painter, topCol, bottom, sock, shoe, child }
export function buildPerson(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const child = !!o.child, S = o.h || 1;
  const skin = M(o.skin, { roughness: .6, sheen: .3, sheenColor: new THREE.Color('#ffd9c9'), clearcoat: .05 });
  const topT = o.top ? canvasTex(256, 256, o.top) : null;
  const topM = M(o.topCol || '#ffffff', { map: topT, roughness: .7, sheen: .4, sheenColor: new THREE.Color('#ffffff') });
  const D = child ? { hipY: .42, L1: .19, L2: .19, legR: .055, tor: [.15, .17, .17, .1], torY: [.38, .66], shY: .62, shX: .17, armR: .042, A1: .17, A2: .16, hand: .05, headR: .2, neck: .68 }
    : { hipY: .82, L1: .4, L2: .38, legR: .065, tor: [.16, .19, .2, .09], torY: [.78, 1.32], shY: 1.27, shX: .2, armR: .045, A1: .27, A2: .25, hand: .052, headR: .145, neck: 1.33 };
  const [y0, y1] = D.torY, dy = y1 - y0;
  const torso = mesh(lathe([[.001, y0], [D.tor[0], y0], [D.tor[1] * (o.female ? .92 : 1), y0 + dy * .35], [D.tor[2], y0 + dy * .75], [D.tor[2] * .85, y0 + dy * .93], [D.tor[3], y1], [.001, y1 + .01]]), topM);
  body.add(torso);
  // bottoms: shorts / pants / skirt
  const botM = M(o.bottom || '#2438d0', { roughness: .7, sheen: .4, sheenColor: new THREE.Color('#ffffff') });
  const bot = mesh(lathe([[.001, y0 + .06], [D.tor[0] * 1.02, y0 + .06], [D.tor[0] * 1.08, y0 - .04], [D.tor[0] * 1.1, y0 - (o.long ? .05 : .12)], [.001, y0 - .12]]), botM); body.add(bot);
  const arms = [-1, 1].map(s => makeArm(s, { shX: D.shX, shY: D.shY, r: D.armR, L1: D.A1, L2: D.A2, hand: D.hand, skin: o.sleeves === 'long' ? topM : skin, glove: skin, sleeve: o.sleeves === 'long' ? null : topM, sleeveLen: D.A1 * .5, trim: o.trim ? M(o.trim, { roughness: .7 }) : null }));
  arms.forEach(a => body.add(a.root));
  const legs = [-1, 1].map(s => makeLeg(s, { hipX: D.tor[0] * .5, hipY: D.hipY, r: D.legR, L1: D.L1, L2: D.L2, skin: o.long ? botM : skin, sock: o.sock ? M(o.sock, { roughness: .8 }) : (o.long ? botM : skin), shoe: M(o.shoe || '#ffffff', { roughness: .5 }), sole: M('#e9e9ef', { roughness: .6 }) }));
  legs.forEach(l => root.add(l.root));
  const neck = new THREE.Group(); neck.position.y = D.neck; body.add(neck);
  const headG = new THREE.Group(); neck.add(headG);
  const r = D.headR, hc = new THREE.Vector3(0, r * 1.02, 0);
  const head = mesh(sph(r, 48, 36), skin); head.scale.set(1, 1.04, .98); head.position.copy(hc); headG.add(head);
  for (const s of [-1, 1]) { const e = mesh(sph(r * .2, 16, 12), skin); e.scale.set(.6, 1, .8); e.position.set(s * r * .98, hc.y - r * .05, 0); headG.add(e); }
  const nose = mesh(sph(r * .1, 16, 12), skin); nose.position.set(0, hc.y - r * .12, r * .98); headG.add(nose);
  for (const s of [-1, 1]) { const c = mesh(sph(r * .17, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#ff7f95', transparent: true, opacity: .35, roughness: .8 }), false); c.scale.set(1, .6, .3); c.position.set(s * r * .52, hc.y - r * .2, r * .84); headG.add(c); }
  const mouthG = new THREE.Group(); mouthG.position.set(0, hc.y - r * .38, r * .9); headG.add(mouthG);
  const mo = mesh(new THREE.SphereGeometry(r * .24, 24, 12, 0, TAU, Math.PI / 2, Math.PI / 2), M('#7a1f2e', { roughness: .5 }), false); mo.scale.set(1.2, .9, .5); mouthG.add(mo);
  const tg = mesh(sph(r * .1, 12, 8), M('#ee6b80', { roughness: .4 }), false); tg.scale.set(1.3, .5, .6); tg.position.set(0, -r * .14, r * .03); mouthG.add(tg);
  const teeth = mesh(new THREE.BoxGeometry(r * .36, r * .06, r * .05), M('#ffffff', { roughness: .3 }), false); teeth.position.set(0, -r * .02, r * .05); mouthG.add(teeth);
  const eyes = [-1, 1].map(s => { const e = makeEye(r * (child ? .3 : .23), o.iris || '#6a3b1f', skin, o.lashes ? s : 0); e.g.position.set(s * r * .38, hc.y + r * .08, r * .8); e.g.rotation.y = s * .25; headG.add(e.g); return e; });
  const brows = [-1, 1].map(s => { const b = mesh(limbGeo(r * .045, r * .3), M(o.brow || o.hair, { roughness: .8 }), false); b.rotation.z = Math.PI / 2; b.position.set(s * r * .38, hc.y + r * .44, r * .88); headG.add(b); return b; });
  // hair
  const hairM = M(o.hair, { roughness: .45, sheen: .8, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: .35, clearcoat: .2 });
  const cap = mesh(new THREE.SphereGeometry(r * 1.07, 48, 24, 0, TAU, 0, Math.PI * .58), hairM); cap.position.copy(hc); cap.rotation.x = -.38; headG.add(cap);
  const fringe = mesh(new THREE.SphereGeometry(r * 1.06, 40, 12, Math.PI * .25, Math.PI * .5, Math.PI * .22, Math.PI * .18), hairM); fringe.position.copy(hc); headG.add(fringe);
  const sideL = (s, len, w) => { const g = mesh(limbGeo(r * w, len), hairM); g.position.set(s * r * .85, hc.y + r * .25, -r * .2); g.rotation.z = s * .08; headG.add(g); return g; };
  const st = o.style;
  if (st === 'buns') for (const s of [-1, 1]) { const b = mesh(sph(r * .38, 24, 18), hairM); b.position.set(s * r * .78, hc.y + r * .62, -r * .15); headG.add(b); const bow = mesh(new THREE.TorusGeometry(r * .2, r * .08, 8, 16), M('#e3243a', { roughness: .5 })); bow.position.set(s * r * .7, hc.y + r * .38, -r * .05); bow.rotation.y = s * .8; headG.add(bow); }
  if (st === 'ponytail' || st === 'braid') { const pt = new THREE.Group(); pt.position.set(0, hc.y + r * .55, -r * .85); headG.add(pt); const tie = mesh(new THREE.TorusGeometry(r * .14, r * .06, 8, 16), M(o.tie || '#e3243a', { roughness: .5 })); pt.add(tie);
    if (st === 'braid') for (let i = 0; i < 6; i++) { const b = mesh(sph(r * (.22 - i * .015), 16, 12), hairM); b.position.set(0, -r * (.15 + i * .3), -r * .1 - i * r * .02); pt.add(b); }
    else { const tl = mesh(limbGeo(r * .26, r * 1.1, r * .12), hairM); tl.rotation.x = .5; pt.add(tl); }
    root.userData.tail = pt; }
  if (st === 'bob') { sideL(-1, r * .9, .32); sideL(1, r * .9, .32); const bk = mesh(sph(r * 1.08, 32, 24), hairM); bk.scale.set(1, 1, .7); bk.position.set(0, hc.y - r * .05, -r * .35); headG.add(bk); }
  if (st === 'grey-bun') { const b = mesh(sph(r * .45, 24, 18), hairM); b.position.set(0, hc.y + r * .75, -r * .45); headG.add(b); }
  if (st === 'long') { const bk = mesh(limbGeo(r * .95, r * 1.2, r * .7), hairM); bk.position.set(0, hc.y + r * .3, -r * .4); bk.scale.z = .6; headG.add(bk); }
  if (o.glasses) for (const s of [-1, 1]) { const g = mesh(new THREE.TorusGeometry(r * .26, r * .035, 8, 24), M('#6a5040', { roughness: .4, metalness: .3 }), false); g.position.set(s * r * .38, hc.y + r * .08, r * 1.0); headG.add(g); }
  root.scale.setScalar(S);
  const face = p => { mouthG.scale.set(1, .2 + Math.max(0, p.mouth) * .9, 1); brows.forEach((b, i) => { const s = i ? 1 : -1; b.position.y = hc.y + r * (.44 + p.brows * .1); b.rotation.z = Math.PI / 2 + s * (p.brows * .15 - (p.sad || 0) * .3); }); };
  const pose = driver(root, body, neck, headG, { arms, legs, eyes, face });
  return { root, pose, hands: () => arms.map(a => a.hand), head: headG };
}

// painters for tops
export const TOPS = {
  tee: (c, w, h) => { c.fillStyle = COL.red; c.fillRect(0, 0, w, h); c.fillStyle = COL.blue; c.fillRect(0, h * .55, w, h * .45); c.fillStyle = '#ffffff'; c.fillRect(0, h * .53, w, h * .04); },
  kit: num => (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, COL.red); g.addColorStop(1, COL.blue); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.18)'; for (let y = 0; y < h; y += 10) c.fillRect(0, y, w, 3); c.fillStyle = '#ffffff'; c.font = '900 64px Nunito'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(num), w * .25, h * .5); c.fillText(String(num), w * .75, h * .45); },
  knit: col => (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 16; i++) { c.beginPath(); c.arc(i * 16 + 8, h * .42, 4, 0, TAU); c.fill(); } }
};
