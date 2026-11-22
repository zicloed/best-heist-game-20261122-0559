// Copper Fox — the rules and state, with no drawing and no browser in it: the
// thief, the patrolling guards, the sweeping cameras, the loot, the tools, the
// alarm meter and the clear / busted conditions. step() advances one fixed step
// and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound.
import { ALARM, CAMERA, FIELD, GUARD, LEVELS, THIEF, TOOLS } from './config.js';
import { buildLevel } from './level.js';

export const EVENT_LOOT = 1;
export const EVENT_CLEAR = 2;
export const EVENT_BUSTED = 4;
export const EVENT_SPOTTED = 8;
export const EVENT_TOOL = 16;

/** Does the segment (x1,y1)-(x2,y2) cross the rectangle? */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let low = 0;
  let high = 1;
  for (const [origin, delta, min, max] of [
    [x1, dx, rect.x, rect.x + rect.w],
    [y1, dy, rect.y, rect.y + rect.h],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < min || origin > max) return false;
    } else {
      let enter = (min - origin) / delta;
      let exit = (max - origin) / delta;
      if (enter > exit) [enter, exit] = [exit, enter];
      low = Math.max(low, enter);
      high = Math.min(high, exit);
      if (low > high) return false;
    }
  }
  return true;
}

/** Is the line of sight between two points blocked by any wall? */
export function blockedByWall(x1, y1, x2, y2, walls) {
  for (const wall of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return true;
  }
  return false;
}

/** Is (x, y) inside any live smoke cloud? Smoke hides the thief completely. */
export function insideSmoke(x, y, smokes, now) {
  for (const smoke of smokes) {
    if (now < smoke.until) {
      const dx = x - smoke.x;
      const dy = y - smoke.y;
      if (dx * dx + dy * dy < TOOLS.smokeRadius * TOOLS.smokeRadius) return true;
    }
  }
  return false;
}

/**
 * How strongly a watcher at (x, y) facing `angle` sees the thief: 0 when out of
 * range, out of the cone, behind a wall or hidden in smoke, up to 1 dead ahead
 * and close. `sneak` halves it.
 */
export function sightStrength(x, y, angle, range, halfAngle, thief, walls, smokes, now, sneak) {
  const dx = thief.x - x;
  const dy = thief.y - y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  let diff = Math.atan2(dy, dx) - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return 0;
  if (blockedByWall(x, y, thief.x, thief.y, walls)) return 0;
  if (insideSmoke(thief.x, thief.y, smokes, now)) return 0;
  const strength = (1 - (dist / range) * 0.55) * (1 - (Math.abs(diff) / halfAngle) * 0.5);
  return sneak ? strength * ALARM.sneakFactor : strength;
}

/** Move a circle by (dx, dy), sliding along walls instead of passing through. */
export function moveCircle(body, radius, dx, dy, walls) {
  const nextX = body.x + dx;
  if (!circleHitsWalls(nextX, body.y, radius, walls)) body.x = nextX;
  const nextY = body.y + dy;
  if (!circleHitsWalls(body.x, nextY, radius, walls)) body.y = nextY;
}

export function circleHitsWalls(x, y, radius, walls) {
  for (const wall of walls) {
    const nearX = Math.max(wall.x, Math.min(x, wall.x + wall.w));
    const nearY = Math.max(wall.y, Math.min(y, wall.y + wall.h));
    const dx = x - nearX;
    const dy = y - nearY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

export function createWorld(random) {
  let levelIndex = 0;
  let state = buildLevel(0, random);
  let totalScore = 0;

  function reset(nextLevel) {
    levelIndex = nextLevel;
    state = buildLevel(nextLevel, random);
    state.score = totalScore;
  }

  function startOver() {
    totalScore = 0;
    reset(0);
  }

  function step(dt, controls) {
    if (state.status !== 'playing') return 0;
    let events = 0;
    state.time += dt;
    const thief = state.thief;
    const walls = state.walls;

    // --- the thief moves: keys first, otherwise toward a clicked target. ---
    let dx = controls.dx;
    let dy = controls.dy;
    if (dx === 0 && dy === 0 && thief.moveTarget) {
      const tx = thief.moveTarget.x - thief.x;
      const ty = thief.moveTarget.y - thief.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 10) thief.moveTarget = null;
      else {
        dx = tx / dist;
        dy = ty / dist;
      }
    }
    if (controls.target) thief.moveTarget = controls.target;
    thief.sneaking = controls.sneak;
    const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const stepX = (dx / length) * speed * dt;
      const stepY = (dy / length) * speed * dt;
      moveCircle(thief, THIEF.radius, stepX, stepY, walls);
      thief.facing = Math.atan2(dy, dx);
      thief.moving = true;
    } else {
      thief.moving = false;
    }

    // --- tools, at a cost in score. ---
    if (controls.smoke && state.tools.smoke > 0) {
      state.tools.smoke -= 1;
      state.score = Math.max(0, state.score - TOOLS.smokeCost);
      state.smokes.push({ x: thief.x, y: thief.y, until: state.time + TOOLS.smokeSeconds });
      events |= EVENT_TOOL;
    }
    if (controls.emp && state.tools.emp > 0) {
      state.tools.emp -= 1;
      state.score = Math.max(0, state.score - TOOLS.empCost);
      for (const camera of state.cameras) camera.disabledUntil = state.time + TOOLS.empSeconds;
      events |= EVENT_TOOL;
    }

    // --- cameras sweep; guards patrol, or chase a thief they have seen. ---
    for (const camera of state.cameras) {
      camera.angle = camera.baseAngle + Math.sin(state.time * camera.speed + camera.x * 0.01) * camera.sweep;
    }
    for (const guard of state.guards) {
      const target = guard.waypoints[guard.leg];
      const tx = target.x - guard.x;
      const ty = target.y - guard.y;
      const dist = Math.hypot(tx, ty);
      if (guard.chasing) {
        const seen = guard.lastSeen;
        const sx = seen.x - guard.x;
        const sy = seen.y - guard.y;
        const sdist = Math.hypot(sx, sy);
        if (sdist > 12) {
          moveCircle(guard, GUARD.radius, (sx / sdist) * GUARD.chaseSpeed * dt, (sy / sdist) * GUARD.chaseSpeed * dt, walls);
          guard.facing = Math.atan2(sy, sx);
        } else if (state.time > guard.giveUpAt) {
          guard.chasing = false;
          guard.suspicion = 0;
        }
      } else if (guard.waiting > 0) {
        guard.waiting -= dt;
      } else if (dist > 6) {
        moveCircle(guard, GUARD.radius, (tx / dist) * GUARD.patrolSpeed * dt, (ty / dist) * GUARD.patrolSpeed * dt, walls);
        guard.facing = Math.atan2(ty, tx);
      } else {
        guard.leg = (guard.leg + 1) % guard.waypoints.length;
        guard.waiting = guard.pause;
      }
    }

    // --- who sees the thief right now? ---
    let strongest = 0;
    let guardStrongest = 0;
    let cameraStrongest = 0;
    for (const guard of state.guards) {
      const strength = sightStrength(
        guard.x, guard.y, guard.facing, GUARD.range, GUARD.halfAngle,
        thief, walls, state.smokes, state.time, thief.sneaking,
      );
      guard.spotting = strength;
      if (strength > 0) {
        guard.suspicion = Math.min(1, guard.suspicion + strength * dt * 1.8);
        guard.lastSeen = { x: thief.x, y: thief.y };
        guard.giveUpAt = state.time + 4;
        if (guard.suspicion > 0.65) guard.chasing = true;
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - dt * 0.35);
      }
      strongest = Math.max(strongest, strength);
      guardStrongest = Math.max(guardStrongest, strength);
    }
    for (const camera of state.cameras) {
      if (state.time < camera.disabledUntil) {
        camera.spotting = 0;
        continue;
      }
      const strength = sightStrength(
        camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.halfAngle,
        thief, walls, state.smokes, state.time, thief.sneaking,
      );
      camera.spotting = strength;
      strongest = Math.max(strongest, strength);
      cameraStrongest = Math.max(cameraStrongest, strength);
    }
    state.spotted = strongest;
    state.guardSpotting = guardStrongest;
    state.cameraSpotting = cameraStrongest;
    if (strongest > 0) {
      state.alarm = Math.min(ALARM.bustAt, state.alarm + strongest * ALARM.risePerSecond * dt);
      state.alarmPeak = Math.max(state.alarmPeak, state.alarm);
      events |= EVENT_SPOTTED;
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decayPerSecond * dt);
    }

    // --- caught by touch, or by a full alarm. ---
    for (const guard of state.guards) {
      const dx = thief.x - guard.x;
      const dy = thief.y - guard.y;
      if (dx * dx + dy * dy < GUARD.catchRadius * GUARD.catchRadius) {
        state.status = 'busted';
        state.bustReason = 'A guard grabbed you in the dark.';
        return events | EVENT_BUSTED;
      }
    }
    if (state.alarm >= ALARM.bustAt) {
      state.status = 'busted';
      state.bustReason = 'The alarm hit 100% — the museum locked down.';
      return events | EVENT_BUSTED;
    }

    // --- grab the loot, then reach the exit. ---
    const loot = state.def.loot;
    if (!state.lootTaken) {
      const dx = thief.x - loot.x;
      const dy = thief.y - loot.y;
      if (dx * dx + dy * dy < THIEF.grabRange * THIEF.grabRange && controls.interact) {
        state.lootTaken = true;
        state.score += loot.value;
        events |= EVENT_LOOT;
      }
    } else {
      const exit = state.def.exit;
      if (thief.x > exit.x && thief.x < exit.x + exit.w && thief.y > exit.y && thief.y < exit.y + exit.h) {
        const timeBonus = Math.max(0, 600 - Math.round(state.time) * 5);
        const stealthBonus = Math.round((100 - state.alarmPeak) * 2);
        state.score += timeBonus + stealthBonus;
        state.timeBonus = timeBonus;
        state.stealthBonus = stealthBonus;
        totalScore = state.score;
        state.status = 'cleared';
        events |= EVENT_CLEAR;
      }
    }
    return events;
  }

  return {
    get state() {
      return state;
    },
    get levelIndex() {
      return levelIndex;
    },
    get levelCount() {
      return LEVELS.length;
    },
    get totalScore() {
      return totalScore;
    },
    reset,
    startOver,
    step,
    bounds: { width: FIELD.width, height: FIELD.height },
  };
}
