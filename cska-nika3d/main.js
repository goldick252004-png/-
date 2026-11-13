import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildNika, buildPerson, defaultPose, TOPS, COL } from './chars.js';

const W = innerWidth, H = innerHeight, V = H > W, Q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('stage').appendChild(renderer.domElement);
const ov = document.getElementById('ov'); ov.width = W; ov.height = H; const OX = ov.getContext('2d');
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(28, W / H, .05, 200);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .3, .5, .92); composer.addPass(bloom);
composer.addPass(new OutputPass());

await Promise.all(['800 40px Nunito', '900 40px Nunito'].map(f => document.fonts.load(f, 'Ника ЦСКА')));
const hdr = await new RGBELoader().loadAsync('/core/assets/polyhaven/lythwood_lounge_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = hdr; scene.environmentIntensity = .35;

// —— character sheet ——
function sheet() {
  scene.background = new THREE.Color('#f3e6d6');
  const key = new THREE.DirectionalLight('#fff1dc', 1.7); key.position.set(2.5, 4, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -1, near: .5, far: 15 }); key.shadow.radius = 6; key.shadow.bias = -.0005; scene.add(key);
  const rim = new THREE.DirectionalLight('#a9c0ff', 1.6); rim.position.set(-3, 2.5, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9c2a8', .25));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: '#efe0cd', roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const n1 = buildNika(), n2 = buildNika();
  const girl = buildPerson({ child: 1, skin: '#f6d2b8', hair: '#7a4426', style: 'buns', iris: '#6b3d22', top: TOPS.tee, bottom: '#3a4fd8', long: 1, shoe: '#ffffff', lashes: 1, female: 1 });
  const p1 = defaultPose(); Object.assign(p1, { x: -1.15, rotY: .35, head: [.15, 0, .05], look: [.2, 0], mouth: .9 });
  const p2 = defaultPose(); Object.assign(p2, { x: .15, rotY: -.15, head: [-.1, -.05, -.1], look: [0, .1], mouth: 1, brows: 1, armR: [2.4, .15, 1.0], handR: 1, armL: [.25, .25, .6], earDrop: 0 });
  const pg = defaultPose(); Object.assign(pg, { x: 1.25, rotY: -.35, head: [-.15, -.1, .08], look: [-.2, .1], mouth: .8, armL: [.2, .3, .9], armR: [.2, .3, .9], brows: .5 });
  n1.pose(p1); n2.pose(p2); girl.pose(pg);
  scene.add(n1.root, n2.root, girl.root);
  cam.position.set(0, 1.2, 5.6); cam.lookAt(0, .9, 0);
  return () => {
    OX.clearRect(0, 0, W, H); OX.textAlign = 'left'; OX.fillStyle = '#1d2a9e'; OX.font = '900 60px Nunito'; OX.fillText('Ника и Соня — 3D-эскиз', 70, 96);
    OX.fillStyle = '#6a5a70'; OX.font = '800 28px Nunito'; OX.fillText('объём, мягкий свет, мех с бархатным отливом · рендер кодом (three.js)', 72, 140);
    OX.textAlign = 'center'; OX.font = '800 30px Nunito'; OX.fillStyle = '#4a3d55';
    [['Ника', .2], ['Ника машет', .5], ['Соня, 7 лет', .8]].forEach(([s, x]) => OX.fillText(s, W * x, H - 40));
  };
}

let overlay = () => {};
if (Q.get('view') === 'sheet') overlay = sheet();
window.DUR = 1;
window.render = t => { const t0 = performance.now(); composer.render(); overlay(t); window.LAST_MS = performance.now() - t0; };
window.READY = true;
