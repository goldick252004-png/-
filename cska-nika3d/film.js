// «Письмо Деду Морозу» — choreography. Each scene: a, b (seconds), set, shots (camera), update(t, lt).
import * as THREE from 'three';
import { buildNika, buildPerson, defaultPose, TOPS, reach } from './chars.js';
import * as K from './kit.js';
import * as SETS from './sets.js';
import { clamp, lerp, seg, ss, eio, eo, ei, back, track, monotone, mulberry, env } from './lib.js';
const { RED, BLUE, GOLD } = K;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const P = (o = {}) => Object.assign(defaultPose(), o);
const blinkAt = (t, s = 0) => { const ph = (t + s * 1.37) % 3.6; return ph < .07 ? ph / .07 : ph < .16 ? 1 - (ph - .07) / .09 : 0; };
function idle(p, t, s = 0, k = 1) { p.breath = t * 2.3 + s; p.side += Math.sin(t * .8 + s) * .012 * k; p.head[2] += Math.sin(t * .6 + s * 2) * .025 * k; p.head[0] += Math.sin(t * .45 + s) * .04 * k; p.blink = Math.max(p.blink, blinkAt(t, s)); return p; }
function walk(p, ph, a = 1, run = 0) {
  const s = Math.sin(ph), c = Math.cos(ph), A = a * (1 + run * .5);
  p.legL = [s * .42 * A, Math.max(0, c) * .75 * A]; p.legR = [-s * .42 * A, Math.max(0, -c) * .75 * A];
  p.armL = [.12, -s * .45 * A, .35 + run * .6]; p.armR = [.12, s * .45 * A, .35 + run * .6];
  p.bob = (1 - Math.abs(s)) * .03 * A; p.lean = .05 * a + run * .12; p.side = s * .03 * a; return p;
}
const hop = (t, a, b, h) => t > a && t < b ? Math.sin((t - a) / (b - a) * Math.PI) * h : 0;
const yawTo = (dx, dz) => Math.atan2(dx, dz);
const pathAt = (pts, k) => { // piecewise-linear 2D path with eased param
  const n = pts.length - 1, f = clamp(k) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
  return [lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u), Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])];
};
const wpos = (obj, v = new THREE.Vector3()) => obj.getWorldPosition(v);
// a shot: [a, b, H keys [[t,[px,py,pz,lx,ly,lz,fov]]], V keys (optional), dyn (optional fn(lt) → override)]
const shot = (a, b, H, V, dyn) => ({ a, b, H: track(H), V: V ? track(V) : null, dyn });

export async function buildFilm() {
  await SETS.loadAssets();
  // ———————————— sets & cast ————————————
  const room = SETS.buildRoom(), city = SETS.buildCity(), arena = SETS.buildArena();
  const street = SETS.buildStreet({ doors: [{ x: 0, wall: '#c96a4a', door: BLUE }, { x: 9, wall: '#6a8ac0', door: RED }, { x: 18, wall: '#d8b06a', door: '#1f6b45' }] });
  const dawnSt = SETS.buildStreet({ dawn: 1, empty: 1, seed: 71, doors: [{ x: 0, wall: '#e0a88a', door: BLUE, lit: 1 }] });
  const fin = SETS.buildFinale();
  const sonya = SETS.girl(); room.scene.add(sonya.root);
  const nRoom = buildNika(); room.scene.add(nRoom.root);
  const team = SETS.PLAYERS.map((_, i) => { const p = SETS.player(i); room.scene.add(p.root); return p; });
  const teamGifts = team.map((_, i) => { const g = K.present(.26, .2, .22, [RED, BLUE, GOLD, '#ffffff'][i % 4], i % 2 ? GOLD : RED); room.scene.add(g); return g; });
  const nArena = buildNika(); arena.scene.add(nArena.root);
  const sparkA = new K.Sparkles(120, '#ffd36a', 11, .09); arena.scene.add(sparkA.obj);
  const nStreet = buildNika(); street.scene.add(nStreet.root);
  const nDawn = buildNika(); dawnSt.scene.add(nDawn.root);
  const nFin = buildNika(); fin.scene.add(nFin.root);
  // recipients for the doorways
  const timosha = buildPerson({ child: 1, skin: '#f3cfb4', hair: '#c98a3a', style: 'short', iris: '#4a6a3a', top: TOPS.knit(BLUE), bottom: RED, long: 1, shoe: '#ffffff', sleeves: 'long', h: .95 });
  const vera = buildPerson({ skin: '#efcdb4', hair: '#d9d6e2', style: 'grey-bun', iris: '#4a5a8a', top: TOPS.knit('#a83a4a'), bottom: '#4a3a5a', long: 1, shoe: '#5a3a2a', sleeves: 'long', glasses: 1, female: 1, h: .9 });
  const mom = buildPerson({ skin: '#f3cdb0', hair: '#5a2e22', style: 'ponytail', iris: '#5a3a20', top: TOPS.knit('#2f8a6a'), bottom: '#2b2f45', long: 1, shoe: '#3a2a2a', sleeves: 'long', female: 1, lashes: 1, h: .97 });
  const dad = buildPerson({ skin: '#eac09e', hair: '#3a2a22', style: 'short', iris: '#3a5a8a', top: TOPS.knit(BLUE), bottom: '#3a3a4a', long: 1, shoe: '#2e2a2a', sleeves: 'long', h: 1.04 });
  const kid = buildPerson({ child: 1, skin: '#f3cdb0', hair: '#3a2a22', style: 'buns', iris: '#5a3a20', top: TOPS.tee, bottom: '#3a4fd8', long: 1, shoe: '#ffffff', lashes: 1, female: 1, h: .85 });
  [timosha, vera, mom, dad, kid].forEach(c => street.scene.add(c.root));
  const giftBall = K.ball(.13); const bow = K.present(.001, .001, .001); street.scene.add(giftBall);
  const giftScarf = K.scarf(.5); giftScarf.scale.setScalar(.9); street.scene.add(giftScarf);
  const giftTix = new THREE.Group(); const env1 = K.mesh(K.roundBox(.34, .22, .02, .008), new THREE.MeshPhysicalMaterial({ color: GOLD, roughness: .3, metalness: .5 })); giftTix.add(env1); const tixBand = K.mesh(new THREE.BoxGeometry(.36, .05, .025), new THREE.MeshPhysicalMaterial({ color: RED, roughness: .4 })); giftTix.add(tixBand); street.scene.add(giftTix);
  const harness = new THREE.Group(); // rope between Nika and the sled in the street scenes
  const ropeL = K.mesh(new THREE.CylinderGeometry(.015, .015, 1, 6), new THREE.MeshPhysicalMaterial({ color: '#8a5a3a' })); harness.add(ropeL);

  const S = [];
  // ═══════════ S1 · Письмо (0–11) ═══════════
  S.push({
    a: 0, b: 11, set: room, fadeOut: false,
    caps: [[.5, 3.2, '30 декабря']],
    shots: [
      shot(0, 3.4, [[0, [-.9, 1.7, 3.0, .2, 1.0, -1.6, 40]], [1.2, [.2, 1.35, 1.6, .55, .95, -1.6, 38]], [3.4, [1.22, .98, -.62, .7, .86, -1.66, 32]]], [[0, [-.4, 1.6, 3.2, .2, 1.1, -1.6, 62]], [1.2, [.3, 1.35, 1.7, .55, 1.0, -1.6, 58]], [3.4, [1.2, 1.0, -.55, .7, .86, -1.66, 50]]]),
      shot(3.4, 6.6, [[3.4, [.9, 1.04, -1.02, .6, .665, -1.4, 28]], [6.6, [.86, 1.0, -1.06, .6, .67, -1.42, 25]]], [[3.4, [.86, .98, -.92, .62, .74, -1.46, 46]], [6.6, [.82, .95, -.98, .62, .75, -1.48, 42]]]),
      shot(6.6, 9.4, [[6.6, [2.0, 1.25, .1, .7, 1.0, -1.9, 38]], [9.4, [1.9, 1.3, 0, .55, 1.1, -2.1, 36]]], [[6.6, [2.0, 1.25, .2, .55, 1.0, -1.9, 60]], [9.4, [1.9, 1.3, .1, .5, 1.1, -2.1, 56]]]),
      shot(9.4, 11, [[9.4, [.35, 1.3, -.4, .8, 1.55, -2.5, 42]], [11, [.4, 1.35, -.7, .95, 1.9, -2.6, 38]]], [[9.4, [.35, 1.3, -.4, .8, 1.6, -2.5, 64]], [11, [.4, 1.35, -.7, .95, 1.95, -2.6, 58]]]),
    ],
    update(t, lt) {
      room.backdrop.material.map = room.night; room.lampL.intensity = .5; room.bulb.visible = true;
      const wind = smoothW(lt, 9.6, 10.9);
      room.update(t, wind); room.snowIn.obj.visible = wind > .05;
      room.vent.rotation.y = -.25 - wind * .8;
      // Соня
      const p = P({ x: .7, z: -1.72, rotY: 0, mouth: .45, head: [0, .35, 0] });
      const sit = 1 - ss(seg(lt, 6.6, 7.1));
      p.legL = p.legR = [1.45 * sit, 1.45 * sit]; p.y = .08 * sit; room.cushion.visible = true;
      p.armL = [.15, 1.0 * sit + .1, 1.2 * sit + .2]; p.armR = [.2, 1.1 * sit, .9 * sit + .2];
      const writing = lt < 6.6;
      if (writing) { p.head = [Math.sin(t * .8) * .08 + .1, .3, .12 + Math.sin(t * .5) * .05]; p.look = [-.15 + Math.sin(t * 2) * .12, .7]; p.mouth = lt > 6.0 ? .9 : .3; if (lt > 6.0) { p.head = [.15, .05, .1]; p.look = [0, .1]; } }
      const L = room.L, k = lt < 3.4 ? lt / 3.4 * .5 : .5 + .5 * clamp((lt - 3.4) / 2.6);
      L.draw(k);
      if (lt >= 7.1) {
        const turn = ss(seg(lt, 7.1, 7.6)); p.rotY = lerp(0, Math.PI, turn);
        const w = seg(lt, 7.6, 8.4), pos = pathAt([[.7, -1.72], [.3, -1.9], [.35, -2.12]], eio(w)); p.x = pos[0]; p.z = pos[1];
        if (w > 0 && w < 1) walk(p, w * 9, .8);
        p.head = [0, -.15, 0]; p.mouth = .7;
        if (lt > 8.3 && lt < 9.0) { const r = ss(seg(lt, 8.3, 8.6)) * (1 - ss(seg(lt, 8.75, 9.0))); p.armR = [.2, 1.6 * r + .1, .2]; }
        if (lt > 9.0) { p.head = [-.2, -.3, .1]; p.look = [0, -.6]; p.mouth = .9; p.armL = p.armR = [.15, .3, .3]; }
      }
      idle(p, t, 1); sonya.pose(p);
      room.scene.updateMatrixWorld();
      // letter: desk → hand → sill → wind
      if (lt < 6.8) { L.mesh.position.set(.62, .664, -1.38); L.mesh.rotation.set(-Math.PI / 2, 0, -.1); }
      else if (lt < 8.6) { const h = wpos(sonya.hands()[1]); L.mesh.position.set(h.x, h.y - .02, h.z); L.mesh.rotation.set(-1.2, p.rotY, 0); }
      else if (lt < 9.8) { L.mesh.position.set(.55, 1.025, -2.36); L.mesh.rotation.set(-Math.PI / 2, 0, .2); }
      else { const u = clamp((lt - 9.8) / 1.2), e = eo(u); L.mesh.position.set(lerp(.55, 1.3, e), lerp(1.0, 2.45, e) + Math.sin(u * 9) * .04, lerp(-2.36, -4.2, ei(u))); L.mesh.rotation.set(-Math.PI / 2 + u * 3, u * 5, .2 + u * 6); }
      // pencil: the tip follows the line being written; the hand holds it (IK), the other hand steadies the page
      if (writing) {
        L.mesh.updateMatrixWorld(); const pen = room.pencil, up = lt > 6.0 ? ss(seg(lt, 6.0, 6.35)) : 0;
        const tip = L.mesh.localToWorld(L.cursor(k)); tip.y += .0015 + Math.max(0, Math.sin(t * 31)) * .006 + up * .05; tip.x += Math.sin(t * 23) * .002;
        const ax = new THREE.Vector3(.55, 1, -.22).normalize(); pen.position.copy(tip); pen.quaternion.setFromUnitVectors(V3(0, 1, 0), ax);
        const gripOff = ax.clone().multiplyScalar(.075).add(V3(.012, .015, 0));
        reach(sonya, 1, tip.clone().add(gripOff), [.25, 1.2, .9], .2);
        pen.position.copy(wpos(sonya.hands()[1])).sub(gripOff); // the pencil stays in the fist even where the reach falls short
        reach(sonya, 0, V3(.47, .7, -1.36), [.15, 1.1, 1.2], 1);
        pen.visible = true;
      } else { const pen = room.pencil; pen.position.set(.84, .652, -1.3); pen.quaternion.setFromEuler(new THREE.Euler(0, .4, Math.PI / 2)); pen.visible = true; }
      room.chair.position.set(.7, 0, -1.78); room.chair.rotation.y = 0;
      nRoom.root.visible = false; team.forEach(m => m.root.visible = false); teamGifts.forEach(g => g.visible = false);
      room.doorG.rotation.y = 0;
      setClock(room, 21, 30);
    }
  });
  // ═══════════ S2 · Полёт письма (11–19) ═══════════
  const flyU = lt => eio(clamp(lt / 8)) * .92 + clamp(lt / 8) * .08;
  S.push({
    a: 11, b: 19, set: city, caps: [[11.6, 14.4, 'Письмо улетело…']],
    shots: [
      shot(11, 14.6, [[11, [0, 0, 0, 0, 0, 0, 44]], [14.6, [0, 0, 0, 0, 0, 0, 44]]], null, lt => chase(lt, .045, [.9, .5, 2.2])),
      shot(14.6, 17, [[14.6, [-7, 15, -14, 0, 8, -50, 50]], [17, [-5, 15.5, -24, 0, 9, -70, 46]]], [[14.6, [-7, 15, -14, 0, 8, -50, 70]], [17, [-5, 15.5, -24, 0, 9, -70, 66]]]),
      shot(17, 19, [[17, [0, 0, 0, 0, 0, 0, 40]], [19, [0, 0, 0, 0, 0, 0, 40]]], null, lt => chase(lt, .05, [-.8, .7, 3.0])),
    ],
    update(t, lt) {
      city.update(t);
      const u = flyU(lt), pt = city.path.getPointAt(Math.min(.999, u));
      city.L.mesh.position.copy(pt); city.L.mesh.rotation.set(Math.sin(t * 2.1) * .6 - .4, t * 1.3, Math.sin(t * 1.7) * .8);
    }
  });
  function chase(lt, du, off) {
    const u = flyU(lt), a = city.path.getPointAt(Math.min(.999, u)), b = city.path.getPointAt(Math.max(0, u - du));
    const d = a.clone().sub(b).normalize(), side = new THREE.Vector3(-d.z, 0, d.x);
    const cp = b.clone().addScaledVector(side, off[0]).add(V3(0, off[1], 0)).addScaledVector(d, -off[2] * .3);
    return [cp.x, cp.y, cp.z, a.x, a.y, a.z];
  }
  // ═══════════ S3 · Ника (19–28) ═══════════
  const DRB = 1.6, BR = .123, BS = BR / .095; // bounces per second, ball radius, scale of the arena ball mesh
  const nikaAt = lt => { const e = eo(clamp(lt / 2.6)); const x = lerp(-1.4, 0, e), z = lerp(-.55, 0, e); const r = lerp(Math.atan2(1.4, .55) * .55, 0, ss(clamp((lt - 1.4) / 1.2))); return [x, z, r]; };
  const blobT = K.ctex(64, 64, c => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,10,.9)'); g.addColorStop(1, 'rgba(0,0,10,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const blob = (r, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, opacity: o, depthWrite: false })); m.rotation.x = -Math.PI / 2; arena.scene.add(m); return m; };
  const ballShadow = blob(.16, .5), nikaShadow = blob(.42, .45); nikaShadow.scale.set(1, .8, 1);
  const nikaSpot = new THREE.SpotLight('#fff0d8', 40, 16, .32, .75, 1.4); nikaSpot.position.set(1.8, 7.5, 4.5); arena.scene.add(nikaSpot, nikaSpot.target);
  const letterPathA = new THREE.CatmullRomCurve3([V3(0, 9.6, -24.6), V3(-1.5, 8, -16), V3(1.2, 5.5, -8), V3(-.6, 3.2, -3), V3(.3, 1.9, -.6), V3(0, 1.2, .38)]);
  S.push({
    a: 19, b: 28, set: arena, caps: [[23.5, 26.7, '…прямо к Нике!']],
    shots: [
      shot(19, 20.4, [[19, [3.4, 1.6, 6.6, -.6, .9, -.3, 36]], [20.4, [2.6, 1.25, 4.9, -.4, .8, -.2, 34]]], [[19, [2.6, 1.6, 6.6, -.6, 1.1, -.3, 58]], [20.4, [2.0, 1.25, 4.9, -.4, 1.0, -.2, 54]]]),
      shot(20.4, 21.7, [[20.4, [0, 0, 0, 0, 0, 0, 33]], [21.7, [0, 0, 0, 0, 0, 0, 33]]], [[20.4, [0, 0, 0, 0, 0, 0, 52]], [21.7, [0, 0, 0, 0, 0, 0, 52]]], (lt, V) => { const [x, z] = nikaAt(lt); return V ? [x + 1.5, 1.0, z + 2.05, x + .12, .85, z] : [x + 1.85, 1.15, z + 2.55, x + .1, .9, z]; }),
      shot(21.7, 23.4, [[21.7, [2.8, 1.0, 4.6, 0, 6, -12, 46]], [23.4, [2.2, 1.1, 3.8, 0, 1.4, 0, 40]]], [[21.7, [2.4, 1.0, 4.6, 0, 6, -12, 68]], [23.4, [1.8, 1.1, 3.8, 0, 1.4, 0, 62]]]),
      shot(23.4, 25.4, [[23.4, [.5, 1.6, 1.35, 0, 1.45, 0, 30]], [25.4, [.4, 1.58, 1.2, 0, 1.45, 0, 28]]], [[23.4, [.4, 1.55, 1.5, 0, 1.4, 0, 50]], [25.4, [.35, 1.55, 1.35, 0, 1.4, 0, 48]]]),
      shot(25.4, 28, [[25.4, [0, 1.3, 3.6, 0, 1.15, 0, 36]], [28, [0, 1.25, 3.2, 0, 1.2, 0, 36]]], [[25.4, [0, 1.3, 3.8, 0, 1.3, 0, 58]], [28, [0, 1.25, 3.4, 0, 1.3, 0, 58]]]),
    ],
    update(t, lt) {
      arena.update(t); arena.sled.root.visible = false; nikaSpot.visible = true; nikaSpot.intensity = lerp(40, 10, ss(seg(lt, 2.4, 3.6))); ballShadow.visible = nikaShadow.visible = true;
      const p = P({ rotY: 0, mouth: .8 });
      // dribbling on the move: two steps per bounce, the hand meets the ball at the top of every bounce
      const [nx, nz, nr] = nikaAt(lt), walkK = 1 - ss(seg(lt, 1.9, 2.6)); p.x = nx; p.z = nz; p.rotY = nr;
      if (lt < 2.6) { walk(p, lt * DRB * Math.PI, .55 * walkK); p.head = [0, .3, 0]; p.look = [.25, .55]; p.lean = .1; p.mouth = .6; }
      const ph = lt * DRB, decay = lt < 2.6 ? 1 : Math.exp(-(lt - 2.6) * 1.1), hTop = .6;
      const off = new THREE.Vector3(.3, 0, .24).applyAxisAngle(V3(0, 1, 0), nr), drift = lt < 2.6 ? 0 : ss(seg(lt, 2.6, 5.2));
      let bx = nx + off.x + drift * 2.2, bz = nz + off.z + drift * 1.1, by = BR + (hTop - BR) * Math.abs(Math.cos(Math.PI * ph)) * decay;
      if (lt > 5.2) by = BR;
      const sq = clamp(1 - (by - BR) / .05);
      arena.ball.position.set(bx, by, bz); arena.ball.rotation.set(lt * 4 + drift * 9, 0, lt * 2); arena.ball.scale.set(BS * (1 + sq * .1), BS * (1 - sq * .16), BS * (1 + sq * .1));
      ballShadow.position.set(bx, .006, bz); ballShadow.scale.setScalar(.9 + (by - BR) * .9); ballShadow.material.opacity = .5 - (by - BR) * .45;
      nikaShadow.position.set(nx, .005, nz + .02);
      // letter arrives
      const L = arena.L;
      if (lt < 2.3) L.mesh.visible = false;
      else if (lt < 4.2) { L.mesh.visible = true; const u = eio(seg(lt, 2.3, 4.2)); L.mesh.position.copy(letterPathA.getPointAt(u)); L.mesh.rotation.set(Math.sin(t * 3) * .7 - .3, t * 1.5 * (1 - u), Math.sin(t * 2.3) * .8 * (1 - u)); }
      if (lt > 2.6 && lt < 4.2) { p.head = [0, -.35 - (1 - seg(lt, 2.6, 4.2)) * .2, 0]; p.look = [0, -.8]; p.mouth = .45; p.brows = 1; }
      if (lt > 3.6) { const k = ss(seg(lt, 3.6, 4.2)); p.armL = [.25, .95 * k + .1, 1.0 * k]; p.armR = [.25, .95 * k + .1, 1.0 * k]; }
      if (lt >= 4.2) { p.head = [Math.sin(t * 1.2) * .05, .25, 0]; p.look = [Math.sin(t * 3.2) * .7, .45]; p.mouth = .3; }
      // idea!
      const idea = seg(lt, 6.4, 6.9);
      if (lt > 6.4) { p.head = [0, -.05, 0]; p.look = [0, 0]; p.mouth = 1; p.earDrop = -.25 * idea; p.brows = 1; }
      if (lt > 7.0) { const j = hop(lt, 7.2, 7.9, .45); p.y = j; p.squash = lt < 7.2 ? ss(seg(lt, 7.0, 7.2)) * .6 : (lt < 8.1 && lt > 7.9 ? .5 : 0); p.armR = [2.7, .2, .4]; p.armL = [.4, .7, 1.1]; p.handR = 0; }
      idle(p, t, 2); nArena.pose(p);
      arena.scene.updateMatrixWorld();
      if (lt < 2.6) { const hy = Math.max(by + BR + .045, .5); reach(nArena, 1, V3(bx, hy, bz), [.35, .55, .5], .7); }
      if (lt >= 4.2) { const a = wpos(nArena.hands()[0]), b = wpos(nArena.hands()[1]); L.mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + .1, (a.z + b.z) / 2 + .02); L.mesh.rotation.set(-.35, 0, 0); if (lt > 7.1) L.mesh.position.copy(b).add(V3(.05, .15, 0)); }
      const head = wpos(nArena.head).add(V3(0, .35, .1)); sparkA.update(t, 19 + 6.4, head, 1.0, 1.6);
    }
  });
  // ═══════════ S4 · Сани (28–40) ═══════════
  const sledX = lt => lt < 2.6 ? lerp(-7.5, -1, eo(seg(lt, 0, 2.6))) : lt < 9.4 ? -1 : -1 + 6.5 * Math.pow(seg(lt, 9.4, 12), 1.6) + (lt > 9.4 ? .15 * Math.sin(seg(lt, 9.4, 9.8) * Math.PI) : 0);
  S.push({
    a: 28, b: 40, set: arena, caps: [[31.2, 33.6, 'Запрячь некого…'], [35.3, 38.4, 'Ну и ладно!']],
    shots: [
      shot(28, 30.6, [[28, [-.5, 1.9, 8.8, -2, .9, 0, 38]], [30.6, [0, 1.8, 8.0, -1, .9, 0, 36]]], [[28, [-1.5, 1.9, 8.8, -2.5, 1.1, 0, 62]], [30.6, [-.5, 1.8, 8.0, -1, 1.1, 0, 60]]]),
      shot(30.6, 33.4, [[30.6, [1.2, 1.6, 6.2, .6, 1.0, 0, 36]], [33.4, [1.4, 1.6, 5.4, .9, 1.05, 0, 34]]], [[30.6, [1.4, 1.6, 6.2, 1.2, 1.2, 0, 58]], [33.4, [1.5, 1.6, 5.4, 1.4, 1.2, 0, 56]]]),
      shot(33.4, 35.2, [[33.4, [1.5, 1.45, 3.4, 1.5, 1.25, .2, 36]], [35.2, [1.5, 1.45, 3.1, 1.5, 1.28, .2, 34]]], [[33.4, [1.5, 1.4, 3.5, 1.5, 1.2, .2, 54]], [35.2, [1.5, 1.4, 3.2, 1.5, 1.22, .2, 52]]]),
      shot(35.2, 40, [[35.2, [0, 0, 0, 0, 0, 0, 40]], [40, [0, 0, 0, 0, 0, 0, 40]]], null, (lt, VV) => { const x = sledX(lt); return VV ? [x + 1.4, 1.8, 8.6, x + 1.6, 1.05, 0] : [x + 1.2, 1.7, 7.2, x + 1.6, .95, 0]; }),
    ],
    update(t, lt) {
      arena.update(t); arena.L.mesh.visible = false; arena.ball.position.set(5, .1, 3); arena.ball.scale.setScalar(1); sparkA.obj.visible = false; nikaSpot.visible = false; ballShadow.visible = nikaShadow.visible = false;
      const sl = arena.sled, x = sledX(lt); sl.root.visible = true; sl.root.position.set(x, 0, 0); sl.root.rotation.y = 0;
      sl.bells.forEach((b, i) => { b.position.y = .74 + Math.sin(t * 22 + i) * .015 * (lt > 9.4 ? 1 : .2); });
      arena.gateDoors.forEach((g, i) => { g.rotation.y = (i ? 1 : -1) * 1.4 * ss(seg(lt, 8.8, 10.6)); });
      const p = P({ mouth: .8 });
      if (lt < 2.6) { // pushing from behind
        p.x = x - 1.55; p.z = 0; p.rotY = Math.PI / 2; p.lean = .35; walk(p, lt * 7, 1); p.armL = p.armR = [.25, 1.3, .3]; p.lean = .35; p.mouth = .5; p.head = [0, -.2, 0];
      } else if (lt < 3.8) { // walk around to the front
        const w = eio(seg(lt, 2.6, 3.6)), q = pathAt([[x - 1.55, 0], [x - .6, 1.05], [x + 1.6, 1.05], [x + 2.5, .2]], w); p.x = q[0]; p.z = q[1]; p.rotY = q[2]; if (w < 1) walk(p, w * 12, 1);
        if (lt > 3.6) p.rotY = lerp(q[2], 0, ss(seg(lt, 3.6, 3.8)));
      } else if (lt < 7.2) { // looks around, then the shrug
        p.x = x + 2.5; p.z = .2; p.rotY = 0;
        const look = Math.sin(seg(lt, 3.8, 5.2) * Math.PI * 2) * .9 * (lt < 5.4 ? 1 : 0);
        p.head = [look, 0, 0]; p.look = [look * .8, 0]; p.armL = p.armR = [.35, -.1, 1.9]; // hands on hips
        if (lt > 5.2) { p.head = [-.5, .1, 0]; p.look = [-.6, .3]; p.earDrop = .4; p.mouth = .25; }
        if (lt > 5.4) { // the shrug
          const k = ss(seg(lt, 5.5, 5.9)) * (1 - ss(seg(lt, 6.9, 7.2)));
          p.armL = p.armR = [.5 + .3 * k, .5 * k, 1.9 - .4 * k]; p.handL = p.handR = k; p.side = .0; p.head = [0, -.05, .28 * k]; p.look = [.5 * k, -.5 * k]; p.mouth = .35; p.earDrop = .6 * k; p.body = 1;
          p.bob = -.05 * k;
        }
      } else { // between the shafts, tug, pull
        const k = ss(seg(lt, 7.2, 8.0));
        p.x = lerp(x + 2.5, x + 2.0, k); p.z = lerp(.2, 0, k); p.rotY = lerp(0, Math.PI / 2, k);
        p.mouth = 1; p.brows = 1; p.earDrop = -.2;
        p.armL = p.armR = [.3, -.15, .3];
        if (lt > 8.0 && lt < 9.4) { p.lean = .55; p.squash = .4 + Math.sin(t * 30) * .05; p.blink = .95; p.mouth = .15; p.legL = [-.5, .2]; p.legR = [.6, .4]; }
        if (lt >= 9.4) { const r = seg(lt, 9.4, 12); walk(p, (x + 1) * 3.6, 1, .6); p.armL = p.armR = [.3, -.2, .4]; p.lean = .25 + (lt < 9.8 ? .3 : 0); p.mouth = 1; p.head = [-.6 * ss(seg(lt, 10, 10.5)), 0, 0]; }
        p.x = Math.max(p.x, x + 2.0);
      }
      idle(p, t, 3, .7); nArena.pose(p);
    }
  });
  // ═══════════ S5 · Развозка (40–56) ═══════════
  const VIG = [{ a: 40, d: 0, who: 'boy', gift: giftBall, cap: 'Мяч — Тимоше' }, { a: 45.33, d: 9, who: 'vera', gift: giftScarf, cap: 'Шарф — бабушке Вере' }, { a: 50.67, d: 18, who: 'fam', gift: giftTix, cap: 'Билеты — Орловым' }];
  const vigShots = VIG.map(v => shot(v.a, v.a + 5.33, [[v.a, [v.d + 3.6, 1.5, 4.6, v.d - .1, 1.05, .4, 36]], [v.a + 5.33, [v.d + 3.0, 1.45, 4.0, v.d + .1, 1.05, .4, 34]]], [[v.a, [v.d + 2.6, 1.5, 5.1, v.d + .5, 1.2, .4, 60]], [v.a + 5.33, [v.d + 2.2, 1.45, 4.5, v.d + .6, 1.2, .4, 58]]]));
  S.push({
    a: 40, b: 56, set: street, caps: VIG.map(v => [v.a + .4, v.a + 4.9, v.cap]),
    shots: vigShots.map(s => ({ ...s, a: s.a, b: s.b })),
    cuts: [45.33, 50.67],
    update(t, lt) {
      street.update(t);
      const vi = t < 45.33 ? 0 : t < 50.67 ? 1 : 2, v = VIG[vi], l = t - v.a, d = v.d;
      street.sled.root.position.set(d - 3.2, 0, 1.2); street.sled.root.rotation.y = .3;
      street.doors.forEach((dd, i) => { dd.hinge.rotation.y = i === vi ? -1.35 * ss(seg(l, 3.2, 3.9)) : 0; });
      // Ника sneaks with the gift, leaves it, hides and giggles
      const p = P({ mouth: .8 });
      const walkIn = seg(l, 0, 1.4), q = pathAt([[d - 2.2, 1.5], [d - .7, 1.2], [d - .05, 1.05]], eio(walkIn));
      p.x = q[0]; p.z = q[1]; p.rotY = q[2];
      if (l < 1.4) { walk(p, l * 7, .8); p.legL[1] += .3; p.legR[1] += .3; p.lean = .2; p.head = [Math.sin(l * 4) * .4, 0, 0]; p.look = [Math.sin(l * 4) * .6, 0]; p.mouth = .3; p.armL = p.armR = [.2, .9, .9]; }
      else if (l < 2.2) { p.rotY = Math.PI; p.lean = .5 * Math.sin(seg(l, 1.4, 2.2) * Math.PI); p.armL = p.armR = [.2, 1.1, .5]; p.head = [0, .3, 0]; }
      else { const w = seg(l, 2.2, 3.0), q2 = pathAt([[d - .05, 1.05], [d + .7, 1.3], [d + 1.35, .7]], eio(w)); p.x = q2[0]; p.z = q2[1]; p.rotY = w < 1 ? q2[2] : -.4; if (w > 0 && w < 1) walk(p, w * 7, .8);
        if (l > 3.0) { p.armR = [.3, 1.6, 2.2]; p.head = [-.6, .05, .2]; p.look = [-.8, 0]; p.mouth = .5; p.blink = l > 4.2 ? 0 : .6; p.side = Math.sin(t * 14) * .03; } }
      idle(p, t, 5, .6); nStreet.pose(p); street.scene.updateMatrixWorld();
      // the gift
      [giftBall, giftScarf, giftTix].forEach(g => g.visible = g === v.gift);
      const G = v.gift;
      const recip = vi === 0 ? [timosha] : vi === 1 ? [vera] : [mom, kid, dad];
      [timosha, vera, mom, dad, kid].forEach(c => c.root.visible = recip.includes(c));
      let gp;
      if (l < 1.9) { const a = wpos(nStreet.hands()[0]), b = wpos(nStreet.hands()[1]); gp = a.add(b).multiplyScalar(.5).add(V3(0, .05, 0)); }
      else gp = V3(d, .14 + (vi === 0 ? .13 : .03), .45);
      // recipients pick it up after the door opens
      recip.forEach((c, j) => {
        const rp = P({ x: d + (j - (recip.length - 1) / 2) * .38, z: -.55 - (j === 2 ? .3 : 0), rotY: 0, mouth: .6 });
        const out = ss(seg(l, 3.6, 4.2)); rp.z += out * .55;
        if (l > 3.9) { rp.mouth = 1; rp.brows = 1; rp.look = [0, .5]; rp.head = [0, .3, 0]; }
        if (l > 4.3) { rp.y = hop(l, 4.3, 4.75, .14) + hop(l, 4.75, 5.2, .1); rp.armL = rp.armR = [.35, 1.2, .6]; rp.head = [0, -.05, 0]; rp.look = [0, 0]; }
        idle(rp, t, 7 + j); c.pose(rp);
      });
      street.scene.updateMatrixWorld();
      if (l > 4.3) { const c = recip[0], a = wpos(c.hands()[0]), b = wpos(c.hands()[1]); gp = a.add(b).multiplyScalar(.5).add(V3(0, .06, .05)); }
      G.position.copy(gp); G.rotation.set(vi === 1 ? 0 : 0, vi === 2 ? .2 : t * (l > 4.3 ? 0 : 0), vi === 2 ? .1 : 0);
      if (vi === 2) G.rotation.x = -.3;
      street.spark.update(t, v.a + 2.0, V3(d, .45, .5), .9, 1.5);
      nStreet.root.visible = true;
    }
  });
  // ═══════════ S6a · Соня у окна (56–59.5) ═══════════
  S.push({
    a: 56, b: 59.5, set: room, caps: [],
    shots: [shot(56, 59.5, [[56, [.75, 1.3, -3.7, .72, 1.12, -2.0, 34]], [59.5, [.74, 1.28, -3.4, .72, 1.12, -2.0, 32]]], [[56, [.75, 1.3, -3.8, .72, 1.12, -2.0, 52]], [59.5, [.74, 1.28, -3.5, .72, 1.12, -2.0, 50]]])],
    update(t, lt) {
      room.update(t); room.snowIn.obj.visible = false; room.vent.rotation.y = 0; room.L.mesh.visible = false; room.pencil.visible = false; room.cushion.visible = true;
      room.lampL.intensity = 0; room.bulb.visible = false;
      room.cushion.visible = false;
      const p = P({ x: .72, y: .38, z: -2.16, rotY: Math.PI, mouth: .05, sad: 1, head: [.1, .1, .12], look: [.2, .1], armL: [.3, 1.35, 1.3], armR: [.3, 1.35, 1.3], lean: .15 });
      room.chair.position.set(.72, 0, -1.98); room.chair.rotation.y = Math.PI;
      p.blink = Math.max(blinkAt(t, 3), lt > 1.5 && lt < 1.9 ? .8 : 0); p.breath = t * 1.6;
      sonya.pose(p); nRoom.root.visible = false; team.forEach(m => m.root.visible = false); teamGifts.forEach(g => g.visible = false);
    }
  });
  // ═══════════ S6b · Под утро (59.5–64) ═══════════
  S.push({
    a: 59.5, b: 64, set: dawnSt, caps: [[60.0, 62.7, 'Подарки закончились…']],
    shots: [shot(59.5, 62.6, [[59.5, [-1.0, 1.6, 7.5, -1.6, 1.0, .5, 38]], [62.6, [-.6, 1.55, 6.6, -.9, 1.0, .5, 36]]], [[59.5, [-1.2, 1.6, 7.5, -1.5, 1.2, .5, 60]], [62.6, [-.8, 1.55, 6.6, -.9, 1.2, .5, 58]]]),
      shot(62.6, 64, [[62.6, [-.35, 1.55, 3.2, -.6, 1.4, .7, 34]], [64, [-.38, 1.55, 3.0, -.6, 1.4, .7, 33]]], [[62.6, [-.45, 1.5, 3.3, -.6, 1.3, .7, 52]], [64, [-.48, 1.5, 3.1, -.6, 1.3, .7, 50]]])],
    update(t, lt) {
      dawnSt.update(t);
      const nx = lerp(-6, -.6, eo(seg(lt, 0, 1.9)));
      dawnSt.sled.root.position.set(nx - 2.2, 0, .7); dawnSt.sled.root.rotation.y = 0;
      const p = P({ x: nx, z: .7, rotY: Math.PI / 2, mouth: .35, earDrop: .7, lean: .2 });
      if (lt < 1.9) { walk(p, nx * 2.6, .7); p.armL = p.armR = [.3, -.15, .3]; p.head = [0, .2, .05]; p.lean = .2; }
      if (lt > 0.5 && lt < 1.3) p.mouth = 1; // a yawn
      if (lt > 0.5 && lt < 1.3) p.blink = .8;
      if (lt >= 1.9 && lt < 3.1) { const k = ss(seg(lt, 1.9, 2.3)); p.rotY = lerp(Math.PI / 2, -Math.PI * .7, k); p.head = [0, .25, 0]; p.armL = p.armR = [.45, .3, 1.6]; p.handL = p.handR = 1; p.mouth = .1; }
      if (lt >= 3.1) { p.rotY = lerp(-Math.PI * .5, -.15, ss(seg(lt, 3.1, 3.4))); p.head = [lt < 3.6 ? -.5 : 0, lt < 3.6 ? -.45 : 0, 0]; p.look = lt < 3.6 ? [-.5, -.8] : [0, 0]; p.earDrop = .2; p.mouth = .8; p.wink = lt > 3.9 ? ss(seg(lt, 3.9, 4.05)) * (1 - ss(seg(lt, 4.35, 4.5))) : 0; p.brows = 1; if (lt > 3.9) p.armR = [.6, 1.2, 2.0]; }
      idle(p, t, 9, .6); nDawn.pose(p);
    }
  });
  // ═══════════ S7 · Звонок в дверь (64–74) ═══════════
  const TEAM_OUT = [[4.4, -.35], [4.8, .3], [4.5, 1.85], [5.2, 2.3], [5.3, 1.3], [5.7, -.1], [5.9, 1.0]];
  const TEAM_IN = [[-2.6, -.7], [-1.7, -1.0], [.1, -1.25], [1.0, -1.15], [1.7, -.6], [-.8, -1.35], [2.2, .1]];
  S.push({
    a: 64, b: 74, set: room, caps: [[64.6, 66.6, 'Динь-дон!'], [68.2, 72.8, 'Желание сбылось!']],
    shots: [
      shot(64, 66.4, [[64, [.2, 1.45, 3.4, -1.0, 1.0, -.8, 40]], [65.2, [.3, 1.42, 3.3, -.7, 1.0, -.5, 40]], [66.4, [.9, 1.35, 2.8, 2.2, 1.0, .9, 40]]], [[64, [0, 1.45, 3.6, -1.1, 1.1, -.8, 62]], [65.2, [.1, 1.42, 3.5, -.8, 1.1, -.5, 62]], [66.4, [.9, 1.35, 3.0, 2.2, 1.1, .9, 62]]]),
      shot(66.4, 70.5, [[66.4, [.7, 1.2, 1.7, 3.6, 1.2, 1.05, 42]], [68.5, [.8, 1.2, 1.75, 3.4, 1.15, 1.05, 40]], [69.4, [.0, 1.45, .82, 2.6, 1.0, .82, 37]], [70.5, [.15, 1.45, .82, 2.6, 1.0, .82, 35]]], [[66.4, [.6, 1.2, 1.8, 3.4, 1.3, 1.05, 64]], [68.5, [.7, 1.2, 1.85, 3.3, 1.25, 1.05, 62]], [69.4, [-.1, 1.1, 1.02, 2.6, 1.0, 1.0, 58]], [70.5, [.1, 1.08, 1.0, 2.6, 1.0, 1.0, 56]]]),
      shot(70.5, 74, [[70.5, [.15, 1.45, .82, 2.6, 1.0, .82, 35]], [74, [-.75, 1.4, .8, 2.8, 1.05, .8, 40]]], [[70.5, [.1, 1.08, 1.0, 2.6, 1.0, 1.0, 56]], [74, [-.55, 1.2, 1.0, 2.8, 1.1, 1.05, 62]]]),
    ],
    update(t, lt) {
      room.backdrop.material.map = room.night; room.lampL.intensity = 0; room.bulb.visible = false;
      room.update(t); room.snowIn.obj.visible = false; room.vent.rotation.y = 0; room.L.mesh.visible = false; room.pencil.visible = false; room.cushion.visible = true;
      setClock(room, 23, 40 + lt * .5); room.chair.position.set(.7, 0, -1.78); room.chair.rotation.y = 0;
      const open = ss(seg(lt, 2.45, 3.1)); room.doorG.rotation.y = -1.55 * open;
      // Соня
      const p = P({ mouth: .6 });
      if (lt < 1.1) { p.x = -1.35; p.z = -.75; p.rotY = -2.2; p.armR = [.3, 1.6, .6]; p.head = [0, -.2, 0]; }
      else { const w = seg(lt, 1.25, 2.4), q = pathAt([[-1.35, -.75], [0, .4], [2.45, 1.05]], eio(w)); p.x = q[0]; p.z = q[1]; p.rotY = lt < 1.25 ? lerp(-2.2, q[2], seg(lt, 1.1, 1.25)) : q[2]; if (w > 0 && w < 1) walk(p, w * 16, 1, .5); p.mouth = .8; p.brows = 1; }
      if (lt > .6 && lt < 1.25) { p.head = [1.6, 0, 0]; p.look = [.8, 0]; p.brows = 1; p.mouth = .5; }
      if (lt > 2.45 && lt < 3.1) { p.armR = [.3, 1.2, .3]; p.rotY = Math.PI / 2; }
      // side-by-side hug, both facing the room: Соня wraps her arms round Ника's waist, Ника's arm rests on her shoulder
      const HUG_S = [2.45, .76], HUG_N = [2.6, 1.27];
      const turn = ss(seg(lt, 4.7, 5.25)), hug = ss(seg(lt, 5.2, 5.7)) * (1 - ss(seg(lt, 7.6, 8.1)));
      if (lt >= 3.1) { p.rotY = Math.PI / 2; p.mouth = 1; p.brows = 1; p.head = [0, -.15, 0]; p.look = [0, -.3];
        if (lt < 4.85) { p.y = hop(lt, 3.3, 3.8, .16) + hop(lt, 3.8, 4.3, .14) + hop(lt, 4.3, 4.8, .12); p.armL = p.armR = [2.5, .2, .4]; p.handL = p.handR = 1; }
        p.rotY = lerp(Math.PI / 2, -Math.PI / 2, turn); p.x = lerp(2.45, HUG_S[0], turn); p.z = lerp(1.05, HUG_S[1], turn);
        if (lt > 4.7 && lt < 5.25) walk(p, lt * 14, .6);
        if (lt >= 5.2) { p.side = -.13 * hug; p.head = [-.15 * hug, .05, -.28 * hug + Math.sin(t * 2) * .03]; p.mouth = 1; p.brows = 1; p.look = [.25, .2]; }
        if (lt >= 7.8) { p.head = [.5 * ss(seg(lt, 7.8, 8.3)), -.1, 0]; p.blink = 0; p.look = [.6, .1]; p.armL = p.armR = [.3, .6, 1.4]; p.handL = p.handR = 1; p.y = hop(lt, 8.4, 8.8, .1) + hop(lt, 8.9, 9.3, .1); } }
      const sway = Math.sin(t * 2.2) * .04 * hug;
      if (lt >= 3.1) p.side += sway;
      idle(p, t, 1); sonya.pose(p);
      // Ника + team on the porch, then in
      const n = P({ x: 3.75, z: 1.05, rotY: -Math.PI / 2, mouth: 1 });
      n.armR = [2.4, .1, .8 + Math.sin(t * 9) * .3]; n.handR = 1;
      if (lt > 4.6) { const w = seg(lt, 4.6, 5.35), q = pathAt([[3.75, 1.05], [3.05, 1.12], HUG_N], eio(w)); n.x = q[0]; n.z = q[1]; if (w > 0 && w < 1) walk(n, w * 9, .7); n.armR = [.3, .3, .5]; n.handR = .5; }
      if (lt >= 5.2) { n.head = [-.3 * hug, .18 * hug, .3 * hug]; n.side = .06 * hug + sway; n.blink = hug > .5 ? 1 : 0; n.mouth = 1; n.earDrop = .15 * hug; }
      if (lt > 7.6) { const k = ss(seg(lt, 7.6, 8.1)); n.armR = [2.4 * k + .3 * (1 - k), .1, .8 + Math.sin(t * 9) * .3 * k]; n.handR = 1; n.head = [-.3 * hug + .2 * k, .18 * hug, .3 * hug]; n.look = [.5 * k, 0]; }
      idle(n, t, 2); nRoom.root.visible = true; nRoom.pose(n);
      if (hug > 0) {
        room.scene.updateMatrixWorld();
        const sh = wpos(sonya.arms[1].root).add(V3(-.11, .06 + Math.sin(t * 4.4) * .01, -.03)), rest = wpos(nRoom.arms[0].root).add(V3(-.05, -.45, -.05));
        reach(nRoom, 0, rest.lerp(sh, hug), [.35, .35, .5], 1);
        const back = V3(HUG_N[0] + .12, .62, HUG_N[1] - .2), front = V3(HUG_N[0] - .2, .62, HUG_N[1] - .24);
        const hs = wpos(sonya.arms[1].root), hf = wpos(sonya.arms[0].root);
        reach(sonya, 1, hs.clone().add(V3(0, -.3, 0)).lerp(back, hug), [.4, 1.0, .5], .9);
        reach(sonya, 0, hf.clone().add(V3(0, -.3, 0)).lerp(front, hug), [.3, 1.3, .9], .9);
      }
      team.forEach((m, i) => {
        m.root.visible = true; teamGifts[i].visible = true;
        const [ox, oz] = TEAM_OUT[i], step = ss(seg(lt, 6.6 + i * .08, 7.6 + i * .08));
        const q = P({ x: ox - step * .5, z: oz, rotY: -Math.PI / 2 + (oz - 1) * -.2, mouth: .9 });
        q.armL = q.armR = [.3, 1.0, 1.0];
        if (lt > 3.1) { q.y = hop((lt + i * .23) % .9, .1, .6, .08); }
        if (lt > 3.4 && i % 2) { q.armR = [2.6, .1, .3]; q.handR = 1; }
        idle(q, t, 10 + i); m.pose(q);
      });
      room.scene.updateMatrixWorld();
      team.forEach((m, i) => { const a = wpos(m.hands()[0]), b = wpos(m.hands()[1]); teamGifts[i].position.copy(a.add(b).multiplyScalar(.5)).add(V3(0, -.05, 0)); teamGifts[i].rotation.y = i; if (i % 2 && lt > 3.4) teamGifts[i].position.copy(wpos(m.hands()[0])).add(V3(0, -.05, 0)); });
    }
  });
  // ═══════════ S8 · Куранты (74–82) ═══════════
  const FW = [[76.1, -0.8, 3.0], [76.55, 2.0, 3.6], [77.0, .5, 3.3], [77.5, -1.6, 3.9], [77.95, 2.6, 2.8], [78.4, .9, 4.0], [78.9, -.5, 2.9], [79.4, 1.8, 3.4], [79.9, .2, 3.8], [80.4, 2.4, 3.1], [80.9, -1.2, 3.5]];
  S.push({
    a: 74, b: 82, set: room, caps: [[77.2, 81.7, 'С Новым годом!']],
    shots: [
      shot(74, 76.4, [[74, [1.7, 1.75, -.9, 2.0, 1.9, -2.42, 40]], [76.4, [1.8, 1.8, -1.2, 2.05, 1.95, -2.42, 36]]], [[74, [1.9, 1.8, -.9, 2.08, 1.85, -2.42, 56]], [76.4, [1.95, 1.85, -1.2, 2.1, 1.9, -2.42, 52]]]),
      shot(76.4, 82, [[76.4, [.4, 1.5, 4.3, -.3, 1.25, -1.4, 44]], [82, [.3, 1.45, 3.8, -.3, 1.25, -1.4, 42]]], [[76.4, [.2, 1.5, 4.6, -.3, 1.45, -1.4, 68]], [82, [.1, 1.45, 4.1, -.3, 1.45, -1.4, 66]]]),
    ],
    update(t, lt) {
      room.backdrop.material.map = room.night; room.lampL.intensity = .6; room.bulb.visible = true;
      room.update(t); room.snowIn.obj.visible = false; room.vent.rotation.y = 0; room.L.mesh.visible = false; room.doorG.rotation.y = 0; room.pencil.visible = false; room.cushion.visible = true;
      const sec = clamp(t - 76.0, -3, 0); setClock(room, 23, 59 + (lt < 2 ? lt / 2 * .99 : 1) - (lt < 2 ? 1 : 0) + (t >= 76 ? 1 : 0) * 0);
      if (t >= 76) setClock(room, 0, 0);
      // fireworks outside + coloured flashes
      let fl = 0, flc = null;
      room.fireworks.forEach((f, i) => { const idx = FW.findIndex((w, j) => j % room.fireworks.length === i && t >= w[0] && t < w[0] + 2.4); const w = idx >= 0 ? FW[idx] : null; if (w) { const age = t - w[0]; f.update(age, V3(w[1], w[2], -5.4), 2.2); const k = Math.max(0, 1 - age / .6); if (k > fl) { fl = k; flc = f.mat.color; } } else f.obj.visible = false; });
      room.flash.intensity = fl * 6; if (flc) room.flash.color.copy(flc).multiplyScalar(.33);
      const party = t > 76.2;
      // Соня + Ника
      const p = P({ x: -.55, z: -.55, rotY: .25, mouth: .9 });
      if (!party) { p.head = [.6, -.4, 0]; p.look = [.6, -.6]; p.mouth = .5; }
      else { p.y = hop((t * 1.6) % 1, .1, .7, .15); p.armL = p.armR = [2.5, .2, .4]; p.handL = p.handR = 1; p.mouth = 1; p.blink = t > 78.5 && t < 79.5 ? 1 : 0; }
      idle(p, t, 1); sonya.pose(p);
      const n = P({ x: -1.15, z: -.85, rotY: .35, mouth: 1 });
      if (party) { n.armL = [2.3, .3, .8]; n.armR = [.5, 1.0, 1.2]; n.y = hop(((t + .3) * 1.4) % 1, .1, .7, .12); n.head = [.3, .1, .15]; }
      else { n.head = [.9, -.4, 0]; n.look = [.6, -.7]; }
      idle(n, t, 2); nRoom.root.visible = true; nRoom.pose(n);
      team.forEach((m, i) => { const [x, z] = TEAM_IN[i]; const q = P({ x, z, rotY: Math.atan2(-.5 - x, 2.5 - z) * .5, mouth: .9 }); if (party) { q.armL = [2.4 + (i % 3) * .1, .2, .4]; q.armR = [2.5, .1, .3]; q.handL = q.handR = 1; q.y = hop(((t + i * .37) * 1.5) % 1, .1, .7, .1); } else { q.head = [.4, -.35, 0]; q.look = [.5, -.6]; } idle(q, t, 10 + i); m.pose(q); m.root.visible = true; teamGifts[i].visible = false; });
    }
  });
  // ═══════════ S9 · Финал (82–88) ═══════════
  const FWF = [[82.2, -2.8, 3.6, -9], [82.9, 4.5, 4.4, -12], [83.6, -4.5, 4.2, -11], [84.3, -1.8, 4.8, -10], [85.0, 5.2, 3.6, -12], [85.7, -3.5, 3.4, -9], [86.4, 4.0, 4.6, -12], [87.1, -2.2, 4.4, -10]];
  S.push({
    a: 82, b: 88, set: fin, caps: [], finale: true,
    shots: [shot(82, 88, [[82, [1.15, 1.3, 3.5, 1.15, 1.25, 0, 34]], [88, [1.1, 1.3, 3.2, 1.1, 1.25, 0, 34]]], [[82, [0, 1.3, 3.9, 0, 2.05, 0, 56]], [88, [0, 1.3, 3.7, 0, 2.05, 0, 56]]])],
    update(t, lt, VV, camR) {
      fin.update(t);
      fin.fws.forEach((f, i) => { const w = FWF.filter((_, j) => j % fin.fws.length === i).find(w => t >= w[0] && t < w[0] + 2.4); if (w) f.update(t - w[0], V3(VV ? w[1] * .45 : w[1], VV ? w[2] + .8 : w[2], w[3]), 2.6); else f.obj.visible = false; });
      const k = back(clamp(lt / .7), 1.4);
      const p = P({ y: (1 - k) * -.4, rotY: VV ? 0 : .25, mouth: 1, head: [VV ? 0 : .12, -.05, .08], look: VV ? [0, -.1] : [.2, -.1] });
      p.armR = [2.35, .15, .9 + Math.sin(t * 8) * .35]; p.handR = 1; p.armL = [.3, .3, .5]; p.brows = .5;
      idle(p, t, 3, .6); nFin.pose(p);
      if (camR) { const [cm, rect, Wp, Hp] = camR; fin.fws.forEach(f => f.obj.visible && K.clipPoints(f.obj, cm, rect, Wp, Hp)); K.clipPoints(fin.snow.obj, cm, rect, Wp, Hp); K.clipInstances(fin.bok.obj, cm, rect, Wp, Hp); }
    }
  });
  return { S, room };
}
function setClock(room, h, m) { room.clock.hMin.rotation.z = -m / 60 * Math.PI * 2; room.clock.hHour.rotation.z = -((h % 12) + m / 60) / 12 * Math.PI * 2; }
function smoothW(t, a, b) { return ss(seg(t, a, a + .4)) * (1 - ss(seg(t, b - .3, b))); }
