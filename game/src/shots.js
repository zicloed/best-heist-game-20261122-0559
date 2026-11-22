// Copper Fox — the screenshot scenes behind ?shot=start|play|end. Each one
// plays the real rules forward from a fresh world, steered by a simple
// autopilot (follow the level's safe route, sneak, wait outside a guard's
// cone, freeze while a camera sweeps past, drop smoke when a guard closes
// in, grab the loot when close), so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { STEP, THIEF } from './config.js';
import { EVENT_BUSTED, EVENT_CLEAR, insideSmoke, sightStrength } from './world.js';
import { GUARD } from './config.js';
import { SCREEN_BUSTED, SCREEN_CLEARED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 150;
const SAMPLE = STEP;

/** The retreat point: the nearest earlier waypoint at least 60 px away, so the
 *  thief never stands still on the spot it is fleeing from; else the start. */
function retreatTarget(state, waypoints, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const point = waypoints[i];
    if (Math.hypot(point.x - state.thief.x, point.y - state.thief.y) >= 60) return point;
  }
  return state.def.start;
}


function nearestGuard(state) {
  let nearest = Infinity;
  for (const guard of state.guards) {
    nearest = Math.min(nearest, Math.hypot(guard.x - state.thief.x, guard.y - state.thief.y));
  }
  return nearest;
}

/** Would any guard see the thief if it stood at (x, y) right now — or is a guard
 *  so close to that spot that it would bump into the thief there? */
function pointVisibleToGuard(state, x, y) {
  const probe = { x, y };
  for (const guard of state.guards) {
    if (Math.hypot(guard.x - x, guard.y - y) < 100) return true;
    const strength = sightStrength(
      guard.x, guard.y, guard.facing, GUARD.range, GUARD.halfAngle,
      probe, state.walls, state.smokes, state.time, true,
    );
    if (strength > 0.15) return true;
  }
  return false;
}

/**
 * Steer the thief along the level's route. Waits outside a guard's cone,
 * freezes while a camera sweeps past, backs off when a guard closes in while
 * the thief is seen, and drops smoke when a guard is nearly on top of it.
 */
export function autopilot(world, waypointIndex) {
  const state = world.state;
  const thief = state.thief;
  const phase = state.lootTaken ? 'exit' : 'loot';
  if (waypointIndex.phase !== phase) {
    waypointIndex.phase = phase;
    waypointIndex.value = 0;
  }
  const waypoints = state.lootTaken ? state.def.exitRoute : state.def.route;
  let index = waypointIndex.value;
  // A tight arrival radius: the thief must really reach a waypoint before
  // turning for the next one, or it wedges itself on a wall corner.
  while (index < waypoints.length) {
    const point = waypoints[index];
    if (Math.hypot(point.x - thief.x, point.y - thief.y) < 10) index += 1;
    else break;
  }
  waypointIndex.value = index;
  const goal = index < waypoints.length
    ? waypoints[index]
    : state.lootTaken
      ? { x: state.def.exit.x + state.def.exit.w / 2, y: state.def.exit.y + state.def.exit.h / 2 }
      : state.def.loot;
  const dx = goal.x - thief.x;
  const dy = goal.y - thief.y;
  const dist = Math.hypot(dx, dy);
  const controls = {
    dx: 0, dy: 0, sneak: true, interact: false, smoke: false, emp: false, target: null,
  };
  if (!state.lootTaken && dist < THIEF.grabRange + 8) controls.interact = true;
  if (dist < 4) return controls;

  const guardNear = nearestGuard(state);
  const chaser = state.guards.find((guard) => guard.chasing);
  // Hiding in smoke: the guard cannot see through it and will give up at
  // the last place it saw the thief — which is this cloud. So do not stand
  // on that spot: drift away from the nearest guard while the cloud lasts,
  // and only stand still once no guard is close.
  if (insideSmoke(thief.x, thief.y, state.smokes, state.time)) {
    if (guardNear < 150) {
      const near = state.guards.reduce((best, guard) => {
        const d = Math.hypot(guard.x - thief.x, guard.y - thief.y);
        return d < best.d ? { guard, d } : best;
      }, { guard: null, d: Infinity }).guard;
      const awayX = thief.x - near.x;
      const awayY = thief.y - near.y;
      const awayLen = Math.hypot(awayX, awayY) || 1;
      controls.dx = awayX / awayLen;
      controls.dy = awayY / awayLen;
      controls.sneak = true;
    }
    return controls;
  }
  // A guard can see the thief up close: drop smoke first, whatever comes next.
  if (state.guardSpotting > 0.15 && guardNear < 200 && state.tools.smoke > 0) {
    controls.smoke = true;
  }
  // Chased, or seen up close: run back along the route. The retreat point is
  // chosen once and held until the thief reaches it, so the thief never
  // veers into a guard while changing its mind mid-flight.
  const threatened = chaser || (state.guardSpotting > 0.15 && guardNear < 200);
  if (threatened) {
    if (!waypointIndex.retreat || Math.hypot(waypointIndex.retreat.x - thief.x, waypointIndex.retreat.y - thief.y) < 22) {
      if (waypointIndex.retreatDir) {
        // Keep running the way the thief was already running: picking a new
        // waypoint now would turn it back toward the guard behind it.
        const nx = Math.max(40, Math.min(1240, thief.x + waypointIndex.retreatDir.x * 200));
        const ny = Math.max(90, Math.min(770, thief.y + waypointIndex.retreatDir.y * 200));
        waypointIndex.retreat = { x: nx, y: ny };
      } else {
        waypointIndex.retreat = retreatTarget(state, waypoints, index);
        const dx = waypointIndex.retreat.x - thief.x;
        const dy = waypointIndex.retreat.y - thief.y;
        const len = Math.hypot(dx, dy) || 1;
        waypointIndex.retreatDir = { x: dx / len, y: dy / len };
      }
    }
    const back = waypointIndex.retreat;
    const bx = back.x - thief.x;
    const by = back.y - thief.y;
    const blen = Math.hypot(bx, by) || 1;
    controls.sneak = false;
    controls.dx = bx / blen;
    controls.dy = by / blen;
    return controls;
  }
  waypointIndex.retreat = null;
  waypointIndex.retreatDir = null;
  // Seen by a guard from far off: freeze and let its cone sweep past.
  if (state.guardSpotting > 0.25) return controls;
  // Seen only by a camera: keep moving — a wall camera's fan always covers
  // the spot under it, so standing still there is the worst thing to do.
  // The next step would walk into a guard's cone: wait where it is safe.
  const probeX = thief.x + (dx / dist) * 90;
  const probeY = thief.y + (dy / dist) * 90;
  if (pointVisibleToGuard(state, probeX, probeY)) return controls;
  controls.dx = dx / dist;
  controls.dy = dy / dist;
  return controls;
}

/**
 * Run one level's world forward with the autopilot until it clears, is
 * busted, or the time cap passes. Returns 'cleared', 'busted' or 'time'.
 */
export function playLevel(world, seconds) {
  const waypointIndex = { value: 0 };
  for (let t = 0; t < seconds; t += SAMPLE) {
    const events = world.step(SAMPLE, autopilot(world, waypointIndex));
    if (events & EVENT_BUSTED) return 'busted';
    if (events & EVENT_CLEAR) return 'cleared';
  }
  return 'time';
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset(0);
  if (name !== 'play' && name !== 'end' && name !== 'mid') {
    for (let t = 0; t < START_SECONDS; t += SAMPLE) {
      world.step(SAMPLE, { dx: 0, dy: 0, sneak: false, interact: false, smoke: false, emp: false, target: null });
    }
    return { screen: SCREEN_TITLE };
  }
  if (name === 'mid') {
    // A mid-route frame for the play screenshot: exactly 10 seconds in, the
    // fox crossing the top corridor with the cones around it. A different
    // moment from the cover shot, which runs on to the loot approach.
    const waypointIndex = { value: 0 };
    for (let t = 0; t < 10; t += SAMPLE) {
      const events = world.step(SAMPLE, autopilot(world, waypointIndex));
      if (events & EVENT_BUSTED) break;
      if (events & EVENT_CLEAR) break;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'play') {
    // A mid-heist frame: the fox part-way to the loot, the alarm already
    // partly raised by a cone it crossed, the loot still on its pedestal.
    // Stop the moment the alarm passes 30 (and the thief has been moving a
    // while), or as the thief closes in on the loot — never after the grab.
    const waypointIndex = { value: 0 };
    for (let t = 0; t < PLAY_SECONDS; t += SAMPLE) {
      const events = world.step(SAMPLE, autopilot(world, waypointIndex));
      if (events & EVENT_BUSTED) break;
      if (events & EVENT_CLEAR) break;
      const loot = world.state.def.loot;
      const nearLoot = Math.hypot(world.state.thief.x - loot.x, world.state.thief.y - loot.y) < 280;
      if ((world.state.alarm >= 30 && world.state.time > 6) || nearLoot) break;
    }
    return { screen: SCREEN_PLAY };
  }
  const outcome = playLevel(world, END_LIMIT_SECONDS);
  if (outcome === 'cleared') return { screen: SCREEN_CLEARED };
  if (outcome === 'busted') return { screen: SCREEN_BUSTED };
  return { screen: SCREEN_PLAY };
}
