// Dump sound-event times (global seconds) that depend on random visuals: node events.mjs > events.json
import { BURSTS, S9B } from './scenes.js';
const fw = BURSTS.map(([t0, , , , r]) => ({ t: 68 + t0, r }));
const fw9 = S9B.map(([t0]) => ({ t: 76 + t0 })).filter(e => e.t > 76);
console.log(JSON.stringify({ fw, fw9 }));
