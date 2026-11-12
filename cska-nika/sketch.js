// Character sheet for approval: Ника in three poses + palette.
import { drawNika, pose, NK } from './nika.js';
import { blob, rrect } from './lib.js';

export function sketch(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fbf3e6'); g.addColorStop(1, '#f1e2cc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d2a9e'; ctx.font = '900 64px Nunito'; ctx.textAlign = 'left'; ctx.fillText('Ника — эскиз персонажа', 70, 100);
  ctx.fillStyle = '#6a5a70'; ctx.font = '800 30px Nunito'; ctx.fillText('талисман ЖГК ЦСКА · по фото костюма · мягкая 2D-анимация', 72, 148);
  const s = 1.38, gy = 1010;
  const poses = [
    ['спокойно', pose({ x: 330, y: gy, s, turn: .25, mouth: .8, armL: [.22, .2], armR: [.22, .2] })],
    ['машет болельщикам', pose({ x: 900, y: gy, s, turn: -.15, tilt: .06, mouth: 1, armR: [2.55, .45], handR: 'open', armL: [.3, .5], look: [.3, -.2], brows: .6 })],
    ['в пути (шапка — по желанию)', pose({ x: 1470, y: gy, s, flip: -1, turn: .6, mouth: .6, hat: 1, lean: .05, armL: [-.35, .4], armR: [.45, .5], legL: [.15, .25], legR: [-.05, 0], liftL: 22, bob: 6 })]
  ];
  for (const [label, p] of poses) {
    ctx.fillStyle = 'rgba(29,42,158,.07)'; ctx.beginPath(); ctx.ellipse(p.x, gy + 4, 170, 26, 0, 0, Math.PI * 2); ctx.fill();
    drawNika(ctx, p, 0);
    ctx.fillStyle = '#4a3d55'; ctx.font = '800 28px Nunito'; ctx.textAlign = 'center'; ctx.fillText(label, p.x, gy + 56);
  }
  // palette
  const sw = [['мех', NK.fur], ['грива', NK.mane], ['глаза', NK.iris], ['красный', NK.red], ['синий', NK.blue], ['перчатки', NK.glove], ['браслет', NK.bracelet]];
  sw.forEach(([n, c], i) => {
    const x = 1720, y = 220 + i * 92;
    blob(ctx, rrect(x, y, 64, 64, 16), c, { lw: 4, shade: false });
    ctx.fillStyle = '#4a3d55'; ctx.font = '800 22px Nunito'; ctx.textAlign = 'left'; ctx.fillText(n, x + 78, y + 40);
  });
}
