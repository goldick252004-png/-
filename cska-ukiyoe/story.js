// Timeline: the single source of truth for camera, printing, figures, voice, music and sound
export const DUR = 45.0;
export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;           // 0.625 s, 2.5 s
export const q8 = t => Math.floor(t * 8) / 8;                     // figures: 8 fps
export const q12 = t => Math.floor(t * 12) / 12;                  // rain: 12 fps

// Sheet layout on the scroll (world x of each sheet's left edge). Read right → left: hook, 2021, 2022; the triptych lies further left.
export const GAP = 260, TG = 70;                                  // gap between sheets on the scroll / between triptych panels
export const TRI = [0, 1920 + TG, 2 * (1920 + TG)];               // 2023, 2024, 2025
export const X22 = TRI[2] + 1920 + GAP, X21 = X22 + 1920 + GAP, XH = X21 + 1920 + GAP;
export const SHEETS = [
  { id: 'hook', x: XH }, { id: 'y21', x: X21 }, { id: 'y22', x: X22 },
  { id: 't23', x: TRI[0] }, { id: 't24', x: TRI[1] }, { id: 't25', x: TRI[2] },
];

export const T = {
  // block printing (key → blue → secondary → red), one start time per block
  print: {
    hook: [0.0, 0.45, 0.9, 1.35],
    y21: [4.6, 5.05, 5.5, 5.95],
    y22: [18.7, 99, 99, 99],          // 2022: key block only, colour blocks never land
    t23: [25.15, 25.45, 25.75, 26.05],
    t24: [28.2, 28.45, 28.7, 28.95],
    t25: [30.75, 31.0, 31.25, 31.5],
  },
  title: [1.0, 3.7],
  pullHook: [2.2, 4.0], slide21: [4.0, 4.9],
  push21: [7.5, 15.0], throw21: [11.0, 15.0], goal21: 15.0,
  slide22: [17.5, 18.9], throw22: [20.2, 23.0], save22: 22.4,
  ma1: [17.5, 19.0], ma2: [24.2, 25.0],
  slideT: [25.0, 25.9], throwT: 26.4, release: 27.1, net: 32.5,
  panT2: [28.0, 29.1], panT3: [30.5, 31.6],
  pullT: [34.0, 37.0], rain: [37.2, 39.4], redden: [38.9, 40.3], blue: [38.5, 39.3],
  card: 42.0, end: 45.0,
  cart: { hook: 1.6, y21: 6.6, y22: 19.1, t23: 27.5, t24: 30.0, t25: 32.5 },
};
export const REVEAL = 0.34;

// Narration: id → start time (sub = the subtitle text, written with digits)
export const VO = { L1: 2.6, L2: 7.8, L3: 19.3, L4: 21.6, L5: 25.4, L6: 35.0, L7: 40.0 };
