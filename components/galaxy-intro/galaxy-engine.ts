// Canvas 2D particle engine for the AdmitOS galaxy intro.
//
// Framework-free on purpose: no React, no DOM lookups. The React component owns
// the lifecycle and hands this module a canvas, pointer deltas and a scroll
// progress value. High-frequency state (particles, rotation, progress) lives in
// typed arrays and closure variables, so nothing here triggers a React render.
//
// Phases, in time order:
//   1. Quiet start     - background stars fade in, scattered galaxy particles sit dim.
//   2. Convergence     - every galaxy particle travels an inward, swirling path from
//                        its scattered start point to its place in the spiral.
//   3. Living galaxy   - rigid pattern rotation, twinkle, drag rotation + momentum.
//   4. Focus zoom      - driven by the first tap/downward scroll: centre and enlarge
//                        the galaxy while keeping its colors and background intact.

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- timeline
const CONVERGE_START = 0.8; // seconds before particles start travelling
const DELAY_MAX = 0.75; // extra start delay spread (core first, rim last)
const TRAVEL_MIN = 1.5;
const TRAVEL_MAX = 2.3;
const FORMED_AT = CONVERGE_START + DELAY_MAX + TRAVEL_MAX * 0.85;
const CONVERGE_END = CONVERGE_START + DELAY_MAX + TRAVEL_MAX;

// ---------------------------------------------------------------- galaxy shape
const SPIRAL_WIND = 4.6; // radians the arms sweep from core to rim
const DEFAULT_PITCH = 0.42; // gentle tilt so the disc reads as 3D but stays a clear spiral
const PERSPECTIVE = 0.28;
const SPIN_RATE = 0.14; // rad/s ambient pattern rotation
const RADIUS_PER_SLOT = 0.5; // galaxy radius as a fraction of the "O" slot width

// ---------------------------------------------------------------- palette
type RGB = readonly [number, number, number];
const PALETTE: readonly RGB[] = [
  [255, 246, 230], // 0 warm core white
  [232, 238, 255], // 1 silver
  [186, 208, 255], // 2 pale blue
  [132, 170, 255], // 3 blue
  [166, 138, 255], // 4 violet
  [116, 214, 240], // 5 cyan
];
const BUCKETS = PALETTE.length;
const PAPER: RGB = [241, 243, 240]; // matches .landing-page background (#f1f3f0)

// ---------------------------------------------------------------- quality
export type QualityTier = "low" | "mid" | "high";
export interface Quality {
  tier: QualityTier;
  dprMax: number;
  galaxy: number;
  clouds: number;
  stars: number;
}

const TIERS: Record<QualityTier, Quality> = {
  low: { tier: "low", dprMax: 1.25, galaxy: 1000, clouds: 60, stars: 240 },
  mid: { tier: "mid", dprMax: 1.75, galaxy: 1700, clouds: 100, stars: 420 },
  high: { tier: "high", dprMax: 2, galaxy: 2600, clouds: 140, stars: 650 },
};

export function pickQuality(): Quality {
  if (typeof window === "undefined") return TIERS.mid;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (cores <= 4 || memory <= 3 || (coarse && small)) return TIERS.low;
  if (coarse || cores <= 6 || memory <= 4) return TIERS.mid;
  return TIERS.high;
}

// ---------------------------------------------------------------- public API
export interface PortalVars {
  /** displayed (smoothed) focus zoom progress, 0..1 */
  p: number;
  /** wordmark text exit, 0..1 */
  text: number;
  /** dark -> paper crossfade, 0..1 */
  veil: number;
  /** canvas opacity, 1..0 */
  canvas: number;
}

export interface GalaxyEngineOptions {
  canvas: HTMLCanvasElement;
  quality: Quality;
  reducedMotion: boolean;
  onFormed: () => void;
  onVars: (vars: PortalVars) => void;
}

export interface GalaxyEngine {
  resize(width: number, height: number, dpr: number): void;
  /** Home of the galaxy: centre of the "O" slot in canvas CSS px, and the slot width. */
  setSlot(centerX: number, centerY: number, size: number): void;
  /** Focus zoom progress 0..1. The engine smooths it. */
  setProgress(progress: number): void;
  setParallax(nx: number, ny: number): void;
  dragStart(): void;
  dragMove(dx: number, dy: number, dtMs: number): void;
  dragEnd(): void;
  setVisible(visible: boolean): void;
  start(): void;
  dispose(): void;
}

// ---------------------------------------------------------------- helpers
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rng());
}

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function rgba(c: RGB, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
function mixed(c: RGB, toward: RGB, t: number): string {
  const r = Math.round(lerp(c[0], toward[0], t));
  const g = Math.round(lerp(c[1], toward[1], t));
  const b = Math.round(lerp(c[2], toward[2], t));
  return `rgb(${r},${g},${b})`;
}

function makeSprite(size: number, stops: ReadonlyArray<readonly [number, string]>): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  if (!g) throw new Error("2D context unavailable for sprite");
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return sprite;
}

// 256-entry sine table: twinkle without a Math.sin call per particle per frame.
const SIN = new Float32Array(256);
for (let i = 0; i < 256; i++) SIN[i] = Math.sin((i / 256) * TAU);
const SIN_INDEX = 256 / TAU;

function pickGalaxyColor(r: number, rng: () => number): number {
  if (r < 0.16) return rng() < 0.6 ? 0 : 1;
  const v = rng();
  if (r < 0.45) return v < 0.25 ? 1 : v < 0.6 ? 2 : 3;
  if (v < 0.1) return 1;
  return v < 0.45 ? 3 : v < 0.75 ? 4 : v < 0.9 ? 5 : 2;
}

// ---------------------------------------------------------------- engine
export function createGalaxyEngine(options: GalaxyEngineOptions): GalaxyEngine {
  const { canvas, quality, reducedMotion: reduced, onFormed, onVars } = options;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas context unavailable");
  const ctx: CanvasRenderingContext2D = context;

  // ---- sprites (created once)
  const coreSprite = makeSprite(128, [
    [0, "rgba(255,250,240,1)"],
    [0.18, "rgba(236,241,255,0.86)"],
    [0.45, "rgba(150,176,255,0.34)"],
    [1, "rgba(90,110,230,0)"],
  ]);
  const hazeSprite = makeSprite(128, [
    [0, "rgba(150,168,255,0.30)"],
    [0.4, "rgba(112,104,232,0.15)"],
    [1, "rgba(60,70,200,0)"],
  ]);
  const dotSprites = PALETTE.map((c) =>
    makeSprite(32, [
      [0, rgba(c, 1)],
      [0.35, rgba(c, 0.42)],
      [1, rgba(c, 0)],
    ]),
  );

  // ---- galaxy particles (seeded => identical formation every load)
  const rng = mulberry32(0xad0517);
  const GN = quality.galaxy;
  interface GP {
    r: number; th: number; z: number; size: number; bright: number; col: number;
    big: boolean; rate: number; phase: number; delay: number; dur: number;
    nx: number; ny: number; swirl: number;
  }
  const gp: GP[] = [];
  for (let i = 0; i < GN; i++) {
    const bulge = rng() < 0.16;
    let r: number;
    let th: number;
    let z: number;
    if (bulge) {
      r = Math.min(0.24, 0.02 + Math.abs(gauss(rng)) * 0.07);
      th = rng() * TAU;
      z = gauss(rng) * 0.06;
    } else {
      r = 0.07 + 0.93 * Math.pow(rng(), 1.05);
      if (rng() < 0.1) {
        th = rng() * TAU; // faint inter-arm disc
      } else {
        const v = rng();
        const arm = v < 0.34 ? 0 : v < 0.68 ? 2 : v < 0.84 ? 1 : 3; // two strong arms, two minor
        const wind = (SPIRAL_WIND * Math.log(1 + 3.2 * r)) / Math.log(4.2);
        th = arm * (TAU / 4) + wind + gauss(rng) * (0.05 + 0.16 * r);
      }
      z = gauss(rng) * 0.035 * (1.1 - r);
    }
    const sizeRoll = rng();
    gp.push({
      r, th, z,
      size: 0.7 + 1.2 * Math.pow(sizeRoll, 2.6),
      bright: 0.35 + 0.65 * Math.pow(rng(), 1.8) + (r < 0.25 ? 0.2 : 0),
      col: pickGalaxyColor(r, rng),
      big: sizeRoll > 0.93 || (bulge && rng() < 0.12),
      rate: 0.6 + rng() * 2.2,
      phase: rng() * TAU,
      delay: DELAY_MAX * (0.25 * rng() + 0.75 * r),
      dur: TRAVEL_MIN + (TRAVEL_MAX - TRAVEL_MIN) * rng(),
      nx: rng(),
      ny: rng(),
      swirl: rng() < 0.55 ? 1 : 0,
    });
  }
  gp.sort((a, b) => a.col - b.col);

  const gR = new Float32Array(GN), gC = new Float32Array(GN), gS = new Float32Array(GN);
  const gZ = new Float32Array(GN), gSize = new Float32Array(GN), gBright = new Float32Array(GN);
  const gRate = new Float32Array(GN), gPhase = new Float32Array(GN);
  const gDelay = new Float32Array(GN), gDur = new Float32Array(GN);
  const gNX = new Float32Array(GN), gNY = new Float32Array(GN);
  const gR0 = new Float32Array(GN), gA0 = new Float32Array(GN); // scattered start, polar around the slot
  const gCol = new Uint8Array(GN), gBig = new Uint8Array(GN), gSwirl = new Uint8Array(GN);
  const gBucket = new Int32Array(BUCKETS + 1);
  gp.forEach((p, i) => {
    gR[i] = p.r; gC[i] = Math.cos(p.th); gS[i] = Math.sin(p.th); gZ[i] = p.z;
    gSize[i] = p.size; gBright[i] = p.bright; gRate[i] = p.rate; gPhase[i] = p.phase;
    gDelay[i] = p.delay; gDur[i] = p.dur; gNX[i] = p.nx; gNY[i] = p.ny;
    gCol[i] = p.col; gBig[i] = p.big ? 1 : 0; gSwirl[i] = p.swirl;
    gBucket[p.col + 1]++;
  });
  for (let b = 0; b < BUCKETS; b++) gBucket[b + 1] += gBucket[b];

  // ---- soft arm clouds (large, faint, additive sprites)
  const CN = quality.clouds;
  const cR = new Float32Array(CN), cC = new Float32Array(CN), cS = new Float32Array(CN);
  const cSize = new Float32Array(CN), cAlpha = new Float32Array(CN), cCol = new Uint8Array(CN);
  for (let i = 0; i < CN; i++) {
    const r = 0.2 + 0.75 * rng();
    const v = rng();
    const arm = v < 0.38 ? 0 : v < 0.76 ? 2 : v < 0.88 ? 1 : 3;
    const wind = (SPIRAL_WIND * Math.log(1 + 3.2 * r)) / Math.log(4.2);
    const th = arm * (TAU / 4) + wind + gauss(rng) * 0.09;
    cR[i] = r; cC[i] = Math.cos(th); cS[i] = Math.sin(th);
    cSize[i] = 0.14 + 0.13 * rng();
    cAlpha[i] = 0.03 + 0.035 * rng();
    cCol[i] = 3 + Math.floor(rng() * 3);
  }

  // ---- background stars: three depth layers
  const SN = quality.stars;
  interface SP { x: number; y: number; size: number; bright: number; col: number; layer: number; rate: number; phase: number; appear: number }
  const sp: SP[] = [];
  for (let i = 0; i < SN; i++) {
    const layerRoll = rng();
    const layer = layerRoll < 0.6 ? 0 : layerRoll < 0.88 ? 1 : 2; // far, mid, near
    const cv = rng();
    sp.push({
      x: rng(), y: rng(),
      size: [0.7, 1.0, 1.5][layer] * (0.8 + 0.5 * rng()),
      bright: [0.35, 0.55, 0.8][layer] * (0.6 + 0.4 * rng()),
      col: cv < 0.4 ? 1 : cv < 0.62 ? 2 : cv < 0.8 ? 3 : cv < 0.92 ? 4 : 5,
      layer,
      rate: 0.5 + rng() * 1.6,
      phase: rng() * TAU,
      appear: rng() * 1.4,
    });
  }
  sp.sort((a, b) => a.col - b.col);
  const sX = new Float32Array(SN), sY = new Float32Array(SN), sSize = new Float32Array(SN);
  const sBright = new Float32Array(SN), sRate = new Float32Array(SN), sPhase = new Float32Array(SN);
  const sAppear = new Float32Array(SN);
  const sCol = new Uint8Array(SN), sLayer = new Uint8Array(SN);
  const sBucket = new Int32Array(BUCKETS + 1);
  sp.forEach((s, i) => {
    sX[i] = s.x; sY[i] = s.y; sSize[i] = s.size; sBright[i] = s.bright; sRate[i] = s.rate;
    sPhase[i] = s.phase; sAppear[i] = s.appear; sCol[i] = s.col; sLayer[i] = s.layer;
    sBucket[s.col + 1]++;
  });
  for (let b = 0; b < BUCKETS; b++) sBucket[b + 1] += sBucket[b];
  const LAYER_PARALLAX = [4, 9, 16];
  const LAYER_WARP = [2.2, 4.6, 8.5];

  // ---- state
  let W = 0;
  let H = 0;
  let dpr = 1;
  let slotX = 0;
  let slotY = 0;
  let radius = 40; // galaxy radius in CSS px
  let densityK = 1;
  let baseStep = 1; // 2 when the galaxy is tiny (phones): fewer, brighter-per-particle draws
  let thin = 1; // adaptive: becomes 2 if the device cannot hold ~37 fps

  let tl = reduced ? CONVERGE_END + 1 : 0; // timeline seconds
  let formed = false;
  let spin = reduced ? 0.6 : 0;
  let yaw = 0;
  let pitch = DEFAULT_PITCH;
  let vYaw = 0;
  let vPitch = 0;
  let dragging = false;
  let idle = 0;
  let lastMoveAt = 0;
  let targetP = 0;
  let P = 0;
  let parX = 0;
  let parY = 0;
  let visible = true;
  let canvasHidden = false; // true once the portal has faded the canvas out completely
  let disposed = false;
  let started = false;
  let rafId = 0;
  let last = 0;
  let emaDt = 1 / 60;
  let frames = 0;
  let lastVars = { p: -1, text: -1, veil: -1, canvas: -1 };

  const bucketStyles: string[] = PALETTE.map((c) => rgba(c, 1));

  function layout() {
    if (W === 0 || H === 0) return;
    for (let i = 0; i < GN; i++) {
      const dx = gNX[i] * W - slotX;
      const dy = gNY[i] * H - slotY;
      gR0[i] = Math.hypot(dx, dy);
      gA0[i] = Math.atan2(dy, dx);
    }
  }

  function wake() {
    if (rafId !== 0 || !visible || disposed || !started) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function needsFrame(): boolean {
    // Portal finished: the canvas is fully transparent and the scroll has settled, so
    // there is nothing left to animate. setProgress() wakes the loop again for reverse scrolling.
    if (canvasHidden && P === targetP) return false;
    if (!reduced) return true;
    if (dragging) return true;
    if (Math.abs(vYaw) + Math.abs(vPitch) > 0.01) return true;
    if (idle > 3 && (Math.abs(yaw - TAU * Math.round(yaw / TAU)) > 0.002 || Math.abs(pitch - DEFAULT_PITCH) > 0.002)) return true;
    return false;
  }

  function frame(now: number) {
    rafId = 0;
    if (disposed) return;
    const rawDt = (now - last) / 1000;
    last = now;
    const dt = clamp(rawDt, 0, 0.05);

    // -- adaptive thinning for slow devices
    frames++;
    emaDt = emaDt * 0.95 + dt * 0.05;
    if (frames > 90 && thin === 1 && emaDt > 0.027) thin = 2;

    // -- timeline (fast-forward if the visitor starts scrolling before formation ends)
    if (!reduced) tl += dt * (!formed && targetP > 0.004 ? 6 : 1);
    if (!formed && tl >= FORMED_AT) {
      formed = true;
      onFormed();
    }
    if (!reduced) spin += dt * SPIN_RATE;

    // -- smoothed scroll progress
    P += (targetP - P) * (1 - Math.exp(-dt * 9));
    if (Math.abs(targetP - P) < 0.0006) P = targetP;

    // -- drag momentum, idle return to the resting pose
    if (!dragging) {
      yaw += vYaw * dt;
      pitch = clamp(pitch + vPitch * dt, -1.35, 1.35);
      const decay = Math.exp(-dt * 3.2);
      vYaw *= decay;
      vPitch *= decay;
      idle += dt;
      if (idle > 3) {
        const k = 1 - Math.exp(-dt * 0.9);
        yaw += (TAU * Math.round(yaw / TAU) - yaw) * k;
        pitch += (DEFAULT_PITCH - pitch) * k;
      }
    }

    draw();

    // Visitor scrolled all the way through before the galaxy finished forming: complete the
    // formation now, so scrolling back up shows a finished galaxy (and the "S" and cue appear).
    if (canvasHidden && P === targetP && !formed) {
      tl = Math.max(tl, CONVERGE_END);
      formed = true;
      onFormed();
    }

    const keepGoing = needsFrame() && visible && !disposed;
    if (keepGoing) rafId = requestAnimationFrame(frame);
  }

  function emitVars(text: number, veil: number, canvasOpacity: number) {
    const eps = 0.002;
    if (
      Math.abs(P - lastVars.p) > eps || Math.abs(text - lastVars.text) > eps ||
      Math.abs(veil - lastVars.veil) > eps || Math.abs(canvasOpacity - lastVars.canvas) > eps
    ) {
      lastVars = { p: P, text, veil, canvas: canvasOpacity };
      onVars(lastVars);
    }
  }

  function draw() {
    if (W === 0 || H === 0) return;
    const g = ctx;

    // ---- focus parameters: centre and enlarge the galaxy without fading it away.
    const q = smooth(0, 1, P);
    const glide = smooth(0, 0.7, q);
    const whiteMix = 0;
    const bloom = 0;
    const text = 0;
    const veil = 0;
    const canvasOpacity = 1;
    emitVars(text, veil, canvasOpacity);
    canvasHidden = false;
    if (canvasHidden) {
      g.clearRect(0, 0, W, H);
      return;
    }

    const warp = 0;
    const targetZoom = Math.max(3, Math.min(5, Math.min(W, H) / (radius * 2.4)));
    const Z = lerp(1, targetZoom, q);
    const gcx = lerp(slotX, W / 2, glide);
    const gcy = lerp(slotY, H / 2, glide);
    const converging = tl < CONVERGE_END;

    // colour buckets drift toward silver-white as the portal opens
    for (let b = 0; b < BUCKETS; b++) {
      bucketStyles[b] = whiteMix > 0.003 ? mixed(PALETTE[b], PAPER, whiteMix * 0.85) : rgba(PALETTE[b], 1);
    }

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";

    // ---- background stars
    if (warp < 0.002) {
      for (let b = 0; b < BUCKETS; b++) {
        const s0 = sBucket[b];
        const s1 = sBucket[b + 1];
        if (s0 === s1) continue;
        g.fillStyle = bucketStyles[b];
        for (let i = s0; i < s1; i += thin) {
          const layer = sLayer[i];
          const x = sX[i] * W + parX * LAYER_PARALLAX[layer];
          const y = sY[i] * H + parY * LAYER_PARALLAX[layer];
          const tw = SIN[(((tl * sRate[i] + sPhase[i]) * SIN_INDEX) | 0) & 255];
          const appear = reduced ? 1 : smooth(sAppear[i], sAppear[i] + 0.9, tl);
          const a = sBright[i] * (0.8 + 0.2 * tw) * appear * (thin > 1 ? 1.3 : 1);
          if (a < 0.02) continue;
          const s = sSize[i];
          g.globalAlpha = a;
          g.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
    } else {
      g.lineCap = "round";
      g.strokeStyle = mixed(PALETTE[1], PAPER, whiteMix * 0.9);
      const fadeOut = 1 - smooth(0.9, 1, warp);
      for (let i = 0; i < SN; i += thin) {
        const layer = sLayer[i];
        const wd = LAYER_WARP[layer];
        const bx = sX[i] * W + parX * LAYER_PARALLAX[layer] - gcx;
        const by = sY[i] * H + parY * LAYER_PARALLAX[layer] - gcy;
        const sHead = 1 + warp * wd;
        const sTail = 1 + (sHead - 1) * 0.55;
        const hx = gcx + bx * sHead;
        const hy = gcy + by * sHead;
        const tx = gcx + bx * sTail;
        const ty = gcy + by * sTail;
        if ((hx < 0 && tx < 0) || (hx > W && tx > W) || (hy < 0 && ty < 0) || (hy > H && ty > H)) continue;
        g.globalAlpha = clamp(sBright[i] * (0.55 + 0.45 * Math.min(1, warp * 3)) * fadeOut, 0, 1);
        g.lineWidth = 0.6 + layer * 0.45;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(hx, hy);
        g.stroke();
      }
    }

    // ---- galaxy
    const gform = reduced ? 1 : smooth(CONVERGE_START + 0.6, FORMED_AT, tl);
    const yawDraw = yaw + (reduced ? 0 : Math.sin(tl * 0.37) * 0.05);
    const pitchDraw = pitch + (reduced ? 0 : Math.sin(tl * 0.29 + 1) * 0.035);
    const cyw = Math.cos(yawDraw);
    const syw = Math.sin(yawDraw);
    const cpt = Math.cos(pitchDraw);
    const spt = Math.sin(pitchDraw);
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    const sizeZ = Z > 1 ? Math.pow(Math.min(Z, 6), 0.55) : 1;
    const R = radius;
    const whiteFade = 1 - whiteMix * 0.55;

    // disc haze, foreshortened to match the current orientation
    {
      const nx = syw;
      const ny = -cyw * spt;
      const nz = cyw * cpt;
      const hr = R * 1.3 * Z;
      g.save();
      g.translate(gcx, gcy);
      g.rotate(Math.atan2(ny, nx));
      g.scale(Math.max(Math.abs(nz), 0.2), 1);
      g.globalAlpha = 0.55 * gform * whiteFade;
      g.drawImage(hazeSprite, -hr, -hr, hr * 2, hr * 2);
      g.restore();
    }

    // arm clouds
    for (let i = 0; i < CN; i++) {
      const r = cR[i];
      const x0 = r * (cC[i] * cs - cS[i] * sn);
      const y0 = r * (cS[i] * cs + cC[i] * sn);
      const x1 = x0 * cyw;
      const z1 = -x0 * syw;
      const y2 = y0 * cpt - z1 * spt;
      const z2 = y0 * spt + z1 * cpt;
      const f = 1 / (1 - z2 * PERSPECTIVE);
      const px = gcx + x1 * f * R * Z;
      const py = gcy + y2 * f * R * Z;
      const cr = cSize[i] * R * Z * f * 1.6;
      if (px < -cr || px > W + cr || py < -cr || py > H + cr) continue;
      g.globalAlpha = cAlpha[i] * gform * whiteFade * densityK;
      g.drawImage(dotSprites[cCol[i]], px - cr, py - cr, cr * 2, cr * 2);
    }

    // particles
    for (let b = 0; b < BUCKETS; b++) {
      const s0 = gBucket[b];
      const s1 = gBucket[b + 1];
      if (s0 === s1) continue;
      g.fillStyle = bucketStyles[b];
      for (let i = s0; i < s1; i += thin * baseStep) {
        const r = gR[i];
        const x0 = r * (gC[i] * cs - gS[i] * sn);
        const y0 = r * (gS[i] * cs + gC[i] * sn);
        const z0 = gZ[i];
        const x1 = x0 * cyw + z0 * syw;
        const z1 = z0 * cyw - x0 * syw;
        const y2 = y0 * cpt - z1 * spt;
        const z2 = y0 * spt + z1 * cpt;
        const f = 1 / (1 - z2 * PERSPECTIVE);
        const txp = x1 * f * R * Z;
        const typ = y2 * f * R * Z;

        let e = 1;
        let px: number;
        let py: number;
        if (converging) {
          const x = (tl - CONVERGE_START - gDelay[i]) / gDur[i];
          e = x <= 0 ? 0 : x >= 1 ? 1 : easeInOutCubic(x);
        }
        if (e < 1) {
          const rt = Math.hypot(txp, typ);
          const at = Math.atan2(typ, txp);
          let m = (at - gA0[i]) % TAU;
          if (m < 0) m += TAU;
          const d0 = -m - TAU * gSwirl[i];
          const rr = gR0[i] + (rt - gR0[i]) * e;
          const aa = at + d0 * (1 - e);
          px = gcx + rr * Math.cos(aa);
          py = gcy + rr * Math.sin(aa);
        } else {
          px = gcx + txp;
          py = gcy + typ;
        }
        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

        const tw = SIN[(((tl * gRate[i] + gPhase[i]) * SIN_INDEX) | 0) & 255];
        const a = gBright[i] * densityK * (0.15 + 0.85 * e) * (0.8 + 0.2 * tw) * (0.84 + 0.16 * z2) * (thin > 1 ? 1.3 : 1);
        if (a < 0.02) continue;
        const s = Math.max(gSize[i] * (0.55 + 0.45 * e) * sizeZ * f, 0.8);
        if (gBig[i] === 1) {
          const gs = s * 5;
          g.globalAlpha = Math.min(a * 0.55, 1) * whiteFade;
          g.drawImage(dotSprites[b], px - gs / 2, py - gs / 2, gs, gs);
        }
        g.globalAlpha = Math.min(a, 1);
        if (s > 2.4) {
          // zoomed-in particles: soft round sprites instead of hard squares
          const ds = s * 1.7;
          g.drawImage(dotSprites[b], px - ds / 2, py - ds / 2, ds, ds);
        } else {
          g.fillRect(px - s / 2, py - s / 2, s, s);
        }
      }
    }

    // luminous core
    {
      const breath = reduced ? 1 : 1 + 0.04 * Math.sin(tl * 0.9);
      const cr = R * 0.85 * breath * Z;
      g.globalAlpha = 0.9 * gform * (1 - 0.5 * whiteMix);
      g.drawImage(coreSprite, gcx - cr, gcy - cr, cr * 2, cr * 2);
    }

    // restrained central bloom for the dark -> light hand-off (never pure white)
    if (bloom > 0.003) {
      g.globalCompositeOperation = "source-over";
      const rad = Math.hypot(W, H) * (0.12 + bloom * 0.95);
      const grad = g.createRadialGradient(gcx, gcy, 0, gcx, gcy, rad);
      grad.addColorStop(0, rgba(PAPER, 0.95 * bloom));
      grad.addColorStop(0.25, rgba([200, 215, 250], 0.55 * bloom));
      grad.addColorStop(0.6, rgba([120, 140, 225], 0.16 * bloom));
      grad.addColorStop(1, rgba([100, 120, 220], 0));
      g.globalAlpha = 1;
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  // ---------------------------------------------------------------- API
  return {
    resize(width, height, nextDpr) {
      if (disposed || width <= 0 || height <= 0) return;
      // Re-assigning canvas.width reallocates and clears the bitmap; skip it when nothing changed
      // (the wordmark/font observers also trigger measurements that only move the slot).
      if (width === W && height === H && nextDpr === dpr) return;
      W = width;
      H = height;
      dpr = nextDpr;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      layout();
      wake();
      if (reduced) draw();
    },
    setSlot(centerX, centerY, size) {
      if (disposed) return;
      slotX = centerX;
      slotY = centerY;
      radius = Math.max(size * RADIUS_PER_SLOT, 8);
      densityK = clamp(0.35 + radius / 110, 0.4, 1);
      baseStep = radius < 34 ? 2 : 1;
      layout();
      wake();
      if (reduced) draw();
    },
    setProgress(progress) {
      targetP = clamp(progress, 0, 1);
      wake();
    },
    setParallax(nx, ny) {
      parX = nx;
      parY = ny;
    },
    dragStart() {
      dragging = true;
      vYaw = 0;
      vPitch = 0;
      idle = 0;
      lastMoveAt = performance.now();
      wake();
    },
    dragMove(dx, dy, dtMs) {
      if (!dragging) return;
      const k = 0.013;
      yaw += dx * k;
      pitch = clamp(pitch - dy * k, -1.35, 1.35);
      const dt = Math.max(dtMs, 8) / 1000;
      vYaw = clamp(vYaw * 0.6 + ((dx * k) / dt) * 0.4, -5, 5);
      vPitch = clamp(vPitch * 0.6 + ((-dy * k) / dt) * 0.4, -5, 5);
      lastMoveAt = performance.now();
      idle = 0;
      wake();
    },
    dragEnd() {
      dragging = false;
      if (performance.now() - lastMoveAt > 90) {
        vYaw = 0;
        vPitch = 0;
      }
      idle = 0;
      wake();
    },
    setVisible(next) {
      visible = next;
      if (next) wake();
      else if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
    start() {
      if (started || disposed) return;
      started = true;
      if (reduced) {
        formed = true;
        onFormed();
      }
      wake();
      if (reduced && W > 0) draw();
    },
    dispose() {
      disposed = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      rafId = 0;
    },
  };
}
