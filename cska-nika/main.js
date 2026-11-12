import { sketch } from './sketch.js';
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const W = cv.width = innerWidth, H = cv.height = innerHeight;
const Q = new URLSearchParams(location.search);
window.DUR = 1;
window.render = t => {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  if (Q.get('view') === 'sketch') return sketch(ctx, W, H);
};
document.fonts.load('900 40px Nunito').then(() => document.fonts.load('800 40px Nunito')).then(() => { window.READY = true; });
