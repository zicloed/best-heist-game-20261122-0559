// Midnight Getaway — the rules and state, with no drawing and no browser in it:
// the thief, the patrolling guards, the sweeping cameras, the loot, the tools,
// the alarm meter and the win / caught conditions. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react without
// the world knowing about screens or sound.

import {
  ALARM, CAMERA, CAMERAS, FIELD, GUARD, GUARDS, LAMPS, LOOT, PLAYER, RUGS,
  SCORE, SPOT, TOOLS, VAN, WALLS,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_COIN = 2;
export const EVENT_EMP = 4;
export const EVENT_WIN = 8;
export const EVENT_CAUGHT = 16;
export const EVENT_SPOTTED = 32; // a guard or camera just crossed into chase
export const EVENT_STARE = 64; // a guard just crossed into stare

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Smallest absolute angle between two headings, 0..PI. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Does the segment (x1,y1)-(x2,y2) cross rectangle r? (samples + edge tests). */
function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    const d1 = (bx - ax) * (y1 - ay) - (by - ay) * (x1 - ax);
    const d2 = (bx - ax) * (y2 - ay) - (by - ay) * (x2 - ax);
    const d3 = (x2 - x1) * (by - ay) - (y2 - y1) * (bx - ax);
    const d4 = (x2 - x1) * (ay - y1) - (y2 - y1) * (ax - x1);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  }
  return false;
}

/** True when no wall stands between the two points. */
function hasLineOfSight(x1, y1, x2, y2) {
  for (const wall of WALLS) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return false;
  }
  return true;
}

/** Push a circle out of every wall it overlaps (axis-separated, so corners slide). */
function collideCircle(body, radius) {
  for (const wall of WALLS) {
    const cx = clamp(body.x, wall.x, wall.x + wall.w);
    const cy = clamp(body.y, wall.y, wall.y + wall.h);
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        body.x = cx + (dx / d) * radius;
        body.y = cy + (dy / d) * radius;
      } else {
        // Centre inside the wall: push out along the smallest penetration.
        const left = body.x - wall.x;
        const right = wall.x + wall.w - body.x;
        const top = body.y - wall.y;
        const bottom = wall.y + wall.h - body.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) body.x = wall.x - radius;
        else if (m === right) body.x = wall.x + wall.w + radius;
        else if (m === top) body.y = wall.y - radius;
        else body.y = wall.y + wall.h + radius;
      }
    }
  }
  body.x = clamp(body.x, PLAYER.radius, FIELD.width - PLAYER.radius);
  body.y = clamp(body.y, PLAYER.radius, FIELD.height - PLAYER.radius);
}

export function createWorld() {
  const player = {
    x: PLAYER.startX, y: PLAYER.startY, radius: PLAYER.radius,
    facing: -Math.PI / 2, sneaking: false, moving: false,
  };

  const guards = GUARDS.map((g) => ({
    name: g.name,
    x: g.x, y: g.y, radius: GUARD.radius,
    waypoints: g.waypoints.map((w) => ({ ...w })),
    waypointIndex: 1,
    angle: Math.PI / 2,
    state: 'patrol', // patrol | stare | chase | investigate
    suspicion: 0,
    lostSight: 0,
    investigateX: 0, investigateY: 0, investigateTimer: 0,
    waitTimer: 0,
  }));

  const cameras = CAMERAS.map((c) => ({
    x: c.x, y: c.y, baseAngle: c.baseAngle, phase: c.phase,
    angle: c.baseAngle, suspicion: 0, disabled: 0,
  }));

  const loot = [
    { ...LOOT.main, taken: false, main: true },
    ...LOOT.side.map((l) => ({ ...l, taken: false, main: false })),
  ];

  const coins = []; // tossed coins lying on the floor, still clinking

  const state = {
    player, guards, cameras, loot, coins,
    alarm: 0,
    score: 0,
    elapsed: 0,
    coinsLeft: TOOLS.coins,
    empsLeft: TOOLS.emps,
    mainTaken: false,
    sideTaken: 0,
    won: false,
    caught: false,
    catchReason: '',
    /** the loudest observer right now, for the HUD: 'calm' | 'suspicious' | 'alarmed'. */
    heat: 'calm',
  };

  function reset() {
    player.x = PLAYER.startX;
    player.y = PLAYER.startY;
    player.facing = -Math.PI / 2;
    player.sneaking = false;
    player.moving = false;
    guards.forEach((g, i) => {
      g.x = GUARDS[i].x;
      g.y = GUARDS[i].y;
      g.waypointIndex = 1;
      g.angle = Math.PI / 2;
      g.state = 'patrol';
      g.suspicion = 0;
      g.lostSight = 0;
      g.investigateTimer = 0;
      g.waitTimer = 0;
    });
    cameras.forEach((c, i) => {
      c.angle = CAMERAS[i].baseAngle;
      c.suspicion = 0;
      c.disabled = 0;
    });
    for (const item of loot) item.taken = false;
    coins.length = 0;
    state.alarm = 0;
    state.score = 0;
    state.elapsed = 0;
    state.coinsLeft = TOOLS.coins;
    state.empsLeft = TOOLS.emps;
    state.mainTaken = false;
    state.sideTaken = 0;
    state.won = false;
    state.caught = false;
    state.catchReason = '';
    state.heat = 'calm';
  }

  /** How exposed the thief is right now: rugs hide, lamplight exposes, sneaking hides. */
  function exposure() {
    let m = player.sneaking ? SPOT.sneak : 1;
    for (const rug of RUGS) {
      if (pointInRect(player.x, player.y, rug)) m *= SPOT.shadow;
    }
    for (const lamp of LAMPS) {
      if (dist(player.x, player.y, lamp.x, lamp.y) < lamp.r) m *= SPOT.lamplight;
    }
    return m;
  }

  /** Can this observer see the thief? Returns 0..1 detection strength (0 = unseen). */
  function seeStrength(ox, oy, angle, range, halfAngle) {
    const d = dist(ox, oy, player.x, player.y);
    if (d > range) return 0;
    const toPlayer = Math.atan2(player.y - oy, player.x - ox);
    if (angleDiff(toPlayer, angle) > halfAngle) return 0;
    if (!hasLineOfSight(ox, oy, player.x, player.y)) return 0;
    return 1 - (d / range) * 0.7; // closer = seen faster
  }

  function moveGuard(g, dt, tx, ty, speed) {
    const dx = tx - g.x;
    const dy = ty - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const stepLen = Math.min(d, speed * dt);
    g.x += (dx / d) * stepLen;
    g.y += (dy / d) * stepLen;
    g.angle = Math.atan2(dy, dx);
    collideCircle(g, g.radius);
    return d - stepLen < 2;
  }

  /**
   * One fixed step. `input` is {x, y, sneak, coin, coinX, coinY, emp} where
   * x/y is a -1..1 direction, coin asks for a toss toward (coinX, coinY) and
   * emp asks for the EMP. Returns a bitmask of EVENT_* flags.
   */
  function step(dt, input) {
    if (state.won || state.caught) return 0;
    let events = 0;
    state.elapsed += dt;

    // --- the thief moves ---
    const len = Math.hypot(input.x, input.y);
    player.sneaking = !!input.sneak;
    player.moving = len > 0.01;
    if (player.moving) {
      const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
      const nx = input.x / (len || 1);
      const ny = input.y / (len || 1);
      player.x += nx * speed * dt;
      player.y += ny * speed * dt;
      player.facing = Math.atan2(ny, nx);
      collideCircle(player, player.radius);
    }

    // --- tools ---
    if (input.coin && state.coinsLeft > 0) {
      state.coinsLeft -= 1;
      const tx = clamp(input.coinX ?? player.x + Math.cos(player.facing) * TOOLS.coinRange, 40, FIELD.width - 40);
      const ty = clamp(input.coinY ?? player.y + Math.sin(player.facing) * TOOLS.coinRange, 40, FIELD.height - 40);
      coins.push({ x: tx, y: ty, ttl: 1.2 });
      for (const g of guards) {
        if (g.state !== 'chase' && dist(g.x, g.y, tx, ty) < TOOLS.coinLureRadius) {
          g.state = 'investigate';
          g.investigateX = tx;
          g.investigateY = ty;
          g.investigateTimer = TOOLS.coinInvestigateSeconds;
          g.suspicion = Math.min(g.suspicion, GUARD.stareAt - 0.05);
        }
      }
      events |= EVENT_COIN;
    }
    if (input.emp && state.empsLeft > 0) {
      state.empsLeft -= 1;
      for (const c of cameras) {
        c.disabled = TOOLS.empDisableSeconds;
        c.suspicion = 0;
      }
      events |= EVENT_EMP;
    }
    for (let i = coins.length - 1; i >= 0; i -= 1) {
      coins[i].ttl -= dt;
      if (coins[i].ttl <= 0) coins.splice(i, 1);
    }

    const expo = exposure();

    // --- guards: see, suspect, chase ---
    for (const g of guards) {
      const strength = seeStrength(g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle);
      const before = g.suspicion;
      if (strength > 0) {
        g.suspicion = Math.min(1, g.suspicion + SPOT.baseRate * strength * expo * dt);
        g.lostSight = 0;
      } else {
        g.suspicion = Math.max(0, g.suspicion - (g.state === 'chase' ? SPOT.chaseDecayRate : SPOT.decayRate) * dt);
        if (g.state === 'chase') g.lostSight += dt;
      }
      if (before < GUARD.stareAt && g.suspicion >= GUARD.stareAt) events |= EVENT_STARE;
      if (before < GUARD.chaseAt && g.suspicion >= GUARD.chaseAt) events |= EVENT_SPOTTED;

      if (g.suspicion >= GUARD.chaseAt) {
        g.state = 'chase';
      } else if (g.state === 'chase' && g.lostSight > GUARD.giveUpSeconds) {
        g.state = 'patrol';
        g.suspicion = Math.min(g.suspicion, GUARD.stareAt);
      } else if (g.state === 'stare' && g.suspicion < GUARD.stareAt) {
        g.state = 'patrol';
      } else if (g.state === 'patrol' && g.suspicion >= GUARD.stareAt) {
        g.state = 'stare';
      }

      if (g.state === 'chase') {
        moveGuard(g, dt, player.x, player.y, GUARD.chaseSpeed);
        if (dist(g.x, g.y, player.x, player.y) < GUARD.touchRange) {
          state.caught = true;
          state.catchReason = `${g.name} grabbed you.`;
          return events | EVENT_CAUGHT;
        }
      } else if (g.state === 'investigate') {
        const arrived = moveGuard(g, dt, g.investigateX, g.investigateY, GUARD.investigateSpeed);
        if (arrived || (g.investigateTimer -= dt) <= 0) {
          g.state = 'patrol';
          g.waitTimer = 1.2; // look around, then walk on
        }
      } else if (g.state === 'stare') {
        // Freeze and stare at the thief: the fair warning before the chase.
        g.angle = Math.atan2(player.y - g.y, player.x - g.x);
      } else {
        // Patrol: walk the waypoints, pausing at each corner to look around.
        if (g.waitTimer > 0) {
          g.waitTimer -= dt;
          g.angle += dt * 0.6; // slow scan while waiting
        } else {
          const wp = g.waypoints[g.waypointIndex];
          if (moveGuard(g, dt, wp.x, wp.y, GUARD.patrolSpeed)) {
            g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
            g.waitTimer = 0.8;
          }
        }
      }
    }

    // --- cameras: sweep, watch, raise the alarm ---
    for (const c of cameras) {
      if (c.disabled > 0) {
        c.disabled -= dt;
        c.suspicion = 0;
        continue;
      }
      c.angle = c.baseAngle + CAMERA.sweepAmplitude * Math.sin(state.elapsed * CAMERA.sweepSpeed + c.phase);
      const before = c.suspicion;
      const strength = seeStrength(c.x, c.y, c.angle, CAMERA.viewRange, CAMERA.viewHalfAngle);
      if (strength > 0) {
        c.suspicion = Math.min(1, c.suspicion + SPOT.baseRate * 0.9 * strength * expo * dt);
      } else {
        c.suspicion = Math.max(0, c.suspicion - SPOT.decayRate * dt);
      }
      if (before < GUARD.chaseAt && c.suspicion >= GUARD.chaseAt) events |= EVENT_SPOTTED;
    }

    // --- the alarm meter: the shared heat of every observer ---
    let top = 0;
    for (const g of guards) top = Math.max(top, g.suspicion);
    for (const c of cameras) top = Math.max(top, c.suspicion);
    state.heat = top >= GUARD.chaseAt ? 'alarmed' : top >= GUARD.stareAt ? 'suspicious' : 'calm';
    if (top > ALARM.riseAbove) {
      state.alarm = Math.min(100, state.alarm + ALARM.riseRate * (top - ALARM.riseAbove) * dt);
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decayRate * dt);
    }
    if (state.alarm >= 100) {
      state.caught = true;
      state.catchReason = 'The alarm hit 100% — the museum locked down.';
      return events | EVENT_CAUGHT;
    }

    // --- loot: walk over it to pocket it ---
    for (const item of loot) {
      if (item.taken) continue;
      if (dist(player.x, player.y, item.x, item.y) < player.radius + item.r + 4) {
        item.taken = true;
        state.score += item.points;
        if (item.main) state.mainTaken = true;
        else state.sideTaken += 1;
        events |= EVENT_PICKUP;
      }
    }

    // --- the getaway ---
    if (state.mainTaken && pointInRect(player.x, player.y, VAN)) {
      state.won = true;
      state.score += SCORE.winBonus - Math.floor(state.elapsed * SCORE.timePenaltyPerSecond);
      return events | EVENT_WIN;
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
