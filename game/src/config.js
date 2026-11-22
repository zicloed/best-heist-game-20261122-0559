// Midnight Getaway — every tuning number, colour and level fact in one place.
// The playfield is a fixed 1280x800 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 800 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  sneakSpeed: 95,
  startX: 640,
  startY: 716,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 58,
  chaseSpeed: 132,
  investigateSpeed: 95,
  viewRange: 235,
  viewHalfAngle: 0.61, // ~35 degrees
  touchRange: 26,
  /** suspicion (0..1) at which a guard stops and stares, and at which it chases. */
  stareAt: 0.35,
  chaseAt: 0.75,
  /** seconds without sight before an alarmed guard gives up and returns to patrol. */
  giveUpSeconds: 3,
};

export const CAMERA = {
  viewRange: 265,
  viewHalfAngle: 0.5, // ~29 degrees
  sweepAmplitude: 0.85, // radians either side of its base angle
  sweepSpeed: 0.55, // radians per second (sine)
};

export const ALARM = {
  /** alarm points per second while any observer is suspicious, scaled by top suspicion. */
  riseRate: 34,
  decayRate: 4,
  /** suspicion floor below which the alarm does not rise. */
  riseAbove: 0.3,
};

/** Detection multipliers: sneaking, hiding in a rug's shadow, standing in lamplight. */
export const SPOT = {
  sneak: 0.45,
  shadow: 0.55,
  lamplight: 1.45,
  /** suspicion per second at point blank, before distance falloff. */
  baseRate: 1.15,
  decayRate: 0.22,
  chaseDecayRate: 0.5,
};

export const TOOLS = {
  coins: 2,
  coinRange: 210, // how far a tossed coin flies from the thief
  coinLureRadius: 280, // guards inside this hear the clink and investigate
  coinInvestigateSeconds: 4,
  emps: 1,
  empDisableSeconds: 6,
};

export const SCORE = {
  sideLoot: 250,
  mainLoot: 1000,
  winBonus: 500,
  /** points lost per second of heist time (a fast getaway pays better). */
  timePenaltyPerSecond: 2,
};

/** Solid rectangles: walls, display cases, crates, planters. They block movement and sight. */
export const WALLS = [
  // Outer border (with a gap at the bottom centre for the getaway van door).
  { x: 0, y: 0, w: 1280, h: 24 },
  { x: 0, y: 0, w: 24, h: 800 },
  { x: 1256, y: 0, w: 24, h: 800 },
  { x: 0, y: 776, w: 590, h: 24 },
  { x: 690, y: 776, w: 590, h: 24 },
  // Vault room (top centre): side walls + bottom wall with a door gap.
  { x: 480, y: 24, w: 24, h: 216 },
  { x: 776, y: 24, w: 24, h: 216 },
  { x: 480, y: 216, w: 120, h: 24 },
  { x: 680, y: 216, w: 120, h: 24 },
  // Gallery furniture: display cases, crates, planters.
  { x: 150, y: 300, w: 130, h: 54 }, // display case, west
  { x: 1000, y: 300, w: 130, h: 54 }, // display case, east
  { x: 420, y: 430, w: 96, h: 96 }, // crate cluster, centre-left
  { x: 764, y: 430, w: 96, h: 96 }, // crate cluster, centre-right
  { x: 150, y: 560, w: 64, h: 64 }, // planter, south-west
  { x: 1066, y: 560, w: 64, h: 64 }, // planter, south-east
  { x: 420, y: 560, w: 100, h: 44 }, // long bench, south-west (kept off the centre escape lane)
];

/** Velvet rugs: standing on one halves how fast you are spotted (shadow). */
export const RUGS = [
  { x: 90, y: 380, w: 220, h: 130 },
  { x: 970, y: 380, w: 220, h: 130 },
  { x: 540, y: 280, w: 200, h: 90 },
];

/** Warm lamp pools: standing in one makes you easier to spot. */
export const LAMPS = [
  { x: 640, y: 330, r: 78 },
  { x: 280, y: 660, r: 70 },
  { x: 1000, y: 660, r: 70 },
];

/** The getaway: step into the van zone (the open door at the bottom centre). */
export const VAN = { x: 590, y: 736, w: 100, h: 64 };

export const LOOT = {
  main: { id: 'diamond', name: 'Starlight Diamond', x: 640, y: 128, r: 20, points: SCORE.mainLoot },
  side: [
    { id: 'gold', name: 'Gold Bar', x: 175, y: 150, r: 16, points: SCORE.sideLoot },
    { id: 'jade', name: 'Jade Fox', x: 1105, y: 150, r: 16, points: SCORE.sideLoot },
    { id: 'chalice', name: 'Silver Chalice', x: 175, y: 660, r: 16, points: SCORE.sideLoot },
    { id: 'painting', name: 'Moonlit Painting', x: 1105, y: 660, r: 16, points: SCORE.sideLoot },
  ],
};

export const GUARDS = [
  {
    name: 'Bram',
    x: 300, y: 330,
    waypoints: [
      { x: 300, y: 330 }, { x: 980, y: 330 }, { x: 980, y: 640 }, { x: 300, y: 640 },
    ],
  },
  {
    name: 'Celia',
    x: 330, y: 180,
    waypoints: [
      { x: 330, y: 180 }, { x: 330, y: 700 }, { x: 120, y: 700 }, { x: 120, y: 180 },
    ],
  },
  {
    name: 'Dmitri',
    x: 950, y: 180,
    waypoints: [
      { x: 950, y: 180 }, { x: 950, y: 700 }, { x: 1160, y: 700 }, { x: 1160, y: 180 },
    ],
  },
];

export const CAMERAS = [
  { x: 60, y: 52, baseAngle: Math.PI / 2, phase: 0 }, // north-west wall, sweeps the west gallery
  { x: 1220, y: 52, baseAngle: Math.PI / 2, phase: 2.1 }, // north-east wall, sweeps the east gallery
  { x: 640, y: 270, baseAngle: Math.PI / 2, phase: 4.2 }, // above the vault door, sweeps the hall
];

export const PALETTE = {
  floor: '#1b2030',
  floorTileA: '#202636',
  floorTileB: '#1a1f2e',
  floorTrim: '#2c3550',
  wall: '#3a4360',
  wallTop: '#4b567a',
  vault: '#5c6b8c',
  vaultDoor: '#8f9bb8',
  rug: '#5c1f2e',
  rugTrim: '#8a2f45',
  lamp: 'rgba(255, 190, 90, 0.13)',
  case: '#2e3a55',
  caseGlass: 'rgba(140, 190, 255, 0.16)',
  crate: '#6b4f2a',
  planter: '#2f5d3a',
  bench: '#54432a',
  van: '#c8a13a',
  vanDark: '#8a6d1e',
  thief: '#2fd4c4',
  thiefDark: '#1a8a80',
  guard: '#e8b13c',
  guardDark: '#9a7414',
  coneCalm: 'rgba(232, 177, 60, 0.20)',
  coneSuspicious: 'rgba(255, 140, 40, 0.30)',
  coneAlarmed: 'rgba(255, 60, 60, 0.38)',
  camCone: 'rgba(120, 200, 255, 0.16)',
  camConeOff: 'rgba(120, 200, 255, 0.04)',
  loot: '#ffd94d',
  diamond: '#aee6ff',
  alarm: '#ff4d4d',
  hud: '#0d1120',
  hudEdge: '#2c3550',
  text: '#eef1f5',
  muted: '#9aa3b8',
  good: '#57d977',
  danger: '#ff5a5a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-getaway.best';
