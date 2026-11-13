// Character sheet (approval sketch): ?view=sheet
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { buildNika, buildPerson, defaultPose, TOPS } from './chars.js';
export function sheetScene(renderer, composer, rp, cam, OX, W, H) {
  const scene = new THREE.Scene(); rp.scene = scene; cam.fov = 28; cam.updateProjectionMatrix();
  new RGBELoader().load('/core/assets/polyhaven/lythwood_lounge_2k.hdr', h => { h.mapping = THREE.EquirectangularReflectionMapping; scene.environment = h; });
  scene.environmentIntensity = .35; scene.background = new THREE.Color('#f3e6d6');
  const key = new THREE.DirectionalLight('#fff1dc', 1.7); key.position.set(2.5, 4, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -1, near: .5, far: 15 }); key.shadow.radius = 6; scene.add(key);
  const rim = new THREE.DirectionalLight('#a9c0ff', 1.6); rim.position.set(-3, 2.5, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9c2a8', .25));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: '#efe0cd', roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const n1 = buildNika(), n2 = buildNika();
  const girl = buildPerson({ child: 1, skin: '#f6d2b8', hair: '#7a4426', style: 'buns', iris: '#6b3d22', top: TOPS.tee, bottom: '#3a4fd8', long: 1, shoe: '#ffffff', lashes: 1, female: 1 });
  n1.pose(Object.assign(defaultPose(), { x: -1.15, rotY: .35, head: [.15, 0, .05], look: [.2, 0], mouth: .9 }));
  n2.pose(Object.assign(defaultPose(), { x: .15, rotY: -.15, head: [-.1, -.05, -.1], look: [0, .1], mouth: 1, armR: [2.4, .15, 1.0], handR: 1, armL: [.25, .25, .6] }));
  girl.pose(Object.assign(defaultPose(), { x: 1.25, rotY: -.35, head: [-.15, -.1, .08], look: [-.2, .1], mouth: .8, armL: [.2, .3, .9], armR: [.2, .3, .9] }));
  scene.add(n1.root, n2.root, girl.root);
  cam.position.set(0, 1.2, 5.6); cam.lookAt(0, .9, 0);
  return () => {
    composer.render();
    OX.textAlign = 'left'; OX.fillStyle = '#1d2a9e'; OX.font = '900 60px Nunito'; OX.fillText('Ника и Соня — 3D-эскиз', 70, 96);
    OX.textAlign = 'center'; OX.font = '800 30px Nunito'; OX.fillStyle = '#4a3d55';
    [['Ника', .2], ['Ника машет', .5], ['Соня, 7 лет', .8]].forEach(([s, x]) => OX.fillText(s, W * x, H - 40));
  };
}
