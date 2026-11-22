// Copper Fox — turn a level's fixed facts into live state. The seed only jitters
// guard phase offsets and camera sweep starts, so the room is the same every
// run while patrols are never perfectly in step.
import { LEVELS } from './config.js';

/** The outer walls that box every room in, plus the level's own interior walls. */
export function allWalls(level) {
  return [
    { x: 0, y: 64, w: 1280, h: 16 },
    { x: 0, y: 784, w: 1280, h: 16 },
    { x: 0, y: 64, w: 16, h: 736 },
    { x: 1264, y: 64, w: 16, h: 736 },
    ...level.walls,
  ];
}

/** Build the mutable state of level `index` (0-based) from `random`. */
export function buildLevel(index, random) {
  const def = LEVELS[index];
  const walls = allWalls(def);
  return {
    index,
    def,
    walls,
    time: 0,
    alarm: 0,
    alarmPeak: 0,
    score: 0,
    status: 'playing',
    bustReason: '',
    lootTaken: false,
    empUntil: 0,
    smokes: [],
    tools: { smoke: def.tools.smoke, emp: def.tools.emp },
    thief: {
      x: def.start.x,
      y: def.start.y,
      facing: -Math.PI / 2,
      sneaking: false,
      moving: false,
      moveTarget: null,
    },
    guards: def.guards.map((guard) => {
      const first = guard.waypoints[0];
      return {
        waypoints: guard.waypoints,
        pause: guard.pause,
        x: first.x,
        y: first.y,
        facing: 0,
        leg: 0,
        waiting: random() * guard.pause,
        suspicion: 0,
        chasing: false,
        lastSeen: null,
        giveUpAt: 0,
        phase: random() * Math.PI * 2,
      };
    }),
    cameras: def.cameras.map((camera) => ({
      x: camera.x,
      y: camera.y,
      baseAngle: camera.baseAngle,
      sweep: camera.sweep,
      speed: camera.speed,
      angle: camera.baseAngle + (random() * 2 - 1) * camera.sweep,
      disabledUntil: 0,
      spotting: false,
    })),
  };
}
