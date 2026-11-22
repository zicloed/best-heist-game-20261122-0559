// Midnight Getaway — the screenshot scenes behind ?shot=cover|sneak|alarm|victory.
// Each one places the real world into a fixed, deterministic pose (fixed guard
// and camera positions, fixed alarm, fixed loot) and returns the screen to draw
// over it, so the same query always gives the same frame. No randomness here.

import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_WIN } from './render.js';

function placeGuard(state, index, x, y, angle, suspicion, guardState) {
  const g = state.guards[index];
  g.x = x;
  g.y = y;
  g.angle = angle;
  g.suspicion = suspicion;
  g.state = guardState;
  g.lostSight = 0;
  g.waitTimer = 0;
}

function placeCamera(state, index, angle, suspicion, disabled) {
  const c = state.cameras[index];
  c.angle = angle;
  c.suspicion = suspicion;
  c.disabled = disabled;
}

/**
 * Set `world` to the named scene and return the screen to draw and the best
 * score to show. Unknown names fall back to the cover scene.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  state.elapsed = 47; // a lived-in clock reading for the HUD

  if (name === 'sneak') {
    // Rook ghosting right behind Bram, who is facing away down the gallery.
    state.player.x = 268;
    state.player.y = 352;
    state.player.facing = Math.PI / 2;
    state.player.sneaking = true;
    state.player.moving = true;
    placeGuard(state, 0, 330, 330, 0, 0.18, 'patrol'); // Bram, facing east, unaware
    placeGuard(state, 1, 210, 620, -Math.PI / 2, 0, 'patrol');
    placeGuard(state, 2, 1070, 260, Math.PI / 2, 0, 'patrol');
    placeCamera(state, 0, 1.1, 0, 0);
    placeCamera(state, 1, 2.0, 0, 0);
    placeCamera(state, 2, 1.9, 0, 0);
    state.alarm = 12;
    state.heat = 'calm';
    state.score = 250;
    state.loot[1].taken = true; // the Gold Bar is already pocketed
    state.sideTaken = 1;
    return { screen: SCREEN_PLAY, best: 1250 };
  }

  if (name === 'alarm') {
    // Dmitri has Rook dead to rights outside the vault door; the alarm is nearly full.
    state.player.x = 640;
    state.player.y = 300;
    state.player.facing = Math.PI / 2;
    state.player.sneaking = false;
    state.player.moving = true;
    placeGuard(state, 0, 520, 330, -0.25, 0.55, 'stare'); // Bram, staring
    placeGuard(state, 1, 210, 420, 0, 0.1, 'patrol');
    placeGuard(state, 2, 700, 380, -2.21, 0.96, 'chase'); // Dmitri, chasing
    placeCamera(state, 0, 1.3, 0.2, 0);
    placeCamera(state, 1, 1.8, 0.1, 0);
    placeCamera(state, 2, 1.57, 0.9, 0); // vault camera locked on
    state.alarm = 82;
    state.heat = 'alarmed';
    state.score = 1250;
    state.mainTaken = true;
    state.loot[0].taken = true; // the diamond is in hand — now run
    state.loot[1].taken = true;
    state.sideTaken = 1;
    return { screen: SCREEN_PLAY, best: 1750 };
  }

  if (name === 'victory') {
    // Rook at the van, diamond in hand, every side pocket emptied.
    state.player.x = 640;
    state.player.y = 756;
    state.player.facing = Math.PI / 2;
    state.player.sneaking = false;
    state.player.moving = false;
    placeGuard(state, 0, 640, 330, Math.PI, 0.1, 'patrol');
    placeGuard(state, 1, 210, 500, 0, 0, 'patrol');
    placeGuard(state, 2, 1070, 500, Math.PI, 0, 'patrol');
    placeCamera(state, 0, 1.1, 0, 0);
    placeCamera(state, 1, 2.0, 0, 0);
    placeCamera(state, 2, 1.57, 0, 0);
    state.alarm = 41;
    state.heat = 'calm';
    state.mainTaken = true;
    state.sideTaken = 4;
    for (const item of state.loot) item.taken = true;
    state.score = 2180;
    state.elapsed = 96;
    state.won = true;
    return { screen: SCREEN_WIN, best: 2180 };
  }

  // cover (default): Rook mid-room, every system visible in one frame — guards
  // and their cones, a camera cone, the diamond in the vault, the alarm meter.
  state.player.x = 640;
  state.player.y = 520;
  state.player.facing = -Math.PI / 2;
  state.player.sneaking = false;
  state.player.moving = true;
  placeGuard(state, 0, 640, 330, Math.PI / 2, 0.42, 'stare'); // Bram, mid-gallery, staring at Rook
  placeGuard(state, 1, 210, 470, Math.PI / 2, 0.08, 'patrol');
  placeGuard(state, 2, 1070, 470, Math.PI / 2, 0.08, 'patrol');
  placeCamera(state, 0, 1.1, 0.15, 0);
  placeCamera(state, 1, 2.0, 0, 0);
  placeCamera(state, 2, 1.57, 0.3, 0); // vault camera sweeping the hall
  state.alarm = 35;
  state.heat = 'suspicious';
  state.score = 250;
  state.loot[1].taken = true;
  state.sideTaken = 1;
  return { screen: SCREEN_PLAY, best: 1750 };
}
