// Copper Fox — every tuning number and level fact in one place. The playfield
// is a fixed 1280x800 logical area; the renderer scales it to the window, so no
// rule below depends on the screen size. The top 64 pixels are the HUD strip,
// so no wall, guard or loot starts above y = 80.
export const STEP = 1 / 60;
export const FIELD = { width: 1280, height: 800 };
export const HUD_HEIGHT = 64;
export const BEST_KEY = 'copper-fox-best';

export const THIEF = {
  radius: 14,
  walkSpeed: 175,
  sneakSpeed: 88,
  grabRange: 48,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 72,
  chaseSpeed: 138,
  range: 205,
  halfAngle: 0.62,
  catchRadius: 27,
};

export const CAMERA = {
  range: 235,
  halfAngle: 0.5,
};

export const ALARM = {
  // A brief glimpse should cost the thief, not end the run: the meter climbs
  // fast enough to punish lingering in a cone, slow enough that breaking
  // line of sight in time saves the heist.
  risePerSecond: 42,
  decayPerSecond: 18,
  sneakFactor: 0.5,
  bustAt: 100,
};

export const TOOLS = {
  smokeCost: 150,
  smokeRadius: 95,
  smokeSeconds: 5,
  empCost: 200,
  empSeconds: 6,
};

// Each level: its room, the loot, the patrols, the cameras, and a safe route
// the autopilot (and a careful player) can follow from the door to the loot
// and on to the exit. `route` leads to the loot; `exitRoute` leads out.
export const LEVELS = [
  {
    name: 'Heist I — The Gallery',
    room: 'The Meridian Gallery',
    loot: { x: 1010, y: 400, name: 'The Jade Fox', value: 1000 },
    start: { x: 90, y: 720 },
    exit: { x: 1180, y: 84, w: 84, h: 40 },
    walls: [
      { x: 420, y: 200, w: 24, h: 260 },
      { x: 700, y: 440, w: 260, h: 24 },
      { x: 300, y: 520, w: 70, h: 44 },
      { x: 900, y: 180, w: 70, h: 44 },
      { x: 1050, y: 540, w: 70, h: 44 },
    ],
    rugs: [
      { x: 120, y: 420, w: 220, h: 160 },
      { x: 880, y: 300, w: 240, h: 170 },
    ],
    guards: [
      { waypoints: [{ x: 120, y: 300 }, { x: 380, y: 300 }], pause: 1.2 },
      { waypoints: [{ x: 700, y: 620 }, { x: 1150, y: 620 }], pause: 1.0 },
    ],
    // Narrow sweeps: a corridor you can time, not a wall of light.
    cameras: [
      { x: 640, y: 82, baseAngle: Math.PI / 2, sweep: 0.5, speed: 0.55 },
      { x: 1262, y: 400, baseAngle: Math.PI, sweep: 0.6, speed: 0.7 },
    ],
    route: [
      { x: 90, y: 720 }, { x: 90, y: 400 }, { x: 90, y: 150 }, { x: 500, y: 150 },
      { x: 870, y: 150 }, { x: 870, y: 300 }, { x: 1010, y: 350 },
    ],
    exitRoute: [
      { x: 1010, y: 400 }, { x: 1010, y: 150 }, { x: 1220, y: 150 }, { x: 1220, y: 104 },
    ],
    tools: { smoke: 2, emp: 2 },
  },
  {
    name: 'Heist II — The Vault',
    room: 'The Meridian Vault',
    loot: { x: 1000, y: 250, name: 'The Solar Diamond', value: 1500 },
    start: { x: 90, y: 720 },
    exit: { x: 1180, y: 736, w: 84, h: 40 },
    walls: [
      { x: 640, y: 64, w: 24, h: 340 },
      { x: 300, y: 420, w: 340, h: 24 },
      { x: 900, y: 560, w: 280, h: 24 },
      { x: 180, y: 110, w: 70, h: 44 },
      { x: 1150, y: 300, w: 70, h: 44 },
    ],
    rugs: [
      { x: 700, y: 120, w: 300, h: 200 },
      { x: 120, y: 520, w: 220, h: 170 },
    ],
    guards: [
      { waypoints: [{ x: 200, y: 200 }, { x: 500, y: 200 }], pause: 1.0 },
      { waypoints: [{ x: 800, y: 420 }, { x: 1150, y: 420 }], pause: 1.4 },
      { waypoints: [{ x: 700, y: 660 }, { x: 1100, y: 660 }], pause: 0.8 },
    ],
    // Narrow sweeps: a corridor you can time, not a wall of light.
    cameras: [
      { x: 640, y: 82, baseAngle: Math.PI / 2, sweep: 0.55, speed: 0.6 },
      { x: 1262, y: 250, baseAngle: Math.PI, sweep: 0.6, speed: 0.65 },
      { x: 400, y: 782, baseAngle: -Math.PI / 2, sweep: 0.55, speed: 0.5 },
    ],
    route: [
      { x: 90, y: 720 }, { x: 280, y: 700 }, { x: 280, y: 300 }, { x: 280, y: 500 },
      { x: 700, y: 500 }, { x: 700, y: 300 }, { x: 760, y: 300 }, { x: 1000, y: 250 },
    ],
    exitRoute: [
      { x: 1000, y: 250 }, { x: 1000, y: 500 }, { x: 1220, y: 500 }, { x: 1220, y: 620 },
      { x: 1220, y: 756 },
    ],
    tools: { smoke: 2, emp: 2 },
  },
  {
    name: 'Heist III — The Penthouse',
    room: 'The Penthouse Suite',
    loot: { x: 1020, y: 200, name: 'The Crown of Meridia', value: 2500 },
    start: { x: 90, y: 720 },
    exit: { x: 90, y: 84, w: 84, h: 40 },
    walls: [
      { x: 400, y: 180, w: 24, h: 300 },
      { x: 800, y: 64, w: 24, h: 280 },
      { x: 520, y: 560, w: 700, h: 24 },
      { x: 180, y: 380, w: 70, h: 44 },
      { x: 1000, y: 300, w: 70, h: 44 },
    ],
    rugs: [
      { x: 860, y: 120, w: 280, h: 200 },
      { x: 120, y: 480, w: 220, h: 160 },
    ],
    guards: [
      { waypoints: [{ x: 150, y: 300 }, { x: 350, y: 300 }], pause: 1.0 },
      { waypoints: [{ x: 500, y: 200 }, { x: 750, y: 200 }], pause: 1.2 },
      { waypoints: [{ x: 900, y: 450 }, { x: 1150, y: 450 }], pause: 0.9 },
      { waypoints: [{ x: 600, y: 740 }, { x: 1100, y: 740 }], pause: 1.1 },
    ],
    // Narrow sweeps: a corridor you can time, not a wall of light.
    cameras: [
      { x: 640, y: 82, baseAngle: Math.PI / 2, sweep: 0.5, speed: 0.6 },
      { x: 1262, y: 200, baseAngle: Math.PI, sweep: 0.6, speed: 0.7 },
      { x: 1262, y: 600, baseAngle: Math.PI, sweep: 0.55, speed: 0.55 },
      { x: 620, y: 782, baseAngle: -Math.PI / 2, sweep: 0.55, speed: 0.6 },
    ],
    route: [
      { x: 90, y: 720 }, { x: 300, y: 700 }, { x: 300, y: 520 }, { x: 300, y: 120 },
      { x: 700, y: 120 }, { x: 700, y: 300 }, { x: 700, y: 500 }, { x: 480, y: 500 },
      { x: 480, y: 610 }, { x: 1240, y: 610 }, { x: 1240, y: 300 }, { x: 1020, y: 200 },
    ],
    exitRoute: [
      { x: 1020, y: 200 }, { x: 1240, y: 300 }, { x: 1240, y: 610 }, { x: 480, y: 610 },
      { x: 480, y: 500 }, { x: 700, y: 500 }, { x: 780, y: 500 }, { x: 780, y: 120 },
      { x: 300, y: 120 }, { x: 132, y: 104 },
    ],
    tools: { smoke: 3, emp: 2 },
  },
];
