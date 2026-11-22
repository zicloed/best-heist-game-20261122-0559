// Midnight Getaway — everything drawn: the museum floor, the vault, the loot,
// the vision cones, the guards and cameras, the thief, the HUD and the screens.
// It only reads state; it never changes a rule.

import { FIELD, LAMPS, LOOT, PALETTE, RUGS, VAN, WALLS, FONT } from './config.js';
import { CAMERA, GUARD } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_WIN = 3;
export const SCREEN_CAUGHT = 4;

const TILE = 80;

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function coneFill(suspicion, base, camera) {
  if (camera) return PALETTE.camCone;
  if (suspicion >= GUARD.chaseAt) return PALETTE.coneAlarmed;
  if (suspicion >= GUARD.stareAt) return PALETTE.coneSuspicious;
  return base;
}

function drawGuard(ctx, g, t) {
  drawCone(ctx, g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle,
    coneFill(g.suspicion, PALETTE.coneCalm, false));
  // Body: navy uniform, gold cap, a little bob while walking.
  const bob = g.state === 'patrol' ? Math.sin(t * 8) * 1.5 : 0;
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(g.x, g.y + bob * 0.3, g.radius + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.radius - 2, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = PALETTE.guardDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle) * (g.radius + 6), g.y + Math.sin(g.angle) * (g.radius + 6));
  ctx.stroke();
  // Cap brim.
  ctx.fillStyle = '#2a2118';
  ctx.beginPath();
  ctx.arc(g.x, g.y - 4, 6, Math.PI, 0);
  ctx.fill();
  // "?" while staring, "!" while chasing.
  if (g.state === 'stare' || g.suspicion >= GUARD.stareAt) {
    ctx.fillStyle = g.state === 'chase' ? '#ff5a5a' : '#ffb02e';
    ctx.font = 'bold 26px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(g.state === 'chase' ? '!' : '?', g.x, g.y - g.radius - 8);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(g.name, g.x, g.y + g.radius + 14);
}

function drawCamera(ctx, c) {
  const fill = c.disabled > 0 ? PALETTE.camConeOff : PALETTE.camCone;
  drawCone(ctx, c.x, c.y, c.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, fill);
  ctx.fillStyle = c.disabled > 0 ? '#5a6a8a' : '#3a4a6a';
  ctx.fillRect(c.x - 9, c.y - 9, 18, 18);
  ctx.fillStyle = c.disabled > 0 ? '#8899bb' : '#ff4d4d';
  ctx.beginPath();
  ctx.arc(c.x + Math.cos(c.angle) * 8, c.y + Math.sin(c.angle) * 8, 4, 0, Math.PI * 2);
  ctx.fill();
  if (c.suspicion >= GUARD.chaseAt) {
    ctx.fillStyle = '#ff5a5a';
    ctx.font = 'bold 22px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('!', c.x, c.y + 30);
  }
}

function drawLoot(ctx, item, t) {
  const sparkle = 0.6 + 0.4 * Math.sin(t * 4 + item.x);
  ctx.save();
  ctx.translate(item.x, item.y);
  if (item.main) {
    // The Starlight Diamond in its glass case.
    ctx.strokeStyle = 'rgba(174, 230, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-26, -26, 52, 52);
    ctx.fillStyle = PALETTE.diamond;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(14, -4);
    ctx.lineTo(8, 14);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-14, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + sparkle.toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(-4, -6, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = PALETTE.loot;
    ctx.globalAlpha = sparkle;
    ctx.beginPath();
    ctx.arc(0, 0, item.r - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#7a5c00';
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 5);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = '11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(item.name, 0, item.r + 16);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor(t) {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Marble checker, subtle.
    for (let y = 0; y < FIELD.height / TILE; y += 1) {
      for (let x = 0; x < FIELD.width / TILE; x += 1) {
        if ((x + y) % 2 === 0) continue;
        ctx.fillStyle = (x + y) % 4 === 1 ? PALETTE.floorTileA : PALETTE.floorTileB;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    // Velvet rugs (shadow: safer to cross).
    for (const rug of RUGS) {
      ctx.fillStyle = PALETTE.rug;
      ctx.fillRect(rug.x, rug.y, rug.w, rug.h);
      ctx.strokeStyle = PALETTE.rugTrim;
      ctx.lineWidth = 4;
      ctx.strokeRect(rug.x + 6, rug.y + 6, rug.w - 12, rug.h - 12);
    }
    // Lamp pools (lamplight: easier to spot).
    for (const lamp of LAMPS) {
      const grad = ctx.createRadialGradient(lamp.x, lamp.y, 6, lamp.x, lamp.y, lamp.r);
      grad.addColorStop(0, 'rgba(255, 200, 110, 0.22)');
      grad.addColorStop(1, 'rgba(255, 200, 110, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcf7a';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Vault room floor + steel door.
    ctx.fillStyle = PALETTE.vault;
    ctx.fillRect(504, 24, 272, 192);
    ctx.strokeStyle = PALETTE.vaultDoor;
    ctx.lineWidth = 3;
    ctx.strokeRect(504, 24, 272, 192);
    ctx.fillStyle = PALETTE.vaultDoor;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('V A U L T', 640, 200);
  }

  function drawWalls() {
    for (const wall of WALLS) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(wall.x, wall.y, wall.w, 4);
    }
    // Display-case glass glints on the two gallery cases.
    ctx.fillStyle = PALETTE.caseGlass;
    ctx.fillRect(150, 300, 130, 54);
    ctx.fillRect(1000, 300, 130, 54);
  }

  function drawVan(t) {
    // The getaway van waiting at the open door, engine idling.
    const jiggle = Math.sin(t * 30) * 1;
    ctx.fillStyle = PALETTE.vanDark;
    ctx.fillRect(VAN.x - 8, VAN.y - 6, VAN.w + 16, VAN.h + 6);
    ctx.fillStyle = PALETTE.van;
    ctx.fillRect(VAN.x, VAN.y + jiggle * 0.2, VAN.w, VAN.h - 14);
    ctx.fillStyle = '#2a2118';
    ctx.fillRect(VAN.x + 8, VAN.y + 8, 30, 20);
    ctx.fillStyle = '#e8f4ff';
    ctx.fillRect(VAN.x + 12, VAN.y + 12, 22, 12);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('GETAWAY VAN', VAN.x + VAN.w / 2, VAN.y - 12);
  }

  function drawPlayer(p, t) {
    // The thief: dark teal, mask stripe, a soft ring while sneaking.
    if (p.sneaking) {
      ctx.strokeStyle = 'rgba(47, 212, 196, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.thiefDark;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius - 2, 0, Math.PI * 2);
    ctx.fill();
    // Mask stripe across the eyes, facing the way they move.
    ctx.strokeStyle = '#0d2b28';
    ctx.lineWidth = 5;
    const fx = Math.cos(p.facing);
    const fy = Math.sin(p.facing);
    ctx.beginPath();
    ctx.moveTo(p.x - fy * 8, p.y + fx * 8);
    ctx.lineTo(p.x + fy * 8, p.y - fx * 8);
    ctx.stroke();
    // Little feet shuffle while moving.
    if (p.moving) {
      ctx.fillStyle = PALETTE.thiefDark;
      const s = Math.sin(t * 14) * 4;
      ctx.beginPath();
      ctx.arc(p.x - fx * 10 - fy * s, p.y - fy * 10 + fx * s, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud(state) {
    const pad = 14;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, 46);
    ctx.strokeStyle = PALETTE.hudEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 46);
    ctx.lineTo(FIELD.width, 46);
    ctx.stroke();

    // Alarm meter.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', pad, 19);
    const barX = 78;
    const barW = 260;
    ctx.fillStyle = '#2a1420';
    ctx.fillRect(barX, 8, barW, 16);
    const alarmFrac = state.alarm / 100;
    ctx.fillStyle = alarmFrac > 0.66 ? '#ff3b3b' : alarmFrac > 0.33 ? '#ff9a2e' : '#57d977';
    ctx.fillRect(barX, 8, barW * alarmFrac, 16);
    ctx.strokeStyle = PALETTE.hudEdge;
    ctx.strokeRect(barX, 8, barW, 16);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '12px ' + FONT;
    ctx.fillText(Math.floor(state.alarm) + '%', barX + barW + 8, 20);

    // Heat word.
    ctx.fillStyle = state.heat === 'alarmed' ? PALETTE.danger : state.heat === 'suspicious' ? '#ff9a2e' : PALETTE.good;
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText(state.heat.toUpperCase(), barX + barW + 62, 19);

    // Loot tally.
    const lootTotal = state.loot.length;
    const lootGot = state.loot.filter((l) => l.taken).length;
    ctx.fillStyle = PALETTE.loot;
    ctx.font = 'bold 14px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('◆ LOOT ' + lootGot + '/' + lootTotal, 560, 20);

    // Tools.
    ctx.fillStyle = PALETTE.text;
    ctx.font = '13px ' + FONT;
    ctx.fillText('Coins (Q/click): ' + state.coinsLeft + '   EMP (E): ' + state.empsLeft, 700, 20);

    // Objective.
    ctx.fillStyle = PALETTE.muted;
    ctx.textAlign = 'right';
    ctx.fillText(
      state.mainTaken ? 'Get to the getaway van!' : 'Steal the Starlight Diamond',
      FIELD.width - pad, 20,
    );
    ctx.textAlign = 'left';

    // Score + time, second row.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    const mm = String(Math.floor(state.elapsed / 60)).padStart(2, '0');
    const ss = String(Math.floor(state.elapsed % 60)).padStart(2, '0');
    ctx.fillText('SCORE ' + state.score + '    TIME ' + mm + ':' + ss, pad, 38);

    // Sneak hint while sneaking.
    if (state.player.sneaking) {
      ctx.fillStyle = PALETTE.thief;
      ctx.font = 'bold 12px ' + FONT;
      ctx.fillText('SNEAKING — harder to spot, slower to move', 560, 38);
    }
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(10, 14, 26, 0.82)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.hud;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    const w = 640;
    const h = 120 + lines.length * 30;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, y + 58);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px ' + FONT;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, y + 102 + i * 30);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '14px ' + FONT;
    ctx.fillText('Press R to run it back', FIELD.width / 2, y + h - 18);
  }

  function draw(state, screen, best, t) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawFloor(t);
    // Cones first (under the people), then the solid world.
    for (const c of state.cameras) drawCamera(ctx, c);
    for (const g of state.guards) drawGuard(ctx, g, t);
    drawWalls();
    drawVan(t);
    for (const item of state.loot) {
      if (!item.taken) drawLoot(ctx, item, t);
    }
    for (const coin of state.coins) {
      ctx.fillStyle = PALETTE.loot;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 217, 77, 0.6)';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 10 + Math.sin(t * 10) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawPlayer(state.player, t);
    drawHud(state);

    if (screen === SCREEN_TITLE) {
      panel('MIDNIGHT GETAWAY', [
        'You are Rook. The Halcyon Museum. One night. One diamond.',
        'Slip past Bram, Celia and Dmitri — and the cameras —',
        'pocket the Starlight Diamond, then reach the getaway van.',
        'WASD / arrows move · Shift sneak · Q or click toss a coin · E EMP the cameras',
        'R restart · P pause · M mute',
      ], PALETTE.thief);
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['The museum waits. The guards do not — not really.', 'P or Space to keep moving.'], PALETTE.muted);
    } else if (screen === SCREEN_WIN) {
      panel('CLEAN GETAWAY!', [
        'The Starlight Diamond is yours. The van pulls away into the night.',
        'Score ' + state.score + '   ·   Best ' + Math.max(best, state.score) + '   ·   Time ' +
          Math.floor(state.elapsed / 60) + ':' + String(Math.floor(state.elapsed % 60)).padStart(2, '0'),
        'Loot ' + state.loot.filter((l) => l.taken).length + '/' + state.loot.length +
          '   ·   Alarm peaked at ' + Math.floor(state.alarm) + '%',
      ], PALETTE.good);
    } else if (screen === SCREEN_CAUGHT) {
      panel('BUSTED!', [
        state.catchReason || 'The museum locked down.',
        'Score ' + state.score + '   ·   Best ' + best,
        'The cones sweep on. Plan the route, then run it again.',
      ], PALETTE.danger);
    }

    // Alarm vignette: the hotter it gets, the redder the edges.
    if (state.alarm > 25 && screen === SCREEN_PLAY) {
      const a = Math.min(0.35, (state.alarm - 25) / 100 * 0.5) * (0.7 + 0.3 * Math.sin(t * 6));
      const grad = ctx.createRadialGradient(640, 400, 260, 640, 400, 720);
      grad.addColorStop(0, 'rgba(255, 40, 40, 0)');
      grad.addColorStop(1, 'rgba(255, 40, 40, ' + a.toFixed(3) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return { draw };
}
